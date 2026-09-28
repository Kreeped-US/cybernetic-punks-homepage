// lib/content/modCompat.js
// PURE, game-agnostic mod<->weapon compatibility check for build/loadout context. A mod fits a weapon
// ONLY when the mod's VERIFIED compatibility lists it: compatible_weapons contains the weapon's name,
// OR compatible_categories contains the weapon's category. Sharing an equipment SLOT is NOT
// compatibility -- that conflation is the failure this guards (8 mods paired by slot, 7 did not fit).
// When a mod carries no compatibility data, fit is UNKNOWN -> false (never assume a match).

function norm(v) { return String(v == null ? '' : v).toLowerCase().trim(); }

// A column may be a Postgres array (already an array here) or a comma/semicolon-separated string.
function asList(v) {
  if (Array.isArray(v)) return v.map(norm).filter(Boolean);
  if (typeof v === 'string') return v.split(/[,;]/).map(norm).filter(Boolean);
  return [];
}

// Does this mod have ANY verified compatibility to reason from? (compatible_weapons or
// compatible_categories populated). When false, the context must say compatibility is unverified and
// the model must not name the mod as fitting a specific weapon.
export function modHasCompatibilityData(mod) {
  return !!(mod && (asList(mod.compatible_weapons).length || asList(mod.compatible_categories).length));
}

// modFitsWeapon(mod, weapon): true ONLY on a verified compatibility match (by weapon name or category).
// weapon.category falls back to weapon.weapon_type (the two weapon-classifying columns in use).
export function modFitsWeapon(mod, weapon) {
  if (!mod || !weapon) return false;
  const wName = norm(weapon.name);
  const wCat = norm(weapon.category != null ? weapon.category : weapon.weapon_type);
  const byName = !!wName && asList(mod.compatible_weapons).includes(wName);
  const byCat = !!wCat && asList(mod.compatible_categories).includes(wCat);
  return byName || byCat;
}
