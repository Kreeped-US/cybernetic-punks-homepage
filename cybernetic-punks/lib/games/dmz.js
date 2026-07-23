// lib/games/dmz.js
// DMZ game config — the FIRST INSTANCE of the network game-section template.
// See docs/dmz/GAME_TEMPLATE.md (decisions D1-D4).
//
// A future game attaches the SAME way: a config module like this (slug +
// sections) + a registry entry. The template is universal in STRUCTURE
// (slug + sections-config + shared shell); the sections themselves are
// per-game data, declared here. Nothing about DMZ's specific sections is
// baked into the renderer.

import { DMZ_FOREST } from '../brandColors.js';

export const dmz = {
  slug: 'dmz',
  displayName: 'DMZ',   // was `label`; unified with marathon.js's field name (the
                        // top-level game display name). Section entries below keep
                        // their own `label` -- a different, per-section concept.
  // Tagline for the landing hero (display copy, game's own vocabulary).
  tagline: 'Extraction intelligence for the zone',
  basePath: '/dmz',

  // SEO INDEXING GATE vs LAUNCH GATE -- two DELIBERATELY separate flags.
  //
  // indexable: controls SEO exposure ONLY (robots + sitemap). Set true on
  //   2026-07-02 to open /dmz to search early, pre-launch, now that the article
  //   detail route + real game_slug='dmz' content exist. Two consumers read it:
  //     - app/dmz/layout.js  -> robots (index vs noindex,follow) for /dmz and
  //       every /dmz/[section] + /dmz/[section]/[slug] via metadata inheritance.
  //     - app/sitemap.js     -> emits the /dmz hub, section, and article URLs.
  //
  // launched: whether the game is actually LIVE (Oct 23 2026). STILL FALSE. When
  //   launch wiring happens, gate live-only behavior on THIS flag -- live player
  //   counts, LIVE tiles, tier-list pipeline activation, dropping the PRE-LAUNCH
  //   framing -- NOT on indexable. These are separate on purpose; do not re-merge.
  indexable: true,
  launched: false,

  // THREE SEPARATE CONCEPTS -- do not merge any pair. The two flags above plus:
  //   status: the game's LIFECYCLE (pre-launch / live / maintenance). Drives
  //     generation behaviour, effort allocation, and the kill-clock rules per the
  //     doctrine. This is NOT `launched` (a live-player-features flag) and NOT
  //     `indexable` (an SEO flag): a game can be indexable while pre-launch (DMZ is,
  //     right now), and 'maintenance' is a live-but-winding-down state neither
  //     boolean expresses. Collapsing status into either boolean re-loses exactly
  //     the distinction the indexable/launched split was created to keep.
  //   launch_date: the machine value the "Oct 23 2026" comment above held in prose.
  //     The kill-clock starts here for a PRE-LAUNCH game's pages.
  // ADDITIVE (game_slug default-removal pattern): landed before any consumer reads
  // them. NOTHING reads status/launch_date yet -- the GSC kill line, launch
  // countdown, and generation/effort gating are separate later commits.
  status: 'pre-launch',
  launch_date: '2026-10-23',

  // X (official paid API) intake for VANTAGE discourse -- Stage 1 (mirrors the
  // marathon.sources.x shape). watchlist = TRUSTED seed accounts; searchQueries =
  // the games-scoped discovery door. START SMALL -- Justin drops the full vetted
  // list in with no code change. Handles WITHOUT @, lowercased. Seed handles are
  // PLACEHOLDERS to verify on the first dry run (unknown handles skip gracefully).
  sources: {
    x: {
      watchlist: ['charlieintel'],
      searchQueries: [
        '(DMZ "Modern Warfare 4") (extraction OR Hajin OR FOB OR loadout OR meta) -is:retweet -is:reply lang:en',
        '(MW4 DMZ) (release OR launch OR gameplay OR mode) -is:retweet -is:reply lang:en',
      ],
    },
  },

  // EDITORIAL ROSTER (added 2026-07-20). Same shape as marathon.editorial; read
  // by the cron's roster gate (app/api/cron/route.js) -- which is why its absence
  // would have crashed the gate on `config.editorial.editors` if DMZ were ever
  // selected. NEXUS ONLY, on purpose:
  //   - NEXUS = news / meta tracking. Reporting official announcements is the one
  //     editorial job that EXISTS pre-launch, when there is no verified data.
  //   - CIPHER (ranked / play analysis) is EXCLUDED: it needs ranked and play
  //     data that does not exist until the game is out. A launch-time addition.
  //   - DEXTER (build analysis) is DELIBERATELY EXCLUDED: the keyword research
  //     killed DMZ loadout guides (1,300/mo behind a KD wall vs 12,100/mo for
  //     keys). Porting DEXTER would manufacture exactly the model-generated build
  //     content that was just paused for Marathon, for a game with even less basis.
  //
  // NO `editorsRequiringPatch`: a pre-launch game has no patch feed, so the cron's
  // `editorsRequiringPatch || []` makes the patch gate a no-op. With NEXUS not in
  // that list it would run every cycle -- which is WHY DMZ deliberately stays OFF
  // the auto-cron until launch (pre-launch official-announcement volume is near
  // zero; a daily run would manufacture thin rehashes). scripts/gen-dmz-news.mjs
  // is the manual owner-reviewed trigger until launch. See docs/HANDOFF.md.
  editorial: {
    cadenceCron: '0 19 * * *',
    editors: ['NEXUS'],
  },

  // Relevance filter terms for the X off-topic gate (same shape as marathon.relevance).
  // "dmz" is the ambiguous term (collides with military "demilitarized zone" and other
  // games' DMZ modes) -- it only counts when PAIRED with a gaming-context token.
  relevance: {
    // UNIQUE tokens -> relevant on their own. "call of duty" (full phrase) stays here;
    // its abbreviation "cod" moves to ambiguousTokens (it collides with the fish).
    gameTokens: [
      'modern warfare 4', 'mw4', 'call of duty', 'hajin', 'exclusion zone',
      'forward operating base', 'exfil', 'extraction shooter', 'warzone',
    ],
    // Ambiguous common-word abbreviations: "cod" (the fish), "fob" (key fob). Relevant
    // ONLY when paired with "dmz" or a UNIQUE gameToken above -- a bare "cod" is not
    // enough (a real COD post almost always also says "call of duty"/"mw4"/"warzone").
    ambiguousTokens: [ 'cod', 'fob' ],
    contextTokens: [
      'extraction', 'loadout', 'meta', 'build', 'gameplay', 'mode', 'launch',
      'release', 'operator', 'raid', 'contract', 'faction', 'gaming', 'fps',
      'shooter', 'playstation', 'xbox', 'season', 'update', 'patch', 'beta',
    ],
    ambiguousTerm: 'dmz',
  },

  // ROUGH theme tokens — approx the locked DMZ direction (GAME_TEMPLATE.md D3).
  // NOT final: the palette is tuned at the launch-polish pass. The actual
  // CSS-variable swap that drives rendering lives in `.dmz-theme` in
  // globals.css; these values are recorded here for reference / future
  // programmatic theming and MUST be kept in sync with that block.
  theme: {
    primary: DMZ_FOREST, // forest green
    bgPage:  '#0b0e11', // cold grey-blue base
    bgCard:  '#11151a',
    border:  '#2b3640',
    hazard:  '#e0563a', // irradiated red-orange
  },

  // THIN section descriptors (D1): { slug, label, source, contentFilter }.
  //   source 'editor' = filled from feed_items WHERE game_slug='dmz' as articles
  //          publish (editor-fed). contentFilter scopes the feed_items read.
  //   source 'data'   = filled from its OWN entity tables at launch (data-fed);
  //          renders a "coming soon" shell now, contentFilter is null (no query).
  // The source flag is the one justified extra field (D2): it tells the renderer
  // where each section's content comes from. No other speculative fields.
  // description: one-line section summary (used in the section-list header and the
  // landing coverage cards). Display copy only; not used by gather/editorial.
  sections: [
    { slug: 'field-intel', label: 'Field Intel',   source: 'editor', contentFilter: { table: 'feed_items' }, description: 'Confirmed reports on DMZ\'s setting, systems, and what is officially known so far.' },
    { slug: 'meta',        label: 'Meta',          source: 'editor', contentFilter: { table: 'feed_items' }, description: 'Weapon and loadout tier tracking. Activates at launch, once real match data exists.' },
    { slug: 'loadouts',    label: 'Loadouts',      source: 'editor', contentFilter: { table: 'feed_items' }, description: 'Gear, equipment, and build coverage as DMZ\'s systems are detailed.' },
    { slug: 'printer',     label: '3D Printer',    source: 'data',   contentFilter: null, description: 'The 3D Printer crafting tool. Structured data launches with the zone.' },
    // FOB: FLIPPED 'data' -> 'editor' on 2026-07-16. It now renders the editor
    // article-hub (lists the FOB canonical + future FOB pieces as cards) instead
    // of the DmzComingSoon shell. The FOB article is mapped here via
    // DMZ_ARTICLE_SECTION. contentFilter matches the other editor sections; the
    // description no longer says "launches with the zone" because the section is
    // live NOW. When the launch-day structured FOB tool (progression/optimizer)
    // ships, it can render above the article list on this same URL -- the slug is
    // stable either way. To revert: source -> 'data', contentFilter -> null,
    // restore the old description, and re-map the article to 'field-intel'.
    { slug: 'fob',         label: 'FOB',           source: 'editor', contentFilter: { table: 'feed_items' }, description: 'Forward Operating Base reference -- the between-runs hub, its stations, economy, and progression, from the official Deep Dive.' },
    // HAJIN REGIONS: FLIPPED 'data' -> 'editor' on 2026-07-16, same move as fob.
    // Renders the editor article-hub (the Hajin canonical + future region/POI
    // pieces as cards) instead of the DmzComingSoon shell. Article mapped via
    // DMZ_ARTICLE_SECTION. When launch-day structured region/map data ships it can
    // co-exist above the article list on this same URL. To revert: source ->
    // 'data', contentFilter -> null, restore the old description, re-map the
    // article to 'field-intel'.
    { slug: 'regions',     label: 'Hajin Regions', source: 'editor', contentFilter: { table: 'feed_items' }, description: 'The Hajin Exclusion Zone -- setting, the secure-and-extract loop, weather, and the map\'s regions, from the official Deep Dive.' },
    // DISCOURSE (VANTAGE network desk): the network editor-in-chief's coverage of
    // the conversation around DMZ -- what creators and the community are saying,
    // and why it matters. Membership is by TAG ('discourse'), not the per-slug
    // DMZ_ARTICLE_SECTION map (discourse slugs are generated, not hand-curated) --
    // contentFilter.byTag flags that for the section list + landing count. Articles
    // render via the game-neutral components/DiscourseArticle renderer.
    { slug: 'discourse',   label: 'Discourse',     source: 'editor', contentFilter: { table: 'feed_items', byTag: 'discourse' }, description: 'Network-desk coverage of the conversations shaping DMZ -- what creators and the community are saying, and what is actually at stake.' },
  ],
};

// DMZ ARTICLE -> SECTION ASSIGNMENT (config-driven section scoping).
// feed_items has NO section column yet, and DDL is not runnable from the app
// (the service key drives PostgREST row ops, not ALTER TABLE). The DMZ pieces are
// hand-curated and pre-launch, so their section assignment lives here -- ONE slug
// maps to exactly ONE editor section, so a piece can't leak across sections (the
// bug this fixes: the section page filtered only by game_slug, so all 3 showed
// under every section). The DMZ section page filters its query to these slugs;
// the detail route checks the URL's [section] against this map (so [section] is
// genuine, not cosmetic). Marathon is untouched -- it lanes /intel by editor and
// never reads this map.
//
// UPGRADE PATH (when DMZ editorial scales past hand-curation): add a nullable
// `section` text column to feed_items (Marathon rows stay NULL), backfill these
// three, and replace this map with a `.eq('section', ...)` filter. Until then a
// NEW DMZ article must get an entry here or it renders in no section (intentional
// fail-safe: unassigned = hidden, never mis-placed).
export const DMZ_ARTICLE_SECTION = {
  // Hajin (setting / map / geography) -> Hajin Regions.
  // RELOCATED 2026-07-16 from 'field-intel' to 'regions': the article is the
  // canonical for the Hajin Exclusion Zone and belongs under the map/geography
  // URL (regions/POIs is the top pre-launch SEO target). Moved its live URL from
  //   /dmz/field-intel/dmz-hajin-exclusion-zone-what-the-deep-dive-reveals
  // to
  //   /dmz/regions/dmz-hajin-exclusion-zone-what-the-deep-dive-reveals
  // SLUG unchanged; only the [section] segment moved. Old URL was indexed, so a
  // 308 redirect old->new is in next.config.mjs. NOTE: this leaves 'field-intel'
  // with no assigned article (it renders DmzEmptyState until the next general
  // intel piece publishes -- field-intel is the generic catch-all, so it refills
  // trivially; that is why Hajin, not a generic piece, is the one that moves out).
  'dmz-hajin-exclusion-zone-what-the-deep-dive-reveals': 'regions',
  // Whole-base overview (Stash, Wallet, Gunsmith, Boss Board, ...) -> FOB.
  // RELOCATED 2026-07-16 from 'field-intel' to its own 'fob' section: the article
  // is a 628-word canonical for the Forward Operating Base and belongs under the
  // semantically-correct URL. This moved its live URL from
  //   /dmz/field-intel/dmz-forward-operating-base-every-hub-system-detailed
  // to
  //   /dmz/fob/dmz-forward-operating-base-every-hub-system-detailed
  // The SLUG is unchanged; only the [section] segment moved. The old URL was
  // indexed, so a permanent (308) redirect old->new is in next.config.mjs -- if
  // you ever rename this section, update that redirect too or the old URL 404s.
  'dmz-forward-operating-base-every-hub-system-detailed': 'fob',
  // Craftable gear/equipment (NVGs, vests, backpacks, killstreaks) -> Loadouts.
  'dmz-3d-printer-crafting-system-every-category-detailed': 'loadouts',
};

// Slugs assigned to a given DMZ section (empty array if none -> empty state).
export function dmzArticleSlugsForSection(sectionSlug) {
  return Object.keys(DMZ_ARTICLE_SECTION).filter(function (s) {
    return DMZ_ARTICLE_SECTION[s] === sectionSlug;
  });
}

// Resolve which DMZ section an article belongs to -- the single resolver used by
// the detail route, the sitemap, and (later) any DMZ href builder. Curated news
// pieces map by slug (DMZ_ARTICLE_SECTION); VANTAGE discourse pieces map by the
// 'discourse' TAG (their slugs are generated, so they are not in the per-slug
// map). Returns null when unassigned (fail-safe: unmapped = never routed/emitted).
export function dmzSectionForArticle(article) {
  if (!article || !article.slug) return null;
  if (DMZ_ARTICLE_SECTION[article.slug]) return DMZ_ARTICLE_SECTION[article.slug];
  var tags = Array.isArray(article.tags) ? article.tags : [];
  if (tags.indexOf('discourse') !== -1) return 'discourse';
  return null;
}

// PER-ARTICLE SEO OVERRIDES (Chunk C). Keyed by slug: an authored { title,
// description, keyFacts } that the DMZ article template PREFERS over the generic
// headline-derived title / auto-truncated meta / bullet-scraped key facts. Titles
// lead with the "MW4 DMZ" disambiguator (DMZ also = the MWII mode); the root
// title.template appends " | CyberneticPunks" -- do NOT append the site name here.
// keyFacts are authored because the prose rewrites removed the bullet lists the
// render-time extractor relied on. A slug NOT in this map falls back to the
// template's existing derivations (headline title, metaDescription(), extractKeyFacts).
export const DMZ_ARTICLE_SEO = {
  'dmz-forward-operating-base-every-hub-system-detailed': {
    title: 'MW4 DMZ Forward Operating Base Guide: Every Station Explained',
    description: 'How the Forward Operating Base works in MW4 DMZ: the economy, crafting, storage, prep, and hunt stations, from the official Call of Duty Deep Dive.',
    keyFacts: [
      'The FOB is the hub you return to before and after every DMZ run.',
      'It evolves as you progress -- unlocking functionality and changing visually.',
      'The 3D Printer cannot make Primary, Secondary, or Melee weapons.',
      'Slain Lieutenants drop Dog Tags that are also trackable by enemy squads.',
    ],
  },
  'dmz-3d-printer-crafting-system-every-category-detailed': {
    title: 'MW4 DMZ Crafting Guide: Every 3D Printer Category Explained',
    description: 'Every 3D Printer crafting category in MW4 DMZ, grouped by role, plus the resource-rarity rule -- sourced from the official Call of Duty Deep Dive.',
    keyFacts: [
      'All crafting runs through one upgradable 3D Printer at your FOB.',
      'Ten printable categories span survivability, offense, utility, and specials.',
      'Field Upgrades in DMZ do not recharge, unlike in Multiplayer.',
      'Rarer resources come from pushing deeper into the region.',
    ],
  },
  'dmz-hajin-exclusion-zone-what-the-deep-dive-reveals': {
    title: 'MW4 DMZ Hajin Exclusion Zone: Setting, Loop, and Map Overview',
    description: 'Inside MW4 DMZ\'s Hajin Exclusion Zone: the setting, the secure-and-extract loop, dynamic weather, and the map\'s key regions, per the official Deep Dive.',
    keyFacts: [
      'Hajin is a post-Modern Warfare 4 exclusion zone on the Korean peninsula.',
      'The core loop: secure abandoned tech before rival forces, then extract.',
      'Dynamic weather -- rain, fog, overcast -- changes visibility each run.',
      'One of the largest Call of Duty environments, built for high-risk ops.',
    ],
  },
};
