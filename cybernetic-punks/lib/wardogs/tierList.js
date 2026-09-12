// lib/wardogs/tierList.js
// PURE tiering for the Wardogs weapon tier list. Tiers are assigned by MEASURED time-to-kill only
// (the balanced-profile weighted TTK the loadout hubs already compute -- FMJ, averaged across armor),
// so the ranking is honest + defensible from our attributed data, never a subjective "meta" opinion.
//
// The wedge is CONTEXT, not re-ranking: TTK rewards sustained body-shot kill speed, so one-shot
// specialists (bolt snipers) and close-range specialists (shotguns) can land low even though they are
// strong at their job. We DON'T move them; we attach an honest note explaining what the metric misses.
// Weapons with no ballistics (the launchers) are UNRANKED (honest-null), not forced onto the ladder.

// Thresholds in ms of representative (balanced) weighted TTK. Round, principled cutoffs (reported on the
// page). Ascending TTK -> better tier. Anything above the C ceiling is D.
export const TIER_THRESHOLDS = [
  { tier: 'S', maxMs: 250 },
  { tier: 'A', maxMs: 400 },
  { tier: 'B', maxMs: 550 },
  { tier: 'C', maxMs: 1100 },
  { tier: 'D', maxMs: Infinity },
];
export const TIER_ORDER = ['S', 'A', 'B', 'C', 'D'];

export const TIER_META = {
  S: { label: 'S', name: 'Fastest kills', color: '#ff3b30' },
  A: { label: 'A', name: 'Strong', color: '#ff9e1b' },
  B: { label: 'B', name: 'Solid', color: '#e3c24b' },
  C: { label: 'C', name: 'Situational', color: '#7f9bb0' },
  D: { label: 'D', name: 'Specialist / slow', color: '#5f7488' },
};

// Type-level context notes (the honest wedge for counterintuitive tiers).
const TYPE_NOTE = {
  'Shotgun': 'Close-range specialist -- near-instant point-blank, but it falls off fast past a few meters, so its raw TTK flatters it.',
  'Sniper Rifle': 'One-shot specialist -- TTK rewards sustained kill speed, so bolt snipers rank low here. Their value is the single headshot the metric can’t capture, not a low ranking.',
  'Bow': 'Silent and situational -- a stealth pick, not a time-to-kill weapon.',
  'Marksman Rifle': null,
};
// Per-weapon overrides (more specific than the type note).
const WEAPON_NOTE = {
  'AMR 50': 'A heavy .50-cal anti-materiel rifle: fastest on the trigger of the snipers, but slow to handle and situational -- not the conventional sniper most players run.',
  'Scout Rifle TD': 'Very low cadence -- an outlier on raw TTK. A precision, pick-your-shot marksman weapon, not a fast-kill gun.',
};

// Note for a weapon (per-weapon override wins, else type note, else null).
export function noteFor(name, weaponType) {
  if (WEAPON_NOTE[name]) return WEAPON_NOTE[name];
  return TYPE_NOTE[weaponType] || null;
}

function tierForMs(ms) {
  for (const t of TIER_THRESHOLDS) if (ms <= t.maxMs) return t.tier;
  return 'D';
}

// rows: [{ weapon_name, weighted_ttk_ms, rankable, weapon_type, image_filename }]
// -> { tiers: [{tier, meta, weapons:[...]}, ...], unranked: [...] }
// Each weapon carries { name, ttk, type, image, note }. Within a tier, sorted by TTK ascending.
export function tierWeapons(rows) {
  const ranked = [], unranked = [];
  for (const r of (rows || [])) {
    const base = {
      name: r.weapon_name,
      ttk: r.weighted_ttk_ms,
      type: r.weapon_type || null,
      image: r.image_filename || null,
      note: noteFor(r.weapon_name, r.weapon_type),
    };
    if (r.rankable && r.weighted_ttk_ms != null) ranked.push(base);
    else unranked.push(base);
  }
  const byTier = {};
  for (const t of TIER_ORDER) byTier[t] = [];
  for (const w of ranked) byTier[tierForMs(w.ttk)].push(w);
  for (const t of TIER_ORDER) byTier[t].sort((a, b) => a.ttk - b.ttk);
  const tiers = TIER_ORDER.map((t) => ({ tier: t, meta: TIER_META[t], weapons: byTier[t] }));
  unranked.sort((a, b) => String(a.name).localeCompare(String(b.name)));
  return { tiers, unranked };
}
