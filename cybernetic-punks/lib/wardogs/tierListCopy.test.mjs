// lib/wardogs/tierListCopy.test.mjs
// Wardogs "every weapon" copy (Brief 151): the tier list ranks only weapons WITH measured time-to-kill, so its
// title, meta, OG, JSON-LD and hero say "Wardogs weapons", not "Every Wardogs weapon" / "Every Weapon Ranked"; the
// arsenal OG image, the tier-list tool tagline and the loadout board heading follow. True with 33 or 37 weapons.
// Source-level: the pages import the DB client.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { wardogs } from '../games/wardogs.js';

const read = (p) => readFileSync(new URL('../../' + p, import.meta.url), 'utf8');
const TIER = read('app/wardogs/tier-list/page.js');

test('tier-list title, meta, OG, JSON-LD and hero carry the Brief 151 text', () => {
  assert.ok(TIER.includes("title: { absolute: 'Wardogs Weapon Tier List - Weapons Ranked by TTK' },"), 'title');
  assert.ok(TIER.includes("description: 'The Wardogs weapon tier list: weapons with measured time-to-kill ranked S to D from community ballistics testing. No opinions -- just what kills fastest, with the specialists explained.',"), 'meta');
  assert.ok(TIER.includes("description: 'Wardogs weapons with measured time-to-kill, ranked S to D. No opinions -- just the data, with the specialists explained.',"), 'OG');
  assert.ok(TIER.includes("description: 'Wardogs weapons ranked by measured time-to-kill.',"), 'JSON-LD');
  assert.ok(TIER.includes('Wardogs weapons, ranked by what actually kills fastest. <span'), 'hero');
});

test('arsenal OG image, tier-list tagline and loadout board heading carry the Brief 151 text', () => {
  const og = read('app/wardogs/arsenal/opengraph-image.js');
  assert.ok(og.includes("export const alt = 'Wardogs Weapons - Arsenal, TTK & Ballistics - Cybernetic Punks';"), 'OG alt');
  assert.ok(og.includes("wardogsSectionCard('Wardogs Weapons: Arsenal & TTK')"), 'OG image text');
  assert.equal(wardogs.tools.find((t) => t.slug === 'tier-list').tagline, 'Wardogs weapons ranked S to D by measured time-to-kill - no opinions, just what kills fastest.');
  const board = read('components/wardogs/LoadoutResult.js');
  assert.ok(board.includes('THE FULL BOARD \u2014 WEAPONS BY TTK</div>'), 'board heading');
  assert.ok(!board.includes('EVERY WEAPON BY TTK'), 'old board heading gone');
});

// Exact phrases (case-sensitive): the lowercase CTA 'Browse the full arsenal' (tier-list/page.js) is not a completeness claim.
test('no "Every Wardogs weapon", "Every Weapon Ranked" or "Full Arsenal" in the arsenal and tier-list routes or the hub', () => {
  const files = [
    ...readdirSync(new URL('../../app/wardogs/arsenal/', import.meta.url)).filter((f) => f.endsWith('.js')).map((f) => 'app/wardogs/arsenal/' + f),
    ...readdirSync(new URL('../../app/wardogs/tier-list/', import.meta.url)).filter((f) => f.endsWith('.js')).map((f) => 'app/wardogs/tier-list/' + f),
    'app/wardogs/page.js',
  ];
  assert.ok(files.length >= 4, files.join(', '));
  for (const f of files) {
    const s = read(f);
    for (const bad of [/Every Wardogs weapon/, /Every Weapon Ranked/, /Full Arsenal/]) assert.ok(!bad.test(s), f + ' contains ' + bad);
  }
});
