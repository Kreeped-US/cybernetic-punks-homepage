// app/matchups/page.js
//
// Matchup reference hub. shell_stats carries a game-verified matchup matrix
// (countered_by / counter_items / weaknesses, owner-verified in-game S2,
// written 2026-07-17) but had NO reference page -- and ~27 live "how to beat
// [shell]" articles have no canonical to point at. This hub + /matchups/[shell]
// is that canonical. Mirrors app/mods/page.js exactly: force-dynamic SSR,
// static metadata, game_slug='marathon' filter, BreadcrumbList + CollectionPage
// JSON-LD, the shared visible-breadcrumb style, a card grid, Footer.
//
// NOT the article consolidation: the 27-article keeper adjudication is a
// separate step. This page renders the DB matrix only.
//
// ALL 8 SHELLS render, Sentinel included -- its matchup row is game-verified and
// filled, so it belongs here even though /shells' public copy still says "7
// Runners". The shell list is lib/matchups.js SHELLS (shared with the detail
// route and the sitemap), never "whatever shell_stats returns".

import { supabase } from '../../lib/supabase';
import Link from 'next/link';
import Footer from '@/components/Footer';
import {
  MATCHUP_ACCENT,
  SHELLS,
  shellToSlug,
  toArr,
  counterState,
} from '@/lib/matchups';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Marathon Matchups — How to Beat Every Shell (Counters & Tactics)',
  description: 'How to beat every Marathon shell — Assassin, Destroyer, Recon, Rook, Sentinel, Thief, Triage, Vandal. Which shells counter which, plus key counter items, owner-verified in-game.',
  openGraph: {
    title: 'Marathon Matchups — How to Beat Every Shell | CyberneticPunks',
    description: 'Which shells counter which, plus key counter items and tactics — owner-verified in-game for all 8 Marathon shells.',
    url: 'https://cyberneticpunks.com/matchups',
    siteName: 'CyberneticPunks',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    site: '@Cybernetic87250',
    title: 'Marathon Matchups — How to Beat Every Shell',
    description: 'Counters, matchups, and key counter items for all 8 Marathon shells — verified in-game.',
  },
  alternates: { canonical: 'https://cyberneticpunks.com/matchups' },
};

export default async function MatchupsIndexPage() {
  // GAME-SCOPED from the start (matches app/mods/page.js). shell_stats is
  // Marathon-only today, so this filter is a no-op now -- but without it, the day
  // a DMZ shell row lands this hub would mix games under a Marathon title.
  var res = await supabase
    .from('shell_stats')
    .select('name, role, countered_by, counter_items, weaknesses, verified_source, updated_at')
    .eq('game_slug', 'marathon');

  // supabase-js returns query errors in .error and does NOT throw. Build a map by
  // name and drive the render off the shared SHELLS allowlist, so a missing row
  // simply isn't linked rather than crashing the page.
  var byName = {};
  (res.data || []).forEach(function (r) { byName[r.name] = r; });

  var cards = SHELLS.map(function (name) {
    return byName[name] || { name: name, countered_by: [], counter_items: [], verified_source: '' };
  });

  return (
    <main style={{ background: '#121418', minHeight: '100vh', color: '#fff', paddingTop: 48, paddingBottom: 80, fontFamily: 'system-ui, sans-serif' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://cyberneticpunks.com' },
          { '@type': 'ListItem', position: 2, name: 'Matchups', item: 'https://cyberneticpunks.com/matchups' },
        ],
      }) }} />

      <nav aria-label="Breadcrumb" style={{ padding: '12px 24px', maxWidth: 1100, margin: '0 auto' }}>
        <ol style={{ display: 'flex', gap: 8, fontFamily: 'monospace', fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, listStyle: 'none', padding: 0, margin: 0, fontWeight: 700 }}>
          <li><Link href="/" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>HOME</Link></li>
          <li>/</li>
          <li style={{ color: 'var(--red)' }}>MATCHUPS</li>
        </ol>
      </nav>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px' }}>

        {/* Header */}
        <div style={{ padding: '40px 0 28px', borderBottom: '1px solid #1e2028', marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, fontSize: 10, letterSpacing: 2, fontFamily: 'monospace', fontWeight: 700 }}>
            <Link href="/" style={{ color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>HOME</Link>
            <span style={{ color: 'rgba(255,255,255,0.1)' }}>/</span>
            <span style={{ color: MATCHUP_ACCENT }}>MATCHUPS</span>
          </div>
          <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: 'clamp(28px, 4.5vw, 42px)', fontWeight: 900, color: '#fff', letterSpacing: '1px', margin: '0 0 10px', lineHeight: 1.05 }}>
            Marathon <span style={{ color: MATCHUP_ACCENT }}>Matchups</span>
          </h1>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, maxWidth: 720, margin: 0 }}>
            How to beat every shell in Marathon. Each page shows which shells counter it, which items and
            tactics beat it, and what it&apos;s strong against — owner-verified in-game. Pick a shell to see
            its counters.
          </p>
        </div>

        {/* Shell card grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 10 }}>
          {cards.map(function (row) {
            var state = counterState(row);
            var counters = toArr(row.countered_by);
            var slug = shellToSlug(row.name);
            return (
              <Link key={row.name} href={'/matchups/' + slug} style={{ textDecoration: 'none', display: 'block' }}>
                <div style={{ background: '#1a1d24', border: '1px solid #22252e', borderLeft: '3px solid ' + MATCHUP_ACCENT + '88', borderRadius: '0 3px 3px 0', padding: '14px 16px', height: '100%', transition: 'border-color 0.12s' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 16, fontWeight: 800, color: '#fff', letterSpacing: 0.5 }}>
                      {row.name}
                    </span>
                    {row.role && (
                      <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', letterSpacing: 1, textTransform: 'uppercase', textAlign: 'right' }}>{row.role}</span>
                    )}
                  </div>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase' }}>
                    {state === 'has-counters' ? 'Beaten by' : state === 'verified-none' ? 'Counters' : 'Status'}
                  </div>
                  {state === 'has-counters' && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                      {counters.map(function (c) {
                        return (
                          <span key={c} style={{ fontSize: 11, color: MATCHUP_ACCENT, border: '1px solid ' + MATCHUP_ACCENT + '40', background: MATCHUP_ACCENT + '11', padding: '2px 8px', borderRadius: 2, fontWeight: 700, letterSpacing: 0.5 }}>
                            {c === row.name ? c + ' (mirror)' : c}
                          </span>
                        );
                      })}
                    </div>
                  )}
                  {state === 'verified-none' && (
                    <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.5)', lineHeight: 1.45 }}>
                      No hard counter — a low-stakes solo scavenger any geared squad outguns.
                    </div>
                  )}
                  {state === 'pending' && (
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', letterSpacing: 1 }}>
                      ANALYSIS PENDING
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>

        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 24, lineHeight: 1.5, fontFamily: 'monospace', letterSpacing: 0.5 }}>
          Matchup data owner-verified in-game (Season 2). Counters shown are the shells that beat each shell.
        </p>
      </div>

      <Footer />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: 'Marathon Matchups — How to Beat Every Shell',
        description: 'Which shells counter which, plus key counter items and tactics, for all 8 Marathon shells — owner-verified in-game.',
        url: 'https://cyberneticpunks.com/matchups',
        mainEntity: {
          '@type': 'ItemList',
          numberOfItems: SHELLS.length,
          itemListElement: SHELLS.map(function (name, i) {
            return { '@type': 'ListItem', position: i + 1, name: 'How to beat ' + name + ' — Marathon', url: 'https://cyberneticpunks.com/matchups/' + shellToSlug(name) };
          }),
        },
        publisher: { '@type': 'Organization', name: 'CyberneticPunks', url: 'https://cyberneticpunks.com' },
      })}} />
    </main>
  );
}
