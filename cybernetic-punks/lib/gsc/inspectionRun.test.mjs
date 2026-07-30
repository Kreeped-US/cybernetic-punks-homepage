// lib/gsc/inspectionRun.test.mjs
// Verification assertions for the Consumer C escalation BUMP + CEILING. Not a live run --
// a fake Supabase (emulating the indexation_flags partial unique index) + injected deps
// drive the loop with no Google/network. Run: node --test lib/gsc/inspectionRun.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runEscalation, runInspectionChunk } from './inspectionRun.js';

const DAY = 86400000;
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
      if (this.table === 'inspection_runs' && this.verb === 'insert') {
        const id = 'run-' + (s.runs.length + 1); s.runs.push(Object.assign({ id: id }, this.payload)); return { data: { id: id }, error: null };
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
  // Latest verdict: not-indexed, 3d old => inside the bump band (2x < 3 <= 4x of the 1d interval).
  const latestRows = [{ url: url, coverage_state: 'URL is unknown to Google', inspected_at: iso(now - 3 * DAY) }];
  const latestMap = new Map([[url, { cs: 'URL is unknown to Google', at: now - 3 * DAY }]]);
  const state = { latestRows: latestRows, feedItems: feedItems, flags: [], runs: [] };
  const supa = makeFakeSupabase(state);

  // FIRE 1 -- "killed": the sweep identifies the bump, then the process dies before the loop.
  // Nothing is persisted (no bump marker; the verdict is untouched).
  const killed = await runEscalation(supa, latestMap, feedItems, now);
  assert.ok(killed.bump.some((b) => b.url === url), 'fire1 sweep identifies the freshness-violation bump');
  assert.equal(state.flags.length, 0, 'fire1 persisted NO bump state (derive, not store)');

  // FIRE 2 -- the following fire over the SAME durable state (the kill changed nothing). U is
  // NOT due by normal selection (40d publish is demoted to weekly=7d, verdict only 3d old), so
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
// A synthetic ALWAYS-FAILING URL whose verdict never freshens crosses the 4x ceiling: it
// STOPS being bumped and appears in indexation_flags as inspection_broken EXACTLY once.
test('ceiling: >4x-stale URL is un-bumped and flagged inspection_broken exactly once', captureLogs(async ({ errs }) => {
  const now = Date.now();
  const slug = 'broken-1', url = intelUrl(slug);
  const feedItems = [publishItem(slug, 40)];
  // Latest verdict: not-indexed, 5d old => past the 4x ceiling (4d) of the 1d interval.
  const latestMap = new Map([[url, { cs: 'URL is unknown to Google', at: now - 5 * DAY }]]);
  const state = { latestRows: [], feedItems: feedItems, flags: [], runs: [] };
  const supa = makeFakeSupabase(state);

  // Sweep 1: crosses the ceiling -> un-bump + open inspection_broken.
  const s1 = await runEscalation(supa, latestMap, feedItems, now);
  assert.equal(s1.inspectionBroken, 1, 'sweep1 opens inspection_broken');
  assert.ok(!s1.bump.some((b) => b.url === url), 'ceiling URL is NOT bumped (slot released)');
  assert.equal(state.flags.filter((f) => f.source_type === 'inspection_broken' && f.url === url).length, 1, 'one inspection_broken row after sweep1');

  // Sweep 2: verdict is still 5d stale (re-derived from durable timestamps) -> the partial
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
  const uNever = intelUrl('cohort-never'); // never inspected
  const uStale = intelUrl('cohort-stale'); // still-indexed verdict, but 10d old (stale: > 2x*3d)
  const uFresh = intelUrl('cohort-fresh'); // still-indexed verdict, 2d old (fresh: <= 2x*3d)
  const feedItems = [cohortItem('cohort-never', 50), cohortItem('cohort-stale', 50), cohortItem('cohort-fresh', 50)];
  const latest = new Map([
    [uStale, { cs: 'Submitted and indexed', at: now - 10 * DAY }],
    [uFresh, { cs: 'Submitted and indexed', at: now - 2 * DAY }],
    // uNever: absent from the map (never inspected)
  ]);
  const state = { latestRows: [], feedItems: feedItems, flags: [], runs: [] };
  const supa = makeFakeSupabase(state);

  const r = await runEscalation(supa, latest, feedItems, now);

  // The 272 bug: NEITHER the never-inspected NOR the stale-verdict URL may open cohort_still_indexed.
  assert.equal(state.flags.filter((f) => f.source_type === 'cohort_still_indexed' && f.url === uNever).length, 0, 'never-inspected does NOT false-flag cohort_still_indexed');
  assert.equal(state.flags.filter((f) => f.source_type === 'cohort_still_indexed' && f.url === uStale).length, 0, 'stale verdict does NOT false-flag cohort_still_indexed');
  // Both unconfirmed URLs route to starvation (keeps inspecting), not silence.
  assert.ok(r.bump.some((b) => b.url === uNever), 'never-inspected routes to the bump (keeps inspecting)');
  assert.ok(r.bump.some((b) => b.url === uStale), 'stale verdict routes to the bump (re-inspect to confirm)');
  // Positive control: a FRESH still-indexed verdict past 45d still flags (the fix is a gate, not a mute).
  assert.equal(state.flags.filter((f) => f.source_type === 'cohort_still_indexed' && f.url === uFresh).length, 1, 'fresh still-indexed verdict DOES flag cohort_still_indexed');
  assert.equal(r.cohortFlagged, 1, 'exactly one cohort flag opened (the fresh one only)');
}));
