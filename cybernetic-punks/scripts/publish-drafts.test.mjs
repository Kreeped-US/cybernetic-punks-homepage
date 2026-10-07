// scripts/publish-drafts.test.mjs
// publish-drafts.mjs cannot publish held or unapproved rows (2026-10-07). Eligibility is the pure,
// environment-independent lib/content/publishEligibility.js; the script's read, plan and write steps
// run here against a MOCKED Supabase client (no DB, no network). Importing the script never runs main.
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { publishEligibility, requiresApproval } from '../lib/content/publishEligibility.js';
import { HELD_EDITORS } from '../lib/content/heldForReview.js';
import { getGameConfig } from '../lib/games/index.js';
import { readDrafts, planPublish, printPlan, runPublish, KNOWN_GAMES } from './publish-drafts.mjs';

const dmz = getGameConfig('dmz');
const wardogs = getGameConfig('wardogs');
const marathon = getGameConfig('marathon');

// A body that passes body integrity (>= 400 chars, real prose) and matches no correction.
const CLEAN = 'This briefing covers the official patch notes and what changed for players this week. '.repeat(8);
// A body that trips the wardogs economy correction (entity "economy" + keyword "vendor") but is otherwise fine.
const FLAGGED = ('The Season 1 economy changed how the vendor prices gear for every squad this week. ' + CLEAN);
const STUB = 'TODO';

let n = 0;
function row(over) {
  n++;
  return Object.assign({
    id: 'id-' + n, slug: 'slug-' + n, headline: 'Headline number ' + n + ' for this draft',
    body: CLEAN, editor: 'CIPHER', game_slug: 'wardogs', rejected: null, gate_status: 'clear',
    operator_approved_at: null, noindex: true, noindexed_at: null, created_at: '2026-10-01T00:00:00Z',
  }, over);
}

const prevFlag = process.env.STORE_ROW_CITATION_ENABLED;
afterEach(() => {
  if (prevFlag === undefined) delete process.env.STORE_ROW_CITATION_ENABLED; else process.env.STORE_ROW_CITATION_ENABLED = prevFlag;
});

// ── eligibility matrix ───────────────────────────────────────────────────────────────────────
test('HELD_EDITORS is imported, not copied (NEXUS and MIRANDA today)', () => {
  assert.deepEqual(HELD_EDITORS, ['NEXUS', 'MIRANDA']);
  const src = readFileSync(new URL('../lib/content/publishEligibility.js', import.meta.url), 'utf8');
  assert.match(src, /import \{ HELD_EDITORS \} from '\.\/heldForReview\.js';/);
  assert.doesNotMatch(src, /\['NEXUS'|"NEXUS"|'MIRANDA'\]/, 'no copied editor list');
});

test('requiresApproval: HELD_EDITORS editor, or a holdForReview game; otherwise not', () => {
  assert.equal(requiresApproval({ editor: 'NEXUS' }, wardogs), true);
  assert.equal(requiresApproval({ editor: 'MIRANDA' }, marathon), true);
  assert.equal(requiresApproval({ editor: 'CIPHER' }, dmz), true, 'DMZ sets holdForReview');
  assert.equal(requiresApproval({ editor: 'CIPHER' }, getGameConfig('bodycam')), true, 'Bodycam sets holdForReview');
  assert.equal(requiresApproval({ editor: 'CIPHER' }, wardogs), false);
  assert.equal(requiresApproval({ editor: 'DEXTER' }, marathon), false);
});

test('eligibility matrix: rejected x gate_status x approval-required x approved, DMZ and Wardogs', () => {
  const games = [['dmz', dmz], ['wardogs', wardogs]];
  for (const [gname, cfg] of games) {
    for (const editor of ['NEXUS', 'CIPHER']) {
      for (const rejected of [true, false, null]) {
        for (const gate of ['held', 'clear', null]) {
          for (const approved of [null, '2026-10-07T00:00:00Z']) {
            const r = { editor, rejected, gate_status: gate, operator_approved_at: approved, game_slug: gname };
            const needs = editor === 'NEXUS' || cfg.editorial.holdForReview === true;
            const expected = rejected !== true && gate !== 'held' && (!needs || approved !== null);
            const got = publishEligibility(r, cfg);
            assert.equal(got.eligible, expected, JSON.stringify({ gname, ...r }));
            assert.equal(got.reasons.length === 0, expected);
          }
        }
      }
    }
  }
});

test('eligibility ignores STORE_ROW_CITATION_ENABLED entirely (env-independent)', () => {
  const r = { editor: 'NEXUS', rejected: false, gate_status: 'clear', operator_approved_at: null };
  delete process.env.STORE_ROW_CITATION_ENABLED;
  const off = publishEligibility(r, wardogs);
  process.env.STORE_ROW_CITATION_ENABLED = 'true';
  const on = publishEligibility(r, wardogs);
  assert.deepEqual(off, on);
  assert.equal(off.eligible, false, 'an unapproved NEXUS draft is never bulk-publishable, flag or not');
  for (const f of ['lib/content/publishEligibility.js', 'scripts/publish-drafts.mjs']) {
    const code = readFileSync(new URL('../' + f, import.meta.url), 'utf8').split(/\r?\n/).filter((l) => !/^\s*\/\//.test(l)).join('\n');
    assert.doesNotMatch(code, /STORE_ROW_CITATION_ENABLED/, f + ' does not read the env flag');
  }
});

test('every skip reason is reported (all rules checked)', () => {
  const got = publishEligibility({ editor: 'NEXUS', rejected: true, gate_status: 'held', operator_approved_at: null }, wardogs);
  assert.equal(got.reasons.length, 3);
  assert.match(got.reasons.join(' | '), /rejected.*gate_status='held'.*requires approval \(editor NEXUS is in HELD_EDITORS\)/);
});

// ── mocked Supabase client ─────────────────────────────────────────────────────────────────────
function mockClient(opts) {
  const calls = [];
  const o = opts || {};
  function builder(op) {
    const call = { op, filters: [], payload: null, select: null };
    calls.push(call);
    const b = {
      select(s) { call.select = s; return b; },
      update(p) { call.op = 'update'; call.payload = p; return b; },
      eq(c, v) { call.filters.push(['eq', c, v]); return b; },
      neq(c, v) { call.filters.push(['neq', c, v]); return b; },
      not(c, x, v) { call.filters.push(['not', c, x, v]); return b; },
      or(s) { call.filters.push(['or', s]); return b; },
      in(c, v) { call.filters.push(['in', c, v]); return b; },
      order() { return b; },
      maybeSingle() { return Promise.resolve(o.updateResult ? o.updateResult(call) : { data: null, error: null }); },
      then(res, rej) { return Promise.resolve({ data: o.rows || [], error: null }).then(res, rej); },
    };
    return b;
  }
  return { calls, from(t) { assert.equal(t, 'feed_items'); return builder('select'); } };
}

test('readDrafts: reads only this game\'s unpublished rows, with the eligibility columns', async () => {
  const c = mockClient({ rows: [] });
  await readDrafts(c, 'dmz', ['a', 'b']);
  const call = c.calls[0];
  for (const col of ['editor', 'rejected', 'gate_status', 'operator_approved_at', 'game_slug']) assert.match(call.select, new RegExp('\\b' + col + '\\b'));
  assert.deepEqual(call.filters, [['eq', 'game_slug', 'dmz'], ['eq', 'is_published', false], ['in', 'slug', ['a', 'b']]]);
});

// ── the four required fixtures ─────────────────────────────────────────────────────────────────
function fixtures() {
  return {
    heldDmz: row({ slug: 'dmz-held-draft-no-approval', game_slug: 'dmz', editor: 'NEXUS' }),
    approvedDmz: row({ slug: 'dmz-approved-draft', game_slug: 'dmz', editor: 'NEXUS', operator_approved_at: '2026-10-07T10:00:00Z' }),
    rejectedWd: row({ slug: 'wardogs-rejected-draft', game_slug: 'wardogs', editor: 'CIPHER', rejected: true }),
    normalWd: row({ slug: 'wardogs-normal-cipher-draft', game_slug: 'wardogs', editor: 'CIPHER' }),
  };
}

test('plan: held DMZ (no approval) skipped, approved DMZ eligible, rejected skipped, normal non-review draft eligible', () => {
  const f = fixtures();
  const pDmz = planPublish([f.heldDmz, f.approvedDmz], 'dmz', dmz, {});
  assert.deepEqual(pDmz.publish.map((e) => e.d.slug), ['dmz-approved-draft']);
  assert.deepEqual(pDmz.skipped.map((e) => e.d.slug), ['dmz-held-draft-no-approval']);
  const pWd = planPublish([f.rejectedWd, f.normalWd], 'wardogs', wardogs, {});
  assert.deepEqual(pWd.publish.map((e) => e.d.slug), ['wardogs-normal-cipher-draft']);
  assert.deepEqual(pWd.skipped.map((e) => e.d.slug), ['wardogs-rejected-draft']);
});

test('existing guards unchanged: integrity blocks even with --force; correction guard HOLDS unless --force', () => {
  const stub = row({ slug: 'wardogs-stub', body: STUB });
  const flagged = row({ slug: 'wardogs-flagged', body: FLAGGED });
  const p = planPublish([stub, flagged], 'wardogs', wardogs, {});
  assert.deepEqual(p.blocked.map((e) => e.d.slug), ['wardogs-stub']);
  assert.deepEqual(p.held.map((e) => e.d.slug), ['wardogs-flagged']);
  assert.equal(p.publish.length, 0);
  const pf = planPublish([stub, flagged], 'wardogs', wardogs, { force: true });
  assert.deepEqual(pf.blocked.map((e) => e.d.slug), ['wardogs-stub'], '--force never overrides body integrity');
  assert.deepEqual(pf.publish.map((e) => e.d.slug), ['wardogs-flagged'], '--force acknowledges the correction warning');
  // Eligibility runs first: an ineligible flagged row is SKIPPED, --force or not.
  const pr = planPublish([row({ slug: 'wardogs-flagged-nexus', editor: 'NEXUS', body: FLAGGED })], 'wardogs', wardogs, { force: true });
  assert.deepEqual(pr.skipped.map((e) => e.d.slug), ['wardogs-flagged-nexus']);
});

// ── writes ─────────────────────────────────────────────────────────────────────────────────────
test('runPublish: writes ONLY eligible rows, re-asserts eligibility in the WHERE, never stamps approval', async () => {
  const f = fixtures();
  const plan = planPublish([f.heldDmz, f.approvedDmz], 'dmz', dmz, {});
  const c = mockClient({ updateResult: (call) => ({ data: { id: call.filters[0][2], slug: 'dmz-approved-draft', is_published: true, noindex: false }, error: null }) });
  const logs = [];
  const res = await runPublish(c, plan, (s) => logs.push(s));
  assert.equal(res.ok, 1);
  assert.deepEqual(res.failed, []);
  const updates = c.calls.filter((x) => x.op === 'update');
  assert.equal(updates.length, 1, 'no write for the ineligible held DMZ draft');
  const u = updates[0];
  assert.deepEqual(u.payload, { is_published: true, noindex: false, noindexed_at: null });
  assert.equal('operator_approved_at' in u.payload, false, 'never stamps the approval receipt');
  assert.deepEqual(u.filters, [
    ['eq', 'id', f.approvedDmz.id], ['eq', 'is_published', false],
    ['not', 'rejected', 'is', true], ['or', 'gate_status.is.null,gate_status.neq.held'],
    ['not', 'operator_approved_at', 'is', null],
  ]);
  assert.match(u.select, /\bid\b/, 'RETURNING');
});

test('runPublish: a row not needing approval has no approval filter; an empty RETURNING is a failure', async () => {
  const f = fixtures();
  const plan = planPublish([f.normalWd], 'wardogs', wardogs, {});
  const c = mockClient({ updateResult: () => ({ data: null, error: null }) });
  const logs = [];
  const res = await runPublish(c, plan, (s) => logs.push(s));
  const u = c.calls.find((x) => x.op === 'update');
  assert.equal(u.filters.some((x) => x[1] === 'operator_approved_at'), false);
  assert.equal(res.ok, 0);
  assert.deepEqual(res.failed, ['wardogs-normal-cipher-draft'], 'main() exits non-zero on any failed');
  assert.match(logs.join('\n'), /FAIL wardogs-normal-cipher-draft -- the write matched no row/);
});

test('current DB shape (all 49 unpublished rows rejected): --commit --yes would select 0 rows for marathon and wardogs', async () => {
  // Fixtures mirror the 2026-10-07 read-only counts: marathon 35 (NEXUS 13, MIRANDA 12 incl. 1 approved,
  // CIPHER 6, DEXTER 4), wardogs 14 (NEXUS 12 incl. 1 approved, MIRANDA 2); every row rejected=true.
  const mk = (game, editor, count, approvedCount) => Array.from({ length: count }, (_, i) =>
    row({ game_slug: game, editor, rejected: true, operator_approved_at: i < (approvedCount || 0) ? '2026-09-01T00:00:00Z' : null }));
  const mara = [...mk('marathon', 'NEXUS', 13), ...mk('marathon', 'MIRANDA', 12, 1), ...mk('marathon', 'CIPHER', 6), ...mk('marathon', 'DEXTER', 4)];
  const ward = [...mk('wardogs', 'NEXUS', 12, 1), ...mk('wardogs', 'MIRANDA', 2)];
  assert.equal(mara.length, 35); assert.equal(ward.length, 14);
  for (const [game, rows, cfg] of [['marathon', mara, marathon], ['wardogs', ward, wardogs]]) {
    const plan = planPublish(rows, game, cfg, { force: true });
    assert.equal(plan.publish.length, 0, game + ': nothing to publish');
    assert.equal(plan.skipped.length, rows.length, game + ': every row skipped');
    const c = mockClient({ updateResult: () => { throw new Error('must not write'); } });
    const res = await runPublish(c, plan, () => {});
    assert.equal(res.ok, 0);
    assert.equal(c.calls.filter((x) => x.op === 'update').length, 0, game + ': zero write calls');
  }
});

test('script source: --commit writes only with --yes; no approval stamp anywhere; KNOWN_GAMES unchanged', () => {
  const src = readFileSync(new URL('./publish-drafts.mjs', import.meta.url), 'utf8');
  const code = src.split(/\r?\n/).filter((l) => !/^\s*\/\//.test(l)).join('\n');
  const iYes = code.indexOf("if (!yes) {");
  const iRun = code.indexOf('await runPublish(supabase, plan');
  assert.ok(iYes > 0 && iRun > iYes, 'the --yes check returns before runPublish');
  assert.doesNotMatch(code, /operator_approved_at\s*:/, 'never writes operator_approved_at');
  assert.deepEqual(KNOWN_GAMES, ['marathon', 'dmz', 'wardogs', 'pubg-dednet']);
});

test('printPlan lists would-publish and skipped rows with ids, slugs, game and reasons', () => {
  const f = fixtures();
  const lines = [];
  printPlan(planPublish([f.heldDmz, f.approvedDmz], 'dmz', dmz, {}), (s) => lines.push(s));
  const out = lines.join('\n');
  assert.match(out, /PUBLISH  id=\S+  slug=dmz-approved-draft  game=dmz/);
  assert.match(out, /SKIP     id=\S+  slug=dmz-held-draft-no-approval  game=dmz  editor=NEXUS  -- requires approval/);
});
