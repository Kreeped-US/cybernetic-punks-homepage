// scripts/wardogs-attachment-compat.test.mjs
// Wardogs attachment -> weapon mapping (Brief 149). The old inline 'pp-19' prefix sent every PP-19 name to the
// Vityaz; PP-19 names now resolve by "Vityaz" / "Bizon" and throw when neither (or both) is present. Every other
// weapon maps exactly as before: one attachment per weapon the 204 live rows mapped to on 2026-10-26.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compat } from './wardogs-attachment-compat.mjs';

// weapon_stats (game_slug='wardogs') on 2026-10-26: 33 rows, no PP-19 Bizon yet.
const ROSTER = ['A-91', 'AK74', 'AMP-9', 'AMR 50', 'BMR-308', 'Bushmaster M17S', 'Compound Bow', 'Deagle', 'FAL', 'GGX 17',
  'GGX 18', 'Galil', 'Judge', 'KH-2002', 'M1911', 'M249 SAW', 'M4', 'M500', 'MAAWS', 'MGL-40', 'MK22', 'MP43', 'MP5',
  'Mosin Nagant', 'PKM', 'PP-19 Vityaz', 'RPG-7', 'SKS', 'SV98', 'SVD', 'Scout Rifle TD', 'Super-45', 'T-21'];
const WITH_BIZON = [...ROSTER, 'PP-19 Bizon'];
const weapons = (name, roster = ROSTER) => compat(name, roster).weapons;

test('PP-19 Bizon attachment -> PP-19 Bizon (once the Bizon is in the roster)', () => {
  assert.deepEqual(weapons('PP-19 Bizon 53 RND Magazine', WITH_BIZON), ['PP-19 Bizon']);
});

test('before the Bizon is in the roster it is flagged, never mapped to the Vityaz', () => {
  const c = compat('PP-19 Bizon 53 RND Magazine', ROSTER);
  assert.equal(c.weapons, null);
  assert.match(c.flag, /UNMATCHED weapon "PP-19 Bizon" is not in the roster/);
});

test('PP-19 Vityaz attachments -> PP-19 Vityaz (live rows and the Season 02 patch-notes names)', () => {
  for (const n of ['PP-19 50 RND Vityaz Drum Magazine', 'PP-19 Vityaz Flash Hider', 'PP-19-01 Vityaz 9x19 Suppressor', 'PP-19 Vityaz 10 RND Magazine']) {
    assert.deepEqual(weapons(n), ['PP-19 Vityaz'], n);
    assert.deepEqual(weapons(n, WITH_BIZON), ['PP-19 Vityaz'], n + ' (with Bizon)');
  }
});

test('ambiguous PP-19 with no suffix (or both) fails loudly', () => {
  assert.throws(() => compat('PP-19 Magazine', WITH_BIZON), /Ambiguous weapon token in "PP-19 Magazine"/);
  assert.throws(() => compat('PP-19-01 9x19 Suppressor', WITH_BIZON), /found none/);
  assert.throws(() => compat('PP-19 Vityaz to Bizon Adapter', WITH_BIZON), /found \[vityaz, bizon\]/);
});

test('every other weapon maps exactly as before (one live attachment per mapped weapon), with or without the Bizon', () => {
  const EXPECT = {
    'A91 Barrel': 'A-91', 'AK74 Stock': 'AK74', 'AMP-9 9x19 Suppressor': 'AMP-9', 'AMR 50 Cal Muzzle Brake': 'AMR 50',
    'BMR-308 Flash Hider': 'BMR-308', 'Deagle Barrel': 'Deagle', 'FAL Stock': 'FAL', 'Galil Barrel': 'Galil',
    'KH2002 Barrel': 'KH-2002', 'M1911 Barrel': 'M1911', 'M249 Bipod': 'M249 SAW', 'M4 Extended Mag': 'M4',
    'M500 Sabre Brake': 'M500', 'MK22 10RD': 'MK22', 'MP43 Internal Mag': 'MP43', 'MP5 Stock': 'MP5',
    'MOSIN Stripper Clip': 'Mosin Nagant', 'PKM Bipod': 'PKM', 'SKS Bipod': 'SKS', 'SV98 Stock': 'SV98',
    'SVD Bipod': 'SVD', 'Scout Rifle Stock': 'Scout Rifle TD', 'Super-45 Flash Hider': 'Super-45',
  };
  for (const roster of [ROSTER, WITH_BIZON]) {
    for (const [n, w] of Object.entries(EXPECT)) assert.deepEqual(weapons(n, roster), [w], n);
    assert.deepEqual(compat('Holographic Sight', roster), { kind: 'generic', weapons: null, flag: null });
    assert.match(compat('AK74u Dust Cover', roster).flag, /UNMATCHED weapon token "AK74u"/);
  }
});
