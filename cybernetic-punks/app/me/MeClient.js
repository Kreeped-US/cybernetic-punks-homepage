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

var PLAYSTYLE_COLORS = {
  AGGRESSIVE: '#ff2222',
  CALCULATED: '#00d4ff',
  EVASIVE:    '#00ff88',
  ADAPTIVE:   '#9b5de5',
};

function platformLabel(p) {
  return { ps5: 'PS5', xbox: 'XBOX', pc: 'PC · STEAM', steam: 'STEAM', bungie: 'PC' }[p] || 'PC';
}

function memberSince(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

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
  { key: 'AGGRESSIVE', color: '#ff2222' },
  { key: 'CALCULATED', color: '#00d4ff' },
  { key: 'EVASIVE',    color: '#00ff88' },
  { key: 'ADAPTIVE',   color: '#9b5de5' },
];

export default function MeClient({ player }) {
  var [editing, setEditing]         = useState(false);
  var [editShell, setEditShell]     = useState(player.favorite_shell || null);
  var [editStyle, setEditStyle]     = useState(player.preferred_playstyle || null);
  var [saving, setSaving]           = useState(false);
  var [saveError, setSaveError]     = useState(null);

  var displayName   = (player.bungie_display_name || '').replace(/#\d+/, '').trim();
  var shellColor    = SHELL_COLORS[player.favorite_shell]   || '#00ff41';
  var shellSymbol   = SHELL_SYMBOLS[player.favorite_shell]  || '◎';
  var playstyleColor = PLAYSTYLE_COLORS[player.preferred_playstyle] || 'rgba(255,255,255,0.4)';

  var initials = displayName.slice(0, 2).toUpperCase();

  async function savePreferences() {
    if (!editShell || !editStyle || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      var res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ favorite_shell: editShell, preferred_playstyle: editStyle }),
      });
      if (res.ok) {
        // Reload to show updated data
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
        .me-tool:hover { border-color: rgba(0,255,65,0.25) !important; background: #1e2228 !important; }
        .me-row:hover  { background: rgba(255,255,255,0.02) !important; }
      `}</style>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>

        {/* ── PROFILE HEADER ──────────────────────────────── */}
        <div style={{ background: '#1a1d24', border: '1px solid #22252e', borderTop: '2px solid ' + shellColor, borderRadius: '0 0 3px 3px', padding: '28px 28px 24px', marginBottom: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>

            {/* Avatar */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              {player.bungie_avatar_url ? (
                <img
                  src={player.bungie_avatar_url}
                  alt={displayName}
                  style={{ width: 68, height: 68, borderRadius: '50%', border: '2px solid ' + shellColor + '60', display: 'block' }}
                />
              ) : (
                <div style={{ width: 68, height: 68, borderRadius: '50%', background: '#1e2228', border: '2px solid ' + shellColor + '60', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Orbitron, monospace', fontSize: 22, fontWeight: 700, color: shellColor }}>
                  {initials}
                </div>
              )}
              {/* Shell accent dot */}
              <div style={{ position: 'absolute', bottom: 2, right: 2, width: 14, height: 14, borderRadius: '50%', background: '#121418', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid ' + shellColor + '40' }}>
                <span style={{ fontSize: 8, color: shellColor }}>{shellSymbol}</span>
              </div>
            </div>

            {/* Name + meta */}
            <div style={{ flex: 1, minWidth: 200 }}>
              <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.5px', margin: '0 0 6px', color: '#fff' }}>{displayName}</h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: 'rgba(255,255,255,0.35)', background: '#1e2028', border: '1px solid #22252e', borderRadius: 2, padding: '2px 8px' }}>
                  {platformLabel(player.platform)}
                </span>
                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: 1 }}>
                  SINCE {memberSince(player.created_at)}
                </span>
              </div>
            </div>

            {/* Badges */}
            <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
              <div style={{ padding: '5px 12px', background: 'rgba(0,255,65,0.08)', border: '1px solid rgba(0,255,65,0.25)', borderRadius: 2, display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#00ff41' }} />
                <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: 2, color: '#00ff41', textTransform: 'uppercase' }}>Early Adopter</span>
              </div>
              {player.favorite_shell && (
                <div style={{ padding: '5px 12px', background: shellColor + '10', border: '1px solid ' + shellColor + '30', borderRadius: 2, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ fontSize: 12, color: shellColor }}>{shellSymbol}</span>
                  <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, color: shellColor, textTransform: 'uppercase' }}>{player.favorite_shell}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── MAIN GRID ────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 1, background: '#1e2028', marginBottom: 1 }}>

          {/* Runner Card */}
          <div style={{ background: '#121418', padding: '20px' }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 3, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', marginBottom: 16 }}>Runner</div>

            {!editing ? (
              <>
                {[
                  { label: 'Shell',      value: player.favorite_shell      || '—', color: shellColor,      sym: player.favorite_shell ? shellSymbol : null },
                  { label: 'Playstyle',  value: player.preferred_playstyle || '—', color: playstyleColor },
                  { label: 'Platform',   value: platformLabel(player.platform),    color: 'rgba(255,255,255,0.5)' },
                  { label: 'Member',     value: memberSince(player.created_at),    color: 'rgba(255,255,255,0.4)' },
                ].map(function(item) {
                  return (
                    <div key={item.label} className="me-row" style={{ padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', marginBottom: 2 }}>
                      <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: 2, color: 'rgba(255,255,255,0.18)', textTransform: 'uppercase', marginBottom: 4 }}>{item.label}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        {item.sym && <span style={{ fontSize: 11, color: item.color }}>{item.sym}</span>}
                        <span style={{ fontSize: 12, fontWeight: 600, color: item.color }}>{item.value}</span>
                      </div>
                    </div>
                  );
                })}

                <button
                  onClick={function() { setEditing(true); }}
                  style={{ display: 'block', width: '100%', textAlign: 'center', marginTop: 16, padding: '8px', background: 'transparent', border: '1px solid #22252e', borderRadius: 2, fontSize: 9, fontWeight: 700, letterSpacing: 2, color: 'rgba(255,255,255,0.25)', cursor: 'pointer', textTransform: 'uppercase', fontFamily: 'inherit' }}
                >
                  EDIT PREFERENCES
                </button>
              </>
            ) : (
              /* Inline edit */
              <div>
                <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: 2, color: 'rgba(255,255,255,0.18)', textTransform: 'uppercase', marginBottom: 10 }}>Shell</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 16 }}>
                  {SHELLS.filter(function(s) { return !s.banned; }).map(function(sh) {
                    var sel = editShell === sh.name;
                    return (
                      <button key={sh.name} onClick={function() { setEditShell(sh.name); }}
                        style={{ padding: '4px 8px', background: sel ? sh.color + '18' : 'transparent', border: '1px solid ' + (sel ? sh.color + '60' : '#22252e'), borderRadius: 2, fontSize: 10, color: sel ? sh.color : 'rgba(255,255,255,0.35)', cursor: 'pointer', fontFamily: 'inherit', fontWeight: sel ? 700 : 400 }}>
                        {sh.name}
                      </button>
                    );
                  })}
                </div>

                <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: 2, color: 'rgba(255,255,255,0.18)', textTransform: 'uppercase', marginBottom: 10 }}>Playstyle</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 16 }}>
                  {PLAYSTYLES.map(function(p) {
                    var sel = editStyle === p.key;
                    return (
                      <button key={p.key} onClick={function() { setEditStyle(p.key); }}
                        style={{ padding: '6px 10px', background: sel ? p.color + '12' : 'transparent', border: '1px solid ' + (sel ? p.color + '40' : '#22252e'), borderRadius: 2, fontSize: 10, color: sel ? p.color : 'rgba(255,255,255,0.35)', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', fontWeight: sel ? 700 : 400, letterSpacing: sel ? 1 : 0 }}>
                        {p.key}
                      </button>
                    );
                  })}
                </div>

                {saveError && <div style={{ fontSize: 9, color: 'rgba(255,100,100,0.7)', marginBottom: 8, letterSpacing: 1 }}>{saveError}</div>}

                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={savePreferences} disabled={!editShell || !editStyle || saving}
                    style={{ flex: 1, padding: '8px', background: editShell && editStyle ? '#00ff41' : '#1a1d24', color: editShell && editStyle ? '#000' : 'rgba(255,255,255,0.2)', fontSize: 9, fontWeight: 800, letterSpacing: 1, borderRadius: 2, border: 'none', cursor: editShell && editStyle ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>
                    {saving ? '...' : 'SAVE'}
                  </button>
                  <button onClick={function() { setEditing(false); setEditShell(player.favorite_shell); setEditStyle(player.preferred_playstyle); }}
                    style={{ padding: '8px 12px', background: 'transparent', border: '1px solid #22252e', borderRadius: 2, color: 'rgba(255,255,255,0.25)', fontSize: 9, cursor: 'pointer', fontFamily: 'inherit' }}>
                    ✕
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Tools */}
          <div style={{ background: '#121418', padding: '20px' }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 3, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', marginBottom: 16 }}>Tools</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8 }}>
              {[
                { href: '/meta',     icon: '⬡', color: '#00ff41', label: 'Meta Tier List',   desc: 'Live weapon & shell rankings' },
                { href: '/advisor',  icon: '⬢', color: '#ff8800', label: 'Build Advisor',    desc: 'AI-engineered loadouts' },
                { href: '/builds',   icon: '⬢', color: '#ff8800', label: 'Build Lab',        desc: 'Full loadout browser' },
                { href: '/shells',   icon: '◎', color: '#00d4ff', label: 'Shell Guide',      desc: 'Abilities, stats, tiers' },
                { href: '/ranked',   icon: '◈', color: '#ffd700', label: 'Ranked Guide',     desc: 'Holotags, tiers, how to climb' },
                { href: '/factions', icon: '◇', color: '#9b5de5', label: 'Factions',         desc: 'Unlocks & investment guide' },
              ].map(function(tool) {
                return (
                  <Link key={tool.href} href={tool.href} className="me-tool"
                    style={{ background: '#1a1d24', border: '1px solid #22252e', borderTop: '2px solid ' + tool.color + '60', borderRadius: '0 0 3px 3px', padding: '14px 12px', textDecoration: 'none', display: 'block', transition: 'background 0.1s, border-color 0.1s' }}>
                    <div style={{ fontSize: 18, color: tool.color, marginBottom: 7, opacity: 0.8 }}>{tool.icon}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.8)', marginBottom: 3 }}>{tool.label}</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', lineHeight: 1.5 }}>{tool.desc}</div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── INTEL ─────────────────────────────────────────── */}
        <div style={{ background: '#121418', border: '1px solid #22252e', borderRadius: 3, padding: '16px 20px', marginBottom: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 3, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase' }}>Latest Intel</div>
            <Link href="/intel" style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', textDecoration: 'none', letterSpacing: 1, fontWeight: 700 }}>VIEW ALL →</Link>
          </div>
        </div>

        {/* ── PERSONAL COACH — LOCKED ───────────────────────── */}
        <div style={{ background: '#121418', border: '1px solid #22252e', borderRadius: 3, padding: '24px 24px', position: 'relative', overflow: 'hidden' }}>

          {/* Locked overlay texture */}
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 6px, rgba(255,255,255,0.012) 6px, rgba(255,255,255,0.012) 7px)', pointerEvents: 'none' }} />

          <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.15)' }}>🔒</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, textTransform: 'uppercase' }}>Personal Coach</span>
                <span style={{ padding: '2px 8px', background: 'rgba(155,93,229,0.1)', border: '1px solid rgba(155,93,229,0.2)', borderRadius: 2, fontSize: 8, fontWeight: 700, letterSpacing: 2, color: 'rgba(155,93,229,0.5)', textTransform: 'uppercase' }}>COMING SOON</span>
              </div>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)', lineHeight: 1.65, margin: 0, maxWidth: 480 }}>
                Three AI editors will analyze your build, assess your meta position, and deliver a personalized coaching report. Early Adopters get priority access when this launches.
              </p>
            </div>
            <div style={{ textAlign: 'center', padding: '12px 20px', background: '#1a1d24', border: '1px solid #22252e', borderRadius: 3, opacity: 0.6 }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', marginBottom: 4 }}>Your Status</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#00ff41', letterSpacing: 1 }}>EARLY ADOPTER</div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.15)', marginTop: 3 }}>Priority access confirmed</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
