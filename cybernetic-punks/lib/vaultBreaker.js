// lib/vaultBreaker.js
//
// Shared Vault Breaker constants. Exists so the PAGE and the SITEMAP read ONE
// definition of when the facts last changed, instead of the page holding an
// honest date while the sitemap stamped a build timestamp.
//
// WHY A lib/ MODULE AND NOT AN EXPORT FROM THE PAGE (2026-07-21): this is the
// pattern the codebase already chose for exactly this problem --
// MATCHUP_VERIFIED_DATE lives in lib/matchups.js and is read by both
// app/matchups/[shell]/page.js and app/sitemap.js. Exporting a constant from a
// route module so another route can import it makes the sitemap depend on a
// page's internals; a lib module is a shared definition neither side owns.
//
// THE BUG THIS CLOSES: app/sitemap.js emitted `lastModified: new Date()` for
// /modes/vault-breaker, so lastmod tracked the DEPLOY while the page's JSON-LD
// dateModified tracked the FACTS. Two different freshness stories for one page,
// and they agreed only by coincidence on the day they were both 2026-07-21.
// This is the false-freshness bug the page comment says was fixed in
// app/weapons/[slug]/page.js -- it had reached the JSON-LD and not the sitemap.

// When the Vault Breaker facts were last CHECKED AGAINST THEIR SOURCES.
//
// Feeds the page's visible "Checked against all three sources on" line. Moves on
// a real verification pass, NEVER on a render and never on a deploy. Since
// Brief 134 (2026-10-23) it no longer feeds dateModified or the sitemap lastmod:
// those read CONTENT_CHANGED below (two dates: source check vs content change).
//
// NOT an in-game verification. It means "matches what Bungie published", which
// is a weaker claim -- see the `verified` field on the page, whose ambiguity
// between those two meanings is a known defect pending a split into
// source_verified_at / play_verified_at.
//
// Passed to next/sitemap as a STRING, deliberately: the serializer emits a
// string verbatim, so this stays `2026-07-21` rather than becoming
// `2026-07-21T00:00:00.000Z`, which would invent a midnight precision the date
// does not have.
export const FACTS_UPDATED = '2026-07-21';

// When the page's own content last CHANGED (Brief 134: the JSON-LD Event dates and the
// meta, OG and twitter descriptions moved to the return run). Feeds the page's JSON-LD
// dateModified AND the sitemap lastmod, so the two tell one freshness story. A content
// change does not move FACTS_UPDATED (no source was re-read for it). Never earlier
// than FACTS_UPDATED. A date string, for the same reason as FACTS_UPDATED.
export const CONTENT_CHANGED = '2026-10-23';

// The two runs, as ISO dates. FIRST_RUN: the Vault Breaker Overview (Jul 20) and the
// Mid-Season 2 Update Preview. RETURN_RUN: Bungie's Update 1.1.9.2 (Steam news gid
// 1845383656396920, Oct 6, 2026): "Vault Breaker will be available from October 20 -
// November 9." The post gives no year (the year is the post's, 2026) and no start or end
// time, so these are dates only. One definition: the page's Event dates and its meta,
// OG and twitter text are all built from these.
export const FIRST_RUN = { startDate: '2026-07-21', endDate: '2026-08-04' };
export const RETURN_RUN = { startDate: '2026-10-20', endDate: '2026-11-09', source: 'Update 1.1.9.2' };

var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// '2026-10-20','2026-11-09' -> 'October 20 - November 9, 2026' (long) or 'Oct 20 - Nov 9, 2026' (short).
// Same-year ranges only (both runs are); a cross-year range would need the year on both sides.
export function runLabel(run, short) {
  var a = run.startDate.split('-'), b = run.endDate.split('-');
  var m = function (mm) { var n = MONTHS[Number(mm) - 1]; return short ? n.slice(0, 3) : n; };
  return m(a[1]) + ' ' + Number(a[2]) + ' - ' + m(b[1]) + ' ' + Number(b[2]) + ', ' + b[0];
}
