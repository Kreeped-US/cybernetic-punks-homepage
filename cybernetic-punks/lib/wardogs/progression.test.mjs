// lib/wardogs/progression.test.mjs
// Tests for the Progression Planner helpers. Run: node --test lib/wardogs/progression.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildRoadmap, planByState, isFreeStarter, normalizeWeapon, TRACK_ORDER } from './progression.js';

const SAMPLE = [
  { name: 'Bushmaster M17S', unlock_class: 'Assault', unlock_class_level: null, unlock_fee: 0, credit_cost: 0 },
  { name: 'AK74', unlock_class: 'Assault', unlock_class_level: 3, unlock_fee: 10000, credit_cost: 1600 },
  { name: 'FAL', unlock_class: 'Assault', unlock_class_level: 35, unlock_fee: 200000, credit_cost: 6500 },
  { name: 'AMP-9', unlock_class: 'Medic', unlock_class_level: null, unlock_fee: 0, credit_cost: 900 },
  { name: 'Super-45', unlock_class: 'Medic', unlock_class_level: 35, unlock_fee: 150000, credit_cost: 2600 },
  { name: 'Deagle', unlock_class: 'Wardog', unlock_class_level: null, unlock_career_level: 85, unlock_fee: 75000, credit_cost: 900 },
];

test('buildRoadmap groups by track in canonical order + computes totals', () => {
  const r = buildRoadmap(SAMPLE);
  assert.deepEqual(r.tracks.map((t) => t.track), ['Assault', 'Medic', 'Wardog']);
  assert.equal(r.weaponCount, 6);
  assert.equal(r.grandTotal, 0 + 10000 + 200000 + 0 + 150000 + 75000); // 435000
  const assault = r.tracks.find((t) => t.track === 'Assault');
  assert.equal(assault.unlockTotal, 210000);
  assert.equal(assault.count, 3);
});

test('track order follows TRACK_ORDER, not input/alpha order', () => {
  const r = buildRoadmap(SAMPLE);
  const idxMedic = r.tracks.findIndex((t) => t.track === 'Medic');
  const idxWardog = r.tracks.findIndex((t) => t.track === 'Wardog');
  assert.ok(idxMedic < idxWardog);
  assert.ok(TRACK_ORDER.indexOf('Assault') < TRACK_ORDER.indexOf('Wardog'));
});

test('within a track, weapons sort by unlock gate ascending (free/low first)', () => {
  const r = buildRoadmap(SAMPLE);
  const assault = r.tracks.find((t) => t.track === 'Assault');
  assert.deepEqual(assault.weapons.map((w) => w.name), ['Bushmaster M17S', 'AK74', 'FAL']);
});

test('isFreeStarter = zero fee AND no gate (not just zero fee)', () => {
  assert.equal(isFreeStarter(normalizeWeapon(SAMPLE[0])), true);  // Bushmaster: fee 0, no level
  assert.equal(isFreeStarter(normalizeWeapon(SAMPLE[1])), false); // AK74: fee 10000
  // a hypothetical fee-0-but-gated weapon is NOT a free starter
  assert.equal(isFreeStarter(normalizeWeapon({ name: 'X', unlock_class: 'Assault', unlock_class_level: 10, unlock_fee: 0 })), false);
});

test('unlockFee and perLife are DISTINCT normalized fields (never conflated)', () => {
  const fal = normalizeWeapon(SAMPLE[2]);
  assert.equal(fal.unlockFee, 200000); // one-time
  assert.equal(fal.perLife, 6500);     // per-life
  assert.notEqual(fal.unlockFee, fal.perLife);
});

test('missing fee/level -> null (honest-null), never 0', () => {
  const w = normalizeWeapon({ name: 'TBD', unlock_class: 'Recon', unlock_class_level: null, unlock_fee: null, credit_cost: null });
  assert.equal(w.level, null);
  assert.equal(w.unlockFee, null);
  assert.equal(w.perLife, null);
});

test('planByState: level too low -> needLevel; fee too high -> needCash; both met -> unlockableNow', () => {
  const p = planByState(SAMPLE, { level: 5, budget: 20000 });
  const names = (arr) => arr.map((w) => w.name).sort();
  // free starters always unlockable; AK74 (lvl3, $10k) meets lvl5 + budget 20k
  assert.ok(p.unlockableNow.some((w) => w.name === 'AK74'));
  assert.ok(p.unlockableNow.some((w) => w.name === 'Bushmaster M17S'));
  // FAL needs lvl35 -> needLevel; Super-45 needs lvl35 -> needLevel
  assert.ok(p.needLevel.some((w) => w.name === 'FAL'));
  // Deagle career 85 -> needLevel at lvl5
  assert.ok(p.needLevel.some((w) => w.name === 'Deagle'));
  assert.ok(Array.isArray(names(p.needCash)));
});

test('planByState: gate met but fee unaffordable -> needCash', () => {
  const p = planByState([{ name: 'FAL', unlock_class: 'Assault', unlock_class_level: 35, unlock_fee: 200000, credit_cost: 6500 }], { level: 40, budget: 1000 });
  assert.equal(p.needCash.length, 1);
  assert.equal(p.needCash[0].name, 'FAL');
});
