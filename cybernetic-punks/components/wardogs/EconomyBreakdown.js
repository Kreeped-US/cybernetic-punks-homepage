'use client';

// components/wardogs/EconomyBreakdown.js
// "Where the money flows" -- the modeled spend-by-category breakdown for the /wardogs/economy
// hub. Animated share bars (fill on mount) with each category's share + representative per-use
// cost. This is the intel that legitimizes the hero ticker: the big number is these categories.
// HONEST: modeled distribution (frequency x representative price), labeled; per-use cost, not
// the one-time unlock fee. The bars are proportional, computed server-side from real data.

import { useEffect, useState } from 'react';

const A = 'var(--accent, #e0a13a)';
const COLORS = {
  weapons: '#e0a13a', armor: '#e07a3a', vehicles: '#c9b037',
  medical: '#5bd18e', gear: '#8a8f98', ammo: '#6f6f6f',
};
const money = (n) => '$' + Number(n).toLocaleString('en-US');

export default function EconomyBreakdown({ categories = [] }) {
  const [grown, setGrown] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setGrown(true), 60);
    return () => clearTimeout(t);
  }, []);

  const max = Math.max(1, ...categories.map((c) => c.sharePct));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {categories.map((c) => (
        <div key={c.key}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, marginBottom: 5 }}>
            <span style={{ fontFamily: 'var(--font-exo2), system-ui, sans-serif', fontSize: 14.5, fontWeight: 800, color: '#fff' }}>{c.label}</span>
            <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-tertiary)' }}>~{money(c.repCost)} &times; {c.freq}/hr</span>
              <span style={{ fontFamily: 'var(--font-exo2), system-ui, sans-serif', fontSize: 16, fontWeight: 800, color: COLORS[c.key] || A, minWidth: 44, textAlign: 'right' }}>{c.sharePct.toFixed(1)}%</span>
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
