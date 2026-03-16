'use client';
import { useState, useRef, useEffect } from 'react';

const SHELLS = [
  { name: 'Destroyer', symbol: 'X', color: '#ff3333', role: 'Frontline Combat',    desc: 'Thrusters. Aggression. Close-range dominance.' },
  { name: 'Vandal',    symbol: 'O', color: '#ff8800', role: 'Mobility Specialist', desc: 'Jump jets. Movement chaining. Chaos in motion.' },
  { name: 'Recon',     symbol: 'R', color: '#00f5ff', role: 'Intel Gatherer',      desc: 'Echo Pulse. Scanning. Information warfare.' },
  { name: 'Assassin',  symbol: 'A', color: '#cc44ff', role: 'Stealth Operator',    desc: 'Active Camo. Shadow Dive. Invisible kills.' },
  { name: 'Triage',    symbol: 'T', color: '#00ff88', role: 'Combat Support',      desc: 'Healing. Team sustain. Frontline medic.' },
  { name: 'Thief',     symbol: 'S', color: '#ffd700', role: 'Loot Specialist',     desc: 'X-Ray Visor. Pickpocket Drone. Extraction expert.' },
  { name: 'Rook',      symbol: 'K', color: '#aaaaaa', role: 'Anchor Tank',         desc: 'Fortify. Hold ground. Absorb punishment.' },
];

const EDITOR_SYMBOLS = { Destroyer: '[\u2B22]', Vandal: '[\u2B21]', Recon: '[\u25C8]', Assassin: '[\u25C7]', Triage: '[\u25CE]', Thief: '[\u2B20]', Rook: '[\u25A3]' };

const PLAYSTYLES = [
  { id: 'aggressive', label: 'AGGRESSIVE', desc: 'Push fights, create chaos, high TTK' },
  { id: 'balanced',   label: 'BALANCED',   desc: 'Flex between combat and extraction' },
  { id: 'extraction', label: 'EXTRACTION', desc: 'Loot fast, extract clean, stay alive' },
  { id: 'support',    label: 'SUPPORT',    desc: 'Enable your squad, control the field' },
];

const RANK_TARGETS = [
  { id: 'casual',   label: 'CASUAL',        color: '#555555', desc: 'Just having fun' },
  { id: 'bronze',   label: 'BRONZE-SILVER', color: '#cd7f32', desc: 'Learning ranked' },
  { id: 'gold',     label: 'GOLD',          color: '#ffd700', desc: 'Consistent performer' },
  { id: 'platinum', label: 'PLATINUM',      color: '#00f5ff', desc: 'High-level competitor' },
  { id: 'diamond',  label: 'DIAMOND PUSH',  color: '#cc44ff', desc: 'Top tier grind' },
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

const GRADE_COLORS = { S: '#ff0000', A: '#ff8800', B: '#ffd700', C: '#00f5ff', D: '#666666' };

const SCAN_STEPS = [
  'INITIALIZING DEXTER BUILD ENGINE...',
  'ACCESSING MOD DATABASE...',
  'SCANNING CORE REGISTRY...',
  'ANALYZING IMPLANT SYNERGIES...',
  'CROSS-REFERENCING META TIER DATA...',
  'CALCULATING WEAPON PAIRING EFFICIENCY...',
  'OPTIMIZING FOR TARGET RANK...',
  'DEXTER ENGINEERING LOADOUT...',
  'FINALIZING BUILD PARAMETERS...',
];

function generateShareCard(build, shellConfig) {
  var canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 630;
  var ctx = canvas.getContext('2d');
  var color = shellConfig.color;

  ctx.fillStyle = '#030303';
  ctx.fillRect(0, 0, 1200, 630);

  var grad = ctx.createRadialGradient(200, 315, 0, 200, 315, 600);
  grad.addColorStop(0, color + '22');
  grad.addColorStop(1, 'transparent');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1200, 630);

  var barGrad = ctx.createLinearGradient(0, 0, 1200, 0);
  barGrad.addColorStop(0, color);
  barGrad.addColorStop(0.5, color + '88');
  barGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = barGrad;
  ctx.fillRect(0, 0, 1200, 3);

  ctx.fillStyle = color + '55';
  ctx.fillRect(0, 0, 3, 630);

  ctx.font = 'bold 11px monospace';
  ctx.fillStyle = color + 'aa';
  ctx.textAlign = 'left';
  ctx.fillText('DEXTER BUILD ADVISOR  //  CYBERNETICPUNKS.COM', 48, 52);

  var grade = build.loadout_grade || 'A';
  ctx.font = 'bold 140px monospace';
  ctx.fillStyle = (GRADE_COLORS[grade] || '#ff8800') + 'dd';
  ctx.textAlign = 'right';
  ctx.fillText(grade, 1160, 145);

  ctx.font = 'bold 44px monospace';
  ctx.fillStyle = color;
  ctx.textAlign = 'left';
  ctx.fillText(build.shell ? build.shell.toUpperCase() : '', 48, 128);

  ctx.font = 'bold 26px monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.88)';
  ctx.fillText('"' + (build.build_name || 'CUSTOM BUILD') + '"', 48, 175);

  ctx.strokeStyle = color + '33';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(48, 200);
  ctx.lineTo(1152, 200);
  ctx.stroke();

  ctx.font = '14px monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.42)';
  var summary = build.playstyle_summary || '';
  var words = summary.split(' ');
  var line = '';
  var y = 228;
  for (var i = 0; i < words.length; i++) {
    var test = line + words[i] + ' ';
    if (ctx.measureText(test).width > 640 && line !== '') {
      ctx.fillText(line.trim(), 48, y);
      line = words[i] + ' ';
      y += 21;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line.trim(), 48, y);

  y = Math.max(y + 32, 302);

  ctx.font = 'bold 8px monospace';
  ctx.fillStyle = color + '88';
  ctx.fillText('WEAPONS', 48, y);
  y += 17;

  ctx.font = 'bold 16px monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  if (build.primary_weapon && build.primary_weapon.name) {
    ctx.fillText('> ' + build.primary_weapon.name, 48, y);
    y += 24;
  }
  if (build.secondary_weapon && build.secondary_weapon.name) {
    ctx.fillStyle = 'rgba(255,255,255,0.48)';
    ctx.fillText('> ' + build.secondary_weapon.name, 48, y);
    y += 24;
  }

  y += 8;
  ctx.font = 'bold 8px monospace';
  ctx.fillStyle = color + '88';
  ctx.fillText('MODS', 48, y);
  y += 16;
  ctx.font = '12px monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.52)';
  var mods = build.mods || [];
  for (var m = 0; m < Math.min(mods.length, 4); m++) {
    ctx.fillText('- ' + mods[m].name + '  [' + mods[m].slot + ']', 48, y);
    y += 18;
  }

  var ry = 302;
  ctx.font = 'bold 8px monospace';
  ctx.fillStyle = color + '88';
  ctx.textAlign = 'left';
  ctx.fillText('CORES', 700, ry);
  ry += 17;
  ctx.font = '12px monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.52)';
  var cores = build.cores || [];
  for (var c = 0; c < Math.min(cores.length, 3); c++) {
    ctx.fillText('- ' + cores[c].name, 700, ry);
    ry += 18;
  }

  ry += 12;
  ctx.font = 'bold 8px monospace';
  ctx.fillStyle = color + '88';
  ctx.fillText('IMPLANTS', 700, ry);
  ry += 17;
  ctx.font = '12px monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.52)';
  var implants = build.implants || [];
  for (var n = 0; n < Math.min(implants.length, 3); n++) {
    ctx.fillText('[' + implants[n].slot + '] ' + implants[n].name, 700, ry);
    ry += 18;
  }

  if (build.ranked_viable) {
    ry += 12;
    ctx.font = 'bold 9px monospace';
    ctx.fillStyle = '#00ff88';
    ctx.fillText('RANKED VIABLE', 700, ry);
    if (build.holotag_tier) {
      ry += 16;
      ctx.fillStyle = 'rgba(255,255,255,0.32)';
      ctx.font = '10px monospace';
      ctx.fillText('HOLOTAG: ' + build.holotag_tier.toUpperCase(), 700, ry);
    }
  }

  ctx.fillStyle = color + '18';
  ctx.fillRect(0, 590, 1200, 40);
  ctx.strokeStyle = color + '33';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 590);
  ctx.lineTo(1200, 590);
  ctx.stroke();

  ctx.font = 'bold 11px monospace';
  ctx.fillStyle = color + 'aa';
  ctx.textAlign = 'left';
  ctx.fillText('CYBERNETICPUNKS.COM', 48, 613);
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.textAlign = 'right';
  ctx.fillText('AUTONOMOUS MARATHON INTELLIGENCE  -  DEXTER BUILD ADVISOR', 1152, 613);

  return canvas.toDataURL('image/png');
}

function SectionHeader({ num, label, sub }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
      <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: '#ff8800', letterSpacing: 4, padding: '4px 10px', border: '1px solid #ff880030', borderRadius: 3 }}>{num}</div>
      <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.65)', letterSpacing: 2 }}>
        {label}
        {sub && <span style={{ color: 'rgba(255,255,255,0.18)', fontSize: 9, marginLeft: 8 }}>{sub}</span>}
      </div>
      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.04)' }} />
    </div>
  );
}

export default function AdvisorClient() {
  var [selectedShell, setSelectedShell] = useState(null);
  var [playstyle, setPlaystyle] = useState('balanced');
  var [rankTarget, setRankTarget] = useState('gold');
  var [weaponPref, setWeaponPref] = useState('');
  var [teamSize, setTeamSize] = useState('Solo');
  var [phase, setPhase] = useState('input');
  var [build, setBuild] = useState(null);
  var [error, setError] = useState(null);
  var [scanStep, setScanStep] = useState(0);
  var [scanProgress, setScanProgress] = useState(0);
  var scanRef = useRef(null);

  var shellConfig = SHELLS.find(function(s) { return s.name === selectedShell; });
  var accentColor = shellConfig ? shellConfig.color : '#ff8800';

  useEffect(function() {
    if (phase !== 'loading') return;
    var step = 0;
    var prog = 0;
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

  async function generateBuild() {
    if (!selectedShell) return;
    setPhase('loading');
    setScanStep(0);
    setScanProgress(0);
    setError(null);
    setBuild(null);

    try {
      var res = await fetch('/api/advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shell: selectedShell, playstyle: playstyle, rankTarget: rankTarget, weaponPreference: weaponPref, teamSize: teamSize }),
      });
      var json = await res.json();
      if (json.error) throw new Error(json.error);
      clearInterval(scanRef.current);
      setScanProgress(100);
      await new Promise(function(r) { setTimeout(r, 400); });
      setBuild(json.build);
      setPhase('result');
    } catch (err) {
      clearInterval(scanRef.current);
      setError(err.message);
      setPhase('input');
    }
  }

  function downloadShareCard() {
    if (!build || !shellConfig) return;
    var img = generateShareCard(build, shellConfig);
    var a = document.createElement('a');
    a.href = img;
    a.download = 'dexter-build-' + (build.shell || 'unknown').toLowerCase() + '-' + Date.now() + '.png';
    a.click();
  }

  function shareToX() {
    var shellName = build && build.shell ? build.shell : '';
    var buildName = build && build.build_name ? build.build_name : '';
    var gradeStr = build && build.loadout_grade ? build.loadout_grade : '';
    var pri = build && build.primary_weapon ? build.primary_weapon.name : '';
    var sec = build && build.secondary_weapon ? build.secondary_weapon.name : '';
    var text = 'Just got my ' + shellName + ' build engineered by DEXTER at CyberneticPunks\n\n"' + buildName + '" - Grade: ' + gradeStr + '\n' + pri + ' + ' + sec + '\n\ncyberneticpunks.com/advisor #Marathon #MarathonGame';
    window.open('https://twitter.com/intent/tweet?text=' + encodeURIComponent(text), '_blank');
  }

  // INPUT
  if (phase === 'input') {
    return (
      <div style={{ background: '#030303', minHeight: '100vh', color: '#fff', paddingTop: 96 }}>
        <style>{`
          @keyframes aPulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
          .sc { transition: all 0.25s ease; cursor: pointer; }
          .sc:hover { transform: translateY(-3px); }
          .ab { transition: all 0.2s ease; cursor: pointer; }
          .ab:hover { filter: brightness(1.15); }
        `}</style>

        <div style={{ textAlign: 'center', padding: '0 24px 52px', maxWidth: 820, margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '6px 18px', border: '1px solid #ff880033', borderRadius: 4, marginBottom: 22, fontFamily: 'Share Tech Mono, monospace', fontSize: 11, color: '#ff8800', letterSpacing: 3 }}>
            <span style={{ animation: 'aPulse 2s ease-in-out infinite' }}>[D]</span>
            DEXTER BUILD ADVISOR ONLINE
          </div>
          <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: 'clamp(24px, 5vw, 50px)', fontWeight: 900, letterSpacing: 4, lineHeight: 1.1, marginBottom: 14 }}>
            <span style={{ color: '#ff8800' }}>ENGINEER</span>{' '}
            <span style={{ color: 'rgba(255,255,255,0.88)' }}>YOUR BUILD</span>
          </h1>
          <p style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 16, color: 'rgba(255,255,255,0.28)', lineHeight: 1.6, maxWidth: 500, margin: '0 auto 12px' }}>
            Tell DEXTER your shell and playstyle. Get a complete loadout engineered from live meta data.
          </p>
          {error && (
            <div style={{ marginTop: 14, padding: '10px 20px', background: '#ff000012', border: '1px solid #ff000033', borderRadius: 6, fontFamily: 'Share Tech Mono, monospace', fontSize: 11, color: '#ff4444' }}>
              ERROR: {error}
            </div>
          )}
        </div>

        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 80px' }}>

          <div style={{ marginBottom: 40 }}>
            <SectionHeader num="01" label="SELECT YOUR RUNNER" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(142px, 1fr))', gap: 10 }}>
              {SHELLS.map(function(shell) {
                var isSel = selectedShell === shell.name;
                return (
                  <div key={shell.name} className="sc" onClick={function() { setSelectedShell(shell.name); }} style={{ background: isSel ? shell.color + '13' : '#0a0a0a', border: '1px solid ' + (isSel ? shell.color + '66' : 'rgba(255,255,255,0.06)'), borderTop: '3px solid ' + (isSel ? shell.color : 'rgba(255,255,255,0.04)'), borderRadius: 8, padding: '16px 13px', position: 'relative', boxShadow: isSel ? '0 0 22px ' + shell.color + '1e' : 'none' }}>
                    {isSel && <div style={{ position: 'absolute', top: 8, right: 8, width: 6, height: 6, borderRadius: '50%', background: shell.color, boxShadow: '0 0 8px ' + shell.color, animation: 'aPulse 1.5s ease-in-out infinite' }} />}
                    <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 18, fontWeight: 900, color: shell.color, opacity: isSel ? 1 : 0.3, marginBottom: 7, lineHeight: 1, letterSpacing: 1 }}>{EDITOR_SYMBOLS[shell.name] || shell.name[0]}</div>
                    <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 11, fontWeight: 700, color: isSel ? shell.color : 'rgba(255,255,255,0.62)', letterSpacing: 1, marginBottom: 3 }}>{shell.name.toUpperCase()}</div>
                    <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: 'rgba(255,255,255,0.18)', letterSpacing: 1, marginBottom: 6 }}>{shell.role.toUpperCase()}</div>
                    <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.16)', lineHeight: 1.4 }}>{shell.desc}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 32, marginBottom: 40 }}>

            <div>
              <SectionHeader num="02" label="PLAYSTYLE" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {PLAYSTYLES.map(function(p) {
                  var isSel = playstyle === p.id;
                  return (
                    <div key={p.id} className="ab" onClick={function() { setPlaystyle(p.id); }} style={{ background: isSel ? '#ff880011' : '#0a0a0a', border: '1px solid ' + (isSel ? '#ff880044' : 'rgba(255,255,255,0.06)'), borderRadius: 6, padding: '12px 13px' }}>
                      <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 9, fontWeight: 700, color: isSel ? '#ff8800' : 'rgba(255,255,255,0.38)', letterSpacing: 1, marginBottom: 4 }}>{p.label}</div>
                      <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 10, color: 'rgba(255,255,255,0.16)', lineHeight: 1.3 }}>{p.desc}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <SectionHeader num="03" label="RANK TARGET" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {RANK_TARGETS.map(function(r) {
                  var isSel = rankTarget === r.id;
                  return (
                    <div key={r.id} className="ab" onClick={function() { setRankTarget(r.id); }} style={{ background: isSel ? r.color + '0f' : '#0a0a0a', border: '1px solid ' + (isSel ? r.color + '44' : 'rgba(255,255,255,0.06)'), borderLeft: '3px solid ' + (isSel ? r.color : 'rgba(255,255,255,0.04)'), borderRadius: 5, padding: '10px 13px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 10, fontWeight: 700, color: isSel ? r.color : 'rgba(255,255,255,0.32)', letterSpacing: 1 }}>{r.label}</div>
                      <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.18)' }}>{r.desc}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
              <div>
                <SectionHeader num="04" label="WEAPON PREFERENCE" sub="OPTIONAL" />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {WEAPON_PREFS.map(function(w) {
                    var isSel = weaponPref === w.id;
                    return (
                      <button key={w.id} onClick={function() { setWeaponPref(w.id); }} style={{ padding: '6px 11px', background: isSel ? '#ff880011' : 'transparent', border: '1px solid ' + (isSel ? '#ff880044' : 'rgba(255,255,255,0.08)'), borderRadius: 4, color: isSel ? '#ff8800' : 'rgba(255,255,255,0.26)', fontFamily: 'Share Tech Mono, monospace', fontSize: 9, letterSpacing: 1, cursor: 'pointer' }}>{w.label}</button>
                    );
                  })}
                </div>
              </div>
              <div>
                <SectionHeader num="05" label="TEAM SIZE" />
                <div style={{ display: 'flex', gap: 10 }}>
                  {['Solo', 'Squad'].map(function(size) {
                    var isSel = teamSize === size;
                    return (
                      <button key={size} onClick={function() { setTeamSize(size); }} style={{ flex: 1, padding: '13px', background: isSel ? accentColor + '11' : '#0a0a0a', border: '1px solid ' + (isSel ? accentColor + '44' : 'rgba(255,255,255,0.06)'), borderRadius: 6, color: isSel ? accentColor : 'rgba(255,255,255,0.28)', fontFamily: 'Orbitron, monospace', fontSize: 12, fontWeight: 700, letterSpacing: 2, cursor: 'pointer' }}>{size.toUpperCase()}</button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            {selectedShell && shellConfig && (
              <div style={{ marginBottom: 12, fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: accentColor, letterSpacing: 2 }}>
                {selectedShell.toUpperCase()} &bull; {(PLAYSTYLES.find(function(p) { return p.id === playstyle; }) || {}).label} &bull; {(RANK_TARGETS.find(function(r) { return r.id === rankTarget; }) || {}).label}
              </div>
            )}
            <button onClick={generateBuild} disabled={!selectedShell} style={{ padding: '17px 56px', background: selectedShell ? accentColor + '13' : '#0d0d0d', border: '1px solid ' + (selectedShell ? accentColor + '55' : 'rgba(255,255,255,0.07)'), borderRadius: 6, color: selectedShell ? accentColor : 'rgba(255,255,255,0.16)', fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 900, letterSpacing: 4, cursor: selectedShell ? 'pointer' : 'not-allowed', boxShadow: selectedShell ? '0 0 26px ' + accentColor + '18' : 'none', transition: 'all 0.3s ease' }}>
              {selectedShell ? 'ANALYZE ' + selectedShell.toUpperCase() + ' BUILD' : 'SELECT A RUNNER FIRST'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // LOADING
  if (phase === 'loading') {
    return (
      <div style={{ background: '#030303', minHeight: '100vh', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', padding: '0 24px' }}>
        <style>{`
          @keyframes sp { 0%,100%{opacity:0.3} 50%{opacity:1} }
          @keyframes gf { 0%,100%{opacity:0.03} 50%{opacity:0.06} }
          @keyframes md { from{opacity:0;transform:translateY(-7px)} to{opacity:1;transform:translateY(0)} }
        `}</style>
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', backgroundImage: 'linear-gradient(' + accentColor + '18 1px, transparent 1px), linear-gradient(90deg, ' + accentColor + '18 1px, transparent 1px)', backgroundSize: '40px 40px', animation: 'gf 3s ease-in-out infinite' }} />
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 540, width: '100%' }}>
          <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 64, fontWeight: 900, color: accentColor, textShadow: '0 0 40px ' + accentColor + '66', marginBottom: 18, animation: 'sp 1.5s ease-in-out infinite' }}>
            {selectedShell ? selectedShell[0].toUpperCase() : 'D'}
          </div>
          <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 15, fontWeight: 900, letterSpacing: 4, color: accentColor, marginBottom: 5 }}>DEXTER ANALYZING</div>
          <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: 'rgba(255,255,255,0.22)', letterSpacing: 2, marginBottom: 32 }}>
            {selectedShell ? selectedShell.toUpperCase() : ''} &bull; {(PLAYSTYLES.find(function(p) { return p.id === playstyle; }) || {}).label}
          </div>
          <div style={{ width: '100%', height: 2, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden', marginBottom: 22 }}>
            <div style={{ height: '100%', width: scanProgress + '%', background: 'linear-gradient(90deg, ' + accentColor + '66, ' + accentColor + ')', borderRadius: 2, transition: 'width 0.3s ease', boxShadow: '0 0 8px ' + accentColor }} />
          </div>
          <div style={{ background: '#050505', border: '1px solid ' + accentColor + '18', borderRadius: 8, padding: '18px 22px', textAlign: 'left', minHeight: 170 }}>
            {SCAN_STEPS.slice(0, scanStep + 1).map(function(step, i) {
              return (
                <div key={i} style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: i === scanStep ? accentColor : 'rgba(255,255,255,0.16)', letterSpacing: 1, marginBottom: 6, lineHeight: 1.6, animation: 'md 0.3s ease' }}>
                  <span style={{ marginRight: 10, color: i === scanStep ? accentColor : 'rgba(255,255,255,0.1)' }}>{i === scanStep ? '>' : 'v'}</span>
                  {step}
                  {i === scanStep && <span style={{ animation: 'sp 0.8s ease-in-out infinite' }}>_</span>}
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 14, fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.1)', letterSpacing: 3 }}>{Math.round(scanProgress)}% COMPLETE</div>
        </div>
      </div>
    );
  }

  // RESULT
  if (phase === 'result' && build) {
    var grade = build.loadout_grade || 'A';
    var gradeColor = GRADE_COLORS[grade] || '#ff8800';

    return (
      <div style={{ background: '#030303', minHeight: '100vh', color: '#fff', paddingTop: 96 }}>
        <style>{`
          @keyframes rr { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
          @keyframes gg { 0%,100%{text-shadow:0 0 20px ${gradeColor}33} 50%{text-shadow:0 0 55px ${gradeColor}66} }
          .rs { animation: rr 0.5s ease both; }
          .sb { transition: all 0.2s ease; cursor: pointer; }
          .sb:hover { filter: brightness(1.12); transform: translateY(-1px); }
        `}</style>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 80px' }}>

          <div className="rs" style={{ animationDelay: '0s', marginBottom: 26, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div>
                <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.22)', letterSpacing: 3, marginBottom: 3 }}>DEXTER BUILD ADVISOR</div>
                <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 700, color: accentColor, letterSpacing: 2 }}>
                  {build.shell ? build.shell.toUpperCase() : ''} &bull; {(PLAYSTYLES.find(function(p) { return p.id === playstyle; }) || {}).label} &bull; {(RANK_TARGETS.find(function(r) { return r.id === rankTarget; }) || {}).label}
                </div>
              </div>
            </div>
            <button onClick={function() { setPhase('input'); setBuild(null); }} style={{ padding: '9px 18px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, color: 'rgba(255,255,255,0.28)', fontFamily: 'Share Tech Mono, monospace', fontSize: 9, letterSpacing: 2, cursor: 'pointer' }}>
              REBUILD
            </button>
          </div>

          <div className="rs" style={{ animationDelay: '0.1s' }}>
            <div style={{ background: 'linear-gradient(135deg, ' + accentColor + '07, #050505)', border: '1px solid ' + accentColor + '28', borderTop: '3px solid ' + accentColor, borderRadius: 12, overflow: 'hidden', marginBottom: 14, position: 'relative' }}>
              <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.05) 2px, rgba(0,0,0,0.05) 4px)' }} />

              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '26px 30px 20px', gap: 18, flexWrap: 'wrap', borderBottom: '1px solid ' + accentColor + '12', position: 'relative', zIndex: 1 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: accentColor + '66', letterSpacing: 3, marginBottom: 8 }}>DEXTER BUILD REPORT</div>
                  <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 'clamp(17px, 2.8vw, 28px)', fontWeight: 900, color: '#fff', letterSpacing: 2, marginBottom: 7 }}>"{build.build_name || 'CUSTOM BUILD'}"</div>
                  <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 15, color: 'rgba(255,255,255,0.42)', lineHeight: 1.55, maxWidth: 500 }}>{build.playstyle_summary}</div>
                </div>
                <div style={{ textAlign: 'center', flexShrink: 0 }}>
                  <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 72, fontWeight: 900, color: gradeColor, lineHeight: 1, animation: 'gg 3s ease-in-out infinite' }}>{grade}</div>
                  <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: 'rgba(255,255,255,0.16)', letterSpacing: 2, marginTop: 3 }}>LOADOUT GRADE</div>
                  {build.ranked_viable && <div style={{ marginTop: 8, padding: '3px 10px', background: '#00ff8811', border: '1px solid #00ff8833', borderRadius: 3, fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: '#00ff88', letterSpacing: 2 }}>RANKED VIABLE</div>}
                  {build.holotag_tier && <div style={{ marginTop: 4, fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: 'rgba(255,255,255,0.18)', letterSpacing: 1 }}>HOLOTAG: {build.holotag_tier.toUpperCase()}</div>}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(248px, 1fr))', position: 'relative', zIndex: 1 }}>

                <div style={{ padding: '20px 26px', borderRight: '1px solid ' + accentColor + '0d', borderBottom: '1px solid ' + accentColor + '0d' }}>
                  <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: accentColor + '66', letterSpacing: 3, marginBottom: 12 }}>WEAPONS</div>
                  {build.primary_weapon && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                        <div style={{ width: 3, height: 16, background: accentColor, borderRadius: 2, flexShrink: 0 }} />
                        <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 11, fontWeight: 700, color: '#fff', letterSpacing: 1 }}>{build.primary_weapon.name}</div>
                        <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 6, color: accentColor + '66', padding: '1px 4px', border: '1px solid ' + accentColor + '22', borderRadius: 2 }}>PRIMARY</div>
                      </div>
                      <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 10, color: 'rgba(255,255,255,0.24)', paddingLeft: 11 }}>{build.primary_weapon.reason}</div>
                    </div>
                  )}
                  {build.secondary_weapon && (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                        <div style={{ width: 3, height: 16, background: 'rgba(255,255,255,0.18)', borderRadius: 2, flexShrink: 0 }} />
                        <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.52)', letterSpacing: 1 }}>{build.secondary_weapon.name}</div>
                        <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 6, color: 'rgba(255,255,255,0.16)', padding: '1px 4px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 2 }}>SECONDARY</div>
                      </div>
                      <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 10, color: 'rgba(255,255,255,0.2)', paddingLeft: 11 }}>{build.secondary_weapon.reason}</div>
                    </div>
                  )}
                </div>

                <div style={{ padding: '20px 26px', borderBottom: '1px solid ' + accentColor + '0d' }}>
                  <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: accentColor + '66', letterSpacing: 3, marginBottom: 12 }}>WEAPON MODS</div>
                  {(build.mods || []).map(function(mod, i) {
                    return (
                      <div key={i} style={{ marginBottom: 9, display: 'flex', gap: 7 }}>
                        <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 6, color: accentColor, background: accentColor + '12', border: '1px solid ' + accentColor + '22', borderRadius: 3, padding: '2px 4px', letterSpacing: 1, flexShrink: 0, height: 'fit-content', marginTop: 1 }}>{mod.slot ? mod.slot.toUpperCase() : ''}</div>
                        <div>
                          <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.72)', letterSpacing: 1, marginBottom: 1 }}>{mod.name}</div>
                          <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>{mod.reason}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ padding: '20px 26px', borderRight: '1px solid ' + accentColor + '0d' }}>
                  <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: accentColor + '66', letterSpacing: 3, marginBottom: 12 }}>SHELL CORES</div>
                  {(build.cores || []).map(function(core, i) {
                    return (
                      <div key={i} style={{ marginBottom: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                          <div style={{ width: 4, height: 4, borderRadius: '50%', background: accentColor, flexShrink: 0 }} />
                          <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.78)', letterSpacing: 1 }}>{core.name}</div>
                          {core.ability_type && <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 6, color: 'rgba(255,255,255,0.16)', padding: '1px 3px', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2 }}>{core.ability_type.toUpperCase()}</div>}
                        </div>
                        <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 10, color: 'rgba(255,255,255,0.2)', paddingLeft: 10 }}>{core.reason}</div>
                      </div>
                    );
                  })}
                  {(!build.cores || build.cores.length === 0) && <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: 'rgba(255,255,255,0.12)', letterSpacing: 1 }}>NO CORES SPECIFIED</div>}
                </div>

                <div style={{ padding: '20px 26px' }}>
                  <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: '#9b5de566', letterSpacing: 3, marginBottom: 12 }}>IMPLANTS</div>
                  {(build.implants || []).map(function(imp, i) {
                    return (
                      <div key={i} style={{ marginBottom: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                          <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 6, color: '#9b5de5', background: '#9b5de511', border: '1px solid #9b5de522', borderRadius: 3, padding: '1px 3px', letterSpacing: 1, flexShrink: 0 }}>{imp.slot ? imp.slot.toUpperCase() : ''}</div>
                          <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.78)', letterSpacing: 1 }}>{imp.name}</div>
                        </div>
                        {imp.stat_change && <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: '#9b5de5', letterSpacing: 1, paddingLeft: 10, marginBottom: 1 }}>{imp.stat_change}</div>}
                        <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 10, color: 'rgba(255,255,255,0.2)', paddingLeft: 10 }}>{imp.reason}</div>
                      </div>
                    );
                  })}
                  {(!build.implants || build.implants.length === 0) && <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: 'rgba(255,255,255,0.12)', letterSpacing: 1 }}>NO IMPLANTS SPECIFIED</div>}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', borderTop: '1px solid ' + accentColor + '12', position: 'relative', zIndex: 1 }}>
                <div style={{ padding: '16px 26px', borderRight: '1px solid ' + accentColor + '0d' }}>
                  <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: '#00ff88', letterSpacing: 3, marginBottom: 9 }}>STRENGTHS</div>
                  {(build.strengths || []).map(function(s, i) { return <div key={i} style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.42)', marginBottom: 3, display: 'flex', gap: 6 }}><span style={{ color: '#00ff88' }}>+</span>{s}</div>; })}
                </div>
                <div style={{ padding: '16px 26px', borderRight: '1px solid ' + accentColor + '0d' }}>
                  <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: '#ff4444', letterSpacing: 3, marginBottom: 9 }}>WEAKNESSES</div>
                  {(build.weaknesses || []).map(function(w, i) { return <div key={i} style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.42)', marginBottom: 3, display: 'flex', gap: 6 }}><span style={{ color: '#ff4444' }}>-</span>{w}</div>; })}
                </div>
                {build.ranked_note && (
                  <div style={{ padding: '16px 26px' }}>
                    <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: '#ffd700', letterSpacing: 3, marginBottom: 9 }}>RANKED NOTE</div>
                    <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.36)', lineHeight: 1.55 }}>{build.ranked_note}</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="rs" style={{ animationDelay: '0.2s', marginBottom: 14 }}>
            <div style={{ background: '#050505', border: '1px solid ' + accentColor + '12', borderLeft: '3px solid ' + accentColor, borderRadius: 8, padding: '20px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 11 }}>
                <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: '#ff8800', letterSpacing: 3 }}>[D] DEXTER ANALYSIS</div>
              </div>
              <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.46)', lineHeight: 1.8 }}>{build.dexter_analysis}</div>
            </div>
          </div>

          <div className="rs" style={{ animationDelay: '0.3s' }}>
            <div style={{ background: '#050505', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 8, padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.55)', letterSpacing: 2, marginBottom: 4 }}>SHARE YOUR BUILD</div>
                <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>Download a 1200x630 share card or post directly to X.</div>
              </div>
              <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
                <button className="sb" onClick={downloadShareCard} style={{ padding: '10px 20px', background: accentColor + '11', border: '1px solid ' + accentColor + '44', borderRadius: 5, color: accentColor, fontFamily: 'Orbitron, monospace', fontSize: 10, fontWeight: 700, letterSpacing: 2 }}>DOWNLOAD CARD</button>
                <button className="sb" onClick={shareToX} style={{ padding: '10px 20px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 5, color: 'rgba(255,255,255,0.45)', fontFamily: 'Orbitron, monospace', fontSize: 10, fontWeight: 700, letterSpacing: 2 }}>POST TO X</button>
                <button className="sb" onClick={function() { setPhase('input'); setBuild(null); }} style={{ padding: '10px 20px', background: 'transparent', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 5, color: 'rgba(255,255,255,0.22)', fontFamily: 'Share Tech Mono, monospace', fontSize: 9, letterSpacing: 2 }}>NEW BUILD</button>
              </div>
            </div>
          </div>

        </div>
      </div>
    );
  }

  return null;
}
