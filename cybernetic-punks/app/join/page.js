export const metadata = {
  title: 'Initialize Your Runner Profile | CyberneticPunks',
  description: 'Connect your Bungie account and get a full personalized build audit from five AI editors.',
};

export default function JoinPage({ searchParams }) {
  const error = searchParams?.error;
  const isClosedBeta = error === 'closed_beta';

  return (
    <div style={{
      minHeight: '100vh',
      background: '#030303',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '60px 24px',
      textAlign: 'center',
      position: 'relative',
      fontFamily: "'Rajdhani', sans-serif",
    }}>

      {/* Grid background */}
      <div style={{
        position: 'fixed', inset: 0,
        backgroundImage: 'linear-gradient(rgba(0,245,255,0.035) 1px,transparent 1px),linear-gradient(90deg,rgba(0,245,255,0.035) 1px,transparent 1px)',
        backgroundSize: '48px 48px', pointerEvents: 'none', zIndex: 0,
      }} />

      {/* Radial glow */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        width: '600px', height: '600px', borderRadius: '50%',
        background: 'radial-gradient(circle,rgba(0,245,255,0.04) 0%,transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: '520px', width: '100%' }}>

        {/* Editor symbols */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '28px', marginBottom: '44px' }}>
          {[
            { sym: '◈', color: '#ff0000', name: 'CIPHER' },
            { sym: '⬡', color: '#00f5ff', name: 'NEXUS' },
            { sym: '⬢', color: '#ff8800', name: 'DEXTER' },
            { sym: '◇', color: '#00ff88', name: 'GHOST' },
            { sym: '◎', color: '#9b5de5', name: 'MIRANDA' },
          ].map((e) => (
            <div key={e.name} style={{ textAlign: 'center' }}>
              <div style={{ color: e.color, fontSize: '26px', marginBottom: '6px' }}>{e.sym}</div>
              <div style={{ fontFamily: "'Share Tech Mono', monospace", color: e.color, opacity: 0.45, fontSize: '7px', letterSpacing: '2px' }}>{e.name}</div>
            </div>
          ))}
        </div>

        {/* Site label */}
        <div style={{ fontFamily: "'Share Tech Mono', monospace", color: 'rgba(0,245,255,0.45)', fontSize: '9px', letterSpacing: '6px', marginBottom: '6px' }}>
          CYBERNETICPUNKS.COM
        </div>
        <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '8px', letterSpacing: '3px', color: 'rgba(255,255,255,0.2)', marginBottom: '44px' }}>
          MARATHON INTELLIGENCE HUB · TAU CETI IV
        </div>

        {isClosedBeta ? (
          /* ── CLOSED BETA STATE ── */
          <>
            <h1 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '24px', letterSpacing: '4px', fontWeight: 900, color: '#fff', lineHeight: 1.3, margin: '0 0 16px' }}>
              PERSONAL COACH<br/>IN DEVELOPMENT
            </h1>

            <div style={{ background: '#0a0a0a', border: '1px solid rgba(255,136,0,0.2)', borderLeft: '3px solid rgba(255,136,0,0.5)', borderRadius: 5, padding: '20px 24px', marginBottom: '28px', textAlign: 'left' }}>
              <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '8px', color: '#ff8800', letterSpacing: '3px', marginBottom: '10px' }}>⬢ DEXTER STATUS UPDATE</div>
              <p style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '15px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.8, margin: 0 }}>
                The Personal Coach is currently in closed development. We're training the editors on real player data before opening access. Check back soon — or join the Discord to be notified when it launches.
              </p>
            </div>

            <a
              href="https://discord.gg/PnhbdRYh3w"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-block',
                background: 'rgba(88,101,242,0.1)',
                border: '1px solid rgba(88,101,242,0.35)',
                color: '#7289da',
                fontFamily: "'Share Tech Mono', monospace",
                fontSize: '10px',
                letterSpacing: '3px',
                padding: '13px 32px',
                borderRadius: '5px',
                textDecoration: 'none',
                marginBottom: '14px',
              }}
            >
              JOIN DISCORD →
            </a>

            <div style={{ fontFamily: "'Share Tech Mono', monospace", color: 'rgba(255,255,255,0.15)', fontSize: '8px', letterSpacing: '2px' }}>
              GET NOTIFIED WHEN COACH LAUNCHES
            </div>
          </>
        ) : (
          /* ── NORMAL LOGIN STATE ── */
          <>
            <h1 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '28px', letterSpacing: '5px', fontWeight: 900, color: '#fff', lineHeight: 1.3, margin: '0 0 18px' }}>
              INITIALIZE YOUR<br/>RUNNER PROFILE
            </h1>

            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', lineHeight: 2, margin: '0 0 44px' }}>
              Five AI editors standing by to analyze your build, assess your meta position, and deliver a personalized coaching audit.
            </p>

            {/* Other error states */}
            {error && !isClosedBeta && (
              <div style={{ background: 'rgba(255,0,0,0.06)', border: '1px solid rgba(255,0,0,0.2)', borderRadius: '3px', padding: '12px 20px', marginBottom: '24px', fontFamily: "'Share Tech Mono', monospace", fontSize: '10px', color: 'rgba(255,100,100,0.8)', letterSpacing: '2px' }}>
                ⚠ AUTHENTICATION ERROR — PLEASE TRY AGAIN
              </div>
            )}

            {/* Login button */}
            <a
              href="/api/auth/bungie"
              style={{
                display: 'inline-block',
                background: 'rgba(0,245,255,0.07)',
                border: '1px solid rgba(0,245,255,0.45)',
                color: '#00f5ff',
                fontFamily: "'Share Tech Mono', monospace",
                fontSize: '11px',
                letterSpacing: '4px',
                padding: '16px 52px',
                borderRadius: '3px',
                textDecoration: 'none',
                marginBottom: '14px',
              }}
            >
              ● LOGIN WITH BUNGIE
            </a>

            <div style={{ fontFamily: "'Share Tech Mono', monospace", color: 'rgba(255,255,255,0.18)', fontSize: '8px', letterSpacing: '2px', marginBottom: '56px' }}>
              SECURE · NO PASSWORD STORED · BUNGIE OAUTH 2.0
            </div>

            {/* Three step preview */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
              {[
                { n: '01', label: 'CONNECT\nBUNGIE IDENTITY' },
                { n: '02', label: 'COMPLETE\nRUNNER INTAKE' },
                { n: '03', label: 'RECEIVE\nFULL AUDIT' },
              ].map((step, i) => (
                <div key={step.n} style={{ padding: '22px 16px', textAlign: 'center', borderRight: i < 2 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                  <div style={{ fontFamily: "'Orbitron', sans-serif", color: '#00f5ff', fontSize: '22px', fontWeight: 700, marginBottom: '10px' }}>{step.n}</div>
                  <div style={{ fontFamily: "'Share Tech Mono', monospace", color: 'rgba(255,255,255,0.3)', fontSize: '8px', letterSpacing: '2px', lineHeight: 2.2, whiteSpace: 'pre-line' }}>{step.label}</div>
                </div>
              ))}
            </div>
          </>
        )}

      </div>
    </div>
  );
}
