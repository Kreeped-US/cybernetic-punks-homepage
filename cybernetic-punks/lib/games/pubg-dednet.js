// lib/games/pubg-dednet.js
// PUBG: DED.NET game config -- the THIRD instance of the network game-section template
// (DMZ first, Wardogs second). Same shape, per-game data. Phase 1 = CONFIG + INFRASTRUCTURE
// ONLY: hub + config-driven sections + article route + sitemap wiring, all INERT until content
// ships (indexable:false; no articles yet). NO generator this pass (that is Phase 2).
//
// GROUNDING: every fact here traces to docs/dednet-firstparty-VERIFIED.md (the committed
// primary-source doc). DED.NET was revealed at gamescom ONL 2026-08-25 and is DELIBERATELY THIN:
// a closed beta is coming (console-first), and the RELEASE DATE IS TBA -- there is no launch
// window from any source. launch_date is therefore null (see the null-date discipline below).
//
// ATTRIBUTION (Fable Q2): the richest DED.NET detail comes from a dev-to-outlet interview (PUBG
// Studios CD Dave Curd, Inven Global). That material is primary AS A RECORD but must be surfaced
// ATTRIBUTED ("PUBG Studios' Dave Curd told Inven Global..."), never as anonymous first-party. The
// direct-first-party facts (Steam / ded.net / KRAFTON press release) need no such attribution.
// The Phase 2 generator MUST honor this split -- see promptKit.attributionRule.

import { DEDNET_BLOOD } from '../brandColors.js';

export const pubgDednet = {
  slug: 'pubg-dednet',
  displayName: 'PUBG: DED.NET',   // top-level game display name (root tile reads this)
  tagline: 'Verified intel for the roguelite bloodsport',
  basePath: '/pubg-dednet',

  // SEO INDEXING GATE vs LAUNCH GATE -- two separate flags (same discipline as DMZ/Wardogs).
  // indexable: SEO exposure ONLY. FALSE for Phase 1 -- the hub + sections are empty skeletons, so
  //   the whole /pubg-dednet subtree stays noindex,follow (crawlers still traverse back to the
  //   network root). Flip TRUE when the first content lands (Phase 2). Read by
  //   app/pubg-dednet/layout.js (robots) + the sitemap block (gated on getIndexableGames()).
  // launched: whether the game is actually LIVE. FALSE (not even a beta date yet).
  indexable: false,
  launched: false,

  // Pre-publish corroboration gate mode. Mirrors DMZ/Wardogs: 'fail-closed'. Inert until an
  // editorial store loader lands; records intent now.
  prePublishGate: 'fail-closed',

  // Lifecycle. status 'revealed' = announced, NO date. launch_date is NULL by design: DED.NET's
  // release is To Be Announced across ALL sources (Steam "To be announced"; the interview confirms
  // still-TBA). DED.NET is the network's FIRST null-date game. Every launch surface must handle
  // null HONESTLY -- daysUntil(null) -> null -> the countdown/tile pill HIDES rather than faking a
  // date/0-days/negative. NEVER add a placeholder date here to satisfy a UI; the honest surface is
  // "Revealed / closed beta / TBA", not a countdown.
  status: 'revealed',
  launch_date: null,

  // EDITORIAL ROSTER -- NEXUS only, mirroring DMZ/Wardogs. News / official-announcement tracking is
  // the one editorial job that exists pre-launch (no verified play data). Read by the cron roster
  // gate (config.editorial.editors); DED.NET stays OFF the auto-cron (Phase 2 uses a manual,
  // owner-reviewed script grounded strictly in the verified doc, like Wardogs).
  editorial: {
    cadenceCron: '0 19 * * *',
    editors: ['NEXUS'],
  },

  // Theme tokens -- GRUNGEHOUSE aesthetic (1990s grunge fused with grindhouse; dark, industrial,
  // VHS/dark-web decay). STARTING VALUES, tunable at polish. Accent = grindhouse blood-red
  // (DEDNET_BLOOD #cc2936), DISTINCT from Marathon green / DMZ forest / Wardogs amber / the network
  // burgundy. On-theme for "DED = Dog Eat Dog" / body horror / uncensored violence.
  theme: {
    primary: DEDNET_BLOOD,   // network-root accent (root tile + pulse column)
    accent:  '#cc2936',      // grindhouse blood-red -- the /pubg-dednet primary accent
    bgPage:  '#0b0a0a',      // near-black grunge base
    bgCard:  '#141011',
    border:  '#2a2022',
    hazard:  '#e0b400',      // sickly hazard yellow (secondary warning accent)
  },

  // THIN section descriptors { slug, label, source, contentFilter, description }.
  //   source 'editor' = filled from feed_items WHERE game_slug='pubg-dednet' as articles publish.
  //   source 'data'   = its own entity tables at/after beta; renders a coming-soon shell now.
  // Pre-launch these are studio/interview-confirmed SYSTEMS + WORLD topics only; every specific
  // number stays flagged, and interview-sourced facts stay ATTRIBUTED (see promptKit).
  sections: [
    { slug: 'field-intel', label: 'Field Intel', navLabel: 'News', source: 'editor', contentFilter: { table: 'feed_items' }, description: 'Confirmed reports on PUBG: DED.NET and what KRAFTON / PUBG Studios has officially detailed so far.' },
    { slug: 'systems',     label: 'Systems',                       source: 'editor', contentFilter: { table: 'feed_items' }, description: 'The roguelite run, ROMs, five-phase Power Gates, injuries, and the 60-player / 3-squad match structure - the systems the studio has described.' },
    { slug: 'world',       label: 'World',                         source: 'editor', contentFilter: { table: 'feed_items' }, description: 'GRUNGEHOUSE - 1996 Cascadia, the dark-web bloodsport, benefactors, and King of Killers, as PUBG Studios frames it.' },
    { slug: 'arsenal',     label: 'Arsenal',                       source: 'data',   contentFilter: null,                    description: 'Verified weapon and ROM (ability) data. Structured tables are built against real in-game numbers once the closed beta opens - not pre-launch guesses.' },
  ],

  buildToolCta: null,

  // PROMPT KIT -- the Phase 2 generator's game-model grounding. NOT a full editorial promptKit
  // (DED.NET, like DMZ/Wardogs, uses a bespoke owner-reviewed script, not the marathon cron), but
  // the generator reads these to ground strictly in the verified doc and honor the attribution +
  // honest-null rules. This asserts intent now; the generator is built in Phase 2.
  promptKit: {
    // The ONLY factual basis. The generator grounds excerpt-only in this doc; nothing else.
    sourceDoc: 'docs/dednet-firstparty-VERIFIED.md',
    // The one-line model of what DED.NET IS (all traceable to the doc).
    gameModel: 'PUBG: DED.NET is a multiplayer FPS from PUBG Studios (KRAFTON) that fuses shooter combat with roguelite progression across multi-match RUNS, set in a fictional 1996 Cascadia (Pacific Northwest). A RUN spans several matches; you pick a contestant and build a character by acquiring ROMs (ability chips) while managing accumulating INJURIES, and extract before injuries end the run. Matches are 60 players in 3-player squads across a >5x5 km map with a wandering blue zone and five-phase simultaneous ability unlocks (Power Gates, no stat-inflation abilities). Tone is GRUNGEHOUSE (grunge + grindhouse); DED = Dog Eat Dog; the frame is a dark-web reality show with intervening "benefactors" and a King of Killers objective.',
    // The attribution split the generator MUST honor.
    attributionRule: 'Two tiers per docs/dednet-firstparty-VERIFIED.md. DIRECT first-party (Steam store app 2726580, ded.net, the KRAFTON press release) may be stated plainly. ATTRIBUTED material (the Curd / Inven Global interview - match structure, ROM examples, phases, injuries, tone, music, monetization, vs-BATTLEGROUNDS) MUST be surfaced attributed ("PUBG Studios\' Dave Curd told Inven Global..."), never as anonymous first-party. NEVER state SECONDARY items as fact (Cult Church is press-only; the "chicken dinner" run-goal phrasing is in no source). Honest-null the UNKNOWN list (release/beta date, 3 of 5 world locations, full ROM roster, solo mode, exact price). Release date is TBA - never invent one.',
  },
};

// PUBG: DED.NET ARTICLE -> SECTION ASSIGNMENT. feed_items has no section column, so (as with
// DMZ/Wardogs) a curated piece maps its slug to exactly one editor section here. A NEW article
// must get an entry here or it renders in no section (fail-safe: unassigned = hidden, never
// mis-placed). These 6 slugs are the Phase 2b articles persisted by
// scripts/persist-pubg-dednet-news.mjs (keys = the feed_items slugs, dednet- prefixed). They
// resolve to their section for /pubg-dednet/<section>/<slug> routing + sitemap emission once the
// drafts are published (is_published=true) AND pubg-dednet.indexable is flipped true.
export const DEDNET_ARTICLE_SECTION = {
  'dednet-the-reveal': 'field-intel',
  'dednet-the-run-and-roms': 'systems',
  'dednet-match-structure': 'systems',
  'dednet-grungehouse-setting': 'world',
  'dednet-unorthodox-tactics': 'systems',
  'dednet-confirmed-vs-unknown': 'field-intel',
};

// Slugs assigned to a given section (empty array -> empty state).
export function dednetArticleSlugsForSection(sectionSlug) {
  return Object.keys(DEDNET_ARTICLE_SECTION).filter(function (s) {
    return DEDNET_ARTICLE_SECTION[s] === sectionSlug;
  });
}

// Resolve which section an article belongs to. Curated pieces map by slug; returns null when
// unassigned (fail-safe: unmapped = never routed/emitted).
export function dednetSectionForArticle(article) {
  if (!article || !article.slug) return null;
  if (DEDNET_ARTICLE_SECTION[article.slug]) return DEDNET_ARTICLE_SECTION[article.slug];
  return null;
}

export default pubgDednet;
