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
  // News-source provenance for cited news/patch-notes blocks (verified_source). Wardogs news is the
  // official Steam news feed for appid 1867240 -- authored by BULKHEAD (dev; Team17 is publisher),
  // NOT Bungie. The "Bungie-via-Steam feed" note below describes the shared gather ENGINE, not the
  // source. Fixes the former hardcoded "BUNGIE" mislabel on Wardogs (Brief per-game news label).
  newsSourceLabel: 'BULKHEAD',
  displayName: 'Wardogs',       // top-level game display name (root tile reads this)
  tagline: 'Verified intel for the cash economy',
  basePath: '/wardogs',

  // EDITOR-PROMPT VOCABULARY (Layer-A tokens the shared editor prompts require via {{cnp:...}},
  // resolved by lib/editors/promptVocab.js). Without this block the tokens (grade.nexus, reader,
  // dev, ...) had no values and the resolver aborted -> total_outage (both editors fail, 0 drafts,
  // wardogs cron 2026-09-18). developer/readerTerm are Wardogs' framing; grades.nexus is NEXUS's
  // grade-metric NAME (Marathon's is "Grid Pulse", assigned 0-10) -- Wardogs calls it "War Report".
  // (game name comes from displayName above, not here.) Only the tokens Wardogs' rostered editors
  // (NEXUS, MIRANDA) actually use need values; any other token now degrades to empty (non-fatal).
  vocabulary: {
    developer: 'Bulkhead',
    readerTerm: 'Merc',
    readerTermPlural: 'Mercs',
    grades: { nexus: 'War Report' },
  },

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
        { label: 'Loadouts',    href: '/wardogs/loadouts'    },
        { label: 'Field Intel', href: '/wardogs/field-intel' },
        { label: 'Economy',     href: '/wardogs/economy'     },
        { label: 'Your Spend',  href: '/wardogs/economy/mine' }, // the personalized "Your Wardogs Economy" viral hook
        { label: 'Systems',     href: '/wardogs/systems'     },
        { label: 'Arsenal',     href: '/wardogs/arsenal'     },
        { label: 'Attachments', href: '/wardogs/attachments' },
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
    // LAYER B primary-tool CTA: the shared MIRANDA/DEXTER planning-tools line points readers here
    // (via {{kit:primaryTool.*}}) instead of a Marathon-named token. Wardogs' primary tool is the
    // Loadout Finder (/wardogs/loadouts).
    primaryTool: { label: 'Loadout Finder', href: '/wardogs/loadouts' },
    editors: ['NEXUS', 'MIRANDA'],
    // PATCH-GATE NEXUS (2026-09-25): NEXUS runs ONLY on a detected patch/hotfix cycle (mirrors
    // Marathon's editorsRequiringPatch). WHY: pre/early-launch, daily NEXUS produced pure SPECULATION
    // ("Season 02 teaser", rejected 2026-09-24 AND 2026-09-25). Bulkhead's steam-news detection
    // (sources.patchNotes.detection) fires is_patch_note only for a real Update/Patch N.N / hotfix /
    // update-preview within 48h, so on a quiet day NEXUS freezes and only MIRANDA (grounded evergreen)
    // runs. MIRANDA stays OUT of this list -> unchanged.
    editorsRequiringPatch: ['NEXUS'],
    // ON-SWITCH (2026-09-17): Wardogs joins autonomous generation. generateNews=true makes
    // getGenerationGames() include 'wardogs', which (a) lets the scheduled /api/cron?game=wardogs
    // invocation pass the fail-closed ?game= authorization, and (b) turns on generation for the
    // roster above. NEXUS = news (patch-gated, above); MIRANDA = evergreen weapon guides grounded in
    // the COMMUNITY-ATTRIBUTED wardogs_ttk/ballistics data (fetchWardogsWeaponBlock, Brief A) with the
    // structural "not owner-verified" caveat (Brief B). MIRANDA is in HELD_EDITORS -> her drafts
    // land is_published=false for review; she is NOT patch-gated -> she runs daily as the evergreen producer.
    generateNews: true,
  },

  // FEED SOURCES (2026-09-17) -- the inputs gatherAll(config) reads. Shape mirrors
  // lib/games/marathon.js so the shared gather path does not throw. Operator-supplied:
  // Steam appid 1867240, r/WarDogs, @BULKHEAD (YouTube), Wardogs is a Bulkhead game.
  // X (x.com/WARDOGS) is ingested separately via x_sources, not through gatherAll, so no
  // `x` block is needed here. `wikiUrls` is omitted (DEXTER-only, and DEXTER is not in the
  // roster). Several tuned lists (youtube queries, relevance tokens, twitch category,
  // patchNotes keywords) are BEST-EFFORT and should be refined by the operator once the
  // first runs show what the feeds return.
  sources: {
    steamAppId: '1867240',

    reddit: {
      subreddits: ['WarDogs'],
    },

    youtube: {
      searchQueries: [
        'Wardogs Bulkhead gameplay 2026',
        'Wardogs game loadout build',
        'Wardogs weapon tier list',
        'Wardogs Control Zone gameplay',
        'Wardogs tips tricks meta',
        'Wardogs best guns early access',
      ],
      creatorChannels: ['BULKHEAD'],
    },

    twitch: {
      // getGameId tries these against the Twitch category API; an unknown name resolves to
      // null and gatherTwitchClips returns [] (safe). Refine to the real category at launch.
      gameNames: ['WarDogs', 'War Dogs'],
    },

    // MIRANDA guide-gather (Brief C): her YouTube guide queries + subreddits, distinct from the
    // general reddit.subreddits above. Mirrors marathon's sources.miranda shape. guideQueries are
    // BEST-EFFORT starters (tune once first runs show what returns); subreddits reuse r/WarDogs.
    // Grounding comes from wardogs_ttk/ballistics (fetchWardogsWeaponBlock), not these queries --
    // these only enrich her community-signal context.
    miranda: {
      guideQueries: [
        'Wardogs Bulkhead weapon guide 2026',
        'Wardogs best loadout beginners',
        'Wardogs weapon tier list explained',
        'Wardogs how to win tips',
        'Wardogs Control Zone strategy guide',
        'Wardogs attachments best setup',
        'Wardogs TTK breakdown guide',
        'Wardogs early access tips tricks',
      ],
      subreddits: ['WarDogs'],
    },

    // Official Wardogs news via the Steam news feed for the appid (same engine as Marathon's
    // Bungie-via-Steam feed). Detection mirrors marathon's shape; keywords are best-effort.
    patchNotes: {
      type: 'steam-news',
      appId: '1867240',
      detection: {
        officialFeedName: 'steam_community_announcements',
        // Matches BOTH "Update 0.11" and "Patch 0.11" (2026-09-25): Bulkhead titles its patch posts
        // "... PATCH 0.11", which /update.../ missed -> real patches were never detected. Requires a
        // dotted version number after update|patch, so marketing/reveal titles ("Season 02 Teaser",
        // "2 MILLION COPIES SOLD", "1.25 MILLION COPIES SOLD!") do NOT match (verified against the live feed).
        versionRe: /(?:update|patch)\s+\d+(\.\d+)+/i,
        keywords: ['hotfix', 'patch notes', 'update preview'],
        freshnessMs: 48 * 60 * 60 * 1000,
      },
      label: 'BULKHEAD NEWS',
    },
  },

  // Relevance filter terms (filterGameVideos(config.relevance) + the X off-topic gate).
  // REQUIRED -- absence throws in isGameContent. Best-effort Wardogs terms; tune at launch.
  relevance: {
    gameTokens: ['bulkhead', 'wardogs', 'war dogs', 'control zone', 'combined arms'],
    ambiguousTokens: [],
    contextTokens: [
      'season', 'update', 'patch', 'build', 'loadout', 'weapon', 'meta', 'gameplay',
      'tier', 'pvp', 'fps', 'shooter', 'gaming', 'video game', 'beta', 'playtest',
      'steam', 'early access', 'crossplay', 'squad',
    ],
    ambiguousTerm: 'wardogs',
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
  // NAV NOTE: 'economy' and 'arsenal' carry hideFromNav:true -- they are surfaced in the nav as
  // live TOOLS (see `tools` below), not as editorial-section tabs, so they must not ALSO render a
  // section tab. They stay in `sections` because the routing still needs them: /wardogs/economy/<slug>
  // resolves via [section]/[slug] and getGameSection('wardogs','economy') must be non-null for its 3
  // articles to render; /wardogs/arsenal's descriptor backs the [section] data-branch + its metadata.
  sections: [
    { slug: 'field-intel', label: 'Field Intel', navLabel: 'News', source: 'editor', contentFilter: { table: 'feed_items' }, description: 'Confirmed reports on Wardogs and what Bulkhead has officially detailed so far.' },
    { slug: 'economy',     label: 'Economy',      hideFromNav: true,  source: 'editor', contentFilter: { table: 'feed_items' }, description: 'The cash-economy structure - loadout buys, teamplay payouts, and match-to-match persistence - as the studio confirms it.' },
    { slug: 'systems',     label: 'Systems',                       source: 'editor', contentFilter: { table: 'feed_items' }, description: 'The three-team Control Zone mode, combined arms, and building and destruction - the confirmed systems.' },
    { slug: 'arsenal',     label: 'Arsenal',      hideFromNav: true,  source: 'data',   contentFilter: null,                    description: 'Verified weapon, vehicle, and gear data. Structured tables are built against real in-game numbers once Early Access opens - not pre-launch guesses.' },
  ],

  // No interactive build tool / structured entities yet -> no article CTA.
  buildToolCta: null,

  // LIVE PRODUCT LANDINGS -- the built, live Wardogs tools/reference pages, surfaced as the
  // lead nav group (app/wardogs/WardogsNav.js) and emitted in the sitemap as the single source
  // of truth (lib/sitemap/eligible.js iterates this -- do NOT also add these hrefs explicitly
  // there, or they double). SEPARATE from `sections` (editorial verticals with their own
  // section-hub rendering + CollectionPage JSON-LD). Each has its OWN route and is indexable
  // (real value-prop content; inherits the /wardogs subtree gate), matching /marathon/advisor +
  // /bodycam/builder. Per-artifact leaves stay noindex + out of the sitemap
  // (/wardogs/loadouts/build/[slug], /wardogs/arsenal/[slug], /wardogs/economy/stat/[key]).
  // NAMING (hard rule): "Loadouts" / "best loadout" (the community + search term), NEVER
  // "Build Advisor" (zero search volume).
  tools: [
    { slug: 'loadouts', label: 'Loadouts', href: '/wardogs/loadouts', status: 'live',
      tagline: 'The best loadout for your level, budget, and playstyle - weapons ranked by measured time-to-kill, with the reasoning behind every pick.' },
    { slug: 'tier-list', label: 'Tier List', href: '/wardogs/tier-list', status: 'live',
      tagline: 'Every Wardogs weapon ranked S to D by measured time-to-kill - no opinions, just what kills fastest.' },
    { slug: 'economy', label: 'Economy', href: '/wardogs/economy', status: 'live',
      tagline: 'The live spend tracker, the money-flow breakdown, and the unlock planner - where the cash goes and what to save for.' },
    // The personalized "Your Wardogs Economy" tool -- the shareable/viral hook. Surfaced as its own
    // nav tab (was only linked from the Economy hub) so it is one click from every Wardogs page.
    { slug: 'economy-mine', label: 'Your Spend', href: '/wardogs/economy/mine', status: 'live',
      tagline: 'Your personal Wardogs spend estimate - enter your hours, level, and playstyle to see what you have burned since launch.' },
    { slug: 'arsenal', label: 'Arsenal', href: '/wardogs/arsenal', status: 'live',
      tagline: 'The full weapon roster with attributed ballistics and time-to-kill summaries.' },
    { slug: 'attachments', label: 'Attachments', href: '/wardogs/attachments', status: 'live',
      tagline: 'The full attachment catalog by slot -- muzzles, optics, grips, mags -- with attributed prices, weights, and weapon fitment.' },
  ],
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
  // The pre-launch ECONOMY deep-dive (persist-wardogs-economy.mjs): the persistent
  // wallet, Gold Market, and monetization pledges -- the economy section.
  'wardogs-economy': 'economy',
  // Black Market honest-status piece (2026-09-15 draft): what's live (Gold Exchange +
  // gold-for-cosmetics) vs the pitched roadmap -- the economy section.
  'wardogs-black-market-whats-live-vs-coming': 'economy',
  // Launch-week content #1 -- the EA launch overview, grounded in the tiered
  // docs/wardogs/WARDOGS_LAUNCH_REFERENCE.md. Operator runs
  // docs/migrations/2026-09-08-wardogs-article-launch-overview.sql.
  'wardogs-early-access-everything-confirmed': 'field-intel',
  // Launch-week content #2 -- the economy explainer (buy-your-loadout / persistent cash),
  // grounded in the refined economy section of docs/wardogs/WARDOGS_LAUNCH_REFERENCE.md. Lives in
  // the dedicated 'economy' section (clustered with wardogs-cash-economy + wardogs-economy).
  // Operator runs docs/migrations/2026-09-08-wardogs-article-economy.sql.
  'how-the-wardogs-economy-works': 'economy',
  // Launch-DAY piece -- the "it's live, here's what to know" article, grounded 100% in the
  // Tier-1 + Season 1 facts of docs/wardogs/WARDOGS_LAUNCH_REFERENCE.md (no Tier-4 unknowns stated).
  // field-intel (with the launch overview). Operator runs
  // docs/migrations/2026-09-10-wardogs-article-launch-day.sql (staged draft; flip at 16:00 UTC).
  'wardogs-early-access-is-live-what-to-know': 'field-intel',
  // Patch 0.11 news piece (NEXUS, published + provenance_tier='sourced', verified_source=BUNGIE).
  // It was published but never added here, so wardogsSectionForArticle() returned null and the
  // article 404'd -- the ONE badged wardogs article that could not resolve (Brief 2g). Mapped to
  // field-intel (the "News" section) with the other patch/news pieces so it resolves at a real URL.
  'wardogs-patch-011-community-servers-economy-bans-and-whats-next-6tpw': 'field-intel',
  // Week-one news piece (NEXUS, published + provenance_tier='sourced', verified_source=BULKHEAD).
  // Same class of gap as patch-011 above: INSERTed + published but never mapped, so
  // wardogsSectionForArticle() returned null and it 404'd at every path. Mapped to field-intel
  // (the "News" section) so it resolves at /wardogs/field-intel/<slug> and the launch-stats link works.
  'wardogs-week-one-what-bulkhead-confirmed-and-what-they-left-unsaid-k9rt': 'field-intel',
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
