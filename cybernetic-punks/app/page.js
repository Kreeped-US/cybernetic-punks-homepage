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

var EDITOR_SYMBOLS = {
  CIPHER:  '◈',
  NEXUS:   '⬡',
  DEXTER:  '⬢',
  GHOST:   '◇',
  MIRANDA: '◎',
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

// ── DATA FETCH ─────────────────────────────────────────────────
async function getHomepageData() {
  try {
    var [tiersRes, articlesRes, weaponRes, shellRes] = await Promise.all([
      supabase
        .from('meta_tiers')
        .select('name, type, tier, trend, ranked_tier_solo')
        .in('tier', ['S', 'A'])
        .order('tier', { ascending: true })
        .order('name', { ascending: true })
        .limit(12),

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
    ]);

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
      tiers:        tiersRes.data   || [],
      feed,
      weaponCount:  weaponRes.count  || 0,
      shellCount:   shellRes.count   || 0,
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

        @media (min-width: 1024px) {
          .hp-grid {
            display: grid;
            grid-template-columns: 280px 1fr 300px;
            gap: 1px;
            background: #1e2028;
          }
          .hp-panel-left  { display: block; }
          .hp-panel-right { display: block; }
        }

        .tool-cell { transition: border-color 0.12s; }
        .tool-cell:hover { border-color: rgba(0,255,65,0.25) !important; }
        .intel-row { transition: background 0.1s; }
        .intel-row:hover { background: rgba(255,255,255,0.02) !important; }
        .tier-row  { transition: background 0.1s; }
        .tier-row:hover  { background: rgba(255,255,255,0.02) !important; }
      `}</style>

      {/* ── THREE-PANEL LAYOUT ──────────────────────────────── */}
      <div className="hp-grid" style={{ flex: 1, marginTop: 48 }}>

        {/* ── LEFT: Live Meta Sidebar ──────────────────────── */}
        <div className="hp-panel-left" style={{ background: '#121418', padding: 20, overflowY: 'auto' }}>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 3, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase' }}>Live Meta</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#00ff41', boxShadow: '0 0 6px rgba(0,255,65,0.4)' }} />
              <span style={{ fontSize: 9, fontWeight: 700, color: '#00ff41', letterSpacing: 1 }}>LIVE</span>
            </div>
          </div>

          {sTiers.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', paddingBottom: 6, borderBottom: '1px solid #1e2028', marginBottom: 8 }}>S TIER</div>
              {sTiers.map(function(item) {
                return (
                  <div key={item.name} className="tier-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.75)' }}>{item.name}</div>
                      <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: 1, marginTop: 1 }}>{(item.type || '').toUpperCase()}</div>
                    </div>
                    <div style={{ ...tierBg('S'), padding: '3px 10px', fontSize: 11, fontWeight: 800, letterSpacing: 1, borderRadius: 2 }}>S</div>
                  </div>
                );
              })}
            </div>
          )}

          {aTiers.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', paddingBottom: 6, borderBottom: '1px solid #1e2028', marginBottom: 8 }}>A TIER</div>
              {aTiers.map(function(item) {
                return (
                  <div key={item.name} className="tier-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.75)' }}>{item.name}</div>
                      <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: 1, marginTop: 1 }}>{(item.type || '').toUpperCase()}</div>
                    </div>
                    <div style={{ ...tierBg('A'), padding: '3px 10px', fontSize: 11, fontWeight: 800, letterSpacing: 1, borderRadius: 2 }}>A</div>
                  </div>
                );
              })}
            </div>
          )}

          {sTiers.length === 0 && aTiers.length === 0 && (
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.12)', letterSpacing: 1, paddingTop: 8 }}>TIER DATA LOADING...</div>
          )}

          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', paddingBottom: 6, borderBottom: '1px solid #1e2028', marginBottom: 8 }}>QUICK STATS</div>
            {[
              { label: 'Weapons tracked', value: String(weaponCount || 0),    color: '#00ff41' },
              { label: 'Shells analyzed', value: String(shellCount  || 0),    color: '#00d4ff' },
              { label: 'Update cycle',    value: '6H',                         color: 'rgba(255,255,255,0.7)' },
              { label: 'Last updated',    value: timeAgo(lastUpdated) || '—',  color: 'rgba(255,255,255,0.5)' },
            ].map(function(stat) {
              return (
                <div key={stat.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>{stat.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: stat.color }}>{stat.value}</span>
                </div>
              );
            })}
          </div>

          <Link href="/meta" style={{ display: 'block', marginTop: 16, padding: '9px 14px', background: '#1a1d24', border: '1px solid #22252e', borderRadius: 3, fontSize: 10, fontWeight: 700, letterSpacing: 2, color: '#00ff41', textDecoration: 'none', textAlign: 'center', textTransform: 'uppercase' }}>
            Full Tier List →
          </Link>
        </div>

        {/* ── CENTER: Hero + Tools ─────────────────────────── */}
        <div style={{ background: '#121418', padding: '28px 32px', display: 'flex', flexDirection: 'column' }}>

          <div style={{ marginBottom: 32 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', background: 'rgba(0,255,65,0.08)', border: '1px solid rgba(0,255,65,0.2)', borderRadius: 2, fontSize: 10, fontWeight: 700, letterSpacing: 2, color: '#00ff41', marginBottom: 16 }}>
              <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#00ff41' }} />
              MARATHON — BUNGIE
            </div>

            <h1 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.5px', margin: '0 0 10px', color: '#fff' }}>
              Know the meta.<br />
              <span style={{ color: '#00ff41' }}>Own the extraction.</span>
            </h1>

            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)', lineHeight: 1.6, maxWidth: 480, margin: '0 0 22px' }}>
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

          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 3, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', marginBottom: 12 }}>TOOLS</div>
            <div className="hp-tool-grid">

              <Link href="/meta" className="tool-cell" style={{ background: '#1a1d24', border: '1px solid #22252e', borderRadius: 3, padding: '18px 16px', textDecoration: 'none', display: 'block' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 3, background: 'rgba(0,255,65,0.08)', border: '1px solid rgba(0,255,65,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, color: '#00ff41' }}>⬡</div>
                  <span style={{ padding: '2px 8px', background: 'rgba(0,255,65,0.1)', color: '#00ff41', fontSize: 8, fontWeight: 700, letterSpacing: 1, borderRadius: 2 }}>FREE</span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.85)', marginBottom: 4 }}>Live Meta Tier List</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', lineHeight: 1.5 }}>Every weapon and shell ranked. Updated every 6 hours with real data.</div>
                <div style={{ marginTop: 10, fontSize: 10, fontWeight: 700, letterSpacing: 1, color: '#00ff41' }}>View rankings →</div>
              </Link>

              <Link href="/advisor" className="tool-cell" style={{ background: '#1a1d24', border: '1px solid #22252e', borderRadius: 3, padding: '18px 16px', textDecoration: 'none', display: 'block' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 3, background: 'rgba(255,136,0,0.07)', border: '1px solid rgba(255,136,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, color: '#ff8800' }}>⬢</div>
                  <span style={{ padding: '2px 8px', background: 'rgba(0,255,65,0.1)', color: '#00ff41', fontSize: 8, fontWeight: 700, letterSpacing: 1, borderRadius: 2 }}>FREE</span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.85)', marginBottom: 4 }}>Build Advisor</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', lineHeight: 1.5 }}>Pick your shell. DEXTER engineers weapons, mods, cores, and implants.</div>
                <div style={{ marginTop: 10, fontSize: 10, fontWeight: 700, letterSpacing: 1, color: '#ff8800' }}>Build a loadout →</div>
              </Link>

              <Link href="/meta" className="tool-cell" style={{ background: '#1a1d24', border: '1px solid #22252e', borderRadius: 3, padding: '18px 16px', textDecoration: 'none', display: 'block' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 3, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, color: 'rgba(255,255,255,0.4)' }}>✎</div>
                  <span style={{ padding: '2px 8px', background: 'rgba(255,136,0,0.1)', color: '#ff8800', fontSize: 8, fontWeight: 700, letterSpacing: 1, borderRadius: 2 }}>SHARE</span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.85)', marginBottom: 4 }}>Tier List Maker</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', lineHeight: 1.5 }}>Build your own tier list. Generate a branded image for X and Reddit.</div>
                <div style={{ marginTop: 10, fontSize: 10, fontWeight: 700, letterSpacing: 1, color: 'rgba(255,255,255,0.4)' }}>Create yours →</div>
              </Link>

              <Link href="/join" className="tool-cell" style={{ background: '#1a1d24', border: '1px solid #22252e', borderRadius: 3, padding: '18px 16px', textDecoration: 'none', display: 'block' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 3, background: 'rgba(155,93,229,0.07)', border: '1px solid rgba(155,93,229,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, color: '#9b5de5' }}>◎</div>
                  <span style={{ padding: '2px 8px', background: 'rgba(155,93,229,0.1)', color: '#9b5de5', fontSize: 8, fontWeight: 700, letterSpacing: 1, borderRadius: 2 }}>BETA</span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.85)', marginBottom: 4 }}>Personal Coach</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', lineHeight: 1.5 }}>3 AI editors audit your build. Scores, recommendations, and progress.</div>
                <div style={{ marginTop: 10, fontSize: 10, fontWeight: 700, letterSpacing: 1, color: '#9b5de5' }}>Try free →</div>
              </Link>

            </div>
          </div>

          {/* Mobile: compact meta strip (shown only on small screens) */}
          <div style={{ marginTop: 28, display: 'block' }} className="lg:hidden">
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 3, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', marginBottom: 12 }}>LIVE META</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {tiers.slice(0, 6).map(function(item) {
                var badge = tierBg(item.tier);
                return (
                  <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: '#1a1d24', border: '1px solid #22252e', borderRadius: 3 }}>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>{item.name}</span>
                    <span style={{ ...badge, padding: '2px 7px', fontSize: 10, fontWeight: 800, borderRadius: 2 }}>{item.tier}</span>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* ── RIGHT: Intel Feed ────────────────────────────── */}
        <div className="hp-panel-right" style={{ background: '#121418', padding: 20, display: 'flex', flexDirection: 'column' }}>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 3, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase' }}>Latest Intel</span>
            <Link href="/intel" style={{ fontSize: 9, color: 'rgba(255,255,255,0.15)', textDecoration: 'none', letterSpacing: 1, fontWeight: 700, textTransform: 'uppercase' }}>VIEW ALL →</Link>
          </div>

          <div style={{ flex: 1 }}>
            {feed.length > 0 ? feed.map(function(article) {
              var color = EDITOR_COLORS[article.editor] || '#888';
              return (
                <Link key={article.id} href={'/intel/' + article.slug} className="intel-row" style={{ display: 'block', padding: '12px 0', borderBottom: '1px solid #1e2028', textDecoration: 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
                    <span style={{ width: 6, height: 6, borderRadius: 1, background: color, flexShrink: 0 }} />
                    <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: color, textTransform: 'uppercase' }}>{article.editor}</span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.7)', lineHeight: 1.4, marginBottom: 4 }}>
                    {article.headline}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.15)' }}>{timeAgo(article.created_at)}</span>
                    {article.ce_score && (
                      <span style={{ padding: '2px 6px', background: color + '18', color: color, fontSize: 10, fontWeight: 800, borderRadius: 2 }}>{article.ce_score}</span>
                    )}
                  </div>
                </Link>
              );
            }) : (
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.12)', letterSpacing: 1, paddingTop: 8 }}>INTEL LOADING...</div>
            )}
          </div>

          <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid #1e2028' }}>
            <Link href="https://discord.gg/PnhbdRYh3w" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, background: '#1a1d24', border: '1px solid #22252e', borderRadius: 3, textDecoration: 'none' }}>
              <span style={{ fontSize: 18 }}>💬</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginBottom: 2 }}>Join Discord</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>Live meta updates and build discussions</div>
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
