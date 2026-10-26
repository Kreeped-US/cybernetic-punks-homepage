// app/modes/vault-breaker/page.js
// ============================================================
// VAULT BREAKER — THE CANONICAL (July 16, 2026)
// ============================================================
// Marathon's first experimental PvE mode, July 21 - August 4, 2026. This is the
// properly-sourced page. Every fact below comes from an official Bungie post --
// see the SOURCES array, which is the single definition feeding all four
// citation sites. There is more than one source and there always was; the
// rendered text claimed otherwise until 2026-07-21 (see SOURCES for why).
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
// CONTRACT NOTE (2026-07-20): `available_on` was 'Cryo Archive' -- a DISPLAY
// NAME, which violates the column's contract (`map slug(s) or "all"`). The
// "drops straight in" claim above was therefore FALSE for this field: the value
// would have failed lib/availability.js's slug match and rendered on no map at
// all. Now 'cryo-archive'. If you add fields here, write them as the DB expects
// them, not as they read on screen.
//
// THE UESC COMMANDER: Tier 1 Vault Data has TWO sources, and the second - killing
// a UESC Commander, credited post-run whether or not you exfil - is omitted by
// ALL 29 existing articles. It is called out prominently below. It is the one
// genuinely new fact this page contributes.
//
// HEDGES (deliberate omissions, per the reconciliation pass):
//   - "Solo/Duo/Trio" verbatim. CONFIRMED IN GAME 2026-07-21.
//     The rationale here used to be that "crew, duo, or solo" was OUR phrasing
//     and not Bungie's. That was FALSIFIED by the 2026-07-20 Vault Breaker
//     Overview, which says "Play as a crew, duo, or solo" in Bungie's own words.
//     Bungie uses BOTH constructions: "crew" is their term for a pre-made group,
//     per the preview's "Crews and Queues" section ("we'll have Duos and Trios -
//     both for matchmade and pre-made Crews"). So the two are not in conflict --
//     a Trio is a crew of three. We keep Solo/Duo/Trio because it states the
//     group SIZES, which "crew" does not, and because it is now game-verified.
//   - NO "progression stays inside the mode" framing. The official post supports
//     "kit upgrades persist across runs" and nothing broader.
//   - Nothing here is inferred, extrapolated, or sourced from the pre-official
//     June cohort's secondhand relays.
//
// dateModified is a FIXED REAL DATE, never new Date() - the false-freshness bug
// fixed in app/weapons/[slug]/page.js. Since Brief 134 it is CONTENT_CHANGED (when
// the page's content last changed); the visible "Checked against" line keeps
// FACTS_UPDATED (when the facts were last checked against the sources). Both live
// in lib/vaultBreaker.js.

import Link from 'next/link';
import { FACTS_UPDATED, CONTENT_CHANGED, FIRST_RUN, RETURN_RUN, runLabel } from '@/lib/vaultBreaker';
import { safeJsonLd } from '@/lib/security/safeJsonLd';

export const dynamic = 'force-dynamic';

// --- design tokens (match app/maps/[slug]/page.js) ---
const BG = '#121418';
const CARD_BG = '#1a1d24';
const DEEP_BG = '#0e1014';
const BORDER = '#22252e';
const BORDER_SUBTLE = '#1e2028';
const ORANGE = '#ff8800';   // the GAME MODES accent on /maps/[slug]
const CYAN = '#00d4ff';

// ALL sources this page draws on, in ONE place. Feeds FOUR sites -- the hero
// SOURCE block, the footer, eventSchema.citation and webPageSchema.citation --
// so the visible text and the JSON-LD cannot list different sources. Same
// single-definition discipline FAQ_ITEMS already uses for the FAQ section.
//
// WHY THIS IS AN ARRAY (2026-07-21). It was a single SOURCE_* triple, and the
// rendered text asserted "Every fact on this page comes from Bungie's Mid-Season
// 2 Update Preview". That was FALSE, and independently of any later post: the
// Season 3 date (September 22, 2026) is not in the preview at all -- it comes
// from the June 23 key-dates update. This file's own header comment already
// admitted that second source while the rendered sentence denied it. A page
// whose entire premise is citation discipline cannot mis-state its own sources.
//
// URL PROVENANCE -- DO NOT "TIDY" THESE INTO bungie.net SLUGS. Only the preview
// has a hand-verified bungie.net URL. The other two are cited at Bungie's own
// Steam cross-post, each verified by fetching it and confirming the page echoes
// that article's title. bungie.net is a client-rendered SPA that returns HTTP
// 200 with an identical empty shell for ANY /News/Article/<slug> path --
// including slugs that do not exist (measured: an invented slug and the real one
// were byte-identical). A guessed bungie.net URL therefore cannot be validated
// and would 404 silently for readers. Cite what can be verified.
const SOURCES = [
  {
    name: 'Marathon Mid-Season 2 Update Preview',
    url: 'https://www.bungie.net/7/en/News/Article/mid_season_2_preview',
    date: '2026-07-16',
  },
  {
    name: 'Vault Breaker Overview',
    url: 'https://steamstore-a.akamaihd.net/news/externalpost/steam_community_announcements/1838407329266906',
    date: '2026-07-20',
  },
  {
    name: 'Marathon Dev Team Update: Key Dates',
    url: 'https://steamstore-a.akamaihd.net/news/externalpost/steam_community_announcements/1835871199316610',
    date: '2026-06-23',
  },
];

// LATER BUNGIE POSTS (added 2026-10-15) -- cited INLINE in the body only, NOT in SOURCES (SOURCES
// also feeds the JSON-LD citations). They were held out while the Oct 20 change freeze was on;
// the freeze ended with the checkpoint read (Brief 133). Brief 134 moved the Event dates and the
// meta, OG and twitter text to the return run; the JSON-LD citations and the title are unchanged.
// Both are Bungie's own Steam cross-posts, checked 2026-10-15 against the text quoted below.
//   - Update 1.1.9.2 (Oct 6): "Vault Breaker will be available from October 20 - November 9."
//     No start time is given, so none is stated.
//   - Nightfall Refresh post (Sep 14): "The content originally planned for September will now
//     arrive as part of our Symbiosis update on December 8."
const LATER_POSTS = {
  returnRun: {
    name: 'Marathon Update 1.1.9.2',
    url: 'https://steamstore-a.akamaihd.net/news/externalpost/steam_community_announcements/1845383656396920',
    date: 'October 6, 2026',
  },
  symbiosis: {
    name: 'Marathon Development Update - Nightfall Refresh and Symbiosis',
    url: 'https://steamstore-a.akamaihd.net/news/externalpost/steam_community_announcements/1843481262702400',
    date: 'September 14, 2026',
  },
};
const LATER_POSTS_CHECKED = '2026-10-15';

// When this page was last CHECKED AGAINST ITS SOURCES. Feeds dateModified here
// AND lastmod in app/sitemap.js -- ONE definition, so the two can never tell
// different freshness stories. MOVED to lib/vaultBreaker.js 2026-07-21 for
// exactly that reason; see that file for the bug it closes.
//
// 2026-07-21: was '2026-07-16', which had become impossible as written -- the
// footer claimed the facts were last checked on 07-16 while citing a source
// published 07-20. Moved on an actual pass: the full preview text was pulled and
// every high-risk claim (Vault Data T1/T2, kit contents, Armory stock, the
// 3x/5x/1x weekly limits, the four-Codex count) was checked against it word for
// word, and the 07-20 overview was compared against the whole page.
//
// THIS IS NOT AN IN-GAME VERIFICATION. It means "matches what Bungie published",
// which is a different and weaker claim -- see the `verified` field below, whose
// ambiguity between those two meanings is a known defect pending a split into
// source_verified_at / play_verified_at.

const PAGE_URL = 'https://cyberneticpunks.com/marathon/modes/vault-breaker';

// Shaped like a game_modes row so a future DB read drops straight in.
const VAULT_BREAKER = {
  mode_name: 'Vault Breaker',
  mode_type: 'experimental',
  available_on: 'cryo-archive',
  is_limited_time: true,
  access_tier: 'free',
  verified: true,
  updated_at: FACTS_UPDATED,
  start_date: FIRST_RUN.startDate,
  end_date: FIRST_RUN.endDate,
  patch: 'Update 1.1.5',
  summary: 'Marathon\'s first experimental PvE mode: a roguelite run through progressively tougher Vaults inside Cryo Archive, played Solo, Duo, or Trio at any Runner Level. It first ran July 21 to August 4, 2026 with Update 1.1.5; Bungie\'s Update 1.1.9.2 scheduled a return from October 20 to November 9, 2026.',
};

// Run-date text for the head and the JSON-LD Event (Brief 134), built from the ONE definition in
// lib/vaultBreaker.js so the Event dates and the meta, OG and twitter text cannot disagree. Worded
// "return run ... first run ..." with no tense, so it stays true after Nov 9. The return dates are
// attributed to Update 1.1.9.2, as the body already does.
const RETURN_LABEL = runLabel(RETURN_RUN);
const FIRST_LABEL = runLabel(FIRST_RUN);
const META_DESCRIPTION = 'Marathon Vault Breaker return run: ' + RETURN_LABEL + ', per Bungie\'s ' + RETURN_RUN.source + ' (first run ' + FIRST_LABEL + '). Roguelite PvE in Cryo Archive, Solo/Duo/Trio, any Runner Level: Vault Data, the Sponsored Kit and the Armory, sourced from Bungie.';
const OG_DESCRIPTION = 'Return run ' + RETURN_LABEL + ', per Bungie\'s ' + RETURN_RUN.source + '; first run ' + FIRST_LABEL + '. Marathon\'s first experimental PvE mode: roguelite Vaults in Cryo Archive, Solo/Duo/Trio, any Runner Level.';
const TWITTER_DESCRIPTION = 'Return run ' + runLabel(RETURN_RUN, true) + ' (' + RETURN_RUN.source + '); first run ' + runLabel(FIRST_RUN, true) + '. Roguelite Vaults in Cryo Archive, Solo/Duo/Trio.';
const EVENT_DESCRIPTION = 'Marathon\'s first experimental PvE mode: a roguelite run through progressively tougher Vaults inside Cryo Archive, played Solo, Duo, or Trio at any Runner Level. Return run ' + RETURN_LABEL + ', per Bungie\'s ' + RETURN_RUN.source + '; first run ' + FIRST_LABEL + '.';

export const metadata = {
  // `absolute` drops the root '%s | Cybernetic Punks' suffix (18 chars). This
  // comment previously said the layout appends the suffix, which it did -- that
  // was a description of the bug, not a reason to keep it. 57 chars bare, 75
  // suffixed, against a ~60 char budget.
  title: { absolute: 'Marathon Vault Breaker - Dates, Vault Data & How It Works' },
  description: META_DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: 'Marathon Vault Breaker - Dates, Vault Data & How It Works | Cybernetic Punks',
    description: OG_DESCRIPTION,
    url: PAGE_URL,
    siteName: 'Cybernetic Punks',
    type: 'website',
    images: [{ url: 'https://cyberneticpunks.com/marathon/opengraph-image', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@Cybernetic87250',
    title: 'Marathon Vault Breaker - Dates, Vault Data & How It Works',
    description: TWITTER_DESCRIPTION,
    images: ['https://cyberneticpunks.com/marathon/opengraph-image'],
  },
};

// FAQ items render the visible FAQ section below.
const FAQ_ITEMS = [
  {
    q: 'When does Marathon Vault Breaker start?',
    a: 'Vault Breaker first ran from July 21 to August 4, 2026, arriving with Update 1.1.5. Bungie\'s Update 1.1.9.2 (October 6) schedules it again from October 20 to November 9, 2026. It is a limited-time event.',
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
  // TIER 1 + TIER 2 ONLY. FAQ_ITEMS renders the visible FAQ section, so it carries
  // only what Bungie stated or what has actually been played. NOTHING from the
  // "expected, not verified" tier goes in here or in any other schema -- an
  // inference asserted as a Question/Answer pair is an inference asserted as
  // fact to a crawler, which is worse than saying it on the page, not better.
  {
    q: 'Is the Compiler in Marathon Vault Breaker?',
    a: 'Yes. The Vault Breaker Overview from Bungie names the Compiler as the culminating threat, after UESC hordes and vault security measures. The Compiler is the existing endgame boss at Vault 7 in Cryo Archive, which Vault Breaker reuses. Bungie has not described how the fight differs inside Vault Breaker.',
  },
];

export default function VaultBreakerPage() {
  var vb = VAULT_BREAKER;

  // schema.org `citation` accepts an ARRAY, so both schemas below cite every
  // source rather than only the first. Derived from SOURCES, never re-listed --
  // the JSON-LD cannot cite fewer sources than the visible text does.
  var citations = SOURCES.map(function (s) {
    return {
      '@type': 'CreativeWork',
      name: s.name,
      url: s.url,
      datePublished: s.date,
      publisher: { '@type': 'Organization', name: 'Bungie' },
    };
  });

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
    // The return run (Brief 134). vb (the first-run row) still feeds the visible hero.
    description: EVENT_DESCRIPTION,
    startDate: RETURN_RUN.startDate,
    endDate: RETURN_RUN.endDate,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
    location: {
      '@type': 'VirtualLocation',
      name: 'Cryo Archive - Marathon',
      url: 'https://cyberneticpunks.com/marathon/maps/cryo-archive',
    },
    organizer: { '@type': 'Organization', name: 'Bungie', url: 'https://www.bungie.net' },
    isAccessibleForFree: true,
    url: PAGE_URL,
    citation: citations,
  };

  var webPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Marathon Vault Breaker - Dates, Vault Data & How It Works',
    description: 'Dates, Vault Data tiers, Sponsored Kit, and Armory stock for Marathon Vault Breaker, sourced from Bungie\'s official announcements.',
    url: PAGE_URL,
    mainEntity: eventSchema,
    // Honest freshness: a fixed date, NOT new Date(). CONTENT_CHANGED = the last content change.
    dateModified: CONTENT_CHANGED,
    publisher: { '@type': 'Organization', name: 'Cybernetic Punks', url: 'https://cyberneticpunks.com' },
    citation: citations,
  };

  return (
    <main style={{ background: BG, minHeight: '100vh', color: '#fff', paddingTop: 48, paddingBottom: 60 }}>
      <style>{`
        .vb-card { transition: background 0.12s, border-color 0.12s, transform 0.12s; }
        .vb-card:hover { background: #1e2228 !important; transform: translateY(-1px); }
      `}</style>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(webPageSchema) }} />

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
          <span style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, color: ORANGE, background: ORANGE + '14', border: '1px solid ' + ORANGE + '40', borderRadius: 2, padding: '3px 10px', letterSpacing: 2 }}>
            RETURNS OCT 20 TO NOV 9
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
            Every fact on this page comes from Bungie&rsquo;s official posts: <SourceList />.
            The return dates come from Bungie&#39;s{' '}
            <a href={LATER_POSTS.returnRun.url} target="_blank" rel="noopener noreferrer" style={{ color: ORANGE, textDecoration: 'underline' }}>{LATER_POSTS.returnRun.name}</a>
            {' '}({LATER_POSTS.returnRun.date}), and the Symbiosis timing from Bungie&#39;s{' '}
            <a href={LATER_POSTS.symbiosis.url} target="_blank" rel="noopener noreferrer" style={{ color: ORANGE, textDecoration: 'underline' }}>{LATER_POSTS.symbiosis.name}</a>
            {' '}({LATER_POSTS.symbiosis.date}).
          </div>
        </div>
      </section>

      {/* AT A GLANCE */}
      <section style={{ padding: '0 24px 40px', maxWidth: 1100, margin: '0 auto' }}>
        <SectionHeader label="At a Glance" color={ORANGE} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 8 }}>
          <FactCard label="First run" value="July 21 – August 4, 2026" />
          <FactCard label="Returning" value="October 20 to November 9, 2026" note="Per Bungie's Update 1.1.9.2 (October 6)" />
          <FactCard label="Patch" value={vb.patch} />
          <FactCard label="Map" value="Cryo Archive" href="/marathon/maps/cryo-archive" />
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
          <FactCard label="Starting kit" value="1 standard weapon + small equipment and consumables" note="It starts at its weakest" />
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
        {/* FIRST RUN vs RETURN RUN (2026-10-15). The cards and the weekly-limit box are the FIRST
            run (Jul 21 - Aug 4), from the Mid-Season 2 Update Preview. The return-run box lists ONLY
            what Bungie's Update 1.1.9.2 (Oct 6) states, copied from its "Vault Breaker Armory" and
            "Econ Changes" lists; anything it does not restate is marked "not stated", never carried
            over. "DRRVISH" is Bungie's spelling in that list (the same notes write "DRRVSH" elsewhere);
            reproduced as written. */}
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.65, maxWidth: 780, margin: '0 0 16px' }}>
          The cards and weekly limits below are from the first run (July 21 to August 4), per Bungie&#39;s
          Mid-Season 2 Update Preview. For the return run (October 20 to November 9), Bungie&#39;s{' '}
          <a href={LATER_POSTS.returnRun.url} target="_blank" rel="noopener noreferrer" style={{ color: ORANGE, textDecoration: 'underline' }}>{LATER_POSTS.returnRun.name}</a>
          {' '}({LATER_POSTS.returnRun.date}) changes some of them; those changes are listed separately.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 8, marginBottom: 10 }}>
          <FactCard label="Deluxe weapon" value="Daily rotating" note="First run (Jul 21 - Aug 4)" />
          <FactCard label="Cryo Key Templates" value="Stocked" note="First run (Jul 21 - Aug 4)" />
          <FactCard label="Prestige Weapons" value="One each per event" note="First run (Jul 21 - Aug 4)" />
        </div>
        <div style={{ background: CARD_BG, border: '1px solid ' + BORDER, borderRadius: 2, padding: '16px 18px', maxWidth: 780 }}>
          <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: 'rgba(255,255,255,0.35)', fontWeight: 700, marginBottom: 8 }}>
            WEEKLY STOCK LIMITS - FIRST RUN (JUL 21 - AUG 4)
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7 }}>
            <li>Tier 1 items: 3&times; or 5&times; per week, depending on the item.</li>
            <li>Tier 2 items: 1&times; per week &mdash; or convert to Tier 1 and buy 5&times; per week.</li>
            <li>Prestige Weapons: one of each, per event.</li>
          </ul>
        </div>
        <div style={{ marginTop: 10, background: CARD_BG, border: '1px solid ' + BORDER, borderLeft: '3px solid ' + ORANGE, borderRadius: '0 2px 2px 0', padding: '16px 18px', maxWidth: 780 }}>
          <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: ORANGE, fontWeight: 700, marginBottom: 8 }}>
            RETURN RUN (OCT 20 - NOV 9) - CHANGES IN UPDATE 1.1.9.2
          </div>
          <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.45)', margin: '0 0 6px' }}>Tier 1 repeatable offers (stock per week):</div>
          <ul style={{ margin: '0 0 10px', paddingLeft: 18, fontSize: 13.5, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7 }}>
            <li>Materials Pack 1: 2 per week (was 5)</li>
            <li>Materials Pack 2: 2 per week (was 5)</li>
            <li>Cryo Archive Key Template: 1 per week (was 3)</li>
            <li>Deluxe weapon: 2 per week (was 3)</li>
            <li>Deluxe Backpack: 2 per week (was 3)</li>
            <li>Deluxe Shield Implant: 2 per week (was 3)</li>
          </ul>
          <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.45)', margin: '0 0 6px' }}>Tier 2 offers:</div>
          <ul style={{ margin: '0 0 10px', paddingLeft: 18, fontSize: 13.5, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7 }}>
            <li>Vault Key 4, 5, and 6: only available for purchase during the 2nd and 3rd weeks.</li>
            <li>Limited offers only during the 2nd and 3rd weeks: DRRVISH, Salt Wages, Omnipositor, Biotoxic Disinjector, Biotoxic Disinjector Ammo.</li>
          </ul>
          <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.45)', margin: '0 0 6px' }}>Kit upgrades and economy:</div>
          <ul style={{ margin: '0 0 10px', paddingLeft: 18, fontSize: 13.5, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7 }}>
            <li>All upgrades are available for purchase from the start.</li>
            <li>Solo players receive 50% more Tier 1 and Tier 2 event currency.</li>
            <li>Monitor scan XP is reduced by 50%.</li>
            <li>Certain Tier 3 standard contract objectives (such as defeating a low number of UESC) cannot be completed in Vault Breaker.</li>
          </ul>
          <p style={{ margin: 0, fontSize: 12.5, color: 'rgba(255,255,255,0.42)', lineHeight: 1.6 }}>
            Not stated for the return: the other Tier 1 stock limits, the Tier 2 weekly stock and the
            Tier 2 to Tier 1 conversion, the Prestige Weapons limit, and whether the Deluxe weapon still
            rotates daily.
          </p>
        </div>

        {/* The caveat a reader most needs before spending. Bungie's own footnote:
            "purchases made from the Weekly and Limited Offers apply only to
            standard Marathon activities. Only Kit Upgrades will alter your
            loadout in Vault Breaker." Without this the Armory section reads as
            though buying gear improves your runs. It does not. */}
        <div style={{ marginTop: 10, padding: '12px 14px', background: DEEP_BG, border: '1px solid ' + BORDER, borderLeft: '3px solid ' + CYAN, borderRadius: '0 2px 2px 0', maxWidth: 780 }}>
          <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: CYAN, fontWeight: 700, marginBottom: 6 }}>
            BEFORE YOU SPEND
          </div>
          <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>
            Armory purchases do <strong style={{ color: '#fff' }}>not</strong> change your loadout inside
            Vault Breaker. Bungie&rsquo;s note: purchases from the Weekly and Limited Offers
            &ldquo;apply only to standard Marathon activities. Only Kit Upgrades will alter your
            loadout in Vault Breaker.&rdquo; Buy gear to take <em>out</em> of the mode; spend on
            Kit Upgrades to get stronger <em>inside</em> it.
          </p>
        </div>
      </section>

      {/* ── THE COMPILER ───────────────────────────────────────────────────
          THREE TIERS OF CLAIM, and they must never be confusable. Bungie named
          the Compiler in the 07-20 overview and described NOTHING; the base Cryo
          Archive encounter is separately known; the rest is inference. Merging
          those produces exactly the confident-wrong page every other site will
          publish this week.

          FIVE REDUNDANT SIGNALS mark the tier, so no single cue carries it:
            1. eyebrow  CONFIRMED BY BUNGIE / THE CRYO ARCHIVE FIGHT /
                        EXPECTED, NOT VERIFIED
            2. accent   ORANGE (the page's source colour) / CYAN / grey
            3. border   solid-left / solid-left / DASHED all round
            4. grammar  "Bungie's overview lists" / "In Cryo Archive:" /
                        "should ... Not yet verified"
            5. prefix   inline citation / "In Cryo Archive:" / "Expected:"
          The dashed border is the strongest: it reads as provisional even in a
          screenshot with the text too small to read.

          TIER 3 IS EXCLUDED FROM FAQ_ITEMS AND FROM ALL STRUCTURED DATA -- not in
          the visible FAQ, not in eventSchema, nowhere a crawler reads. An inference
          asserted as a Question/Answer pair is an inference asserted as fact.

          DELIBERATELY ABSENT: any claim that beating the Compiler in Vault
          Breaker withholds the S'Phticide shell style. Searched 100 Steam posts
          / 335,660 chars for "phticide" and for any sentence linking the
          Compiler to a reward: ZERO matches. Uncitable, therefore unpublished.
          If a source turns up it is one Tier 1 bullet plus a fourth SOURCES
          entry. Do NOT add it from memory.

          NEW COPY IN THIS SECTION USES STRAIGHT QUOTES AND NO EM-DASHES per the
          2026-07-21 instruction. Existing copy elsewhere on the page was left
          alone, so the two differ typographically on purpose. */}
      <section style={{ padding: '0 24px 40px', maxWidth: 1100, margin: '0 auto' }}>
        <SectionHeader label="The Compiler" color={ORANGE} />

        {/* Honesty first, above all three tiers. This IS the differentiator:
            every competing page will assert the Vault Breaker fight confidently
            within days, and none of them will have fought it either. */}
        <div style={{ marginBottom: 14, padding: '12px 14px', background: DEEP_BG, border: '1px dashed ' + BORDER, borderRadius: 2, maxWidth: 780 }}>
          <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: 'rgba(255,255,255,0.45)', fontWeight: 700, marginBottom: 6 }}>
            NOBODY HAS FOUGHT THIS YET
          </div>
          <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
            Vault Breaker went live on July 21, 2026. At the time of writing, nobody has fought the
            Vault Breaker version of the Compiler, us included. Bungie named it and described nothing.
            This section separates what Bungie has stated, what the Compiler does in the base Cryo
            Archive fight, and what Vault Breaker&#39;s ruleset implies but nobody has verified. We
            will update it once we have fought it ourselves.
          </p>
        </div>

        {/* TIER 1 -- ORANGE, solid left border, inline citation to SOURCES[1]. */}
        <div style={{ marginBottom: 10, padding: '14px 16px', background: CARD_BG, border: '1px solid ' + BORDER, borderLeft: '3px solid ' + ORANGE, borderRadius: '0 2px 2px 0', maxWidth: 780 }}>
          <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: ORANGE, fontWeight: 700, marginBottom: 8 }}>
            CONFIRMED BY BUNGIE
          </div>
          <p style={{ margin: 0, fontSize: 13.5, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7 }}>
            The Compiler appears in Vault Breaker. Bungie&#39;s{' '}
            <a href={SOURCES[1].url} target="_blank" rel="noopener noreferrer" style={{ color: ORANGE, textDecoration: 'underline' }}>
              {SOURCES[1].name}
            </a>
            {' '}({SOURCES[1].date}) lists it as the culminating threat, after UESC hordes and vault
            security measures. That is the entire statement. No mechanics, no arena, no rewards.
          </p>
        </div>

        {/* TIER 2 -- CYAN, solid left border, every bullet prefixed "In Cryo Archive:".
            ITS ATTRIBUTION IS WEAKER THAN THE SECTION LOOKS, AND SAYS SO. Checked
            before writing: the dpmg guide first proposed as the cross-link does
            NOT contain these mechanics at all (339 words; it only says "avoiding
            the Compiler threat"). The article that does describe them is 2urw,
            and it carries NO source_url. ZERO live articles mentioning the
            Compiler cite bungie.net. Citing our own coverage as support would be
            a chain of internal references with no external anchor -- the same
            shape as meta_tiers reading as corroboration for shell_stats. The
            honest anchor is first-hand play, and the closing line says that. */}
        <div style={{ marginBottom: 10, padding: '14px 16px', background: CARD_BG, border: '1px solid ' + BORDER, borderLeft: '3px solid ' + CYAN, borderRadius: '0 2px 2px 0', maxWidth: 780 }}>
          <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: CYAN, fontWeight: 700, marginBottom: 8 }}>
            THE CRYO ARCHIVE FIGHT
          </div>
          <p style={{ margin: '0 0 10px', fontSize: 13.5, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7 }}>
            The Compiler is not new. It is the existing endgame encounter at Cryo Archive&#39;s Vault 7,
            and Vault Breaker reuses it. In Cryo Archive, the fight works like this:
          </p>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7 }}>
            <li>In Cryo Archive: three terminals must be activated with matching symbols, which spawns a green shield bubble at the centre of the arena.</li>
            <li>In Cryo Archive: damage phases happen inside the bubble, where the shield core is exposed and shootable.</li>
            <li>In Cryo Archive: its attacks include lasers and tracking orbs.</li>
            <li>In Cryo Archive: the arena is reached by completing the run to the final vault.</li>
          </ul>
          <p style={{ margin: '10px 0 0', fontSize: 12.5, color: 'rgba(255,255,255,0.42)', lineHeight: 1.6 }}>
            This comes from playing the base-game encounter, not from Bungie. Bungie has published no
            description of the Compiler fight, and no article on this site that mentions the Compiler
            cites bungie.net. Our own{' '}
            <Link href="/marathon/intel/marathon-cryo-archive-guide-first-steps-into-the-endgame-2urw" style={{ color: CYAN, textDecoration: 'underline' }}>
              Cryo Archive endgame guide
            </Link>
            {' '}describes the same encounter, but that is our coverage rather than a source, so it is
            offered as further reading and not as corroboration. Whether Vault Breaker changes any of
            this is unknown.
          </p>
        </div>

        {/* TIER 3 -- grey, DASHED all round, every bullet prefixed "Expected:".
            Excluded from every schema on this page. */}
        <div style={{ padding: '14px 16px', background: DEEP_BG, border: '1px dashed ' + BORDER, borderRadius: 2, maxWidth: 780 }}>
          <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: 'rgba(255,255,255,0.45)', fontWeight: 700, marginBottom: 8 }}>
            EXPECTED, NOT VERIFIED
          </div>
          <p style={{ margin: '0 0 10px', fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.65 }}>
            Vault Breaker&#39;s ruleset implies the following. None of it has been verified in game,
            none of it comes from Bungie, and any of it may turn out to be wrong.
          </p>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7 }}>
            <li>Expected: no rival Runners, so no third-partying and no contested exfil. This follows from the mode being pure PvE, not from anything Bungie said about the Compiler.</li>
            <li>Expected: Sponsored Kit progression should make later attempts easier, since kit upgrades persist across runs.</li>
            <li>Expected: in-run gear does not exfil, so a Compiler kill should pay out in Vault Data and Codex cosmetics rather than gear.</li>
          </ul>
          <p style={{ margin: '10px 0 0', fontSize: 12.5, color: 'rgba(255,255,255,0.38)', lineHeight: 1.6, fontStyle: 'italic' }}>
            Not yet verified in game.
          </p>
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
            <p style={{ margin: '0 0 8px', fontSize: 13.5, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7 }}>
              Four Codex challenges run with the event, each rewarding a cosmetic:
            </p>
            {/* Names verbatim from the Mid-Season 2 Update Preview. "USEC" on the
                Weapon Charm is BUNGIE'S TYPO (every other entry reads UESC) and is
                reproduced deliberately -- do NOT "correct" it. Quoting a source
                means quoting it, and a silent fix would make our text stop matching
                what a reader sees in game. The visible note below says so, so the
                next person to spot it does not helpfully break it. */}
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7 }}>
              <li>Profile Emblem &mdash; Opposition marker</li>
              <li>Profile Background &mdash; UESC Command</li>
              <li>Circuit Breaker Weapon Style &mdash; UESC Bulwark</li>
              <li>Weapon Charm &mdash; USEC Control</li>
            </ul>
            <p style={{ margin: '8px 0 0', fontSize: 11.5, color: 'rgba(255,255,255,0.35)', lineHeight: 1.5, fontStyle: 'italic' }}>
              &ldquo;USEC Control&rdquo; is spelled that way in Bungie&rsquo;s announcement, where every
              other entry reads UESC. Reproduced as written rather than silently corrected.
            </p>
          </div>
          <div className="vb-card" style={{ background: CARD_BG, border: '1px solid ' + BORDER, borderRadius: 2, padding: '16px 18px' }}>
            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 800, color: '#fff', marginBottom: 8 }}>
              Why It Is An Experiment
            </div>
            <p style={{ margin: 0, fontSize: 13.5, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7 }}>
              In its Mid-Season 2 Update Preview (July 16), Bungie called Vault Breaker its first
              experimental PvE mode, on the way to a full PvE mode then planned for Season 3. Bungie&#39;s{' '}
              <a href={LATER_POSTS.symbiosis.url} target="_blank" rel="noopener noreferrer" style={{ color: ORANGE, textDecoration: 'underline' }}>Nightfall Refresh post</a>
              {' '}({LATER_POSTS.symbiosis.date}) moved the content planned for September into the
              Symbiosis update on December 8, which brings Marathon&#39;s first permanent PvE
              experience, and said Vault Breaker returns for a limited time to gather data on how PvE
              fits into progression.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
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
            Sourced from Bungie&rsquo;s <SourceList />. Checked against all three sources
            on {FACTS_UPDATED} &mdash; <strong style={{ color: 'rgba(255,255,255,0.55)' }}>not
            yet verified in game</strong>. Vault Breaker is a limited-time event; details may
            differ from the announcements. The October 20 to November 9 return and the Symbiosis
            timing were checked against Update 1.1.9.2 and the September 14 post on {LATER_POSTS_CHECKED}.
          </p>
          <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Link href="/marathon/maps/cryo-archive" className="vb-card" style={{ display: 'inline-block', background: CARD_BG, border: '1px solid ' + BORDER, borderRadius: 3, padding: '7px 14px', color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontFamily: 'Orbitron, monospace', fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>
              Cryo Archive Map
            </Link>
            <Link href="/marathon/shells" className="vb-card" style={{ display: 'inline-block', background: CARD_BG, border: '1px solid ' + BORDER, borderRadius: 3, padding: '7px 14px', color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontFamily: 'Orbitron, monospace', fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>
              Shells
            </Link>
            <Link href="/marathon/intel" className="vb-card" style={{ display: 'inline-block', background: CARD_BG, border: '1px solid ' + BORDER, borderRadius: 3, padding: '7px 14px', color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontFamily: 'Orbitron, monospace', fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>
              Latest Intel
            </Link>
            <Link href="/marathon/nightfall" className="vb-card" style={{ display: 'inline-block', background: CARD_BG, border: '1px solid ' + BORDER, borderRadius: 3, padding: '7px 14px', color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontFamily: 'Orbitron, monospace', fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>
              Nightfall Refresh Schedule
            </Link>
          </div>
        </div>
      </section>

    </main>
  );
}

// Renders SOURCES as linked citations. Used by BOTH the hero source block and
// the footer, so the two can never list different sources -- and neither can
// drift from the JSON-LD, which builds its `citation` array from the same const.
function SourceList() {
  return (
    <>
      {SOURCES.map(function (s, i) {
        return (
          <span key={s.url}>
            {i > 0 ? (i === SOURCES.length - 1 ? ', and ' : ', ') : ''}
            <a href={s.url} target="_blank" rel="noopener noreferrer" style={{ color: ORANGE, textDecoration: 'underline' }}>
              {s.name}
            </a>
            {' '}({s.date})
          </span>
        );
      })}
    </>
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
