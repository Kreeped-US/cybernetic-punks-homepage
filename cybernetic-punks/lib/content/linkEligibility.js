// lib/content/linkEligibility.js
// SHARED eligibility rule for every render-time body linker (DMZ POI + system linkers in
// lib/dmz/articleContent.js, Marathon's inline item cards in app/marathon/intel/[slug]/page.js,
// and any future game's linker). Game-agnostic: no game-specific branches.
//
// A paragraph whose trimmed text starts with "Sources:" (case-sensitive) is the appended
// citation line (Publisher, "Title" (date): URL; ...). It is INELIGIBLE: no links are added
// inside it, and it does not use up a term's first-mention slot, so the term can still link
// at its first mention in prose. "Update (" and "Correction (" paragraphs stay eligible.
// Pure: no imports, no React.

export var SOURCES_PREFIX = 'Sources:';

export function isLinkEligibleParagraph(text) {
  if (typeof text !== 'string') return true;
  return text.trim().indexOf(SOURCES_PREFIX) !== 0;
}
