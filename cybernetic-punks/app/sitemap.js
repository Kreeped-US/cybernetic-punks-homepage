import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function sitemap() {
  const baseUrl = 'https://cyberneticpunks.com';

  const staticPages = [
    { url: baseUrl + '/intel',          lastModified: new Date(), changeFrequency: 'hourly',  priority: 0.9 },
    { url: baseUrl,                     lastModified: new Date(), changeFrequency: 'hourly',  priority: 1   },
    { url: baseUrl + '/meta',           lastModified: new Date(), changeFrequency: 'daily',   priority: 0.9 },
    { url: baseUrl + '/builds',         lastModified: new Date(), changeFrequency: 'daily',   priority: 0.9 },
    { url: baseUrl + '/ranked',         lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.9 },
    { url: baseUrl + '/guides',         lastModified: new Date(), changeFrequency: 'daily',   priority: 0.8 },
    { url: baseUrl + '/editors',        lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.8 },
    { url: baseUrl + '/rising',         lastModified: new Date(), changeFrequency: 'hourly',  priority: 0.7 },
    { url: baseUrl + '/intel/cipher',   lastModified: new Date(), changeFrequency: 'daily',   priority: 0.8 },
    { url: baseUrl + '/intel/nexus',    lastModified: new Date(), changeFrequency: 'daily',   priority: 0.8 },
    { url: baseUrl + '/intel/dexter',   lastModified: new Date(), changeFrequency: 'daily',   priority: 0.8 },
    { url: baseUrl + '/intel/ghost',    lastModified: new Date(), changeFrequency: 'daily',   priority: 0.8 },
    { url: baseUrl + '/intel/miranda',  lastModified: new Date(), changeFrequency: 'daily',   priority: 0.7 },
    { url: baseUrl + '/stats',          lastModified: new Date(), changeFrequency: 'daily',   priority: 0.9 },
    { url: baseUrl + '/leaderboard',    lastModified: new Date(), changeFrequency: 'daily',   priority: 0.9 },
    { url: baseUrl + '/status',         lastModified: new Date(), changeFrequency: 'hourly',  priority: 0.9 },
    { url: baseUrl + '/creators',       lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.8 },
  ];

  let dynamicPages = [];
  try {
    const { data } = await supabase
      .from('feed_items')
      .select('slug, created_at')
      .eq('is_published', true)
      .order('created_at', { ascending: false });

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

  return [...staticPages, ...dynamicPages];
}
```

Save, then commit and push in GitHub Desktop:
```
feat: /ranked page + /guides in nav and sitemap