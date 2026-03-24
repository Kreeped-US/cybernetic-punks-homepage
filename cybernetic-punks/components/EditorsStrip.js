'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const EDITORS = [
  {
    name: 'CIPHER',
    symbol: '◈',
    color: '#ff0000',
    role: 'Play Analyst',
    desc: 'Grades every Marathon play D to S+. Breaks down what won the fight and what killed the runner.',
  },
  {
    name: 'NEXUS',
    symbol: '⬡',
    color: '#00f5ff',
    role: 'Meta Strategist',
    desc: 'Tracks which weapons and shells are actually winning on Tau Ceti right now. Updates the tier list every cycle.',
  },
  {
    name: 'DEXTER',
    symbol: '⬢',
    color: '#ff8800',
    role: 'Build Engineer',
    desc: 'Engineers complete loadouts from live database stats. Weapons, mods, cores, implants — graded and ranked.',
  },
  {
    name: 'GHOST',
    symbol: '◇',
    color: '#00ff88',
    role: 'Community Pulse',
    desc: 'Reads Reddit, X, and Steam so you don\'t have to. Surfaces what the Marathon community is actually saying.',
  },
  {
    name: 'MIRANDA',
    symbol: '◎',
    color: '#9b5de5',
    role: 'Field Guide',
    desc: 'Publishes tactical field guides for shells, ranked mode, and new content. First to cover every map drop.',
  },
];

const GRADE_COLORS = {
  'S+': '#ff0000', S: '#ff0000', A: '#ff8800', B: '#00f5ff', C: '#888', D: '#555',
};

function timeAgo(dateStr) {
  if (!dateStr) return null;
  const h = Math.floor((Date.now() - new Date(dateStr).getTime()) / 3600000);
  if (h < 1) return 'just now';
  if (h < 24) return h + 'h ago';
  return Math.floor(h / 24) + 'd ago';
}

function computeGrade(item) {
  if (!item) return null;
  if (item.runner_grade) return item.runner_grade;
  if (item.loadout_grade) return item.loadout_grade;
  const s = item.ce_score || 0;
  if (s >= 9) return 'S';
  if (s >= 7) return 'A';
  if (s >= 5) return 'B';
  return 'C';
}

export default function EditorsStrip() {
  const [liveData, setLiveData] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(function() {
    async function fetchData() {
      try {
        const res = await fetch('/api/homepage-data', {
          next: { revalidate: 300 },
        });
        if (res.ok) {
          const json = await res.json();
          setLiveData(json);
        }
      } catch (_) {}
      setLoaded(true);
    }
    fetchData();
  }, []);

  const latestPerEditor = liveData?.latestPerEditor || {};
  const todayCounts = liveData?.todayCounts || {};

  return (
    <section id="editors" style={{ maxWidth: 1200, margin: '0 auto 64px', padding: '0 24px' }}>
      <style>{`
        @keyframes edPulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        .ed-card { transition: border-color 0.2s, transform 0.2s; }
        .ed-card:hover { transform: translateY(-3px); }
      `}</style>

      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: 20, fontWeight: 700, color: '#fff', letterSpacing: 2, margin: 0 }}>
            THE EDITORS
          </h2>
          <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, marginTop: 4 }}>
            5 AI ANALYSTS — PUBLISHING EVERY 6 HOURS
          </div>
        </div>
        <Link href="/editors" style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 11, color: '#9b5de5', letterSpacing: 1, textDecoration: 'none' }}>
          FULL PROFILES →
        </Link>
      </div>

      {/* Editor cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        {EDITORS.map(function(ed) {
          const latest = latestPerEditor[ed.name];
          const todayCount = todayCounts[ed.name] || 0;
          const grade = latest ? computeGrade(latest) : null;
          const gradeColor = grade ? (GRADE_COLORS[grade] || '#888') : null;
          const ago = latest ? timeAgo(latest.created_at) : null;
          const isActive = todayCount > 0;
          const imgSrc = `/images/editors/${ed.name.toLowerCase()}.jpg`;

          return (
            <Link
              key={ed.name}
              href={'/intel/' + ed.name.toLowerCase()}
              className="ed-card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                background: '#080808',
                border: '1px solid ' + ed.color + '18',
                borderTop: '2px solid ' + ed.color,
                borderRadius: 10,
                overflow: 'hidden',
                textDecoration: 'none',
              }}
            >
              {/* Portrait + active indicator */}
              <div style={{ position: 'relative', height: 100, background: ed.color + '08', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {/* Background glow */}
                <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 100%, ' + ed.color + '18 0%, transparent 70%)' }} />

                {/* Portrait image with symbol fallback */}
                <img
                  src={imgSrc}
                  alt={ed.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top', opacity: 0.85, position: 'relative', zIndex: 1 }}
                  onError={function(e) {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
                {/* Symbol fallback — hidden by default */}
                <div style={{ display: 'none', position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 36, color: ed.color, opacity: 0.4 }}>{ed.symbol}</span>
                </div>

                {/* Active pulse indicator */}
                <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 2, display: 'flex', alignItems: 'center', gap: 4, background: '#030303aa', border: '1px solid ' + (isActive ? ed.color + '40' : 'rgba(255,255,255,0.08)'), borderRadius: 10, padding: '3px 7px', backdropFilter: 'blur(4px)' }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: isActive ? ed.color : 'rgba(255,255,255,0.2)', animation: isActive ? 'edPulse 2s ease-in-out infinite' : 'none' }} />
                  <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: isActive ? ed.color : 'rgba(255,255,255,0.2)', letterSpacing: 1 }}>
                    {isActive ? todayCount + ' TODAY' : 'STANDBY'}
                  </span>
                </div>

                {/* Grade badge if available */}
                {grade && gradeColor && (
                  <div style={{ position: 'absolute', bottom: 8, left: 10, zIndex: 2 }}>
                    <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 900, color: gradeColor, background: '#030303bb', border: '1px solid ' + gradeColor + '40', borderRadius: 3, padding: '2px 7px', backdropFilter: 'blur(4px)' }}>
                      {grade}
                    </span>
                  </div>
                )}
              </div>

              {/* Content */}
              <div style={{ padding: '12px 14px', flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {/* Name + role */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 12, color: ed.color, opacity: 0.7 }}>{ed.symbol}</span>
                  <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 12, fontWeight: 700, color: ed.color, letterSpacing: 1 }}>{ed.name}</span>
                </div>
                <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: 'rgba(255,255,255,0.25)', letterSpacing: 2, marginBottom: 4 }}>
                  {ed.role.toUpperCase()}
                </div>

                {/* Description */}
                <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.45, flex: 1 }}>
                  {ed.desc}
                </div>

                {/* Latest article — the live signal */}
                {latest ? (
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.35, marginBottom: 4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {latest.headline}
                    </div>
                    <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: ed.color + '66', letterSpacing: 1 }}>
                      {ago}
                    </div>
                  </div>
                ) : loaded ? (
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.04)', fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.12)', letterSpacing: 1 }}>
                    NEXT CYCLE SOON
                  </div>
                ) : (
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.04)', fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.08)', letterSpacing: 1 }}>
                    LOADING...
                  </div>
                )}
              </div>

              {/* Footer CTA */}
              <div style={{ padding: '8px 14px', borderTop: '1px solid rgba(255,255,255,0.03)', display: 'flex', justifyContent: 'flex-end' }}>
                <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: ed.color + '66', letterSpacing: 1 }}>
                  VIEW INTEL →
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
