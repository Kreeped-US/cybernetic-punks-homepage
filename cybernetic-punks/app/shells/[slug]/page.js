// app/shells/[slug]/page.js
import { supabase } from '../../../lib/supabase';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import CoachCTA from '@/components/CoachCTA';
import ShellDetailClient from './ShellDetailClient';

export const revalidate = 300;

const SHELL_COLORS = {
  assassin: '#cc44ff', destroyer: '#ff3333', recon: '#00d4ff',
  rook: '#888888', thief: '#ffd700', triage: '#00ff88', vandal: '#ff8800',
};

const SHELL_SYMBOLS = {
  assassin: '◈', destroyer: '⬢', recon: '◇',
  rook: '▣', thief: '⬠', triage: '◎', vandal: '⬡',
};

export async function generateStaticParams() {
  var { data } = await supabase.from('shell_stats').select('name');
  return (data || []).map(function(s) { return { slug: s.name.toLowerCase() }; });
}

export async function generateMetadata({ params }) {
  var slug = (await params).slug;
  var shellName = slug.charAt(0).toUpperCase() + slug.slice(1);
  var { data: shell } = await supabase.from('shell_stats').select('name, role, lore_tagline, best_for').eq('name', shellName).single();
  if (!shell) return { title: 'Shell Not Found | CyberneticPunks' };
  var desc = shell.lore_tagline
    ? shell.lore_tagline + ' Complete ' + shell.name + ' guide for Marathon — stats, abilities, cores, implants, and ranked build analysis.'
    : 'Complete ' + shell.name + ' guide for Marathon. Stats, abilities, best cores, implants, and ranked build guides — updated every 6 hours by CyberneticPunks.';
  return {
    title: shell.name + ' Guide — Builds, Meta & Tips | CyberneticPunks',
    description: desc,
    openGraph: {
      title: shell.name + ' Guide — Builds, Meta & Tips | CyberneticPunks',
      description: desc,
      url: 'https://cyberneticpunks.com/shells/' + slug,
      images: [{ url: 'https://cyberneticpunks.com/og-image.png', width: 1200, height: 630 }],
    },
    twitter: { card: 'summary_large_image', title: shell.name + ' Guide | CyberneticPunks', images: ['https://cyberneticpunks.com/og-image.png'] },
    alternates: { canonical: 'https://cyberneticpunks.com/shells/' + slug },
  };
}

export default async function ShellHubPage({ params }) {
  var slug = (await params).slug;
  var shellName = slug.charAt(0).toUpperCase() + slug.slice(1);

  var [shellRes, coresRes, implantsRes, metaTierRes, articlesRes, allShellsRes] = await Promise.all([
    supabase.from('shell_stats').select('*').eq('name', shellName).single(),
    supabase.from('core_stats').select('name, rarity, effect_desc, ability_type, ranked_viable, required_runner').or('required_runner.eq.' + shellName + ',required_runner.is.null').order('rarity', { ascending: false }),
    supabase.from('implant_stats').select('name, slot_type, rarity, description, passive_name, passive_desc, stat_1_label, stat_1_value, stat_2_label, stat_2_value').or('required_runner.eq.' + shellName + ',required_runner.is.null').order('rarity', { ascending: false }),
    supabase.from('meta_tiers').select('tier, trend, note, ranked_note').eq('name', shellName).eq('type', 'shell').maybeSingle(),
    supabase.from('feed_items').select('id, headline, slug, tags, ce_score, editor, thumbnail, created_at').eq('is_published', true).contains('tags', [shellName.toLowerCase()]).order('created_at', { ascending: false }).limit(6),
    supabase.from('shell_stats').select('name, role, image_filename'),
  ]);

  var shell = shellRes.data;
  if (!shell) notFound();

  // Viewer match — check if logged-in user's favorite_shell matches this page
  var cookieStore = await cookies();
  var playerId = cookieStore.get('cp_player_id')?.value;
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

  // Resolve counter/synergy references to actual shell data for rich display
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

  return (
    <ShellDetailClient
      shell={shell}
      shellName={shellName}
      slug={slug}
      color={SHELL_COLORS[slug] || '#00ff41'}
      symbol={SHELL_SYMBOLS[slug] || '◈'}
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
    />
  );
}
