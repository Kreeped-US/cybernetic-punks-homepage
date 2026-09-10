'use client';
// app/wardogs/loadouts/LoadoutsClient.js
// The Wardogs loadouts experience. ENGINE UNCHANGED (the SSE reader run() is byte-identical) --
// this pass does two render/data-surfacing things on top of the earlier redesign:
//   THEME: uses the .wardogs-theme CSS vars (var(--accent) warm amber, --bg-card, --border, ...) so
//     the page is NATIVE to the Wardogs vertical (same tokens the arsenal/articles use), not olive.
//   DENSITY: surfaces MORE of the real attributed ballistics matrix -- per-pick armor-tier TTK curve
//     + FMJ/HP/AP ammo comparison + weapon meta (fire rate/caliber/class), and THE FULL BOARD (every
//     ranked weapon), so it is as information-rich as the Marathon advisor -- honestly, no fabrication
//     (no prices, no mods/cores, no invented unlocks -- omitted where we have no data).
// Naming: "loadouts" everywhere user-facing; never "Build Advisor".

import { useState } from 'react';
import { TierIcon, CONFIDENCE_TIERS } from '@/components/network/confidenceTiers';
import { track } from '@/lib/useTrack';

// Wardogs theme tokens (from globals.css .wardogs-theme, applied by app/wardogs/layout.js).
const A = 'var(--accent)';                 // warm amber #e0a13a
const AG = 'var(--accent-glow)';           // rgba amber .14
const AD = 'var(--accent-dim)';            // #a9761f
const CARD = 'var(--bg-card)';             // #12140f
const PAGE = 'var(--bg-page)';             // #08090c
const LINE = 'var(--border)';              // #2c2a22
const LSUB = 'var(--border-subtle)';       // #201f18
const T1 = 'var(--text-primary)';
const T2 = 'var(--text-secondary)';
const T3 = 'var(--text-tertiary)';

const PLAYSTYLES = [
  { id: 'aggressive', label: 'AGGRESSIVE', desc: 'Fast fights, soft targets. HP ammo, close-in.' },
  { id: 'balanced',   label: 'BALANCED',   desc: 'All-round. FMJ ammo, mixed armor.' },
  { id: 'tactical',   label: 'TACTICAL',   desc: 'Armored targets, methodical. AP ammo.' },
];

function tierMeta(key) { return CONFIDENCE_TIERS.find((t) => t.key === key) || CONFIDENCE_TIERS[2]; }
function playstyleLabel(id) { const p = PLAYSTYLES.find((x) => x.id === id); return p ? p.label : (id || 'BALANCED').toUpperCase(); }

// Highlight the substance inline: wrap TTK ms / % / $ figures in the accent so the numbers pop.
function highlightNumbers(text) {
  if (!text) return null;
  const parts = String(text).split(/(\d+(?:\.\d+)?\s?ms|\d+(?:\.\d+)?%|\$\d[\d,]*)/g);
  return parts.map((p, i) =>
    /^(\d+(?:\.\d+)?\s?ms|\d+(?:\.\d+)?%|\$\d[\d,]*)$/.test(p)
      ? <b key={i} style={{ color: A, fontWeight: 800, whiteSpace: 'nowrap' }}>{p}</b>
      : <span key={i}>{p}</span>);
}

// THE READ renderer: the streamed prose arrives as short paragraphs separated by blank lines, with a
// final paragraph the model prefixes "CAVEAT:". We split on blank lines -> spaced <p> chunks (no more
// wall-of-words), pull the CAVEAT paragraph into a distinct amber callout, and keep number-highlighting
// per chunk. Fully progressive: partial paragraphs render as they stream; the caveat flips into its
// callout the moment "CAVEAT:" arrives. If the model omits the marker, the tail just renders as a
// normal paragraph (graceful degradation) -- still chunked, still readable.
function TheRead({ text, streaming }) {
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

export default function LoadoutsClient() {
  const [phase, setPhase] = useState('input');
  const [careerLevel, setCareerLevel] = useState('');
  const [budget, setBudget] = useState('');
  const [playstyle, setPlaystyle] = useState('balanced');
  const [queried, setQueried] = useState(null);
  const [steps, setSteps] = useState([]);
  const [meta, setMeta] = useState(null);
  const [analysis, setAnalysis] = useState('');
  const [error, setError] = useState(null);

  // ── ENGINE: unchanged SSE reader ──────────────────────────────
  async function run() {
    setPhase('loading'); setSteps([]); setMeta(null); setAnalysis(''); setError(null);
    setQueried({ careerLevel: careerLevel === '' ? null : Number(careerLevel), budget: budget === '' ? null : Number(budget), playstyle });
    track('loadouts_generate', { playstyle, hasLevel: !!careerLevel, hasBudget: !!budget });
    try {
      const res = await fetch('/api/loadouts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ careerLevel: careerLevel === '' ? null : Number(careerLevel), budget: budget === '' ? null : Number(budget), playstyle }),
      });
      if (!res.ok || !res.body) { const j = await res.json().catch(() => ({})); throw new Error(j.error || 'Request failed (' + res.status + ')'); }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '', gotMeta = false;
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let sep;
        while ((sep = buf.indexOf('\n\n')) !== -1) {
          const frame = buf.slice(0, sep).trim();
          buf = buf.slice(sep + 2);
          if (!frame.startsWith('data:')) continue;
          const evt = JSON.parse(frame.slice(5).trim());
          if (evt.type === 'steps') setSteps(evt.steps || []);
          else if (evt.type === 'meta') { setMeta(evt); if (!gotMeta) { gotMeta = true; setPhase('result'); } }
          else if (evt.type === 'delta') setAnalysis((a) => a + evt.text);
          else if (evt.type === 'error') throw new Error(evt.error || 'Stream error');
          else if (evt.type === 'done') setPhase('result');
        }
      }
    } catch (err) { setError(err.message); setPhase('error'); }
  }

  const wrap = { background: PAGE, minHeight: '60vh', color: '#fff', fontFamily: 'system-ui, sans-serif', padding: '24px' };
  const inner = { maxWidth: 1000, margin: '0 auto' };
  const KEYFRAMES = `
    @keyframes lsPulse{0%,100%{opacity:.35}50%{opacity:1}}
    @keyframes lsUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
    @keyframes lsBar{from{transform:scaleX(0)}to{transform:scaleX(1)}}
    .ls-cursor{animation:lsPulse 1s infinite}
    .ls-up{animation:lsUp .45s cubic-bezier(.2,.7,.2,1) both}
    .ls-opt:hover{background:var(--bg-card-hover) !important}
    .ls-bar-fill{transform-origin:left center;animation:lsBar .6s cubic-bezier(.2,.7,.2,1) both}
  `;
  const inputStyle = { width: '100%', boxSizing: 'border-box', padding: '11px 13px', background: CARD, border: '1px solid ' + LINE, borderRadius: 2, color: '#fff', fontSize: 14, fontFamily: 'inherit' };

  // ── INPUT ─────────────────────────────────────────────────────
  if (phase === 'input') {
    return (
      <div style={wrap}><div style={inner}>
        <style>{KEYFRAMES}</style>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px,1fr))', gap: 16, marginBottom: 20 }}>
          <div>
            <Label>Career level <span style={{ color: T3 }}>(optional)</span></Label>
            <input type="number" min="0" value={careerLevel} onChange={(e) => setCareerLevel(e.target.value)} placeholder="e.g. 20" style={inputStyle} />
            <Hint>Skip it and we rank the whole roster (no unlock-gate).</Hint>
          </div>
          <div>
            <Label>Cash budget <span style={{ color: T3 }}>(optional)</span></Label>
            <input type="number" min="0" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="prices not published yet" style={inputStyle} />
            <Hint>Prices aren&rsquo;t out yet -- budget filtering activates when they land.</Hint>
          </div>
        </div>
        <Label>Playstyle</Label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))', gap: 8, marginBottom: 24 }}>
          {PLAYSTYLES.map((p) => {
            const sel = playstyle === p.id;
            return (
              <div key={p.id} className="ls-opt" onClick={() => setPlaystyle(p.id)}
                style={{ background: sel ? AG : CARD, border: '1px solid ' + (sel ? A : LINE), borderLeft: '3px solid ' + (sel ? A : LINE), borderRadius: '0 3px 3px 0', padding: '12px 14px', cursor: 'pointer' }}>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.5, color: sel ? A : T2, fontFamily: 'monospace', marginBottom: 3 }}>{p.label}</div>
                <div style={{ fontSize: 12, color: T3, lineHeight: 1.4 }}>{p.desc}</div>
              </div>
            );
          })}
        </div>
        <button onClick={run} style={{ padding: '14px 40px', background: A, color: PAGE, border: 'none', borderRadius: 2, fontSize: 13, fontWeight: 900, letterSpacing: 1, cursor: 'pointer' }}>
          FIND MY BEST LOADOUT →
        </button>
      </div></div>
    );
  }

  // ── ERROR ─────────────────────────────────────────────────────
  if (phase === 'error') {
    return (
      <div style={wrap}><div style={inner}>
        <div style={{ padding: '14px 18px', background: 'rgba(224,86,58,0.1)', border: '1px solid var(--red)', borderLeft: '3px solid var(--red)', borderRadius: '0 3px 3px 0', color: '#ff9a86', fontSize: 13 }}>{error}</div>
        <button onClick={() => setPhase('input')} style={{ marginTop: 16, padding: '10px 20px', background: 'transparent', border: '1px solid ' + LINE, borderRadius: 2, color: T2, cursor: 'pointer', fontSize: 12 }}>← Try again</button>
      </div></div>
    );
  }

  // ── LOADING + RESULT ──────────────────────────────────────────
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

  return (
    <div style={wrap}><div style={inner}>
      <style>{KEYFRAMES}</style>

      {/* CUSTOM QUERY HEADER */}
      {queried && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
          <span style={{ fontSize: 10, letterSpacing: 2, color: T3, fontWeight: 800, fontFamily: 'monospace' }}>ANALYSIS FOR YOU</span>
          <Chip>{queried.careerLevel != null ? 'CAREER ' + queried.careerLevel : 'ALL LEVELS'}</Chip>
          <Chip accent>{psLabel}</Chip>
          <Chip>{queried.budget != null ? '$' + queried.budget : 'NO BUDGET'}</Chip>
        </div>
      )}

      {/* COMPUTATION TRACE (moat) */}
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

      {/* YOUR LOADOUT (reward reveal, now data-rich per pick) */}
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
        </div>
      )}

      {/* THE READ -- streamed prose, structured into short paragraphs + a distinct caveat callout */}
      {(analysis || phase === 'result') && (
        <div style={{ background: CARD, border: '1px solid ' + LINE, borderLeft: '3px solid ' + A, borderRadius: '0 4px 4px 0', padding: '20px 22px', marginBottom: 14 }}>
          <div style={{ fontSize: 10, letterSpacing: 2.5, color: A, fontWeight: 800, fontFamily: 'monospace', marginBottom: 12 }}>◢ THE READ</div>
          <TheRead text={analysis} streaming={phase === 'loading'} />
        </div>
      )}

      {/* THE FULL BOARD -- every ranked weapon by TTK (real data density) */}
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

      {/* HONEST-NULL + PROVENANCE (distinct caveat) */}
      {meta && (
        <div style={{ background: PAGE, border: '1px dashed ' + LINE, borderRadius: 4, padding: '14px 18px', marginBottom: 16, fontSize: 12, color: T2, lineHeight: 1.7 }}>
          <div><b style={{ color: T1 }}>Budget:</b> {bud.applied ? 'solved within $' + bud.limit + ' (spent $' + bud.total + ').' : 'ranked by effectiveness only — Bulkhead hasn’t published prices yet, so budget filtering is off. It switches on the moment prices land.'}</div>
          {prov.basis && <div style={{ marginTop: 6 }}><b style={{ color: T1 }}>Basis:</b> {prov.basis}.{prov.sources && prov.sources.length ? ' Source: ' + prov.sources[0] : ''}</div>}
        </div>
      )}

      <button onClick={() => setPhase('input')} style={{ padding: '10px 20px', background: 'transparent', border: '1px solid ' + LINE, borderRadius: 2, color: T2, cursor: 'pointer', fontSize: 12, letterSpacing: 1 }}>
        ← New loadout
      </button>
    </div></div>
  );
}

// ── helpers ───────────────────────────────────────────────────────
function Label({ children }) { return <div style={{ fontSize: 10, letterSpacing: 2, color: T2, fontWeight: 800, fontFamily: 'monospace', marginBottom: 8, textTransform: 'uppercase' }}>{children}</div>; }
function Hint({ children }) { return <div style={{ fontSize: 11, color: T3, marginTop: 6, lineHeight: 1.4 }}>{children}</div>; }

function Chip({ children, accent }) {
  return (
    <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.5, fontFamily: 'monospace', padding: '4px 9px', borderRadius: 3,
      color: accent ? A : T2, background: accent ? AG : CARD, border: '1px solid ' + (accent ? A : LINE) }}>{children}</span>
  );
}

// Compact ranked table: rank #, name, TTK, a score-proportional bar. Pick highlighted. Mobile-safe.
function RankTable({ rows, pickName }) {
  const maxScore = Math.max(...rows.map((c) => c.score || 0), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      {rows.map((c, i) => {
        const isPick = c.weapon_name === pickName;
        const pctW = Math.max(5, Math.round(((c.score || 0) / maxScore) * 100));
        return (
          <div key={c.weapon_name} style={{ display: 'grid', gridTemplateColumns: '26px 1fr 70px', alignItems: 'center', gap: 10 }}>
            <span style={{ fontFamily: 'monospace', fontSize: 11, color: isPick ? A : T3, fontWeight: 700, textAlign: 'right' }}>{i + 1}</span>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: isPick ? 800 : 600, color: isPick ? '#fff' : T2 }}>
                  {isPick && <span style={{ color: A, marginRight: 5 }}>▸</span>}{c.weapon_name}
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

// Mini bars for the per-pick armor curve / ammo comparison. rows: [{label, ttk_ms}].
// TTK semantics (honest): ttk_ms === 0 means a ONE-SHOT kill (shots-to-kill 1 -> no time between
// shots), which is the FASTEST possible outcome -> shown as "1-shot", full bar. Null -> "n/a".
// Non-zero rows scale against the fastest NON-zero time so the spread stays readable.
function MiniBars({ title, rows }) {
  const present = rows.filter((r) => r.ttk_ms != null);
  if (!present.length) return null;
  const nonZero = present.filter((r) => r.ttk_ms > 0).map((r) => r.ttk_ms);
  const floor = nonZero.length ? Math.min(...nonZero) : 1; // fastest measurable time
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

// Weapon-image SLOT -- forward-compat with the network convention (weapon_stats.image_filename ->
// /images/weapons/<file>, same as Marathon/Bodycam). No image today for any wardogs weapon -> an
// HONEST empty state (a muted reticle + "IMAGE PENDING"), never a fake image. When the operator sets
// image_filename on the wardogs rows and drops the file, it auto-fills here with no redesign. onError
// falls back to the empty state so a missing/mistyped file never shows a broken image.
function WeaponImage({ imageFilename, name, hero }) {
  const [failed, setFailed] = useState(false);
  const src = imageFilename ? '/images/weapons/' + imageFilename : null;
  const show = src && !failed;
  const h = hero ? 128 : 104;
  return (
    <div style={{ height: h, marginBottom: 14, borderRadius: 3, background: 'linear-gradient(180deg, ' + CARD + ', ' + PAGE + ')', border: '1px solid ' + LSUB, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {show ? (
        <img src={src} alt={name + ' — Wardogs weapon'} onError={() => setFailed(true)} style={{ maxWidth: '90%', maxHeight: '82%', objectFit: 'contain' }} />
      ) : (
        <div style={{ textAlign: 'center', color: AD, opacity: 0.6 }}>
          <svg width={hero ? 44 : 38} height={hero ? 44 : 38} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true" style={{ display: 'block', margin: '0 auto' }}>
            <circle cx="12" cy="12" r="8.2" />
            <line x1="12" y1="0.5" x2="12" y2="4.5" /><line x1="12" y1="19.5" x2="12" y2="23.5" />
            <line x1="0.5" y1="12" x2="4.5" y2="12" /><line x1="19.5" y1="12" x2="23.5" y2="12" />
            <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
          </svg>
          <div style={{ fontSize: 7.5, letterSpacing: 1.5, fontFamily: 'monospace', fontWeight: 700, marginTop: 5 }}>IMAGE PENDING</div>
        </div>
      )}
    </div>
  );
}

function SlotCard({ label, pick, detail, hero, rank, total, gapMs, runnerUp }) {
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
        <Stat label="PRICE" value={pick.cost != null ? '$' + pick.cost : 'TBD'} muted={pick.cost == null} />
      </div>

      {/* weapon meta strip (real weapon_stats data) */}
      {detail && (detail.fire_rate != null || detail.caliber || detail.weapon_class) && (
        <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid ' + LSUB, display: 'flex', gap: 16, flexWrap: 'wrap', fontFamily: 'monospace', fontSize: 10, color: T2 }}>
          {detail.fire_rate != null && <span>FIRE RATE <b style={{ color: T1 }}>{detail.fire_rate} rpm</b></span>}
          {detail.caliber && <span>CALIBER <b style={{ color: T1 }}>{detail.caliber}</b></span>}
          {detail.weapon_class && <span>CLASS <b style={{ color: T1 }}>{detail.weapon_class}</b></span>}
        </div>
      )}

      {/* the ballistics dimensions -- shown, not narrated */}
      {armorRows && <MiniBars title={'TTK vs ARMOR (' + (pick.ammo || '') + ')'} rows={armorRows} />}
      {ammoRows && <MiniBars title="TTK BY AMMO (unarmored)" rows={ammoRows} />}

      {hero && gapMs != null && runnerUp && (
        <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid ' + LSUB, fontSize: 11, color: T2 }}>
          Edges <b style={{ color: T1 }}>{runnerUp.weapon_name}</b> by <b style={{ color: A }}>{gapMs}ms</b>
        </div>
      )}
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
