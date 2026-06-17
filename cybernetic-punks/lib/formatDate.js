// lib/formatDate.js
// Single source of truth for ABSOLUTE display dates (calendar dates shown to
// users). Every formatter bakes in the network's display timezone,
// America/Los_Angeles (PT) - the same zone already used in sitrep/status/cipher.
//
// WHY: a bare `new Date(x).toLocaleDateString()` uses the RUNTIME default zone,
// which is UTC on Vercel. An article published 5 PM PDT (= 00:00 UTC next day)
// then renders a day ahead ("tomorrow"). Routing all absolute date display
// through here fixes that AND prevents the class of bug (a forgotten timeZone
// can't recur).
//
// SCOPE - absolute calendar dates ONLY. Do NOT use this for:
//   - relative "Xd ago" / "Xh ago" deltas (timezone-agnostic, correct as-is);
//   - machine-readable dates (JSON-LD datePublished, sitemap lastModified),
//     which must stay raw ISO/UTC instants.
// Inputs may be an ISO string, a Date, or null/invalid -> returns '' safely.

const DISPLAY_TZ = 'America/Los_Angeles';

// "June 16, 2026" - article byline publish date.
export function formatPublishDate(dateInput) {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { timeZone: DISPLAY_TZ, year: 'numeric', month: 'long', day: 'numeric' });
}

// "June 2026" - e.g. profile "member since".
export function formatMonthYear(dateInput) {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { timeZone: DISPLAY_TZ, month: 'long', year: 'numeric' });
}
