// app/ranked/page.js
// Server component — fetches live ranked data from Supabase, hands to client.

import RankedClient from './RankedClient';
import { supabase } from '@/lib/supabase';

export const metadata = {
  title: 'Marathon Ranked Mode Guide — Tiers, Holotags, Shells & Rewards',
  description: 'Everything you need to climb Marathon Ranked. Tier breakdowns, Holotag rules, gear ante requirements, live shell tier list, season rewards, and AI-graded ranked intel — updated every 6 hours.',
  openGraph: {
    title: 'Marathon Ranked Mode Guide — Tiers, Holotags & Season 1 Rewards | CyberneticPunks',
    description: 'Ranked mode intel for Marathon. Six tiers, three subdivisions each. Live shell tier list, NEXUS meta tracking, flagged weapons, and recent ranked intelligence.',
    url: 'https://cyberneticpunks.com/ranked',
    siteName: 'CyberneticPunks',
    type: 'website',
    images: [{ url: 'https://cyberneticpunks.com/og-image.png', width: 1200, height: 630, alt: 'Marathon Ranked Mode Guide — CyberneticPunks' }],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@Cybernetic87250',
    title: 'Marathon Ranked Mode Guide — CyberneticPunks',
    description: 'Tier breakdowns, Holotag rules, shell picks, and season rewards for Marathon Ranked Season 1.',
    images: ['https://cyberneticpunks.com/og-image.png'],
  },
  alternates: {
    canonical: 'https://cyberneticpunks.com/ranked',
  },
};

export const revalidate = 300;

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
  return <RankedClient data={data} />;
}