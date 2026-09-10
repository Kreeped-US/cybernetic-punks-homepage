'use client';
// app/wardogs/loadouts/LoadoutsClient.js
// The Wardogs loadouts experience. ENGINE UNCHANGED (the SSE reader in run() is byte-identical to
// Phase 1c) -- this is a PRESENTATION redesign: data-viz-forward, custom-feeling, premium.
//   - STREAMING / HONEST NARRATION / INSIGHT-FIRST all preserved.
//   - NEW: the TTK numbers are SHOWN (a bar viz over the solver's real candidate scores), the
//     computation trace is elevated (the moat, front and center), THE READ has visual hierarchy
//     (key numbers highlighted), the loadout is a REWARD reveal, and the whole thing reflects the
//     user's own inputs so it reads as a bespoke analysis.
// Naming: "loadouts" everywhere user-facing; never "Build Advisor".

import { useState } from 'react';
import { TierIcon, CONFIDENCE_TIERS } from '@/components/network/confidenceTiers';
import { track } from '@/lib/useTrack';

const ACCENT = '#9bb537';        // olive -- Wardogs tactical accent
const ACCENT_SOFT = 'rgba(155,181,55,0.14)';
const PANEL = '#15181e';
const LINE = '#22252e';
const BASE = '#0f1115';

const PLAYSTYLES = [
  { id: 'aggressive', label: 'AGGRESSIVE', desc: 'Fast fights, soft targets. HP ammo, close-in.' },
  { id: 'balanced',   label: 'BALANCED',   desc: 'All-round. FMJ ammo, mixed armor.' },
  { id: 'tactical',   label: 'TACTICAL',   desc: 'Armored targets, methodical. AP ammo.' },
];

function tierMeta(key) {
  return CONFIDENCE_TIERS.find((t) => t.key === key) || CONFIDENCE_TIERS[2];
}
function playstyleLabel(id) {
  const p = PLAYSTYLES.find((x) => x.id === id);
  return p ? p.label : (id || 'BALANCED').toUpperCase();
}

// Highlight the substance inline: wrap TTK ms / percentages / dollar figures in an accent chip so
// the KEY NUMBERS pop out of the prose. Pure string -> React nodes; never mutates the content.
function highlightNumbers(text) {
  if (!text) return null;
  const parts = String(text).split(/(\d+(?:\.\d+)?\s?ms|\d+(?:\.\d+)?%|\$\d[\d,]*)/g);
  return parts.map((p, i) =>
    /^(\d+(?:\.\d+)?\s?ms|\d+(?:\.\d+)?%|\$\d[\d,]*)$/.test(p)
      ? <b key={i} style={{ color: ACCENT, fontWeight: 800, whiteSpace: 'nowrap' }}>{p}</b>
      : <span key={i}>{p}</span>
  );
}

export default function LoadoutsClient() {
  const [phase, setPhase] = useState('input');        // input | loading | result | error
  const [careerLevel, setCareerLevel] = useState('');
  const [budget, setBudget] = useState('');
  const [playstyle, setPlaystyle] = useState('balanced');

  const [queried, setQueried] = useState(null);       // the inputs AS SUBMITTED (for the custom header)
  const [steps, setSteps] = useState([]);
  const [meta, setMeta] = useState(null);
  const [analysis, setAnalysis] = useState('');
  const [error, setError] = useState(null);

  // ── ENGINE: unchanged SSE reader (steps -> meta -> delta -> done) ─────────────
  async function run() {
    setPhase('loading'); setSteps([]); setMeta(null); setAnalysis(''); setError(null);
    setQueried({ careerLevel: careerLevel === '' ? null : Number(careerLevel), budget: budget === '' ? null : Number(budget), playstyle });
    track('loadouts_generate', { playstyle, hasLevel: !!careerLevel, hasBudget: !!budget });

    try {
      const res = await fetch('/api/loadouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          careerLevel: careerLevel === '' ? null : Number(careerLevel),
          budget: budget === '' ? null : Number(budget),
          playstyle,
        }),
      });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Request failed (' + res.status + ')');
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      let gotMeta = false;
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
    } catch (err) {
      setError(err.message);
      setPhase('error');
    }
  }

  const wrap = { background: BASE, minHeight: '60vh', color: '#fff', fontFamily: 'system-ui, sans-serif', padding: '24px' };
  const inner = { maxWidth: 1000, margin: '0 auto' };
  const KEYFRAMES = `
    @keyframes lsPulse{0%,100%{opacity:.35}50%{opacity:1}}
    @keyframes lsUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
    @keyframes lsBar{from{transform:scaleX(0)}to{transform:scaleX(1)}}
    .ls-cursor{animation:lsPulse 1s infinite}
    .ls-up{animation:lsUp .45s cubic-bezier(.2,.7,.2,1) both}
    .ls-opt:hover{background:#1a1d24 !important}
    .ls-bar-fill{transform-origin:left center;animation:lsBar .6s cubic-bezier(.2,.7,.2,1) both}
  `;

  // ── INPUT ─────────────────────────────────────────────────────
  if (phase === 'input') {
    return (
      <div style={wrap}><div style={inner}>
        <style>{KEYFRAMES}</style>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px,1fr))', gap: 16, marginBottom: 20 }}>
          <div>
            <Label>Career level <span style={{ color: 'rgba(255,255,255,0.3)' }}>(optional)</span></Label>
            <input type="number" min="0" value={careerLevel} onChange={(e) => setCareerLevel(e.target.value)} placeholder="e.g. 20" style={inputStyle} />
            <Hint>Skip it and we rank the whole roster (no unlock-gate).</Hint>
          </div>
          <div>
            <Label>Cash budget <span style={{ color: 'rgba(255,255,255,0.3)' }}>(optional)</span></Label>
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
                style={{ background: sel ? ACCENT_SOFT : PANEL, border: '1px solid ' + (sel ? ACCENT + '66' : LINE), borderLeft: '3px solid ' + (sel ? ACCENT : LINE), borderRadius: '0 3px 3px 0', padding: '12px 14px', cursor: 'pointer' }}>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.5, color: sel ? ACCENT : 'rgba(255,255,255,0.55)', fontFamily: 'monospace', marginBottom: 3 }}>{p.label}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.4 }}>{p.desc}</div>
              </div>
            );
          })}
        </div>
        <button onClick={run} style={{ padding: '14px 40px', background: ACCENT, color: BASE, border: 'none', borderRadius: 2, fontSize: 13, fontWeight: 900, letterSpacing: 1, cursor: 'pointer' }}>
          FIND MY BEST LOADOUT →
        </button>
      </div></div>
    );
  }

  // ── ERROR ─────────────────────────────────────────────────────
  if (phase === 'error') {
    return (
      <div style={wrap}><div style={inner}>
        <div style={{ padding: '14px 18px', background: 'rgba(255,60,60,0.08)', border: '1px solid rgba(255,60,60,0.3)', borderLeft: '3px solid #ff3c3c', borderRadius: '0 3px 3px 0', color: '#ff6b6b', fontSize: 13 }}>{error}</div>
        <button onClick={() => setPhase('input')} style={{ marginTop: 16, padding: '10px 20px', background: 'transparent', border: '1px solid ' + LINE, borderRadius: 2, color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: 12 }}>← Try again</button>
      </div></div>
    );
  }

  // ── LOADING + RESULT ──────────────────────────────────────────
  const rec = (meta && meta.recommendation) || {};
  const cand = (meta && meta.candidates) || {};
  const prov = (meta && meta.provenance) || { tier: 'attributed', basis: '', sources: [] };
  const bud = (meta && meta.budget) || {};
  const t = tierMeta(prov.tier);
  const psLabel = playstyleLabel((meta && meta.playstyle) || (queried && queried.playstyle));

  const primaries = (cand.primary || []).filter((c) => c.rankable && c.score != null);
  const pick = rec.primary || null;
  const runnerUp = primaries.filter((c) => !pick || c.weapon_name !== pick.weapon_name)[0] || null;
  const gapMs = pick && runnerUp && pick.weighted_ttk_ms != null && runnerUp.weighted_ttk_ms != null
    ? Math.round(Math.abs(runnerUp.weighted_ttk_ms - pick.weighted_ttk_ms)) : null;
  const rankedCount = primaries.length + (cand.secondary || []).filter((c) => c.rankable).length;

  return (
    <div style={wrap}><div style={inner}>
      <style>{KEYFRAMES}</style>

      {/* 1 ── CUSTOM QUERY HEADER (feel bespoke) ─────────────────── */}
      {queried && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
          <span style={{ fontSize: 10, letterSpacing: 2, color: 'rgba(255,255,255,0.35)', fontWeight: 800, fontFamily: 'monospace' }}>ANALYSIS FOR YOU</span>
          <Chip>{queried.careerLevel != null ? 'CAREER ' + queried.careerLevel : 'ALL LEVELS'}</Chip>
          <Chip accent>{psLabel}</Chip>
          <Chip>{queried.budget != null ? '$' + queried.budget : 'NO BUDGET'}</Chip>
        </div>
      )}

      {/* 2 ── COMPUTATION TRACE (the moat, elevated) ─────────────── */}
      <div className="ls-up" style={{ background: PANEL, border: '1px solid ' + LINE, borderTop: '3px solid ' + ACCENT, borderRadius: '3px 3px 0 0', padding: '16px 18px', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 10, letterSpacing: 2.5, color: ACCENT, fontWeight: 800, fontFamily: 'monospace' }}>◢ SOLVED IN REAL TIME</div>
          {rankedCount > 0 && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>{rankedCount} weapons scored by measured TTK</div>}
        </div>
        {steps.length === 0 && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Running the solver<span className="ls-cursor">_</span></div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {steps.map((s, i) => (
            <div key={s.id} className="ls-up" style={{ animationDelay: (i * 0.09) + 's', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span style={{ flexShrink: 0, width: 20, height: 20, borderRadius: 4, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900,
                background: s.status === 'done' ? ACCENT : s.status === 'skipped' ? 'transparent' : ACCENT_SOFT,
                color: s.status === 'done' ? BASE : 'rgba(255,255,255,0.4)',
                border: s.status === 'done' ? 'none' : '1px solid ' + LINE }}>
                {s.status === 'done' ? '✓' : s.status === 'skipped' ? '–' : '·'}
              </span>
              <div style={{ paddingTop: 1 }}>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.92)', fontWeight: 700 }}>{s.label}</span>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}> — {s.detail}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3 ── THE LOADOUT (reward reveal) ────────────────────────── */}
      {meta && (
        <div className="ls-up" style={{ animationDelay: '.05s', background: 'linear-gradient(160deg, ' + ACCENT_SOFT + ' 0%, ' + PANEL + ' 55%)', border: '1px solid ' + ACCENT + '44', borderRadius: 4, padding: '20px 22px', marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
            <div style={{ fontSize: 11, letterSpacing: 3, color: '#fff', fontWeight: 900, fontFamily: 'monospace' }}>YOUR LOADOUT</div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: t.color, fontSize: 10, fontWeight: 700, letterSpacing: 1, fontFamily: 'monospace' }}>
              <TierIcon tier={prov.tier} size={12} /> {t.label.toUpperCase()}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px,1fr))', gap: 12 }}>
            <SlotCard label="PRIMARY" pick={rec.primary} hero rank={pick ? 1 : null} total={primaries.length} gapMs={gapMs} runnerUp={runnerUp} />
            <SlotCard label="SECONDARY" pick={rec.secondary} />
          </div>
        </div>
      )}

      {/* 4 ── THE READ (streamed insight, hierarchy + highlighted numbers) ── */}
      {(analysis || phase === 'result') && (
        <div style={{ background: PANEL, border: '1px solid ' + LINE, borderLeft: '3px solid ' + ACCENT, borderRadius: '0 4px 4px 0', padding: '20px 22px', marginBottom: 14 }}>
          <div style={{ fontSize: 10, letterSpacing: 2.5, color: ACCENT, fontWeight: 800, fontFamily: 'monospace', marginBottom: 12 }}>◢ THE READ</div>
          <div style={{ fontSize: 16, lineHeight: 1.8, color: 'rgba(255,255,255,0.9)', maxWidth: '68ch' }}>
            {analysis ? highlightNumbers(analysis) : <span style={{ color: 'rgba(255,255,255,0.35)' }}>Reading the numbers<span className="ls-cursor">_</span></span>}
            {phase === 'loading' && analysis && <span className="ls-cursor" style={{ color: ACCENT }}>▍</span>}
          </div>
        </div>
      )}

      {/* 5 ── TTK COMPARISON VIZ (show the receipts) ─────────────── */}
      {primaries.length >= 2 && (
        <div className="ls-up" style={{ background: PANEL, border: '1px solid ' + LINE, borderRadius: 4, padding: '18px 22px', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
            <div style={{ fontSize: 10, letterSpacing: 2.5, color: ACCENT, fontWeight: 800, fontFamily: 'monospace' }}>◢ TIME-TO-KILL — YOUR TOP PICKS</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>{psLabel} · {pick && pick.ammo ? pick.ammo + ' ammo' : ''} · lower = faster</div>
          </div>
          {gapMs != null && runnerUp && (
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginBottom: 14 }}>
              {rec.primary && rec.primary.weapon_name} kills <b style={{ color: ACCENT }}>{gapMs}ms faster</b> than {runnerUp.weapon_name}, the next best.
            </div>
          )}
          <TtkChart candidates={primaries.slice(0, 6)} pickName={pick && pick.weapon_name} />
        </div>
      )}

      {/* 6 ── HONEST-NULL + PROVENANCE (the distinct caveat callout) ── */}
      {meta && (
        <div style={{ background: BASE, border: '1px dashed ' + LINE, borderRadius: 4, padding: '14px 18px', marginBottom: 16, fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7 }}>
          <div>
            <b style={{ color: 'rgba(255,255,255,0.7)' }}>Budget:</b>{' '}
            {bud.applied
              ? 'solved within $' + bud.limit + ' (spent $' + bud.total + ').'
              : 'ranked by effectiveness only — Bulkhead hasn’t published prices yet, so budget filtering is off. It switches on the moment prices land.'}
          </div>
          {prov.basis && (
            <div style={{ marginTop: 6 }}>
              <b style={{ color: 'rgba(255,255,255,0.7)' }}>Basis:</b> {prov.basis}.
              {prov.sources && prov.sources.length ? ' Source: ' + prov.sources[0] : ''}
            </div>
          )}
        </div>
      )}

      <button onClick={() => setPhase('input')} style={{ padding: '10px 20px', background: 'transparent', border: '1px solid ' + LINE, borderRadius: 2, color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 12, letterSpacing: 1 }}>
        ← New loadout
      </button>
    </div></div>
  );
}

// ── presentational helpers ───────────────────────────────────────
function Label({ children }) {
  return <div style={{ fontSize: 10, letterSpacing: 2, color: 'rgba(255,255,255,0.5)', fontWeight: 800, fontFamily: 'monospace', marginBottom: 8, textTransform: 'uppercase' }}>{children}</div>;
}
function Hint({ children }) {
  return <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 6, lineHeight: 1.4 }}>{children}</div>;
}
const inputStyle = { width: '100%', boxSizing: 'border-box', padding: '11px 13px', background: '#15181e', border: '1px solid #22252e', borderRadius: 2, color: '#fff', fontSize: 14, fontFamily: 'inherit' };

function Chip({ children, accent }) {
  return (
    <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.5, fontFamily: 'monospace', padding: '4px 9px', borderRadius: 3,
      color: accent ? ACCENT : 'rgba(255,255,255,0.7)', background: accent ? ACCENT_SOFT : '#15181e', border: '1px solid ' + (accent ? ACCENT + '55' : '#22252e') }}>
      {children}
    </span>
  );
}

// The TTK bar viz. Bar length is proportional to effectiveness score (higher score = faster kill =
// longer bar), labeled with the REAL weighted TTK ms. The recommended pick is the accent bar. Pure
// CSS bars -> responsive + mobile-safe (name sits above each bar so it never squishes).
function TtkChart({ candidates, pickName }) {
  const maxScore = Math.max(...candidates.map((c) => c.score || 0), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {candidates.map((c, i) => {
        const isPick = c.weapon_name === pickName;
        const pctW = Math.max(6, Math.round(((c.score || 0) / maxScore) * 100));
        return (
          <div key={c.weapon_name}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
              <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: isPick ? 800 : 600, color: isPick ? '#fff' : 'rgba(255,255,255,0.6)' }}>
                {isPick && <span style={{ color: ACCENT, marginRight: 6 }}>▸</span>}{c.weapon_name}
              </span>
              <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: isPick ? ACCENT : 'rgba(255,255,255,0.5)' }}>{c.weighted_ttk_ms}ms</span>
            </div>
            <div style={{ height: 10, background: '#0c0e12', borderRadius: 5, overflow: 'hidden' }}>
              <div className="ls-bar-fill" style={{ height: '100%', width: pctW + '%', animationDelay: (i * 0.06) + 's',
                background: isPick ? 'linear-gradient(90deg, ' + ACCENT + ', ' + ACCENT + 'cc)' : '#2c313b', borderRadius: 5 }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SlotCard({ label, pick, hero, rank, total, gapMs, runnerUp }) {
  if (!pick) {
    return (
      <div style={{ background: BASE, border: '1px solid ' + LINE, borderRadius: 3, padding: '16px 18px' }}>
        <div style={{ fontSize: 8, letterSpacing: 2, color: 'rgba(255,255,255,0.3)', fontWeight: 700, marginBottom: 6 }}>{label}</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>No pick</div>
      </div>
    );
  }
  return (
    <div style={{ background: BASE, border: '1px solid ' + (hero ? ACCENT + '44' : LINE), borderLeft: '3px solid ' + (hero ? ACCENT : 'rgba(255,255,255,0.25)'), borderRadius: '0 3px 3px 0', padding: '16px 18px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 8, letterSpacing: 2, color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>{label}</span>
        {hero && rank && total ? <span style={{ fontSize: 8, letterSpacing: 1, color: ACCENT, fontWeight: 800, fontFamily: 'monospace', background: ACCENT_SOFT, border: '1px solid ' + ACCENT + '44', borderRadius: 3, padding: '2px 6px' }}>#{rank} OF {total} BY TTK</span> : null}
      </div>
      <div style={{ fontFamily: 'monospace', fontSize: hero ? 22 : 17, fontWeight: 900, color: '#fff', marginBottom: 10, letterSpacing: 0.5 }}>{pick.weapon_name}</div>
      <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
        {pick.weighted_ttk_ms != null && <Stat label="TTK" value={pick.weighted_ttk_ms + 'ms'} hero={hero} />}
        {pick.ammo && <Stat label="AMMO" value={pick.ammo} />}
        <Stat label="PRICE" value={pick.cost != null ? '$' + pick.cost : 'TBD'} muted={pick.cost == null} />
      </div>
      {hero && gapMs != null && runnerUp && (
        <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid ' + LINE, fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
          Edges <b style={{ color: 'rgba(255,255,255,0.75)' }}>{runnerUp.weapon_name}</b> by <b style={{ color: ACCENT }}>{gapMs}ms</b>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, hero, muted }) {
  return (
    <div>
      <div style={{ fontFamily: 'monospace', fontSize: hero ? 18 : 14, fontWeight: 800, color: muted ? 'rgba(255,255,255,0.4)' : (hero ? ACCENT : 'rgba(255,255,255,0.85)') }}>{value}</div>
      <div style={{ fontSize: 8, letterSpacing: 1.5, color: 'rgba(255,255,255,0.3)', fontWeight: 700, fontFamily: 'monospace', marginTop: 2 }}>{label}</div>
    </div>
  );
}
