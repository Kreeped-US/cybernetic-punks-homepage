// app/shells/page.js
// Marathon Runner Shell Index — links to individual shell hub pages

import { supabase } from '../../lib/supabase';
import Link from 'next/link';

export const revalidate = 3600;

export const metadata = {
  title: 'Marathon Runner Shells — Complete Guide | CyberneticPunks',
  description: 'Every Marathon Runner Shell ranked, analyzed, and broken down. Stats, abilities, cores, implants, and build guides for Assassin, Destroyer, Recon, Rook, Thief, Triage, and Vandal.',
  openGraph: {
    title: 'Marathon Runner Shells — Complete Guide | CyberneticPunks',
    description: 'Stats, abilities, cores, implants, and build guides for every Marathon Runner Shell.',
    url: 'https://cyberneticpunks.com/shells',
  },
  alternates: { canonical: 'https://cyberneticpunks.com/shells' },
};

const SHELL_COLORS = {
  Assassin: '#cc44ff', Destroyer: '#ff3333', Recon: '#00f5ff',
  Rook: '#aaaaaa', Thief: '#ffd700', Triage: '#00ff88', Vandal: '#ff8800',
};

const TIER_COLORS = { S: '#ff0000', A: '#ff8800', B: '#00f5ff', C: '#aaaaaa', D: '#555555' };

export default async function ShellsIndexPage() {
  var [shellsRes, metaTiersRes, articleCountsRes] = await Promise.all([
    supabase.from('shell_stats').select('name, role, base_health, base_shield, prime_ability_name, tactical_ability_name, ranked_tier_solo, ranked_tier_squad, best_for').order('name'),
    supabase.from('meta_tiers').select('name, tier, trend').eq('type', 'shell'),
    supabase.from('feed_items').select('tags').eq('is_published', true),
  ]);

  var shells = shellsRes.data || [];
  var metaShellMap = {};
  (metaTiersRes.data || []).forEach(function(t) { metaShellMap[t.name.toLowerCase()] = t; });

  // Count articles per shell from tags
  var articleCounts = {};
  (articleCountsRes.data || []).forEach(function(a) {
    (a.tags || []).forEach(function(tag) {
      var t = tag.toLowerCase();
      if (articleCounts[t] === undefined) articleCounts[t] = 0;
      articleCounts[t]++;
    });
  });

  var maxHp = Math.max.apply(null, shells.map(function(s) { return s.base_health || 0; }).concat([1]));

  return (
    <main style={{ background: '#030303', minHeight: '100vh', color: '#fff', paddingTop: 96 }}>
      <style>{`
        .shell-hub-card { transition: border-color 0.2s, transform 0.2s; }
        .shell-hub-card:hover { transform: translateY(-3px); }
      `}</style>

      {/* HERO */}
      <section style={{ padding: '40px 20px 48px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: 'rgba(0,245,255,0.5)', letterSpacing: 4, marginBottom: 14 }}>
          MARATHON INTEL — RUNNER SHELLS
        </div>
        <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 900, letterSpacing: 3, margin: '0 0 14px 0', lineHeight: 1.1 }}>
          RUNNER <span style={{ color: '#00f5ff' }}>SHELLS</span>
        </h1>
        <p style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 16, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, maxWidth: 560, marginBottom: 0 }}>
          Every Marathon Runner Shell broken down — stats, abilities, cores, implants, and build guides. Pick your shell, know your role.
        </p>
      </section>

      {/* SHELL GRID */}
      <section style={{ padding: '0 20px 80px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
          {shells.map(function(shell) {
            var color = SHELL_COLORS[shell.name] || '#ff8800';
            var meta = metaShellMap[shell.name.toLowerCase()];
            var displayTier = meta ? meta.tier : shell.ranked_tier_solo;
            var tierColor = TIER_COLORS[displayTier] || '#888';
            var count = articleCounts[shell.name.toLowerCase()] || 0;
            var hpPct = maxHp > 0 ? Math.round((shell.base_health || 0) / maxHp * 100) : 0;
            var shPct = maxHp > 0 ? Math.round((shell.base_shield || 0) / maxHp * 100) : 0;

            return (
              <Link key={shell.name} href={'/shells/' + shell.name.toLowerCase()} className="shell-hub-card"
                style={{ display: 'block', background: '#0a0a0a', border: '1px solid ' + color + '22', borderTop: '3px solid ' + color, borderRadius: 10, textDecoration: 'none', overflow: 'hidden' }}>

                {/* Header */}
                <div style={{ padding: '20px 20px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div>
                      <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 18, fontWeight: 900, color: color, letterSpacing: 2, marginBottom: 4 }}>{shell.name.toUpperCase()}</div>
                      <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 1 }}>{shell.role || ''}</div>
                    </div>
                    {displayTier && (
                      <div style={{ textAlign: 'center', background: tierColor + '14', border: '1px solid ' + tierColor + '44', borderRadius: 5, padding: '6px 12px' }}>
                        <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 22, fontWeight: 900, color: tierColor, lineHeight: 1 }}>{displayTier}</div>
                        <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: 'rgba(255,255,255,0.2)', letterSpacing: 1, marginTop: 2 }}>META</div>
                      </div>
                    )}
                  </div>
                  {shell.best_for && (
                    <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.35)', lineHeight: 1.4 }}>{shell.best_for}</div>
                  )}
                </div>

                {/* Stats */}
                <div style={{ padding: '14px 20px' }}>
                  {shell.base_health && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: '#00ff88', width: 18 }}>HP</span>
                      <div style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: hpPct + '%', background: '#00ff88', borderRadius: 2 }} />
                      </div>
                      <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 10, fontWeight: 700, color: '#00ff88', width: 28, textAlign: 'right' }}>{shell.base_health}</span>
                    </div>
                  )}
                  {shell.base_shield && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: '#00f5ff', width: 18 }}>SH</span>
                      <div style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: shPct + '%', background: '#00f5ff', borderRadius: 2 }} />
                      </div>
                      <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 10, fontWeight: 700, color: '#00f5ff', width: 28, textAlign: 'right' }}>{shell.base_shield}</span>
                    </div>
                  )}

                  {/* Abilities */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                    {shell.prime_ability_name && (
                      <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: color, background: color + '14', border: '1px solid ' + color + '30', borderRadius: 3, padding: '3px 8px', letterSpacing: 1 }}>
                        {shell.prime_ability_name}
                      </span>
                    )}
                    {shell.tactical_ability_name && (
                      <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, padding: '3px 8px', letterSpacing: 1 }}>
                        {shell.tactical_ability_name}
                      </span>
                    )}
                  </div>

                  {/* Footer */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ display: 'flex', gap: 5 }}>
                      {shell.ranked_tier_solo && (
                        <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: TIER_COLORS[shell.ranked_tier_solo] || '#888', background: (TIER_COLORS[shell.ranked_tier_solo] || '#888') + '14', border: '1px solid ' + (TIER_COLORS[shell.ranked_tier_solo] || '#888') + '22', borderRadius: 2, padding: '2px 6px', letterSpacing: 1 }}>
                          SOLO {shell.ranked_tier_solo}
                        </span>
                      )}
                      {shell.ranked_tier_squad && (
                        <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: TIER_COLORS[shell.ranked_tier_squad] || '#888', background: (TIER_COLORS[shell.ranked_tier_squad] || '#888') + '14', border: '1px solid ' + (TIER_COLORS[shell.ranked_tier_squad] || '#888') + '22', borderRadius: 2, padding: '2px 6px', letterSpacing: 1 }}>
                          SQUAD {shell.ranked_tier_squad}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {count > 0 && <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,136,0,0.6)', letterSpacing: 1 }}>{count} ARTICLES</span>}
                      <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: color + '88', letterSpacing: 1 }}>VIEW GUIDE &rarr;</span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: 'Marathon Runner Shells — Complete Guide',
        description: 'Stats, abilities, cores, implants, and build guides for every Marathon Runner Shell.',
        url: 'https://cyberneticpunks.com/shells',
        mainEntity: {
          '@type': 'ItemList',
          itemListElement: shells.map(function(s, i) {
            return { '@type': 'ListItem', position: i + 1, name: s.name + ' — Marathon Runner Shell Guide', url: 'https://cyberneticpunks.com/shells/' + s.name.toLowerCase() };
          }),
        },
      })}} />
    </main>
  );
}
