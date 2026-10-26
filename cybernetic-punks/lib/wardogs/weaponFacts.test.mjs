// lib/wardogs/weaponFacts.test.mjs
// Brief 153: the per-weapon page text is built only from stored fields. Fixtures use invented names.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { vendorPrice, unlockFacts, unlockSentence, sourceLine, weaponPageMeta, weaponOgHeadline, PRICE_UNLOCK_SOURCE } from './weaponFacts.js';

const SRC = 'Example Studio Patch Notes (2030-01-01), lines L1, L2';
const NEW = { name: 'Rifle Nova', weapon_type: 'Assault Rifle', ammo_type: '6mm Test', fire_rate: null, credit_cost: 3200,
  unlock_class: 'Vanguard', unlock_class_level: 20, unlock_career_level: null, unlock_fee: 100000, verified_source: SRC };
const FREE = { ...NEW, name: 'Carbine Free', credit_cost: 1000, unlock_class_level: null, unlock_fee: 0 };
const TESTED = { ...NEW, name: 'Rifle Tested', fire_rate: 700, verified_source: 'Community range testing (attributed)' };

test('vendor price: stored credit_cost formatted; NULL or 0 -> null (never TBD or $0)', () => {
  assert.equal(vendorPrice(NEW), '$3,200');
  assert.equal(vendorPrice({ ...NEW, credit_cost: 0 }), null, 'credit_cost 0 -> card omitted');
  assert.equal(vendorPrice({ ...NEW, credit_cost: '0' }), null);
  assert.equal(vendorPrice({ ...NEW, credit_cost: null }), null);
  assert.equal(vendorPrice(null), null);
  const zero = { ...FREE, credit_cost: 0 };
  assert.equal(sourceLine(zero, {}), 'weapon type, caliber and unlock from ' + SRC + '.', 'no "vendor price" claim for a 0 price');
  assert.equal(weaponPageMeta('Carbine Free', zero).description, 'Wardogs Carbine Free (Assault Rifle, 6mm Test): unlocked by default. Time-to-kill and body-part ballistics are not measured yet.');
  assert.deepEqual(unlockFacts(zero), { free: true, gate: 'Unlocked by default', fee: null }, 'unlock unchanged');
});

test('price/unlock provenance line text', () => {
  assert.equal(PRICE_UNLOCK_SOURCE, "Price and unlock follow Bulkhead's Season 02 patch notes where they state them; otherwise community-aggregated Season 1 values.");
  assert.ok(!/[^\x00-\x7f]/.test(PRICE_UNLOCK_SOURCE));
});

test('unlock: track level + fee; free starter = fee 0 and no level (isFreeStarter); career gate; all NULL -> null', () => {
  assert.deepEqual(unlockFacts(NEW), { free: false, gate: 'Vanguard level 20', fee: '$100,000 to unlock' });
  assert.deepEqual(unlockFacts(FREE), { free: true, gate: 'Unlocked by default', fee: null });
  assert.deepEqual(unlockFacts({ ...NEW, unlock_career_level: 65, unlock_class_level: null, unlock_fee: 75000 }), { free: false, gate: 'Career level 65', fee: '$75,000 to unlock' });
  assert.deepEqual(unlockFacts({ ...NEW, unlock_fee: null }), { free: false, gate: 'Vanguard level 20', fee: null });
  assert.deepEqual(unlockFacts({ ...NEW, unlock_class_level: null }), { free: false, gate: null, fee: '$100,000 to unlock' });
  assert.deepEqual(unlockFacts({ ...NEW, unlock_fee: 0 }), { free: false, gate: 'Vanguard level 20', fee: 'No unlock fee' }, 'fee 0 with a level is not "default"');
  assert.equal(unlockFacts({ ...NEW, unlock_class_level: null, unlock_fee: null }), null);
  assert.equal(unlockSentence(NEW), 'Vanguard level 20, $100,000 fee');
  assert.equal(unlockSentence({ ...NEW, unlock_fee: 0 }), 'Vanguard level 20, no unlock fee');
  assert.equal(unlockSentence(FREE), 'unlocked by default');
  assert.equal(unlockSentence({ ...NEW, unlock_class_level: null, unlock_fee: null }), null);
});

test('source line: stats wording only when stats exist; otherwise the stored fields and the row source', () => {
  assert.equal(sourceLine(TESTED, { hasBallistics: true, fallbackSource: 'F' }),
    'ballistics + fire rate from Community range testing (attributed). Superseded by first-party data when Bulkhead publishes.', 'unchanged wording with both');
  assert.equal(sourceLine({ ...TESTED, verified_source: null }, { hasBallistics: true, fallbackSource: 'F' }),
    'ballistics + fire rate from F. Superseded by first-party data when Bulkhead publishes.', 'fallback label as before');
  assert.equal(sourceLine(TESTED, { hasBallistics: false }), 'fire rate from Community range testing (attributed). Superseded by first-party data when Bulkhead publishes.');
  assert.equal(sourceLine({ ...TESTED, fire_rate: null }, { hasBallistics: true }), 'ballistics from Community range testing (attributed). Superseded by first-party data when Bulkhead publishes.');
  const none = sourceLine(NEW, { hasBallistics: false, fallbackSource: 'F' });
  assert.equal(none, 'weapon type, caliber, vendor price and unlock from ' + SRC + '.');
  assert.ok(!/ballistics|fire rate|Superseded/.test(none));
  assert.equal(sourceLine({ ...NEW, credit_cost: null, unlock_class_level: null, unlock_fee: null }, {}), 'weapon type and caliber from ' + SRC + '.');
  assert.equal(sourceLine({ ...NEW, verified_source: null }, { fallbackSource: 'F' }), null, 'no stats and no source -> no line, not the stats fallback');
});

test('title / meta: unchanged with ballistics; without, only what the page shows', () => {
  const withB = weaponPageMeta('Rifle Tested', TESTED, { hasBallistics: true, stkBit: ' 2 shots to the head, 4 to the chest (FMJ, unarmored).' });
  assert.equal(withB.title, 'Wardogs Rifle Tested - Shots to Kill & Body-Part Damage');
  assert.equal(withB.description, 'Wardogs Rifle Tested (Assault Rifle, 6mm Test): shots-to-kill and body-part damage per zone, measured across ammo and armor from community ballistics testing (attributed). 2 shots to the head, 4 to the chest (FMJ, unarmored).');
  assert.equal(withB.ogDescription, 'Wardogs Rifle Tested (Assault Rifle): measured shots-to-kill and body-part damage across ammo and armor.');

  const noB = weaponPageMeta('Rifle Nova', NEW, { hasBallistics: false });
  assert.equal(noB.title, 'Wardogs Rifle Nova - Stats, Price & Unlock');
  assert.equal(noB.description, 'Wardogs Rifle Nova (Assault Rifle, 6mm Test): vendor price $3,200; unlock Vanguard level 20, $100,000 fee. Time-to-kill and body-part ballistics are not measured yet.');
  assert.equal(noB.ogDescription, noB.description);
  assert.equal(weaponPageMeta('Carbine Free', FREE).description, 'Wardogs Carbine Free (Assault Rifle, 6mm Test): vendor price $1,000; unlocked by default. Time-to-kill and body-part ballistics are not measured yet.');
  assert.equal(weaponPageMeta('Bare', { weapon_type: 'Launcher' }).description, 'Wardogs Bare (Launcher). Time-to-kill and body-part ballistics are not measured yet.', 'NULL fields absent, never TBD');
  for (const m of [noB, weaponPageMeta('Bare', { weapon_type: 'Launcher' })]) {
    assert.ok(!/Shots to Kill|shots-to-kill|TBD|unknown|Standard|shield/i.test(m.title + m.description), m.description);
  }
});

test('OG card headline follows the title rule', () => {
  assert.equal(weaponOgHeadline('Rifle Tested', true), 'Wardogs Rifle Tested: Shots to Kill');
  assert.equal(weaponOgHeadline('Rifle Nova', false), 'Wardogs Rifle Nova: Price & Unlock');
});
