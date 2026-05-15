// -- app/sitemap.js -----------------------------------------------
// FIXED May 15, 2026: Wrapped entire dynamic-data block (including
// createClient) in try/catch. Sitemap.js is evaluated at build time,
// before runtime env vars are populated. If Supabase init throws,
// fall back to static URLs only so the build succeeds. At runtime,
// when the sitemap regenerates with env vars present, dynamic pages
// will be included.
// May 15 2026 update: added diagnostic console.log calls so Vercel
// runtime logs reveal what each query returned.
// -----------------------------------------------------------------

import { createClient } from '@supabase/supabase-js';

const GUIDE_CATEGORIES = [
  'getting-started',
  'combat',
  'extraction',
  'shells',
  'weapons',
  'mods',
  'implants',
  'cores',
  'factions',
  'meta',
  'ranked',
  'advanced',
];

const FALLBACK_SHELL_SLUGS = ['assassin', 'destroyer', 'recon', 'rook', 'thief', 'triage', 'vandal'];

export default async function sitemap() {
  const baseUrl = 'https://cyberneticpunks.com';

  const staticPages = [
    { url: baseUrl,                  lastModified: new Date(), changeFrequency: 'daily',   priority: 1.0 },
    { url: baseUrl + '/meta',        lastModified: new Date(), changeFrequency: 'hourly',  priority: 0.95 },
    { url: baseUrl + '/sitrep',      lastModified: new Date(), changeFrequency: 'hourly',  priority: 0.95 },
    { url: baseUrl + '/factions',    lastModified: new Date(), changeFrequency: 'daily',   priority: 0.9 },
    { url: baseUrl + '/ranked',      lastModified: new Date(), changeFrequency: 'daily',   priority: 0.9 },
    { url: baseUrl + '/advisor',     lastModified: new Date(), changeFrequency: 'daily',   priority: 0.9 },
    { url: baseUrl + '/intel',       lastModified: new Date(), changeFrequency: 'hourly',  priority: 0.9 },
    { url: baseUrl + '/shells',      lastModified: new Date(), changeFrequency: 'daily',   priority: 0.85 },
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

  const guideCategoryPages = GUIDE_CATEGORIES.map((slug) => ({
    url: baseUrl + '/guides/' + slug,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.6,
  }));

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
  let dynamicPages = [];

  console.log('[sitemap] starting generation, env vars present:',
    !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

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

    try {
      const { data, error: feedErr } = await supabase
        .from('feed_items')
        .select('slug, updated_at, created_at')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(500);

      console.log('[sitemap] feed_items:',
        data ? data.length + ' rows' : 'null',
        feedErr ? 'error: ' + feedErr.message : '');

      if (data) {
        dynamicPages = data.map((item) => ({
          url: baseUrl + '/intel/' + item.slug,
          lastModified: item.updated_at ? new Date(item.updated_at) : new Date(item.created_at),
          changeFrequency: 'monthly',
          priority: 0.6,
        }));
      }
    } catch (err) {
      console.error('[sitemap] feed_items fetch threw:', err);
    }
  } catch (err) {
    console.error('[sitemap] Supabase init failed at build time, using static fallback:', err);
  }

  const shellPages = dbShellPages.length > 0 ? dbShellPages : fallbackShellPages;

  console.log('[sitemap] final counts:',
    'static=' + staticPages.length,
    'guides=' + guideCategoryPages.length,
    'shells=' + shellPages.length,
    'dynamic=' + dynamicPages.length);

  return [...staticPages, ...guideCategoryPages, ...shellPages, ...dynamicPages];
}