'use client';
// components/wardogs/PersonalEconomy.js
// WAVE 2 -- "Your Wardogs Economy" (Spotify-Wrapped-style personalized stat). The player enters
// hours / level / playstyle / vehicle use -> their estimated spend + breakdown + a shareable line
// with the "what's YOUR damage?" comparison hook (the viral loop: people share themselves, friends
// want theirs). Runs on the SAME recalibrated model (personalSpend), so the number is DEFENSIBLE.
// HONEST: modeled from THEIR inputs, NOT tracked -- labeled throughout.
//
// State lives in the URL (?h/lvl/ps/v via history.replaceState -- no server round-trip) so a shared
// link reproduces the result AND the personalized OG card (generateMetadata reads the same params).

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { personalSpend, PLAYSTYLE, VEHICLE_USE } from '@/lib/wardogs/economyModel';

const A = 'var(--accent, #e0a13a)';
const EXO = 'var(--font-exo2), system-ui, sans-serif';
const usd = (n) => '$' + Math.round(Number(n) || 0).toLocaleString('en-US');
const CAT_COLORS = { weapons: '#e0a13a', medical: '#5bd18e', armor: '#7cc4ff', vehicles: '#c98bff', ammo: '#ff8f6b', gear: '#8b929c' };

const PS_KEYS = ['aggressive', 'balanced', 'tactical'];
const V_KEYS = ['never', 'sometimes', 'often'];

export default function PersonalEconomy({ data, initial = {} }) {
  const [hours, setHours] = useState(initial.hours != null ? String(initial.hours) : '');
  const [level, setLevel] = useState(initial.level != null ? String(initial.level) : '20');
  const [playstyle, setPlaystyle] = useState(PLAYSTYLE[initial.playstyle] ? initial.playstyle : 'balanced');
  const [vehicles, setVehicles] = useState(VEHICLE_USE[initial.vehicles] ? initial.vehicles : 'sometimes');

  // Reflect state into the URL (shareable + drives the OG card). No navigation -- just the address.
  const syncUrl = useCallback((h, lvl, ps, v) => {
    if (typeof window === 'undefined') return;
    const q = new URLSearchParams();
    if (h) q.set('h', h);
    q.set('lvl', lvl); q.set('ps', ps); q.set('v', v);
    try { window.history.replaceState(null, '', '/wardogs/economy/mine?' + q.toString()); } catch (e) {}
  }, []);

  const set = (kind, val) => {
    const next = { hours, level, playstyle, vehicles, [kind]: val };
    if (kind === 'hours') setHours(val); else if (kind === 'level') setLevel(val);
    else if (kind === 'playstyle') setPlaystyle(val); else setVehicles(val);
    syncUrl(next.hours, next.level, next.playstyle, next.vehicles);
  };

  const hrsNum = Math.max(0, parseFloat(hours) || 0);
  const result = useMemo(
    () => (hrsNum > 0 ? personalSpend(data, { hours: hrsNum, level, playstyle, vehicles }) : null),
    [data, hrsNum, level, playstyle, vehicles]
  );

  const shareText = result
    ? "I've burned an estimated " + usd(result.total) + ' in Wardogs since launch (' + result.playstyleLabel.toLowerCase() + ', ' + result.loadouts + ' loadouts) -- what\'s YOUR damage? (modeled)'
    : '';
  const shareUrl = 'https://cyberneticpunks.com/wardogs/economy/mine' + (result
    ? '?h=' + hrsNum + '&lvl=' + level + '&ps=' + playstyle + '&v=' + vehicles : '');
  const xHref = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(shareText) + '&url=' + encodeURIComponent(shareUrl) + '&via=Cybernetic87250';
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(shareText + ' ' + shareUrl); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch (e) {}
  };

  const fieldLabel = { fontFamily: 'monospace', fontSize: 9, fontWeight: 800, letterSpacing: 2, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 8, display: 'block' };
  const inputStyle = { width: '100%', boxSizing: 'border-box', background: '#0e1116', border: '1px solid #262b33', color: '#fff', fontFamily: EXO, fontSize: 20, fontWeight: 800, padding: '12px 14px', borderRadius: 6 };
  const toggleBtn = (active, color) => ({ flex: 1, minWidth: 88, padding: '11px 8px', background: active ? (color || A) + '22' : 'transparent', border: '1px solid ' + (active ? (color || A) : '#262b33'), color: active ? '#fff' : 'var(--text-secondary)', fontFamily: 'monospace', fontSize: 11, fontWeight: 700, letterSpacing: 0.5, borderRadius: 6, cursor: 'pointer', textTransform: 'capitalize' });

  return (
    <div>
      {/* INPUT */}
      <div style={{ background: '#0e1116', border: '1px solid #1d2026', borderRadius: 10, padding: 'clamp(18px,3vw,26px)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 18 }}>
          <div>
            <label style={fieldLabel}>Hours played</label>
            <input type="number" inputMode="numeric" min="0" placeholder="e.g. 40" value={hours} onChange={(e) => set('hours', e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={fieldLabel}>Your level (career / class)</label>
            <input type="number" inputMode="numeric" min="0" placeholder="e.g. 20" value={level} onChange={(e) => set('level', e.target.value)} style={inputStyle} />
          </div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={fieldLabel}>Playstyle</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {PS_KEYS.map((k) => (
              <button key={k} onClick={() => set('playstyle', k)} style={toggleBtn(playstyle === k)}>{PLAYSTYLE[k].label}</button>
            ))}
          </div>
        </div>
        <div>
          <label style={fieldLabel}>Do you run vehicles?</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {V_KEYS.map((k) => (
              <button key={k} onClick={() => set('vehicles', k)} style={toggleBtn(vehicles === k, '#c98bff')}>{VEHICLE_USE[k].label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* RESULT */}
      {!result ? (
        <div style={{ marginTop: 16, padding: '28px 20px', textAlign: 'center', color: 'var(--text-tertiary)', fontFamily: 'monospace', fontSize: 12, letterSpacing: 1, border: '1px dashed #262b33', borderRadius: 10 }}>
          ENTER YOUR HOURS TO SEE YOUR DAMAGE
        </div>
      ) : (
        <div style={{ marginTop: 16, background: 'radial-gradient(120% 140% at 12% 0%, #17130b 0%, #0e1116 62%)', border: '1px solid ' + A, borderRadius: 10, padding: 'clamp(20px,3.5vw,32px)' }}>
          <div style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 800, letterSpacing: 2, color: A, textTransform: 'uppercase', marginBottom: 10 }}>Your Wardogs economy &middot; modeled</div>
          <div style={{ fontFamily: EXO, fontSize: 'clamp(40px,9vw,72px)', fontWeight: 800, color: '#fff', lineHeight: 1, letterSpacing: '-1px', fontVariantNumeric: 'tabular-nums' }}>{usd(result.total)}</div>
          <div style={{ fontFamily: EXO, fontSize: 'clamp(14px,2vw,17px)', fontWeight: 700, color: 'rgba(255,255,255,0.85)', marginTop: 10 }}>
            burned in Wardogs since launch <span style={{ color: A }}>(estimated from your {result.hours} hrs)</span>
          </div>
          <div style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.6, marginTop: 8 }}>
            That&rsquo;s about <strong style={{ color: '#fff' }}>{result.loadouts.toLocaleString()} loadouts</strong>
            {result.havocs != null && <> &middot; <strong style={{ color: '#fff' }}>{result.havocs} Havocs</strong></>}
            {' '}&middot; <strong style={{ color: '#fff' }}>{usd(result.perHour)}/hr</strong>. {result.playstyleBlurb}
          </div>

          {/* breakdown */}
          <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 9 }}>
            {result.categories.map((c) => (
              <div key={c.key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                  <span style={{ color: 'rgba(255,255,255,0.75)', fontWeight: 600 }}>{c.label}</span>
                  <span style={{ color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>{usd(c.total)} &middot; {c.sharePct.toFixed(0)}%</span>
                </div>
                <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: 6, width: Math.max(1, c.sharePct) + '%', background: CAT_COLORS[c.key] || A, borderRadius: 3 }} />
                </div>
              </div>
            ))}
          </div>

          {/* share -- the viral hook */}
          <div style={{ marginTop: 22, paddingTop: 18, borderTop: '1px solid #262b33' }}>
            <div style={{ fontFamily: EXO, fontSize: 15, fontWeight: 800, color: '#fff', marginBottom: 10 }}>What&rsquo;s your damage? Make your friends check theirs.</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <a href={xHref} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: A, color: '#0b0d10', fontFamily: EXO, fontSize: 14, fontWeight: 800, padding: '11px 20px', borderRadius: 6, textDecoration: 'none' }}>Share on X &rarr;</a>
              <button onClick={copy} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'transparent', color: 'var(--text-secondary)', border: '1px solid #262b33', fontFamily: EXO, fontSize: 14, fontWeight: 700, padding: '10px 18px', borderRadius: 6, cursor: 'pointer' }}>{copied ? 'Copied!' : 'Copy result'}</button>
            </div>
          </div>

          {/* honest label */}
          <div style={{ marginTop: 18, fontSize: 11, color: 'var(--text-tertiary)', lineHeight: 1.55 }}>
            A <strong style={{ color: 'rgba(255,255,255,0.6)' }}>modeled estimate</strong> from your inputs and our economy model &mdash; in-game credits, not real money, and we did <strong style={{ color: 'rgba(255,255,255,0.6)' }}>not</strong> track you. Same recalibrated basket as the community model (weighted weapon cost, deaths-that-rebuy, real prices), scaled to your hours, level, and playstyle.
          </div>
        </div>
      )}

      {/* funnel */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 16 }}>
        <Link href="/wardogs/loadouts" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: A, color: '#0b0d10', fontFamily: EXO, fontSize: 14, fontWeight: 800, padding: '12px 20px', borderRadius: 4, textDecoration: 'none' }}>Now find your best loadout &rarr;</Link>
        <Link href="/wardogs/economy" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'transparent', color: 'var(--text-secondary)', border: '1px solid #262b33', fontFamily: EXO, fontSize: 14, fontWeight: 700, padding: '11px 18px', borderRadius: 4, textDecoration: 'none' }}>See the full economy &rarr;</Link>
      </div>
    </div>
  );
}
