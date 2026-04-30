// app/FactionAdvisorCallout.js
// Homepage callout for the Shell Faction Advisor tool.
// Server component. Renders between Products and HomeEditorReactions.

import Link from 'next/link';

var SHELL_COLORS = {
  Assassin:  '#cc44ff',
  Destroyer: '#ff3333',
  Recon:     '#00d4ff',
  Rook:      '#888888',
  Thief:     '#ffd700',
  Triage:    '#00ff88',
  Vandal:    '#ff8800',
};

var SHELL_ORDER = ['Assassin', 'Destroyer', 'Recon', 'Rook', 'Thief', 'Triage', 'Vandal'];

var FACTIONS = [
  { name: 'Cyberacme', color: '#00ff41', focus: 'Loot / Extraction' },
  { name: 'Nucaloric', color: '#ff2d78', focus: 'Support / Healing' },
  { name: 'Traxus',    color: '#ff6600', focus: 'Weapons / Mods' },
  { name: 'Mida',      color: '#cc44ff', focus: 'Equipment / Grenades' },
  { name: 'Arachne',   color: '#ff2222', focus: 'Melee / Combat' },
  { name: 'Sekiguchi', color: '#c8b400', focus: 'Energy / Capacitors' },
];

export default function FactionAdvisorCallout({ shells }) {
  // Build shell list with image lookups — falls back gracefully if shells data missing
  var shellList = SHELL_ORDER.map(function(name) {
    var found = (shells || []).find(function(s) { return s.name === name; });
    return {
      name: name,
      color: SHELL_COLORS[name] || '#888',
      image_filename: found ? found.image_filename : null,
    };
  });

  return (
    <section style={{ position: 'relative', zIndex: 1, padding: '0 24px 28px' }}>

      {/* Section header — matches existing pattern */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 3, color: 'rgba(255,255,255,0.18)', textTransform: 'uppercase' }}>
          Faction Intelligence
        </span>
        <div style={{ flex: 1, height: 1, background: '#1e2028' }} />
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.12)', letterSpacing: 1 }}>
          6 FACTIONS · 7 SHELLS
        </span>
      </div>

      {/* Main callout panel */}
      <div style={{
        background:   '#1a1d24',
        border:       '1px solid #22252e',
        borderLeft:   '3px solid #ffd700',
        borderRadius: '0 3px 3px 0',
        padding:      0,
        overflow:     'hidden',
        display:      'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap:          0,
      }}>

        {/* LEFT HALF: copy + CTA */}
        <div style={{ padding: '22px 24px', borderRight: '1px solid #22252e' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.25)', borderRadius: 2, marginBottom: 14 }}>
            <span style={{ fontSize: 11, color: '#ffd700' }}>◆</span>
            <span style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, letterSpacing: 2, color: '#ffd700' }}>
              SHELL FACTION ADVISOR
            </span>
          </div>

          <h3 style={{
            fontFamily:    'Orbitron, monospace',
            fontSize:      'clamp(20px, 2.6vw, 26px)',
            fontWeight:    900,
            letterSpacing: 1,
            lineHeight:    1.1,
            margin:        '0 0 12px',
            color:         '#fff',
          }}>
            Choose your shell.<br />
            <span style={{ color: '#ffd700' }}>Plan your faction.</span>
          </h3>

          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, margin: '0 0 18px', maxWidth: 460 }}>
            Marathon's six factions gate the strongest gear behind rank progression. The Faction Advisor maps your shell choice to the optimal grind path — so you know which faction to invest in first.
          </p>

          <Link href="/factions" style={{
            display:        'inline-flex',
            alignItems:     'center',
            gap:            8,
            padding:        '11px 22px',
            background:     '#ffd700',
            color:          '#000',
            fontSize:       11,
            fontWeight:     800,
            letterSpacing:  1.5,
            borderRadius:   2,
            textDecoration: 'none',
            fontFamily:     'monospace',
          }}>
            OPEN FACTION ADVISOR →
          </Link>
        </div>

        {/* RIGHT HALF: shells + factions visual */}
        <div style={{ padding: '22px 24px', position: 'relative' }}>

          {/* Shells label */}
          <div style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, letterSpacing: 2, color: 'rgba(255,255,255,0.28)', marginBottom: 10, textTransform: 'uppercase' }}>
            Pick your runner ↓
          </div>

          {/* Shell circles row */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18 }}>
            {shellList.map(function(s) {
              var imgSrc = s.image_filename ? '/images/shells/' + s.image_filename : null;
              return (
                <Link
                  key={s.name}
                  href="/factions#shell-faction-advisor"
                  title={s.name + ' — find best factions'}
                  style={{
                    display:        'flex',
                    flexDirection:  'column',
                    alignItems:     'center',
                    gap:            4,
                    padding:        '4px 0',
                    textDecoration: 'none',
                    flexShrink:     0,
                    minWidth:       54,
                  }}>
                  <div style={{
                    width:        36,
                    height:       36,
                    borderRadius: '50%',
                    border:       '1.5px solid ' + s.color + '55',
                    background:   '#0e1014',
                    overflow:     'hidden',
                    display:      'flex',
                    alignItems:   'center',
                    justifyContent: 'center',
                    flexShrink:   0,
                  }}>
                    {imgSrc ? (
                      <img src={imgSrc} alt={s.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: 13, color: s.color, fontFamily: 'Orbitron, monospace', fontWeight: 900 }}>
                        {s.name.charAt(0)}
                      </span>
                    )}
                  </div>
                  <span style={{
                    fontFamily:    'monospace',
                    fontSize:      8,
                    fontWeight:    700,
                    letterSpacing: 1,
                    color:         s.color,
                  }}>
                    {s.name.toUpperCase()}
                  </span>
                </Link>
              );
            })}
          </div>

          {/* Faction chips */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 14 }}>
            <div style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, letterSpacing: 2, color: 'rgba(255,255,255,0.28)', marginBottom: 8, textTransform: 'uppercase' }}>
              Six factions
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {FACTIONS.map(function(f) {
                return (
                  <span key={f.name} style={{
                    display:       'inline-flex',
                    alignItems:    'center',
                    gap:           5,
                    padding:       '4px 9px',
                    background:    f.color + '0e',
                    border:        '1px solid ' + f.color + '30',
                    borderRadius:  2,
                    fontFamily:    'monospace',
                    fontSize:      9,
                    fontWeight:    700,
                    letterSpacing: 1,
                    color:         f.color,
                  }}>
                    <span style={{ width: 4, height: 4, borderRadius: '50%', background: f.color, flexShrink: 0 }} />
                    {f.name.toUpperCase()}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom hairline footer for visual rhythm consistency with product panels */}
      <div style={{
        marginTop:      0,
        padding:        '8px 14px',
        background:     '#0e1014',
        border:         '1px solid #22252e',
        borderTop:      'none',
        borderRadius:   '0 0 3px 3px',
        display:        'flex',
        justifyContent: 'space-between',
        alignItems:     'center',
        flexWrap:       'wrap',
        gap:            6,
      }}>
        <span style={{ fontFamily: 'monospace', fontSize: 9, color: 'rgba(255,255,255,0.28)', letterSpacing: 1, fontWeight: 700 }}>
          Faction unlocks · Stat bonuses · Investment math
        </span>
        <span style={{ fontFamily: 'monospace', fontSize: 8, color: '#ffd700' + 'aa', letterSpacing: 1, fontWeight: 700 }}>
          ◎ MAPPED BY MIRANDA
        </span>
      </div>
    </section>
  );
}