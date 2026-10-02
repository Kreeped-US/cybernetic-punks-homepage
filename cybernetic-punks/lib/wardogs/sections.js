// lib/wardogs/sections.js
// Indexability predicate for Wardogs sections -- mirrors lib/dmz/sections.js. The ONE
// source of truth for "does this /wardogs/<section> have indexable content", called by
// the section route's noindex/meta-robots gate (app/wardogs/[section]/page.js
// generateMetadata). When the sitemap block is added later (deliberate later pass, see
// the study's gap analysis), it calls this SAME predicate so route + sitemap can never
// drift: a section is indexable iff sectionHasContent.
//
// NOTE: while wardogs.indexable is false (Phase 1) the whole /wardogs subtree is noindex
// via the layout regardless of this predicate; this gate is the per-section belt-and-
// suspenders that also governs each section once wardogs.indexable flips true.
//
// Uses the lazy anon supabase proxy (safe from the request-time route). Imports carry
// the .js extension so the module also loads under node --test.

import { sectionHasArticles } from '../games/sectionArticles.js';

var WARDOGS_GAME_SLUG = 'wardogs';

// Does this section currently have indexable content? A 'data' section is a coming-soon
// shell with no content until its entity tables exist -> false. An 'editor' section has
// content iff >= 1 ELIGIBLE (published, noindex=false, not rejected) Wardogs feed_item
// RESOLVES to it via the shared section resolver (lib/games/sectionArticles.js ->
// sectionForArticle) -- the slug map OR the editorial.defaultArticleSection fallback, so a
// section whose only articles arrive via the fallback is indexable (2026-10-02; previously
// grouped by the static WARDOGS_ARTICLE_SECTION map). The old byTag branch is gone: Wardogs has
// no tag sections, and a future one must be taught to wardogsSectionForArticle (one resolver).
// LOUD FAILURE: a real read error THROWS; a genuine zero returns false -> noindex.
// `client` is a TEST SEAM only; production passes no second arg.
export async function sectionHasContent(section, client) {
  return sectionHasArticles(WARDOGS_GAME_SLUG, section, client);
}
