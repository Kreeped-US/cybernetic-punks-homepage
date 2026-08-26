// lib/gsc/inspectionRun.test.mjs
// Verification assertions for the Consumer C escalation -- ATTEMPT-EVIDENCE model. Not a live
// run: a fake Supabase (emulating the indexation_flags partial unique index, the paginated
// gsc_url_inspection log, and the inspection_runs history) + injected deps drive the loop with
// no Google/network. Run: node --test lib/gsc/inspectionRun.test.mjs
//
// The MODEL under test (post death-spiral fix): inspection_broken fires ONLY on N recorded FAILED
// ATTEMPTS in the window AND still-not-fresh (never on elapsed time). Freshness reads the latest
// SUCCESS verdict only; failure rows are counted but never read as freshness (split accessor).
// A url with an OPEN flag is retired from the sweep (no re-evaluation, no re-insert). A loop-wide
// auth outage raises ONE loop_auth_broken flag from inspection_runs evidence, not per-URL.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runEscalation, runInspectionChunk, selectInspectionCandidates } from './inspectionRun.js';
import { ATTEMPT_FAILED_STATE } from './storage.js';

const DAY = 86400000;
const HOUR = 3600000;
const BASE = 'https://cyberneticpunks.com'; // must match feedUrl()'s BASE
const iso = (ms) => new Date(ms).toISOString();
const intelUrl = (slug) => BASE + '/marathon/intel/' + slug;

// A published (desired=IN) marathon feed_item created `createdAgeDays` ago.
function publishItem(slug, createdAgeDays) {
  return { slug: slug, game_slug: 'marathon', tags: [], is_published: true, noindex: false, noindexed_at: null, created_at: iso(Date.now() - createdAgeDays * DAY) };
}

// A noindexed (desired=OUT) cohort marathon feed_item noindexed `noindexAgeDays` ago.
function cohortItem(slug, noindexAgeDays) {
  return { slug: slug, game_slug: 'marathon', tags: [], is_published: true, noindex: true, noindexed_at: iso(Date.now() - noindexAgeDays * DAY), created_at: iso(Date.now() - 200 * DAY) };
}

// Fake Supabase supporting exactly the call chains selectInspectionCandidates / runEscalation /
// runInspectionChunk use.
//   - gsc_url_inspection.select: PAGINATED (order inspected_at DESC + .range) so the reduction's
//     latest-per-url + failed-attempt split (fix B/E) is exercised faithfully, including >1000 rows.
//   - indexation_flags.insert: EMULATES the partial unique index on (url, source_type) WHERE
//     state='open' -- a duplicate open flag returns Postgres 23505.
//   - indexation_flags.select: url-list (readOpenFlagUrls, fix D) vs head-count (countOpenFlags).
//   - inspection_runs.select: neq('status','running') + fired_at DESC + limit (maybeRaiseLoopAuthFlag).
function makeFakeSupabase(state) {
  class Q {
    constructor(table) { this.table = table; this.verb = null; this.payload = null; this.filters = {}; this.negFilters = {}; this.rangeArgs = null; this.count = false; }
    select(_cols, opts) { if (!this.verb) this.verb = 'select'; if (opts && opts.count) this.count = true; return this; }
    insert(payload) { this.verb = 'insert'; this.payload = payload; return this; }
    update(payload) { this.verb = 'update'; this.payload = payload; return this; }
    order() { return this; }
    range(a, b) { this.rangeArgs = [a, b]; return this; }
    limit(n) { this.limitN = n; return this; }
    eq(col, val) { this.filters[col] = val; return this; }
    neq(col, val) { this.negFilters[col] = val; return this; }
    single() { return this; }
    then(resolve, reject) { return Promise.resolve().then(() => this._run()).then(resolve, reject); }
    _run() {
      const s = state;
      if (this.table === 'gsc_url_inspection' && this.verb === 'select') {
        // order('inspected_at', {ascending:false}) then .range(a,b) -- paginated, newest first.
        const sorted = s.latestRows.slice().sort((a, b) => Date.parse(b.inspected_at) - Date.parse(a.inspected_at));
        const a = this.rangeArgs ? this.rangeArgs[0] : 0, b = this.rangeArgs ? this.rangeArgs[1] : sorted.length - 1;
        return { data: sorted.slice(a, b + 1), error: null };
      }
      if (this.table === 'feed_items' && this.verb === 'select') {
        const a = this.rangeArgs ? this.rangeArgs[0] : 0, b = this.rangeArgs ? this.rangeArgs[1] : 999;
        return { data: s.feedItems.slice(a, b + 1), error: null };
      }
      if (this.table === 'inspection_runs' && this.verb === 'select') {
        // maybeRaiseLoopAuthFlag: finalized (neq running) fires, fired_at DESC, limited.
        let rows = s.runs.slice();
        if (this.negFilters.status != null) rows = rows.filter((r) => r.status !== this.negFilters.status);
        rows.sort((a, b) => Date.parse(b.fired_at) - Date.parse(a.fired_at));
        if (this.limitN != null) rows = rows.slice(0, this.limitN);
        return { data: rows, error: null };
      }
      if (this.table === 'inspection_runs' && this.verb === 'insert') {
        const id = 'run-' + (s.runs.length + 1);
        s.runs.push(Object.assign({ id: id, fired_at: iso(Date.now()) }, this.payload)); return { data: { id: id }, error: null };
      }
      if (this.table === 'inspection_runs' && this.verb === 'update') {
        const r = s.runs.find((x) => x.id === this.filters.id); if (r) Object.assign(r, this.payload); return { error: null };
      }
      if (this.table === 'gsc_url_inspection' && this.verb === 'insert') {
        const rows = Array.isArray(this.payload) ? this.payload : [this.payload];
        for (let i = 0; i < rows.length; i++) s.latestRows.push(Object.assign({ inspected_at: iso(Date.now()) }, rows[i]));
        return { error: null };
      }
      if (this.table === 'indexation_flags' && this.verb === 'insert') {
        const p = this.payload;
        const dup = s.flags.some((f) => f.url === p.url && f.source_type === p.source_type && f.state === 'open');
        if (dup) return { error: { code: '23505', message: 'duplicate key value violates unique constraint "indexation_flags_open_uniq"' } };
        s.flags.push(Object.assign({ state: 'open' }, p)); return { error: null };
      }
      if (this.table === 'indexation_flags' && this.verb === 'select') {
        const matching = s.flags.filter((f) => this.filters.state == null || f.state === this.filters.state);
        if (this.count) return { count: matching.length, data: null, error: null };  // countOpenFlags (head)
        return { data: matching.map((f) => ({ url: f.url })), error: null };          // readOpenFlagUrls (url list)
      }
      throw new Error('fake supabase: unhandled ' + this.table + '.' + this.verb);
    }
  }
  return { from: (table) => new Q(table) };
}

// Capture console.warn/error so the tests stay quiet and can assert log frequency.
function captureLogs(fn) {
  return async () => {
    const warns = [], errs = [];
    const ow = console.warn, oe = console.error, ol = console.log;
    console.warn = (m) => warns.push(String(m)); console.error = (m) => errs.push(String(m)); console.log = () => {};
    try { await fn({ warns, errs }); } finally { console.warn = ow; console.error = oe; console.log = ol; }
  };
}

// ── ASSERTION 1 (bump durability -- derive, not store) ────────────────────────
// A synthetic KILLED fire whose freshness-violation URL is re-bumped and inspected the
// FOLLOWING fire -- proving derive-not-store durability (no persisted bump state).
test('bump: a killed fire re-derives the bump; the following fire inspects the URL', captureLogs(async () => {
  const now = Date.now();
  const slug = 'stalled-1', url = intelUrl(slug);
  const feedItems = [publishItem(slug, 40)]; // 40d old => past the 30d escalate threshold
  // Latest SUCCESS verdict: not-indexed, 2d3h old => stale (publish fresh window 2*1d), ZERO failed
  // attempts => BUMP band, not the ceiling. Still >2d so NOT due by normal selection (weekly=7d),
  // isolating the bump as the only inspect path.
  const staleAt = now - (2 * DAY + 3 * HOUR);
  const latestRows = [{ url: url, coverage_state: 'URL is unknown to Google', inspected_at: iso(staleAt) }];
  const latestMap = new Map([[url, { cs: 'URL is unknown to Google', at: staleAt, failedAttempts: 0 }]]);
  const state = { latestRows: latestRows, feedItems: feedItems, flags: [], runs: [] };
  const supa = makeFakeSupabase(state);

  // FIRE 1 -- "killed": the sweep identifies the bump, then the process dies before the loop.
  const killed = await runEscalation(supa, latestMap, feedItems, now);
  assert.ok(killed.bump.some((b) => b.url === url), 'fire1 sweep identifies the freshness-violation bump');
  assert.equal(state.flags.length, 0, 'fire1 persisted NO bump state (derive, not store)');

  // FIRE 2 -- the following fire over the SAME durable state. U is NOT due by normal selection, so
  // the ONLY path to its inspection is the RE-DERIVED bump.
  const inspected = [];
  const deps = {
    authorizeToken: async () => ({ ok: true, token: 't' }),
    inspectUrl: async (u) => { inspected.push(u); return { ok: true, result: { indexStatusResult: { coverageState: 'Submitted and indexed' } } }; },
    buildInspectionRow: (_r, u) => ({ row: { url: u } }),
    appendUrlInspection: async () => ({ ok: true, written: 1 }),
  };
  await runInspectionChunk(supa, deps);
  assert.ok(inspected.includes(url), 'fire2 inspected the bumped URL -- derive-not-store durability holds across a killed fire');
}));

// ── ASSERTION 2 (ATTEMPT-EVIDENCE POSITIVE + exactly-once + retirement on re-sweep) ──
// A publish URL past 30d, stale not-indexed verdict, with N=3 RECORDED FAILED ATTEMPTS in the
// window: the loop demonstrably tried and cannot -> inspection_broken opens ONCE. The re-sweep
// finds an OPEN flag and RETIRES the URL (no re-evaluation, no second insert, no second log).
test('attempt-evidence: 3 recorded failed attempts + stale flags inspection_broken once; re-sweep retires', captureLogs(async ({ errs }) => {
  const now = Date.now();
  const slug = 'broken-1', url = intelUrl(slug);
  const feedItems = [publishItem(slug, 40)]; // created 40d ago => escalation-aged
  // Latest SUCCESS verdict not-indexed, 5d old => stale; failedAttempts=3 (>= ceiling).
  const latestMap = new Map([[url, { cs: 'URL is unknown to Google', at: now - 5 * DAY, failedAttempts: 3 }]]);
  const state = { latestRows: [], feedItems: feedItems, flags: [], runs: [] };
  const supa = makeFakeSupabase(state);

  const s1 = await runEscalation(supa, latestMap, feedItems, now);
  assert.equal(s1.inspectionBroken, 1, 'sweep1 opens inspection_broken (3 recorded failed attempts, still not fresh)');
  assert.ok(!s1.bump.some((b) => b.url === url), 'ceiling URL is NOT bumped (slot released)');
  assert.equal(state.flags.filter((f) => f.source_type === 'inspection_broken' && f.url === url).length, 1, 'one inspection_broken row after sweep1');

  // Re-sweep: the URL now has an OPEN flag -> RETIRED (fix D). No re-evaluation, no re-insert.
  const s2 = await runEscalation(supa, latestMap, feedItems, now);
  assert.equal(s2.inspectionBroken, 0, 'sweep2 does not re-open (URL retired -- no re-insert round-trip)');
  assert.ok(!s2.bump.some((b) => b.url === url), 'retired URL is not bumped either');
  assert.equal(state.flags.filter((f) => f.source_type === 'inspection_broken' && f.url === url).length, 1, 'EXACTLY once across both sweeps');
  assert.equal(errs.filter((m) => m.includes('[inspect][INSPECTION-BROKEN]')).length, 1, 'the ceiling error logs exactly once (on transition)');
}));

// ── ASSERTION 3 (the 272-flag bug, asserted against -- cohort shares the freshness gate) ──
// A never-inspected cohort URL past 45d must NOT open cohort_still_indexed -- it routes to
// starvation (keeps inspecting). A stale still-indexed verdict likewise must not false-flag. Only
// a FRESH still-indexed verdict (recent crawl) flags (positive control -- the fix is a gate, not a mute).
test('cohort freshness: never-inspected + stale-verdict past 45d do NOT false-flag; fresh does', captureLogs(async () => {
  const now = Date.now();
  const uNever = intelUrl('cohort-never'); // never inspected -> freshness absent, ZERO attempts
  const uStale = intelUrl('cohort-stale'); // still-indexed verdict just went stale, ZERO attempts
  const uFresh = intelUrl('cohort-fresh'); // still-indexed verdict, 2d old (fresh) + recent crawl
  const feedItems = [cohortItem('cohort-never', 45 + 1 / 24), cohortItem('cohort-stale', 50), cohortItem('cohort-fresh', 50)];
  const latest = new Map([
    [uStale, { cs: 'Submitted and indexed', at: now - (6 * DAY + 1 * HOUR), failedAttempts: 0 }], // stale (>6d)
    [uFresh, { cs: 'Submitted and indexed', at: now - 2 * DAY, lct: now - 1 * DAY, failedAttempts: 0 }], // fresh verdict + recent crawl -> flags
    // uNever: absent from the map (never inspected)
  ]);
  const state = { latestRows: [], feedItems: feedItems, flags: [], runs: [] };
  const supa = makeFakeSupabase(state);

  const r = await runEscalation(supa, latest, feedItems, now);

  // The 272 bug: NEITHER the never-inspected NOR the stale-verdict URL may open cohort_still_indexed.
  assert.equal(state.flags.filter((f) => f.source_type === 'cohort_still_indexed' && f.url === uNever).length, 0, 'never-inspected does NOT false-flag cohort_still_indexed');
  assert.equal(state.flags.filter((f) => f.source_type === 'cohort_still_indexed' && f.url === uStale).length, 0, 'stale verdict does NOT false-flag cohort_still_indexed');
  // Both unconfirmed URLs route to starvation (keeps inspecting via the bump), not silence, not a flag.
  assert.ok(r.bump.some((b) => b.url === uNever), 'never-inspected routes to the bump (keeps inspecting)');
  assert.ok(r.bump.some((b) => b.url === uStale), 'stale verdict routes to the bump (re-inspect to confirm)');
  assert.equal(state.flags.filter((f) => f.source_type === 'inspection_broken').length, 0, 'no inspection_broken (zero recorded attempts)');
  // Positive control: a FRESH still-indexed verdict past 45d still flags.
  assert.equal(state.flags.filter((f) => f.source_type === 'cohort_still_indexed' && f.url === uFresh).length, 1, 'fresh still-indexed verdict DOES flag cohort_still_indexed');
  assert.equal(r.cohortFlagged, 1, 'exactly one cohort flag opened (the fresh one only)');
}));

// ── ASSERTION 4 (backlog immunity -- queue position is not evidence) ──────────
// A never-inspected URL that is NOT escalation-aged (the Jul-23 cohort shape: day 3 of 45) is
// maximally "stale" by raw verdict-age (no verdict at all) yet measured by no one and attempted by
// no one. It must NOT open any flag: its staleness is queue position, and queue position asserts
// nothing. This is the ~1023-backlog immunity.
test('backlog immunity: a never-inspected, NOT-escalation-aged URL does not flag at any staleness', captureLogs(async () => {
  const now = Date.now();
  const url = intelUrl('backlog-1');
  const feedItems = [cohortItem('backlog-1', 3)]; // noindexed 3d ago -- day 3 of 45, NOT escalation-aged
  const latest = new Map(); // never inspected -> maximally stale by verdict-age, but unmeasured
  const state = { latestRows: [], feedItems: feedItems, flags: [], runs: [] };
  const supa = makeFakeSupabase(state);

  const r = await runEscalation(supa, latest, feedItems, now);
  assert.equal(state.flags.filter((f) => f.url === url).length, 0, 'no flag of any kind (queue position is not evidence)');
  assert.ok(!r.bump.some((b) => b.url === url), 'not even bump-eligible (not escalation-aged)');
}));

// ── ASSERTION 5 (ceiling scoped to recorded-attempt count) ────────────────────
// inspection_broken fires ONLY for a URL with >= N recorded failed attempts AND still not fresh.
// A stale URL with FEWER than N recorded attempts must BUMP (record another attempt), not flag.
test('ceiling scoped: >=N failed-attempts flags once; <N bumps', captureLogs(async ({ errs }) => {
  const now = Date.now();
  const uFlag = intelUrl('ceil-flag'); // stale still-indexed + 3 attempts -> inspection_broken
  const uBump = intelUrl('ceil-bump'); // stale still-indexed + 1 attempt  -> bump
  const feedItems = [cohortItem('ceil-flag', 60), cohortItem('ceil-bump', 60)];
  const latest = new Map([
    [uFlag, { cs: 'Submitted and indexed', at: now - 10 * DAY, lct: now - 10 * DAY, failedAttempts: 3 }],
    [uBump, { cs: 'Submitted and indexed', at: now - 10 * DAY, lct: now - 10 * DAY, failedAttempts: 1 }],
  ]);
  const state = { latestRows: [], feedItems: feedItems, flags: [], runs: [] };
  const supa = makeFakeSupabase(state);

  const s1 = await runEscalation(supa, latest, feedItems, now);
  assert.equal(state.flags.filter((f) => f.source_type === 'inspection_broken' && f.url === uFlag).length, 1, '>=N attempts opens inspection_broken');
  assert.ok(!s1.bump.some((b) => b.url === uFlag), 'ceiling URL is un-bumped (slot released)');
  assert.equal(state.flags.filter((f) => f.source_type === 'inspection_broken' && f.url === uBump).length, 0, '<N attempts does NOT flag (no demonstrated attempt-failure yet)');
  assert.ok(s1.bump.some((b) => b.url === uBump), '<N attempts routes to the bump (records another attempt)');

  // EXACTLY once: the flagged URL is retired next sweep; the partial index would also swallow it.
  const s2 = await runEscalation(supa, latest, feedItems, now);
  assert.equal(state.flags.filter((f) => f.source_type === 'inspection_broken' && f.url === uFlag).length, 1, 'inspection_broken EXACTLY once across sweeps');
  assert.equal(errs.filter((m) => m.includes('[inspect][INSPECTION-BROKEN]') && m.includes('ceil-flag')).length, 1, 'ceiling error logs exactly once (on transition)');
}));

// ── ASSERTION 6 (THE death-spiral assertion -- AUTH DOWN / ZERO ATTEMPTS) ──────
// The exact spiral: a credential outage means fires never reach inspection, so ZERO attempt-rows
// are ever written. Every escalation-aged URL is stale (or never inspected) forever. Under the OLD
// duration-proxy ceiling this fired inspection_broken on ALL of them (566 flags -> 566 re-inserts
// per fire -> 60s timeout). Under attempt-evidence, zero recorded attempts makes the ceiling
// UNREACHABLE: no matter how much time elapses or how large the corpus, inspection_broken stays 0.
// They route to the bump (keep trying) instead -- and the LOOP-level auth flag (assertion 11) is
// what surfaces the outage, not per-URL noise.
test('death-spiral: auth down => zero recorded attempts => zero inspection_broken across many sweeps', captureLogs(async () => {
  const now = Date.now();
  const slugs = ['spiral-1', 'spiral-2', 'spiral-3', 'spiral-4', 'spiral-5'];
  const feedItems = slugs.map((sl) => cohortItem(sl, 60)); // all escalation-aged 15d past 45d
  const latest = new Map(); // NEVER inspected (auth never let a fire reach the inspect loop) -> ZERO attempts
  const state = { latestRows: [], feedItems: feedItems, flags: [], runs: [] };
  const supa = makeFakeSupabase(state);

  // Many sweeps -- time keeps elapsing, nothing ever freshens, corpus is fully stale.
  let bumpedAll = true;
  for (let k = 0; k < 5; k++) {
    const r = await runEscalation(supa, latest, feedItems, now);
    assert.equal(r.inspectionBroken, 0, 'sweep ' + k + ': ZERO inspection_broken (zero recorded attempts)');
    for (let i = 0; i < slugs.length; i++) if (!r.bump.some((b) => b.url === intelUrl(slugs[i]))) bumpedAll = false;
  }
  assert.equal(state.flags.filter((f) => f.source_type === 'inspection_broken').length, 0, 'NOT ONE inspection_broken flag ever opened (the 566-flag spiral, closed)');
  assert.ok(bumpedAll, 'every stale URL routes to the bump every sweep (keeps trying, never false-flags)');
}));

// ── ASSERTION 7 (Leg 4 -- crawl-recency gate on cohort_still_indexed) ─────────
// The flag CLAIMS "noindex is failing", which needs Google to have crawled RECENTLY and still
// indexed. A still-indexed pruned page (fresh verdict, 45d+ noindex) whose last_crawl_time is
// OLD or ABSENT must NOT flag (Google has not reprocessed -- the 272's exact situation) and must
// NOT bump (re-inspecting cannot refresh Google's crawl). Only fresh verdict + RECENT crawl flags.
test('cohort crawl-recency: old/absent crawl does NOT flag or bump; recent crawl does flag', captureLogs(async () => {
  const now = Date.now();
  const uRecent = intelUrl('crawl-recent'); // fresh verdict, still-indexed, crawled 1d ago -> FLAG
  const uOld = intelUrl('crawl-old');       // fresh verdict, still-indexed, crawled 20d ago -> premature
  const uNull = intelUrl('crawl-null');     // fresh verdict, still-indexed, no crawl time -> premature
  const feedItems = [cohortItem('crawl-recent', 50), cohortItem('crawl-old', 50), cohortItem('crawl-null', 50)];
  const latest = new Map([
    [uRecent, { cs: 'Submitted and indexed', at: now - 2 * DAY, lct: now - 1 * DAY, failedAttempts: 0 }],
    [uOld, { cs: 'Submitted and indexed', at: now - 2 * DAY, lct: now - 20 * DAY, failedAttempts: 0 }],
    [uNull, { cs: 'Submitted and indexed', at: now - 2 * DAY, lct: null, failedAttempts: 0 }],
  ]);
  const state = { latestRows: [], feedItems: feedItems, flags: [], runs: [] };
  const supa = makeFakeSupabase(state);

  const r = await runEscalation(supa, latest, feedItems, now);

  assert.equal(state.flags.filter((f) => f.source_type === 'cohort_still_indexed' && f.url === uOld).length, 0, 'old crawl does NOT flag (Google has not reprocessed)');
  assert.equal(state.flags.filter((f) => f.source_type === 'cohort_still_indexed' && f.url === uNull).length, 0, 'absent crawl does NOT flag');
  assert.ok(!r.bump.some((b) => b.url === uOld), 'old crawl does NOT bump (verdict already fresh; re-inspect cannot refresh Google crawl)');
  assert.ok(!r.bump.some((b) => b.url === uNull), 'absent crawl does NOT bump');
  assert.equal(r.cohortPremature, 2, 'both premature URLs counted (heartbeat visibility)');
  assert.equal(state.flags.filter((f) => f.source_type === 'cohort_still_indexed' && f.url === uRecent).length, 1, 'recent crawl + still-indexed DOES flag');
  assert.equal(r.cohortFlagged, 1, 'exactly one cohort flag (the recent-crawl one only)');
  assert.equal(state.flags.filter((f) => f.source_type === 'inspection_broken').length, 0, 'no inspection_broken anywhere');
}));

// ── ASSERTION 8 (latest-per-url: the gate reads the NEWEST inspection's crawl) ─
// append-per-inspection means a URL has multiple gsc_url_inspection rows. The gate MUST read
// last_crawl_time from the row with max(inspected_at). Full path through selectInspectionCandidates.
test('latest-per-url: crawl-recency reads the newest inspection row, not an older one', captureLogs(async () => {
  const now = Date.now();
  const slug = 'multirow-1', url = intelUrl(slug);
  const latestRows = [
    { url: url, coverage_state: 'Submitted and indexed', inspected_at: iso(now - 10 * DAY), last_crawl_time: iso(now - 2 * DAY) },  // OLD inspection, recent-ish crawl (~2d)
    { url: url, coverage_state: 'Submitted and indexed', inspected_at: iso(now - 1 * DAY), last_crawl_time: iso(now - 25 * DAY) },   // NEW inspection, OLD crawl (~25d)
  ];
  const feedItems = [cohortItem(slug, 50)];
  const state = { latestRows: latestRows, feedItems: feedItems, flags: [], runs: [] };
  const supa = makeFakeSupabase(state);

  const sel = await selectInspectionCandidates(supa, now);
  const l = sel.latest.get(url);
  assert.ok(l && l.lct != null, 'url present in latest map with a crawl time');
  const crawlAgeD = (now - l.lct) / DAY;
  assert.ok(crawlAgeD > 20, 'reduction read the NEW inspection crawl (~25d), NOT the older row (~2d): got ' + crawlAgeD.toFixed(1) + 'd');

  const r = await runEscalation(supa, sel.latest, sel.fi, now);
  assert.equal(state.flags.filter((f) => f.source_type === 'cohort_still_indexed' && f.url === url).length, 0, 'no flag -- gate read the newest (old) crawl -> premature');
  assert.equal(r.cohortPremature, 1, 'counted premature (a stale-row read would have wrongly flagged)');
}));

// ── ASSERTION 9 (split accessor -- freshness NEVER contaminated by failure rows) ──
// The reduction (fix B): per url, freshness (cs/at/lct) comes ONLY from the latest SUCCESS row;
// failedAttempts counts sentinel FAILURE rows in the window. Three edge cases, each exact.
test('split accessor: failure rows are counted but never read as freshness', captureLogs(async () => {
  const now = Date.now();
  const u1 = intelUrl('split-recent-fail'); // recent failure + OLD success -> freshness = OLD success (STALE)
  const u2 = intelUrl('split-only-fail');   // only failures            -> freshness ABSENT
  const u3 = intelUrl('split-fresh-success'); // success older-than-a-newer-failure but fresh -> FRESH from success
  const F = ATTEMPT_FAILED_STATE;
  const latestRows = [
    // u1: success 10d old; a recent failure (1h, in window); an OLD failure (5d, OUT of window -> not counted).
    { url: u1, coverage_state: 'Submitted and indexed', inspected_at: iso(now - 10 * DAY), last_crawl_time: iso(now - 10 * DAY) },
    { url: u1, coverage_state: F, inspected_at: iso(now - 1 * HOUR) },
    { url: u1, coverage_state: F, inspected_at: iso(now - 5 * DAY) },
    // u2: two failures in window, NO success ever.
    { url: u2, coverage_state: F, inspected_at: iso(now - 1 * HOUR) },
    { url: u2, coverage_state: F, inspected_at: iso(now - 3 * HOUR) },
    // u3: a NEWER failure (1h) and an OLDER-but-fresh success (2h). Freshness must come from the success.
    { url: u3, coverage_state: F, inspected_at: iso(now - 1 * HOUR) },
    { url: u3, coverage_state: 'Submitted and indexed', inspected_at: iso(now - 2 * HOUR), last_crawl_time: iso(now - 2 * HOUR) },
  ];
  const state = { latestRows: latestRows, feedItems: [], flags: [], runs: [] };
  const supa = makeFakeSupabase(state);

  const sel = await selectInspectionCandidates(supa, now);

  // Case 1: recent failure + old success -> freshness is the OLD success (stale); the OUT-of-window failure is NOT counted.
  const l1 = sel.latest.get(u1);
  assert.equal(l1.cs, 'Submitted and indexed', 'case1: cs from the SUCCESS row, never the failure sentinel');
  assert.ok(Math.abs(l1.at - (now - 10 * DAY)) < HOUR, 'case1: at is the OLD success time (STALE), not the recent failure');
  assert.equal(l1.failedAttempts, 1, 'case1: only the IN-window failure counts (the 5d-old one is excluded)');

  // Case 2: only failures -> freshness ABSENT, attempts counted.
  const l2 = sel.latest.get(u2);
  assert.equal(l2.cs, null, 'case2: cs ABSENT (no success row exists)');
  assert.equal(l2.at, null, 'case2: at ABSENT -> isVerdictFresh is false (freshness cannot be forged from failures)');
  assert.equal(l2.failedAttempts, 2, 'case2: both in-window failures counted');

  // Case 3: newer failure + older-but-fresh success -> freshness from the success (FRESH), attempt counted.
  const l3 = sel.latest.get(u3);
  assert.equal(l3.cs, 'Submitted and indexed', 'case3: cs from the success row');
  assert.ok(Math.abs(l3.at - (now - 2 * HOUR)) < HOUR, 'case3: at is the success time (~2h -> FRESH); the newer failure did NOT overwrite it');
  assert.equal(l3.failedAttempts, 1, 'case3: the newer failure is counted as an attempt');
}));

// ── ASSERTION 10 (retirement -- an open flag excludes the URL from the sweep) ──
// A cohort URL that WOULD flag (fresh + recent crawl + still-indexed) but already has an OPEN flag
// must be SKIPPED entirely: no re-evaluation, no insertFlag round-trip. This is what collapsed the
// 566-round-trips-per-fire amplification into ONE open-flag read.
test('retirement: a URL with an open flag is excluded from the sweep (no re-insert round-trip)', captureLogs(async () => {
  const now = Date.now();
  const slug = 'retire-1', url = intelUrl(slug);
  const feedItems = [cohortItem(slug, 50)];
  // Fresh verdict + recent crawl + still-indexed => WOULD open cohort_still_indexed if evaluated.
  const latest = new Map([[url, { cs: 'Submitted and indexed', at: now - 2 * DAY, lct: now - 1 * DAY, failedAttempts: 0 }]]);
  // Pre-seed an OPEN flag for this URL (as a prior fire would have).
  const state = { latestRows: [], feedItems: feedItems, flags: [{ url: url, source_type: 'cohort_still_indexed', state: 'open', detail: 'prior' }], runs: [] };
  const supa = makeFakeSupabase(state);

  const r = await runEscalation(supa, latest, feedItems, now);
  assert.equal(r.cohortFlagged, 0, 'retired URL is not (re-)flagged this sweep');
  assert.equal(state.flags.length, 1, 'flag table unchanged -- the URL was never re-evaluated (no re-insert)');
  assert.equal(state.flags[0].detail, 'prior', 'the pre-existing flag row is untouched (no ON-CONFLICT churn)');
  assert.ok(!r.bump.some((b) => b.url === url), 'retired URL is not bumped either');
}));

// ── ASSERTION 11 (loop-level auth flag -- blame the LOOP with LOOP evidence) ──
// M consecutive fires finalizing status='error' at auth => ONE loop_auth_broken flag (sentinel
// url), not per-URL noise. Fewer than M raises nothing; a re-fire dedups (opens exactly once).
test('loop-auth: M consecutive auth-death fires raise ONE loop_auth_broken; fewer raise none', captureLogs(async ({ errs }) => {
  const authDownDeps = { authorizeToken: async () => ({ ok: false, error: 'invalid key' }) };

  // --- streak NOT met: 0 prior finalized fires -> this fire is the 1st error -> no loop flag. ---
  const now = Date.now();
  const stateA = { latestRows: [], feedItems: [], flags: [], runs: [] };
  const supaA = makeFakeSupabase(stateA);
  const rA = await runInspectionChunk(supaA, authDownDeps);
  assert.equal(rA.reason, 'auth', 'fire aborts at auth');
  assert.equal(stateA.flags.filter((f) => f.source_type === 'loop_auth_broken').length, 0, '1 error fire (< M=3) raises NO loop flag');

  // --- streak met: 2 prior finalized error fires + this auth-death fire = 3 -> ONE loop flag. ---
  const stateB = { latestRows: [], feedItems: [], flags: [], runs: [
    { id: 'r1', status: 'error', fired_at: iso(now - 30 * 60000) },
    { id: 'r2', status: 'error', fired_at: iso(now - 15 * 60000) },
  ] };
  const supaB = makeFakeSupabase(stateB);
  const rB = await runInspectionChunk(supaB, authDownDeps);
  assert.equal(rB.reason, 'auth', 'fire aborts at auth');
  assert.equal(stateB.flags.filter((f) => f.source_type === 'loop_auth_broken').length, 1, '3rd consecutive auth-death fire opens loop_auth_broken ONCE');
  assert.equal(errs.filter((m) => m.includes('[inspect][LOOP-AUTH-BROKEN]')).length, 1, 'loop-auth error logs once (on transition)');

  // --- re-fire: still a 3-error streak, but the flag already exists -> 23505 dedup, still ONE. ---
  const rB2 = await runInspectionChunk(supaB, authDownDeps);
  assert.equal(rB2.reason, 'auth', 're-fire still aborts at auth');
  assert.equal(stateB.flags.filter((f) => f.source_type === 'loop_auth_broken').length, 1, 'loop_auth_broken stays EXACTLY one (partial-index dedup)');
}));

// ── ASSERTION 12 (paginated read -- latest-per-url is COMPLETE past 1000 rows) ──
// The old single select capped at PostgREST's 1000 rows and silently dropped the rest. The
// paginated read (fix E) must reduce the FULL log: a url whose only row sits beyond index 1000
// must still appear in the latest map.
test('pagination: selectInspectionCandidates reduces ALL rows, including those past the 1000 cap', captureLogs(async () => {
  const now = Date.now();
  const N = 1001; // forces a second page (page1=1000 rows, page2=1 row)
  const latestRows = [];
  for (let i = 0; i < N; i++) {
    // inspected_at strictly descending by i, so i=1000 is the OLDEST -> lands on page 2 (range 1000-1999).
    latestRows.push({ url: intelUrl('pg-' + i), coverage_state: 'Submitted and indexed', inspected_at: iso(now - i * 1000), last_crawl_time: iso(now - i * 1000) });
  }
  const state = { latestRows: latestRows, feedItems: [], flags: [], runs: [] };
  const supa = makeFakeSupabase(state);

  const sel = await selectInspectionCandidates(supa, now);
  assert.equal(sel.latest.size, N, 'every one of the ' + N + ' urls is in the latest map (nothing dropped at the 1000 cap)');
  assert.ok(sel.latest.has(intelUrl('pg-1000')), 'the url beyond the 1000-row cap is present (paginated read is complete)');
}));
