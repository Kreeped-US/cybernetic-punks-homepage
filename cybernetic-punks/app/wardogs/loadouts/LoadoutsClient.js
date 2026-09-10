'use client';
// app/wardogs/loadouts/LoadoutsClient.js
// The Wardogs loadouts experience -- the three diagnosis fixes made visible:
//   1. STREAMING: reads the /api/loadouts SSE stream and renders as it arrives. There is NO fake
//      timer and NO 99% ceiling anywhere in this file -- progress IS the real stream.
//   2. HONEST NARRATION: the loading trace shows the SOLVER's REAL steps (from the `steps` event),
//      each with its true status + detail. Nothing fabricated (contrast Marathon's SCAN_STEPS).
//   3. INSIGHT-FIRST: the streamed analysis prose LEADS the result; the structured loadout card is
//      the solver's computed picks. The LLM explains, it never picks.
// Naming: "loadouts" everywhere user-facing; never "Build Advisor".

import { useState, useRef } from 'react';
import { TierIcon, CONFIDENCE_TIERS } from '@/components/network/confidenceTiers';
import { track } from '@/lib/useTrack';

const ACCENT = '#9bb537'; // olive -- Wardogs tactical accent (distinct from Marathon orange)

const PLAYSTYLES = [
  { id: 'aggressive', label: 'AGGRESSIVE', desc: 'Fast fights, soft targets. HP ammo, close-in.' },
  { id: 'balanced',   label: 'BALANCED',   desc: 'All-round. FMJ ammo, mixed armor.' },
  { id: 'tactical',   label: 'TACTICAL',   desc: 'Armored targets, methodical. AP ammo.' },
];

function tierMeta(key) {
  return CONFIDENCE_TIERS.find((t) => t.key === key) || CONFIDENCE_TIERS[2]; // default attributed
}

export default function LoadoutsClient() {
  const [phase, setPhase] = useState('input');        // input | loading | result | error
  const [careerLevel, setCareerLevel] = useState('');
  const [budget, setBudget] = useState('');
  const [playstyle, setPlaystyle] = useState('balanced');

  const [steps, setSteps] = useState([]);
  const [meta, setMeta] = useState(null);
  const [analysis, setAnalysis] = useState('');
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  async function run() {
    setPhase('loading'); setSteps([]); setMeta(null); setAnalysis(''); setError(null);
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
        // SSE frames are separated by a blank line
        let sep;
        while ((sep = buf.indexOf('\n\n')) !== -1) {
          const frame = buf.slice(0, sep).trim();
          buf = buf.slice(sep + 2);
          if (!frame.startsWith('data:')) continue;
          const evt = JSON.parse(frame.slice(5).trim());
          if (evt.type === 'steps') {
            setSteps(evt.steps || []);
          } else if (evt.type === 'meta') {
            setMeta(evt);
            if (!gotMeta) { gotMeta = true; setPhase('result'); } // reveal the scaffold; prose streams in
          } else if (evt.type === 'delta') {
            setAnalysis((a) => a + evt.text);
          } else if (evt.type === 'error') {
            throw new Error(evt.error || 'Stream error');
          } else if (evt.type === 'done') {
            setPhase('result');
          }
        }
      }
    } catch (err) {
      setError(err.message);
      setPhase('error');
    }
  }

  // ── shared shell ──────────────────────────────────────────────
  const wrap = { background: '#0f1115', minHeight: '60vh', color: '#fff', fontFamily: 'system-ui, sans-serif', padding: '24px' };
  const inner = { maxWidth: 1000, margin: '0 auto' };

  // ── INPUT ─────────────────────────────────────────────────────
  if (phase === 'input') {
    return (
      <div style={wrap}><div style={inner}>
        <style>{`.ls-opt:hover{background:#1a1d24 !important}`}</style>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px,1fr))', gap: 16, marginBottom: 20 }}>
          <div>
            <Label>Career level <span style={{ color: 'rgba(255,255,255,0.3)' }}>(optional)</span></Label>
            <input type="number" min="0" value={careerLevel} onChange={(e) => setCareerLevel(e.target.value)}
              placeholder="e.g. 20" style={inputStyle} />
            <Hint>Skip it and we rank the whole roster (no unlock-gate).</Hint>
          </div>
          <div>
            <Label>Cash budget <span style={{ color: 'rgba(255,255,255,0.3)' }}>(optional)</span></Label>
            <input type="number" min="0" value={budget} onChange={(e) => setBudget(e.target.value)}
              placeholder="prices not published yet" style={inputStyle} />
            <Hint>Prices aren&rsquo;t out yet -- budget filtering activates when they land.</Hint>
          </div>
        </div>

        <Label>Playstyle</Label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))', gap: 8, marginBottom: 24 }}>
          {PLAYSTYLES.map((p) => {
            const sel = playstyle === p.id;
            return (
              <div key={p.id} className="ls-opt" onClick={() => setPlaystyle(p.id)}
                style={{ background: sel ? 'rgba(155,181,55,0.12)' : '#15181e', border: '1px solid ' + (sel ? ACCENT + '66' : '#22252e'),
                  borderLeft: '3px solid ' + (sel ? ACCENT : '#22252e'), borderRadius: '0 3px 3px 0', padding: '12px 14px', cursor: 'pointer' }}>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.5, color: sel ? ACCENT : 'rgba(255,255,255,0.55)', fontFamily: 'monospace', marginBottom: 3 }}>{p.label}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.4 }}>{p.desc}</div>
              </div>
            );
          })}
        </div>

        <button onClick={run}
          style={{ padding: '14px 40px', background: ACCENT, color: '#0f1115', border: 'none', borderRadius: 2, fontSize: 13, fontWeight: 900, letterSpacing: 1, cursor: 'pointer' }}>
          FIND MY BEST LOADOUT →
        </button>
      </div></div>
    );
  }

  // ── ERROR ─────────────────────────────────────────────────────
  if (phase === 'error') {
    return (
      <div style={wrap}><div style={inner}>
        <div style={{ padding: '14px 18px', background: 'rgba(255,60,60,0.08)', border: '1px solid rgba(255,60,60,0.3)', borderLeft: '3px solid #ff3c3c', borderRadius: '0 3px 3px 0', color: '#ff6b6b', fontSize: 13 }}>
          {error}
        </div>
        <button onClick={() => setPhase('input')} style={{ marginTop: 16, padding: '10px 20px', background: 'transparent', border: '1px solid #22252e', borderRadius: 2, color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: 12 }}>← Try again</button>
      </div></div>
    );
  }

  // ── LOADING + RESULT (share the honest-narration trace) ───────
  const rec = meta && meta.recommendation ? meta.recommendation : {};
  const prov = meta && meta.provenance ? meta.provenance : { tier: 'attributed', basis: '', sources: [] };
  const bud = meta && meta.budget ? meta.budget : {};
  const t = tierMeta(prov.tier);

  return (
    <div style={wrap}><div style={inner}>
      <style>{`@keyframes lsPulse{0%,100%{opacity:.35}50%{opacity:1}} .ls-cursor{animation:lsPulse 1s infinite}`}</style>

      {/* HONEST NARRATION TRACE -- the solver's REAL steps (not a fake timer). This is also the moat:
          it surfaces the computation the recommendation stands on. */}
      <div style={{ background: '#15181e', border: '1px solid #22252e', borderLeft: '3px solid ' + ACCENT, borderRadius: '0 3px 3px 0', padding: '14px 16px', marginBottom: 18 }}>
        <div style={{ fontSize: 9, letterSpacing: 2, color: ACCENT, fontWeight: 800, fontFamily: 'monospace', marginBottom: 10 }}>HOW THIS WAS COMPUTED</div>
        {steps.length === 0 && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Running the solver<span className="ls-cursor">_</span></div>}
        {steps.map((s) => (
          <div key={s.id} style={{ display: 'flex', gap: 10, marginBottom: 7, fontSize: 12, lineHeight: 1.5 }}>
            <span style={{ color: s.status === 'done' ? ACCENT : 'rgba(255,255,255,0.3)', fontWeight: 900, flexShrink: 0 }}>
              {s.status === 'done' ? '✓' : s.status === 'skipped' ? '–' : '▸'}
            </span>
            <span>
              <span style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 700 }}>{s.label}</span>
              <span style={{ color: 'rgba(255,255,255,0.4)' }}> — {s.detail}</span>
            </span>
          </div>
        ))}
      </div>

      {/* INSIGHT-FIRST: the streamed analysis LEADS. */}
      {(analysis || phase === 'result') && (
        <div style={{ background: '#15181e', border: '1px solid #22252e', borderTop: '3px solid ' + ACCENT, borderRadius: '0 0 4px 4px', padding: '20px 22px', marginBottom: 14 }}>
          <div style={{ fontSize: 9, letterSpacing: 2, color: ACCENT, fontWeight: 800, fontFamily: 'monospace', marginBottom: 10 }}>THE READ</div>
          <div style={{ fontSize: 15, lineHeight: 1.75, color: 'rgba(255,255,255,0.85)', whiteSpace: 'pre-wrap' }}>
            {analysis || <span style={{ color: 'rgba(255,255,255,0.35)' }}>Reading the numbers<span className="ls-cursor">_</span></span>}
            {phase === 'loading' && analysis && <span className="ls-cursor">▍</span>}
          </div>
        </div>
      )}

      {/* THE SOLVED LOADOUT (solver's computed picks). */}
      {meta && (
        <div style={{ background: '#15181e', border: '1px solid #22252e', borderRadius: 4, padding: '18px 22px', marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
            <div style={{ fontSize: 9, letterSpacing: 2, color: 'rgba(255,255,255,0.4)', fontWeight: 800, fontFamily: 'monospace' }}>THE LOADOUT</div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: t.color, fontSize: 10, fontWeight: 700, letterSpacing: 1, fontFamily: 'monospace' }}>
              <TierIcon tier={prov.tier} size={12} /> {t.label.toUpperCase()}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px,1fr))', gap: 12 }}>
            <SlotCard label="PRIMARY" pick={rec.primary} accent={ACCENT} />
            <SlotCard label="SECONDARY" pick={rec.secondary} accent="rgba(255,255,255,0.3)" />
          </div>
          {/* honest-null budget line */}
          <div style={{ marginTop: 14, fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
            {bud.applied
              ? 'Budget solved: spent $' + bud.total + ' of $' + bud.limit + '.'
              : 'Ranked by effectiveness (time-to-kill). Budget filtering is off — Bulkhead hasn’t published prices yet; it switches on when they do.'}
          </div>
          {/* provenance basis */}
          {prov.basis && (
            <div style={{ marginTop: 8, fontSize: 11, color: 'rgba(255,255,255,0.35)', lineHeight: 1.6 }}>
              Basis: {prov.basis}. {prov.sources && prov.sources.length ? 'Source: ' + prov.sources[0] : ''}
            </div>
          )}
        </div>
      )}

      <button onClick={() => setPhase('input')} style={{ padding: '10px 20px', background: 'transparent', border: '1px solid #22252e', borderRadius: 2, color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 12, letterSpacing: 1 }}>
        ← New loadout
      </button>
    </div></div>
  );
}

// ── small presentational helpers ─────────────────────────────────
function Label({ children }) {
  return <div style={{ fontSize: 10, letterSpacing: 2, color: 'rgba(255,255,255,0.5)', fontWeight: 800, fontFamily: 'monospace', marginBottom: 8, textTransform: 'uppercase' }}>{children}</div>;
}
function Hint({ children }) {
  return <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 6, lineHeight: 1.4 }}>{children}</div>;
}
const inputStyle = { width: '100%', boxSizing: 'border-box', padding: '11px 13px', background: '#15181e', border: '1px solid #22252e', borderRadius: 2, color: '#fff', fontSize: 14, fontFamily: 'inherit' };

function SlotCard({ label, pick, accent }) {
  if (!pick) {
    return (
      <div style={{ background: '#0f1115', border: '1px solid #22252e', borderRadius: 3, padding: '14px 16px' }}>
        <div style={{ fontSize: 8, letterSpacing: 2, color: 'rgba(255,255,255,0.3)', fontWeight: 700, marginBottom: 6 }}>{label}</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>No pick</div>
      </div>
    );
  }
  return (
    <div style={{ background: '#0f1115', border: '1px solid #22252e', borderLeft: '3px solid ' + accent, borderRadius: '0 3px 3px 0', padding: '14px 16px' }}>
      <div style={{ fontSize: 8, letterSpacing: 2, color: 'rgba(255,255,255,0.35)', fontWeight: 700, marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: 'monospace', fontSize: 15, fontWeight: 800, color: '#fff', marginBottom: 6 }}>{pick.weapon_name}</div>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}>
        {pick.weighted_ttk_ms != null && <span>TTK <b style={{ color: 'rgba(255,255,255,0.8)' }}>{pick.weighted_ttk_ms}ms</b></span>}
        {pick.ammo && <span>Ammo <b style={{ color: 'rgba(255,255,255,0.8)' }}>{pick.ammo}</b></span>}
        <span>{pick.cost != null ? '$' + pick.cost : 'price TBD'}</span>
      </div>
    </div>
  );
}
