// lib/shellGuides.js
// THE roster of shells that have a /guides/shells/<slug> page.
//
// WHY THIS EXISTS (2026-07-20). app/sitemap.js emitted /guides/shells/<name> for
// EVERY shell_stats row, while app/guides/shells/[name]/page.js resolved against
// a HARDCODED 7-shell object. shell_stats has 8 shells, so the sitemap advertised
// /guides/shells/sentinel and the route notFound()'d it -- the single
// sitemap-referenced 4xx in the 2026-07-17 Ahrefs audit.
//
// The sitemap's own comments already praised this exact discipline for
// /mods/[slot] (lib/mods.js SLOT_PAGES) and /matchups/[shell] (lib/matchups.js
// SHELLS): derive the list from ONE place the resolver also reads, so the sitemap
// physically cannot advertise a URL the route 404s. That was applied to mods and
// matchups and not to guides/shells. This closes the gap.
//
// SENTINEL IS ABSENT ON PURPOSE -- DO NOT "COMPLETE" THE SET.
// GSC shows /guides/shells/* CANNIBALIZES /shells/*: Rook's demand is split 26/26
// across the two routes at positions 9.3 and 12.7, neither ranking. Sentinel is
// the ONLY shell with no guides twin and is the best-performing shell page on the
// site (31 impressions, 1 click). Writing a Sentinel guide would split the one
// shell page that currently works. Adding a slug here creates that split; the
// standing direction is the opposite -- /guides/shells/* is a CONSOLIDATION
// candidate (7 pages competing with /shells/* for 53 impressions and 1 click).
//
// This list is AUTHORITATIVE over the page's content object. The route checks
// this first, so a slug removed here 404s even if its content still exists, and
// a slug added here without content still 404s on the page's own null check.
// Both directions fail safe.

export const SHELL_GUIDE_SLUGS = [
  'assassin',
  'destroyer',
  'recon',
  'rook',
  'thief',
  'triage',
  'vandal',
];

// True when <slug> has a /guides/shells page. Callers: the route resolver and
// app/sitemap.js. Case-insensitive because URLs arrive in whatever case the
// crawler used; the canonical form is lowercase.
export function hasShellGuide(slug) {
  return SHELL_GUIDE_SLUGS.indexOf((slug || '').trim().toLowerCase()) !== -1;
}
