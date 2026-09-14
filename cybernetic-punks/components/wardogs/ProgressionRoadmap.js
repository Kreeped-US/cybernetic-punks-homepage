// components/wardogs/ProgressionRoadmap.js
// The per-track unlock roadmap (server-rendered, crawlable) -- shared by the /wardogs/economy
// hub (the merged Progression Planner). Renders each weapon's FULL unlock path: level gate +
// one-time UNLOCK cost + PER-LIFE price, labeled DISTINCTLY (never conflated), plus per-track
// totals. Honest-null: free starters "Unlocked by default", unknown levels "Level TBD", Deagle
// "Career level 85 (Bulkhead-official)". Takes a buildRoadmap() result.

const A = 'var(--accent)';
const EXO = 'var(--font-exo2), system-ui, sans-serif';
const money = (n) => '$' + Number(n).toLocaleString('en-US');

function GateLabel({ w }) {
  if (w.unlockFee === 0 && w.level == null && w.careerLevel == null) {
    return <span style={{ color: 'var(--green,#5bd18e)', fontWeight: 700 }}>Unlocked by default</span>;
  }
  if (w.careerLevel != null) {
    return <span>Career level <strong style={{ color: '#fff' }}>{w.careerLevel}</strong> <span style={{ color: 'var(--text-tertiary)', fontSize: 10 }}>(Bulkhead-official)</span></span>;
  }
  if (w.level != null) {
    return <span>{w.track} level <strong style={{ color: '#fff' }}>{w.level}</strong></span>;
  }
  return <span style={{ color: 'var(--text-tertiary)' }}>Level TBD <span style={{ fontSize: 10 }}>(not yet confirmed)</span></span>;
}

function WeaponRow({ w }) {
  const free = w.unlockFee === 0;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, 1.4fr) minmax(120px, 1.3fr) minmax(90px, 1fr) minmax(90px, 1fr)', gap: 10, alignItems: 'center', padding: '11px 14px', borderTop: '1px solid #16191f' }} className="wd-econ-row">
      <div style={{ fontFamily: EXO, fontSize: 14.5, fontWeight: 800, color: '#fff', letterSpacing: 0.2 }}>
        {w.name}
        {w.category && <span style={{ display: 'block', fontFamily: 'monospace', fontSize: 9, fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: 0.5, textTransform: 'uppercase', marginTop: 2 }}>{w.category}</span>}
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.4 }}><GateLabel w={w} /></div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: 0.8, textTransform: 'uppercase' }}>Unlock</div>
        <div style={{ fontFamily: EXO, fontSize: 14, fontWeight: 800, color: free ? 'var(--green,#5bd18e)' : A }}>{free ? 'Free' : (w.unlockFee == null ? 'TBD' : money(w.unlockFee))}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: 0.8, textTransform: 'uppercase' }}>Per life</div>
        <div style={{ fontFamily: EXO, fontSize: 14, fontWeight: 700, color: '#fff' }}>{w.perLife == null ? 'TBD' : money(w.perLife)}</div>
      </div>
    </div>
  );
}

export default function ProgressionRoadmap({ road }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {road.tracks.map((t) => (
        <div key={t.track} style={{ background: '#0e1116', border: '1px solid #1d2026', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, padding: '15px 16px', borderBottom: '1px solid #1d2026', background: 'linear-gradient(90deg, rgba(224,161,58,0.08), transparent 60%)', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <h3 style={{ fontFamily: EXO, fontSize: 22, fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.2px' }}>{t.track}</h3>
              <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)' }}>{t.count} weapons</span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontFamily: EXO, fontSize: 17, fontWeight: 800, color: A }}>{money(t.unlockTotal)}</span>
              <span style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: 0.8, textTransform: 'uppercase', marginLeft: 7 }}>to unlock the class</span>
            </div>
          </div>
          <div>{t.weapons.map((w) => <WeaponRow key={w.name} w={w} />)}</div>
        </div>
      ))}
    </div>
  );
}
