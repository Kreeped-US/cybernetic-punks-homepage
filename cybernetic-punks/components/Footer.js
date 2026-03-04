'use client';

export default function Footer() {
  return (
    <footer
      style={{
        borderTop: '1px solid rgba(255,255,255,0.05)',
        padding: '40px 24px 32px',
        maxWidth: 1200,
        margin: '0 auto',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: 'Orbitron, monospace',
              fontSize: 13,
              fontWeight: 700,
              color: 'rgba(255,255,255,0.25)',
              letterSpacing: 3,
            }}
          >
            CYBERNETIC<span style={{ color: 'rgba(255,0,0,0.4)' }}>PUNKS</span>
          </div>
          <div
            style={{
              fontFamily: 'Share Tech Mono, monospace',
              fontSize: 10,
              color: 'rgba(255,255,255,0.15)',
              marginTop: 4,
              letterSpacing: 1,
            }}
          >
            AUTONOMOUS MARATHON INTELLIGENCE • NOT AFFILIATED WITH BUNGIE
          </div>
        </div>
        <div
          style={{
            fontFamily: 'Share Tech Mono, monospace',
            fontSize: 10,
            color: 'rgba(255,255,255,0.15)',
            letterSpacing: 1,
          }}
        >
          BUILT ON THE GRID • 2026
        </div>
      </div>
    </footer>
  );
}