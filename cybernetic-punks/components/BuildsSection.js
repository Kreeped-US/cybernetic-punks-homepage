'use client';

import Link from 'next/link';

const BUILDS = [
  {
    name: 'The Extractor',
    grade: 'A',
    style: 'Balanced',
    desc: 'Get in, grab loot, get out alive. Built for consistency.',
    weapons: ['Volt-9 SMG', 'Pulse Pistol'],
    color: '#00ff88',
  },
  {
    name: 'Glass Cannon',
    grade: 'A-',
    style: 'Aggressive',
    desc: 'Maximum damage, minimum survivability. High risk, high reward.',
    weapons: ['Rail Rifle', 'Frag Launcher'],
    color: '#ff0000',
  },
  {
    name: 'Rookie Runner',
    grade: 'B+',
    style: 'Beginner',
    desc: 'Forgiving loadout for your first dozen runs. You\'ll live longer.',
    weapons: ['Auto Rifle', 'Sidearm'],
    color: '#00f5ff',
  },
];

export default function BuildsSection() {
  return (
    <section
      id="builds"
      style={{
        maxWidth: 1200,
        margin: '0 auto 64px',
        padding: '0 24px',
        scrollMarginTop: 80,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 24,
        }}
      >
        <div>
          <h2
            style={{
              fontFamily: 'Orbitron, monospace',
              fontSize: 20,
              fontWeight: 700,
              color: '#fff',
              letterSpacing: 2,
              margin: 0,
            }}
          >
            <span style={{ color: '#ff8800' }}>⬢</span> BUILDS THAT WORK
          </h2>
          <div
            style={{
              fontFamily: 'Share Tech Mono, monospace',
              fontSize: 11,
              color: 'rgba(255,255,255,0.35)',
              letterSpacing: 1,
              marginTop: 4,
            }}
          >
            WHAT TO RUN BEFORE YOU DROP
          </div>
        </div>
        <Link
          href="/builds"
          style={{
            fontFamily: 'Share Tech Mono, monospace',
            fontSize: 11,
            color: '#ff8800',
            letterSpacing: 1,
            textDecoration: 'none',
            transition: 'opacity 0.2s',
          }}
          onMouseEnter={(e) => (e.target.style.opacity = '0.7')}
          onMouseLeave={(e) => (e.target.style.opacity = '1')}
        >
          VIEW ALL BUILDS →
        </Link>
      </div>

      <Link href="/builds" style={{ textDecoration: 'none' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 16,
          }}
        >
          {BUILDS.map((build, i) => (
            <div
              key={i}
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 10,
                padding: 24,
                cursor: 'pointer',
                transition: 'all 0.3s',
                position: 'relative',
                overflow: 'hidden',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = build.color + '44';
                e.currentTarget.style.transform = 'translateY(-3px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 2,
                  background: 'linear-gradient(90deg, ' + build.color + '44, transparent)',
                }}
              />

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: 12,
                }}
              >
                <div>
                  <div
                    style={{
                      fontFamily: 'Share Tech Mono, monospace',
                      fontSize: 10,
                      color: build.color,
                      letterSpacing: 2,
                      marginBottom: 4,
                    }}
                  >
                    {build.style.toUpperCase()} LOADOUT
                  </div>
                  <div
                    style={{
                      fontFamily: 'Orbitron, monospace',
                      fontSize: 17,
                      fontWeight: 700,
                      color: '#fff',
                    }}
                  >
                    {build.name}
                  </div>
                </div>
                <div
                  style={{
                    fontFamily: 'Orbitron, monospace',
                    fontSize: 18,
                    fontWeight: 900,
                    color: build.color,
                    background: build.color + '15',
                    borderRadius: 6,
                    padding: '6px 12px',
                    border: '1px solid ' + build.color + '33',
                  }}
                >
                  {build.grade}
                </div>
              </div>

              <p
                style={{
                  fontFamily: 'Rajdhani, sans-serif',
                  fontSize: 14,
                  color: 'rgba(255,255,255,0.5)',
                  margin: '0 0 16px',
                  lineHeight: 1.5,
                }}
              >
                {build.desc}
              </p>

              <div style={{ display: 'flex', gap: 8 }}>
                {build.weapons.map((w, j) => (
                  <span
                    key={j}
                    style={{
                      fontFamily: 'Share Tech Mono, monospace',
                      fontSize: 10,
                      letterSpacing: 1,
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 4,
                      padding: '4px 10px',
                      color: 'rgba(255,255,255,0.5)',
                    }}
                  >
                    {w}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Link>
    </section>
  );
}