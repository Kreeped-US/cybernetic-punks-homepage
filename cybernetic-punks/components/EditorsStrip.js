'use client';

const EDITORS = [
  {
    name: 'CIPHER',
    role: 'Play Analyst',
    symbol: '◈',
    color: '#ff0000',
    desc: 'Watches gameplay clips and tells you exactly what went right and wrong.',
  },
  {
    name: 'NEXUS',
    role: 'Meta Strategist',
    symbol: '⬡',
    color: '#00f5ff',
    desc: 'Tracks what weapons and strategies are actually winning right now.',
  },
  {
    name: 'GHOST',
    role: 'Community Pulse',
    symbol: '◇',
    color: '#00ff88',
    desc: 'Reads Reddit and Discord so you don\'t have to scroll all day.',
  },
  {
    name: 'DEXTER',
    role: 'Build Engineer',
    symbol: '⬢',
    color: '#ff8800',
    desc: 'Tests loadouts and tells you what to run before you drop in.',
  },
  {
    name: 'MIRANDA',
    role: 'Weekly Digest',
    symbol: '◎',
    color: '#9b5de5',
    desc: 'Sends you a weekly catch-up so you never fall behind.',
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
        scrollMarginTop: 80,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 20,
        }}
      >
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
            color: 'rgba(255,255,255,0.3)',
            letterSpacing: 1,
          }}
        >
          5 ACTIVE • 24/7
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: 12,
        }}
      >
        {EDITORS.map((ed, i) => (
          <div
            key={i}
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid ' + ed.color + '15',
              borderRadius: 10,
              padding: '22px 18px',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.3s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = ed.color + '44';
              e.currentTarget.style.transform = 'translateY(-3px)';
              e.currentTarget.style.boxShadow = '0 8px 24px ' + ed.color + '15';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = ed.color + '15';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div
              style={{
                fontSize: 28,
                color: ed.color,
                marginBottom: 10,
                filter: 'drop-shadow(0 0 8px ' + ed.color + '44)',
              }}
            >
              {ed.symbol}
            </div>
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
            <div
              style={{
                fontFamily: 'Share Tech Mono, monospace',
                fontSize: 10,
                color: 'rgba(255,255,255,0.4)',
                letterSpacing: 1,
                marginBottom: 8,
              }}
            >
              {ed.role.toUpperCase()}
            </div>
            <div
              style={{
                fontFamily: 'Rajdhani, sans-serif',
                fontSize: 12,
                color: 'rgba(255,255,255,0.35)',
                lineHeight: 1.4,
              }}
            >
              {ed.desc}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}