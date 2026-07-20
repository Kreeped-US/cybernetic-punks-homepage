// app/ranked/page.js
// Server component — fetches live ranked data from Supabase, hands to client.
//
// UPDATED June 2, 2026 (S2 / Update 1.019):
// - Ranked is reworked for Season 2. Low + High Stakes merged into a single
//   queue (5,000 loadout minimum); Holotag must match current rank; faster
//   progression. Ranked RETURNS June 14, 2026 (not live at S2 launch).
// - Metadata: "Season 1 rewards" -> season-agnostic; stale "every 6 hours"
//   cadence copy -> "throughout the day".

import RankedClient from './RankedClient';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export const metadata = {
  title: 'Marathon Ranked — Tiers, Skill Rating & Rank Push',
  description: 'Everything you need to climb Marathon Ranked in Season 2. Tier breakdowns, Holotag rules, the new single-queue 5,000 loadout minimum, live shell tier list, season rewards, and AI-graded ranked intel — updated throughout the day. Ranked returns June 14.',
  openGraph: {
    title: 'Marathon Ranked — Tiers, Skill Rating & Rank Push | CyberneticPunks',
    description: 'Ranked mode intel for Marathon Season 2. Six tiers, three subdivisions each. New single combined queue, live shell tier list, AI meta tracking, flagged weapons, and recent ranked intelligence. Returns June 14.',
    url: 'https://cyberneticpunks.com/ranked',
    siteName: 'CyberneticPunks',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    site: '@Cybernetic87250',
    title: 'Marathon Ranked — Tiers, Skill Rating & Rank Push | CyberneticPunks',
    description: 'Tier breakdowns, Holotag rules, shell picks, and season rewards for Marathon Ranked. Season 2 returns June 14.',
  },
  alternates: {
    canonical: 'https://cyberneticpunks.com/ranked',
  },
};

export const dynamic = 'force-dynamic';

async function getRankedData() {
  try {
    var [shellsRes, rankedArticlesRes, unviableWeaponsRes, metaMoversRes] = await Promise.all([
      // All shells with ranked tier data + image
      supabase
        .from('shell_stats')
        .select('name, role, ranked_tier_solo, ranked_tier_squad, image_filename, recommended_playstyle, prime_ability_name')
        .order('name'),

      // Recent ranked-tagged articles from any editor
      supabase
        .from('feed_items')
        .select('id, headline, slug, editor, tags, thumbnail, ce_score, created_at')
        .eq('is_published', true)
        .eq('game_slug', 'marathon')
        .contains('tags', ['ranked'])
        .order('created_at', { ascending: false })
        .limit(12),

      // Weapons flagged as not ranked-viable
      supabase
        .from('weapon_stats')
        .select('name, weapon_type, image_filename, ranked_viable')
        .eq('ranked_viable', false)
        .limit(10),

      // Meta tiers with ranked-specific notes populated
      supabase
        .from('meta_tiers')
        .select('name, type, tier, trend, updated_at')
        // FILTER ON trend, not ranked_note (2026-07-20). A strip called "meta
        // movers" filtering on "has ranked prose" showed non-movers as movers --
        // Rook qualified purely by HAVING a note. trend is computed in code by
        // computeTrend(newTier, oldTier), never model-authored and never echoed
        // from shell_stats, so it survives the meta_tiers loop fix intact.
        //
        // This renders ZERO entries while every shell is 'stable'. That is
        // correct: nothing has moved. It self-heals the first time a real tier
        // change sets up/down. The Rook exclusion is no longer needed -- a shell
        // with no tier cannot have a trend.
        .in('trend', ['up', 'down'])
        .order('updated_at', { ascending: false })
        .limit(8),
    ]);

    // Enrich meta movers with images
    var metaMovers = metaMoversRes.data || [];
    if (metaMovers.length > 0) {
      var weaponNames = metaMovers.filter(function(m) { return (m.type || '').toLowerCase() === 'weapon'; }).map(function(m) { return m.name; });
      var shellNames  = metaMovers.filter(function(m) { return (m.type || '').toLowerCase() === 'shell';  }).map(function(m) { return m.name; });

      var [weaponImgRes, shellImgRes] = await Promise.all([
        weaponNames.length > 0
          ? supabase.from('weapon_stats').select('name, image_filename').in('name', weaponNames)
          : Promise.resolve({ data: [] }),
        shellNames.length > 0
          ? supabase.from('shell_stats').select('name, image_filename').in('name', shellNames)
          : Promise.resolve({ data: [] }),
      ]);

      var imgMap = {};
      (weaponImgRes.data || []).forEach(function(w) { imgMap[w.name] = { img: w.image_filename, type: 'weapon' }; });
      (shellImgRes.data  || []).forEach(function(s) { imgMap[s.name]  = { img: s.image_filename, type: 'shell' }; });

      metaMovers = metaMovers.map(function(m) {
        var info = imgMap[m.name];
        return Object.assign({}, m, {
          image_filename: info ? info.img : null,
        });
      });
    }

    return {
      shells:           shellsRes.data || [],
      rankedArticles:   rankedArticlesRes.data || [],
      unviableWeapons:  unviableWeaponsRes.data || [],
      metaMovers:       metaMovers,
    };
  } catch (e) {
    return {
      shells: [],
      rankedArticles: [],
      unviableWeapons: [],
      metaMovers: [],
    };
  }
}

export default async function RankedPage() {
  var data = await getRankedData();
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://cyberneticpunks.com' },
          { '@type': 'ListItem', position: 2, name: 'Ranked', item: 'https://cyberneticpunks.com/ranked' },
        ],
      }) }} />
      <nav aria-label="Breadcrumb" style={{ padding: '12px 24px', maxWidth: 1100, margin: '0 auto' }}>
        <ol style={{ display: 'flex', gap: 8, fontFamily: 'monospace', fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, listStyle: 'none', padding: 0, margin: 0, fontWeight: 700 }}>
          <li><Link href="/" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>HOME</Link></li>
          <li>/</li>
          <li style={{ color: 'var(--red)' }}>RANKED</li>
        </ol>
      </nav>
      <RankedClient data={data} />
    </>
  );
}