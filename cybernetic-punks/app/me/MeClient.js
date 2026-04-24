'use client';
import { useState } from 'react';
import Link from 'next/link';

var SHELL_COLORS = {
  Assassin:  '#cc44ff',
  Destroyer: '#ff3333',
  Recon:     '#00d4ff',
  Rook:      '#666666',
  Thief:     '#ffd700',
  Triage:    '#00ff88',
  Vandal:    '#ff8800',
};

var SHELL_SYMBOLS = {
  Assassin:  '◈',
  Destroyer: '⬡',
  Recon:     '⬢',
  Rook:      '◇',
  Thief:     '◎',
  Triage:    '◈',
  Vandal:    '⬡',
};

var SHELL_ROLES = {
  Assassin:  'Aggressive · High Mobility',
  Destroyer: 'Tank · Sustained Pressure',
  Recon:     'Intel · Ability Control',
  Rook:      'Support · Defense',
  Thief:     'Extraction · Loot Speed',
  Triage:    'Support · Crew Healing',
  Vandal:    'Mobility · Disruption',
};

var PLAYSTYLE_COLORS = {
  AGGRESSIVE: '#ff2222',
  CALCULATED: '#00d4ff',
  EVASIVE:    '#00ff88',
  ADAPTIVE:   '#9b5de5',
};

var PLAYSTYLE_DESCS = {
  AGGRESSIVE: 'Push immediately. Dictate the engagement.',
  CALCULATED: 'Wait for information. Pick the right moment.',
  EVASIVE:    'Disengage, reposition, reset.',
  ADAPTIVE:   'No fixed pattern. Every fight is a new problem.',
};

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
  { key: 'AGGRESSIVE', color: '#ff2222',  desc: 'Push immediately. Dictate the engagement before they can react.' },
  { key: 'CALCULATED', color: '#00d4ff',  desc: 'Wait for information. Pick the right moment. Never commit without advantage.' },
  { key: 'EVASIVE',    color: '#00ff88',  desc: 'Disengage, reposition, reset. The fight you avoid is the one you win.' },
  { key: 'ADAPTIVE',   color: '#9b5de5',  desc: 'No fixed pattern. Every fight is a new problem to solve.' },
];

var TOOLS = [
  { href: '/meta',     icon: '⬡', color: '#00ff41', label: 'Meta Tier List',  desc: 'Live weapon & shell rankings',    tag: 'LIVE' },
  { href: '/advisor',  icon: '⬢', color: '#ff8800', label: 'Build Advisor',   desc: 'AI-engineered loadouts',          tag: 'FREE' },
  { href: '/builds',   icon: '⬢', color: '#ff8800', label: 'Build Lab',       desc: 'Full loadout browser',            tag: null },
  { href: '/shells',   icon: '◎', color: '#00d4ff', label: 'Shell Guide',     desc: 'Abilities, stats, tiers',         tag: null },
  { href: '/ranked',   icon: '◈', color: '#ffd700', label: 'Ranked Guide',    desc: 'Holotags, tiers, how to climb',   tag: null },
  { href: '/factions', icon: '◇', color: '#9b5de5', label: 'Factions',        desc: 'Unlocks & investment guide',      tag: null },
];

function platformLabel(p) {
  return { ps5: 'PlayStation', xbox: 'Xbox', pc: 'Steam', steam: 'Steam', bungie: 'PC' }[p] || 'PC';
}

function platformIcon(p) {
  return { ps5: '🎮', xbox: '🎮', pc: '🖥', steam: '🖥', bungie: '🖥' }[p] || '🖥';
}

function memberSince(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export default function MeClient({ player }) {
  var [showSetup, setShowSetup]     = useState(!player.favorite_shell || !player.preferred_playstyle);
  var [setupStep, setSetupStep]     = useState(1);
  var [editShell, setEditShell]     = useState(player.favorite_shell     || null);
  var [editStyle, setEditStyle]     = useState(player.preferred_playstyle || null);
  var [saving, setSaving]           = useState(false);
  var [saveError, setSaveError]     = useState(null);

  var shell         = player.favorite_shell;
  var playstyle     = player.preferred_playstyle;
  var shellColor    = SHELL_COLORS[shell]    || '#00ff41';
  var shellSymbol   = SHELL_SYMBOLS[shell]   || '◎';
  var shellRole     = SHELL_ROLES[shell]     || '';
  var playstyleColor = PLAYSTYLE_COLORS[playstyle] || 'rgba(255,255,255,0.3)';
  var playstyleDesc  = PLAYSTYLE_DESCS[playstyle]  || '';
  var shellImg      = shell ? '/images/shells/' + shell.toLowerCase() + '.webp' : null;
  var displayName   = (player.bungie_display_name || '').replace(/#\d+/, '').trim();
  var initials      = displayName.slice(0, 2).toUpperCase();

  async function savePreferences() {
    if (!editShell || !editStyle || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      var res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          favorite_shell:      editShell,
          preferred_playstyle: editStyle,
          onboarding_complete: true,
        }),
      });
      if (res.ok) {
        window.location.reload();
      } else {
        setSaving(false);
        setSaveError('Failed to save. Please try again.');
      }
    } catch (e) {
      setSaving(false);
      setSaveError('Network error. Please try again.');
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#121418', color: '#fff', paddingTop: 48, fontFamily: 'system-ui, sans-serif' }}>

      <style>{`
        .tool-card { transition: background 0.12s, border-color 0.12s, transform 0.12s; }
        .tool-card:hover { background: #1e2228 !important; border-color: rgba(255,255,255,0.15) !important; }
        .me-row { transition: background 0.1s; }
        .me-row:hover { background: rgba(255,255,255,0.025) !important; }
        .setup-shell { transition: border-color 0.1s, background 0.1s; }
        .setup-shell:hover { border-color: rgba(255,255,255,0.2) !important; }
        .setup-style { transition: border-color 0.1s, background 0.1s; }
        .setup-style:hover { background: rgba(255,255,255,0.02) !important; }
      `}</style>

      {/* ══ HERO HEADER ════════════════════════════════════════ */}
      <div style={{ position: 'relative', overflow: 'hidden', background: '#0e1014', borderBottom: '1px solid #1e2028', minHeight: 200 }}>

        {/* Shell artwork as background wash */}
        {shellImg && (
          <>
            <div style={{
              position: 'absolute', right: 0, top: 0, bottom: 0,
              width: '45%',
              backgroundImage: 'url(' + shellImg + ')',
              backgroundSize: 'cover',
              backgroundPosition: 'center top',
              opacity: 0.12,
            }} />
            <div style={{
              position: 'absolute', right: 0, top: 0, bottom: 0,
              width: '50%',
              background: 'linear-gradient(to right, #0e1014 0%, transparent 100%)',
            }} />
          </>
        )}

        {/* Geometric accent — shell color */}
        {shell && (
          <>
            <div style={{
              position: 'absolute', top: -40, right: '30%',
              width: 200, height: 200,
              border: '1px solid ' + shellColor + '12',
              transform: 'rotate(45deg)',
              pointerEvents: 'none',
            }} />
            <div style={{
              position: 'absolute', top: 0, right: '28%',
              width: 320, height: 320,
              border: '1px solid ' + shellColor + '06',
              transform: 'rotate(45deg)',
              pointerEvents: 'none',
            }} />
            {/* Vertical color accent */}
            <div style={{
              position: 'absolute', top: 0, left: 0, bottom: 0,
              width: 3,
              background: 'linear-gradient(180deg, ' + shellColor + ' 0%, transparent 100%)',
            }} />
          </>
        )}

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 1000, margin: '0 auto', padding: '36px 32px', display: 'flex', alignItems: 'center', gap: 28, flexWrap: 'wrap' }}>

          {/* Avatar */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{
              width: 84, height: 84, borderRadius: '50%',
              border: '2px solid ' + (shell ? shellColor + '70' : 'rgba(255,255,255,0.15)'),
              overflow: 'hidden',
              background: '#1a1d24',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {player.bungie_avatar_url
                ? <img src={player.bungie_avatar_url} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 26, fontWeight: 700, color: shellColor || '#00ff41' }}>{initials}</span>
              }
            </div>
            {/* Shell symbol badge */}
            <div style={{
              position: 'absolute', bottom: 0, right: -2,
              width: 22, height: 22, borderRadius: '50%',
              background: '#0e1014',
              border: '1px solid ' + (shell ? shellColor + '60' : '#22252e'),
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: 10, color: shell ? shellColor : 'rgba(255,255,255,0.2)' }}>{shellSymbol}</span>
            </div>
          </div>

          {/* Name + meta */}
          <div style={{ flex: 1, minWidth: 220 }}>
            <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: '-1px', margin: '0 0 8px', color: '#fff', lineHeight: 1 }}>
              {displayName}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: 1 }}>
                {platformLabel(player.platform)}
              </span>
              <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'inline-block' }} />
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', letterSpacing: 1 }}>
                Since {memberSince(player.created_at)}
              </span>
            </div>

            {/* Shell + playstyle inline */}
            {shell && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px', background: shellColor + '12', border: '1px solid ' + shellColor + '30', borderRadius: 2 }}>
                  <span style={{ fontSize: 12, color: shellColor }}>{shellSymbol}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: shellColor, textTransform: 'uppercase' }}>{shell}</span>
                </div>
                {shellRole && (
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', letterSpacing: 1 }}>{shellRole}</span>
                )}
                {playstyle && (
                  <div style={{ padding: '4px 10px', background: playstyleColor + '10', border: '1px solid ' + playstyleColor + '25', borderRadius: 2 }}>
                    <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: playstyleColor, textTransform: 'uppercase' }}>{playstyle}</span>
                  </div>
                )}
              </div>
            )}

            {!shell && (
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', letterSpacing: 1 }}>
                No shell selected —{' '}
                <button onClick={function() { setShowSetup(true); }} style={{ background: 'none', border: 'none', color: '#00ff41', fontSize: 12, cursor: 'pointer', padding: 0, fontFamily: 'inherit', letterSpacing: 1 }}>
                  set up your profile →
                </button>
              </div>
            )}
          </div>

          {/* Badges */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0, alignItems: 'flex-end' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: 'rgba(0,255,65,0.08)', border: '1px solid rgba(0,255,65,0.25)', borderRadius: 2 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#00ff41', boxShadow: '0 0 6px rgba(0,255,65,0.5)' }} />
              <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: 3, color: '#00ff41', textTransform: 'uppercase' }}>Early Adopter</span>
            </div>
            <button
              onClick={function() { setShowSetup(true); setSetupStep(1); setEditShell(player.favorite_shell || null); setEditStyle(player.preferred_playstyle || null); }}
              style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', background: 'none', border: '1px solid #22252e', borderRadius: 2, padding: '5px 12px', cursor: 'pointer', letterSpacing: 2, fontFamily: 'inherit', textTransform: 'uppercase' }}
            >
              Edit Profile
            </button>
          </div>
        </div>
      </div>

      {/* ══ SETUP MODAL ════════════════════════════════════════ */}
      {showSetup && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 500, padding: 24,
        }}>
          <div style={{
            background: '#1a1d24', border: '1px solid #22252e',
            borderTop: '2px solid #00ff41',
            borderRadius: '0 0 3px 3px',
            width: '100%', maxWidth: 520,
            maxHeight: '90vh', overflowY: 'auto',
            padding: '28px',
          }}>
            {/* Progress */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, textTransform: 'uppercase' }}>
                {setupStep === 1 ? 'Your Shell' : 'Your Playstyle'}
              </span>
              <div style={{ flex: 1, height: 2, background: '#22252e', borderRadius: 1, overflow: 'hidden' }}>
                <div style={{ width: setupStep === 1 ? '50%' : '100%', height: '100%', background: '#00ff41', transition: 'width 0.3s' }} />
              </div>
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: 1 }}>{setupStep} / 2</span>
            </div>

            {/* Step 1: Shell */}
            {setupStep === 1 && (
              <>
                <h2 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.5px', margin: '0 0 6px', color: '#fff' }}>What's your main shell?</h2>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', margin: '0 0 20px', lineHeight: 1.6 }}>Sets the context for your profile and tool recommendations.</p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 8, marginBottom: 24 }}>
                  {SHELLS.map(function(sh) {
                    var sel = editShell === sh.name;
                    return (
                      <div
                        key={sh.name}
                        className="setup-shell"
                        onClick={function() { if (!sh.banned) setEditShell(sh.name); }}
                        style={{
                          background:   sel ? sh.color + '12' : '#121418',
                          border:       '1px solid ' + (sel ? sh.color + '60' : '#22252e'),
                          borderTop:    '2px solid ' + (sel ? sh.color : '#22252e'),
                          borderRadius: '0 0 3px 3px',
                          padding:      '14px 8px',
                          textAlign:    'center',
                          cursor:       sh.banned ? 'not-allowed' : 'pointer',
                          opacity:      sh.banned ? 0.3 : 1,
                        }}
                      >
                        {/* Shell art thumbnail */}
                        <div style={{ width: 40, height: 40, margin: '0 auto 8px', borderRadius: 3, overflow: 'hidden', background: '#1a1d24', border: '1px solid ' + (sel ? sh.color + '30' : '#22252e'), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <img
                            src={'/images/shells/' + sh.name.toLowerCase() + '.webp'}
                            alt={sh.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: sel ? 1 : 0.5 }}
                            onError={function(e) { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                          />
                          <span style={{ display: 'none', fontSize: 18, color: sh.color, width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>{sh.sym}</span>
                        </div>
                        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, color: sel ? '#fff' : 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>{sh.name}</div>
                        {sh.banned && <div style={{ fontSize: 7, color: 'rgba(255,34,34,0.4)', marginTop: 3, letterSpacing: 1 }}>BANNED</div>}
                      </div>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={function() { setShowSetup(false); }}
                    style={{ padding: '10px 16px', background: 'transparent', border: '1px solid #22252e', borderRadius: 2, color: 'rgba(255,255,255,0.25)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={function() { if (editShell) setSetupStep(2); }}
                    disabled={!editShell}
                    style={{ flex: 1, padding: '11px', background: editShell ? '#00ff41' : '#1a1d24', color: editShell ? '#000' : 'rgba(255,255,255,0.2)', fontSize: 12, fontWeight: 800, letterSpacing: 1, borderRadius: 2, border: editShell ? 'none' : '1px solid #22252e', cursor: editShell ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}
                  >
                    CONTINUE →
                  </button>
                </div>
              </>
            )}

            {/* Step 2: Playstyle */}
            {setupStep === 2 && (
              <>
                {/* Selected shell preview */}
                {editShell && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 12px', background: (SHELL_COLORS[editShell] || '#00ff41') + '12', border: '1px solid ' + (SHELL_COLORS[editShell] || '#00ff41') + '30', borderRadius: 2, marginBottom: 16 }}>
                    <span style={{ fontSize: 12, color: SHELL_COLORS[editShell] || '#00ff41' }}>{SHELL_SYMBOLS[editShell] || '◎'}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: SHELL_COLORS[editShell] || '#00ff41', textTransform: 'uppercase' }}>{editShell}</span>
                  </div>
                )}

                <h2 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.5px', margin: '0 0 6px', color: '#fff' }}>How do you play?</h2>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', margin: '0 0 20px' }}>Your instinct in a firefight.</p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
                  {PLAYSTYLES.map(function(p) {
                    var sel = editStyle === p.key;
                    return (
                      <div
                        key={p.key}
                        className="setup-style"
                        onClick={function() { setEditStyle(p.key); }}
                        style={{
                          background:  sel ? p.color + '10' : '#121418',
                          border:      '1px solid ' + (sel ? p.color + '50' : '#22252e'),
                          borderLeft:  '3px solid ' + (sel ? p.color : '#22252e'),
                          borderRadius: 3,
                          padding:     '13px 16px',
                          cursor:      'pointer',
                          display:     'flex',
                          alignItems:  'center',
                          justifyContent: 'space-between',
                          gap:         12,
                        }}
                      >
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: sel ? p.color : 'rgba(255,255,255,0.6)', textTransform: 'uppercase', marginBottom: 4 }}>{p.key}</div>
                          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', lineHeight: 1.5 }}>{p.desc}</div>
                        </div>
                        {sel && <div style={{ width: 7, height: 7, borderRadius: '50%', background: p.color, flexShrink: 0, boxShadow: '0 0 6px ' + p.color + '80' }} />}
                      </div>
                    );
                  })}
                </div>

                {saveError && (
                  <div style={{ fontSize: 10, color: 'rgba(255,100,100,0.7)', letterSpacing: 1, marginBottom: 12, fontFamily: 'monospace' }}>⚠ {saveError}</div>
                )}

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={function() { setSetupStep(1); }}
                    style={{ padding: '10px 16px', background: 'transparent', border: '1px solid #22252e', borderRadius: 2, color: 'rgba(255,255,255,0.25)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    ← Back
                  </button>
                  <button
                    onClick={savePreferences}
                    disabled={!editStyle || saving}
                    style={{ flex: 1, padding: '11px', background: editStyle && !saving ? '#00ff41' : '#1a1d24', color: editStyle && !saving ? '#000' : 'rgba(255,255,255,0.2)', fontSize: 12, fontWeight: 800, letterSpacing: 1, borderRadius: 2, border: editStyle && !saving ? 'none' : '1px solid #22252e', cursor: editStyle && !saving ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}
                  >
                    {saving ? 'SAVING...' : 'SAVE PROFILE →'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ══ MAIN CONTENT ════════════════════════════════════ */}
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 24px 48px' }}>

        {/* ── RUNNER STATS + TOOLS ─────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 1, background: '#1e2028', marginBottom: 1 }}>

          {/* Runner card */}
          <div style={{ background: '#121418', padding: '22px 20px' }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 3, color: 'rgba(255,255,255,0.18)', textTransform: 'uppercase', marginBottom: 18 }}>Runner</div>

            {/* Shell artwork — large */}
            {shellImg && (
              <div style={{ width: '100%', aspectRatio: '1', background: '#0e1014', border: '1px solid ' + shellColor + '20', borderRadius: 3, overflow: 'hidden', marginBottom: 16, position: 'relative' }}>
                <img
                  src={shellImg}
                  alt={shell}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }}
                  onError={function(e) { e.target.parentElement.style.display = 'none'; }}
                />
                {/* Shell color overlay */}
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 50%, ' + shellColor + '18 100%)' }} />
                {/* Shell name overlay */}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 14, color: shellColor }}>{shellSymbol}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: shellColor, textTransform: 'uppercase' }}>{shell}</span>
                </div>
              </div>
            )}

            {/* Stats list */}
            {[
              { label: 'Shell',     value: shell     || '—', color: shellColor,      extra: shellRole },
              { label: 'Playstyle', value: playstyle || '—', color: playstyleColor,  extra: playstyleDesc },
              { label: 'Platform',  value: platformLabel(player.platform), color: 'rgba(255,255,255,0.45)' },
              { label: 'Member',    value: memberSince(player.created_at), color: 'rgba(255,255,255,0.35)' },
            ].map(function(item) {
              return (
                <div key={item.label} className="me-row" style={{ padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: 2, color: 'rgba(255,255,255,0.15)', textTransform: 'uppercase', marginBottom: 4 }}>{item.label}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: item.color }}>{item.value}</div>
                  {item.extra && item.value !== '—' && (
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.18)', marginTop: 2, lineHeight: 1.4 }}>{item.extra}</div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Tools grid */}
          <div style={{ background: '#121418', padding: '22px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 3, color: 'rgba(255,255,255,0.18)', textTransform: 'uppercase' }}>Tools</span>
              <div style={{ flex: 1, height: 1, background: '#1e2028' }} />
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.1)', letterSpacing: 1 }}>6 AVAILABLE</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {TOOLS.map(function(tool) {
                return (
                  <Link
                    key={tool.href}
                    href={tool.href}
                    className="tool-card"
                    style={{
                      background:    '#1a1d24',
                      border:        '1px solid #22252e',
                      borderTop:     '2px solid ' + tool.color + '70',
                      borderRadius:  '0 0 3px 3px',
                      padding:       '14px 14px 12px',
                      textDecoration:'none',
                      display:       'block',
                      position:      'relative',
                    }}
                  >
                    {tool.tag && (
                      <div style={{ position: 'absolute', top: 10, right: 10, padding: '1px 6px', background: tool.color + '15', border: '1px solid ' + tool.color + '30', borderRadius: 2, fontSize: 7, fontWeight: 700, letterSpacing: 1, color: tool.color, textTransform: 'uppercase' }}>{tool.tag}</div>
                    )}
                    <div style={{ fontSize: 20, color: tool.color, marginBottom: 8, opacity: 0.75 }}>{tool.icon}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.8)', marginBottom: 3 }}>{tool.label}</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.22)', lineHeight: 1.5 }}>{tool.desc}</div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── LATEST INTEL ─────────────────────────────────── */}
        <div style={{ background: '#121418', border: '1px solid #22252e', borderRadius: 3, padding: '14px 20px', marginBottom: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 3, color: 'rgba(255,255,255,0.18)', textTransform: 'uppercase' }}>Latest Intel</span>
          <Link href="/intel" style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', textDecoration: 'none', letterSpacing: 1, fontWeight: 700 }}>VIEW ALL →</Link>
        </div>

        {/* ── PERSONAL COACH — PREMIUM LOCKED ─────────────── */}
        <div style={{ position: 'relative', overflow: 'hidden', background: '#0e1014', border: '1px solid #22252e', borderRadius: 3 }}>

          {/* Premium diagonal stripe texture */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(255,255,255,0.008) 8px, rgba(255,255,255,0.008) 9px)',
            pointerEvents: 'none',
          }} />

          {/* Purple glow top border */}
          <div style={{ height: 2, background: 'linear-gradient(90deg, transparent, rgba(155,93,229,0.5) 30%, rgba(155,93,229,0.5) 70%, transparent)', marginBottom: 0 }} />

          {/* Faint corner geometric */}
          <div style={{ position: 'absolute', top: -30, right: -30, width: 160, height: 160, border: '1px solid rgba(155,93,229,0.06)', transform: 'rotate(45deg)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: -15, right: -15, width: 100, height: 100, border: '1px solid rgba(155,93,229,0.04)', transform: 'rotate(45deg)', pointerEvents: 'none' }} />

          <div style={{ position: 'relative', zIndex: 1, padding: '28px 28px', display: 'grid', gridTemplateColumns: '1fr auto', gap: 24, alignItems: 'center' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: 3, background: 'rgba(155,93,229,0.08)', border: '1px solid rgba(155,93,229,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: 'rgba(155,93,229,0.4)' }}>◎</div>
                <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: 2, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' }}>Personal Coach</span>
                <span style={{ padding: '2px 8px', background: 'rgba(155,93,229,0.08)', border: '1px solid rgba(155,93,229,0.2)', borderRadius: 2, fontSize: 8, fontWeight: 700, letterSpacing: 2, color: 'rgba(155,93,229,0.5)', textTransform: 'uppercase' }}>Coming Soon</span>
              </div>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.22)', lineHeight: 1.7, margin: '0 0 16px', maxWidth: 500 }}>
                Three AI editors will analyze your build, assess your meta position, and deliver a fully personalized coaching report with actionable recommendations and stat-level analysis.
              </p>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                {['DEXTER · Build Analysis', 'NEXUS · Meta Position', 'MIRANDA · Runner Profile'].map(function(item) {
                  var parts = item.split(' · ');
                  var edColors = { DEXTER: '#ff8800', NEXUS: '#00d4ff', MIRANDA: '#9b5de5' };
                  var c = edColors[parts[0]] || '#888';
                  return (
                    <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <div style={{ width: 5, height: 5, borderRadius: 1, background: c, opacity: 0.5 }} />
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', letterSpacing: 1 }}>{parts[0]}</span>
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.12)' }}>·</span>
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.15)' }}>{parts[1]}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Status card */}
            <div style={{ background: '#121418', border: '1px solid #22252e', borderRadius: 3, padding: '20px 22px', textAlign: 'center', minWidth: 160, flexShrink: 0 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(0,255,65,0.08)', border: '1px solid rgba(0,255,65,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00ff41', boxShadow: '0 0 8px rgba(0,255,65,0.6)' }} />
              </div>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2, color: '#00ff41', marginBottom: 4, textTransform: 'uppercase' }}>Early Adopter</div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', lineHeight: 1.6, letterSpacing: 1 }}>Priority access<br />confirmed</div>
              <div style={{ marginTop: 14, padding: '6px 0', borderTop: '1px solid #1e2028', fontSize: 8, color: 'rgba(255,255,255,0.12)', letterSpacing: 2, textTransform: 'uppercase' }}>
                In Queue
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}