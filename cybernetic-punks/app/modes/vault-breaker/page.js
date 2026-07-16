// app/modes/vault-breaker/page.js
// ============================================================
// VAULT BREAKER — THE CANONICAL (July 16, 2026)
// ============================================================
// Marathon's first experimental PvE mode, July 21 - August 4, 2026. This is the
// properly-sourced page: every fact below comes from Bungie's own Mid-Season 2
// Update Preview (SOURCE_URL) and the June 23 key-dates/dev update.
//
// WHY THIS PAGE EXISTS: 29 live articles mention Vault Breaker and NONE of them
// cited bungie.net until today (only 2 do now, set by hand). They are news and
// build-context pieces - "what VB means for Triage", "players react". None answers
// "what is it / when / how does the currency work". This page owns that intent.
// It COEXISTS with the cluster rather than superseding it (different intent);
// see docs/HANDOFF.md for the consolidation note.
//
// FACTS ARE STATIC, DELIBERATELY. There is no game_modes row for Vault Breaker
// (banked as a separate task), so the facts live in the VAULT_BREAKER const
// below. That const is shaped like a game_modes row (mode_name / summary /
// available_on / is_limited_time / details / verified / updated_at) so swapping
// to a DB read later is a fetch + a destructure, not a rewrite. When that lands,
// the query MUST carry .eq('game_slug','marathon') from the start - every entity
// table is game-scoped and /weapons, /shells, /uniques still lack that filter
// (see docs/HANDOFF.md 2026-07-16, multi-game reference-routing).
//
// THE UESC COMMANDER: Tier 1 Vault Data has TWO sources, and the second - killing
// a UESC Commander, credited post-run whether or not you exfil - is omitted by
// ALL 29 existing articles. It is called out prominently below. It is the one
// genuinely new fact this page contributes.
//
// HEDGES (deliberate omissions, per the reconciliation pass):
//   - "Solo/Duo/Trio" verbatim. NOT "crew" - our own articles use "crew, duo, or
//     solo" and the official post says Solo/Duo/Trio. We say what Bungie says.
//   - NO "progression stays inside the mode" framing. The official post supports
//     "kit upgrades persist across runs" and nothing broader.
//   - Nothing here is inferred, extrapolated, or sourced from the pre-official
//     June cohort's secondhand relays.
//
// dateModified is a FIXED REAL DATE (FACTS_UPDATED), never new Date() - the
// false-freshness bug fixed in app/weapons/[slug]/page.js. It moves when the
// facts move, not when a crawler calls.

import Link from 'next/link';
import Footer from '@/components/Footer';

export const dynamic = 'force-dynamic';

// --- design tokens (match app/maps/[slug]/page.js) ---
const BG = '#121418';
const CARD_BG = '#1a1d24';
const DEEP_BG = '#0e1014';
const BORDER = '#22252e';
const BORDER_SUBTLE = '#1e2028';
const ORANGE = '#ff8800';   // the GAME MODES accent on /maps/[slug]
const CYAN = '#00d4ff';

const SOURCE_URL = 'https://www.bungie.net/7/en/News/Article/mid_season_2_preview';
const SOURCE_NAME = 'Marathon Mid-Season 2 Update Preview';
const SOURCE_DATE = '2026-07-16';

// The date the FACTS last changed (the Bungie preview's publication). Feeds
// dateModified. Update this when the source updates - not on every render.
const FACTS_UPDATED = '2026-07-16';

const PAGE_URL = 'https://cyberneticpunks.com/modes/vault-breaker';

// Shaped like a game_modes row so a future DB read drops straight in.
const VAULT_BREAKER = {
  mode_name: 'Vault Breaker',
  mode_type: 'experimental',
  available_on: 'Cryo Archive',
  is_limited_time: true,
  access_tier: 'free',
  verified: true,
  updated_at: FACTS_UPDATED,
  start_date: '2026-07-21',
  end_date: '2026-08-04',
  patch: 'Update 1.1.5',
  summary: 'Marathon\'s first experimental PvE mode: a roguelite run through progressively tougher Vaults inside Cryo Archive, played Solo, Duo, or Trio at any Runner Level. Runs July 21 to August 4, 2026 with Update 1.1.5.',
};

export const metadata = {
  // No '| CyberneticPunks' suffix - the layout title.template appends it.
  title: 'Marathon Vault Breaker - Dates, Vault Data & How It Works',
  description: 'Marathon Vault Breaker runs July 21 - August 4, 2026 (Update 1.1.5). The first experimental PvE mode: roguelite Vault runs in Cryo Archive, Solo/Duo/Trio, any Runner Level. How Vault Data, the Sponsored Kit, and the Armory work - sourced from Bungie.',
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: 'Marathon Vault Breaker - Dates, Vault Data & How It Works | CyberneticPunks',
    description: 'July 21 - August 4, 2026. Marathon\'s first experimental PvE mode: roguelite Vaults in Cryo Archive, Solo/Duo/Trio, any Runner Level. Vault Data, Sponsored Kit, and Armory explained.',
    url: PAGE_URL,
    siteName: 'CyberneticPunks',
    type: 'website',
    images: [{ url: 'https://cyberneticpunks.com/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@Cybernetic87250',
    title: 'Marathon Vault Breaker - Dates, Vault Data & How It Works',
    description: 'July 21 - Aug 4. First experimental PvE mode: roguelite Vaults in Cryo Archive, Solo/Duo/Trio, any Runner Level.',
    images: ['https://cyberneticpunks.com/og-image.png'],
  },
};

// FAQ items feed BOTH the visible section and the FAQPage JSON-LD, so they can
// never drift apart.
const FAQ_ITEMS = [
  {
    q: 'When does Marathon Vault Breaker start?',
    a: 'Vault Breaker runs from July 21 to August 4, 2026. It arrives with Update 1.1.5 and is a limited-time event.',
  },
  {
    q: 'How do you get Vault Data in Vault Breaker?',
    a: 'Tier 1 Vault Data comes from two sources: solving Vaults (you must exfil to keep it) and killing a UESC Commander (credited after the run whether or not you exfil). Tier 2 Vault Data comes only from solving consecutive Vaults in a single run and then exfilling.',
  },
  {
    q: 'Does gear carry out of Vault Breaker?',
    a: 'No. Items and gear found during a run do not exfil with you. Only event currency and designated event rewards leave the mode.',
  },
  {
    q: 'Is there a Runner Level requirement for Vault Breaker?',
    a: 'No. Vault Breaker is open at any Runner Level, and can be played Solo, Duo, or Trio, either matchmade or as a premade group.',
  },
];

export default function VaultBreakerPage() {
  var vb = VAULT_BREAKER;

  // --- JSON-LD ------------------------------------------------
  // BREADCRUMB: Home > Vault Breaker (TWO levels, deliberately).
  // The plan specified "Home > Modes > Vault Breaker", but /modes DOES NOT
  // EXIST - this is the only page under it. A breadcrumb crumb linking /modes
  // would 404, and BreadcrumbList items require a real URL. Shipping a canonical
  // whose own breadcrumb 404s is exactly what /mods refused to do in Increment 1.
  // When a /modes index exists, add the middle crumb here and in the visible nav.
  var breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://cyberneticpunks.com' },
      { '@type': 'ListItem', position: 2, name: 'Vault Breaker', item: PAGE_URL },
    ],
  };

  // EVENT: the schema that genuinely fits a dated, limited-time game mode.
  // Real startDate/endDate. eventAttendanceMode + VirtualLocation because it is
  // an in-game event, not a physical one. citation -> the Bungie source.
  var eventSchema = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: 'Marathon Vault Breaker',
    description: vb.summary,
    startDate: vb.start_date,
    endDate: vb.end_date,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
    location: {
      '@type': 'VirtualLocation',
      name: 'Cryo Archive - Marathon',
      url: 'https://cyberneticpunks.com/maps/cryo-archive',
    },
    organizer: { '@type': 'Organization', name: 'Bungie', url: 'https://www.bungie.net' },
    isAccessibleForFree: true,
    url: PAGE_URL,
    citation: {
      '@type': 'CreativeWork',
      name: SOURCE_NAME,
      url: SOURCE_URL,
      datePublished: SOURCE_DATE,
      publisher: { '@type': 'Organization', name: 'Bungie' },
    },
  };

  var webPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Marathon Vault Breaker - Dates, Vault Data & How It Works',
    description: 'Dates, Vault Data tiers, Sponsored Kit, and Armory stock for Marathon Vault Breaker, sourced from Bungie\'s Mid-Season 2 Update Preview.',
    url: PAGE_URL,
    mainEntity: eventSchema,
    // Honest freshness: a fixed date tied to the source, NOT new Date().
    dateModified: FACTS_UPDATED,
    publisher: { '@type': 'Organization', name: 'CyberneticPunks', url: 'https://cyberneticpunks.com' },
    citation: { '@type': 'CreativeWork', name: SOURCE_NAME, url: SOURCE_URL, datePublished: SOURCE_DATE },
  };

  var faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_ITEMS.map(function (item) {
      return { '@type': 'Question', name: item.q, acceptedAnswer: { '@type': 'Answer', text: item.a } };
    }),
  };

  return (
    <main style={{ background: BG, minHeight: '100vh', color: '#fff', paddingTop: 48, paddingBottom: 60 }}>
      <style>{`
        .vb-card { transition: background 0.12s, border-color 0.12s, transform 0.12s; }
        .vb-card:hover { background: #1e2228 !important; transform: translateY(-1px); }
      `}</style>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      {/* breadcrumb -- Home > Vault Breaker. No /modes crumb: that route does not exist. */}
      <nav aria-label="Breadcrumb" style={{ padding: '12px 24px', maxWidth: 1100, margin: '0 auto' }}>
        <ol style={{ display: 'flex', gap: 8, fontFamily: 'monospace', fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, listStyle: 'none', padding: 0, margin: 0, flexWrap: 'wrap', fontWeight: 700 }}>
          <li><Link href="/" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>HOME</Link></li>
          <li>/</li>
          <li style={{ color: ORANGE }}>VAULT BREAKER</li>
        </ol>
      </nav>

      {/* HERO */}
      <section style={{ padding: '24px 24px 32px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 18, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, color: ORANGE, background: ORANGE + '14', border: '1px solid ' + ORANGE + '40', borderRadius: 2, padding: '3px 10px', letterSpacing: 2 }}>
            LIMITED-TIME MODE
          </span>
          <span style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, color: ORANGE, background: ORANGE + '14', border: '1px solid ' + ORANGE + '40', borderRadius: 2, padding: '3px 10px', letterSpacing: 2 }}>
            JUL 21 &ndash; AUG 4
          </span>
          <span style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.04)', border: '1px solid ' + BORDER, borderRadius: 2, padding: '3px 10px', letterSpacing: 2 }}>
            {vb.patch.toUpperCase()}
          </span>
          <span style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.04)', border: '1px solid ' + BORDER, borderRadius: 2, padding: '3px 10px', letterSpacing: 2 }}>
            PVE
          </span>
        </div>

        <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: 'clamp(2rem, 5vw, 3.2rem)', fontWeight: 900, letterSpacing: 1, lineHeight: 1.05, margin: '0 0 16px', color: ORANGE }}>
          MARATHON VAULT BREAKER
        </h1>
        <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, maxWidth: 780, margin: '0 0 6px' }}>
          Dates, Vault Data, and how the mode works.
        </p>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.45)', lineHeight: 1.65, maxWidth: 780, margin: 0 }}>
          {vb.summary}
        </p>

        {/* SOURCE -- visible, not just in JSON-LD. This is the point of the page. */}
        <div style={{ marginTop: 20, padding: '10px 14px', background: DEEP_BG, border: '1px solid ' + BORDER, borderLeft: '3px solid ' + ORANGE, borderRadius: '0 2px 2px 0', maxWidth: 780 }}>
          <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: 'rgba(255,255,255,0.35)', fontWeight: 700, marginBottom: 4 }}>
            SOURCE
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
            Every fact on this page comes from Bungie&rsquo;s{' '}
            <a href={SOURCE_URL} target="_blank" rel="noopener noreferrer" style={{ color: ORANGE, textDecoration: 'underline' }}>
              {SOURCE_NAME}
            </a>
            {' '}(published {SOURCE_DATE}).
          </div>
        </div>
      </section>

      {/* AT A GLANCE */}
      <section style={{ padding: '0 24px 40px', maxWidth: 1100, margin: '0 auto' }}>
        <SectionHeader label="At a Glance" color={ORANGE} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 8 }}>
          <FactCard label="Dates" value="July 21 – August 4, 2026" />
          <FactCard label="Patch" value={vb.patch} />
          <FactCard label="Map" value="Cryo Archive" href="/maps/cryo-archive" />
          <FactCard label="Group size" value="Solo, Duo, or Trio" note="Matchmade or premade" />
          <FactCard label="Requirement" value="Any Runner Level" note="No level gate" />
          <FactCard label="Format" value="Roguelite PvE" note="Progressively tougher Vaults across multiple runs" />
        </div>
      </section>

      {/* VAULT DATA -- the centrepiece, and the UESC Commander gap */}
      <section style={{ padding: '0 24px 40px', maxWidth: 1100, margin: '0 auto' }}>
        <SectionHeader label="Vault Data" color={ORANGE} />
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.65, maxWidth: 780, margin: '0 0 16px' }}>
          Vault Data is the mode&rsquo;s currency and the main thing you carry out. It comes in two tiers,
          and they are earned differently.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))', gap: 10 }}>
          <div className="vb-card" style={{ background: CARD_BG, border: '1px solid ' + BORDER, borderTop: '2px solid ' + ORANGE, borderRadius: '0 0 2px 2px', padding: '16px 18px' }}>
            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 800, color: ORANGE, marginBottom: 10 }}>
              TIER 1 &mdash; TWO SOURCES
            </div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7 }}>
              <li><strong style={{ color: 'rgba(255,255,255,0.85)' }}>Solving Vaults</strong> &mdash; you must exfil to keep it.</li>
              <li>
                <strong style={{ color: 'rgba(255,255,255,0.85)' }}>Killing a UESC Commander</strong> &mdash; credited
                after the run <em>whether or not you exfil</em>.
              </li>
            </ul>
          </div>

          <div className="vb-card" style={{ background: CARD_BG, border: '1px solid ' + BORDER, borderTop: '2px solid ' + CYAN, borderRadius: '0 0 2px 2px', padding: '16px 18px' }}>
            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 800, color: CYAN, marginBottom: 10 }}>
              TIER 2 &mdash; ONE SOURCE
            </div>
            <p style={{ margin: 0, fontSize: 13.5, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7 }}>
              Solving <strong style={{ color: 'rgba(255,255,255,0.85)' }}>consecutive Vaults in a single run</strong>,
              then exfilling. That is the only way to earn it.
            </p>
          </div>
        </div>

        <div style={{ marginTop: 12, padding: '12px 14px', background: DEEP_BG, border: '1px solid ' + BORDER, borderRadius: 2, maxWidth: 780 }}>
          <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
            The UESC Commander is the source most coverage misses. Because it pays out even on a failed
            run, it is the one way to leave a bad run with something.
          </p>
        </div>
      </section>

      {/* WHAT LEAVES WITH YOU */}
      <section style={{ padding: '0 24px 40px', maxWidth: 1100, margin: '0 auto' }}>
        <SectionHeader label="What Leaves With You" color={ORANGE} />
        <div style={{ background: CARD_BG, border: '1px solid ' + BORDER, borderRadius: 2, padding: '16px 18px', maxWidth: 780 }}>
          <p style={{ margin: 0, fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7 }}>
            Items and gear you find during a run <strong style={{ color: '#fff' }}>do not exfil with you</strong>.
            The only things that leave the mode are <strong style={{ color: '#fff' }}>event currency and designated
            event rewards</strong>.
          </p>
        </div>
      </section>

      {/* SPONSORED KIT */}
      <section style={{ padding: '0 24px 40px', maxWidth: 1100, margin: '0 auto' }}>
        <SectionHeader label="The Sponsored Kit" color={ORANGE} />
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.65, maxWidth: 780, margin: '0 0 16px' }}>
          You do not bring your own loadout. Vault Breaker gives you a free Sponsored Kit from the
          Vault Breaker Armory tab in the Events section, and you build it up with Vault Data.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 8 }}>
          <FactCard label="Cost" value="Free" />
          <FactCard label="Where" value="Vault Breaker Armory tab" note="Events section" />
          <FactCard label="Starting kit" value="1 standard weapon + small equipment" note="It starts at its weakest" />
        </div>
        <div style={{ marginTop: 10, background: CARD_BG, border: '1px solid ' + BORDER, borderRadius: 2, padding: '16px 18px', maxWidth: 780 }}>
          <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: 'rgba(255,255,255,0.35)', fontWeight: 700, marginBottom: 8 }}>
            UPGRADE PATHS (SPEND VAULT DATA)
          </div>
          <ul style={{ margin: '0 0 10px', paddingLeft: 18, fontSize: 13.5, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7 }}>
            <li>Weapon quality</li>
            <li>Survivability</li>
            <li>Implants and cores</li>
          </ul>
          <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
            Kit upgrades persist across runs. <strong style={{ color: 'rgba(255,255,255,0.75)' }}>Cradle and Faction
            upgrades are enabled</strong> inside the mode.
          </p>
        </div>
      </section>

      {/* ARMORY */}
      <section style={{ padding: '0 24px 40px', maxWidth: 1100, margin: '0 auto' }}>
        <SectionHeader label="The Vault Breaker Armory" color={ORANGE} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 8, marginBottom: 10 }}>
          <FactCard label="Deluxe weapon" value="Daily rotating" />
          <FactCard label="Cryo Key Templates" value="Stocked" />
          <FactCard label="Prestige Weapons" value="One each per event" />
        </div>
        <div style={{ background: CARD_BG, border: '1px solid ' + BORDER, borderRadius: 2, padding: '16px 18px', maxWidth: 780 }}>
          <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: 'rgba(255,255,255,0.35)', fontWeight: 700, marginBottom: 8 }}>
            WEEKLY STOCK LIMITS
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7 }}>
            <li>Tier 1 items: 3&times; or 5&times; per week, depending on the item.</li>
            <li>Tier 2 items: 1&times; per week &mdash; or convert to Tier 1 and buy 5&times; per week.</li>
            <li>Prestige Weapons: one of each, per event.</li>
          </ul>
        </div>
      </section>

      {/* CODEX + CONTEXT */}
      <section style={{ padding: '0 24px 40px', maxWidth: 1100, margin: '0 auto' }}>
        <SectionHeader label="Codex & What Comes Next" color={ORANGE} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))', gap: 10 }}>
          <div className="vb-card" style={{ background: CARD_BG, border: '1px solid ' + BORDER, borderRadius: 2, padding: '16px 18px' }}>
            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 800, color: '#fff', marginBottom: 8 }}>
              Codex Challenges
            </div>
            <p style={{ margin: 0, fontSize: 13.5, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7 }}>
              Four Codex challenges run with the event, rewarding cosmetics.
            </p>
          </div>
          <div className="vb-card" style={{ background: CARD_BG, border: '1px solid ' + BORDER, borderRadius: 2, padding: '16px 18px' }}>
            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 800, color: '#fff', marginBottom: 8 }}>
              Why It Is An Experiment
            </div>
            <p style={{ margin: 0, fontSize: 13.5, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7 }}>
              Bungie frames Vault Breaker as a test ahead of a full PvE offering in
              Season 3, which arrives September 22, 2026.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ -- same source as the FAQPage JSON-LD */}
      <section style={{ padding: '0 24px 40px', maxWidth: 1100, margin: '0 auto' }}>
        <SectionHeader label="FAQ" color={ORANGE} />
        <div style={{ display: 'grid', gap: 8, maxWidth: 780 }}>
          {FAQ_ITEMS.map(function (item, i) {
            return (
              <div key={i} style={{ background: CARD_BG, border: '1px solid ' + BORDER, borderRadius: 2, padding: '14px 16px' }}>
                <h3 style={{ fontSize: 14, fontWeight: 800, color: '#fff', margin: '0 0 6px', lineHeight: 1.4 }}>{item.q}</h3>
                <p style={{ margin: 0, fontSize: 13.5, color: 'rgba(255,255,255,0.55)', lineHeight: 1.65 }}>{item.a}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* SOURCE FOOTER */}
      <section style={{ padding: '0 24px 40px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ borderTop: '1px solid ' + BORDER_SUBTLE, paddingTop: 16, maxWidth: 780 }}>
          <p style={{ margin: 0, fontSize: 12.5, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
            Sourced from Bungie&rsquo;s{' '}
            <a href={SOURCE_URL} target="_blank" rel="noopener noreferrer" style={{ color: ORANGE, textDecoration: 'underline' }}>
              {SOURCE_NAME}
            </a>
            , published {SOURCE_DATE}. Facts last checked against the source on {FACTS_UPDATED}.
            Vault Breaker is a limited-time event; details may change when the mode goes live.
          </p>
          <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Link href="/maps/cryo-archive" className="vb-card" style={{ display: 'inline-block', background: CARD_BG, border: '1px solid ' + BORDER, borderRadius: 3, padding: '7px 14px', color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontFamily: 'Orbitron, monospace', fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>
              Cryo Archive Map
            </Link>
            <Link href="/shells" className="vb-card" style={{ display: 'inline-block', background: CARD_BG, border: '1px solid ' + BORDER, borderRadius: 3, padding: '7px 14px', color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontFamily: 'Orbitron, monospace', fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>
              Shells
            </Link>
            <Link href="/intel" className="vb-card" style={{ display: 'inline-block', background: CARD_BG, border: '1px solid ' + BORDER, borderRadius: 3, padding: '7px 14px', color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontFamily: 'Orbitron, monospace', fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>
              Latest Intel
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

// Mirrors the SectionHeader in app/maps/[slug]/page.js.
function SectionHeader({ label, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
      <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: 14, fontWeight: 800, color: color, letterSpacing: 2, margin: 0, textTransform: 'uppercase' }}>{label}</h2>
      <div style={{ flex: 1, height: 1, background: BORDER_SUBTLE }} />
    </div>
  );
}

function FactCard({ label, value, note, href }) {
  var inner = (
    <>
      <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: 'rgba(255,255,255,0.35)', fontWeight: 700, marginBottom: 6 }}>
        {label.toUpperCase()}
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', lineHeight: 1.35 }}>{value}</div>
      {note && (
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5, marginTop: 4 }}>{note}</div>
      )}
    </>
  );
  var style = { background: CARD_BG, border: '1px solid ' + BORDER, borderRadius: 2, padding: '14px 16px', display: 'block', textDecoration: 'none' };
  if (href) {
    return <Link href={href} className="vb-card" style={style}>{inner}</Link>;
  }
  return <div className="vb-card" style={style}>{inner}</div>;
}
