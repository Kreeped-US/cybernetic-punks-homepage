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
  displayName: 'Bodycam',
  tagline: 'Verified intel for the body-cam tactical FPS',
  basePath: '/bodycam',
  developer: 'Reissad Studio',
  storeUrl: 'https://store.steampowered.com/app/2406770/Bodycam/',

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
  },

  // EDITORIAL ROSTER -- NEXUS only, mirroring DMZ/Wardogs/DED.NET. NO generateNews: Bodycam stays
  // OFF the Marathon auto-cron; editorial arrives via a manual owner-reviewed script (a later
  // brief), so getGenerationGames() must NOT include bodycam. cadenceCron records intent only.
  editorial: {
    cadenceCron: '0 19 * * *',
    editors: ['NEXUS'],
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
