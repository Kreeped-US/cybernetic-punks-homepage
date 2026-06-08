// -- app/sitemap.js -----------------------------------------------
// Sitemap with dynamic category filtering. Only includes guide
// category pages that have at least 1 published article tagged
// with their canonical tag. Empty categories are excluded so Google
// doesn't see thin-content pages.
//
// CANONICAL TAG CONVENTION (must match CATEGORIES keys in
// app/guides/[category]/page.js exactly):
// shells, weapons, mods, extraction, ranked, beginner, progression,
// maps, stealth, squad, solo, holotag, endgame, pvp, support, cryo-archive
//
// JUNE 2, 2026: Added /uniques (static) + dynamic /weapons/[slug] pages.
// Weapon slugs use the full lowercase+hyphenate rule (NOT the simple
// shell .toLowerCase()) because weapon names contain spaces/symbols
// (e.g. "KKV-9SD", "Misriah 2442"); the rule must match how
// app/weapons/[slug]/page.js resolves incoming URLs or the sitemap
// would list URLs the pages can't match.
//
// JUNE 8, 2026: Added /maps (index, static) + dynamic /maps/[slug] pages
// from game_maps (verified, marathon). These are the SEO map reference
// pages built today. game_maps has a real `slug` column, so no
// name-deriving is needed (unlike weapons). New maps self-add to the
// sitemap once their game_maps row is verified=true.
//   NOTE: /maps/[slug] (the map pages) is DISTINCT from /guides/maps
//   (the "maps" guide category) - both can coexist; do not conflate.
// -----------------------------------------------------------------

import { createClient } from '@supabase/supabase-js';

const ALL_GUIDE_CATEGORIES = [
  'shells', 'weapons', 'mods', 'extraction', 'ranked',
  'beginner', 'progression', 'maps', 'stealth', 'squad',
  'solo', 'holotag', 'endgame', 'pvp', 'support', 'cryo-archive',
];

const FALLBACK_SHELL_SLUGS = ['assassin', 'destroyer', 'recon', 'rook', 'thief', 'triage', 'vandal'];

// Weapon name -> URL slug. MUST match app/weapons/[slug]/page.js.
function weaponSlug(name) {
  return (name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default async function sitemap() {
  const baseUrl = 'https://cyberneticpunks.com';

  const staticPages = [
    { url: baseUrl,                  lastModified: new Date(), changeFrequency: 'daily',   priority: 1.0 },
    { url: baseUrl + '/meta',        lastModified: new Date(), changeFrequency: 'hourly',  priority: 0.95 },
    { url: baseUrl + '/sitrep',      lastModified: new Date(), changeFrequency: 'hourly',  priority: 0.95 },
    { url: baseUrl + '/factions',    lastModified: new Date(), changeFrequency: 'daily',   priority: 0.9 },
    { url: baseUrl + '/ranked',      lastModified: new Date(), changeFrequency: 'daily',   priority: 0.9 },
    { url: baseUrl + '/advisor',     lastModified: new Date(), changeFrequency: 'daily',   priority: 0.9 },
    { url: baseUrl + '/cradle',      lastModified: new Date(), changeFrequency: 'daily',   priority: 0.9 },
    { url: baseUrl + '/intel',       lastModified: new Date(), changeFrequency: 'hourly',  priority: 0.9 },
    { url: baseUrl + '/shells',      lastModified: new Date(), changeFrequency: 'daily',   priority: 0.85 },
    { url: baseUrl + '/uniques',     lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.85 },
    { url: baseUrl + '/maps',        lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.85 },
    { url: baseUrl + '/rising',      lastModified: new Date(), changeFrequency: 'daily',   priority: 0.8 },
    { url: baseUrl + '/stats',       lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.75 },
    { url: baseUrl + '/leaderboard', lastModified: new Date(), changeFrequency: 'daily',   priority: 0.75 },
    { url: baseUrl + '/status',      lastModified: new Date(), changeFrequency: 'hourly',  priority: 0.7 },
    { url: baseUrl + '/editors',     lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.7 },
    { url: baseUrl + '/intel/cipher',  lastModified: new Date(), changeFrequency: 'daily', priority: 0.7 },
    { url: baseUrl + '/intel/nexus',   lastModified: new Date(), changeFrequency: 'daily', priority: 0.7 },
    { url: baseUrl + '/intel/dexter',  lastModified: new Date(), changeFrequency: 'daily', priority: 0.7 },
    { url: baseUrl + '/intel/ghost',   lastModified: new Date(), changeFrequency: 'daily', priority: 0.7 },
    { url: baseUrl + '/intel/miranda', lastModified: new Date(), changeFrequency: 'daily', priority: 0.7 },
    { url: baseUrl + '/play-of-the-day', lastModified: new Date(), changeFrequency: 'daily', priority: 0.7 },
    { url: baseUrl + '/top-build',     lastModified: new Date(), changeFrequency: 'daily', priority: 0.7 },
    { url: baseUrl + '/guides',        lastModified: new Date(), changeFrequency: 'weekly', priority: 0.65 },
    { url: baseUrl + '/join',          lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
  ];

  const fallbackShellPages = FALLBACK_SHELL_SLUGS.flatMap((slug) => [
    {
      url: baseUrl + '/shells/' + slug,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.75,
    },
    {
      url: baseUrl + '/guides/shells/' + slug,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
  ]);

  let dbShellPages = [];
  let weaponPages = [];
  let mapPages = [];
  let dynamicPages = [];
  let activeGuideCategories = [];

  console.log('[sitemap] starting generation, env vars present:',
    !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    // Shell pages from DB
    try {
      const { data: shells, error: shellsErr } = await supabase
        .from('shell_stats')
        .select('name, updated_at')
        .order('name');

      console.log('[sitemap] shell_stats:',
        shells ? shells.length + ' rows' : 'null',
        shellsErr ? 'error: ' + shellsErr.message : '');

      if (shells && shells.length > 0) {
        dbShellPages = shells.flatMap((s) => [
          {
            url: baseUrl + '/shells/' + s.name.toLowerCase(),
            lastModified: s.updated_at ? new Date(s.updated_at) : new Date(),
            changeFrequency: 'weekly',
            priority: 0.75,
          },
          {
            url: baseUrl + '/guides/shells/' + s.name.toLowerCase(),
            lastModified: s.updated_at ? new Date(s.updated_at) : new Date(),
            changeFrequency: 'weekly',
            priority: 0.7,
          },
        ]);
      }
    } catch (err) {
      console.error('[sitemap] shell fetch threw:', err);
    }

    // Weapon detail pages from DB. Slug uses the full hyphenate rule to
    // match app/weapons/[slug]/page.js (weapon names have spaces/symbols).
    try {
      const { data: weapons, error: weaponsErr } = await supabase
        .from('weapon_stats')
        .select('name, updated_at')
        .order('name');

      console.log('[sitemap] weapon_stats:',
        weapons ? weapons.length + ' rows' : 'null',
        weaponsErr ? 'error: ' + weaponsErr.message : '');

      if (weapons && weapons.length > 0) {
        weaponPages = weapons.map((w) => ({
          url: baseUrl + '/weapons/' + weaponSlug(w.name),
          lastModified: w.updated_at ? new Date(w.updated_at) : new Date(),
          changeFrequency: 'weekly',
          priority: 0.75,
        }));
      }
    } catch (err) {
      console.error('[sitemap] weapon fetch threw:', err);
    }

    // Map detail pages from DB (game_maps SEO layer, added June 8, 2026).
    // game_maps has a real `slug` column - direct, no name-deriving. Only
    // verified marathon maps get a public page, so the sitemap mirrors that.
    try {
      const { data: maps, error: mapsErr } = await supabase
        .from('game_maps')
        .select('slug, updated_at')
        .eq('game_slug', 'marathon')
        .eq('verified', true)
        .order('slug');

      console.log('[sitemap] game_maps:',
        maps ? maps.length + ' rows' : 'null',
        mapsErr ? 'error: ' + mapsErr.message : '');

      if (maps && maps.length > 0) {
        mapPages = maps.map((m) => ({
          url: baseUrl + '/maps/' + m.slug,
          lastModified: m.updated_at ? new Date(m.updated_at) : new Date(),
          changeFrequency: 'weekly',
          priority: 0.8,
        }));
      }
    } catch (err) {
      console.error('[sitemap] map fetch threw:', err);
    }

    // Article URLs from feed_items
    try {
      const { data, error: feedErr } = await supabase
        .from('feed_items')
        .select('slug, created_at, tags')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(1000);

      console.log('[sitemap] feed_items:',
        data ? data.length + ' rows' : 'null',
        feedErr ? 'error: ' + feedErr.message : '');

      if (data) {
        dynamicPages = data.map((item) => ({
          url: baseUrl + '/intel/' + item.slug,
          lastModified: new Date(item.created_at),
          changeFrequency: 'monthly',
          priority: 0.6,
        }));

        // Determine which guide categories have at least 1 article
        const categoriesWithContent = new Set();
        for (const item of data) {
          if (!item.tags) continue;
          for (const tag of item.tags) {
            if (ALL_GUIDE_CATEGORIES.includes(tag)) {
              categoriesWithContent.add(tag);
            }
          }
        }
        activeGuideCategories = ALL_GUIDE_CATEGORIES.filter((slug) =>
          categoriesWithContent.has(slug)
        );

        console.log('[sitemap] active guide categories:',
          activeGuideCategories.length + ' of ' + ALL_GUIDE_CATEGORIES.length,
          '(' + activeGuideCategories.join(', ') + ')');
      }
    } catch (err) {
      console.error('[sitemap] feed_items fetch threw:', err);
    }
  } catch (err) {
    console.error('[sitemap] Supabase init failed at build time, using static fallback:', err);
  }

  // Only include guide category pages with confirmed content.
  // If we couldn't query (build time), include nothing here.
  const guideCategoryPages = activeGuideCategories.map((slug) => ({
    url: baseUrl + '/guides/' + slug,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.65,
  }));

  const shellPages = dbShellPages.length > 0 ? dbShellPages : fallbackShellPages;

  console.log('[sitemap] final counts:',
    'static=' + staticPages.length,
    'guides=' + guideCategoryPages.length,
    'shells=' + shellPages.length,
    'weapons=' + weaponPages.length,
    'maps=' + mapPages.length,
    'dynamic=' + dynamicPages.length);

  return [...staticPages, ...guideCategoryPages, ...shellPages, ...weaponPages, ...mapPages, ...dynamicPages];
}