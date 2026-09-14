// components/wardogs/EconomyShareStats.js
// Screenshot-friendly "cool economy stats" cards for the /wardogs/economy hub -- the social hooks.
// Each card is a bold headline number + a plain-language label, carrying the CNP wordmark so a
// screenshot brings the brand back to the site. Server-rendered (crawlable). HONEST: these are
// real facts + model-derived rates, labeled as modeled where they come from the model.

const A = 'var(--accent)';
const EXO = 'var(--font-exo2), system-ui, sans-serif';

export default function EconomyShareStats({ stats = [] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 14 }}>
      {stats.map((s, i) => (
        <div key={i} style={{
          position: 'relative', overflow: 'hidden',
          background: 'linear-gradient(150deg, #16130c 0%, #0e1116 65%)',
          border: '1px solid #1d2026', borderTop: '2px solid ' + A, borderRadius: 8,
          padding: '18px 18px 14px', minHeight: 150, display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ position: 'absolute', top: 0, right: 0, width: '55%', height: '100%', background: 'radial-gradient(circle at 85% 20%, var(--accent-glow,rgba(224,161,58,0.16)), transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ position: 'relative', fontFamily: EXO, fontSize: 'clamp(28px,4.6vw,40px)', fontWeight: 800, color: A, lineHeight: 1.02, letterSpacing: '-0.5px', marginBottom: 8 }}>{s.big}</div>
          <div style={{ position: 'relative', fontSize: 13.5, color: 'rgba(255,255,255,0.88)', lineHeight: 1.45, fontWeight: 600, flex: 1 }}>{s.label}</div>
          {s.sub && <div style={{ position: 'relative', fontSize: 11, color: 'var(--text-tertiary)', lineHeight: 1.4, marginTop: 8 }}>{s.sub}</div>}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, paddingTop: 10, borderTop: '1px solid #1d2026' }}>
            <span style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 800, letterSpacing: 1, color: A, background: 'rgba(224,161,58,0.12)', border: '1px solid rgba(224,161,58,0.3)', borderRadius: 2, padding: '2px 6px' }}>CNP</span>
            <span style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, letterSpacing: 1, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>cyberneticpunks.com/wardogs &middot; modeled</span>
          </div>
        </div>
      ))}
    </div>
  );
}
