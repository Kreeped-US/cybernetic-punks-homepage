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

import { supabase } from '../supabase.js';
import { wardogsArticleSlugsForSection } from '../games/wardogs.js';

var WARDOGS_GAME_SLUG = 'wardogs';

// Does this section currently have indexable content? A 'data' section is a coming-soon
// shell with no content until its entity tables exist -> false. An 'editor' section has
// content iff >= 1 published Wardogs feed_item resolves to it (by the
// WARDOGS_ARTICLE_SECTION slug map). Fail-safe: an errored count -> false (never over-
// expose). `client` is a TEST SEAM only; production passes no second arg.
export async function sectionHasContent(section, client) {
  if (!section || section.source !== 'editor') return false; // data sections: coming-soon shell
  var db = client || supabase;
  var byTag = section.contentFilter && section.contentFilter.byTag;
  try {
    if (byTag) {
      var { count: tagCount } = await db
        .from('feed_items')
        .select('id', { count: 'exact', head: true })
        .eq('is_published', true).eq('game_slug', WARDOGS_GAME_SLUG)
        .contains('tags', [byTag]);
      return (tagCount || 0) > 0;
    }
    var sectionSlugs = wardogsArticleSlugsForSection(section.slug);
    if (sectionSlugs.length === 0) return false;
    var { count } = await db
      .from('feed_items')
      .select('id', { count: 'exact', head: true })
      .eq('is_published', true).eq('game_slug', WARDOGS_GAME_SLUG)
      .in('slug', sectionSlugs);
    return (count || 0) > 0;
  } catch (err) {
    return false; // fail-safe: errored count -> treat as empty -> noindex
  }
}
