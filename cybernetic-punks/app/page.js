import Link from 'next/link';
import Footer from '@/components/Footer';
import HomeEditorReactions from './HomeEditorReactions';
import { supabase } from '@/lib/supabase';
import { getLiveStats } from '@/lib/liveStats';
import { getUserAvatars } from '@/lib/gather/twitch';

// ── METADATA ────────────────────────────────────────────────
export const metadata = {
  title: 'Marathon Meta, Builds & Tier List - Updated Daily',
  description: 'Live Marathon tier list, build advisor, and Cradle build planner. Tier rankings, weapon and shell guides, and Season 2 progression tools - refreshed throughout the day.',
  keywords: 'Marathon, Marathon meta, Marathon tier list, Marathon builds, Marathon loadouts, Marathon ranked, Marathon weapons, Marathon shells, Marathon guides, Marathon build advisor, Marathon cradle, Marathon cradle planner, best Marathon builds, what to run in Marathon, Bungie Marathon, Marathon intelligence',
  openGraph: {
    title: 'Marathon Meta, Builds & Tier List - Updated Daily',
    description: 'Live Marathon tier list, build advisor, and Cradle build planner. Refreshed throughout the day.',
    url: 'https://cyberneticpunks.com',
    siteName: 'CyberneticPunks',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Marathon Meta, Builds & Tier List - CyberneticPunks' }],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@Cybernetic87250',
    title: 'Marathon Meta, Builds & Tier List - Updated Daily',
    description: 'Live Marathon tier list, build advisor, and Cradle build planner. Refreshed throughout the day.',
    images: ['/og-image.png'],
  },
  alternates: { canonical: 'https://cyberneticpunks.com' },
};

// ── HELPERS ────────────────────────────────────────────────────
function timeAgo(dateStr) {
  if (!dateStr) return '';
  var diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 3600)  return Math.floor(diff / 60)   + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600)  + 'h ago';
  return Math.floor(diff / 86400) + 'd ago';
}

// Extract a lowercased twitch login from a creator_info.twitch URL (mirrors /rising).
function twitchLoginFromUrl(url) {
  if (!url || typeof url !== 'string') return null;
  try {
    var clean = url.split('?')[0].replace(/\/+$/, '');
    var parts = clean.split('/');
    var last = parts[parts.length - 1];
    return last ? last.toLowerCase() : null;
  } catch (e) {
    return null;
  }
}

function formatNum(n) {
  if (!n || n < 1000) return n ? n.toString() : '0';
  if (n < 1000000) return (n / 1000).toFixed(n < 10000 ? 1 : 0) + 'K';
  return (n / 1000000).toFixed(1) + 'M';
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

// Cron cadence: 12h cycles at 00:00 + 12:00 UTC (`0 0,12 * * *`).
function cronCycleInfo() {
  var now        = new Date();
  var totalMins  = now.getUTCHours() * 60 + now.getUTCMinutes();
  var cycleMins  = 720;
  var minsIn     = totalMins % cycleMins;
  var minsLeft   = cycleMins - minsIn;
  var progress   = Math.round((minsIn / cycleMins) * 100);
  var hLeft      = Math.floor(minsLeft / 60);
  var mLeft      = minsLeft % 60;
  var nextLabel  = hLeft > 0 ? hLeft + 'h ' + mLeft + 'm' : mLeft + 'm';
  return { progress, nextLabel };
}

var SHELL_COLORS = {
  Assassin: '#cc44ff', Destroyer: '#ff3333', Recon: '#00d4ff',
  Rook: '#888888', Thief: '#ffd700', Triage: '#00ff88', Vandal: '#ff8800',
};

// Editor accent colors + glyphs for creator-spotlight cards (mirrors /rising).
var EDITOR_ACCENT = {
  CIPHER: '#ff2222', NEXUS: '#00d4ff', DEXTER: '#ff8800', GHOST: '#00ff88', MIRANDA: '#9b5de5',
};
var EDITOR_GLYPH = {
  CIPHER: '◈', NEXUS: '⬡', DEXTER: '⬢', GHOST: '◇', MIRANDA: '◎',
};

// ── DATA FETCH ─────────────────────────────────────────────────
async function getHomepageData() {
  try {
    var [
      tiersRes, weaponRes, shellRes, weaponImgRes, shellImgRes,
      weeklyBuildsRes, shellListRes, lastUpdatedRes, spotlightRes,
    ] = await Promise.all([
      supabase
        .from('meta_tiers')
        .select('name, type, tier, trend')
        .in('tier', ['S', 'A', 'B'])
        .order('tier', { ascending: true })
        .order('name', { ascending: true })
        .limit(18),

      supabase.from('weapon_stats').select('id', { count: 'exact', head: true }),
      supabase.from('shell_stats').select('id', { count: 'exact', head: true }),
      supabase.from('weapon_stats').select('name, image_filename'),
      supabase.from('shell_stats').select('name, image_filename'),

      supabase
        .from('site_events')
        .select('id', { count: 'exact', head: true })
        .eq('event_name', 'advisor_generate')
        .gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()),

      supabase.from('shell_stats').select('name, image_filename').order('name'),

      supabase
        .from('feed_items')
        .select('created_at')
        .eq('is_published', true)
        .eq('game_slug', 'marathon')
        .order('created_at', { ascending: false })
        .limit(1),

      supabase
        .from('feed_items')
        .select('headline, slug, editor, creator_info, created_at')
        .eq('directive_type', 'creator_spotlight')
        .eq('is_published', true)
        .eq('game_slug', 'marathon')
        .order('created_at', { ascending: false })
        .limit(3),
    ]);

    var weaponMap = {};
    (weaponImgRes.data || []).forEach(function(w) { weaponMap[w.name] = w; });
    var shellMap = {};
    (shellImgRes.data || []).forEach(function(s) { shellMap[s.name] = s; });

    var enrichedTiers = (tiersRes.data || []).map(function(t) {
      var extra = (t.type || '').toLowerCase() === 'shell'
        ? (shellMap[t.name] || {})
        : (weaponMap[t.name] || {});
      return Object.assign({}, t, { image_filename: extra.image_filename || null });
    });

    return {
      tiers:        enrichedTiers,
      weaponCount:  weaponRes.count || 0,
      shellCount:   shellRes.count || 0,
      weeklyBuilds: weeklyBuildsRes.count || 0,
      shells:       shellListRes.data || [],
      lastUpdated:  (lastUpdatedRes.data || [])[0]?.created_at || null,
      spotlights:   spotlightRes.data || [],
    };
  } catch (e) {
    return { tiers: [], weaponCount: 0, shellCount: 0, weeklyBuilds: 0, shells: [], lastUpdated: null, spotlights: [] };
  }
}

export const dynamic = 'force-dynamic';

export default async function Home() {
  var data = await getHomepageData();
  var liveStats = await getLiveStats();
  var tiers        = data.tiers;
  var weaponCount  = data.weaponCount;
  var shellCount   = data.shellCount;
  var weeklyBuilds = data.weeklyBuilds;
  var shells       = data.shells;
  var lastUpdated  = data.lastUpdated;
  var spotlights   = data.spotlights;

  // Resolve creator Twitch avatars in one batched call (same as /rising).
  var spotlightAvatars = {};
  var spotlightLogins = [];
  spotlights.forEach(function(item) {
    var l = twitchLoginFromUrl(item.creator_info && item.creator_info.twitch);
    if (l) spotlightLogins.push(l);
  });
  if (spotlightLogins.length > 0) {
    try { spotlightAvatars = await getUserAvatars(spotlightLogins); } catch (e) { spotlightAvatars = {}; }
  }

  var cron = cronCycleInfo();

  var gridPreview = tiers.filter(function(t) { return t.tier === 'S'; }).slice(0, 3);
  if (gridPreview.length < 3) {
    var aFill = tiers.filter(function(t) { return t.tier === 'A'; }).slice(0, 3 - gridPreview.length);
    gridPreview = gridPreview.concat(aFill);
  }

  var boardS = tiers.filter(function(t) { return t.tier === 'S'; }).slice(0, 3);
  var boardA = tiers.filter(function(t) { return t.tier === 'A'; }).slice(0, 3);
  var boardB = tiers.filter(function(t) { return t.tier === 'B' || !t.tier; }).slice(0, 3);

  var sampleShells = ['Assassin', 'Destroyer', 'Recon', 'Rook', 'Thief', 'Triage', 'Vandal'];
  var forgeShells = sampleShells.map(function(name) {
    var found = shells.find(function(s) { return s.name === name; });
    return { name: name, color: SHELL_COLORS[name] || '#888', image_filename: found ? found.image_filename : null };
  });

  return (
    <div style={{ background: '#121418', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Site-entity structured data (Organization + WebSite). Apex canonical host,
          matching metadataBase/sitemap/canonicals (www 301s to apex). Name matches
          the existing Article-publisher entity ("CyberneticPunks") so Google sees
          one entity. No SearchAction: there is no site-search endpoint to point at. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'CyberneticPunks',
        url: 'https://cyberneticpunks.com',
        logo: 'https://cyberneticpunks.com/icon-512.png',
        sameAs: ['https://x.com/Cybernetic87250'],
      }) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'CyberneticPunks',
        url: 'https://cyberneticpunks.com',
      }) }} />
      <style>{`
        .hp-wrap { max-width: 1100px; margin: 0 auto; width: 100%; }
        .hp-product-grid { display: grid; grid-template-columns: 1fr; gap: 12px; }
        @media (min-width: 760px) { .hp-product-grid { grid-template-columns: repeat(2, 1fr); } }
        .product-panel { transition: background 0.12s, border-color 0.12s; }
        .product-panel:hover { background: #1e2228 !important; }
        .tier-chip { transition: background 0.1s; }
      `}</style>

      <div style={{ flex: 1, marginTop: 48, position: 'relative', overflow: 'hidden' }}>
        {/* Ambient background */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, rgba(0,255,65,0.05) 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
          <div style={{ position: 'absolute', top: -140, right: -100, width: 480, height: 480, border: '1px solid rgba(0,255,65,0.04)', transform: 'rotate(45deg)' }} />
          <div style={{ position: 'absolute', bottom: 40, left: -120, width: 320, height: 320, border: '1px solid rgba(0,212,255,0.03)', transform: 'rotate(45deg)' }} />
        </div>

        {/* ══ HERO ══ */}
        <section style={{ position: 'relative', zIndex: 1, borderBottom: '1px solid #1e2028', background: '#0e1014' }}>
          <div className="hp-wrap" style={{ padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00ff41', boxShadow: '0 0 6px rgba(0,255,65,0.6)' }} />
              <span style={{ fontSize: 9, color: '#00ff41', letterSpacing: 2, fontWeight: 800, fontFamily: 'monospace' }}>LIVE</span>
            </div>

            {liveStats.steam && (
              <>
                <div style={{ width: 1, height: 14, background: '#22252e' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: 1.5, fontFamily: 'monospace' }}>STEAM</span>
                  <span style={{ fontSize: 12, fontWeight: 900, color: '#fff', fontFamily: 'Orbitron, monospace', letterSpacing: 0.5 }}>{formatNum(liveStats.steam.value)}</span>
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, fontFamily: 'monospace', fontWeight: 700 }}>RUNNERS ONLINE</span>
                </div>
              </>
            )}

            {liveStats.twitch && (
              <>
                <div style={{ width: 1, height: 14, background: '#22252e' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(145,70,255,0.65)', letterSpacing: 1.5, fontFamily: 'monospace' }}>TWITCH</span>
                  <span style={{ fontSize: 12, fontWeight: 900, color: '#fff', fontFamily: 'Orbitron, monospace', letterSpacing: 0.5 }}>{formatNum(liveStats.twitch.value)}</span>
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, fontFamily: 'monospace', fontWeight: 700 }}>WATCHING · {liveStats.twitch.stream_count} LIVE</span>
                </div>
              </>
            )}

            <div style={{ width: 1, height: 14, background: '#22252e' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ fontSize: 12, fontWeight: 900, color: '#00ff41', fontFamily: 'Orbitron, monospace' }}>{weaponCount}</span>
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 1.5, fontFamily: 'monospace', fontWeight: 700 }}>WEAPONS</span>
            </div>
            <div style={{ width: 1, height: 14, background: '#22252e' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ fontSize: 12, fontWeight: 900, color: '#00d4ff', fontFamily: 'Orbitron, monospace' }}>{shellCount}</span>
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 1.5, fontFamily: 'monospace', fontWeight: 700 }}>SHELLS</span>
            </div>
            <div style={{ width: 1, height: 14, background: '#22252e' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 1.5, fontFamily: 'monospace', fontWeight: 700 }}>NEXT UPDATE</span>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#00ff41', fontFamily: 'monospace' }}>{cron.nextLabel}</span>
            </div>
            {lastUpdated && (
              <>
                <div style={{ width: 1, height: 14, background: '#22252e' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 1.5, fontFamily: 'monospace', fontWeight: 700 }}>UPDATED</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.55)', fontFamily: 'monospace' }}>{timeAgo(lastUpdated)}</span>
                </div>
              </>
            )}
          </div>
        </section>

        {/* ══ PRODUCTS ══ */}
        <section style={{ position: 'relative', zIndex: 1 }}>
          <div className="hp-wrap" style={{ padding: '28px 24px 32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 3, color: 'rgba(255,255,255,0.18)', textTransform: 'uppercase' }}>Products</span>
              <div style={{ flex: 1, height: 1, background: '#1e2028' }} />
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.12)', letterSpacing: 1 }}>4 AVAILABLE</span>
            </div>

            <div className="hp-product-grid">

              {/* CARD 1: TIER LIST (Maker folded in) */}
              <Link href="/meta" className="product-panel" style={{ display: 'flex', flexDirection: 'column', background: '#1a1d24', border: '1px solid #22252e', borderTop: '2px solid #00ff41', borderRadius: '0 0 3px 3px', padding: '20px 22px', textDecoration: 'none', minHeight: 300 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 21, fontWeight: 900, color: '#00ff41', letterSpacing: 1, lineHeight: 1 }}>TIER LIST</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.42)', lineHeight: 1.4, marginTop: 7, fontWeight: 600 }}>Every weapon &amp; shell, ranked S-C</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#00ff41', boxShadow: '0 0 6px rgba(0,255,65,0.5)' }} />
                    <span style={{ fontSize: 8, color: '#00ff41', letterSpacing: 1.5, fontWeight: 700, fontFamily: 'monospace' }}>{cron.nextLabel}</span>
                  </div>
                </div>
                <div style={{ marginTop: 14, flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {gridPreview.length > 0 ? gridPreview.map(function(item) {
                    var imgSrc = imagePath(item.type, item.image_filename);
                    var isShell = (item.type || '').toLowerCase() === 'shell';
                    return (
                      <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', background: '#0e1014', border: '1px solid #22252e', borderRadius: 2 }}>
                        <div style={{ ...tierBg(item.tier), padding: '3px 7px', fontSize: 10, fontWeight: 900, borderRadius: 2, fontFamily: 'Orbitron, monospace', lineHeight: 1, flexShrink: 0 }}>{item.tier}</div>
                        <div style={{ width: 30, height: 30, flexShrink: 0, background: '#1a1d24', border: '1px solid #22252e', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                          {imgSrc ? <img src={imgSrc} alt={item.name} style={{ width: 26, height: 26, objectFit: 'contain' }} /> : <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.15)' }}>{isShell ? '◎' : '⬢'}</span>}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.85)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                          <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.3)', letterSpacing: 1.5, fontWeight: 700, fontFamily: 'monospace' }}>{isShell ? 'SHELL' : 'WEAPON'}</div>
                        </div>
                      </div>
                    );
                  }) : (
                    <div style={{ padding: 20, textAlign: 'center', fontSize: 10, color: 'rgba(255,255,255,0.15)', letterSpacing: 1 }}>LOADING...</div>
                  )}
                </div>
                <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #22252e', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', letterSpacing: 1, fontFamily: 'monospace', fontWeight: 700 }}>{weaponCount} weapons · {shellCount} shells</span>
                  <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', letterSpacing: 1, fontFamily: 'monospace', fontWeight: 700 }}>RANK YOUR OWN -&gt;</span>
                </div>
              </Link>

              {/* CARD 2: BUILD ADVISOR */}
              <Link href="/advisor" className="product-panel" style={{ display: 'flex', flexDirection: 'column', background: '#1a1d24', border: '1px solid #22252e', borderTop: '2px solid #ff8800', borderRadius: '0 0 3px 3px', padding: '20px 22px', textDecoration: 'none', minHeight: 300 }}>
                <div>
                  <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 21, fontWeight: 900, color: '#ff8800', letterSpacing: 1, lineHeight: 1 }}>BUILD ADVISOR</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.42)', lineHeight: 1.4, marginTop: 7, fontWeight: 600 }}>Tell us your shell, we build the loadout</div>
                </div>
                <div style={{ marginTop: 16, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {forgeShells.map(function(s) {
                    var imgSrc = s.image_filename ? '/images/shells/' + s.image_filename : null;
                    return (
                      <div key={s.name} title={s.name} style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid ' + s.color + '55', background: '#0e1014', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {imgSrc ? <img src={imgSrc} alt={s.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 11, color: s.color }}>{'◈'}</span>}
                      </div>
                    );
                  })}
                </div>
                <div style={{ marginTop: 14, padding: '12px', background: '#0e1014', border: '1px solid #22252e', borderLeft: '2px solid #ffd700', borderRadius: '0 2px 2px 0', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 11, fontWeight: 800, color: '#ffd700', letterSpacing: 1 }}>THIEF</span>
                    <div style={{ background: '#ff8800', color: '#000', padding: '2px 7px', fontSize: 10, fontWeight: 900, borderRadius: 2, fontFamily: 'Orbitron, monospace' }}>A-GRADE</div>
                  </div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>WSTR + Longshot</div>
                  <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                    {['Suppressor', 'Thermal', 'Stabilizer'].map(function(mod) {
                      return <span key={mod} style={{ fontSize: 8, padding: '1px 5px', background: '#1a1d24', border: '1px solid #22252e', borderRadius: 2, color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>{mod}</span>;
                    })}
                  </div>
                </div>
                <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #22252e', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', letterSpacing: 1, fontFamily: 'monospace', fontWeight: 700 }}>{weeklyBuilds > 0 ? weeklyBuilds + ' forged this week' : 'Built from live data'}</span>
                  <span style={{ fontSize: 8, color: 'rgba(255,136,0,0.7)', letterSpacing: 1, fontFamily: 'monospace', fontWeight: 700 }}>FROM LIVE DATA</span>
                </div>
              </Link>

              {/* CARD 3: CRADLE PLANNER (new S2 flagship) */}
              <Link href="/cradle" className="product-panel" style={{ display: 'flex', flexDirection: 'column', background: '#1a1d24', border: '1px solid #22252e', borderTop: '2px solid #00f5ff', borderRadius: '0 0 3px 3px', padding: '20px 22px', textDecoration: 'none', minHeight: 300 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 21, fontWeight: 900, color: '#00f5ff', letterSpacing: 1, lineHeight: 1 }}>CRADLE PLANNER</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.42)', lineHeight: 1.4, marginTop: 7, fontWeight: 600 }}>Plan your Season 2 stat build</div>
                  </div>
                  <span style={{ padding: '2px 7px', background: 'rgba(0,245,255,0.1)', color: '#00f5ff', border: '1px solid rgba(0,245,255,0.3)', fontSize: 8, fontWeight: 800, letterSpacing: 1.5, borderRadius: 2, fontFamily: 'monospace', flexShrink: 0 }}>NEW</span>
                </div>
                <div style={{ marginTop: 16, flex: 1, display: 'flex', flexDirection: 'column', gap: 5, justifyContent: 'center' }}>
                  {[
                    { t: 'Strength', c: '#ff2222', p: 70 },
                    { t: 'Endurance', c: '#00ff41', p: 100 },
                    { t: 'Dexterity', c: '#ffd700', p: 50 },
                    { t: 'Resistance', c: '#ff8800', p: 35 },
                  ].map(function(row) {
                    return (
                      <div key={row.t} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontFamily: 'monospace', fontSize: 9, color: 'rgba(255,255,255,0.5)', width: 76, letterSpacing: 0.5, fontWeight: 700 }}>{row.t.toUpperCase()}</span>
                        <div style={{ flex: 1, height: 8, background: '#0e1014', border: '1px solid #22252e', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ width: row.p + '%', height: '100%', background: row.c, opacity: 0.8 }} />
                        </div>
                      </div>
                    );
                  })}
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5, marginTop: 6 }}>
                    Allocate Energy across six tracks, unlock perks at every breakpoint, test builds free.
                  </div>
                </div>
                <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #22252e', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', letterSpacing: 1, fontFamily: 'monospace', fontWeight: 700 }}>6 tracks · free respec</span>
                  <span style={{ fontSize: 8, color: 'rgba(0,245,255,0.7)', letterSpacing: 1, fontFamily: 'monospace', fontWeight: 700 }}>SEASON 2 -&gt;</span>
                </div>
              </Link>

              {/* CARD 4: BUILD COACH */}
              <Link href="#" className="product-panel" style={{ display: 'flex', flexDirection: 'column', background: '#1a1d24', border: '1px solid #22252e', borderTop: '2px solid #9b5de5', borderRadius: '0 0 3px 3px', padding: '20px 22px', textDecoration: 'none', minHeight: 300, position: 'relative', cursor: 'default' }}>
                <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(155,93,229,0.015) 8px, rgba(155,93,229,0.015) 9px)', pointerEvents: 'none', borderRadius: '0 0 3px 3px' }} />
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
                  <div>
                    <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 21, fontWeight: 900, color: '#9b5de5', letterSpacing: 1, lineHeight: 1 }}>BUILD COACH</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.42)', lineHeight: 1.4, marginTop: 7, fontWeight: 600 }}>Already built? Get yours graded</div>
                  </div>
                  <span style={{ padding: '2px 7px', background: 'rgba(155,93,229,0.15)', color: '#9b5de5', border: '1px solid rgba(155,93,229,0.3)', fontSize: 8, fontWeight: 800, letterSpacing: 1.5, borderRadius: 2, fontFamily: 'monospace', flexShrink: 0 }}>COMING SOON</span>
                </div>
                <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-around', gap: 8, position: 'relative', zIndex: 1 }}>
                  {[
                    { name: 'Build AI', img: 'dexter', color: '#ff8800', label: 'Build Score' },
                    { name: 'Meta AI', img: 'nexus', color: '#00d4ff', label: 'Meta Score' },
                    { name: 'Field-Guide AI', img: 'miranda', color: '#9b5de5', label: 'Runner Type' },
                  ].map(function(ed) {
                    return (
                      <div key={ed.name} style={{ textAlign: 'center', flex: 1 }}>
                        <div style={{ width: 40, height: 40, borderRadius: '50%', border: '1.5px solid ' + ed.color + '50', background: '#0e1014', overflow: 'hidden', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <img src={'/images/editors/' + ed.img + '.jpg'} alt={ed.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
                        </div>
                        <div style={{ fontSize: 8, color: ed.color, letterSpacing: 1, fontWeight: 700, marginTop: 5, fontFamily: 'monospace' }}>{ed.name}</div>
                        <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.3)', letterSpacing: 0.5, fontWeight: 700, marginTop: 2, fontFamily: 'monospace' }}>{ed.label}</div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ marginTop: 14, padding: '12px', background: '#0e1014', border: '1px solid #22252e', borderLeft: '2px solid #9b5de5', borderRadius: '0 2px 2px 0', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 5, position: 'relative', zIndex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ background: '#9b5de5', color: '#fff', padding: '4px 10px', fontSize: 18, fontWeight: 900, borderRadius: 2, fontFamily: 'Orbitron, monospace', lineHeight: 1 }}>A</div>
                    <div>
                      <div style={{ fontSize: 10, color: '#9b5de5', letterSpacing: 1, fontWeight: 800, fontFamily: 'monospace' }}>S-TIER SOLO</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: 700, fontFamily: 'Orbitron, monospace', letterSpacing: 0.5 }}>"THE EXTRACTOR"</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5, marginTop: 4, fontFamily: 'monospace', fontWeight: 600 }}>3 AI editors · 8 slot analysis · Live meta context</div>
                </div>
                <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #22252e', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', letterSpacing: 1, fontFamily: 'monospace', fontWeight: 700 }}>Bungie OAuth · Scored &amp; saved</span>
                  <span style={{ fontSize: 10, color: '#9b5de5', letterSpacing: 1, fontWeight: 800, fontFamily: 'monospace' }}>COMING SOON</span>
                </div>
              </Link>

            </div>
          </div>
        </section>

        {/* ══ CREATOR SPOTLIGHTS → RISING ══ */}
        {spotlights.length > 0 && (
          <section style={{ position: 'relative', zIndex: 1 }}>
            <div className="hp-wrap" style={{ padding: '0 24px 32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 3, color: '#00ff88', textTransform: 'uppercase', fontFamily: 'monospace' }}>Creator Spotlights</span>
                <div style={{ flex: 1, height: 1, background: '#1e2028' }} />
                <Link href="/rising" style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.5, color: '#00ff88', textDecoration: 'none', fontFamily: 'monospace' }}>RISING RUNNERS -&gt;</Link>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
                {spotlights.map(function(item) {
                  var ec = EDITOR_ACCENT[item.editor] || '#00ff88';
                  var glyph = EDITOR_GLYPH[item.editor] || '◇';
                  var info = item.creator_info || {};
                  var creatorName = info.name ? info.name : 'Marathon Creator';
                  var login = twitchLoginFromUrl(info.twitch);
                  var avatarUrl = login && spotlightAvatars[login] ? spotlightAvatars[login] : null;
                  return (
                    <Link key={item.slug} href={'/intel/' + item.slug} className="product-panel" style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#1a1d24', border: '1px solid #22252e', borderLeft: '3px solid ' + ec, borderRadius: '0 3px 3px 0', padding: '12px 14px', textDecoration: 'none' }}>
                      <div style={{ width: 40, height: 40, flexShrink: 0, borderRadius: '50%', background: '#0e1014', border: '1px solid ' + ec + '50', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: ec }}>
                        {avatarUrl ? (
                          <img src={avatarUrl} alt={creatorName} width={40} height={40} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', display: 'block' }} />
                        ) : (
                          glyph
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                          <span style={{ fontSize: 8, color: ec, letterSpacing: 1.5, fontWeight: 700, fontFamily: 'monospace' }}>{(item.editor || 'EDITOR') + ' SPOTLIGHT'}</span>
                          <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.25)', marginLeft: 'auto', fontFamily: 'monospace', letterSpacing: 1 }}>{timeAgo(item.created_at)}</span>
                        </div>
                        <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 14, fontWeight: 800, color: '#fff', lineHeight: 1.15, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{creatorName}</div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', lineHeight: 1.35, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{item.headline}</div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* ══ WHERE THE EDITORS DISAGREE ══ */}
        <section style={{ position: 'relative', zIndex: 1 }}>
          <div className="hp-wrap" style={{ padding: '0 24px 32px' }}>
            <HomeEditorReactions />
          </div>
        </section>
      </div>

      {/* Footer bar */}
      <div style={{ background: '#0e1014', borderTop: '1px solid #1e2028', padding: '10px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {['#ff2222', '#00d4ff', '#ff8800', '#00ff88', '#9b5de5'].map(function(c) {
              return <div key={c} style={{ width: 6, height: 6, borderRadius: 1, background: c }} />;
            })}
          </div>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.12)', letterSpacing: 2, textTransform: 'uppercase' }}>
            Marathon Meta, Builds &amp; Tier List - Refreshed Throughout The Day
          </span>
        </div>
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.1)', letterSpacing: 1, textTransform: 'uppercase' }}>
          CyberneticPunks.com
        </span>
      </div>

      <Footer />
    </div>
  );
}