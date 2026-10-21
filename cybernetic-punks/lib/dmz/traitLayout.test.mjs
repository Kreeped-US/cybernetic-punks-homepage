// lib/dmz/traitLayout.test.mjs
// The structure-only trait tree layout (Brief 103): row sizes 2,3,3,2,3,3,2,3,1; 22 slots; 6 Major slots
// (rows 1, 4, 7); 15 Minor slots plus one Start slot = 16 non-Major, matching Deep Dive Part 2's 6 Major +
// 16 Minor; pairs left/right, triples across, the single slot centered. No trait names anywhere.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TRAIT_TREE_ROWS, traitTreeSlots, traitTreeTotals, EXAMPLE_PATHS } from './traitLayout.js';
import { dmz } from '../games/dmz.js';

test('row sizes and kinds, top to bottom', () => {
  assert.deepEqual(TRAIT_TREE_ROWS.map((r) => r.count), [2, 3, 3, 2, 3, 3, 2, 3, 1]);
  assert.deepEqual(TRAIT_TREE_ROWS.map((r) => r.kind), ['major', 'minor', 'minor', 'major', 'minor', 'minor', 'major', 'minor', 'start']);
});

test('totals match Deep Dive Part 2 (22 per tree: 6 Major, 16 Minor including the start slot)', () => {
  assert.deepEqual(traitTreeTotals(), { slots: 22, major: 6, minor: 15, start: 1 });
  assert.equal(traitTreeTotals().minor + traitTreeTotals().start, 16);
});

test('slot positions: pairs left/right, triples across, the single start slot centered', () => {
  const slots = traitTreeSlots();
  assert.equal(slots.length, 22);
  const cols = (row) => slots.filter((s) => s.row === row).map((s) => s.col);
  assert.deepEqual(cols(1), [0, 2]);
  assert.deepEqual(cols(2), [0, 1, 2]);
  assert.deepEqual(cols(9), [1]);
  assert.ok(slots.every((s) => s.row >= 1 && s.row <= 9 && s.col >= 0 && s.col <= 2));
});

test('EXAMPLE_PATHS (illustrative): one entry per official tree, 9 values each, each within its row size', () => {
  assert.deepEqual(Object.keys(EXAMPLE_PATHS), ['warfighter', 'scout', 'survivalist']);
  for (const [slug, p] of Object.entries(EXAMPLE_PATHS)) {
    assert.equal(p.length, TRAIT_TREE_ROWS.length, slug);
    p.forEach((v, i) => assert.ok(Number.isInteger(v) && v >= 0 && v < TRAIT_TREE_ROWS[i].count, slug + ' row ' + (i + 1)));
  }
  // Every value names a real slot (index within its row).
  const slots = traitTreeSlots();
  for (const p of Object.values(EXAMPLE_PATHS)) {
    p.forEach((v, i) => assert.equal(slots.filter((s) => s.row === i + 1 && s.index === v).length, 1));
  }
  const src = readFileSync(new URL('./traitLayout.js', import.meta.url), 'utf8');
  assert.match(src, /EXAMPLE PATHS: ILLUSTRATIVE ONLY, NOT DATA/);
});

test('no trait names in the layout file; the planner pick rule is untouched (tierRule stays null)', () => {
  const src = readFileSync(new URL('./traitLayout.js', import.meta.url), 'utf8');
  assert.ok(!/Plate Pouch|Pack Rat/i.test(src));
  assert.equal(dmz.traitPlanner.tierRule, null);
  assert.equal(dmz.traitPlanner.indexable, false);
});
