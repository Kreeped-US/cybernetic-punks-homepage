'use client';
// components/wardogs/LoadoutResult.js
// The Wardogs loadout RESULT render, extracted from LoadoutsClient so BOTH surfaces use ONE render:
//   - the live tool (streaming=true, prose arrives progressively), and
//   - the persisted SSR page /wardogs/loadouts/build/[slug] (streaming=false, from stored loadout_json).
// A client component (WeaponImage needs onError state), but its initial HTML is SERVER-rendered inside
// the stored page -> the loadout content is in the raw HTML (crawlable). Honest: attributed provenance
// badge + honest-null "price TBD" render identically from stored JSON.
//
// Props: { steps, meta, analysis, queried, streaming, footer }
//   meta = { recommendation, candidates, detail, provenance, budget, playstyle }
//   queried = { careerLevel, budget, playstyle } ; footer = a trailing action node (New loadout / CTA)

import { useState } from 'react';
import { TierIcon, CONFIDENCE_TIERS } from '@/components/network/confidenceTiers';
import WeaponImage from '@/components/wardogs/WeaponImage';
import BodyPartViz from '@/components/wardogs/BodyPartViz';

// Playstyle -> the kill-map's DEFAULT ammo/armor profile (the advisor context), vs the weapon page's
// neutral FMJ/tier-0 reader default. Aggressive = soft targets / HP / low armor; tactical = armored /
// AP / high; balanced = FMJ / mid. The user can still toggle inside BodyPartViz.
const PS_KILLMAP = {
  aggressive: { ammo: 'HP', tier: 0 },
  balanced: { ammo: 'FMJ', tier: 2 },
  tactical: { ammo: 'AP', tier: 4 },
};

const A = 'var(--accent)';
const AG = 'var(--accent-glow)';
const AD = 'var(--accent-dim)';
const CARD = 'var(--bg-card)';
const PAGE = 'var(--bg-page)';
const LINE = 'var(--border)';
const LSUB = 'var(--border-subtle)';
const T1 = 'var(--text-primary)';
const T2 = 'var(--text-secondary)';
const T3 = 'var(--text-tertiary)';

const PLAYSTYLES = [
  { id: 'aggressive', label: 'AGGRESSIVE' },
  { id: 'balanced',   label: 'BALANCED' },
  { id: 'tactical',   label: 'TACTICAL' },
];
function tierMeta(key) { return CONFIDENCE_TIERS.find((t) => t.key === key) || CONFIDENCE_TIERS[2]; }
function playstyleLabel(id) { const p = PLAYSTYLES.find((x) => x.id === id); return p ? p.label : (id || 'BALANCED').toUpperCase(); }

export const LOADOUT_KEYFRAMES = `
  @keyframes lsPulse{0%,100%{opacity:.35}50%{opacity:1}}
  @keyframes lsUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
  @keyframes lsBar{from{transform:scaleX(0)}to{transform:scaleX(1)}}
  .ls-cursor{animation:lsPulse 1s infinite}
  .ls-up{animation:lsUp .45s cubic-bezier(.2,.7,.2,1) both}
  .ls-bar-fill{transform-origin:left center;animation:lsBar .6s cubic-bezier(.2,.7,.2,1) both}
`;

function highlightNumbers(text) {
  if (!text) return null;
  const parts = String(text).split(/(\d+(?:\.\d+)?\s?ms|\d+(?:\.\d+)?%|\$\d[\d,]*)/g);
  return parts.map((p, i) =>
    /^(\d+(?:\.\d+)?\s?ms|\d+(?:\.\d+)?%|\$\d[\d,]*)$/.test(p)
      ? <b key={i} style={{ color: A, fontWeight: 800, whiteSpace: 'nowrap' }}>{p}</b>
      : <span key={i}>{p}</span>);
}

export function TheRead({ text, streaming }) {
  const raw = text || '';
  if (!raw) {
    return <div style={{ fontSize: 16, color: T3 }}>Reading the numbers<span className="ls-cursor">_</span></div>;
  }
  const paras = raw.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean);
  const body = [];
  let caveat = null;
  for (const p of paras) {
    const m = p.match(/^CAVEAT:\s*/i);
    if (m) caveat = p.slice(m[0].length).trim();
    else body.push(p);
  }
  return (
    <div>
      {body.map((p, i) => (
        <p key={i} style={{ fontSize: 16, lineHeight: 1.7, color: T1, maxWidth: '68ch', margin: '0 0 12px' }}>
          {highlightNumbers(p)}
          {streaming && !caveat && i === body.length - 1 && <span className="ls-cursor" style={{ color: A }}>▍</span>}
        </p>
      ))}
      {caveat && (
        <div style={{ marginTop: 4, background: AG, border: '1px solid ' + AD, borderLeft: '3px solid ' + A, borderRadius: '0 3px 3px 0', padding: '12px 14px', maxWidth: '68ch' }}>
          <div style={{ fontSize: 9, letterSpacing: 2, color: A, fontWeight: 800, fontFamily: 'monospace', marginBottom: 5 }}>&#9698; THE CATCH</div>
          <div style={{ fontSize: 14, lineHeight: 1.6, color: T2 }}>
            {highlightNumbers(caveat)}
            {streaming && <span className="ls-cursor" style={{ color: A }}>▍</span>}
          </div>
        </div>
      )}
    </div>
  );
}

export function Chip({ children, accent }) {
  return (
    <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.5, fontFamily: 'monospace', padding: '4px 9px', borderRadius: 3,
      color: accent ? A : T2, background: accent ? AG : CARD, border: '1px solid ' + (accent ? A : LINE) }}>{children}</span>
  );
}

export function RankTable({ rows, pickName, noteNames = [], noteSymbol = '*' }) {
  const maxScore = Math.max(...rows.map((c) => c.score || 0), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      {rows.map((c, i) => {
        const isPick = c.weapon_name === pickName;
        const flagged = noteNames.indexOf(c.weapon_name) !== -1;
        const pctW = Math.max(5, Math.round(((c.score || 0) / maxScore) * 100));
        return (
          <div key={c.weapon_name} style={{ display: 'grid', gridTemplateColumns: '26px 1fr 70px', alignItems: 'center', gap: 10 }}>
            <span style={{ fontFamily: 'monospace', fontSize: 11, color: isPick ? A : T3, fontWeight: 700, textAlign: 'right' }}>{i + 1}</span>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: isPick ? 800 : 600, color: isPick ? '#fff' : T2 }}>
                  {isPick && <span style={{ color: A, marginRight: 5 }}>▸</span>}{c.weapon_name}
                  {flagged && <span style={{ color: A, marginLeft: 4, fontWeight: 800 }}>{noteSymbol}</span>}
                </span>
              </div>
              <div style={{ height: 8, background: PAGE, borderRadius: 4, overflow: 'hidden' }}>
                <div className="ls-bar-fill" style={{ height: '100%', width: pctW + '%', animationDelay: (i * 0.03) + 's', background: isPick ? A : '#3a382c', borderRadius: 4 }} />
              </div>
            </div>
            <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: isPick ? A : T2, textAlign: 'right' }}>{c.weighted_ttk_ms}ms</span>
          </div>
        );
      })}
    </div>
  );
}

function MiniBars({ title, rows }) {
  const present = rows.filter((r) => r.ttk_ms != null);
  if (!present.length) return null;
  const nonZero = present.filter((r) => r.ttk_ms > 0).map((r) => r.ttk_ms);
  const floor = nonZero.length ? Math.min(...nonZero) : 1;
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 8, letterSpacing: 1.5, color: T3, fontWeight: 800, fontFamily: 'monospace', marginBottom: 7 }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {rows.map((r, i) => {
          const has = r.ttk_ms != null;
          const oneShot = has && r.ttk_ms === 0;
          const isBest = has && (oneShot || r.ttk_ms === floor);
          const pctW = !has ? 0 : oneShot ? 100 : Math.max(6, Math.round((floor / r.ttk_ms) * 100));
          const valText = !has ? 'n/a' : oneShot ? '1-shot' : r.ttk_ms + 'ms';
          return (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '34px 1fr 56px', alignItems: 'center', gap: 8 }}>
              <span style={{ fontFamily: 'monospace', fontSize: 10, color: isBest ? A : T3, fontWeight: 700 }}>{r.label}</span>
              <div style={{ height: 6, background: PAGE, borderRadius: 3, overflow: 'hidden' }}>
                {has && <div className="ls-bar-fill" style={{ height: '100%', width: pctW + '%', animationDelay: (i * 0.04) + 's', background: isBest ? A : '#3a382c', borderRadius: 3 }} />}
              </div>
              <span style={{ fontFamily: 'monospace', fontSize: 10, color: has ? (isBest ? A : T2) : T3, textAlign: 'right' }}>{valText}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value, hero, muted }) {
  return (
    <div>
      <div style={{ fontFamily: 'monospace', fontSize: hero ? 18 : 14, fontWeight: 800, color: muted ? T3 : (hero ? A : T1) }}>{value}</div>
      <div style={{ fontSize: 8, letterSpacing: 1.5, color: T3, fontWeight: 700, fontFamily: 'monospace', marginTop: 2 }}>{label}</div>
    </div>
  );
}

function fmtMoney(n) { return '$' + Number(n).toLocaleString('en-US'); }
// Cost breakdown parts for a pick (gun + ammo box = total), honest-null aware. detail carries caliber.
export function costParts(pick, detail) {
  if (!pick) return null;
  const gun = pick.gun_cost != null ? pick.gun_cost : (pick.cost != null && pick.ammo_cost == null ? pick.cost : null);
  const total = pick.cost != null ? pick.cost : gun;
  const cal = detail && detail.caliber ? detail.caliber : null;
  const load = pick.ammo_priced || pick.ammo;
  let line = null;
  if (gun != null && pick.ammo_cost != null) line = 'gun ' + fmtMoney(gun) + ' + ' + (cal ? cal + ' ' : '') + load + ' box ' + fmtMoney(pick.ammo_cost);
  else if (gun != null && pick.ammo_price_known === false) line = 'gun ' + fmtMoney(gun) + ' + ammo price unrecorded';
  else if (gun != null) line = 'gun ' + fmtMoney(gun);
  return { total, line };
}

export function SlotCard({ label, pick, detail, hero, rank, total, gapMs, runnerUp, note }) {
  if (!pick) {
    return (
      <div style={{ background: PAGE, border: '1px solid ' + LINE, borderRadius: 3, padding: '16px 18px' }}>
        <div style={{ fontSize: 8, letterSpacing: 2, color: T3, fontWeight: 700, marginBottom: 6 }}>{label}</div>
        <div style={{ fontSize: 12, color: T3 }}>No pick</div>
      </div>
    );
  }
  const armorRows = detail && detail.armor_curve ? detail.armor_curve.map((r) => ({ label: 'T' + r.tier, ttk_ms: r.ttk_ms })) : null;
  const ammoRows = detail && detail.ammo_compare ? detail.ammo_compare.map((r) => ({ label: r.ammo, ttk_ms: r.ttk_ms })) : null;
  const cp = costParts(pick, detail);
  return (
    <div style={{ background: PAGE, border: '1px solid ' + (hero ? AD : LINE), borderLeft: '3px solid ' + (hero ? A : T3), borderRadius: '0 3px 3px 0', padding: '16px 18px' }}>
      <WeaponImage imageFilename={detail && detail.image_filename} name={pick.weapon_name} hero={hero} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 8, letterSpacing: 2, color: T3, fontWeight: 700 }}>{label}</span>
        {rank && total ? <span style={{ fontSize: 8, letterSpacing: 1, color: A, fontWeight: 800, fontFamily: 'monospace', background: AG, border: '1px solid ' + AD, borderRadius: 3, padding: '2px 6px' }}>#{rank} OF {total} BY TTK</span> : null}
      </div>
      <div style={{ fontFamily: 'monospace', fontSize: hero ? 22 : 18, fontWeight: 900, color: '#fff', marginBottom: 10, letterSpacing: 0.5 }}>{pick.weapon_name}</div>
      <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
        {pick.weighted_ttk_ms != null && <Stat label="TTK" value={pick.weighted_ttk_ms + 'ms'} hero={hero} />}
        {pick.ammo && <Stat label="AMMO" value={pick.ammo} />}
        <Stat label="COST" value={cp && cp.total != null ? fmtMoney(cp.total) : 'TBD'} muted={!cp || cp.total == null} />
      </div>
      {cp && cp.line && (
        <div style={{ marginTop: 8, fontFamily: 'monospace', fontSize: 10.5, color: T2, lineHeight: 1.5 }}>
          {cp.line}
          <span style={{ color: T3 }}> · community-recorded</span>
        </div>
      )}
      {pick.ammo_downgraded && pick.ammo_gate_level != null && (
        <div style={{ marginTop: 8, fontSize: 10.5, lineHeight: 1.5, color: A, fontFamily: 'monospace' }}>
          ◢ {pick.ammo} unlocks at Career {pick.ammo_gate_level} — running {pick.ammo_priced} for now
        </div>
      )}
      {detail && (detail.fire_rate != null || detail.caliber || detail.weapon_class) && (
        <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid ' + LSUB, display: 'flex', gap: 16, flexWrap: 'wrap', fontFamily: 'monospace', fontSize: 10, color: T2 }}>
          {detail.fire_rate != null && <span>FIRE RATE <b style={{ color: T1 }}>{detail.fire_rate} rpm</b></span>}
          {detail.caliber && <span>CALIBER <b style={{ color: T1 }}>{detail.caliber}</b></span>}
          {detail.weapon_class && <span>CLASS <b style={{ color: T1 }}>{detail.weapon_class}</b></span>}
        </div>
      )}
      {armorRows && <MiniBars title={'TTK vs ARMOR (' + (pick.ammo || '') + ')'} rows={armorRows} />}
      {ammoRows && <MiniBars title="TTK BY AMMO (unarmored)" rows={ammoRows} />}
      {hero && gapMs != null && runnerUp && (
        <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid ' + LSUB, fontSize: 11, color: T2 }}>
          Edges <b style={{ color: T1 }}>{runnerUp.weapon_name}</b> by <b style={{ color: A }}>{gapMs}ms</b>
        </div>
      )}
      {note && (
        <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid ' + LSUB, fontSize: 11, lineHeight: 1.5, color: T2 }}>
          <span style={{ color: A, fontWeight: 800, marginRight: 4 }}>*</span>{note}
        </div>
      )}
    </div>
  );
}

export default function LoadoutResult({ steps = [], meta = null, analysis = '', queried = null, streaming = false, footer = null }) {
  const rec = (meta && meta.recommendation) || {};
  const cand = (meta && meta.candidates) || {};
  const det = (meta && meta.detail) || {};
  const prov = (meta && meta.provenance) || { tier: 'attributed', basis: '', sources: [] };
  const bud = (meta && meta.budget) || {};
  const t = tierMeta(prov.tier);
  const psLabel = playstyleLabel((meta && meta.playstyle) || (queried && queried.playstyle));

  const primaries = (cand.primary || []).filter((c) => c.rankable && c.score != null);
  const secondaries = (cand.secondary || []).filter((c) => c.rankable && c.score != null);
  const pick = rec.primary || null;
  const runnerUp = primaries.filter((c) => !pick || c.weapon_name !== pick.weapon_name)[0] || null;
  const gapMs = pick && runnerUp && pick.weighted_ttk_ms != null && runnerUp.weighted_ttk_ms != null
    ? Math.round(Math.abs(runnerUp.weighted_ttk_ms - pick.weighted_ttk_ms)) : null;
  const rankedCount = primaries.length + secondaries.length;

  const wrap = { background: PAGE, minHeight: '60vh', color: '#fff', fontFamily: 'system-ui, sans-serif', padding: '24px' };
  const inner = { maxWidth: 1000, margin: '0 auto' };

  return (
    <div style={wrap}><div style={inner}>
      <style>{LOADOUT_KEYFRAMES}</style>

      {queried && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
          <span style={{ fontSize: 10, letterSpacing: 2, color: T3, fontWeight: 800, fontFamily: 'monospace' }}>ANALYSIS FOR YOU</span>
          <Chip>{queried.careerLevel != null ? 'CAREER ' + queried.careerLevel : 'ALL LEVELS'}</Chip>
          <Chip accent>{psLabel}</Chip>
          <Chip>{queried.budget != null ? '$' + queried.budget : 'NO BUDGET'}</Chip>
        </div>
      )}

      <div className="ls-up" style={{ background: CARD, border: '1px solid ' + LINE, borderTop: '3px solid ' + A, borderRadius: '3px 3px 0 0', padding: '16px 18px', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 10, letterSpacing: 2.5, color: A, fontWeight: 800, fontFamily: 'monospace' }}>◢ SOLVED IN REAL TIME</div>
          {rankedCount > 0 && <div style={{ fontSize: 10, color: T2, fontFamily: 'monospace' }}>{rankedCount} weapons scored by measured TTK</div>}
        </div>
        {steps.length === 0 && <div style={{ fontSize: 12, color: T2 }}>Running the solver<span className="ls-cursor">_</span></div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {steps.map((s, i) => (
            <div key={s.id} className="ls-up" style={{ animationDelay: (i * 0.09) + 's', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span style={{ flexShrink: 0, width: 20, height: 20, borderRadius: 4, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900,
                background: s.status === 'done' ? A : s.status === 'skipped' ? 'transparent' : AG, color: s.status === 'done' ? PAGE : T3, border: s.status === 'done' ? 'none' : '1px solid ' + LINE }}>
                {s.status === 'done' ? '✓' : s.status === 'skipped' ? '–' : '·'}
              </span>
              <div style={{ paddingTop: 1 }}>
                <span style={{ fontSize: 13, color: T1, fontWeight: 700 }}>{s.label}</span>
                <span style={{ fontSize: 13, color: T2 }}> — {s.detail}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {meta && (
        <div className="ls-up" style={{ animationDelay: '.05s', background: 'linear-gradient(160deg, ' + AG + ' 0%, ' + CARD + ' 55%)', border: '1px solid ' + AD, borderRadius: 4, padding: '20px 22px', marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
            <div style={{ fontSize: 11, letterSpacing: 3, color: '#fff', fontWeight: 900, fontFamily: 'monospace' }}>YOUR LOADOUT</div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: t.color, fontSize: 10, fontWeight: 700, letterSpacing: 1, fontFamily: 'monospace' }}>
              <TierIcon tier={prov.tier} size={12} /> {t.label.toUpperCase()}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px,1fr))', gap: 12 }}>
            <SlotCard label="PRIMARY" pick={rec.primary} detail={det.primary} hero rank={pick ? 1 : null} total={primaries.length} gapMs={gapMs} runnerUp={runnerUp} />
            <SlotCard label="SECONDARY" pick={rec.secondary} detail={det.secondary} rank={rec.secondary ? 1 : null} total={secondaries.length} />
          </div>
          {/* cost + budget summary (deterministic -- the economy work made visible) */}
          {(() => {
            const p = rec.primary, s = rec.secondary;
            const pc = p && p.cost != null ? p.cost : null;
            const sc = s && s.cost != null ? s.cost : null;
            if (pc == null && sc == null) return null;
            const totalCost = (pc || 0) + (sc || 0);
            const budgetLimit = (queried && queried.budget != null) ? queried.budget : (bud && bud.limit != null ? bud.limit : null);
            const priced = primaries.filter((c) => c.value_per_cost != null);
            const bestVal = priced.length ? priced.reduce((a, b) => (b.value_per_cost > a.value_per_cost ? b : a)) : null;
            return (
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid ' + AD, display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'baseline', fontFamily: 'monospace', fontSize: 11 }}>
                <span style={{ color: T3, letterSpacing: 1.5, fontWeight: 800 }}>LOADOUT COST</span>
                <span style={{ color: '#fff', fontWeight: 900, fontSize: 14 }}>{fmtMoney(totalCost)}</span>
                <span style={{ color: T3 }}>
                  ({p ? 'primary ' + (pc != null ? fmtMoney(pc) : 'TBD') : ''}{s ? ' + secondary ' + (sc != null ? fmtMoney(sc) : 'TBD') : ''})
                </span>
                {budgetLimit != null && (
                  <span style={{ color: totalCost <= budgetLimit ? '#6bd18e' : A, fontWeight: 700 }}>
                    {totalCost <= budgetLimit
                      ? 'within your ' + fmtMoney(budgetLimit) + ' — ' + fmtMoney(budgetLimit - totalCost) + ' to spare'
                      : 'over your ' + fmtMoney(budgetLimit)}
                  </span>
                )}
                {bestVal && pick && bestVal.weapon_name !== pick.weapon_name && (
                  <span style={{ color: T2 }}>· best TTK/$ of the set: <b style={{ color: T1 }}>{bestVal.weapon_name}</b></span>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* WHERE TO AIM -- the recommended primary's body-part kill-map (shared BodyPartViz, the SAME
          component as the weapon page), defaulted to the playstyle's ammo/armor profile. Actionable
          advice a reference table can't give. Renders only when the pick's ballistics were loaded. */}
      {pick && det.primary && Array.isArray(det.primary.ballistics) && det.primary.ballistics.length > 0 && (() => {
        const ps = PS_KILLMAP[(meta && meta.playstyle) || (queried && queried.playstyle)] || PS_KILLMAP.balanced;
        return (
          <div className="ls-up" style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, letterSpacing: 2.5, color: A, fontWeight: 800, fontFamily: 'monospace', marginBottom: 10 }}>◢ WHERE TO AIM — {pick.weapon_name}</div>
            <BodyPartViz
              matrix={det.primary.ballistics}
              weaponName={pick.weapon_name}
              defaultAmmo={ps.ammo}
              defaultTier={ps.tier}
              tier={prov.tier}
              sourceLabel={prov.sources && prov.sources[0]}
            />
          </div>
        );
      })()}

      {(analysis || !streaming) && (
        <div style={{ background: CARD, border: '1px solid ' + LINE, borderLeft: '3px solid ' + A, borderRadius: '0 4px 4px 0', padding: '20px 22px', marginBottom: 14 }}>
          <div style={{ fontSize: 10, letterSpacing: 2.5, color: A, fontWeight: 800, fontFamily: 'monospace', marginBottom: 12 }}>◢ THE READ</div>
          <TheRead text={analysis} streaming={streaming} />
        </div>
      )}

      {primaries.length >= 2 && (
        <div className="ls-up" style={{ background: CARD, border: '1px solid ' + LINE, borderRadius: 4, padding: '18px 22px', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
            <div style={{ fontSize: 10, letterSpacing: 2.5, color: A, fontWeight: 800, fontFamily: 'monospace' }}>◢ THE FULL BOARD — EVERY WEAPON BY TTK</div>
            <div style={{ fontSize: 10, color: T3, fontFamily: 'monospace' }}>{psLabel} · {pick && pick.ammo ? pick.ammo + ' ammo' : ''} · lower = faster</div>
          </div>
          {gapMs != null && runnerUp && (
            <div style={{ fontSize: 12, color: T2, marginBottom: 14 }}>
              {rec.primary && rec.primary.weapon_name} kills <b style={{ color: A }}>{gapMs}ms faster</b> than {runnerUp.weapon_name}, the next best.
            </div>
          )}
          <RankTable rows={primaries} pickName={pick && pick.weapon_name} />
          {secondaries.length >= 1 && (
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid ' + LSUB }}>
              <div style={{ fontSize: 9, letterSpacing: 2, color: T3, fontWeight: 800, fontFamily: 'monospace', marginBottom: 10 }}>SIDEARMS</div>
              <RankTable rows={secondaries} pickName={rec.secondary && rec.secondary.weapon_name} />
            </div>
          )}
        </div>
      )}

      {meta && (
        <div style={{ background: PAGE, border: '1px dashed ' + LINE, borderRadius: 4, padding: '14px 18px', marginBottom: 16, fontSize: 12, color: T2, lineHeight: 1.7 }}>
          <div><b style={{ color: T1 }}>Budget:</b> {bud.applied ? 'solved within $' + bud.limit + ' (spent $' + bud.total + ').' : 'no budget given — ranked by effectiveness; per-pick cost is shown from community-recorded prices (attributed, not Bulkhead-official). Add a budget to filter by affordability.'}</div>
          {prov.basis && <div style={{ marginTop: 6 }}><b style={{ color: T1 }}>Basis:</b> {prov.basis}.{prov.sources && prov.sources.length ? ' Source: ' + prov.sources[0] : ''}</div>}
        </div>
      )}

      {footer}
    </div></div>
  );
}
