'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const SHELLS = [
  { name: 'Assassin', sym: '◈', color: '#ff0000' },
  { name: 'Destroyer', sym: '⬡', color: '#ff6600' },
  { name: 'Recon', sym: '⬢', color: '#00f5ff' },
  { name: 'Rook', sym: '◇', color: '#888888', banned: true },
  { name: 'Thief', sym: '◎', color: '#9b5de5' },
  { name: 'Triage', sym: '◈', color: '#00ff88' },
  { name: 'Vandal', sym: '⬡', color: '#ffe600' },
];

const RARITIES = ['Standard', 'Enhanced', 'Deluxe', 'Superior', 'Prestige'];

const TIER_COLORS = { S: '#00ff88', A: '#00f5ff', B: '#ff8800', C: '#ff4444', D: '#888' };

function tierColor(t) { return TIER_COLORS[t] || '#888'; }

const S = {
  screen: { minHeight: '100vh', background: '#030303', display: 'flex', fontFamily: "'Rajdhani',sans-serif", color: '#fff', position: 'relative' },
  grid: { position: 'fixed', inset: 0, backgroundImage: 'linear-gradient(rgba(0,245,255,0.035) 1px,transparent 1px),linear-gradient(90deg,rgba(0,245,255,0.035) 1px,transparent 1px)', backgroundSize: '48px 48px', pointerEvents: 'none', zIndex: 0 },
  sidebar: { width: '200px', flexShrink: 0, background: 'rgba(0,245,255,0.015)', borderRight: '1px solid rgba(0,245,255,0.07)', padding: '36px 22px', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 },
  main: { flex: 1, padding: '44px 52px', display: 'flex', flexDirection: 'column', overflowY: 'auto', position: 'relative', zIndex: 1 },
  label: { fontFamily: "'Share Tech Mono',monospace", fontSize: '8px', letterSpacing: '3px', color: 'rgba(255,255,255,0.2)', marginBottom: '10px' },
  h2: { fontFamily: "'Orbitron',sans-serif", fontSize: '20px', letterSpacing: '3px', fontWeight: 700, marginBottom: '10px', color: '#fff', lineHeight: 1.3 },
  why: { color: 'rgba(255,255,255,0.3)', fontSize: '10px', letterSpacing: '1px', lineHeight: 1.9, marginTop: '6px', marginBottom: '28px', fontFamily: "'Share Tech Mono',monospace", borderLeft: '2px solid rgba(0,245,255,0.2)', paddingLeft: '12px' },
  opt: { border: '1px solid rgba(255,255,255,0.07)', borderRadius: '3px', padding: '14px 18px', cursor: 'pointer', marginBottom: '9px', background: 'rgba(255,255,255,0.01)', display: 'flex', alignItems: 'center', gap: '14px' },
  optSel: { border: '1px solid rgba(0,245,255,0.7)', background: 'rgba(0,245,255,0.06)' },
  gridOpt: { border: '1px solid rgba(255,255,255,0.07)', borderRadius: '3px', padding: '16px', cursor: 'pointer', background: 'rgba(255,255,255,0.01)' },
  gridOptSel: { border: '1px solid rgba(0,245,255,0.6)', background: 'rgba(0,245,255,0.05)' },
  pbtn: { border: '1px solid rgba(0,245,255,0.4)', color: '#00f5ff', background: 'rgba(0,245,255,0.06)', fontFamily: "'Share Tech Mono',monospace", fontSize: '10px', letterSpacing: '3px', padding: '11px 24px', cursor: 'pointer', borderRadius: '3px' },
  nbtn: { background: 'none', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.4)', fontFamily: "'Share Tech Mono',monospace", fontSize: '10px', letterSpacing: '3px', padding: '11px 22px', cursor: 'pointer', borderRadius: '3px' },
  gbtn: { background: 'rgba(0,245,255,0.07)', border: '1px solid rgba(0,245,255,0.45)', color: '#00f5ff', fontFamily: "'Share Tech Mono',monospace", fontSize: '11px', letterSpacing: '4px', padding: '14px 42px', cursor: 'pointer', borderRadius: '3px' },
  dot: (done, active) => ({ width: '7px', height: '7px', borderRadius: '50%', background: done ? '#00f5ff' : active ? '#00f5ff' : 'rgba(255,255,255,0.12)', boxShadow: active ? '0 0 6px rgba(0,245,255,0.7)' : 'none' }),
  select: { width: '100%', background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontFamily: "'Share Tech Mono',monospace", fontSize: '9px', padding: '8px 10px', borderRadius: '2px', marginBottom: '6px' },
};

function Sidebar({ step }) {
  const sectionA = step <= 4;
  const sectionB = step >= 5 && step <= 7;
  const sectionC = step === 8;
  return (
    <div style={S.sidebar}>
      <div style={{ fontFamily: "'Share Tech Mono',monospace", color: 'rgba(0,245,255,0.5)', fontSize: '8px', letterSpacing: '4px', marginBottom: '32px' }}>RUNNER INTAKE</div>
      <div style={{ marginBottom: '24px', opacity: sectionA ? 1 : 0.5 }}>
        <div style={{ ...S.label, color: sectionA ? '#00f5ff' : 'rgba(255,255,255,0.3)', marginBottom: '10px' }}>A · IDENTITY</div>
        <div style={{ display: 'flex', gap: '5px' }}>
          {[1,2,3,4].map(i => <div key={i} style={S.dot(step > i, step === i)} />)}
        </div>
      </div>
      <div style={{ marginBottom: '24px', opacity: sectionB ? 1 : 0.35 }}>
        <div style={{ ...S.label, color: sectionB ? '#00f5ff' : 'rgba(255,255,255,0.3)', marginBottom: '10px' }}>B · LOADOUT</div>
        <div style={{ display: 'flex', gap: '5px' }}>
          {[5,6,7].map(i => <div key={i} style={S.dot(step > i, step === i)} />)}
        </div>
      </div>
      <div style={{ opacity: sectionC ? 1 : 0.35 }}>
        <div style={{ ...S.label, color: sectionC ? '#00f5ff' : 'rgba(255,255,255,0.3)', marginBottom: '10px' }}>C · CALIBRATION</div>
        <div style={{ display: 'flex', gap: '5px' }}>
          {[8].map(i => <div key={i} style={S.dot(step > i, step === i)} />)}
        </div>
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ fontFamily: "'Share Tech Mono',monospace", color: 'rgba(255,255,255,0.15)', fontSize: '8px', lineHeight: 2 }}>
        EDITORS ANALYZING
        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
          <span style={{ color: 'rgba(255,136,0,0.5)' }}>⬢</span>
          <span style={{ color: 'rgba(0,245,255,0.5)' }}>⬡</span>
          <span style={{ color: 'rgba(155,93,229,0.5)' }}>◎</span>
        </div>
      </div>
    </div>
  );
}

function Nav({ step, onBack, onNext, canNext, label }) {
  return (
    <div style={{ display: 'flex', gap: '12px', marginTop: 'auto', paddingTop: '32px' }}>
      {step > 1 && <button style={S.nbtn} onClick={onBack}>← BACK</button>}
      <button style={canNext ? (step === 8 ? S.gbtn : S.pbtn) : { ...S.pbtn, opacity: 0.4, cursor: 'not-allowed' }} onClick={canNext ? onNext : undefined}>
        {label || 'CONTINUE →'}
      </button>
    </div>
  );
}

export default function IntakeClient({ playerName, weapons, metaTiers, mods, cores, implants }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [answers, setAnswers] = useState({
    motivation: null, playstyle: null, engagement_depth: 7,
    zones: [], squad_context: null, shell: null,
    primary_weapon: null, secondary_weapon: null,
    mod_slot_1: null, mod_slot_1_rarity: 'Standard',
    mod_slot_2: null, mod_slot_2_rarity: 'Standard',
    mod_slot_3: null, mod_slot_3_rarity: 'Standard',
    core_slot_1: null, core_slot_1_rarity: 'Standard',
    core_slot_2: null, core_slot_2_rarity: 'Standard',
    implant_1: null, implant_2: null, implant_3: null,
    hours_per_week: null, focus_areas: [],
  });

  const set = (key, val) => setAnswers(a => ({ ...a, [key]: val }));

  const toggleZone = (z) => setAnswers(a => {
    const zones = a.zones.includes(z) ? a.zones.filter(x => x !== z) : (a.zones.length < 2 ? [...a.zones, z] : a.zones);
    return { ...a, zones };
  });

  const toggleFocus = (f) => setAnswers(a => {
    const fa = a.focus_areas.includes(f) ? a.focus_areas.filter(x => x !== f) : (a.focus_areas.length < 3 ? [...a.focus_areas, f] : a.focus_areas);
    return { ...a, focus_areas: fa };
  });

  const getShellTier = (name) => {
    const t = metaTiers.find(m => m.name?.toLowerCase() === name?.toLowerCase());
    return t?.tier || 'B';
  };

  const next = () => setStep(s => s + 1);
  const back = () => setStep(s => s - 1);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(answers),
      });
      if (res.ok) {
        router.push('/join/processing');
      } else {
        setSubmitting(false);
        alert('Something went wrong. Please try again.');
      }
    } catch {
      setSubmitting(false);
      alert('Network error. Please try again.');
    }
  };

  const MOTIVATIONS = [
    { key: 'EXTRACTION_RATE', sym: '◈', color: '#ff0000', label: 'EXTRACTION RATE', sub: 'Getting out alive with loot, every run' },
    { key: 'BUILD_POWER', sym: '⬢', color: '#ff8800', label: 'BUILD POWER', sub: 'Running the strongest possible loadout' },
    { key: 'RANKED_CLIMB', sym: '⬡', color: '#00f5ff', label: 'RANKED CLIMB', sub: 'Holotag progression, competitive standing' },
    { key: 'INTEL_GATHERING', sym: '◇', color: '#00ff88', label: 'INTEL GATHERING', sub: 'Understanding the meta, theory-crafting builds' },
    { key: 'STORY_IMMERSION', sym: '◎', color: '#9b5de5', label: 'STORY & IMMERSION', sub: 'Lore, faction reputation, world exploration' },
  ];

  const PLAYSTYLES = [
    { key: 'AGGRESSIVE', color: '#ff0000', sub: 'Push immediately. Dictate the engagement before they can react.' },
    { key: 'CALCULATED', color: '#00f5ff', sub: 'Wait for information. Pick the right moment. Never commit without advantage.' },
    { key: 'EVASIVE', color: '#00ff88', sub: 'Disengage, reposition, reset. The fight you avoid is the one you win.' },
    { key: 'ADAPTIVE', color: '#9b5de5', sub: 'No fixed pattern. Every fight is a new problem to solve.' },
  ];

  const ZONES = ['Perimeter', 'Dire Marsh', 'Outpost', 'Cryo Archive'];
  const SQUADS = [
    { key: 'SOLO', sub: 'Running alone every run' },
    { key: 'DUO', sub: 'Regular duo partner' },
    { key: 'TRIO', sub: 'Full crew, coordinated' },
    { key: 'MIXED', sub: 'Solo sometimes, crew sometimes' },
  ];
  const HOURS = [
    { key: 'CASUAL', label: 'CASUAL', sub: '1–5 hours' },
    { key: 'REGULAR', label: 'REGULAR', sub: '6–15 hours' },
    { key: 'DEDICATED', label: 'DEDICATED', sub: '16–30 hours' },
    { key: 'HARDCORE', label: 'HARDCORE', sub: '30+ hours' },
  ];
  const FOCUS = [
    { key: 'FIX_MY_BUILD', label: 'FIX MY BUILD', sub: 'Find what\'s wrong and tell me exactly' },
    { key: 'META_POSITIONING', label: 'META POSITIONING', sub: 'Am I running the right shell this week?' },
    { key: 'RANKED_PREP', label: 'RANKED PREP', sub: 'Optimize specifically for competitive play' },
    { key: 'EXPLAIN_WHY', label: 'EXPLAIN THE WHY', sub: 'I want to understand, not just be told' },
    { key: 'COUNTER_PLAY', label: 'COUNTER PLAY', sub: 'What beats me and how do I beat it?' },
  ];

  const weaponList = weapons.length > 0 ? weapons.map(w => w.name) : ['Pulsar', 'Vandal Rifle', 'Shortcut', 'Marathon Longbow', 'Covert SMG', 'Breach Shotgun'];
  const modList = ['Not sure', ...(mods.length > 0 ? mods.map(m => m.name) : ['Kinetic Suppressor', 'AP Round', 'Phantom Round', 'Phantom Step', 'Stability Brace', 'Extended Mag', 'Velocity Mag', 'Hollow Point'])];
  const coreList = ['Not sure', ...(cores.length > 0 ? cores.map(c => c.name) : ['Velocity Core', 'Reflex Core', 'Overdrive Core', 'Shield Core', 'Ability Core'])];
  const implantList = ['Not sure', ...(implants.length > 0 ? implants.map(i => i.name) : ['Velocity Boost', 'Impact Implant', 'Phantom Step', 'Shield Implant', 'Ability Amp'])];

  const SHELL_NOTE = {
    Assassin: 'Most players run Assassin wrong — without AP Round in mod slot 1 the damage profile falls short. Your audit will address this.',
    Destroyer: 'Destroyer underperforms when played as a brawler. Its real value is sustained pressure and point-holding. DEXTER has opinions.',
    Recon: 'S-tier for good reason. Ability timing creates information advantages most players never fully exploit. DEXTER will push your ceiling.',
    Rook: 'Rook is banned from Ranked. In casual play it\'s a legitimate B-tier support shell. Your audit will flag ranked implications.',
    Thief: 'Thief rewards patience and target selection. It underperforms badly for aggressive players. DEXTER will cross-reference your playstyle.',
    Triage: 'Triage is crew-dependent to reach its ceiling. Solo players get ~70% of its value. DEXTER will account for your squad context.',
    Vandal: 'Most players read Vandal as slow. With Velocity Core + Phantom Step it produces the highest effective mobility in the game. Non-obvious. DEXTER will address this.',
  };

  const renderStep = () => {
    switch (step) {

      case 1:
        return (
          <>
            <div style={S.label}>SECTION A · RUNNER IDENTITY · 01 / 08</div>
            <h2 style={S.h2}>WHEN YOU DEPLOY,<br/>WHAT MATTERS MOST?</h2>
            <p style={S.why}>Calibrates which editors lead your audit and what they prioritize. Your answer shapes the entire tone of the report — this is not cosmetic.</p>
            {MOTIVATIONS.map(m => (
              <div key={m.key} style={{ ...S.opt, ...(answers.motivation === m.key ? { borderColor: m.color, background: `rgba(${m.color === '#ff0000' ? '255,0,0' : m.color === '#ff8800' ? '255,136,0' : m.color === '#00f5ff' ? '0,245,255' : m.color === '#00ff88' ? '0,255,136' : '155,93,229'},0.06)` } : {}) }}
                onClick={() => set('motivation', m.key)}>
                <span style={{ color: m.color, fontSize: '20px', flexShrink: 0 }}>{m.sym}</span>
                <div>
                  <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: '10px', letterSpacing: '2px', color: '#fff', marginBottom: '4px' }}>{m.label}</div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>{m.sub}</div>
                </div>
              </div>
            ))}
            <Nav step={step} onBack={back} onNext={next} canNext={!!answers.motivation} />
          </>
        );

      case 2:
        return (
          <>
            <div style={S.label}>SECTION A · RUNNER IDENTITY · 02 / 08</div>
            <h2 style={S.h2}>WHEN YOU MEET ANOTHER<br/>RUNNER — YOUR INSTINCT?</h2>
            <p style={S.why}>CIPHER uses this to flag patterns where your shell and weapon choices support or contradict your actual engagement style. Mismatch here is the most common source of underperformance.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {PLAYSTYLES.map(p => (
                <div key={p.key} style={{ ...S.gridOpt, ...(answers.playstyle === p.key ? { borderColor: p.color, background: 'rgba(255,255,255,0.04)' } : {}) }}
                  onClick={() => set('playstyle', p.key)}>
                  <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: '10px', color: p.color, letterSpacing: '3px', marginBottom: '8px' }}>{p.key}</div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.7 }}>{p.sub}</div>
                </div>
              ))}
            </div>
            <Nav step={step} onBack={back} onNext={next} canNext={!!answers.playstyle} />
          </>
        );

      case 3:
        return (
          <>
            <div style={S.label}>SECTION A · RUNNER IDENTITY · 03 / 08</div>
            <h2 style={S.h2}>HOW DEEPLY DO YOU ENGAGE<br/>WITH THE BUILD SYSTEM?</h2>
            <p style={S.why}>Sets the vocabulary level of your audit. A 2 gets plain language. A 9 gets full stat analysis. DEXTER calibrates to your level.</p>
            <div style={{ marginBottom: '36px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: '8px', color: 'rgba(255,255,255,0.3)' }}>I EQUIP WHAT DROPS</span>
                <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: '24px', color: '#00f5ff', fontWeight: 700 }}>{answers.engagement_depth}</span>
                <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: '8px', color: 'rgba(255,255,255,0.3)' }}>I THEORY-CRAFT BUILDS</span>
              </div>
              <input type="range" min="1" max="10" value={answers.engagement_depth}
                onChange={e => set('engagement_depth', parseInt(e.target.value))}
                style={{ width: '100%', accentColor: '#00f5ff' }} />
            </div>
            <h2 style={{ ...S.h2, marginTop: '8px' }}>WHERE DO YOU SPEND<br/>MOST OF YOUR TIME?</h2>
            <p style={S.why}>NEXUS weights meta recommendations per zone. Select up to 2.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '9px' }}>
              {ZONES.map(z => (
                <div key={z} style={{ ...S.gridOpt, ...(answers.zones.includes(z) ? S.gridOptSel : {}) }}
                  onClick={() => toggleZone(z)}>
                  <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: '10px', color: '#00f5ff', letterSpacing: '2px', marginBottom: '4px' }}>{z.toUpperCase()}</div>
                  {z === 'Cryo Archive' && <div style={{ fontSize: '10px', color: 'rgba(255,136,0,0.7)' }}>Weekends · Lv.25 required</div>}
                </div>
              ))}
            </div>
            <Nav step={step} onBack={back} onNext={next} canNext={answers.zones.length > 0} />
          </>
        );

      case 4:
        return (
          <>
            <div style={S.label}>SECTION A · RUNNER IDENTITY · 04 / 08</div>
            <h2 style={S.h2}>HOW DO YOU<br/>USUALLY DEPLOY?</h2>
            <p style={S.why}>Solo Recon builds are very different from Recon in a 3-stack. NEXUS and DEXTER both factor this heavily into their recommendations.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {SQUADS.map(s => (
                <div key={s.key} style={{ ...S.gridOpt, ...(answers.squad_context === s.key ? S.gridOptSel : {}) }}
                  onClick={() => set('squad_context', s.key)}>
                  <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: '10px', color: '#00f5ff', letterSpacing: '2px', marginBottom: '6px' }}>{s.key}</div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>{s.sub}</div>
                </div>
              ))}
            </div>
            <Nav step={step} onBack={back} onNext={next} canNext={!!answers.squad_context} />
          </>
        );

      case 5:
        return (
          <>
            <div style={S.label}>SECTION B · YOUR LOADOUT · 05 / 08</div>
            <h2 style={S.h2}>SELECT YOUR<br/>RUNNER SHELL</h2>
            <p style={S.why}>Every recommendation DEXTER makes is anchored to your shell's specific mechanics and ability timings. Live meta tier shown — updated this cycle by NEXUS.</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
              {SHELLS.map(sh => {
                const tier = getShellTier(sh.name);
                const sel = answers.shell === sh.name;
                return (
                  <div key={sh.name}
                    onClick={() => set('shell', sh.name)}
                    style={{
                      flex: '1', minWidth: '90px', border: `1px solid ${sel ? sh.color : 'rgba(255,255,255,0.07)'}`,
                      borderRadius: '3px', padding: '14px 8px', cursor: 'pointer', textAlign: 'center',
                      background: sel ? `rgba(255,255,255,0.03)` : 'rgba(255,255,255,0.01)',
                      boxShadow: sel ? `0 0 20px rgba(255,255,255,0.05)` : 'none',
                    }}>
                    <div style={{ color: sh.color, fontSize: '22px', marginBottom: '8px' }}>{sh.sym}</div>
                    <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: '8px', letterSpacing: '2px', color: '#fff', marginBottom: '8px' }}>{sh.name.toUpperCase()}</div>
                    <div style={{
                      display: 'inline-block', border: `1px solid ${tierColor(tier)}`,
                      color: tierColor(tier), fontSize: '7px', letterSpacing: '1px',
                      padding: '2px 7px', borderRadius: '2px', fontFamily: "'Share Tech Mono',monospace",
                      background: `rgba(255,255,255,0.02)`,
                    }}>
                      {sh.banned ? 'BANNED*' : `${tier}-TIER`}
                    </div>
                  </div>
                );
              })}
            </div>
            {answers.shell && (
              <div style={{ background: 'rgba(0,245,255,0.03)', border: '1px solid rgba(0,245,255,0.1)', borderRadius: '3px', padding: '14px 16px', marginBottom: '12px' }}>
                <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: '8px', color: '#ff8800', letterSpacing: '2px', marginBottom: '6px' }}>⬢ DEXTER NOTE</div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.9 }}>{SHELL_NOTE[answers.shell]}</div>
              </div>
            )}
            {answers.shell === 'Rook' && (
              <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: '8px', color: 'rgba(255,100,100,0.6)', letterSpacing: '1px' }}>* ROOK IS BANNED FROM RANKED. YOUR AUDIT WILL FLAG THIS IF RANKED MATTERS TO YOU.</div>
            )}
            <Nav step={step} onBack={back} onNext={next} canNext={!!answers.shell} />
          </>
        );

      case 6:
        return (
          <>
            <div style={S.label}>SECTION B · YOUR LOADOUT · 06 / 08</div>
            <h2 style={S.h2}>YOUR WEAPONS</h2>
            <p style={S.why}>DEXTER analyzes both weapons simultaneously against your shell's mechanics. If unsure, select the closest match — he'll flag the issue either way.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: '8px', letterSpacing: '3px', color: 'rgba(255,255,255,0.3)', marginBottom: '10px' }}>PRIMARY WEAPON</div>
                <select style={S.select} value={answers.primary_weapon || ''} onChange={e => set('primary_weapon', e.target.value || null)}>
                  <option value="">Select primary weapon</option>
                  {weaponList.map(w => <option key={w} value={w}>{w}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: '8px', letterSpacing: '3px', color: 'rgba(255,255,255,0.3)', marginBottom: '10px' }}>SECONDARY WEAPON</div>
                <select style={S.select} value={answers.secondary_weapon || ''} onChange={e => set('secondary_weapon', e.target.value || null)}>
                  <option value="">Select secondary weapon</option>
                  {weaponList.map(w => <option key={w} value={w}>{w}</option>)}
                </select>
              </div>
            </div>
            {answers.primary_weapon && answers.secondary_weapon && (
              <div style={{ background: 'rgba(0,245,255,0.03)', border: '1px solid rgba(0,245,255,0.1)', borderRadius: '3px', padding: '14px 16px', marginTop: '16px' }}>
                <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: '8px', color: '#ff8800', letterSpacing: '2px', marginBottom: '6px' }}>⬢ DEXTER WILL ANALYZE THIS COMBO AGAINST YOUR {(answers.shell || 'SELECTED').toUpperCase()} SHELL</div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.8 }}>{answers.primary_weapon} + {answers.secondary_weapon} — synergy analysis will appear in your full audit.</div>
              </div>
            )}
            <Nav step={step} onBack={back} onNext={next} canNext={!!answers.primary_weapon} />
          </>
        );

      case 7:
        return (
          <>
            <div style={S.label}>SECTION B · YOUR LOADOUT · 07 / 08</div>
            <h2 style={S.h2}>MODS, CORES<br/>&amp; IMPLANTS</h2>
            <p style={S.why}>Empty slots are automatically flagged — every gap is a lost opportunity. Select "Not sure" if you don't know a slot. DEXTER will address it directly in your audit. Rarity matters significantly — DEXTER will flag Standard-rarity items where upgrading changes your build meaningfully.</p>

            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: '8px', color: 'rgba(255,136,0,0.6)', letterSpacing: '3px', marginBottom: '12px' }}>MOD SLOTS</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                {[1,2,3].map(i => (
                  <div key={i} style={{ border: '1px solid rgba(255,136,0,0.12)', borderRadius: '3px', padding: '12px' }}>
                    <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: '7px', color: 'rgba(255,136,0,0.5)', letterSpacing: '2px', marginBottom: '8px' }}>MOD SLOT {i}</div>
                    <select style={S.select} value={answers[`mod_slot_${i}`] || ''} onChange={e => set(`mod_slot_${i}`, e.target.value || null)}>
                      <option value="">Empty slot</option>
                      {modList.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    {answers[`mod_slot_${i}`] && answers[`mod_slot_${i}`] !== 'Not sure' && (
                      <select style={{ ...S.select, marginBottom: 0 }} value={answers[`mod_slot_${i}_rarity`]} onChange={e => set(`mod_slot_${i}_rarity`, e.target.value)}>
                        {RARITIES.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: '8px', color: 'rgba(0,245,255,0.5)', letterSpacing: '3px', marginBottom: '12px' }}>CORE SLOTS</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {[1,2].map(i => (
                  <div key={i} style={{ border: '1px solid rgba(0,245,255,0.1)', borderRadius: '3px', padding: '12px' }}>
                    <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: '7px', color: 'rgba(0,245,255,0.4)', letterSpacing: '2px', marginBottom: '8px' }}>CORE SLOT {i}</div>
                    <select style={S.select} value={answers[`core_slot_${i}`] || ''} onChange={e => set(`core_slot_${i}`, e.target.value || null)}>
                      <option value="">Empty slot</option>
                      {coreList.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    {answers[`core_slot_${i}`] && answers[`core_slot_${i}`] !== 'Not sure' && (
                      <select style={{ ...S.select, marginBottom: 0 }} value={answers[`core_slot_${i}_rarity`]} onChange={e => set(`core_slot_${i}_rarity`, e.target.value)}>
                        {RARITIES.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: '8px', color: 'rgba(155,93,229,0.5)', letterSpacing: '3px', marginBottom: '12px' }}>IMPLANT SLOTS</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                {[1,2,3].map(i => (
                  <div key={i} style={{ border: '1px solid rgba(155,93,229,0.1)', borderRadius: '3px', padding: '12px' }}>
                    <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: '7px', color: 'rgba(155,93,229,0.4)', letterSpacing: '2px', marginBottom: '8px' }}>IMPLANT {i}</div>
                    <select style={{ ...S.select, marginBottom: 0 }} value={answers[`implant_${i}`] || ''} onChange={e => set(`implant_${i}`, e.target.value || null)}>
                      <option value="">Empty slot</option>
                      {implantList.map(imp => <option key={imp} value={imp}>{imp}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            <Nav step={step} onBack={back} onNext={next} canNext={true} />
          </>
        );

      case 8:
        return (
          <>
            <div style={S.label}>SECTION C · CALIBRATION · 08 / 08</div>
            <h2 style={S.h2}>FINAL CALIBRATION</h2>
            <p style={S.why}>Two questions that set the depth and focus of your audit. Specific answers produce specific coaching.</p>

            <div style={{ marginBottom: '32px' }}>
              <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: '9px', letterSpacing: '2px', color: 'rgba(255,255,255,0.35)', marginBottom: '14px' }}>HOW MANY HOURS PER WEEK DO YOU PLAY MARATHON?</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '9px' }}>
                {HOURS.map(h => (
                  <div key={h.key} style={{ ...S.gridOpt, ...(answers.hours_per_week === h.key ? S.gridOptSel : {}) }}
                    onClick={() => set('hours_per_week', h.key)}>
                    <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: '10px', color: '#00f5ff', letterSpacing: '2px', marginBottom: '4px' }}>{h.label}</div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>{h.sub}</div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: '9px', letterSpacing: '2px', color: 'rgba(255,255,255,0.35)', marginBottom: '14px' }}>WHAT SHOULD OUR EDITORS FOCUS ON? <span style={{ color: 'rgba(255,255,255,0.2)' }}>SELECT UP TO 3</span></div>
              {FOCUS.map(f => (
                <div key={f.key} style={{ ...S.opt, ...(answers.focus_areas.includes(f.key) ? S.optSel : {}) }}
                  onClick={() => toggleFocus(f.key)}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: '10px', color: '#fff', letterSpacing: '1px' }}>{f.label}</div>
                  </div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>{f.sub}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: 'auto', paddingTop: '32px' }}>
              <button style={S.nbtn} onClick={back}>← BACK</button>
              <button
                style={{ ...S.gbtn, opacity: (answers.hours_per_week && answers.focus_areas.length > 0 && !submitting) ? 1 : 0.4, cursor: (answers.hours_per_week && answers.focus_areas.length > 0 && !submitting) ? 'pointer' : 'not-allowed' }}
                onClick={answers.hours_per_week && answers.focus_areas.length > 0 && !submitting ? handleSubmit : undefined}
              >
                {submitting ? '● SUBMITTING...' : 'SUBMIT TO EDITORS →'}
              </button>
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div style={S.screen}>
      <div style={S.grid} />
      <Sidebar step={step} />
      <div style={S.main}>
        {renderStep()}
      </div>
    </div>
  );
}
