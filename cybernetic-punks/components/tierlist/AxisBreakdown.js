'use client';
// components/tierlist/AxisBreakdown.js
// ============================================================
// GAME-AGNOSTIC weapon axis-breakdown panel -- "here's the math" transparency.
// Driven PURELY by model output (the axes object from computeWeaponTiers) + a per-band
// firepower methodology string passed in. No Marathon-specifics baked in, so game #2 reuses it
// unchanged from the same lib output. Renders the 4 axis scores (0-100) as labeled bars + the
// tier/band header + the firepower methodology disclosure. Weapons only (shells derive
// separately and never reach this panel).

const AXES = [
  { key: 'firepower', label: 'Firepower', color: '#ff8800' },
  { key: 'accuracy',  label: 'Accuracy',  color: '#00d4ff' },
  { key: 'handling',  label: 'Handling',  color: '#00ff41' },
  { key: 'range',     label: 'Range',     color: '#9b5de5' },
];

function Bar({ label, value, color }) {
  const na = value == null;
  const pct = na ? 0 : Math.max(0, Math.min(100, value));
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
        <span style={{ fontSize: 11, letterSpacing: 1.5, fontWeight: 700, color: 'rgba(255,255,255,0.75)', fontFamily: 'monospace' }}>{label.toUpperCase()}</span>
        <span style={{ fontSize: 13, fontWeight: 800, color: na ? 'rgba(255,255,255,0.3)' : '#fff', fontFamily: 'Orbitron, monospace' }}>{na ? 'N/A' : Math.round(value)}</span>
      </div>
      <div style={{ height: 7, background: '#0e1014', border: '1px solid #22252e', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: pct + '%', height: '100%', background: color, opacity: na ? 0.15 : 0.85, transition: 'width 0.2s' }} />
      </div>
    </div>
  );
}

export default function AxisBreakdown({ name, tier, bandLabel, axes, unrankable, firepowerNote, accent = '#00ff41', onClose }) {
  const a = axes || {};
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: '#161920', border: '1px solid #2a2e38', borderRadius: 8, width: 'min(440px, 100%)', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, padding: '18px 20px 14px', borderBottom: '1px solid #22252e' }}>
          <div>
            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 17, fontWeight: 800, color: '#fff', letterSpacing: 0.5 }}>{name}</div>
            <div style={{ fontSize: 11, letterSpacing: 1.5, fontWeight: 700, marginTop: 5, fontFamily: 'monospace' }}>
              <span style={{ color: accent }}>{unrankable ? 'UNRANKED' : (tier + '-TIER')}</span>
              {bandLabel ? <span style={{ color: 'rgba(255,255,255,0.4)' }}> {'·'} {bandLabel.toUpperCase()} CLASS</span> : null}
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 22, cursor: 'pointer', lineHeight: 1, padding: 0 }}>{'×'}</button>
        </div>

        {/* Axis bars */}
        <div style={{ padding: '18px 20px 6px' }}>
          {unrankable ? (
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>
              This weapon has insufficient stat data to score, so it is not ranked by the model.
            </div>
          ) : AXES.map(ax => <Bar key={ax.key} label={ax.label} value={a[ax.key]} color={ax.color} />)}
        </div>

        {/* Methodology disclosure -- the moat */}
        <div style={{ padding: '10px 20px 18px' }}>
          <div style={{ fontSize: 10, letterSpacing: 1.5, color: 'rgba(255,255,255,0.3)', fontWeight: 700, fontFamily: 'monospace', marginBottom: 6 }}>HOW THIS IS SCORED</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
            Ranked within its class from the game{"'"}s own stats -- weighted Accuracy 34%, Firepower 32%, Handling 18%, Range 16%.
            {firepowerNote ? ' ' + firepowerNote : ''}
          </div>
        </div>
      </div>
    </div>
  );
}
