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
// Feeds BOTH the page's JSON-LD dateModified AND the sitemap's lastmod. Moves on
// a real verification pass, NEVER on a render and never on a deploy.
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
