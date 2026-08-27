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

import { supabase } from '../supabase.js';
import { dednetArticleSlugsForSection } from '../games/pubg-dednet.js';

var DEDNET_GAME_SLUG = 'pubg-dednet';

// Does this section currently have indexable content? A 'data' section is a coming-soon shell ->
// false. An 'editor' section has content iff >= 1 published DED.NET feed_item resolves to it (by
// the DEDNET_ARTICLE_SECTION slug map). Fail-safe: an errored count -> false. `client` is a TEST
// SEAM only; production passes no second arg.
export async function sectionHasContent(section, client) {
  if (!section || section.source !== 'editor') return false; // data sections: coming-soon shell
  var db = client || supabase;
  try {
    var sectionSlugs = dednetArticleSlugsForSection(section.slug);
    if (sectionSlugs.length === 0) return false;
    var { count } = await db
      .from('feed_items')
      .select('id', { count: 'exact', head: true })
      .eq('is_published', true).eq('game_slug', DEDNET_GAME_SLUG)
      .in('slug', sectionSlugs);
    return (count || 0) > 0;
  } catch (err) {
    return false; // fail-safe: errored count -> treat as empty -> noindex
  }
}
