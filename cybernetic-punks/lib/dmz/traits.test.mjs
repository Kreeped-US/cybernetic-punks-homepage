// lib/dmz/traits.test.mjs
// DMZ trait planner (/dmz/traits): indexing gate, tolerant read, unverified redaction, and the page's
// empty vs data states. Fixture rows exist ONLY in this file (never in app code). The page is rendered
// through the JSX harness with its data read and the client planner stubbed.
import { test, before, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { traitRobots, traitPlannerIndexable, fetchTraitData, toClientNode, buildColumns, countVerified } from './traits.js';
import { dmz } from '../games/dmz.js';
import { loadComponent, render } from '../games/jsxHarness.test-helper.mjs';

const NOINDEX = { index: false, follow: true };
const realNow = Date.now;
afterEach(() => { Date.now = realNow; delete globalThis.__traitFixture; });

// Obviously-fake fixture values (not game data).
const TREES = [
  { slug: 'tree-a', label: 'Fixture Tree A', sort: 1, verified: true, verified_source: 'fixture', source_url: null },
  { slug: 'tree-b', label: 'Fixture Tree B', sort: 2, verified: false, verified_source: null, source_url: null },
];
const VERIFIED_ROW = { slug: 'fx-1', tree_slug: 'tree-a', tier: 1, position_in_tier: 1, name: 'Fixture Verified One', effect_text: 'Fixture effect one', point_cost: 2, level_required: 3, tags: null, verified: true, verified_source: 'fixture source', source_url: 'https://example.test/src' };
const VERIFIED_NO_COST = { slug: 'fx-2', tree_slug: 'tree-a', tier: 1, position_in_tier: 2, name: 'Fixture Verified No Cost', effect_text: null, point_cost: null, level_required: null, tags: null, verified: true, verified_source: 'fixture', source_url: null };
const UNVERIFIED_ROW = { slug: 'fx-3', tree_slug: 'tree-b', tier: 1, position_in_tier: 1, name: 'SECRET UNVERIFIED NAME', effect_text: 'SECRET UNVERIFIED EFFECT', point_cost: 77, level_required: 9, tags: null, verified: false, verified_source: null, source_url: null };
const ORPHAN_ROW = { slug: 'fx-4', tree_slug: 'tree-zz', tier: null, position_in_tier: null, name: 'Fixture Orphan', effect_text: null, point_cost: 1, level_required: null, tags: null, verified: true, verified_source: 'fixture', source_url: null };

// -- Indexing gate -------------------------------------------------------------------------------
test('traitRobots: noindex,follow with the shipped config (flag false)', () => {
  assert.equal(dmz.traitPlanner.indexable, false, 'shipped default is false');
  assert.deepEqual(traitRobots(dmz), NOINDEX);
});

test('traitRobots: takes no rows -- row counts can never flip it', () => {
  assert.equal(traitRobots.length, 1, 'signature is (cfg) only');
  // Extra arguments (if anyone passes rows) are ignored.
  assert.deepEqual(traitRobots(dmz, [VERIFIED_ROW, VERIFIED_NO_COST, ORPHAN_ROW]), NOINDEX);
});

test('traitRobots: still noindex when the DMZ game itself is live (status and clock)', () => {
  Date.now = () => Date.parse('2026-10-24T12:00:00Z');
  assert.deepEqual(traitRobots({ ...dmz, status: 'live', launched: true }), NOINDEX);
  assert.deepEqual(traitRobots(dmz), NOINDEX);
});

test('traitRobots: indexable only when traitPlanner.indexable is true (and dmz.indexable is true)', () => {
  const on = { ...dmz, traitPlanner: { ...dmz.traitPlanner, indexable: true } };
  assert.equal(traitRobots(on), undefined, 'inherits index from the layout');
  assert.equal(traitPlannerIndexable(on), true);
  assert.deepEqual(traitRobots({ ...on, indexable: false }), NOINDEX, 'DMZ-wide SEO flag off -> noindex');
  assert.deepEqual(traitRobots({ ...dmz, traitPlanner: { indexable: 'true' } }), NOINDEX, 'only boolean true counts');
  assert.deepEqual(traitRobots({ ...dmz, traitPlanner: undefined }), NOINDEX);
  assert.deepEqual(traitRobots(null), NOINDEX);
});

// -- Tolerant read -------------------------------------------------------------------------------
function fakeClient(results) {
  const calls = [];
  return {
    calls,
    from(table) {
      const q = { table, ops: [] };
      calls.push(q);
      const chain = {
        select(c) { q.ops.push(['select', c]); return chain; },
        eq(a, b) { q.ops.push(['eq', a, b]); return chain; },
        order(a) { q.ops.push(['order', a]); return chain; },
        then(res, rej) { const r = results[table]; return (typeof r === 'function' ? Promise.resolve().then(r) : Promise.resolve(r)).then(res, rej); },
      };
      return chain;
    },
  };
}

function quietly(fn) {
  const orig = console.error;
  const logged = [];
  console.error = (...a) => { logged.push(a.join(' ')); };
  return fn().finally(() => { console.error = orig; }).then((v) => ({ v, logged }));
}

test('fetchTraitData: missing tables (PGRST205) -> zero rows, logged, no throw', async () => {
  const missing = { data: null, error: { code: 'PGRST205', message: "Could not find the table 'public.dmz_trait_trees'" } };
  const { v, logged } = await quietly(() => fetchTraitData(fakeClient({ dmz_trait_trees: missing, dmz_traits: missing })));
  assert.deepEqual(v, { trees: [], traits: [] });
  assert.equal(logged.length, 1);
  assert.match(logged[0], /read failed, rendering zero rows/);
});

test('fetchTraitData: a traits error after a good trees read -> zero rows overall', async () => {
  const { v } = await quietly(() => fetchTraitData(fakeClient({ dmz_trait_trees: { data: TREES, error: null }, dmz_traits: { data: null, error: { message: 'boom' } } })));
  assert.deepEqual(v, { trees: [], traits: [] });
});

test('fetchTraitData: a thrown client error -> zero rows, no throw', async () => {
  const { v } = await quietly(() => fetchTraitData(fakeClient({ dmz_trait_trees: () => { throw new Error('network down'); } })));
  assert.deepEqual(v, { trees: [], traits: [] });
});

test('fetchTraitData: empty tables -> zero rows, no log; reads are DMZ-scoped', async () => {
  const client = fakeClient({ dmz_trait_trees: { data: [], error: null }, dmz_traits: { data: [], error: null } });
  const { v, logged } = await quietly(() => fetchTraitData(client));
  assert.deepEqual(v, { trees: [], traits: [] });
  assert.equal(logged.length, 0);
  assert.deepEqual(client.calls.map((c) => c.table), ['dmz_trait_trees', 'dmz_traits']);
  for (const c of client.calls) assert.ok(c.ops.some((o) => o[0] === 'eq' && o[1] === 'game_slug' && o[2] === 'dmz'));
});

test('fetchTraitData: rows pass through', async () => {
  const { v } = await quietly(() => fetchTraitData(fakeClient({ dmz_trait_trees: { data: TREES, error: null }, dmz_traits: { data: [VERIFIED_ROW], error: null } })));
  assert.equal(v.trees.length, 2);
  assert.equal(v.traits.length, 1);
});

// -- Redaction + columns -------------------------------------------------------------------------
test('toClientNode: an unverified row keeps only its position (no name, effect, cost, level, source)', () => {
  const n = toClientNode(UNVERIFIED_ROW);
  assert.deepEqual(n, { slug: 'fx-3', tier: 1, position: 1, verified: false });
  assert.ok(!JSON.stringify(n).includes('SECRET'));
});

test('toClientNode: a verified row carries its documented fields; null cost stays null', () => {
  assert.deepEqual(toClientNode(VERIFIED_ROW), { slug: 'fx-1', tier: 1, position: 1, verified: true, name: 'Fixture Verified One', effect: 'Fixture effect one', cost: 2, level: 3, source: 'fixture source', sourceUrl: 'https://example.test/src' });
  assert.equal(toClientNode(VERIFIED_NO_COST).cost, null);
});

test('buildColumns: tree order kept, unverified tree label hidden, orphans in a trailing column, per-column counts', () => {
  const cols = buildColumns(TREES, [VERIFIED_ROW, VERIFIED_NO_COST, UNVERIFIED_ROW, ORPHAN_ROW]);
  assert.deepEqual(cols.map((c) => c.slug), ['tree-a', 'tree-b', null]);
  assert.equal(cols[0].label, 'Fixture Tree A');
  assert.equal(cols[1].label, null, 'unverified tree label not shown');
  assert.deepEqual([cols[0].verifiedCount, cols[0].total], [2, 2]);
  assert.deepEqual([cols[1].verifiedCount, cols[1].total], [0, 1]);
  assert.deepEqual([cols[2].verifiedCount, cols[2].total], [1, 1]);
  assert.ok(!JSON.stringify(cols).includes('SECRET'));
  assert.equal(countVerified([VERIFIED_ROW, UNVERIFIED_ROW]), 1);
});

// -- The page (server component through the JSX harness) ------------------------------------------
let Page;
before(async () => {
  const traitsUrl = pathToFileURL(path.resolve('lib/dmz/traits.js')).href;
  Page = await loadComponent('app/dmz/traits/page.js', {
    stubs: {
      '@/lib/dmz/traits': "export * from '" + traitsUrl + "';\n"
        + "export async function fetchTraitData() { return globalThis.__traitFixture || { trees: [], traits: [] }; }\n",
      '@/components/dmz/TraitPlanner': "export default function TraitPlanner(p) { return 'PLANNER_STUB' + JSON.stringify(p); }\n",
    },
  });
});

async function renderPage(fixture) {
  globalThis.__traitFixture = fixture;
  const el = await Page.default();
  return render(() => el);
}

test('page metadata: noindex,follow + fixed self-referencing canonical, no query params', () => {
  assert.deepEqual(Page.metadata.robots, NOINDEX);
  assert.equal(Page.metadata.alternates.canonical, 'https://cyberneticpunks.com/dmz/traits');
  assert.equal(Page.metadata.openGraph.url, 'https://cyberneticpunks.com/dmz/traits');
  assert.equal(Page.dynamic, 'force-dynamic');
  assert.equal(Page.metadata.twitter.card, 'summary', 'no image exists yet');
  assert.equal(Page.metadata.openGraph.images, undefined);
});

test('page: zero rows -> three official-description panels, layout unconfirmed, no planner grid', async () => {
  Date.now = () => Date.parse('2026-10-07T12:00:00Z');
  const html = await renderPage({ trees: [], traits: [] });
  for (const t of ['Combat', 'Scavenging', 'Other capabilities']) assert.ok(html.includes('>' + t + '<'), t);
  assert.equal((html.match(/Layout unconfirmed/g) || []).length, 3);
  assert.ok(!html.includes('PLANNER_STUB'));
  assert.match(html, /Work in progress/);
  assert.match(html, /What is confirmed/);
  assert.match(html, /Not yet confirmed/);
  assert.match(html, /Awaiting launch/);
});

test('page: only unverified rows -> still the empty state, and their values never render', async () => {
  const html = await renderPage({ trees: TREES, traits: [UNVERIFIED_ROW] });
  assert.ok(!html.includes('PLANNER_STUB'));
  assert.ok(!html.includes('SECRET'));
  assert.equal((html.match(/Layout unconfirmed/g) || []).length, 3);
});

test('page: verified rows -> planner gets redacted columns; unverified values never in the HTML', async () => {
  const html = await renderPage({ trees: TREES, traits: [VERIFIED_ROW, VERIFIED_NO_COST, UNVERIFIED_ROW] });
  assert.ok(html.includes('PLANNER_STUB'));
  assert.ok(!html.includes('Layout unconfirmed'));
  assert.ok(!html.includes('SECRET'));
  assert.match(html, /2 of 3 documented traits verified/);
  assert.match(html, /&quot;tierRule&quot;:null/, 'pick rule passed through as unknown');
});

test('page: confirmed facts each link to an official callofduty.com source', async () => {
  const html = await renderPage({ trees: [], traits: [] });
  const links = html.match(/\(Source: <a href="https:\/\/www\.callofduty\.com\/blog\/2026\/[^"]+"/g) || [];
  assert.equal(links.length, 5);
  assert.match(html, /Each Active Duty Operator keeps its own trait tree, alongside its own backpack and loadout\./);
  assert.match(html, /DMZ Player Level runs from 1 to 70\. How that level relates to traits is not stated\./);
  assert.ok(!html.includes('you create'));
});
