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
import { supabase } from '@/lib/supabase';

export const metadata = {
  title: 'Marathon Ranked Mode Guide — Tiers, Holotags, Shells & Rewards',
  description: 'Everything you need to climb Marathon Ranked in Season 2. Tier breakdowns, Holotag rules, the new single-queue 5,000 loadout minimum, live shell tier list, season rewards, and AI-graded ranked intel — updated throughout the day. Ranked returns June 14.',
  openGraph: {
    title: 'Marathon Ranked Mode Guide — Tiers, Holotags & Season 2 Rewards | CyberneticPunks',
    description: 'Ranked mode intel for Marathon Season 2. Six tiers, three subdivisions each. New single combined queue, live shell tier list, AI meta tracking, flagged weapons, and recent ranked intelligence. Returns June 14.',
    url: 'https://cyberneticpunks.com/ranked',
    siteName: 'CyberneticPunks',
    type: 'website',
    images: [{ url: 'https://cyberneticpunks.com/og-image.png', width: 1200, height: 630, alt: 'Marathon Ranked Mode Guide — CyberneticPunks' }],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@Cybernetic87250',
    title: 'Marathon Ranked Mode Guide — CyberneticPunks',
    description: 'Tier breakdowns, Holotag rules, shell picks, and season rewards for Marathon Ranked. Season 2 returns June 14.',
    images: ['https://cyberneticpunks.com/og-image.png'],
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
        .select('name, type, tier, trend, ranked_note, ranked_tier_solo, ranked_tier_squad, holotag_tier, updated_at')
        .not('ranked_note', 'is', null)
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
      <RankedClient data={data} />
    </>
  );
}