'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const FACTION_COLORS = {
  Cyberacme: '#00ff41',
  Nucaloric:  '#ff2d78',
  Traxus:     '#ff6600',
  Mida:       '#cc44ff',
  Arachne:    '#ff1a1a',
  Sekiguchi:  '#c8b400',
};

const FACTION_LEADERS = {
  Cyberacme: 'CNI',
  Nucaloric:  'CAUS',
  Traxus:     'VULCAN',
  Mida:       '_GANTRY',
  Arachne:    'CHIMERA',
  Sekiguchi:  'NONA',
};

const FACTION_FOCUS = {
  Cyberacme: 'Loot / Extraction',
  Nucaloric:  'Support / Healing',
  Traxus:     'Weapons / Mods',
  Mida:       'Equipment / Grenades',
  Arachne:    'Melee / Combat',
  Sekiguchi:  'Energy / Capacitors',
};

function factionImage(fname) {
  return '/images/factions/' + fname.toLowerCase() + '.webp';
}

const SHELL_PRIORITY_STATS = {
  Destroyer: ['Melee Damage', 'Heat Capacity', 'Finisher Siphon'],
  Vandal:    ['Tactical Recovery', 'Prime Recovery', 'Agility'],
  Recon:     ['Ping Duration', 'Hardware', 'Firewall'],
  Assassin:  ['Agility', 'Loot Speed', 'Melee Damage'],
  Triage:    ['Revive Speed', 'Self-Repair Speed', 'Hardware'],
  Thief:     ['Loot Speed', 'Agility', 'Fall Resistance'],
  Rook:      ['Heat Capacity', 'Self-Repair Speed', 'Firewall'],
};

const FACTION_ORDER = ['Cyberacme', 'Nucaloric', 'Traxus', 'Mida', 'Arachne', 'Sekiguchi'];

const UNLOCK_TYPE_COLORS = {
  weapon:     '#ff0000',
  implant:    '#9b5de5',
  mod:        '#ff8800',
  consumable: '#00ff88',
  upgrade:    '#00f5ff',
  function:   '#ffd700',
};

function SectionDivider({ label }) {
  return (
    <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.15)', letterSpacing: 6, textAlign: 'center', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
      {label}
      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
    </div>
  );
}

function StatPill({ label, value, color }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: color + '10', border: '1px solid ' + color + '28', borderRadius: 4, padding: '4px 10px' }}>
      <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: 1 }}>{label}</span>
      <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 10, fontWeight: 700, color: color }}>+{value}</span>
    </div>
  );
}

export default function FactionClient() {
  const [data, setData]                   = useState(null);
  const [loading, setLoading]             = useState(true);
  const [activeFaction, setActiveFaction] = useState('Arachne');
  const [activeShell, setActiveShell]     = useState('Destroyer');
  const [unlockFilter, setUnlockFilter]   = useState('all');
  const [unlockSearch, setUnlockSearch]   = useState('');
  const [unlockFaction, setUnlockFaction] = useState('all');

  useEffect(function() {
    fetch('/api/faction-data')
      .then(function(r) { return r.json(); })
      .then(function(d) { setData(d); setLoading(false); })
      .catch(function() { setLoading(false); });
  }, []);

  var factions    = data?.factions    || [];
  var statBonuses = data?.statBonuses || [];
  var unlocks     = data?.unlocks     || [];
  var materials   = data?.materials   || [];

  var selectedFaction  = factions.find(function(f) { return f.name === activeFaction; }) || null;
  var factionStats     = statBonuses.filter(function(s) { return s.faction_name === activeFaction; });
  var factionUnlocks   = unlocks.filter(function(u) { return u.faction_name === activeFaction; });
  var factionMaterials = materials.filter(function(m) { return m.faction_name === activeFaction; });
  var factionColor     = FACTION_COLORS[activeFaction] || '#00f5ff';

  // Shell advisor
  var priorityStats = SHELL_PRIORITY_STATS[activeShell] || [];
  var advisorResults = FACTION_ORDER.map(function(fname) {
    var relevantBonuses = statBonuses.filter(function(s) {
      return s.faction_name === fname && priorityStats.includes(s.stat_name);
    });
    var totalBonus = relevantBonuses.reduce(function(acc, s) { return acc + (s.stat_value || 0); }, 0);
    return { faction: fname, bonuses: relevantBonuses, totalBonus: totalBonus };
  }).filter(function(r) { return r.totalBonus > 0; }).sort(function(a, b) { return b.totalBonus - a.totalBonus; });

  // Unlock browser
  var filteredUnlocks = unlocks.filter(function(u) {
    var matchFaction = unlockFaction === 'all' || u.faction_name === unlockFaction;
    var matchType    = unlockFilter === 'all'  || u.unlock_type === unlockFilter;
    var matchSearch  = !unlockSearch || u.item_name.toLowerCase().includes(unlockSearch.toLowerCase()) || (u.notes || '').toLowerCase().includes(unlockSearch.toLowerCase());
    return matchFaction && matchType && matchSearch;
  });

  // Investment efficiency
  var efficiencyData = FACTION_ORDER.map(function(fname) {
    var fStats    = statBonuses.filter(function(s) { return s.faction_name === fname; });
    var totalStat = fStats.reduce(function(acc, s) { return acc + (s.stat_value || 0); }, 0);
    var maxRank   = fStats.reduce(function(acc, s) { return Math.max(acc, s.rank_required || 0); }, 0);
    var fData     = factions.find(function(f) { return f.name === fname; });
    return { name: fname, totalStat, maxRank, maxCreditCost: fData?.max_credit_cost || 0, statCount: fStats.length };
  }).sort(function(a, b) { return b.totalStat - a.totalStat; });

  return (
    <main style={{ backgroundColor: '#030303', minHeight: '100vh', color: '#fff', paddingTop: 80, overflowX: 'hidden' }}>

      <style>{`
        @keyframes rPulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes rScanLine { from{transform:translateY(-100vh)} to{transform:translateY(100vh)} }
        .f-btn  { transition: all 0.15s ease; cursor: pointer; }
        .f-btn:hover  { transform: translateY(-1px); }
        .f-card { transition: all 0.2s ease; cursor: pointer; }
        .f-card:hover { transform: translateY(-3px); }
        .f-row  { transition: background 0.12s; }
        .f-row:hover  { background: rgba(255,255,255,0.025) !important; }
        .f-tab  { transition: all 0.15s; cursor: pointer; }
        .f-tab:hover  { opacity: 0.85; }
      `}</style>

      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(0,245,255,0.3), transparent)', animation: 'rScanLine 10s linear infinite', pointerEvents: 'none', zIndex: 0 }} />

      {/* ── HERO ─────────────────────────────────────── */}
      <section style={{ position: 'relative', overflow: 'hidden', padding: '56px 24px 64px' }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.012, backgroundImage: 'linear-gradient(rgba(0,245,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,245,255,1) 1px, transparent 1px)', backgroundSize: '48px 48px', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 900, height: 500, background: 'radial-gradient(ellipse at 50% 0%, rgba(255,215,0,0.04) 0%, transparent 65%)', pointerEvents: 'none' }} />

        <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: '#ffd700', background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.25)', borderRadius: 3, padding: '4px 12px', letterSpacing: 2 }}>6 FACTIONS</span>
            <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 3, padding: '4px 12px', letterSpacing: 2 }}>SEASON 1</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 48, alignItems: 'center' }}>
            <div>
              <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: 'clamp(2.5rem, 7vw, 4.5rem)', fontWeight: 900, letterSpacing: 2, lineHeight: 1.0, margin: '0 0 16px' }}>
                FACTION<br /><span style={{ color: '#ffd700', textShadow: '0 0 40px rgba(255,215,0,0.2)' }}>INTEL</span>
              </h1>
              <p style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 16, color: 'rgba(255,255,255,0.4)', lineHeight: 1.7, maxWidth: 440, marginBottom: 28 }}>
                Six factions. Each controls access to weapons, mods, implants, and permanent stat upgrades. Level them up through missions, buy unlocks with credits and materials, and build the Runner you want.
              </p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <Link href="/advisor" style={{ padding: '10px 20px', background: 'rgba(255,136,0,0.1)', border: '1px solid rgba(255,136,0,0.35)', borderRadius: 5, textDecoration: 'none', fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: '#ff8800', letterSpacing: 2 }}>[D] BUILD ADVISOR →</Link>
                <Link href="/builds" style={{ padding: '10px 20px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 5, textDecoration: 'none', fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: 2 }}>BUILD LAB →</Link>
              </div>
            </div>

            {/* ── FACTION CARDS WITH BACKGROUND IMAGES ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {FACTION_ORDER.map(function(fname) {
                var color  = FACTION_COLORS[fname];
                var leader = FACTION_LEADERS[fname];
                var focus  = FACTION_FOCUS[fname];
                var fData  = factions.find(function(f) { return f.name === fname; });
                var imgSrc = factionImage(fname);
                return (
                  <button key={fname} className="f-card"
                    onClick={function() { setActiveFaction(fname); document.getElementById('faction-detail')?.scrollIntoView({ behavior: 'smooth' }); }}
                    style={{ position: 'relative', background: '#0a0a0a', border: '1px solid ' + color + '30', borderTop: '2px solid ' + color, borderRadius: 8, padding: 0, overflow: 'hidden', cursor: 'pointer', textAlign: 'left', minHeight: 140 }}>

                    {/* Background image */}
                    <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url(' + imgSrc + ')', backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.18 }} />
                    {/* Color overlay */}
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, ' + color + '15 0%, transparent 60%, rgba(0,0,0,0.4) 100%)' }} />

                    {/* Content */}
                    <div style={{ position: 'relative', zIndex: 1, padding: '16px 14px' }}>
                      <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 11, fontWeight: 700, color: color, letterSpacing: 1, marginBottom: 3, textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>{fname.toUpperCase()}</div>
                      <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, marginBottom: 6 }}>{leader}</div>
                      <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: 1.3, marginBottom: 8 }}>{focus}</div>
                      {fData?.max_credit_cost > 0 && (
                        <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: color, letterSpacing: 1, textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
                          {fData.max_credit_cost.toLocaleString()} CR MAX
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── FACTION DETAIL ───────────────────────────── */}
      <section id="faction-detail" style={{ padding: '0 24px 64px', maxWidth: 1100, margin: '0 auto' }}>
        <SectionDivider label="FACTION OVERVIEW" />

        {/* ── FACTION TAB BAR WITH LOGOS ── */}
        <div style={{ display: 'flex', gap: 3, marginBottom: 3, overflowX: 'auto', paddingBottom: 2 }}>
          {FACTION_ORDER.map(function(fname) {
            var active = activeFaction === fname;
            var color  = FACTION_COLORS[fname];
            var imgSrc = factionImage(fname);
            return (
              <button key={fname} className="f-tab"
                onClick={function() { setActiveFaction(fname); }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '10px 14px', background: active ? color + '12' : '#0a0a0a', border: '1px solid ' + (active ? color + '40' : 'rgba(255,255,255,0.05)'), borderBottom: '2px solid ' + (active ? color : 'transparent'), borderRadius: '6px 6px 0 0', cursor: 'pointer', flexShrink: 0, minWidth: 90, position: 'relative', overflow: 'hidden' }}>

                {/* Subtle bg image on active tab */}
                {active && (
                  <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url(' + imgSrc + ')', backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.08 }} />
                )}

                {/* Faction logo */}
                <div style={{ position: 'relative', zIndex: 1, width: 32, height: 32, borderRadius: '50%', overflow: 'hidden', border: '1px solid ' + (active ? color + '60' : 'rgba(255,255,255,0.1)'), flexShrink: 0, background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img
                    src={imgSrc}
                    alt={fname}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: active ? 1 : 0.5 }}
                  />
                </div>

                <span style={{ position: 'relative', zIndex: 1, fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: active ? color : 'rgba(255,255,255,0.25)', letterSpacing: 1, whiteSpace: 'nowrap' }}>
                  {fname.toUpperCase()}
                </span>

                {active && (
                  <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '60%', height: 1, background: 'linear-gradient(90deg, transparent, ' + color + ', transparent)' }} />
                )}
              </button>
            );
          })}
        </div>

        {/* Faction detail panel */}
        {loading ? (
          <div style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '0 0 10px 10px', padding: 40, textAlign: 'center', fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: '#333', letterSpacing: 2 }}>
            LOADING FACTION DATA...
          </div>
        ) : (
          <div style={{ position: 'relative', background: factionColor + '06', border: '1px solid ' + factionColor + '25', borderTop: 'none', borderRadius: '0 0 10px 10px', padding: '28px', display: 'flex', flexDirection: 'column', gap: 24, overflow: 'hidden' }}>

            {/* Subtle faction image behind detail panel */}
            <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '35%', backgroundImage: 'url(' + factionImage(activeFaction) + ')', backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.06, pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '40%', background: 'linear-gradient(to right, ' + factionColor + '06, transparent)', pointerEvents: 'none' }} />

            {/* Header row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 20, alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
                  {/* Logo in detail header */}
                  <div style={{ width: 48, height: 48, borderRadius: 8, overflow: 'hidden', border: '1px solid ' + factionColor + '40', flexShrink: 0, background: '#0a0a0a' }}>
                    <img src={factionImage(activeFaction)} alt={activeFaction} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div>
                    <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 26, fontWeight: 900, color: factionColor, textShadow: '0 0 20px ' + factionColor + '44', letterSpacing: 2, display: 'block', lineHeight: 1 }}>{activeFaction.toUpperCase()}</span>
                    <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: 2 }}>LEADER: {FACTION_LEADERS[activeFaction]}</span>
                  </div>
                </div>
                <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, maxWidth: 580 }}>
                  {selectedFaction?.description || FACTION_FOCUS[activeFaction]}
                </div>
              </div>
              {selectedFaction?.max_credit_cost > 0 && (
                <div style={{ background: '#0a0a0a', border: '1px solid ' + factionColor + '20', borderRadius: 8, padding: '16px 20px', textAlign: 'center', flexShrink: 0 }}>
                  <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.2)', letterSpacing: 2, marginBottom: 6 }}>FULL MAX COST</div>
                  <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 18, fontWeight: 900, color: factionColor }}>{selectedFaction.max_credit_cost.toLocaleString()}</div>
                  <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.25)', letterSpacing: 2 }}>CREDITS</div>
                </div>
              )}
            </div>

            {/* Stats + Unlocks + Materials */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, position: 'relative', zIndex: 1 }}>

              {/* Stat bonuses */}
              <div style={{ background: '#0a0a0a', border: '1px solid ' + factionColor + '15', borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ padding: '12px 18px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 10, fontWeight: 700, color: factionColor, letterSpacing: 2 }}>STAT BONUSES</span>
                </div>
                <div style={{ padding: '8px 0' }}>
                  {factionStats.length > 0 ? factionStats.map(function(s, i) {
                    return (
                      <div key={i} className="f-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 18px', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <div>
                          <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 13, fontWeight: 600, color: '#fff' }}>{s.stat_name}</div>
                          {s.rank_required && (
                            <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: '#ffd700', letterSpacing: 1, marginTop: 2 }}>
                              RANK {s.rank_required}{s.credit_cost ? ' · ' + s.credit_cost.toLocaleString() + ' CR' : ''}
                            </div>
                          )}
                        </div>
                        <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 900, color: '#00ff88' }}>+{s.stat_value}</span>
                      </div>
                    );
                  }) : (
                    <div style={{ padding: '16px 18px', fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: '#222', letterSpacing: 1 }}>DATA PENDING</div>
                  )}
                </div>
              </div>

              {/* Unlocks */}
              <div style={{ background: '#0a0a0a', border: '1px solid ' + factionColor + '15', borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ padding: '12px 18px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 10, fontWeight: 700, color: factionColor, letterSpacing: 2 }}>UNLOCKS</span>
                </div>
                <div style={{ padding: '8px 0', maxHeight: 280, overflowY: 'auto' }}>
                  {factionUnlocks.length > 0 ? factionUnlocks.slice(0, 12).map(function(u, i) {
                    var tc = UNLOCK_TYPE_COLORS[u.unlock_type] || '#888';
                    return (
                      <div key={i} className="f-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 18px', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                            <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: tc, background: tc + '14', border: '1px solid ' + tc + '28', borderRadius: 2, padding: '1px 5px', letterSpacing: 1 }}>{(u.unlock_type || '').toUpperCase()}</span>
                            {u.tier > 1 && <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: '#ffd700', letterSpacing: 1 }}>T{u.tier}</span>}
                          </div>
                          <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 13, fontWeight: 600, color: '#fff' }}>{u.item_name}</div>
                        </div>
                        {u.rank_required && (
                          <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: '#ffd700', background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.2)', borderRadius: 3, padding: '2px 7px', letterSpacing: 1, flexShrink: 0, marginLeft: 8 }}>
                            RK{u.rank_required}
                          </span>
                        )}
                      </div>
                    );
                  }) : (
                    <div style={{ padding: '16px 18px', fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: '#222', letterSpacing: 1 }}>DATA PENDING</div>
                  )}
                </div>
              </div>

              {/* Materials */}
              <div style={{ background: '#0a0a0a', border: '1px solid ' + factionColor + '15', borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ padding: '12px 18px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 10, fontWeight: 700, color: factionColor, letterSpacing: 2 }}>FARM MATERIALS</span>
                </div>
                <div style={{ padding: '12px 18px' }}>
                  {factionMaterials.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {factionMaterials.map(function(m, i) {
                        return (
                          <span key={i} style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: factionColor, background: factionColor + '0e', border: '1px solid ' + factionColor + '22', borderRadius: 3, padding: '4px 10px', letterSpacing: 1 }}>
                            {m.material_name}
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: '#222', letterSpacing: 1 }}>DATA PENDING</div>
                  )}
                  {selectedFaction?.max_cost_summary && (
                    <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.05)', fontFamily: 'Rajdhani, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.25)', lineHeight: 1.6 }}>
                      <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: '#ffd700', letterSpacing: 1, display: 'block', marginBottom: 4 }}>TOTAL TO MAX:</span>
                      {selectedFaction.max_cost_summary}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ── SHELL ADVISOR ────────────────────────────── */}
      <section style={{ padding: '0 24px 64px', maxWidth: 1100, margin: '0 auto' }}>
        <SectionDivider label="SHELL FACTION ADVISOR" />
        <div style={{ background: 'rgba(255,136,0,0.02)', border: '1px solid rgba(255,136,0,0.1)', borderLeft: '3px solid rgba(255,136,0,0.4)', borderRadius: 8, padding: '28px', marginBottom: 20 }}>
          <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 12, fontWeight: 700, color: '#ff8800', letterSpacing: 2, marginBottom: 6 }}>WHICH FACTION SHOULD YOU PRIORITIZE?</div>
          <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.35)' }}>
            Select your shell to see which factions provide the most relevant stat bonuses for your playstyle.
          </div>
        </div>

        <div style={{ display: 'flex', gap: 3, marginBottom: 20, overflowX: 'auto', paddingBottom: 2 }}>
          {Object.keys(SHELL_PRIORITY_STATS).map(function(shell) {
            var active = activeShell === shell;
            return (
              <button key={shell} className="f-tab" onClick={function() { setActiveShell(shell); }}
                style={{ padding: '10px 18px', background: active ? 'rgba(255,136,0,0.08)' : '#0a0a0a', border: '1px solid ' + (active ? 'rgba(255,136,0,0.3)' : 'rgba(255,255,255,0.05)'), borderBottom: '2px solid ' + (active ? '#ff8800' : 'transparent'), borderRadius: '5px 5px 0 0', fontFamily: 'Orbitron, monospace', fontSize: 10, fontWeight: 700, color: active ? '#ff8800' : 'rgba(255,255,255,0.25)', letterSpacing: 1, cursor: 'pointer', flexShrink: 0 }}>
                {shell.toUpperCase()}
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20, padding: '14px 18px', background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 6 }}>
          <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.2)', letterSpacing: 2, marginRight: 4 }}>PRIORITY STATS:</span>
          {priorityStats.map(function(s) {
            return <span key={s} style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: '#ff8800', background: 'rgba(255,136,0,0.08)', border: '1px solid rgba(255,136,0,0.2)', borderRadius: 3, padding: '3px 10px', letterSpacing: 1 }}>{s}</span>;
          })}
        </div>

        {advisorResults.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {advisorResults.map(function(result, idx) {
              var color  = FACTION_COLORS[result.faction];
              var imgSrc = factionImage(result.faction);
              return (
                <div key={result.faction} className="f-row" style={{ display: 'grid', gridTemplateColumns: '30px 52px 140px 1fr auto', gap: 14, alignItems: 'center', background: '#0a0a0a', border: '1px solid ' + color + '15', borderLeft: '3px solid ' + color + (idx === 0 ? 'cc' : '44'), borderRadius: 6, padding: '12px 18px' }}>
                  <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 900, color: idx === 0 ? color : 'rgba(255,255,255,0.2)' }}>#{idx + 1}</span>
                  <div style={{ width: 36, height: 36, borderRadius: 6, overflow: 'hidden', border: '1px solid ' + color + '30', flexShrink: 0 }}>
                    <img src={imgSrc} alt={result.faction} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }} />
                  </div>
                  <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 12, fontWeight: 700, color: color, letterSpacing: 1 }}>{result.faction.toUpperCase()}</span>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {result.bonuses.map(function(b, bi) {
                      return <StatPill key={bi} label={b.stat_name} value={b.stat_value} color={color} />;
                    })}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 14, fontWeight: 900, color: color }}>+{result.totalBonus}</div>
                    <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: 'rgba(255,255,255,0.2)', letterSpacing: 1 }}>TOTAL</div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ padding: '32px', textAlign: 'center', background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 8 }}>
            <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: '#222', letterSpacing: 2 }}>FACTION STAT DATA PENDING — ADD DATA VIA ADMIN PANEL</div>
          </div>
        )}
      </section>

      {/* ── INVESTMENT EFFICIENCY ────────────────────── */}
      {efficiencyData.some(function(e) { return e.totalStat > 0; }) && (
        <section style={{ padding: '0 24px 64px', maxWidth: 1100, margin: '0 auto' }}>
          <SectionDivider label="FACTION INVESTMENT OVERVIEW" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {efficiencyData.map(function(item) {
              var color  = FACTION_COLORS[item.name];
              var leader = FACTION_LEADERS[item.name];
              var imgSrc = factionImage(item.name);
              return (
                <div key={item.name} className="f-row" style={{ display: 'grid', gridTemplateColumns: '52px 160px 1fr auto', gap: 16, alignItems: 'center', background: '#0a0a0a', border: '1px solid ' + color + '12', borderLeft: '3px solid ' + color + '66', borderRadius: 5, padding: '12px 18px' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 6, overflow: 'hidden', border: '1px solid ' + color + '25', flexShrink: 0 }}>
                    <img src={imgSrc} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }} />
                  </div>
                  <div>
                    <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 12, fontWeight: 700, color: color, letterSpacing: 1 }}>{item.name.toUpperCase()}</div>
                    <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.2)', letterSpacing: 1, marginTop: 2 }}>{leader}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                    {item.totalStat > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.2)', letterSpacing: 1 }}>TOTAL STAT:</span>
                        <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 11, fontWeight: 700, color: '#00ff88' }}>+{item.totalStat}</span>
                      </div>
                    )}
                    {item.maxRank > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.2)', letterSpacing: 1 }}>MAX RANK:</span>
                        <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: '#ffd700' }}>{item.maxRank}</span>
                      </div>
                    )}
                    {item.maxCreditCost > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.2)', letterSpacing: 1 }}>MAX CR:</span>
                        <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{item.maxCreditCost.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                  <button className="f-btn"
                    onClick={function() { setActiveFaction(item.name); document.getElementById('faction-detail')?.scrollIntoView({ behavior: 'smooth' }); }}
                    style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: color, background: color + '0e', border: '1px solid ' + color + '28', borderRadius: 4, padding: '6px 14px', cursor: 'pointer', letterSpacing: 1, flexShrink: 0 }}>
                    VIEW →
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── UNLOCK BROWSER ───────────────────────────── */}
      <section style={{ padding: '0 24px 64px', maxWidth: 1100, margin: '0 auto' }}>
        <SectionDivider label="UNLOCK BROWSER" />

        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <input type="text" placeholder="Search unlocks..." value={unlockSearch} onChange={function(e) { setUnlockSearch(e.target.value); }}
            style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: 4, padding: '8px 14px', fontFamily: 'Share Tech Mono, monospace', fontSize: 12, width: 200 }} />

          <select value={unlockFaction} onChange={function(e) { setUnlockFaction(e.target.value); }}
            style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: 4, padding: '8px 12px', fontFamily: 'Share Tech Mono, monospace', fontSize: 11, cursor: 'pointer' }}>
            <option value="all">All Factions</option>
            {FACTION_ORDER.map(function(f) { return <option key={f} value={f}>{f}</option>; })}
          </select>

          <div style={{ display: 'flex', gap: 3 }}>
            {['all', 'weapon', 'mod', 'implant', 'function', 'consumable', 'upgrade'].map(function(type) {
              var active = unlockFilter === type;
              var color  = type === 'all' ? '#00f5ff' : UNLOCK_TYPE_COLORS[type] || '#888';
              return (
                <button key={type} className="f-tab" onClick={function() { setUnlockFilter(type); }}
                  style={{ padding: '7px 12px', background: active ? color + '12' : '#0a0a0a', border: '1px solid ' + (active ? color + '35' : 'rgba(255,255,255,0.06)'), borderBottom: '2px solid ' + (active ? color : 'transparent'), borderRadius: '4px 4px 0 0', fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: active ? color : 'rgba(255,255,255,0.2)', letterSpacing: 1, cursor: 'pointer' }}>
                  {type.toUpperCase()}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: '#333', letterSpacing: 2, marginBottom: 10 }}>
          {filteredUnlocks.length} RESULT{filteredUnlocks.length !== 1 ? 'S' : ''}
        </div>

        {filteredUnlocks.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {filteredUnlocks.map(function(u, i) {
              var fcolor = FACTION_COLORS[u.faction_name] || '#888';
              var tcolor = UNLOCK_TYPE_COLORS[u.unlock_type] || '#888';
              return (
                <div key={i} className="f-row" style={{ display: 'grid', gridTemplateColumns: '110px 80px 1fr auto', gap: 14, alignItems: 'center', background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.04)', borderLeft: '2px solid ' + fcolor + '44', borderRadius: 4, padding: '12px 16px' }}>
                  <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: fcolor, letterSpacing: 1 }}>{u.faction_name.toUpperCase()}</span>
                  <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: tcolor, background: tcolor + '12', border: '1px solid ' + tcolor + '25', borderRadius: 3, padding: '2px 7px', letterSpacing: 1, textAlign: 'center' }}>{(u.unlock_type || '').toUpperCase()}</span>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 14, fontWeight: 600, color: '#fff' }}>{u.item_name}</span>
                      {u.tier > 1 && <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: '#ffd700', background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.2)', borderRadius: 2, padding: '1px 5px', letterSpacing: 1 }}>TIER {u.tier}</span>}
                    </div>
                    {u.notes && <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 2, lineHeight: 1.4 }}>{u.notes}</div>}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    {u.rank_required && (
                      <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: '#ffd700', background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.2)', borderRadius: 3, padding: '3px 8px', letterSpacing: 1, marginBottom: 3 }}>RANK {u.rank_required}</div>
                    )}
                    {u.credit_cost > 0 && (
                      <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.25)', letterSpacing: 1 }}>{u.credit_cost.toLocaleString()} CR</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ padding: '40px', textAlign: 'center', background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 8 }}>
            <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: '#222', letterSpacing: 2 }}>
              {unlocks.length === 0 ? 'UNLOCK DATA PENDING — ADD VIA ADMIN PANEL' : 'NO RESULTS MATCH YOUR FILTERS'}
            </div>
          </div>
        )}
      </section>

      {/* ── LIVE INTEL CTA ───────────────────────────── */}
      <section style={{ padding: '0 24px 80px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ background: 'rgba(255,215,0,0.02)', border: '1px solid rgba(255,215,0,0.08)', borderLeft: '3px solid rgba(255,215,0,0.35)', borderRadius: 8, padding: '28px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24, alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: '#ffd700', letterSpacing: 3, marginBottom: 10 }}>DEXTER — BUILD ENGINEER</div>
            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 17, fontWeight: 900, color: '#fff', letterSpacing: 1, lineHeight: 1.2, marginBottom: 10 }}>FACTION-AWARE<br /><span style={{ color: '#ffd700' }}>BUILD ANALYSIS.</span></div>
            <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.38)', lineHeight: 1.6 }}>DEXTER cites exact faction rank requirements and costs for every item he recommends. Know the full investment before you commit.</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {[
              { href: '/advisor',       color: '#ff8800', label: '⬢ BUILD ADVISOR',   desc: 'Get your full faction-aware build' },
              { href: '/intel/dexter',  color: '#ff8800', label: '⬢ DEXTER INTEL',    desc: 'Latest build analysis articles' },
              { href: '/intel/miranda', color: '#9b5de5', label: '◎ FACTION GUIDES',  desc: 'MIRANDA progression guides' },
              { href: '/builds',        color: '#444',    label: 'BUILD LAB',          desc: 'Full loadout browser' },
            ].map(function(l) {
              return (
                <Link key={l.href} href={l.href} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 14px', background: l.color + '06', border: '1px solid ' + l.color + '18', borderRadius: 5, textDecoration: 'none' }}>
                  <div>
                    <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: l.color, letterSpacing: 1 }}>{l.label}</div>
                    <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.18)', letterSpacing: 1, marginTop: 1 }}>{l.desc}</div>
                  </div>
                  <span style={{ color: l.color, opacity: 0.5, fontSize: 12 }}>→</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
