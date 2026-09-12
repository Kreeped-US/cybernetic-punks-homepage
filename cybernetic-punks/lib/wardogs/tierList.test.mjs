// lib/wardogs/tierList.test.mjs -- locks the pure tiering. Run: node --test lib/wardogs/tierList.test.mjs
// Synthetic rows (clearly fake TTKs) exercise the thresholds + honest-null + note logic.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tierWeapons, noteFor, TIER_THRESHOLDS, TIER_ORDER } from './tierList.js';

const ROWS = [
  { weapon_name: 'FastAR', weighted_ttk_ms: 200, rankable: true, weapon_type: 'Assault Rifle' },   // S
  { weapon_name: 'EdgeS', weighted_ttk_ms: 250, rankable: true, weapon_type: 'Assault Rifle' },     // S (boundary)
  { weapon_name: 'MidA', weighted_ttk_ms: 360, rankable: true, weapon_type: 'Submachine Gun' },     // A
  { weapon_name: 'WorkB', weighted_ttk_ms: 500, rankable: true, weapon_type: 'Assault Rifle' },     // B
  { weapon_name: 'SlowC', weighted_ttk_ms: 900, rankable: true, weapon_type: 'Sidearm' },           // C
  { weapon_name: 'BoltSniper', weighted_ttk_ms: 1500, rankable: true, weapon_type: 'Sniper Rifle' },// D + note
  { weapon_name: 'Launcher1', weighted_ttk_ms: null, rankable: false, weapon_type: 'Launcher' },    // unranked
];

test('tiering: weapons land in the right tier by TTK thresholds (boundaries inclusive)', () => {
  const { tiers } = tierWeapons(ROWS);
  const at = (t) => tiers.find((x) => x.tier === t).weapons.map((w) => w.name);
  assert.deepEqual(at('S'), ['FastAR', 'EdgeS'], 'S = <=250, sorted by TTK');
  assert.deepEqual(at('A'), ['MidA']);
  assert.deepEqual(at('B'), ['WorkB']);
  assert.deepEqual(at('C'), ['SlowC']);
  assert.deepEqual(at('D'), ['BoltSniper']);
});

test('honest-null: no-TTK weapons are UNRANKED, never forced onto the ladder', () => {
  const { tiers, unranked } = tierWeapons(ROWS);
  assert.deepEqual(unranked.map((w) => w.name), ['Launcher1']);
  const allTiered = tiers.flatMap((t) => t.weapons.map((w) => w.name));
  assert.ok(!allTiered.includes('Launcher1'), 'launcher not on any tier');
});

test('context notes: sniper gets the one-shot caveat; AMR 50 override; plain AR gets none', () => {
  assert.match(noteFor('BoltSniper', 'Sniper Rifle'), /one-shot specialist/i);
  assert.match(noteFor('AMR 50', 'Sniper Rifle'), /anti-materiel/i, 'per-weapon override wins over type note');
  assert.equal(noteFor('FastAR', 'Assault Rifle'), null, 'no note for a conventional AR');
});

test('thresholds are ascending + cover the full range', () => {
  assert.deepEqual(TIER_ORDER, ['S', 'A', 'B', 'C', 'D']);
  assert.equal(TIER_THRESHOLDS[TIER_THRESHOLDS.length - 1].maxMs, Infinity);
});
