// app/sitemap.js
// Dynamic sitemap for search engines — pulls all published intel pages from Supabase

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function sitemap() {
  const baseUrl = 'https://cyberneticpunks.com';

  // Static pages
  const staticPages = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 1.0,
    },
  ];

  // Dynamic intel pages from Supabase
  let intelPages = [];
  try {
    const { data, error } = await supabase
      .from('feed_items')
      .select('slug, created_at')
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    if (!error && data) {
      intelPages = data.map((item) => ({
        url: `${baseUrl}/intel/${item.slug}`,
        lastModified: new Date(item.created_at),
        changeFrequency: 'weekly',
        priority: 0.8,
      }));
    }
  } catch (err) {
    console.error('[SITEMAP] Error fetching feed_items:', err.message);
  }

  return [...staticPages, ...intelPages];
}