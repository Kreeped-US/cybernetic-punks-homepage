// lib/content/modCompat.test.mjs
// Guards the PURE mod<->weapon compatibility check: match by weapon name, match by category, no match,
// null/absent compatibility -> false, slot-share is NOT a match, and modHasCompatibilityData.
// Run: node --test lib/content/modCompat.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { modFitsWeapon, modHasCompatibilityData } from './modCompat.js';

const longshot = { name: 'Longshot', category: 'Sniper', weapon_type: 'sniper_rifle' };

test('modFitsWeapon: true when compatible_weapons contains the weapon name (case-insensitive)', () => {
  assert.equal(modFitsWeapon({ compatible_weapons: ['longshot', 'other'] }, longshot), true);
  assert.equal(modFitsWeapon({ compatible_weapons: 'Longshot, Misriah 2442' }, longshot), true, 'comma string form');
});

test('modFitsWeapon: true when compatible_categories contains the weapon category', () => {
  assert.equal(modFitsWeapon({ compatible_categories: ['Sniper'] }, longshot), true);
  assert.equal(modFitsWeapon({ compatible_categories: ['sniper_rifle'] }, { name: 'X', weapon_type: 'sniper_rifle' }), true, 'falls back to weapon_type');
});

test('modFitsWeapon: false when neither name nor category matches', () => {
  assert.equal(modFitsWeapon({ compatible_weapons: ['Sidewinder'], compatible_categories: ['SMG'] }, longshot), false);
});

test('modFitsWeapon: null/empty compatibility -> false (unknown is not a fit; a shared slot is not a fit)', () => {
  assert.equal(modFitsWeapon({ compatible_weapons: null, compatible_categories: null }, longshot), false);
  assert.equal(modFitsWeapon({ slot_type: 'Magazine' }, longshot), false, 'same slot is NOT compatibility');
  assert.equal(modFitsWeapon({}, longshot), false);
  assert.equal(modFitsWeapon(null, longshot), false);
  assert.equal(modFitsWeapon({ compatible_weapons: ['Longshot'] }, null), false);
});

test('modHasCompatibilityData: true only when a compatibility column is populated', () => {
  assert.equal(modHasCompatibilityData({ compatible_weapons: ['Longshot'] }), true);
  assert.equal(modHasCompatibilityData({ compatible_categories: 'Sniper' }), true);
  assert.equal(modHasCompatibilityData({ compatible_weapons: null, compatible_categories: null }), false);
  assert.equal(modHasCompatibilityData({ compatible_weapons: [] }), false);
  assert.equal(modHasCompatibilityData({}), false);
  assert.equal(modHasCompatibilityData(null), false);
});
