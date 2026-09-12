// lib/wardogs/progression.js
// Pure helpers for the Wardogs PROGRESSION PLANNER (the Economy tool). No I/O -- takes
// weapon_stats rows, returns per-track roadmaps + totals + honest-null flags. Unit-tested.
//
// HONESTY (the moat -- never conflate):
//   unlockFee (unlock_fee)   = the ONE-TIME cash to permanently unlock the weapon ("save for").
//   perLife  (credit_cost)   = the PER-LIFE vendor re-buy price ("to field"). DISTINCT field.
// Free starters = unlockFee 0 (unlocked by default). Missing data -> null (surface as TBD,
// never 0/guessed). All unlock/price data is community-attributed (verified=false); Deagle's
// career-gate is Bulkhead-official.

export const TRACK_ORDER = ['Assault', 'Medic', 'Recon', 'Support', 'Wardog'];

export function normalizeWeapon(w) {
  return {
    name: w.name,
    track: w.unlock_class || null,
    level: w.unlock_class_level != null ? Number(w.unlock_class_level) : null,
    careerLevel: w.unlock_career_level != null ? Number(w.unlock_career_level) : null,
    unlockFee: w.unlock_fee != null ? Number(w.unlock_fee) : null,
    perLife: w.credit_cost != null ? Number(w.credit_cost) : null,
    category: w.category || w.weapon_type || null,
    image_filename: w.image_filename || null,
  };
}

// Free-by-default = a zero unlock fee AND no level/career gate (nothing to grind or pay).
export function isFreeStarter(w) {
  return w.unlockFee === 0 && w.level == null && w.careerLevel == null;
}

// Sort within a track: default-unlocked (free starters) first, then by the level gate (career
// gate treated as a level), numbered gates ascending, unknown-gate (null) last, ties broken by
// unlock fee asc. Free starters sort ahead of everything (gate -1) since they need no grind.
function sortByGate(a, b) {
  const gate = (w) => (isFreeStarter(w) ? -1 : (w.level != null ? w.level : (w.careerLevel != null ? w.careerLevel : Infinity)));
  const ga = gate(a), gb = gate(b);
  if (ga !== gb) return ga - gb;
  const fa = a.unlockFee == null ? Infinity : a.unlockFee;
  const fb = b.unlockFee == null ? Infinity : b.unlockFee;
  if (fa !== fb) return fa - fb;
  return String(a.name).localeCompare(String(b.name));
}

const sum = (arr) => arr.reduce((a, b) => a + (b || 0), 0);

// Build the full roadmap grouped by track, each track sorted by unlock order, with per-track
// unlock totals + the grand total across ALL WEAPONS (precise -- NOT "everything"; gear/vehicles
// are not weapons and are not loaded).
export function buildRoadmap(weapons) {
  const rows = (weapons || []).map(normalizeWeapon);
  const byTrack = {};
  for (const w of rows) {
    const t = w.track || 'Other';
    (byTrack[t] = byTrack[t] || []).push(w);
  }
  const ordered = [
    ...TRACK_ORDER.filter((t) => byTrack[t]),
    ...Object.keys(byTrack).filter((t) => !TRACK_ORDER.includes(t)).sort(),
  ];
  const tracks = ordered.map((t) => {
    const ws = byTrack[t].slice().sort(sortByGate);
    return {
      track: t,
      weapons: ws,
      count: ws.length,
      unlockTotal: sum(ws.map((w) => w.unlockFee || 0)),
      pricedFees: ws.filter((w) => w.unlockFee != null).length,
    };
  });
  return {
    tracks,
    weaponCount: rows.length,
    grandTotal: sum(rows.map((w) => w.unlockFee || 0)),
    freeStarters: rows.filter((w) => isFreeStarter(w)).length,
    missingLevel: rows.filter((w) => w.level == null && w.careerLevel == null && !(w.unlockFee === 0)).length,
  };
}

// "Plan by your state": given a class/career level and cash saved, classify each weapon as
// unlockable-now (gate met AND fee affordable), gated (level too low), or unaffordable (level ok,
// not enough cash). level/budget null -> that dimension is not constrained.
export function planByState(weapons, { level = null, budget = null } = {}) {
  const rows = (weapons || []).map(normalizeWeapon);
  const lvl = Number.isFinite(level) ? level : null;
  const bud = Number.isFinite(budget) ? budget : null;

  const gateMet = (w) => {
    const gate = w.careerLevel != null ? w.careerLevel : w.level;
    if (gate == null) return true;              // no known gate -> not blocking
    if (lvl == null) return false;              // gate exists but no level given -> unknown
    return lvl >= gate;
  };
  const affordable = (w) => {
    if (w.unlockFee == null) return null;       // unknown fee
    if (bud == null) return true;               // no budget constraint
    return bud >= w.unlockFee;
  };

  const unlockableNow = [];
  const needLevel = [];
  const needCash = [];
  for (const w of rows) {
    if (isFreeStarter(w)) { unlockableNow.push(w); continue; }
    const g = gateMet(w);
    const aff = affordable(w);
    if (g && aff !== false) unlockableNow.push(w);
    else if (!g) needLevel.push(w);
    else needCash.push(w);
  }
  return { unlockableNow, needLevel, needCash };
}
