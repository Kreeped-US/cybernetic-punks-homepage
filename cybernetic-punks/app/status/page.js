// app/status/page.js
// SERVER STATUS + WEEKLY RESET TRACKER + ERROR CODES
// Live Steam player count, Steam review sentiment, Supabase-backed platform status

import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export const revalidate = 60;

export const metadata = {
  title: 'Marathon Server Status — Is Marathon Down? Live Status, Reset & Error Codes',
  description: 'Is Marathon down? Live Marathon server status for Steam, PlayStation 5, and Xbox Series X|S. Weekly reset schedule, ranked queue rotation, faction contracts, Armory stock, and complete Marathon error code reference.',
  keywords: 'Marathon server status, is Marathon down, Marathon servers down, Marathon maintenance, Marathon weekly reset, Marathon reset schedule, Marathon ranked rotation, Marathon error codes, Marathon WEASEL, Marathon BROCCOLI, Marathon BASIL, Marathon ANTEATER, Marathon CENTIPEDE, Marathon CURRANT, Marathon GINGER, Marathon server issues, Marathon outage, Marathon player count, Marathon steam reviews',
  openGraph: {
    title: 'Marathon Server Status — Is Marathon Down? | CyberneticPunks',
    description: 'Live Marathon server status across all platforms. Weekly reset tracker, ranked rotations, and error code fixes.',
    url: 'https://cyberneticpunks.com/status',
    siteName: 'CyberneticPunks',
    type: 'website',
    images: [{ url: 'https://cyberneticpunks.com/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@Cybernetic87250',
    title: 'Marathon Server Status — Is Marathon Down? | CyberneticPunks',
    description: 'Live server status, weekly reset tracker, and error code reference.',
    images: ['https://cyberneticpunks.com/og-image.png'],
  },
  alternates: { canonical: 'https://cyberneticpunks.com/status' },
};

// ─── CONSTANTS ──────────────────────────────────────────────
const BG = '#121418';
const CARD_BG = '#1a1d24';
const DEEP_BG = '#0e1014';
const BORDER = '#22252e';

const CYAN = '#00d4ff';
const RED = '#ff2222';
const GREEN = '#00ff41';
const ORANGE = '#ff8800';
const YELLOW = '#ffd700';
const PURPLE = '#9b5de5';

const PLATFORM_INFO = {
  steam:       { label: 'STEAM (PC)',       icon: '⊞' },
  playstation: { label: 'PLAYSTATION 5',    icon: '△' },
  xbox:        { label: 'XBOX SERIES X|S',  icon: '⊕' },
};

const STATUS_STYLES = {
  online:      { color: GREEN,  label: 'ONLINE' },
  issues:      { color: YELLOW, label: 'ISSUES' },
  maintenance: { color: ORANGE, label: 'MAINTENANCE' },
  offline:     { color: RED,    label: 'OFFLINE' },
};

const ERROR_CODES = [
  { code: 'BASIL',     desc: 'Basic disconnect. Try logging back in. If persistent, check server status above.',                                             severity: 'low' },
  { code: 'BROCCOLI',  desc: 'GPU not detected or driver crash. Update your GPU drivers and verify your graphics card is properly installed.',              severity: 'high' },
  { code: 'GINGER',    desc: "A crew member disconnected during matchmaking. Usually resolves on the disconnected player's end.",                            severity: 'low' },
  { code: 'CURRANT',   desc: 'Network connectivity issue. Check your ISP status, restart your router, and try a wired connection.',                          severity: 'medium' },
  { code: 'WEASEL',    desc: 'Lost connection to Bungie servers. Often a server-side issue during high traffic or maintenance windows.',                     severity: 'high' },
  { code: 'ANTEATER',  desc: 'Unable to connect to Bungie. Check your NAT type, firewall settings, and ensure BattlEye is not blocked.',                    severity: 'medium' },
  { code: 'CENTIPEDE', desc: 'General connection instability. Often caused by packet loss or unstable connection. Try a wired connection and restart your router.', severity: 'medium' },
  { code: 'CABBAGE',   desc: 'Connection quality degraded. Check your bandwidth and close background apps consuming network resources.',                    severity: 'low' },
  { code: 'PINEAPPLE', desc: 'Server-side timeout or unexpected disconnect. Usually resolves by waiting and retrying the matchmaking queue.',               severity: 'low' },
];

const RESET_DEFAULTS = [
  { title: 'RANKED ZONES',       desc: 'Competitive zones rotate weekly. New Holotag targets and zone selection each reset.',      icon: '◎', color: PURPLE },
  { title: 'FACTION CONTRACTS',  desc: 'New contracts from all six factions. Complete them for reputation and seasonal upgrades.', icon: '⬡', color: CYAN },
  { title: 'ARMORY STOCK',       desc: 'Weapons, mods, and gear in the Armory refresh weekly. Check for new Prestige-tier items.', icon: '⬢', color: ORANGE },
  { title: 'EVENTS & MODIFIERS', desc: 'Rotating map events, enemy spawns, and environmental conditions change with each reset.', icon: '◈', color: RED },
];

// ─── HELPERS ────────────────────────────────────────────────
function timeAgo(dateStr) {
  if (!dateStr) return '';
  var now = new Date();
  var then = new Date(dateStr);
  var diffMs = now - then;
  var diffM = Math.floor(diffMs / 60000);
  if (diffM < 1) return 'just now';
  if (diffM < 60) return diffM + 'm ago';
  var diffH = Math.floor(diffM / 60);
  if (diffH < 24) return diffH + 'h ago';
  return Math.floor(diffH / 24) + 'd ago';
}

// Ranked queue rotation — Sun 10AM PT to Thu 10AM PT open
function getRankedStatus() {
  var now = new Date();
  var pt = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
  var day = pt.getDay();
  var hour = pt.getHours();
  var isOpen = false;
  if (day === 0 && hour >= 10) isOpen = true;
  else if (day >= 1 && day <= 3) isOpen = true;
  else if (day === 4 && hour < 10) isOpen = true;
  return { isOpen: isOpen };
}

async function getLiveSteamPlayers() {
  try {
    var res = await fetch(
      'https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=3065800',
      { next: { revalidate: 60 } }
    );
    var d = await res.json();
    return d?.response?.player_count || null;
  } catch {
    return null;
  }
}

async function getSteamReviews() {
  try {
    var res = await fetch(
      'https://store.steampowered.com/appreviews/3065800?json=1&filter=recent&language=english&num_per_page=8&review_type=all',
      { next: { revalidate: 300 } }
    );
    var d = await res.json();
    var reviews = (d?.reviews || [])
      .map(function(r) {
        return {
          text: r.review?.slice(0, 180) || '',
          voted_up: r.voted_up,
          playtime_hours: Math.round((r.author?.playtime_at_review || 0) / 60),
        };
      })
      .filter(function(r) { return r.text.length > 20; });
    var summary = d?.query_summary;
    return {
      reviews: reviews,
      total: summary?.total_reviews || 0,
      positive_percent: summary?.review_score_desc || 'Unknown',
      total_positive: summary?.total_positive || 0,
    };
  } catch {
    return null;
  }
}

function SectionHeader({ label, color, count, rightLink }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
      <span style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 700, letterSpacing: 3, color: color || 'rgba(255,255,255,0.25)' }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: BORDER }} />
      {count !== undefined && (
        <span style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.25)', letterSpacing: 1, fontWeight: 700 }}>{count}</span>
      )}
      {rightLink}
    </div>
  );
}

// ─── PAGE ───────────────────────────────────────────────────
export default async function StatusPage() {
  var [steamPlayers, steamReviews, serverStatusRes, weeklyResetRes, incidentsRes] = await Promise.all([
    getLiveSteamPlayers(),
    getSteamReviews(),
    supabase.from('server_status').select('*').order('updated_at', { ascending: false }),
    supabase.from('weekly_reset').select('*').eq('is_active', true).order('sort_order', { ascending: true }),
    supabase.from('server_incidents').select('*').order('created_at', { ascending: false }).limit(5),
  ]);

  var serverStatus = serverStatusRes.data || [];
  var weeklyReset  = weeklyResetRes.data || [];
  var incidents    = incidentsRes.data || [];

  var platforms = ['steam', 'playstation', 'xbox'];
  var statusMap = {};
  serverStatus.forEach(function(s) { statusMap[s.platform] = s; });

  var resetItems = (weeklyReset && weeklyReset.length > 0) ? weeklyReset : null;
  var queueStatus = getRankedStatus();

  // Aggregate status for banner
  var allOnline = platforms.every(function(p) {
    var data = statusMap[p];
    return !data || data.status === 'online' || !data.status;
  });
  var anyOffline = platforms.some(function(p) {
    var data = statusMap[p];
    return data && (data.status === 'offline' || data.status === 'maintenance');
  });
  var aggregateStatus = anyOffline
    ? { color: RED, label: 'SERVICE DISRUPTION', desc: 'One or more platforms are experiencing issues' }
    : allOnline
      ? { color: GREEN, label: 'ALL SYSTEMS OPERATIONAL', desc: 'All platforms online and responding normally' }
      : { color: YELLOW, label: 'MINOR ISSUES REPORTED', desc: 'Some platforms reporting degraded service' };

  // Active (unresolved) incidents
  var activeIncidents = incidents.filter(function(i) { return !i.resolved; });
  var hasActiveIncidents = activeIncidents.length > 0;

  // Last incident for uptime indicator
  var lastIncident = incidents[0] || null;

  // Structured data
  var breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://cyberneticpunks.com' },
      { '@type': 'ListItem', position: 2, name: 'Status', item: 'https://cyberneticpunks.com/status' },
    ],
  };

  var faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      { '@type': 'Question', name: 'Is Marathon down right now?', acceptedAnswer: { '@type': 'Answer', text: 'Check cyberneticpunks.com/status for real-time Marathon server status across Steam, PlayStation 5, and Xbox Series X|S. Our status page aggregates live platform availability and current incidents.' } },
      { '@type': 'Question', name: 'When does Marathon weekly reset happen?', acceptedAnswer: { '@type': 'Answer', text: 'Marathon resets every Tuesday at 10 AM PT / 1 PM ET / 6 PM GMT. This includes ranked zone rotations, faction contracts, and Armory stock refreshes.' } },
      { '@type': 'Question', name: 'What does WEASEL error code mean in Marathon?', acceptedAnswer: { '@type': 'Answer', text: 'WEASEL means you lost connection to Bungie servers. This is often a server-side issue during high traffic or maintenance windows. Check server status before assuming it\'s a local issue.' } },
      { '@type': 'Question', name: 'What does BROCCOLI error code mean in Marathon?', acceptedAnswer: { '@type': 'Answer', text: 'BROCCOLI means your GPU cannot be detected, usually caused by a driver crash. Update your OS and GPU drivers and ensure your graphics card is properly installed and recognized by your system.' } },
      { '@type': 'Question', name: 'What does CENTIPEDE error code mean in Marathon?', acceptedAnswer: { '@type': 'Answer', text: 'CENTIPEDE indicates general connection instability — often packet loss or unstable routing. Try a wired ethernet connection, restart your router, and close bandwidth-heavy background applications.' } },
      { '@type': 'Question', name: 'How do I fix Marathon connection issues?', acceptedAnswer: { '@type': 'Answer', text: 'Restart Marathon, check server status, restart your router, try a wired ethernet connection, ensure BattlEye is not blocked by your firewall, and update your platform software.' } },
      { '@type': 'Question', name: 'When is Marathon ranked queue open?', acceptedAnswer: { '@type': 'Answer', text: 'The Ranked queue opens Sunday at 10 AM PT and closes Thursday at 10 AM PT. Outside that window, only Casual queues are available. Holotag targets and zone selection rotate with each opening.' } },
    ],
  };

  return (
    <main style={{ background: BG, minHeight: '100vh', color: '#fff', paddingTop: 48 }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <style>{`
        .st-card       { transition: background 0.12s, border-color 0.12s; }
        .st-card:hover { background: #1e2228 !important; }
        .st-row:hover  { background: #1e2228 !important; }
        .st-btn:hover  { background: #1e2228 !important; }
        @keyframes stPulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>

      {/* ══ BREADCRUMB ══════════════════════════════════════ */}
      <nav aria-label="Breadcrumb" style={{ padding: '12px 24px', maxWidth: 1200, margin: '0 auto' }}>
        <ol style={{ display: 'flex', gap: 8, fontFamily: 'monospace', fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, listStyle: 'none', padding: 0, margin: 0, flexWrap: 'wrap', fontWeight: 700 }}>
          <li><Link href="/" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>HOME</Link></li>
          <li>/</li>
          <li style={{ color: GREEN }}>STATUS</li>
        </ol>
      </nav>

      {/* ══ HERO + AGGREGATE STATUS ═════════════════════════ */}
      <section style={{ padding: '24px 24px 32px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, color: aggregateStatus.color, background: aggregateStatus.color + '15', border: '1px solid ' + aggregateStatus.color + '40', borderRadius: 2, padding: '3px 10px', letterSpacing: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: aggregateStatus.color, animation: 'stPulse 2s ease-in-out infinite' }} />
            {aggregateStatus.label}
          </span>
          {steamPlayers && (
            <span style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, color: GREEN, background: 'rgba(0,255,65,0.08)', border: '1px solid rgba(0,255,65,0.25)', borderRadius: 2, padding: '3px 10px', letterSpacing: 2 }}>
              {steamPlayers.toLocaleString()} RUNNERS ONLINE
            </span>
          )}
          <span style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.04)', border: '1px solid ' + BORDER, borderRadius: 2, padding: '3px 10px', letterSpacing: 2 }}>
            AUTO-REFRESH 60S
          </span>
        </div>

        <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: 'clamp(2rem, 5.5vw, 3.4rem)', fontWeight: 900, letterSpacing: 1, lineHeight: 1.05, margin: '0 0 18px' }}>
          MARATHON<br /><span style={{ color: GREEN }}>SERVER STATUS</span>
        </h1>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, maxWidth: 580, marginBottom: 20 }}>
          Live Marathon server status across Steam, PlayStation 5, and Xbox Series X|S. Plus weekly reset schedule, ranked queue rotation, recent incidents, and error code reference.
        </p>
        <div style={{ fontFamily: 'monospace', fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 700, letterSpacing: 1 }}>
          FOLLOW <a href="https://x.com/BungieHelp" target="_blank" rel="noopener noreferrer" style={{ color: CYAN, textDecoration: 'none' }}>@BUNGIEHELP</a> FOR OFFICIAL ANNOUNCEMENTS
        </div>
      </section>

      {/* ══ ACTIVE INCIDENT BANNER (if any) ═════════════════ */}
      {hasActiveIncidents && (
        <section style={{ padding: '0 24px 24px', maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ background: CARD_BG, border: '1px solid ' + BORDER, borderLeft: '3px solid ' + RED, borderRadius: '0 2px 2px 0', padding: '14px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: RED, animation: 'stPulse 1.5s ease-in-out infinite' }} />
              <span style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 700, color: RED, letterSpacing: 2 }}>ACTIVE INCIDENT</span>
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{activeIncidents[0].title}</div>
            {activeIncidents[0].description && (
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 4, lineHeight: 1.5 }}>{activeIncidents[0].description}</div>
            )}
          </div>
        </section>
      )}

      {/* ══ PLATFORM STATUS + QUEUE STATUS ══════════════════ */}
      <section style={{ padding: '0 24px 40px', maxWidth: 1200, margin: '0 auto' }}>
        <SectionHeader label="PLATFORM STATUS" count="3 PLATFORMS" />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 6 }}>
          {platforms.map(function(platform) {
            var info = PLATFORM_INFO[platform];
            var data = statusMap[platform];
            var status = data && STATUS_STYLES[data.status] ? STATUS_STYLES[data.status] : STATUS_STYLES.online;
            return (
              <div key={platform} className="st-card" style={{ background: CARD_BG, border: '1px solid ' + BORDER, borderTop: '2px solid ' + status.color, borderRadius: '0 0 2px 2px', padding: '18px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{ fontSize: 24, flexShrink: 0 }}>{info.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 12, fontWeight: 700, color: '#fff', letterSpacing: 1, marginBottom: 2 }}>{info.label}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: status.color }} />
                      <span style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 700, color: status.color, letterSpacing: 1 }}>{status.label}</span>
                    </div>
                  </div>
                </div>
                {data && data.note && (
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.4, marginTop: 8, paddingTop: 8, borderTop: '1px solid ' + BORDER }}>{data.note}</div>
                )}
                {data && data.updated_at && (
                  <div style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.3)', marginTop: 8, letterSpacing: 1, fontWeight: 700 }}>
                    UPDATED {timeAgo(data.updated_at).toUpperCase()}
                  </div>
                )}
              </div>
            );
          })}

          {/* Ranked Queue Status Card */}
          <div className="st-card" style={{ background: CARD_BG, border: '1px solid ' + BORDER, borderTop: '2px solid ' + (queueStatus.isOpen ? GREEN : ORANGE), borderRadius: '0 0 2px 2px', padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ fontSize: 24, flexShrink: 0 }}>◎</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 12, fontWeight: 700, color: '#fff', letterSpacing: 1, marginBottom: 2 }}>RANKED QUEUE</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: queueStatus.isOpen ? GREEN : ORANGE }} />
                  <span style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 700, color: queueStatus.isOpen ? GREEN : ORANGE, letterSpacing: 1 }}>{queueStatus.isOpen ? 'OPEN' : 'CLOSED'}</span>
                </div>
              </div>
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.4, marginTop: 8, paddingTop: 8, borderTop: '1px solid ' + BORDER }}>
              {queueStatus.isOpen ? 'Closes Thursday 10AM PT' : 'Reopens Sunday 10AM PT'}
            </div>
            <Link href="/ranked" style={{ fontFamily: 'monospace', fontSize: 9, color: YELLOW, marginTop: 8, display: 'inline-block', letterSpacing: 1, textDecoration: 'none', fontWeight: 700 }}>
              RANKED GUIDE →
            </Link>
          </div>
        </div>
      </section>

      {/* ══ STEAM REVIEW SENTIMENT ══════════════════════════ */}
      {steamReviews && steamReviews.reviews.length > 0 && (
        <section style={{ padding: '0 24px 40px', maxWidth: 1200, margin: '0 auto' }}>
          <SectionHeader
            label="STEAM REVIEW SENTIMENT"
            color={GREEN}
            count={steamReviews.positive_percent}
            rightLink={<span style={{ fontFamily: 'monospace', fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, fontWeight: 700 }}>{steamReviews.total.toLocaleString()} TOTAL</span>}
          />

          {steamReviews.total > 0 && (
            <div style={{ background: CARD_BG, border: '1px solid ' + BORDER, borderRadius: 2, padding: '12px 16px', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontFamily: 'monospace', fontSize: 9, color: GREEN, letterSpacing: 1, fontWeight: 700 }}>
                  {Math.round((steamReviews.total_positive / steamReviews.total) * 100)}% POSITIVE
                </span>
                <span style={{ fontFamily: 'monospace', fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, fontWeight: 700 }}>
                  · {steamReviews.total_positive.toLocaleString()} / {steamReviews.total.toLocaleString()} POSITIVE
                </span>
              </div>
              <div style={{ height: 4, background: DEEP_BG, borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: Math.round((steamReviews.total_positive / steamReviews.total) * 100) + '%', background: 'linear-gradient(90deg, ' + GREEN + ', ' + CYAN + ')', borderRadius: 2 }} />
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 6 }}>
            {steamReviews.reviews.slice(0, 6).map(function(review, i) {
              var sentimentColor = review.voted_up ? GREEN : RED;
              var sentimentLabel = review.voted_up ? '▲ RECOMMENDED' : '▼ NOT RECOMMENDED';
              return (
                <div key={i} className="st-card" style={{ background: CARD_BG, border: '1px solid ' + BORDER, borderLeft: '2px solid ' + sentimentColor, borderRadius: '0 2px 2px 0', padding: '12px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 9, color: sentimentColor, letterSpacing: 1, fontWeight: 700 }}>
                      {sentimentLabel}
                    </span>
                    <span style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, fontWeight: 700 }}>
                      {review.playtime_hours}H PLAYED
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5, margin: 0 }}>
                    {review.text}
                  </p>
                </div>
              );
            })}
          </div>

          <div style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.25)', marginTop: 10, textAlign: 'right', letterSpacing: 1, fontWeight: 700 }}>
            SOURCE: STEAM · RECENT REVIEWS · REFRESHED EVERY 5 MIN
          </div>
        </section>
      )}

      {/* ══ RECENT INCIDENTS ════════════════════════════════ */}
      {incidents.length > 0 && (
        <section style={{ padding: '0 24px 40px', maxWidth: 1200, margin: '0 auto' }}>
          <SectionHeader label="RECENT INCIDENTS" count={incidents.length} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {incidents.map(function(inc) {
              var sevColor = inc.severity === 'critical' ? RED : inc.severity === 'major' ? ORANGE : YELLOW;
              return (
                <div key={inc.id} className="st-row" style={{ background: CARD_BG, border: '1px solid ' + BORDER, borderLeft: '2px solid ' + sevColor, borderRadius: '0 2px 2px 0', padding: '12px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, gap: 10, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 8, color: sevColor, background: sevColor + '15', border: '1px solid ' + sevColor + '35', borderRadius: 2, padding: '1px 6px', letterSpacing: 1, fontWeight: 700 }}>{(inc.severity || 'minor').toUpperCase()}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{inc.title}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {inc.resolved && (
                        <span style={{ fontFamily: 'monospace', fontSize: 8, color: GREEN, letterSpacing: 1, fontWeight: 700 }}>✓ RESOLVED</span>
                      )}
                      <span style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, fontWeight: 700 }}>{timeAgo(inc.created_at).toUpperCase()}</span>
                    </div>
                  </div>
                  {inc.description && (
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', margin: 0, lineHeight: 1.5 }}>{inc.description}</p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ══ WEEKLY RESET ════════════════════════════════════ */}
      <section style={{ padding: '0 24px 40px', maxWidth: 1200, margin: '0 auto' }}>
        <SectionHeader
          label="WEEKLY RESET"
          color={CYAN}
          rightLink={<span style={{ fontFamily: 'monospace', fontSize: 9, color: 'rgba(255,255,255,0.5)', letterSpacing: 1, fontWeight: 700 }}>TUESDAYS · 10AM PT / 1PM ET / 6PM GMT</span>}
        />

        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5, marginBottom: 14, maxWidth: 720 }}>
          Every Tuesday at 10AM Pacific, these systems reset. Plan your playtime around the reset to maximize weekly rewards and catch new contracts early.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 6 }}>
          {resetItems ? resetItems.map(function(item) {
            return (
              <div key={item.id} className="st-card" style={{ background: CARD_BG, border: '1px solid ' + BORDER, borderLeft: '2px solid ' + CYAN, borderRadius: '0 2px 2px 0', padding: '14px 16px' }}>
                <div style={{ fontFamily: 'monospace', fontSize: 9, color: CYAN, letterSpacing: 2, marginBottom: 6, fontWeight: 700 }}>{item.category}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 6 }}>{item.title}</div>
                {item.description && (
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5, margin: 0 }}>{item.description}</p>
                )}
              </div>
            );
          }) : RESET_DEFAULTS.map(function(item) {
            return (
              <div key={item.title} className="st-card" style={{ background: CARD_BG, border: '1px solid ' + BORDER, borderLeft: '2px solid ' + item.color, borderRadius: '0 2px 2px 0', padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 16, color: item.color }}>{item.icon}</span>
                  <span style={{ fontFamily: 'monospace', fontSize: 10, color: item.color, letterSpacing: 2, fontWeight: 700 }}>{item.title}</span>
                </div>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5, margin: 0 }}>{item.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ══ ERROR CODE REFERENCE (SEO GOLD) ═════════════════ */}
      <section style={{ padding: '0 24px 40px', maxWidth: 1200, margin: '0 auto' }}>
        <SectionHeader label="MARATHON ERROR CODES" count={ERROR_CODES.length + ' CODES'} />

        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5, marginBottom: 14, maxWidth: 720 }}>
          Common Marathon error codes and how to fix them. If none of these fixes work, post on Bungie&apos;s Help forum or report the issue to <a href="https://x.com/BungieHelp" target="_blank" rel="noopener noreferrer" style={{ color: CYAN, textDecoration: 'none' }}>@BungieHelp</a>.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {ERROR_CODES.map(function(err) {
            var sevColor = err.severity === 'high' ? RED : err.severity === 'medium' ? ORANGE : GREEN;
            return (
              <div key={err.code} className="st-row" style={{ display: 'grid', gridTemplateColumns: '110px 70px 1fr', gap: 12, alignItems: 'center', background: CARD_BG, border: '1px solid ' + BORDER, borderLeft: '2px solid ' + sevColor, borderRadius: '0 2px 2px 0', padding: '10px 14px' }}>
                <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 900, color: sevColor, letterSpacing: 1 }}>{err.code}</span>
                <span style={{ fontFamily: 'monospace', fontSize: 8, color: sevColor, background: sevColor + '14', border: '1px solid ' + sevColor + '33', borderRadius: 2, padding: '2px 6px', letterSpacing: 1, textAlign: 'center', fontWeight: 700 }}>{err.severity.toUpperCase()}</span>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', lineHeight: 1.5 }}>{err.desc}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* ══ CTA ═════════════════════════════════════════════ */}
      <section style={{ padding: '0 24px 64px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ background: CARD_BG, border: '1px solid ' + BORDER, borderLeft: '3px solid ' + GREEN, borderRadius: '0 2px 2px 0', padding: 24, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: 'monospace', fontSize: 9, color: GREEN, letterSpacing: 3, fontWeight: 700, marginBottom: 8 }}>SYSTEM STATUS HUB</div>
            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 18, fontWeight: 900, color: '#fff', letterSpacing: 1, lineHeight: 1.1, marginBottom: 10 }}>
              DOWN? OR<br /><span style={{ color: GREEN }}>YOUR CONNECTION?</span>
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>
              This page refreshes automatically every 60 seconds. Bookmark it and check before assuming the issue is on your end.
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              { href: '/sitrep',                                       label: 'LIVE SITREP',      sub: 'Meta + system snapshot',      color: CYAN    },
              { href: '/ranked',                                       label: 'RANKED GUIDE',     sub: 'Queue schedule + tier list',  color: YELLOW  },
              { href: 'https://discord.gg/PnhbdRYh3w',                 label: 'DISCORD',          sub: 'Outage chatter + community',  color: '#5865f2', external: true },
              { href: 'https://x.com/BungieHelp',                      label: '@BUNGIEHELP',      sub: 'Official Bungie support',     color: '#1da1f2', external: true },
              { href: 'https://help.bungie.net',                       label: 'BUNGIE HELP',      sub: 'Official knowledge base',     color: '#888',    external: true },
            ].map(function(link) {
              return (
                <Link key={link.href} href={link.href} {...(link.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})} className="st-btn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: CARD_BG, border: '1px solid ' + BORDER, borderLeft: '2px solid ' + link.color, borderRadius: '0 2px 2px 0', textDecoration: 'none' }}>
                  <div>
                    <div style={{ fontFamily: 'monospace', fontSize: 10, color: link.color, letterSpacing: 1, fontWeight: 700 }}>{link.label}</div>
                    <div style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, marginTop: 2, fontWeight: 700 }}>{link.sub}</div>
                  </div>
                  <span style={{ color: link.color, opacity: 0.5, fontSize: 13 }}>{link.external ? '↗' : '→'}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}