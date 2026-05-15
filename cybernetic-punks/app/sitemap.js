// ── app/sitemap.js ─────────────────────────────────────────
// FIXED May 15, 2026: createClient moved inside the sitemap function
// to defer Supabase client init until request time. Module-scope init
// breaks Next.js 16 build (supabaseUrl is required at evaluation time).
// ───────────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js';

// Guide categories (top-level routes that exist regardless of DB state)
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

export default async function sitemap() {
  // Lazy-init Supabase inside the sitemap function — runtime, not build time
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

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

  // Try to fetch dynamic pages; if any query fails, gracefully fall back
  // to static pages only so the sitemap still builds.
  let shellPages = [];
  let shellGuidePages = [];
  try {
    const { data: shells } = await supabase
      .from('shell_stats')
      .select('name, updated_at')
      .order('name');

    if (shells) {
      shellPages = shells.map((s) => ({
        url: baseUrl + '/shells/' + s.name.toLowerCase(),
        lastModified: s.updated_at ? new Date(s.updated_at) : new Date(),
        changeFrequency: 'weekly',
        priority: 0.75,
      }));

      shellGuidePages = shells.map((s) => ({
        url: baseUrl + '/guides/shells/' + s.name.toLowerCase(),
        lastModified: s.updated_at ? new Date(s.updated_at) : new Date(),
        changeFrequency: 'weekly',
        priority: 0.7,
      }));
    }
  } catch (err) {
    console.error('Sitemap shell fetch failed:', err);
  }

  let dynamicPages = [];
  try {
    const { data } = await supabase
      .from('feed_items')
      .select('slug, updated_at, created_at')
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(500);

    if (data) {
      dynamicPages = data.map((item) => ({
        url: baseUrl + '/intel/' + item.slug,
        lastModified: item.updated_at ? new Date(item.updated_at) : new Date(item.created_at),
        changeFrequency: 'monthly',
        priority: 0.6,
      }));
    }
  } catch (err) {
    console.error('Sitemap feed_items fetch failed:', err);
  }

  return [...staticPages, ...guideCategoryPages, ...shellPages, ...shellGuidePages, ...dynamicPages];
}