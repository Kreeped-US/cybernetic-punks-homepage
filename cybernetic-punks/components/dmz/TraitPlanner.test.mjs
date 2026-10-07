// components/dmz/TraitPlanner.test.mjs
// The client planner's first render (react-dom/server through the JSX harness): it renders only the
// nodes it is given, an unverified node is an "Unconfirmed" placeholder (never a confirmed trait),
// a verified node without a cost is shown but not selectable, and the pick-rule note says unknown.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { loadComponent, render } from '../../lib/games/jsxHarness.test-helper.mjs';
import { buildColumns } from '../../lib/dmz/traits.js';

let TraitPlanner;
before(async () => {
  // The harness compiles only the target file; 'react' (hooks) maps to the same React instance it renders with.
  const reactUrl = pathToFileURL(createRequire(import.meta.url).resolve('react')).href;
  TraitPlanner = (await loadComponent('components/dmz/TraitPlanner.js', {
    stubs: { react: "import R from '" + reactUrl + "';\nexport const useState = R.useState;\nexport const useMemo = R.useMemo;\n" },
  })).default;
});

// Test-only fixture rows (raw DB shape, redacted by buildColumns exactly as the page does).
const TREES = [
  { slug: 'tree-a', label: 'Fixture Tree A', sort: 1, verified: true },
  { slug: 'tree-b', label: 'Fixture Tree B', sort: 2, verified: false },
];
const ROWS = [
  { slug: 'fx-1', tree_slug: 'tree-a', tier: 1, position_in_tier: 1, name: 'Fixture Verified One', effect_text: 'x', point_cost: 2, verified: true },
  { slug: 'fx-2', tree_slug: 'tree-a', tier: 1, position_in_tier: 2, name: 'Fixture No Cost', point_cost: null, verified: true },
  { slug: 'fx-3', tree_slug: 'tree-b', tier: 1, position_in_tier: 1, name: 'SECRET UNVERIFIED NAME', effect_text: 'SECRET EFFECT', point_cost: 77, verified: false },
];

function nodeButtons(html) {
  return html.match(/<button[^>]*class="tp-node[^"]*"[^>]*>.*?<\/button>/g) || [];
}

test('renders one button per given node and nothing else', () => {
  const html = render(TraitPlanner, { columns: buildColumns(TREES, ROWS), tierRule: null });
  assert.equal(nodeButtons(html).length, 3);
  const empty = render(TraitPlanner, { columns: [], tierRule: null });
  assert.equal(nodeButtons(empty).length, 0);
});

test('an unverified node renders as an Unconfirmed placeholder, never as a confirmed trait', () => {
  const html = render(TraitPlanner, { columns: buildColumns(TREES, ROWS), tierRule: null });
  assert.ok(!html.includes('SECRET'));
  assert.ok(!html.includes('77'));
  const uv = nodeButtons(html).filter((b) => b.includes('data-verified="false"'));
  assert.equal(uv.length, 1);
  assert.match(uv[0], />\?</);
  assert.match(uv[0], /Unconfirmed/);
  assert.match(uv[0], /aria-disabled="true"/);
  assert.ok(!/aria-pressed/.test(uv[0]), 'not a toggle');
  assert.match(html, /Unconfirmed tree/, 'unverified tree label hidden');
  assert.ok(!html.includes('Fixture Tree B'));
});

test('verified nodes: cost shown when known; unknown cost shown as such and not selectable', () => {
  const html = render(TraitPlanner, { columns: buildColumns(TREES, ROWS), tierRule: null });
  const v = nodeButtons(html).filter((b) => b.includes('data-verified="true"'));
  assert.equal(v.length, 2);
  assert.match(v[0], /Fixture Verified One/);
  assert.match(v[0], /2 pts/);
  assert.match(v[0], /aria-pressed="false"/);
  assert.match(v[1], /Cost unknown/);
  assert.match(v[1], /aria-disabled="true"/);
  assert.match(html, /Fixture Tree A/);
  assert.match(html, /2 of 2 verified/);
  assert.match(html, /0 of 1 verified/);
});

test('one Operator to start, blank budget, honest counters, unknown pick rule note', () => {
  const html = render(TraitPlanner, { columns: buildColumns(TREES, ROWS), tierRule: null });
  assert.match(html, />Operator 1</);
  assert.ok(!/>Operator 2</.test(html));
  assert.match(html, /placeholder="Your points"[^>]*value=""/);
  assert.match(html, /No cap set/);
  assert.match(html, /Picks with unknown cost: 0/);
  assert.match(html, /Pick rule: not yet confirmed/);
  assert.match(render(TraitPlanner, { columns: [], tierRule: 'pick_one' }), /Pick rule: one trait per row/);
});

test('reduced motion turns off the glow animation', () => {
  const html = render(TraitPlanner, { columns: [], tierRule: null });
  assert.match(html, /@media \(prefers-reduced-motion: reduce\) \{ \.tp-node, \.tp-node\.tp-picked \{ transition: none; animation: none; \} \}/);
});
