// app/factions/page.js
// Server component — fetches faction data + cross-referenced items/articles.
// Now includes JSON-LD schemas (BreadcrumbList + WebApplication + FAQPage)
// and passes urlShell prop to client for deep-linking from homepage callout.

import FactionClient from './FactionClient';
import { supabase } from '@/lib/supabase';

export const metadata = {
  title: 'Marathon Faction Guide — Unlock Requirements & Investment Guide',
  description: 'Complete Marathon faction guide. Every unlock, stat bonus, rank requirement, and credit cost for all 6 factions — Cyberacme, Nucaloric, Traxus, Mida, Arachne, Sekiguchi. Find the fastest path to the build you want.',
  keywords: 'Marathon factions, Marathon faction guide, Marathon Arachne unlock, Marathon Traxus mods, Marathon faction rank requirements, Marathon faction upgrades, Marathon faction investment, which Marathon faction to choose, Marathon faction tier list, best Marathon faction for shell, Marathon faction progression, Shell Faction Advisor',
  openGraph: {
    title: 'Marathon Faction Guide — Unlock Requirements & Investment Guide | CyberneticPunks',
    description: 'Every faction unlock, stat bonus, and rank requirement for all 6 Marathon factions. Find which faction to prioritize for your shell.',
    url: 'https://cyberneticpunks.com/factions',
    siteName: 'CyberneticPunks',
    type: 'website',
    images: [{ url: 'https://cyberneticpunks.com/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@Cybernetic87250',
    title: 'Marathon Faction Guide | CyberneticPunks',
    description: 'Every faction unlock, stat bonus, and rank requirement. Find the fastest path to the build you want.',
    images: ['https://cyberneticpunks.com/og-image.png'],
  },
  alternates: { canonical: 'https://cyberneticpunks.com/factions' },
};

export const revalidate = 300;

// ── JSON-LD SCHEMAS ────────────────────────────────────────────
// These render inline in the page response so Google sees them on first crawl.

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home',     item: 'https://cyberneticpunks.com' },
    { '@type': 'ListItem', position: 2, name: 'Factions', item: 'https://cyberneticpunks.com/factions' },
  ],
};

const webApplicationSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Shell Faction Advisor',
  description: 'Interactive Marathon tool that maps your shell choice to the optimal faction grind path. Pick your shell, see which factions provide the most relevant stat bonuses and unlocks for your playstyle.',
  url: 'https://cyberneticpunks.com/factions',
  applicationCategory: 'GameApplication',
  operatingSystem: 'Web',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
  publisher: {
    '@type': 'Organization',
    name: 'CyberneticPunks',
    url:  'https://cyberneticpunks.com',
  },
};

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Which Marathon faction should I join first?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'It depends on your shell and playstyle. Arachne offers melee and combat upgrades that pair well with Destroyer and Vandal. Cyberacme prioritizes loot speed and extraction — ideal for Thief and Recon Runners. Traxus unlocks weapon mods that benefit nearly every build. Use the Shell Faction Advisor on this page to see which factions provide the most relevant stat bonuses for the shell you play most.',
      },
    },
    {
      '@type': 'Question',
      name: 'What does each Marathon faction unlock?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Each of the six factions (Cyberacme, Nucaloric, Traxus, Mida, Arachne, Sekiguchi) gates specific weapons, mods, implants, and permanent shell stat bonuses behind rank progression. Cyberacme focuses on loot and extraction. Nucaloric handles support and healing. Traxus unlocks weapons and weapon mods. Mida controls equipment and grenades. Arachne offers melee and combat upgrades. Sekiguchi specializes in energy and capacitor systems. Browse the Unlock Browser on this page for the complete catalog.',
      },
    },
    {
      '@type': 'Question',
      name: 'How long does it take to max a faction in Marathon?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Maxing a single faction typically requires sustained play across 30-50 hours of focused mission completion. Each rank requires both faction reputation and material grinding, and the highest-tier unlocks have credit costs measured in tens of thousands. Most Runners focus on one or two factions during early progression rather than spreading investment across all six.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can I level multiple Marathon factions at the same time?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes, but progression is significantly slower if you split focus. Faction reputation is earned through specific mission types, and most missions advance only one faction at a time. The efficient path is to lock in your primary faction (based on your main shell) and keep a secondary faction at low-rank for utility unlocks.',
      },
    },
    {
      '@type': 'Question',
      name: 'Which faction is best for my shell?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'The Shell Faction Advisor on this page calculates this for you. Pick any of the seven shells (Assassin, Destroyer, Recon, Rook, Thief, Triage, Vandal) and the tool shows you which factions provide the highest stat bonuses for that shell\'s priority stats. Destroyer and Vandal favor Arachne. Recon and Thief favor Cyberacme. Triage favors Nucaloric. Each shell has a clear primary faction based on stat synergies.',
      },
    },
    {
      '@type': 'Question',
      name: 'How does the Faction Advisor work?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'The Shell Faction Advisor matches each shell\'s priority stats (the stats that most amplify that shell\'s kit) against the stat bonuses each faction offers. The tool then ranks all six factions by total bonus value for your selected shell. This tells you exactly which faction to invest in first to maximize your shell\'s effectiveness. The data updates as Bungie adds new faction unlocks and rebalances stats.',
      },
    },
  ],
};

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

export default async function FactionsPage({ searchParams }) {
  var sp = await searchParams;
  var urlShell = sp?.shell || null;
  var data = await getFactionData();
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webApplicationSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <FactionClient data={data} urlShell={urlShell} />
    </>
  );
}