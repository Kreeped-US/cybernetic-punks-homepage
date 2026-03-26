'use client';
import { useState } from 'react';
import Link from 'next/link';

function platformLabel(p) {
  return { ps5: 'PS5', xbox: 'XBOX', pc: 'PC · STEAM', bungie: 'PC' }[p] || 'PC';
}

function gradeColor(g) {
  return { S: '#00ff88', A: '#00f5ff', B: '#ff8800', C: '#888', D: '#ff4444' }[g] || '#888';
}

function Divider({ label }) {
  return (
    <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.15)', letterSpacing: 6, textAlign: 'center', margin: '28px 0 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
      {label}
      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
    </div>
  );
}

function StatBar({ label, value, max = 10, color = '#ff8800', flag = false }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
      <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: flag ? '#ff4444' : 'rgba(255,255,255,0.25)', letterSpacing: 1, width: 140, flexShrink: 0 }}>
        {label}{flag ? ' ⚠' : ''}
      </span>
      <div style={{ flex: 1, background: 'rgba(255,255,255,0.06)', height: 3, borderRadius: 2 }}>
        <div style={{ background: flag ? '#ff4444' : color, height: '100%', width: `${pct}%`, borderRadius: 2 }} />
      </div>
      <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: flag ? '#ff4444' : color, minWidth: 32, textAlign: 'right' }}>
        {value}/{max}
      </span>
    </div>
  );
}

function EmptyAudit() {
  return (
    <div style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.06)', borderLeft: '3px solid rgba(0,245,255,0.3)', borderRadius: 5, padding: '32px', textAlign: 'center' }}>
      <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: 3, marginBottom: 12 }}>NO AUDIT ON FILE</div>
      <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.3)', lineHeight: 1.7, marginBottom: 24 }}>
        Complete the Runner Intake to receive your full personalized audit from DEXTER, NEXUS, and MIRANDA.
      </div>
      <Link href="/join/intake" style={{ display: 'inline-block', background: 'rgba(0,245,255,0.07)', border: '1px solid rgba(0,245,255,0.4)', color: '#00f5ff', fontFamily: 'Share Tech Mono, monospace', fontSize: 10, letterSpacing: 3, padding: '12px 32px', borderRadius: 5, textDecoration: 'none' }}>
        BEGIN INTAKE →
      </Link>
    </div>
  );
}

export default function MeClient({ player, audit, snapshot, auditHistory }) {
  const [askEditor, setAskEditor] = useState('DEXTER');
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [qaResult, setQaResult] = useState(null);
  const [qaError, setQaError] = useState(false);

  const dexter = audit?.dexter_analysis;
  const nexus = audit?.nexus_analysis;
  const miranda = audit?.miranda_analysis;
  const recs = audit?.top_recommendations || [];
  const score = audit?.composite_score;
  const grade = audit?.letter_grade;

  const initials = player.bungie_display_name.replace(/#\d+/, '').trim().slice(0, 2).toUpperCase();
  const displayName = player.bungie_display_name.replace(/#\d+/, '').trim();

  const handleAsk = async () => {
    if (!question.trim() || asking) return;
    setAsking(true);
    setQaResult(null);
    setQaError(false);
    try {
      const res = await fetch('/api/ask-editor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ editor: askEditor, question: question.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setQaResult({ editor: askEditor, question: question.trim(), answer: data.answer });
        setQuestion('');
      } else {
        setQaError(true);
      }
    } catch {
      setQaError(true);
    }
    setAsking(false);
  };

  const EDITOR_COLORS = { DEXTER: '#ff8800', NEXUS: '#00f5ff', CIPHER: '#ff0000', MIRANDA: '#9b5de5', GHOST: '#00ff88' };
  const EDITOR_SYMS = { DEXTER: '⬢', NEXUS: '⬡', CIPHER: '◈', MIRANDA: '◎', GHOST: '◇' };

  return (
    <div style={{ minHeight: '100vh', background: '#030303', color: '#fff', fontFamily: 'Rajdhani, sans-serif', paddingTop: 80 }}>

      <style>{`
        @keyframes mPulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .me-card { transition: border-color 0.15s; }
        .me-card:hover { border-color: rgba(255,255,255,0.12) !important; }
        .me-rec:hover { background: rgba(255,136,0,0.04) !important; }
      `}</style>

      {/* Grid bg */}
      <div style={{ position: 'fixed', inset: 0, opacity: 0.012, backgroundImage: 'linear-gradient(rgba(0,245,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(0,245,255,1) 1px,transparent 1px)', backgroundSize: '48px 48px', pointerEvents: 'none', zIndex: 0 }} />

      {/* Profile header */}
      <div style={{ background: 'rgba(0,0,0,0.7)', borderBottom: '1px solid rgba(0,245,255,0.08)', padding: '16px 36px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backdropFilter: 'blur(10px)', position: 'relative', zIndex: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {player.bungie_avatar_url ? (
            <img src={player.bungie_avatar_url} alt="avatar" width={40} height={40} style={{ borderRadius: '50%', border: '1px solid rgba(0,245,255,0.25)' }} />
          ) : (
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(0,245,255,0.1)', border: '1px solid rgba(0,245,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Orbitron, monospace', fontSize: 13, color: '#00f5ff', fontWeight: 700 }}>{initials}</div>
          )}
          <div>
            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 14, fontWeight: 700, color: '#fff', letterSpacing: 2 }}>{displayName}</div>
            <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, marginTop: 3 }}>{platformLabel(player.platform)} · {player.subscription_tier.toUpperCase()} TIER</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          {score != null && (
            <>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 28, fontWeight: 900, color: '#00f5ff', lineHeight: 1 }}>{score}</div>
                <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, marginTop: 3 }}>RUNNER RATING</div>
              </div>
              <div style={{ background: 'rgba(0,245,255,0.06)', border: '1px solid rgba(0,245,255,0.2)', borderRadius: 5, padding: '8px 18px', textAlign: 'center' }}>
                <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 24, fontWeight: 900, color: gradeColor(grade), lineHeight: 1 }}>{grade}</div>
                <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: 'rgba(255,255,255,0.25)', letterSpacing: 2, marginTop: 3 }}>GRADE</div>
              </div>
            </>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <Link href="/join/intake" style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, padding: '8px 14px', textDecoration: 'none', letterSpacing: 2 }}>UPDATE LOADOUT</Link>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 36px', position: 'relative', zIndex: 1 }}>

        {!audit ? <EmptyAudit /> : (
          <>
            {/* Top row — identity + DEXTER */}
            <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 12, marginBottom: 12 }}>

              {/* Identity panel */}
              <div className="me-card" style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.06)', borderLeft: '3px solid rgba(0,245,255,0.3)', borderRadius: 5, padding: '20px' }}>
                <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(0,245,255,0.5)', letterSpacing: 3, marginBottom: 16 }}>RUNNER IDENTITY</div>
                {[
                  { label: 'SHELL', value: snapshot?.shell || '—', color: '#00f5ff' },
                  { label: 'PRIMARY', value: snapshot?.primary_weapon || '—' },
                  { label: 'SECONDARY', value: snapshot?.secondary_weapon || '—' },
                  { label: 'PLAYSTYLE', value: snapshot?.playstyle || '—' },
                  { label: 'SQUAD', value: snapshot?.squad_context || '—' },
                  { label: 'ZONES', value: snapshot?.zones?.join(', ') || '—' },
                  { label: 'HOURS/WEEK', value: snapshot?.hours_per_week || '—' },
                ].map(item => (
                  <div key={item.label} style={{ marginBottom: 10 }}>
                    <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: 'rgba(255,255,255,0.2)', letterSpacing: 2, marginBottom: 3 }}>{item.label}</div>
                    <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 11, color: item.color || 'rgba(255,255,255,0.65)' }}>{item.value}</div>
                  </div>
                ))}
                <Link href="/join/intake" style={{ display: 'block', textAlign: 'center', fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, padding: '8px', textDecoration: 'none', marginTop: 16, letterSpacing: 2 }}>EDIT PROFILE</Link>
              </div>

              {/* DEXTER panel */}
              <div className="me-card" style={{ background: '#0a0a0a', border: '1px solid rgba(255,136,0,0.1)', borderTop: '2px solid rgba(255,136,0,0.4)', borderRadius: 5, padding: '22px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ color: '#ff8800', fontSize: 22 }}>⬢</span>
                    <div>
                      <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: '#ff8800', letterSpacing: 3 }}>DEXTER · BUILD ANALYSIS</div>
                      <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: 'rgba(255,255,255,0.2)', letterSpacing: 2, marginTop: 2 }}>BUILD ENGINEER</div>
                    </div>
                  </div>
                  {dexter?.build_score != null && (
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 26, fontWeight: 900, color: '#ff8800', lineHeight: 1 }}>{dexter.build_score}</div>
                      <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: 'rgba(255,255,255,0.25)', letterSpacing: 1, marginTop: 3 }}>BUILD SCORE</div>
                    </div>
                  )}
                </div>

                {dexter?.analysis_body && (
                  <div style={{ background: 'rgba(255,136,0,0.03)', borderLeft: '2px solid rgba(255,136,0,0.25)', padding: '14px 16px', marginBottom: 18, borderRadius: '0 4px 4px 0' }}>
                    <p style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.8, margin: 0 }}>{dexter.analysis_body}</p>
                  </div>
                )}

                <div>
                  <StatBar label="WEAPON SYNERGY" value={dexter?.weapon_synergy_score || 0} flag={dexter?.weapon_synergy_score < 5} />
                  <StatBar label="MOD EFFICIENCY" value={dexter?.mod_efficiency_score || 0} flag={dexter?.mod_efficiency_score < 5} />
                  <StatBar label="CORE ALIGNMENT" value={dexter?.core_alignment_score || 0} flag={dexter?.core_alignment_score < 5} />
                  <StatBar label="IMPLANT STACK" value={dexter?.implant_stack_score || 0} flag={dexter?.implant_stack_score < 5} />
                </div>
              </div>
            </div>

            {/* Middle row — NEXUS + MIRANDA */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>

              {/* NEXUS */}
              <div className="me-card" style={{ background: '#0a0a0a', border: '1px solid rgba(0,245,255,0.1)', borderTop: '2px solid rgba(0,245,255,0.35)', borderRadius: 5, padding: '22px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <span style={{ color: '#00f5ff', fontSize: 22 }}>⬡</span>
                  <div>
                    <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: '#00f5ff', letterSpacing: 3 }}>NEXUS · META POSITION</div>
                    <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: 'rgba(255,255,255,0.2)', letterSpacing: 2, marginTop: 2 }}>META STRATEGIST</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
                  {[
                    { label: 'SHELL TIER', value: nexus?.shell_tier || '—', color: nexus?.shell_tier === 'S' ? '#00ff88' : nexus?.shell_tier === 'A' ? '#00f5ff' : '#ff8800' },
                    { label: 'TREND', value: nexus?.shell_trend === 'RISING' ? '↑' : nexus?.shell_trend === 'FALLING' ? '↓' : '↔', color: nexus?.shell_trend === 'RISING' ? '#00ff88' : nexus?.shell_trend === 'FALLING' ? '#ff4444' : 'rgba(255,255,255,0.5)' },
                    { label: 'META SCORE', value: nexus?.meta_score || '—', color: '#00f5ff' },
                  ].map(item => (
                    <div key={item.label} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 4, padding: '10px', textAlign: 'center' }}>
                      <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 18, fontWeight: 900, color: item.color, lineHeight: 1 }}>{item.value}</div>
                      <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: 'rgba(255,255,255,0.25)', letterSpacing: 1, marginTop: 5 }}>{item.label}</div>
                    </div>
                  ))}
                </div>

                {nexus?.analysis_body && (
                  <div style={{ background: 'rgba(0,245,255,0.02)', borderLeft: '2px solid rgba(0,245,255,0.2)', padding: '14px 16px', borderRadius: '0 4px 4px 0', marginBottom: 12 }}>
                    <p style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.8, margin: 0 }}>{nexus.analysis_body}</p>
                  </div>
                )}

                {nexus?.watch_items?.length > 0 && (
                  <div>
                    <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: 'rgba(255,255,255,0.2)', letterSpacing: 2, marginBottom: 8 }}>WATCH LIST</div>
                    {nexus.watch_items.map((w, i) => (
                      <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 6 }}>
                        <span style={{ color: '#ff8800', flexShrink: 0, fontSize: 12 }}>▸</span>
                        <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>{w}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: 'rgba(255,255,255,0.15)', letterSpacing: 2, marginTop: 14 }}>
                  UPDATED VIA NEXUS CRON · {new Date(audit.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
              </div>

              {/* MIRANDA */}
              <div className="me-card" style={{ background: '#0a0a0a', border: '1px solid rgba(155,93,229,0.1)', borderTop: '2px solid rgba(155,93,229,0.35)', borderRadius: 5, padding: '22px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <span style={{ color: '#9b5de5', fontSize: 22 }}>◎</span>
                  <div>
                    <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: '#9b5de5', letterSpacing: 3 }}>MIRANDA · RUNNER PROFILE</div>
                    <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: 'rgba(255,255,255,0.2)', letterSpacing: 2, marginTop: 2 }}>FIELD GUIDE</div>
                  </div>
                </div>

                {miranda?.runner_archetype && (
                  <div style={{ background: 'rgba(155,93,229,0.05)', border: '1px solid rgba(155,93,229,0.15)', borderRadius: 5, padding: '12px 16px', marginBottom: 16, textAlign: 'center' }}>
                    <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 14, fontWeight: 700, color: '#9b5de5', letterSpacing: 3 }}>{miranda.runner_archetype}</div>
                    <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: 'rgba(155,93,229,0.5)', letterSpacing: 2, marginTop: 5 }}>YOUR RUNNER ARCHETYPE</div>
                  </div>
                )}

                {miranda?.archetype_description && (
                  <div style={{ background: 'rgba(155,93,229,0.02)', borderLeft: '2px solid rgba(155,93,229,0.2)', padding: '14px 16px', borderRadius: '0 4px 4px 0', marginBottom: 14 }}>
                    <p style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.8, margin: 0 }}>{miranda.archetype_description}</p>
                  </div>
                )}

                {miranda?.cross_editor_note && (
                  <div style={{ background: 'rgba(255,136,0,0.03)', border: '1px solid rgba(255,136,0,0.1)', borderRadius: 5, padding: '12px 14px' }}>
                    <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: '#ff8800', letterSpacing: 2, marginBottom: 6 }}>⬢ CROSS-EDITOR NOTE</div>
                    <p style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.8, margin: 0 }}>{miranda.cross_editor_note}</p>
                  </div>
                )}
              </div>
            </div>

            {/* DEXTER recommendations */}
            {recs.length > 0 && (
              <div className="me-card" style={{ background: '#0a0a0a', border: '1px solid rgba(255,136,0,0.1)', borderLeft: '3px solid rgba(255,136,0,0.4)', borderRadius: 5, padding: '22px', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                  <span style={{ color: '#ff8800', fontSize: 20 }}>⬢</span>
                  <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: '#ff8800', letterSpacing: 3 }}>DEXTER'S PRIORITY RECOMMENDATIONS</div>
                </div>
                {recs.map((rec, i) => (
                  <div key={i} className="me-rec" style={{ background: 'rgba(255,136,0,0.02)', border: '1px solid rgba(255,136,0,0.08)', borderRadius: 5, padding: '16px 18px', marginBottom: 8, display: 'flex', gap: 18, alignItems: 'flex-start' }}>
                    <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 18, fontWeight: 900, color: 'rgba(255,136,0,0.5)', flexShrink: 0, minWidth: 28 }}>
                      {String(rec.priority || i + 1).padStart(2, '0')}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
                        {rec.slot && <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, padding: '2px 8px' }}>{rec.slot}</span>}
                        {rec.action && <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: '#ff8800', background: 'rgba(255,136,0,0.08)', border: '1px solid rgba(255,136,0,0.2)', borderRadius: 3, padding: '2px 8px', letterSpacing: 1 }}>{rec.action}</span>}
                        {rec.recommended_item && <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: '#fff', letterSpacing: 1 }}>→ {rec.recommended_item}</span>}
                      </div>
                      {rec.reason && <p style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.8, margin: 0 }}>{rec.reason}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Ask an Editor */}
            <div className="me-card" style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.06)', borderLeft: '3px solid rgba(0,245,255,0.2)', borderRadius: 5, padding: '22px', marginBottom: 12 }}>
              <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 3, marginBottom: 16 }}>ASK AN EDITOR</div>

              <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                <select
                  value={askEditor}
                  onChange={e => setAskEditor(e.target.value)}
                  style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', color: EDITOR_COLORS[askEditor], fontFamily: 'Share Tech Mono, monospace', fontSize: 10, padding: '10px 14px', borderRadius: 4, minWidth: 130 }}
                >
                  {['DEXTER', 'NEXUS', 'CIPHER', 'MIRANDA', 'GHOST'].map(e => (
                    <option key={e} value={e}>{EDITOR_SYMS[e]} {e}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={question}
                  onChange={e => setQuestion(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAsk()}
                  placeholder="Ask anything about your build, loadout, or playstyle..."
                  style={{ flex: 1, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontFamily: 'Rajdhani, sans-serif', fontSize: 14, padding: '10px 16px', borderRadius: 4, outline: 'none' }}
                />
                <button
                  onClick={handleAsk}
                  disabled={!question.trim() || asking}
                  style={{ background: 'rgba(0,245,255,0.06)', border: '1px solid rgba(0,245,255,0.35)', color: '#00f5ff', fontFamily: 'Share Tech Mono, monospace', fontSize: 9, letterSpacing: 2, padding: '10px 20px', borderRadius: 4, cursor: !question.trim() || asking ? 'not-allowed' : 'pointer', opacity: !question.trim() || asking ? 0.4 : 1 }}
                >
                  {asking ? '...' : 'SEND'}
                </button>
              </div>

              {qaError && (
                <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,100,100,0.6)', letterSpacing: 2, marginBottom: 12 }}>⚠ EDITOR UNAVAILABLE — PLEASE TRY AGAIN</div>
              )}

              {qaResult && (
                <div style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${EDITOR_COLORS[qaResult.editor]}22`, borderLeft: `3px solid ${EDITOR_COLORS[qaResult.editor]}66`, borderRadius: 5, padding: '16px 18px' }}>
                  <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: EDITOR_COLORS[qaResult.editor], letterSpacing: 2, marginBottom: 6 }}>
                    {EDITOR_SYMS[qaResult.editor]} {qaResult.editor} REPLIED ↓
                  </div>
                  <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.2)', letterSpacing: 1, marginBottom: 10 }}>YOU ASKED: "{qaResult.question}"</div>
                  <p style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 1.8, margin: 0 }}>{qaResult.answer}</p>
                </div>
              )}
            </div>

            {/* Audit history */}
            {auditHistory.length > 1 && (
              <div className="me-card" style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.06)', borderLeft: '3px solid rgba(255,255,255,0.1)', borderRadius: 5, padding: '22px' }}>
                <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: 3, marginBottom: 16 }}>AUDIT HISTORY</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {auditHistory.map((a, i) => (
                    <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 16, background: i === 0 ? 'rgba(0,245,255,0.02)' : 'transparent', border: `1px solid ${i === 0 ? 'rgba(0,245,255,0.08)' : 'rgba(255,255,255,0.04)'}`, borderRadius: 4, padding: '10px 14px' }}>
                      <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.2)', letterSpacing: 1, width: 80 }}>
                        {new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 16, fontWeight: 900, color: gradeColor(a.letter_grade) }}>{a.letter_grade}</span>
                        <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{a.composite_score}</span>
                      </div>
                      {i === 0 && <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: '#00f5ff', background: 'rgba(0,245,255,0.06)', border: '1px solid rgba(0,245,255,0.15)', borderRadius: 3, padding: '2px 8px', letterSpacing: 1 }}>LATEST</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Bottom CTAs */}
        <div style={{ marginTop: 28, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link href="/advisor" style={{ padding: '10px 20px', background: 'rgba(255,136,0,0.08)', border: '1px solid rgba(255,136,0,0.28)', borderRadius: 5, textDecoration: 'none', fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: '#ff8800', letterSpacing: 2 }}>⬢ BUILD ADVISOR →</Link>
          <Link href="/meta" style={{ padding: '10px 20px', background: 'rgba(0,245,255,0.05)', border: '1px solid rgba(0,245,255,0.15)', borderRadius: 5, textDecoration: 'none', fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: '#00f5ff', letterSpacing: 2 }}>⬡ LIVE META →</Link>
          <Link href="/shells" style={{ padding: '10px 20px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 5, textDecoration: 'none', fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: 2 }}>SHELL GUIDES →</Link>
        </div>

      </div>
    </div>
  );
}
