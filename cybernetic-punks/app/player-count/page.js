// app/player-count/page.js
//
// Marathon PLAYER COUNT page - live Steam concurrent players + all-time peak
// (within our tracking window) + a trend chart of the full history. Targets the
// "marathon game player count" search intent with a real, evergreen data page.
//
// HONESTY: this is STEAM CONCURRENT PLAYERS ONLY. PlayStation/Xbox are not
// counted, so it is a lower bound on activity, NOT the total playerbase. Every
// label says "Steam concurrent"; the peak is explicitly the peak WE have
// recorded since tracking began (not the all-time game peak). No extrapolation,
// no invented figures - only live_stats (current) + steam_snapshots (history).
//
// force-dynamic: the current count + history are live. Named-hex Marathon design
// tokens. Chart is a dependency-free inline SVG.

import Link from 'next/link';
import { supabase } from '../../lib/supabase';
import { getLiveStats } from '../../lib/liveStats';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Marathon Player Count - Live Steam Concurrent Players & History',
  description: 'Live Marathon Steam concurrent player count, the all-time peak we have tracked, and the full trend since March 2026. This is Steam players in-game right now - not the total playerbase (PlayStation and Xbox are not counted).',
  openGraph: {
    title: 'Marathon Player Count - Live Steam Concurrent Players | CyberneticPunks',
    description: 'Live Marathon Steam concurrent players, all-time tracked peak, and the full history. Steam only - not total playerbase.',
    url: 'https://cyberneticpunks.com/player-count',
    siteName: 'CyberneticPunks',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    site: '@Cybernetic87250',
    title: 'Marathon Player Count - Live Steam Concurrent Players',
    description: 'Live Steam concurrent players, all-time tracked peak, and the full trend. Steam only.',
  },
  alternates: { canonical: 'https://cyberneticpunks.com/player-count' },
};

// ── Design tokens (locked Marathon named-hex system) ──
var BG_PAGE = '#121418';
var BG_CARD = '#1a1d24';
var BG_DEEP = '#0e1014';
var BORDER = '#22252e';
var BORDER_SUBTLE = '#1e2028';
var STEAM = '#1b9fff'; // steam blue accent (from the /stats platform palette)

function addCommas(n) {
  if (n == null || isNaN(n)) return '--';
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
function timeAgo(dateStr) {
  if (!dateStr) return '';
  var mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return mins + 'm ago';
  var h = Math.floor(mins / 60);
  if (h < 24) return h + 'h ago';
  return Math.floor(h / 24) + 'd ago';
}
function fmtDate(dateStr) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch (e) { return ''; }
}

// Read the full steam_snapshots history, range-paginated past the 1000-row
// PostgREST cap so this stays correct as history grows (currently ~881).
async function fetchHistory() {
  var rows = [];
  var from = 0;
  try {
    while (true) {
      var res = await supabase
        .from('steam_snapshots')
        .select('player_count, recorded_at')
        .order('recorded_at', { ascending: true })
        .range(from, from + 999);
      if (res.error || !res.data) break;
      rows = rows.concat(res.data);
      if (res.data.length < 1000) break;
      from += 1000;
    }
  } catch (e) { /* fall through with whatever we have */ }
  return rows.filter(function (r) { return r && typeof r.player_count === 'number' && r.recorded_at; });
}

// Build an inline-SVG line+area from the series. Downsamples to keep the path
// light (a trend, not a per-point table); the exact current/peak numbers are
// shown separately, so downsampling never hides the real figures.
function buildChart(series, peak) {
  var W = 1000, H = 260, padL = 8, padR = 8, padT = 12, padB = 22;
  if (series.length < 2) return null;
  var pts = series;
  if (pts.length > 260) {
    var step = Math.ceil(pts.length / 260);
    var ds = [];
    for (var i = 0; i < pts.length; i += step) ds.push(pts[i]);
    if (ds[ds.length - 1] !== pts[pts.length - 1]) ds.push(pts[pts.length - 1]);
    pts = ds;
  }
  var t0 = new Date(series[0].recorded_at).getTime();
  var t1 = new Date(series[series.length - 1].recorded_at).getTime();
  var span = (t1 - t0) || 1;
  var yMax = Math.max(peak, 1);
  var innerW = W - padL - padR;
  var innerH = H - padT - padB;
  function x(t) { return padL + ((new Date(t).getTime() - t0) / span) * innerW; }
  function y(v) { return padT + (1 - (v / yMax)) * innerH; }
  var line = pts.map(function (p, i) { return (i === 0 ? 'M' : 'L') + x(p.recorded_at).toFixed(1) + ',' + y(p.player_count).toFixed(1); }).join(' ');
  var baseline = padT + innerH;
  var area = 'M' + x(pts[0].recorded_at).toFixed(1) + ',' + baseline.toFixed(1) + ' '
    + pts.map(function (p) { return 'L' + x(p.recorded_at).toFixed(1) + ',' + y(p.player_count).toFixed(1); }).join(' ')
    + ' L' + x(pts[pts.length - 1].recorded_at).toFixed(1) + ',' + baseline.toFixed(1) + ' Z';
  return { W: W, H: H, line: line, area: area, baseline: baseline };
}

export default async function PlayerCountPage() {
  var [live, history] = await Promise.all([getLiveStats(), fetchHistory()]);

  var current = (live && live.steam && live.steam.value) ? live.steam.value : (history.length ? history[history.length - 1].player_count : null);
  var currentUpdated = (live && live.steam && live.steam.updated_at) ? live.steam.updated_at : (history.length ? history[history.length - 1].recorded_at : null);

  // Peak within the tracked window + its date (exact, from the full history).
  var peakVal = 0, peakAt = null;
  history.forEach(function (r) { if (r.player_count > peakVal) { peakVal = r.player_count; peakAt = r.recorded_at; } });

  var trackStart = history.length ? history[0].recorded_at : null;
  var chart = buildChart(history, peakVal || 1);

  var pageUrl = 'https://cyberneticpunks.com/player-count';
  var breadcrumbSchema = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://cyberneticpunks.com' },
      { '@type': 'ListItem', position: 2, name: 'Player Count', item: pageUrl },
    ],
  };
  var webPageSchema = {
    '@context': 'https://schema.org', '@type': 'WebPage',
    name: 'Marathon Player Count - Steam Concurrent Players',
    description: 'Live Steam concurrent player count for Marathon, the peak tracked since March 2026, and the full trend. Steam only, not total playerbase.',
    url: pageUrl,
    publisher: { '@type': 'Organization', name: 'CyberneticPunks', url: 'https://cyberneticpunks.com' },
  };

  return (
    <main style={{ background: BG_PAGE, minHeight: '100vh', color: '#fff', paddingTop: 48, fontFamily: 'system-ui, sans-serif' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }} />

      {/* Breadcrumb */}
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '20px 24px 0' }}>
        <nav style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10, letterSpacing: 2, fontFamily: 'monospace', fontWeight: 700 }}>
          <Link href="/" style={{ color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>HOME</Link>
          <span style={{ color: 'rgba(255,255,255,0.1)' }}>/</span>
          <span style={{ color: STEAM }}>PLAYER COUNT</span>
        </nav>
      </div>

      {/* HERO: the live current number */}
      <section style={{ maxWidth: 1000, margin: '0 auto', padding: '28px 24px 8px' }}>
        <div style={{ fontSize: 10, color: STEAM, letterSpacing: 3, fontWeight: 700, fontFamily: 'monospace', marginBottom: 10 }}>
          MARATHON &middot; STEAM CONCURRENT PLAYERS
        </div>
        <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: 900, letterSpacing: '-0.5px', margin: '0 0 20px', lineHeight: 1.05 }}>
          Marathon Player Count
        </h1>

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ background: BG_CARD, border: '1px solid ' + BORDER, borderTop: '2px solid ' + STEAM, borderRadius: '0 0 3px 3px', padding: '18px 24px', minWidth: 220 }}>
            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 'clamp(34px, 7vw, 54px)', fontWeight: 900, color: STEAM, lineHeight: 1, letterSpacing: '-1px' }}>
              {current != null ? addCommas(current) : '--'}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 8, lineHeight: 1.4 }}>
              players in-game on <strong style={{ color: '#fff' }}>Steam</strong> right now
            </div>
            {currentUpdated && (
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, fontFamily: 'monospace', fontWeight: 700, marginTop: 6 }}>
                UPDATED {timeAgo(currentUpdated).toUpperCase()}
              </div>
            )}
          </div>

          {peakVal > 0 && (
            <div style={{ background: BG_CARD, border: '1px solid ' + BORDER, borderTop: '2px solid #ff8800', borderRadius: '0 0 3px 3px', padding: '18px 24px', minWidth: 200 }}>
              <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 30, fontWeight: 900, color: '#ff8800', lineHeight: 1, letterSpacing: '-0.5px' }}>
                {addCommas(peakVal)}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 8, lineHeight: 1.4 }}>
                peak concurrent (Steam){peakAt ? ', ' + fmtDate(peakAt) : ''}
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, fontFamily: 'monospace', fontWeight: 700, marginTop: 6 }}>
                SINCE WE BEGAN TRACKING
              </div>
            </div>
          )}
        </div>
      </section>

      {/* TREND CHART */}
      {chart && (
        <section style={{ maxWidth: 1000, margin: '0 auto', padding: '28px 24px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: 3, fontWeight: 700, textTransform: 'uppercase' }}>Steam Concurrent Players Over Time</span>
            <div style={{ flex: 1, height: 1, background: BORDER_SUBTLE, minWidth: 20 }} />
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', letterSpacing: 1, fontWeight: 700 }}>{fmtDate(trackStart)} &ndash; NOW</span>
          </div>
          <div style={{ background: BG_CARD, border: '1px solid ' + BORDER, borderRadius: 3, padding: '16px 14px 10px' }}>
            <svg viewBox={'0 0 ' + chart.W + ' ' + chart.H} preserveAspectRatio="none" style={{ width: '100%', height: 'auto', display: 'block' }} role="img" aria-label="Marathon Steam concurrent players over time">
              <defs>
                <linearGradient id="pcFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={STEAM} stopOpacity="0.28" />
                  <stop offset="100%" stopColor={STEAM} stopOpacity="0.02" />
                </linearGradient>
              </defs>
              <line x1="8" y1={chart.baseline} x2={chart.W - 8} y2={chart.baseline} stroke={BORDER} strokeWidth="1" />
              <path d={chart.area} fill="url(#pcFill)" />
              <path d={chart.line} fill="none" stroke={STEAM} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            </svg>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', letterSpacing: 1, fontWeight: 700 }}>
              <span>{fmtDate(trackStart)}</span>
              <span>PEAK {addCommas(peakVal)}</span>
              <span>{fmtDate(currentUpdated)}</span>
            </div>
          </div>
        </section>
      )}

      {/* HONEST CONTEXT */}
      <section style={{ maxWidth: 1000, margin: '0 auto', padding: '28px 24px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: 3, fontWeight: 700, textTransform: 'uppercase' }}>What This Measures</span>
          <div style={{ flex: 1, height: 1, background: BORDER_SUBTLE }} />
        </div>
        <div style={{ background: BG_CARD, border: '1px solid ' + BORDER, borderLeft: '3px solid ' + STEAM, borderRadius: '0 3px 3px 0', padding: '16px 20px', fontSize: 14, color: 'rgba(255,255,255,0.65)', lineHeight: 1.7 }}>
          <p style={{ margin: '0 0 10px' }}>
            This is <strong style={{ color: '#fff' }}>Steam concurrent players</strong> - how many people are in Marathon on Steam at once. It is pulled directly from Steam and refreshed throughout the day.
          </p>
          <p style={{ margin: '0 0 10px' }}>
            It is <strong style={{ color: '#fff' }}>not the total playerbase.</strong> Marathon is cross-platform (PlayStation and Xbox), and those players are not counted here. Treat this as a lower bound on activity and a reliable trend signal, not a full population count.
          </p>
          <p style={{ margin: 0 }}>
            The peak shown is the highest concurrent count we have recorded since we started tracking on {fmtDate(trackStart)} - not necessarily the game&apos;s all-time high. No hype, just the numbers.
          </p>
        </div>
      </section>

      {/* CROSS-LINKS */}
      <section style={{ maxWidth: 1000, margin: '0 auto', padding: '28px 24px 72px', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
          {[
            { href: '/status', label: 'SERVER STATUS', c: '#00ff88' },
            { href: '/leaderboard', label: 'LEADERBOARD', c: '#ffd700' },
            { href: '/stats', label: 'STATS TRACKER', c: STEAM },
            { href: '/meta', label: 'META TIER LIST', c: '#00d4ff' },
          ].map(function (l) {
            return (
              <Link key={l.href} href={l.href} style={{ fontFamily: 'Orbitron, monospace', fontSize: 11, fontWeight: 700, color: l.c, padding: '8px 18px', border: '1px solid ' + l.c + '44', borderRadius: 3, textDecoration: 'none', letterSpacing: 1.5 }}>
                {l.label} &rarr;
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
