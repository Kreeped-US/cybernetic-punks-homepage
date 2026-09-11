// lib/wardogs/assembleLoadout.js
// SHARED "inputs + stores -> structured build" assembly, so the LIVE stream route and the SAVE route
// produce a BYTE-IDENTICAL structured loadout (same solver output + same per-pick detail). This is the
// server-authoritative structured build -- a saved public page must NOT display client-forgeable
// rankings/TTK, so both surfaces derive the numbers here from the stores, never from client input.
// (The only client-provided part of a saved page is the LLM analysis prose, which React escapes.)
//
// Returns the SSE `meta`-shaped object: { steps, recommendation, candidates, detail, provenance,
// budget, playstyle }. The caller (stream route) also passes this object straight into
// generateLoadout as its `solved` arg (shapes match).

import { solveLoadout, PLAYSTYLES, DEFAULT_PLAYSTYLE } from './loadoutSolver.js';

const ARMOR_TIERS = [0, 1, 2, 3, 4];
const AMMOS = ['FMJ', 'HP', 'AP'];

// Per-pick DETAIL from the already-loaded stores -- the armor-tier TTK curve at the pick's ammo, the
// FMJ/HP/AP comparison, and weapon meta. (Extracted verbatim from the loadouts route.)
export function pickDetail(pk, weapons, ttk, ballistics = []) {
  if (!pk || !pk.weapon_name) return null;
  const w = weapons.find((x) => x.name === pk.weapon_name) || {};
  const ttkAt = (ammo, tier) => {
    const r = ttk.find((x) => x.weapon_name === pk.weapon_name && x.ammo_type === ammo && x.armor_tier === tier);
    return r && r.ttk_ms != null ? r.ttk_ms : null;
  };
  return {
    weapon_name: pk.weapon_name,
    image_filename: w.image_filename || null,
    fire_rate: w.fire_rate != null ? w.fire_rate : null,
    caliber: w.ammo_type || null,
    weapon_class: w.category || w.weapon_type || null,
    armor_curve: ARMOR_TIERS.map((t) => ({ tier: t, ttk_ms: ttkAt(pk.ammo, t) })),
    ammo_compare: AMMOS.map((a) => ({ ammo: a, ttk_ms: ttkAt(a, 0) })),
    // The recommended weapon's body-part matrix (BodyPartViz fuel), sliced from the passed-in
    // ballistics. Empty when ballistics weren't loaded (e.g. the type hubs) -> no kill-map rendered.
    ballistics: (ballistics || []).filter((r) => r && r.weapon_name === pk.weapon_name),
  };
}

// Assemble the full structured build from the loaded stores + the runner inputs. Pure over its inputs
// (no DB, no LLM) -- the caller loads {weapons, ttk} (loadLoadoutContext) and passes them in.
export function assembleLoadout({ weapons = [], ttk = [], ballistics = [], ammo = [] }, { careerLevel = null, budget = null, playstyle } = {}) {
  const playstyleKey = PLAYSTYLES[playstyle] ? playstyle : DEFAULT_PLAYSTYLE;
  const player = careerLevel != null ? { careerLevel } : null;
  const solved = solveLoadout({ weapons, ttk, ammo, player, budget, playstyle: playstyleKey });
  const detail = {
    primary: pickDetail(solved.recommendation && solved.recommendation.primary, weapons, ttk, ballistics),
    secondary: pickDetail(solved.recommendation && solved.recommendation.secondary, weapons, ttk, ballistics),
  };
  return {
    steps: solved.steps,
    recommendation: solved.recommendation,
    candidates: solved.candidates,
    detail,
    provenance: solved.provenance,
    budget: solved.budget,
    playstyle: playstyleKey,
  };
}
