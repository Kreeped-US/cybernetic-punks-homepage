// lib/games/bodycam.js
// Bodycam game config -- game #5, the FIRST LIVE game added after Marathon. Same lean shape as
// DMZ/Wardogs/DED.NET (slug + sections-config + theme + footer), per-game data.
//
// BRIEF #1 = CONFIG + REGISTRY ONLY: this file plus the GAMES / ROOT_GAMES / ENTITY_TABLES
// registry lines. NO routes, NO tables, NO content yet (later briefs). indexable is FALSE (nothing
// to surface), no generateNews (off the auto-cron), no discourse section (discourse render is
// deferred). Pure additive: adding this game changes no existing game's behavior.
//
// GROUNDING (operator-verified vs Reissad's Sept 2 2026 "Locked & Loaded" patch + the Steam page):
// Bodycam is a tactical FPS from Reissad Studio (Unreal Engine 5, body-camera view). It is LIVE in
// EARLY ACCESS -- released into EA on 2024-06-07, "Locked & Loaded" shipped 2026-09-02. It is
// already playable, so there is NO future launch_date and NO countdown (see the status block).
// Content posture: STRUCTURE is confirmed, VALUES are honest-null (no published per-part/per-weapon
// numbers exist yet) -- the vertical launches structure-known, values-pending.

export const bodycam = {
  slug: 'bodycam',
  // News-source provenance for cited news/patch-notes blocks. READY BUT UNUSED: no cron news
  // channel wired for Bodycam; set for when one lands. (Brief per-game news label, 2026-09-21.)
  newsSourceLabel: 'REISSAD STUDIO',
  displayName: 'Bodycam',
  tagline: 'Verified intel for the body-cam tactical FPS',
  basePath: '/bodycam',
  developer: 'Reissad Studio',
  storeUrl: 'https://store.steampowered.com/app/2406770/Bodycam/',

  // EDITOR-PROMPT VOCABULARY (Layer-A {{cnp:...}} tokens, resolved by lib/editors/promptVocab.js at the
  // callEditor chokepoint). Only NEXUS is rostered, so only the tokens NEXUS uses need values; a missing
  // token now degrades to empty (graceful, non-fatal). game name comes from displayName. grades.nexus is
  // NEXUS's grade-metric NAME (Marathon "Grid Pulse", Wardogs "War Report") -- Bodycam calls it "Field Report"
  // (matches the Field Intel section). readerTerm is the audience address term.
  vocabulary: {
    developer: 'Reissad Studio',
    readerTerm: 'Operator',
    readerTermPlural: 'Operators',
    grades: { nexus: 'Field Report' },
  },

  // SEO INDEXING GATE vs LAUNCH state -- two independent things (same discipline as the others).
  // indexable: SEO exposure ONLY. FALSE at brief #1 -- there is no Bodycam content yet, so the
  //   subtree must not be indexed and the sitemap must not emit an empty child. getIndexableGames()
  //   excludes a game with indexable!==true, so a no-content game surfaces NOTHING. Flip TRUE when
  //   the first reviewed content lands (a later brief), exactly as DED.NET/Wardogs did.
  // launched: whether the game is actually LIVE (playable). TRUE -- Bodycam is out in Early Access.
  //   (This field is DEAD -- gameStatus.js never reads it; the label derives from status/date. Set
  //   honestly for record.)
  indexable: false,
  launched: true,

  // Pre-publish corroboration gate mode. Mirrors the others: 'fail-closed'. Inert until an editorial
  // store loader lands; records intent now.
  prePublishGate: 'fail-closed',

  // LIFECYCLE -- the single most important block for a LIVE game. status:'live' makes
  // networkGameStatus()/isGameLive() (lib/network/gameStatus.js) read LIVE with NO countdown and NO
  // "launches in N days": networkGameStatus short-circuits to {text:'LIVE',live:true} on
  // status==='live' BEFORE any date logic, and daysUntil(null) is null so every countdown surface
  // HIDES. This mirrors Marathon (the other live game: status:'live', launch_date:null). Bodycam is
  // in EARLY ACCESS, so earlyAccess:true records that -- it is inert in the label (the EA-date label
  // only fires for a FUTURE date, which Bodycam does not have), and the "Early Access" nature is
  // carried in the tagline/footer instead. NEVER add a placeholder launch_date to satisfy a UI.
  status: 'live',
  launch_date: null,
  earlyAccess: true,

  // FOOTER PRESENTATION (config DATA ONLY -- nothing renders this until the routes land). legal has
  // the three standard parts: (1) the AFFILIATION line with the real publisher name (Reissad
  // Studio); (2) the HEDGED trademark line; (3) a provenance paragraph. The POWERED BY roster is
  // network-level (roster.js), not stored per game.
  footer: {
    description: 'Verified intel for Bodycam, the Reissad Studio body-camera tactical FPS in Steam Early Access. Part of the CyberneticPunks game network.',
    bottomTagline: 'BODYCAM INTELLIGENCE HUB · TACTICAL FPS',
    peerLabel: 'REISSAD STUDIO',
    peerLifecycle: 'EARLY ACCESS · LIVE',
    legal: [
      'CYBERNETIC PUNKS IS AN UNOFFICIAL FAN SITE - NOT AFFILIATED WITH OR ENDORSED BY REISSAD STUDIO.',
      'BODYCAM IS A TRADEMARK OF ITS RESPECTIVE OWNER.',
      'Bodycam is a Reissad Studio tactical FPS, live in Steam Early Access. Everything here is drawn from official Reissad material and in-game observation; specific per-part and per-weapon numbers stay flagged until verified in-game (none are published yet).',
    ],
    links: {
      explore: [
        { label: 'Field Intel', href: '/bodycam/field-intel' },
        { label: 'Modes',       href: '/bodycam/modes'       },
        { label: 'Arsenal',     href: '/bodycam/arsenal'     },
        { label: 'Maps',        href: '/bodycam/maps'        },
      ],
    },
    // THEMED FOOTER opt-in (mirrors the DED.NET rollout: fe02d3d + abb4d9e). Bodycam is
    // noindex (indexable:false) so bundling this with the header logo is SEO-safe. Config
    // contract: components/game/ThemedGameFooter.js. color is OMITTED -> ThemedGameFooter
    // derives it from theme.accent (#3d97b8 steel-cyan). Logo: the operator's transparent press mark
    // (public/images/Bodycam/BODYCAM transparent logo.png 1920x1080, kept untracked) -> trimmed
    // alpha-WebP at public/images/Bodycam/bodycam-logo.webp (640x328, ~1.95:1, ~86KB). At height 68 it
    // renders ~133px wide -- masthead weight matched to DED.NET's 2:1 mark (64 -> ~128px; a touch taller).
    // Backdrop is the operator's press art (bodycam-footer.webp), scrimmed by the component.
    themed: {
      enabled: true,
      logo: { src: '/images/Bodycam/bodycam-logo.webp', height: 68, maxWidth: 260, alt: 'Bodycam' },
      // Footer backdrop: the operator's press art (public/bodycam-footer.png 1920x1080, 1.46MB)
      // converted to WebP (public/images/games/bodycam-footer.webp, ~81KB). Same approach as DMZ
      // (cd0db29): opacity 1.0 (full image) + scrimStrength 0.5 (halve the shared heavy scrim) so the
      // art reads bright while footer text/links stay legible.
      backdrop: { src: '/images/games/bodycam-footer.webp', opacity: 1.0, position: 'center 40%' },
      scrimStrength: 0.5,
    },
  },

  // EDITORIAL ROSTER -- NEXUS ONLY, news from the official Reissad Steam feed. Bodycam joins autonomous
  // generation (generateNews:true -> getGenerationGames() includes 'bodycam'), but produces NOTHING
  // without an operator-reviewed approval: holdForReview:true forces EVERY Bodycam draft to land
  // is_published=false + gate_status='clear' (the admin-drafts DRAFT state; published only via
  // POST /api/admin/drafts/approve), independent of the global STORE_ROW_CITATION_ENABLED flag. NO
  // MIRANDA / NO allowSelfSelect: there is no verified Bodycam store yet, so no grounded evergreen
  // producer and no self-select (which would be ungrounded/Marathon-flavored). NEXUS is PATCH-GATED
  // (editorsRequiringPatch) -> it runs ONLY on a detected patch cycle; on a quiet day it is
  // patch_frozen and the cron produces zero (no LLM call). ACTIVATION: getGenerationGames() only
  // AUTHORIZES /api/cron?game=bodycam; a vercel.json cron entry (added separately) is what SCHEDULES it.
  editorial: {
    cadenceCron: '0 19 * * *',
    editors: ['NEXUS'],
    // NEXUS runs only on a detected patch/hotfix cycle (mirrors Wardogs). Pre-store, a daily NEXUS
    // would self-select ungrounded news; patch-gating keeps it to real Reissad updates.
    editorsRequiringPatch: ['NEXUS'],
    // The generation switch (getGenerationGames reads this, NOT indexable). ON.
    generateNews: true,
    // GAME-AGNOSTIC HOLD: every draft for this game is held for operator review -- never auto-publish.
    // Honored by the cron via heldForReviewAppliesForGame (lib/content/heldForReview.js), overriding the
    // gate decision to is_published=false + gate_status='clear'. Bodycam has no verified store, so the
    // human IS the corroboration gate; news stats trace to the gathered official post (cited-blocks
    // provenance). prePublishGate stays 'fail-closed' (cross-game-entity defense + logged findings), but
    // its 'held' status is overridden to the operator-review 'clear' draft state by this flag.
    holdForReview: true,
    // STALENESS WATCHDOG threshold (lib/staleness.js, read by /api/cron/inspect at editorial.staleAfterDays,
    // DEFAULT 14). Raised to 45: Bodycam is patch-gated and Reissad's next release is an UNDATED
    // intermediate update, so legitimately-long gaps between new feed_items are expected. 45 keeps the
    // broken-pipeline backstop (STALE still fires if nothing lands for 45 days) without emailing every 14.
    staleAfterDays: 45,
  },

  // FEED SOURCES -- the inputs gatherAll(config) reads. OFFICIAL-ONLY posture for Bodycam: NEXUS writes
  // from the official Reissad Steam news feed (app 2406770). Reuses the SHARED steam-news gatherer
  // (lib/gather/patchnotes + lib/gather/index.js) -- NO Bodycam-only code path. The community lists
  // (reddit / youtube / twitch) are INTENTIONALLY EMPTY: no third-party sites, no wiki. The gatherers
  // read these fields (youtube.searchQueries/creatorChannels, reddit.subreddits, twitch.gameNames) and
  // return [] for empty lists (safe), so ONLY the official feed feeds the editor. gatherMirandaData
  // defaults sources.miranda to {} for a NEXUS-only game, so no miranda block is needed.
  sources: {
    steamAppId: '2406770',
    reddit:  { subreddits: [] },
    youtube: { searchQueries: [], creatorChannels: [] },
    twitch:  { gameNames: [] },
    // Official Reissad news via the Steam news feed for the appid (same engine as Marathon/Wardogs).
    patchNotes: {
      type: 'steam-news',
      appId: '2406770',
      detection: {
        officialFeedName: 'steam_community_announcements',
        // Reissad versions its posts "V0.8 #N" / "V0.8 Locked & Loaded" -- a V-prefixed dotted number.
        // Matches "Bodycam PATCH NOTES · V0.8 #2" and "V0.8 Locked & Loaded"; the SteamDB press rows are
        // excluded by officialFeedName, and marketing titles without a version do not match. Verified
        // against the live feed (docs/sources/bodycam/steam-news-2026-10-01.json). NB the pre-launch
        // Devlogs also carry "V0.8 Locked & Loaded" so they match the regex too -- but they are all >48h
        // past and were a one-time series; freshnessMs neutralizes them, and any false match only ever
        // yields a HELD draft (holdForReview), never an auto-publish.
        versionRe: /\bv\d+(?:\.\d+)+/i,
        keywords: ['patch notes', 'hotfix'],
        freshnessMs: 48 * 60 * 60 * 1000,
      },
      label: 'REISSAD STUDIO',
    },
  },

  // Relevance filter terms (filterGameVideos + the off-topic gate). REQUIRED -- absence throws in
  // isGameContent. With the community source lists empty these are mostly inert, but the filter is still
  // invoked, so the block must exist. Best-effort Bodycam terms.
  relevance: {
    gameTokens: ['bodycam', 'reissad'],
    ambiguousTokens: [],
    contextTokens: ['patch', 'update', 'hotfix', 'early access', 'fps', 'shooter', 'loadout', 'wingman', 'trenches', 'steam'],
    ambiguousTerm: 'bodycam',
  },

  // THEME tokens -- INLINE (self-contained, the portable approach; this game seeds the shared
  // route template later, so it uses inline tokens rather than a globals.css class). Accent is a
  // cold tactical STEEL-CYAN -- body-cam realism / low-light HUD -- DISTINCT from Marathon green
  // (#00ff41), DMZ forest (#3f7d44), Wardogs amber (#e0a13a), DED.NET blood-red (#cc2936), and the
  // network burgundy (#b32d40). Starting values, tunable at polish.
  theme: {
    primary: '#3d97b8',   // steel-cyan -- network-root accent (root tile + pulse column)
    accent:  '#3d97b8',   // the /bodycam primary accent
    bgPage:  '#0a0c0e',   // cold near-black tactical base
    bgCard:  '#12161a',
    border:  '#232a30',
    hazard:  '#c8cdd2',   // cold HUD grey (secondary signal)
  },

  // THIN section descriptors { slug, label, [navLabel], source, contentFilter, description }.
  //   source 'editor' = filled from feed_items WHERE game_slug='bodycam' as articles publish.
  //   source 'data'   = its own entity tables later; renders a coming-soon shell now.
  // Minimal CONFIRMED set. NO 'attachments' section yet: attachments live under Arsenal, and the
  // bespoke attachment builder + its data model are a later brief -- a dedicated section is added
  // when that render exists, not before (never declare a section with no home). NO 'discourse'
  // section (discourse render is deferred). Values stay honest-null until verified in-game.
  sections: [
    { slug: 'field-intel', label: 'Field Intel', navLabel: 'News', source: 'editor', contentFilter: { table: 'feed_items' }, description: 'Confirmed reports on Bodycam and what Reissad Studio has officially shipped - patches, modes, and Early Access changes.' },
    { slug: 'modes',       label: 'Modes',                          source: 'editor', contentFilter: { table: 'feed_items' }, description: 'The competitive modes - Wingman 2v2, TDM, Deathmatch, Hardpoint, and Gun Game - as the studio has confirmed them.' },
    { slug: 'arsenal',     label: 'Arsenal',                        source: 'data',   contentFilter: { table: 'weapon_stats' }, description: 'Weapons and the real-parts attachment system. Structured tables are built against in-game data - not guesses - and specific numbers stay flagged until published or verified.' },
    { slug: 'maps',        label: 'Maps',                           source: 'data',   contentFilter: null,                    description: 'Bodycam maps, including the Trenches map, with the structure confirmed and detail added as it is verified in-game.' },
  ],

  buildToolCta: null,
};

// BODYCAM ARTICLE -> SECTION ASSIGNMENT. feed_items has no section column, so (as with the other
// games) a curated piece maps its slug to exactly one editor section here. EMPTY at brief #1 -- no
// Bodycam articles exist yet. A NEW article must get an entry here or it renders in no section
// (fail-safe: unassigned = hidden, never mis-placed).
export const BODYCAM_ARTICLE_SECTION = {
  // content #1 (the quality-bar article) -- the no-class / loadout-system explainer, grounded in
  // docs/bodycam/BODYCAM_SYSTEM_REFERENCE.md. Renders at /bodycam/field-intel/<slug> once the
  // operator runs docs/migrations/2026-09-02-bodycam-article-classes.sql (feed_items row).
  'does-bodycam-have-classes': 'field-intel',
  // content #2 -- the Trenches flagship-map deep-dive, grounded in the CONFIRMED tier of
  // docs/bodycam/BODYCAM_MAPS_REFERENCE.md. Operator runs docs/migrations/2026-09-02-bodycam-article-trenches.sql.
  'bodycam-trenches-map': 'field-intel',
  // content #3 -- the Locked & Loaded (v0.8) patch-notes explainer, grounded in the operator-reviewed
  // draft (Reissad Steam patch notes, Sep 2-4 2026). Published via a hand-written feed_items INSERT.
  'bodycam-locked-and-loaded-v08-what-changed': 'field-intel',
};

// Slugs assigned to a given section (empty array -> empty state).
export function bodycamArticleSlugsForSection(sectionSlug) {
  return Object.keys(BODYCAM_ARTICLE_SECTION).filter(function (s) {
    return BODYCAM_ARTICLE_SECTION[s] === sectionSlug;
  });
}

// Resolve which section an article belongs to. Curated pieces map by slug; returns null when
// unassigned (fail-safe: unmapped = never routed/emitted).
export function bodycamSectionForArticle(article) {
  if (!article || !article.slug) return null;
  if (BODYCAM_ARTICLE_SECTION[article.slug]) return BODYCAM_ARTICLE_SECTION[article.slug];
  return null;
}

export default bodycam;
