'use client';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useIsMobile } from '@/lib/useIsMobile';
import { track } from '@/lib/useTrack';
import { isMonetizationEnabled } from '@/lib/monetization';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const SHELLS = [
  { name: 'Destroyer', color: '#ff3333', role: 'Frontline Combat',    desc: 'Thrusters. Aggression. Close-range dominance.' },
  { name: 'Vandal',    color: '#ff8800', role: 'Mobility Specialist', desc: 'Jump jets. Movement chaining. Chaos in motion.' },
  { name: 'Recon',     color: '#00d4ff', role: 'Intel Gatherer',      desc: 'Echo Pulse. Scanning. Information warfare.' },
  { name: 'Assassin',  color: '#cc44ff', role: 'Stealth Operator',    desc: 'Active Camo. Shadow Dive. Invisible kills.' },
  { name: 'Triage',    color: '#00ff88', role: 'Combat Support',      desc: 'Healing. Team sustain. Frontline medic.' },
  { name: 'Thief',     color: '#ffd700', role: 'Loot Specialist',     desc: 'X-Ray Visor. Pickpocket Drone. Extraction expert.' },
  { name: 'Rook',      color: '#888888', role: 'Anchor Tank',         desc: 'Fortify. Hold ground. Absorb punishment.' },
];

const SHELL_SYMBOLS = { Destroyer:'⬢', Vandal:'⬡', Recon:'◇', Assassin:'◈', Triage:'◎', Thief:'⬠', Rook:'▣' };

const PLAYSTYLES = [
  { id: 'aggressive', label: 'AGGRESSIVE', desc: 'Push fights, create chaos, high TTK' },
  { id: 'balanced',   label: 'BALANCED',   desc: 'Flex between combat and extraction' },
  { id: 'extraction', label: 'EXTRACTION', desc: 'Loot fast, extract clean, stay alive' },
  { id: 'support',    label: 'SUPPORT',    desc: 'Enable your squad, control the field' },
];

const RANK_TARGETS = [
  { id: 'unranked',  label: 'UNRANKED',  color: '#555555', holotag: null,     desc: 'Casual / no ranked' },
  { id: 'bronze',    label: 'BRONZE',    color: '#cd7f32', holotag: '3,000',  desc: 'First steps in ranked' },
  { id: 'silver',    label: 'SILVER',    color: '#aaaaaa', holotag: '5,000',  desc: 'Building consistency' },
  { id: 'gold',      label: 'GOLD',      color: '#ffd700', holotag: '7,000',  desc: 'Reliable performer' },
  { id: 'platinum',  label: 'PLATINUM',  color: '#00d4ff', holotag: '10,000', desc: 'High-level play' },
  { id: 'diamond',   label: 'DIAMOND',   color: '#66ccff', holotag: '15,000', desc: 'Elite competitor' },
  { id: 'pinnacle',  label: 'PINNACLE',  color: '#cc44ff', holotag: '20,000', desc: 'Top of the ladder' },
];

const PRIORITIES = [
  { id: 'combat',     label: 'COMBAT POWER',    desc: 'Win every gunfight' },
  { id: 'extraction', label: 'CLEAN EXTRACT',   desc: 'Get out with the loot' },
  { id: 'survival',   label: 'SURVIVABILITY',   desc: 'Stay alive under pressure' },
  { id: 'speed',      label: 'LOOT SPEED',      desc: 'Fast hands, fast feet' },
];

const EXPERIENCE_LEVELS = [
  { id: 'new',         label: 'NEW RUNNER',   desc: 'First week in Marathon' },
  { id: 'learning',    label: 'LEARNING',     desc: 'Getting the hang of it' },
  { id: 'experienced', label: 'EXPERIENCED',  desc: 'Know the systems well' },
  { id: 'veteran',     label: 'VETERAN',      desc: 'Deep meta knowledge' },
];

const WEAPON_PREFS = [
  { id: '',        label: 'NO PREFERENCE' },
  { id: 'AR',      label: 'ASSAULT RIFLE' },
  { id: 'SMG',     label: 'SMG' },
  { id: 'Shotgun', label: 'SHOTGUN' },
  { id: 'Sniper',  label: 'SNIPER' },
  { id: 'LMG',     label: 'MACHINE GUN' },
  { id: 'Railgun', label: 'RAILGUN' },
];

const GRADE_COLORS = { S: '#ff2222', A: '#ff8800', B: '#ffd700', C: '#00d4ff', D: '#666' };

const SCAN_STEPS = [
  'INITIALIZING DEXTER BUILD ENGINE',
  'ACCESSING MOD DATABASE',
  'SCANNING CORE REGISTRY',
  'ANALYZING IMPLANT SYNERGIES',
  'CROSS-REFERENCING META TIER DATA',
  'CALCULATING WEAPON PAIRING EFFICIENCY',
  'OPTIMIZING FOR TARGET RANK',
  'DEXTER ENGINEERING LOADOUT',
  'FINALIZING BUILD PARAMETERS',
];

// ─── SHARE CARD (unchanged — brand asset) ──────────────────

function generateShareCard(build, shellConfig) {
  var canvas = document.createElement('canvas');
  canvas.width = 1200; canvas.height = 630;
  var ctx = canvas.getContext('2d');
  var color = shellConfig.color;
  ctx.fillStyle = '#030303'; ctx.fillRect(0,0,1200,630);
  var grad = ctx.createRadialGradient(200,315,0,200,315,600);
  grad.addColorStop(0, color+'22'); grad.addColorStop(1,'transparent');
  ctx.fillStyle = grad; ctx.fillRect(0,0,1200,630);
  var bg = ctx.createLinearGradient(0,0,1200,0);
  bg.addColorStop(0,color); bg.addColorStop(0.5,color+'88'); bg.addColorStop(1,'transparent');
  ctx.fillStyle = bg; ctx.fillRect(0,0,1200,3);
  ctx.fillStyle = color+'55'; ctx.fillRect(0,0,3,630);
  ctx.font='bold 11px monospace'; ctx.fillStyle=color+'aa'; ctx.textAlign='left';
  ctx.fillText('DEXTER BUILD ADVISOR  //  CYBERNETICPUNKS.COM',48,52);
  var grade=build.loadout_grade||'A';
  ctx.font='bold 140px monospace'; ctx.fillStyle=(GRADE_COLORS[grade]||'#ff8800')+'dd'; ctx.textAlign='right';
  ctx.fillText(grade,1160,145);
  ctx.font='bold 44px monospace'; ctx.fillStyle=color; ctx.textAlign='left';
  ctx.fillText(build.shell?build.shell.toUpperCase():'',48,128);
  ctx.font='bold 26px monospace'; ctx.fillStyle='rgba(255,255,255,0.88)';
  ctx.fillText('"'+(build.build_name||'CUSTOM BUILD')+'"',48,175);
  ctx.strokeStyle=color+'33'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(48,200); ctx.lineTo(1152,200); ctx.stroke();
  ctx.font='14px monospace'; ctx.fillStyle='rgba(255,255,255,0.42)';
  var words=(build.playstyle_summary||'').split(' '), line='', y=228;
  for (var i=0;i<words.length;i++) {
    var test=line+words[i]+' ';
    if (ctx.measureText(test).width>640&&line!=='') { ctx.fillText(line.trim(),48,y); line=words[i]+' '; y+=21; }
    else line=test;
  }
  if (line) ctx.fillText(line.trim(),48,y);
  y=Math.max(y+32,302);
  ctx.font='bold 8px monospace'; ctx.fillStyle=color+'88'; ctx.fillText('WEAPONS',48,y); y+=17;
  ctx.font='bold 16px monospace'; ctx.fillStyle='rgba(255,255,255,0.85)';
  if (build.primary_weapon?.name) { ctx.fillText('> '+build.primary_weapon.name,48,y); y+=24; }
  if (build.secondary_weapon?.name) { ctx.fillStyle='rgba(255,255,255,0.48)'; ctx.fillText('> '+build.secondary_weapon.name,48,y); y+=24; }
  y+=8; ctx.font='bold 8px monospace'; ctx.fillStyle=color+'88'; ctx.fillText('MODS',48,y); y+=16;
  ctx.font='12px monospace'; ctx.fillStyle='rgba(255,255,255,0.52)';
  (build.mods||[]).slice(0,4).forEach(function(m){ ctx.fillText('- '+m.name+' ['+m.slot+']',48,y); y+=18; });
  var ry=302;
  ctx.font='bold 8px monospace'; ctx.fillStyle=color+'88'; ctx.textAlign='left'; ctx.fillText('CORES',700,ry); ry+=17;
  ctx.font='12px monospace'; ctx.fillStyle='rgba(255,255,255,0.52)';
  (build.cores||[]).slice(0,3).forEach(function(c){ ctx.fillText('- '+c.name,700,ry); ry+=18; });
  ry+=12; ctx.font='bold 8px monospace'; ctx.fillStyle=color+'88'; ctx.fillText('IMPLANTS',700,ry); ry+=17;
  ctx.font='12px monospace'; ctx.fillStyle='rgba(255,255,255,0.52)';
  (build.implants||[]).slice(0,3).forEach(function(n){ ctx.fillText('['+n.slot+'] '+n.name,700,ry); ry+=18; });
  if (build.ranked_viable) { ry+=12; ctx.font='bold 9px monospace'; ctx.fillStyle='#00ff88'; ctx.fillText('RANKED VIABLE',700,ry); }
  ctx.fillStyle=color+'18'; ctx.fillRect(0,590,1200,40);
  ctx.strokeStyle=color+'33'; ctx.beginPath(); ctx.moveTo(0,590); ctx.lineTo(1200,590); ctx.stroke();
  ctx.font='bold 11px monospace'; ctx.fillStyle=color+'aa'; ctx.textAlign='left'; ctx.fillText('CYBERNETICPUNKS.COM',48,613);
  ctx.fillStyle='rgba(255,255,255,0.18)'; ctx.textAlign='right'; ctx.fillText('AUTONOMOUS MARATHON INTELLIGENCE  -  DEXTER BUILD ADVISOR',1152,613);
  return canvas.toDataURL('image/png');
}

// ─── SECTION HEADER ─────────────────────────────────────────

function SectionHeader({ num, label, sub }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
      <div style={{ fontSize: 9, fontWeight: 800, color: '#ff8800', letterSpacing: 2, padding: '3px 8px', background: 'rgba(255,136,0,0.1)', border: '1px solid rgba(255,136,0,0.3)', borderRadius: 2, flexShrink: 0, fontFamily: 'monospace' }}>{num}</div>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.7)', letterSpacing: 2, textTransform: 'uppercase' }}>
        {label}
        {sub && <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 9, marginLeft: 8, fontWeight: 600 }}>{sub}</span>}
      </div>
      <div style={{ flex: 1, height: 1, background: '#1e2028' }} />
    </div>
  );
}

// ─── MAIN COMPONENT ─────────────────────────────────────────

export default function AdvisorClient({ urlShell, profilePrefill }) {
  // Initial state reflects URL param > profile > nothing
  var initialShell = null;
  if (urlShell) {
    var match = SHELLS.find(function(s) { return s.name.toLowerCase() === urlShell.toLowerCase(); });
    if (match) initialShell = match.name;
  }
  if (!initialShell && profilePrefill?.shell) {
    var pmatch = SHELLS.find(function(s) { return s.name === profilePrefill.shell; });
    if (pmatch) initialShell = pmatch.name;
  }

  var initialPlaystyle = profilePrefill?.playstyle || 'balanced';

  var [selectedShell, setSelectedShell] = useState(initialShell);
  var [usageCount, setUsageCount] = useState(null);
  var [playstyle, setPlaystyle] = useState(initialPlaystyle);
  var [rankTarget, setRankTarget] = useState('gold');
  var [weaponPref, setWeaponPref] = useState('');
  var [teamSize, setTeamSize] = useState('Solo');
  var [priority, setPriority] = useState('combat');
  var [experienceLevel, setExperienceLevel] = useState('learning');
  var [phase, setPhase] = useState('input');
  var [build, setBuild] = useState(null);
  var [error, setError] = useState(null);
  var [scanStep, setScanStep] = useState(0);
  var [scanProgress, setScanProgress] = useState(0);
  var [stickyVisible, setStickyVisible] = useState(false);

  var scanRef = useRef(null);
  var isMobile = useIsMobile(640);
  var monetizationOn = isMonetizationEnabled();
  var isPrefilled = !!profilePrefill?.shell;

  var shellConfig = SHELLS.find(function(s) { return s.name === selectedShell; });
  var accentColor = shellConfig ? shellConfig.color : '#ff8800';

  // Scan animation
  useEffect(function() {
    if (phase !== 'loading') return;
    var step = 0, prog = 0;
    scanRef.current = setInterval(function() {
      prog += Math.random() * 12 + 3;
      if (prog >= 100) prog = 99;
      setScanProgress(Math.min(99, prog));
      if (prog > (step + 1) * (100 / SCAN_STEPS.length)) {
        step = Math.min(step + 1, SCAN_STEPS.length - 1);
        setScanStep(step);
      }
    }, 280);
    return function() { clearInterval(scanRef.current); };
  }, [phase]);

  // Usage count
  useEffect(function() {
    async function fetchUsage() {
      try {
        var { count } = await supabase
          .from('site_events')
          .select('*', { count: 'exact', head: true })
          .eq('event_name', 'advisor_generate');
        if (count && count > 0) setUsageCount(count);
      } catch (_) {}
    }
    fetchUsage();
  }, []);

  // Sticky generate bar on scroll (input phase only)
  useEffect(function() {
    if (phase !== 'input') return;
    function onScroll() {
      setStickyVisible(window.scrollY > 400 && !!selectedShell);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return function() { window.removeEventListener('scroll', onScroll); };
  }, [phase, selectedShell]);

  async function generateBuild() {
    if (!selectedShell) return;
    setPhase('loading'); setScanStep(0); setScanProgress(0); setError(null); setBuild(null);
    try {
      var res = await fetch('/api/advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shell: selectedShell, playstyle, rankTarget, weaponPreference: weaponPref, teamSize, priority, experienceLevel }),
      });
      var json = await res.json();
      if (json.error) throw new Error(json.error);
      clearInterval(scanRef.current);
      setScanProgress(100);
      await new Promise(function(r) { setTimeout(r, 400); });
      setBuild(json.build);
      setPhase('result');
      track('advisor_generate', { shell: selectedShell, playstyle, rankTarget, teamSize });
    } catch (err) {
      clearInterval(scanRef.current);
      setError(err.message);
      setPhase('input');
    }
  }

  function downloadShareCard() {
    if (!build || !shellConfig) return;
    var img = generateShareCard(build, shellConfig);
    track('advisor_share', { shell: build?.shell || null });
    var a = document.createElement('a');
    a.href = img;
    a.download = 'dexter-build-' + (build.shell || 'unknown').toLowerCase() + '-' + Date.now() + '.png';
    a.click();
  }

  function shareToX() {
    var text = 'Just got my ' + (build?.shell || '') + ' build engineered by DEXTER at CyberneticPunks\n\n"' + (build?.build_name || '') + '" — Grade: ' + (build?.loadout_grade || '') + '\n' + (build?.primary_weapon?.name || '') + ' + ' + (build?.secondary_weapon?.name || '') + '\n\ncyberneticpunks.com/advisor #Marathon #MarathonGame';
    window.open('https://twitter.com/intent/tweet?text=' + encodeURIComponent(text), '_blank');
  }

  // ══════════════════════════════════════════════════════════
  // INPUT PHASE
  // ══════════════════════════════════════════════════════════

  if (phase === 'input') {
    return (
      <div style={{ background: '#121418', minHeight: '100vh', color: '#fff', paddingTop: 48, paddingBottom: 100, fontFamily: 'system-ui, sans-serif' }}>

        <style>{`
          .advisor-shell:hover       { background: #1e2228 !important; border-color: #2a2e38 !important; }
          .advisor-option:hover      { background: #1e2228 !important; }
          .advisor-weapon-pref:hover { background: #1e2228 !important; }
        `}</style>

        {/* ══ HERO ═══════════════════════════════════════════ */}
        <section style={{ maxWidth: 1100, margin: '0 auto', padding: '36px 24px 32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ff8800', boxShadow: '0 0 6px rgba(255,136,0,0.5)' }} />
            <span style={{ fontSize: 10, color: '#ff8800', letterSpacing: 3, fontWeight: 700 }}>DEXTER · BUILD ENGINE</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20, marginBottom: 24 }}>
            <div style={{ flex: 1, minWidth: 300 }}>
              <h1 style={{ fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 900, letterSpacing: '-1px', lineHeight: 1, margin: '0 0 12px', color: '#fff' }}>
                {isPrefilled && profilePrefill.name ? (
                  <>Welcome back,<br /><span style={{ color: '#ff8800' }}>{profilePrefill.name}.</span></>
                ) : (
                  <>Engineer your<br /><span style={{ color: '#ff8800' }}>build.</span></>
                )}
              </h1>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, maxWidth: 520, margin: 0 }}>
                {isPrefilled
                  ? 'We\'ve pre-filled your profile preferences. Tweak anything, then let DEXTER engineer the full loadout from live meta data.'
                  : 'Tell DEXTER your shell and playstyle. Get a complete loadout — weapons, mods, cores, implants — engineered from live meta data.'}
              </p>
            </div>

            {usageCount && (
              <div style={{ background: '#1a1d24', border: '1px solid #22252e', borderTop: '2px solid #ff8800', borderRadius: '0 0 3px 3px', padding: '14px 18px', minWidth: 180 }}>
                <div style={{ fontSize: 24, fontWeight: 900, color: '#ff8800', lineHeight: 1, letterSpacing: '-0.5px', marginBottom: 5 }}>
                  {usageCount.toLocaleString()}
                </div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, textTransform: 'uppercase', fontWeight: 700 }}>
                  Builds Generated
                </div>
              </div>
            )}
          </div>

          {error && (
            <div style={{ padding: '12px 16px', background: 'rgba(255,34,34,0.08)', border: '1px solid rgba(255,34,34,0.3)', borderLeft: '3px solid #ff2222', borderRadius: '0 3px 3px 0', fontSize: 11, color: '#ff4444', letterSpacing: 1, fontWeight: 700, marginBottom: 20 }}>
              ERROR · {error}
            </div>
          )}
        </section>

        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px' }}>

          {/* ══ SHELL SELECTION ═══════════════════════════════ */}
          <section style={{ marginBottom: 32 }}>
            <SectionHeader num="01" label="Select Your Runner" />
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8 }}>
              {SHELLS.map(function(shell) {
                var isSel = selectedShell === shell.name;
                return (
                  <div key={shell.name} className="advisor-shell" onClick={function() { setSelectedShell(shell.name); }}
                    style={{
                      background:   isSel ? shell.color + '12' : '#1a1d24',
                      border:       '1px solid ' + (isSel ? shell.color + '50' : '#22252e'),
                      borderTop:    '2px solid ' + (isSel ? shell.color : '#22252e'),
                      borderRadius: '0 0 3px 3px',
                      padding:      isMobile ? '12px 10px' : '14px 12px',
                      cursor:       'pointer',
                      position:     'relative',
                      transition:   'background 0.1s, border-color 0.1s',
                    }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                      <span style={{ fontSize: 16, color: isSel ? shell.color : 'rgba(255,255,255,0.3)' }}>{SHELL_SYMBOLS[shell.name] || '◈'}</span>
                      <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 11, fontWeight: 900, color: isSel ? shell.color : 'rgba(255,255,255,0.6)', letterSpacing: 1 }}>{shell.name.toUpperCase()}</span>
                    </div>
                    <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.25)', letterSpacing: 1.5, marginBottom: isMobile ? 0 : 5, fontWeight: 700, textTransform: 'uppercase', fontFamily: 'monospace' }}>{shell.role}</div>
                    {!isMobile && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', lineHeight: 1.4 }}>{shell.desc}</div>}
                    {isSel && <div style={{ position: 'absolute', top: 8, right: 8, width: 5, height: 5, borderRadius: '50%', background: shell.color, boxShadow: '0 0 5px ' + shell.color }} />}
                  </div>
                );
              })}
            </div>
          </section>

          {/* ══ OPTIONS GRID ════════════════════════════════ */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: 24, marginBottom: 32 }}>

            {/* Playstyle */}
            <div>
              <SectionHeader num="02" label="Playstyle" />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
                {PLAYSTYLES.map(function(p) {
                  var isSel = playstyle === p.id;
                  return (
                    <div key={p.id} className="advisor-option" onClick={function() { setPlaystyle(p.id); }}
                      style={{
                        background:   isSel ? 'rgba(255,136,0,0.1)' : '#1a1d24',
                        border:       '1px solid ' + (isSel ? 'rgba(255,136,0,0.35)' : '#22252e'),
                        borderLeft:   '3px solid ' + (isSel ? '#ff8800' : '#22252e'),
                        borderRadius: '0 3px 3px 0',
                        padding:      '11px 13px',
                        cursor:       'pointer',
                        transition:   'background 0.1s',
                      }}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: isSel ? '#ff8800' : 'rgba(255,255,255,0.5)', letterSpacing: 1.5, marginBottom: 3, fontFamily: 'monospace' }}>{p.label}</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', lineHeight: 1.4 }}>{p.desc}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Priority */}
            <div>
              <SectionHeader num="03" label="Priority Focus" />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
                {PRIORITIES.map(function(p) {
                  var isSel = priority === p.id;
                  return (
                    <div key={p.id} className="advisor-option" onClick={function() { setPriority(p.id); }}
                      style={{
                        background:   isSel ? 'rgba(255,136,0,0.1)' : '#1a1d24',
                        border:       '1px solid ' + (isSel ? 'rgba(255,136,0,0.35)' : '#22252e'),
                        borderLeft:   '3px solid ' + (isSel ? '#ff8800' : '#22252e'),
                        borderRadius: '0 3px 3px 0',
                        padding:      '11px 13px',
                        cursor:       'pointer',
                        transition:   'background 0.1s',
                      }}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: isSel ? '#ff8800' : 'rgba(255,255,255,0.5)', letterSpacing: 1.5, marginBottom: 3, fontFamily: 'monospace' }}>{p.label}</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', lineHeight: 1.4 }}>{p.desc}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Rank Target */}
            <div>
              <SectionHeader num="04" label="Rank Target" />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 5 }}>
                {RANK_TARGETS.map(function(r) {
                  var isSel = rankTarget === r.id;
                  return (
                    <div key={r.id} className="advisor-option" onClick={function() { setRankTarget(r.id); }}
                      style={{
                        background:   isSel ? r.color + '15' : '#1a1d24',
                        border:       '1px solid ' + (isSel ? r.color + '40' : '#22252e'),
                        borderTop:    '2px solid ' + (isSel ? r.color : '#22252e'),
                        borderRadius: '0 0 3px 3px',
                        padding:      '10px 12px',
                        cursor:       'pointer',
                        transition:   'background 0.1s',
                      }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                        <div style={{ fontSize: 10, fontWeight: 800, color: isSel ? r.color : 'rgba(255,255,255,0.4)', letterSpacing: 1.5, fontFamily: 'monospace' }}>{r.label}</div>
                        {r.holotag && <div style={{ fontSize: 8, color: isSel ? r.color + 'aa' : 'rgba(255,255,255,0.2)', letterSpacing: 1, fontFamily: 'monospace', fontWeight: 700 }}>{r.holotag}</div>}
                      </div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', lineHeight: 1.4 }}>{r.desc}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Experience */}
            <div>
              <SectionHeader num="05" label="Experience Level" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {EXPERIENCE_LEVELS.map(function(e) {
                  var isSel = experienceLevel === e.id;
                  return (
                    <div key={e.id} className="advisor-option" onClick={function() { setExperienceLevel(e.id); }}
                      style={{
                        background:   isSel ? 'rgba(255,136,0,0.1)' : '#1a1d24',
                        border:       '1px solid ' + (isSel ? 'rgba(255,136,0,0.35)' : '#22252e'),
                        borderLeft:   '3px solid ' + (isSel ? '#ff8800' : '#22252e'),
                        borderRadius: '0 3px 3px 0',
                        padding:      '10px 13px',
                        cursor:       'pointer',
                        display:      'flex',
                        alignItems:   'center',
                        justifyContent: 'space-between',
                        transition:   'background 0.1s',
                      }}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: isSel ? '#ff8800' : 'rgba(255,255,255,0.5)', letterSpacing: 1.5, fontFamily: 'monospace' }}>{e.label}</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{e.desc}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Weapon pref */}
            <div>
              <SectionHeader num="06" label="Weapon Preference" sub="OPTIONAL" />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {WEAPON_PREFS.map(function(w) {
                  var isSel = weaponPref === w.id;
                  return (
                    <button key={w.id} className="advisor-weapon-pref" onClick={function() { setWeaponPref(w.id); }}
                      style={{
                        padding:      '8px 12px',
                        background:   isSel ? 'rgba(255,136,0,0.1)' : '#1a1d24',
                        border:       '1px solid ' + (isSel ? 'rgba(255,136,0,0.35)' : '#22252e'),
                        borderRadius: 2,
                        color:        isSel ? '#ff8800' : 'rgba(255,255,255,0.4)',
                        fontSize:     10,
                        fontWeight:   700,
                        letterSpacing: 1.5,
                        cursor:       'pointer',
                        fontFamily:   'inherit',
                        transition:   'background 0.1s',
                      }}>
                      {w.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Team */}
            <div>
              <SectionHeader num="07" label="Team Size" />
              <div style={{ display: 'flex', gap: 6 }}>
                {['Solo', 'Squad'].map(function(size) {
                  var isSel = teamSize === size;
                  return (
                    <button key={size} onClick={function() { setTeamSize(size); }}
                      style={{
                        flex:         1,
                        padding:      '14px',
                        background:   isSel ? accentColor + '12' : '#1a1d24',
                        border:       '1px solid ' + (isSel ? accentColor + '40' : '#22252e'),
                        borderTop:    '2px solid ' + (isSel ? accentColor : '#22252e'),
                        borderRadius: '0 0 3px 3px',
                        color:        isSel ? accentColor : 'rgba(255,255,255,0.5)',
                        fontFamily:   'Orbitron, monospace',
                        fontSize:     12,
                        fontWeight:   700,
                        letterSpacing: 2,
                        cursor:       'pointer',
                      }}>
                      {size.toUpperCase()}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ══ GENERATE ═══════════════════════════════════ */}
          <div style={{ textAlign: 'center' }}>
            {selectedShell && shellConfig && (
              <div style={{ marginBottom: 12, fontSize: 10, color: accentColor, letterSpacing: 2, fontWeight: 700, fontFamily: 'monospace' }}>
                {selectedShell.toUpperCase()} · {(PLAYSTYLES.find(function(p) { return p.id === playstyle; }) || {}).label} · {(PRIORITIES.find(function(p) { return p.id === priority; }) || {}).label} · {(RANK_TARGETS.find(function(r) { return r.id === rankTarget; }) || {}).label}
              </div>
            )}
            <button onClick={generateBuild} disabled={!selectedShell}
              style={{
                padding:      isMobile ? '16px 40px' : '15px 52px',
                background:   selectedShell ? accentColor : '#1a1d24',
                color:        selectedShell ? '#000' : 'rgba(255,255,255,0.2)',
                border:       selectedShell ? 'none' : '1px solid #22252e',
                borderRadius: 2,
                fontSize:     13,
                fontWeight:   900,
                letterSpacing: 1.5,
                cursor:       selectedShell ? 'pointer' : 'not-allowed',
                fontFamily:   'inherit',
                width:        isMobile ? '100%' : 'auto',
              }}>
              {selectedShell ? 'ENGINEER ' + selectedShell.toUpperCase() + ' BUILD →' : 'SELECT A RUNNER FIRST'}
            </button>
          </div>
        </div>

        {/* ══ STICKY GENERATE BAR ═══════════════════════════ */}
        {stickyVisible && (
          <div style={{
            position:  'fixed',
            bottom:    16,
            left:      '50%',
            transform: 'translateX(-50%)',
            zIndex:    100,
            maxWidth:  'calc(100vw - 32px)',
          }}>
            <button onClick={generateBuild}
              style={{
                display:      'flex',
                alignItems:   'center',
                gap:          14,
                padding:      '12px 18px',
                background:   '#0e1014',
                border:       '1px solid #22252e',
                borderTop:    '2px solid ' + accentColor,
                borderRadius: '0 0 4px 4px',
                boxShadow:    '0 4px 20px rgba(0,0,0,0.5)',
                cursor:       'pointer',
                whiteSpace:   'nowrap',
                fontFamily:   'inherit',
              }}>
              <span style={{ fontSize: 18, color: accentColor, lineHeight: 1 }}>{shellConfig ? SHELL_SYMBOLS[shellConfig.name] : '⬢'}</span>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: accentColor, letterSpacing: 2, marginBottom: 2, textTransform: 'uppercase' }}>Ready</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>Engineer {selectedShell}</div>
              </div>
              <span style={{ fontSize: 14, fontWeight: 800, color: accentColor, marginLeft: 4 }}>→</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════
  // LOADING PHASE
  // ══════════════════════════════════════════════════════════

  if (phase === 'loading') {
    return (
      <div style={{ background: '#121418', minHeight: '100vh', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', padding: '0 20px', fontFamily: 'system-ui, sans-serif' }}>

        <style>{`
          @keyframes advisorPulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }
          @keyframes fadeInSlide { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
        `}</style>

        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 520, width: '100%' }}>
          <div style={{
            fontFamily: 'Orbitron, monospace',
            fontSize: isMobile ? 48 : 60,
            fontWeight: 900,
            color: accentColor,
            marginBottom: 16,
            animation: 'advisorPulse 1.5s ease-in-out infinite',
            letterSpacing: 2,
          }}>
            {selectedShell ? SHELL_SYMBOLS[selectedShell] : '⬢'}
          </div>

          <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 14, fontWeight: 900, letterSpacing: 3, color: accentColor, marginBottom: 5 }}>DEXTER ANALYZING</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, marginBottom: 24, fontFamily: 'monospace', fontWeight: 700 }}>
            {selectedShell ? selectedShell.toUpperCase() : ''} · {(PLAYSTYLES.find(function(p) { return p.id === playstyle; }) || {}).label} · {(PRIORITIES.find(function(p) { return p.id === priority; }) || {}).label}
          </div>

          <div style={{ width: '100%', height: 2, background: '#1e2028', borderRadius: 1, overflow: 'hidden', marginBottom: 18 }}>
            <div style={{ height: '100%', width: scanProgress + '%', background: accentColor, borderRadius: 1, transition: 'width 0.3s ease' }} />
          </div>

          <div style={{ background: '#1a1d24', border: '1px solid #22252e', borderLeft: '3px solid ' + accentColor, borderRadius: '0 3px 3px 0', padding: '16px 18px', textAlign: 'left', minHeight: 160 }}>
            {SCAN_STEPS.slice(0, scanStep + 1).map(function(step, i) {
              return (
                <div key={i} style={{ fontSize: 10, color: i === scanStep ? accentColor : 'rgba(255,255,255,0.25)', letterSpacing: 1, marginBottom: 6, lineHeight: 1.6, animation: 'fadeInSlide 0.3s ease', fontFamily: 'monospace', fontWeight: 700 }}>
                  <span style={{ marginRight: 10, color: i === scanStep ? accentColor : 'rgba(255,255,255,0.15)' }}>{i === scanStep ? '▸' : '✓'}</span>
                  {step}
                  {i === scanStep && <span style={{ animation: 'advisorPulse 0.8s ease-in-out infinite' }}>_</span>}
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 12, fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: 3, fontFamily: 'monospace', fontWeight: 700 }}>
            {Math.round(scanProgress)}% COMPLETE
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════
  // RESULT PHASE
  // ══════════════════════════════════════════════════════════

  if (phase === 'result' && build) {
    var grade = build.loadout_grade || 'A';
    var gradeColor = GRADE_COLORS[grade] || '#ff8800';

    return (
      <div style={{ background: '#121418', minHeight: '100vh', color: '#fff', paddingTop: 48, paddingBottom: 80, fontFamily: 'system-ui, sans-serif' }}>

        <style>{`
          @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
          .result-block { animation: fadeUp 0.4s ease both; }
          .share-btn:hover { background: #1e2228 !important; }
        `}</style>

        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px 40px' }}>

          {/* ══ HEADER ═══════════════════════════════════════ */}
          <div className="result-block" style={{ marginBottom: 18, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 3, marginBottom: 4, fontWeight: 700, fontFamily: 'monospace', textTransform: 'uppercase' }}>DEXTER Build Advisor</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: accentColor, letterSpacing: 2, fontFamily: 'monospace' }}>
                {build.shell ? build.shell.toUpperCase() : ''} · {(PLAYSTYLES.find(function(p) { return p.id === playstyle; }) || {}).label} · {(RANK_TARGETS.find(function(r) { return r.id === rankTarget; }) || {}).label}
              </div>
            </div>
            <button onClick={function() { setPhase('input'); setBuild(null); }}
              style={{ padding: '8px 14px', background: 'transparent', border: '1px solid #22252e', borderRadius: 2, color: 'rgba(255,255,255,0.4)', fontSize: 10, letterSpacing: 2, cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit' }}>
              REBUILD
            </button>
          </div>

          {/* ══ MAIN BUILD CARD ═══════════════════════════════ */}
          <div className="result-block" style={{ animationDelay: '0.1s' }}>
            <div style={{ background: '#1a1d24', border: '1px solid #22252e', borderTop: '3px solid ' + accentColor, borderRadius: '0 0 3px 3px', overflow: 'hidden', marginBottom: 12 }}>

              {/* Top — grade + name */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: isMobile ? '20px' : '24px 28px', gap: 16, flexWrap: 'wrap', borderBottom: '1px solid #22252e' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 8, color: accentColor + 'aa', letterSpacing: 3, marginBottom: 8, fontWeight: 700, fontFamily: 'monospace' }}>DEXTER BUILD REPORT</div>
                  <div style={{ fontFamily: 'Orbitron, monospace', fontSize: isMobile ? 18 : 24, fontWeight: 900, color: '#fff', letterSpacing: 1, marginBottom: 8, wordBreak: 'break-word', lineHeight: 1.2 }}>
                    "{build.build_name || 'CUSTOM BUILD'}"
                  </div>
                  <div style={{ fontSize: isMobile ? 13 : 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>{build.playstyle_summary}</div>
                </div>

                <div style={{ textAlign: 'center', flexShrink: 0 }}>
                  <div style={{ background: gradeColor, color: gradeColor === '#ffd700' || gradeColor === '#ff8800' || gradeColor === '#00d4ff' ? '#000' : '#fff', fontSize: isMobile ? 44 : 56, fontWeight: 900, padding: isMobile ? '6px 20px' : '8px 24px', borderRadius: 2, fontFamily: 'Orbitron, monospace', lineHeight: 1, letterSpacing: 1 }}>
                    {grade}
                  </div>
                  <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, marginTop: 6, fontWeight: 700 }}>LOADOUT GRADE</div>
                  {build.ranked_viable && <div style={{ marginTop: 6, padding: '2px 8px', background: 'rgba(0,255,65,0.1)', border: '1px solid rgba(0,255,65,0.3)', borderRadius: 2, fontSize: 8, color: '#00ff41', letterSpacing: 2, fontWeight: 700, fontFamily: 'monospace' }}>RANKED VIABLE</div>}
                </div>
              </div>

              {/* Loadout grid */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: 1, background: '#22252e' }}>

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
                  {(build.mods || []).map(function(mod, i) {
                    return (
                      <div key={i} style={{ marginBottom: 8, display: 'flex', gap: 7 }}>
                        <div style={{ fontSize: 7, color: accentColor, background: accentColor + '14', border: '1px solid ' + accentColor + '30', borderRadius: 2, padding: '2px 5px', letterSpacing: 1, flexShrink: 0, fontWeight: 700, height: 'fit-content', marginTop: 1 }}>{mod.slot ? mod.slot.toUpperCase() : ''}</div>
                        <div>
                          <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.85)', letterSpacing: 0.5, marginBottom: 2 }}>{mod.name}</div>
                          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.45 }}>{mod.reason}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Cores */}
                <div style={{ padding: '18px 20px', background: '#1a1d24' }}>
                  <div style={{ fontSize: 9, color: accentColor, letterSpacing: 3, marginBottom: 12, fontWeight: 700, textTransform: 'uppercase', fontFamily: 'monospace' }}>Shell Cores</div>
                  {(build.cores || []).map(function(core, i) {
                    return (
                      <div key={i} style={{ marginBottom: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2, flexWrap: 'wrap' }}>
                          <div style={{ width: 4, height: 4, borderRadius: '50%', background: accentColor, flexShrink: 0 }} />
                          <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.85)', letterSpacing: 0.5 }}>{core.name}</div>
                          {core.ability_type && <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.25)', padding: '1px 4px', border: '1px solid #22252e', borderRadius: 2, letterSpacing: 1, fontWeight: 700 }}>{core.ability_type.toUpperCase()}</div>}
                        </div>
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', paddingLeft: 10, lineHeight: 1.45 }}>{core.reason}</div>
                      </div>
                    );
                  })}
                  {(!build.cores || build.cores.length === 0) && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', letterSpacing: 1, fontWeight: 700 }}>NO CORES SPECIFIED</div>}
                </div>

                {/* Implants */}
                <div style={{ padding: '18px 20px', background: '#1a1d24' }}>
                  <div style={{ fontSize: 9, color: '#9b5de5', letterSpacing: 3, marginBottom: 12, fontWeight: 700, textTransform: 'uppercase', fontFamily: 'monospace' }}>Implants</div>
                  {(build.implants || []).map(function(imp, i) {
                    return (
                      <div key={i} style={{ marginBottom: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2, flexWrap: 'wrap' }}>
                          <div style={{ fontSize: 7, color: '#9b5de5', background: 'rgba(155,93,229,0.1)', border: '1px solid rgba(155,93,229,0.25)', borderRadius: 2, padding: '2px 5px', letterSpacing: 1, flexShrink: 0, fontWeight: 700 }}>{imp.slot ? imp.slot.toUpperCase() : ''}</div>
                          <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.85)', letterSpacing: 0.5 }}>{imp.name}</div>
                        </div>
                        {imp.stat_change && <div style={{ fontSize: 10, color: '#9b5de5', letterSpacing: 1, paddingLeft: 10, marginBottom: 2, fontFamily: 'monospace', fontWeight: 700 }}>{imp.stat_change}</div>}
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', paddingLeft: 10, lineHeight: 1.45 }}>{imp.reason}</div>
                      </div>
                    );
                  })}
                  {(!build.implants || build.implants.length === 0) && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', letterSpacing: 1, fontWeight: 700 }}>NO IMPLANTS SPECIFIED</div>}
                </div>
              </div>

              {/* Strengths/weaknesses/ranked strip */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(220px, 1fr))', gap: 1, background: '#22252e', borderTop: '1px solid #22252e' }}>
                <div style={{ padding: '14px 20px', background: '#1a1d24' }}>
                  <div style={{ fontSize: 8, color: '#00ff41', letterSpacing: 3, marginBottom: 8, fontWeight: 700 }}>STRENGTHS</div>
                  {(build.strengths || []).map(function(s, i) {
                    return <div key={i} style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 4, display: 'flex', gap: 6, lineHeight: 1.5 }}><span style={{ color: '#00ff41', fontWeight: 900 }}>+</span>{s}</div>;
                  })}
                </div>
                <div style={{ padding: '14px 20px', background: '#1a1d24' }}>
                  <div style={{ fontSize: 8, color: '#ff2222', letterSpacing: 3, marginBottom: 8, fontWeight: 700 }}>WEAKNESSES</div>
                  {(build.weaknesses || []).map(function(w, i) {
                    return <div key={i} style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 4, display: 'flex', gap: 6, lineHeight: 1.5 }}><span style={{ color: '#ff2222', fontWeight: 900 }}>−</span>{w}</div>;
                  })}
                </div>
                {build.ranked_note && (
                  <div style={{ padding: '14px 20px', background: '#1a1d24' }}>
                    <div style={{ fontSize: 8, color: '#ffd700', letterSpacing: 3, marginBottom: 8, fontWeight: 700 }}>RANKED NOTE</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>{build.ranked_note}</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ══ DEXTER ANALYSIS ════════════════════════════════ */}
          <div className="result-block" style={{ animationDelay: '0.2s', marginBottom: 12 }}>
            <div style={{ background: '#1a1d24', border: '1px solid #22252e', borderLeft: '3px solid ' + accentColor, borderRadius: '0 3px 3px 0', padding: '18px 22px' }}>
              <div style={{ fontSize: 9, color: '#ff8800', letterSpacing: 3, marginBottom: 10, fontWeight: 700, textTransform: 'uppercase', fontFamily: 'monospace' }}>⬢ DEXTER Analysis</div>
              <div style={{ fontSize: isMobile ? 14 : 15, color: 'rgba(255,255,255,0.7)', lineHeight: 1.8 }}>{build.dexter_analysis}</div>
            </div>
          </div>

          {/* ══ FACTION ADVISOR CROSS-LINK ═════════════════════ */}
          <div className="result-block" style={{ animationDelay: '0.225s', marginBottom: 12 }}>
            <div style={{ background: '#1a1d24', border: '1px solid #22252e', borderLeft: '3px solid #ffd700', borderRadius: '0 3px 3px 0', padding: '18px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
              <div style={{ flex: 1, minWidth: 240 }}>
                <div style={{ fontSize: 9, color: '#ffd700', letterSpacing: 3, marginBottom: 8, fontWeight: 700, textTransform: 'uppercase', fontFamily: 'monospace' }}>◆ Plan Your Progression</div>
                <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 15, fontWeight: 800, color: '#fff', letterSpacing: 0.5, lineHeight: 1.2, marginBottom: 6 }}>
                  Many of the strongest items in Marathon are gated behind faction rank.
                </div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
                  The Faction Advisor maps your shell choice to the optimal grind path — so you know which faction to invest in first.
                </div>
              </div>
              <Link
                href={selectedShell ? '/factions?shell=' + selectedShell : '/factions'}
                style={{
                  padding:        '11px 20px',
                  background:     '#ffd700',
                  color:          '#000',
                  fontSize:       11,
                  fontWeight:     800,
                  letterSpacing:  1.5,
                  borderRadius:   2,
                  textDecoration: 'none',
                  fontFamily:     'monospace',
                  whiteSpace:     'nowrap',
                  flexShrink:     0,
                }}>
                OPEN FACTION ADVISOR →
              </Link>
            </div>
          </div>

          {/* ══ PERSONAL COACH TEASER (locked by flag) ═══════ */}
          {!monetizationOn && (
            <div className="result-block" style={{ animationDelay: '0.25s', marginBottom: 12 }}>
              <div style={{ position: 'relative', overflow: 'hidden', background: '#0e1014', border: '1px solid #22252e', borderRadius: 3 }}>
                <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(255,255,255,0.008) 8px, rgba(255,255,255,0.008) 9px)', pointerEvents: 'none' }} />
                <div style={{ height: 2, background: 'linear-gradient(90deg, transparent, rgba(155,93,229,0.5) 30%, rgba(155,93,229,0.5) 70%, transparent)' }} />
                <div style={{ position: 'relative', zIndex: 1, padding: '22px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                  <div style={{ flex: 1, minWidth: 260 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.15)' }}>🔒</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.45)', letterSpacing: 2, textTransform: 'uppercase' }}>This is a generic build.</span>
                      <span style={{ padding: '2px 7px', background: 'rgba(155,93,229,0.1)', border: '1px solid rgba(155,93,229,0.25)', borderRadius: 2, fontSize: 8, fontWeight: 700, letterSpacing: 2, color: 'rgba(155,93,229,0.6)', textTransform: 'uppercase' }}>Personal Coach · Coming Soon</span>
                    </div>
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', lineHeight: 1.7, margin: 0 }}>
                      The Personal Coach will analyze your actual gameplay — not archetypes — and engineer a build tuned to your hands, your map habits, and the fights you keep losing. Early Adopters get priority access.
                    </p>
                  </div>
                  {profilePrefill ? (
                    <div style={{ padding: '10px 14px', background: '#1a1d24', border: '1px solid #22252e', borderRadius: 2, textAlign: 'center', flexShrink: 0 }}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: '#00ff41', letterSpacing: 1.5, marginBottom: 2 }}>EARLY ADOPTER</div>
                      <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.25)' }}>Priority access confirmed</div>
                    </div>
                  ) : (
                    <Link href="/join" style={{ padding: '10px 18px', background: 'rgba(155,93,229,0.1)', border: '1px solid rgba(155,93,229,0.3)', borderRadius: 2, color: '#9b5de5', fontSize: 11, fontWeight: 800, letterSpacing: 1, textDecoration: 'none', flexShrink: 0, whiteSpace: 'nowrap' }}>
                      CLAIM EARLY ADOPTER →
                    </Link>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ══ SHARE ══════════════════════════════════════════ */}
          <div className="result-block" style={{ animationDelay: '0.3s' }}>
            <div style={{ background: '#1a1d24', border: '1px solid #22252e', borderTop: '2px solid ' + accentColor, borderRadius: '0 0 3px 3px', padding: '18px 22px' }}>
              <div style={{ marginBottom: 14, padding: '12px 14px', background: accentColor + '08', border: '1px solid ' + accentColor + '22', borderLeft: '3px solid ' + accentColor, borderRadius: '0 3px 3px 0' }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: accentColor, letterSpacing: 1.5, marginBottom: 4, fontFamily: 'Orbitron, monospace' }}>
                  ⬢ SHARE YOUR DEXTER BUILD
                </div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
                  Post your loadout card to X or Discord. 1200×630 — built to post.
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(140px, 1fr))', gap: 6 }}>
                <button className="share-btn" onClick={downloadShareCard}
                  style={{ padding: '12px 14px', background: accentColor, border: 'none', borderRadius: 2, color: '#000', fontSize: 11, fontWeight: 800, letterSpacing: 1, cursor: 'pointer', fontFamily: 'inherit' }}>
                  DOWNLOAD CARD
                </button>
                <button className="share-btn" onClick={shareToX}
                  style={{ padding: '12px 14px', background: 'transparent', border: '1px solid #22252e', borderRadius: 2, color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 700, letterSpacing: 1, cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.1s' }}>
                  POST TO X
                </button>
                <button className="share-btn" onClick={function() { navigator.clipboard.writeText('https://cyberneticpunks.com/advisor').catch(function() {}); }}
                  style={{ padding: '12px 14px', background: 'transparent', border: '1px solid rgba(88,101,242,0.35)', borderRadius: 2, color: '#5865f2', fontSize: 11, fontWeight: 700, letterSpacing: 1, cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.1s' }}>
                  COPY FOR DISCORD
                </button>
                <button className="share-btn" onClick={function() { setPhase('input'); setBuild(null); }}
                  style={{ padding: '12px 14px', background: 'transparent', border: '1px solid #22252e', borderRadius: 2, color: 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: 700, letterSpacing: 2, cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.1s' }}>
                  NEW BUILD
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
