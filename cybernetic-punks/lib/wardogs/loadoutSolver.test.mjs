// lib/wardogs/loadoutSolver.test.mjs
// Locks the Wardogs loadout solver (lib/wardogs/loadoutSolver.js) -- the novel deterministic wedge
// (unlock-gate -> effectiveness-rank -> budget-solve), proven correct in isolation BEFORE any
// route/UI/LLM depends on it. Run: node --test lib/wardogs/loadoutSolver.test.mjs
//
// SYNTHETIC FIXTURES ONLY. Every weapon/ttk row below is CLEARLY FAKE ("Test ..." / test-* names,
// invented numbers chosen to exercise the math). They are NEVER seeded into the DB and NEVER rendered
// as product content. This is logic verification, not fabrication of game data.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  solveLoadout,
  unlockGate,
  rankByEffectiveness,
  budgetSolve,
  weightedTtk,
  floorTier,
  inheritProvenance,
  slotOf,
  oneShotFloorMs,
  ONE_SHOT_FALLBACK_INTERVAL_MS,
  PLAYSTYLES,
  TIER_ORDER,
} from './loadoutSolver.js';

// --- synthetic fixtures -----------------------------------------------------
// Two rifles engineered so playstyle reorders them: "Soft" kills fast vs light armor (HP, low tiers),
// "Pierce" kills fast vs heavy armor (AP, high tiers).
const W_SOFT   = { name: 'Test Soft Rifle',  category: 'Assault Rifle' };
const W_PIERCE = { name: 'Test Pierce Rifle', category: 'Assault Rifle' };
const W_PISTOL = { name: 'Test Pistol', category: 'Secondary' };

function ttkRow(w, ammo, tier, ms) {
  return { weapon_name: w, ammo_type: ammo, armor_tier: tier, ttk_ms: ms, confidence_tier: 'attributed', verified_source: 'Test Swoleguy fixture' };
}
// Soft: fast HP low-tier, slow AP high-tier. Pierce: the reverse.
const TTK = [
  ttkRow('Test Soft Rifle',  'HP', 0, 200), ttkRow('Test Soft Rifle',  'HP', 1, 250),
  ttkRow('Test Soft Rifle',  'AP', 3, 900), ttkRow('Test Soft Rifle',  'AP', 4, 1000),
  ttkRow('Test Pierce Rifle','HP', 0, 400), ttkRow('Test Pierce Rifle','HP', 1, 450),
  ttkRow('Test Pierce Rifle','AP', 3, 500), ttkRow('Test Pierce Rifle','AP', 4, 520),
  ttkRow('Test Pistol',      'HP', 0, 300), ttkRow('Test Pistol',      'AP', 3, 700),
];

// --- slotOf -----------------------------------------------------------------

test('slotOf: secondary-class weapons map to secondary, everything else to primary', () => {
  assert.equal(slotOf({ category: 'Secondary' }), 'secondary');
  assert.equal(slotOf({ weapon_class: 'SECONDARY' }), 'secondary');
  assert.equal(slotOf({ category: 'Assault Rifle' }), 'primary');
  assert.equal(slotOf({ weapon_class: 'SNIPER' }), 'primary');
  assert.equal(slotOf({}), 'primary'); // unknown -> primary (never throws)
});

// --- step 1: unlock-gate ----------------------------------------------------

test('unlock-gate: a weapon above the player career level is excluded, an unlocked one is included', () => {
  const weapons = [
    { name: 'Open',   unlock_career_level: 5 },
    { name: 'Locked', unlock_career_level: 90 },
  ];
  const { unlocked, step } = unlockGate(weapons, { careerLevel: 20 });
  const names = unlocked.map((w) => w.name);
  assert.deepEqual(names, ['Open'], 'Open (req 5) in, Locked (req 90) out at Career 20');
  assert.equal(step.id, 'unlock-gate');
  assert.equal(step.status, 'done');
});

test('unlock-gate: class-level requirement excludes when the player class level is below it', () => {
  const weapons = [{ name: 'ReconGun', unlock_class: 'Recon', unlock_class_level: 25 }];
  const below = unlockGate(weapons, { careerLevel: 50, classLevels: { Recon: 10 } });
  assert.equal(below.unlocked.length, 0, 'Recon 10 < required 25 -> excluded');
  const at = unlockGate(weapons, { careerLevel: 50, classLevels: { Recon: 30 } });
  assert.equal(at.unlocked.length, 1, 'Recon 30 >= 25 -> included');
});

test('unlock-gate honest-null: unknown unlock levels are treated as AVAILABLE and flagged', () => {
  const weapons = [{ name: 'UnknownGun', unlock_career_level: null, unlock_class_level: null }];
  const { unlocked, step } = unlockGate(weapons, { careerLevel: 1 });
  assert.equal(unlocked.length, 1, 'null unlock cannot gate -> available');
  assert.match(step.detail, /assumed available/, 'the honest-null assumption is surfaced in the step');
});

test('unlock-gate: no player provided -> gating SKIPPED, all weapons pass, step says so', () => {
  const weapons = [{ name: 'A', unlock_career_level: 90 }, { name: 'B' }];
  const { unlocked, step } = unlockGate(weapons, null);
  assert.equal(unlocked.length, 2);
  assert.equal(step.status, 'skipped');
  assert.match(step.detail, /skipped/i);
});

// --- step 2: effectiveness-rank (playstyle-weighted TTK) --------------------

test('effectiveness-rank: aggressive vs tactical produce DIFFERENT orders from the real data', () => {
  const aggressive = rankByEffectiveness([W_SOFT, W_PIERCE], TTK, { playstyle: 'aggressive' });
  const tactical   = rankByEffectiveness([W_SOFT, W_PIERCE], TTK, { playstyle: 'tactical' });
  assert.equal(aggressive.ranked[0].weapon_name, 'Test Soft Rifle',   'aggressive (HP, low tiers) favors the soft-target killer');
  assert.equal(tactical.ranked[0].weapon_name,   'Test Pierce Rifle', 'tactical (AP, high tiers) favors the armor-piercer');
  assert.notEqual(aggressive.ranked[0].weapon_name, tactical.ranked[0].weapon_name, 'playstyle reorders the ranking');
});

test('effectiveness-rank: lower weighted TTK yields a higher score, and the step is reported', () => {
  const { ranked, step } = rankByEffectiveness([W_SOFT, W_PIERCE], TTK, { playstyle: 'aggressive' });
  assert.ok(ranked[0].score > ranked[1].score, 'best weapon has the higher score');
  assert.ok(ranked[0].weighted_ttk_ms < ranked[1].weighted_ttk_ms, 'best weapon has the lower weighted TTK');
  assert.equal(step.id, 'effectiveness-rank');
  assert.equal(step.status, 'done');
});

test('effectiveness-rank: a weapon with no TTK data for the ammo is ranked LAST and flagged, not dropped', () => {
  const noData = { name: 'Test No Data Gun', category: 'SMG' };
  const { ranked, step } = rankByEffectiveness([W_SOFT, noData], TTK, { playstyle: 'aggressive' });
  assert.equal(ranked.length, 2, 'unrankable weapon is kept, not dropped');
  assert.equal(ranked[ranked.length - 1].weapon_name, 'Test No Data Gun', 'unrankable sorts last');
  assert.equal(ranked[ranked.length - 1].score, null);
  assert.match(step.detail, /no TTK data/);
});

test('weightedTtk: renormalizes over present tiers (a missing tier does not distort the average)', () => {
  // build a tiny index: one weapon, HP present only at tier 0 (=100)
  const idx = new Map([['W', new Map([['HP', new Map([[0, 100]])]])]]);
  const profile = { ammo: 'HP', armorWeights: [0.4, 0.3, 0.2, 0.1, 0.0] };
  const wt = weightedTtk(idx, 'W', profile);
  assert.equal(wt.weightedTtkMs, 100, 'only tier 0 present -> weighted average is exactly that value');
  assert.equal(weightedTtk(idx, 'MISSING', profile), null, 'no data -> null');
});

// --- the one-shot fire-interval floor (the de-skew fix) ---------------------

test('oneShotFloorMs: a one-shot is floored at the fire interval (60000/rpm), null fire_rate -> fallback', () => {
  assert.equal(oneShotFloorMs(1200), 50, '1200 rpm -> 50ms cadence floor');
  assert.equal(oneShotFloorMs(60), 1000, '60 rpm -> 1000ms cadence floor (a slow one-shotter is slow)');
  assert.equal(oneShotFloorMs(null), ONE_SHOT_FALLBACK_INTERVAL_MS, 'unknown fire_rate -> fallback constant');
  assert.equal(oneShotFloorMs(0), ONE_SHOT_FALLBACK_INTERVAL_MS, 'zero fire_rate -> fallback constant');
});

test('weightedTtk: a one-shot cell (ttk 0) is scored at the cadence floor, NOT literal 0', () => {
  const idx = new Map([['One', new Map([['HP', new Map([[0, 0]])]])]]); // one-shots at T0
  const profile = { ammo: 'HP', armorWeights: [0.4, 0.3, 0.2, 0.1, 0.0] };
  assert.equal(weightedTtk(idx, 'One', profile, 1200).weightedTtkMs, 50, 'fast one-shotter -> 50ms (not 0)');
  assert.equal(weightedTtk(idx, 'One', profile, 60).weightedTtkMs, 1000, 'slow one-shotter -> 1000ms (not 0)');
});

test('one-shot floor DE-SKEWS: a fast one-shotter out-ranks a slow one-shotter (both 0ms raw)', () => {
  // both one-shot unarmored (raw ttk 0); ONLY fire rate should separate them after the floor
  const FAST = { name: 'Test Fast OneShot', category: 'SMG',    fire_rate: 1200 }; // floor 50ms
  const SLOW = { name: 'Test Slow OneShot', category: 'Sniper', fire_rate: 60 };   // floor 1000ms
  const ttk = [
    { weapon_name: 'Test Fast OneShot', ammo_type: 'HP', armor_tier: 0, ttk_ms: 0, confidence_tier: 'attributed', verified_source: 'fixture' },
    { weapon_name: 'Test Slow OneShot', ammo_type: 'HP', armor_tier: 0, ttk_ms: 0, confidence_tier: 'attributed', verified_source: 'fixture' },
  ];
  const { ranked } = rankByEffectiveness([SLOW, FAST], ttk, { playstyle: 'aggressive' });
  assert.equal(ranked[0].weapon_name, 'Test Fast OneShot', 'the faster-cadence one-shotter ranks first');
  assert.equal(ranked[0].weighted_ttk_ms, 50, 'fast one-shot scored at its 50ms cadence, not 0');
  assert.equal(ranked[1].weapon_name, 'Test Slow OneShot');
  assert.equal(ranked[1].weighted_ttk_ms, 1000, 'slow one-shot correctly demoted to its 1000ms cadence');
  assert.ok(ranked[0].score > ranked[1].score, 'fast one-shotter has the higher effectiveness score');
});

// --- step 3: budget-solve ---------------------------------------------------

function cand(name, slot, score, cost) {
  return { weapon_name: name, slot, score, cost, rankable: true };
}

test('budget-solve WITH prices: stays within budget and maximizes total score', () => {
  const bySlot = {
    primary:   [cand('Pricey', 'primary', 900, 900), cand('Cheap', 'primary', 500, 100)],
    secondary: [cand('Pistol', 'secondary', 300, 100)],
  };
  const tight = budgetSolve(bySlot, 300, { slots: ['primary', 'secondary'] });
  assert.equal(tight.applied, true);
  assert.equal(tight.picks.primary.weapon_name, 'Cheap', 'cannot afford Pricey at 300 -> Cheap');
  assert.equal(tight.picks.secondary.weapon_name, 'Pistol');
  assert.equal(tight.totalCost, 200);

  const roomy = budgetSolve(bySlot, 1100, { slots: ['primary', 'secondary'] });
  assert.equal(roomy.picks.primary.weapon_name, 'Pricey', 'at 1100 the higher-score Pricey+Pistol wins');
  assert.equal(roomy.totalCost, 1000);
});

test('budget-solve HONEST-NULL: no prices -> degrades to effectiveness-only, no crash, flagged', () => {
  const bySlot = {
    primary:   [cand('A', 'primary', 900, null), cand('B', 'primary', 500, null)],
    secondary: [cand('P', 'secondary', 300, null)],
  };
  const res = budgetSolve(bySlot, 4000, { slots: ['primary', 'secondary'] });
  assert.equal(res.applied, false, 'no known costs -> budget cannot be applied');
  assert.equal(res.picks.primary.weapon_name, 'A', 'falls back to the top-scored candidate per slot');
  assert.equal(res.totalCost, null);
  assert.match(res.step.detail, /no prices published|unavailable/i, 'the honest-null reason is surfaced');
  assert.equal(res.step.status, 'skipped');
});

test('budget-solve: no budget given -> skipped honestly (effectiveness only)', () => {
  const bySlot = { primary: [cand('A', 'primary', 900, 100)] };
  const res = budgetSolve(bySlot, null, { slots: ['primary'] });
  assert.equal(res.applied, false);
  assert.match(res.step.detail, /No budget/i);
});

// --- provenance inheritance -------------------------------------------------

test('floorTier: the output tier is the WEAKEST of the inputs', () => {
  assert.equal(floorTier(['official', 'attributed']), 'attributed', 'official + attributed -> attributed (floor)');
  assert.equal(floorTier(['official']), 'official');
  assert.equal(floorTier([]), 'unknown');
  assert.equal(floorTier(['attributed', null]), 'unknown', 'a null/unknown tier drags the floor to unknown');
  assert.ok(TIER_ORDER.official > TIER_ORDER.attributed);
});

test('provenance inheritance: attributed ballistics -> attributed recommendation (never laundered up)', () => {
  const prov = inheritProvenance({ ttkRows: TTK, weapons: [], budgetApplied: false });
  assert.equal(prov.tier, 'attributed');
  assert.match(prov.basis, /Swoleguy/);
  assert.ok(prov.sources.length >= 1, 'the attributed source is carried through');
});

test('provenance inheritance: community-attributed prices stay attributed and are NOT laundered as official', () => {
  const weapons = [{ name: 'Test Soft Rifle', credit_cost: 500 }];
  const prov = inheritProvenance({ ttkRows: TTK, weapons, budgetApplied: true });
  assert.equal(prov.tier, 'attributed', 'attributed price + attributed effectiveness -> floor is attributed');
  assert.match(prov.basis, /community-attributed prices/);
  assert.doesNotMatch(prov.basis, /official/, 'prices must never be laundered as official');
});

// --- the public entry point: solveLoadout -----------------------------------

test('solveLoadout: emits the three ordered steps in the honest DAG order', () => {
  const out = solveLoadout({ weapons: [W_SOFT, W_PIERCE, W_PISTOL], ttk: TTK, playstyle: 'aggressive' });
  assert.deepEqual(out.steps.map((s) => s.id), ['unlock-gate', 'effectiveness-rank', 'budget-solve'],
    'the ordered steps are exactly the real pipeline, for truthful narration');
});

test('solveLoadout: honest-null end to end (no player, no prices) -> ranks, degrades, stays attributed', () => {
  const out = solveLoadout({ weapons: [W_SOFT, W_PIERCE, W_PISTOL], ttk: TTK, playstyle: 'aggressive' });
  assert.equal(out.steps[0].status, 'skipped', 'no player -> unlock-gate skipped');
  assert.equal(out.steps[2].status, 'skipped', 'no prices -> budget-solve skipped');
  assert.equal(out.budget.applied, false);
  assert.equal(out.provenance.tier, 'attributed');
  assert.equal(out.recommendation.primary.weapon_name, 'Test Soft Rifle', 'top primary by aggressive TTK');
  assert.equal(out.recommendation.secondary.weapon_name, 'Test Pistol', 'the pistol fills the secondary slot');
  assert.ok(out.candidates.primary.length >= 2 && out.candidates.secondary.length >= 1);
});

test('solveLoadout: full path -- unlock-gate + budget applied with synthetic prices', () => {
  const weapons = [
    { name: 'Test Soft Rifle',   category: 'Assault Rifle', unlock_career_level: 5,  credit_cost: 100 },
    { name: 'Test Pierce Rifle', category: 'Assault Rifle', unlock_career_level: 90, credit_cost: 900 },
    { name: 'Test Pistol',       category: 'Secondary',     unlock_career_level: 1,  credit_cost: 100 },
  ];
  const out = solveLoadout({ weapons, ttk: TTK, player: { careerLevel: 20 }, budget: 300, playstyle: 'aggressive' });
  assert.equal(out.steps[0].status, 'done', 'unlock-gate ran');
  // Pierce (req 90) is gated out at Career 20 -> only Soft remains in primary
  assert.ok(!out.candidates.primary.some((c) => c.weapon_name === 'Test Pierce Rifle'), 'locked Pierce is gated out');
  assert.equal(out.budget.applied, true, 'prices present + budget -> budget-solve runs');
  assert.equal(out.recommendation.primary.weapon_name, 'Test Soft Rifle');
  assert.equal(out.recommendation.secondary.weapon_name, 'Test Pistol');
  assert.equal(out.budget.total, 200, 'Soft 100 + Pistol 100 within 300');
});

// --- skeleton / empty-input safety ------------------------------------------

test('solveLoadout: no args does not throw and returns honest empty structure', () => {
  const out = solveLoadout();
  assert.equal(out.steps.length, 3, 'still reports the three steps');
  assert.deepEqual(out.candidates, { primary: [], secondary: [] });
  assert.equal(out.recommendation.primary, null);
  assert.equal(out.provenance.tier, 'attributed', 'effectiveness basis defaults to attributed');
});

test('PLAYSTYLES: the three profiles exist and carry ammo + armor-tier weights over the REAL axes', () => {
  for (const key of ['aggressive', 'balanced', 'tactical']) {
    assert.ok(PLAYSTYLES[key], key + ' profile exists');
    assert.ok(['FMJ', 'HP', 'AP'].includes(PLAYSTYLES[key].ammo), 'ammo is a real ammo type');
    assert.equal(PLAYSTYLES[key].armorWeights.length, 5, 'weights cover armor tiers 0..4');
  }
});
