'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const SHELL_COLORS = {
  Assassin:  '#cc44ff',
  Destroyer: '#ff3333',
  Recon:     '#00f5ff',
  Rook:      '#888888',
  Thief:     '#ffd700',
  Triage:    '#00ff88',
  Vandal:    '#ff8800',
};

const SHELL_SYMBOLS = {
  Assassin:  '◈',
  Destroyer: '⬢',
  Recon:     '◇',
  Rook:      '▣',
  Thief:     '⬠',
  Triage:    '◎',
  Vandal:    '⬡',
};

const TIER_GRADE_COLORS = {
  S: '#ff0000', A: '#ff8800', B: '#00f5ff', C: '#888', D: '#555',
};

export default function ShellPortraitStrip() {
  var [shells, setShells] = useState([]);
  var [loaded, setLoaded] = useState(false);
  var [hovered, setHovered] = useState(null);

  useEffect(function() {
    async function fetchShells() {
      try {
        var { data } = await supabase
          .from('shell_stats')
          .select('name, role, base_health, base_shield, prime_ability_name, ranked_tier_solo, ranked_tier_squad, image_filename')
          .order('name');
        if (data) setShells(data);
        setLoaded(true);
      } catch (_) { setLoaded(true); }
    }
    fetchShells();
  }, []);

  if (!loaded || shells.length === 0) return null;

  return (
    <section style={{ padding: '0 0 48px', overflow: 'hidden' }}>
      <style>{`
        @keyframes shellPulse { 0%,100%{opacity:1} 50%{opacity:0.35} }
        .shell-card { transition: transform 0.2s, border-color 0.2s; cursor: pointer; }
        .shell-card:hover { transform: translateY(-4px); }
      `}</style>

      {/* Section header */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: '#00f5ff', animation: 'shellPulse 2s ease-in-out infinite' }} />
          <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: 3 }}>RUNNER SHELLS</span>
        </div>
        <Link href="/shells" style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.2)', textDecoration: 'none', letterSpacing: 2 }}>
          ALL SHELL GUIDES →
        </Link>
      </div>

      {/* Shell cards */}
      <div style={{
        display: 'flex',
        gap: 10,
        overflowX: 'auto',
        paddingLeft: 24,
        paddingRight: 24,
        scrollSnapType: 'x mandatory',
        WebkitOverflowScrolling: 'touch',
        paddingBottom: 4,
      }}>
        {shells.map(function(shell) {
          var color = SHELL_COLORS[shell.name] || '#00f5ff';
          var symbol = SHELL_SYMBOLS[shell.name] || '◈';
          var isHovered = hovered === shell.name;
          var imgSrc = shell.image_filename ? '/images/shells/' + shell.image_filename : null;
          var soloGrade = shell.ranked_tier_solo;
          var squadGrade = shell.ranked_tier_squad;
          var isBanned = soloGrade === 'BAN' || shell.name === 'Rook';

          return (
            <Link
              key={shell.name}
              href={'/shells/' + shell.name.toLowerCase()}
              className="shell-card"
              style={{
                textDecoration: 'none',
                flexShrink: 0,
                width: 160,
                scrollSnapAlign: 'start',
                background: isHovered ? color + '12' : '#080808',
                border: '1px solid ' + (isHovered ? color + '44' : color + '18'),
                borderTop: '2px solid ' + (isBanned ? 'rgba(255,0,0,0.3)' : color),
                borderRadius: 8,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
              onMouseEnter={function() { setHovered(shell.name); }}
              onMouseLeave={function() { setHovered(null); }}
            >
              {/* Shell image */}
              <div style={{ height: 110, position: 'relative', background: color + '08', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {imgSrc ? (
                  <img
                    src={imgSrc}
                    alt={shell.name}
                    style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '8px', opacity: isBanned ? 0.35 : 0.9 }}
                    onError={function(e) { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                  />
                ) : null}
                {/* Symbol fallback */}
                <div style={{ display: imgSrc ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, color: color, opacity: 0.3, position: 'absolute', inset: 0 }}>
                  {symbol}
                </div>
                {/* Banned overlay */}
                {isBanned && (
                  <div style={{ position: 'absolute', top: 6, right: 6, fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: '#ff0000', background: 'rgba(255,0,0,0.15)', border: '1px solid rgba(255,0,0,0.3)', borderRadius: 2, padding: '2px 6px', letterSpacing: 1 }}>BANNED</div>
                )}
              </div>

              {/* Info */}
              <div style={{ padding: '10px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {/* Symbol + name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 11, color: color, opacity: isBanned ? 0.4 : 0.8 }}>{symbol}</span>
                  <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 11, fontWeight: 700, color: isBanned ? 'rgba(255,255,255,0.3)' : '#fff', letterSpacing: 0.5 }}>{shell.name.toUpperCase()}</span>
                </div>

                {/* Role */}
                <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: color, opacity: 0.6, letterSpacing: 1 }}>
                  {(shell.role || '').toUpperCase()}
                </div>

                {/* Stats row */}
                {shell.base_health && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                      <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: 'rgba(255,255,255,0.2)', letterSpacing: 1 }}>HP</span>
                      <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: '#00ff88', fontWeight: 700 }}>{shell.base_health}</span>
                    </div>
                    {shell.base_shield && (
                      <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                        <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: 'rgba(255,255,255,0.2)', letterSpacing: 1 }}>SHD</span>
                        <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: '#00f5ff', fontWeight: 700 }}>{shell.base_shield}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Ranked tiers */}
                {!isBanned && (soloGrade || squadGrade) && (
                  <div style={{ display: 'flex', gap: 4, marginTop: 'auto' }}>
                    {soloGrade && (
                      <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 9, fontWeight: 900, color: TIER_GRADE_COLORS[soloGrade] || '#888', background: (TIER_GRADE_COLORS[soloGrade] || '#888') + '15', border: '1px solid ' + (TIER_GRADE_COLORS[soloGrade] || '#888') + '30', borderRadius: 3, padding: '2px 6px', letterSpacing: 1 }}>
                        S {soloGrade}
                      </span>
                    )}
                    {squadGrade && (
                      <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 9, fontWeight: 900, color: TIER_GRADE_COLORS[squadGrade] || '#888', background: (TIER_GRADE_COLORS[squadGrade] || '#888') + '15', border: '1px solid ' + (TIER_GRADE_COLORS[squadGrade] || '#888') + '30', borderRadius: 3, padding: '2px 6px', letterSpacing: 1 }}>
                        Q {squadGrade}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </Link>
          );
        })}

        {/* View all shells CTA */}
        <Link
          href="/shells"
          style={{
            textDecoration: 'none',
            flexShrink: 0,
            width: 120,
            scrollSnapAlign: 'start',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: 8,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            padding: 20,
          }}
        >
          <div style={{ fontFamily: 'monospace', fontSize: 22, color: 'rgba(255,255,255,0.15)' }}>→</div>
          <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.18)', letterSpacing: 2, textAlign: 'center', lineHeight: 1.6 }}>ALL SHELL GUIDES</div>
        </Link>
      </div>
    </section>
  );
}