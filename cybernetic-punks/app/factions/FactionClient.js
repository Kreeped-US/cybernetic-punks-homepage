'use client';

import { useState } from 'react';
import Link from 'next/link';

// ── CONFIG ────────────────────────────────────────────────────
const FACTION_ORDER = ['Cyberacme', 'Nucaloric', 'Traxus', 'Mida', 'Arachne', 'Sekiguchi'];

const FACTION_COLORS = {
  Cyberacme: '#00ff41',
  Nucaloric: '#ff2d78',
  Traxus:    '#ff6600',
  Mida:      '#cc44ff',
  Arachne:   '#ff2222',
  Sekiguchi: '#c8b400',
};

const FACTION_LEADERS = {
  Cyberacme: 'CNI',
  Nucaloric: 'CAUS',
  Traxus:    'VULCAN',
  Mida:      '_GANTRY',
  Arachne:   'CHIMERA',
  Sekiguchi: 'NONA',
};

const FACTION_FOCUS = {
  Cyberacme: 'Loot / Extraction',
  Nucaloric: 'Support / Healing',
  Traxus:    'Weapons / Mods',
  Mida:      'Equipment / Grenades',
  Arachne:   'Melee / Combat',
  Sekiguchi: 'Energy / Capacitors',
};

const UNLOCK_TYPE_COLORS = {
  weapon:     '#ff2222',
  implant:    '#9b5de5',
  mod:        '#ff8800',
  consumable: '#00ff88',
  upgrade:    '#00d4ff',
  function:   '#ffd700',
};

const SHELL_PRIORITY_STATS = {
  Destroyer: ['Melee Damage', 'Tactical Recovery', 'Hardware', 'Firewall'],
  Vandal:    ['Heat Capacity', 'Agility', 'Prime Recovery'],
  Recon:     ['Tactical Recovery', 'Finisher Siphon', 'Ping Duration'],
  Assassin:  ['Prime Recovery', 'Firewall'],
  Triage:    ['Prime Recovery', 'Self-Repair Speed', 'Revive Speed'],
  Thief:     ['Loot Speed', 'Prime Recovery', 'Fall Resistance'],
  Rook:      ['Heat Capacity', 'Self-Repair Speed', 'Firewall'],
};

const SHELL_COLORS = {
  Assassin: '#cc44ff', Destroyer: '#ff3333', Recon: '#00d4ff',
  Rook: '#555555', Thief: '#ffd700', Triage: '#00ff88', Vandal: '#ff8800',
};

const EDITOR_COLORS = {
  CIPHER:  '#ff2222',
  NEXUS:   '#00d4ff',
  DEXTER:  '#ff8800',
  GHOST:   '#00ff88',
  MIRANDA: '#9b5de5',
};

const EDITOR_SYMBOLS = {
  CIPHER: '◈', NEXUS: '⬡', DEXTER: '⬢', GHOST: '◇', MIRANDA: '◎',
};

// ── HELPERS ────────────────────────────────────────────────────
function factionImage(fname) {
  return '/images/factions/' + fname.toLowerCase() + '.webp';
}

function itemImage(type, filename) {
  if (!filename) return null;
  var folder = type + 's'; // weapon -> weapons, implant -> implants, mod -> mods
  return '/images/' + folder + '/' + filename;
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  var diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 3600)  return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  return Math.floor(diff / 86400) + 'd ago';
}

function SectionHeader({ label, count, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
      <span style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 700, letterSpacing: 3, color: color || 'rgba(255,255,255,0.25)' }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: '#22252e' }} />
      {count !== undefined && (
        <span style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.25)', letterSpacing: 1, fontWeight: 700 }}>{count}</span>
      )}
    </div>
  );
}

function StatPill({ label, value, color }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: color + '10', border: '1px solid ' + color + '28', borderRadius: 2, padding: '3px 8px' }}>
      <span style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.4)', letterSpacing: 1, fontWeight: 700 }}>{label}</span>
      <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 10, fontWeight: 700, color: color }}>+{value}</span>
    </div>
  );
}

// ── MAIN ───────────────────────────────────────────────────────
export default function FactionClient({ data }) {
  var [activeFaction, setActiveFaction] = useState('Arachne');
  var [activeShell, setActiveShell]     = useState('Destroyer');
  var [unlockFilter, setUnlockFilter]   = useState('all');
  var [unlockSearch, setUnlockSearch]   = useState('');
  var [unlockFaction, setUnlockFaction] = useState('all');

  var factions    = data?.factions    || [];
  var statBonuses = data?.statBonuses || [];
  var unlocks     = data?.unlocks     || [];
  var materials   = data?.materials   || [];
  var weapons     = data?.weapons     || [];
  var implants    = data?.implants    || [];
  var mods        = data?.mods        || [];
  var articles    = data?.articles    || [];

  var selectedFaction    = factions.find(function(f) { return f.name === activeFaction; }) || null;
  var factionStats       = statBonuses.filter(function(s) { return s.faction_name === activeFaction; });
  var factionUnlocks     = unlocks.filter(function(u) { return u.faction_name === activeFaction; });
  var factionMaterials   = materials.filter(function(m) { return m.faction_name === activeFaction; });
  var factionWeapons     = weapons.filter(function(w) { return w.faction_source === activeFaction; });
  var factionImplants    = implants.filter(function(i) { return i.faction_source === activeFaction; });
  var factionMods        = mods.filter(function(m) { return m.faction_source === activeFaction; });
  var factionColor       = FACTION_COLORS[activeFaction] || '#00d4ff';

  // Articles that reference this faction (tag match)
  var factionArticles = articles.filter(function(a) {
    var tags = (a.tags || []).map(function(t) { return (t || '').toLowerCase(); });
    return tags.includes(activeFaction.toLowerCase()) || tags.includes('factions');
  }).slice(0, 6);

  // Shell advisor logic
  var priorityStats = SHELL_PRIORITY_STATS[activeShell] || [];
  var advisorResults = FACTION_ORDER.map(function(fname) {
    var relevantBonuses = statBonuses.filter(function(s) {
      return s.faction_name === fname && priorityStats.includes(s.stat_name);
    });
    var totalBonus = relevantBonuses.reduce(function(acc, s) { return acc + (s.stat_value || 0); }, 0);
    return { faction: fname, bonuses: relevantBonuses, totalBonus: totalBonus };
  }).filter(function(r) { return r.totalBonus > 0; }).sort(function(a, b) { return b.totalBonus - a.totalBonus; });

  // Unlock browser filters
  var filteredUnlocks = unlocks.filter(function(u) {
    var matchFaction = unlockFaction === 'all' || u.faction_name === unlockFaction;
    var matchType    = unlockFilter === 'all'  || u.unlock_type === unlockFilter;
    var matchSearch  = !unlockSearch || u.item_name.toLowerCase().includes(unlockSearch.toLowerCase()) || (u.notes || '').toLowerCase().includes(unlockSearch.toLowerCase());
    return matchFaction && matchType && matchSearch;
  });

  // Investment efficiency summary
  var efficiencyData = FACTION_ORDER.map(function(fname) {
    var fStats    = statBonuses.filter(function(s) { return s.faction_name === fname; });
    var totalStat = fStats.reduce(function(acc, s) { return acc + (s.stat_value || 0); }, 0);
    var maxRank   = fStats.reduce(function(acc, s) { return Math.max(acc, s.rank_required || 0); }, 0);
    var fData     = factions.find(function(f) { return f.name === fname; });
    var itemCount = weapons.filter(function(w) { return w.faction_source === fname; }).length
                  + implants.filter(function(i) { return i.faction_source === fname; }).length
                  + mods.filter(function(m) { return m.faction_source === fname; }).length
                  + unlocks.filter(function(u) { return u.faction_name === fname; }).length;
    return { name: fname, totalStat, maxRank, maxCreditCost: fData?.max_credit_cost || 0, itemCount };
  }).sort(function(a, b) { return b.itemCount - a.itemCount; });

  // Counts for hero
  var totalItems    = weapons.length + implants.length + mods.length;
  var totalBonuses  = statBonuses.length;
  var totalArticles = articles.length;

  return (
    <main style={{ background: '#121418', minHeight: '100vh', color: '#fff', paddingTop: 48 }}>

      <style>{`
        .f-card        { transition: background 0.12s, border-color 0.12s; }
        .f-card:hover  { background: #1e2228 !important; }
        .f-row:hover   { background: #1e2228 !important; }
        .f-btn         { transition: background 0.12s, border-color 0.12s, color 0.12s; cursor: pointer; }
        .f-btn:hover   { background: #1e2228 !important; }
        .f-tab-btn     { transition: background 0.12s, border-color 0.12s; cursor: pointer; }
        .f-tab-btn:hover { background: #1e2228 !important; }
      `}</style>

      {/* ══ HERO ════════════════════════════════════════════ */}
      <section style={{ padding: '48px 24px 40px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 48, alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, color: '#ffd700', background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.25)', borderRadius: 2, padding: '3px 10px', letterSpacing: 2 }}>6 FACTIONS</span>
              <span style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.04)', border: '1px solid #22252e', borderRadius: 2, padding: '3px 10px', letterSpacing: 2 }}>SEASON 1</span>
            </div>

            <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: 'clamp(2.2rem, 6vw, 4rem)', fontWeight: 900, letterSpacing: 1, lineHeight: 1.0, margin: '0 0 18px' }}>
              FACTION<br /><span style={{ color: '#ffd700' }}>INTEL</span>
            </h1>

            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, maxWidth: 460, marginBottom: 24 }}>
              Six factions. Each controls access to weapons, mods, implants, and permanent stat upgrades. Level them up, buy unlocks with credits and materials, and build the Runner you want.
            </p>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Link href="/advisor" style={{ padding: '11px 22px', background: '#ff8800', color: '#000', fontSize: 11, fontWeight: 800, letterSpacing: 2, borderRadius: 2, textDecoration: 'none', fontFamily: 'monospace' }}>
                BUILD ADVISOR →
              </Link>
              <Link href="/builds" style={{ padding: '11px 22px', background: '#1a1d24', border: '1px solid #22252e', color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 700, letterSpacing: 2, borderRadius: 2, textDecoration: 'none', fontFamily: 'monospace' }}>
                BUILD LAB →
              </Link>
            </div>

            {/* Live intel summary */}
            {(totalItems > 0 || totalBonuses > 0) && (
              <div style={{ marginTop: 24, padding: '12px 16px', background: '#1a1d24', border: '1px solid #22252e', borderLeft: '2px solid #ffd700', borderRadius: '0 2px 2px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#ffd700' }} />
                  <span style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, letterSpacing: 2, color: '#ffd700' }}>LIVE DATA</span>
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>
                  <strong style={{ color: '#fff' }}>{totalItems}</strong> faction-gated items ·{' '}
                  <strong style={{ color: '#fff' }}>{totalBonuses}</strong> stat bonuses ·{' '}
                  <strong style={{ color: '#fff' }}>{unlocks.length}</strong> unlocks tracked ·{' '}
                  <strong style={{ color: '#fff' }}>{totalArticles}</strong> related articles
                </div>
              </div>
            )}
          </div>

          {/* Faction grid with bg images */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
            {FACTION_ORDER.map(function(fname) {
              var color  = FACTION_COLORS[fname];
              var leader = FACTION_LEADERS[fname];
              var focus  = FACTION_FOCUS[fname];
              var fData  = factions.find(function(f) { return f.name === fname; });
              var imgSrc = factionImage(fname);
              return (
                <button key={fname} className="f-card"
                  onClick={function() {
                    setActiveFaction(fname);
                    setTimeout(function() { document.getElementById('faction-detail')?.scrollIntoView({ behavior: 'smooth' }); }, 50);
                  }}
                  style={{
                    position: 'relative',
                    background: '#1a1d24',
                    border: '1px solid #22252e',
                    borderTop: '2px solid ' + color,
                    borderRadius: '0 0 2px 2px',
                    padding: 0,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    textAlign: 'left',
                    minHeight: 130,
                  }}>
                  <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url(' + imgSrc + ')', backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.15 }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, ' + color + '12 0%, transparent 60%, rgba(18,20,24,0.6) 100%)' }} />
                  <div style={{ position: 'relative', zIndex: 1, padding: '14px 12px' }}>
                    <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 11, fontWeight: 700, color: color, letterSpacing: 1, marginBottom: 3 }}>{fname.toUpperCase()}</div>
                    <div style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.4)', letterSpacing: 1, marginBottom: 6, fontWeight: 700 }}>{leader}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', lineHeight: 1.3, marginBottom: 8 }}>{focus}</div>
                    {fData?.max_credit_cost > 0 && (
                      <div style={{ fontFamily: 'monospace', fontSize: 8, color: color, letterSpacing: 1, fontWeight: 700 }}>
                        {fData.max_credit_cost.toLocaleString()} CR MAX
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══ FACTION TABS + DETAIL ═══════════════════════════ */}
      <section id="faction-detail" style={{ padding: '0 24px 48px', maxWidth: 1200, margin: '0 auto' }}>
        <SectionHeader label="FACTION OVERVIEW" />

        {/* Tab bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 3, marginBottom: 3 }}>
          {FACTION_ORDER.map(function(fname) {
            var active = activeFaction === fname;
            var color  = FACTION_COLORS[fname];
            var imgSrc = factionImage(fname);
            return (
              <button key={fname} className="f-tab-btn" onClick={function() { setActiveFaction(fname); }}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                  padding: '10px 8px',
                  background: '#1a1d24',
                  border: '1px solid ' + (active ? color + '55' : '#22252e'),
                  borderTop: '2px solid ' + (active ? color : '#22252e'),
                  borderRadius: '0 0 2px 2px',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden',
                }}>
                {active && (
                  <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url(' + imgSrc + ')', backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.08 }} />
                )}
                <div style={{ position: 'relative', zIndex: 1, width: 32, height: 32, borderRadius: '50%', overflow: 'hidden', border: '1px solid ' + (active ? color + '60' : '#22252e'), flexShrink: 0, background: '#0e1014' }}>
                  <img src={imgSrc} alt={fname} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: active ? 1 : 0.5 }} />
                </div>
                <span style={{ position: 'relative', zIndex: 1, fontFamily: 'monospace', fontSize: 8, color: active ? color : 'rgba(255,255,255,0.3)', letterSpacing: 1, fontWeight: 700 }}>
                  {fname.toUpperCase()}
                </span>
              </button>
            );
          })}
        </div>

        {/* Detail panel */}
        <div style={{ position: 'relative', background: '#1a1d24', border: '1px solid #22252e', borderLeft: '3px solid ' + factionColor, borderRadius: '0 2px 2px 0', padding: 24, overflow: 'hidden' }}>
          {/* Faction image bg */}
          <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '35%', backgroundImage: 'url(' + factionImage(activeFaction) + ')', backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.06, pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '40%', background: 'linear-gradient(to right, #1a1d24, transparent)', pointerEvents: 'none' }} />

          {/* Header */}
          <div style={{ position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: '1fr auto', gap: 20, alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
                <div style={{ width: 48, height: 48, borderRadius: 2, overflow: 'hidden', border: '1px solid ' + factionColor + '40', flexShrink: 0, background: '#0e1014' }}>
                  <img src={factionImage(activeFaction)} alt={activeFaction} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div>
                  <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 22, fontWeight: 900, color: factionColor, letterSpacing: 1, lineHeight: 1, marginBottom: 4 }}>{activeFaction.toUpperCase()}</div>
                  <div style={{ fontFamily: 'monospace', fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: 2, fontWeight: 700 }}>LEADER: {FACTION_LEADERS[activeFaction]}</div>
                </div>
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, maxWidth: 540 }}>
                {selectedFaction?.description || FACTION_FOCUS[activeFaction]}
              </div>
            </div>
            {selectedFaction?.max_credit_cost > 0 && (
              <div style={{ background: '#0e1014', border: '1px solid #22252e', borderRadius: 2, padding: '12px 16px', textAlign: 'center', flexShrink: 0 }}>
                <div style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, marginBottom: 6, fontWeight: 700 }}>FULL MAX COST</div>
                <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 18, fontWeight: 900, color: factionColor, lineHeight: 1 }}>{selectedFaction.max_credit_cost.toLocaleString()}</div>
                <div style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, marginTop: 4, fontWeight: 700 }}>CREDITS</div>
              </div>
            )}
          </div>

          {/* Stats + Unlocks + Materials */}
          <div style={{ position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 }}>
            {/* Stat bonuses */}
            <div style={{ background: '#0e1014', border: '1px solid #22252e', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ padding: '10px 14px', borderBottom: '1px solid #22252e', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 10, fontWeight: 700, color: factionColor, letterSpacing: 1.5 }}>STAT BONUSES</span>
                <span style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.25)', letterSpacing: 1, fontWeight: 700 }}>{factionStats.length}</span>
              </div>
              <div>
                {factionStats.length > 0 ? factionStats.map(function(s, i) {
                  return (
                    <div key={i} className="f-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 14px', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{s.stat_name}</div>
                        {s.rank_required && (
                          <div style={{ fontFamily: 'monospace', fontSize: 8, color: '#ffd700', letterSpacing: 1, marginTop: 2, fontWeight: 700 }}>
                            RANK {s.rank_required}{s.credit_cost ? ' · ' + s.credit_cost.toLocaleString() + ' CR' : ''}
                          </div>
                        )}
                      </div>
                      <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 12, fontWeight: 900, color: '#00ff41' }}>+{s.stat_value}</span>
                    </div>
                  );
                }) : (
                  <div style={{ padding: '14px', fontFamily: 'monospace', fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: 1, fontWeight: 700 }}>DATA PENDING</div>
                )}
              </div>
            </div>

            {/* Unlocks */}
            <div style={{ background: '#0e1014', border: '1px solid #22252e', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ padding: '10px 14px', borderBottom: '1px solid #22252e', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 10, fontWeight: 700, color: factionColor, letterSpacing: 1.5 }}>UNLOCKS</span>
                <span style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.25)', letterSpacing: 1, fontWeight: 700 }}>{factionUnlocks.length}</span>
              </div>
              <div style={{ maxHeight: 260, overflowY: 'auto' }}>
                {factionUnlocks.length > 0 ? factionUnlocks.map(function(u, i) {
                  var tc = UNLOCK_TYPE_COLORS[u.unlock_type] || '#888';
                  return (
                    <div key={i} className="f-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                          <span style={{ fontFamily: 'monospace', fontSize: 7, color: tc, background: tc + '18', border: '1px solid ' + tc + '30', borderRadius: 2, padding: '1px 5px', letterSpacing: 1, fontWeight: 700 }}>{(u.unlock_type || '').toUpperCase()}</span>
                          {u.tier > 1 && <span style={{ fontFamily: 'monospace', fontSize: 7, color: '#ffd700', letterSpacing: 1, fontWeight: 700 }}>T{u.tier}</span>}
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.item_name}</div>
                      </div>
                      {u.rank_required && (
                        <span style={{ fontFamily: 'monospace', fontSize: 8, color: '#ffd700', background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.25)', borderRadius: 2, padding: '2px 6px', letterSpacing: 1, flexShrink: 0, marginLeft: 6, fontWeight: 700 }}>RK{u.rank_required}</span>
                      )}
                    </div>
                  );
                }) : (
                  <div style={{ padding: '14px', fontFamily: 'monospace', fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: 1, fontWeight: 700 }}>DATA PENDING</div>
                )}
              </div>
            </div>

            {/* Materials */}
            <div style={{ background: '#0e1014', border: '1px solid #22252e', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ padding: '10px 14px', borderBottom: '1px solid #22252e', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 10, fontWeight: 700, color: factionColor, letterSpacing: 1.5 }}>FARM MATERIALS</span>
                <span style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.25)', letterSpacing: 1, fontWeight: 700 }}>{factionMaterials.length}</span>
              </div>
              <div style={{ padding: '12px 14px' }}>
                {factionMaterials.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {factionMaterials.map(function(m, i) {
                      return (
                        <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'monospace', fontSize: 9, color: factionColor, background: factionColor + '0e', border: '1px solid ' + factionColor + '28', borderRadius: 2, padding: '4px 8px', letterSpacing: 1, fontWeight: 700 }}>
                          {m.image_filename && (
                            <img src={'/images/materials/' + m.image_filename} alt={m.material_name} style={{ width: 16, height: 16, objectFit: 'contain', flexShrink: 0 }} />
                          )}
                          {m.material_name}
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ fontFamily: 'monospace', fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: 1, fontWeight: 700 }}>DATA PENDING</div>
                )}
                {selectedFaction?.max_cost_summary && (
                  <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontFamily: 'monospace', fontSize: 8, color: '#ffd700', letterSpacing: 1.5, marginBottom: 4, fontWeight: 700 }}>TOTAL TO MAX:</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>{selectedFaction.max_cost_summary}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ FACTION ARSENAL (cross-referenced items) ════════ */}
      {(factionWeapons.length + factionImplants.length + factionMods.length) > 0 && (
        <section style={{ padding: '0 24px 48px', maxWidth: 1200, margin: '0 auto' }}>
          <SectionHeader
            label={activeFaction.toUpperCase() + ' ARSENAL'}
            count={(factionWeapons.length + factionImplants.length + factionMods.length) + ' ITEMS'}
            color={factionColor}
          />

          <div style={{ background: '#1a1d24', border: '1px solid #22252e', borderLeft: '2px solid ' + factionColor, borderRadius: '0 2px 2px 0', padding: '12px 16px', marginBottom: 10 }}>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>
              All items gated by <strong style={{ color: factionColor }}>{activeFaction}</strong> from your arsenal database. Each item is locked behind this faction's rank progression.
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 6 }}>
            {factionWeapons.map(function(w) {
              var imgSrc = itemImage('weapon', w.image_filename);
              var rankedBad = w.ranked_viable === false;
              return (
                <div key={'w-' + w.name} className="f-card" style={{ background: '#1a1d24', border: '1px solid #22252e', borderLeft: '2px solid #ff2222', borderRadius: '0 2px 2px 0', padding: '10px 12px', display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div style={{ width: 36, height: 36, flexShrink: 0, background: '#0e1014', border: '1px solid #22252e', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {imgSrc ? <img src={imgSrc} alt={w.name} style={{ width: 32, height: 32, objectFit: 'contain' }} /> : <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.15)' }}>⬢</span>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2, flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 7, color: '#ff2222', background: 'rgba(255,34,34,0.12)', border: '1px solid rgba(255,34,34,0.3)', borderRadius: 2, padding: '1px 4px', letterSpacing: 1, fontWeight: 700 }}>WEAPON</span>
                      {rankedBad && <span style={{ fontFamily: 'monospace', fontSize: 7, color: '#ff2222', letterSpacing: 1, fontWeight: 700 }}>⚠ NOT RANKED</span>}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 1 }}>{w.name}</div>
                    <div style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.4)', letterSpacing: 1, fontWeight: 700 }}>{w.weapon_type || 'WEAPON'} · {w.rarity || '—'}</div>
                  </div>
                </div>
              );
            })}

            {factionImplants.map(function(i) {
              var imgSrc = itemImage('implant', i.image_filename);
              return (
                <div key={'i-' + i.name} className="f-card" style={{ background: '#1a1d24', border: '1px solid #22252e', borderLeft: '2px solid #9b5de5', borderRadius: '0 2px 2px 0', padding: '10px 12px', display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div style={{ width: 36, height: 36, flexShrink: 0, background: '#0e1014', border: '1px solid #22252e', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {imgSrc ? <img src={imgSrc} alt={i.name} style={{ width: 32, height: 32, objectFit: 'contain' }} /> : <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.15)' }}>◇</span>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2, flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 7, color: '#9b5de5', background: 'rgba(155,93,229,0.15)', border: '1px solid rgba(155,93,229,0.35)', borderRadius: 2, padding: '1px 4px', letterSpacing: 1, fontWeight: 700 }}>IMPLANT</span>
                      {i.required_runner && i.required_runner !== 'Universal' && (
                        <span style={{ fontFamily: 'monospace', fontSize: 7, color: SHELL_COLORS[i.required_runner] || '#888', letterSpacing: 1, fontWeight: 700 }}>{i.required_runner.toUpperCase()}</span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 1 }}>{i.name}</div>
                    <div style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.4)', letterSpacing: 1, fontWeight: 700 }}>{i.slot_type || '—'} · {i.rarity || '—'}</div>
                  </div>
                </div>
              );
            })}

            {factionMods.map(function(m) {
              var imgSrc = itemImage('mod', m.image_filename);
              return (
                <div key={'m-' + m.name} className="f-card" style={{ background: '#1a1d24', border: '1px solid #22252e', borderLeft: '2px solid #ff8800', borderRadius: '0 2px 2px 0', padding: '10px 12px', display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div style={{ width: 36, height: 36, flexShrink: 0, background: '#0e1014', border: '1px solid #22252e', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {imgSrc ? <img src={imgSrc} alt={m.name} style={{ width: 32, height: 32, objectFit: 'contain' }} /> : <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.15)' }}>◆</span>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ marginBottom: 2 }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 7, color: '#ff8800', background: 'rgba(255,136,0,0.15)', border: '1px solid rgba(255,136,0,0.35)', borderRadius: 2, padding: '1px 4px', letterSpacing: 1, fontWeight: 700 }}>MOD</span>
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 1 }}>{m.name}</div>
                    <div style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.4)', letterSpacing: 1, fontWeight: 700 }}>{m.slot_type || '—'} · {m.rarity || '—'}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ══ EDITOR ARTICLES (cross-referenced) ══════════════ */}
      {factionArticles.length > 0 && (
        <section style={{ padding: '0 24px 48px', maxWidth: 1200, margin: '0 auto' }}>
          <SectionHeader label={activeFaction.toUpperCase() + ' INTEL'} count={factionArticles.length + ' ARTICLES'} color={factionColor} />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 }}>
            {factionArticles.map(function(article) {
              var color = EDITOR_COLORS[article.editor] || '#888';
              var symbol = EDITOR_SYMBOLS[article.editor] || '·';
              var portrait = '/images/editors/' + (article.editor || '').toLowerCase() + '.jpg';
              return (
                <Link key={article.id} href={'/intel/' + article.slug} className="f-card"
                  style={{ background: '#1a1d24', border: '1px solid #22252e', borderLeft: '2px solid ' + color, borderRadius: '0 2px 2px 0', overflow: 'hidden', textDecoration: 'none' }}>
                  {article.thumbnail && (
                    <div style={{ height: 90, background: '#0e1014', overflow: 'hidden', position: 'relative' }}>
                      <img src={article.thumbnail} alt={article.headline} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 50%, rgba(26,29,36,0.95))' }} />
                    </div>
                  )}
                  <div style={{ padding: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <div style={{ width: 22, height: 22, borderRadius: '50%', overflow: 'hidden', border: '1px solid ' + color + '40', flexShrink: 0 }}>
                        <img src={portrait} alt={article.editor} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                      <span style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, letterSpacing: 2, color: color }}>{symbol} {article.editor}</span>
                      {article.ce_score > 0 && (
                        <span style={{ marginLeft: 'auto', fontFamily: 'monospace', fontSize: 9, fontWeight: 800, color: color, background: color + '18', border: '1px solid ' + color + '30', borderRadius: 2, padding: '1px 5px' }}>{article.ce_score}</span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.85)', lineHeight: 1.35, marginBottom: 6 }}>
                      {article.headline}
                    </div>
                    <div style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, fontWeight: 700 }}>{timeAgo(article.created_at)}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ══ SHELL FACTION ADVISOR ═══════════════════════════ */}
      <section style={{ padding: '0 24px 48px', maxWidth: 1200, margin: '0 auto' }}>
        <SectionHeader label="SHELL FACTION ADVISOR" />

        <div style={{ background: '#1a1d24', border: '1px solid #22252e', borderLeft: '2px solid #ff8800', borderRadius: '0 2px 2px 0', padding: '14px 18px', marginBottom: 14 }}>
          <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 12, fontWeight: 700, color: '#ff8800', letterSpacing: 1, marginBottom: 4 }}>WHICH FACTION SHOULD YOU PRIORITIZE?</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>Select your shell to see which factions provide the most relevant stat bonuses for your playstyle.</div>
        </div>

        {/* Shell tabs */}
        <div style={{ display: 'flex', gap: 3, marginBottom: 14, overflowX: 'auto', paddingBottom: 2 }}>
          {Object.keys(SHELL_PRIORITY_STATS).map(function(shell) {
            var active = activeShell === shell;
            var sColor = SHELL_COLORS[shell] || '#888';
            return (
              <button key={shell} className="f-tab-btn" onClick={function() { setActiveShell(shell); }}
                style={{ padding: '8px 16px', background: '#1a1d24', border: '1px solid ' + (active ? sColor + '55' : '#22252e'), borderTop: '2px solid ' + (active ? sColor : '#22252e'), borderRadius: '0 0 2px 2px', fontFamily: 'Orbitron, monospace', fontSize: 10, fontWeight: 700, color: active ? sColor : 'rgba(255,255,255,0.3)', letterSpacing: 1, cursor: 'pointer', flexShrink: 0 }}>
                {shell.toUpperCase()}
              </button>
            );
          })}
        </div>

        {/* Priority stats display */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14, padding: '12px 16px', background: '#1a1d24', border: '1px solid #22252e', borderRadius: 2 }}>
          <span style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, marginRight: 4, fontWeight: 700 }}>PRIORITY STATS:</span>
          {priorityStats.map(function(s) {
            return <span key={s} style={{ fontFamily: 'monospace', fontSize: 9, color: '#ff8800', background: 'rgba(255,136,0,0.08)', border: '1px solid rgba(255,136,0,0.25)', borderRadius: 2, padding: '2px 8px', letterSpacing: 1, fontWeight: 700 }}>{s}</span>;
          })}
        </div>

        {/* Rankings */}
        {advisorResults.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {advisorResults.map(function(result, idx) {
              var color  = FACTION_COLORS[result.faction];
              var imgSrc = factionImage(result.faction);
              return (
                <div key={result.faction} className="f-row" style={{ display: 'grid', gridTemplateColumns: '28px 44px 130px 1fr auto', gap: 12, alignItems: 'center', background: '#1a1d24', border: '1px solid #22252e', borderLeft: '3px solid ' + color + (idx === 0 ? 'ff' : '66'), borderRadius: '0 2px 2px 0', padding: '10px 14px' }}>
                  <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 900, color: idx === 0 ? color : 'rgba(255,255,255,0.25)' }}>#{idx + 1}</span>
                  <div style={{ width: 32, height: 32, borderRadius: 2, overflow: 'hidden', border: '1px solid ' + color + '30', flexShrink: 0 }}>
                    <img src={imgSrc} alt={result.faction} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 12, fontWeight: 700, color: color, letterSpacing: 1 }}>{result.faction.toUpperCase()}</span>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    {result.bonuses.map(function(b, bi) {
                      return <StatPill key={bi} label={b.stat_name} value={b.stat_value} color={color} />;
                    })}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 14, fontWeight: 900, color: color }}>+{result.totalBonus}</div>
                    <div style={{ fontFamily: 'monospace', fontSize: 7, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, fontWeight: 700 }}>TOTAL</div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ padding: 28, textAlign: 'center', background: '#1a1d24', border: '1px solid #22252e', borderRadius: 2 }}>
            <div style={{ fontFamily: 'monospace', fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, fontWeight: 700 }}>FACTION STAT DATA PENDING — ADD VIA ADMIN PANEL</div>
          </div>
        )}
      </section>

      {/* ══ INVESTMENT OVERVIEW ═════════════════════════════ */}
      {efficiencyData.some(function(e) { return e.totalStat > 0 || e.itemCount > 0; }) && (
        <section style={{ padding: '0 24px 48px', maxWidth: 1200, margin: '0 auto' }}>
          <SectionHeader label="INVESTMENT OVERVIEW" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {efficiencyData.map(function(item) {
              var color  = FACTION_COLORS[item.name];
              var leader = FACTION_LEADERS[item.name];
              var imgSrc = factionImage(item.name);
              return (
                <div key={item.name} className="f-row" style={{ display: 'grid', gridTemplateColumns: '44px 150px 1fr auto', gap: 14, alignItems: 'center', background: '#1a1d24', border: '1px solid #22252e', borderLeft: '3px solid ' + color, borderRadius: '0 2px 2px 0', padding: '10px 14px' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 2, overflow: 'hidden', border: '1px solid ' + color + '30', flexShrink: 0 }}>
                    <img src={imgSrc} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div>
                    <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 12, fontWeight: 700, color: color, letterSpacing: 1 }}>{item.name.toUpperCase()}</div>
                    <div style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, marginTop: 2, fontWeight: 700 }}>{leader}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    {item.itemCount > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, fontWeight: 700 }}>ITEMS:</span>
                        <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 11, fontWeight: 700, color: '#fff' }}>{item.itemCount}</span>
                      </div>
                    )}
                    {item.totalStat > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, fontWeight: 700 }}>STATS:</span>
                        <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 11, fontWeight: 700, color: '#00ff41' }}>+{item.totalStat}</span>
                      </div>
                    )}
                    {item.maxRank > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, fontWeight: 700 }}>MAX RANK:</span>
                        <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#ffd700', fontWeight: 700 }}>{item.maxRank}</span>
                      </div>
                    )}
                    {item.maxCreditCost > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, fontWeight: 700 }}>MAX CR:</span>
                        <span style={{ fontFamily: 'monospace', fontSize: 10, color: 'rgba(255,255,255,0.55)', fontWeight: 700 }}>{item.maxCreditCost.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                  <button className="f-btn"
                    onClick={function() {
                      setActiveFaction(item.name);
                      setTimeout(function() { document.getElementById('faction-detail')?.scrollIntoView({ behavior: 'smooth' }); }, 50);
                    }}
                    style={{ fontFamily: 'monospace', fontSize: 9, color: color, background: color + '0e', border: '1px solid ' + color + '30', borderRadius: 2, padding: '5px 12px', cursor: 'pointer', letterSpacing: 1, flexShrink: 0, fontWeight: 700 }}>
                    VIEW →
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ══ UNLOCK BROWSER ══════════════════════════════════ */}
      <section style={{ padding: '0 24px 48px', maxWidth: 1200, margin: '0 auto' }}>
        <SectionHeader label="UNLOCK BROWSER" count={filteredUnlocks.length + ' / ' + unlocks.length} />

        {/* Filters */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <input type="text" placeholder="Search unlocks..." value={unlockSearch} onChange={function(e) { setUnlockSearch(e.target.value); }}
            style={{ background: '#1a1d24', border: '1px solid #22252e', color: '#fff', borderRadius: 2, padding: '8px 12px', fontFamily: 'monospace', fontSize: 12, width: 200, outline: 'none' }} />

          <select value={unlockFaction} onChange={function(e) { setUnlockFaction(e.target.value); }}
            style={{ background: '#1a1d24', border: '1px solid #22252e', color: '#fff', borderRadius: 2, padding: '8px 10px', fontFamily: 'monospace', fontSize: 11, cursor: 'pointer', outline: 'none' }}>
            <option value="all">All Factions</option>
            {FACTION_ORDER.map(function(f) { return <option key={f} value={f}>{f}</option>; })}
          </select>

          <div style={{ display: 'flex', gap: 3 }}>
            {['all', 'weapon', 'mod', 'implant', 'function', 'consumable', 'upgrade'].map(function(type) {
              var active = unlockFilter === type;
              var color  = type === 'all' ? '#00d4ff' : UNLOCK_TYPE_COLORS[type] || '#888';
              return (
                <button key={type} className="f-tab-btn" onClick={function() { setUnlockFilter(type); }}
                  style={{ padding: '6px 12px', background: '#1a1d24', border: '1px solid ' + (active ? color + '50' : '#22252e'), borderTop: '2px solid ' + (active ? color : '#22252e'), borderRadius: '0 0 2px 2px', fontFamily: 'monospace', fontSize: 9, color: active ? color : 'rgba(255,255,255,0.3)', letterSpacing: 1, cursor: 'pointer', fontWeight: 700 }}>
                  {type.toUpperCase()}
                </button>
              );
            })}
          </div>
        </div>

        {/* Results */}
        {filteredUnlocks.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {filteredUnlocks.map(function(u, i) {
              var fcolor = FACTION_COLORS[u.faction_name] || '#888';
              var tcolor = UNLOCK_TYPE_COLORS[u.unlock_type] || '#888';
              return (
                <div key={i} className="f-row" style={{ display: 'grid', gridTemplateColumns: '110px 80px 1fr auto', gap: 12, alignItems: 'center', background: '#1a1d24', border: '1px solid #22252e', borderLeft: '2px solid ' + fcolor, borderRadius: '0 2px 2px 0', padding: '10px 14px' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 9, color: fcolor, letterSpacing: 1, fontWeight: 700 }}>{u.faction_name.toUpperCase()}</span>
                  <span style={{ fontFamily: 'monospace', fontSize: 8, color: tcolor, background: tcolor + '14', border: '1px solid ' + tcolor + '30', borderRadius: 2, padding: '2px 6px', letterSpacing: 1, textAlign: 'center', fontWeight: 700 }}>{(u.unlock_type || '').toUpperCase()}</span>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{u.item_name}</span>
                      {u.tier > 1 && <span style={{ fontFamily: 'monospace', fontSize: 7, color: '#ffd700', background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.25)', borderRadius: 2, padding: '1px 5px', letterSpacing: 1, fontWeight: 700 }}>TIER {u.tier}</span>}
                    </div>
                    {u.notes && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2, lineHeight: 1.4 }}>{u.notes}</div>}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    {u.rank_required && (
                      <div style={{ fontFamily: 'monospace', fontSize: 9, color: '#ffd700', background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.25)', borderRadius: 2, padding: '2px 7px', letterSpacing: 1, marginBottom: 3, fontWeight: 700 }}>RANK {u.rank_required}</div>
                    )}
                    {u.credit_cost > 0 && (
                      <div style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.4)', letterSpacing: 1, fontWeight: 700 }}>{u.credit_cost.toLocaleString()} CR</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ padding: 32, textAlign: 'center', background: '#1a1d24', border: '1px solid #22252e', borderRadius: 2 }}>
            <div style={{ fontFamily: 'monospace', fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, fontWeight: 700 }}>
              {unlocks.length === 0 ? 'UNLOCK DATA PENDING — ADD VIA ADMIN PANEL' : 'NO RESULTS MATCH YOUR FILTERS'}
            </div>
          </div>
        )}
      </section>

      {/* ══ CTA ═════════════════════════════════════════════ */}
      <section style={{ padding: '0 24px 64px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ background: '#1a1d24', border: '1px solid #22252e', borderLeft: '3px solid #ffd700', borderRadius: '0 2px 2px 0', padding: 24, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: 'monospace', fontSize: 9, color: '#ffd700', letterSpacing: 3, fontWeight: 700, marginBottom: 8 }}>DEXTER — BUILD ENGINEER</div>
            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 18, fontWeight: 900, color: '#fff', letterSpacing: 1, lineHeight: 1.1, marginBottom: 10 }}>
              FACTION-AWARE<br /><span style={{ color: '#ffd700' }}>BUILD ANALYSIS.</span>
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>
              DEXTER cites exact faction rank requirements and costs for every item he recommends. Know the full investment before you commit.
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              { href: '/advisor',       color: '#ff8800', label: '⬢ BUILD ADVISOR',    desc: 'Get your faction-aware build' },
              { href: '/intel/dexter',  color: '#ff8800', label: '⬢ DEXTER INTEL',     desc: 'Latest build analysis' },
              { href: '/intel/miranda', color: '#9b5de5', label: '◎ FACTION GUIDES',   desc: 'MIRANDA progression' },
              { href: '/builds',        color: '#00d4ff', label: 'BUILD LAB',           desc: 'Full loadout browser' },
            ].map(function(l) {
              return (
                <Link key={l.href} href={l.href} className="f-btn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#1a1d24', border: '1px solid #22252e', borderLeft: '2px solid ' + l.color, borderRadius: '0 2px 2px 0', textDecoration: 'none' }}>
                  <div>
                    <div style={{ fontFamily: 'monospace', fontSize: 10, color: l.color, letterSpacing: 1, fontWeight: 700 }}>{l.label}</div>
                    <div style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, marginTop: 2, fontWeight: 700 }}>{l.desc}</div>
                  </div>
                  <span style={{ color: l.color, opacity: 0.5, fontSize: 13 }}>→</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
