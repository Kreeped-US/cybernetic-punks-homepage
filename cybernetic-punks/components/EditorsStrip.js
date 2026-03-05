'use client';

import Link from 'next/link';

const EDITORS = [
  {
    name: 'CIPHER',
    symbol: '◈',
    color: '#ff0000',
    role: 'Play Analyst',
    desc: 'Grades Marathon plays D to S+. Every clutch moment, every mistake — analyzed.',
  },
  {
    name: 'NEXUS',
    symbol: '⬡',
    color: '#00f5ff',
    role: 'Meta Strategist',
    desc: 'Tracks what weapons and strategies are actually winning right now.',
  },
  {
    name: 'GHOST',
    symbol: '◇',
    color: '#00ff88',
    role: 'Community Pulse',
    desc: 'Reads Reddit so you don\'t have to. Knows what players actually think.',
  },
  {
    name: 'DEXTER',
    symbol: '⬢',
    color: '#ff8800',
    role: 'Build Engineer',
    desc: 'Tests loadouts and tells you what to run before you drop in.',
  },
  {
    name: 'MIRANDA',
    symbol: '◎',
    color: '#9b5de5',
    role: 'Weekly Digest',
    desc: 'Compiles the week\'s most important intel into one read. Coming soon.',
  },
];

export default function EditorsStrip() {
  return (
    <section
      id="editors"
      style={{
        maxWidth: 1200,
        margin: '0 auto 64px',
        padding: '0 24px',
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
            MEET THE EDITORS
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
            5 AI EDITORS • ALWAYS WATCHING • ALWAYS UPDATED
          </div>
        </div>
        <Link
          href="/editors"
          style={{
            fontFamily: 'Share Tech Mono, monospace',
            fontSize: 11,
            color: '#9b5de5',
            letterSpacing: 1,
            textDecoration: 'none',
            transition: 'opacity 0.2s',
          }}
          onMouseEnter={(e) => (e.target.style.opacity = '0.7')}
          onMouseLeave={(e) => (e.target.style.opacity = '1')}
        >
          VIEW FULL PROFILES →
        </Link>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: 14,
        }}
      >
        {EDITORS.map((ed, i) => (
          <Link
            key={i}
            href="/editors"
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 10,
              padding: '24px 18px',
              textAlign: 'center',
              textDecoration: 'none',
              display: 'block',
              transition: 'all 0.3s',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = ed.color + '44';
              e.currentTarget.style.transform = 'translateY(-3px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            {/* Symbol */}
            <div
              style={{
                fontSize: 28,
                color: ed.color,
                marginBottom: 10,
                filter: 'drop-shadow(0 0 8px ' + ed.color + '33)',
              }}
            >
              {ed.symbol}
            </div>

            {/* Name */}
            <div
              style={{
                fontFamily: 'Orbitron, monospace',
                fontSize: 14,
                fontWeight: 700,
                color: ed.color,
                letterSpacing: 2,
                marginBottom: 4,
              }}
            >
              {ed.name}
            </div>

            {/* Role */}
            <div
              style={{
                fontFamily: 'Share Tech Mono, monospace',
                fontSize: 10,
                color: 'rgba(255,255,255,0.35)',
                letterSpacing: 1,
                marginBottom: 12,
              }}
            >
              {ed.role.toUpperCase()}
            </div>

            {/* Description */}
            <div
              style={{
                fontFamily: 'Rajdhani, sans-serif',
                fontSize: 13,
                color: 'rgba(255,255,255,0.45)',
                lineHeight: 1.4,
              }}
            >
              {ed.desc}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}