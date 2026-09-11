'use client';
// app/wardogs/loadouts/LoadoutsClient.js
// The Wardogs loadouts INTERACTIVE tool: input form + the SSE reader (run()) + streaming state. The
// RESULT render is now the shared <LoadoutResult> (components/wardogs/LoadoutResult.js), reused by the
// persisted SSR page /wardogs/loadouts/build/[slug]. The SSE engine (run()) is byte-identical to before
// -- only the result JSX moved out. Naming: "loadouts" everywhere; never "Build Advisor".

import { useState } from 'react';
import { track } from '@/lib/useTrack';
import LoadoutResult from '@/components/wardogs/LoadoutResult';

const A = 'var(--accent)';
const AG = 'var(--accent-glow)';
const CARD = 'var(--bg-card)';
const PAGE = 'var(--bg-page)';
const LINE = 'var(--border)';
const T1 = 'var(--text-primary)';
const T2 = 'var(--text-secondary)';
const T3 = 'var(--text-tertiary)';

const PLAYSTYLES = [
  { id: 'aggressive', label: 'AGGRESSIVE', desc: 'Fast fights, soft targets. HP ammo, close-in.' },
  { id: 'balanced',   label: 'BALANCED',   desc: 'All-round. FMJ ammo, mixed armor.' },
  { id: 'tactical',   label: 'TACTICAL',   desc: 'Armored targets, methodical. AP ammo.' },
];

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
  // save-on-action (Channel A): explicit save -> a public shareable /build/[slug] page + OG card
  const [saveStatus, setSaveStatus] = useState('idle'); // idle | saving | saved | error
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);

  // ── ENGINE: unchanged SSE reader ──────────────────────────────
  async function run() {
    setPhase('loading'); setSteps([]); setMeta(null); setAnalysis(''); setError(null);
    setSaveStatus('idle'); setShareUrl(''); setCopied(false); // a new generation invalidates the last save
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

  // ── SAVE & SHARE (save-on-action) ─────────────────────────────
  async function saveShare() {
    if (saveStatus === 'saving') return;
    setSaveStatus('saving'); setCopied(false);
    try {
      const res = await fetch('/api/loadouts/save', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          careerLevel: queried ? queried.careerLevel : null,
          budget: queried ? queried.budget : null,
          playstyle: (queried && queried.playstyle) || playstyle,
          analysis,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.slug) throw new Error(j.error || 'Save failed');
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      setShareUrl(origin + j.url);
      setSaveStatus('saved');
      track('loadouts_save', { playstyle: (queried && queried.playstyle) || playstyle });
    } catch (e) { setSaveStatus('error'); }
  }
  function copyLink() {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl).then(() => { setCopied(true); track('loadouts_share', { target: 'copy' }); }).catch(() => {});
  }
  function shareX() {
    const text = 'My Wardogs loadout, ranked by measured time-to-kill:';
    window.open('https://twitter.com/intent/tweet?text=' + encodeURIComponent(text) + '&url=' + encodeURIComponent(shareUrl), '_blank');
    track('loadouts_share', { target: 'x' });
  }

  const wrap = { background: PAGE, minHeight: '60vh', color: '#fff', fontFamily: 'system-ui, sans-serif', padding: '24px' };
  const inner = { maxWidth: 1000, margin: '0 auto' };
  const inputStyle = { width: '100%', boxSizing: 'border-box', padding: '11px 13px', background: CARD, border: '1px solid ' + LINE, borderRadius: 2, color: '#fff', fontSize: 14, fontFamily: 'inherit' };

  // ── INPUT ─────────────────────────────────────────────────────
  if (phase === 'input') {
    return (
      <div style={wrap}><div style={inner}>
        <style>{`.ls-opt:hover{background:var(--bg-card-hover) !important}`}</style>
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

  // ── LOADING + RESULT (shared render) ──────────────────────────
  return (
    <LoadoutResult
      steps={steps}
      meta={meta}
      analysis={analysis}
      queried={queried}
      streaming={phase === 'loading'}
      footer={
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {phase === 'result' && meta && saveStatus !== 'saved' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <button onClick={saveShare} disabled={saveStatus === 'saving'}
                style={{ padding: '12px 22px', background: A, color: PAGE, border: 'none', borderRadius: 2, fontSize: 12, fontWeight: 900, letterSpacing: 1, cursor: saveStatus === 'saving' ? 'default' : 'pointer', opacity: saveStatus === 'saving' ? 0.7 : 1 }}>
                {saveStatus === 'saving' ? 'SAVING…' : '⬦ SAVE & SHARE THIS LOADOUT'}
              </button>
              <span style={{ fontSize: 11, color: T3 }}>Get a public link with a preview card.</span>
              {saveStatus === 'error' && <span style={{ fontSize: 12, color: '#ff9a86' }}>Save failed — try again.</span>}
            </div>
          )}

          {saveStatus === 'saved' && (
            <div style={{ background: AG, border: '1px solid ' + A, borderLeft: '3px solid ' + A, borderRadius: '0 4px 4px 0', padding: '14px 16px' }}>
              <div style={{ fontSize: 10, letterSpacing: 2, color: A, fontWeight: 800, fontFamily: 'monospace', marginBottom: 10 }}>&#9698; SHAREABLE LINK — PUBLIC PAGE</div>
              <input readOnly value={shareUrl} onFocus={(e) => e.target.select()}
                style={{ width: '100%', boxSizing: 'border-box', background: PAGE, border: '1px solid ' + LINE, color: T1, fontSize: 12, padding: '9px 11px', borderRadius: 2, fontFamily: 'monospace', marginBottom: 10 }} />
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button onClick={copyLink} style={{ padding: '9px 16px', background: A, color: PAGE, border: 'none', borderRadius: 2, fontSize: 11, fontWeight: 800, letterSpacing: 1, cursor: 'pointer' }}>{copied ? 'COPIED ✓' : 'COPY LINK'}</button>
                <button onClick={shareX} style={{ padding: '9px 16px', background: 'transparent', border: '1px solid ' + LINE, color: T2, borderRadius: 2, fontSize: 11, fontWeight: 700, letterSpacing: 1, cursor: 'pointer' }}>POST TO X</button>
                <a href={shareUrl} target="_blank" rel="noreferrer" style={{ padding: '9px 16px', background: 'transparent', border: '1px solid ' + LINE, color: T2, borderRadius: 2, fontSize: 11, fontWeight: 700, letterSpacing: 1, textDecoration: 'none' }}>OPEN PAGE →</a>
              </div>
              <div style={{ fontSize: 11, color: T3, marginTop: 10, lineHeight: 1.5 }}>Anyone with the link can view it. Paste it in Discord or Reddit and it unfurls with a preview card.</div>
            </div>
          )}

          <button onClick={() => { setPhase('input'); setSaveStatus('idle'); setShareUrl(''); }}
            style={{ alignSelf: 'flex-start', padding: '10px 20px', background: 'transparent', border: '1px solid ' + LINE, borderRadius: 2, color: T2, cursor: 'pointer', fontSize: 12, letterSpacing: 1 }}>
            ← New loadout
          </button>
        </div>
      }
    />
  );
}

// input-phase helpers
function Label({ children }) { return <div style={{ fontSize: 10, letterSpacing: 2, color: T2, fontWeight: 800, fontFamily: 'monospace', marginBottom: 8, textTransform: 'uppercase' }}>{children}</div>; }
function Hint({ children }) { return <div style={{ fontSize: 11, color: T3, marginTop: 6, lineHeight: 1.4 }}>{children}</div>; }
