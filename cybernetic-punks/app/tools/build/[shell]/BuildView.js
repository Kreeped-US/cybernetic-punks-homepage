// app/tools/build/[shell]/BuildView.js
// STATIC build-view (Fable route ruling, render/generate separation). A SERVER component
// -- no 'use client', no state, no fetch -- so it STRUCTURALLY cannot fire the paid advisor
// call. It renders a stored `build_json` (the shape the advisor engine returns) as a clean,
// complete, crawlable presentation. Crawlers and first-paint read persisted data only; the
// live advisor is never touched here. The interactive refinement layer (AdvisorClient with
// initialBuild) is a separate slice; this component is the free-forever crawlable surface.

import Link from 'next/link';

const GRADE_COLORS = { S: '#ffd700', A: '#00ff41', B: '#00d4ff', C: '#ff8800', D: '#ff2222' };
const CRADLE_TRACK_COLORS = {
  Strength: '#ff3333', Resistance: '#4d9fff', Dexterity: '#00d4ff', Endurance: '#ff8800',
  Recharge: '#9b5de5', Support: '#00ff88',
};

// Pull the track's leading word (rows store "RECHARGE TRACK" / "Dexterity Track") so the
// colour map keys on the bare stat name.
function trackColor(track) {
  const first = String(track || '').trim().split(/\s+/)[0] || '';
  const key = first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
  return CRADLE_TRACK_COLORS[key] || '#00d4ff';
}

export default function BuildView({ build, accent }) {
  if (!build) return null;
  const accentColor = accent || '#ff8800';
  const shellName = build.shell || 'Runner';
  const grade = build.loadout_grade || 'A';
  const gradeColor = GRADE_COLORS[grade] || '#ff8800';
  const darkGrade = gradeColor === '#ffd700' || gradeColor === '#ff8800' || gradeColor === '#00d4ff' || gradeColor === '#00ff41';

  return (
    <div style={{ background: '#121418', color: '#fff', paddingBottom: 60, fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '8px 24px 40px' }}>

        {/* MAIN BUILD CARD */}
        <div style={{ background: '#1a1d24', border: '1px solid #22252e', borderTop: '3px solid ' + accentColor, borderRadius: '0 0 3px 3px', overflow: 'hidden', marginBottom: 12 }}>

          {/* Header — grade + name */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '24px 28px', gap: 16, flexWrap: 'wrap', borderBottom: '1px solid #22252e', background: 'linear-gradient(135deg, ' + accentColor + '0a 0%, transparent 60%)' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 8, color: accentColor + 'aa', letterSpacing: 3, marginBottom: 8, fontWeight: 700, fontFamily: 'monospace' }}>BUILD REPORT</div>
              <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 24, fontWeight: 900, color: '#fff', letterSpacing: 1, marginBottom: 8, wordBreak: 'break-word', lineHeight: 1.2 }}>
                &ldquo;{build.build_name || 'CUSTOM BUILD'}&rdquo;
              </div>
              {build.playstyle_summary && (
                <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>{build.playstyle_summary}</div>
              )}
            </div>
            <div style={{ textAlign: 'center', flexShrink: 0 }}>
              <div style={{ background: gradeColor, color: darkGrade ? '#000' : '#fff', fontSize: 56, fontWeight: 900, padding: '8px 24px', borderRadius: 2, fontFamily: 'Orbitron, monospace', lineHeight: 1, letterSpacing: 1 }}>{grade}</div>
              <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, marginTop: 6, fontWeight: 700 }}>LOADOUT GRADE</div>
              {build.ranked_viable && <div style={{ marginTop: 6, padding: '2px 8px', background: 'rgba(0,255,65,0.1)', border: '1px solid rgba(0,255,65,0.3)', borderRadius: 2, fontSize: 8, color: '#00ff41', letterSpacing: 2, fontWeight: 700, fontFamily: 'monospace' }}>RANKED VIABLE</div>}
            </div>
          </div>

          {/* Loadout grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1, background: '#22252e' }}>

            {/* Weapons */}
            <div style={{ padding: '18px 20px', background: '#1a1d24' }}>
              <div style={{ fontSize: 9, color: accentColor, letterSpacing: 3, marginBottom: 12, fontWeight: 700, textTransform: 'uppercase', fontFamily: 'monospace' }}>Weapons</div>
              {build.primary_weapon && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <div style={{ width: 3, height: 14, background: accentColor, borderRadius: 1, flexShrink: 0 }} />
                    <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 800, color: '#fff', letterSpacing: 0.5 }}>{build.primary_weapon.name}</div>
                    <div style={{ fontSize: 7, color: accentColor, padding: '1px 5px', border: '1px solid ' + accentColor + '30', borderRadius: 2, letterSpacing: 1, fontWeight: 700 }}>PRIMARY</div>
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', paddingLeft: 11, lineHeight: 1.5 }}>{build.primary_weapon.reason}</div>
                </div>
              )}
              {build.secondary_weapon && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <div style={{ width: 3, height: 14, background: 'rgba(255,255,255,0.2)', borderRadius: 1, flexShrink: 0 }} />
                    <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 800, color: 'rgba(255,255,255,0.75)', letterSpacing: 0.5 }}>{build.secondary_weapon.name}</div>
                    <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.25)', padding: '1px 5px', border: '1px solid #22252e', borderRadius: 2, letterSpacing: 1, fontWeight: 700 }}>SECONDARY</div>
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', paddingLeft: 11, lineHeight: 1.5 }}>{build.secondary_weapon.reason}</div>
                </div>
              )}
            </div>

            {/* Mods */}
            <div style={{ padding: '18px 20px', background: '#1a1d24' }}>
              <div style={{ fontSize: 9, color: accentColor, letterSpacing: 3, marginBottom: 12, fontWeight: 700, textTransform: 'uppercase', fontFamily: 'monospace' }}>Weapon Mods</div>
              {(build.mods || []).map((mod, i) => (
                <div key={i} style={{ marginBottom: 8, display: 'flex', gap: 7 }}>
                  <div style={{ fontSize: 7, color: accentColor, background: accentColor + '14', border: '1px solid ' + accentColor + '30', borderRadius: 2, padding: '2px 5px', letterSpacing: 1, flexShrink: 0, fontWeight: 700, height: 'fit-content', marginTop: 1 }}>{mod.slot ? String(mod.slot).toUpperCase() : ''}</div>
                  <div>
                    <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.85)', letterSpacing: 0.5, marginBottom: 2 }}>{mod.name}</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.45 }}>{mod.reason}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Cores */}
            <div style={{ padding: '18px 20px', background: '#1a1d24' }}>
              <div style={{ fontSize: 9, color: accentColor, letterSpacing: 3, marginBottom: 12, fontWeight: 700, textTransform: 'uppercase', fontFamily: 'monospace' }}>Shell Cores</div>
              {(build.cores || []).map((core, i) => (
                <div key={i} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2, flexWrap: 'wrap' }}>
                    <div style={{ width: 4, height: 4, borderRadius: '50%', background: accentColor, flexShrink: 0 }} />
                    <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.85)', letterSpacing: 0.5 }}>{core.name}</div>
                    {core.ability_type && <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.25)', padding: '1px 4px', border: '1px solid #22252e', borderRadius: 2, letterSpacing: 1, fontWeight: 700 }}>{String(core.ability_type).toUpperCase()}</div>}
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', paddingLeft: 10, lineHeight: 1.45 }}>{core.reason}</div>
                </div>
              ))}
              {(!build.cores || build.cores.length === 0) && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', letterSpacing: 1, fontWeight: 700 }}>NO CORES SPECIFIED</div>}
            </div>

            {/* Implants */}
            <div style={{ padding: '18px 20px', background: '#1a1d24' }}>
              <div style={{ fontSize: 9, color: '#9b5de5', letterSpacing: 3, marginBottom: 12, fontWeight: 700, textTransform: 'uppercase', fontFamily: 'monospace' }}>Implants</div>
              {(build.implants || []).map((imp, i) => (
                <div key={i} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2, flexWrap: 'wrap' }}>
                    <div style={{ fontSize: 7, color: '#9b5de5', background: 'rgba(155,93,229,0.1)', border: '1px solid rgba(155,93,229,0.25)', borderRadius: 2, padding: '2px 5px', letterSpacing: 1, flexShrink: 0, fontWeight: 700 }}>{imp.slot ? String(imp.slot).toUpperCase() : ''}</div>
                    <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.85)', letterSpacing: 0.5 }}>{imp.name}</div>
                  </div>
                  {imp.stat_change && <div style={{ fontSize: 10, color: '#9b5de5', letterSpacing: 1, paddingLeft: 10, marginBottom: 2, fontFamily: 'monospace', fontWeight: 700 }}>{imp.stat_change}</div>}
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', paddingLeft: 10, lineHeight: 1.45 }}>{imp.reason}</div>
                </div>
              ))}
              {(!build.implants || build.implants.length === 0) && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', letterSpacing: 1, fontWeight: 700 }}>NO IMPLANTS SPECIFIED</div>}
            </div>
          </div>

          {/* Cradle allocation */}
          {build.cradle && (build.cradle.summary || (build.cradle.tracks && build.cradle.tracks.length > 0)) && (
            <div id="cradle" style={{ borderTop: '1px solid #22252e', padding: '18px 20px', background: '#16181e', scrollMarginTop: 60 }}>
              {/* WS2 cradle-strengthen: a real H2 carrying the "[shell] cradle build" query
                  language (the ~8-impr "cradle build" demand is a topic the canonical already
                  covers) + a #cradle anchor target for internal links from /advisor and /cradle. */}
              <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: 15, fontWeight: 800, color: '#00d4ff', letterSpacing: 0.5, margin: '0 0 4px', lineHeight: 1.2 }}>
                ◇ {shellName} Cradle Build — Season 2 Stat Plan
              </h2>
              <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.25)', letterSpacing: 1, fontFamily: 'monospace', fontWeight: 700, marginBottom: 12, textTransform: 'uppercase' }}>Free respec · resets each season</div>
              {build.cradle.summary && <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, marginBottom: 14 }}>{build.cradle.summary}</div>}
              {build.cradle.tracks && build.cradle.tracks.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 8 }}>
                  {build.cradle.tracks.map((t, i) => {
                    const tc = trackColor(t.track);
                    return (
                      <div key={i} style={{ background: '#1a1d24', border: '1px solid #22252e', borderLeft: '3px solid ' + tc, borderRadius: '0 3px 3px 0', padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, gap: 8 }}>
                          <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 12, fontWeight: 800, color: tc, letterSpacing: 1 }}>{String(t.track || '').toUpperCase()}</div>
                          {t.energy != null && t.energy !== '' && <div style={{ fontSize: 8, color: tc + 'cc', background: tc + '15', border: '1px solid ' + tc + '33', borderRadius: 2, padding: '2px 6px', letterSpacing: 1, fontFamily: 'monospace', fontWeight: 700, flexShrink: 0 }}>{t.energy} ENERGY</div>}
                        </div>
                        {t.perk && <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.8)', marginBottom: 3, fontFamily: 'monospace', letterSpacing: 0.5 }}>PERK · {t.perk}</div>}
                        {t.reason && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>{t.reason}</div>}
                      </div>
                    );
                  })}
                </div>
              )}
              <div style={{ marginTop: 12 }}>
                <Link href="/cradle" style={{ fontSize: 10, color: '#00d4ff', letterSpacing: 1.5, fontWeight: 700, fontFamily: 'monospace', textDecoration: 'none' }}>OPEN THE CRADLE PLANNER →</Link>
              </div>
            </div>
          )}

          {/* Strengths / weaknesses / ranked strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 1, background: '#22252e', borderTop: '1px solid #22252e' }}>
            <div style={{ padding: '14px 20px', background: '#1a1d24' }}>
              <div style={{ fontSize: 8, color: '#00ff41', letterSpacing: 3, marginBottom: 8, fontWeight: 700 }}>STRENGTHS</div>
              {(build.strengths || []).map((s, i) => (
                <div key={i} style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 4, display: 'flex', gap: 6, lineHeight: 1.5 }}><span style={{ color: '#00ff41', fontWeight: 900 }}>+</span>{s}</div>
              ))}
            </div>
            <div style={{ padding: '14px 20px', background: '#1a1d24' }}>
              <div style={{ fontSize: 8, color: '#ff2222', letterSpacing: 3, marginBottom: 8, fontWeight: 700 }}>WEAKNESSES</div>
              {(build.weaknesses || []).map((w, i) => (
                <div key={i} style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 4, display: 'flex', gap: 6, lineHeight: 1.5 }}><span style={{ color: '#ff2222', fontWeight: 900 }}>−</span>{w}</div>
              ))}
            </div>
            {build.ranked_note && (
              <div style={{ padding: '14px 20px', background: '#1a1d24' }}>
                <div style={{ fontSize: 8, color: '#ffd700', letterSpacing: 3, marginBottom: 8, fontWeight: 700 }}>RANKED NOTE</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>{build.ranked_note}</div>
              </div>
            )}
          </div>
        </div>

        {/* Build analysis (DEXTER) */}
        {build.dexter_analysis && (
          <div style={{ background: '#1a1d24', border: '1px solid #22252e', borderLeft: '3px solid ' + accentColor, borderRadius: '0 3px 3px 0', padding: '18px 22px' }}>
            <div style={{ fontSize: 9, color: '#ff8800', letterSpacing: 3, marginBottom: 10, fontWeight: 700, textTransform: 'uppercase', fontFamily: 'monospace' }}>⬢ Build Analysis</div>
            <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.7)', lineHeight: 1.8 }}>{build.dexter_analysis}</div>
          </div>
        )}
      </div>
    </div>
  );
}
