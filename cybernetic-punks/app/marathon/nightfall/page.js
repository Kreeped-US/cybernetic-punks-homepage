// app/marathon/nightfall/page.js
// ============================================================
// MARATHON NIGHTFALL REFRESH SCHEDULE -- self-managing dated hub (built 2026-09-17)
// ============================================================
// The Nightfall Refresh is Bungie's Oct 6 - Dec 7, 2026 bridge period before the
// Symbiosis update (Dec 8). This page is the week-by-week "what's playable" reference.
//
// SELF-MANAGING (the whole point): the page date-gates its own state SERVER-SIDE
// (SSR force-dynamic, computed from Date.now() -- NOT a client ticker, so no hydration
// mismatch), so it never needs a redirect or a manual swap to avoid becoming a dead URL:
//   - before Oct 6         -> PREVIEW  (countdown + the confirmed schedule)
//   - Oct 6 .. Dec 7       -> ACTIVE   (live calendar; current week computed + highlighted)
//   - after Dec 7          -> HISTORICAL (record of the Refresh + "Symbiosis is now live"
//                             handoff to /marathon/pve). Same URL, no 301, no delete.
//
// SOURCE FIDELITY: the schedule is transcribed VERBATIM from the @MarathonDevTeam
// Nightfall Refresh CALENDAR IMAGE (operator-verified) + Bungie's bungie.net dev update
// (the reset framing). The calendar gives the exact Mon-Sun week ranges (Week 1 =
// Oct 6-12 ... Week 9 = Dec 1-7, MID REFRESH at Week 5) and the exact per-week item
// list -- see WEEKS below, which holds them unchanged. currentWeekNum() is pinned to
// those real ranges (not 7-day arithmetic). Nothing is inferred or added; only what the
// calendar shows.
//
// NO fabricated content: every line below is Bungie-stated. LAST_UPDATED is a fixed
// honest date, never new Date(). Design tokens match /marathon/pve + /marathon/modes/
// vault-breaker (the orange PvE/modes family).

import Link from 'next/link';

export const dynamic = 'force-dynamic';

// --- design tokens (match /marathon/pve + vault-breaker) ---
const BG = '#121418';
const CARD_BG = '#1a1d24';
const DEEP_BG = '#0e1014';
const BORDER = '#22252e';
const BORDER_SUBTLE = '#1e2028';
const ORANGE = '#ff8800';
const CYAN = '#00d4ff';
const GREEN = '#00ff88';
const RED = '#ff4444';

const PAGE_URL = 'https://cyberneticpunks.com/marathon/nightfall';

// Window anchors (the only absolute dates the source states).
const WINDOW_START_ISO = '2026-10-06T17:00:00Z'; // Nightfall Refresh begins Oct 6, 2026
const WINDOW_END_ISO   = '2026-12-08T17:00:00Z'; // ends when Symbiosis launches Dec 8 (Refresh runs through Dec 7)
const SYMBIOSIS_LABEL  = 'December 8, 2026';
const LAST_UPDATED = '2026-09-17'; // when this page was last checked against its sources

// Sources -- ONE definition feeding the visible source line, the footer, and the
// JSON-LD citation, so visible text and structured data can never disagree. The X post
// is the authoritative calendar; the bungie.net article carries the reset/economy framing.
const SOURCES = [
  {
    name: 'Marathon Dev Team: Nightfall Refresh schedule',
    url: 'https://x.com/MarathonDevTeam/status/2100253598609535344',
    date: '2026-09-16',
  },
  {
    name: 'Bungie Dev Update: Nightfall Refresh and Symbiosis',
    url: 'https://www.bungie.net/7/en/News/Article/nightfallrefreshandsymbiosis',
    date: '2026-09-14',
  },
];

// Runs the ENTIRE window (not week-gated).
const ALWAYS = [
  { label: 'Ranked', value: 'UNAVAILABLE the entire window', note: 'Bungie is reworking Ranked; it does not run during the Refresh.', tone: 'paused' },
  { label: 'Regular Extraction', value: 'Available in each zone throughout', note: 'The standard extraction loop stays on alongside the sponsored queues.', tone: 'ok' },
  { label: 'NuCaloric Reward Pass', value: 'Free, not time-limited', note: 'Available to everyone who owns Marathon; complete it at your own pace.', tone: 'ok' },
];

// The Sponsored Queues 3-week rotation (kit-only Extraction, weekends Thu-Mon),
// repeats until Symbiosis. Index 0 = week 1 of each 3-week cycle.
const ROTATION = ['Sponsored Perimeter', 'Sponsored Marsh', 'Sponsored Night Marsh'];

// The 9 weeks of the Refresh, VERBATIM from the @MarathonDevTeam calendar image
// (operator-verified against the source). Each week: its real Mon-Sun date range, the
// week-1-based startISO (00:00 PT = 07:00 UTC) used to map "today" to the current week,
// and the exact per-week item list. Do NOT infer or add -- only what the calendar shows.
const WEEKS = [
  { n: 1, range: 'Oct 6 - 12',      startISO: '2026-10-06T07:00:00Z', items: ['Sponsored Map: Perimeter', 'Outpost Locked', 'Login Rewards 2'] },
  { n: 2, range: 'Oct 13 - 19',     startISO: '2026-10-13T07:00:00Z', items: ['Cryo Archive', 'Sponsored Map: Marsh', 'CARRI Phase I', 'Login Rewards 3', 'Double Runner XP'] },
  { n: 3, range: 'Oct 20 - 26',     startISO: '2026-10-20T07:00:00Z', items: ['Cryo Archive', 'Sponsored Map: Night Marsh', 'Vault Breaker', 'CARRI Phase I', 'Login Rewards 4'] },
  { n: 4, range: 'Oct 27 - Nov 2',  startISO: '2026-10-27T07:00:00Z', items: ['Cryo Archive', 'Sponsored Map: Perimeter', 'Vault Breaker', 'CARRI Phase II', 'Login Rewards 5', 'Double Faction Rep', 'Enhanced Sponsored Kits'] },
  { n: 5, range: 'Nov 3 - 9',       startISO: '2026-11-03T08:00:00Z', mid: true, items: ['Cryo Archive', 'Sponsored Map: Marsh', 'Vault Breaker', 'CARRI Phase II', 'Login Rewards 6', 'Double Runner XP', 'Enhanced Sponsored Kits'] },
  { n: 6, range: 'Nov 10 - 16',     startISO: '2026-11-10T08:00:00Z', items: ['Cryo Archive', 'Sponsored Map: Night Marsh', 'Sponsored Survival: Perimeter', 'Firestorm Refresh', 'CARRI Phase II', 'Login Rewards 7', 'Enhanced Sponsored Kits'] },
  { n: 7, range: 'Nov 17 - 23',     startISO: '2026-11-17T08:00:00Z', items: ['Cryo Archive', 'Sponsored Map: Perimeter', 'Sponsored Survival: Marsh', 'Firestorm Refresh', 'CARRI Phase II', 'Enhanced Sponsored Kits'] },
  { n: 8, range: 'Nov 24 - 30',     startISO: '2026-11-24T08:00:00Z', items: ['Cryo Archive', 'Sponsored Map: Marsh', 'Sponsored Survival: Night Marsh', 'CARRI Phase III', 'Login Rewards 8', 'Double XP and Faction Rep', 'Enhanced Sponsored Kits'] },
  { n: 9, range: 'Dec 1 - 7',       startISO: '2026-12-01T08:00:00Z', items: ['Cryo Archive', 'Sponsored Map: Night Marsh', 'Sponsored Survival: Outpost', 'CARRI Phase III', 'Login Rewards 9', 'Double XP and Faction Rep', 'Enhanced Sponsored Kits'] },
];

export const metadata = {
  title: { absolute: 'Marathon Nightfall Refresh Schedule (Oct 6 - Dec 7): What to Play Each Week' },
  description: "The full Marathon Nightfall Refresh schedule (Oct 6 - Dec 7, 2026): sponsored queue rotation, Cryo Archive weekly from Oct 15, Vault Breaker weeks 3-5, Sponsored Survival, CARRI, Enhanced Kits, and the free NuCaloric pass. Ranked is paused the whole window. Bridges into Symbiosis on Dec 8. Sourced from Bungie.",
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: 'Marathon Nightfall Refresh Schedule (Oct 6 - Dec 7) | Cybernetic Punks',
    description: "What's playable each week of the Marathon Nightfall Refresh: sponsored queues, Cryo Archive, Vault Breaker (wks 3-5), Sponsored Survival, CARRI. Ranked paused. Into Symbiosis Dec 8. Sourced from Bungie.",
    url: PAGE_URL,
    siteName: 'Cybernetic Punks',
    type: 'website',
    images: [{ url: 'https://cyberneticpunks.com/marathon/opengraph-image', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@Cybernetic87250',
    title: 'Marathon Nightfall Refresh Schedule (Oct 6 - Dec 7)',
    description: "What's playable each week: sponsored queues, Cryo Archive, Vault Breaker wks 3-5, Sponsored Survival, CARRI. Ranked paused. Into Symbiosis Dec 8.",
    images: ['https://cyberneticpunks.com/marathon/opengraph-image'],
  },
};

// --- server-side date gating (no client ticker -> no hydration mismatch) ---
function computePhase() {
  var now = Date.now();
  var start = new Date(WINDOW_START_ISO).getTime();
  var end = new Date(WINDOW_END_ISO).getTime();
  if (now < start) return { phase: 'pre', now: now, start: start, end: end };
  if (now >= end) return { phase: 'post', now: now, start: start, end: end };
  return { phase: 'active', now: now, start: start, end: end };
}
function daysUntil(ms) { return Math.ceil((ms - Date.now()) / 86400000); }
// Current week number, PINNED to the calendar's real Mon-Sun ranges: the highest week
// whose startISO is <= now. During the active window (Oct 6 .. Dec 8) this maps today
// to weeks 1..9 exactly per the calendar image. Server-computed, no client ticker.
function currentWeekNum() {
  var now = Date.now();
  var wk = WEEKS[0].n;
  for (var i = 0; i < WEEKS.length; i++) {
    if (now >= new Date(WEEKS[i].startISO).getTime()) wk = WEEKS[i].n;
  }
  return wk;
}
// The Sponsored Map for a given week, derived from that week's own item list (not a
// separate rotation const) so the highlight can never drift from the transcribed data.
function sponsoredZoneOf(week) {
  if (!week) return null;
  var m = week.items.find(function (x) { return x.indexOf('Sponsored Map:') === 0; });
  return m ? 'Sponsored ' + m.replace('Sponsored Map: ', '') : null;
}

export default function NightfallPage() {
  var st = computePhase();
  var phase = st.phase;
  var weekNum = phase === 'active' ? currentWeekNum() : null;
  var currentWeekObj = weekNum ? WEEKS[weekNum - 1] : null;
  var featuredZone = sponsoredZoneOf(currentWeekObj);

  var citations = SOURCES.map(function (s) {
    return { '@type': 'CreativeWork', name: s.name, url: s.url, datePublished: s.date, publisher: { '@type': 'Organization', name: 'Bungie' } };
  });

  var breadcrumbSchema = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://cyberneticpunks.com' },
      { '@type': 'ListItem', position: 2, name: 'Nightfall Refresh', item: PAGE_URL },
    ],
  };

  // EVENT: dated, limited-time in-game event. Real start/end dates; keeps them in the
  // HISTORICAL state too (an accurate record of a past event). No Product type.
  var eventSchema = {
    '@context': 'https://schema.org', '@type': 'Event',
    name: 'Marathon Nightfall Refresh',
    description: 'The Nightfall Refresh: Marathon\'s Oct 6 - Dec 7, 2026 rotating schedule of sponsored queues, Cryo Archive, Vault Breaker, Sponsored Survival, and CARRI, bridging into the Symbiosis update on Dec 8. Ranked is unavailable during the window.',
    startDate: '2026-10-06',
    endDate: '2026-12-07',
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
    location: { '@type': 'VirtualLocation', name: 'Marathon', url: 'https://cyberneticpunks.com/marathon' },
    organizer: { '@type': 'Organization', name: 'Bungie', url: 'https://www.bungie.net' },
    isAccessibleForFree: true,
    url: PAGE_URL,
    citation: citations,
  };

  var webPageSchema = {
    '@context': 'https://schema.org', '@type': 'WebPage',
    name: 'Marathon Nightfall Refresh Schedule (Oct 6 - Dec 7)',
    description: 'The week-by-week Marathon Nightfall Refresh schedule, sourced from Bungie.',
    url: PAGE_URL,
    mainEntity: eventSchema,
    dateModified: LAST_UPDATED,
    publisher: { '@type': 'Organization', name: 'Cybernetic Punks', url: 'https://cyberneticpunks.com' },
    citation: citations,
  };

  // --- phase-driven hero copy ---
  var heroPills, heroTitle, heroLede, statusStrip;
  if (phase === 'pre') {
    var d = daysUntil(st.start);
    heroPills = [{ t: 'BEGINS OCT 6, 2026', c: ORANGE }, { t: 'THROUGH DEC 7', c: CYAN }, { t: 'CONFIRMED SCHEDULE', c: 'rgba(255,255,255,0.5)' }];
    heroTitle = 'Marathon Nightfall Refresh Schedule';
    heroLede = 'The Nightfall Refresh begins October 6, 2026 and runs through December 7, bridging into the Symbiosis update on December 8. Here is the confirmed week-by-week schedule of what will be playable.';
    statusStrip = { dot: ORANGE, big: (d > 1 ? d + ' days away' : d === 1 ? 'Tomorrow' : 'Begins today'), sub: 'Starts October 6, 2026' };
  } else if (phase === 'active') {
    heroPills = [{ t: 'LIVE NOW', c: GREEN }, { t: 'WEEK ' + weekNum, c: ORANGE }, { t: 'THROUGH DEC 7', c: CYAN }];
    heroTitle = 'Marathon Nightfall Refresh Schedule';
    heroLede = 'The Nightfall Refresh is live, running through December 7 before Symbiosis on December 8. Here is what is playable each week.';
    statusStrip = { dot: GREEN, big: 'Week ' + weekNum + ' of the Refresh', sub: featuredZone ? 'This week\'s sponsored zone: ' + featuredZone : null };
  } else {
    heroPills = [{ t: 'ENDED DEC 7, 2026', c: 'rgba(255,255,255,0.5)' }, { t: 'SYMBIOSIS IS LIVE', c: GREEN }];
    heroTitle = 'The Nightfall Refresh (Oct 6 - Dec 7, 2026)';
    heroLede = 'The Nightfall Refresh has ended and the Symbiosis update is now live. This is the record of how the bridge to Symbiosis played out. For what is live now, head to the Marathon PvE hub.';
    statusStrip = { dot: GREEN, big: 'Symbiosis is now live', sub: null, href: '/marathon/pve', hrefLabel: 'Go to the Marathon PvE hub →' };
  }

  var sectionWrap = { padding: '0 24px 40px', maxWidth: 1100, margin: '0 auto' };

  return (
    <main style={{ background: BG, minHeight: '100vh', color: '#fff', paddingTop: 48, paddingBottom: 60 }}>
      <style>{`
        .nf-card { transition: background 0.12s, border-color 0.12s, transform 0.12s; }
        .nf-card:hover { background: #1e2228 !important; transform: translateY(-1px); }
      `}</style>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }} />

      {/* Breadcrumb -- Home > Nightfall Refresh (2 levels; no /modes crumb -> no 404 crumb) */}
      <nav aria-label="Breadcrumb" style={{ padding: '12px 24px', maxWidth: 1100, margin: '0 auto' }}>
        <ol style={{ display: 'flex', gap: 8, fontFamily: 'monospace', fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, listStyle: 'none', padding: 0, margin: 0, flexWrap: 'wrap', fontWeight: 700 }}>
          <li><Link href="/" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>HOME</Link></li>
          <li>/</li>
          <li style={{ color: ORANGE }}>NIGHTFALL REFRESH</li>
        </ol>
      </nav>

      {/* HERO */}
      <section style={{ padding: '20px 24px 32px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 18, flexWrap: 'wrap' }}>
          {heroPills.map(function (p, i) {
            return (
              <span key={i} style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, color: p.c, background: (p.c.indexOf('rgba') === 0 ? 'rgba(255,255,255,0.04)' : p.c + '14'), border: '1px solid ' + (p.c.indexOf('rgba') === 0 ? BORDER : p.c + '40'), borderRadius: 2, padding: '3px 10px', letterSpacing: 2 }}>{p.t}</span>
            );
          })}
        </div>

        <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: 'clamp(1.9rem, 5vw, 3.1rem)', fontWeight: 900, letterSpacing: 1, lineHeight: 1.05, margin: '0 0 16px', color: ORANGE }}>
          {heroTitle}
        </h1>
        <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, maxWidth: 800, margin: '0 0 6px' }}>
          {heroLede}
        </p>

        {/* STATUS STRIP -- server-computed phase/week */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginTop: 14, padding: '10px 16px', background: DEEP_BG, border: '1px solid ' + BORDER, borderLeft: '3px solid ' + statusStrip.dot, borderRadius: '0 3px 3px 0', flexWrap: 'wrap' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: statusStrip.dot, boxShadow: '0 0 8px ' + statusStrip.dot }} />
          <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 15, fontWeight: 800, color: '#fff' }}>{statusStrip.big}</span>
          {statusStrip.sub && <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>&middot; {statusStrip.sub}</span>}
          {statusStrip.href && <Link href={statusStrip.href} style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: GREEN, textDecoration: 'none', letterSpacing: 1 }}>{statusStrip.hrefLabel}</Link>}
        </div>

        {/* SOURCE -- visible, not just JSON-LD */}
        <div style={{ marginTop: 20, padding: '10px 14px', background: DEEP_BG, border: '1px solid ' + BORDER, borderLeft: '3px solid ' + ORANGE, borderRadius: '0 2px 2px 0', maxWidth: 800 }}>
          <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: 'rgba(255,255,255,0.35)', fontWeight: 700, marginBottom: 4 }}>SOURCE</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
            Every date on this page is Bungie-stated: <SourceList />.
          </div>
        </div>
      </section>

      {/* POST-STATE HANDOFF (only after Dec 7) */}
      {phase === 'post' && (
        <section style={sectionWrap}>
          <div style={{ padding: '16px 18px', background: CARD_BG, border: '1px solid ' + BORDER, borderLeft: '3px solid ' + GREEN, borderRadius: '0 2px 2px 0', maxWidth: 800 }}>
            <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: GREEN, fontWeight: 700, marginBottom: 6 }}>SYMBIOSIS IS LIVE</div>
            <p style={{ margin: 0, fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7 }}>
              The Nightfall Refresh ran October 6 to December 7, 2026. Symbiosis launched December 8. For the current PvE experience and what is live now, see the{' '}
              <Link href="/marathon/pve" style={{ color: GREEN, textDecoration: 'underline' }}>Marathon PvE hub</Link>. The schedule below is kept as a record of the Refresh.
            </p>
          </div>
        </section>
      )}

      {/* RUNS ALL WINDOW */}
      <section style={sectionWrap}>
        <SectionHeader label="All Through the Window (Oct 6 - Dec 7)" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 10 }}>
          {ALWAYS.map(function (a) {
            var col = a.tone === 'paused' ? RED : a.tone === 'ok' ? GREEN : ORANGE;
            return (
              <div key={a.label} className="nf-card" style={{ background: CARD_BG, border: '1px solid ' + BORDER, borderTop: '2px solid ' + col, borderRadius: '0 0 2px 2px', padding: '16px 18px' }}>
                <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 800, color: col, marginBottom: 6 }}>{a.label}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', lineHeight: 1.4, marginBottom: 6 }}>{a.value}</div>
                <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>{a.note}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* WEEK-BY-WEEK GRID -- the exact calendar */}
      <section style={sectionWrap}>
        <SectionHeader label="The Schedule, Week by Week" />
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, maxWidth: 800, margin: '0 0 16px' }}>
          The confirmed week-by-week calendar (Oct 6 - Dec 7). Vault Breaker links to its own page.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 10 }}>
          {WEEKS.map(function (w) {
            var isNow = weekNum === w.n;
            return (
              <div key={w.n} className="nf-card" style={{ background: isNow ? ORANGE + '14' : CARD_BG, border: '1px solid ' + (isNow ? ORANGE + '80' : BORDER), borderTop: '2px solid ' + (isNow ? ORANGE : BORDER_SUBTLE), borderRadius: '0 0 2px 2px', padding: '14px 16px' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap', marginBottom: 8 }}>
                  <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 14, fontWeight: 800, color: isNow ? ORANGE : '#fff' }}>Week {w.n}</span>
                  <span style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: 1 }}>{w.range}</span>
                  {w.mid && <span style={{ fontFamily: 'monospace', fontSize: 8, fontWeight: 700, color: CYAN, background: CYAN + '14', border: '1px solid ' + CYAN + '40', borderRadius: 2, padding: '1px 6px', letterSpacing: 1 }}>MID REFRESH</span>}
                  {isNow && <span style={{ fontFamily: 'monospace', fontSize: 8, fontWeight: 700, color: ORANGE, background: ORANGE + '18', border: '1px solid ' + ORANGE + '80', borderRadius: 2, padding: '1px 6px', letterSpacing: 1 }}>THIS WEEK</span>}
                </div>
                <ul style={{ margin: 0, paddingLeft: 16, fontSize: 13, color: 'rgba(255,255,255,0.62)', lineHeight: 1.7 }}>
                  {w.items.map(function (it) {
                    if (it === 'Vault Breaker') {
                      return <li key={it}><Link href="/marathon/modes/vault-breaker" style={{ color: ORANGE, textDecoration: 'underline' }}>Vault Breaker</Link></li>;
                    }
                    return <li key={it}>{it}</li>;
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      {/* SPONSORED ROTATION (visual) */}
      <section style={sectionWrap}>
        <SectionHeader label="Sponsored Queue Rotation" />
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, maxWidth: 800, margin: '0 0 14px' }}>
          Kit-only Extraction, weekends Thursday to Monday. Three-week cycle, repeating until Symbiosis. Regular Extraction stays available in each zone.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
          {ROTATION.map(function (zone, i) {
            var isFeatured = featuredZone === zone;
            return (
              <div key={zone} className="nf-card" style={{ background: isFeatured ? ORANGE + '18' : CARD_BG, border: '1px solid ' + (isFeatured ? ORANGE + '80' : BORDER), borderRadius: 2, padding: '14px 16px' }}>
                <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: 'rgba(255,255,255,0.35)', fontWeight: 700, marginBottom: 6 }}>WEEK {i + 1} OF THE CYCLE{isFeatured ? ' · THIS WEEK' : ''}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: isFeatured ? ORANGE : '#fff', lineHeight: 1.35 }}>{zone}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* RANKED PAUSE CALLOUT */}
      <section style={sectionWrap}>
        <div style={{ padding: '14px 16px', background: DEEP_BG, border: '1px solid ' + BORDER, borderLeft: '3px solid ' + RED, borderRadius: '0 2px 2px 0', maxWidth: 800 }}>
          <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: RED, fontWeight: 700, marginBottom: 6 }}>RANKED IS PAUSED</div>
          <p style={{ margin: 0, fontSize: 13.5, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7 }}>
            Ranked is unavailable for the entire Nightfall Refresh while Bungie reworks it. See the{' '}
            <Link href="/marathon/ranked" style={{ color: CYAN, textDecoration: 'underline' }}>Ranked page</Link> for details and the frozen tier reference.
          </p>
        </div>
      </section>

      {/* RELATED */}
      <section style={sectionWrap}>
        <div style={{ borderTop: '1px solid ' + BORDER_SUBTLE, paddingTop: 16, maxWidth: 800 }}>
          <p style={{ margin: '0 0 12px', fontSize: 12.5, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
            Sourced from Bungie&rsquo;s <SourceList />. Checked against source on {LAST_UPDATED}. The Nightfall Refresh is a limited window; details may shift if Bungie updates the schedule.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[
              { href: '/marathon/pve', label: 'Marathon PvE (Dec 8)' },
              { href: '/marathon/ranked', label: 'Ranked (paused)' },
              { href: '/marathon/modes/vault-breaker', label: 'Vault Breaker' },
              { href: '/marathon/intel', label: 'Latest Intel' },
            ].map(function (l) {
              return (
                <Link key={l.href} href={l.href} className="nf-card" style={{ display: 'inline-block', background: CARD_BG, border: '1px solid ' + BORDER, borderRadius: 3, padding: '7px 14px', color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontFamily: 'Orbitron, monospace', fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>{l.label}</Link>
              );
            })}
          </div>
        </div>
      </section>

    </main>
  );
}

// Renders SOURCES as linked citations -- used by the hero source block AND the footer,
// so the two can never list different sources, and neither drifts from the JSON-LD
// (which builds `citation` from the same const).
function SourceList() {
  return (
    <>
      {SOURCES.map(function (s, i) {
        return (
          <span key={s.url}>
            {i > 0 ? (i === SOURCES.length - 1 ? ', and ' : ', ') : ''}
            <a href={s.url} target="_blank" rel="noopener noreferrer" style={{ color: ORANGE, textDecoration: 'underline' }}>{s.name}</a>
            {' '}({s.date})
          </span>
        );
      })}
    </>
  );
}

function SectionHeader({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
      <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: 14, fontWeight: 800, color: ORANGE, letterSpacing: 2, margin: 0, textTransform: 'uppercase' }}>{label}</h2>
      <div style={{ flex: 1, height: 1, background: BORDER_SUBTLE }} />
    </div>
  );
}
