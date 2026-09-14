// lib/wardogs/economyModel.test.mjs -- run: node --test lib/wardogs/economyModel.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  spendModel, representativeCosts, shareStats, statByKey,
  weightedPrimaryCost, FREQ, AMMO_BOXES_PER_TOPUP, DEFAULT_PLAYERS,
} from './economyModel.js';

// Fixture with free + budget + mid + premium guns and cheap + premium vehicles, so the v3
// population-weighting + common-tier vehicle logic is actually exercised.
const DATA = {
  weapons: [
    { name: 'Free AR', category: 'Assault Rifle', credit_cost: 0 },
    { name: 'T-21', category: 'Assault Rifle', credit_cost: 600 },
    { name: 'AK74', category: 'Assault Rifle', credit_cost: 1600 },
    { name: 'M4', category: 'Assault Rifle', credit_cost: 2600 },
    { name: 'AMR 50', category: 'Sniper Rifle', credit_cost: 8800 },
    { name: 'GGX 17', category: 'Sidearm', credit_cost: 200 },
    { name: 'Deagle', category: 'Sidearm', credit_cost: 900 },
  ],
  ammo: [{ box_price: 40 }, { box_price: 70 }],  // mean 55
  items: [
    { name: 'L1 Armor', category: 'armor', cost: 400 },
    { name: 'L4 Armor', category: 'armor', cost: 4000 },
    { name: 'L4 Helmet', category: 'helmet', cost: 3000 },
    { name: 'Bandage', category: 'medical', cost: 200 },
    { name: 'Bobcat', category: 'vehicle', subcategory: 'ground', cost: 500 },
    { name: 'Kodiak', category: 'vehicle', subcategory: 'ground', cost: 2500 },
    { name: 'MH-6', category: 'vehicle', subcategory: 'air', cost: 6250 },
    { name: 'Havoc', category: 'vehicle', subcategory: 'air', cost: 18000 },
  ],
};

test('v3 CCU recalibration: default players lowered to a cold time-average', () => {
  assert.equal(DEFAULT_PLAYERS, 130000);
});

test('weightedPrimaryCost: population-weighted, COLDER than the catalog median', () => {
  const primaries = [0, 600, 1600, 2600, 8800];
  // bands: free[0] .40*0 + budget<=1200[600] .38*600 + mid<=2800[1600,2600] .17*2100 + prem[8800] .05*8800
  // = 0 + 228 + 357 + 440 = 1025 (weights sum to 1)
  assert.equal(weightedPrimaryCost(primaries), 1025);
  // the whole point of the fix: the weighted primary is far below the catalog median (1600 here)
  const sorted = [...primaries].sort((a, b) => a - b);
  const catalogMedian = sorted[Math.floor(sorted.length / 2)];
  assert.ok(weightedPrimaryCost(primaries) < catalogMedian * 1.1);
});

test('ammo is a ~2-box TOP-UP (not a 14-box combat load)', () => {
  const c = representativeCosts(DATA);
  assert.equal(c.ammo, AMMO_BOXES_PER_TOPUP * 55); // 2 * mean([40,70]) = 110
  assert.ok(c.ammo < 200);                          // far below the old ~$770 load
});

test('vehicles priced on the common-transport tier, not the catalog mean', () => {
  const c = representativeCosts(DATA);
  // common tier (cost <= 3000): [500, 2500] -> mean 1500; catalog mean would be (500+2500+6250+18000)/4 = 6813
  assert.equal(c.vehicles, 1500);
  assert.ok(c.vehicles < 3000);
});

test('representativeCosts.weapons uses the population-weighted primary', () => {
  const c = representativeCosts(DATA);
  const primaries = DATA.weapons.filter((w) => w.category !== 'Sidearm').map((w) => w.credit_cost);
  assert.equal(c.weapons, weightedPrimaryCost(primaries));
});

test('spendModel: ticker total = sum of category $/sec (reconciles)', () => {
  const m = spendModel(DATA);
  const sum = m.categories.reduce((a, c) => a + c.spendPerSec, 0);
  assert.ok(Math.abs(sum - m.totalPerSec) < 1e-6);
});

test('category shares add up to ~100% of the ticker', () => {
  const m = spendModel(DATA);
  const shareSum = m.categories.reduce((a, c) => a + c.sharePct, 0);
  assert.ok(Math.abs(shareSum - 100) < 1e-6);
});

test('COLD basket: per active player-hour is far below the old hot ~$12,600', () => {
  const m = spendModel(DATA);
  assert.ok(m.totalPerHourPerPlayer > 1000);   // not zeroed out
  assert.ok(m.totalPerHourPerPlayer < 4000);   // firmly cold / defensible (fixture ~$2,095)
});

test('smell test: weapons dominant (~half), ammo modest but present, vehicles a chunk', () => {
  const m = spendModel(DATA);
  const share = (k) => m.categories.find((c) => c.key === k).sharePct;
  assert.equal(m.categories[0].key, 'weapons');     // weapons the biggest sink
  assert.ok(share('weapons') > 40 && share('weapons') < 70); // ~half, not 90%+ and not trivial
  assert.ok(share('ammo') > 0 && share('ammo') < share('weapons'));
  assert.ok(share('vehicles') > 0);
});

test('per-use cost is distinct from any unlock fee (model uses per-use only)', () => {
  const m = spendModel(DATA);
  const w = m.categories.find((c) => c.key === 'weapons');
  assert.equal(w.repCost, 1025); // population-weighted per-life primary, not an unlock fee
});

test('shareStats: per-active-hour card is units-correct (per HOUR, = model rate)', () => {
  const m = spendModel(DATA);
  const s = shareStats(DATA, m);
  const perHour = s.find((x) => x.key === 'per-active-hour');
  assert.ok(perHour, 'per-active-hour stat exists');
  assert.ok(/\/hr$/.test(perHour.big), 'headline is a per-hour figure');
  assert.ok(/ACTIVE/i.test(perHour.label));           // not "owner"
  assert.ok(!/owner/i.test(perHour.label));           // the buggy per-owner framing is gone
});

test('statByKey: legacy avg-owner key aliases to the units-fixed per-active-hour stat', () => {
  const viaLegacy = statByKey(DATA, 'avg-owner');
  const viaNew = statByKey(DATA, 'per-active-hour');
  assert.ok(viaLegacy && viaNew);
  assert.equal(viaLegacy.key, 'per-active-hour');
  assert.equal(viaLegacy.big, viaNew.big);
});

test('shareStats returns real, screenshot-friendly facts', () => {
  const m = spendModel(DATA);
  const s = shareStats(DATA, m);
  assert.ok(s.length >= 4);
  assert.ok(s.every((x) => x.big && x.label));
  assert.ok(s.some((x) => /AMMO/i.test(x.label)));   // the ammo hook
  assert.ok(s.some((x) => /Havoc/.test(x.label)));   // the Havoc comparison
});
