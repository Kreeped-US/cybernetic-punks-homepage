// lib/dmz/keysCopy.test.mjs
// Brief 183: key copy across the 42 real key names (Brief 181 + addendum, as stored in dmz_keys). No "The The",
// no leading article on a possessive first word, no "Key" suffix when the name already says Key or Card, no
// double spaces; the item type stays "key" (the game files access cards under Keys). Data-aware location /
// rewards wording and the 160-character hub description are unchanged.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DMZ_ENTITIES } from './entities.js';

const K = DMZ_ENTITIES.keys;
const SRC = 'Observed in-game by the site operator, 2026-10-27';
const NAMES = [
  ['Militia Arms Depot', 'Rare'], ['Police Station Armory', 'Uncommon'], ['Utility Maintenance Storage', 'Rare'], ['Rail Depot Storage', 'Rare'],
  ['Commandant Office', 'Epic'], ['Hoesik Supply Room', 'Epic'], ["Roze's Highrise Armory", 'Legendary'], ['Prison Encampment Storage', 'Rare'],
  ['Gangbyeon Apartment B', 'Uncommon'], ['Mill Explosives Lab', 'Uncommon'], ['Coin Mining Den', 'Rare'], ['Weapons Mod Workshop', 'Rare'],
  ['Hazard Storehouse', 'Rare'], ['Old Barber Shop', 'Rare'], ['Hanex Guard Station', 'Epic'], ['Lucera Suite 703 Bedroom', 'Epic'],
  ['Shopping DRC Locker', 'Ultra'], ['Gas Station Electrical Room', 'Rare'], ['Gun Store Weapons Locker', 'Rare'], ['Blackmarket Weapons Locker', 'Rare'],
  ['Reactor 02 Control Room', 'Rare'], ['Mirae Electrical Room', 'Rare'], ['Executive Arms Auction', 'Epic'], ['Shop Records Room', 'Rare'],
  ['Police Weapon Depository', 'Epic'], ['Reactor DRC Locker', 'Ultra'], ['Counting Room Vault', 'Epic'], ['Air Base DRC Weapons Locker', 'Ultra'],
  ['Vault Armory', 'Epic'], ['The Citadel South Wing', 'Uncommon'], ["Imjin Mill Foreman's office", 'Rare'], ['Haksan School Armory', 'Rare'],
  ['Bank Branch Vault Access', 'Rare'], ['Re-Education center annex', 'Epic'], ['Traindepot - Storageroom', 'Rare'], ["Iskra's Control Room", 'Legendary'],
  ['Netshin IT Room', 'Epic'], ["The Chemist's Secure Armory", 'Legendary'], ['Air Base Access Card - Multi Use', 'Epic'],
  ["Supreme Leader's Bunker Access Card", 'Legendary'], ["Jang-Ui's Converted Power Room Key", 'Legendary'], ['Underground Propaganda Store Room Key', 'Rare'],
];
const row = (name, rarity, extra) => Object.assign({ name, rarity, verified: true, verified_source: SRC }, extra || {});

test('the 42 names: no "The The", no "Key Key", no "Card ... Key", no double spaces, item type "key"', () => {
  assert.equal(NAMES.length, 42);
  for (const [name, rarity] of NAMES) {
    const t = K.detailTitle(row(name, rarity));
    const d = K.detailDesc(row(name, rarity));
    for (const s of [t, d]) {
      assert.doesNotMatch(s, /\bThe The\b/i, s);
      assert.doesNotMatch(s, /\bKey Key\b/i, s);
      assert.doesNotMatch(s, /\s{2,}/, s);
    }
    assert.doesNotMatch(t, /\bCard\b.*\bKey \(/, t);
    assert.ok(t.startsWith('DMZ ' + name), t);
    assert.ok(t.endsWith('(' + rarity + ')'), t);
    assert.match(d, new RegExp(' is an? ' + rarity + ' key in DMZ \\(Modern Warfare 4\\)\\.$'), d);
    assert.ok(t.length <= 60, t.length + ' ' + t);
  }
});

test('article and suffix rules, by case', () => {
  // Starts with "The": no extra article.
  assert.equal(K.detailDesc(row('The Citadel South Wing', 'Uncommon')), 'The Citadel South Wing is an Uncommon key in DMZ (Modern Warfare 4).');
  assert.equal(K.detailDesc(row("The Chemist's Secure Armory", 'Legendary')), "The Chemist's Secure Armory is a Legendary key in DMZ (Modern Warfare 4).");
  // Possessive first word: no article.
  assert.equal(K.detailDesc(row("Roze's Highrise Armory", 'Legendary')), "Roze's Highrise Armory is a Legendary key in DMZ (Modern Warfare 4).");
  assert.equal(K.detailDesc(row("Jang-Ui's Converted Power Room Key", 'Legendary')), "Jang-Ui's Converted Power Room Key is a Legendary key in DMZ (Modern Warfare 4).");
  // A later possessive keeps the article ("The Supreme Leader's ...", "The Imjin Mill Foreman's office").
  assert.equal(K.detailDesc(row("Supreme Leader's Bunker Access Card", 'Legendary')), "The Supreme Leader's Bunker Access Card is a Legendary key in DMZ (Modern Warfare 4).");
  assert.equal(K.detailDesc(row("Imjin Mill Foreman's office", 'Rare')), "The Imjin Mill Foreman's office is a Rare key in DMZ (Modern Warfare 4).");
  // Plain names keep "The".
  assert.equal(K.detailDesc(row('Militia Arms Depot', 'Rare')), 'The Militia Arms Depot is a Rare key in DMZ (Modern Warfare 4).');
  // Title suffix: added for plain names, not when the name says Key or Card anywhere.
  assert.equal(K.detailTitle(row('Militia Arms Depot', 'Rare')), 'DMZ Militia Arms Depot Key (Rare)');
  assert.equal(K.detailTitle(row('Air Base Access Card - Multi Use', 'Epic')), 'DMZ Air Base Access Card - Multi Use (Epic)');
  assert.equal(K.detailTitle(row("Supreme Leader's Bunker Access Card", 'Legendary')), "DMZ Supreme Leader's Bunker Access Card (Legendary)");
  assert.equal(K.detailTitle(row('Underground Propaganda Store Room Key', 'Rare')), 'DMZ Underground Propaganda Store Room Key (Rare)');
  // "Keystone" / "Cardinal" are not the words Key / Card.
  assert.equal(K.detailTitle(row('Keystone Vault', 'Rare')), 'DMZ Keystone Vault Key (Rare)');
  assert.equal(K.detailTitle(row('Cardinal Room', 'Rare')), 'DMZ Cardinal Room Key (Rare)');
});

test('unchanged: data-aware location / rewards wording; hub description within 160 for the 42', () => {
  const r = row("Roze's Highrise Armory", 'Legendary', { location: 'Pier', map_region: 'East', unlocks: 'A locker' });
  assert.equal(K.detailTitle(r), "DMZ Roze's Highrise Armory: Location & Rewards");
  assert.equal(K.detailDesc(r), "Roze's Highrise Armory is a Legendary key in DMZ (Modern Warfare 4). Where it is found: Pier, East. What it unlocks: A locker.");
  const rows = NAMES.map(([n, x]) => row(n, x));
  assert.equal(K.hubTitleFor(rows), 'DMZ Keys: Rarity');
  const d = K.hubDescFor(rows);
  assert.equal(d, 'DMZ keys listed by name and rarity label, as observed in game. Each entry is marked verified or unconfirmed.');
  assert.ok(d.length <= 160);
  assert.deepEqual(NAMES.map(([n, x]) => K.hubCardNote(row(n, x))), NAMES.map(([, x]) => x));
});
