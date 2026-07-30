// lib/gsc/inspectionRun.test.mjs
// Verification assertions for the Consumer C escalation BUMP + CEILING. Not a live run --
// a fake Supabase (emulating the indexation_flags partial unique index) + injected deps
// drive the loop with no Google/network. Run: node --test lib/gsc/inspectionRun.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runEscalation, runInspectionChunk } from './inspectionRun.js';

const DAY = 86400000;
const HOUR = 3600000;
const BASE = 'https://cyberneticpunks.com'; // must match feedUrl()'s BASE
const iso = (ms) => new Date(ms).toISOString();
const intelUrl = (slug) => BASE + '/intel/' + slug;

// A published (desired=IN) marathon feed_item created `createdAgeDays` ago.
function publishItem(slug, createdAgeDays) {
  return { slug: slug, game_slug: 'marathon', tags: [], is_published: true, noindex: false, noindexed_at: null, created_at: iso(Date.now() - createdAgeDays * DAY) };
}

// A noindexed (desired=OUT) cohort marathon feed_item noindexed `noindexAgeDays` ago.
function cohortItem(slug, noindexAgeDays) {
  return { slug: slug, game_slug: 'marathon', tags: [], is_published: true, noindex: true, noindexed_at: iso(Date.now() - noindexAgeDays * DAY), created_at: iso(Date.now() - 200 * DAY) };
}

// Fake Supabase supporting exactly the call chains selectInspectionCandidates / runEscalation
// / runInspectionChunk use. indexation_flags.insert EMULATES the partial unique index on
// (url, source_type) WHERE state='open' -- a duplicate open flag returns Postgres 23505.
function makeFakeSupabase(state) {
  class Q {
    constructor(table) { this.table = table; this.verb = null; this.payload = null; this.filters = {}; this.rangeArgs = null; }
    select(_cols, opts) { if (!this.verb) this.verb = 'select'; if (opts && opts.count) this.count = true; return this; }
    insert(payload) { this.verb = 'insert'; this.payload = payload; return this; }
    update(payload) { this.verb = 'update'; this.payload = payload; return this; }
    order() { return this; }
    range(a, b) { this.rangeArgs = [a, b]; return this; }
    limit(n) { this.limitN = n; return this; }
    eq(col, val) { this.filters[col] = val; return this; }
    single() { return this; }
    then(resolve, reject) { return Promise.resolve().then(() => this._run()).then(resolve, reject); }
    _run() {
      const s = state;
      if (this.table === 'gsc_url_inspection' && this.verb === 'select') return { data: s.latestRows, error: null };
      if (this.table === 'feed_items' && this.verb === 'select') {
        const a = this.rangeArgs ? this.rangeArgs[0] : 0, b = this.rangeArgs ? this.rangeArgs[1] : 999;
        return { data: s.feedItems.slice(a, b + 1), error: null };
      }
      if (this.table === 'inspection_runs' && this.verb === 'select') {
        // loopEpoch query: earliest fired_at (order asc + limit 1). fired_at defaults to now on insert.
        const sorted = s.runs.slice().sort((a, b) => Date.parse(a.fired_at) - Date.parse(b.fired_at));
        return { data: this.limitN != null ? sorted.slice(0, this.limitN) : sorted, error: null };
      }
      if (this.table === 'inspection_runs' && this.verb === 'insert') {
        const id = 'run-' + (s.runs.length + 1);
        s.runs.push(Object.assign({ id: id, fired_at: iso(Date.now()) }, this.payload)); return { data: { id: id }, error: null };
      }
      if (this.table === 'inspection_runs' && this.verb === 'update') {
        const r = s.runs.find((x) => x.id === this.filters.id); if (r) Object.assign(r, this.payload); return { error: null };
      }
      if (this.table === 'indexation_flags' && this.verb === 'insert') {
        const p = this.payload;
        const dup = s.flags.some((f) => f.url === p.url && f.source_type === p.source_type && f.state === 'open');
        if (dup) return { error: { code: '23505', message: 'duplicate key value violates unique constraint "indexation_flags_open_uniq"' } };
        s.flags.push(Object.assign({ state: 'open' }, p)); return { error: null };
      }
      if (this.table === 'indexation_flags' && this.verb === 'select') {
        const n = s.flags.filter((f) => this.filters.state == null || f.state === this.filters.state).length;
        return { count: n, data: null, error: null };
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

// ── ASSERTION 1 ──────────────────────────────────────────────────────────────
// A synthetic KILLED fire whose freshness-violation URL is re-bumped and inspected the
// FOLLOWING fire -- proving derive-not-store durability (no persisted bump state).
test('bump: a killed fire re-derives the bump; the following fire inspects the URL', captureLogs(async () => {
  const now = Date.now();
  const slug = 'stalled-1', url = intelUrl(slug);
  const feedItems = [publishItem(slug, 40)]; // 40d old => past the 30d escalate threshold
  // Latest verdict: not-indexed, 2d3h old => just went stale (fresh window 2*1d), so bump-
  // eligible only ~3h -- well under the 6h ceiling => BUMP band, not the ceiling. Still >2d so
  // it is NOT due by normal selection (weekly=7d), isolating the bump as the only inspect path.
  const staleAt = now - (2 * DAY + 3 * HOUR);
  const latestRows = [{ url: url, coverage_state: 'URL is unknown to Google', inspected_at: iso(staleAt) }];
  const latestMap = new Map([[url, { cs: 'URL is unknown to Google', at: staleAt }]]);
  const state = { latestRows: latestRows, feedItems: feedItems, flags: [], runs: [] };
  const supa = makeFakeSupabase(state);

  // FIRE 1 -- "killed": the sweep identifies the bump, then the process dies before the loop.
  // Nothing is persisted (no bump marker; the verdict is untouched).
  const killed = await runEscalation(supa, latestMap, feedItems, now);
  assert.ok(killed.bump.some((b) => b.url === url), 'fire1 sweep identifies the freshness-violation bump');
  assert.equal(state.flags.length, 0, 'fire1 persisted NO bump state (derive, not store)');

  // FIRE 2 -- the following fire over the SAME durable state (the kill changed nothing). U is
  // NOT due by normal selection (40d publish is demoted to weekly=7d, verdict only 2d3h old), so
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

// ── ASSERTION 2 ──────────────────────────────────────────────────────────────
// A synthetic URL that has been continuously bump-eligible far past the ceiling and never
// freshens: it STOPS being bumped and appears in indexation_flags as inspection_broken once.
test('ceiling: continuously-bump-eligible-past-K URL is un-bumped and flagged inspection_broken exactly once', captureLogs(async ({ errs }) => {
  const now = Date.now();
  const slug = 'broken-1', url = intelUrl(slug);
  const feedItems = [publishItem(slug, 40)]; // created 40d ago => escalation-aged since 10d ago
  // Latest verdict: not-indexed, 5d old => stale since 3d ago; bump-eligible ~72h >> 6h ceiling.
  const latestMap = new Map([[url, { cs: 'URL is unknown to Google', at: now - 5 * DAY }]]);
  // loopEpoch 30d ago => the URL has been within the loop's lifetime the whole stale window.
  const state = { latestRows: [], feedItems: feedItems, flags: [], runs: [{ fired_at: iso(now - 30 * DAY) }] };
  const supa = makeFakeSupabase(state);

  // Sweep 1: crosses the ceiling -> un-bump + open inspection_broken.
  const s1 = await runEscalation(supa, latestMap, feedItems, now);
  assert.equal(s1.inspectionBroken, 1, 'sweep1 opens inspection_broken');
  assert.ok(!s1.bump.some((b) => b.url === url), 'ceiling URL is NOT bumped (slot released)');
  assert.equal(state.flags.filter((f) => f.source_type === 'inspection_broken' && f.url === url).length, 1, 'one inspection_broken row after sweep1');

  // Sweep 2: still bump-eligible-past-K (re-derived from durable timestamps) -> the partial
  // unique index must swallow the re-insert (23505), so NO second row and NO second log.
  const s2 = await runEscalation(supa, latestMap, feedItems, now);
  assert.equal(s2.inspectionBroken, 0, 'sweep2 does not re-open (23505 = ON CONFLICT DO NOTHING)');
  assert.ok(!s2.bump.some((b) => b.url === url), 'ceiling URL still not bumped on sweep2');
  assert.equal(state.flags.filter((f) => f.source_type === 'inspection_broken' && f.url === url).length, 1, 'EXACTLY once across both sweeps');
  assert.equal(errs.filter((m) => m.includes('[inspect][INSPECTION-BROKEN]')).length, 1, 'the ceiling error logs exactly once (on transition)');
}));

// ── ASSERTION 3 (the 272-flag bug, asserted against) ─────────────────────────
// The cohort sweep must run the SAME shared freshness gate as publish. A never-inspected
// cohort URL past 45d must NOT open a cohort_still_indexed flag -- it routes to starvation
// (keeps inspecting). A stale still-indexed verdict likewise must not false-flag. Only a
// FRESH still-indexed verdict flags (positive control -- the fix must not break real flags).
test('cohort freshness: never-inspected + stale-verdict past 45d do NOT false-flag; fresh does', captureLogs(async () => {
  const now = Date.now();
  const uNever = intelUrl('cohort-never'); // just past 45d, never inspected -> bump-eligible ~1h
  const uStale = intelUrl('cohort-stale'); // still-indexed verdict just went stale -> bump-eligible ~1h
  const uFresh = intelUrl('cohort-fresh'); // still-indexed verdict, 2d old (fresh: <= 2x*3d)
  // uNever/uStale sit in the BUMP band (bump-eligible < 6h ceiling) so they route to re-inspect,
  // not the ceiling -- this test isolates the FRESHNESS gate, not the ceiling (assertion 5).
  const feedItems = [cohortItem('cohort-never', 45 + 1 / 24), cohortItem('cohort-stale', 50), cohortItem('cohort-fresh', 50)];
  const latest = new Map([
    [uStale, { cs: 'Submitted and indexed', at: now - (6 * DAY + 1 * HOUR) }], // stale (>6d) but only ~1h past staleness onset
    [uFresh, { cs: 'Submitted and indexed', at: now - 2 * DAY }],
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
  assert.equal(state.flags.filter((f) => f.source_type === 'inspection_broken').length, 0, 'no inspection_broken (both are within the bump band, not past K)');
  // Positive control: a FRESH still-indexed verdict past 45d still flags (the fix is a gate, not a mute).
  assert.equal(state.flags.filter((f) => f.source_type === 'cohort_still_indexed' && f.url === uFresh).length, 1, 'fresh still-indexed verdict DOES flag cohort_still_indexed');
  assert.equal(r.cohortFlagged, 1, 'exactly one cohort flag opened (the fresh one only)');
}));

// ── ASSERTION 4 (backlog immunity -- queue position is not evidence) ──────────
// A never-inspected URL that is NOT escalation-aged (the Jul-23 cohort shape: day 3 of 45) is
// maximally "stale" by raw verdict-age (no verdict at all) yet has been measured by no one and
// attempted by no one. It must NOT open inspection_broken (nor any flag): its staleness is
// queue position, and queue position asserts nothing. This is the ~1023-backlog immunity.
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

// ── ASSERTION 5 (ceiling scoped to demonstrated attempt-failure) ─────────────
// inspection_broken fires ONLY for a URL continuously bump-eligible past K and still not fresh
// -- "the loop tried and cannot". A URL that only JUST became escalation-aged (bump-eligible
// hours < K) must BUMP, not flag: it has not yet had K hours of attempts.
test('ceiling scoped: past-K bump-eligible flags once; just-eligible bumps', captureLogs(async ({ errs }) => {
  const now = Date.now();
  const uPastK = intelUrl('ceil-pastk'); // escalation-aged 15d, never inspected -> eligible ~15d >> K
  const uJust = intelUrl('ceil-just');   // escalation-aged only ~2h, never inspected -> eligible ~2h < K
  const feedItems = [cohortItem('ceil-pastk', 60), cohortItem('ceil-just', 45 + 2 / 24)];
  const latest = new Map(); // both never inspected (absent verdict = stale since escalation onset)
  // loopEpoch 30d ago => both URLs have been within the loop's lifetime the whole time.
  const state = { latestRows: [], feedItems: feedItems, flags: [], runs: [{ fired_at: iso(now - 30 * DAY) }] };
  const supa = makeFakeSupabase(state);

  const s1 = await runEscalation(supa, latest, feedItems, now);
  // past-K: continuously bump-eligible > K and never freshened -> inspection_broken.
  assert.equal(state.flags.filter((f) => f.source_type === 'inspection_broken' && f.url === uPastK).length, 1, 'past-K opens inspection_broken');
  assert.ok(!s1.bump.some((b) => b.url === uPastK), 'past-K is un-bumped (ceiling released the slot)');
  // just-eligible: escalation-aged but only ~2h bump-eligible -> BUMP, never flags (K not reached).
  assert.equal(state.flags.filter((f) => f.source_type === 'inspection_broken' && f.url === uJust).length, 0, 'just-eligible does NOT flag (K not reached -- no demonstrated attempt-failure)');
  assert.ok(s1.bump.some((b) => b.url === uJust), 'just-eligible routes to the bump (keeps inspecting)');

  // EXACTLY once: second sweep re-derives the same past-K condition; the partial index swallows it.
  const s2 = await runEscalation(supa, latest, feedItems, now);
  assert.equal(state.flags.filter((f) => f.source_type === 'inspection_broken' && f.url === uPastK).length, 1, 'inspection_broken EXACTLY once across sweeps');
  assert.equal(errs.filter((m) => m.includes('[inspect][INSPECTION-BROKEN]') && m.includes('ceil-pastk')).length, 1, 'ceiling error logs exactly once (on transition)');
}));

// ── ASSERTION 6 (deploy-boundary -- pre-loop staleness is unmeasured) ────────
// A URL escalation-aged-and-stale since BEFORE the loop existed (loopEpoch just 1h ago) must
// NOT flag inspection_broken on the first sweep -- those "attempts" never happened (no loop).
// It bumps until K hours of ACTUAL post-loop-start eligibility elapse. Without the loopEpoch
// floor this URL reads as ~15d bump-eligible and would wrongly ceiling immediately.
test('deploy-boundary: aged-and-stale-since-before-loopEpoch does NOT flag on the first sweep', captureLogs(async () => {
  const now = Date.now();
  const url = intelUrl('deploy-1'); // cohort noindexed 60d ago (escalation-aged 15d), never inspected
  const feedItems = [cohortItem('deploy-1', 60)];
  const latest = new Map(); // never inspected -> stale since escalation onset 15d ago (pre-loop)
  // loopEpoch = 1h ago: the loop just started. Eligibility floors here => ~1h, well under K.
  const state = { latestRows: [], feedItems: feedItems, flags: [], runs: [{ fired_at: iso(now - 1 * HOUR) }] };
  const supa = makeFakeSupabase(state);

  const r = await runEscalation(supa, latest, feedItems, now);
  assert.equal(state.flags.filter((f) => f.source_type === 'inspection_broken' && f.url === url).length, 0, 'NO inspection_broken -- pre-loop staleness is not attempt-time');
  assert.ok(r.bump.some((b) => b.url === url), 'routes to the bump until K hours of real post-loop attempts elapse');
}));
