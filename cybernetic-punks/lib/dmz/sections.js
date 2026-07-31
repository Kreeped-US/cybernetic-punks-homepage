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

import { supabase } from '../supabase.js';
import { dmzArticleSlugsForSection } from '../games/dmz.js';

var DMZ_GAME_SLUG = 'dmz';

// Does this section currently have indexable content? A 'data' section is a
// coming-soon shell with no content until its entity tables exist -> false. An
// 'editor' section has content iff >= 1 published DMZ feed_item resolves to it
// (by tag for discourse; otherwise by the DMZ_ARTICLE_SECTION slug map). Fail-safe:
// an errored count -> false (treat as empty -> noindex + excluded; never over-expose).
//
// `client` is a TEST SEAM only: production callers (the section route + the sitemap)
// pass no second arg and get the real supabase proxy. Injecting a fake lets the unit
// test drive the SOURCE-MAPPING branches (data vs editor; tag vs slug-map; empty-map
// short-circuit) without a live DB. Zero production behavior change.
export async function sectionHasContent(section, client) {
  if (!section || section.source !== 'editor') return false; // data sections: coming-soon shell
  var db = client || supabase;
  var byTag = section.contentFilter && section.contentFilter.byTag;
  try {
    if (byTag) {
      var { count: tagCount } = await db
        .from('feed_items')
        .select('id', { count: 'exact', head: true })
        .eq('is_published', true).eq('game_slug', DMZ_GAME_SLUG)
        .contains('tags', [byTag]);
      return (tagCount || 0) > 0;
    }
    var sectionSlugs = dmzArticleSlugsForSection(section.slug);
    if (sectionSlugs.length === 0) return false;
    var { count } = await db
      .from('feed_items')
      .select('id', { count: 'exact', head: true })
      .eq('is_published', true).eq('game_slug', DMZ_GAME_SLUG)
      .in('slug', sectionSlugs);
    return (count || 0) > 0;
  } catch (err) {
    return false; // fail-safe: an errored count -> treat as empty -> noindex (never over-expose)
  }
}
