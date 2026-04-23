import Link from 'next/link';
import Footer from '@/components/Footer';
import { supabase } from '@/lib/supabase';

// ── EDITOR CONFIG ──────────────────────────────────────────────
var EDITOR_COLORS = {
  CIPHER:  '#ff2222',
  NEXUS:   '#00d4ff',
  DEXTER:  '#ff8800',
  GHOST:   '#00ff88',
  MIRANDA: '#9b5de5',
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
  if (!trend) return null;
  var t = (trend || '').toLowerCase();
  if (t === 'up')   return { symbol: '↑', color: '#00ff41' };
  if (t === 'down') return { symbol: '↓', color: '#ff2222' };
  return { symbol: '→', color: 'rgba(255,255,255,0.2)' };
}

function imagePath(type, filename) {
  if (!filename) return null;
  var folder = (type || '').toLowerCase() === 'shell' ? 'shells' : 'weapons';
  return '/images/' + folder + '/' + filename;
}

// ── DATA FETCH ─────────────────────────────────────────────────
async function getHomepageData() {
  try {
    var [tiersRes, articlesRes, weaponRes, shellRes, weaponImgRes, shellImgRes] = await Promise.all([
      supabase
        .from('meta_tiers')
        .select('name, type, tier, trend, ranked_tier_solo')
        .in('tier', ['S', 'A'])
        .order('tier', { ascending: true })
        .order('name',  { ascending: true })
        .limit(14),

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
        .select('name, image_filename, damage, fire_rate, weapon_type, rarity'),

      supabase
        .from('shell_stats')
        .select('name, image_filename, ranked_tier_solo, role'),
    ]);

    // Build name → image/stats lookup maps
    var weaponMap = {};
    (weaponImgRes.data || []).forEach(function(w) { weaponMap[w.name] = w; });
    var shellMap = {};
    (shellImgRes.data  || []).forEach(function(s) { shellMap[s.name]  = s; });

    // Enrich tier items with image + extra stats
    var enrichedTiers = (tiersRes.data || []).map(function(t) {
      var extra = (t.type || '').toLowerCase() === 'shell'
        ? shellMap[t.name]  || {}
        : weaponMap[t.name] || {};
      return Object.assign({}, t, {
        image_filename: extra.image_filename || null,
        damage:         extra.damage         || null,
        fire_rate:      extra.fire_rate       || null,
        weapon_type:    extra.weapon_type     || null,
        role:           extra.role            || null,
        rarity:         extra.rarity          || null,
      });
    });

    // One article per editor, most recent
    var EDITORS = ['CIPHER', 'NEXUS', 'DEXTER', 'GHOST', 'MIRANDA'];
    var seen = {};
    var feed = [];
    for (var a of (articlesRes.data || [])) {
      if (!seen[a.editor] && EDITORS.includes(a.editor)) {
        seen[a.editor] = true;
        feed.push(a);
      }
      if (feed.length === 5) break;
    }

    var lastUpdated = (articlesRes.data || [])[0]?.created_at || null;

    return {
      tiers:        enrichedTiers,
      feed,
      weaponCount:  weaponRes.count || 0,
      shellCount:   shellRes.count  || 0,
      lastUpdated,
    };
  } catch (e) {
    return { tiers: [], feed: [], weaponCount: 0, shellCount: 0, lastUpdated: null };
  }
}

// ── PAGE ───────────────────────────────────────────────────────
export const revalidate = 300;

export default async function Home() {
  var { tiers, feed, weaponCount, shellCount, lastUpdated } = await getHomepageData();

  var sTiers = tiers.filter(function(t) { return t.tier === 'S'; }).slice(0, 4);
  var aTiers = tiers.filter(function(t) { return t.tier === 'A'; }).slice(0, 4);

  return (
    <div style={{ background: '#121418', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      <style>{`
        .hp-panel-left  { display: none; }
        .hp-panel-right { display: none; }
        .hp-grid        { display: block; }
        .hp-tool-grid   { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
        .hp-meta-strip  { display: block; }

        @media (min-width: 1024px) {
          .hp-grid {
            display: grid;
            grid-template-columns: 280px 1fr 300px;
            gap: 1px;
            background: #1e2028;
          }
          .hp-panel-left  { display: flex; flex-direction: column; }
          .hp-panel-right { display: flex; flex-direction: column; }
          .hp-meta-strip  { display: none; }
        }

        .tool-cell          { transition: border-color 0.12s, background 0.12s; }
        .tool-cell:hover    { background: #1e2228 !important; }
        .intel-row          { transition: background 0.1s; }
        .intel-row:hover    { background: rgba(255,255,255,0.025) !important; }
        .tier-row           { transition: background 0.1s; }
        .tier-row:hover     { background: rgba(255,255,255,0.025) !important; }
        .stat-row           { transition: background 0.1s; }
        .stat-row:hover     { background: rgba(255,255,255,0.02) !important; }
        .tier-img           { object-fit: contain; background: rgba(255,255,255,0.03); }
      `}</style>

      {/* ── THREE-PANEL LAYOUT ──────────────────────────────── */}
      <div className="hp-grid" style={{ flex: 1, marginTop: 48 }}>

        {/* ══ LEFT PANEL ════════════════════════════════════════ */}
        <div className="hp-panel-left" style={{ background: '#121418', overflowY: 'auto' }}>

          {/* Panel header */}
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #1e2028', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 3, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' }}>Live Meta</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#00ff41', boxShadow: '0 0 6px rgba(0,255,65,0.45)' }} />
              <span style={{ fontSize: 9, fontWeight: 700, color: '#00ff41', letterSpacing: 1 }}>LIVE</span>
            </div>
          </div>

          <div style={{ flex: 1, padding: '0 0 12px' }}>

            {/* S Tier */}
            {sTiers.length > 0 && (
              <div>
                <div style={{ padding: '10px 18px 6px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 3, height: 14, background: '#ff2222', borderRadius: 1, flexShrink: 0 }} />
                  <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 3, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase' }}>S Tier</span>
                </div>
                {sTiers.map(function(item) {
                  var arrow  = trendArrow(item.trend);
                  var imgSrc = imagePath(item.type, item.image_filename);
                  var isShell = (item.type || '').toLowerCase() === 'shell';
                  return (
                    <div key={item.name} className="tier-row" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 18px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      {/* Image */}
                      <div style={{ width: 36, height: 36, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a1d24', borderRadius: 3, overflow: 'hidden', border: '1px solid #22252e' }}>
                        {imgSrc
                          ? <img src={imgSrc} alt={item.name} className="tier-img" style={{ width: 32, height: 32 }} />
                          : <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.1)' }}>{isShell ? '◎' : '⬢'}</span>
                        }
                      </div>
                      {/* Name + sub-stats */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.8)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                        <div style={{ display: 'flex', gap: 6, marginTop: 3, alignItems: 'center' }}>
                          {!isShell && item.damage && (
                            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: 1 }}>DMG <span style={{ color: '#ff8800', fontWeight: 700 }}>{item.damage}</span></span>
                          )}
                          {!isShell && item.fire_rate && (
                            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: 1 }}>{item.fire_rate}<span style={{ color: 'rgba(255,255,255,0.2)' }}>rpm</span></span>
                          )}
                          {isShell && item.role && (
                            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: 1 }}>{item.role}</span>
                          )}
                          {!isShell && item.weapon_type && (
                            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.18)', letterSpacing: 1 }}>{item.weapon_type}</span>
                          )}
                        </div>
                      </div>
                      {/* Right side: trend + badge */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                        <div style={{ ...tierBg('S'), padding: '3px 9px', fontSize: 11, fontWeight: 800, letterSpacing: 1, borderRadius: 2 }}>S</div>
                        {arrow && <span style={{ fontSize: 10, color: arrow.color, fontWeight: 700 }}>{arrow.symbol}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* A Tier */}
            {aTiers.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <div style={{ padding: '10px 18px 6px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 3, height: 14, background: '#ff8800', borderRadius: 1, flexShrink: 0 }} />
                  <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 3, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase' }}>A Tier</span>
                </div>
                {aTiers.map(function(item) {
                  var arrow  = trendArrow(item.trend);
                  var imgSrc = imagePath(item.type, item.image_filename);
                  var isShell = (item.type || '').toLowerCase() === 'shell';
                  return (
                    <div key={item.name} className="tier-row" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 18px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <div style={{ width: 36, height: 36, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a1d24', borderRadius: 3, overflow: 'hidden', border: '1px solid #22252e' }}>
                        {imgSrc
                          ? <img src={imgSrc} alt={item.name} className="tier-img" style={{ width: 32, height: 32 }} />
                          : <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.1)' }}>{isShell ? '◎' : '⬢'}</span>
                        }
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.8)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                        <div style={{ display: 'flex', gap: 6, marginTop: 3, alignItems: 'center' }}>
                          {!isShell && item.damage && (
                            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: 1 }}>DMG <span style={{ color: '#ff8800', fontWeight: 700 }}>{item.damage}</span></span>
                          )}
                          {!isShell && item.fire_rate && (
                            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: 1 }}>{item.fire_rate}<span style={{ color: 'rgba(255,255,255,0.2)' }}>rpm</span></span>
                          )}
                          {isShell && item.role && (
                            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: 1 }}>{item.role}</span>
                          )}
                          {!isShell && item.weapon_type && (
                            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.18)', letterSpacing: 1 }}>{item.weapon_type}</span>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                        <div style={{ ...tierBg('A'), padding: '3px 9px', fontSize: 11, fontWeight: 800, letterSpacing: 1, borderRadius: 2 }}>A</div>
                        {arrow && <span style={{ fontSize: 10, color: arrow.color, fontWeight: 700 }}>{arrow.symbol}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {sTiers.length === 0 && aTiers.length === 0 && (
              <div style={{ padding: '20px 18px', fontSize: 10, color: 'rgba(255,255,255,0.12)', letterSpacing: 1 }}>TIER DATA LOADING...</div>
            )}

            {/* Quick Stats */}
            <div style={{ margin: '12px 18px 0', padding: '12px 0', borderTop: '1px solid #1e2028' }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 3, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', marginBottom: 10 }}>Quick Stats</div>
              {[
                { label: 'Weapons tracked', value: String(weaponCount || 0),   color: '#00ff41' },
                { label: 'Shells analyzed', value: String(shellCount  || 0),   color: '#00d4ff' },
                { label: 'Update cycle',    value: '6H',                        color: 'rgba(255,255,255,0.6)' },
                { label: 'Last updated',    value: timeAgo(lastUpdated) || '—', color: 'rgba(255,255,255,0.4)' },
              ].map(function(stat) {
                return (
                  <div key={stat.label} className="stat-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{stat.label}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: stat.color, background: 'rgba(255,255,255,0.04)', padding: '2px 8px', borderRadius: 2 }}>{stat.value}</span>
                  </div>
                );
              })}
            </div>

            <div style={{ padding: '12px 18px 0' }}>
              <Link href="/meta" style={{ display: 'block', padding: '9px 14px', background: '#1a1d24', border: '1px solid #22252e', borderTop: '2px solid #00ff41', borderRadius: '0 0 3px 3px', fontSize: 10, fontWeight: 700, letterSpacing: 2, color: '#00ff41', textDecoration: 'none', textAlign: 'center', textTransform: 'uppercase' }}>
                Full Tier List →
              </Link>
            </div>
          </div>
        </div>

        {/* ══ CENTER PANEL ══════════════════════════════════════ */}
        <div style={{ background: '#121418', display: 'flex', flexDirection: 'column' }}>

          {/* Hero — subtle green-tinted top strip */}
          <div style={{ padding: '32px 32px 28px', borderBottom: '1px solid #1e2028', background: 'linear-gradient(180deg, rgba(0,255,65,0.03) 0%, transparent 100%)' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', background: 'rgba(0,255,65,0.08)', border: '1px solid rgba(0,255,65,0.2)', borderRadius: 2, fontSize: 10, fontWeight: 700, letterSpacing: 2, color: '#00ff41', marginBottom: 18 }}>
              <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#00ff41' }} />
              MARATHON — BUNGIE
            </div>

            <h1 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 900, lineHeight: 1.05, letterSpacing: '-0.5px', margin: '0 0 12px', color: '#fff' }}>
              Know the meta.<br />
              <span style={{ color: '#00ff41' }}>Own the extraction.</span>
            </h1>

            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)', lineHeight: 1.65, maxWidth: 500, margin: '0 0 22px' }}>
              Live tier lists, AI-powered loadouts, and personalized coaching for Marathon Runners. Always updated. Always free.
            </p>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Link href="/meta" style={{ padding: '11px 22px', background: '#00ff41', color: '#000', fontSize: 12, fontWeight: 800, letterSpacing: '1px', borderRadius: 2, textDecoration: 'none' }}>
                CHECK THE META
              </Link>
              <Link href="/advisor" style={{ padding: '11px 22px', background: '#1e2028', border: '1px solid #2a2d36', color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 700, letterSpacing: '1px', borderRadius: 2, textDecoration: 'none' }}>
                GET A BUILD
              </Link>
            </div>
          </div>

          {/* Tools grid */}
          <div style={{ padding: '24px 32px', flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 3, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase' }}>Tools</span>
              <div style={{ flex: 1, height: 1, background: '#1e2028' }} />
            </div>

            <div className="hp-tool-grid">

              {/* Meta Tier List */}
              <Link href="/meta" className="tool-cell" style={{ background: '#1a1d24', border: '1px solid #22252e', borderTop: '2px solid #00ff41', borderRadius: '0 0 3px 3px', padding: '16px', textDecoration: 'none', display: 'block' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 3, background: 'rgba(0,255,65,0.08)', border: '1px solid rgba(0,255,65,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#00ff41' }}>⬡</div>
                  <span style={{ padding: '2px 7px', background: 'rgba(0,255,65,0.12)', color: '#00ff41', fontSize: 8, fontWeight: 700, letterSpacing: 1, borderRadius: 2 }}>FREE</span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.85)', marginBottom: 4 }}>Live Meta Tier List</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', lineHeight: 1.5 }}>Every weapon and shell ranked. Updated every 6 hours with real data.</div>
                <div style={{ marginTop: 10, fontSize: 10, fontWeight: 700, letterSpacing: 1, color: '#00ff41' }}>View rankings →</div>
              </Link>

              {/* Build Advisor */}
              <Link href="/advisor" className="tool-cell" style={{ background: '#1a1d24', border: '1px solid #22252e', borderTop: '2px solid #ff8800', borderRadius: '0 0 3px 3px', padding: '16px', textDecoration: 'none', display: 'block' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 3, background: 'rgba(255,136,0,0.07)', border: '1px solid rgba(255,136,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#ff8800' }}>⬢</div>
                  <span style={{ padding: '2px 7px', background: 'rgba(0,255,65,0.12)', color: '#00ff41', fontSize: 8, fontWeight: 700, letterSpacing: 1, borderRadius: 2 }}>FREE</span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.85)', marginBottom: 4 }}>Build Advisor</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', lineHeight: 1.5 }}>Pick your shell. DEXTER engineers weapons, mods, cores, and implants.</div>
                <div style={{ marginTop: 10, fontSize: 10, fontWeight: 700, letterSpacing: 1, color: '#ff8800' }}>Build a loadout →</div>
              </Link>

              {/* Tier List Maker */}
              <Link href="/meta" className="tool-cell" style={{ background: '#1a1d24', border: '1px solid #22252e', borderTop: '2px solid rgba(255,255,255,0.15)', borderRadius: '0 0 3px 3px', padding: '16px', textDecoration: 'none', display: 'block' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 3, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: 'rgba(255,255,255,0.35)' }}>✎</div>
                  <span style={{ padding: '2px 7px', background: 'rgba(255,136,0,0.1)', color: '#ff8800', fontSize: 8, fontWeight: 700, letterSpacing: 1, borderRadius: 2 }}>SHARE</span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.85)', marginBottom: 4 }}>Tier List Maker</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', lineHeight: 1.5 }}>Build your own tier list. Generate a branded image for X and Reddit.</div>
                <div style={{ marginTop: 10, fontSize: 10, fontWeight: 700, letterSpacing: 1, color: 'rgba(255,255,255,0.35)' }}>Create yours →</div>
              </Link>

              {/* Personal Coach */}
              <Link href="/join" className="tool-cell" style={{ background: '#1a1d24', border: '1px solid #22252e', borderTop: '2px solid #9b5de5', borderRadius: '0 0 3px 3px', padding: '16px', textDecoration: 'none', display: 'block' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 3, background: 'rgba(155,93,229,0.07)', border: '1px solid rgba(155,93,229,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#9b5de5' }}>◎</div>
                  <span style={{ padding: '2px 7px', background: 'rgba(155,93,229,0.12)', color: '#9b5de5', fontSize: 8, fontWeight: 700, letterSpacing: 1, borderRadius: 2 }}>BETA</span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.85)', marginBottom: 4 }}>Personal Coach</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', lineHeight: 1.5 }}>3 AI editors audit your build. Scores, recommendations, and progress.</div>
                <div style={{ marginTop: 10, fontSize: 10, fontWeight: 700, letterSpacing: 1, color: '#9b5de5' }}>Try free →</div>
              </Link>

            </div>

            {/* Mobile meta strip */}
            <div className="hp-meta-strip" style={{ marginTop: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 3, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase' }}>Live Meta</span>
                <div style={{ flex: 1, height: 1, background: '#1e2028' }} />
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#00ff41', boxShadow: '0 0 6px rgba(0,255,65,0.4)' }} />
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {tiers.slice(0, 6).map(function(item) {
                  var badge  = tierBg(item.tier);
                  var imgSrc = imagePath(item.type, item.image_filename);
                  return (
                    <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: '#1a1d24', border: '1px solid #22252e', borderRadius: 3 }}>
                      {imgSrc && <img src={imgSrc} alt={item.name} style={{ width: 20, height: 20, objectFit: 'contain' }} />}
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>{item.name}</span>
                      <span style={{ ...badge, padding: '2px 7px', fontSize: 10, fontWeight: 800, borderRadius: 2 }}>{item.tier}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ══ RIGHT PANEL ══════════════════════════════════════ */}
        <div className="hp-panel-right" style={{ background: '#121418', overflowY: 'auto' }}>

          {/* Panel header */}
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #1e2028', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 3, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' }}>Latest Intel</span>
            <Link href="/intel" style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', textDecoration: 'none', letterSpacing: 1, fontWeight: 700, textTransform: 'uppercase' }}>VIEW ALL →</Link>
          </div>

          <div style={{ flex: 1 }}>
            {feed.length > 0 ? feed.map(function(article) {
              var color = EDITOR_COLORS[article.editor] || '#888';
              return (
                <Link key={article.id} href={'/intel/' + article.slug} className="intel-row" style={{ display: 'block', padding: '13px 18px', borderBottom: '1px solid #1e2028', borderLeft: '2px solid ' + color + '55', textDecoration: 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                    <span style={{ width: 6, height: 6, borderRadius: 1, background: color, flexShrink: 0 }} />
                    <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: color, textTransform: 'uppercase' }}>{article.editor}</span>
                    {article.ce_score && (
                      <span style={{ marginLeft: 'auto', padding: '2px 7px', background: color + '18', color: color, fontSize: 10, fontWeight: 800, borderRadius: 2, flexShrink: 0 }}>{article.ce_score}</span>
                    )}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.72)', lineHeight: 1.45, marginBottom: 5 }}>
                    {article.headline}
                  </div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.18)' }}>{timeAgo(article.created_at)}</div>
                </Link>
              );
            }) : (
              <div style={{ padding: '20px 18px', fontSize: 10, color: 'rgba(255,255,255,0.12)', letterSpacing: 1 }}>INTEL LOADING...</div>
            )}
          </div>

          {/* Discord CTA */}
          <div style={{ padding: '14px 18px', borderTop: '1px solid #1e2028', marginTop: 'auto' }}>
            <Link href="https://discord.gg/PnhbdRYh3w" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: '#1a1d24', border: '1px solid #22252e', borderTop: '2px solid rgba(88,101,242,0.4)', borderRadius: '0 0 3px 3px', textDecoration: 'none' }}>
              <span style={{ fontSize: 18 }}>💬</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginBottom: 2 }}>Join Discord</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.22)' }}>Live meta updates and build discussions</div>
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
