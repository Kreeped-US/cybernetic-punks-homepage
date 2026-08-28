// lib/weapons/tierModel.js
// ============================================================
// MARATHON WEAPON TIER MODEL -- transparent, stat-derived. Replaces the AI-freehand
// weapon tier letter (the old cron item.tier || 'B'). Weapons are now formula-derived,
// consistent with shells (deriveShellTier). Pure: weapon_stats rows in, computed tiers out.
// No DB, no side effects, no deps -- safe to import in the cron, a script, or a page.
//
// VALIDATED against the operator's expert read over 3 tuning rounds (scripts/weapon-tier-
// dryrun.mjs was the harness). Every constant below is one the validation locked in.
//
// FOUR AXES, derived from RAW fields (NOT the hand-entered composites, which stay cross-check
// only -- EXCEPT firepower_score for shotguns, see the firepower note):
//   FIREPOWER  <- per-band: CLOSE = kill-capped burst lethality; MID/LONG/SPECIAL = sustained DPS
//   ACCURACY   <- hipfire_spread(inv), moving_inaccuracy(inv), crouch_spread_bonus
//   HANDLING   <- recoil(inv), ads_speed(inv), weight(inv), equip_speed(inv), reload_speed(inv), aim_assist
//   RANGE      <- range_meters, range_rating(ordinal), zoom
// Normalization is WITHIN BAND (a shotgun's stats score against its band, not snipers).
// Honest-null: a missing sub-field drops from its axis (sub-weights renormalize); an axis with
// <50% sub-weight present is N/A and its axis-weight redistributes. Accuracy sub-fields on
// NON-pellet weapons impute band-median (flagged). A weapon with no firepower data is UNRANKABLE.

export const AXIS_WEIGHTS = { accuracy: 0.34, firepower: 0.32, handling: 0.18, range: 0.16 };

// FIREPOWER METHODOLOGY (disclosed to readers in the presentation layer, not hidden):
//   "In the Close band, Firepower measures burst / per-trigger lethality; in Mid/Long/Special,
//    sustained DPS -- because what wins fights differs by range."
// CLOSE: shotguns use firepower_score as effective per-trigger damage (raw damage is per-pellet,
//   11-15, which craters a DPS analog); others use body damage. Kill-capped (no over-kill credit).
// MID/LONG/SPECIAL: sustained DPS = damage x fire_rate/60 x precision.
export const PELLET_TYPES = new Set(['Shotgun']);
export const BURST_WINDOW = 1.0;   // seconds -- the "first engagement window"
export const EFFECTIVE_HP = 185;   // target HP for the kill-cap only

// sub-field: [weight, direction]  direction +1 = higher better, -1 = lower better
export const SUBFIELDS = {
  firepower: {
    fp_raw:               [0.85, +1], // computed per band (burst lethality or sustained DPS)
    magazine_size:        [0.15, +1], // minor contributor
  },
  accuracy: {
    hipfire_spread:       [0.40, -1],
    moving_inaccuracy:    [0.40, -1],
    crouch_spread_bonus:  [0.20, +1],
  },
  handling: {
    recoil:               [0.30, -1],
    ads_speed:            [0.25, -1],
    weight:               [0.15, -1],
    equip_speed:          [0.10, -1],
    reload_speed:         [0.10, -1],
    aim_assist:           [0.10, +1],
  },
  range: {
    range_meters:         [0.60, +1],
    range_rating_ord:     [0.25, +1],
    zoom:                 [0.15, +1],
  },
};

// weapon_type -> band. Railguns share Special with LMGs so they don't crowd snipers out of Long.
export const BAND_OF_TYPE = {
  'Shotgun': 'Close', 'SMG': 'Close',
  'AR': 'Mid', 'Precision Rifle': 'Mid', 'Hybrid': 'Mid', 'Pistol': 'Mid',
  'Sniper Rifle': 'Long',
  'Railgun': 'Special', 'LMG': 'Special',
  'Melee': 'EXCLUDE', // melee has no ranged axes
};
export const BAND_ORDER = ['Close', 'Mid', 'Long', 'Special'];
const RANGE_ORD = { CQB: 0, Mid: 1, Flex: 1, Long: 2 };
const ACCURACY_FIELDS = new Set(['hipfire_spread', 'moving_inaccuracy', 'crouch_spread_bonus']);

// within-band score -> tier. S>=62.5 (validation-final): the operator asked for the top-Close
// SMG Bully at S. Bully's precise total is 62.8 and Twin Tap's is 62.3, so 62.5 is the cutoff
// that flips Bully ONLY (nothing else falls in [62.5, 63)); a round 63 would leave Bully in A.
// Cutoffs are on the band-relative 0-100 score.
export const TIER_BANDS = [['S', 62.5], ['A', 52], ['B', 40], ['C', 26], ['D', -Infinity]];
export function scoreToTier(s) { for (const [t, lo] of TIER_BANDS) if (s >= lo) return t; return 'D'; }

function numOf(v) { if (v === null || v === undefined) return null; const n = typeof v === 'string' ? parseFloat(v) : v; return Number.isNaN(n) ? null : n; }
function median(xs) { const a = xs.filter(x => x != null).sort((p, q) => p - q); if (!a.length) return null; const m = Math.floor(a.length / 2); return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; }
function isPellet(w) { return PELLET_TYPES.has(w.weapon_type); }

function closeBurstFirepower(w) {
  const perShot = isPellet(w) ? numOf(w.firepower_score) : numOf(w.damage);
  const fr = numOf(w.fire_rate);
  if (perShot == null || fr == null) return null;
  let shots = 1 + (fr / 60) * BURST_WINDOW;
  const mag = numOf(w.magazine_size);
  if (mag != null && mag > 0) shots = Math.min(shots, mag);
  const shotsToKill = Math.max(1, Math.ceil(EFFECTIVE_HP / perShot));
  return perShot * Math.min(shots, shotsToKill); // no credit for over-kill
}
function sustainedDPS(w) {
  const dmg = numOf(w.damage), fr = numOf(w.fire_rate), pr = numOf(w.precision_multiplier);
  if (dmg == null || fr == null) return null;
  return dmg * (fr / 60) * (pr == null ? 1 : pr);
}

function rawField(w, f) {
  if (f === 'range_rating_ord') { const o = RANGE_ORD[w.range_rating]; return o === undefined ? null : o; }
  if (f === 'fp_raw') return BAND_OF_TYPE[w.weapon_type] === 'Close' ? closeBurstFirepower(w) : sustainedDPS(w);
  return numOf(w[f]);
}

// computeWeaponTiers(rows) -> [{ name, weapon_type, band, tier|null, total|null, unrankable,
//   axes:{firepower,accuracy,handling,range}, naAxes, compositeFirepower, imputed:[] }, ...]
// Excluded weapons (melee) are returned with band 'EXCLUDE', tier null, excluded:true.
export function computeWeaponTiers(rows) {
  const weapons = rows || [];
  const out = [];
  const bands = {};
  for (const w of weapons) {
    const b = BAND_OF_TYPE[w.weapon_type];
    if (!b || b === 'EXCLUDE') { out.push({ name: w.name, weapon_type: w.weapon_type, band: 'EXCLUDE', tier: null, total: null, unrankable: true, excluded: true, axes: {}, naAxes: [], compositeFirepower: false, imputed: [] }); continue; }
    (bands[b] ||= []).push(w);
  }

  for (const b of Object.keys(bands)) {
    const members = bands[b];
    const stats = {};
    for (const axis of Object.keys(SUBFIELDS)) for (const f of Object.keys(SUBFIELDS[axis])) {
      const vals = members.map(w => rawField(w, f)).filter(v => v != null);
      stats[f] = { min: Math.min(...vals), max: Math.max(...vals), med: median(vals), n: vals.length };
    }
    for (const w of members) {
      const axisScores = {}; const naAxes = []; const imputed = [];
      for (const axis of Object.keys(SUBFIELDS)) {
        let wsum = 0, acc = 0, presentW = 0;
        const totalW = Object.values(SUBFIELDS[axis]).reduce((a, [wt]) => a + wt, 0);
        for (const [f, [wt, dir]] of Object.entries(SUBFIELDS[axis])) {
          let v = rawField(w, f);
          if (v == null) {
            if (ACCURACY_FIELDS.has(f) && !isPellet(w) && stats[f].med != null) { v = stats[f].med; imputed.push(f); }
            else continue;
          }
          const s = stats[f];
          let norm;
          if (s.max === s.min) norm = 50;
          else norm = ((v - s.min) / (s.max - s.min)) * 100;
          if (dir < 0) norm = 100 - norm;
          acc += norm * wt; wsum += wt; presentW += wt;
        }
        if (presentW / totalW < 0.5) { axisScores[axis] = null; naAxes.push(axis); }
        else axisScores[axis] = acc / wsum;
      }
      let tot = 0, wtot = 0;
      for (const [axis, wt] of Object.entries(AXIS_WEIGHTS)) { if (axisScores[axis] == null) continue; tot += axisScores[axis] * wt; wtot += wt; }
      const total = wtot ? tot / wtot : null;
      const unrankable = total == null || axisScores.firepower == null;
      out.push({
        name: w.name, weapon_type: w.weapon_type, band: b,
        tier: unrankable ? null : scoreToTier(total),
        total: total == null ? null : Math.round(total * 10) / 10,
        unrankable, excluded: false,
        axes: {
          firepower: axisScores.firepower == null ? null : Math.round(axisScores.firepower),
          accuracy: axisScores.accuracy == null ? null : Math.round(axisScores.accuracy),
          handling: axisScores.handling == null ? null : Math.round(axisScores.handling),
          range: axisScores.range == null ? null : Math.round(axisScores.range),
        },
        naAxes, compositeFirepower: isPellet(w), imputed,
      });
    }
  }
  return out;
}
