'use client';

// components/wardogs/EconomyBreakdown.js
// "Where the money flows" -- the RECONCILED spend-by-category breakdown for the /wardogs/economy
// hub. Each category shows a live ticking $ (its own spendPerSec x elapsed) + its share of the
// total + an animated bar. Because each category's spendPerSec sums to the hero ticker's rate,
// these categories literally ADD UP to the big number -- the breakdown IS the ticker's composition.
// HONEST: modeled (frequency x real price), labeled; per-use cost, never the one-time unlock fee.

import { useEffect, useRef, useState } from 'react';

const A = 'var(--accent, #e0a13a)';
const COLORS = {
  weapons: '#e0a13a', vehicles: '#e07a3a', ammo: '#c9b037',
  armor: '#5b9bd1', medical: '#5bd18e', gear: '#8a8f98',
};
const money = (n) => '$' + Math.floor(n).toLocaleString('en-US');

export default function EconomyBreakdown({ categories = [], launchIso = '2026-09-10T16:00:00Z' }) {
  const launchMs = new Date(launchIso).getTime();
  const [now, setNow] = useState(() => Date.now());
  const [grown, setGrown] = useState(false);
  const raf = useRef(0);

  useEffect(() => {
    const g = setTimeout(() => setGrown(true), 60);
    let alive = true;
    const tick = () => { if (!alive) return; setNow(Date.now()); raf.current = requestAnimationFrame(tick); };
    raf.current = requestAnimationFrame(tick);
    return () => { alive = false; clearTimeout(g); cancelAnimationFrame(raf.current); };
  }, []);

  const elapsed = Math.max(0, (now - launchMs) / 1000);
  const max = Math.max(1, ...categories.map((c) => c.sharePct));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {categories.map((c) => (
        <div key={c.key}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, marginBottom: 5, flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontFamily: 'var(--font-exo2), system-ui, sans-serif', fontSize: 14.5, fontWeight: 800, color: '#fff' }}>{c.label}</span>
              <span style={{ fontFamily: 'monospace', fontSize: 10.5, color: 'var(--text-tertiary)' }}>~{money(c.repCost)} &times; {c.freq}/hr</span>
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 10 }}>
              <span style={{ fontFamily: 'var(--font-exo2), system-ui, sans-serif', fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.9)', fontVariantNumeric: 'tabular-nums' }}>{money(c.spendPerSec * elapsed)}</span>
              <span style={{ fontFamily: 'var(--font-exo2), system-ui, sans-serif', fontSize: 16, fontWeight: 800, color: COLORS[c.key] || A, minWidth: 46, textAlign: 'right' }}>{c.sharePct.toFixed(1)}%</span>
            </span>
          </div>
          <div style={{ height: 12, background: '#0b0d10', border: '1px solid #1d2026', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: (grown ? (c.sharePct / max) * 100 : 0) + '%',
              background: 'linear-gradient(90deg, ' + (COLORS[c.key] || A) + ', ' + (COLORS[c.key] || A) + 'cc)',
              borderRadius: 2,
              transition: 'width 900ms cubic-bezier(0.22, 1, 0.36, 1)',
              boxShadow: '0 0 10px ' + (COLORS[c.key] || A) + '55',
            }} />
          </div>
        </div>
      ))}
    </div>
  );
}
