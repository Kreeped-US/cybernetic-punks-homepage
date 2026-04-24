// app/builds/page.js
// DEXTER BUILD LAB — Live weapon/shell/implant/mod/core data, cross-referenced with meta + editors

import { supabase } from '@/lib/supabase';
import { getLiveStats } from '@/lib/liveStats';
import Link from 'next/link';

export const revalidate = 300;

export const metadata = {
  title: 'Marathon Builds & Loadouts — Best Shells, Weapons & Loadout Guides',
  description: 'DEXTER grades the builds. Live weapon stats, shell rankings, implant meta, mod analysis, and loadout guides for every Runner Shell — updated every 6 hours.',
  keywords: 'Marathon builds, Marathon loadouts, Marathon best weapons, Marathon weapon stats, Marathon shell tier list, Marathon cores, Marathon implants, Marathon mods, Marathon meta',
  openGraph: {
    title: "Marathon Builds — DEXTER's Build Lab | CyberneticPunks",
    description: 'Live weapon stats, shell rankings, implants, mods, and loadout analysis. Updated every 6 hours by DEXTER.',
    url: 'https://cyberneticpunks.com/builds',
    type: 'website',
  },
  alternates: {
    canonical: 'https://cyberneticpunks.com/builds',
  },
};

// ─── CONSTANTS ──────────────────────────────────────────────
const BG = '#121418';
const CARD_BG = '#1a1d24';
const DEEP_BG = '#0e1014';
const BORDER = '#22252e';

const ORANGE = '#ff8800';
const CYAN = '#00d4ff';
const RED = '#ff2222';
const GREEN = '#00ff41';
const PURPLE = '#9b5de5';

const RARITY_COLORS = {
  Standard:   { color: '#888888', bg: '#88888818', border: '#88888833' },
  Enhanced:   { color: '#00ff41', bg: '#00ff4112', border: '#00ff4130' },
  Deluxe:     { color: '#00d4ff', bg: '#00d4ff12', border: '#00d4ff30' },
  Superior:   { color: '#9b5de5', bg: '#9b5de512', border: '#9b5de530' },
  Prestige:   { color: '#ffd700', bg: '#ffd70012', border: '#ffd70030' },
  Contraband: { color: '#ff2d55', bg: '#ff2d5514', border: '#ff2d5530' },
};

const TIER_COLORS = { S: RED, A: ORANGE, B: CYAN, C: '#aaaaaa', D: '#555555' };

const SHELL_COLORS = {
  Destroyer: '#ff3333', Vandal: '#ff8800', Recon: '#00d4ff',
  Assassin: '#cc44ff', Triage: '#00ff88', Thief: '#ffd700', Rook: '#aaaaaa',
};

const AMMO_COLORS = {
  'Light Rounds':  '#aaaaaa',
  'Heavy Rounds':  '#ff6644',
  'Volt Cells':    '#8844ff',
  'Volt Battery':  '#00d4ff',
  'MIPS':          '#ffd700',
  'Hyphatic Gel':  '#39ff14',
  'None':          '#444',
};

const FACTION_COLORS = {
  Cyberacme: '#00ff41',
  Nucaloric: '#ff2d78',
  Traxus:    '#ff6600',
  Mida:      '#cc44ff',
  Arachne:   '#ff2222',
  Sekiguchi: '#c8b400',
};

const STAT_COLORS = {
  'Heat Capacity': '#ff4444', 'Agility': '#00d4ff', 'Loot Speed': '#ffd700',
  'Melee Damage': '#ff8800', 'Prime Recovery': '#cc44ff', 'Tactical Recovery': '#9b5de5',
  'Self-Repair Speed': '#00ff41', 'Hardware': '#888888', 'Finisher Siphon': '#ff6644',
  'Revive Speed': '#00ff41', 'Firewall': '#00d4ff', 'Fall Resistance': '#ccaa44',
  'Ping Duration': '#88aaff', 'DBNO': '#ff4444', 'TAD': '#00d4ff',
};

const STAT_ORDER = ['Heat Capacity', 'Agility', 'Loot Speed', 'Melee Damage', 'Prime Recovery', 'Tactical Recovery', 'Self-Repair Speed', 'Hardware', 'Finisher Siphon', 'Revive Speed', 'Firewall', 'Fall Resistance', 'Ping Duration'];

const SHELL_NAMES_LOWER = ['assassin','destroyer','recon','rook','thief','triage','vandal'];

function statBar(val, max, color) {
  var pct = Math.min(100, Math.round(((val || 0) / (max || 1)) * 100));
  return (
    <div style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 1, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: pct + '%', background: color, borderRadius: 1 }} />
    </div>
  );
}

function TierBadge({ tier, size }) {
  if (!tier) return null;
  var color = TIER_COLORS[tier] || '#555';
  var fs = size === 'lg' ? 18 : 11;
  var pad = size === 'lg' ? '4px 12px' : '2px 7px';
  return (
    <span style={{ fontFamily: 'Orbitron, monospace', fontSize: fs, fontWeight: 900, color: color, background: color + '18', border: '1px solid ' + color + '44', borderRadius: 2, padding: pad, letterSpacing: 1, flexShrink: 0 }}>
      {tier}
    </span>
  );
}

function RarityBadge({ rarity }) {
  if (!rarity) return null;
  var r = RARITY_COLORS[rarity] || RARITY_COLORS.Standard;
  return (
    <span style={{ fontFamily: 'monospace', fontSize: 8, fontWeight: 700, color: r.color, background: r.bg, border: '1px solid ' + r.border, borderRadius: 2, padding: '2px 6px', letterSpacing: 1, flexShrink: 0 }}>
      {rarity.toUpperCase()}
    </span>
  );
}

function FactionBadge({ faction }) {
  if (!faction) return null;
  var color = FACTION_COLORS[faction] || '#888';
  return (
    <Link href="/factions" style={{ fontFamily: 'monospace', fontSize: 7, fontWeight: 700, color: color, background: color + '14', border: '1px solid ' + color + '30', borderRadius: 2, padding: '1px 5px', letterSpacing: 1, flexShrink: 0, textDecoration: 'none' }}>
      {faction.toUpperCase()}
    </Link>
  );
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  var h = Math.floor((Date.now() - new Date(dateStr).getTime()) / 3600000);
  if (h < 1) return 'just now';
  if (h < 24) return h + 'h ago';
  return Math.floor(h / 24) + 'd ago';
}

// ─── PAGE ────────────────────────────────────────────────────
export default async function BuildsPage() {

  var [
    weaponsRes, shellsRes, metaTiersRes, dexterArticlesRes,
    topDexterRes, shellStatValuesRes, coresRes, implantsRes,
    modsRes, liveStats
  ] = await Promise.all([
    supabase
      .from('weapon_stats')
      .select('id, name, weapon_type, ammo_type, rarity, damage, fire_rate, firepower_score, accuracy_score, handling_score, range_rating, magazine_size, ranked_viable, image_filename, faction_source')
      .order('firepower_score', { ascending: false, nullsFirst: false }),
    supabase
      .from('shell_stats')
      .select('id, name, role, difficulty, base_health, base_shield, base_speed, prime_ability_name, tactical_ability_name, trait_1_name, ranked_tier_solo, ranked_tier_squad, best_for, recommended_playstyle, image_filename')
      .order('name'),
    supabase
      .from('meta_tiers')
      .select('name, type, tier, trend, note, ranked_note, updated_at')
      .order('tier'),
    supabase
      .from('feed_items')
      .select('id, headline, slug, tags, ce_score, thumbnail, created_at')
      .eq('editor', 'DEXTER')
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(48),
    supabase
      .from('feed_items')
      .select('id, headline, slug, tags, ce_score, thumbnail, created_at')
      .eq('editor', 'DEXTER')
      .eq('is_published', true)
      .order('ce_score', { ascending: false })
      .limit(6),
    supabase
      .from('shell_stat_values')
      .select('shell_name, stat_name, stat_value')
      .order('shell_name'),
    supabase
      .from('core_stats')
      .select('name, required_runner, rarity, effect_desc, ability_type, meta_rating, image_filename')
      .order('rarity', { ascending: false }),
    supabase
      .from('implant_stats')
      .select('name, slot_type, rarity, required_runner, faction_source, passive_name, passive_desc, stat_1_label, stat_1_value, stat_2_label, stat_2_value, ranked_viable, image_filename')
      .in('rarity', ['Superior', 'Prestige'])
      .order('rarity', { ascending: false })
      .limit(14),
    supabase
      .from('mod_stats')
      .select('name, slot_type, rarity, effect_desc, faction_source, ranked_viable, image_filename')
      .in('rarity', ['Superior', 'Prestige'])
      .order('rarity', { ascending: false })
      .limit(14),
    getLiveStats(),
  ]);

  var weapons         = weaponsRes.data || [];
  var shells          = shellsRes.data || [];
  var metaTiers       = metaTiersRes.data || [];
  var dexterArticles  = dexterArticlesRes.data || [];
  var topBuilds       = topDexterRes.data || [];
  var shellStatValues = shellStatValuesRes.data || [];
  var allCores        = coresRes.data || [];
  var topImplants     = implantsRes.data || [];
  var topMods         = modsRes.data || [];

  // Shell stats map
  var shellStatMap = {};
  shellStatValues.forEach(function(sv) {
    if (!shellStatMap[sv.shell_name]) shellStatMap[sv.shell_name] = {};
    shellStatMap[sv.shell_name][sv.stat_name] = sv.stat_value;
  });

  // Cores grouped by shell
  var coresByShell = {};
  var universalCores = [];
  allCores.forEach(function(c) {
    if (!c.required_runner || c.required_runner === 'Universal') {
      universalCores.push(c);
    } else {
      if (!coresByShell[c.required_runner]) coresByShell[c.required_runner] = [];
      coresByShell[c.required_runner].push(c);
    }
  });

  // Meta tier maps
  var metaWeaponMap = {};
  var metaShellMap = {};
  metaTiers.forEach(function(t) {
    if (t.type === 'weapon') metaWeaponMap[t.name.toLowerCase()] = t;
    if (t.type === 'shell')  metaShellMap[t.name.toLowerCase()]  = t;
  });

  var tierOrder = { S: 0, A: 1, B: 2, C: 3, D: 4 };
  var metaWeapons = metaTiers
    .filter(function(t) { return t.type === 'weapon'; })
    .sort(function(a, b) { return (tierOrder[a.tier] || 99) - (tierOrder[b.tier] || 99); })
    .slice(0, 8);
  var metaShellsList = metaTiers
    .filter(function(t) { return t.type === 'shell'; })
    .sort(function(a, b) { return (tierOrder[a.tier] || 99) - (tierOrder[b.tier] || 99); });
  var lastMetaUpdate = metaTiers[0]?.updated_at;

  // Weapons grouped by category
  var weaponsByCategory = {};
  weapons.forEach(function(w) {
    var cat = w.weapon_type || 'Other';
    if (!weaponsByCategory[cat]) weaponsByCategory[cat] = [];
    weaponsByCategory[cat].push(w);
  });

  // DEXTER articles by shell
  var articlesByShell = {};
  dexterArticles.forEach(function(a) {
    var tags = (a.tags || []).map(function(t) { return (t || '').toLowerCase(); });
    var headline = (a.headline || '').toLowerCase();
    for (var i = 0; i < SHELL_NAMES_LOWER.length; i++) {
      if (tags.includes(SHELL_NAMES_LOWER[i]) || headline.includes(SHELL_NAMES_LOWER[i])) {
        if (!articlesByShell[SHELL_NAMES_LOWER[i]]) articlesByShell[SHELL_NAMES_LOWER[i]] = [];
        if (articlesByShell[SHELL_NAMES_LOWER[i]].length < 3) articlesByShell[SHELL_NAMES_LOWER[i]].push(a);
        break;
      }
    }
  });

  var totalGraded = dexterArticles.length;
  var topWeaponMeta = metaWeapons.find(function(t) { return t.tier === 'S'; });
  var topShellMeta = metaShellsList.find(function(t) { return t.tier === 'S'; });

  var maxFpr = Math.max.apply(null, weapons.map(function(w) { return w.firepower_score || 0; }).concat([1]));
  var maxAcc = Math.max.apply(null, weapons.map(function(w) { return w.accuracy_score || 0; }).concat([1]));
  var maxDmg = Math.max.apply(null, weapons.map(function(w) { return w.damage || 0; }).concat([1]));
  var maxRpm = Math.max.apply(null, weapons.map(function(w) { return w.fire_rate || 0; }).concat([1]));
  var maxHp  = Math.max.apply(null, shells.map(function(s) { return s.base_health || 0; }).concat([1]));

  return (
    <main style={{ background: BG, minHeight: '100vh', color: '#fff', paddingTop: 48 }}>
      <style>{`
        .b-card { transition: background 0.12s, border-color 0.12s; }
        .b-card:hover { background: #1e2228 !important; }
        .b-row:hover { background: #1e2228 !important; }
        .b-btn { transition: background 0.12s, border-color 0.12s, color 0.12s; cursor: pointer; }
        .b-btn:hover { background: #1e2228 !important; }
      `}</style>

      {/* ══ HERO ════════════════════════════════════════════ */}
      <section style={{ padding: '48px 24px 40px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, color: ORANGE, background: 'rgba(255,136,0,0.08)', border: '1px solid rgba(255,136,0,0.3)', borderRadius: 2, padding: '3px 10px', letterSpacing: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: ORANGE }} />
            ⬢ DEXTER · BUILD ENGINEER
          </span>
          {liveStats.steam && (
            <span style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, color: GREEN, background: 'rgba(0,255,65,0.08)', border: '1px solid rgba(0,255,65,0.25)', borderRadius: 2, padding: '3px 10px', letterSpacing: 2 }}>
              {liveStats.steam.value.toLocaleString()} RUNNERS ONLINE
            </span>
          )}
        </div>

        <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: 'clamp(2.2rem, 6vw, 4rem)', fontWeight: 900, letterSpacing: 1, lineHeight: 1.0, margin: '0 0 18px' }}>
          BUILD<br /><span style={{ color: ORANGE }}>LAB</span>
        </h1>

        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, maxWidth: 520, marginBottom: 24 }}>
          Live weapon stats, shell rankings, implants, mods, and meta analysis — sourced from the database and updated every 6 hours by DEXTER.
        </p>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
          <Link href="/advisor" style={{ padding: '11px 22px', background: ORANGE, color: '#000', fontSize: 11, fontWeight: 800, letterSpacing: 2, borderRadius: 2, textDecoration: 'none', fontFamily: 'monospace' }}>
            GET YOUR BUILD →
          </Link>
          <Link href="/meta" style={{ padding: '11px 22px', background: CARD_BG, border: '1px solid ' + BORDER, color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 700, letterSpacing: 2, borderRadius: 2, textDecoration: 'none', fontFamily: 'monospace' }}>
            VIEW META →
          </Link>
        </div>

        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 4 }}>
          {[
            { val: String(weapons.length),       label: 'WEAPONS IN DB', color: ORANGE },
            { val: String(shells.length),        label: 'RUNNER SHELLS', color: CYAN },
            { val: String(topImplants.length + topMods.length), label: 'ELITE GEAR', color: PURPLE },
            { val: String(totalGraded),          label: 'BUILDS GRADED', color: RED },
            { val: topWeaponMeta ? topWeaponMeta.name.split(' ')[0].toUpperCase() : '—', label: 'S-TIER WEAPON', color: RED },
            { val: topShellMeta ? topShellMeta.name.toUpperCase() : '—', label: 'S-TIER SHELL', color: ORANGE },
          ].map(function(cell, i) {
            return (
              <div key={i} style={{ background: CARD_BG, border: '1px solid ' + BORDER, borderTop: '2px solid ' + cell.color, borderRadius: '0 0 2px 2px', padding: '12px 14px', textAlign: 'center' }}>
                <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 18, fontWeight: 900, color: cell.color, lineHeight: 1, marginBottom: 5 }}>{cell.val}</div>
                <div style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, fontWeight: 700 }}>{cell.label}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ══ META PULSE ═════════════════════════════════════ */}
      {metaTiers.length > 0 && (
        <section style={{ padding: '0 24px 48px', maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 700, letterSpacing: 3, color: CYAN }}>⬡ NEXUS META PULSE</span>
            <div style={{ flex: 1, height: 1, background: BORDER }} />
            <span style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.25)', letterSpacing: 1, fontWeight: 700 }}>
              {lastMetaUpdate ? 'UPDATED ' + timeAgo(lastMetaUpdate).toUpperCase() : 'LIVE'}
            </span>
            <Link href="/meta" style={{ fontFamily: 'monospace', fontSize: 9, color: CYAN, textDecoration: 'none', letterSpacing: 2, fontWeight: 700 }}>FULL TIER LIST →</Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 10 }}>
            <div style={{ background: CARD_BG, border: '1px solid ' + BORDER, borderTop: '2px solid ' + CYAN, borderRadius: '0 0 2px 2px', overflow: 'hidden' }}>
              <div style={{ padding: '10px 14px', borderBottom: '1px solid ' + BORDER }}>
                <span style={{ fontFamily: 'monospace', fontSize: 9, color: CYAN, letterSpacing: 3, fontWeight: 700 }}>WEAPONS</span>
              </div>
              {metaWeapons.slice(0, 6).map(function(item, i) {
                return (
                  <div key={i} className="b-row" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', borderBottom: i < 5 ? '1px solid rgba(255,255,255,0.03)' : 'none' }}>
                    <TierBadge tier={item.tier} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: item.tier === 'S' ? '#fff' : 'rgba(255,255,255,0.7)', flex: 1 }}>{item.name}</span>
                    <span style={{ fontSize: 11, color: item.trend === 'up' ? GREEN : item.trend === 'down' ? RED : 'rgba(255,255,255,0.15)', flexShrink: 0 }}>
                      {item.trend === 'up' ? '▲' : item.trend === 'down' ? '▼' : '●'}
                    </span>
                  </div>
                );
              })}
            </div>

            <div style={{ background: CARD_BG, border: '1px solid ' + BORDER, borderTop: '2px solid ' + ORANGE, borderRadius: '0 0 2px 2px', overflow: 'hidden' }}>
              <div style={{ padding: '10px 14px', borderBottom: '1px solid ' + BORDER }}>
                <span style={{ fontFamily: 'monospace', fontSize: 9, color: ORANGE, letterSpacing: 3, fontWeight: 700 }}>SHELLS</span>
              </div>
              {metaShellsList.slice(0, 7).map(function(item, i) {
                var shellColor = SHELL_COLORS[item.name] || ORANGE;
                return (
                  <div key={i} className="b-row" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', borderBottom: i < Math.min(6, metaShellsList.length - 1) ? '1px solid rgba(255,255,255,0.03)' : 'none' }}>
                    <TierBadge tier={item.tier} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: shellColor, flex: 1 }}>{item.name}</span>
                    <span style={{ fontSize: 11, color: item.trend === 'up' ? GREEN : item.trend === 'down' ? RED : 'rgba(255,255,255,0.15)', flexShrink: 0 }}>
                      {item.trend === 'up' ? '▲' : item.trend === 'down' ? '▼' : '●'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ══ TOP DEXTER PICKS ═══════════════════════════════ */}
      {topBuilds.length > 0 && (
        <section style={{ padding: '0 24px 48px', maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 700, letterSpacing: 3, color: ORANGE }}>⬢ DEXTER'S TOP BUILDS</span>
            <div style={{ flex: 1, height: 1, background: BORDER }} />
            <Link href="/intel/dexter" style={{ fontFamily: 'monospace', fontSize: 9, color: ORANGE, textDecoration: 'none', letterSpacing: 2, fontWeight: 700 }}>ALL BUILDS →</Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 8 }}>
            {topBuilds.map(function(article) {
              var tags = (article.tags || []).map(function(t) { return (t || '').toLowerCase(); });
              var shellTag = SHELL_NAMES_LOWER.find(function(s) { return tags.includes(s); });
              var shellColor = shellTag ? SHELL_COLORS[shellTag.charAt(0).toUpperCase() + shellTag.slice(1)] || ORANGE : ORANGE;
              var grade = article.ce_score >= 9 ? 'S' : article.ce_score >= 7 ? 'A' : article.ce_score >= 5 ? 'B' : 'C';
              var gradeColor = TIER_COLORS[grade] || ORANGE;

              return (
                <Link key={article.id} href={'/intel/' + article.slug} className="b-card" style={{ display: 'flex', gap: 12, background: CARD_BG, border: '1px solid ' + BORDER, borderLeft: '3px solid ' + shellColor, borderRadius: '0 2px 2px 0', padding: 14, textDecoration: 'none' }}>
                  <div style={{ textAlign: 'center', flexShrink: 0 }}>
                    <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 26, fontWeight: 900, color: gradeColor, lineHeight: 1 }}>{grade}</div>
                    <div style={{ fontFamily: 'monospace', fontSize: 7, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, marginTop: 3, fontWeight: 700 }}>GRADE</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', lineHeight: 1.3, marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {article.headline}
                    </div>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
                      {shellTag && (
                        <span style={{ fontFamily: 'monospace', fontSize: 7, color: shellColor, background: shellColor + '14', border: '1px solid ' + shellColor + '30', borderRadius: 2, padding: '1px 5px', letterSpacing: 1, fontWeight: 700 }}>
                          {shellTag.toUpperCase()}
                        </span>
                      )}
                      {tags.includes('ranked') && (
                        <span style={{ fontFamily: 'monospace', fontSize: 7, color: '#ffd700', background: '#ffd70014', border: '1px solid #ffd70030', borderRadius: 2, padding: '1px 5px', letterSpacing: 1, fontWeight: 700 }}>RANKED</span>
                      )}
                      <span style={{ fontFamily: 'monospace', fontSize: 7, color: 'rgba(255,255,255,0.3)', marginLeft: 'auto', letterSpacing: 1, fontWeight: 700 }}>{timeAgo(article.created_at)}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ══ ELITE IMPLANTS (new) ═══════════════════════════ */}
      {topImplants.length > 0 && (
        <section style={{ padding: '0 24px 48px', maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 700, letterSpacing: 3, color: PURPLE }}>◇ ELITE IMPLANTS</span>
            <div style={{ flex: 1, height: 1, background: BORDER }} />
            <span style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.25)', letterSpacing: 1, fontWeight: 700 }}>{topImplants.length} SUPERIOR+</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 6 }}>
            {topImplants.map(function(imp) {
              var r = RARITY_COLORS[imp.rarity] || RARITY_COLORS.Standard;
              var imgSrc = imp.image_filename ? '/images/implants/' + imp.image_filename : null;
              var sColor = imp.required_runner && imp.required_runner !== 'Universal' ? SHELL_COLORS[imp.required_runner] || '#888' : null;
              return (
                <div key={imp.name} className="b-card" style={{ background: CARD_BG, border: '1px solid ' + BORDER, borderLeft: '2px solid ' + r.color, borderRadius: '0 2px 2px 0', padding: '10px 12px' }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 6 }}>
                    <div style={{ width: 36, height: 36, flexShrink: 0, background: DEEP_BG, border: '1px solid ' + BORDER, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                      {imgSrc ? <img src={imgSrc} alt={imp.name} style={{ width: 32, height: 32, objectFit: 'contain' }} /> : <span style={{ fontSize: 14, color: r.color + '40' }}>◇</span>}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{imp.name}</div>
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
                        <RarityBadge rarity={imp.rarity} />
                        {imp.slot_type && <span style={{ fontFamily: 'monospace', fontSize: 7, color: 'rgba(255,255,255,0.4)', letterSpacing: 1, fontWeight: 700 }}>{imp.slot_type.toUpperCase()}</span>}
                      </div>
                    </div>
                  </div>
                  {imp.passive_name && (
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', lineHeight: 1.4, marginBottom: 6, fontWeight: 600 }}>{imp.passive_name}</div>
                  )}
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {sColor && (
                      <span style={{ fontFamily: 'monospace', fontSize: 7, color: sColor, background: sColor + '14', border: '1px solid ' + sColor + '30', borderRadius: 2, padding: '1px 5px', letterSpacing: 1, fontWeight: 700 }}>
                        {imp.required_runner.toUpperCase()} ONLY
                      </span>
                    )}
                    {imp.faction_source && imp.faction_source !== 'None' && <FactionBadge faction={imp.faction_source} />}
                    {imp.ranked_viable === false && (
                      <span style={{ fontFamily: 'monospace', fontSize: 7, color: RED, letterSpacing: 1, fontWeight: 700 }}>⚠ NOT RANKED</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ══ META MODS (new) ════════════════════════════════ */}
      {topMods.length > 0 && (
        <section style={{ padding: '0 24px 48px', maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 700, letterSpacing: 3, color: ORANGE }}>◆ META MODS</span>
            <div style={{ flex: 1, height: 1, background: BORDER }} />
            <span style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.25)', letterSpacing: 1, fontWeight: 700 }}>{topMods.length} SUPERIOR+</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 6 }}>
            {topMods.map(function(mod) {
              var r = RARITY_COLORS[mod.rarity] || RARITY_COLORS.Standard;
              var imgSrc = mod.image_filename ? '/images/mods/' + mod.image_filename : null;
              return (
                <div key={mod.name} className="b-card" style={{ background: CARD_BG, border: '1px solid ' + BORDER, borderLeft: '2px solid ' + r.color, borderRadius: '0 2px 2px 0', padding: '10px 12px' }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 6 }}>
                    <div style={{ width: 36, height: 36, flexShrink: 0, background: DEEP_BG, border: '1px solid ' + BORDER, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                      {imgSrc ? <img src={imgSrc} alt={mod.name} style={{ width: 32, height: 32, objectFit: 'contain' }} /> : <span style={{ fontSize: 14, color: r.color + '40' }}>◆</span>}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{mod.name}</div>
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
                        <RarityBadge rarity={mod.rarity} />
                        {mod.slot_type && <span style={{ fontFamily: 'monospace', fontSize: 7, color: 'rgba(255,255,255,0.4)', letterSpacing: 1, fontWeight: 700 }}>{mod.slot_type.toUpperCase()}</span>}
                      </div>
                    </div>
                  </div>
                  {mod.effect_desc && (
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', lineHeight: 1.4, marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{mod.effect_desc}</div>
                  )}
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {mod.faction_source && mod.faction_source !== 'None' && <FactionBadge faction={mod.faction_source} />}
                    {mod.ranked_viable === false && (
                      <span style={{ fontFamily: 'monospace', fontSize: 7, color: RED, letterSpacing: 1, fontWeight: 700 }}>⚠ NOT RANKED</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ══ SHELL COMMAND CENTER ═══════════════════════════ */}
      {shells.length > 0 && (
        <section style={{ padding: '0 24px 48px', maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 700, letterSpacing: 3, color: 'rgba(255,255,255,0.25)' }}>RUNNER SHELLS</span>
            <div style={{ flex: 1, height: 1, background: BORDER }} />
            <span style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.25)', letterSpacing: 1, fontWeight: 700 }}>LIVE STATS · ABILITIES · CORES · RANKED TIERS</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {shells.map(function(shell) {
              var color = SHELL_COLORS[shell.name] || ORANGE;
              var metaTier = metaShellMap[shell.name.toLowerCase()];
              var articleCount = (articlesByShell[shell.name.toLowerCase()] || []).length;
              var shellStats = shellStatMap[shell.name] || {};
              var shellCores = (coresByShell[shell.name] || []).slice(0, 3);
              var hasStats = Object.keys(shellStats).length > 0;
              var displayTier = metaTier ? metaTier.tier : shell.ranked_tier_solo;
              var shellImg = shell.image_filename ? '/images/shells/' + shell.image_filename : null;

              var orderedStats = STAT_ORDER.filter(function(s) { return shellStats[s] != null; });
              var maxStatVal = orderedStats.length > 0 ? Math.max.apply(null, orderedStats.map(function(s) { return shellStats[s] || 0; })) : 100;

              return (
                <div key={shell.id} id={'shell-' + shell.name.toLowerCase()} className="b-card" style={{ background: CARD_BG, border: '1px solid ' + BORDER, borderLeft: '3px solid ' + color, borderRadius: '0 2px 2px 0', overflow: 'hidden' }}>
                  <div style={{ padding: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 18 }}>

                    {/* Identity + abilities */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                        {shellImg && (
                          <div style={{ width: 56, height: 56, flexShrink: 0, background: DEEP_BG, border: '1px solid ' + color + '40', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                            <img src={shellImg} alt={shell.name} style={{ width: 50, height: 50, objectFit: 'contain' }} />
                          </div>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                            <div>
                              <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 16, fontWeight: 900, color: color, letterSpacing: 2, lineHeight: 1 }}>{shell.name.toUpperCase()}</div>
                              {shell.role && <div style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.4)', letterSpacing: 1, marginTop: 4, fontWeight: 700 }}>{shell.role.toUpperCase()}</div>}
                            </div>
                            {displayTier && <TierBadge tier={displayTier} size="lg" />}
                          </div>
                          {shell.best_for && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 6, lineHeight: 1.4 }}>{shell.best_for}</div>}
                        </div>
                      </div>

                      {(shell.base_health || shell.base_shield) && (
                        <div style={{ marginBottom: 12 }}>
                          {shell.base_health && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                              <span style={{ fontFamily: 'monospace', fontSize: 7, color: GREEN, letterSpacing: 1, width: 18, flexShrink: 0, fontWeight: 700 }}>HP</span>
                              {statBar(shell.base_health, maxHp, GREEN)}
                              <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 10, fontWeight: 700, color: GREEN, width: 30, textAlign: 'right', flexShrink: 0 }}>{shell.base_health}</span>
                            </div>
                          )}
                          {shell.base_shield && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontFamily: 'monospace', fontSize: 7, color: CYAN, letterSpacing: 1, width: 18, flexShrink: 0, fontWeight: 700 }}>SH</span>
                              {statBar(shell.base_shield, maxHp, CYAN)}
                              <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 10, fontWeight: 700, color: CYAN, width: 30, textAlign: 'right', flexShrink: 0 }}>{shell.base_shield}</span>
                            </div>
                          )}
                        </div>
                      )}

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        {shell.prime_ability_name && (
                          <div style={{ background: color + '0e', border: '1px solid ' + color + '25', borderRadius: 2, padding: '6px 10px' }}>
                            <div style={{ fontFamily: 'monospace', fontSize: 7, color: color, letterSpacing: 2, marginBottom: 2, fontWeight: 700 }}>PRIME</div>
                            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.8)', letterSpacing: 1 }}>{shell.prime_ability_name}</div>
                          </div>
                        )}
                        {shell.tactical_ability_name && (
                          <div style={{ background: DEEP_BG, border: '1px solid ' + BORDER, borderRadius: 2, padding: '6px 10px' }}>
                            <div style={{ fontFamily: 'monospace', fontSize: 7, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, marginBottom: 2, fontWeight: 700 }}>TACTICAL</div>
                            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.6)', letterSpacing: 1 }}>{shell.tactical_ability_name}</div>
                          </div>
                        )}
                        {shell.trait_1_name && (
                          <div style={{ background: DEEP_BG, border: '1px solid ' + BORDER, borderRadius: 2, padding: '6px 10px' }}>
                            <div style={{ fontFamily: 'monospace', fontSize: 7, color: 'rgba(255,255,255,0.25)', letterSpacing: 2, marginBottom: 2, fontWeight: 700 }}>TRAIT</div>
                            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{shell.trait_1_name}</div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Stats + ranked tiers */}
                    <div>
                      <div style={{ fontFamily: 'monospace', fontSize: 8, color: color, letterSpacing: 3, marginBottom: 10, fontWeight: 700 }}>SHELL STATS</div>
                      {hasStats ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {orderedStats.map(function(statName) {
                            var val = shellStats[statName];
                            var statColor = STAT_COLORS[statName] || 'rgba(255,255,255,0.4)';
                            var pct = maxStatVal > 0 ? Math.round((val / maxStatVal) * 100) : 0;
                            return (
                              <div key={statName} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontFamily: 'monospace', fontSize: 7, color: 'rgba(255,255,255,0.3)', width: 80, flexShrink: 0, letterSpacing: 0.5, fontWeight: 700 }}>{statName.toUpperCase().slice(0, 13)}</span>
                                <div style={{ flex: 1, height: 2, background: 'rgba(255,255,255,0.05)', borderRadius: 1, overflow: 'hidden' }}>
                                  <div style={{ height: '100%', width: pct + '%', background: statColor, borderRadius: 1 }} />
                                </div>
                                <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 9, fontWeight: 700, color: statColor, width: 24, textAlign: 'right', flexShrink: 0 }}>{val}</span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div style={{ fontFamily: 'monospace', fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: 1, fontWeight: 700 }}>STATS PENDING</div>
                      )}

                      <div style={{ display: 'flex', gap: 5, marginTop: 12, flexWrap: 'wrap' }}>
                        {shell.ranked_tier_solo && (
                          <div style={{ textAlign: 'center', background: (TIER_COLORS[shell.ranked_tier_solo] || '#888') + '12', border: '1px solid ' + (TIER_COLORS[shell.ranked_tier_solo] || '#888') + '33', borderRadius: 2, padding: '5px 10px' }}>
                            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 15, fontWeight: 900, color: TIER_COLORS[shell.ranked_tier_solo] || '#888', lineHeight: 1 }}>{shell.ranked_tier_solo}</div>
                            <div style={{ fontFamily: 'monospace', fontSize: 7, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, marginTop: 2, fontWeight: 700 }}>SOLO</div>
                          </div>
                        )}
                        {shell.ranked_tier_squad && (
                          <div style={{ textAlign: 'center', background: (TIER_COLORS[shell.ranked_tier_squad] || '#888') + '12', border: '1px solid ' + (TIER_COLORS[shell.ranked_tier_squad] || '#888') + '33', borderRadius: 2, padding: '5px 10px' }}>
                            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 15, fontWeight: 900, color: TIER_COLORS[shell.ranked_tier_squad] || '#888', lineHeight: 1 }}>{shell.ranked_tier_squad}</div>
                            <div style={{ fontFamily: 'monospace', fontSize: 7, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, marginTop: 2, fontWeight: 700 }}>SQUAD</div>
                          </div>
                        )}
                        {metaTier && metaTier.note && (
                          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', alignSelf: 'center', flex: 1, lineHeight: 1.4, fontStyle: 'italic' }}>
                            "{metaTier.note}"
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Top cores */}
                    <div>
                      <div style={{ fontFamily: 'monospace', fontSize: 8, color: color, letterSpacing: 3, marginBottom: 10, fontWeight: 700 }}>TOP CORES</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        {shellCores.length > 0 ? shellCores.map(function(core) {
                          var r = RARITY_COLORS[core.rarity] || RARITY_COLORS.Standard;
                          return (
                            <div key={core.name} style={{ background: r.bg, border: '1px solid ' + r.border, borderRadius: 2, padding: '7px 10px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: core.effect_desc ? 4 : 0 }}>
                                <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 10, fontWeight: 700, color: r.color, letterSpacing: 1, lineHeight: 1.2 }}>{core.name}</div>
                                {core.ability_type && <span style={{ fontFamily: 'monospace', fontSize: 7, color: r.color + 'aa', letterSpacing: 1, flexShrink: 0, marginLeft: 4, fontWeight: 700 }}>{core.ability_type.toUpperCase()}</span>}
                              </div>
                              {core.effect_desc && (
                                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: 1.4 }}>
                                  {core.effect_desc.slice(0, 80)}{core.effect_desc.length > 80 ? '...' : ''}
                                </div>
                              )}
                            </div>
                          );
                        }) : (
                          <div style={{ fontFamily: 'monospace', fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: 1, fontWeight: 700 }}>NO CORES SEEDED</div>
                        )}
                      </div>

                      {articleCount > 0 && (
                        <Link href={'#builds-' + shell.name.toLowerCase()} style={{ display: 'inline-block', marginTop: 10, paddingTop: 8, borderTop: '1px solid ' + BORDER, fontFamily: 'monospace', fontSize: 8, color: ORANGE, letterSpacing: 1, textDecoration: 'none', fontWeight: 700, width: '100%' }}>
                          {articleCount} DEXTER BUILD GUIDE{articleCount !== 1 ? 'S' : ''} →
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ══ WEAPON ARSENAL ═════════════════════════════════ */}
      {weapons.length > 0 && (
        <section style={{ padding: '0 24px 48px', maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 700, letterSpacing: 3, color: 'rgba(255,255,255,0.25)' }}>WEAPON ARSENAL</span>
            <div style={{ flex: 1, height: 1, background: BORDER }} />
            <span style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.25)', letterSpacing: 1, fontWeight: 700 }}>{weapons.length} WEAPONS</span>
          </div>

          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 14 }}>
            {Object.entries(AMMO_COLORS).filter(function(e) { return e[0] !== 'None'; }).map(function(entry) {
              return (
                <span key={entry[0]} style={{ fontFamily: 'monospace', fontSize: 8, color: entry[1], background: entry[1] + '14', border: '1px solid ' + entry[1] + '33', borderRadius: 2, padding: '3px 8px', letterSpacing: 1, fontWeight: 700 }}>
                  {entry[0].toUpperCase()}
                </span>
              );
            })}
          </div>

          {Object.entries(weaponsByCategory).map(function(entry) {
            var category = entry[0];
            var categoryWeapons = entry[1];
            return (
              <div key={category} style={{ marginBottom: 20 }}>
                <div style={{ fontFamily: 'monospace', fontSize: 9, color: ORANGE, letterSpacing: 3, marginBottom: 6, paddingBottom: 6, borderBottom: '1px solid ' + ORANGE + '22', display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700 }}>
                  {category.toUpperCase()}
                  <span style={{ color: 'rgba(255,255,255,0.2)', fontWeight: 400 }}>{categoryWeapons.length}</span>
                </div>

                <div style={{ background: CARD_BG, border: '1px solid ' + BORDER, borderRadius: 2, overflow: 'hidden' }}>
                  {categoryWeapons.map(function(weapon, i) {
                    var metaTier = metaWeaponMap[weapon.name.toLowerCase()];
                    var ammoColor = AMMO_COLORS[weapon.ammo_type] || '#888';
                    var hasFpr = weapon.firepower_score != null;
                    var hasDmg = weapon.damage != null;
                    var weaponImg = weapon.image_filename ? '/images/weapons/' + weapon.image_filename : null;

                    return (
                      <div key={weapon.id} className="b-row" style={{ display: 'grid', gridTemplateColumns: '36px 1fr 1fr 80px 70px', gap: 10, padding: '10px 14px', borderBottom: i < categoryWeapons.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', alignItems: 'center' }}>

                        <div style={{ width: 36, height: 36, background: DEEP_BG, border: '1px solid ' + BORDER, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                          {weaponImg ? <img src={weaponImg} alt={weapon.name} style={{ width: 32, height: 32, objectFit: 'contain' }} /> : <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.15)' }}>⬢</span>}
                        </div>

                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: weapon.ranked_viable === false ? 'rgba(255,255,255,0.4)' : '#fff', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{weapon.name}</div>
                          <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
                            {weapon.rarity && <RarityBadge rarity={weapon.rarity} />}
                            {weapon.faction_source && weapon.faction_source !== 'None' && <FactionBadge faction={weapon.faction_source} />}
                            {weapon.ranked_viable === false && <span style={{ fontFamily: 'monospace', fontSize: 7, color: RED, letterSpacing: 1, fontWeight: 700 }}>⚠ NOT RANKED</span>}
                          </div>
                        </div>

                        <div style={{ paddingRight: 10 }}>
                          {hasFpr ? (
                            <>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                                <span style={{ fontFamily: 'monospace', fontSize: 7, color: 'rgba(255,255,255,0.3)', width: 22, fontWeight: 700 }}>FPR</span>
                                {statBar(weapon.firepower_score, maxFpr, ORANGE)}
                                <span style={{ fontFamily: 'monospace', fontSize: 8, color: ORANGE, width: 24, textAlign: 'right', fontWeight: 700 }}>{weapon.firepower_score}</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontFamily: 'monospace', fontSize: 7, color: 'rgba(255,255,255,0.3)', width: 22, fontWeight: 700 }}>ACC</span>
                                {statBar(weapon.accuracy_score, maxAcc, CYAN)}
                                <span style={{ fontFamily: 'monospace', fontSize: 8, color: CYAN, width: 24, textAlign: 'right', fontWeight: 700 }}>{weapon.accuracy_score}</span>
                              </div>
                            </>
                          ) : hasDmg ? (
                            <>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                                <span style={{ fontFamily: 'monospace', fontSize: 7, color: 'rgba(255,255,255,0.3)', width: 22, fontWeight: 700 }}>DMG</span>
                                {statBar(weapon.damage, maxDmg, RED)}
                                <span style={{ fontFamily: 'monospace', fontSize: 8, color: RED, width: 24, textAlign: 'right', fontWeight: 700 }}>{weapon.damage}</span>
                              </div>
                              {weapon.fire_rate && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span style={{ fontFamily: 'monospace', fontSize: 7, color: 'rgba(255,255,255,0.3)', width: 22, fontWeight: 700 }}>RPM</span>
                                  {statBar(weapon.fire_rate, maxRpm, ORANGE)}
                                  <span style={{ fontFamily: 'monospace', fontSize: 8, color: ORANGE, width: 24, textAlign: 'right', fontWeight: 700 }}>{weapon.fire_rate}</span>
                                </div>
                              )}
                            </>
                          ) : (
                            <span style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.2)', letterSpacing: 1, fontWeight: 700 }}>STATS PENDING</span>
                          )}
                        </div>

                        <div style={{ textAlign: 'center' }}>
                          <span style={{ fontFamily: 'monospace', fontSize: 8, color: ammoColor, background: ammoColor + '14', border: '1px solid ' + ammoColor + '30', borderRadius: 2, padding: '2px 6px', letterSpacing: 1, display: 'inline-block', fontWeight: 700 }}>
                            {(weapon.ammo_type || 'N/A').replace(' Rounds', '').replace(' Battery', '').toUpperCase()}
                          </span>
                        </div>

                        <div style={{ textAlign: 'center' }}>
                          {metaTier ? (
                            <div>
                              <TierBadge tier={metaTier.tier} />
                              <div style={{ fontFamily: 'monospace', fontSize: 8, color: metaTier.trend === 'up' ? GREEN : metaTier.trend === 'down' ? RED : 'rgba(255,255,255,0.2)', marginTop: 3, fontWeight: 700 }}>
                                {metaTier.trend === 'up' ? '▲' : metaTier.trend === 'down' ? '▼' : '●'}
                              </div>
                            </div>
                          ) : (
                            <span style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.15)', letterSpacing: 1, fontWeight: 700 }}>—</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* ══ PER-SHELL BUILD SECTIONS ═══════════════════════ */}
      {shells.map(function(shell) {
        var color = SHELL_COLORS[shell.name] || ORANGE;
        var articles = articlesByShell[shell.name.toLowerCase()] || [];
        if (articles.length === 0) return null;

        return (
          <section key={shell.id} id={'builds-' + shell.name.toLowerCase()} style={{ padding: '0 24px 32px', maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
              <div style={{ width: 3, height: 32, background: color, borderRadius: 1, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 14, fontWeight: 900, color: color, letterSpacing: 2 }}>{shell.name.toUpperCase()} BUILDS</div>
                <div style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, marginTop: 2, fontWeight: 700 }}>{shell.role ? shell.role.toUpperCase() + ' · ' : ''}{articles.length} BUILD GUIDE{articles.length !== 1 ? 'S' : ''}</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 6 }}>
              {articles.map(function(article) {
                var grade = article.ce_score >= 9 ? 'S' : article.ce_score >= 7 ? 'A' : article.ce_score >= 5 ? 'B' : 'C';
                var gradeColor = TIER_COLORS[grade] || ORANGE;
                return (
                  <Link key={article.id} href={'/intel/' + article.slug} className="b-card" style={{ display: 'flex', gap: 12, background: CARD_BG, border: '1px solid ' + BORDER, borderLeft: '2px solid ' + color, borderRadius: '0 2px 2px 0', padding: 12, textDecoration: 'none' }}>
                    <div style={{ textAlign: 'center', flexShrink: 0 }}>
                      <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 22, fontWeight: 900, color: gradeColor, lineHeight: 1 }}>{grade}</div>
                      <div style={{ fontFamily: 'monospace', fontSize: 6, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, marginTop: 2, fontWeight: 700 }}>CE</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', lineHeight: 1.3, marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{article.headline}</div>
                      <span style={{ fontFamily: 'monospace', fontSize: 7, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, fontWeight: 700 }}>{timeAgo(article.created_at)}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}

      {/* ══ BOTTOM CTA ═════════════════════════════════════ */}
      <section style={{ padding: '32px 24px 64px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ background: CARD_BG, border: '1px solid ' + BORDER, borderLeft: '3px solid ' + ORANGE, borderRadius: '0 2px 2px 0', padding: 28, textAlign: 'center' }}>
          <div style={{ fontFamily: 'monospace', fontSize: 10, color: ORANGE, letterSpacing: 3, marginBottom: 10, fontWeight: 700 }}>⬢ DEXTER · BUILD ENGINEER</div>
          <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: 1, marginBottom: 10, lineHeight: 1.2 }}>
            Want a <span style={{ color: ORANGE }}>personalized build</span>?
          </h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, maxWidth: 540, margin: '0 auto 20px' }}>
            Tell DEXTER your shell and playstyle — get a complete loadout with weapons, mods, cores, and implants in seconds. Faction-aware. Ranked-viability flagged.
          </p>
          <Link href="/advisor" style={{ display: 'inline-block', padding: '12px 28px', background: ORANGE, color: '#000', fontFamily: 'monospace', fontSize: 12, fontWeight: 800, letterSpacing: 2, borderRadius: 2, textDecoration: 'none' }}>
            LAUNCH BUILD ADVISOR →
          </Link>
        </div>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Marathon Builds and Loadouts — DEXTER Build Lab', description: 'Live weapon stats, shell rankings, implants, mods, and build guides for Marathon.', url: 'https://cyberneticpunks.com/builds' }) }} />
    </main>
  );
}