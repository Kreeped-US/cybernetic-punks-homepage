// lib/keywordEntry.js
// ============================================================
// KEYWORD_TARGETS ENTRY VALIDATION -- server-side, authoritative.
// ============================================================
// Commit (d) of the keyword-framing build. See docs/KEYWORD_SYSTEM_CONSOLIDATED.md
// Part 4 for the design and Part 8 (d) for the build spec.
//
// WHY THIS EXISTS. The admin editor has no dynamic dropdowns and its renderer has no
// mechanism for one, so `entity_slug` is typed as free text. A typo'd slug would be
// perfectly storable, pass every DB constraint, and then NEVER match at runtime -- a
// keyword that silently does nothing, forever. Validation-on-save makes that state
// unrepresentable: a wrong entity is un-SAVEABLE rather than un-PICKABLE. The
// correctness guarantee is identical to a live dropdown; only UX slickness differs.
//
// *** ONE DERIVATION, NOT TWO. ***
// resolveEntitySlug derives the slug with the SAME exported `entitySlugFor` that
// deriveTuple uses on the article side. It does NOT reimplement weaponSlug or any
// per-type slugger. If two code paths derived the slug they could drift, and the
// failure would be invisible: keywords validating at entry and never matching at
// runtime. There is exactly one derivation.
//
// *** game_maps.slug IS DELIBERATELY UNUSED -- do not "optimize" this. ***
// game_maps is the only entity table carrying a slug column, and it agrees with the
// derived slug on every row today (5/5, measured 2026-07-22). Reading it anyway would
// reintroduce the two-sources-of-truth risk this resolver exists to avoid: the column
// could later diverge from the derivation, and then entry would validate against one
// string while the matcher looked for another. weapon_stats / game_modes / game_events
// have no slug column at all, so a column lookup could never be uniform anyway.
// DERIVE, ALWAYS. The temptation is named here because this is where it appears.

import { loadVocabulary, entitySlugFor, ENTITY_TYPES, FACETS } from './coverage.js';

export const INTENTS = ['informational', 'comparison', 'transactional', 'navigational'];

// Resolve a typed entity_slug against the REAL entities for that type + game.
//
// Returns { ok: true, slug } | { ok: false, reason } -- never throws.
//
// THREE OUTCOMES, KEPT DISTINCT (the discipline verificationState earned):
//   resolves          -> ok
//   does not resolve  -> not ok, with a NAMED reason
//   vocabulary failed -> not ok, with a DIFFERENT reason
// A vocabulary failure must NOT read as "valid". Failing open here would admit
// exactly the rows this function exists to reject. (This is the opposite of the
// framing pipeline's fail-open, which protects publication -- here nothing is at
// risk but an admin save the operator can retry.)
export async function resolveEntitySlug(supabase, gameSlug, entityType, slug) {
  if (!ENTITY_TYPES.includes(entityType)) {
    return { ok: false, reason: `entity_type '${entityType}' is not one of: ${ENTITY_TYPES.join(', ')}` };
  }

  var vocab;
  try {
    vocab = await loadVocabulary(supabase, gameSlug);
  } catch (err) {
    return { ok: false, reason: `could not verify entity_slug: vocabulary unavailable for game '${gameSlug}' (${err.message})` };
  }
  if (!vocab || !Array.isArray(vocab[entityType])) {
    return { ok: false, reason: `could not verify entity_slug: no '${entityType}' vocabulary for game '${gameSlug}'` };
  }

  var names = vocab[entityType];
  // DERIVE the valid slug set with the shared function -- never read a slug column.
  var valid = new Set(names.map(function (n) { return entitySlugFor(entityType, n); }));

  if (valid.has(slug)) return { ok: true, slug: slug };

  // NOTE: an empty vocabulary is a legitimate reject, not a special case. Non-Marathon
  // games currently get empty shell/mod_slot vocabularies (the isMarathon seam in
  // lib/coverage.js loadVocabulary), so a DMZ shell keyword would land here. Rejecting
  // is the safe direction and is known behaviour, not a new defect.
  return {
    ok: false,
    reason: `entity_slug '${slug}' matched no ${entityType} for game '${gameSlug}' `
      + `(${valid.size} valid ${entityType} slug${valid.size === 1 ? '' : 's'})`,
  };
}

// Validate a keyword_targets row on the way in. Pure apart from the vocabulary read,
// so it is testable in isolation without inserting anything.
//
// Returns { ok: true } | { ok: false, reason }.
//
// SCOPE: this validates what the DB CANNOT. Enum membership and the
// slug-needs-type rule are enforced by CHECK constraints and are deliberately NOT
// duplicated here -- a second copy is a second thing to keep in sync, which is the
// drift this codebase keeps finding. entity_slug is different: no DB constraint can
// express it, because its validity depends on rows in five other tables.
export async function validateKeywordTarget(supabase, row) {
  var r = row || {};
  var slug = r.entity_slug === undefined || r.entity_slug === null ? '' : String(r.entity_slug).trim();

  // ABSENT -> allowed. A row with no entity is a PAGE-GAP candidate and is a
  // first-class citizen of this table, not a degenerate case. Distinct branch from
  // the reject below on purpose: collapsing them would either block every page-gap
  // row or wave through every typo.
  if (!slug) return { ok: true };

  // entity_type is required to interpret the slug at all. The DB CHECK
  // (slug_needs_type) also forbids this combination; this early return exists so the
  // operator gets a readable reason instead of a raw constraint-violation string.
  var entityType = r.entity_type === undefined || r.entity_type === null ? '' : String(r.entity_type).trim();
  if (!entityType) {
    return { ok: false, reason: `entity_slug '${slug}' was given without an entity_type -- a slug cannot be resolved without knowing its type` };
  }

  var gameSlug = r.game_slug === undefined || r.game_slug === null ? '' : String(r.game_slug).trim();
  if (!gameSlug) {
    return { ok: false, reason: 'game_slug is required to resolve an entity_slug' };
  }

  var res = await resolveEntitySlug(supabase, gameSlug, entityType, slug);
  if (!res.ok) return { ok: false, reason: res.reason };
  return { ok: true };
}

// Per-table validator registry for the generic admin route. Keeping the route generic
// and the rules here means adding a validated table later is a registry entry, not a
// change to the route's control flow.
export const ENTRY_VALIDATORS = {
  keyword_targets: validateKeywordTarget,
};

export { ENTITY_TYPES, FACETS };
