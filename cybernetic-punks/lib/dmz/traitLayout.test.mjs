// lib/dmz/traitLayout.test.mjs
// The structure-only trait tree layout (Brief 103): row sizes 2,3,3,2,3,3,2,3,1; 22 slots; 6 Major slots
// (rows 1, 4, 7); 15 Minor slots plus one Start slot = 16 non-Major, matching Deep Dive Part 2's 6 Major +
// 16 Minor; pairs left/right, triples across, the single slot centered. No trait names anywhere.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TRAIT_TREE_ROWS, traitTreeSlots, traitTreeTotals } from './traitLayout.js';
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

test('no trait names in the layout file; the planner pick rule is untouched (tierRule stays null)', () => {
  const src = readFileSync(new URL('./traitLayout.js', import.meta.url), 'utf8');
  assert.ok(!/Plate Pouch|Pack Rat/i.test(src));
  assert.equal(dmz.traitPlanner.tierRule, null);
  assert.equal(dmz.traitPlanner.indexable, false);
});
