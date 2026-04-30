// app/meta/page.js
// Now includes JSON-LD schemas (BreadcrumbList + WebPage with dateModified + ItemList)
// for rich Google results, expanded keywords, and a visible breadcrumb.

import { Suspense } from 'react';
import Link from 'next/link';
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
  keywords: 'Marathon tier list, Marathon meta, Marathon best weapons, Marathon S-tier, Marathon weapons ranked, Marathon shells tier list, best Marathon weapons, Marathon meta tier list, Marathon ranked tier list, Marathon weapon tier list 2026, Marathon top weapons, Marathon top shells, Marathon dominant builds, Marathon meta snapshot, Marathon weapon ranking, what is the meta in Marathon',
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

  // ── JSON-LD SCHEMAS ────────────────────────────────────────────
  // Built from the live data, so they reflect actual tier list state.

  // Latest tier update timestamp — gives Google fresh-content signal
  const lastUpdated = metaTiers.length > 0
    ? metaTiers.reduce(function(a, b) { return a.updated_at > b.updated_at ? a : b; }).updated_at
    : new Date().toISOString();

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://cyberneticpunks.com' },
      { '@type': 'ListItem', position: 2, name: 'Meta Tier List', item: 'https://cyberneticpunks.com/meta' },
    ],
  };

  const webPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Marathon Meta Tier List',
    description: 'Live Marathon tier list ranking weapons, shells, and loadouts. Updated every 6 hours by AI editors analyzing gameplay, community sentiment, and patch impacts.',
    url: 'https://cyberneticpunks.com/meta',
    dateModified: lastUpdated,
    publisher: {
      '@type': 'Organization',
      name: 'CyberneticPunks',
      url:  'https://cyberneticpunks.com',
    },
  };

  // ItemList schema — the tier list itself, top-tier items first.
  // This is the schema that can produce rich list results in Google Search.
  const tierOrder = { S: 0, A: 1, B: 2, C: 3, D: 4, F: 5 };
  const sortedForSchema = [...metaTiers]
    .filter(function(t) { return t.tier && t.name; })
    .sort(function(a, b) {
      var ta = tierOrder[(a.tier || '').toUpperCase()] ?? 99;
      var tb = tierOrder[(b.tier || '').toUpperCase()] ?? 99;
      return ta - tb;
    })
    .slice(0, 30); // top 30 items only — schema rewards focused lists

  const itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Marathon Meta Tier List — Top Weapons and Shells',
    description: 'Ranked tier list of Marathon weapons and Runner Shells based on current meta analysis.',
    numberOfItems: sortedForSchema.length,
    itemListOrder: 'https://schema.org/ItemListOrderDescending',
    itemListElement: sortedForSchema.map(function(item, i) {
      return {
        '@type': 'ListItem',
        position: i + 1,
        name: item.name,
        description: (item.tier ? item.tier + '-tier ' : '') + (item.type || 'item') + (item.note ? ' — ' + item.note : ''),
      };
    }),
  };

  return (
    <main style={{ minHeight: '100vh', background: '#121418', color: '#fff', paddingTop: 48, paddingBottom: 80 }}>
      {/* JSON-LD Schemas — render inline so Google sees on first crawl */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }} />
      {sortedForSchema.length > 0 && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }} />
      )}

      {/* Visible breadcrumb — semantic nav for accessibility + E-E-A-T signal */}
      <nav aria-label="Breadcrumb" style={{ padding: '12px 24px', maxWidth: 1200, margin: '0 auto' }}>
        <ol style={{ display: 'flex', gap: 8, fontFamily: 'monospace', fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, listStyle: 'none', padding: 0, margin: 0, flexWrap: 'wrap', fontWeight: 700 }}>
          <li><Link href="/" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>HOME</Link></li>
          <li>/</li>
          <li style={{ color: '#00ff41' }}>META TIER LIST</li>
        </ol>
      </nav>

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