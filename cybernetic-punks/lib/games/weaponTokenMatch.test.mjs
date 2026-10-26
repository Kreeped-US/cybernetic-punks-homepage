// lib/games/weaponTokenMatch.test.mjs
// The game-agnostic weapon-token matcher: families resolve by a distinguishing word and throw when it is missing or
// doubled; aliases and roster names match by prefix, longest first. Invented names only (no game literals).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveWeaponToken } from './weaponTokenMatch.js';

const roster = ['ZX-7 Hornet', 'ZX-7 Wasp', 'Vex', 'Vex Pro', 'Long Gun Mk2'];
const families = { 'zx-7': { 'hornet': 'ZX-7 Hornet', 'wasp': 'ZX-7 Wasp' } };
const aliases = { 'lg': 'Long Gun Mk2', 'lg-x': 'Vex' };
const opts = { roster, aliases, families };

test('family: the distinguishing word decides, wherever it sits in the name', () => {
  assert.equal(resolveWeaponToken('ZX-7 Hornet Flash Hider', opts), 'ZX-7 Hornet');
  assert.equal(resolveWeaponToken('ZX-7 Wasp 40 RND Magazine', opts), 'ZX-7 Wasp');
  assert.equal(resolveWeaponToken('ZX-7 50 RND Hornet Drum', opts), 'ZX-7 Hornet');
  assert.equal(resolveWeaponToken('ZX-7-02 Wasp Suppressor', opts), 'ZX-7 Wasp');
});

test('family: no distinguishing word, or more than one, throws (never picks one)', () => {
  assert.throws(() => resolveWeaponToken('ZX-7 Magazine', opts), /Ambiguous weapon token in "ZX-7 Magazine".*found none/);
  assert.throws(() => resolveWeaponToken('ZX-7 Hornet to Wasp Adapter', opts), /found \[hornet, wasp\]/);
  assert.throws(() => resolveWeaponToken('ZX-7 Hornetish Grip', opts), /found none/, 'whole words only');
});

test('family prefix needs a boundary: a longer token is not the family', () => {
  assert.equal(resolveWeaponToken('ZX-70 Stock', opts), null);
});

test('aliases and roster: longest match wins; no match is null', () => {
  assert.equal(resolveWeaponToken('LG-X Barrel', opts), 'Vex', 'longest alias key');
  assert.equal(resolveWeaponToken('LG Scope', opts), 'Long Gun Mk2');
  assert.equal(resolveWeaponToken('Vex Pro Stock', opts), 'Vex Pro', 'longest roster name');
  assert.equal(resolveWeaponToken('Vex Stock', opts), 'Vex');
  assert.equal(resolveWeaponToken('LongGunMk2 Bipod', { roster }), 'Long Gun Mk2', 'space-free roster form');
  assert.equal(resolveWeaponToken('Generic Red Dot', opts), null);
  assert.equal(resolveWeaponToken('Vexation Grip', opts), null, 'roster name must be followed by a space');
});
