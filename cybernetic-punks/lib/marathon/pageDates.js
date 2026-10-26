// lib/marathon/pageDates.js
// Two dates for the static, sourced Marathon pages /marathon/nightfall and /marathon/pve (Brief 137),
// the same split as lib/vaultBreaker.js and the DMZ bounties/bosses pages:
//   *_LAST_UPDATED     = when the page was last CHECKED AGAINST ITS SOURCES. Feeds the visible
//                        "Checked against source on" / "last checked against the source" line.
//                        Moves only on a real source pass, never on a wording change.
//   *_CONTENT_CHANGED  = when the page's own content last changed. Feeds WebPage.dateModified (where the
//                        page has one) and the sitemap lastmod (lib/sitemap/eligible.js imports it).
//                        Never earlier than *_LAST_UPDATED.
// In a lib module, not the page, because a Next page file may not export extra names and the sitemap
// must read the same constant the page renders. Date strings ('YYYY-MM-DD'), as next/sitemap emits
// them verbatim.
//
// NIGHTFALL. Whole-page source check 2026-09-17 (the X calendar image and the Sep 14 dev update).
// Content changed 2026-10-16 (328f8af2, Ranked note and hero lede wording, Brief 77). Partial checks
// after the whole-page check, which do NOT move LAST_UPDATED: 2026-10-07 (ce2977ea) four rows against
// the Oct 6 roadmap; 2026-10-16 (328f8af2) the Ranked wording against the Sep 16 X post.
export const NIGHTFALL_LAST_UPDATED = '2026-09-17';
export const NIGHTFALL_CONTENT_CHANGED = '2026-10-16';

// PVE. Whole-page source check 2026-09-14 (the Sep 14 dev update). Content changed 2026-10-15
// (3e1e3200: the CONFIRMED card quote corrected to Bungie's exact wording and the FAQ made visible).
// That commit also checked the quote and the three FAQ answers against the Sep 14 post: a partial
// check, which does NOT move LAST_UPDATED.
export const PVE_LAST_UPDATED = '2026-09-14';
export const PVE_CONTENT_CHANGED = '2026-10-15';
