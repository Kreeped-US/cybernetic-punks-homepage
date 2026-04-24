// app/guides/[category]/page.js
// SEO-optimized dynamic category routes — 8 pages pre-rendered at build time.
// Each page targets distinct Marathon category keywords.

import { supabase } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import Link from 'next/link';

export const revalidate = 300;

// ─── CATEGORY CONFIG ────────────────────────────────────────
// Single source of truth. Each slug has its DB tag, metadata, keywords, and FAQs.
const CATEGORIES = {
  shells: {
    tag: 'shell-guide',
    label: 'SHELL GUIDES',
    color: '#9b5de5',
    title: 'Marathon Shell Guides — Ability Breakdowns & Playstyle Analysis',
    description: 'Complete Marathon shell guides. Ability breakdowns, stats, playstyle analysis, and synergies for all 7 Runner Shells — Assassin, Destroyer, Recon, Rook, Thief, Triage, and Vandal.',
    keywords: 'Marathon shell guide, Marathon shell guides, Marathon Assassin guide, Marathon Destroyer guide, Marathon Recon guide, Marathon Rook guide, Marathon Thief guide, Marathon Triage guide, Marathon Vandal guide, Marathon shell abilities, Marathon shell tier list',
    h1: 'MARATHON SHELL GUIDES',
    subhead: 'Ability breakdowns, stats, and playstyle analysis for all 7 Runner Shells. From Assassin\'s stealth reposition to Triage\'s squad support — pick the shell that fits your game.',
    related: [
      { href: '/shells',  label: 'SHELL DATABASE',      desc: 'Full stats + abilities', color: '#00d4ff' },
      { href: '/builds',  label: 'BUILD LAB',           desc: 'Loadouts per shell',      color: '#ff8800' },
      { href: '/advisor', label: 'BUILD ADVISOR',       desc: 'Get your ranked build',   color: '#ff8800' },
    ],
    faqs: [
      { q: 'What is the best shell in Marathon?', a: 'The "best" shell depends on playstyle. Vandal and Thief dominate solo ranked with their speed and extraction tools. Triage and Recon excel in squads through support and information. Assassin rewards mechanical players. Check our live tier list for current meta positioning.' },
      { q: 'What is the easiest shell for beginners?', a: 'Triage and Rook are the most forgiving picks. Triage\'s self-repair and revive abilities help you survive mistakes. Rook\'s high shield pool gives you time to learn positioning. Both are excellent first shells before transitioning to more mechanically demanding picks.' },
      { q: 'How many shells are in Marathon?', a: 'Marathon has 7 Runner Shells: Assassin, Destroyer, Recon, Rook, Thief, Triage, and Vandal. Each has unique Prime and Tactical abilities, a passive trait, and distinct stat profiles that affect playstyle.' },
    ],
  },
  ranked: {
    tag: 'ranked',
    label: 'RANKED GUIDES',
    color: '#ffd700',
    title: 'Marathon Ranked Guides — Holotag Strategy, Tier Climb & Ranked Meta',
    description: 'Climb Marathon Ranked. Holotag targeting, gear ante strategy, shell picks, zone rotation intel, and meta analysis. Everything you need to push Platinum and beyond.',
    keywords: 'Marathon ranked guide, Marathon ranked tips, Marathon Holotag guide, Marathon ranked meta, Marathon ranked climb, Marathon Platinum climb, Marathon competitive guide, Marathon ranked strategy, Marathon gear ante, Marathon ranked zones',
    h1: 'MARATHON RANKED GUIDES',
    subhead: 'Holotag strategy, gear ante optimization, shell picks, and zone rotation intel. Season 1 tier climb guides updated with every meta shift.',
    related: [
      { href: '/ranked',  label: 'RANKED HUB',     desc: 'Queue + tier list',       color: '#ffd700' },
      { href: '/meta',    label: 'META TIER LIST', desc: 'Live weapon/shell tiers', color: '#00d4ff' },
      { href: '/advisor', label: 'BUILD ADVISOR',  desc: 'Ranked-viable loadouts',  color: '#ff8800' },
    ],
    faqs: [
      { q: 'When is Marathon Ranked queue open?', a: 'The Ranked queue is open from Sunday 10AM PT through Thursday 10AM PT. Outside that window only Casual queues are available. Zones and Holotag targets rotate with each opening.' },
      { q: 'How do you climb in Marathon Ranked?', a: 'Prioritize Holotag targets early — they\'re the fastest score contribution and don\'t require risky loot runs. Play with a squad when possible, run ranked-viable weapons (check our meta list), and always exfil with your collected tags before contesting the extraction zone.' },
      { q: 'What is the best shell for Ranked in Marathon?', a: 'Vandal and Thief are the top solo ranked picks — Vandal for its mobility and Thief for extraction efficiency. Triage and Recon lead squad play. Rook is banned from Ranked. Check our live tier list for current positions.' },
    ],
  },
  weapons: {
    tag: 'weapon-guide',
    label: 'WEAPON GUIDES',
    color: '#ff8800',
    title: 'Marathon Weapon Guides — Per-Weapon Analysis, Stats & Matchups',
    description: 'Complete Marathon weapon guides. Fire rate analysis, range testing, ammo efficiency, recoil patterns, and matchup tips for every weapon in the game.',
    keywords: 'Marathon weapon guide, Marathon best weapons, Marathon weapon tier list, Marathon weapon stats, Marathon gun guide, Marathon SMG guide, Marathon assault rifle guide, Marathon shotgun guide, Marathon sniper guide, Marathon weapon tips',
    h1: 'MARATHON WEAPON GUIDES',
    subhead: 'Per-weapon analysis, fire rate breakdowns, ammo efficiency, and matchup notes. Pick the right gun for your build and your range.',
    related: [
      { href: '/builds',  label: 'BUILD LAB',      desc: 'Full weapon arsenal',     color: '#ff8800' },
      { href: '/meta',    label: 'META TIER LIST', desc: 'Live weapon rankings',    color: '#00d4ff' },
      { href: '/advisor', label: 'BUILD ADVISOR',  desc: 'Weapon pairings',         color: '#ff8800' },
    ],
    faqs: [
      { q: 'What is the best weapon in Marathon?', a: 'Weapon strength depends on range and shell pairing. The WSTR Combat Shotgun is consistently S-tier at close range, the M77 Assault Rifle is the most forgiving mid-range pick, and the Stryder M1T excels at long range. Our live tier list ranks every weapon by current meta viability.' },
      { q: 'How many weapons are in Marathon?', a: 'Marathon features dozens of weapons across categories including SMGs, assault rifles, shotguns, snipers, DMRs, and specialty weapons. Weapons come in 6 rarity tiers — Standard, Enhanced, Deluxe, Superior, Prestige, and Contraband.' },
      { q: 'What weapons are banned from Marathon Ranked?', a: 'Certain weapons are flagged as not ranked-viable due to balance issues. These are marked with warnings across our build pages. Check our weapon arsenal for current ranked viability on every gun.' },
    ],
  },
  mods: {
    tag: 'mod-guide',
    label: 'MOD GUIDES',
    color: '#ff2222',
    title: 'Marathon Mod Guides — Mod Combinations & Slot Analysis',
    description: 'Marathon mod breakdowns. Learn which mods stack, which slots matter most, and how to build mod combinations that transform your shell and weapon performance.',
    keywords: 'Marathon mod guide, Marathon best mods, Marathon mod combinations, Marathon weapon mods, Marathon shell mods, Marathon mod slots, Marathon Prestige mods, Marathon Superior mods, Marathon mod stacking',
    h1: 'MARATHON MOD GUIDES',
    subhead: 'Mod slot analysis, best combinations, and synergies that turn mediocre loadouts into S-tier builds. Covers every mod rarity from Standard to Prestige.',
    related: [
      { href: '/builds',  label: 'BUILD LAB',     desc: 'Meta mods showcase',     color: '#ff8800' },
      { href: '/advisor', label: 'BUILD ADVISOR', desc: 'Get modded loadouts',    color: '#ff8800' },
      { href: '/factions', label: 'FACTIONS',     desc: 'Faction-locked mods',    color: '#ffd700' },
    ],
    faqs: [
      { q: 'What are the best mods in Marathon?', a: 'Top-tier mods are Superior and Prestige rarity — check our Meta Mods showcase for current picks. Stack damage, handling, and stability mods on your primary weapon, and recovery/resistance mods on your shell. Faction-locked mods like those from Traxus and Arachne are often build-defining.' },
      { q: 'How do mod slots work in Marathon?', a: 'Each shell and weapon has a fixed number of mod slots. Weapons typically have 3-4 mod slots depending on rarity, while shells have separate slots for core, implant, and mod. Higher rarities unlock more slots and stronger mod effects.' },
      { q: 'Do mods stack in Marathon?', a: 'Most mods stack additively — two 10% damage mods give 20% total. Some mods have diminishing returns or conditional stacking. Our mod guides cover stacking rules for every mod type.' },
    ],
  },
  extraction: {
    tag: 'extraction',
    label: 'EXTRACTION',
    color: '#00d4ff',
    title: 'Marathon Extraction Guides — Exfil Routes, Timing & Loot Strategy',
    description: 'Marathon extraction strategy. Escape routes, exfil timing windows, loot prioritization, and tactics for surviving the last 60 seconds of every match.',
    keywords: 'Marathon extraction guide, Marathon exfil guide, Marathon extraction strategy, Marathon exfil tips, Marathon extraction points, Marathon loot strategy, Marathon survival guide, Marathon end game, Marathon exfil timing',
    h1: 'MARATHON EXTRACTION STRATEGY',
    subhead: 'Escape routes, timing windows, loot prioritization, and exfil tactics. Learn to survive the most dangerous part of every Marathon match — the last 60 seconds.',
    related: [
      { href: '/intel/ghost', label: 'GHOST INTEL',      desc: 'Community patterns',     color: '#00ff88' },
      { href: '/ranked',      label: 'RANKED HUB',       desc: 'Queue extraction intel', color: '#ffd700' },
      { href: '/guides/shells/thief', label: 'THIEF GUIDE', desc: 'The exfil specialist', color: '#ffd700' },
    ],
    faqs: [
      { q: 'How do you extract successfully in Marathon?', a: 'Plan your exfil from match start — know your escape points before committing to fights. Prioritize Tag Chips and high-value loot early. Avoid late-match combat unless you have clear positioning. Always leave with enough health and ammo to contest the extraction zone. Don\'t be greedy.' },
      { q: 'When should you extract in Marathon?', a: 'Extract when you\'ve hit your loot target or when match timer drops below 90 seconds. Waiting longer risks losing everything to a contest at the exfil. A safe B-grade run beats a failed S-grade attempt every time.' },
      { q: 'What is the best shell for extraction in Marathon?', a: 'Thief is built for extraction — Pickpocket Drone loots passively and Grapple Device escapes contested zones. Vandal\'s jump jets make it a strong second pick for repositioning to alternate exits when your primary is compromised.' },
    ],
  },
  beginner: {
    tag: 'beginner',
    label: 'BEGINNER',
    color: '#00ff41',
    title: 'Marathon Beginner Guide — New Runner Tips, Basics & First Builds',
    description: 'New to Marathon? Start here. Core mechanics, first builds, survival basics, and everything a new Runner needs to know before dropping into their first match.',
    keywords: 'Marathon beginner guide, Marathon for beginners, how to play Marathon, Marathon new player, Marathon basics, Marathon tutorial, Marathon first build, Marathon starter tips, Marathon new Runner guide',
    h1: 'MARATHON BEGINNER GUIDES',
    subhead: 'New Runner essentials. Core mechanics, survival basics, first builds, and the do\'s and don\'ts every new player should know before their first drop.',
    related: [
      { href: '/shells',  label: 'SHELL DATABASE', desc: 'Learn the shells',     color: '#00d4ff' },
      { href: '/advisor', label: 'BUILD ADVISOR',  desc: 'Start with a real build', color: '#ff8800' },
      { href: '/guides/extraction', label: 'EXTRACTION 101', desc: 'Learn to exfil safely', color: '#00d4ff' },
    ],
    faqs: [
      { q: 'Is Marathon hard for beginners?', a: 'Marathon has a learning curve due to its extraction-shooter mechanics, but new Runners can thrive by focusing on survival over kills. Start with Triage or Rook, learn one map thoroughly, and prioritize exfiltrating with any loot over attempting hero plays.' },
      { q: 'What should you do first in Marathon?', a: 'Complete the tutorial, then spend your first 5-10 matches in Casual mode learning map layouts and extraction points. Don\'t jump into Ranked until you can reliably exfil with some loot. Pick one shell and master it before experimenting.' },
      { q: 'What should you NOT do as a beginner in Marathon?', a: 'Don\'t engage in every fight you see — extraction shooters reward picking battles, not winning every one. Don\'t ignore the map timer. Don\'t hoard loot you can\'t carry out. And never fight with low ammo or health when extraction is available.' },
    ],
  },
  progression: {
    tag: 'progression',
    label: 'PROGRESSION',
    color: '#ffffff',
    title: 'Marathon Progression Guide — Faction Paths & Upgrade Priorities',
    description: 'Marathon progression paths. Faction rank priorities, credit farming, material farming, and seasonal upgrade order. Maximize your time and hit your build goals fastest.',
    keywords: 'Marathon progression guide, Marathon faction ranks, Marathon leveling guide, Marathon credit farming, Marathon material farming, Marathon upgrade priority, Marathon seasonal progression, Marathon faction priority, Marathon how to level up',
    h1: 'MARATHON PROGRESSION GUIDES',
    subhead: 'Faction rank priorities, credit farming routes, material farming, and seasonal upgrade order. Hit your build goals faster by optimizing what you grind and when.',
    related: [
      { href: '/factions', label: 'FACTION INTEL', desc: 'All 6 factions',           color: '#ffd700' },
      { href: '/advisor',  label: 'BUILD ADVISOR', desc: 'Your build goal',          color: '#ff8800' },
      { href: '/ranked',   label: 'RANKED HUB',    desc: 'Seasonal rewards',         color: '#ffd700' },
    ],
    faqs: [
      { q: 'Which faction should you prioritize first in Marathon?', a: 'Priority depends on your target build. Traxus for weapon mods, Arachne for melee/combat implants, Cyberacme for extraction and loot bonuses. Our Shell Faction Advisor recommends the best faction based on your shell pick.' },
      { q: 'How do you farm credits fast in Marathon?', a: 'Focus Ranked matches when open — they pay more per run than Casual. Complete weekly faction contracts first (highest payout). Extract consistently with any loot rather than chasing perfect runs. Tag Chips auto-convert to credits on exfil.' },
      { q: 'What should you upgrade first in Marathon?', a: 'Upgrade your main shell\'s abilities first (Prime + Tactical unlocks). Then focus on weapon mods for your go-to primary. Save materials for Superior and Prestige gear rather than over-investing in Standard or Enhanced items.' },
    ],
  },
  maps: {
    tag: 'map-guide',
    label: 'MAP INTEL',
    color: '#888888',
    title: 'Marathon Map Guides — POIs, Extraction Points & Zone Intel',
    description: 'Marathon map intel. Zone-by-zone breakdowns, points of interest, extraction points, loot hotspots, and rotation patterns for every Marathon map.',
    keywords: 'Marathon map guide, Marathon map intel, Marathon POI guide, Marathon extraction points, Marathon loot locations, Marathon zones, Marathon map rotations, Marathon map tips',
    h1: 'MARATHON MAP GUIDES',
    subhead: 'Zone-by-zone knowledge. POIs, extraction points, loot hotspots, and rotation patterns. The difference between a lost run and a clean exfil is knowing the map better than the enemy.',
    related: [
      { href: '/guides/extraction', label: 'EXTRACTION STRATEGY', desc: 'Exfil-specific tactics', color: '#00d4ff' },
      { href: '/intel/ghost',       label: 'GHOST INTEL',        desc: 'Community map tips',    color: '#00ff88' },
      { href: '/ranked',            label: 'RANKED HUB',         desc: 'Zone rotations',        color: '#ffd700' },
    ],
    faqs: [
      { q: 'How many maps are in Marathon?', a: 'Marathon features multiple distinct zones, each with unique POIs, extraction points, and environmental hazards. Zones rotate through Ranked playlists, so knowing all of them increases your competitive ceiling.' },
      { q: 'How do you learn Marathon maps fast?', a: 'Pick one map and run it exclusively for 10+ matches in Casual. Focus on memorizing extraction point locations and the most common rotation paths. Watch high-level streamers play that specific map to see pro-level positioning.' },
      { q: 'Where are the best loot spots in Marathon?', a: 'High-value loot spawns near major POIs and in contested zones. Risk-reward is real — the best loot is always in the most dangerous areas. Our map intel guides cover loot density and extraction safety per zone.' },
    ],
  },
};

// ─── CONSTANTS ──────────────────────────────────────────────
const BG = '#121418';
const CARD_BG = '#1a1d24';
const DEEP_BG = '#0e1014';
const BORDER = '#22252e';
const PURPLE = '#9b5de5';

// ─── STATIC PARAMS (pre-render all 8 categories at build) ──
export function generateStaticParams() {
  return Object.keys(CATEGORIES).map(function(cat) { return { category: cat }; });
}

// ─── METADATA ───────────────────────────────────────────────
export async function generateMetadata({ params }) {
  var resolved = await params;
  var cat = CATEGORIES[resolved.category];
  if (!cat) return { title: 'Not Found' };

  return {
    title: cat.title + ' | CyberneticPunks',
    description: cat.description,
    keywords: cat.keywords,
    openGraph: {
      title: cat.title,
      description: cat.description,
      url: 'https://cyberneticpunks.com/guides/' + resolved.category,
      siteName: 'CyberneticPunks',
      type: 'website',
      images: [{ url: 'https://cyberneticpunks.com/og-image.png', width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      site: '@Cybernetic87250',
      title: cat.title,
      description: cat.description,
    },
    alternates: { canonical: 'https://cyberneticpunks.com/guides/' + resolved.category },
  };
}

// ─── HELPERS ────────────────────────────────────────────────
function readTime(body) {
  if (!body) return '1 min';
  return Math.max(1, Math.round(body.split(' ').length / 200)) + ' min read';
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  var hours = Math.floor((Date.now() - new Date(dateStr).getTime()) / 3600000);
  if (hours < 1) return 'just now';
  if (hours < 24) return hours + 'h ago';
  return Math.floor(hours / 24) + 'd ago';
}

function GuideCard({ guide, cat }) {
  var rt = readTime(guide.body);
  var bodyPreview = (guide.body || '').replace(/\*\*/g, '').replace(/#+\s/g, '').slice(0, 110);
  return (
    <Link href={'/intel/' + guide.slug} className="gc-card" style={{ textDecoration: 'none', background: CARD_BG, border: '1px solid ' + BORDER, borderLeft: '2px solid ' + cat.color, borderRadius: '0 2px 2px 0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {guide.thumbnail && (
        <div style={{ position: 'relative', height: 110, overflow: 'hidden' }}>
          <img src={guide.thumbnail} alt={guide.headline} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 30%, ' + CARD_BG + ')' }} />
        </div>
      )}
      <div style={{ padding: '12px 14px', flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: 'monospace', fontSize: 8, color: cat.color, letterSpacing: 2, fontWeight: 700 }}>{cat.label}</span>
          <span style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.25)', letterSpacing: 1, fontWeight: 700 }}>{timeAgo(guide.created_at)}</span>
        </div>
        <h3 style={{ fontFamily: 'Orbitron, monospace', fontSize: 12, fontWeight: 800, color: '#fff', margin: 0, lineHeight: 1.35 }}>{guide.headline}</h3>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, margin: 0, lineHeight: 1.5, flex: 1 }}>{bodyPreview}...</p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid ' + BORDER, paddingTop: 8, marginTop: 4 }}>
          <span style={{ fontFamily: 'monospace', fontSize: 8, color: cat.color, letterSpacing: 1, fontWeight: 700 }}>READ GUIDE →</span>
          <span style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, fontWeight: 700 }}>{rt}</span>
        </div>
      </div>
    </Link>
  );
}

// ─── PAGE ───────────────────────────────────────────────────
export default async function CategoryPage({ params }) {
  var resolved = await params;
  var cat = CATEGORIES[resolved.category];
  if (!cat) notFound();

  var [guidesRes, dexterRes, nexusRes] = await Promise.all([
    supabase
      .from('feed_items')
      .select('id, headline, body, slug, tags, thumbnail, created_at, ce_score, editor')
      .eq('is_published', true)
      .contains('tags', [cat.tag])
      .order('created_at', { ascending: false })
      .limit(30),
    supabase
      .from('feed_items')
      .select('id, headline, slug, ce_score, created_at')
      .eq('editor', 'DEXTER')
      .eq('is_published', true)
      .order('ce_score', { ascending: false })
      .limit(3),
    supabase
      .from('feed_items')
      .select('id, headline, slug, ce_score, created_at')
      .eq('editor', 'NEXUS')
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(3),
  ]);

  var allGuides = guidesRes.data || [];
  var dexterBuilds = dexterRes.data || [];
  var nexusMeta = nexusRes.data || [];

  // Split into top scored + recent
  var topGuides = [...allGuides].sort(function(a, b) { return (b.ce_score || 0) - (a.ce_score || 0); }).slice(0, 3);
  var topIds = new Set(topGuides.map(function(g) { return g.id; }));
  var recentGuides = allGuides.filter(function(g) { return !topIds.has(g.id); });

  var lastUpdated = allGuides[0]?.created_at || null;

  // Structured data
  var breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home',   item: 'https://cyberneticpunks.com' },
      { '@type': 'ListItem', position: 2, name: 'Guides', item: 'https://cyberneticpunks.com/guides' },
      { '@type': 'ListItem', position: 3, name: cat.label, item: 'https://cyberneticpunks.com/guides/' + resolved.category },
    ],
  };

  var faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: cat.faqs.map(function(f) {
      return { '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } };
    }),
  };

  var itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: cat.title,
    description: cat.description,
    numberOfItems: allGuides.length,
    itemListElement: allGuides.slice(0, 10).map(function(g, i) {
      return { '@type': 'ListItem', position: i + 1, url: 'https://cyberneticpunks.com/intel/' + g.slug, name: g.headline };
    }),
  };

  return (
    <main style={{ background: BG, minHeight: '100vh', color: '#fff', paddingTop: 48 }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      {allGuides.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }} />}

      <style>{`
        .gc-card       { transition: background 0.12s, border-color 0.12s; }
        .gc-card:hover { background: #1e2228 !important; }
        .gc-link:hover { background: #1e2228 !important; }
      `}</style>

      {/* ══ BREADCRUMB ══════════════════════════════════════ */}
      <nav aria-label="Breadcrumb" style={{ padding: '12px 24px', maxWidth: 1200, margin: '0 auto' }}>
        <ol style={{ display: 'flex', gap: 8, fontFamily: 'monospace', fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, listStyle: 'none', padding: 0, margin: 0, flexWrap: 'wrap', fontWeight: 700 }}>
          <li><Link href="/" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>HOME</Link></li>
          <li>/</li>
          <li><Link href="/guides" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>GUIDES</Link></li>
          <li>/</li>
          <li style={{ color: cat.color }}>{cat.label}</li>
        </ol>
      </nav>

      {/* ══ HERO ════════════════════════════════════════════ */}
      <section style={{ padding: '24px 24px 32px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, color: PURPLE, background: 'rgba(155,93,229,0.08)', border: '1px solid rgba(155,93,229,0.3)', borderRadius: 2, padding: '3px 10px', letterSpacing: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: PURPLE }} />
            ◎ MIRANDA · FIELD GUIDES
          </span>
          <span style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, color: cat.color, background: cat.color + '14', border: '1px solid ' + cat.color + '40', borderRadius: 2, padding: '3px 10px', letterSpacing: 2 }}>
            {cat.label}
          </span>
          {lastUpdated && (
            <span style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.04)', border: '1px solid ' + BORDER, borderRadius: 2, padding: '3px 10px', letterSpacing: 2 }}>
              UPDATED {timeAgo(lastUpdated).toUpperCase()}
            </span>
          )}
        </div>

        <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: 'clamp(2rem, 5vw, 3.2rem)', fontWeight: 900, letterSpacing: 1, lineHeight: 1.05, margin: '0 0 16px' }}>
          <span style={{ color: cat.color }}>{cat.h1}</span>
        </h1>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, maxWidth: 700, marginBottom: 20 }}>
          {cat.subhead}
        </p>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', lineHeight: 1.6, maxWidth: 700, marginBottom: 0 }}>
          <strong style={{ color: '#fff' }}>{allGuides.length}</strong> guide{allGuides.length !== 1 ? 's' : ''} in this category, updated every 6 hours by MIRANDA and the autonomous editorial system.
        </p>
      </section>

      {/* ══ TOP GUIDES (by CE score) ════════════════════════ */}
      {topGuides.length > 0 && (
        <section style={{ padding: '0 24px 32px', maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 700, letterSpacing: 3, color: cat.color }}>TOP {cat.label}</span>
            <div style={{ flex: 1, height: 1, background: BORDER }} />
            <span style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.25)', letterSpacing: 1, fontWeight: 700 }}>BY SCORE</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 6 }}>
            {topGuides.map(function(g) { return <GuideCard key={g.id} guide={g} cat={cat} />; })}
          </div>
        </section>
      )}

      {/* ══ ALL GUIDES (recent) ═════════════════════════════ */}
      <section style={{ padding: '0 24px 40px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 700, letterSpacing: 3, color: 'rgba(255,255,255,0.25)' }}>
            {recentGuides.length > 0 ? 'MORE ' + cat.label : 'NO GUIDES YET'}
          </span>
          <div style={{ flex: 1, height: 1, background: BORDER }} />
          {recentGuides.length > 0 && <span style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.25)', letterSpacing: 1, fontWeight: 700 }}>{recentGuides.length} GUIDES</span>}
        </div>

        {recentGuides.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 6 }}>
            {recentGuides.map(function(g) { return <GuideCard key={g.id} guide={g} cat={cat} />; })}
          </div>
        ) : (
          topGuides.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 24px', background: CARD_BG, border: '1px solid ' + BORDER, borderRadius: 2 }}>
              <div style={{ fontSize: 28, color: cat.color, marginBottom: 12, opacity: 0.4 }}>◎</div>
              <div style={{ fontFamily: 'monospace', fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: 3, fontWeight: 700, marginBottom: 10 }}>
                NO {cat.label} YET
              </div>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', maxWidth: 420, margin: '0 auto', lineHeight: 1.5 }}>
                MIRANDA is working on {cat.label.toLowerCase()}. Check back in a few cycles — new content drops every 6 hours.
              </p>
              <Link href="/guides" style={{ display: 'inline-block', marginTop: 16, fontFamily: 'monospace', fontSize: 10, color: PURPLE, letterSpacing: 2, textDecoration: 'none', fontWeight: 700 }}>
                ← ALL GUIDES
              </Link>
            </div>
          )
        )}
      </section>

      {/* ══ FAQ (SEO) ═══════════════════════════════════════ */}
      <section style={{ padding: '0 24px 40px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 700, letterSpacing: 3, color: 'rgba(255,255,255,0.25)' }}>FREQUENTLY ASKED</span>
          <div style={{ flex: 1, height: 1, background: BORDER }} />
          <span style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.25)', letterSpacing: 1, fontWeight: 700 }}>{cat.faqs.length} QUESTIONS</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 6 }}>
          {cat.faqs.map(function(faq, i) {
            return (
              <div key={i} style={{ background: CARD_BG, border: '1px solid ' + BORDER, borderLeft: '2px solid ' + cat.color, borderRadius: '0 2px 2px 0', padding: '14px 16px' }}>
                <h3 style={{ fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 700, color: '#fff', margin: '0 0 8px', lineHeight: 1.35 }}>{faq.q}</h3>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, margin: 0 }}>{faq.a}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ══ RELATED INTEL ═══════════════════════════════════ */}
      {(dexterBuilds.length > 0 || nexusMeta.length > 0) && (
        <section style={{ padding: '0 24px 40px', maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 700, letterSpacing: 3, color: 'rgba(255,255,255,0.25)' }}>RELATED INTEL</span>
            <div style={{ flex: 1, height: 1, background: BORDER }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 10 }}>
            {dexterBuilds.length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 9, color: '#ff8800', letterSpacing: 2, fontWeight: 700 }}>⬢ DEXTER BUILDS</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {dexterBuilds.map(function(b) {
                    return (
                      <Link key={b.id} href={'/intel/' + b.slug} className="gc-link" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: CARD_BG, border: '1px solid ' + BORDER, borderLeft: '2px solid #ff8800', borderRadius: '0 2px 2px 0', textDecoration: 'none' }}>
                        <div style={{ flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.75)', lineHeight: 1.35 }}>{b.headline}</div>
                        {b.ce_score > 0 && <span style={{ fontFamily: 'monospace', fontSize: 9, color: '#ff8800', background: 'rgba(255,136,0,0.14)', border: '1px solid rgba(255,136,0,0.3)', borderRadius: 2, padding: '1px 6px', fontWeight: 800 }}>{b.ce_score}</span>}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {nexusMeta.length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 9, color: '#00d4ff', letterSpacing: 2, fontWeight: 700 }}>⬡ NEXUS META</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {nexusMeta.map(function(m) {
                    return (
                      <Link key={m.id} href={'/intel/' + m.slug} className="gc-link" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: CARD_BG, border: '1px solid ' + BORDER, borderLeft: '2px solid #00d4ff', borderRadius: '0 2px 2px 0', textDecoration: 'none' }}>
                        <div style={{ flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.75)', lineHeight: 1.35 }}>{m.headline}</div>
                        {m.ce_score > 0 && <span style={{ fontFamily: 'monospace', fontSize: 9, color: '#00d4ff', background: 'rgba(0,212,255,0.14)', border: '1px solid rgba(0,212,255,0.3)', borderRadius: 2, padding: '1px 6px', fontWeight: 800 }}>{m.ce_score}</span>}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ══ CTA ═════════════════════════════════════════════ */}
      <section style={{ padding: '0 24px 64px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ background: CARD_BG, border: '1px solid ' + BORDER, borderLeft: '3px solid ' + cat.color, borderRadius: '0 2px 2px 0', padding: 24, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: 'monospace', fontSize: 9, color: cat.color, letterSpacing: 3, fontWeight: 700, marginBottom: 8 }}>EXPLORE FURTHER</div>
            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 18, fontWeight: 900, color: '#fff', letterSpacing: 1, lineHeight: 1.1, marginBottom: 10 }}>
              BEYOND<br /><span style={{ color: cat.color }}>{cat.label}.</span>
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>
              {cat.label} pairs with other systems across the site. Jump to the resource that matches your next move.
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {cat.related.map(function(item) {
              return (
                <Link key={item.href} href={item.href} className="gc-link" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: CARD_BG, border: '1px solid ' + BORDER, borderLeft: '2px solid ' + item.color, borderRadius: '0 2px 2px 0', textDecoration: 'none' }}>
                  <div>
                    <div style={{ fontFamily: 'monospace', fontSize: 10, color: item.color, letterSpacing: 1, fontWeight: 700 }}>{item.label}</div>
                    <div style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, marginTop: 2, fontWeight: 700 }}>{item.desc}</div>
                  </div>
                  <span style={{ color: item.color, opacity: 0.5, fontSize: 13 }}>→</span>
                </Link>
              );
            })}
            <Link href="/guides" className="gc-link" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: CARD_BG, border: '1px solid ' + BORDER, borderLeft: '2px solid ' + PURPLE, borderRadius: '0 2px 2px 0', textDecoration: 'none' }}>
              <div>
                <div style={{ fontFamily: 'monospace', fontSize: 10, color: PURPLE, letterSpacing: 1, fontWeight: 700 }}>◎ ALL GUIDES</div>
                <div style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, marginTop: 2, fontWeight: 700 }}>Back to the guides hub</div>
              </div>
              <span style={{ color: PURPLE, opacity: 0.5, fontSize: 13 }}>←</span>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}