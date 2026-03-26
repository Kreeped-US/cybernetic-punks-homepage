'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const SHELLS = [
  { name: 'Assassin', sym: '◈', color: '#cc44ff' },
  { name: 'Destroyer', sym: '⬡', color: '#ff3333' },
  { name: 'Recon', sym: '⬢', color: '#00f5ff' },
  { name: 'Rook', sym: '◇', color: '#555555', banned: true },
  { name: 'Thief', sym: '◎', color: '#ffd700' },
  { name: 'Triage', sym: '◈', color: '#00ff88' },
  { name: 'Vandal', sym: '⬡', color: '#ff8800' },
];

const RARITIES = ['Standard', 'Enhanced', 'Deluxe', 'Superior', 'Prestige'];

const TIER_COLORS = { S: '#00ff88', A: '#00f5ff', B: '#ff8800', C: '#888', D: '#555' };
function tierColor(t) { return TIER_COLORS[t] || '#555'; }

const SHELL_NOTE = {
  Assassin: 'Most players run Assassin wrong — without AP Round in mod slot 1 the damage profile falls well short of its potential. Your audit will address this.',
  Destroyer: 'Destroyer underperforms when played as a brawler. Its real value is sustained pressure and point-holding. DEXTER has strong opinions about the standard Destroyer build.',
  Recon: 'S-tier for good reason. Ability timing creates information advantages most players never fully exploit. DEXTER will push your ceiling here.',
  Rook: 'Rook is banned from Ranked. In casual play it\'s a legitimate B-tier support shell. Your audit will flag ranked implications if that matters to you.',
  Thief: 'Thief rewards patience and precise target selection. It underperforms badly for aggressive players. DEXTER will cross-reference your stated playstyle.',
  Triage: 'Triage is crew-dependent to reach its ceiling. Solo players get roughly 70% of its value. DEXTER will account for your squad context.',
  Vandal: 'Most players read Vandal as slow. With Velocity Core + Phantom Step it produces the highest effective mobility in the game. Non-obvious. DEXTER will address this in detail.',
};

function Divider({ label }) {
  return (
    <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.15)', letterSpacing: 6, textAlign: 'center', margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
      {label}
      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
    </div>
  );
}

function Dot({ done, active }) {
  return (
    <div style={{
      width: 7, height: 7, borderRadius: '50%',
      background: done ? '#00f5ff' : active ? '#00f5ff' : 'rgba(255,255,255,0.1)',
      boxShadow: active ? '0 0 6px rgba(0,245,255,0.7)' : 'none',
      flexShrink: 0,
    }} />
  );
}

function Sidebar({ step }) {
  const doneA = step > 4;
  const activeA = step <= 4;
  const doneB = step > 7;
  const activeB = step >= 5 && step <= 7;
  const activeC = step === 8;

  return (
    <div style={{
      width: 200, flexShrink: 0,
      background: 'rgba(0,245,255,0.015)',
      borderRight: '1px solid rgba(0,245,255,0.07)',
      padding: '36px 22px',
      display: 'flex', flexDirection: 'column',
      position: 'relative', zIndex: 1,
    }}>
      <div style={{ fontFamily: 'Share Tech Mono, monospace', color: 'rgba(0,245,255,0.5)', fontSize: 8, letterSpacing: 4, marginBottom: 32 }}>RUNNER INTAKE</div>

      <div style={{ marginBottom: 28, opacity: activeA || doneA ? 1 : 0.35 }}>
        <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, letterSpacing: 3, color: activeA ? '#00f5ff' : doneA ? 'rgba(0,245,255,0.4)' : 'rgba(255,255,255,0.2)', marginBottom: 10 }}>A · IDENTITY</div>
        <div style={{ display: 'flex', gap: 5 }}>
          {[1,2,3,4].map(i => <Dot key={i} done={step > i} active={step === i} />)}
        </div>
      </div>

      <div style={{ marginBottom: 28, opacity: activeB || doneB ? 1 : 0.35 }}>
        <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, letterSpacing: 3, color: activeB ? '#00f5ff' : doneB ? 'rgba(0,245,255,0.4)' : 'rgba(255,255,255,0.2)', marginBottom: 10 }}>B · LOADOUT</div>
        <div style={{ display: 'flex', gap: 5 }}>
          {[5,6,7].map(i => <Dot key={i} done={step > i} active={step === i} />)}
        </div>
      </div>

      <div style={{ opacity: activeC ? 1 : 0.35 }}>
        <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, letterSpacing: 3, color: activeC ? '#00f5ff' : 'rgba(255,255,255,0.2)', marginBottom: 10 }}>C · CALIBRATION</div>
        <div style={{ display: 'flex', gap: 5 }}>
          <Dot done={false} active={activeC} />
        </div>
      </div>

      <div style={{ flex: 1 }} />

      <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.12)', lineHeight: 2 }}>
        EDITORS STANDING BY
        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
          <span style={{ color: 'rgba(255,136,0,0.5)', fontSize: 14 }}>⬢</span>
          <span style={{ color: 'rgba(0,245,255,0.5)', fontSize: 14 }}>⬡</span>
          <span style={{ color: 'rgba(155,93,229,0.5)', fontSize: 14 }}>◎</span>
        </div>
      </div>
    </div>
  );
}

const BTN_CONTINUE = {
  border: '1px solid rgba(0,245,255,0.4)',
  color: '#00f5ff',
  background: 'rgba(0,245,255,0.06)',
  fontFamily: 'Share Tech Mono, monospace',
  fontSize: 10, letterSpacing: 3,
  padding: '11px 28px',
  cursor: 'pointer', borderRadius: 5,
};
const BTN_BACK = {
  background: 'none',
  border: '1px solid rgba(255,255,255,0.1)',
  color: 'rgba(255,255,255,0.35)',
  fontFamily: 'Share Tech Mono, monospace',
  fontSize: 10, letterSpacing: 3,
  padding: '11px 22px',
  cursor: 'pointer', borderRadius: 5,
};
const BTN_SUBMIT = {
  background: 'rgba(0,245,255,0.07)',
  border: '1px solid rgba(0,245,255,0.45)',
  color: '#00f5ff',
  fontFamily: 'Share Tech Mono, monospace',
  fontSize: 11, letterSpacing: 4,
  padding: '14px 42px',
  cursor: 'pointer', borderRadius: 5,
};

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

  const set = (k, v) => setAnswers(a => ({ ...a, [k]: v }));

  const toggleZone = (z) => setAnswers(a => {
    const zones = a.zones.includes(z)
      ? a.zones.filter(x => x !== z)
      : a.zones.length < 2 ? [...a.zones, z] : a.zones;
    return { ...a, zones };
  });

  const toggleFocus = (f) => setAnswers(a => {
    const fa = a.focus_areas.includes(f)
      ? a.focus_areas.filter(x => x !== f)
      : a.focus_areas.length < 3 ? [...a.focus_areas, f] : a.focus_areas;
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

  const weaponList = weapons.length > 0
    ? weapons.map(w => w.name)
    : ['Pulsar', 'Vandal Rifle', 'Shortcut', 'Marathon Longbow', 'Covert SMG', 'Breach Shotgun'];
  const modList = ['Not sure', ...(mods.length > 0 ? mods.map(m => m.name) : ['Kinetic Suppressor', 'AP Round', 'Phantom Round', 'Phantom Step', 'Stability Brace', 'Extended Mag', 'Velocity Mag'])];
  const coreList = ['Not sure', ...(cores.length > 0 ? cores.map(c => c.name) : ['Velocity Core', 'Reflex Core', 'Overdrive Core', 'Shield Core', 'Ability Core'])];
  const implantList = ['Not sure', ...(implants.length > 0 ? implants.map(i => i.name) : ['Velocity Boost', 'Impact Implant', 'Phantom Step', 'Shield Implant', 'Ability Amp'])];

  const MOTIVATIONS = [
    { key: 'EXTRACTION_RATE', sym: '◈', color: '#ff0000', label: 'EXTRACTION RATE', sub: 'Getting out alive with loot, every run' },
    { key: 'BUILD_POWER', sym: '⬢', color: '#ff8800', label: 'BUILD POWER', sub: 'Running the strongest possible loadout' },
    { key: 'RANKED_CLIMB', sym: '⬡', color: '#00f5ff', label: 'RANKED CLIMB', sub: 'Holotag progression, competitive standing' },
    { key: 'INTEL_GATHERING', sym: '◇', color: '#00ff88', label: 'INTEL GATHERING', sub: 'Understanding the meta, theory-crafting' },
    { key: 'STORY_IMMERSION', sym: '◎', color: '#9b5de5', label: 'STORY & IMMERSION', sub: 'Lore, faction reputation, world exploration' },
  ];

  const PLAYSTYLES = [
    { key: 'AGGRESSIVE', color: '#ff0000', sub: 'Push immediately. Dictate the engagement before they can react.' },
    { key: 'CALCULATED', color: '#00f5ff', sub: 'Wait for information. Pick the right moment. Never commit without advantage.' },
    { key: 'EVASIVE', color: '#00ff88', sub: 'Disengage, reposition, reset. The fight you avoid is the one you win.' },
    { key: 'ADAPTIVE', color: '#9b5de5', sub: 'No fixed pattern. Every fight is a new problem to solve in the moment.' },
  ];

  const ZONES = [
    { name: 'Perimeter', note: 'Entry zone · lighter threats · learning runs' },
    { name: 'Dire Marsh', note: 'Mid-tier · environmental hazards · prime PvP ground' },
    { name: 'Outpost', note: 'High-value contracts · coordinated teams required' },
    { name: 'Cryo Archive', note: 'End-game · weekends only · Level 25 + all factions', accent: '#ff8800' },
  ];

  const SQUADS = [
    { key: 'SOLO', sub: 'Running alone every run' },
    { key: 'DUO', sub: 'Regular duo partner' },
    { key: 'TRIO', sub: 'Full crew, coordinated' },
    { key: 'MIXED', sub: 'Solo sometimes, crew sometimes' },
  ];

  const HOURS = [
    { key: 'CASUAL', label: 'CASUAL', sub: '1–5 hours per week' },
    { key: 'REGULAR', label: 'REGULAR', sub: '6–15 hours per week' },
    { key: 'DEDICATED', label: 'DEDICATED', sub: '16–30 hours per week' },
    { key: 'HARDCORE', label: 'HARDCORE', sub: '30+ hours per week' },
  ];

  const FOCUS = [
    { key: 'FIX_MY_BUILD', label: 'FIX MY BUILD', sub: 'Find what\'s wrong and tell me exactly what to change' },
    { key: 'META_POSITIONING', label: 'META POSITIONING', sub: 'Am I running the right shell this week?' },
    { key: 'RANKED_PREP', label: 'RANKED PREP', sub: 'Optimize specifically for competitive play' },
    { key: 'EXPLAIN_WHY', label: 'EXPLAIN THE WHY', sub: 'I want to understand, not just be told what to do' },
    { key: 'COUNTER_PLAY', label: 'COUNTER PLAY', sub: 'What beats me and how do I beat it?' },
  ];

  const card = (selected, color) => ({
    background: selected ? (color ? `rgba(255,255,255,0.04)` : 'rgba(0,245,255,0.04)') : '#0a0a0a',
    border: `1px solid ${selected ? (color || 'rgba(0,245,255,0.45)') : 'rgba(255,255,255,0.07)'}`,
    borderLeft: `3px solid ${selected ? (color || '#00f5ff') : 'rgba(255,255,255,0.07)'}`,
    borderRadius: 5,
    padding: '14px 18px',
    cursor: 'pointer',
    marginBottom: 6,
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    transition: 'all 0.12s',
  });

  const gridCard = (selected, color) => ({
    background: selected ? 'rgba(255,255,255,0.04)' : '#0a0a0a',
    border: `1px solid ${selected ? (color || 'rgba(0,245,255,0.45)') : 'rgba(255,255,255,0.07)'}`,
    borderTop: `2px solid ${selected ? (color || '#00f5ff') : 'rgba(255,255,255,0.07)'}`,
    borderRadius: 5,
    padding: '16px',
    cursor: 'pointer',
    transition: 'all 0.12s',
  });

  const WHY = ({ text }) => (
    <div style={{
      fontFamily: 'Rajdhani, sans-serif',
      fontSize: 13,
      color: 'rgba(255,255,255,0.38)',
      lineHeight: 1.7,
      marginBottom: 24,
      borderLeft: '3px solid rgba(0,245,255,0.2)',
      paddingLeft: 12,
    }}>{text}</div>
  );

  const SECTION_LABEL = ({ text }) => (
    <div style={{
      fontFamily: 'Share Tech Mono, monospace',
      fontSize: 8,
      color: 'rgba(255,255,255,0.2)',
      letterSpacing: 3,
      marginBottom: 20,
    }}>{text}</div>
  );

  const H2 = ({ children }) => (
    <div style={{
      fontFamily: 'Orbitron, monospace',
      fontSize: 20,
      fontWeight: 900,
      letterSpacing: 2,
      color: '#fff',
      lineHeight: 1.25,
      marginBottom: 12,
    }}>{children}</div>
  );

  const selectStyle = {
    width: '100%',
    background: '#0a0a0a',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#fff',
    fontFamily: 'Share Tech Mono, monospace',
    fontSize: 10,
    padding: '9px 12px',
    borderRadius: 4,
    marginBottom: 6,
    outline: 'none',
  };

  const renderStep = () => {
    switch (step) {

      case 1: return (
        <>
          <SECTION_LABEL text="SECTION A · RUNNER IDENTITY · 01 / 08" />
          <H2>WHEN YOU DEPLOY,<br/>WHAT MATTERS MOST?</H2>
          <WHY text="Calibrates which editors lead your audit and what they prioritize. Your answer shapes the entire tone and focus of the report — this is not cosmetic." />
          {MOTIVATIONS.map(m => (
            <div key={m.key} style={card(answers.motivation === m.key, m.color)} onClick={() => set('motivation', m.key)}>
              <span style={{ color: m.color, fontSize: 20, flexShrink: 0 }}>{m.sym}</span>
              <div>
                <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 11, fontWeight: 700, color: '#fff', letterSpacing: 1, marginBottom: 4 }}>{m.label}</div>
                <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>{m.sub}</div>
              </div>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
            <button style={BTN_CONTINUE} onClick={next} disabled={!answers.motivation}>CONTINUE →</button>
          </div>
        </>
      );

      case 2: return (
        <>
          <SECTION_LABEL text="SECTION A · RUNNER IDENTITY · 02 / 08" />
          <H2>WHEN YOU MEET ANOTHER<br/>RUNNER — YOUR INSTINCT?</H2>
          <WHY text="CIPHER uses this to flag patterns where your shell and weapon choices support or contradict your actual engagement style. Mismatch here is the most common source of underperformance." />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {PLAYSTYLES.map(p => (
              <div key={p.key} style={gridCard(answers.playstyle === p.key, p.color)} onClick={() => set('playstyle', p.key)}>
                <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 11, fontWeight: 700, color: answers.playstyle === p.key ? p.color : 'rgba(255,255,255,0.7)', letterSpacing: 2, marginBottom: 8 }}>{p.key}</div>
                <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>{p.sub}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
            <button style={BTN_BACK} onClick={back}>← BACK</button>
            <button style={BTN_CONTINUE} onClick={next} disabled={!answers.playstyle}>CONTINUE →</button>
          </div>
        </>
      );

      case 3: return (
        <>
          <SECTION_LABEL text="SECTION A · RUNNER IDENTITY · 03 / 08" />
          <H2>HOW DEEPLY DO YOU ENGAGE<br/>WITH THE BUILD SYSTEM?</H2>
          <WHY text="Sets the vocabulary level of your audit. A 2 gets plain language. A 9 gets full stat analysis and mechanical specifics. DEXTER calibrates to your level." />
          <div style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: '22px', marginBottom: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.25)' }}>I EQUIP WHAT DROPS</span>
              <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 28, color: '#00f5ff', fontWeight: 900 }}>{answers.engagement_depth}</span>
              <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.25)' }}>I THEORY-CRAFT BUILDS</span>
            </div>
            <input type="range" min="1" max="10" value={answers.engagement_depth}
              onChange={e => set('engagement_depth', parseInt(e.target.value))}
              style={{ width: '100%', accentColor: '#00f5ff', height: 4 }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              {[1,2,3,4,5,6,7,8,9,10].map(n => (
                <span key={n} style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: answers.engagement_depth === n ? '#00f5ff' : 'rgba(255,255,255,0.15)' }}>{n}</span>
              ))}
            </div>
          </div>

          <Divider label="WHERE DO YOU SPEND MOST OF YOUR TIME" />
          <WHY text="NEXUS weights meta recommendations per zone. Builds that excel in Dire Marsh differ significantly from Outpost or Cryo Archive. Select up to 2." />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {ZONES.map(z => (
              <div key={z.name} style={gridCard(answers.zones.includes(z.name), z.accent)} onClick={() => toggleZone(z.name)}>
                <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 11, fontWeight: 700, color: answers.zones.includes(z.name) ? (z.accent || '#00f5ff') : 'rgba(255,255,255,0.7)', letterSpacing: 1, marginBottom: 5 }}>{z.name.toUpperCase()}</div>
                <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.38)', lineHeight: 1.5 }}>{z.note}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
            <button style={BTN_BACK} onClick={back}>← BACK</button>
            <button style={BTN_CONTINUE} onClick={next} disabled={answers.zones.length === 0}>CONTINUE →</button>
          </div>
        </>
      );

      case 4: return (
        <>
          <SECTION_LABEL text="SECTION A · RUNNER IDENTITY · 04 / 08" />
          <H2>HOW DO YOU<br/>USUALLY DEPLOY?</H2>
          <WHY text="Solo Recon builds differ fundamentally from Recon in a 3-stack. NEXUS and DEXTER both factor squad context heavily — some shells lose most of their value without crew." />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {SQUADS.map(s => (
              <div key={s.key} style={gridCard(answers.squad_context === s.key)} onClick={() => set('squad_context', s.key)}>
                <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 12, fontWeight: 700, color: answers.squad_context === s.key ? '#00f5ff' : 'rgba(255,255,255,0.7)', letterSpacing: 2, marginBottom: 6 }}>{s.key}</div>
                <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>{s.sub}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
            <button style={BTN_BACK} onClick={back}>← BACK</button>
            <button style={BTN_CONTINUE} onClick={next} disabled={!answers.squad_context}>CONTINUE →</button>
          </div>
        </>
      );

      case 5: return (
        <>
          <SECTION_LABEL text="SECTION B · YOUR LOADOUT · 05 / 08" />
          <H2>SELECT YOUR<br/>RUNNER SHELL</H2>
          <WHY text="Every recommendation DEXTER makes is anchored to your shell's specific mechanics, ability timings, and stat profile. Live meta tier shown — updated each cycle by NEXUS." />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {SHELLS.map(sh => {
              const tier = getShellTier(sh.name);
              const sel = answers.shell === sh.name;
              return (
                <div key={sh.name} onClick={() => set('shell', sh.name)} style={{
                  flex: '1', minWidth: 88,
                  background: sel ? 'rgba(255,255,255,0.04)' : '#0a0a0a',
                  border: `1px solid ${sel ? sh.color : 'rgba(255,255,255,0.06)'}`,
                  borderTop: `2px solid ${sel ? sh.color : 'rgba(255,255,255,0.06)'}`,
                  borderRadius: 5, padding: '14px 8px', cursor: 'pointer', textAlign: 'center',
                }}>
                  <div style={{ color: sh.color, fontSize: 22, marginBottom: 8 }}>{sh.sym}</div>
                  <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, letterSpacing: 2, color: sel ? '#fff' : 'rgba(255,255,255,0.55)', marginBottom: 8 }}>{sh.name.toUpperCase()}</div>
                  <span style={{
                    display: 'inline-block',
                    border: `1px solid ${sh.banned ? 'rgba(255,0,0,0.3)' : tierColor(tier) + '40'}`,
                    color: sh.banned ? '#ff4444' : tierColor(tier),
                    fontSize: 7, letterSpacing: 1,
                    padding: '2px 7px', borderRadius: 3,
                    fontFamily: 'Share Tech Mono, monospace',
                    background: sh.banned ? 'rgba(255,0,0,0.06)' : 'rgba(255,255,255,0.02)',
                  }}>
                    {sh.banned ? 'BANNED*' : `${tier}-TIER`}
                  </span>
                </div>
              );
            })}
          </div>

          {answers.shell && (
            <div style={{ background: '#0a0a0a', border: '1px solid rgba(255,136,0,0.15)', borderLeft: '3px solid rgba(255,136,0,0.5)', borderRadius: 5, padding: '14px 18px', marginBottom: 10 }}>
              <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: '#ff8800', letterSpacing: 2, marginBottom: 6 }}>⬢ DEXTER NOTE</div>
              <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7 }}>{SHELL_NOTE[answers.shell]}</div>
            </div>
          )}
          {answers.shell === 'Rook' && (
            <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,80,80,0.6)', letterSpacing: 1, marginBottom: 12 }}>* ROOK IS BANNED FROM RANKED. YOUR AUDIT WILL FLAG THIS IF COMPETITIVE PLAY IS A FOCUS AREA.</div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button style={BTN_BACK} onClick={back}>← BACK</button>
            <button style={BTN_CONTINUE} onClick={next} disabled={!answers.shell}>CONTINUE →</button>
          </div>
        </>
      );

      case 6: return (
        <>
          <SECTION_LABEL text="SECTION B · YOUR LOADOUT · 06 / 08" />
          <H2>YOUR WEAPONS</H2>
          <WHY text="DEXTER analyzes both weapons simultaneously against your shell's mechanics. If you're unsure, select the closest match — he'll flag the issue either way. Weapon synergy with your shell is one of the highest-value areas of the audit." />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, letterSpacing: 3, color: 'rgba(255,255,255,0.25)', marginBottom: 10 }}>PRIMARY WEAPON</div>
              <select style={selectStyle} value={answers.primary_weapon || ''} onChange={e => set('primary_weapon', e.target.value || null)}>
                <option value="">Select primary weapon</option>
                {weaponList.map(w => <option key={w} value={w}>{w}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, letterSpacing: 3, color: 'rgba(255,255,255,0.25)', marginBottom: 10 }}>SECONDARY WEAPON</div>
              <select style={selectStyle} value={answers.secondary_weapon || ''} onChange={e => set('secondary_weapon', e.target.value || null)}>
                <option value="">Select secondary weapon</option>
                {weaponList.map(w => <option key={w} value={w}>{w}</option>)}
              </select>
            </div>
          </div>
          {answers.primary_weapon && answers.secondary_weapon && (
            <div style={{ background: '#0a0a0a', border: '1px solid rgba(0,245,255,0.12)', borderLeft: '3px solid rgba(0,245,255,0.4)', borderRadius: 5, padding: '14px 18px' }}>
              <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: '#ff8800', letterSpacing: 2, marginBottom: 6 }}>⬢ DEXTER WILL ANALYZE THIS COMBO AGAINST YOUR {(answers.shell || 'SELECTED').toUpperCase()} SHELL</div>
              <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7 }}>{answers.primary_weapon} + {answers.secondary_weapon} — weapon synergy analysis and conflict detection will appear in your full audit report.</div>
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
            <button style={BTN_BACK} onClick={back}>← BACK</button>
            <button style={BTN_CONTINUE} onClick={next} disabled={!answers.primary_weapon}>CONTINUE →</button>
          </div>
        </>
      );

      case 7: return (
        <>
          <SECTION_LABEL text="SECTION B · YOUR LOADOUT · 07 / 08" />
          <H2>MODS, CORES<br/>&amp; IMPLANTS</H2>
          <WHY text='Empty slots are automatically flagged — every gap is a lost stat you are not collecting. Select "Not sure" if you do not know a slot. DEXTER addresses it directly. Rarity matters significantly and will be called out where it changes your build meaningfully.' />

          <Divider label="MOD SLOTS" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 24 }}>
            {[1,2,3].map(i => (
              <div key={i} style={{ background: '#0a0a0a', border: '1px solid rgba(255,136,0,0.12)', borderTop: '2px solid rgba(255,136,0,0.25)', borderRadius: 5, padding: 14 }}>
                <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: 'rgba(255,136,0,0.5)', letterSpacing: 2, marginBottom: 8 }}>MOD SLOT {i}</div>
                <select style={selectStyle} value={answers[`mod_slot_${i}`] || ''} onChange={e => set(`mod_slot_${i}`, e.target.value || null)}>
                  <option value="">Empty slot</option>
                  {modList.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                {answers[`mod_slot_${i}`] && answers[`mod_slot_${i}`] !== 'Not sure' && (
                  <select style={{ ...selectStyle, marginBottom: 0, color: 'rgba(255,255,255,0.6)' }} value={answers[`mod_slot_${i}_rarity`]} onChange={e => set(`mod_slot_${i}_rarity`, e.target.value)}>
                    {RARITIES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                )}
              </div>
            ))}
          </div>

          <Divider label="CORE SLOTS" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
            {[1,2].map(i => (
              <div key={i} style={{ background: '#0a0a0a', border: '1px solid rgba(0,245,255,0.1)', borderTop: '2px solid rgba(0,245,255,0.2)', borderRadius: 5, padding: 14 }}>
                <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: 'rgba(0,245,255,0.4)', letterSpacing: 2, marginBottom: 8 }}>CORE SLOT {i}</div>
                <select style={selectStyle} value={answers[`core_slot_${i}`] || ''} onChange={e => set(`core_slot_${i}`, e.target.value || null)}>
                  <option value="">Empty slot</option>
                  {coreList.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                {answers[`core_slot_${i}`] && answers[`core_slot_${i}`] !== 'Not sure' && (
                  <select style={{ ...selectStyle, marginBottom: 0, color: 'rgba(255,255,255,0.6)' }} value={answers[`core_slot_${i}_rarity`]} onChange={e => set(`core_slot_${i}_rarity`, e.target.value)}>
                    {RARITIES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                )}
              </div>
            ))}
          </div>

          <Divider label="IMPLANT SLOTS" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            {[1,2,3].map(i => (
              <div key={i} style={{ background: '#0a0a0a', border: '1px solid rgba(155,93,229,0.12)', borderTop: '2px solid rgba(155,93,229,0.25)', borderRadius: 5, padding: 14 }}>
                <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: 'rgba(155,93,229,0.5)', letterSpacing: 2, marginBottom: 8 }}>IMPLANT {i}</div>
                <select style={{ ...selectStyle, marginBottom: 0 }} value={answers[`implant_${i}`] || ''} onChange={e => set(`implant_${i}`, e.target.value || null)}>
                  <option value="">Empty slot</option>
                  {implantList.map(imp => <option key={imp} value={imp}>{imp}</option>)}
                </select>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
            <button style={BTN_BACK} onClick={back}>← BACK</button>
            <button style={BTN_CONTINUE} onClick={next}>CONTINUE →</button>
          </div>
        </>
      );

      case 8: return (
        <>
          <SECTION_LABEL text="SECTION C · CALIBRATION · 08 / 08" />
          <H2>FINAL CALIBRATION</H2>
          <WHY text="Two questions that set the depth and focus of your audit. Specific answers produce specific coaching. Vague answers produce generic output." />

          <Divider label="HOURS PER WEEK" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 28 }}>
            {HOURS.map(h => (
              <div key={h.key} style={gridCard(answers.hours_per_week === h.key)} onClick={() => set('hours_per_week', h.key)}>
                <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 11, fontWeight: 700, color: answers.hours_per_week === h.key ? '#00f5ff' : 'rgba(255,255,255,0.65)', letterSpacing: 2, marginBottom: 5 }}>{h.label}</div>
                <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>{h.sub}</div>
              </div>
            ))}
          </div>

          <Divider label="EDITOR FOCUS — SELECT UP TO 3" />
          {FOCUS.map(f => (
            <div key={f.key} style={card(answers.focus_areas.includes(f.key))} onClick={() => toggleFocus(f.key)}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 10, fontWeight: 700, color: answers.focus_areas.includes(f.key) ? '#00f5ff' : 'rgba(255,255,255,0.7)', letterSpacing: 1, marginBottom: 4 }}>{f.label}</div>
                <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>{f.sub}</div>
              </div>
              {answers.focus_areas.includes(f.key) && (
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00f5ff', flexShrink: 0 }} />
              )}
            </div>
          ))}

          <div style={{ display: 'flex', gap: 10, marginTop: 28 }}>
            <button style={BTN_BACK} onClick={back}>← BACK</button>
            <button
              style={{ ...BTN_SUBMIT, opacity: answers.hours_per_week && answers.focus_areas.length > 0 && !submitting ? 1 : 0.4, cursor: answers.hours_per_week && answers.focus_areas.length > 0 && !submitting ? 'pointer' : 'not-allowed' }}
              onClick={answers.hours_per_week && answers.focus_areas.length > 0 && !submitting ? handleSubmit : undefined}
            >
              {submitting ? '● SUBMITTING...' : 'SUBMIT TO EDITORS →'}
            </button>
          </div>
        </>
      );

      default: return null;
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#030303', display: 'flex', fontFamily: 'Rajdhani, sans-serif', color: '#fff', position: 'relative' }}>
      <div style={{ position: 'fixed', inset: 0, opacity: 0.012, backgroundImage: 'linear-gradient(rgba(0,245,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(0,245,255,1) 1px,transparent 1px)', backgroundSize: '48px 48px', pointerEvents: 'none', zIndex: 0 }} />
      <Sidebar step={step} />
      <div style={{ flex: 1, padding: '44px 52px', display: 'flex', flexDirection: 'column', overflowY: 'auto', position: 'relative', zIndex: 1, maxHeight: '100vh' }}>
        {renderStep()}
      </div>
    </div>
  );
}