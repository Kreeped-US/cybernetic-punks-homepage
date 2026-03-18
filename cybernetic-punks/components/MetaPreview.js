'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabase';

const TIER_COLORS = {
  S: '#ff0000', A: '#ff8800', B: '#00f5ff', C: '#aaaaaa', D: '#555555',
};

const SHELL_COLORS = {
  Assassin: '#cc44ff', Destroyer: '#ff3333', Recon: '#00f5ff',
  Rook: '#aaaaaa', Thief: '#ffd700', Triage: '#00ff88', Vandal: '#ff8800',
};

const SHELLS = ['Assassin', 'Destroyer', 'Recon', 'Rook', 'Thief', 'Triage', 'Vandal'];

function timeAgo(dateStr) {
  if (!dateStr) return '';
  var h = Math.floor((Date.now() - new Date(dateStr).getTime()) / 3600000);
  if (h < 1) return 'UPDATED JUST NOW';
  if (h < 24) return 'UPDATED ' + h + 'H AGO';
  return 'UPDATED ' + Math.floor(h / 24) + 'D AGO';
}

export default function MetaPreview() {
  var [tiers, setTiers] = useState([]);
  var [loading, setLoading] = useState(true);
  var [selectedShell, setSelectedShell] = useState(null);
  var [lastUpdated, setLastUpdated] = useState(null);

  useEffect(function() {
    async function fetchTiers() {
      var { data } = await supabase
        .from('meta_tiers')
        .select('name, type, tier, trend, note, updated_at')
        .order('tier');

      if (data && data.length > 0) {
        setTiers(data);
        setLastUpdated(data[0].updated_at);
      }
      setLoading(false);
    }
    fetchTiers();
  }, []);

  // Sort by tier order
  var TIER_ORDER = { S: 0, A: 1, B: 2, C: 3, D: 4 };
  var sorted = tiers.slice().sort(function(a, b) {
    return (TIER_ORDER[a.tier] ?? 99) - (TIER_ORDER[b.tier] ?? 99);
  });
  var topWeapons = sorted.filter(function(t) { return t.type === 'weapon'; }).slice(0, 6);
  var topShells = sorted.filter(function(t) { return t.type === 'shell'; }).slice(0, 7);
  var sTier = sorted.filter(function(t) { return t.tier === 'S'; });

  return (
    <section id="meta" style={{
      maxWidth: 1200,
      margin: '0 auto 64px',
      padding: '0 24px',
      scrollMarginTop: 80,
    }}>

      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: 20, fontWeight: 700, color: '#fff', letterSpacing: 2, margin: 0 }}>
            <span style={{ color: '#00f5ff' }}>⬡</span> META + BUILD INTEL
          </h2>
          <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 11, color: 'rgba(255,255,255,0.35)', letterSpacing: 1, marginTop: 4 }}>
            NEXUS TIER DATA
            {lastUpdated && (
              <span style={{ color: '#00f5ff', opacity: 0.5, marginLeft: 12 }}>
                {timeAgo(lastUpdated)}
              </span>
            )}
          </div>
        </div>
        <Link href="/meta" style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 11, color: '#00f5ff', letterSpacing: 1, textDecoration: 'none' }}>
          FULL TIER LIST &rarr;
        </Link>
      </div>

      {/* Two-panel layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14 }}>

        {/* ── LEFT PANEL: Live Meta Tiers ── */}
        <div style={{
          background: 'rgba(0,245,255,0.02)',
          border: '1px solid rgba(0,245,255,0.1)',
          borderTop: '2px solid #00f5ff',
          borderRadius: 10,
          overflow: 'hidden',
        }}>
          {/* Tab row */}
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            {['WEAPONS', 'SHELLS'].map(function(tab) {
              var active = (tab === 'WEAPONS' ? topWeapons : topShells).length > 0;
              var isWeapons = tab === 'WEAPONS';
              var [activeTab, setActiveTab] = useState('WEAPONS');
              return null; // handled below
            })}
          </div>

          {loading ? (
            <div style={{ padding: '32px 20px', textAlign: 'center', fontFamily: 'Share Tech Mono, monospace', fontSize: 11, color: '#333' }}>
              NEXUS SCANNING META...
            </div>
          ) : tiers.length === 0 ? (
            <div style={{ padding: '32px 20px', textAlign: 'center', fontFamily: 'Share Tech Mono, monospace', fontSize: 11, color: '#444' }}>
              META DATA UPDATING — CHECK BACK SOON
            </div>
          ) : (
            <TierPanelContent topWeapons={topWeapons} topShells={topShells} lastUpdated={lastUpdated} />
          )}

          <div style={{ padding: '12px 18px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
            <Link href="/meta" style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: '#00f5ff', opacity: 0.6, letterSpacing: 2, textDecoration: 'none' }}>
              VIEW INTERACTIVE TIER LIST &rarr;
            </Link>
          </div>
        </div>

        {/* ── RIGHT PANEL: Build Advisor CTA ── */}
        <div style={{
          background: 'rgba(255,136,0,0.03)',
          border: '1px solid rgba(255,136,0,0.12)',
          borderTop: '2px solid #ff8800',
          borderRadius: 10,
          padding: '24px 22px',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}>
          {/* Advisor header */}
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 12, padding: '4px 12px', background: 'rgba(255,136,0,0.1)', border: '1px solid rgba(255,136,0,0.25)', borderRadius: 4 }}>
              <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: '#ff8800', letterSpacing: 2 }}>[D] DEXTER BUILD ADVISOR</span>
            </div>
            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 18, fontWeight: 900, color: '#fff', letterSpacing: 1, lineHeight: 1.2, marginBottom: 8 }}>
              GET YOUR BUILD<br />
              <span style={{ color: '#ff8800' }}>ENGINEERED</span>
            </div>
            <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.35)', lineHeight: 1.5 }}>
              Pick your shell. DEXTER pulls live meta data and builds a complete loadout — weapons, mods, cores, and implants.
            </div>
          </div>

          {/* Shell picker teaser */}
          <div>
            <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.2)', letterSpacing: 3, marginBottom: 10 }}>SELECT YOUR RUNNER</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
              {SHELLS.slice(0, 7).map(function(shell) {
                var color = SHELL_COLORS[shell] || '#888';
                var isSelected = selectedShell === shell;
                return (
                  <button
                    key={shell}
                    onClick={function() { setSelectedShell(isSelected ? null : shell); }}
                    style={{
                      background: isSelected ? color + '18' : 'rgba(255,255,255,0.02)',
                      border: '1px solid ' + (isSelected ? color + '55' : 'rgba(255,255,255,0.07)'),
                      borderRadius: 5,
                      padding: '7px 4px',
                      cursor: 'pointer',
                      fontFamily: 'Share Tech Mono, monospace',
                      fontSize: 8,
                      color: isSelected ? color : 'rgba(255,255,255,0.3)',
                      letterSpacing: 0.5,
                      transition: 'all 0.15s ease',
                      textAlign: 'center',
                    }}
                  >
                    {shell.slice(0, 4).toUpperCase()}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Stats row */}
          <div style={{ display: 'flex', gap: 16 }}>
            {[
              { val: '7', label: 'SHELLS' },
              { val: tiers.length > 0 ? String(tiers.length) : '—', label: 'META ENTRIES' },
              { val: sTier.length > 0 ? String(sTier.length) : '—', label: 'S-TIER NOW' },
            ].map(function(stat) {
              return (
                <div key={stat.label} style={{ textAlign: 'center', flex: 1 }}>
                  <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 18, fontWeight: 900, color: '#ff8800', lineHeight: 1 }}>{stat.val}</div>
                  <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: 'rgba(255,255,255,0.2)', letterSpacing: 1, marginTop: 3 }}>{stat.label}</div>
                </div>
              );
            })}
          </div>

          {/* CTA button */}
          <Link
            href={selectedShell ? '/advisor?shell=' + selectedShell : '/advisor'}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              padding: '14px 20px',
              background: 'rgba(255,136,0,0.12)',
              border: '1px solid rgba(255,136,0,0.4)',
              borderRadius: 6,
              textDecoration: 'none',
              fontFamily: 'Orbitron, monospace',
              fontSize: 12, fontWeight: 700,
              color: '#ff8800',
              letterSpacing: 2,
              transition: 'background 0.2s',
            }}
            onMouseEnter={function(e) { e.currentTarget.style.background = 'rgba(255,136,0,0.2)'; }}
            onMouseLeave={function(e) { e.currentTarget.style.background = 'rgba(255,136,0,0.12)'; }}
          >
            {selectedShell ? 'BUILD ' + selectedShell.toUpperCase() + ' LOADOUT' : 'LAUNCH BUILD ADVISOR'} &rarr;
          </Link>
        </div>

      </div>
    </section>
  );
}

// ── TIER PANEL CONTENT (tabbed weapons/shells) ───────────────
function TierPanelContent({ topWeapons, topShells }) {
  var [activeTab, setActiveTab] = useState('WEAPONS');
  var items = activeTab === 'WEAPONS' ? topWeapons : topShells;

  return (
    <div>
      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        {['WEAPONS', 'SHELLS'].map(function(tab) {
          var active = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={function() { setActiveTab(tab); }}
              style={{
                flex: 1, padding: '10px', cursor: 'pointer',
                background: active ? 'rgba(0,245,255,0.06)' : 'transparent',
                border: 'none',
                borderBottom: '2px solid ' + (active ? '#00f5ff' : 'transparent'),
                fontFamily: 'Share Tech Mono, monospace',
                fontSize: 10, letterSpacing: 2,
                color: active ? '#00f5ff' : 'rgba(255,255,255,0.25)',
                transition: 'all 0.15s',
              }}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* Tier rows */}
      <div style={{ padding: '4px 0' }}>
        {items.length === 0 ? (
          <div style={{ padding: '24px 18px', fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: '#333', textAlign: 'center' }}>
            NO DATA YET
          </div>
        ) : items.map(function(item, i) {
          var tierColor = TIER_COLORS[item.tier] || '#555';
          var nameColor = activeTab === 'SHELLS' ? (SHELL_COLORS[item.name] || '#fff') : '#fff';
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 18px',
              borderBottom: i < items.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
              background: item.tier === 'S' ? 'rgba(255,0,0,0.03)' : 'transparent',
            }}>
              {/* Tier badge */}
              <span style={{
                fontFamily: 'Orbitron, monospace', fontSize: 12, fontWeight: 900,
                color: tierColor, background: tierColor + '14',
                border: '1px solid ' + tierColor + '33',
                borderRadius: 3, padding: '2px 7px',
                letterSpacing: 1, flexShrink: 0, minWidth: 30, textAlign: 'center',
              }}>
                {item.tier}
              </span>

              {/* Name */}
              <span style={{
                fontFamily: 'Rajdhani, sans-serif', fontSize: 14, fontWeight: 600,
                color: item.tier === 'S' ? '#fff' : 'rgba(255,255,255,0.65)',
                flex: 1,
              }}>
                {item.name}
              </span>

              {/* Note snippet */}
              {item.note && (
                <span style={{
                  fontFamily: 'Share Tech Mono, monospace', fontSize: 8,
                  color: 'rgba(255,255,255,0.18)', maxWidth: 100,
                  lineHeight: 1.4, textAlign: 'right', flexShrink: 0,
                }}>
                  {item.note.slice(0, 30)}{item.note.length > 30 ? '...' : ''}
                </span>
              )}

              {/* Trend */}
              <span style={{
                fontSize: 11, flexShrink: 0,
                color: item.trend === 'up' ? '#00ff88' : item.trend === 'down' ? '#ff4444' : 'rgba(255,255,255,0.15)',
              }}>
                {item.trend === 'up' ? '▲' : item.trend === 'down' ? '▼' : '●'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}