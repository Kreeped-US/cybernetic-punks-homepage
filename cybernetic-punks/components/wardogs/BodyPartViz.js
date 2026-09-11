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
  if (stk == null) return '#5b6675'; // no data -- neutral slate (low chroma -> figure stays grey)
  const s = Math.round(stk);
  if (s <= 1) return '#ff2323'; // one-shot -- vivid red (hottest)
  if (s === 2) return '#ff6a15'; // orange
  if (s === 3) return '#ffab10'; // amber
  if (s === 4) return '#ffd633'; // gold / white-hot
  if (s === 5) return '#4fc6e6'; // cyan (heat-map midpoint -> cool)
  if (s <= 7) return '#2f95e6'; // blue
  return '#2f63d6'; // 8+ -- deep blue (many shots / safe)
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

// SILHOUETTE = the operator's reference figure (public/silhouette.jpg -- a sleek athletic tactical
// mannequin: real shoulders/chest/waist, muscled arms-slightly-out, hands, boots) rendered in GRAYSCALE
// as the base, then RECOLORED per hit-zone by our shots-to-kill data via mix-blend-mode:'color' (the
// overlay supplies the hue/chroma, the figure supplies the luminance -> 3D form-shading is preserved).
// This matches the reference's proportions + premium look EXACTLY (it IS the reference) while staying
// data-driven -- our wedge. Zones are geometric bands in the image's 1008x1792 space; 'color' blend over
// the black background stays black, so straight rects conform to the real silhouette. Torso zones are the
// centre column; arms are the side columns (so arm != torso colour). Recolour transitions via CSS.
const IMG_W = 1008, IMG_H = 1792;
// {key, rects:[[x,y,w,h],...]} in image coordinates. EXTREMITY = boots (centre-bottom) + both hands (sides).
const ZONE_REGIONS = [
  { key: 'HEAD',       rects: [[398, 88, 212, 252]] },
  { key: 'CHEST',      rects: [[350, 340, 310, 220]] },
  { key: 'U STOMACH',  rects: [[360, 560, 290, 100]] },
  { key: 'L STOMACH',  rects: [[372, 660, 266, 110]] },
  { key: 'GROIN',      rects: [[356, 770, 296, 165]] },
  { key: 'LOWER LIMB', rects: [[320, 935, 370, 620]] },
  { key: 'UPPER LIMB', rects: [[128, 330, 222, 535], [660, 330, 224, 535]] },
  { key: 'EXTREMITY',  rects: [[320, 1555, 370, 188], [150, 865, 200, 168], [660, 865, 200, 168]] },
];

function Silhouette({ colorOf, hover, setHover }) {
  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: 264, margin: '0 auto', isolation: 'isolate' }}>
      {/* base: the reference figure, desaturated -> a grey muscled mannequin on the dark ground */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/silhouette.jpg" alt="" aria-hidden="true" draggable="false"
        style={{ display: 'block', width: '100%', filter: 'grayscale(1) brightness(1.14) contrast(1.05)' }} />
      {/* overlay: per-zone STK colour, blended so the figure's form shows through */}
      <svg viewBox={'0 0 ' + IMG_W + ' ' + IMG_H} preserveAspectRatio="xMidYMid meet"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        role="img" aria-label="Body-part lethality diagram">
        {ZONE_REGIONS.map((z) => z.rects.map((r, i) => (
          <rect key={z.key + i} x={r[0]} y={r[1]} width={r[2]} height={r[3]} fill={colorOf(z.key)} className="bpv-zone"
            style={{ mixBlendMode: 'color', cursor: 'pointer' }}
            onMouseEnter={() => setHover(z.key)} onMouseLeave={() => setHover(null)} />
        )))}
        {/* hover: brighten the hovered zone's region(s) */}
        {hover && ZONE_REGIONS.filter((z) => z.key === hover).flatMap((z) => z.rects.map((r, i) => (
          <rect key={'h' + z.key + i} x={r[0]} y={r[1]} width={r[2]} height={r[3]} fill="#ffffff"
            style={{ mixBlendMode: 'soft-light' }} opacity="0.5" pointerEvents="none" />
        )))}
      </svg>
    </div>
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
