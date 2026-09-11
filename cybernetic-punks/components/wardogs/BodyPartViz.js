'use client';
// components/wardogs/BodyPartViz.js
// SHARED Wardogs body-part lethality viz -- the net-new hero of the weapon page AND reused in the
// advisor recommendation (one component, two callers). Renders shots-to-kill (primary) + damage +
// armor-break per body zone from the ATTRIBUTED ballistics matrix (wardogs_ballistics: 8 zones x
// FMJ/HP/AP x armor 0-4), with ammo/armor toggles the competitor's static hit-multiplier can't show.
//
// PURE RENDER: takes the weapon's matrix rows IN (the caller queries; no DB/fetch here) -> reusable +
// testable. `matrix` = rows { body_part, ammo_type, armor_tier, damage, shots_to_kill, armor_break_shots }.
//
// SEO-FIRST (the ranking substance): the DEFAULT profile (FMJ / tier 0) renders as a SEMANTIC, SERVER-
// RENDERED <table> of real numbers (crawlable text -- "Head: 2 shots, 66 dmg"), which is what ranks for
// "wardogs <weapon> shots to kill / body damage". The SVG silhouette is a HUMAN enhancement ON TOP; the
// toggles reveal other states for humans (client), but the default data is always in the crawlable HTML.
// Motion is CSS-only (GPU-cheap fill transition on toggle + hover) so it never costs LCP/CLS.
//
// HONEST-NULL: a weapon with no matrix (the 3 launchers) renders a graceful "no ballistics yet" panel.

import { useState } from 'react';
import { TierIcon, CONFIDENCE_TIERS } from '@/components/network/confidenceTiers';

const A = 'var(--accent)';
const CARD = 'var(--bg-card)';
const PAGE = 'var(--bg-page)';
const LINE = 'var(--border)';
const LSUB = 'var(--border-subtle)';
const T1 = 'var(--text-primary)';
const T2 = 'var(--text-secondary)';
const T3 = 'var(--text-tertiary)';

const AMMOS = ['FMJ', 'HP', 'AP'];
const TIERS = [0, 1, 2, 3, 4];
// Display order + human labels for the 8 real body_part values.
const ZONES = [
  { key: 'HEAD',       label: 'Head' },
  { key: 'CHEST',      label: 'Chest' },
  { key: 'U STOMACH',  label: 'Upper stomach' },
  { key: 'L STOMACH',  label: 'Lower stomach' },
  { key: 'GROIN',      label: 'Groin' },
  { key: 'UPPER LIMB', label: 'Arms' },
  { key: 'LOWER LIMB', label: 'Legs' },
  { key: 'EXTREMITY',  label: 'Extremities' },
];

// Shots-to-kill HEAT ramp (fewer shots = deadlier = hotter). Absolute buckets so colors are comparable
// across weapons + profiles (not relative to each weapon's own min/max). null -> cold "no data".
function stkColor(stk) {
  if (stk == null) return '#2b3038'; // no data -- cool slate
  const s = Math.round(stk);
  if (s <= 1) return '#ff3b30'; // one-shot -- vivid danger red
  if (s === 2) return '#ff6a2c'; // orange
  if (s === 3) return '#ff9e1b'; // amber
  if (s === 4) return '#e3c24b'; // gold
  if (s === 5) return '#9fae6a'; // fading
  if (s <= 7) return '#5f7f88'; // steel
  return '#43596a'; // 8+ -- cool (many shots / safe)
}
function fmtStk(v) { return v == null ? null : Math.round(v); }
function fmtDmg(v) { return v == null ? null : Math.round(v * 10) / 10; }
function tierMeta(key) { return CONFIDENCE_TIERS.find((t) => t.key === key) || CONFIDENCE_TIERS[2]; }

function Toggle({ options, value, onChange, ariaLabel }) {
  return (
    <div role="group" aria-label={ariaLabel} style={{ display: 'inline-flex', border: '1px solid ' + LINE, borderRadius: 3, overflow: 'hidden' }}>
      {options.map((o) => {
        const active = String(o.value) === String(value);
        return (
          <button key={String(o.value)} type="button" onClick={() => onChange(o.value)} aria-pressed={active}
            style={{
              fontFamily: 'monospace', fontSize: 11, fontWeight: 800, letterSpacing: 1, padding: '6px 11px',
              border: 'none', cursor: 'pointer', transition: 'background .15s ease, color .15s ease',
              background: active ? A : 'transparent', color: active ? PAGE : T2,
            }}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ANATOMICAL silhouette. A designed body OUTLINE (smooth curves -- head, rounded shoulders, tapered
// torso, legs) split as two clip paths: the axial body+legs (bpvCore) and the two arms (bpvArms). Each
// hit zone is a horizontal BAND painted as a full-width rect CLIPPED to the anatomy, so the fill takes
// the body's real contour (like a reference hit-zone chart) instead of blocky primitives. Bands recolor
// by shots-to-kill on toggle (CSS fill transition). Depth sheen + a crisp light edge + thin segment
// separators = a designed, AAA-stats-screen look, not programmer art.
const CORE_D = 'M120,18 C137,18 149,32 149,50 C149,65 140,75 130,79 L130,91 C152,94 168,104 173,124 '
  + 'C179,156 170,196 162,236 C160,248 158,256 156,263 L150,279 L146,432 C146,441 140,446 132,446 '
  + 'C126,446 123,441 123,432 L121,286 L119,286 L117,432 C117,441 114,446 108,446 C100,446 94,441 94,432 '
  + 'L90,279 L84,263 C82,256 80,248 78,236 C70,196 61,156 67,124 C72,104 88,94 110,91 L110,79 '
  + 'C100,75 91,65 91,50 C91,32 103,18 120,18 Z';
const ARM_R_D = 'M176,110 C186,113 194,124 196,140 C198,172 194,208 189,240 C188,252 185,262 184,270 '
  + 'C184,276 180,278 176,278 C172,278 168,276 168,270 C167,262 165,252 164,240 C160,208 168,172 170,140 '
  + 'C171,126 173,117 176,110 Z';
const ARM_L_D = 'M64,110 C54,113 46,124 44,140 C42,172 46,208 51,240 C52,252 55,262 56,270 '
  + 'C56,276 60,278 64,278 C68,278 72,276 72,270 C73,262 75,252 76,240 C80,208 72,172 70,140 '
  + 'C69,126 67,117 64,110 Z';
// Each zone as a horizontal band {key, clip, y, h}; EXTREMITY appears twice (feet on core, hands on arms).
const BANDS = [
  { key: 'HEAD',       clip: 'core', y: 16,  h: 72 },
  { key: 'CHEST',      clip: 'core', y: 88,  h: 64 },
  { key: 'U STOMACH',  clip: 'core', y: 152, h: 40 },
  { key: 'L STOMACH',  clip: 'core', y: 192, h: 38 },
  { key: 'GROIN',      clip: 'core', y: 230, h: 48 },
  { key: 'LOWER LIMB', clip: 'core', y: 278, h: 156 },
  { key: 'EXTREMITY',  clip: 'core', y: 434, h: 30 },   // feet
  { key: 'UPPER LIMB', clip: 'arms', y: 88,  h: 164 },  // arms
  { key: 'EXTREMITY',  clip: 'arms', y: 252, h: 34 },   // hands
];
const CORE_BOUNDS = [88, 152, 192, 230, 278, 434];

function Silhouette({ colorOf, hover, setHover }) {
  const clipUrl = (c) => 'url(#bpv' + (c === 'core' ? 'Core' : 'Arms') + ')';
  return (
    <svg viewBox="0 0 240 470" width="100%" style={{ maxWidth: 240, display: 'block', margin: '0 auto' }} role="img" aria-label="Body-part lethality diagram">
      <defs>
        <clipPath id="bpvCore"><path d={CORE_D} /></clipPath>
        <clipPath id="bpvArms"><path d={ARM_R_D + ' ' + ARM_L_D} /></clipPath>
        <linearGradient id="bpvSheen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.12" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.28" />
        </linearGradient>
      </defs>

      {/* zone bands -- full-width rects clipped to the anatomy -> contoured fills */}
      {BANDS.map((b, i) => (
        <rect key={i} x="0" y={b.y} width="240" height={b.h} fill={colorOf(b.key)} className="bpv-zone"
          clipPath={clipUrl(b.clip)} onMouseEnter={() => setHover(b.key)} onMouseLeave={() => setHover(null)} style={{ cursor: 'pointer' }} />
      ))}

      {/* thin segment separators (within the body) */}
      {CORE_BOUNDS.map((y) => <rect key={y} x="0" y={y - 0.6} width="240" height="1.2" fill="rgba(8,9,12,0.42)" clipPath="url(#bpvCore)" pointerEvents="none" />)}
      <rect x="0" y="251.4" width="240" height="1.2" fill="rgba(8,9,12,0.42)" clipPath="url(#bpvArms)" pointerEvents="none" />

      {/* depth sheen */}
      <rect x="0" y="0" width="240" height="470" fill="url(#bpvSheen)" clipPath="url(#bpvCore)" pointerEvents="none" />
      <rect x="0" y="0" width="240" height="470" fill="url(#bpvSheen)" clipPath="url(#bpvArms)" pointerEvents="none" />

      {/* hover highlight (wash the hovered zone's band[s]) */}
      {hover && BANDS.filter((b) => b.key === hover).map((b, i) => (
        <rect key={'h' + i} x="0" y={b.y} width="240" height={b.h} fill="rgba(255,255,255,0.16)" clipPath={clipUrl(b.clip)} pointerEvents="none" />
      ))}

      {/* crisp light edge (no harsh black outline) */}
      <path d={CORE_D} fill="none" stroke="rgba(255,255,255,0.20)" strokeWidth="1.4" pointerEvents="none" />
      <path d={ARM_R_D} fill="none" stroke="rgba(255,255,255,0.20)" strokeWidth="1.4" pointerEvents="none" />
      <path d={ARM_L_D} fill="none" stroke="rgba(255,255,255,0.20)" strokeWidth="1.4" pointerEvents="none" />
    </svg>
  );
}

function NoData({ weaponName }) {
  return (
    <div style={{ background: CARD, border: '1px solid ' + LINE, borderRadius: 4, padding: '28px 22px', textAlign: 'center', color: T3, fontFamily: 'system-ui, sans-serif' }}>
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true" style={{ display: 'block', margin: '0 auto 10px', opacity: 0.6 }}>
        <circle cx="12" cy="12" r="8.2" /><line x1="12" y1="0.5" x2="12" y2="4.5" /><line x1="12" y1="19.5" x2="12" y2="23.5" /><line x1="0.5" y1="12" x2="4.5" y2="12" /><line x1="19.5" y1="12" x2="23.5" y2="12" />
      </svg>
      <div style={{ fontSize: 13, fontWeight: 700, color: T2, marginBottom: 4 }}>No ballistics data yet{weaponName ? ' for the ' + weaponName : ''}</div>
      <div style={{ fontSize: 12, lineHeight: 1.5, maxWidth: 380, margin: '0 auto' }}>
        Shots-to-kill and body-part damage appear once community testing covers this weapon. We show measured data, never guesses.
      </div>
    </div>
  );
}

export default function BodyPartViz({ matrix, weaponName, defaultAmmo = 'FMJ', defaultTier = 0, tier = 'attributed', sourceLabel }) {
  const has = Array.isArray(matrix) && matrix.length > 0;
  const [ammo, setAmmo] = useState(AMMOS.indexOf(defaultAmmo) !== -1 ? defaultAmmo : 'FMJ');
  const [armor, setArmor] = useState(TIERS.indexOf(defaultTier) !== -1 ? defaultTier : 0);
  const [hover, setHover] = useState(null);

  if (!has) return <NoData weaponName={weaponName} />;

  // lookup[body_part][ammo|tier] = { stk, dmg, brk }
  const lookup = {};
  for (const r of matrix) {
    if (!r || !r.body_part) continue;
    (lookup[r.body_part] = lookup[r.body_part] || {})[r.ammo_type + '|' + r.armor_tier] =
      { stk: r.shots_to_kill, dmg: r.damage, brk: r.armor_break_shots };
  }
  const cellOf = (zoneKey, a = ammo, t = armor) => (lookup[zoneKey] || {})[a + '|' + t] || null;
  const colorOf = (zoneKey) => { const c = cellOf(zoneKey); return stkColor(c ? c.stk : null); };
  const tm = tierMeta(tier);

  return (
    <div style={{ background: CARD, border: '1px solid ' + LINE, borderRadius: 4, padding: '18px 20px', fontFamily: 'system-ui, sans-serif' }}>
      <style>{'.bpv-zone{transition:fill .24s ease, stroke .15s ease, stroke-width .15s ease}.bpv-fade{animation:bpvFade .4s ease both}@keyframes bpvFade{from{opacity:0}to{opacity:1}}.bpv-row-hi{background:var(--accent-glow)}'}</style>

      {/* header + provenance */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
        <div style={{ fontSize: 10, letterSpacing: 2.5, color: A, fontWeight: 800, fontFamily: 'monospace' }}>&#9698; BODY-PART LETHALITY</div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: tm.color, fontSize: 10, fontWeight: 700, letterSpacing: 1, fontFamily: 'monospace' }}>
          <TierIcon tier={tier} size={12} /> {tm.label.toUpperCase()}
        </div>
      </div>
      <div style={{ fontSize: 12.5, color: T2, lineHeight: 1.5, marginBottom: 14 }}>
        Shots to kill per body part {weaponName ? 'for the ' + weaponName : ''} &mdash; measured across ammo and enemy armor. Lower = deadlier.
      </div>

      {/* toggles */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ fontSize: 9, letterSpacing: 1.5, color: T3, fontWeight: 800, fontFamily: 'monospace' }}>AMMO</span>
          <Toggle ariaLabel="Ammo type" value={ammo} onChange={setAmmo} options={AMMOS.map((a) => ({ value: a, label: a }))} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ fontSize: 9, letterSpacing: 1.5, color: T3, fontWeight: 800, fontFamily: 'monospace' }}>ARMOR</span>
          <Toggle ariaLabel="Enemy armor tier" value={armor} onChange={setArmor} options={TIERS.map((t) => ({ value: t, label: 'T' + t }))} />
        </div>
      </div>

      {/* SVG (human enhancement) + crawlable TABLE (SEO substance) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 260px) 1fr', gap: 18, alignItems: 'start' }} className="bpv-grid">
        <div className="bpv-fade" style={{ background: PAGE, border: '1px solid ' + LSUB, borderRadius: 4, padding: '10px' }}>
          <Silhouette colorOf={colorOf} hover={hover} setHover={setHover} />
        </div>

        {/* Crawlable, semantic table of the SELECTED profile (default FMJ/T0 is server-rendered). */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'monospace' }}>
            <caption style={{ captionSide: 'top', textAlign: 'left', fontSize: 11, color: T3, marginBottom: 8, fontWeight: 700 }}>
              {(weaponName ? weaponName + ' ' : '') + 'shots to kill by body part (' + ammo + ' ammo vs armor tier ' + armor + ')'}
            </caption>
            <thead>
              <tr style={{ borderBottom: '1px solid ' + LINE }}>
                <th scope="col" style={{ textAlign: 'left', fontSize: 9, letterSpacing: 1, color: T3, fontWeight: 800, padding: '6px 8px 6px 0' }}>ZONE</th>
                <th scope="col" style={{ textAlign: 'right', fontSize: 9, letterSpacing: 1, color: T3, fontWeight: 800, padding: '6px 8px' }}>SHOTS</th>
                <th scope="col" style={{ textAlign: 'right', fontSize: 9, letterSpacing: 1, color: T3, fontWeight: 800, padding: '6px 8px' }}>DMG</th>
                <th scope="col" style={{ textAlign: 'right', fontSize: 9, letterSpacing: 1, color: T3, fontWeight: 800, padding: '6px 0 6px 8px' }}>ARMOR BREAK</th>
              </tr>
            </thead>
            <tbody>
              {ZONES.map((z) => {
                const c = cellOf(z.key);
                const stk = c ? fmtStk(c.stk) : null;
                const hi = hover === z.key;
                return (
                  <tr key={z.key} className={hi ? 'bpv-row-hi' : undefined}
                    onMouseEnter={() => setHover(z.key)} onMouseLeave={() => setHover(null)}
                    style={{ borderBottom: '1px solid ' + LSUB }}>
                    <th scope="row" style={{ textAlign: 'left', fontWeight: 700, fontSize: 12, color: hi ? '#fff' : T2, padding: '7px 8px 7px 0' }}>
                      <span aria-hidden="true" style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 2, marginRight: 7, verticalAlign: 'middle', background: stkColor(c ? c.stk : null), transition: 'background .24s ease' }} />
                      {z.label}
                    </th>
                    <td style={{ textAlign: 'right', fontSize: 15, fontWeight: 800, color: c ? A : T3, padding: '7px 8px' }}>{stk != null ? stk : 'n/a'}</td>
                    <td style={{ textAlign: 'right', fontSize: 12, color: T2, padding: '7px 8px' }}>{c && c.dmg != null ? fmtDmg(c.dmg) : '-'}</td>
                    <td style={{ textAlign: 'right', fontSize: 12, color: c && c.brk != null ? T2 : T3, padding: '7px 0 7px 8px' }}>{c && c.brk != null ? '+' + fmtStk(c.brk) : '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* legend + attribution */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginTop: 14, paddingTop: 12, borderTop: '1px solid ' + LSUB }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 9, color: T3, fontFamily: 'monospace', fontWeight: 700 }}>
          <span>DEADLIER</span>
          {[1, 2, 3, 4, 5, 7, 8].map((s) => <span key={s} style={{ width: 14, height: 10, borderRadius: 2, background: stkColor(s) }} />)}
          <span>FEWER HITS &larr; &rarr; MORE</span>
        </div>
        {sourceLabel && <div style={{ fontSize: 10, color: T3, marginLeft: 'auto' }}>Source: {sourceLabel}</div>}
      </div>

      <style>{'@media (max-width: 560px){.bpv-grid{grid-template-columns:1fr !important}}'}</style>
    </div>
  );
}
