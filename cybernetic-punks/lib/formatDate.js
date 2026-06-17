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

// "June 17, 2026, 5:00 PM PDT" - date + time + zone, e.g. an alert/cycle stamp.
export function formatDateTime(dateInput) {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('en-US', { timeZone: DISPLAY_TZ, year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
}

// MACHINE-READABLE ISO 8601 with the PT offset (DST-aware), e.g.
// "2026-06-16T17:00:00-07:00" (PDT) / "2026-12-16T16:00:00-08:00" (PST).
// SAME INSTANT as the input, expressed with America/Los_Angeles's offset so the
// DATE PORTION matches the visible PT byline. For JSON-LD datePublished/
// dateModified + sitemap lastModified. NOT a display string - this is valid
// ISO 8601 (timezone-explicit). Null/invalid-safe -> ''.
// The offset is computed for the SPECIFIC instant (via Intl longOffset), so it
// is correct across DST - never hardcode -07:00.
export function toISOWithPTOffset(dateInput) {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  const p = new Intl.DateTimeFormat('en-US', {
    timeZone: DISPLAY_TZ, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    timeZoneName: 'longOffset',
  }).formatToParts(d).reduce(function(a, x) { a[x.type] = x.value; return a; }, {});
  var off = (p.timeZoneName || '').replace('GMT', '');
  if (off === '' || off === 'Z') off = '+00:00';
  return p.year + '-' + p.month + '-' + p.day + 'T' + p.hour + ':' + p.minute + ':' + p.second + off;
}
