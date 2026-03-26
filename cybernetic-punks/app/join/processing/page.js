'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

const LINES = [
  { editor: 'DEXTER', color: '#ff8800', sym: '⬢', delay: 400, lines: [
    { t: 600, text: '▸ Shell and weapon combo loaded' },
    { t: 1200, text: '▸ Mod slot analysis: scanning for gaps' },
    { t: 1800, text: '▸ Core and implant alignment: calculating' },
    { t: 2400, text: '▸ Conflict detection: running playstyle check' },
    { t: 3000, text: '▸ Rarity efficiency: evaluating each slot', color: 'rgba(255,136,0,0.6)' },
    { t: 3600, text: '✓ DEXTER build report compiled', color: 'rgba(0,255,136,0.7)' },
  ]},
  { editor: 'NEXUS', color: '#00f5ff', sym: '⬡', delay: 3800, lines: [
    { t: 4000, text: '▸ Pulling live meta_tiers from database' },
    { t: 4600, text: '▸ Shell tier and trend: calculating' },
    { t: 5200, text: '▸ Zone meta weighting: applied' },
    { t: 5800, text: '▸ Community positioning: comparing' },
    { t: 6400, text: '✓ NEXUS meta analysis complete', color: 'rgba(0,255,136,0.7)' },
  ]},
  { editor: 'MIRANDA', color: '#9b5de5', sym: '◎', delay: 6600, lines: [
    { t: 6800, text: '▸ Playstyle profile: reading motivation' },
    { t: 7400, text: '▸ Squad context and zone preference: mapped' },
    { t: 8000, text: '▸ Runner archetype: classifying' },
    { t: 8600, text: '▸ Personalized field notes: compiling' },
    { t: 9200, text: '✓ MIRANDA profile complete', color: 'rgba(0,255,136,0.7)' },
  ]},
];

export default function ProcessingPage() {
  const router = useRouter();
  const [visibleLines, setVisibleLines] = useState({});
  const [auditDone, setAuditDone] = useState(false);
  const [auditError, setAuditError] = useState(false);
  const calledRef = useRef(false);

  useEffect(() => {
    // Show each status line on a timer
    LINES.forEach(editor => {
      editor.lines.forEach(line => {
        setTimeout(() => {
          setVisibleLines(v => ({
            ...v,
            [`${editor.editor}-${line.t}`]: { text: line.text, color: line.color || 'rgba(255,255,255,0.4)' },
          }));
        }, line.t);
      });
    });

    // Fire the audit API call
    if (calledRef.current) return;
    calledRef.current = true;

    fetch('/api/audit', { method: 'POST' })
      .then(async res => {
        if (res.ok) {
          setAuditDone(true);
        } else {
          const err = await res.text();
          console.error('Audit failed:', err);
          setAuditError(true);
        }
      })
      .catch(err => {
        console.error('Audit network error:', err);
        setAuditError(true);
      });
  }, []);

  const canView = auditDone;

  return (
    <div style={{
      minHeight: '100vh',
      background: '#030303',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '60px 40px',
      fontFamily: "'Rajdhani',sans-serif",
      color: '#fff',
      position: 'relative',
    }}>
      <div style={{
        position: 'fixed', inset: 0,
        backgroundImage: 'linear-gradient(rgba(0,245,255,0.035) 1px,transparent 1px),linear-gradient(90deg,rgba(0,245,255,0.035) 1px,transparent 1px)',
        backgroundSize: '48px 48px', pointerEvents: 'none', zIndex: 0,
      }} />
      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        width: '700px', height: '700px', borderRadius: '50%',
        background: 'radial-gradient(circle,rgba(0,245,255,0.03) 0%,transparent 65%)',
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: '580px', width: '100%' }}>

        <div style={{ textAlign: 'center', marginBottom: '52px' }}>
          <div style={{ fontFamily: "'Share Tech Mono',monospace", color: 'rgba(0,245,255,0.45)', fontSize: '9px', letterSpacing: '6px', marginBottom: '8px' }}>CYBERNETICPUNKS.COM</div>
          <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: '13px', letterSpacing: '6px', color: 'rgba(255,255,255,0.6)', fontWeight: 700 }}>EDITORIAL ANALYSIS IN PROGRESS</div>
        </div>

        {LINES.map(editor => (
          <div key={editor.editor} style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', marginBottom: '32px' }}>
            <div style={{ flexShrink: 0, width: '44px', textAlign: 'center' }}>
              <div style={{ color: editor.color, fontSize: '26px' }}>{editor.sym}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: '9px', color: editor.color, letterSpacing: '3px', marginBottom: '10px' }}>
                {editor.editor} · {editor.editor === 'DEXTER' ? 'BUILD ENGINEER' : editor.editor === 'NEXUS' ? 'META STRATEGIST' : 'FIELD GUIDE'}
              </div>
              {editor.lines.map(line => {
                const key = `${editor.editor}-${line.t}`;
                const visible = visibleLines[key];
                return visible ? (
                  <div key={key} style={{
                    fontFamily: "'Share Tech Mono',monospace",
                    fontSize: '11px',
                    color: visible.color,
                    padding: '2px 0',
                    lineHeight: 1.7,
                    animation: 'fadeIn 0.3s ease',
                  }}>
                    {visible.text}
                  </div>
                ) : null;
              })}
            </div>
          </div>
        ))}

        <div style={{ textAlign: 'center', marginTop: '20px', minHeight: '80px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          {auditError && (
            <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: '10px', color: 'rgba(255,100,100,0.7)', letterSpacing: '2px', marginBottom: '16px' }}>
              ⚠ ANALYSIS ERROR — PLEASE RETURN TO /JOIN AND TRY AGAIN
            </div>
          )}
          {canView && (
            <div>
              <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: '9px', color: 'rgba(0,245,255,0.6)', letterSpacing: '3px', marginBottom: '20px' }}>
                ● AUDIT COMPILED · RUNNER RATING CALCULATED
              </div>
              <button
                onClick={() => router.push('/me')}
                style={{
                  background: 'rgba(0,245,255,0.07)',
                  border: '1px solid rgba(0,245,255,0.45)',
                  color: '#00f5ff',
                  fontFamily: "'Share Tech Mono',monospace",
                  fontSize: '11px',
                  letterSpacing: '5px',
                  padding: '16px 52px',
                  cursor: 'pointer',
                  borderRadius: '3px',
                }}
              >
                VIEW YOUR AUDIT →
              </button>
            </div>
          )}
          {!canView && !auditError && (
            <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: '9px', color: 'rgba(255,255,255,0.2)', letterSpacing: '3px' }}>
              ● COMPILING...
            </div>
          )}
        </div>

      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateX(-4px); } to { opacity: 1; transform: translateX(0); } }
      `}</style>
    </div>
  );
}
