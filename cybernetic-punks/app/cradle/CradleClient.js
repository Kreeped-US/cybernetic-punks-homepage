'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';

// Track visual language - matches site color system
var TRACK_META = {
  Strength:   { color: '#ff2222', symbol: '◈', blurb: 'Melee damage & finishers' },
  Recharge:   { color: '#00d4ff', symbol: '⬡', blurb: 'Ability recovery speed' },
  Dexterity:  { color: '#ffd700', symbol: '⬢', blurb: 'Agility & loot speed' },
  Endurance:  { color: '#00ff41', symbol: '◇', blurb: 'Heat capacity & fall resistance' },
  Support:    { color: '#9b5de5', symbol: '◎', blurb: 'Revive speed & ping' },
  Resistance: { color: '#ff8800', symbol: '◆', blurb: 'Self-repair, hardware, firewall' },
};

var TRACK_ORDER = ['Strength', 'Recharge', 'Dexterity', 'Endurance', 'Support', 'Resistance'];

var MAX_PER_TRACK = 14;   // verified: 14 nodes per track
var MAX_LEVEL = 84;        // verified: ~84 to max everything

function trackColor(t) { return (TRACK_META[t] || {}).color || '#888'; }

export default function CradleClient({ nodes }) {
  // nodes: array of { stat_track, node_order, node_name, is_perk, energy_cost, cumulative_energy, effect, stat_improved }
  var [mode, setMode] = useState('sandbox');       // 'sandbox' | 'target'
  var [targetLevel, setTargetLevel] = useState(20);
  // allocation: how many points invested in each track
  var [alloc, setAlloc] = useState({
    Strength: 0, Recharge: 0, Dexterity: 0, Endurance: 0, Support: 0, Resistance: 0,
  });

  // Group nodes by track, sorted by order
  var nodesByTrack = useMemo(function () {
    var map = {};
    TRACK_ORDER.forEach(function (t) { map[t] = []; });
    (nodes || []).forEach(function (n) {
      if (!map[n.stat_track]) map[n.stat_track] = [];
      map[n.stat_track].push(n);
    });
    Object.keys(map).forEach(function (t) {
      map[t].sort(function (a, b) { return (a.node_order || 0) - (b.node_order || 0); });
    });
    return map;
  }, [nodes]);

  var totalSpent = TRACK_ORDER.reduce(function (acc, t) { return acc + (alloc[t] || 0); }, 0);
  var energyBudget = mode === 'target' ? targetLevel : MAX_LEVEL;
  var energyRemaining = energyBudget - totalSpent;

  // Perks unlocked given current allocation
  var unlockedPerks = useMemo(function () {
    var out = [];
    TRACK_ORDER.forEach(function (t) {
      var invested = alloc[t] || 0;
      (nodesByTrack[t] || []).forEach(function (n) {
        if (n.is_perk && (n.cumulative_energy || n.node_order) <= invested) {
          out.push({ track: t, name: n.node_name, effect: n.effect, at: n.cumulative_energy || n.node_order });
        }
      });
    });
    return out;
  }, [alloc, nodesByTrack]);

  // Next perk per track (for "next milestone" hints)
  function nextPerk(track) {
    var invested = alloc[track] || 0;
    var found = null;
    (nodesByTrack[track] || []).forEach(function (n) {
      if (n.is_perk && (n.cumulative_energy || n.node_order) > invested && !found) {
        found = n;
      }
    });
    return found;
  }

  function setTrack(track, value) {
    var v = Math.max(0, Math.min(MAX_PER_TRACK, value));
    setAlloc(function (prev) {
      var next = Object.assign({}, prev);
      // Enforce budget in target mode
      if (mode === 'target') {
        var others = TRACK_ORDER.reduce(function (acc, t) { return t === track ? acc : acc + (prev[t] || 0); }, 0);
        if (others + v > targetLevel) v = Math.max(0, targetLevel - others);
      }
      next[track] = v;
      return next;
    });
  }

  function addPoint(track) { setTrack(track, (alloc[track] || 0) + 1); }
  function removePoint(track) { setTrack(track, (alloc[track] || 0) - 1); }
  function resetAll() {
    setAlloc({ Strength: 0, Recharge: 0, Dexterity: 0, Endurance: 0, Support: 0, Resistance: 0 });
  }

  function jumpToPerk(track, cumEnergy) {
    setTrack(track, cumEnergy);
  }

  // Build a shareable text summary
  var buildSummary = useMemo(function () {
    var parts = TRACK_ORDER.filter(function (t) { return (alloc[t] || 0) > 0; }).map(function (t) {
      return t + ' ' + alloc[t];
    });
    return parts.length ? parts.join(' / ') : 'Empty build';
  }, [alloc]);

  var canSpendMore = mode === 'sandbox' ? totalSpent < MAX_LEVEL : energyRemaining > 0;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px 64px' }}>
      <style>{`
        .cradle-node { transition: background 0.12s, border-color 0.12s, transform 0.08s; }
        .cradle-node:hover { transform: translateY(-1px); }
        .cradle-btn { transition: background 0.12s, border-color 0.12s, color 0.12s; cursor: pointer; }
        .cradle-btn:hover { filter: brightness(1.15); }
        .cradle-btn:disabled { opacity: 0.3; cursor: not-allowed; }
        .mode-tab { transition: all 0.12s; cursor: pointer; }
      `}</style>

      {/* ── MODE + ENERGY BAR ────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12, marginBottom: 20 }}>
        {/* Mode switch */}
        <div style={{ background: '#1a1d24', border: '1px solid #22252e', borderRadius: 2, padding: 14 }}>
          <div style={{ fontFamily: 'monospace', fontSize: 9, color: 'rgba(255,255,255,0.35)', letterSpacing: 2, fontWeight: 700, marginBottom: 10 }}>PLANNER MODE</div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button className="mode-tab" onClick={function () { setMode('sandbox'); }}
              style={{ flex: 1, padding: '9px 12px', background: mode === 'sandbox' ? 'rgba(0,245,255,0.1)' : '#0e1014', border: '1px solid ' + (mode === 'sandbox' ? '#00f5ff55' : '#22252e'), borderTop: '2px solid ' + (mode === 'sandbox' ? '#00f5ff' : '#22252e'), borderRadius: '0 0 2px 2px', color: mode === 'sandbox' ? '#00f5ff' : 'rgba(255,255,255,0.4)', fontFamily: 'Orbitron, monospace', fontSize: 10, fontWeight: 700, letterSpacing: 1 }}>
              FREE SANDBOX
            </button>
            <button className="mode-tab" onClick={function () { setMode('target'); }}
              style={{ flex: 1, padding: '9px 12px', background: mode === 'target' ? 'rgba(0,245,255,0.1)' : '#0e1014', border: '1px solid ' + (mode === 'target' ? '#00f5ff55' : '#22252e'), borderTop: '2px solid ' + (mode === 'target' ? '#00f5ff' : '#22252e'), borderRadius: '0 0 2px 2px', color: mode === 'target' ? '#00f5ff' : 'rgba(255,255,255,0.4)', fontFamily: 'Orbitron, monospace', fontSize: 10, fontWeight: 700, letterSpacing: 1 }}>
              LEVEL TARGET
            </button>
          </div>
          {mode === 'target' && (
            <div style={{ marginTop: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontFamily: 'monospace', fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: 1, fontWeight: 700 }}>TARGET CRADLE LEVEL</span>
                <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 14, fontWeight: 900, color: '#00f5ff' }}>{targetLevel}</span>
              </div>
              <input type="range" min="1" max={MAX_LEVEL} value={targetLevel}
                onChange={function (e) { setTargetLevel(parseInt(e.target.value, 10)); }}
                style={{ width: '100%', accentColor: '#00f5ff' }} />
              <div style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, marginTop: 4 }}>
                = {targetLevel} Energy to allocate ({targetLevel * 1000} XP)
              </div>
            </div>
          )}
        </div>

        {/* Energy summary */}
        <div style={{ background: '#1a1d24', border: '1px solid #22252e', borderLeft: '2px solid #00f5ff', borderRadius: '0 2px 2px 0', padding: 14 }}>
          <div style={{ fontFamily: 'monospace', fontSize: 9, color: 'rgba(255,255,255,0.35)', letterSpacing: 2, fontWeight: 700, marginBottom: 10 }}>ENERGY</div>
          <div style={{ display: 'flex', gap: 18, alignItems: 'baseline', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 26, fontWeight: 900, color: '#fff', lineHeight: 1 }}>{totalSpent}</div>
              <div style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, fontWeight: 700, marginTop: 3 }}>SPENT</div>
            </div>
            <div>
              <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 26, fontWeight: 900, color: energyRemaining < 0 ? '#ff2222' : '#00f5ff', lineHeight: 1 }}>{energyRemaining}</div>
              <div style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, fontWeight: 700, marginTop: 3 }}>{mode === 'target' ? 'REMAINING' : 'TO MAX (84)'}</div>
            </div>
            <div>
              <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 26, fontWeight: 900, color: '#ffd700', lineHeight: 1 }}>{unlockedPerks.length}</div>
              <div style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, fontWeight: 700, marginTop: 3 }}>PERKS</div>
            </div>
            <button className="cradle-btn" onClick={resetAll}
              style={{ marginLeft: 'auto', alignSelf: 'center', padding: '7px 14px', background: '#0e1014', border: '1px solid #22252e', borderRadius: 2, color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace', fontSize: 9, fontWeight: 700, letterSpacing: 1 }}>
              RESET
            </button>
          </div>
        </div>
      </div>

      {/* ── SIX TRACKS ───────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 12 }}>
        {TRACK_ORDER.map(function (track) {
          var meta = TRACK_META[track];
          var color = meta.color;
          var invested = alloc[track] || 0;
          var trackNodes = nodesByTrack[track] || [];
          var np = nextPerk(track);
          return (
            <div key={track} style={{ background: '#1a1d24', border: '1px solid #22252e', borderTop: '2px solid ' + color, borderRadius: '0 0 2px 2px', padding: 16 }}>
              {/* Track header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <span style={{ color: color, fontSize: 16 }}>{meta.symbol}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 14, fontWeight: 900, color: color, letterSpacing: 1 }}>{track.toUpperCase()}</div>
                  <div style={{ fontFamily: 'monospace', fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: 0.5 }}>{meta.blurb}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 18, fontWeight: 900, color: '#fff', lineHeight: 1 }}>{invested}<span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>/{MAX_PER_TRACK}</span></div>
                </div>
              </div>

              {/* +/- controls */}
              <div style={{ display: 'flex', gap: 6, margin: '12px 0' }}>
                <button className="cradle-btn" onClick={function () { removePoint(track); }} disabled={invested <= 0}
                  style={{ width: 36, height: 32, background: '#0e1014', border: '1px solid #22252e', borderRadius: 2, color: color, fontSize: 16, fontWeight: 700, lineHeight: 1 }}>&minus;</button>
                {/* Energy track bar of 14 cells */}
                <div style={{ flex: 1, display: 'flex', gap: 2, alignItems: 'center' }}>
                  {trackNodes.map(function (n) {
                    var pos = n.cumulative_energy || n.node_order;
                    var filled = pos <= invested;
                    var isPerk = n.is_perk;
                    return (
                      <div key={pos} title={isPerk ? (n.node_name + ' (Energy ' + pos + ')') : ('Passive +' + (n.stat_improved || '') + ' (Energy ' + pos + ')')}
                        onClick={function () { jumpToPerk(track, pos); }}
                        className="cradle-node"
                        style={{
                          flex: 1, height: isPerk ? 26 : 16, cursor: 'pointer',
                          background: filled ? (isPerk ? color : color + '55') : '#0e1014',
                          border: '1px solid ' + (isPerk ? color : '#22252e'),
                          borderRadius: 2,
                          boxShadow: isPerk && filled ? '0 0 6px ' + color + '88' : 'none',
                        }} />
                    );
                  })}
                </div>
                <button className="cradle-btn" onClick={function () { addPoint(track); }} disabled={invested >= MAX_PER_TRACK || (mode === 'target' && energyRemaining <= 0)}
                  style={{ width: 36, height: 32, background: color, border: '1px solid ' + color, borderRadius: 2, color: '#000', fontSize: 16, fontWeight: 700, lineHeight: 1 }}>+</button>
              </div>

              {/* Next milestone hint */}
              {np ? (
                <button className="cradle-btn" onClick={function () { jumpToPerk(track, np.cumulative_energy || np.node_order); }}
                  style={{ width: '100%', textAlign: 'left', background: '#0e1014', border: '1px solid #22252e', borderLeft: '2px solid ' + color, borderRadius: '0 2px 2px 0', padding: '8px 10px', marginTop: 2 }}>
                  <div style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.35)', letterSpacing: 1, fontWeight: 700, marginBottom: 2 }}>
                    NEXT PERK @ {np.cumulative_energy || np.node_order} ENERGY ({(np.cumulative_energy || np.node_order) - invested} more)
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: color }}>{np.node_name}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', lineHeight: 1.4, marginTop: 2 }}>{np.effect}</div>
                </button>
              ) : (
                <div style={{ background: '#0e1014', border: '1px solid #22252e', borderRadius: 2, padding: '8px 10px', marginTop: 2 }}>
                  <div style={{ fontFamily: 'monospace', fontSize: 9, color: color, letterSpacing: 1, fontWeight: 700 }}>{invested >= MAX_PER_TRACK ? '✓ TRACK MAXED - ALL PERKS UNLOCKED' : 'ALL PERKS IN RANGE UNLOCKED'}</div>
                </div>
              )}

              {/* Unlocked perks in this track */}
              {trackNodes.filter(function (n) { return n.is_perk && (n.cumulative_energy || n.node_order) <= invested; }).map(function (n) {
                return (
                  <div key={n.node_name} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 6, padding: '6px 8px', background: color + '0e', border: '1px solid ' + color + '28', borderRadius: 2 }}>
                    <span style={{ color: color, fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{'✓'}</span>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>{n.node_name} <span style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.35)' }}>@{n.cumulative_energy || n.node_order}</span></div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>{n.effect}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* ── BUILD SUMMARY / SHARE ────────────────────────── */}
      <div style={{ marginTop: 20, background: '#1a1d24', border: '1px solid #22252e', borderLeft: '3px solid #ffd700', borderRadius: '0 2px 2px 0', padding: 18 }}>
        <div style={{ fontFamily: 'monospace', fontSize: 9, color: '#ffd700', letterSpacing: 2, fontWeight: 700, marginBottom: 8 }}>YOUR CRADLE BUILD</div>
        <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 6 }}>{buildSummary}</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
          {totalSpent} Energy invested · {unlockedPerks.length} perks unlocked · Cradle Level {totalSpent}
          {mode === 'target' ? ' · ' + energyRemaining + ' Energy unspent' : ''}
        </div>
        {unlockedPerks.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 10 }}>
            {unlockedPerks.map(function (p) {
              var c = trackColor(p.track);
              return (
                <span key={p.track + p.name} style={{ fontFamily: 'monospace', fontSize: 9, color: c, background: c + '0e', border: '1px solid ' + c + '30', borderRadius: 2, padding: '3px 8px', letterSpacing: 0.5, fontWeight: 700 }}>{p.name}</span>
              );
            })}
          </div>
        )}
        <div style={{ fontFamily: 'monospace', fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, marginTop: 12, lineHeight: 1.5 }}>
          Free respec in-game means you can rebuild anytime - experiment freely here, then mirror it on your shells.
        </div>
      </div>

      {/* ── NOTE ON DATA ─────────────────────────────────── */}
      <div style={{ marginTop: 12, fontFamily: 'monospace', fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: 0.5, lineHeight: 1.6 }}>
        Perk breakpoints and effects are verified from Season 2. Each Energy point also adds a gradual passive stat increase toward {''}
        each track\u2019s focus; exact per-point passive values are shown in-game when you allocate. Planner reflects perk milestones, which is where the meaningful power spikes are.
      </div>
    </div>
  );
}