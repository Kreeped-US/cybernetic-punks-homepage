// lib/wardogs/weaponTiers.js
// SINGLE SOURCE OF TRUTH for Wardogs weapon tiers. The tier list (/wardogs/tier-list) AND the
// arsenal (/wardogs/arsenal + /arsenal/[slug], which show a tier badge + rankings link) both compute
// a weapon's tier through THIS module, so the same gun can NEVER show a different tier on the two
// pages. It composes the exact path the tier list has always used:
//   rankByEffectiveness(weapons, ttk, { playstyle: 'balanced' })  ->  weighted TTK (FMJ, averaged
//   across armor), then tierWeapons() -> S/A/B/C/D by that weighted TTK.
//
// CONSISTENCY NOTE (do not "fix" here): the SELECT deliberately matches the tier list's historical
// load -- name, weapon_type, category, image_filename, verified_source -- and NOTABLY OMITS fire_rate.
// weightedTtk() uses fire_rate only for the one-shot floor (a 0ms one-shot cell -> 60000/fire_rate),
// so omitting it means one-shot weapons fall back to ONE_SHOT_FALLBACK_INTERVAL_MS (150ms) -- exactly
// what the live tier list does today. Feeding fire_rate here would re-tier one-shot specialists
// (AMR 50, bolt snipers) vs. the live flagship. Keeping the select identical guarantees arsenal ==
// tier list. (Whether the tier list SHOULD honor the fire_rate floor is a separate question, tracked
// as a follow-up -- it is out of scope for the cross-link work and would change the flagship's tiers.)

import { createClient } from '@supabase/supabase-js';
import { rankByEffectiveness } from './loadoutSolver';
import { tierWeapons } from './tierList';

const GAME = 'wardogs';

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

// PURE. Given the raw weapon_stats + wardogs_ttk rows, return the canonical tiering. Callers that
// already hold the data (the tier list loads it for its ladder) use this directly to avoid a second
// query. Returns { tiers, unranked, byWeapon } where byWeapon[name] = { tier, meta, ttk } for every
// RANKED weapon (unranked weapons -- the launchers -- are omitted from byWeapon; they are in unranked).
export function tierMapFrom(weapons, ttk) {
  const rank = rankByEffectiveness(weapons, ttk, { playstyle: 'balanced' });
  const byName = Object.fromEntries((weapons || []).map((w) => [w.name, w]));
  const rows = rank.ranked.map((c) => {
    const w = byName[c.weapon_name] || {};
    return {
      weapon_name: c.weapon_name,
      weighted_ttk_ms: c.weighted_ttk_ms,
      rankable: c.rankable,
      weapon_type: w.weapon_type || w.category,
      image_filename: w.image_filename,
    };
  });
  const { tiers, unranked } = tierWeapons(rows);
  const byWeapon = {};
  tiers.forEach((t) => t.weapons.forEach((w) => { byWeapon[w.name] = { tier: t.tier, meta: t.meta, ttk: w.ttk }; }));
  return { tiers, unranked, byWeapon };
}

// Self-contained: loads the SAME data the tier list uses and returns the tiering + the raw rows (so a
// caller can reuse `weapons` for e.g. its provenance line). Use this from pages that do not already
// hold the roster/ttk (the arsenal). force-dynamic pages only (reads via the service key).
export async function computeWeaponTiers() {
  const sb = getSupabase();
  const [wRes, tRes] = await Promise.all([
    sb.from('weapon_stats').select('name, weapon_type, category, image_filename, verified_source').eq('game_slug', GAME),
    sb.from('wardogs_ttk').select('weapon_name, ammo_type, armor_tier, ttk_ms').eq('game_slug', GAME),
  ]);
  const weapons = (wRes && wRes.data) || [];
  const ttk = (tRes && tRes.data) || [];
  const map = tierMapFrom(weapons, ttk);
  return { weapons, ttk, ...map };
}
