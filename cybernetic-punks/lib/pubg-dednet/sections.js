// lib/pubg-dednet/sections.js
// Indexability predicate for PUBG: DED.NET sections -- mirrors lib/wardogs/sections.js. The ONE
// source of truth for "does this /pubg-dednet/<section> have indexable content", called by the
// section route's noindex gate (app/pubg-dednet/[section]/page.js). The sitemap block calls the
// SAME predicate-shaped logic (a section is indexable iff it has content), so route + sitemap can
// never drift.
//
// NOTE: while pubg-dednet.indexable is false (Phase 1) the whole subtree is noindex via the layout
// regardless of this predicate; this is the per-section belt-and-suspenders once indexable flips.
//
// Uses the lazy anon supabase proxy. Imports carry .js so the module loads under node --test.

import { sectionHasArticles } from '../games/sectionArticles.js';

var DEDNET_GAME_SLUG = 'pubg-dednet';

// Does this section currently have indexable content? A 'data' section is a coming-soon shell ->
// false. An 'editor' section has content iff >= 1 ELIGIBLE (published, noindex=false, not rejected)
// DED.NET feed_item RESOLVES to it via the shared section resolver (lib/games/sectionArticles.js ->
// sectionForArticle) -- the slug map OR the editorial.defaultArticleSection fallback (2026-10-02;
// previously grouped by the static DEDNET_ARTICLE_SECTION map). LOUD FAILURE: a real read error
// THROWS; a genuine zero returns false -> noindex. `client` is a TEST SEAM only.
export async function sectionHasContent(section, client) {
  return sectionHasArticles(DEDNET_GAME_SLUG, section, client);
}
