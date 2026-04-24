// app/factions/page.js
// Server component — fetches faction data + cross-referenced items/articles.

import FactionClient from './FactionClient';
import { supabase } from '@/lib/supabase';

export const metadata = {
  title: 'Marathon Faction Guide — Unlock Requirements & Investment Guide',
  description: 'Complete Marathon faction guide. Every unlock, stat bonus, rank requirement, and credit cost for all 6 factions — Cyberacme, Nucaloric, Traxus, Mida, Arachne, Sekiguchi. Find the fastest path to the build you want.',
  keywords: 'Marathon factions, Marathon faction guide, Marathon Arachne unlock, Marathon Traxus mods, Marathon faction rank requirements, Marathon faction upgrades, Marathon faction investment',
  openGraph: {
    title: 'Marathon Faction Guide — Unlock Requirements & Investment Guide | CyberneticPunks',
    description: 'Every faction unlock, stat bonus, and rank requirement for all 6 Marathon factions. Find which faction to prioritize for your shell.',
    url: 'https://cyberneticpunks.com/factions',
    siteName: 'CyberneticPunks',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    site: '@Cybernetic87250',
    title: 'Marathon Faction Guide | CyberneticPunks',
    description: 'Every faction unlock, stat bonus, and rank requirement. Find the fastest path to the build you want.',
  },
  alternates: { canonical: 'https://cyberneticpunks.com/factions' },
};

export const revalidate = 300;

async function getFactionData() {
  try {
    var [factionsRes, statBonusesRes, unlocksRes, materialsRes,
         weaponsRes, implantsRes, modsRes, coresRes, articlesRes] = await Promise.all([
      supabase.from('factions').select('*').order('name'),
      supabase.from('faction_stat_bonuses').select('*').order('faction_name'),
      supabase.from('faction_unlocks').select('*').order('faction_name'),
      supabase.from('faction_materials').select('*').order('faction_name'),

      // Cross-reference: all weapons gated by a faction
      supabase
        .from('weapon_stats')
        .select('name, weapon_type, rarity, image_filename, faction_source, ranked_viable')
        .not('faction_source', 'is', null),

      // Cross-reference: all implants gated by a faction
      supabase
        .from('implant_stats')
        .select('name, slot_type, rarity, image_filename, faction_source, required_runner')
        .not('faction_source', 'is', null),

      // Cross-reference: all mods gated by a faction
      supabase
        .from('mod_stats')
        .select('name, slot_type, rarity, image_filename, faction_source')
        .not('faction_source', 'is', null),

      // Cross-reference: cores (no faction_source column historically, but may exist)
      supabase
        .from('core_stats')
        .select('name, ability_type, rarity, image_filename, required_runner, meta_rating'),

      // Faction-tagged articles from feed
      supabase
        .from('feed_items')
        .select('id, headline, slug, editor, tags, thumbnail, ce_score, created_at')
        .eq('is_published', true)
        .or('tags.cs.{factions},tags.cs.{cyberacme},tags.cs.{nucaloric},tags.cs.{traxus},tags.cs.{mida},tags.cs.{arachne},tags.cs.{sekiguchi}')
        .order('created_at', { ascending: false })
        .limit(16),
    ]);

    return {
      factions:     factionsRes.data     || [],
      statBonuses:  statBonusesRes.data  || [],
      unlocks:      unlocksRes.data      || [],
      materials:    materialsRes.data    || [],
      weapons:      weaponsRes.data      || [],
      implants:     implantsRes.data     || [],
      mods:         modsRes.data         || [],
      cores:        coresRes.data        || [],
      articles:     articlesRes.data     || [],
    };
  } catch (e) {
    return {
      factions: [], statBonuses: [], unlocks: [], materials: [],
      weapons: [], implants: [], mods: [], cores: [], articles: [],
    };
  }
}

export default async function FactionsPage() {
  var data = await getFactionData();
  return <FactionClient data={data} />;
}