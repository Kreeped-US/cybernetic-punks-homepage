// app/builds/page.js
// DEXTER BUILD LAB — Live data, weapon stats, meta pulse, shell intel

import { supabase } from '../../lib/supabase';
import Link from 'next/link';

export const revalidate = 300;

export const metadata = {
  title: 'Marathon Builds & Loadouts — Best Shells, Weapons & Loadout Guides',
  description: 'DEXTER grades the builds. Live weapon stats, shell rankings, meta tier data and loadout guides for every Runner Shell — updated every 6 hours.',
  keywords: 'Marathon builds, Marathon loadouts, Marathon best weapons, Marathon weapon stats, Marathon shell tier list, Marathon cores, Marathon meta',
  openGraph: {
    title: "Marathon Builds — DEXTER's Build Lab | CyberneticPunks",
    description: 'Live weapon stats, shell rankings, meta tiers and loadout analysis. Updated every 6 hours by DEXTER.',
    url: 'https://cyberneticpunks.com/builds',
    type: 'website',
  },
  alternates: {
    canonical: 'https://cyberneticpunks.com/builds',
  },
};

// ─── CONSTANTS ──────────────────────────────────────────────
const ORANGE = '#ff8800';
const CYAN = '#00f5ff';
const RED = '#ff0000';
const GREEN = '#00ff88';
const BLACK = '#030303';

const RARITY_COLORS = {
  Standard:   { color: '#888888', bg: '#88888818', border: '#88888833' },
  Enhanced:   { color: '#00ff88', bg: '#00ff8812', border: '#00ff8830' },
  Deluxe:     { color: '#00f5ff', bg: '#00f5ff12', border: '#00f5ff30' },
  Superior:   { color: '#9b5de5', bg: '#9b5de512', border: '#9b5de530' },
  Prestige:   { color: '#ffd700', bg: '#ffd70012', border: '#ffd70030' },
  Contraband: { color: '#ff2d55', bg: '#ff2d5514', border: '#ff2d5530' },
};

const TIER_COLORS = { S: RED, A: ORANGE, B: CYAN, C: '#aaaaaa', D: '#555555' };

const SHELL_COLORS = {
  Destroyer: '#ff3333', Vandal: '#ff8800', Recon: '#00f5ff',
  Assassin: '#cc44ff', Triage: '#00ff88', Thief: '#ffd700', Rook: '#aaaaaa',
};

const AMMO_COLORS = {
  'Light Rounds':  '#aaaaaa',
  'Medium Rounds': '#cc9944',
  'Heavy Rounds':  '#ff6644',
  'Volt Cells':    '#8844ff',
  'Volt Battery':  '#00f5ff',
  'MIPS':          '#ffd700',
  'Hyphatic Gel':  '#39ff14',
  'None':          '#444',
};

function statBar(val, max, color) {
  var pct = Math.min(100, Math.round(((val || 0) / max) * 100));
  return (
    <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: pct + '%', background: color, borderRadius: 2, transition: 'width 0.6s ease' }} />
    </div>
  );
}

function TierBadge({ tier, size = 'sm' }) {
  if (!tier) return null;
  var color = TIER_COLORS[tier] || '#555';
  var fs = size === 'lg' ? 18 : 11;
  var pad = size === 'lg' ? '4px 12px' : '2px 7px';
  return (
    <span style={{ fontFamily: 'Orbitron, monospace', fontSize: fs, fontWeight: 900, color, background: color + '18', border: '1px solid ' + color + '44', borderRadius: 3, padding: pad, letterSpacing: 1, flexShrink: 0 }}>
      {tier}
    </span>
  );
}

function RarityBadge({ rarity }) {
  if (!rarity) return null;
  var r = RARITY_COLORS[rarity] || RARITY_COLORS.Standard;
  return (
    <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: r.color, background: r.bg, border: '1px solid ' + r.border, borderRadius: 3, padding: '2px 6px', letterSpacing: 1, flexShrink: 0 }}>
      {rarity.toUpperCase()}
    </span>
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
    weaponsRes,
    shellsRes,
    metaTiersRes,
    dexterArticlesRes,
    topDexterRes,
    shellStatValuesRes,
    coresRes,
  ] = await Promise.all([
    supabase.from('weapon_stats').select('id, name, weapon_type, ammo_type, rarity, damage, fire_rate, firepower_score, accuracy_score, handling_score, range_rating, magazine_size, ranked_viable, image_filename').order('firepower_score', { ascending: false, nullsFirst: false }),
    supabase.from('shell_stats').select('id, name, role, difficulty, base_health, base_shield, base_speed, prime_ability_name, tactical_ability_name, trait_1_name, ranked_tier_solo, ranked_tier_squad, best_for, recommended_playstyle, image_filename').order('name'),
    supabase.from('meta_tiers').select('name, type, tier, trend, note, ranked_note, updated_at').order('tier'),
    supabase.from('feed_items').select('id, headline, slug, tags, ce_score, thumbnail, created_at, body').eq('editor', 'DEXTER').eq('is_published', true).order('created_at', { ascending: false }).limit(48),
    supabase.from('feed_items').select('id, headline, slug, tags, ce_score, thumbnail, created_at').eq('editor', 'DEXTER').eq('is_published', true).order('ce_score', { ascending: false }).limit(6),
    supabase.from('shell_stat_values').select('shell_name, stat_name, stat_value').order('shell_name'),
    supabase.from('core_stats').select('name, required_runner, rarity, effect_desc, ability_type, meta_rating').order('rarity', { ascending: false }),
  ]);

  var weapons = weaponsRes.data || [];
  var shells = shellsRes.data || [];
  var metaTiers = metaTiersRes.data || [];
  var dexterArticles = dexterArticlesRes.data || [];
  var topBuilds = topDexterRes.data || [];
  var shellStatValues = shellStatValuesRes.data || [];
  var allCores = coresRes.data || [];

  var shellStatMap = {};
  shellStatValues.forEach(function(sv) {
    if (!shellStatMap[sv.shell_name]) shellStatMap[sv.shell_name] = {};
    shellStatMap[sv.shell_name][sv.stat_name] = sv.stat_value;
  });

  var coresByShell = {};
  var universalCores = [];
  allCores.forEach(function(c) {
    if (!c.required_runner) {
      universalCores.push(c);
    } else {
      if (!coresByShell[c.required_runner]) coresByShell[c.required_runner] = [];
      coresByShell[c.required_runner].push(c);
    }
  });

  var STAT_ORDER = ['Heat Capacity', 'Agility', 'Loot Speed', 'Melee Damage', 'Prime Recovery', 'Tactical Recovery', 'Self-Repair Speed', 'Hardware', 'Finisher Siphon', 'Revive Speed', 'Firewall', 'Fall Resistance', 'Ping Duration'];
  var STAT_COLORS = {
    'Heat Capacity': '#ff4444', 'Agility': '#00f5ff', 'Loot Speed': '#ffd700',
    'Melee Damage': '#ff8800', 'Prime Recovery': '#cc44ff', 'Tactical Recovery': '#9b5de5',
    'Self-Repair Speed': '#00ff88', 'Hardware': '#888888', 'Finisher Siphon': '#ff6644',
    'Revive Speed': '#00ff88', 'Firewall': '#00f5ff', 'Fall Resistance': '#ccaa44',
    'Ping Duration': '#88aaff',
  };

  var metaWeaponMap = {};
  var metaShellMap = {};
  metaTiers.forEach(function(t) {
    if (t.type === 'weapon') metaWeaponMap[t.name.toLowerCase()] = t;
    if (t.type === 'shell') metaShellMap[t.name.toLowerCase()] = t;
  });

  var metaWeapons = metaTiers.filter(function(t) { return t.type === 'weapon'; }).sort(function(a, b) { return (Object.keys(TIER_COLORS).indexOf(a.tier)) - (Object.keys(TIER_COLORS).indexOf(b.tier)); }).slice(0, 8);
  var metaShellsList = metaTiers.filter(function(t) { return t.type === 'shell'; }).sort(function(a, b) { return (Object.keys(TIER_COLORS).indexOf(a.tier)) - (Object.keys(TIER_COLORS).indexOf(b.tier)); });
  var lastMetaUpdate = metaTiers[0]?.updated_at;

  var weaponsByCategory = {};
  weapons.forEach(function(w) {
    var cat = w.weapon_type || 'Other';
    if (!weaponsByCategory[cat]) weaponsByCategory[cat] = [];
    weaponsByCategory[cat].push(w);
  });

  var SHELL_NAMES = ['assassin','destroyer','recon','rook','thief','triage','vandal'];
  var articlesByShell = {};
  var generalArticles = [];
  dexterArticles.forEach(function(a) {
    var tags = (a.tags || []).map(function(t) { return t.toLowerCase(); });
    var headline = (a.headline || '').toLowerCase();
    var matched = null;
    for (var i = 0; i < SHELL_NAMES.length; i++) {
      if (tags.includes(SHELL_NAMES[i]) || headline.includes(SHELL_NAMES[i])) { matched = SHELL_NAMES[i]; break; }
    }
    if (matched) {
      if (!articlesByShell[matched]) articlesByShell[matched] = [];
      if (articlesByShell[matched].length < 3) articlesByShell[matched].push(a);
    } else if (generalArticles.length < 6) {
      generalArticles.push(a);
    }
  });

  var totalGraded = dexterArticles.length;
  var topWeaponMeta = metaWeapons.find(function(t) { return t.tier === 'S'; });
  var topShellMeta = metaShellsList.find(function(t) { return t.tier === 'S'; });

  var maxFpr = Math.max.apply(null, weapons.map(function(w) { return w.firepower_score || 0; }).concat([1]));
  var maxAcc = Math.max.apply(null, weapons.map(function(w) { return w.accuracy_score || 0; }).concat([1]));
  var maxDmg = Math.max.apply(null, weapons.map(function(w) { return w.damage || 0; }).concat([1]));
  var maxRpm = Math.max.apply(null, weapons.map(function(w) { return w.fire_rate || 0; }).concat([1]));
  var maxHp = Math.max.apply(null, shells.map(function(s) { return s.base_health || 0; }).concat([1]));

  return (
    <main style={{ background: BLACK, minHeight: '100vh', color: '#fff' }}>
      <style>{`
        @keyframes buildPulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        @keyframes buildReveal { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        .build-card { transition: border-color 0.2s, transform 0.2s; }
        .build-card:hover { border-color: rgba(255,136,0,0.3) !important; transform: translateY(-2px); }
        .weapon-row { transition: background 0.15s; }
        .weapon-row:hover { background: rgba(255,255,255,0.03) !important; }
        .shell-card { transition: border-color 0.2s, transform 0.2s; }
        .shell-card:hover { transform: translateY(-3px); }
      `}</style>

      {/* ─── HERO ──────────────────────────────────────── */}
      <section style={{ padding: '120px 20px 0', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 500, background: 'radial-gradient(ellipse at 50% 0%, ' + ORANGE + '0f 0%, transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.015, backgroundImage: 'linear-gradient(' + ORANGE + ' 1px, transparent 1px), linear-gradient(90deg, ' + ORANGE + ' 1px, transparent 1px)', backgroundSize: '50px 50px' }} />

        <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '6px 16px', border: '1px solid ' + ORANGE + '44', borderRadius: 4, marginBottom: 20, fontFamily: 'Share Tech Mono, monospace', fontSize: 11, color: ORANGE, letterSpacing: 3 }}>
            <span style={{ animation: 'buildPulse 2s ease-in-out infinite' }}>[D]</span>
            DEXTER BUILD ENGINEER
          </div>

          <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: 'clamp(2rem, 5vw, 3.2rem)', fontWeight: 900, lineHeight: 1.1, margin: '0 0 16px 0', letterSpacing: 3 }}>
            BUILD <span style={{ color: ORANGE }}>LAB</span>
          </h1>
          <p style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 17, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, maxWidth: 560, marginBottom: 32 }}>
            Live weapon stats, shell rankings, and meta analysis — sourced from the database and updated every 6 hours by DEXTER.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 1, background: ORANGE + '18', border: '1px solid ' + ORANGE + '33', borderRadius: 8, overflow: 'hidden', marginBottom: 16 }}>
            {[
              { val: String(weapons.length), label: 'WEAPONS IN DB', color: ORANGE },
              { val: String(shells.length), label: 'RUNNER SHELLS', color: CYAN },
              { val: String(totalGraded), label: 'BUILDS GRADED', color: RED },
              { val: topWeaponMeta ? topWeaponMeta.name.split(' ')[0].toUpperCase() : '—', label: 'S-TIER WEAPON', color: RED },
              { val: topShellMeta ? topShellMeta.name.toUpperCase() : '—', label: 'S-TIER SHELL', color: ORANGE },
              { val: metaTiers.length > 0 ? String(metaTiers.length) : '—', label: 'META ENTRIES', color: '#ffd700' },
            ].map(function(cell, i) {
              return (
                <div key={i} style={{ background: BLACK, padding: '16px 18px', textAlign: 'center' }}>
                  <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 20, fontWeight: 900, color: cell.color, lineHeight: 1, marginBottom: 6 }}>{cell.val}</div>
                  <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.2)', letterSpacing: 2 }}>{cell.label}</div>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', paddingBottom: 48 }}>
            <Link href="/advisor" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '12px 24px', background: ORANGE + '18', border: '1px solid ' + ORANGE + '55', borderRadius: 6, textDecoration: 'none', fontFamily: 'Orbitron, monospace', fontSize: 12, fontWeight: 700, color: ORANGE, letterSpacing: 2 }}>
              [D] GET YOUR BUILD ENGINEERED &rarr;
            </Link>
            <Link href="/meta" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '12px 24px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, textDecoration: 'none', fontFamily: 'Share Tech Mono, monospace', fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: 2 }}>
              VIEW TIER LIST &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* ─── META PULSE ────────────────────────────────── */}
      {metaTiers.length > 0 && (
        <section style={{ padding: '0 20px 48px', maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: CYAN, boxShadow: '0 0 8px ' + CYAN, animation: 'buildPulse 2s ease-in-out infinite' }} />
                <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: 16, fontWeight: 700, color: CYAN, margin: 0, letterSpacing: 2 }}>META PULSE</h2>
              </div>
              <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: 2 }}>
                LIVE FROM NEXUS — {lastMetaUpdate ? 'UPDATED ' + timeAgo(lastMetaUpdate).toUpperCase() : 'LIVE'}
              </div>
            </div>
            <Link href="/meta" style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: CYAN, textDecoration: 'none', letterSpacing: 2, padding: '6px 14px', border: '1px solid ' + CYAN + '33', borderRadius: 4 }}>
              FULL TIER LIST &rarr;
            </Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14 }}>
            <div style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.06)', borderTop: '2px solid ' + CYAN, borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px 10px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: CYAN + '88', letterSpacing: 3 }}>WEAPONS</div>
              </div>
              {metaWeapons.slice(0, 6).map(function(item, i) {
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px', borderBottom: i < 5 ? '1px solid rgba(255,255,255,0.03)' : 'none' }}>
                    <TierBadge tier={item.tier} />
                    <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 14, fontWeight: 600, color: item.tier === 'S' ? '#fff' : 'rgba(255,255,255,0.65)', flex: 1 }}>{item.name}</span>
                    {item.note && <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.2)', maxWidth: 120, lineHeight: 1.4, textAlign: 'right' }}>{item.note}</span>}
                    <span style={{ fontSize: 11, color: item.trend === 'up' ? GREEN : item.trend === 'down' ? RED : 'rgba(255,255,255,0.15)', flexShrink: 0 }}>
                      {item.trend === 'up' ? '▲' : item.trend === 'down' ? '▼' : '●'}
                    </span>
                  </div>
                );
              })}
            </div>

            <div style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.06)', borderTop: '2px solid ' + ORANGE, borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px 10px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: ORANGE + '88', letterSpacing: 3 }}>SHELLS</div>
              </div>
              {metaShellsList.slice(0, 7).map(function(item, i) {
                var shellColor = SHELL_COLORS[item.name] || ORANGE;
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px', borderBottom: i < 6 ? '1px solid rgba(255,255,255,0.03)' : 'none' }}>
                    <TierBadge tier={item.tier} />
                    <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 14, fontWeight: 600, color: shellColor, flex: 1 }}>{item.name}</span>
                    {item.ranked_note && <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.2)', maxWidth: 110, lineHeight: 1.4, textAlign: 'right' }}>{item.ranked_note.slice(0, 40)}</span>}
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

      {/* ─── TOP DEXTER PICKS ──────────────────────────── */}
      {topBuilds.length > 0 && (
        <section style={{ padding: '0 20px 48px', maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
            <div>
              <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: 16, fontWeight: 700, color: '#fff', margin: '0 0 4px 0', letterSpacing: 2 }}>
                [D] DEXTER&apos;S TOP BUILDS
              </h2>
              <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: 2 }}>HIGHEST RATED — SORTED BY CE SCORE</div>
            </div>
            <Link href="/intel/dexter" style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: ORANGE, textDecoration: 'none', letterSpacing: 2, padding: '6px 14px', border: '1px solid ' + ORANGE + '33', borderRadius: 4 }}>ALL BUILDS &rarr;</Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
            {topBuilds.map(function(article, i) {
              var tags = (article.tags || []).map(function(t) { return t.toLowerCase(); });
              var shellTag = ['assassin','destroyer','recon','rook','thief','triage','vandal'].find(function(s) { return tags.includes(s); });
              var shellColor = shellTag ? SHELL_COLORS[shellTag.charAt(0).toUpperCase() + shellTag.slice(1)] || ORANGE : ORANGE;
              var grade = article.ce_score >= 9 ? 'S' : article.ce_score >= 7 ? 'A' : article.ce_score >= 5 ? 'B' : 'C';
              var gradeColor = TIER_COLORS[grade] || ORANGE;

              return (
                <Link key={article.id} href={'/intel/' + article.slug} className="build-card" style={{ display: 'flex', gap: 14, background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.06)', borderLeft: '3px solid ' + shellColor + '66', borderRadius: 8, padding: '16px', textDecoration: 'none' }}>
                  <div style={{ textAlign: 'center', flexShrink: 0 }}>
                    <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 28, fontWeight: 900, color: gradeColor, lineHeight: 1, textShadow: '0 0 16px ' + gradeColor + '44' }}>{grade}</div>
                    <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: 'rgba(255,255,255,0.2)', letterSpacing: 1, marginTop: 3 }}>GRADE</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 14, fontWeight: 600, color: '#fff', lineHeight: 1.3, marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {article.headline}
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {shellTag && (
                        <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: shellColor, background: shellColor + '14', border: '1px solid ' + shellColor + '30', borderRadius: 2, padding: '2px 6px', letterSpacing: 1 }}>
                          {shellTag.toUpperCase()}
                        </span>
                      )}
                      {tags.includes('ranked') && (
                        <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: '#ffd700', background: '#ffd70014', border: '1px solid #ffd70030', borderRadius: 2, padding: '2px 6px', letterSpacing: 1 }}>RANKED</span>
                      )}
                      <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.2)', marginLeft: 'auto' }}>{timeAgo(article.created_at)}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ─── SHELL COMMAND CENTER ──────────────────────── */}
      {shells.length > 0 && (
        <section style={{ padding: '0 20px 48px', maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: 16, fontWeight: 700, color: '#fff', margin: '0 0 4px 0', letterSpacing: 2 }}>RUNNER SHELLS</h2>
            <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: 2 }}>LIVE DATA — HP / SHIELD / UNIQUE STATS / ABILITIES / CORES / RANKED TIERS</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {shells.map(function(shell) {
              var color = SHELL_COLORS[shell.name] || ORANGE;
              var metaTier = metaShellMap[shell.name.toLowerCase()];
              var articleCount = (articlesByShell[shell.name.toLowerCase()] || []).length;
              var shellStats = shellStatMap[shell.name] || {};
              var shellCores = (coresByShell[shell.name] || []).slice(0, 3);
              var topUniversalCores = universalCores.slice(0, 2);
              var hasStats = Object.keys(shellStats).length > 0;
              var displayTier = metaTier ? metaTier.tier : shell.ranked_tier_solo;

              var orderedStats = STAT_ORDER.filter(function(s) { return shellStats[s] != null; });
              var maxStatVal = orderedStats.length > 0 ? Math.max.apply(null, orderedStats.map(function(s) { return shellStats[s] || 0; })) : 100;

              return (
                <a key={shell.id} href={'#shell-' + shell.name.toLowerCase()} className="shell-card" style={{ display: 'block', background: '#0a0a0a', border: '1px solid ' + color + '22', borderLeft: '4px solid ' + color, borderRadius: 8, textDecoration: 'none', overflow: 'hidden' }}>
                  <div style={{ height: 2, background: 'linear-gradient(90deg, ' + color + ', ' + color + '18)', flexShrink: 0 }} />
                  <div style={{ padding: '20px 20px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                        <div>
                          <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 16, fontWeight: 900, color: color, letterSpacing: 2, marginBottom: 3 }}>{shell.name.toUpperCase()}</div>
                          <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: 1 }}>{shell.role || ''}</div>
                          {shell.best_for && <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 4, lineHeight: 1.4 }}>{shell.best_for}</div>}
                        </div>
                        {displayTier && <TierBadge tier={displayTier} size="lg" />}
                      </div>

                      {(shell.base_health || shell.base_shield) && (
                        <div style={{ marginBottom: 14 }}>
                          {shell.base_health && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                              <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: GREEN, letterSpacing: 1, width: 18, flexShrink: 0 }}>HP</span>
                              {statBar(shell.base_health, maxHp, GREEN)}
                              <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 10, fontWeight: 700, color: GREEN, width: 30, textAlign: 'right', flexShrink: 0 }}>{shell.base_health}</span>
                            </div>
                          )}
                          {shell.base_shield && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: CYAN, letterSpacing: 1, width: 18, flexShrink: 0 }}>SH</span>
                              {statBar(shell.base_shield, maxHp, CYAN)}
                              <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 10, fontWeight: 700, color: CYAN, width: 30, textAlign: 'right', flexShrink: 0 }}>{shell.base_shield}</span>
                            </div>
                          )}
                        </div>
                      )}

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {shell.prime_ability_name && (
                          <div style={{ background: color + '10', border: '1px solid ' + color + '25', borderRadius: 4, padding: '6px 10px' }}>
                            <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: color + '88', letterSpacing: 2, marginBottom: 2 }}>PRIME</div>
                            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.7)', letterSpacing: 1 }}>{shell.prime_ability_name}</div>
                          </div>
                        )}
                        {shell.tactical_ability_name && (
                          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 4, padding: '6px 10px' }}>
                            <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: 'rgba(255,255,255,0.25)', letterSpacing: 2, marginBottom: 2 }}>TACTICAL</div>
                            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.55)', letterSpacing: 1 }}>{shell.tactical_ability_name}</div>
                          </div>
                        )}
                        {shell.trait_1_name && (
                          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 4, padding: '6px 10px' }}>
                            <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: 'rgba(255,255,255,0.18)', letterSpacing: 2, marginBottom: 2 }}>TRAIT</div>
                            <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{shell.trait_1_name}</div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: color + '77', letterSpacing: 3, marginBottom: 12 }}>SHELL STATS</div>
                      {hasStats ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                          {orderedStats.map(function(statName) {
                            var val = shellStats[statName];
                            var statColor = STAT_COLORS[statName] || 'rgba(255,255,255,0.4)';
                            var pct = maxStatVal > 0 ? Math.round((val / maxStatVal) * 100) : 0;
                            return (
                              <div key={statName} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: 'rgba(255,255,255,0.2)', width: 80, flexShrink: 0, letterSpacing: 0.5 }}>{statName.toUpperCase().slice(0, 12)}</span>
                                <div style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                                  <div style={{ height: '100%', width: pct + '%', background: statColor, borderRadius: 2 }} />
                                </div>
                                <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 9, fontWeight: 700, color: statColor, width: 26, textAlign: 'right', flexShrink: 0 }}>{val}</span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.12)', letterSpacing: 1, paddingTop: 8 }}>
                          STATS SEEDING — CHECK BACK SOON
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: 6, marginTop: 14, flexWrap: 'wrap' }}>
                        {shell.ranked_tier_solo && (
                          <div style={{ textAlign: 'center', background: (TIER_COLORS[shell.ranked_tier_solo] || '#888') + '12', border: '1px solid ' + (TIER_COLORS[shell.ranked_tier_solo] || '#888') + '33', borderRadius: 4, padding: '6px 10px' }}>
                            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 16, fontWeight: 900, color: TIER_COLORS[shell.ranked_tier_solo] || '#888', lineHeight: 1 }}>{shell.ranked_tier_solo}</div>
                            <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: 'rgba(255,255,255,0.2)', letterSpacing: 1, marginTop: 3 }}>SOLO</div>
                          </div>
                        )}
                        {shell.ranked_tier_squad && (
                          <div style={{ textAlign: 'center', background: (TIER_COLORS[shell.ranked_tier_squad] || '#888') + '12', border: '1px solid ' + (TIER_COLORS[shell.ranked_tier_squad] || '#888') + '33', borderRadius: 4, padding: '6px 10px' }}>
                            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 16, fontWeight: 900, color: TIER_COLORS[shell.ranked_tier_squad] || '#888', lineHeight: 1 }}>{shell.ranked_tier_squad}</div>
                            <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: 'rgba(255,255,255,0.2)', letterSpacing: 1, marginTop: 3 }}>SQUAD</div>
                          </div>
                        )}
                        {metaTier && metaTier.note && (
                          <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.3)', alignSelf: 'center', flex: 1, lineHeight: 1.4 }}>
                            {metaTier.note}
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: color + '77', letterSpacing: 3, marginBottom: 12 }}>TOP CORES</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {shellCores.length > 0 ? shellCores.map(function(core) {
                          var r = RARITY_COLORS[core.rarity] || RARITY_COLORS.Standard;
                          return (
                            <div key={core.name} style={{ background: r.bg, border: '1px solid ' + r.border, borderRadius: 4, padding: '8px 10px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: core.effect_desc ? 4 : 0 }}>
                                <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 10, fontWeight: 700, color: r.color, letterSpacing: 1, lineHeight: 1.2 }}>{core.name}</div>
                                {core.ability_type && <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: r.color + '88', letterSpacing: 1, flexShrink: 0, marginLeft: 4 }}>{core.ability_type.toUpperCase()}</span>}
                              </div>
                              {core.effect_desc && (
                                <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.3)', lineHeight: 1.4 }}>
                                  {core.effect_desc.slice(0, 80)}{core.effect_desc.length > 80 ? '...' : ''}
                                </div>
                              )}
                            </div>
                          );
                        }) : (
                          <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.12)', letterSpacing: 1 }}>NO CORES SEEDED YET</div>
                        )}

                        {topUniversalCores.length > 0 && shellCores.length < 3 && (
                          <div>
                            <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: 'rgba(255,255,255,0.15)', letterSpacing: 2, marginTop: 4, marginBottom: 4 }}>UNIVERSAL</div>
                            {topUniversalCores.slice(0, 1).map(function(core) {
                              var r = RARITY_COLORS[core.rarity] || RARITY_COLORS.Standard;
                              return (
                                <div key={core.name} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 4, padding: '8px 10px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                                    <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.55)', letterSpacing: 1 }}>{core.name}</div>
                                    {core.ability_type && <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: 'rgba(255,255,255,0.2)', letterSpacing: 1 }}>{core.ability_type.toUpperCase()}</span>}
                                  </div>
                                  {core.effect_desc && <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.25)', lineHeight: 1.4 }}>{core.effect_desc.slice(0, 70)}{core.effect_desc.length > 70 ? '...' : ''}</div>}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {articleCount > 0 && (
                        <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                          <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: ORANGE + '88', letterSpacing: 1 }}>
                            {articleCount} BUILD GUIDE{articleCount !== 1 ? 'S' : ''} &rarr;
                          </span>
                        </div>
                      )}
                    </div>

                  </div>
                </a>
              );
            })}
          </div>
        </section>
      )}

      {/* ─── WEAPON ARSENAL ────────────────────────────── */}
      {weapons.length > 0 && (
        <section style={{ padding: '0 20px 48px', maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: 16, fontWeight: 700, color: '#fff', margin: '0 0 4px 0', letterSpacing: 2 }}>WEAPON ARSENAL</h2>
            <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: 2 }}>{weapons.length} WEAPONS — LIVE STATS — FIREPOWER / ACCURACY / HANDLING</div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
            {Object.entries(AMMO_COLORS).filter(function(e) { return e[0] !== 'None'; }).map(function(entry) {
              return (
                <span key={entry[0]} style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: entry[1], background: entry[1] + '14', border: '1px solid ' + entry[1] + '33', borderRadius: 3, padding: '3px 8px', letterSpacing: 1 }}>
                  {entry[0].toUpperCase()}
                </span>
              );
            })}
          </div>

          {Object.entries(weaponsByCategory).map(function(entry) {
            var category = entry[0];
            var categoryWeapons = entry[1];
            return (
              <div key={category} style={{ marginBottom: 24 }}>
                <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: ORANGE, letterSpacing: 4, marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid ' + ORANGE + '22', display: 'flex', alignItems: 'center', gap: 10 }}>
                  {category.toUpperCase()}
                  <span style={{ color: 'rgba(255,255,255,0.15)', fontWeight: 400 }}>{categoryWeapons.length} WEAPONS</span>
                </div>

                <div style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 8, overflow: 'hidden' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr 80px 80px', gap: 0, padding: '8px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', background: 'rgba(255,255,255,0.02)' }}>
                    <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.25)', letterSpacing: 2 }}>WEAPON</span>
                    <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.25)', letterSpacing: 2 }}>STATS</span>
                    <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.25)', letterSpacing: 2, textAlign: 'center' }}>AMMO</span>
                    <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.25)', letterSpacing: 2, textAlign: 'center' }}>META</span>
                  </div>

                  {categoryWeapons.map(function(weapon, i) {
                    var metaTier = metaWeaponMap[weapon.name.toLowerCase()];
                    var ammoColor = AMMO_COLORS[weapon.ammo_type] || '#888';
                    var r = RARITY_COLORS[weapon.rarity] || RARITY_COLORS.Standard;
                    var hasFpr = weapon.firepower_score != null;
                    var hasDmg = weapon.damage != null;

                    return (
                      <div key={weapon.id} className="weapon-row" style={{ display: 'grid', gridTemplateColumns: '200px 1fr 80px 80px', gap: 0, padding: '12px 16px', borderBottom: i < categoryWeapons.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none', background: 'transparent', alignItems: 'center' }}>

                        <div>
                          <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 14, fontWeight: 600, color: weapon.ranked_viable === false ? 'rgba(255,255,255,0.35)' : '#fff', marginBottom: 4, lineHeight: 1 }}>{weapon.name}</div>
                          <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                            {weapon.rarity && <RarityBadge rarity={weapon.rarity} />}
                            {weapon.ranked_viable === false && <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: RED + '88', letterSpacing: 1 }}>AVOID RANKED</span>}
                          </div>
                        </div>

                        <div style={{ paddingRight: 16 }}>
                          {hasFpr ? (
                            <>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: 'rgba(255,255,255,0.2)', width: 24 }}>FPR</span>
                                {statBar(weapon.firepower_score, maxFpr, ORANGE)}
                                <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: ORANGE, width: 28, textAlign: 'right' }}>{weapon.firepower_score}</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: 'rgba(255,255,255,0.2)', width: 24 }}>ACC</span>
                                {statBar(weapon.accuracy_score, maxAcc, CYAN)}
                                <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: CYAN, width: 28, textAlign: 'right' }}>{weapon.accuracy_score}</span>
                              </div>
                            </>
                          ) : hasDmg ? (
                            <>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: 'rgba(255,255,255,0.2)', width: 24 }}>DMG</span>
                                {statBar(weapon.damage, maxDmg, RED)}
                                <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: RED, width: 28, textAlign: 'right' }}>{weapon.damage}</span>
                              </div>
                              {weapon.fire_rate && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: 'rgba(255,255,255,0.2)', width: 24 }}>RPM</span>
                                  {statBar(weapon.fire_rate, maxRpm, ORANGE)}
                                  <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: ORANGE, width: 28, textAlign: 'right' }}>{weapon.fire_rate}</span>
                                </div>
                              )}
                            </>
                          ) : (
                            <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.15)', letterSpacing: 1 }}>STATS PENDING</span>
                          )}
                        </div>

                        <div style={{ textAlign: 'center' }}>
                          <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: ammoColor, background: ammoColor + '14', border: '1px solid ' + ammoColor + '30', borderRadius: 3, padding: '3px 6px', letterSpacing: 1, display: 'inline-block' }}>
                            {(weapon.ammo_type || 'N/A').replace(' Rounds', '').replace(' Battery', '').toUpperCase()}
                          </span>
                        </div>

                        <div style={{ textAlign: 'center' }}>
                          {metaTier ? (
                            <div>
                              <TierBadge tier={metaTier.tier} />
                              <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: metaTier.trend === 'up' ? GREEN : metaTier.trend === 'down' ? RED : 'rgba(255,255,255,0.2)', marginTop: 3 }}>
                                {metaTier.trend === 'up' ? '▲ UP' : metaTier.trend === 'down' ? '▼ DN' : '● ---'}
                              </div>
                            </div>
                          ) : (
                            <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.1)', letterSpacing: 1 }}>—</span>
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

      {/* ─── SHELL BUILD SECTIONS ──────────────────────── */}
      {shells.map(function(shell) {
        var color = SHELL_COLORS[shell.name] || ORANGE;
        var articles = articlesByShell[shell.name.toLowerCase()] || [];
        if (articles.length === 0) return null;

        return (
          <section key={shell.id} id={'shell-' + shell.name.toLowerCase()} style={{ padding: '0 20px 40px', maxWidth: 1100, margin: '0 auto', borderTop: '1px solid ' + color + '18' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '24px 0 16px' }}>
              <div style={{ width: 4, height: 40, background: color, borderRadius: 2, flexShrink: 0 }} />
              <div>
                <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 16, fontWeight: 700, color: color, letterSpacing: 2 }}>{shell.name.toUpperCase()}</div>
                <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.2)', letterSpacing: 2, marginTop: 2 }}>{shell.role || ''} — {articles.length} BUILD GUIDE{articles.length !== 1 ? 'S' : ''}</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 10 }}>
              {articles.map(function(article) {
                var grade = article.ce_score >= 9 ? 'S' : article.ce_score >= 7 ? 'A' : article.ce_score >= 5 ? 'B' : 'C';
                var gradeColor = TIER_COLORS[grade] || ORANGE;
                return (
                  <Link key={article.id} href={'/intel/' + article.slug} className="build-card" style={{ display: 'flex', gap: 14, background: '#0a0a0a', border: '1px solid ' + color + '18', borderLeft: '3px solid ' + color + '55', borderRadius: 8, padding: '14px', textDecoration: 'none' }}>
                    <div style={{ textAlign: 'center', flexShrink: 0 }}>
                      <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 24, fontWeight: 900, color: gradeColor, lineHeight: 1 }}>{grade}</div>
                      <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 6, color: 'rgba(255,255,255,0.2)', letterSpacing: 1, marginTop: 2 }}>CE</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 13, fontWeight: 600, color: '#fff', lineHeight: 1.3, marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{article.headline}</div>
                      <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.2)' }}>{timeAgo(article.created_at)}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}

      {/* ─── BOTTOM CTA ──────────────────────────────── */}
      <section style={{ padding: '48px 20px 80px', textAlign: 'center', maxWidth: 600, margin: '0 auto' }}>
        <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 11, color: ORANGE + '88', letterSpacing: 3, marginBottom: 12 }}>[D] DEXTER BUILD ENGINEER</div>
        <p style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 16, color: 'rgba(255,255,255,0.35)', lineHeight: 1.6, marginBottom: 24 }}>
          Want a personalized build? Tell DEXTER your shell and playstyle — get a complete loadout with mods, cores, and implants in seconds.
        </p>
        <Link href="/advisor" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '14px 32px', background: ORANGE + '18', border: '1px solid ' + ORANGE + '55', borderRadius: 6, textDecoration: 'none', fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 700, color: ORANGE, letterSpacing: 3 }}>
          LAUNCH BUILD ADVISOR &rarr;
        </Link>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Marathon Builds and Loadouts — DEXTER Build Lab', description: 'Live weapon stats and shell rankings with build guides for Marathon.', url: 'https://cyberneticpunks.com/builds' }) }} />
    </main>
  );
}