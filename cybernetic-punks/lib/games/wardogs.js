// lib/games/wardogs.js
// Wardogs game config -- the SECOND instance of the network game-section template
// (DMZ was the first; see lib/games/dmz.js + docs/dmz/GAME_TEMPLATE.md). Same shape,
// per-game data. Phase 1 = INFRASTRUCTURE SKELETON ONLY: hub + config-driven editorial
// sections. NO entity verticals (no wardogs_* tables, no entities registry) and NO
// front-door/sitemap wiring this pass -- those are deliberate later adds (see
// docs/wardogs-vertical-study.md + docs/HANDOFF.md).
//
// PROVENANCE: Wardogs is BULKHEAD (dev) / Team17 (publisher), Steam Early Access
// Sep 10 2026. Two tiers of pre-launch honesty:
//   - CONFIRMED (official Bulkhead/Team17 material) -> stated as fact (e.g. the
//     37-weapon count, the three named starter rifles, the buy-per-life system).
//   - ATTRIBUTED (Closed Alpha/Beta playtest captures) -> allowed in EDITORIAL
//     articles ONLY when explicitly flagged "playtest-captured, unconfirmed, may
//     change" (e.g. the armory piece's vendor roster + beta prices). This is a
//     deliberate softening of the earlier "never specific numbers" stance: FLAGGED
//     attributed intel is permitted; FABRICATED numbers (no source) stay banned.
// This CONFIG and the STRUCTURED entity data (the arsenal tables) still assert only
// CONFIRMED facts -- the looser attributed tier lives in flagged editorial prose,
// never in config or the verified tables.

import { WARDOGS_AMBER } from '../brandColors.js';

export const wardogs = {
  slug: 'wardogs',
  displayName: 'Wardogs',       // top-level game display name (root tile reads this)
  tagline: 'Verified intel for the cash economy',
  basePath: '/wardogs',

  // SEO INDEXING GATE vs LAUNCH GATE -- two separate flags (same discipline as DMZ).
  // indexable: SEO exposure ONLY. FALSE for Phase 1 -- the hub + sections are empty
  //   skeletons, so the whole /wardogs subtree stays noindex,follow (crawlers still
  //   traverse back to the network root). Flip to TRUE when confirmed-systems content
  //   lands (Phase 2). Two consumers read it: app/wardogs/layout.js (robots) and, once
  //   wired, the sitemap block (NOT added this pass -- see the study's gap analysis).
  // launched: whether the game is actually LIVE (EA Sep 10 2026). STILL FALSE.
  indexable: true,
  launched: false,

  // Pre-publish corroboration gate mode. Mirrors DMZ: 'fail-closed' = a hold-class
  // finding or a gate-infra throw HOLDS the draft. Inert until an editorial store
  // loader lands; the flag records intent now.
  prePublishGate: 'fail-closed',

  // Lifecycle (NOT launched, NOT indexable): drives generation/effort/kill-clock later.
  // launch_date: the machine value for the launch surfaces. The root tile's
  //   "LAUNCHES SEP 10" pill already single-sources this field (app/page.js launchLabel).
  //   Keep it here -- do not add a second date literal anywhere.
  status: 'pre-launch',
  launch_date: '2026-09-10',
  // earlyAccess: Wardogs launches into Steam EARLY ACCESS on launch_date, not a full release.
  // Consumed by lib/network/gameStatus.js so the derived status label reads "EARLY ACCESS <date>"
  // (honest) instead of "ARRIVES <date>" (which implies full launch). Full-launch games omit it.
  earlyAccess: true,

  // FOOTER PRESENTATION. This config is CONSUMED BY the generalized Footer (components/Footer.js,
  // game="wardogs"), which renders it as of Phase 3. legal is the Wardogs fan-site notice
  // (Bulkhead/Team17), lifted verbatim from the former standalone WardogsDisclaimer (deleted
  // Phase 4); it now lives in config and renders in the footer's legal row. description is
  // Wardogs' own metadata.description (app/wardogs/layout.js). The POWERED BY roster is
  // NETWORK-level (the full desk, roster.js EDITOR_ORDER), read from roster.js by the footer and
  // identical on all 4 games -- NOT stored per game. links are Wardogs' ACTUAL sections only --
  // no tool/entity hubs exist yet, so no DISCOVER column.
  footer: {
    description: 'Confirmed-systems intel for Wardogs, the BULKHEAD / Team17 combined-arms shooter. Part of the CyberneticPunks game network.',
    // Phase 3 (inert until Footer.js reads them). See marathon.js footer for the full note.
    // peerLabel/peerLifecycle reproduce Wardogs' sublabel in the Marathon footer
    // ("WARDOGS · BULKHEAD (EA SEP 10)"). peerLifecycle 'EA SEP 10' is the PRE-LAUNCH
    // token only: Footer.js now DATE-DRIVES the live flip via isGameLive() -- once
    // launch_date (2026-09-10) passes, the footer renders '(IN EA)' instead of this
    // literal, so it cannot go stale. Middot matches the UI.
    bottomTagline: 'WARDOGS INTELLIGENCE HUB · THE CASH ECONOMY',
    peerLabel: 'BULKHEAD',
    peerLifecycle: 'EA SEP 10',
    legal: [
      'CYBERNETIC PUNKS IS AN UNOFFICIAL FAN SITE - NOT AFFILIATED WITH OR ENDORSED BY BULKHEAD OR TEAM17.',
      'WARDOGS IS A TRADEMARK OF ITS RESPECTIVE OWNER.',
    ],
    links: {
      explore: [
        { label: 'Field Intel', href: '/wardogs/field-intel' },
        { label: 'Economy',     href: '/wardogs/economy'     },
        { label: 'Systems',     href: '/wardogs/systems'     },
        { label: 'Arsenal',     href: '/wardogs/arsenal'     },
      ],
    },
  },

  // EDITORIAL ROSTER -- mirrors DMZ exactly: NEXUS ONLY. News / official-announcement
  // tracking is the one editorial job that exists pre-launch (no verified play data yet).
  // Read by the cron roster gate (app/api/cron/route.js) -- its ABSENCE would crash the
  // gate on config.editorial.editors. Like DMZ, Wardogs stays OFF the auto-cron (the cron
  // produces getGameConfig() = marathon only, until per-game cron selection is built), so
  // pre-launch Wardogs news is generated by a manual owner-reviewed script, not the cron.
  editorial: {
    cadenceCron: '0 19 * * *',
    editors: ['NEXUS'],
  },

  // Theme tokens -- reference values kept in sync with the .wardogs-theme block in
  // globals.css (which drives rendering). STARTING VALUES, tunable at launch polish:
  // the dark tactical base is shared with DMZ (both are gritty military shooters); the
  // accent is Wardogs' warm amber (matches the tile key art + the root tile's gold pill).
  theme: {
    primary: WARDOGS_AMBER,  // network-root accent (only used if a ROOT_GAMES entry is added later)
    accent:  '#e0a13a',      // warm amber -- the /wardogs primary accent
    bgPage:  '#08090c',
    bgCard:  '#12140f',
    border:  '#2c2a22',
    hazard:  '#e0563a',
  },

  // THIN section descriptors { slug, label, source, contentFilter, description }.
  //   source 'editor' = filled from feed_items WHERE game_slug='wardogs' as articles
  //     publish. contentFilter scopes the read. Zero rows -> empty-state.
  //   source 'data' = its own entity tables at launch; renders a coming-soon shell now,
  //     contentFilter null (no query, no table needed for the shell).
  // Pre-launch, STRUCTURED section data (the arsenal tables) stays studio-confirmed
  // only; every specific number in those tables (the $10,000 start, weapon/vehicle
  // prices, payouts) stays out until verified in-game post-EA. EDITORIAL articles in
  // these sections MAY carry attributed playtest data when flagged unconfirmed (see
  // the armory piece). navLabel/hideFromNav behave as in DMZ.
  sections: [
    { slug: 'field-intel', label: 'Field Intel', navLabel: 'News', source: 'editor', contentFilter: { table: 'feed_items' }, description: 'Confirmed reports on Wardogs and what Bulkhead has officially detailed so far.' },
    { slug: 'economy',     label: 'Economy',                       source: 'editor', contentFilter: { table: 'feed_items' }, description: 'The cash-economy structure - loadout buys, teamplay payouts, and match-to-match persistence - as the studio confirms it.' },
    { slug: 'systems',     label: 'Systems',                       source: 'editor', contentFilter: { table: 'feed_items' }, description: 'The three-team Control Zone mode, combined arms, and building and destruction - the confirmed systems.' },
    { slug: 'arsenal',     label: 'Arsenal',                       source: 'data',   contentFilter: null,                    description: 'Verified weapon, vehicle, and gear data. Structured tables are built against real in-game numbers once Early Access opens - not pre-launch guesses.' },
  ],

  // No interactive build tool / structured entities yet -> no article CTA.
  buildToolCta: null,
};

// WARDOGS ARTICLE -> SECTION ASSIGNMENT. feed_items has no section column, so (as with
// DMZ) a curated Wardogs piece maps its slug to exactly one editor section here. EMPTY
// for now -- Phase 1 ships zero Wardogs articles. A NEW Wardogs article must get an entry
// here or it renders in no section (fail-safe: unassigned = hidden, never mis-placed).
// When the first article publishes (Phase 2), add its slug + the /wardogs/[section]/[slug]
// detail route (deferred this pass -- there is nothing to open yet).
export const WARDOGS_ARTICLE_SECTION = {
  // Stage 6 Track 2: the 6 reviewed pre-launch drafts (persist-wardogs-news.mjs), mapped to
  // their editor section. feed_items has no section column, so this map is the only source of
  // an article's section (unmapped slug -> null -> hidden, never mis-placed).
  'wardogs-control-zone': 'systems',
  'wardogs-cash-economy': 'economy',
  'wardogs-roles-not-classes': 'systems',
  'wardogs-map-respawn': 'systems',
  'wardogs-factions': 'field-intel',
  'wardogs-monetization': 'field-intel',
  // The pre-launch ARMORY piece (persist-wardogs-armory.mjs): the buy-per-life loadout
  // system + the 37-weapon count sit with the other confirmed systems.
  'wardogs-armory': 'systems',
};

// Slugs assigned to a given Wardogs section (empty array -> empty state).
export function wardogsArticleSlugsForSection(sectionSlug) {
  return Object.keys(WARDOGS_ARTICLE_SECTION).filter(function (s) {
    return WARDOGS_ARTICLE_SECTION[s] === sectionSlug;
  });
}

// Resolve which Wardogs section an article belongs to. Curated pieces map by slug;
// returns null when unassigned (fail-safe: unmapped = never routed/emitted). Forward-
// ready for the detail route + sitemap when editorial lands.
export function wardogsSectionForArticle(article) {
  if (!article || !article.slug) return null;
  if (WARDOGS_ARTICLE_SECTION[article.slug]) return WARDOGS_ARTICLE_SECTION[article.slug];
  return null;
}

export default wardogs;
