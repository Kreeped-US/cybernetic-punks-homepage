// lib/dmz/sections.js
// SHARED indexability predicate for DMZ sections -- the ONE source of truth for
// "does this /dmz/<section> have indexable content", called by BOTH the section
// route's noindex/meta-robots gate (app/dmz/[section]/page.js generateMetadata)
// AND the sitemap's section inclusion (app/sitemap.js).
//
// WHY THIS EXISTS: those two used to compute indexability INDEPENDENTLY -- the
// route counted live content (noindex when empty) while the sitemap listed every
// configured section unconditionally -- so they DRIFTED: four empty shells
// (field-intel, meta, printer, discourse) were noindexed by the route yet still
// advertised in the sitemap (a mixed signal to Google). One predicate both call
// makes that drift structurally impossible: a section is IN THE SITEMAP iff it is
// INDEXABLE iff sectionHasContent. A shell->live flip flips all three together.
//
// Uses the lazy anon `supabase` proxy (the same client fetchDmzSlugs uses), so it
// is safe from both the request-time route and the build/revalidate-time sitemap.
// Imports carry the .js extension so the module also loads under node --test (the
// mapping is unit-tested in sections.test.mjs with an injected fake client).

import { sectionHasArticles } from '../games/sectionArticles.js';

var DMZ_GAME_SLUG = 'dmz';

// Does this section currently have indexable content? A 'data' section is a
// coming-soon shell with no content until its entity tables exist -> false. An
// 'editor' section has content iff >= 1 ELIGIBLE (published, noindex=false, not
// rejected) DMZ feed_item RESOLVES to it via the shared section resolver
// (lib/games/sectionArticles.js -> sectionForArticle). That one resolver covers the
// slug map, the 'discourse' TAG, AND the editorial.defaultArticleSection fallback, so
// a section whose only articles arrive via the fallback is indexable (2026-10-02;
// previously this grouped by the static DMZ_ARTICLE_SECTION map / a tag count).
//
// LOUD FAILURE: a real read error THROWS (-> Next default 500); a genuine zero still
// returns false -> noindex. `client` is a TEST SEAM only: production callers (the
// section route + the sitemap) pass no second arg and get the real supabase proxy.
//
// STANDALONE REFERENCE SECTIONS (2026-10): a section whose config reference block is marked
// standalone (section.reference.standalone === true with groups, e.g. /dmz/printer) has server-rendered
// sourced content of its own, so it counts as having content without reading the DB -- indexable and in
// the sitemap, together. A reference block WITHOUT standalone (FOB) keeps the article-based rule.
export function isStandaloneReference(section) {
  return !!(section && section.reference && section.reference.standalone === true && Array.isArray(section.reference.groups) && section.reference.groups.length > 0);
}
export async function sectionHasContent(section, client) {
  if (isStandaloneReference(section)) return true;
  return sectionHasArticles(DMZ_GAME_SLUG, section, client);
}
