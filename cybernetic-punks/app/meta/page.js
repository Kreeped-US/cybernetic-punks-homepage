// app/meta/page.js
import { Suspense } from 'react';
import { createClient } from '@supabase/supabase-js';
import MetaClient from './MetaClient';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export const revalidate = 300;

export const metadata = {
  title: 'Marathon Meta Tier List — What Weapons & Builds Are Winning Right Now',
  description: 'Live Marathon tier list updated every 6 hours. See which weapons, shells, and loadouts are dominating in Marathon right now. Tracked by AI editors analyzing YouTube, Reddit, and gameplay data.',
  openGraph: {
    title: 'Marathon Meta Tier List — CyberneticPunks',
    description: 'Live Marathon tier list updated every 6 hours. See what weapons and builds are actually winning.',
    url: 'https://cyberneticpunks.com/meta',
    siteName: 'CyberneticPunks',
    type: 'website',
    images: [{ url: 'https://cyberneticpunks.com/og-image.png', width: 1200, height: 630, alt: 'Marathon Meta Tier List — CyberneticPunks' }],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@Cybernetic87250',
    title: 'Marathon Meta Tier List — CyberneticPunks',
    description: 'Live Marathon tier list. What weapons, strategies, and loadouts are winning right now.',
    images: ['https://cyberneticpunks.com/og-image.png'],
  },
  alternates: { canonical: 'https://cyberneticpunks.com/meta' },
};

export default async function MetaPage() {
  let metaTiers = [];
  let weapons = [];
  let shells = [];
  let modCount = 0;
  let recentPosts = [];

  try {
    const [metaRes, weaponsRes, shellsRes, modsRes, postsRes] = await Promise.all([
      supabase
        .from('meta_tiers')
        .select('name, type, tier, trend, note, ranked_note, ranked_tier_solo, ranked_tier_squad, holotag_tier, updated_at')
        .order('updated_at', { ascending: false }),
      supabase
        .from('weapon_stats')
        .select('name, weapon_type, ammo_type, damage, fire_rate, range_rating, ranked_viable, firepower_score, accuracy_score, image_filename'),
      supabase
        .from('shell_stats')
        .select('name, role, base_health, base_shield, base_speed, prime_ability_name, tactical_ability_name, passive_ability_name, ranked_tier_solo, ranked_tier_squad, image_filename'),
      supabase.from('mod_stats').select('id', { count: 'exact', head: true }),
      supabase
        .from('feed_items')
        .select('headline, slug, editor, tags, created_at')
        .in('editor', ['NEXUS', 'CIPHER'])
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(6),
    ]);

    metaTiers   = metaRes.data   || [];
    weapons     = weaponsRes.data || [];
    shells      = shellsRes.data  || [];
    modCount    = modsRes.count   || 0;
    recentPosts = postsRes.data   || [];
  } catch (err) {
    console.error('[MetaPage] fetch error:', err);
  }

  return (
    <main style={{ minHeight: '100vh', background: '#121418', color: '#fff', paddingTop: 48, paddingBottom: 80 }}>
      <Suspense fallback={null}>
        <MetaClient
          metaTiers={metaTiers}
          weapons={weapons}
          shells={shells}
          modCount={modCount}
          recentPosts={recentPosts}
        />
      </Suspense>
    </main>
  );
}
