// app/factions/page.js
// Server component - lean Season 2 faction guide.
//
// SEASON 2 REWRITE (June 4, 2026):
// The Season 1 faction stat-grind was replaced by the Cradle. This page no
// longer advises which faction to grind for stats. It now describes the six
// factions/organizations, their verified S2 role (contracts, reputation,
// unique gear access, Cryo Archive gating, faster S2 rep), and links to the
// Cradle planner for core stat builds.
//
// REMOVED: Shell Faction Advisor (stat engine), .EXE unlock catalog + Unlock
// Browser (S1 upgrades that moved to the Cradle), faction stat-bonuses, the
// Arsenal section (queried weapon_stats.faction_source - a column that does
// not exist, which was throwing and emptying the whole fetch).
// SOURCE OF TRUTH: the factions + faction_materials tables (DB), not hardcoded
// leader/focus constants (which were stale).

import FactionClient from './FactionClient';
import { supabase } from '@/lib/supabase';

export const metadata = {
  title: 'Marathon Factions — Roles, Reputation & Cryo Archive Access',
  description: 'Marathon Season 2 faction guide. What each of the six factions - Cyberacme, Nucaloric, Traxus, Mida, Arachne, Sekiguchi - offers: contracts, reputation, unique gear, and Cryo Archive access. Core stat upgrades now come from the Cradle.',
  keywords: 'Marathon factions, Marathon faction guide, Marathon Season 2 factions, Marathon Cyberacme, Marathon Traxus, Marathon Arachne, Marathon faction reputation, Marathon Cryo Archive factions, which Marathon faction first, Marathon faction contracts',
  openGraph: {
    title: 'Marathon Factions — Roles, Reputation & Cryo Archive Access | CyberneticPunks',
    description: 'What each of the six Marathon factions offers in Season 2: contracts, reputation, unique gear, and Cryo Archive access. Core stats now come from the Cradle.',
    url: 'https://cyberneticpunks.com/marathon/factions',
    siteName: 'CyberneticPunks',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    site: '@Cybernetic87250',
    title: 'Marathon Factions — Roles, Reputation & Cryo Archive Access | CyberneticPunks',
    description: 'What each faction offers in Season 2: contracts, reputation, unique gear, Cryo Archive access.',
  },
  alternates: { canonical: 'https://cyberneticpunks.com/marathon/factions' },
};

export const dynamic = 'force-dynamic';

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home',     item: 'https://cyberneticpunks.com' },
    { '@type': 'ListItem', position: 2, name: 'Factions', item: 'https://cyberneticpunks.com/marathon/factions' },
  ],
};

async function getFactionData() {
  try {
    var [factionsRes, materialsRes, articlesRes] = await Promise.all([
      supabase.from('factions').select('*').order('name'),
      supabase.from('faction_materials').select('*').order('faction_name'),
      supabase
        .from('feed_items')
        .select('id, headline, slug, editor, tags, thumbnail, ce_score, created_at')
        .eq('is_published', true)
        .eq('game_slug', 'marathon')
        .or('tags.cs.{factions},tags.cs.{cyberacme},tags.cs.{nucaloric},tags.cs.{traxus},tags.cs.{mida},tags.cs.{arachne},tags.cs.{sekiguchi}')
        .order('created_at', { ascending: false })
        .limit(12),
    ]);

    return {
      factions:  factionsRes.data  || [],
      materials: materialsRes.data || [],
      articles:  articlesRes.data  || [],
    };
  } catch (e) {
    return { factions: [], materials: [], articles: [] };
  }
}

export default async function FactionsPage() {
  var data = await getFactionData();
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <FactionClient data={data} />
    </>
  );
}