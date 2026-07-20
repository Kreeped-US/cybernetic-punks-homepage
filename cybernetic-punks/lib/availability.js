// lib/availability.js
// SINGLE SOURCE OF TRUTH for "is this event/mode available on this map?"
//
// WHY THIS FILE EXISTS (2026-07-20). This predicate was written correctly ONCE,
// inline in lib/editorCore.js, and a second, DIVERGENT copy in
// app/maps/[slug]/page.js rotted: it compared `available_on` against the map's
// DISPLAY NAME instead of its slug, and never handled the 'all' sentinel. Result:
// game_modes rendered ZERO rows on all 5 map pages, and game_events rendered on
// only 2 of 5.
//
// It survived two audits because it worked BY ACCIDENT on the maps whose slug
// equals their lowercased name ("outpost", "perimeter"). The multi-word maps
// ("dire-marsh" vs "Dire Marsh") silently returned nothing -- and the render was
// gated on `length > 0`, so an empty result omitted the section rather than
// failing visibly. Duplicated logic was the root cause; the display-name bug was
// only the symptom. Both callers now import from here. Neither keeps a copy.
//
// THE DATA CONTRACT (enforced by the admin form's placeholder, `map slug(s) or
// "all"` -- see app/admin/page.js): `available_on` is a free-text column holding
// EITHER the literal sentinel 'all' OR one or more MAP SLUGS, comma-separated
// (e.g. 'dire-marsh, night-marsh'). Never display names. If you are writing a
// value here by hand, write the slug.

// True when a row's `available_on` covers `mapSlug`.
//
// Matching is substring-based on the slug because `available_on` holds
// comma-separated lists ('dire-marsh, night-marsh') and splitting on ', ' would
// be brittle against whitespace variants. Slugs are hyphenated and lowercase, so
// substring collisions are far less likely than they would be with display names
// -- but note the one real risk: a slug that is a substring of another slug
// ('marsh' would match 'dire-marsh'). No current slug pair has that property;
// if one is ever added, this needs exact list matching instead.
export function availableOnMap(availableOn, mapSlug) {
  if (!availableOn || !mapSlug) return false;
  // 'all' is a sentinel meaning every map, NOT a name to match against. The
  // rotted copy omitted this branch, which alone was enough to hide the one
  // verified core mode (Standard Extraction, available_on 'all') on every map.
  if (availableOn.trim().toLowerCase() === 'all') return true;
  return availableOn.toLowerCase().indexOf(mapSlug.toLowerCase()) !== -1;
}
