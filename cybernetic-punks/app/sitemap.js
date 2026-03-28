import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function sitemap() {
  const baseUrl = 'https://cyberneticpunks.com';

  const staticPages = [
    // ── Tier 1: Homepage (1.0)
    { url: baseUrl,                          lastModified: new Date(), changeFrequency: 'hourly',  priority: 1.0 },

    // ── Tier 2: High-traffic content hubs (0.95)
    { url: baseUrl + '/meta',                lastModified: new Date(), changeFrequency: 'hourly',  priority: 0.95 },
    { url: baseUrl + '/builds',              lastModified: new Date(), changeFrequency: 'hourly',  priority: 0.95 },
    { url: baseUrl + '/intel',               lastModified: new Date(), changeFrequency: 'hourly',  priority: 0.95 },
    { url: baseUrl + '/top-build',           lastModified: new Date(), changeFrequency: 'hourly',  priority: 0.95 },

    // ── Tier 3: Core tool pages (0.9)
    { url: baseUrl + '/advisor',             lastModified: new Date(), changeFrequency: 'daily',   priority: 0.9 },
    { url: baseUrl + '/shells',              lastModified: new Date(), changeFrequency: 'daily',   priority: 0.9 },
    { url: baseUrl + '/ranked',              lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.9 },
    { url: baseUrl + '/guides',              lastModified: new Date(), changeFrequency: 'daily',   priority: 0.9 },

    // ── Tier 4: Supporting content (0.8)
    { url: baseUrl + '/status',              lastModified: new Date(), changeFrequency: 'hourly',  priority: 0.8 },
    { url: baseUrl + '/editors',             lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.8 },
    { url: baseUrl + '/stats',               lastModified: new Date(), changeFrequency: 'daily',   priority: 0.8 },
    { url: baseUrl + '/leaderboard',         lastModified: new Date(), changeFrequency: 'daily',   priority: 0.8 },
    { url: baseUrl + '/sitrep',              lastModified: new Date(), changeFrequency: 'daily',   priority: 0.8 },
    { url: baseUrl + '/join',                lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.8 },

    // ── Tier 5: Editor lane pages (0.75)
    { url: baseUrl + '/intel/cipher',        lastModified: new Date(), changeFrequency: 'daily',   priority: 0.75 },
    { url: baseUrl + '/intel/nexus',         lastModified: new Date(), changeFrequency: 'daily',   priority: 0.75 },
    { url: baseUrl + '/intel/dexter',        lastModified: new Date(), changeFrequency: 'daily',   priority: 0.75 },
    { url: baseUrl + '/intel/ghost',         lastModified: new Date(), changeFrequency: 'daily',   priority: 0.75 },
    { url: baseUrl + '/intel/miranda',       lastModified: new Date(), changeFrequency: 'daily',   priority: 0.75 },
  ];

  // Shell hub pages — auto-includes any new shells added to the DB
  let shellPages = [];
  try {
    const { data: shells } = await supabase
      .from('shell_stats')
      .select('name, updated_at')
      .order('name');

    if (shells) {
      shellPages = shells.map((s) => ({
        url: baseUrl + '/shells/' + s.name.toLowerCase(),
        lastModified: s.updated_at ? new Date(s.updated_at) : new Date(),
        changeFrequency: 'daily',
        priority: 0.85,
      }));
    }
  } catch (err) {
    console.error('Sitemap shell fetch error:', err);
  }

  // Article pages — capped at 500 to keep sitemap lean
  let dynamicPages = [];
  try {
    const { data } = await supabase
      .from('feed_items')
      .select('slug, created_at')
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(500);

    if (data) {
      dynamicPages = data.map((item) => ({
        url: baseUrl + '/intel/' + item.slug,
        lastModified: new Date(item.created_at),
        changeFrequency: 'weekly',
        priority: 0.7,
      }));
    }
  } catch (err) {
    console.error('Sitemap fetch error:', err);
  }

  return [...staticPages, ...shellPages, ...dynamicPages];
}