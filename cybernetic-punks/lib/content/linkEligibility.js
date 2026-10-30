// lib/content/linkEligibility.js
// SHARED eligibility rule for every render-time body linker (DMZ POI + system linkers in
// lib/dmz/articleContent.js, Marathon's inline item cards in app/marathon/intel/[slug]/page.js,
// and any future game's linker). Game-agnostic: no game-specific branches.
//
// A paragraph whose trimmed text starts with "Sources:" or "Source:" (case-sensitive) is the
// appended citation line (Publisher, "Title" (date): URL; ...). It is INELIGIBLE: no links are
// added inside it, and it does not use up a term's first-mention slot, so the term can still link
// at its first mention in prose. "Update (" and "Correction (" paragraphs stay eligible. The same
// test marks the line whose URLs lib/content/sourceLinks.js turns into source links (Brief 232).
// Pure: no imports, no React.

export var SOURCES_PREFIX = 'Sources:';
export var SOURCE_PREFIX = 'Source:';

export function isSourcesParagraph(text) {
  if (typeof text !== 'string') return false;
  var t = text.trim();
  return t.indexOf(SOURCES_PREFIX) === 0 || t.indexOf(SOURCE_PREFIX) === 0;
}

export function isLinkEligibleParagraph(text) {
  return !isSourcesParagraph(text);
}
