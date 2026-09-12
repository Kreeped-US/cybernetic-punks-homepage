'use client';

// components/wardogs/EconomyPlanner.js
// The interactive "plan by YOUR state" calculator for the Progression Planner. Enter your
// class/career level + cash saved -> it classifies every weapon into: unlockable now / need a
// higher level / need more cash (planByState, real unlock_fee + gate data). Client-only
// enhancement -- the full per-track roadmap below it is server-rendered + crawlable, so this
// adds interactivity without hiding the SEO substance. Honest: unlock fee (one-time) is the
// gate here, labeled distinctly from the per-life price.

import { useMemo, useState } from 'react';
import { planByState } from '@/lib/wardogs/progression';

const A = 'var(--accent, #e0a13a)';
const money = (n) => (n == null ? 'TBD' : '$' + Number(n).toLocaleString('en-US'));

function Group({ title, tone, weapons, note }) {
  if (!weapons.length) return null;
  const color = tone === 'go' ? 'var(--green,#5bd18e)' : tone === 'level' ? '#e0a13a' : '#ff6b6b';
  return (
    <div style={{ background: '#12151b', border: '1px solid #1d2026', borderLeft: '3px solid ' + color, borderRadius: '0 4px 4px 0', padding: '12px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
        <span style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 800, letterSpacing: 1.2, color, textTransform: 'uppercase' }}>{title}</span>
        <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)' }}>{weapons.length}</span>
      </div>
      {note && <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)', marginBottom: 8, lineHeight: 1.4 }}>{note}</div>}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {weapons.map((w) => (
          <span key={w.name} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#fff', background: '#0e1116', border: '1px solid #1d2026', borderRadius: 4, padding: '5px 9px' }}>
            {w.name}
            <span style={{ fontFamily: 'monospace', fontSize: 10.5, fontWeight: 700, color: A }}>
              {w.unlockFee === 0 ? 'FREE' : money(w.unlockFee)}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

export default function EconomyPlanner({ weapons }) {
  const [level, setLevel] = useState('');
  const [budget, setBudget] = useState('');

  const plan = useMemo(() => {
    const lvl = level === '' ? null : parseInt(level, 10);
    const bud = budget === '' ? null : parseInt(String(budget).replace(/[^0-9]/g, ''), 10);
    return planByState(weapons, { level: Number.isFinite(lvl) ? lvl : null, budget: Number.isFinite(bud) ? bud : null });
  }, [weapons, level, budget]);

  const active = level !== '' || budget !== '';
  const nextCheapestLocked = useMemo(() => {
    const locked = [...plan.needLevel, ...plan.needCash].filter((w) => w.unlockFee != null && w.unlockFee > 0);
    return locked.sort((a, b) => a.unlockFee - b.unlockFee)[0] || null;
  }, [plan]);

  const inputStyle = { background: '#0b0d10', border: '1px solid #262b33', borderRadius: 4, color: '#fff', fontSize: 15, fontWeight: 600, padding: '10px 12px', width: '100%', fontFamily: 'inherit' };
  const labelStyle = { fontFamily: 'monospace', fontSize: 10, fontWeight: 700, letterSpacing: 1, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 6, display: 'block' };

  return (
    <div style={{ background: '#0e1116', border: '1px solid #1d2026', borderTop: '2px solid ' + A, borderRadius: 8, padding: 'clamp(16px,3vw,22px)' }}>
      <div style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 800, letterSpacing: 2, color: A, textTransform: 'uppercase', marginBottom: 4 }}>Plan your grind</div>
      <div style={{ fontFamily: 'var(--font-exo2), system-ui, sans-serif', fontSize: 'clamp(17px,2.4vw,21px)', fontWeight: 800, color: '#fff', marginBottom: 14 }}>What can you unlock right now?</div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 16 }}>
        <div>
          <label style={labelStyle} htmlFor="wd-lvl">Your class / career level</label>
          <input id="wd-lvl" type="number" min="0" inputMode="numeric" placeholder="e.g. 20" value={level} onChange={(e) => setLevel(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle} htmlFor="wd-bud">Cash saved for unlocks</label>
          <input id="wd-bud" type="text" inputMode="numeric" placeholder="e.g. $50,000" value={budget} onChange={(e) => setBudget(e.target.value)} style={inputStyle} />
        </div>
      </div>

      {!active ? (
        <div style={{ fontSize: 12.5, color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
          Enter your level and/or cash to see what you can unlock now, what needs more grinding, and what to save for next. Everything below is the full ladder regardless.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Group title="Unlockable now" tone="go" weapons={plan.unlockableNow} note="Gate met and (if you set a budget) affordable. Free starters are always here." />
          <Group title="Keep leveling" tone="level" weapons={plan.needLevel} note="Your level isn't high enough for these yet." />
          <Group title="Save up for" tone="cash" weapons={plan.needCash} note="Level's fine — you just need more cash for the one-time unlock fee." />
          {nextCheapestLocked && (
            <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.5, marginTop: 2 }}>
              <span style={{ color: A, fontWeight: 800 }}>Next cheapest unlock:</span>{' '}
              <strong style={{ color: '#fff' }}>{nextCheapestLocked.name}</strong> &mdash; {money(nextCheapestLocked.unlockFee)} to unlock
              {nextCheapestLocked.perLife != null && nextCheapestLocked.perLife > 0 ? ', then ' + money(nextCheapestLocked.perLife) + '/life to field' : ''}.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
