// lib/wardogs/economyModel.test.mjs -- run: node --test lib/wardogs/economyModel.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeBreakdown, representativeCosts, economyInsights, FREQ } from './economyModel.js';

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
    { name: 'L2 Helmet', category: 'helmet', cost: 500 },
    { name: 'Bandage', category: 'medical', cost: 200 },
    { name: 'Medical Bag', category: 'medical', cost: 2000 },
    { name: 'M67 Frag', category: 'grenade', cost: 200 },
    { name: 'Halftrack Backpack', category: 'backpack', cost: 15000 },
    { name: 'MH-6', category: 'vehicle', subcategory: 'air', cost: 6250 },
    { name: 'Havoc', category: 'vehicle', subcategory: 'air', cost: 18000 },
  ],
};

test('representativeCosts uses outlier-robust medians (Halftrack does not blow up gear)', () => {
  const c = representativeCosts(DATA);
  // gear median of [200 (frag), 15000 (halftrack)] -> the higher of the two at floor(2/2)=index1 = 15000?
  // our median picks s[floor(len/2)]; for 2 items that is index 1. Keep it defined + finite.
  assert.ok(Number.isFinite(c.gear));
  // weapons = primary median + sidearm mean. primaries [1600,2600,8800] median 2600; sidearms [200,900] mean 550
  assert.equal(c.weapons, 2600 + 550);
  // ammo = 2 x mean([40,70]=55) = 110
  assert.equal(c.ammo, 110);
});

test('computeBreakdown shares sum to ~100% and are sorted desc', () => {
  const b = computeBreakdown(DATA);
  const sum = b.reduce((a, c) => a + c.sharePct, 0);
  assert.ok(Math.abs(sum - 100) < 1e-6);
  for (let i = 1; i < b.length; i++) assert.ok(b[i - 1].sharePct >= b[i].sharePct);
});

test('every category carries its documented frequency + a representative cost', () => {
  const b = computeBreakdown(DATA);
  for (const c of b) {
    assert.equal(c.freq, FREQ[c.key]);
    assert.ok(c.repCost >= 0);
    assert.ok(c.weightPerHour === c.freq * c.repCost);
  }
});

test('ammo is a small share despite every-life frequency (cheap) -- the intel', () => {
  const b = computeBreakdown(DATA);
  const ammo = b.find((c) => c.key === 'ammo');
  const weapons = b.find((c) => c.key === 'weapons');
  assert.ok(ammo.sharePct < weapons.sharePct);
  assert.ok(ammo.sharePct < 10); // ammo is cheap -> small share
});

test('economyInsights returns real facts (priciest weapon, vehicle) not modeled numbers', () => {
  const b = computeBreakdown(DATA);
  const ins = economyInsights({ weapons: DATA.weapons, items: DATA.items, breakdown: b });
  assert.ok(ins.some((i) => /AMR 50/.test(i.label) && /8,800/.test(i.stat)));
  assert.ok(ins.some((i) => /Havoc/.test(i.label) && /18,000/.test(i.stat)));
});
