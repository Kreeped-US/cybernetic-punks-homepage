// lib/seo/metaTitle.js
// SERP <title> length control. Google renders ~60 characters (~600px) of a <title> and
// TRUNCATES the rest with its own ellipsis -- so an article whose full headline is the
// <title> shows a chopped, mid-word title in search. This truncates the META TITLE at a
// WORD BOUNDARY to <= META_TITLE_MAX, keeping the LEADING terms (where the primary
// keywords live), while the caller keeps the FULL headline as the on-page H1. One helper,
// applied at each article route's generateMetadata, fixes every article SERP title at once
// (current + future) -- the systemic fix for the "title too long" audit (2026-09-15).
//
// Pure + node-testable (lib/seo/metaTitle.test.mjs). No ellipsis is appended: a clean
// word-boundary phrase reads as a title, and Google would otherwise add its own ellipsis
// on top. Deliberately conservative -- only shortens; a title already <= max is returned
// verbatim (byte-identical), so short titles are untouched.

export const META_TITLE_MAX = 60;

export function truncateMetaTitle(text, max) {
  var limit = (typeof max === 'number' && max > 0) ? max : META_TITLE_MAX;
  var s = String(text == null ? '' : text).trim();
  if (s.length <= limit) return s;
  var cut = s.slice(0, limit);
  var lastSpace = cut.lastIndexOf(' ');
  if (lastSpace > 0) cut = cut.slice(0, lastSpace);   // back up to a word boundary
  // Strip a trailing separator/punctuation so the title never ends on a dangling
  // "-", ":", ",", ";", "." or a stray dash left by the cut.
  cut = cut.replace(/[\s—\-:,;.]+$/, '');
  return cut || s.slice(0, limit); // pathological single-word > max: hard cut, never empty
}
