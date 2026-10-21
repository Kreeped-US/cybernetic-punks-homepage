// lib/dmz/traitLayout.js
// STRUCTURE-ONLY trait tree layout for the /dmz/traits empty board (2026-10-21, Brief 103). PURE data, no
// trait names: which trait sits in which slot is not known (Minor Traits are randomized per Operator), so
// slots are rendered as unnamed shapes only.
//
// SOURCE (attributed, below "confirmed"): the in-game Traits screen as shown in screenshots published by
// Game Rant and a second outlet, viewed by Justin 2026-10-21. Not yet confirmed in our own capture.
//
// SHAPE (each tree, top to bottom, in three columns left/center/right): row sizes 2,3,3,2,3,3,2,3,1 = 22
// slots. The pairs (rows 1, 4, 7) are Major slots; the triples (rows 2, 3, 5, 6, 8) are Minor slots; row
// 9 is one center slot where picks start. 6 Major slots per tree match Deep Dive Part 2's 6 Major Traits;
// the 15 triple slots plus the start slot are the 16 non-Major slots, matching Part 2's 16 Minor Traits.
// Per the screenshots: one pick per row, each row is one branch, and picks proceed from row 9 upward.
//
// PLANNER NOTE: dmz.traitPlanner.tierRule stays null. If this layout is confirmed in our own capture and
// each row is entered as its own tier (dmz_traits.tier), the rule can become 'pick_one'
// (lib/dmz/traitBuild.js groups picks by tree + tier).

// One layout, shared by every tree on the screen. kind: 'major' | 'minor' | 'start'.
export var TRAIT_TREE_ROWS = [
  { kind: 'major', count: 2 },
  { kind: 'minor', count: 3 },
  { kind: 'minor', count: 3 },
  { kind: 'major', count: 2 },
  { kind: 'minor', count: 3 },
  { kind: 'minor', count: 3 },
  { kind: 'major', count: 2 },
  { kind: 'minor', count: 3 },
  { kind: 'start', count: 1 },
];

// Column positions per row size (0 = left, 1 = center, 2 = right): a pair sits left and right, a triple
// fills all three, a single sits in the center.
var COLUMNS = { 1: [1], 2: [0, 2], 3: [0, 1, 2] };

// Flat slot list for rendering: { row (1-based, top first), col (0-2), index (position within its row,
// left to right), kind }.
export function traitTreeSlots(rows) {
  var out = [];
  (rows || TRAIT_TREE_ROWS).forEach(function (r, i) {
    (COLUMNS[r.count] || []).forEach(function (col, index) { out.push({ row: i + 1, col: col, index: index, kind: r.kind }); });
  });
  return out;
}

// EXAMPLE PATHS: ILLUSTRATIVE ONLY, NOT DATA. These drive the /dmz/traits plate animation ("trace an
// example path"); they are not picks from any source, not a recommended build, and say nothing about which
// trait sits where. One index per row, listed row 1 (top) to row 9 (start): pair rows 0 = left, 1 = right;
// triple rows 0 = left, 1 = center, 2 = right; row 9 = 0.
export var EXAMPLE_PATHS = {
  warfighter: [0, 1, 1, 1, 1, 2, 1, 2, 0],
  scout: [1, 0, 2, 0, 1, 0, 1, 1, 0],
  survivalist: [0, 2, 0, 1, 2, 1, 0, 0, 0],
};

// Totals by kind, for tests and for checking against the published per-tree counts.
export function traitTreeTotals(rows) {
  var t = { slots: 0, major: 0, minor: 0, start: 0 };
  (rows || TRAIT_TREE_ROWS).forEach(function (r) { t.slots += r.count; t[r.kind] += r.count; });
  return t;
}
