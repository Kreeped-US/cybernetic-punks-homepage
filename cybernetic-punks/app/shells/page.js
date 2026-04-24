// app/shells/page.js
import { supabase } from '../../lib/supabase';
import Link from 'next/link';
import ShellsHubClient from './ShellsHubClient';

export const revalidate = 3600;

export const metadata = {
  title: 'Marathon Runner Shells — Complete Guide',
  description: 'Every Marathon Runner Shell ranked, analyzed, and broken down. Stats, abilities, cores, implants, and build guides for Assassin, Destroyer, Recon, Rook, Thief, Triage, and Vandal.',
  openGraph: {
    title: 'Marathon Runner Shells — Complete Guide | CyberneticPunks',
    description: 'Stats, abilities, cores, implants, and build guides for every Marathon Runner Shell.',
    url: 'https://cyberneticpunks.com/shells',
    images: [{ url: 'https://cyberneticpunks.com/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Marathon Runner Shells — CyberneticPunks',
    images: ['https://cyberneticpunks.com/og-image.png'],
  },
  alternates: { canonical: 'https://cyberneticpunks.com/shells' },
};

export default async function ShellsIndexPage() {
  var [shellsRes, metaTiersRes] = await Promise.all([
    supabase.from('shell_stats').select('name, role, lore_tagline, difficulty, base_health, base_shield, base_speed, active_ability_name, passive_ability_name, ranked_tier_solo, ranked_tier_squad, best_for, image_filename').order('name'),
    supabase.from('meta_tiers').select('name, tier, trend').eq('type', 'shell'),
  ]);

  var shells = shellsRes.data || [];
  var metaShellMap = {};
  (metaTiersRes.data || []).forEach(function(t) { metaShellMap[t.name.toLowerCase()] = t; });

  // Fetch pick-rate counts — gate behind 10+ total
  var pickRates = {};
  var totalPicks = 0;
  try {
    var { data: picks } = await supabase
      .from('player_profiles')
      .select('favorite_shell')
      .not('favorite_shell', 'is', null);
    if (picks && picks.length >= 10) {
      totalPicks = picks.length;
      picks.forEach(function(p) {
        if (p.favorite_shell) {
          pickRates[p.favorite_shell] = (pickRates[p.favorite_shell] || 0) + 1;
        }
      });
    }
  } catch (_) {}

  var tierOrder = { S: 0, A: 1, B: 2, C: 3, D: 4, BAN: 5 };
  var sorted = shells.slice().sort(function(a, b) {
    var metaA = metaShellMap[a.name.toLowerCase()];
    var metaB = metaShellMap[b.name.toLowerCase()];
    var tA = metaA ? (tierOrder[metaA.tier] ?? 9) : 9;
    var tB = metaB ? (tierOrder[metaB.tier] ?? 9) : 9;
    return tA - tB;
  });

  // Enrich with meta
  var enriched = sorted.map(function(s) {
    return {
      ...s,
      meta: metaShellMap[s.name.toLowerCase()] || null,
      pickRate: pickRates[s.name] || 0,
    };
  });

  return (
    <main style={{ background: '#121418', minHeight: '100vh', color: '#fff', paddingTop: 48, paddingBottom: 80, fontFamily: 'system-ui, sans-serif' }}>
      <ShellsHubClient shells={enriched} totalPicks={totalPicks} />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: 'Marathon Runner Shells — Complete Guide',
        description: 'Stats, abilities, cores, implants, and build guides for every Marathon Runner Shell.',
        url: 'https://cyberneticpunks.com/shells',
        mainEntity: {
          '@type': 'ItemList',
          itemListElement: sorted.map(function(s, i) {
            return { '@type': 'ListItem', position: i + 1, name: s.name + ' — Marathon Runner Shell Guide', url: 'https://cyberneticpunks.com/shells/' + s.name.toLowerCase() };
          }),
        },
      })}} />
    </main>
  );
}
