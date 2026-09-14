// lib/wardogs/economyModel.test.mjs -- run: node --test lib/wardogs/economyModel.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spendModel, representativeCosts, shareStats, FREQ, AMMO_BOXES_PER_LIFE } from './economyModel.js';

const DATA = {
  weapons: [
    { name: 'AK74', category: 'Assault Rifle', credit_cost: 1600 },
    { name: 'AMR 50', category: 'Sniper Rifle', credit_cost: 8800 },
    { name: 'M4', category: 'Assault Rifle', credit_cost: 2600 },
    { name: 'GGX 17', category: 'Sidearm', credit_cost: 200 },
    { name: 'Deagle', category: 'Sidearm', credit_cost: 900 },
  ],
  ammo: [{ box_price: 40 }, { box_price: 70 }],
  items: [
    { name: 'L1 Armor', category: 'armor', cost: 400 },
    { name: 'L4 Armor', category: 'armor', cost: 4000 },
    { name: 'L4 Helmet', category: 'helmet', cost: 3000 },
    { name: 'Bandage', category: 'medical', cost: 200 },
    { name: 'MH-6', category: 'vehicle', subcategory: 'air', cost: 6250 },
    { name: 'Havoc', category: 'vehicle', subcategory: 'air', cost: 18000 },
  ],
};

test('ammo cost is a FULL combat load (not 2 boxes) -> significant', () => {
  const c = representativeCosts(DATA);
  assert.equal(c.ammo, AMMO_BOXES_PER_LIFE * 55); // mean([40,70])=55
  assert.ok(c.ammo > 500); // meaningfully more than the old ~$110
});

test('spendModel: ticker total = sum of category $/sec (reconciles)', () => {
  const m = spendModel(DATA, { players: 170000 });
  const sum = m.categories.reduce((a, c) => a + c.spendPerSec, 0);
  assert.ok(Math.abs(sum - m.totalPerSec) < 1e-6);
});

test('category shares add up to ~100% of the ticker', () => {
  const m = spendModel(DATA);
  const shareSum = m.categories.reduce((a, c) => a + c.sharePct, 0);
  assert.ok(Math.abs(shareSum - 100) < 1e-6);
});

test('smell test: weapons dominant, ammo significant (NOT a rounding error), vehicles a chunk', () => {
  const m = spendModel(DATA);
  const share = (k) => m.categories.find((c) => c.key === k).sharePct;
  assert.equal(m.categories[0].key, 'weapons');   // weapons the biggest sink
  assert.ok(share('ammo') > 8);                    // ammo is significant, not ~1%
  assert.ok(share('vehicles') > 8);                // vehicles a real chunk
  assert.ok(share('ammo') > share('gear'));        // ammo beats trivial gear
});

test('per-use cost is distinct from any unlock fee (model uses per-use only)', () => {
  const m = spendModel(DATA);
  // weapons repCost = primary median + sidearm mean, a per-life price, not an unlock fee
  const w = m.categories.find((c) => c.key === 'weapons');
  assert.equal(w.repCost, 2600 + 550); // primaries [1600,2600,8800] median 2600; sidearms [200,900] mean 550
});

test('shareStats returns real, screenshot-friendly facts', () => {
  const m = spendModel(DATA);
  const s = shareStats(DATA, m);
  assert.ok(s.length >= 4);
  assert.ok(s.every((x) => x.big && x.label));
  assert.ok(s.some((x) => /AMMO/i.test(x.label)));            // the ammo hook
  assert.ok(s.some((x) => /Havoc/.test(x.label)));           // the Havoc comparison
  assert.ok(s.some((x) => /owner/i.test(x.label)));          // per-owner figure
});
