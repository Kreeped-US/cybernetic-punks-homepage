// lib/dmz/savedBuilds.js
// Pure helpers for the thin saved-build feature (the premium substrate). Factored out so the cap +
// the build_ref validation -- the security-relevant bits -- are unit-testable without the route's
// I/O (resolveSession, supabase). The route wires these; app/dmz/builds/saved + SaveBuildButton use
// GAME_SLUG. THIN by design: a bookmark of a canonical build by weapon_slug -- NO game_profile, NO
// payload, NO premium logic. saved_source_version (the build's source_updated_at at save time) is
// the only forward hook: premium can later re-resolve build_ref and compare to detect change.

export const SAVED_BUILD_CAP = 100;   // generous / anti-abuse; never a real-user wall (a user saves a handful)
export const SAVED_GAME_SLUG = 'dmz'; // DMZ is the only writer today; the table is game-agnostic (game_slug column)

// A build_ref is a weapon_slug: lowercase alnum + hyphen, 1-64 chars (the dmz_weapons slug shape).
// Rejecting anything else keeps junk out of the table and matches what the build route resolves.
export function validBuildRef(ref) {
  return typeof ref === 'string' && /^[a-z0-9][a-z0-9-]{0,63}$/.test(ref);
}

// Server-side cap gate: reject a NEW save once the account already holds the cap. (A re-save of an
// already-saved ref is idempotent via the UNIQUE constraint and does NOT count as new -- the route
// checks existence first / relies on the unique, so the cap only blocks genuinely new rows.)
export function overCap(count) {
  return typeof count === 'number' && count >= SAVED_BUILD_CAP;
}
