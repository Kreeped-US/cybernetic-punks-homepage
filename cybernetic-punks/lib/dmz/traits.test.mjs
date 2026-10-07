// lib/dmz/traits.test.mjs
// DMZ trait planner (/dmz/traits): indexing gate, tolerant read, unverified redaction, and the page's
// empty vs data states. Fixture rows exist ONLY in this file (never in app code). The page is rendered
// through the JSX harness with its data read and the client planner stubbed.
import { test, before, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { traitRobots, traitPageRobots, traitPlannerIndexable, fetchTraitData, toClientNode, buildColumns, countVerified } from './traits.js';
import { encodeBuild } from './traitBuild.js';
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
// The page is rendered with its data read stubbed and both client islands stubbed. The empty-state
// stub records the props the page passes; the REAL TraitEmptyBoard is then rendered with those props
// and spliced in, so the assertions see the full server HTML of the empty state.
let Page;
let Board;
before(async () => {
  const traitsUrl = pathToFileURL(path.resolve('lib/dmz/traits.js')).href;
  const reactUrl = pathToFileURL(createRequire(import.meta.url).resolve('react')).href;
  Page = await loadComponent('app/dmz/traits/page.js', {
    stubs: {
      '@/lib/dmz/traits': "export * from '" + traitsUrl + "';\n"
        + "export async function fetchTraitData() { return globalThis.__traitFixture || { trees: [], traits: [] }; }\n",
      '@/components/dmz/TraitPlanner': "export default function TraitPlanner(p) { return 'PLANNER_STUB' + JSON.stringify(p); }\n",
      '@/components/dmz/TraitEmptyBoard': "export default function TraitEmptyBoard(p) { globalThis.__emptyBoardProps = p; return 'EMPTY_BOARD_STUB'; }\n",
    },
  });
  Board = (await loadComponent('components/dmz/TraitEmptyBoard.js', {
    stubs: { react: "import R from '" + reactUrl + "';\nexport const useEffect = R.useEffect;\nexport const useRef = R.useRef;\nexport const useState = R.useState;\n" },
  })).default;
});

async function renderPage(fixture, sp) {
  globalThis.__traitFixture = fixture;
  delete globalThis.__emptyBoardProps;
  const el = await Page.default({ searchParams: Promise.resolve(sp || {}) });
  const html = render(() => el);
  if (!globalThis.__emptyBoardProps) return html;
  return html.replace('EMPTY_BOARD_STUB', render(Board, globalThis.__emptyBoardProps));
}

// Visible text only (CSS and tags removed), for the honesty checks.
function textOf(html) {
  return html.replace(/<style>[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ');
}

const meta = (sp) => Page.generateMetadata({ searchParams: Promise.resolve(sp || {}) });

test('page metadata without b: noindex (flag false), fixed canonical, generic share card, large card', async () => {
  const m = await meta();
  assert.equal(Page.metadata, undefined, 'metadata is generated per request now');
  assert.deepEqual(m.robots, NOINDEX);
  assert.equal(m.alternates.canonical, 'https://cyberneticpunks.com/dmz/traits');
  assert.equal(m.openGraph.url, 'https://cyberneticpunks.com/dmz/traits');
  assert.equal(Page.dynamic, 'force-dynamic');
  assert.deepEqual(m.openGraph.images, [{ url: '/og/dmz-traits', width: 1200, height: 630, alt: 'DMZ Trait Planner on Cybernetic Punks' }]);
  assert.deepEqual(m.twitter.images, ['/og/dmz-traits']);
  assert.equal(m.twitter.card, 'summary_large_image');
});

test('page metadata with b: always noindex, canonical without query, card carries b only when it passes the limits', async () => {
  const code = encodeBuild({ active: 0, operators: [{ id: 1, budget: null, picks: ['fx-1'] }] });
  const ok = await meta({ b: code });
  assert.deepEqual(ok.robots, NOINDEX);
  assert.equal(ok.alternates.canonical, 'https://cyberneticpunks.com/dmz/traits');
  assert.equal(ok.openGraph.url, 'https://cyberneticpunks.com/dmz/traits');
  assert.equal(ok.openGraph.images[0].url, '/og/dmz-traits?b=' + code);
  assert.deepEqual(ok.twitter.images, ['/og/dmz-traits?b=' + code]);
  for (const bad of ['garbage!', 'A'.repeat(2001), '', ['x', 'y']]) {
    const m = await meta({ b: bad });
    assert.deepEqual(m.robots, NOINDEX, String(bad).slice(0, 20));
    assert.equal(m.openGraph.images[0].url, '/og/dmz-traits', 'rejected code -> generic card');
  }
});

test('traitPageRobots: any b => noindex even when traitPlanner.indexable is true; no b => traitRobots', () => {
  const on = { ...dmz, traitPlanner: { ...dmz.traitPlanner, indexable: true } };
  assert.deepEqual(traitPageRobots(on, true), NOINDEX);
  assert.equal(traitPageRobots(on, false), undefined);
  assert.deepEqual(traitPageRobots(dmz, false), NOINDEX);
  assert.deepEqual(traitPageRobots(dmz, true), NOINDEX);
  assert.equal(traitRobots.length, 1, 'traitRobots unchanged');
});

test('page: zero verified rows -> a b param is ignored (empty state, no planner, no decode)', async () => {
  const code = encodeBuild({ active: 0, operators: [{ id: 1, budget: null, picks: ['fx-3'] }] });
  const html = await renderPage({ trees: TREES, traits: [UNVERIFIED_ROW] }, { b: code });
  assert.ok(!html.includes('PLANNER_STUB'));
  assert.ok(html.includes('Awaiting verification'));
  assert.equal((html.match(/Layout unconfirmed/g) || []).length, 3);
});

test('page: verified rows + b -> decoded on the server against verified nodes; unverified and unknown picks dropped', async () => {
  const code = encodeBuild({ active: 0, operators: [{ id: 1, budget: 4, picks: ['fx-1', 'fx-3', 'gone'] }, { id: 2, budget: null, picks: [] }] });
  const html = await renderPage({ trees: TREES, traits: [VERIFIED_ROW, VERIFIED_NO_COST, UNVERIFIED_ROW] }, { b: code });
  const props = JSON.parse(html.slice(html.indexOf('PLANNER_STUB') + 'PLANNER_STUB'.length, html.lastIndexOf('}') + 1).replace(/&quot;/g, '"'));
  assert.deepEqual(props.initialState, { operators: [{ id: 1, budget: 4, picks: ['fx-1'] }, { id: 2, budget: null, picks: [] }], active: 0, nextId: 3 });
  assert.equal(props.shareUrl, 'https://cyberneticpunks.com/dmz/traits');
  const none = await renderPage({ trees: TREES, traits: [VERIFIED_ROW] }, { b: 'garbage!' });
  const p2 = JSON.parse(none.slice(none.indexOf('PLANNER_STUB') + 'PLANNER_STUB'.length, none.lastIndexOf('}') + 1).replace(/&quot;/g, '"'));
  assert.equal(p2.initialState, undefined, 'invalid code -> fresh planner');
  assert.equal(p2.shareUrl, 'https://cyberneticpunks.com/dmz/traits');
});

test('empty state: three panels, official labels only, no grid, "Awaiting verification", no launch copy', async () => {
  Date.now = () => Date.parse('2026-10-07T12:00:00Z');
  const html = await renderPage({ trees: [], traits: [] });
  const panels = html.match(/<button[^>]*class="teb-panel"[^>]*>/g) || [];
  assert.equal(panels.length, 3);
  const labels = (html.match(/<span class="teb-label">[^<]*<\/span>/g) || []).map((m) => m.replace(/<[^>]+>/g, ''));
  assert.deepEqual(labels, ['Combat', 'Scavenging', 'Other capabilities']);
  assert.equal((html.match(/Layout unconfirmed/g) || []).length, 3, 'one chip per panel');
  assert.equal((html.match(/<svg[^>]*class="teb-emblem"/g) || []).length, 3, 'one emblem per tree, not a grid');
  assert.ok(!html.includes('PLANNER_STUB'));
  assert.ok(!html.includes('tp-node'), 'no planner node grid');
  assert.ok(!/>\?</.test(html), 'no "?" nodes');
  assert.match(html, /Work in progress/);
  assert.match(html, /Awaiting verification/);
  assert.ok(!html.includes('Awaiting launch'), 'emptyStateCopy is not used');
  assert.ok(!html.includes('What is confirmed'), 'the status board replaces the two plain sections');
});

test('empty state honesty: no digits next to trait/node/pt, no Part 2, no Operator or point widget', async () => {
  const html = await renderPage({ trees: [], traits: [] });
  const text = textOf(html);
  const hit = text.match(/\d+\s*(traits?|nodes?|pts?|points?)\b/i);
  assert.equal(hit, null, hit && hit[0]);
  assert.ok(!/part 2/i.test(text));
  assert.ok(!/Operator 1|Add Operator|Your points|Spent:/.test(text), 'no planner widgets');
  // The only numbers in the visible text: the status counts (5, 7), the source labels (MW4, Part 1,
  // June 6, Oct 5, 2026) and the 1-to-70 fact.
  const allowed = new Set(['1', '70', '2026', '6', '5', '7']);
  for (const d of text.replace(/\bMW4\b/g, 'MW').match(/\d+/g) || []) assert.ok(allowed.has(d), 'unexpected number ' + d);
});

test('empty state: every factual line is a page FACT or a Not-yet-confirmed item', async () => {
  await renderPage({ trees: [], traits: [] });
  const p = globalThis.__emptyBoardProps;
  assert.equal(p.facts.length, 5);
  assert.equal(p.unconfirmed.length, 7);
  assert.ok(p.facts.includes(p.focusFact) && p.facts.includes(p.loopFact) && p.facts.includes(p.dogTagFact));
  for (const u of p.treeUnconfirmed) assert.ok(p.unconfirmed.includes(u), u);
  assert.deepEqual(p.trees.map((t) => [t.label, t.accent]), [['Combat', '#e8604a'], ['Scavenging', '#d9a947'], ['Other capabilities', '#3fbfae']]);
});

test('empty state: status board stamps every item and its header counts the lists', async () => {
  const html = await renderPage({ trees: [], traits: [] });
  const p = globalThis.__emptyBoardProps;
  assert.match(html, new RegExp('>' + p.facts.length + ' confirmed, ' + p.unconfirmed.length + ' unconfirmed<'));
  assert.equal((html.match(/teb-stamp-yes">Confirmed</g) || []).length, p.facts.length);
  assert.equal((html.match(/teb-stamp-no">Unconfirmed</g) || []).length, p.unconfirmed.length);
  for (const u of p.unconfirmed) assert.ok(html.includes(u), u);
  // A different list length changes the header (never hardcoded).
  const other = render(Board, { ...p, facts: p.facts.slice(0, 2), unconfirmed: p.unconfirmed.slice(0, 3) });
  assert.match(other, />2 confirmed, 3 unconfirmed</);
});

test('empty state: the loop cites each step and shows the unknown step as not confirmed', async () => {
  const html = await renderPage({ trees: [], traits: [] });
  const loop = html.slice(html.indexOf('id="teb-loop-h"'), html.indexOf('id="teb-board-h"'));
  for (const s of ['Mission', 'Trait Points earned', 'Spent on that Operator only', 'Dog Tag level', 'Operator Traits']) {
    assert.match(loop, new RegExp('teb-step-title">' + s + '</span><span class="teb-step-src">per <a href="https://www\\.callofduty\\.com/blog/2026/'), s);
  }
  assert.match(loop, /teb-step teb-step-unknown"><span class="teb-step-title"[^>]*>How many points per mission: not confirmed</);
});

test('empty state: all three drawers are in the server HTML, collapsed, wired to their panels', async () => {
  const html = await renderPage({ trees: [], traits: [] });
  for (const slug of ['combat', 'scavenging', 'other']) {
    const d = html.match(new RegExp('<details id="trait-tree-drawer-' + slug + '"[^>]*>[\\s\\S]*?</details>'));
    assert.ok(d, slug);
    assert.ok(!/^<details[^>]* open/.test(d[0]), slug + ' collapsed on the server (click state is client only)');
    assert.match(d[0], /There are three trait trees, each focused on a different area/);
    assert.match(d[0], /Still unconfirmed for this tree/);
    assert.match(d[0], /How many traits each tree has, and how they are laid out/);
    assert.match(html, new RegExp('aria-expanded="false" aria-controls="trait-tree-drawer-' + slug + '"'));
  }
  assert.match(html, /<div aria-live="polite"><details/);
});

test('empty state: glow and burst only under prefers-reduced-motion: no-preference', async () => {
  const html = await renderPage({ trees: [], traits: [] });
  const css = (html.match(/<style>[\s\S]*?<\/style>/g) || []).join('\n');
  const at = css.indexOf('@media (prefers-reduced-motion: no-preference)');
  assert.ok(at > 0);
  const outside = css.slice(0, at) + css.slice(css.indexOf('.teb-drawer {'));
  assert.ok(!/box-shadow|animation|transition/.test(outside), 'no motion or glow outside the no-preference block');
  assert.match(css.slice(at, css.indexOf('.teb-drawer {')), /teb-burst/);
});

test('page: only unverified rows -> still the empty state, and their values never render', async () => {
  const html = await renderPage({ trees: TREES, traits: [UNVERIFIED_ROW] });
  assert.ok(!html.includes('PLANNER_STUB'));
  assert.ok(!html.includes('SECRET'));
  assert.equal((html.match(/Layout unconfirmed/g) || []).length, 3);
});

test('page: verified rows -> planner gets redacted columns; empty board not rendered', async () => {
  const html = await renderPage({ trees: TREES, traits: [VERIFIED_ROW, VERIFIED_NO_COST, UNVERIFIED_ROW] });
  assert.ok(html.includes('PLANNER_STUB'));
  assert.equal(globalThis.__emptyBoardProps, undefined, 'TraitEmptyBoard not rendered');
  assert.ok(!html.includes('Layout unconfirmed'));
  assert.ok(!html.includes('Awaiting verification'));
  assert.ok(!html.includes('SECRET'));
  assert.match(html, /2 of 3 documented traits verified/);
  assert.match(html, /&quot;tierRule&quot;:null/, 'pick rule passed through as unknown');
  assert.match(html, /What is confirmed/);
  assert.match(html, /Not yet confirmed/);
});

test('page: confirmed facts each link to an official callofduty.com source (both states)', async () => {
  const planner = await renderPage({ trees: TREES, traits: [VERIFIED_ROW] });
  const links = planner.match(/\(Source: <a href="https:\/\/www\.callofduty\.com\/blog\/2026\/[^"]+"/g) || [];
  assert.equal(links.length, 5);
  const empty = await renderPage({ trees: [], traits: [] });
  const board = empty.slice(empty.indexOf('id="teb-board-h"'));
  assert.equal((board.match(/\(Source: <a href="https:\/\/www\.callofduty\.com\/blog\/2026\/[^"]+"/g) || []).length, 5);
  for (const html of [planner, empty]) {
    assert.match(html, /Each Active Duty Operator keeps its own trait tree, alongside its own backpack and loadout\./);
    assert.match(html, /DMZ Player Level runs from 1 to 70\. How that level relates to traits is not stated\./);
    assert.ok(!html.includes('you create'));
  }
});

test('ASCII only in the new empty-state component and the page', () => {
  for (const f of ['components/dmz/TraitEmptyBoard.js', 'app/dmz/traits/page.js']) {
    assert.ok(!/[^\x00-\x7F]/.test(readFileSync(path.resolve(f), 'utf8')), f);
  }
});
