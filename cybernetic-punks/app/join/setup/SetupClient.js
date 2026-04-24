'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

var SHELLS = [
  { name: 'Assassin',  sym: '◈', color: '#cc44ff' },
  { name: 'Destroyer', sym: '⬡', color: '#ff3333' },
  { name: 'Recon',     sym: '⬢', color: '#00d4ff' },
  { name: 'Rook',      sym: '◇', color: '#666666', banned: true },
  { name: 'Thief',     sym: '◎', color: '#ffd700' },
  { name: 'Triage',    sym: '◈', color: '#00ff88' },
  { name: 'Vandal',    sym: '⬡', color: '#ff8800' },
];

var PLAYSTYLES = [
  { key: 'AGGRESSIVE', color: '#ff2222', desc: 'Push immediately. Dictate the engagement before they can react.' },
  { key: 'CALCULATED', color: '#00d4ff', desc: 'Wait for information. Pick the right moment. Never commit without advantage.' },
  { key: 'EVASIVE',    color: '#00ff88', desc: 'Disengage, reposition, reset. The fight you avoid is the one you win.' },
  { key: 'ADAPTIVE',   color: '#9b5de5', desc: 'No fixed pattern. Every fight is a new problem to solve.' },
];

export default function SetupClient({ displayName }) {
  var router = useRouter();
  var [step, setStep]           = useState(1);
  var [shell, setShell]         = useState(null);
  var [playstyle, setPlaystyle] = useState(null);
  var [saving, setSaving]       = useState(false);
  var [error, setError]         = useState(null);

  async function handleComplete() {
    if (!shell || !playstyle || saving) return;
    setSaving(true);
    setError(null);
    try {
      var res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          favorite_shell:      shell,
          preferred_playstyle: playstyle,
          onboarding_complete: true,
        }),
      });
      if (res.ok) {
        router.push('/me');
      } else {
        setSaving(false);
        setError('Something went wrong. Please try again.');
      }
    } catch (e) {
      setSaving(false);
      setError('Network error. Please try again.');
    }
  }

  var selectedShell = SHELLS.find(function(s) { return s.name === shell; });

  return (
    <div style={{ minHeight: '100vh', background: '#121418', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px', fontFamily: 'system-ui, sans-serif' }}>

      {/* Header + progress */}
      <div style={{ width: '100%', maxWidth: 500, marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#ff2222', boxShadow: '0 0 7px rgba(255,34,34,0.5)' }} />
            <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 12, fontWeight: 700, letterSpacing: '2px', color: '#fff' }}>CYBERNETIC<span style={{ color: '#ff2222' }}>PUNKS</span></span>
          </div>
          <div style={{ flex: 1, height: 1, background: '#1e2028' }} />
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.18)', letterSpacing: 2, fontFamily: 'monospace' }}>{step} / 2</span>
        </div>
        <div style={{ height: 2, background: '#1e2028', borderRadius: 1, overflow: 'hidden' }}>
          <div style={{ width: step === 1 ? '50%' : '100%', height: '100%', background: '#00ff41', borderRadius: 1, transition: 'width 0.3s ease' }} />
        </div>
      </div>

      <div style={{ width: '100%', maxWidth: 500 }}>

        {/* ── STEP 1: Shell ─────────────────────────────────── */}
        {step === 1 && (
          <div>
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 3, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', marginBottom: 10 }}>
                Welcome, {displayName || 'Runner'}
              </div>
              <h1 style={{ fontSize: 30, fontWeight: 900, letterSpacing: '-0.5px', lineHeight: 1.05, margin: '0 0 8px', color: '#fff' }}>
                What's your main shell?
              </h1>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', margin: 0, lineHeight: 1.6 }}>
                Sets the default context for your profile and tool recommendations.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8, marginBottom: 24 }}>
              {SHELLS.map(function(sh) {
                var sel = shell === sh.name;
                return (
                  <div
                    key={sh.name}
                    onClick={function() { if (!sh.banned) setShell(sh.name); }}
                    style={{
                      background:    sel ? '#1e2228' : '#1a1d24',
                      border:        '1px solid ' + (sel ? sh.color + '80' : '#22252e'),
                      borderTop:     '2px solid ' + (sel ? sh.color : '#22252e'),
                      borderRadius:  '0 0 3px 3px',
                      padding:       '16px 10px',
                      textAlign:     'center',
                      cursor:        sh.banned ? 'not-allowed' : 'pointer',
                      opacity:       sh.banned ? 0.35 : 1,
                      transition:    'border-color 0.1s',
                    }}
                  >
                    <div style={{ fontSize: 24, color: sel ? sh.color : 'rgba(255,255,255,0.2)', marginBottom: 8, transition: 'color 0.1s' }}>{sh.sym}</div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: sel ? '#fff' : 'rgba(255,255,255,0.5)', letterSpacing: 1, textTransform: 'uppercase' }}>{sh.name}</div>
                    {sh.banned && (
                      <div style={{ fontSize: 7, color: 'rgba(255,34,34,0.5)', letterSpacing: 1, marginTop: 4, fontFamily: 'monospace' }}>BANNED</div>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              onClick={function() { if (shell) setStep(2); }}
              disabled={!shell}
              style={{
                width:         '100%',
                padding:       '12px',
                background:    shell ? '#00ff41' : '#1a1d24',
                color:         shell ? '#000' : 'rgba(255,255,255,0.2)',
                fontSize:      12,
                fontWeight:    800,
                letterSpacing: '1px',
                borderRadius:  2,
                border:        shell ? 'none' : '1px solid #22252e',
                cursor:        shell ? 'pointer' : 'not-allowed',
                transition:    'background 0.1s',
              }}
            >
              CONTINUE →
            </button>
          </div>
        )}

        {/* ── STEP 2: Playstyle ─────────────────────────────── */}
        {step === 2 && (
          <div>
            <div style={{ marginBottom: 28 }}>
              <button
                onClick={function() { setStep(1); }}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.25)', fontSize: 11, cursor: 'pointer', padding: '0 0 16px', letterSpacing: 1, fontFamily: 'monospace', display: 'block' }}
              >
                ← BACK
              </button>
              {/* Selected shell preview */}
              {selectedShell && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 12px', background: '#1a1d24', border: '1px solid ' + selectedShell.color + '40', borderRadius: 2, marginBottom: 16 }}>
                  <span style={{ fontSize: 14, color: selectedShell.color }}>{selectedShell.sym}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: selectedShell.color, letterSpacing: 2 }}>{selectedShell.name.toUpperCase()}</span>
                </div>
              )}
              <h1 style={{ fontSize: 30, fontWeight: 900, letterSpacing: '-0.5px', lineHeight: 1.05, margin: '0 0 8px', color: '#fff' }}>
                How do you play?
              </h1>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', margin: 0 }}>
                Your instinct in a firefight.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
              {PLAYSTYLES.map(function(p) {
                var sel = playstyle === p.key;
                return (
                  <div
                    key={p.key}
                    onClick={function() { setPlaystyle(p.key); }}
                    style={{
                      background:     sel ? '#1e2228' : '#1a1d24',
                      border:         '1px solid ' + (sel ? p.color + '60' : '#22252e'),
                      borderLeft:     '3px solid ' + (sel ? p.color : '#22252e'),
                      borderRadius:   3,
                      padding:        '14px 18px',
                      cursor:         'pointer',
                      display:        'flex',
                      alignItems:     'center',
                      justifyContent: 'space-between',
                      gap:            16,
                      transition:     'border-color 0.1s, background 0.1s',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: sel ? p.color : 'rgba(255,255,255,0.65)', letterSpacing: 2, marginBottom: 5, textTransform: 'uppercase' }}>{p.key}</div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.28)', lineHeight: 1.55 }}>{p.desc}</div>
                    </div>
                    {sel && <div style={{ width: 7, height: 7, borderRadius: '50%', background: p.color, flexShrink: 0 }} />}
                  </div>
                );
              })}
            </div>

            {error && (
              <div style={{ fontSize: 10, color: 'rgba(255,100,100,0.7)', letterSpacing: 1, fontFamily: 'monospace', marginBottom: 12 }}>⚠ {error}</div>
            )}

            <button
              onClick={handleComplete}
              disabled={!playstyle || saving}
              style={{
                width:         '100%',
                padding:       '12px',
                background:    playstyle && !saving ? '#00ff41' : '#1a1d24',
                color:         playstyle && !saving ? '#000' : 'rgba(255,255,255,0.2)',
                fontSize:      12,
                fontWeight:    800,
                letterSpacing: '1px',
                borderRadius:  2,
                border:        playstyle && !saving ? 'none' : '1px solid #22252e',
                cursor:        playstyle && !saving ? 'pointer' : 'not-allowed',
              }}
            >
              {saving ? 'SETTING UP YOUR PROFILE...' : 'CREATE MY PROFILE →'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
