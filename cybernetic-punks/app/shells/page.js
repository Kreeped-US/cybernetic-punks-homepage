// app/shells/page.js
import { supabase } from '../../lib/supabase';
import Link from 'next/link';

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

const SHELL_COLORS = {
  Assassin: '#cc44ff', Destroyer: '#ff3333', Recon: '#00f5ff',
  Rook: '#aaaaaa', Thief: '#ffd700', Triage: '#00ff88', Vandal: '#ff8800',
};

const SHELL_SYMBOLS = {
  Assassin: '◈', Destroyer: '⬢', Recon: '◇',
  Rook: '▣', Thief: '⬠', Triage: '◎', Vandal: '⬡',
};

const TIER_COLORS = { S: '#ff0000', A: '#ff8800', B: '#00f5ff', C: '#aaaaaa', D: '#555555', BAN: '#ff0000' };

const DIFFICULTY_COLORS = {
  'Easy': '#00ff88', 'Medium': '#ffd700', 'Hard': '#ff8800', 'Expert': '#ff0000',
};

export default async function ShellsIndexPage() {
  var [shellsRes, metaTiersRes] = await Promise.all([
    supabase.from('shell_stats').select('name, role, lore_tagline, difficulty, base_health, base_shield, base_speed, active_ability_name, passive_ability_name, ranked_tier_solo, ranked_tier_squad, best_for, image_filename').order('name'),
    supabase.from('meta_tiers').select('name, tier, trend').eq('type', 'shell'),
  ]);

  var shells = shellsRes.data || [];
  var metaShellMap = {};
  (metaTiersRes.data || []).forEach(function(t) { metaShellMap[t.name.toLowerCase()] = t; });

  var maxHp = Math.max.apply(null, shells.map(function(s) { return s.base_health || 0; }).concat([1]));

  var tierOrder = { S: 0, A: 1, B: 2, C: 3, D: 4, BAN: 5 };
  shells = shells.slice().sort(function(a, b) {
    var metaA = metaShellMap[a.name.toLowerCase()];
    var metaB = metaShellMap[b.name.toLowerCase()];
    var tA = metaA ? (tierOrder[metaA.tier] ?? 9) : 9;
    var tB = metaB ? (tierOrder[metaB.tier] ?? 9) : 9;
    return tA - tB;
  });

  return (
    <main style={{ background: '#030303', minHeight: '100vh', color: '#fff', paddingTop: 80, overflowX: 'hidden' }}>
      <style>{`
        @keyframes sPulse { 0%,100%{opacity:1} 50%{opacity:0.35} }
        @keyframes sScanLine { from{transform:translateY(-100vh)} to{transform:translateY(100vh)} }
        .s-card { transition: border-color 0.2s, transform 0.2s; cursor: pointer; }
        .s-card:hover { transform: translateY(-4px); }
      `}</style>

      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, opacity: 0.012, backgroundImage: 'linear-gradient(rgba(0,245,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,245,255,1) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />
      <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 1000, height: 500, background: 'radial-gradient(ellipse at 50% 0%, rgba(0,245,255,0.05) 0%, transparent 65%)', pointerEvents: 'none', zIndex: 0 }} />

      {/* ── HERO ── */}
      <section style={{ position: 'relative', zIndex: 1, padding: '52px 24px 56px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#00f5ff', animation: 'sPulse 2s ease-in-out infinite' }} />
          <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: 'rgba(0,245,255,0.5)', letterSpacing: 4 }}>MARATHON INTEL — RUNNER SHELLS</span>
        </div>

        <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: 'clamp(2rem, 5vw, 3.8rem)', fontWeight: 900, letterSpacing: 3, margin: '0 0 14px', lineHeight: 1.05 }}>
          RUNNER <span style={{ color: '#00f5ff', textShadow: '0 0 30px rgba(0,245,255,0.2)' }}>SHELLS</span>
        </h1>
        <p style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 16, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, maxWidth: 560, marginBottom: 28 }}>
          Seven Runner Shells. Each one a different philosophy of survival on Tau Ceti. Choose your approach — then know it completely.
        </p>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {[
            { label: 'SHELLS', value: shells.length, color: '#00f5ff' },
            { label: 'RANKED VIABLE', value: shells.filter(function(s) { var m = metaShellMap[s.name.toLowerCase()]; return m && m.tier !== 'BAN' && (m.tier === 'S' || m.tier === 'A' || m.tier === 'B'); }).length, color: '#00ff88' },
            { label: 'S TIER', value: shells.filter(function(s) { var m = metaShellMap[s.name.toLowerCase()]; return m && m.tier === 'S'; }).length, color: '#ff0000' },
            { label: 'RANKED BANNED', value: shells.filter(function(s) { return s.name === 'Rook'; }).length, color: '#555' },
          ].map(function(stat) {
            return (
              <div key={stat.label} style={{ background: stat.color + '08', border: '1px solid ' + stat.color + '22', borderTop: '2px solid ' + stat.color + '44', borderRadius: 6, padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 22, fontWeight: 900, color: stat.color }}>{stat.value}</span>
                <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.2)', letterSpacing: 2 }}>{stat.label}</span>
              </div>
            );
          })}
        </div>
      </section>

      <div style={{ maxWidth: 1100, margin: '0 auto 28px', padding: '0 24px', display: 'flex', alignItems: 'center', gap: 12, position: 'relative', zIndex: 1 }}>
        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
        <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.15)', letterSpacing: 6 }}>SELECT YOUR RUNNER</span>
        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
      </div>

      {/* ── SHELL GRID ── */}
      <section style={{ position: 'relative', zIndex: 1, padding: '0 24px 80px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
          {shells.map(function(shell) {
            var color = SHELL_COLORS[shell.name] || '#ff8800';
            var symbol = SHELL_SYMBOLS[shell.name] || '◈';
            var meta = metaShellMap[shell.name.toLowerCase()];
            var soloTier = shell.ranked_tier_solo;
            var squadTier = shell.ranked_tier_squad;
            var isBanned = shell.name === 'Rook';
            var hpPct = maxHp > 0 ? Math.round((shell.base_health || 0) / maxHp * 100) : 0;
            var shPct = maxHp > 0 ? Math.round((shell.base_shield || 0) / maxHp * 100) : 0;
            var imgSrc = shell.image_filename ? '/images/shells/' + shell.image_filename : null;
            var diffColor = DIFFICULTY_COLORS[shell.difficulty] || 'rgba(255,255,255,0.3)';

            return (
              <Link
                key={shell.name}
                href={'/shells/' + shell.name.toLowerCase()}
                className="s-card"
                style={{
                  display: 'block', textDecoration: 'none',
                  background: '#080808',
                  border: '1px solid ' + (isBanned ? 'rgba(255,255,255,0.05)' : color + '22'),
                  borderTop: '3px solid ' + (isBanned ? '#333' : color),
                  borderRadius: 10, overflow: 'hidden',
                  opacity: isBanned ? 0.65 : 1,
                }}
              >
                <div style={{ position: 'relative', height: 180, background: color + '08', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 100%, ' + color + '18 0%, transparent 70%)' }} />

                  {imgSrc ? (
                    <img
                      src={imgSrc}
                      alt={shell.name}
                      style={{ height: '90%', width: '100%', objectFit: 'contain', position: 'relative', zIndex: 1, filter: isBanned ? 'grayscale(1) brightness(0.4)' : 'none' }}
                    />
                  ) : (
                    <div style={{ fontFamily: 'monospace', fontSize: 60, color: color, opacity: 0.15, position: 'relative', zIndex: 1 }}>{symbol}</div>
                  )}

                  {meta && (
                    <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 2, background: '#030303cc', border: '1px solid ' + (TIER_COLORS[meta.tier] || '#888') + '44', borderRadius: 5, padding: '5px 10px', textAlign: 'center', backdropFilter: 'blur(4px)' }}>
                      <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 18, fontWeight: 900, color: TIER_COLORS[meta.tier] || '#888', lineHeight: 1 }}>{meta.tier}</div>
                      <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 6, color: 'rgba(255,255,255,0.2)', letterSpacing: 1 }}>META</div>
                    </div>
                  )}

                  {isBanned && (
                    <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 2, background: 'rgba(255,0,0,0.15)', border: '1px solid rgba(255,0,0,0.3)', borderRadius: 4, padding: '4px 10px' }}>
                      <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: '#ff0000', letterSpacing: 2 }}>RANKED BANNED</span>
                    </div>
                  )}

                  {shell.difficulty && (
                    <div style={{ position: 'absolute', bottom: 10, left: 12, zIndex: 2, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: diffColor, background: '#030303aa', border: '1px solid ' + diffColor + '33', borderRadius: 3, padding: '2px 7px', letterSpacing: 1, backdropFilter: 'blur(4px)' }}>
                        {shell.difficulty.toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>

                <div style={{ padding: '16px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 16, color: color, opacity: isBanned ? 0.4 : 0.8 }}>{symbol}</span>
                    <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 18, fontWeight: 900, color: isBanned ? 'rgba(255,255,255,0.3)' : color, letterSpacing: 2 }}>{shell.name.toUpperCase()}</span>
                  </div>

                  <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.25)', letterSpacing: 2, marginBottom: 8 }}>{(shell.role || '').toUpperCase()}</div>

                  {shell.lore_tagline && (
                    <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 13, color: isBanned ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.45)', lineHeight: 1.5, marginBottom: 14, fontStyle: 'italic' }}>
                      "{shell.lore_tagline}"
                    </div>
                  )}

                  {(shell.base_health || shell.base_shield) && (
                    <div style={{ marginBottom: 14 }}>
                      {shell.base_health && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                          <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: '#00ff88', width: 22, flexShrink: 0 }}>HP</span>
                          <div style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: hpPct + '%', background: '#00ff88', borderRadius: 2 }} />
                          </div>
                          <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 10, fontWeight: 700, color: '#00ff88', width: 28, textAlign: 'right', flexShrink: 0 }}>{shell.base_health}</span>
                        </div>
                      )}
                      {shell.base_shield && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: '#00f5ff', width: 22, flexShrink: 0 }}>SHD</span>
                          <div style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: shPct + '%', background: '#00f5ff', borderRadius: 2 }} />
                          </div>
                          <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 10, fontWeight: 700, color: '#00f5ff', width: 28, textAlign: 'right', flexShrink: 0 }}>{shell.base_shield}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {shell.active_ability_name && (
                    <div style={{ marginBottom: 12 }}>
                      <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: color, background: color + '12', border: '1px solid ' + color + '28', borderRadius: 3, padding: '3px 8px', letterSpacing: 1 }}>
                        {shell.active_ability_name}
                      </span>
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ display: 'flex', gap: 5 }}>
                      {soloTier && soloTier !== 'BAN' && (
                        <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 9, fontWeight: 700, color: TIER_COLORS[soloTier] || '#888', background: (TIER_COLORS[soloTier] || '#888') + '14', border: '1px solid ' + (TIER_COLORS[soloTier] || '#888') + '28', borderRadius: 3, padding: '2px 7px', letterSpacing: 1 }}>
                          S {soloTier}
                        </span>
                      )}
                      {squadTier && squadTier !== 'BAN' && (
                        <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 9, fontWeight: 700, color: TIER_COLORS[squadTier] || '#888', background: (TIER_COLORS[squadTier] || '#888') + '14', border: '1px solid ' + (TIER_COLORS[squadTier] || '#888') + '28', borderRadius: 3, padding: '2px 7px', letterSpacing: 1 }}>
                          Q {squadTier}
                        </span>
                      )}
                    </div>
                    <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: isBanned ? 'rgba(255,255,255,0.15)' : color + '88', letterSpacing: 1 }}>
                      VIEW GUIDE →
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        <div style={{ marginTop: 28, display: 'flex', alignItems: 'center', gap: 12, padding: '20px 24px', background: 'rgba(255,136,0,0.03)', border: '1px solid rgba(255,136,0,0.1)', borderLeft: '3px solid rgba(255,136,0,0.4)', borderRadius: 8 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 700, color: '#ff8800', letterSpacing: 1, marginBottom: 4 }}>⬢ NOT SURE WHICH SHELL TO RUN?</div>
            <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.35)' }}>DEXTER will engineer a complete loadout based on your playstyle, rank target, and experience level.</div>
          </div>
          <Link href="/advisor" style={{ flexShrink: 0, padding: '10px 20px', background: 'rgba(255,136,0,0.1)', border: '1px solid rgba(255,136,0,0.3)', borderRadius: 6, textDecoration: 'none', fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: '#ff8800', letterSpacing: 2, whiteSpace: 'nowrap' }}>
            BUILD ADVISOR →
          </Link>
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