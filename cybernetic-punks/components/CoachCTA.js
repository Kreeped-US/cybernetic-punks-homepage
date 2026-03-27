import Link from 'next/link';

// variant: 'banner' (large) | 'compact' (small inline)
export default function CoachCTA({ variant = 'banner' }) {
  if (variant === 'compact') {
    return (
      <div style={{
        background: '#0a0a0a',
        border: '1px solid rgba(0,245,255,0.1)',
        borderLeft: '3px solid rgba(0,245,255,0.4)',
        borderRadius: 5,
        padding: '14px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 20,
        flexWrap: 'wrap',
        margin: '24px 0',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
            <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: '#00f5ff', background: 'rgba(0,245,255,0.08)', border: '1px solid rgba(0,245,255,0.2)', borderRadius: 3, padding: '2px 8px', letterSpacing: 2 }}>CLOSED BETA</span>
            <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.2)', letterSpacing: 2 }}>PERSONAL COACH</span>
          </div>
          <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>
            Our AI editors can audit your actual loadout — shell, mods, cores, implants. Personal coaching is coming soon.
          </div>
        </div>
        <a
          href="mailto:contact@cyberneticpunks.com?subject=Personal Coach Beta Access"
          style={{
            fontFamily: 'Share Tech Mono, monospace',
            fontSize: 9,
            color: '#00f5ff',
            border: '1px solid rgba(0,245,255,0.3)',
            borderRadius: 4,
            padding: '8px 16px',
            textDecoration: 'none',
            letterSpacing: 2,
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          CONTACT US →
        </a>
      </div>
    );
  }

  // Default: banner
  return (
    <div style={{
      background: '#0a0a0a',
      border: '1px solid rgba(0,245,255,0.1)',
      borderTop: '2px solid rgba(0,245,255,0.35)',
      borderRadius: 5,
      padding: '28px 32px',
      margin: '32px 0',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 32, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 260 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: '#00f5ff', background: 'rgba(0,245,255,0.07)', border: '1px solid rgba(0,245,255,0.2)', borderRadius: 3, padding: '3px 10px', letterSpacing: 3 }}>CLOSED BETA</span>
            <div style={{ display: 'flex', gap: 8 }}>
              {[{ sym: '⬢', color: '#ff8800' }, { sym: '⬡', color: '#00f5ff' }, { sym: '◎', color: '#9b5de5' }].map(e => (
                <span key={e.sym} style={{ color: e.color, fontSize: 15 }}>{e.sym}</span>
              ))}
            </div>
          </div>
          <div style={{ fontFamily: 'Orbitron, sans-serif', fontSize: 16, fontWeight: 900, color: '#fff', letterSpacing: 2, marginBottom: 10, lineHeight: 1.3 }}>
            PERSONAL COACH — COMING SOON
          </div>
          <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.8, maxWidth: 500 }}>
            Our editors are getting a new capability — analyzing your actual Marathon loadout. DEXTER audits your build, NEXUS checks your meta positioning, MIRANDA profiles your playstyle. Personalized coaching, not generic advice. Currently in closed development.
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start', flexShrink: 0 }}>
          <a
            href="mailto:contact@cyberneticpunks.com?subject=Personal Coach Beta Access"
            style={{
              display: 'inline-block',
              background: 'rgba(0,245,255,0.06)',
              border: '1px solid rgba(0,245,255,0.35)',
              color: '#00f5ff',
              fontFamily: 'Share Tech Mono, monospace',
              fontSize: 10,
              letterSpacing: 3,
              padding: '12px 28px',
              borderRadius: 5,
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            REQUEST BETA ACCESS →
          </a>
          <Link
            href="https://discord.gg/PnhbdRYh3w"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-block',
              background: 'rgba(88,101,242,0.07)',
              border: '1px solid rgba(88,101,242,0.25)',
              color: '#7289da',
              fontFamily: 'Share Tech Mono, monospace',
              fontSize: 9,
              letterSpacing: 2,
              padding: '9px 20px',
              borderRadius: 5,
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            JOIN DISCORD FOR UPDATES
          </Link>
          <div style={{ display: 'flex', gap: 14 }}>
            {['FREE TO JOIN', 'BUNGIE LOGIN', 'COMING SOON'].map(tag => (
              <span key={tag} style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: 'rgba(255,255,255,0.18)', letterSpacing: 2 }}>{tag}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}