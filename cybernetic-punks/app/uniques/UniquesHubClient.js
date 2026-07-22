'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Sep } from '@/components/Sep';
import { entitySlugFor } from '@/lib/coverage';

// Rarity accent colors — drawn from the established rarity ladder.
// Prestige and Deluxe are the two tiers present for uniques. Contraband
// (#ff2d55) reserved for the single Contraband weapon; not used here but
// kept in the map so the system reads consistently if uniques expand.
var RARITY_COLORS = {
  Prestige:   '#ff2d55',  // hot pink/red — top chase tier
  Deluxe:     '#00d4ff',  // cyan — matches the Deluxe blue used elsewhere
  Superior:   '#cc44ff',
  Enhanced:   '#00ff88',
  Standard:   '#888888',
  Contraband: '#39ff14',
};

// Short flavor label per acquisition source.
var SOURCE_LABEL = {
  'Cryo Archive Locked Room': 'CRYO ARCHIVE · LOCKED ROOM',
  'Showcase encounter': 'SHOWCASE ENCOUNTER',
};

function rarityColor(r) { return RARITY_COLORS[r] || '#00ff41'; }

export default function UniquesHubClient(props) {
  var uniques = Array.isArray(props.uniques) ? props.uniques.filter(function(u) { return u && u.name; }) : [];

  var [rarityFilter, setRarityFilter] = useState('all');
  var [typeFilter, setTypeFilter] = useState('all');

  // Distinct weapon types for the filter row
  var types = useMemo(function() {
    var set = new Set();
    uniques.forEach(function(u) { if (u.weapon_type) set.add(u.weapon_type); });
    return ['all'].concat(Array.from(set).sort());
  }, [uniques]);

  var filtered = uniques.filter(function(u) {
    if (rarityFilter !== 'all' && u.rarity !== rarityFilter) return false;
    if (typeFilter !== 'all' && u.weapon_type !== typeFilter) return false;
    return true;
  });

  // Group filtered results by rarity, Prestige first.
  var groups = useMemo(function() {
    var order = ['Prestige', 'Deluxe'];
    var byRarity = {};
    filtered.forEach(function(u) {
      var r = u.rarity || 'Other';
      if (!byRarity[r]) byRarity[r] = [];
      byRarity[r].push(u);
    });
    var keys = Object.keys(byRarity).sort(function(a, b) {
      var ia = order.indexOf(a); var ib = order.indexOf(b);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
    return keys.map(function(k) {
      return { rarity: k, items: byRarity[k].slice().sort(function(a, b) { return a.name.localeCompare(b.name); }) };
    });
  }, [filtered]);

  var prestigeCount = uniques.filter(function(u) { return u.rarity === 'Prestige'; }).length;
  var deluxeCount = uniques.filter(function(u) { return u.rarity === 'Deluxe'; }).length;

  return (
    <>
      <style>{`
        .uniq-card:hover { background: #1e2228 !important; border-color: #2a2e38 !important; }
        .uniq-card:hover .uniq-view { color: var(--uniq-color) !important; }
        .uniq-base:hover { color: #fff !important; }
        .filter-pill:hover { background: #1e2228 !important; }
      `}</style>

      {/* ══ HERO ════════════════════════════════════════════ */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ff2d55', boxShadow: '0 0 6px rgba(255,45,85,0.5)' }} />
          <span style={{ fontSize: 10, color: '#ff2d55', letterSpacing: 3, fontWeight: 700 }}>UNIQUE WEAPONS · CHASE-TIER VARIANTS</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20, marginBottom: 28 }}>
          <div style={{ flex: 1, minWidth: 300 }}>
            <h1 style={{ fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 900, letterSpacing: '-1px', lineHeight: 1, margin: '0 0 12px', color: '#fff' }}>
              Unique<br /><span style={{ color: '#ff2d55' }}>Weapons.</span>
            </h1>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, maxWidth: 540, margin: 0 }}>
              Modified versions of base weapons with permanently locked mod slots — the mods they ship with can't be swapped, upgraded, or removed. Prestige uniques drop from Cryo Archive Locked Rooms. Deluxe uniques drop from Showcase encounters in Perimeter and Dire Marsh.
            </p>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 1, background: '#1e2028' }}>
          {[
            { label: 'Unique Weapons', value: uniques.length, color: '#fff' },
            { label: 'Prestige',       value: prestigeCount,  color: '#ff2d55' },
            { label: 'Deluxe',         value: deluxeCount,    color: '#00d4ff' },
            { label: 'Locked Mods',    value: 'FIXED',        color: '#ff8800' },
          ].map(function(stat) {
            return (
              <div key={stat.label} style={{ background: '#1a1d24', borderTop: '2px solid ' + stat.color, padding: '14px 16px' }}>
                <div style={{ fontSize: 24, fontWeight: 900, color: stat.color, lineHeight: 1, letterSpacing: '-0.5px', marginBottom: 5 }}>
                  {stat.value}
                </div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, textTransform: 'uppercase', fontWeight: 700 }}>
                  {stat.label}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ══ FILTERS ═════════════════════════════════════════ */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', paddingBottom: 12, borderBottom: '1px solid #1e2028' }}>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, fontWeight: 700, textTransform: 'uppercase', marginRight: 4 }}>Rarity</span>
          {['all', 'Prestige', 'Deluxe'].map(function(r) {
            var active = rarityFilter === r;
            var c = r === 'all' ? null : rarityColor(r);
            return (
              <button key={r} className="filter-pill" onClick={function() { setRarityFilter(r); }} style={{
                fontSize: 10, fontWeight: 700, letterSpacing: 1.5,
                padding: '5px 10px', borderRadius: 2, cursor: 'pointer',
                background: active && c ? c + '22' : (active ? 'rgba(255,45,85,0.1)' : 'transparent'),
                border: '1px solid ' + (active && c ? c + '60' : active ? 'rgba(255,45,85,0.3)' : '#22252e'),
                color: active && c ? c : (active ? '#ff2d55' : 'rgba(255,255,255,0.4)'),
                fontFamily: 'inherit', textTransform: 'uppercase',
              }}>
                {r === 'all' ? 'ALL' : r}
              </button>
            );
          })}

          <span style={{ width: 1, height: 16, background: '#22252e' }} />

          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, fontWeight: 700, textTransform: 'uppercase', marginRight: 4 }}>Type</span>
          {types.map(function(t) {
            var active = typeFilter === t;
            return (
              <button key={t} className="filter-pill" onClick={function() { setTypeFilter(t); }} style={{
                fontSize: 10, fontWeight: 700, letterSpacing: 1.5,
                padding: '5px 10px', borderRadius: 2, cursor: 'pointer',
                background: active ? 'rgba(255,45,85,0.1)' : 'transparent',
                border: '1px solid ' + (active ? 'rgba(255,45,85,0.3)' : '#22252e'),
                color: active ? '#ff2d55' : 'rgba(255,255,255,0.4)',
                fontFamily: 'inherit', textTransform: 'uppercase',
              }}>
                {t === 'all' ? 'ALL' : t}
              </button>
            );
          })}
        </div>
      </section>

      {/* ══ GROUPED GRIDS ══════════════════════════════════ */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 32px' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 40, background: '#1a1d24', border: '1px solid #22252e', borderRadius: 3, textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, fontWeight: 700 }}>
            NO UNIQUE WEAPONS MATCH — RESET FILTERS
          </div>
        ) : (
          groups.map(function(group) {
            var gColor = rarityColor(group.rarity);
            var sourceHint = group.rarity === 'Prestige' ? 'Cryo Archive Locked Rooms' : (group.rarity === 'Deluxe' ? 'Showcase encounters · Perimeter & Dire Marsh' : '');
            return (
              <div key={group.rarity} style={{ marginBottom: 36 }}>
                {/* Section header */}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                  <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: 18, fontWeight: 900, color: gColor, letterSpacing: 2, margin: 0 }}>
                    {group.rarity.toUpperCase()} UNIQUES
                  </h2>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', letterSpacing: 1, fontWeight: 600 }}>
                    {group.items.length} · {sourceHint}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 10 }}>
                  {group.items.map(function(u) {
                    var color = rarityColor(u.rarity);
                    var imgSrc = u.image_filename ? '/images/uniques/' + u.image_filename : null;
                    var sourceLabel = SOURCE_LABEL[u.acquisition_source] || (u.acquisition_source || '').toUpperCase();
                    var anchor = u.slug || entitySlugFor('weapon', u.name);

                    return (
                      <div
                        key={u.name}
                        id={anchor}
                        className="uniq-card"
                        style={{
                          '--uniq-color': color,
                          display: 'block',
                          background: '#1a1d24',
                          border: '1px solid #22252e',
                          borderTop: '2px solid ' + color,
                          borderRadius: '0 0 3px 3px',
                          overflow: 'hidden',
                          transition: 'background 0.1s, border-color 0.1s',
                          scrollMarginTop: 80,
                        }}
                      >
                        {/* Header row: name + rarity badge */}
                        <div style={{ padding: '14px 16px 0' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 4 }}>
                            <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 16, fontWeight: 900, color: '#fff', letterSpacing: 1, lineHeight: 1.15 }}>
                              {u.name.toUpperCase()}
                            </span>
                            <Sep text=" - " />
                            <span style={{ flexShrink: 0, background: color, color: u.rarity === 'Deluxe' ? '#000' : '#fff', fontSize: 9, fontWeight: 900, letterSpacing: 1, padding: '3px 8px', borderRadius: 2, fontFamily: 'Orbitron, monospace', lineHeight: 1 }}>
                              {(u.rarity || '').toUpperCase()}
                            </span>
                          </div>

                          {/* Base weapon link — points to /meta (where weapons
                              are listed); anchor targets the slug if the meta
                              page supports it, otherwise lands on the page. */}
                          {u.base_weapon && (
                            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 2, fontFamily: 'monospace' }}>
                              BASED ON{' '}
                              {u.baseWeaponSlug ? (
                                <Link href={'/weapons/' + u.baseWeaponSlug} className="uniq-base" style={{ color: color + 'cc', textDecoration: 'none', fontWeight: 700, transition: 'color 0.1s' }}>
                                  {u.base_weapon} →
                                </Link>
                              ) : (
                                <span style={{ color: color + 'cc', fontWeight: 700 }}>{u.base_weapon}</span>
                              )}
                            </div>
                          )}

                          <div style={{ fontSize: 9, color: color + 'aa', letterSpacing: 2, fontWeight: 700, marginBottom: 10, textTransform: 'uppercase', fontFamily: 'monospace' }}>
                            {u.weapon_type || '—'}
                          </div>
                        </div>

                        {/* Lore tagline */}
                        {u.lore_tagline && (
                          <div style={{ padding: '0 16px', marginBottom: 10 }}>
                            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5, fontStyle: 'italic' }}>
                              "{u.lore_tagline}"
                            </div>
                          </div>
                        )}

                        {/* Description */}
                        {u.description && (
                          <div style={{ padding: '0 16px', marginBottom: 12 }}>
                            <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.6)', lineHeight: 1.55 }}>
                              {u.description}
                            </div>
                          </div>
                        )}

                        {/* Locked mods (text, Path A) */}
                        {u.locked_mods && (
                          <div style={{ padding: '0 16px', marginBottom: 12 }}>
                            <div style={{ background: '#0e1014', border: '1px solid #22252e', borderLeft: '2px solid ' + color, borderRadius: '0 2px 2px 0', padding: '8px 10px' }}>
                              <div style={{ fontSize: 8, color: color, letterSpacing: 2, fontWeight: 700, marginBottom: 4, fontFamily: 'monospace' }}>🔒 LOCKED MODS</div>
                              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>{u.locked_mods}</div>
                            </div>
                          </div>
                        )}

                        {/* Footer: acquisition source */}
                        <div style={{ padding: '10px 16px', borderTop: '1px solid #22252e', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                          <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', letterSpacing: 1.5, fontWeight: 700, fontFamily: 'monospace' }}>
                            {sourceLabel}
                            {u.acquisition_detail ? ' · ' + u.acquisition_detail.toUpperCase() : ''}
                          </span>
                          <Link href={'/uniques/' + anchor} className="uniq-view" style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', letterSpacing: 1.5, fontWeight: 700, textDecoration: 'none', transition: 'color 0.1s', flexShrink: 0 }}>
                            FULL DETAILS →
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </section>

      {/* ══ CRYO ARCHIVE CTA ═══════════════════════════════ */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 32px' }}>
        <div style={{
          background: '#1a1d24', border: '1px solid #22252e',
          borderTop: '2px solid #ff2d55', borderRadius: '0 0 3px 3px',
          padding: '20px 24px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
        }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#ff2d55', letterSpacing: 2, marginBottom: 6, textTransform: 'uppercase' }}>Hunting Prestige uniques?</div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, maxWidth: 520 }}>
              Prestige uniques drop from Locked Rooms in the Cryo Archive — Marathon's endgame raid map. Learn the layout, vault routes, and Compiler fight.
            </div>
          </div>
          <Link href="/guides/cryo-archive" style={{
            padding: '11px 22px', background: '#ff2d55', color: '#fff',
            fontSize: 11, fontWeight: 800, letterSpacing: 1, borderRadius: 2,
            textDecoration: 'none', flexShrink: 0,
          }}>
            CRYO ARCHIVE GUIDES →
          </Link>
        </div>
      </section>
    </>
  );
}