import Link from 'next/link';
import Footer from '@/components/Footer';
import HomeIntelFeed from './HomeIntelFeed';
import { supabase } from '@/lib/supabase';
import { isMonetizationEnabled } from '@/lib/monetization';

// ── EDITOR CONFIG ──────────────────────────────────────────────
var EDITOR_COLORS = {
  CIPHER:  '#ff2222',
  NEXUS:   '#00d4ff',
  DEXTER:  '#ff8800',
  GHOST:   '#00ff88',
  MIRANDA: '#9b5de5',
};

var EDITOR_SYMBOLS = {
  CIPHER:  '◈',
  NEXUS:   '⬡',
  DEXTER:  '⬢',
  GHOST:   '◇',
  MIRANDA: '◎',
};

var SHELL_COLORS = {
  Assassin: '#cc44ff', Destroyer: '#ff3333', Recon: '#00d4ff',
  Rook: '#888888', Thief: '#ffd700', Triage: '#00ff88', Vandal: '#ff8800',
};

// ── HELPERS ────────────────────────────────────────────────────
function timeAgo(dateStr) {
  if (!dateStr) return '';
  var diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 3600)  return Math.floor(diff / 60)   + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600)  + 'h ago';
  return Math.floor(diff / 86400) + 'd ago';
}

function tierBg(tier) {
  if (tier === 'S') return { background: '#ff2222', color: '#fff' };
  if (tier === 'A') return { background: '#ff8800', color: '#000' };
  if (tier === 'B') return { background: '#00d4ff', color: '#000' };
  return { background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.5)' };
}

function trendArrow(trend) {
  var t = (trend || '').toLowerCase();
  if (t === 'up')   return { symbol: '↑', color: '#00ff41' };
  if (t === 'down') return { symbol: '↓', color: '#ff2222' };
  return null;
}

function imagePath(type, filename) {
  if (!filename) return null;
  var folder = (type || '').toLowerCase() === 'shell' ? 'shells' : 'weapons';
  return '/images/' + folder + '/' + filename;
}

function cronCycleInfo() {
  var now        = new Date();
  var totalMins  = now.getUTCHours() * 60 + now.getUTCMinutes();
  var cycleMins  = 360;
  var minsIn     = totalMins % cycleMins;
  var minsLeft   = cycleMins - minsIn;
  var progress   = Math.round((minsIn / cycleMins) * 100);
  var hLeft      = Math.floor(minsLeft / 60);
  var mLeft      = minsLeft % 60;
  var nextLabel  = hLeft > 0 ? hLeft + 'h ' + mLeft + 'm' : mLeft + 'm';
  return { progress, nextLabel };
}

function rankedStatus() {
  var now    = new Date();
  var ptMs   = now.getTime() - 7 * 3600000;
  var pt     = new Date(ptMs);
  var day    = pt.getUTCDay();
  var hour   = pt.getUTCHours();
  var live   =
    (day === 0 && hour >= 10) ||
    (day === 1 || day === 2 || day === 3) ||
    (day === 4 && hour < 10);
  return live ? 'LIVE' : 'OFFLINE';
}

// ── DATA FETCH ─────────────────────────────────────────────────
async function getHomepageData() {
  try {
    var weekAgoIso = new Date(Date.now() - 7 * 86400000).toISOString();
    var twoWeekIso = new Date(Date.now() - 14 * 86400000).toISOString();

    var [
      tiersRes, sideArticlesRes, weaponRes, shellRes, weaponImgRes, shellImgRes,
      intelFeedRes, weeklyCountRes, weeklyBuildsRes, shellListRes,
    ] = await Promise.all([
      supabase
        .from('meta_tiers')
        .select('name, type, tier, trend')
        .in('tier', ['S', 'A'])
        .order('tier', { ascending: true })
        .order('name',  { ascending: true })
        .limit(14),

      // Right panel (legacy — keep working) - 5 most recent one-per-editor
      supabase
        .from('feed_items')
        .select('id, headline, editor, created_at, slug, ce_score, tags')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(30),

      supabase
        .from('weapon_stats')
        .select('id', { count: 'exact', head: true }),

      supabase
        .from('shell_stats')
        .select('id', { count: 'exact', head: true }),

      supabase
        .from('weapon_stats')
        .select('name, image_filename, damage, fire_rate, weapon_type'),

      supabase
        .from('shell_stats')
        .select('name, image_filename, role'),

      // Intel Feed full-width strip
      supabase
        .from('feed_items')
        .select('id, headline, slug, editor, tags, thumbnail, ce_score, created_at')
        .eq('is_published', true)
        .gte('created_at', twoWeekIso)
        .order('created_at', { ascending: false })
        .limit(25),

      // 7-day article count
      supabase
        .from('feed_items')
        .select('id', { count: 'exact', head: true })
        .eq('is_published', true)
        .gte('created_at', weekAgoIso),

      // 7-day builds generated count
      supabase
        .from('site_events')
        .select('id', { count: 'exact', head: true })
        .eq('event_name', 'advisor_generate')
        .gte('created_at', weekAgoIso),

      // Shells for THE FORGE panel
      supabase
        .from('shell_stats')
        .select('name, image_filename')
        .order('name'),
    ]);

    var weaponMap = {};
    (weaponImgRes.data || []).forEach(function(w) { weaponMap[w.name] = w; });
    var shellMap = {};
    (shellImgRes.data  || []).forEach(function(s) { shellMap[s.name]  = s; });

    var enrichedTiers = (tiersRes.data || []).map(function(t) {
      var extra = (t.type || '').toLowerCase() === 'shell'
        ? (shellMap[t.name]  || {})
        : (weaponMap[t.name] || {});
      return Object.assign({}, t, {
        image_filename: extra.image_filename || null,
        damage:         extra.damage         || null,
        fire_rate:      extra.fire_rate       || null,
        weapon_type:    extra.weapon_type     || null,
        role:           extra.role            || null,
      });
    });

    var EDITORS = ['CIPHER', 'NEXUS', 'DEXTER', 'GHOST', 'MIRANDA'];
    var seen = {};
    var sideFeed = [];
    for (var a of (sideArticlesRes.data || [])) {
      if (!seen[a.editor] && EDITORS.includes(a.editor)) {
        seen[a.editor] = true;
        sideFeed.push(a);
      }
      if (sideFeed.length === 5) break;
    }

    return {
      tiers:         enrichedTiers,
      sideFeed:      sideFeed,
      weaponCount:   weaponRes.count || 0,
      shellCount:    shellRes.count  || 0,
      lastUpdated:   (sideArticlesRes.data || [])[0]?.created_at || null,
      intelFeed:     intelFeedRes.data || [],
      weeklyCount:   weeklyCountRes.count || 0,
      weeklyBuilds:  weeklyBuildsRes.count || 0,
      shells:        shellListRes.data || [],
    };
  } catch (e) {
    return {
      tiers: [], sideFeed: [], weaponCount: 0, shellCount: 0, lastUpdated: null,
      intelFeed: [], weeklyCount: 0, weeklyBuilds: 0, shells: [],
    };
  }
}

// ── PAGE ───────────────────────────────────────────────────────
export const revalidate = 300;

export default async function Home() {
  var data = await getHomepageData();
  var tiers        = data.tiers;
  var sideFeed     = data.sideFeed;
  var weaponCount  = data.weaponCount;
  var shellCount   = data.shellCount;
  var lastUpdated  = data.lastUpdated;
  var intelFeed    = data.intelFeed;
  var weeklyCount  = data.weeklyCount;
  var weeklyBuilds = data.weeklyBuilds;
  var shells       = data.shells;

  var sTiers  = tiers.filter(function(t) { return t.tier === 'S'; }).slice(0, 4);
  var aTiers  = tiers.filter(function(t) { return t.tier === 'A'; }).slice(0, 4);
  var cron    = cronCycleInfo();
  var ranked  = rankedStatus();
  var monetizationOn = isMonetizationEnabled();

  // === DATA FOR PRODUCT PANELS ===

  // META GRID: top 3 S-tier + 2 A-tier
  var gridPreview = tiers.filter(function(t) { return t.tier === 'S'; }).slice(0, 3);
  if (gridPreview.length < 3) {
    var aFill = tiers.filter(function(t) { return t.tier === 'A'; }).slice(0, 3 - gridPreview.length);
    gridPreview = gridPreview.concat(aFill);
  }
  var firstMover = tiers.find(function(t) { return t.trend === 'up' || t.trend === 'down'; });

  // THE FORGE: 7 shells + sample pick
  var sampleShells = ['Assassin', 'Destroyer', 'Recon', 'Rook', 'Thief', 'Triage', 'Vandal'];
  var forgeShells = sampleShells.map(function(name) {
    var found = shells.find(function(s) { return s.name === name; });
    return {
      name: name,
      color: SHELL_COLORS[name] || '#888',
      image_filename: found ? found.image_filename : null,
    };
  });

  // RANKING BOARD: preview 3 rows using real data
  var boardS = tiers.filter(function(t) { return t.tier === 'S'; }).slice(0, 3);
  var boardA = tiers.filter(function(t) { return t.tier === 'A'; }).slice(0, 3);
  var boardB = tiers.filter(function(t) { return t.tier === 'B' || !t.tier; }).slice(0, 3);

  return (
    <div style={{ background: '#121418', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      <style>{`
        .hp-panel-left   { display: none; }
        .hp-panel-right  { display: none; }
        .hp-grid         { display: block; }
        .hp-meta-strip   { display: block; }
        .hp-product-grid { grid-template-columns: 1fr !important; }

        @media (min-width: 768px) {
          .hp-product-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }

        @media (min-width: 1024px) {
          .hp-grid {
            display: grid;
            grid-template-columns: 280px 1fr 300px;
            gap: 1px;
            background: #1e2028;
          }
          .hp-panel-left   { display: flex; flex-direction: column; }
          .hp-panel-right  { display: flex; flex-direction: column; }
          .hp-meta-strip   { display: none; }
        }

        .product-panel       { transition: background 0.12s, border-color 0.12s; }
        .product-panel:hover { background: #1e2228 !important; }
        .intel-row           { transition: background 0.1s; }
        .intel-row:hover     { background: rgba(255,255,255,0.03) !important; }
        .tier-row            { transition: background 0.1s; }
        .tier-row:hover      { background: rgba(255,255,255,0.03) !important; }
      `}</style>

      <div className="hp-grid" style={{ flex: 1, marginTop: 48 }}>

        {/* ══ LEFT: Live Meta HUD ══════════════════════════════ */}
        <div className="hp-panel-left" style={{ background: '#121418', overflowY: 'auto' }}>

          <div style={{ padding: '13px 18px', borderBottom: '1px solid #1e2028', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 3, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>Live Meta</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#00ff41', boxShadow: '0 0 6px rgba(0,255,65,0.5)' }} />
              <span style={{ fontSize: 9, fontWeight: 700, color: '#00ff41', letterSpacing: 1 }}>LIVE</span>
            </div>
          </div>

          <div style={{ padding: '10px 18px', borderBottom: '1px solid #1e2028' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase' }}>Next Cycle</span>
              <span style={{ fontSize: 9, fontWeight: 700, color: '#00ff41', letterSpacing: 1 }}>{cron.nextLabel}</span>
            </div>
            <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ width: cron.progress + '%', height: '100%', background: 'linear-gradient(90deg, #00ff41aa, #00ff41)', borderRadius: 2, transition: 'width 1s' }} />
            </div>
          </div>

          <div style={{ padding: '8px 18px', borderBottom: '1px solid #1e2028', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: 1 }}>Ranked Queue</span>
            <span style={{
              fontSize: 9, fontWeight: 800, letterSpacing: 2,
              color:      ranked === 'LIVE' ? '#00ff41' : 'rgba(255,255,255,0.25)',
              background: ranked === 'LIVE' ? 'rgba(0,255,65,0.1)' : 'rgba(255,255,255,0.04)',
              padding: '2px 8px', borderRadius: 2,
            }}>
              {ranked}
            </span>
          </div>

          <div style={{ flex: 1 }}>
            {sTiers.length > 0 && (
              <div>
                <div style={{ padding: '10px 18px 5px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 3, height: 12, background: '#ff2222', borderRadius: 1 }} />
                  <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 3, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase' }}>S Tier</span>
                </div>
                {sTiers.map(function(item) {
                  var arrow   = trendArrow(item.trend);
                  var imgSrc  = imagePath(item.type, item.image_filename);
                  var isShell = (item.type || '').toLowerCase() === 'shell';
                  var dmgPct  = item.damage   ? Math.min((item.damage / 120)   * 100, 100) : 0;
                  var rpmPct  = item.fire_rate ? Math.min((item.fire_rate / 800) * 100, 100) : 0;
                  return (
                    <div key={item.name} className="tier-row" style={{ padding: '9px 18px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 38, height: 38, flexShrink: 0, background: '#1a1d24', border: '1px solid #22252e', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                          {imgSrc
                            ? <img src={imgSrc} alt={item.name} style={{ width: 34, height: 34, objectFit: 'contain' }} />
                            : <span style={{ fontSize: 16, color: 'rgba(255,255,255,0.08)' }}>{isShell ? '◎' : '⬢'}</span>
                          }
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.8)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                            {arrow && <span style={{ fontSize: 10, color: arrow.color, flexShrink: 0 }}>{arrow.symbol}</span>}
                          </div>
                          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: 1, marginBottom: isShell ? 0 : 5 }}>
                            {isShell ? (item.role || 'SHELL') : (item.weapon_type || 'WEAPON')}
                          </div>
                          {!isShell && (item.damage || item.fire_rate) && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                              {item.damage && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                  <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.18)', width: 20, letterSpacing: 0 }}>DMG</span>
                                  <div style={{ flex: 1, height: 2, background: 'rgba(255,255,255,0.06)', borderRadius: 1, overflow: 'hidden' }}>
                                    <div style={{ width: dmgPct + '%', height: '100%', background: '#ff8800', borderRadius: 1 }} />
                                  </div>
                                  <span style={{ fontSize: 8, color: '#ff8800', fontWeight: 700, width: 22, textAlign: 'right' }}>{item.damage}</span>
                                </div>
                              )}
                              {item.fire_rate && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                  <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.18)', width: 20 }}>RPM</span>
                                  <div style={{ flex: 1, height: 2, background: 'rgba(255,255,255,0.06)', borderRadius: 1, overflow: 'hidden' }}>
                                    <div style={{ width: rpmPct + '%', height: '100%', background: '#00d4ff', borderRadius: 1 }} />
                                  </div>
                                  <span style={{ fontSize: 8, color: '#00d4ff', fontWeight: 700, width: 22, textAlign: 'right' }}>{item.fire_rate}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <div style={{ ...tierBg('S'), padding: '3px 8px', fontSize: 11, fontWeight: 800, letterSpacing: 1, borderRadius: 2, flexShrink: 0 }}>S</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {aTiers.length > 0 && (
              <div style={{ marginTop: 4 }}>
                <div style={{ padding: '10px 18px 5px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 3, height: 12, background: '#ff8800', borderRadius: 1 }} />
                  <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 3, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase' }}>A Tier</span>
                </div>
                {aTiers.map(function(item) {
                  var arrow   = trendArrow(item.trend);
                  var imgSrc  = imagePath(item.type, item.image_filename);
                  var isShell = (item.type || '').toLowerCase() === 'shell';
                  var dmgPct  = item.damage   ? Math.min((item.damage / 120)   * 100, 100) : 0;
                  var rpmPct  = item.fire_rate ? Math.min((item.fire_rate / 800) * 100, 100) : 0;
                  return (
                    <div key={item.name} className="tier-row" style={{ padding: '9px 18px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 38, height: 38, flexShrink: 0, background: '#1a1d24', border: '1px solid #22252e', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                          {imgSrc
                            ? <img src={imgSrc} alt={item.name} style={{ width: 34, height: 34, objectFit: 'contain' }} />
                            : <span style={{ fontSize: 16, color: 'rgba(255,255,255,0.08)' }}>{isShell ? '◎' : '⬢'}</span>
                          }
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.75)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                            {arrow && <span style={{ fontSize: 10, color: arrow.color, flexShrink: 0 }}>{arrow.symbol}</span>}
                          </div>
                          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: 1, marginBottom: isShell ? 0 : 5 }}>
                            {isShell ? (item.role || 'SHELL') : (item.weapon_type || 'WEAPON')}
                          </div>
                          {!isShell && (item.damage || item.fire_rate) && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                              {item.damage && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                  <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.18)', width: 20 }}>DMG</span>
                                  <div style={{ flex: 1, height: 2, background: 'rgba(255,255,255,0.06)', borderRadius: 1, overflow: 'hidden' }}>
                                    <div style={{ width: dmgPct + '%', height: '100%', background: '#ff8800', borderRadius: 1 }} />
                                  </div>
                                  <span style={{ fontSize: 8, color: '#ff8800', fontWeight: 700, width: 22, textAlign: 'right' }}>{item.damage}</span>
                                </div>
                              )}
                              {item.fire_rate && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                  <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.18)', width: 20 }}>RPM</span>
                                  <div style={{ flex: 1, height: 2, background: 'rgba(255,255,255,0.06)', borderRadius: 1, overflow: 'hidden' }}>
                                    <div style={{ width: rpmPct + '%', height: '100%', background: '#00d4ff', borderRadius: 1 }} />
                                  </div>
                                  <span style={{ fontSize: 8, color: '#00d4ff', fontWeight: 700, width: 22, textAlign: 'right' }}>{item.fire_rate}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <div style={{ ...tierBg('A'), padding: '3px 8px', fontSize: 11, fontWeight: 800, letterSpacing: 1, borderRadius: 2, flexShrink: 0 }}>A</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {sTiers.length === 0 && aTiers.length === 0 && (
              <div style={{ padding: '20px 18px', fontSize: 10, color: 'rgba(255,255,255,0.1)', letterSpacing: 1 }}>TIER DATA LOADING...</div>
            )}
          </div>

          <div style={{ padding: '16px 18px', borderTop: '1px solid #1e2028' }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 3, color: 'rgba(255,255,255,0.18)', textTransform: 'uppercase', marginBottom: 12 }}>Database</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div style={{ background: '#1a1d24', border: '1px solid #22252e', borderRadius: 3, padding: '10px 12px' }}>
                <div style={{ fontSize: 28, fontWeight: 900, color: '#00ff41', letterSpacing: -1, lineHeight: 1 }}>{weaponCount}</div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: 2, marginTop: 4, textTransform: 'uppercase' }}>Weapons</div>
              </div>
              <div style={{ background: '#1a1d24', border: '1px solid #22252e', borderRadius: 3, padding: '10px 12px' }}>
                <div style={{ fontSize: 28, fontWeight: 900, color: '#00d4ff', letterSpacing: -1, lineHeight: 1 }}>{shellCount}</div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: 2, marginTop: 4, textTransform: 'uppercase' }}>Shells</div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>Last updated</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.45)' }}>{timeAgo(lastUpdated) || '—'}</span>
            </div>
          </div>

          <div style={{ padding: '0 18px 18px' }}>
            <Link href="/meta" style={{ display: 'block', padding: '9px 14px', background: '#1a1d24', border: '1px solid #22252e', borderTop: '2px solid #00ff41', borderRadius: '0 0 3px 3px', fontSize: 10, fontWeight: 700, letterSpacing: 2, color: '#00ff41', textDecoration: 'none', textAlign: 'center', textTransform: 'uppercase' }}>
              Full Tier List →
            </Link>
          </div>
        </div>

        {/* ══ CENTER: Hero + Product Grid ═════════════════════ */}
        <div style={{ background: '#121418', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>

          {/* Atmospheric background */}
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
            <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, rgba(0,255,65,0.07) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
            <div style={{ position: 'absolute', top: -120, right: -120, width: 480, height: 480, border: '1px solid rgba(0,255,65,0.04)', transform: 'rotate(45deg)' }} />
            <div style={{ position: 'absolute', top: -60, right: -60, width: 320, height: 320, border: '1px solid rgba(0,255,65,0.03)', transform: 'rotate(45deg)' }} />
            <div style={{ position: 'absolute', bottom: 60, left: -80, width: 300, height: 300, border: '1px solid rgba(0,212,255,0.03)', transform: 'rotate(45deg)' }} />
            <div style={{ position: 'absolute', top: 0, right: 80, width: 1, height: '100%', background: 'linear-gradient(180deg, transparent, rgba(0,255,65,0.05) 30%, rgba(0,255,65,0.05) 70%, transparent)' }} />
          </div>

          {/* Hero */}
          <div style={{ position: 'relative', zIndex: 1, padding: '36px 24px 28px', borderBottom: '1px solid #1e2028' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', background: 'rgba(0,255,65,0.07)', border: '1px solid rgba(0,255,65,0.18)', borderRadius: 2, fontSize: 10, fontWeight: 700, letterSpacing: 2, color: '#00ff41', marginBottom: 20 }}>
              <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#00ff41' }} />
              MARATHON — BUNGIE
            </div>

            <h1 style={{ fontSize: 'clamp(30px, 4.5vw, 48px)', fontWeight: 900, lineHeight: 1.0, letterSpacing: '-1px', margin: '0 0 14px', color: '#fff' }}>
              Know the meta.<br />
              <span style={{ color: '#00ff41' }}>Own the extraction.</span>
            </h1>

            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.32)', lineHeight: 1.7, maxWidth: 520, margin: '0 0 24px' }}>
              Live tier lists, AI-powered loadouts, and personalized coaching for Marathon Runners. Always updated. Always free.
            </p>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Link href="/meta" style={{ padding: '11px 24px', background: '#00ff41', color: '#000', fontSize: 12, fontWeight: 800, letterSpacing: '1px', borderRadius: 2, textDecoration: 'none' }}>
                CHECK THE META
              </Link>
              <Link href="/advisor" style={{ padding: '11px 22px', background: '#1e2028', border: '1px solid #2a2d36', color: 'rgba(255,255,255,0.55)', fontSize: 12, fontWeight: 700, letterSpacing: '1px', borderRadius: 2, textDecoration: 'none' }}>
                GET A BUILD
              </Link>
            </div>
          </div>

          {/* ══ 2×2 PRODUCT GRID ═══════════════════════════════ */}
          <div style={{ position: 'relative', zIndex: 1, padding: '24px 24px 28px' }}>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 3, color: 'rgba(255,255,255,0.18)', textTransform: 'uppercase' }}>Products</span>
              <div style={{ flex: 1, height: 1, background: '#1e2028' }} />
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.12)', letterSpacing: 1 }}>4 AVAILABLE</span>
            </div>

            <div className="hp-product-grid" style={{ display: 'grid', gap: 10 }}>

              {/* ══ PANEL 1: META GRID ═════════════════════════ */}
              <Link href="/meta" className="product-panel" style={{
                display: 'flex', flexDirection: 'column',
                background: '#1a1d24',
                border: '1px solid #22252e',
                borderTop: '2px solid #00ff41',
                borderRadius: '0 0 3px 3px',
                padding: '20px 22px',
                textDecoration: 'none',
                minHeight: 320,
                position: 'relative',
              }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
                  <div>
                    <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 22, fontWeight: 900, color: '#00ff41', letterSpacing: 1, lineHeight: 1 }}>
                      META GRID
                    </div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: 1.5, fontWeight: 700, marginTop: 4, fontFamily: 'monospace' }}>
                      Live Tier List
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#00ff41', boxShadow: '0 0 6px rgba(0,255,65,0.5)' }} />
                    <span style={{ fontSize: 8, color: '#00ff41', letterSpacing: 1.5, fontWeight: 700, fontFamily: 'monospace' }}>{cron.nextLabel}</span>
                  </div>
                </div>

                {/* Mini tier rows */}
                <div style={{ marginTop: 14, flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {gridPreview.length > 0 ? gridPreview.map(function(item, idx) {
                    var imgSrc = imagePath(item.type, item.image_filename);
                    var isShell = (item.type || '').toLowerCase() === 'shell';
                    var arrow = trendArrow(item.trend);
                    return (
                      <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', background: '#0e1014', border: '1px solid #22252e', borderRadius: 2 }}>
                        <div style={{ ...tierBg(item.tier), padding: '3px 7px', fontSize: 10, fontWeight: 900, borderRadius: 2, fontFamily: 'Orbitron, monospace', lineHeight: 1, flexShrink: 0 }}>{item.tier}</div>
                        <div style={{ width: 32, height: 32, flexShrink: 0, background: '#1a1d24', border: '1px solid #22252e', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                          {imgSrc ? <img src={imgSrc} alt={item.name} style={{ width: 28, height: 28, objectFit: 'contain' }} /> : <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.15)' }}>{isShell ? '◎' : '⬢'}</span>}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.85)', letterSpacing: 0.5, marginBottom: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                          <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.3)', letterSpacing: 1.5, fontWeight: 700, fontFamily: 'monospace' }}>{isShell ? 'SHELL' : 'WEAPON'}</div>
                        </div>
                        {arrow && idx === 0 && firstMover && firstMover.name === item.name && (
                          <span style={{ fontSize: 9, color: arrow.color, letterSpacing: 1, fontWeight: 700, fontFamily: 'monospace', flexShrink: 0 }}>
                            {arrow.symbol} {arrow.color === '#00ff41' ? 'UP' : 'DOWN'}
                          </span>
                        )}
                      </div>
                    );
                  }) : (
                    <div style={{ padding: 20, textAlign: 'center', fontSize: 10, color: 'rgba(255,255,255,0.15)', letterSpacing: 1 }}>LOADING...</div>
                  )}
                </div>

                {/* Bottom strip */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTop: '1px solid #22252e' }}>
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', letterSpacing: 1, fontFamily: 'monospace', fontWeight: 700 }}>
                    {weaponCount} weapons · {shellCount} shells
                  </span>
                  <span style={{ fontSize: 8, color: '#00d4ff' + 'aa', letterSpacing: 1, fontFamily: 'monospace', fontWeight: 700 }}>
                    ⬡ GRADED BY NEXUS EVERY 6H
                  </span>
                </div>
              </Link>

              {/* ══ PANEL 2: THE FORGE ═════════════════════════ */}
              <Link href="/advisor" className="product-panel" style={{
                display: 'flex', flexDirection: 'column',
                background: '#1a1d24',
                border: '1px solid #22252e',
                borderTop: '2px solid #ff8800',
                borderRadius: '0 0 3px 3px',
                padding: '20px 22px',
                textDecoration: 'none',
                minHeight: 320,
                position: 'relative',
              }}>
                {/* Header */}
                <div>
                  <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 22, fontWeight: 900, color: '#ff8800', letterSpacing: 1, lineHeight: 1 }}>
                    THE FORGE
                  </div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: 1.5, fontWeight: 700, marginTop: 4, fontFamily: 'monospace' }}>
                    AI Build Advisor
                  </div>
                </div>

                {/* Shell portraits row */}
                <div style={{ marginTop: 16, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {forgeShells.map(function(s) {
                    var imgSrc = s.image_filename ? '/images/shells/' + s.image_filename : null;
                    return (
                      <div key={s.name} title={s.name} style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid ' + s.color + '55', background: '#0e1014', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {imgSrc ? (
                          <img src={imgSrc} alt={s.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <span style={{ fontSize: 11, color: s.color }}>◈</span>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div style={{ marginTop: 10, fontSize: 11, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
                  Pick your shell. Get a full loadout in seconds.
                </div>

                {/* Sample build preview */}
                <div style={{ marginTop: 14, padding: '10px 12px', background: '#0e1014', border: '1px solid #22252e', borderLeft: '2px solid #ffd700', borderRadius: '0 2px 2px 0', flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 13, color: '#ffd700' }}>⬠</span>
                      <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 11, fontWeight: 800, color: '#ffd700', letterSpacing: 1 }}>THIEF</span>
                    </div>
                    <div style={{ background: '#ff8800', color: '#000', padding: '2px 7px', fontSize: 10, fontWeight: 900, borderRadius: 2, fontFamily: 'Orbitron, monospace', letterSpacing: 0.5 }}>A-GRADE</div>
                  </div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>
                    WSTR + Longshot
                  </div>
                  <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                    {['Suppressor', 'Thermal', 'Stabilizer'].map(function(mod) {
                      return <span key={mod} style={{ fontSize: 8, padding: '1px 5px', background: '#1a1d24', border: '1px solid #22252e', borderRadius: 2, color: 'rgba(255,255,255,0.4)', letterSpacing: 0.5, fontWeight: 700 }}>{mod}</span>;
                    })}
                  </div>
                  <div style={{ fontSize: 8, color: '#00ff41', letterSpacing: 1, fontWeight: 700, fontFamily: 'monospace', marginTop: 2 }}>
                    RANKED VIABLE · GOLD HOLOTAG
                  </div>
                </div>

                {/* Bottom strip */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTop: '1px solid #22252e' }}>
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', letterSpacing: 1, fontFamily: 'monospace', fontWeight: 700 }}>
                    {weeklyBuilds > 0 ? weeklyBuilds + ' forged this week' : 'Engineered from live data'}
                  </span>
                  <span style={{ fontSize: 8, color: '#ff8800' + 'aa', letterSpacing: 1, fontFamily: 'monospace', fontWeight: 700 }}>
                    ⬢ ENGINEERED BY DEXTER
                  </span>
                </div>
              </Link>

              {/* ══ PANEL 3: RANKING BOARD ═════════════════════ */}
              <Link href="/meta#builder" className="product-panel" style={{
                display: 'flex', flexDirection: 'column',
                background: '#1a1d24',
                border: '1px solid #22252e',
                borderTop: '2px solid rgba(255,255,255,0.4)',
                borderRadius: '0 0 3px 3px',
                padding: '20px 22px',
                textDecoration: 'none',
                minHeight: 320,
                position: 'relative',
              }}>
                {/* Header */}
                <div>
                  <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 22, fontWeight: 900, color: 'rgba(255,255,255,0.85)', letterSpacing: 1, lineHeight: 1 }}>
                    RANKING BOARD
                  </div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: 1.5, fontWeight: 700, marginTop: 4, fontFamily: 'monospace' }}>
                    Make Your Tier List
                  </div>
                </div>

                {/* Miniature tier list preview */}
                <div style={{ marginTop: 16, flex: 1, background: '#0e1014', border: '1px solid #22252e', borderRadius: 2, padding: '10px', display: 'flex', flexDirection: 'column', gap: 4, position: 'relative', overflow: 'hidden' }}>
                  {/* S row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ ...tierBg('S'), width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, borderRadius: 2, flexShrink: 0, fontFamily: 'Orbitron, monospace' }}>S</div>
                    <div style={{ display: 'flex', gap: 3, flex: 1 }}>
                      {boardS.map(function(item) {
                        var imgSrc = imagePath(item.type, item.image_filename);
                        return (
                          <div key={item.name} style={{ width: 22, height: 22, background: '#1a1d24', border: '1px solid #22252e', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                            {imgSrc ? <img src={imgSrc} alt="" style={{ width: 20, height: 20, objectFit: 'contain' }} /> : <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.15)' }}>◈</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  {/* A row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ ...tierBg('A'), width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, borderRadius: 2, flexShrink: 0, fontFamily: 'Orbitron, monospace' }}>A</div>
                    <div style={{ display: 'flex', gap: 3, flex: 1 }}>
                      {boardA.map(function(item) {
                        var imgSrc = imagePath(item.type, item.image_filename);
                        return (
                          <div key={item.name} style={{ width: 22, height: 22, background: '#1a1d24', border: '1px solid #22252e', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                            {imgSrc ? <img src={imgSrc} alt="" style={{ width: 20, height: 20, objectFit: 'contain' }} /> : <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.15)' }}>◈</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  {/* B row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ ...tierBg('B'), width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, borderRadius: 2, flexShrink: 0, fontFamily: 'Orbitron, monospace' }}>B</div>
                    <div style={{ display: 'flex', gap: 3, flex: 1 }}>
                      {boardB.slice(0, 3).map(function(item, i) {
                        var imgSrc = imagePath(item.type, item.image_filename);
                        return (
                          <div key={item.name || ('b' + i)} style={{ width: 22, height: 22, background: '#1a1d24', border: '1px solid #22252e', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                            {imgSrc ? <img src={imgSrc} alt="" style={{ width: 20, height: 20, objectFit: 'contain' }} /> : <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.12)' }}>◈</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Watermark */}
                  <div style={{ marginTop: 'auto', paddingTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.15)', letterSpacing: 1, fontFamily: 'monospace', fontWeight: 700 }}>CYBERNETICPUNKS.COM</div>
                    <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.15)', letterSpacing: 0.5, fontFamily: 'monospace' }}>by @YourTag</div>
                  </div>
                </div>

                {/* Bottom strip */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTop: '1px solid #22252e' }}>
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', letterSpacing: 1, fontFamily: 'monospace', fontWeight: 700 }}>
                    Share on X · Reddit · Discord
                  </span>
                  <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', letterSpacing: 1, fontFamily: 'monospace', fontWeight: 700 }}>
                    AUTO-BRANDED
                  </span>
                </div>
              </Link>

              {/* ══ PANEL 4: THE AUDIT ═════════════════════════ */}
              <Link href={monetizationOn ? '/join' : '#'} className="product-panel" style={{
                display: 'flex', flexDirection: 'column',
                background: '#1a1d24',
                border: '1px solid #22252e',
                borderTop: '2px solid #9b5de5',
                borderRadius: '0 0 3px 3px',
                padding: '20px 22px',
                textDecoration: 'none',
                minHeight: 320,
                position: 'relative',
                cursor: monetizationOn ? 'pointer' : 'default',
              }}>
                {/* Diagonal stripe texture overlay for locked state */}
                {!monetizationOn && (
                  <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(155,93,229,0.015) 8px, rgba(155,93,229,0.015) 9px)', pointerEvents: 'none', borderRadius: '0 0 3px 3px' }} />
                )}

                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
                  <div>
                    <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 22, fontWeight: 900, color: '#9b5de5', letterSpacing: 1, lineHeight: 1 }}>
                      THE AUDIT
                    </div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: 1.5, fontWeight: 700, marginTop: 4, fontFamily: 'monospace' }}>
                      Personal Build Coach
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                    {monetizationOn ? (
                      <>
                        <span style={{ padding: '2px 7px', background: '#9b5de5', color: '#fff', fontSize: 8, fontWeight: 800, letterSpacing: 1.5, borderRadius: 2, fontFamily: 'monospace' }}>BETA</span>
                        <span style={{ padding: '2px 7px', background: 'rgba(0,255,65,0.1)', color: '#00ff41', fontSize: 8, fontWeight: 800, letterSpacing: 1.5, borderRadius: 2, fontFamily: 'monospace' }}>FREE DURING BETA</span>
                      </>
                    ) : (
                      <span style={{ padding: '2px 7px', background: 'rgba(155,93,229,0.15)', color: '#9b5de5', border: '1px solid rgba(155,93,229,0.3)', fontSize: 8, fontWeight: 800, letterSpacing: 1.5, borderRadius: 2, fontFamily: 'monospace' }}>COMING SOON</span>
                    )}
                  </div>
                </div>

                {/* Three editor portraits */}
                <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-around', gap: 8, position: 'relative', zIndex: 1 }}>
                  {[
                    { name: 'DEXTER', color: '#ff8800', label: 'Build Score' },
                    { name: 'NEXUS', color: '#00d4ff', label: 'Meta Score' },
                    { name: 'MIRANDA', color: '#9b5de5', label: 'Runner Type' },
                  ].map(function(ed) {
                    return (
                      <div key={ed.name} style={{ textAlign: 'center', flex: 1 }}>
                        <div style={{ width: 40, height: 40, borderRadius: '50%', border: '1.5px solid ' + ed.color + '50', background: '#0e1014', overflow: 'hidden', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <img src={'/images/editors/' + ed.name.toLowerCase() + '.jpg'} alt={ed.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
                        </div>
                        <div style={{ fontSize: 8, color: ed.color, letterSpacing: 1, fontWeight: 700, marginTop: 5, fontFamily: 'monospace' }}>{ed.name}</div>
                        <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.3)', letterSpacing: 0.5, fontWeight: 700, marginTop: 2, fontFamily: 'monospace' }}>{ed.label}</div>
                      </div>
                    );
                  })}
                </div>

                {/* Sample audit output */}
                <div style={{ marginTop: 14, padding: '12px', background: '#0e1014', border: '1px solid #22252e', borderLeft: '2px solid #9b5de5', borderRadius: '0 2px 2px 0', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 5, position: 'relative', zIndex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ background: '#9b5de5', color: '#fff', padding: '4px 10px', fontSize: 18, fontWeight: 900, borderRadius: 2, fontFamily: 'Orbitron, monospace', lineHeight: 1 }}>A</div>
                    <div>
                      <div style={{ fontSize: 10, color: '#9b5de5', letterSpacing: 1, fontWeight: 800, fontFamily: 'monospace' }}>S-TIER SOLO</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: 700, fontFamily: 'Orbitron, monospace', letterSpacing: 0.5 }}>"THE EXTRACTOR"</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: 0.5, lineHeight: 1.5, marginTop: 4, fontFamily: 'monospace', fontWeight: 600 }}>
                    3 AI editors · 8 slot analysis · Live meta context
                  </div>
                </div>

                {/* Bottom strip */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTop: '1px solid #22252e', position: 'relative', zIndex: 1 }}>
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', letterSpacing: 1, fontFamily: 'monospace', fontWeight: 700 }}>
                    Bungie OAuth · Scored & saved
                  </span>
                  <span style={{ fontSize: 10, color: '#9b5de5', letterSpacing: 1, fontWeight: 800, fontFamily: 'monospace' }}>
                    {monetizationOn ? 'TRY FREE →' : 'COMING SOON'}
                  </span>
                </div>
              </Link>

            </div>

            {/* Mobile meta strip */}
            <div className="hp-meta-strip" style={{ marginTop: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 3, color: 'rgba(255,255,255,0.18)', textTransform: 'uppercase' }}>Live Meta</span>
                <div style={{ flex: 1, height: 1, background: '#1e2028' }} />
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#00ff41', boxShadow: '0 0 6px rgba(0,255,65,0.4)' }} />
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {tiers.slice(0, 6).map(function(item) {
                  var imgSrc = imagePath(item.type, item.image_filename);
                  return (
                    <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: '#1a1d24', border: '1px solid #22252e', borderRadius: 3 }}>
                      {imgSrc && <img src={imgSrc} alt={item.name} style={{ width: 20, height: 20, objectFit: 'contain' }} />}
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>{item.name}</span>
                      <span style={{ ...tierBg(item.tier), padding: '2px 7px', fontSize: 10, fontWeight: 800, borderRadius: 2 }}>{item.tier}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ══ INTEL FEED FULL-WIDTH STRIP ════════════════════ */}
          <HomeIntelFeed articles={intelFeed} weeklyCount={weeklyCount} />
        </div>

        {/* ══ RIGHT: Intel Feed (legacy) ═════════════════════ */}
        <div className="hp-panel-right" style={{ background: '#121418', overflowY: 'auto' }}>

          <div style={{ padding: '13px 18px', borderBottom: '1px solid #1e2028', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 3, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>Latest Intel</span>
            <Link href="/intel" style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', textDecoration: 'none', letterSpacing: 1, fontWeight: 700, textTransform: 'uppercase' }}>VIEW ALL →</Link>
          </div>

          <div style={{ flex: 1 }}>
            {sideFeed.length > 0 ? sideFeed.map(function(article) {
              var color   = EDITOR_COLORS[article.editor]  || '#888';
              var symbol  = EDITOR_SYMBOLS[article.editor] || '·';
              var portrait = '/images/editors/' + (article.editor || '').toLowerCase() + '.jpg';
              return (
                <Link key={article.id} href={'/intel/' + article.slug} className="intel-row"
                  style={{ display: 'block', padding: '14px 18px', borderBottom: '1px solid #1e2028', borderLeft: '2px solid ' + color + '44', textDecoration: 'none' }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, background: '#1a1d24', border: '1px solid ' + color + '30', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <img src={portrait} alt={article.editor} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
                        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: color, textTransform: 'uppercase' }}>{symbol} {article.editor}</span>
                        {article.ce_score && (
                          <span style={{ marginLeft: 'auto', padding: '2px 6px', background: color + '18', color: color, fontSize: 10, fontWeight: 800, borderRadius: 2, flexShrink: 0 }}>{article.ce_score}</span>
                        )}
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.72)', lineHeight: 1.45, marginBottom: 5 }}>
                        {article.headline}
                      </div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.18)' }}>{timeAgo(article.created_at)}</div>
                    </div>
                  </div>
                </Link>
              );
            }) : (
              <div style={{ padding: '20px 18px', fontSize: 10, color: 'rgba(255,255,255,0.1)', letterSpacing: 1 }}>INTEL LOADING...</div>
            )}
          </div>

          <div style={{ padding: '12px 18px', borderTop: '1px solid #1e2028', borderBottom: '1px solid #1e2028' }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: 'rgba(255,255,255,0.15)', textTransform: 'uppercase', marginBottom: 10 }}>Editors</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {['CIPHER','NEXUS','DEXTER','GHOST','MIRANDA'].map(function(ed) {
                var c = EDITOR_COLORS[ed];
                var s = EDITOR_SYMBOLS[ed];
                return (
                  <Link key={ed} href={'/intel/' + ed.toLowerCase()} title={ed}
                    style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, textDecoration: 'none' }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#1a1d24', border: '1px solid ' + c + '30', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <img src={'/images/editors/' + ed.toLowerCase() + '.jpg'} alt={ed} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <span style={{ fontSize: 7, fontWeight: 700, letterSpacing: 1, color: c, textTransform: 'uppercase' }}>{s}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          <div style={{ padding: '14px 18px' }}>
            <Link href="https://discord.gg/PnhbdRYh3w" target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: '#1a1d24', border: '1px solid #22252e', borderTop: '2px solid rgba(88,101,242,0.35)', borderRadius: '0 0 3px 3px', textDecoration: 'none' }}>
              <span style={{ fontSize: 18 }}>💬</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginBottom: 2 }}>Join Discord</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>Live meta updates and build discussions</div>
              </div>
            </Link>
          </div>

        </div>
      </div>

      {/* ── BOTTOM BAR ──────────────────────────────────────── */}
      <div style={{ background: '#0e1014', borderTop: '1px solid #1e2028', padding: '10px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {['#ff2222','#00d4ff','#ff8800','#00ff88','#9b5de5'].map(function(c) {
              return <div key={c} style={{ width: 6, height: 6, borderRadius: 1, background: c }} />;
            })}
          </div>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.12)', letterSpacing: 2, textTransform: 'uppercase' }}>
            5 AI Editors — Publishing Every 6 Hours
          </span>
        </div>
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.1)', letterSpacing: 1, textTransform: 'uppercase' }}>
          CyberneticPunks.com — Marathon Intelligence
        </span>
      </div>

      <Footer />
    </div>
  );
}