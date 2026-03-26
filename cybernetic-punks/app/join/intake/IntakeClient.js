'use client';
import { useState, useMemo } from 'react';
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
const IMPLANT_SLOTS = ['Head', 'Torso', 'Legs'];
const IMPLANT_SLOT_COLORS = { Head: '#00f5ff', Torso: '#ff8800', Legs: '#9b5de5' };

const SHELL_NOTE = {
  Assassin: 'Most players run Assassin wrong — without AP Round in mod slot 1 the damage profile falls short. Your audit will address this.',
  Destroyer: 'Destroyer underperforms when played as a brawler. Its real value is sustained pressure and point-holding. DEXTER has strong opinions.',
  Recon: 'S-tier for good reason. Ability timing creates information advantages most players never fully exploit. DEXTER will push your ceiling.',
  Rook: 'Rook is banned from Ranked. In casual play it\'s a legitimate B-tier support shell. Your audit will flag ranked implications.',
  Thief: 'Thief rewards patience and precise target selection. It underperforms badly for aggressive players. DEXTER will cross-reference your playstyle.',
  Triage: 'Triage is crew-dependent to reach its ceiling. Solo players get roughly 70% of its value. DEXTER will account for your squad context.',
  Vandal: 'Most players read Vandal as slow. With the right core + implant stack it produces the highest effective mobility in the game. DEXTER will address this.',
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
    <div style={{ width: 7, height: 7, borderRadius: '50%', background: done ? '#00f5ff' : active ? '#00f5ff' : 'rgba(255,255,255,0.1)', boxShadow: active ? '0 0 6px rgba(0,245,255,0.7)' : 'none', flexShrink: 0 }} />
  );
}

function Sidebar({ step }) {
  return (
    <div style={{ width: 200, flexShrink: 0, background: 'rgba(0,245,255,0.015)', borderRight: '1px solid rgba(0,245,255,0.07)', padding: '36px 22px', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>
      <div style={{ fontFamily: 'Share Tech Mono, monospace', color: 'rgba(0,245,255,0.5)', fontSize: 8, letterSpacing: 4, marginBottom: 32 }}>RUNNER INTAKE</div>
      <div style={{ marginBottom: 28, opacity: step <= 4 || step > 4 ? 1 : 0.35 }}>
        <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, letterSpacing: 3, color: step <= 4 ? '#00f5ff' : step > 4 ? 'rgba(0,245,255,0.4)' : 'rgba(255,255,255,0.2)', marginBottom: 10 }}>A · IDENTITY</div>
        <div style={{ display: 'flex', gap: 5 }}>{[1,2,3,4].map(i => <Dot key={i} done={step > i} active={step === i} />)}</div>
      </div>
      <div style={{ marginBottom: 28, opacity: (step >= 5 && step <= 7) || step > 7 ? 1 : 0.35 }}>
        <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, letterSpacing: 3, color: step >= 5 && step <= 7 ? '#00f5ff' : step > 7 ? 'rgba(0,245,255,0.4)' : 'rgba(255,255,255,0.2)', marginBottom: 10 }}>B · LOADOUT</div>
        <div style={{ display: 'flex', gap: 5 }}>{[5,6,7].map(i => <Dot key={i} done={step > i} active={step === i} />)}</div>
      </div>
      <div style={{ opacity: step === 8 ? 1 : 0.35 }}>
        <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, letterSpacing: 3, color: step === 8 ? '#00f5ff' : 'rgba(255,255,255,0.2)', marginBottom: 10 }}>C · CALIBRATION</div>
        <div style={{ display: 'flex', gap: 5 }}><Dot done={false} active={step === 8} /></div>
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

const BTN = {
  continue: { border: '1px solid rgba(0,245,255,0.4)', color: '#00f5ff', background: 'rgba(0,245,255,0.06)', fontFamily: 'Share Tech Mono, monospace', fontSize: 10, letterSpacing: 3, padding: '11px 28px', cursor: 'pointer', borderRadius: 5 },
  back: { background: 'none', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.35)', fontFamily: 'Share Tech Mono, monospace', fontSize: 10, letterSpacing: 3, padding: '11px 22px', cursor: 'pointer', borderRadius: 5 },
  submit: { background: 'rgba(0,245,255,0.07)', border: '1px solid rgba(0,245,255,0.45)', color: '#00f5ff', fontFamily: 'Share Tech Mono, monospace', fontSize: 11, letterSpacing: 4, padding: '14px 42px', cursor: 'pointer', borderRadius: 5 },
};

const S = {
  label: { fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.2)', letterSpacing: 3, marginBottom: 20 },
  h2: { fontFamily: 'Orbitron, monospace', fontSize: 20, fontWeight: 900, letterSpacing: 2, color: '#fff', lineHeight: 1.25, marginBottom: 12 },
  why: { fontFamily: 'Rajdhani, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.38)', lineHeight: 1.7, marginBottom: 24, borderLeft: '3px solid rgba(0,245,255,0.2)', paddingLeft: 12 },
  select: { width: '100%', background: '#111', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontFamily: 'Share Tech Mono, monospace', fontSize: 10, padding: '9px 12px', borderRadius: 4, marginBottom: 6, outline: 'none' },
};

function WeaponModSlots({ weapon, mods, slotValues, rarityValues, onChange, onRarityChange, label }) {
  if (!weapon) return null;

  const weaponData = weapon;
  const slotTypes = weaponData.mod_slot_types || [];
  if (slotTypes.length === 0) return null;

  const weaponCategory = weaponData.category || weaponData.weapon_type || '';

  return (
    <div style={{ background: '#0a0a0a', border: '1px solid rgba(255,136,0,0.12)', borderTop: '2px solid rgba(255,136,0,0.3)', borderRadius: 5, padding: '16px', marginBottom: 16 }}>
      <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: '#ff8800', letterSpacing: 3, marginBottom: 14 }}>
        ⬢ {label.toUpperCase()} MODS — {weaponData.name?.toUpperCase()}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(slotTypes.length, 3)}, 1fr)`, gap: 10 }}>
        {slotTypes.map(slotType => {
          const key = `${label}_${slotType}`;
          const compatibleMods = mods.filter(m => {
            const slotMatch = m.slot_type?.toLowerCase() === slotType.toLowerCase();
            const catMatch = !m.compatible_categories || m.compatible_categories.length === 0 ||
              m.compatible_categories.some(c => c.toLowerCase() === weaponCategory.toLowerCase() || c.toLowerCase() === 'all');
            return slotMatch && catMatch;
          });

          const currentVal = slotValues[key] || '';
          const currentRarity = rarityValues[key] || 'Standard';

          return (
            <div key={slotType} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,136,0,0.08)', borderRadius: 4, padding: '10px' }}>
              <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: 'rgba(255,136,0,0.5)', letterSpacing: 2, marginBottom: 8 }}>{slotType.toUpperCase()}</div>
              <select
                style={S.select}
                value={currentVal}
                onChange={e => onChange(key, e.target.value || null)}
              >
                <option value="">Empty slot</option>
                <option value="not_sure">Not sure</option>
                {compatibleMods.map(m => (
                  <option key={m.name} value={m.name}>{m.name}{m.rarity ? ` (${m.rarity})` : ''}</option>
                ))}
                {compatibleMods.length === 0 && (
                  <option disabled>No mods found for this slot</option>
                )}
              </select>
              {currentVal && currentVal !== 'not_sure' && (
                <select
                  style={{ ...S.select, marginBottom: 0, color: 'rgba(255,255,255,0.6)' }}
                  value={currentRarity}
                  onChange={e => onRarityChange(key, e.target.value)}
                >
                  {RARITIES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ImplantSlotPicker({ implants, values, onChange }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
      {IMPLANT_SLOTS.map(slot => {
        const color = IMPLANT_SLOT_COLORS[slot];
        const slotImplants = implants.filter(i => i.slot_type?.toLowerCase() === slot.toLowerCase());
        const currentVal = values[slot] || '';

        const otherSlots = IMPLANT_SLOTS.filter(s => s !== slot);
        const usedElsewhere = otherSlots.map(s => values[s]).filter(Boolean);

        return (
          <div key={slot} style={{ background: '#0a0a0a', border: `1px solid ${color}18`, borderTop: `2px solid ${color}44`, borderRadius: 5, padding: '14px' }}>
            <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: `${color}80`, letterSpacing: 2, marginBottom: 8 }}>{slot.toUpperCase()} IMPLANT</div>
            <select
              style={{ ...S.select, marginBottom: 0 }}
              value={currentVal}
              onChange={e => onChange(slot, e.target.value || null)}
            >
              <option value="">Empty slot</option>
              <option value="not_sure">Not sure</option>
              {slotImplants
                .filter(i => !usedElsewhere.includes(i.name))
                .map(i => (
                  <option key={i.name} value={i.name}>
                    {i.name}{i.rarity ? ` — ${i.rarity}` : ''}
                  </option>
                ))
              }
            </select>
            {currentVal && currentVal !== 'not_sure' && (
              <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 8, lineHeight: 1.5 }}>
                {slotImplants.find(i => i.name === currentVal)?.passive_desc || ''}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function CoreSlotPicker({ cores, selectedShell, values, rarityValues, onChange, onRarityChange }) {
  const availableCores = useMemo(() => {
    return cores.filter(c => {
      if (!c.is_shell_exclusive) return true;
      if (!c.required_runner) return true;
      return c.required_runner?.toLowerCase() === selectedShell?.toLowerCase();
    });
  }, [cores, selectedShell]);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      {[1, 2].map(i => {
        const key = `core_${i}`;
        const currentVal = values[key] || '';
        const otherKey = `core_${i === 1 ? 2 : 1}`;
        const usedInOther = values[otherKey];
        const filteredCores = availableCores.filter(c => c.name !== usedInOther);

        return (
          <div key={i} style={{ background: '#0a0a0a', border: '1px solid rgba(0,245,255,0.1)', borderTop: '2px solid rgba(0,245,255,0.25)', borderRadius: 5, padding: '14px' }}>
            <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: 'rgba(0,245,255,0.4)', letterSpacing: 2, marginBottom: 8 }}>CORE SLOT {i}</div>
            <select
              style={S.select}
              value={currentVal}
              onChange={e => onChange(key, e.target.value || null)}
            >
              <option value="">Empty slot</option>
              <option value="not_sure">Not sure</option>
              {filteredCores.map(c => (
                <option key={c.name} value={c.name}>
                  {c.name}{c.rarity ? ` — ${c.rarity}` : ''}{c.is_shell_exclusive && c.required_runner ? ` [${c.required_runner}]` : ''}
                </option>
              ))}
            </select>
            {currentVal && currentVal !== 'not_sure' && (
              <>
                <select
                  style={{ ...S.select, color: 'rgba(255,255,255,0.6)' }}
                  value={rarityValues[key] || 'Standard'}
                  onChange={e => onRarityChange(key, e.target.value)}
                >
                  {RARITIES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 4, lineHeight: 1.5 }}>
                  {availableCores.find(c => c.name === currentVal)?.effect_desc || ''}
                </div>
              </>
            )}
          </div>
        );
      })}
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
    weapon_mods: {},
    weapon_mod_rarities: {},
    cores: {},
    core_rarities: {},
    implants: { Head: null, Torso: null, Legs: null },
    hours_per_week: null, focus_areas: [],
  });

  const set = (k, v) => setAnswers(a => ({ ...a, [k]: v }));

  const toggleZone = (z) => setAnswers(a => {
    const zones = a.zones.includes(z) ? a.zones.filter(x => x !== z) : a.zones.length < 2 ? [...a.zones, z] : a.zones;
    return { ...a, zones };
  });

  const toggleFocus = (f) => setAnswers(a => {
    const fa = a.focus_areas.includes(f) ? a.focus_areas.filter(x => x !== f) : a.focus_areas.length < 3 ? [...a.focus_areas, f] : a.focus_areas;
    return { ...a, focus_areas: fa };
  });

  const setWeaponMod = (key, val) => setAnswers(a => ({ ...a, weapon_mods: { ...a.weapon_mods, [key]: val } }));
  const setWeaponModRarity = (key, val) => setAnswers(a => ({ ...a, weapon_mod_rarities: { ...a.weapon_mod_rarities, [key]: val } }));
  const setCore = (key, val) => setAnswers(a => ({ ...a, cores: { ...a.cores, [key]: val } }));
  const setCoreRarity = (key, val) => setAnswers(a => ({ ...a, core_rarities: { ...a.core_rarities, [key]: val } }));
  const setImplant = (slot, val) => setAnswers(a => ({ ...a, implants: { ...a.implants, [slot]: val } }));

  const getShellTier = (name) => metaTiers.find(m => m.name?.toLowerCase() === name?.toLowerCase())?.tier || 'B';

  const primaryWeaponData = useMemo(() => weapons.find(w => w.name === answers.primary_weapon), [weapons, answers.primary_weapon]);
  const secondaryWeaponData = useMemo(() => weapons.find(w => w.name === answers.secondary_weapon), [weapons, answers.secondary_weapon]);

  const next = () => setStep(s => s + 1);
  const back = () => setStep(s => s - 1);

  const handleSubmit = async () => {
    setSubmitting(true);

    const primaryMods = {};
    const secondaryMods = {};
    Object.entries(answers.weapon_mods).forEach(([key, val]) => {
      if (key.startsWith('primary_')) primaryMods[key.replace('primary_', '')] = val;
      if (key.startsWith('secondary_')) secondaryMods[key.replace('secondary_', '')] = val;
    });
    const primaryModRarities = {};
    const secondaryModRarities = {};
    Object.entries(answers.weapon_mod_rarities).forEach(([key, val]) => {
      if (key.startsWith('primary_')) primaryModRarities[key.replace('primary_', '')] = val;
      if (key.startsWith('secondary_')) secondaryModRarities[key.replace('secondary_', '')] = val;
    });

    const payload = {
      motivation: answers.motivation,
      playstyle: answers.playstyle,
      engagement_depth: answers.engagement_depth,
      zones: answers.zones,
      squad_context: answers.squad_context,
      shell: answers.shell,
      primary_weapon: answers.primary_weapon,
      secondary_weapon: answers.secondary_weapon,
      mod_slot_1: Object.values(primaryMods)[0] || null,
      mod_slot_1_rarity: Object.values(primaryModRarities)[0] || 'Standard',
      mod_slot_2: Object.values(primaryMods)[1] || null,
      mod_slot_2_rarity: Object.values(primaryModRarities)[1] || 'Standard',
      mod_slot_3: Object.values(primaryMods)[2] || null,
      mod_slot_3_rarity: Object.values(primaryModRarities)[2] || 'Standard',
      core_slot_1: answers.cores['core_1'] || null,
      core_slot_1_rarity: answers.core_rarities['core_1'] || 'Standard',
      core_slot_2: answers.cores['core_2'] || null,
      core_slot_2_rarity: answers.core_rarities['core_2'] || 'Standard',
      implant_1: answers.implants['Head'] || null,
      implant_2: answers.implants['Torso'] || null,
      implant_3: answers.implants['Legs'] || null,
      hours_per_week: answers.hours_per_week,
      focus_areas: answers.focus_areas,
    };

    try {
      const res = await fetch('/api/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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
    { key: 'INTEL_GATHERING', sym: '◇', color: '#00ff88', label: 'INTEL GATHERING', sub: 'Understanding the meta, theory-crafting' },
    { key: 'STORY_IMMERSION', sym: '◎', color: '#9b5de5', label: 'STORY & IMMERSION', sub: 'Lore, faction reputation, world exploration' },
  ];

  const PLAYSTYLES = [
    { key: 'AGGRESSIVE', color: '#ff0000', sub: 'Push immediately. Dictate the engagement before they can react.' },
    { key: 'CALCULATED', color: '#00f5ff', sub: 'Wait for information. Pick the right moment. Never commit without advantage.' },
    { key: 'EVASIVE', color: '#00ff88', sub: 'Disengage, reposition, reset. The fight you avoid is the one you win.' },
    { key: 'ADAPTIVE', color: '#9b5de5', sub: 'No fixed pattern. Every fight is a new problem to solve.' },
  ];

  const ZONES = [
    { name: 'Perimeter', note: 'Entry zone · lighter threats · learning runs' },
    { name: 'Dire Marsh', note: 'Mid-tier · environmental hazards · prime PvP' },
    { name: 'Outpost', note: 'High-value contracts · coordinated teams' },
    { name: 'Cryo Archive', note: 'End-game · weekends only · Level 25 required', accent: '#ff8800' },
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
    { key: 'FIX_MY_BUILD', label: 'FIX MY BUILD', sub: 'Find what\'s wrong and tell me exactly' },
    { key: 'META_POSITIONING', label: 'META POSITIONING', sub: 'Am I running the right shell this week?' },
    { key: 'RANKED_PREP', label: 'RANKED PREP', sub: 'Optimize specifically for competitive play' },
    { key: 'EXPLAIN_WHY', label: 'EXPLAIN THE WHY', sub: 'I want to understand, not just be told' },
    { key: 'COUNTER_PLAY', label: 'COUNTER PLAY', sub: 'What beats me and how do I beat it?' },
  ];

  const card = (sel, color) => ({
    background: sel ? 'rgba(255,255,255,0.04)' : '#0a0a0a',
    border: `1px solid ${sel ? (color || 'rgba(0,245,255,0.45)') : 'rgba(255,255,255,0.07)'}`,
    borderLeft: `3px solid ${sel ? (color || '#00f5ff') : 'rgba(255,255,255,0.07)'}`,
    borderRadius: 5, padding: '14px 18px', cursor: 'pointer', marginBottom: 6,
    display: 'flex', alignItems: 'center', gap: 14,
  });

  const gridCard = (sel, color) => ({
    background: sel ? 'rgba(255,255,255,0.04)' : '#0a0a0a',
    border: `1px solid ${sel ? (color || 'rgba(0,245,255,0.45)') : 'rgba(255,255,255,0.07)'}`,
    borderTop: `2px solid ${sel ? (color || '#00f5ff') : 'rgba(255,255,255,0.07)'}`,
    borderRadius: 5, padding: '16px', cursor: 'pointer',
  });

  const WHY = ({ text }) => <div style={S.why}>{text}</div>;
  const H2 = ({ children }) => <div style={S.h2}>{children}</div>;

  const weaponsByCategory = useMemo(() => {
    const grouped = {};
    weapons.forEach(w => {
      const cat = w.category || w.weapon_type || 'Other';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(w);
    });
    return grouped;
  }, [weapons]);

  const renderStep = () => {
    switch (step) {

      case 1: return (
        <>
          <div style={S.label}>SECTION A · RUNNER IDENTITY · 01 / 08</div>
          <H2>WHEN YOU DEPLOY,<br/>WHAT MATTERS MOST?</H2>
          <WHY text="Calibrates which editors lead your audit and what they prioritize. Your answer shapes the entire tone of the report." />
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
            <button style={BTN.continue} onClick={next} disabled={!answers.motivation}>CONTINUE →</button>
          </div>
        </>
      );

      case 2: return (
        <>
          <div style={S.label}>SECTION A · RUNNER IDENTITY · 02 / 08</div>
          <H2>YOUR INSTINCT<br/>IN A FIREFIGHT?</H2>
          <WHY text="CIPHER uses this to flag patterns where your shell and weapon choices contradict your engagement style. Mismatch here is the most common source of underperformance." />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {PLAYSTYLES.map(p => (
              <div key={p.key} style={gridCard(answers.playstyle === p.key, p.color)} onClick={() => set('playstyle', p.key)}>
                <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 11, fontWeight: 700, color: answers.playstyle === p.key ? p.color : 'rgba(255,255,255,0.7)', letterSpacing: 2, marginBottom: 8 }}>{p.key}</div>
                <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>{p.sub}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
            <button style={BTN.back} onClick={back}>← BACK</button>
            <button style={BTN.continue} onClick={next} disabled={!answers.playstyle}>CONTINUE →</button>
          </div>
        </>
      );

      case 3: return (
        <>
          <div style={S.label}>SECTION A · RUNNER IDENTITY · 03 / 08</div>
          <H2>BUILD ENGAGEMENT<br/>&amp; ZONE PREFERENCE</H2>
          <WHY text="Sets the vocabulary level of your audit — plain language vs full stat analysis. Zone preference lets NEXUS weight meta recommendations to where you actually play." />

          <div style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: '20px', marginBottom: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.25)' }}>I EQUIP WHAT DROPS</span>
              <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 28, color: '#00f5ff', fontWeight: 900 }}>{answers.engagement_depth}</span>
              <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.25)' }}>I THEORY-CRAFT BUILDS</span>
            </div>
            <input type="range" min="1" max="10" value={answers.engagement_depth}
              onChange={e => set('engagement_depth', parseInt(e.target.value))}
              style={{ width: '100%', accentColor: '#00f5ff' }} />
          </div>

          <Divider label="WHERE DO YOU PLAY MOST" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {ZONES.map(z => (
              <div key={z.name} style={gridCard(answers.zones.includes(z.name), z.accent)} onClick={() => toggleZone(z.name)}>
                <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 11, fontWeight: 700, color: answers.zones.includes(z.name) ? (z.accent || '#00f5ff') : 'rgba(255,255,255,0.7)', letterSpacing: 1, marginBottom: 5 }}>{z.name.toUpperCase()}</div>
                <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.38)', lineHeight: 1.5 }}>{z.note}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
            <button style={BTN.back} onClick={back}>← BACK</button>
            <button style={BTN.continue} onClick={next} disabled={answers.zones.length === 0}>CONTINUE →</button>
          </div>
        </>
      );

      case 4: return (
        <>
          <div style={S.label}>SECTION A · RUNNER IDENTITY · 04 / 08</div>
          <H2>HOW DO YOU<br/>USUALLY DEPLOY?</H2>
          <WHY text="Solo builds differ fundamentally from crew builds. Some shells lose most of their value without teammates. NEXUS and DEXTER both factor this heavily." />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {SQUADS.map(s => (
              <div key={s.key} style={gridCard(answers.squad_context === s.key)} onClick={() => set('squad_context', s.key)}>
                <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 12, fontWeight: 700, color: answers.squad_context === s.key ? '#00f5ff' : 'rgba(255,255,255,0.7)', letterSpacing: 2, marginBottom: 6 }}>{s.key}</div>
                <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>{s.sub}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
            <button style={BTN.back} onClick={back}>← BACK</button>
            <button style={BTN.continue} onClick={next} disabled={!answers.squad_context}>CONTINUE →</button>
          </div>
        </>
      );

      case 5: return (
        <>
          <div style={S.label}>SECTION B · YOUR LOADOUT · 05 / 08</div>
          <H2>SELECT YOUR<br/>RUNNER SHELL</H2>
          <WHY text="Every recommendation DEXTER makes is anchored to your shell's specific mechanics and ability timings. Live meta tier shown — updated each cycle by NEXUS." />
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
                  <span style={{ display: 'inline-block', border: `1px solid ${sh.banned ? 'rgba(255,0,0,0.3)' : (TIER_COLORS[tier] || '#888') + '40'}`, color: sh.banned ? '#ff4444' : (TIER_COLORS[tier] || '#888'), fontSize: 7, letterSpacing: 1, padding: '2px 7px', borderRadius: 3, fontFamily: 'Share Tech Mono, monospace', background: 'rgba(255,255,255,0.02)' }}>
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
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button style={BTN.back} onClick={back}>← BACK</button>
            <button style={BTN.continue} onClick={next} disabled={!answers.shell}>CONTINUE →</button>
          </div>
        </>
      );

      case 6: return (
        <>
          <div style={S.label}>SECTION B · YOUR LOADOUT · 06 / 08</div>
          <H2>YOUR WEAPONS</H2>
          <WHY text="Select your primary and secondary weapons. DEXTER analyzes both against your shell's mechanics and your playstyle simultaneously." />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            {['primary', 'secondary'].map(slot => (
              <div key={slot}>
                <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, letterSpacing: 3, color: 'rgba(255,255,255,0.25)', marginBottom: 10 }}>{slot.toUpperCase()} WEAPON</div>
                <select
                  style={S.select}
                  value={answers[`${slot}_weapon`] || ''}
                  onChange={e => set(`${slot}_weapon`, e.target.value || null)}
                >
                  <option value="">Select {slot} weapon</option>
                  {Object.entries(weaponsByCategory).map(([cat, weps]) => (
                    <optgroup key={cat} label={cat}>
                      {weps.map(w => (
                        <option key={w.name} value={w.name}>{w.name}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
            ))}
          </div>
          {answers.primary_weapon && answers.secondary_weapon && (
            <div style={{ background: '#0a0a0a', border: '1px solid rgba(0,245,255,0.12)', borderLeft: '3px solid rgba(0,245,255,0.4)', borderRadius: 5, padding: '14px 18px' }}>
              <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: '#ff8800', letterSpacing: 2, marginBottom: 6 }}>⬢ DEXTER WILL ANALYZE THIS COMBO</div>
              <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7 }}>{answers.primary_weapon} + {answers.secondary_weapon} — synergy and conflict analysis included in your full audit.</div>
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
            <button style={BTN.back} onClick={back}>← BACK</button>
            <button style={BTN.continue} onClick={next} disabled={!answers.primary_weapon}>CONTINUE →</button>
          </div>
        </>
      );

      case 7: return (
        <>
          <div style={S.label}>SECTION B · YOUR LOADOUT · 07 / 08</div>
          <H2>MODS, CORES<br/>&amp; IMPLANTS</H2>
          <WHY text='Mod slots are filtered by weapon type and slot position — no more invalid combinations. Implants are slotted by body region. Cores are filtered to your shell. Leave anything empty and DEXTER flags it directly.' />

          {primaryWeaponData && (
            <WeaponModSlots
              weapon={primaryWeaponData}
              mods={mods}
              slotValues={answers.weapon_mods}
              rarityValues={answers.weapon_mod_rarities}
              onChange={setWeaponMod}
              onRarityChange={setWeaponModRarity}
              label="primary"
            />
          )}

          {secondaryWeaponData && (
            <WeaponModSlots
              weapon={secondaryWeaponData}
              mods={mods}
              slotValues={answers.weapon_mods}
              rarityValues={answers.weapon_mod_rarities}
              onChange={setWeaponMod}
              onRarityChange={setWeaponModRarity}
              label="secondary"
            />
          )}

          <Divider label="CORES" />
          <CoreSlotPicker
            cores={cores}
            selectedShell={answers.shell}
            values={answers.cores}
            rarityValues={answers.core_rarities}
            onChange={setCore}
            onRarityChange={setCoreRarity}
          />

          <Divider label="IMPLANTS — ONE PER BODY REGION" />
          <ImplantSlotPicker
            implants={implants}
            values={answers.implants}
            onChange={setImplant}
          />

          <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
            <button style={BTN.back} onClick={back}>← BACK</button>
            <button style={BTN.continue} onClick={next}>CONTINUE →</button>
          </div>
        </>
      );

      case 8: return (
        <>
          <div style={S.label}>SECTION C · CALIBRATION · 08 / 08</div>
          <H2>FINAL CALIBRATION</H2>
          <WHY text="Two questions that set the depth and focus of your audit. Specific answers produce specific coaching." />

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
              {answers.focus_areas.includes(f.key) && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00f5ff', flexShrink: 0 }} />}
            </div>
          ))}

          <div style={{ display: 'flex', gap: 10, marginTop: 28 }}>
            <button style={BTN.back} onClick={back}>← BACK</button>
            <button
              style={{ ...BTN.submit, opacity: answers.hours_per_week && answers.focus_areas.length > 0 && !submitting ? 1 : 0.4, cursor: answers.hours_per_week && answers.focus_areas.length > 0 && !submitting ? 'pointer' : 'not-allowed' }}
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
