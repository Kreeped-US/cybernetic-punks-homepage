// app/shells/[slug]/page.js
//
// FIXED May 15, 2026: Hardcoded shell slugs in generateStaticParams to
// avoid Supabase call at build time. generateStaticParams runs during
// Next.js 16 build before env vars are populated, so the lazy-init
// Proxy in lib/supabase.js throws "supabaseUrl is required". Hardcoding
// keeps static pre-rendering for SEO. Add new shells here (Sentinel
// post-May 25) when added to shell_stats.
//
// SEO PASS June 1, 2026:
// - Title now leads with "Marathon [Shell] Guide" (literal search pattern)
//   and drops the redundant '| CyberneticPunks' suffix — the layout's
//   title.template appends it automatically.
// - Replaced '--' double-hyphen with real em-dash (—) throughout titles
//   and descriptions. Double-hyphens render as two literal hyphens in
//   Google search results.
// - Description tightened, leads with "Marathon [Shell] guide" instead
//   of "Complete [Shell] guide for Marathon" generic phrasing.
// - Added three JSON-LD schemas per shell page: BreadcrumbList, FAQPage
//   (built from the same faqItems we already build for the client), and
//   WebPage with dateModified. Across 7 shells that's 21 new structured-
//   data instances.

import { supabase } from '../../../lib/supabase';
import { resolveSession } from '@/lib/auth/resolveSession';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import CoachCTA from '@/components/CoachCTA';
import ShellDetailClient from './ShellDetailClient';

export const dynamic = 'force-dynamic';

const SHELL_COLORS = {
  assassin: '#cc44ff', destroyer: '#ff3333', recon: '#00d4ff',
  rook: '#888888', thief: '#ffd700', triage: '#00ff88', vandal: '#ff8800',
};

const SHELL_SYMBOLS = {
  assassin: '*', destroyer: '#', recon: '+',
  rook: '=', thief: '%', triage: 'o', vandal: '^',
};

export async function generateStaticParams() {
  // Hardcoded to avoid Supabase call at build time.
  // Add new shells here when adding to shell_stats table.
  return [
    { slug: 'assassin' },
    { slug: 'destroyer' },
    { slug: 'recon' },
    { slug: 'rook' },
    { slug: 'thief' },
    { slug: 'triage' },
    { slug: 'vandal' },
  ];
}

export async function generateMetadata({ params }) {
  var slug = (await params).slug;
  var shellName = slug.charAt(0).toUpperCase() + slug.slice(1);
  var { data: shell } = await supabase.from('shell_stats').select('name, role, lore_tagline, best_for').eq('name', shellName).single();
  if (!shell) return { title: 'Shell Not Found' };

  // Title leads with "Marathon [Shell] Guide" — matches literal search pattern.
  // No '| CyberneticPunks' suffix here; layout's title.template appends it.
  var title = 'Marathon ' + shell.name + ' Guide — Builds, Loadouts, Tier List & Stats';

  // Description: lore_tagline if available, otherwise generic. Both use a real
  // em-dash and lead with "Marathon [Shell] guide" — the actual search term.
  var desc = shell.lore_tagline
    ? shell.lore_tagline + ' Marathon ' + shell.name + ' guide — stats, abilities, cores, implants, and tier ranking.'
    : 'Marathon ' + shell.name + ' guide — stats, abilities, best cores, implants, and tier rankings. Updated throughout the day.';

  return {
    title: title,
    description: desc,
    openGraph: {
      // OG title keeps '| CyberneticPunks' for social-share recognizability
      title: title + ' | CyberneticPunks',
      description: desc,
      url: 'https://cyberneticpunks.com/shells/' + slug,
      siteName: 'CyberneticPunks',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      site: '@Cybernetic87250',
      title: 'Marathon ' + shell.name + ' Guide — Builds, Loadouts & Tier List',
      description: 'Stats, abilities, builds, and tier ranking for the ' + shell.name + ' shell.',
    },
    alternates: { canonical: 'https://cyberneticpunks.com/shells/' + slug },
  };
}

export default async function ShellHubPage({ params }) {
  var slug = (await params).slug;
  var shellName = slug.charAt(0).toUpperCase() + slug.slice(1);

  var [shellRes, coresRes, implantsRes, metaTierRes, articlesRes, allShellsRes, nexusTakeRes, dexterPicksRes] = await Promise.all([
    supabase.from('shell_stats').select('*').eq('name', shellName).single(),
    supabase.from('core_stats').select('name, rarity, effect_desc, ability_type, ranked_viable, required_runner').or('required_runner.eq.' + shellName + ',required_runner.is.null').order('rarity', { ascending: false }),
    supabase.from('implant_stats').select('name, slot_type, rarity, description, passive_name, passive_desc, stat_1_label, stat_1_value, stat_2_label, stat_2_value').or('required_runner.eq.' + shellName + ',required_runner.is.null').order('rarity', { ascending: false }),
    supabase.from('meta_tiers').select('tier, trend, note, ranked_note, updated_at').eq('name', shellName).eq('type', 'shell').maybeSingle(),

    // {shellName} Intel — excludes NEXUS and DEXTER (dedicated panels above)
    supabase
      .from('feed_items')
      .select('id, headline, slug, tags, ce_score, editor, thumbnail, created_at')
      .eq('is_published', true)
      .eq('game_slug', 'marathon')
      .contains('tags', [shellName.toLowerCase()])
      .in('editor', ['CIPHER', 'GHOST', 'MIRANDA'])
      .order('created_at', { ascending: false })
      .limit(6),

    supabase.from('shell_stats').select('name, role, image_filename'),

    // NEXUS's Take — latest 2 NEXUS articles about this shell
    supabase
      .from('feed_items')
      .select('id, headline, slug, body, ce_score, thumbnail, created_at')
      .eq('editor', 'NEXUS')
      .eq('is_published', true)
      .eq('game_slug', 'marathon')
      .contains('tags', [shellName.toLowerCase()])
      .order('created_at', { ascending: false })
      .limit(2),

    // DEXTER's Picks — top 3 DEXTER builds for this shell, sorted by ce_score
    supabase
      .from('feed_items')
      .select('id, headline, slug, body, ce_score, thumbnail, created_at')
      .eq('editor', 'DEXTER')
      .eq('is_published', true)
      .eq('game_slug', 'marathon')
      .contains('tags', [shellName.toLowerCase()])
      .order('ce_score', { ascending: false })
      .limit(3),
  ]);

  var shell = shellRes.data;
  if (!shell) notFound();

  // Viewer match — check if logged-in user's favorite_shell matches this page
  var session = await resolveSession();
  var playerId = session ? session.playerProfileId : null;
  var viewerMatches = false;
  if (playerId) {
    try {
      var { data: player } = await supabase
        .from('player_profiles')
        .select('favorite_shell')
        .eq('id', playerId)
        .single();
      if (player && player.favorite_shell === shellName) viewerMatches = true;
    } catch (_) {}
  }

  // Pick rate for this shell
  var pickPct = null;
  try {
    var [{ count: totalCount }, { count: thisCount }] = await Promise.all([
      supabase.from('player_profiles').select('*', { count: 'exact', head: true }).not('favorite_shell', 'is', null),
      supabase.from('player_profiles').select('*', { count: 'exact', head: true }).eq('favorite_shell', shellName),
    ]);
    if (totalCount >= 10) {
      pickPct = Math.round((thisCount / totalCount) * 100);
    }
  } catch (_) {}

  var shellCores = (coresRes.data || []).filter(function(c) { return c.required_runner; }).slice(0, 6);
  var universalCores = (coresRes.data || []).filter(function(c) { return !c.required_runner; }).slice(0, 4);
  var metaTier = metaTierRes.data;
  var articles = articlesRes.data || [];
  var allShells = allShellsRes.data || [];
  var nexusTake = nexusTakeRes.data || [];
  var dexterPicks = dexterPicksRes.data || [];

  function parseList(val) {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    try { var p = JSON.parse(val); if (Array.isArray(p)) return p; } catch (_) {}
    return String(val).split(',').map(function(s) { return s.trim(); }).filter(Boolean);
  }

  var strengths = parseList(shell.strengths);
  var weaknesses = parseList(shell.weaknesses);
  var counteredBy = parseList(shell.countered_by);
  var synergizes = parseList(shell.synergizes_with);

  var allShellMap = {};
  allShells.forEach(function(s) { allShellMap[s.name.toLowerCase()] = s; });

  var counteredShells = counteredBy.map(function(name) {
    var match = allShellMap[name.toLowerCase()];
    return match ? { name: match.name, role: match.role, image_filename: match.image_filename, known: true } : { name: name, known: false };
  });
  var synergyShells = synergizes.map(function(name) {
    var match = allShellMap[name.toLowerCase()];
    return match ? { name: match.name, role: match.role, image_filename: match.image_filename, known: true } : { name: name, known: false };
  });

  var faqItems = [];
  if (metaTier) faqItems.push({ q: 'Is ' + shellName + ' good in Marathon ranked?', a: shellName + ' is currently ' + metaTier.tier + '-Tier in ranked.' + (metaTier.ranked_note ? ' ' + metaTier.ranked_note : '') });
  if (shell.active_ability_name) faqItems.push({ q: 'What is ' + shellName + "'s active ability?", a: shell.active_ability_name + (shell.active_ability_description ? ': ' + shell.active_ability_description : '') });

  // ─── JSON-LD SCHEMAS ────────────────────────────────────────
  // Three schemas per shell page. The faqSchema is built from the same
  // faqItems we already construct for the client, so no duplication of
  // logic — same data, two consumers.

  var breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home',     item: 'https://cyberneticpunks.com' },
      { '@type': 'ListItem', position: 2, name: 'Shells',   item: 'https://cyberneticpunks.com/shells' },
      { '@type': 'ListItem', position: 3, name: shellName + ' Guide', item: 'https://cyberneticpunks.com/shells/' + slug },
    ],
  };

  // dateModified: prefer the meta_tier update timestamp (most recent NEXUS
  // grading) if available, otherwise fall back to the latest article.
  var lastModified = (metaTier && metaTier.updated_at)
    || (nexusTake[0] && nexusTake[0].created_at)
    || (articles[0] && articles[0].created_at)
    || new Date().toISOString();

  var webPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Marathon ' + shellName + ' Guide',
    description: 'Complete guide to the ' + shellName + ' Runner Shell in Marathon — stats, abilities, cores, implants, builds, and tier ranking.',
    url: 'https://cyberneticpunks.com/shells/' + slug,
    dateModified: lastModified,
    about: {
      '@type': 'Thing',
      name: shellName + ' Runner Shell',
      description: shell.lore_tagline || (shellName + ' is a Runner Shell in Marathon, Bungie\'s extraction shooter.'),
    },
    publisher: {
      '@type': 'Organization',
      name: 'CyberneticPunks',
      url:  'https://cyberneticpunks.com',
    },
  };

  var faqSchema = faqItems.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map(function(item) {
      return {
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: { '@type': 'Answer', text: item.a },
      };
    }),
  } : null;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }} />
      {faqSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      )}

      <ShellDetailClient
        shell={shell}
        shellName={shellName}
        slug={slug}
        color={SHELL_COLORS[slug] || '#00ff41'}
        symbol={SHELL_SYMBOLS[slug] || '*'}
        metaTier={metaTier}
        shellCores={shellCores}
        universalCores={universalCores}
        articles={articles}
        strengths={strengths}
        weaknesses={weaknesses}
        counteredShells={counteredShells}
        synergyShells={synergyShells}
        viewerMatches={viewerMatches}
        pickPct={pickPct}
        faqItems={faqItems}
        nexusTake={nexusTake}
        dexterPicks={dexterPicks}
      />
    </>
  );
}