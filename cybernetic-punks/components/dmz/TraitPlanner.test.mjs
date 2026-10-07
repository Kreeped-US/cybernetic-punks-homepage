// components/dmz/TraitPlanner.test.mjs
// The client planner's first render (react-dom/server through the JSX harness): octagon nodes only for
// the rows given, unverified redaction ("?" + "Unconfirmed", never a confirmed trait), no connector
// elements, tree colours by column order, no numbers beyond row data and counters, motion scoped to
// prefers-reduced-motion: no-preference, the compare table only with 2+ Operators, and phone tree tabs.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { loadComponent, render } from '../../lib/games/jsxHarness.test-helper.mjs';
import { buildColumns } from '../../lib/dmz/traits.js';
import { createPlannerState, addOperator, togglePick, setActive, setBudget } from '../../lib/dmz/traitBuild.js';

let mod;
let TraitPlanner;
before(async () => {
  // The harness compiles only the target file; 'react' (hooks) maps to the same React instance it renders with.
  const reactUrl = pathToFileURL(createRequire(import.meta.url).resolve('react')).href;
  mod = await loadComponent('components/dmz/TraitPlanner.js', {
    stubs: {
      react: "import R from '" + reactUrl + "';\nexport const useState = R.useState;\nexport const useMemo = R.useMemo;\n",
      // The share panel is its own client component (tested in TraitSharePanel.test.mjs); here a stub
      // records that the planner renders it and with which props.
      './TraitSharePanel': "export default function TraitSharePanel(p) { globalThis.__sharePanelProps = p; return 'SHARE_PANEL_STUB:' + p.shareUrl; }\n",
    },
  });
  TraitPlanner = mod.default;
});

// Test-only fixture rows (raw DB shape, redacted by buildColumns exactly as the page does).
const TREES = [
  { slug: 'tree-a', label: 'Fixture Tree A', sort: 1, verified: true },
  { slug: 'tree-b', label: 'Fixture Tree B', sort: 2, verified: false },
  { slug: 'tree-c', label: 'Fixture Tree C', sort: 3, verified: true },
  { slug: 'tree-d', label: 'Fixture Tree D', sort: 4, verified: true },
];
const ROWS = [
  { slug: 'fx-1', tree_slug: 'tree-a', tier: 1, position_in_tier: 1, name: 'Fixture Verified One', effect_text: 'x', point_cost: 2, verified: true },
  { slug: 'fx-2', tree_slug: 'tree-a', tier: 1, position_in_tier: 2, name: 'Fixture No Cost', point_cost: null, verified: true },
  { slug: 'fx-3', tree_slug: 'tree-b', tier: 1, position_in_tier: 1, name: 'SECRET UNVERIFIED NAME', effect_text: 'SECRET EFFECT', point_cost: 77, verified: false },
  { slug: 'fx-4', tree_slug: 'tree-c', tier: 2, position_in_tier: 1, name: 'Fixture C Two', point_cost: 3, verified: true },
  { slug: 'fx-5', tree_slug: 'tree-zz', tier: null, position_in_tier: null, name: 'Fixture Orphan', point_cost: 1, verified: true },
];
const COLS = () => buildColumns(TREES, ROWS);

function nodeButtons(html) {
  return html.match(/<button[^>]*class="tp-node[^"]*"[^>]*>[\s\S]*?<\/button>/g) || [];
}
function noStyle(html) {
  return html.replace(/<style>[\s\S]*?<\/style>/g, '');
}

test('one octagon node per given row and nothing else', () => {
  const html = render(TraitPlanner, { columns: COLS(), tierRule: null });
  const nodes = nodeButtons(html);
  assert.equal(nodes.length, ROWS.length);
  for (const b of nodes) assert.equal((b.match(/<polygon class="tp-oct-shape"/g) || []).length, 1);
  assert.equal(nodeButtons(render(TraitPlanner, { columns: [], tierRule: null })).length, 0);
});

test('unverified node: hatched "?" octagon, Unconfirmed, not selectable, no values in the HTML', () => {
  const html = render(TraitPlanner, { columns: COLS(), tierRule: null });
  assert.ok(!html.includes('SECRET'));
  assert.ok(!html.includes('77'));
  const uv = nodeButtons(html).filter((b) => b.includes('data-verified="false"'));
  assert.equal(uv.length, 1);
  assert.match(uv[0], /class="tp-node tp-unverified"/);
  assert.match(uv[0], /class="tp-face"[^>]*>\?</);
  assert.match(uv[0], />Unconfirmed</);
  assert.match(uv[0], /aria-disabled="true"/);
  assert.ok(!/aria-pressed/.test(uv[0]), 'not a toggle');
  assert.match(html, /<pattern id="tp-hatch"/);
  assert.match(html, /\.tp-node\.tp-unverified \.tp-oct-shape \{ fill: url\(#tp-hatch\)/);
  assert.match(html, /Unconfirmed tree/, 'unverified tree label hidden');
  assert.ok(!html.includes('Fixture Tree B'));
});

test('verified nodes show their name, never a "?" face; unknown cost is dashed and not selectable', () => {
  const html = render(TraitPlanner, { columns: COLS(), tierRule: null });
  const v = nodeButtons(html).filter((b) => b.includes('data-verified="true"'));
  assert.equal(v.length, 4);
  for (const b of v) assert.ok(!/class="tp-face"[^>]*>\?</.test(b), 'no ? glyph on a verified node');
  const one = v.find((b) => b.includes('Fixture Verified One'));
  assert.match(one, />2 pts</);
  assert.match(one, /aria-pressed="false"/);
  const nc = v.find((b) => b.includes('Fixture No Cost'));
  assert.match(nc, /class="tp-node tp-nocost"/);
  assert.match(nc, />Cost unknown</);
  assert.match(nc, /aria-disabled="true"/);
  assert.match(html, /\.tp-node\.tp-nocost \.tp-oct-shape \{ stroke-dasharray/);
});

test('no connector elements and no prerequisite markup', () => {
  const body = noStyle(render(TraitPlanner, { columns: COLS(), tierRule: null }));
  assert.ok(!/<line[\s>]|<path[\s>]|<polyline[\s>]/.test(body), 'no lines or paths');
  assert.ok(!/connector|prereq|requires/i.test(body));
});

test('tree colours follow column order (red, gold, teal, then neutral), never a tree name', () => {
  assert.deepEqual(mod.TREE_COLOURS, ['#e8604a', '#d9a947', '#3fbfae']);
  assert.equal(mod.treeColour(3), mod.NEUTRAL_COLOUR);
  const html = render(TraitPlanner, { columns: COLS(), tierRule: null });
  const cols = html.match(/<div id="tp-col-\d+" class="tp-col[^"]*" data-tree-index="\d+" style="--tp-accent:[^"]+"/g);
  assert.deepEqual(cols.map((c) => c.match(/--tp-accent:([^"]+)/)[1]), ['#e8604a', '#d9a947', '#3fbfae', '#8b95a5', '#8b95a5']);
  // Same trees in a different order -> colours follow the new order.
  const swapped = render(TraitPlanner, { columns: COLS().reverse(), tierRule: null });
  const first = swapped.match(/<div id="tp-col-0"[^>]*>[\s\S]*?class="tp-col-title[^"]*">([^<]*)</);
  assert.equal(first[1], 'Tree not yet known');
  assert.match(swapped, /id="tp-col-0" class="tp-col tp-col-on" data-tree-index="0" style="--tp-accent:#e8604a"/);
  const src = readFileSync(path.resolve('components/dmz/TraitPlanner.js'), 'utf8');
  assert.ok(!/combat|scaveng|capabilit/i.test(src), 'no colour keyed to a tree name');
});

test('column header: verified label or Unconfirmed tree, N of M verified, picked count; tier labels from row data', () => {
  const html = render(TraitPlanner, { columns: COLS(), tierRule: null });
  assert.match(html, />Fixture Tree A</);
  assert.match(html, />2 of 2 verified</);
  assert.match(html, />0 of 1 verified</);
  assert.equal((html.match(/>Picked: 0</g) || []).length, 5);
  assert.match(html, /class="tp-tier-label">T1</);
  assert.match(html, /class="tp-tier-label">T2</);
  assert.match(html, /class="tp-tier-label">Tier unknown</);
  assert.match(html, />Tree not yet known</);
});

test('no numbers beyond row data and counters; no XP, earn or level-gate copy', () => {
  const s = setBudget(togglePick(createPlannerState(), 'fx-1', Object.fromEntries(COLS().flatMap((c) => c.nodes.map((n) => [n.slug, { ...n, tree: c.slug }]))), null), '5');
  const text = noStyle(render(TraitPlanner, { columns: COLS(), tierRule: null, initialState: s })).replace(/<[^>]+>/g, ' ');
  assert.ok(!/\bXP\b|per mission|earn rate|level \d|Lv\.?\s?\d/i.test(text));
  // Every number on screen is a row value (costs 2/3/1, tiers 1/2), a count, the typed budget (5) or an Operator id.
  const allowed = new Set(['0', '1', '2', '3', '4', '5']);
  for (const d of text.match(/\d+/g) || []) assert.ok(allowed.has(d), 'unexpected number ' + d);
});

test('glow, burst and transitions only under prefers-reduced-motion: no-preference; focus ring always on', () => {
  const html = render(TraitPlanner, { columns: COLS(), tierRule: null });
  const css = html.match(/<style>([\s\S]*?)<\/style>/)[1];
  const start = css.indexOf('@media (prefers-reduced-motion: no-preference)');
  const end = css.indexOf('@media (max-width: 640px)');
  assert.ok(start > 0 && end > start);
  const outside = css.slice(0, start) + css.slice(end);
  assert.ok(!/transition|animation|filter:|box-shadow|@keyframes/.test(outside), 'no motion or glow outside the block');
  assert.match(css.slice(start, end), /tp-burst/);
  assert.match(outside, /\.tp-node:focus-visible[^{]*\{ outline: 2px solid/);
});

test('compare table only with 2+ Operators; shows per-tree counts and shared', () => {
  const one = render(TraitPlanner, { columns: COLS(), tierRule: null });
  assert.ok(!one.includes('tp-compare'));
  const nodes = Object.fromEntries(COLS().flatMap((c) => c.nodes.map((n) => [n.slug, { ...n, tree: c.slug }])));
  let s = togglePick(createPlannerState(), 'fx-1', nodes, null);
  s = togglePick(addOperator(s), 'fx-1', nodes, null);
  s = togglePick(s, 'fx-4', nodes, null);
  s = setActive(s, 0);
  const two = render(TraitPlanner, { columns: COLS(), tierRule: null, initialState: s });
  assert.equal((two.match(/class="tp-card tp-compare"/g) || []).length, 1);
  assert.match(two, /<th scope="col">Operator 1<\/th><th scope="col">Operator 2<\/th><th scope="col">Shared<\/th>/);
  assert.match(two, /Fixture Tree A<\/th><td>1<\/td><td>1<\/td><td>1<\/td>/);
  assert.match(two, /Fixture Tree C<\/th><td>0<\/td><td>1<\/td><td>0<\/td>/);
});

test('route summary lists picked names in tier order per tree; picks with unknown cost are flagged', () => {
  const nodes = Object.fromEntries(COLS().flatMap((c) => c.nodes.map((n) => [n.slug, { ...n, tree: c.slug }])));
  const empty = render(TraitPlanner, { columns: COLS(), tierRule: null });
  assert.match(empty, />No picks yet\.</);
  // A pick whose cost became unknown (e.g. from an older state) is kept and flagged.
  let s = togglePick(createPlannerState(), 'fx-1', nodes, null);
  s = { ...s, operators: [{ ...s.operators[0], picks: ['fx-1', 'fx-2', 'fx-5'] }] };
  const html = render(TraitPlanner, { columns: COLS(), tierRule: null, initialState: s });
  const route = html.slice(html.indexOf('Route summary'));
  assert.match(route, /Fixture Tree A<\/span>: <span>Fixture Verified One<\/span><span>, Fixture No Cost<span[^>]*> \(cost unknown\)<\/span><\/span>/);
  assert.match(route, /Tree not yet known<\/span>: <span>Fixture Orphan<\/span>/);
  assert.match(html, />Picks with unknown cost: 1</);
  assert.ok(!/share|build code/i.test(noStyle(html)), 'no share or build-code UI without shareUrl');
});

test('phone tree tabs: one tab per column, first selected, wired to its column; CSS hides the others', () => {
  const html = render(TraitPlanner, { columns: COLS(), tierRule: null });
  const tabs = html.match(/<button type="button" role="tab" class="tp-treetab"[^>]*>/g) || [];
  assert.equal(tabs.length, 5);
  assert.match(tabs[0], /aria-selected="true" aria-controls="tp-col-0"/);
  for (const t of tabs.slice(1)) assert.match(t, /aria-selected="false"/);
  assert.equal((html.match(/class="tp-col tp-col-on"/g) || []).length, 1);
  assert.match(html, /@media \(max-width: 640px\) \{\s*\.tp-treetabs \{ display: flex; \}[\s\S]*\.tp-col \{ display: none; \}\s*\.tp-col\.tp-col-on \{ display: block; \}/);
});

test('Operator file card: one Operator to start, blank budget, honest counters, pick rule note', () => {
  const html = render(TraitPlanner, { columns: COLS(), tierRule: null });
  assert.match(html, />Operator file</);
  assert.match(html, />Operator 1</);
  assert.ok(!/>Operator 2</.test(html));
  assert.match(html, /placeholder="Your points"[^>]*value=""/);
  assert.match(html, /No cap set/);
  assert.match(html, /Picks with unknown cost: 0/);
  assert.match(html, /Pick rule: not yet confirmed/);
  assert.match(html, />Undo<\/button>/);
  assert.match(html, />Redo<\/button>/);
  assert.match(html, />Reset all<\/button>/);
  assert.match(render(TraitPlanner, { columns: [], tierRule: 'pick_one' }), /Pick rule: one trait per row/);
});

test('detail stamp: "Verified, source not recorded" when a verified node has no source or URL', () => {
  assert.equal(mod.verifiedStamp({ verified: true, source: null, sourceUrl: null }), 'Verified, source not recorded');
  assert.equal(mod.verifiedStamp({ verified: true, source: 'Patch notes', sourceUrl: null }), 'Verified');
  assert.equal(mod.verifiedStamp({ verified: true, source: null, sourceUrl: 'https://example.test/x' }), 'Verified');
  const src = readFileSync(path.resolve('components/dmz/TraitPlanner.js'), 'utf8');
  assert.match(src, /<span className="tp-stamp tp-stamp-yes">\{verifiedStamp\(focused\)\}<\/span>/);
});

test('verified node buttons carry the full name as a title; unverified ones carry none', () => {
  const html = render(TraitPlanner, { columns: COLS(), tierRule: null });
  const nodes = nodeButtons(html);
  for (const b of nodes.filter((x) => x.includes('data-verified="true"'))) {
    const label = b.match(/aria-label="([^"]+)"/)[1];
    assert.match(b, new RegExp('title="' + label + '"'));
  }
  assert.match(html, /title="Fixture Verified One"/);
  for (const b of nodes.filter((x) => x.includes('data-verified="false"'))) assert.ok(!/ title=/.test(b));
});

test('share panel: rendered only with shareUrl, given the planner state and nodes', () => {
  delete globalThis.__sharePanelProps;
  const without = render(TraitPlanner, { columns: COLS(), tierRule: null });
  assert.ok(!without.includes('SHARE_PANEL_STUB'));
  assert.equal(globalThis.__sharePanelProps, undefined);
  const html = render(TraitPlanner, { columns: COLS(), tierRule: null, shareUrl: 'https://cyberneticpunks.com/dmz/traits' });
  assert.equal((html.match(/SHARE_PANEL_STUB:https:\/\/cyberneticpunks\.com\/dmz\/traits/g) || []).length, 1);
  const p = globalThis.__sharePanelProps;
  assert.deepEqual(p.state.operators, [{ id: 1, budget: null, picks: [] }]);
  assert.equal(p.nodes['fx-1'].tree, 'tree-a');
  assert.equal(typeof p.onLoad, 'function');
});

test('ASCII only in the planner component', () => {
  assert.ok(!/[^\x00-\x7F]/.test(readFileSync(path.resolve('components/dmz/TraitPlanner.js'), 'utf8')));
});
