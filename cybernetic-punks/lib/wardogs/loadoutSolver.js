// lib/wardogs/loadoutSolver.js
// Wardogs loadout solver -- the deterministic pre-filter that fixes what makes the Marathon advisor
// hang-and-boring. PURE: no DB, no fetch, no supabase, no React. The caller reads the rows
// (weapon_stats + wardogs_ballistics + wardogs_ttk) and passes plain data IN; the solver returns
// ranked candidates + the ORDERED STEPS it took + inherited provenance. Trivially unit-testable in
// isolation and safe to build ahead of its consumers (the advisor route + streaming UI, Phase 1c+).
// Mirrors the bodycam-mountability.js pattern (pure resolver, synthetic-fixture tests).
//
// WHY THIS EXISTS (from the Marathon advisor diagnosis, docs/HANDOFF.md 2026-09-10):
// Marathon dumps the whole DB into the LLM and asks it to pick -> no computation -> the output is
// LLM-asserted, not computed (boring), and there are no real steps to narrate (the dead 99% hang).
// This solver computes REAL substance (playstyle-weighted TTK from the attributed ballistics store)
// and emits REAL ordered steps (unlock-gate -> effectiveness-rank -> budget-solve) that the streaming
// loading UI can narrate TRUTHFULLY later. Substance + honest steps = the fix for both problems.
//
// THE PIPELINE (a small deterministic DAG):
//   1. UNLOCK-GATE   -- drop weapons the player has not unlocked (career/class level). Honest-null:
//                       an unknown unlock level cannot gate, so it is treated as AVAILABLE + flagged.
//   2. EFFECTIVENESS-RANK -- score each weapon by PLAYSTYLE-WEIGHTED TTK from wardogs_ttk. Works NOW
//                       on real attributed data.
//   3. BUDGET-SOLVE  -- pick the best affordable combo across slots within a cash budget. credit_cost
//                       is NULL today (Bulkhead has published no price list), so this DEGRADES
//                       HONESTLY to effectiveness-only and flags "budget unavailable". It activates
//                       automatically when prices land -- no code change.
//
// PROVENANCE INHERITANCE (Fable correction): the output's confidence tier = the FLOOR of the tiers of
// the inputs actually used. Effectiveness comes from attributed ballistics, so a recommendation is
// itself ATTRIBUTED -- never laundered up to "official". Reported in the output.
//
// PREMISE CORRECTION vs the architecture doc: WARDOGS_ADVISOR_ARCHITECTURE.md sketched the ballistics
// key with a `range_bucket` and "close vs long range" playstyles. The ACTUAL Phase 1a store has NO
// range dimension -- Swoleguy's data is body_part x ammo_type x armor_tier. So playstyle here weights
// over the axes that REALLY exist: preferred AMMO + an assumed enemy ARMOR-TIER profile (aggressive =
// soft targets / HP ammo / low tiers, tactical = armored targets / AP ammo / high tiers). These
// genuinely reorder weapons from the real data; range does not, because it is not in the data.

// --- tiers / provenance -----------------------------------------------------

// Confidence ordering (higher = stronger). floorTier() returns the WEAKEST among inputs used.
export const TIER_ORDER = { official: 3, verified: 3, attributed: 2, partial: 1, pending: 1, unknown: 0 };

export function floorTier(tiers) {
  let floor = null;
  for (const t of Array.isArray(tiers) ? tiers : []) {
    const key = (t == null || t === '') ? 'unknown' : String(t);
    const rank = TIER_ORDER[key] != null ? TIER_ORDER[key] : 0;
    if (floor === null || rank < floor.rank) floor = { tier: key, rank };
  }
  return floor ? floor.tier : 'unknown';
}

// --- playstyle profiles (over the REAL axes: ammo + assumed armor-tier weights) ---------------

// Each profile: preferred `ammo` and an armor-tier weight vector (tiers 0..4). weightedTtk() sums
// TTK across tiers with these weights, so a profile that weights LOW tiers rewards weapons that kill
// fast vs soft targets, and one that weights HIGH tiers rewards weapons that hold up vs armor.
export const PLAYSTYLES = {
  aggressive: { label: 'Aggressive', ammo: 'HP',  armorWeights: [0.40, 0.30, 0.20, 0.10, 0.00] },
  balanced:   { label: 'Balanced',   ammo: 'FMJ', armorWeights: [0.20, 0.20, 0.20, 0.20, 0.20] },
  tactical:   { label: 'Tactical',   ammo: 'AP',  armorWeights: [0.00, 0.10, 0.20, 0.30, 0.40] },
};
export const DEFAULT_PLAYSTYLE = 'balanced';

// --- small pure helpers -----------------------------------------------------

function asArray(v) { return Array.isArray(v) ? v : []; }
function num(v) { return typeof v === 'number' && Number.isFinite(v) ? v : null; }

// ONE-SHOT FLOOR (the fix). A TTK cell of 0 means a one-shot kill (shots-to-kill 1 -> no inter-shot
// time). Treating that as literally 0 ("infinitely fast") ignores fire rate, which over-ranks SLOW
// one-shotters (a 55-rpm AMR 50, bolt snipers, break shotguns) on the tiers they one-shot even though
// their cadence makes them specialists, not top killers. Honest practical model: a one-shot is still
// gated by the weapon's cadence -- if it misses or a second target appears, the fire interval decides
// -- so a one-shot is "very fast" (one shot-cycle), not "infinitely fast". floor = 60000 / fire_rate.
//
// FALLBACK when fire_rate is unknown (null/0): no ttk-having wardogs weapon lacks fire_rate today
// (the 3 fire_rate-null launchers carry no ballistics, so they never reach the weighting), so this is
// defensive only. Use a moderate ~400-rpm cadence so an unknown-cadence one-shot stays "fast but not
// infinite" rather than either 0 (the skew we are fixing) or punitively slow.
export const ONE_SHOT_FALLBACK_INTERVAL_MS = 150;

export function oneShotFloorMs(fireRate) {
  return (typeof fireRate === 'number' && fireRate > 0) ? 60000 / fireRate : ONE_SHOT_FALLBACK_INTERVAL_MS;
}

// Apply the one-shot floor to a raw TTK: a 0 (one-shot) becomes the cadence floor; any non-zero TTK
// is already >= one fire interval by construction (TTK = (STK-1) * interval), so it passes through.
function flooredTtk(rawMs, fireRate) {
  return rawMs === 0 ? oneShotFloorMs(fireRate) : rawMs;
}

// Resolve the effective playstyle profile, honoring caller overrides (ammo / armorWeights).
function resolveProfile(playstyle, overrides) {
  const base = PLAYSTYLES[playstyle] || PLAYSTYLES[DEFAULT_PLAYSTYLE];
  const o = overrides || {};
  return {
    key: PLAYSTYLES[playstyle] ? playstyle : DEFAULT_PLAYSTYLE,
    label: base.label,
    ammo: o.ammo || base.ammo,
    armorWeights: Array.isArray(o.armorWeights) ? o.armorWeights : base.armorWeights,
  };
}

// Index wardogs_ttk rows by weapon -> ammo -> tier -> ttk_ms. Ignores rows with null ttk_ms.
function indexTtk(ttkRows) {
  const idx = new Map();
  for (const r of asArray(ttkRows)) {
    if (!r || !r.weapon_name || !r.ammo_type) continue;
    const t = num(r.armor_tier);
    const ms = num(r.ttk_ms);
    if (t == null || ms == null) continue;
    if (!idx.has(r.weapon_name)) idx.set(r.weapon_name, new Map());
    const byAmmo = idx.get(r.weapon_name);
    if (!byAmmo.has(r.ammo_type)) byAmmo.set(r.ammo_type, new Map());
    byAmmo.get(r.ammo_type).set(t, ms);
  }
  return idx;
}

// Playstyle-weighted TTK for one weapon at the profile's ammo. Weighted average over the tiers that
// have data (weights renormalized to the present tiers, so a missing tier does not distort). Returns
// { weightedTtkMs, tiersUsed } or null when the weapon has no TTK data for this ammo.
export function weightedTtk(ttkIndex, weaponName, profile, fireRate) {
  const byAmmo = ttkIndex.get(weaponName);
  if (!byAmmo) return null;
  const byTier = byAmmo.get(profile.ammo);
  if (!byTier || byTier.size === 0) return null;
  let wsum = 0, acc = 0, tiersUsed = 0;
  for (let tier = 0; tier < profile.armorWeights.length; tier++) {
    const raw = byTier.get(tier);
    if (raw == null) continue;
    const w = profile.armorWeights[tier];
    if (w <= 0) continue;
    const ms = flooredTtk(raw, fireRate); // one-shot (0) -> cadence floor, not literal 0
    acc += w * ms;
    wsum += w;
    tiersUsed++;
  }
  if (wsum === 0) {
    // profile weights all fell on tiers with no data -> fall back to a plain mean of present tiers
    let sum = 0, n = 0;
    for (const raw of byTier.values()) { sum += flooredTtk(raw, fireRate); n++; }
    return n ? { weightedTtkMs: sum / n, tiersUsed: n, fallbackMean: true } : null;
  }
  return { weightedTtkMs: acc / wsum, tiersUsed, fallbackMean: false };
}

// Which loadout slot a weapon fills. SECONDARY-class weapons (pistols) -> 'secondary', else 'primary'.
// Reads weapon_class (ballistics) or category/weapon_type (weapon_stats). Deterministic, data-driven.
export function slotOf(weapon) {
  const label = String(
    (weapon && (weapon.weapon_class || weapon.category || weapon.weapon_type)) || ''
  ).toUpperCase();
  if (label.includes('SECONDARY') || label.includes('PISTOL') || label.includes('SIDEARM')) return 'secondary';
  return 'primary';
}

// --- step 1: unlock-gate ----------------------------------------------------

// Filter to weapons the player has unlocked. player = { careerLevel, classLevels: {Assault: n, ...} }.
// Honest-null: a weapon whose unlock_career_level AND unlock_class_level are both null cannot be
// gated (unknown requirement) -> treated as AVAILABLE and counted in `assumedAvailable`. When no
// player is given, gating is SKIPPED entirely (all weapons pass) and the step says so.
export function unlockGate(weapons, player) {
  const all = asArray(weapons);
  if (!player) {
    return {
      unlocked: all.slice(),
      step: { id: 'unlock-gate', label: 'Checking unlocks', status: 'skipped',
              detail: 'No player level provided -- unlock-gate skipped, all ' + all.length + ' weapons considered.' },
    };
  }
  const career = num(player.careerLevel);
  const classLevels = player.classLevels || {};
  let assumedAvailable = 0;
  const unlocked = all.filter((w) => {
    const reqCareer = num(w.unlock_career_level);
    const reqClass = num(w.unlock_class_level);
    if (reqCareer == null && reqClass == null) { assumedAvailable++; return true; } // honest-null
    if (reqCareer != null && career != null && career < reqCareer) return false;
    if (reqClass != null) {
      const cls = w.unlock_class;
      const have = num(cls ? classLevels[cls] : null);
      if (have != null && have < reqClass) return false;
      // class level required but the player's level for that class is unknown -> do not gate out
    }
    return true;
  });
  const detailBits = [unlocked.length + ' of ' + all.length + ' weapons unlocked'];
  if (career != null) detailBits.push('Career ' + career);
  if (assumedAvailable > 0) detailBits.push(assumedAvailable + ' assumed available (unlock data not published)');
  return {
    unlocked,
    step: { id: 'unlock-gate', label: 'Checking unlocks', status: 'done', detail: detailBits.join(' -- ') },
  };
}

// --- ammo cost (E1: accurate budget + TTK-per-dollar) -----------------------
// Ammo cost = the selected load's VENDOR BOX PRICE ("what you pay at the vendor for one box of that
// load"). This is the honest unit: box is what Bulkhead's vendor sells; box SIZE is unstated so a
// per-round figure only stacks unknowns -- per_round_derived is kept as a SEPARATE, labeled derived stat
// (hub mag-delta method) and is NOT used for cost. HP/AP box prices are EXACT per-caliber (not a uniform
// multiplier); honest-null where a load is not published (-> gun-only cost, flagged). Single-type
// ordnance -> 'Standard'. Damage effects of ammo type live in wardogs_ballistics, not here (cost only).
// All PURE (ammo data passed in).
const AMMO_DOWNGRADE_PREF = ['FMJ', 'HP', 'AP']; // toward the cheapest / most likely ungated

export function indexAmmo(ammoRows) {
  const idx = {};
  for (const r of asArray(ammoRows)) {
    if (!r || !r.caliber || !r.ammo_type) continue;
    (idx[r.caliber] = idx[r.caliber] || {})[r.ammo_type] = r;
  }
  return idx;
}

// Pick the ammo row to actually run: the desired class, DOWNGRADED past a career gate the player can't
// meet (prefer FMJ -- cheapest/most likely ungated). Single-type ordnance -> 'Standard'. Returns
// { row, ammoType, downgraded, gateLevel } or null when nothing usable.
export function selectAmmo(caliber, desiredAmmo, ammoIndex, careerLevel) {
  const byClass = (ammoIndex || {})[caliber];
  if (!byClass) return null;
  const gateOk = (row) => { const g = num(row && row.career_gate); return g == null || careerLevel == null || careerLevel >= g; };
  if (byClass.Standard && !byClass.FMJ && !byClass.HP && !byClass.AP) {
    return { row: byClass.Standard, ammoType: 'Standard', downgraded: false, gateLevel: null };
  }
  const desired = byClass[desiredAmmo];
  if (desired && gateOk(desired)) return { row: desired, ammoType: desiredAmmo, downgraded: false, gateLevel: null };
  const gateLevel = desired ? num(desired.career_gate) : null; // why we downgrade
  for (const t of AMMO_DOWNGRADE_PREF) {
    const r = byClass[t];
    if (r && gateOk(r)) return { row: r, ammoType: t, downgraded: !!desired && t !== desiredAmmo, gateLevel };
  }
  return null;
}

// Ammo cost for a weapon running desiredAmmo (or its gated downgrade) = that load's BOX PRICE.
// Honest-null cost when the caliber/class is unknown or the load's box price is unpublished.
export function ammoCostFor(weapon, desiredAmmo, ammoIndex, careerLevel) {
  const miss = { ammoType: desiredAmmo, ammoCost: null, perRoundDerived: null, downgraded: false, gateLevel: null, priceKnown: false };
  if (!weapon || !weapon.ammo_type) return miss;
  const sel = selectAmmo(weapon.ammo_type, desiredAmmo, ammoIndex, careerLevel);
  if (!sel) return miss;
  const box = num(sel.row.box_price);
  return {
    ammoType: sel.ammoType,
    ammoCost: box,                                  // the vendor box price (null = unrecorded -> gun-only)
    perRoundDerived: num(sel.row.per_round_derived), // separate derived stat, NOT used for cost
    downgraded: sel.downgraded,
    gateLevel: sel.gateLevel,
    priceKnown: box != null,
  };
}

// --- step 2: effectiveness-rank --------------------------------------------

// Rank weapons by playstyle-weighted TTK (ascending TTK -> descending score). Weapons with no TTK
// data for the profile's ammo are returned UNRANKED (score null) and sorted last, flagged, never
// dropped silently. score = round(100000 / weightedTtkMs) so lower TTK -> higher score (a stable,
// human-facing effectiveness number). Deterministic tie-break by weapon_name.

// --- step 2: effectiveness-rank --------------------------------------------

export function rankByEffectiveness(weapons, ttkRows, { playstyle = DEFAULT_PLAYSTYLE, overrides, ammoIndex = null, careerLevel = null } = {}) {
  const profile = resolveProfile(playstyle, overrides);
  const ttkIndex = indexTtk(ttkRows);
  const useAmmo = ammoIndex && Object.keys(ammoIndex).length > 0;
  const scored = asArray(weapons).map((w) => {
    const wt = weightedTtk(ttkIndex, w.name, profile, num(w.fire_rate)); // fire rate powers the one-shot floor
    const score = wt ? Math.round(100000 / wt.weightedTtkMs) : null;
    const gunCost = num(w.credit_cost);
    const am = useAmmo ? ammoCostFor(w, profile.ammo, ammoIndex, careerLevel)
      : { ammoType: profile.ammo, ammoCost: null, perRoundDerived: null, downgraded: false, gateLevel: null, priceKnown: false };
    const totalCost = gunCost == null ? null : gunCost + (num(am.ammoCost) || 0); // + the load's box price -> HP/AP cost more
    return {
      weapon_name: w.name,
      slot: slotOf(w),
      ammo: profile.ammo,                 // the profile's ammo (TTK basis)
      ammo_priced: am.ammoType,           // the load actually costed/available (may be a gated downgrade)
      ammo_downgraded: am.downgraded,
      ammo_gate_level: am.gateLevel,
      ammo_price_known: am.priceKnown,    // false -> box price unrecorded, cost is gun-only
      ammo_per_round_derived: am.perRoundDerived, // separate derived stat (hub mag-delta), NOT the cost
      weighted_ttk_ms: wt ? Math.round(wt.weightedTtkMs * 10) / 10 : null,
      score,
      gun_cost: gunCost,
      ammo_cost: am.ammoCost,             // the vendor box price (null = unrecorded)
      cost: totalCost,                    // gun + ammo box price -> budgetSolve sums this
      value_per_cost: (score != null && totalCost) ? Math.round((score / totalCost) * 1000) / 1000 : null, // TTK-per-dollar proxy
      rankable: !!wt,
    };
  });
  scored.sort((a, b) => {
    if (a.rankable !== b.rankable) return a.rankable ? -1 : 1;      // ranked before unranked
    if (a.rankable && b.rankable && a.score !== b.score) return b.score - a.score; // higher score first
    return String(a.weapon_name).localeCompare(String(b.weapon_name));            // stable
  });
  const rankedCount = scored.filter((s) => s.rankable).length;
  const unrankable = scored.length - rankedCount;
  const detail = 'Ranked ' + rankedCount + ' weapons by ' + profile.label + '-weighted TTK (ammo ' + profile.ammo + ')'
    + (useAmmo ? ' -- cost incl. ammo box price' : '')
    + (unrankable ? ' -- ' + unrankable + ' had no TTK data (listed last)' : '');
  return {
    ranked: scored,
    profile,
    step: { id: 'effectiveness-rank', label: 'Ranking by TTK', status: 'done', detail },
  };
}

// --- step 3: budget-solve ---------------------------------------------------

// Choose the best affordable combo across slots. candidatesBySlot = { primary: [ranked], secondary:
// [ranked] } (each candidate carries .score and .cost). budget = cash number or null.
// HONEST-NULL DEGRADATION: if budget is null, OR no candidate in a required slot has a known cost,
// budget filtering CANNOT run -> pick the top-scored candidate per slot, applied=false, and the step
// says budget is unavailable. When costs + a budget are present it runs a bounded exact search over
// affordable primary x secondary combos maximizing total score.
export function budgetSolve(candidatesBySlot, budget, { slots } = {}) {
  const bySlot = candidatesBySlot || {};
  const wanted = asArray(slots).length ? slots : Object.keys(bySlot);
  const topOf = (slot) => (asArray(bySlot[slot]).find((c) => c.rankable) || asArray(bySlot[slot])[0] || null);

  const anyCost = wanted.some((s) => asArray(bySlot[s]).some((c) => num(c.cost) != null));
  if (num(budget) == null || !anyCost) {
    const picks = {};
    for (const s of wanted) picks[s] = topOf(s);
    return {
      applied: false,
      picks,
      totalCost: null,
      step: { id: 'budget-solve', label: 'Solving within budget', status: 'skipped',
              detail: num(budget) == null
                ? 'No budget given -- ranking by effectiveness only.'
                : 'Budget filtering unavailable -- no prices published yet (honest-null). Ranking by TTK only.' },
    };
  }

  // Exact bounded search: only priced candidates are eligible for the budget solve.
  const priced = {};
  for (const s of wanted) priced[s] = asArray(bySlot[s]).filter((c) => num(c.cost) != null);

  let best = null;
  const slotList = wanted.filter((s) => priced[s] && priced[s].length);
  // recursive combo walk (slot count is tiny: primary + secondary)
  (function walk(i, chosen, cost, score) {
    if (cost > budget) return;
    if (i === slotList.length) {
      if (chosen.length && (best === null || score > best.score)) {
        best = { picks: Object.fromEntries(chosen), totalCost: cost, score };
      }
      return;
    }
    const s = slotList[i];
    for (const c of priced[s]) {
      if (cost + c.cost > budget) continue;
      walk(i + 1, chosen.concat([[s, c]]), cost + c.cost, score + (num(c.score) || 0));
    }
    // also allow skipping a slot that has no affordable option, so a solve still returns
    walk(i + 1, chosen, cost, score);
  })(0, [], 0, 0);

  if (!best || !Object.keys(best.picks).length) {
    // nothing affordable -> degrade honestly to top picks, flag unaffordable
    const picks = {};
    for (const s of wanted) picks[s] = topOf(s);
    return {
      applied: false,
      picks,
      totalCost: null,
      step: { id: 'budget-solve', label: 'Solving within budget', status: 'done',
              detail: 'No affordable combo within ' + budget + ' -- showing best options (over budget).' },
    };
  }
  return {
    applied: true,
    picks: best.picks,
    totalCost: best.totalCost,
    step: { id: 'budget-solve', label: 'Solving within budget', status: 'done',
            detail: 'Best affordable loadout within ' + budget + ' (spent ' + best.totalCost + ').' },
  };
}

// --- provenance -------------------------------------------------------------

// Output tier = floor of the tiers of the inputs actually used. Effectiveness always comes from the
// ballistics/ttk rows (attributed by default), so the recommendation is at best attributed.
export function inheritProvenance({ ttkRows = [], weapons = [], budgetApplied = false } = {}) {
  const tiers = [];
  const sources = new Set();
  for (const r of asArray(ttkRows)) {
    tiers.push(r && r.confidence_tier ? r.confidence_tier : 'attributed');
    if (r && r.verified_source) sources.add(r.verified_source);
  }
  if (tiers.length === 0) tiers.push('attributed'); // effectiveness basis assumed attributed if unspecified
  if (budgetApplied) {
    // Prices are COMMUNITY-ATTRIBUTED (no Bulkhead per-weapon price list exists) -- the output stays at
    // the attributed floor, never laundered as official. FUTURE: when Bulkhead publishes official prices,
    // re-tier per value via a credit_cost_tier column and read it here instead of assuming attributed.
    for (const w of asArray(weapons)) {
      if (num(w.credit_cost) != null) tiers.push('attributed');
    }
  }
  return {
    tier: floorTier(tiers),
    basis: 'community-tested ballistics (Swoleguy), attributed'
      + (budgetApplied ? ' + community-attributed prices' : ''),
    sources: Array.from(sources),
  };
}

// --- the public entry point -------------------------------------------------

// Solve a loadout from plain data. Pure + deterministic + never throws.
//   input: { weapons, ttk, player, budget, playstyle, overrides, slots }
//   output: { steps, candidates, recommendation, provenance, budget }
// Empty weapons -> empty candidates + honest steps (never throws).
export function solveLoadout({
  weapons = [],
  ttk = [],
  ammo = [],
  player = null,
  budget = null,
  playstyle = DEFAULT_PLAYSTYLE,
  overrides = null,
  slots = ['primary', 'secondary'],
} = {}) {
  const steps = [];

  // 1. unlock-gate
  const gate = unlockGate(weapons, player);
  steps.push(gate.step);

  // 2. effectiveness-rank (over the unlocked set) -- ammo cost folds into candidate.cost when ammo loaded
  const rank = rankByEffectiveness(gate.unlocked, ttk, {
    playstyle, overrides, ammoIndex: indexAmmo(ammo), careerLevel: player ? player.careerLevel : null,
  });
  steps.push(rank.step);

  // group ranked candidates by slot (order preserved -> already best-first)
  const candidates = {};
  for (const s of slots) candidates[s] = [];
  for (const c of rank.ranked) {
    if (!candidates[c.slot]) candidates[c.slot] = [];
    candidates[c.slot].push(c);
  }

  // 3. budget-solve (honest-null degrading)
  const solved = budgetSolve(candidates, budget, { slots });
  steps.push(solved.step);

  // provenance inheritance (floor of used input tiers)
  const provenance = inheritProvenance({ ttkRows: ttk, weapons, budgetApplied: solved.applied });

  return {
    steps,
    candidates,
    recommendation: solved.picks,
    provenance,
    budget: { applied: solved.applied, total: solved.totalCost, limit: num(budget) },
    playstyle: rank.profile.key,
  };
}
