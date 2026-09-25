// lib/games/gameRoutes.js
// SHARED per-game internal-route allowlist for the editor-prompt CTA lines (2026-09-25).
// Generalizes lib/games/marathonRoutes.js: the ONE place that owns which tool/hub routes a game's
// generated articles may LINK TO in their prompts, and whether each is LIVE (indexable) today.
//
// WHY: editorCore's "PLANNING TOOLS" CTA lines + the NEXUS meta-tier bullet are shared prompt text.
// Games that do not define a route rendered EMPTY markdown links ("[]()", "[factions]()",
// "[meta tier list]()") into the prompt (dmz, pubg-dednet, bodycam -- and wardogs for factions/meta).
// resolveKit (lib/editors/promptVocab.js) now builds those CTA lines from THIS allowlist and emits a
// line ONLY when the game has that route with live===true. A missing or live:false route -> the line
// is omitted entirely (no empty link, no Marathon fallback).
//
// live === true means the route is a real, INDEXABLE page RIGHT NOW (not a source:'data'/SOON shell,
// not a row-count-gated-noindex hub with empty tables pre-launch). A CTA must never point a reader at
// a noindex/coming-soon page. gameRoutes.test.mjs asserts each entry has a real app/<...>/page.js;
// the `live` flag is HAND-SET and documented here (indexability is a runtime/data fact a static test
// cannot fully derive, so it is a reviewed constant).
//
//   primaryTool : the "plan your build" tool CTA (Marathon Cradle planner / Wardogs Loadout Finder).
//   factions    : the faction/gear-progression hub CTA.
//   meta        : the meta tier-list hub CTA (NEXUS split-tier bullet).

export const GAME_ROUTES = {
  marathon: {
    primaryTool: { label: 'Cradle planner', path: '/marathon/cradle',   live: true },
    factions:    {                          path: '/marathon/factions', live: true },
    meta:        { label: 'meta tier list', path: '/marathon/meta',     live: true },
  },
  wardogs: {
    // primaryTool byte-identical to today's editorial.primaryTool rendering.
    primaryTool: { label: 'Loadout Finder', path: '/wardogs/loadouts', live: true },
    // meta rewired to the real Wardogs meta hub (decision 2026-09-25); no faction system -> factions omitted.
    meta:        { label: 'meta tier list', path: '/wardogs/tier-list', live: true },
  },
  // DMZ (pre-launch, launch Oct 23 2026): field-intel/fob are live editorial sections, but every
  // TOOL-like page (printer=source:'data' SOON; builds/pois/items/keys/missions = row-count-gated
  // noindex while tables are empty) is NOT live+indexable yet, and there is no faction/meta hub. So
  // NO CTA route is live pre-launch -> all CTA lines omit. LAUNCH-DAY: set primaryTool to whichever of
  // /dmz/printer or /dmz/builds is live+indexable first (see docs/HANDOFF.md launch list).
  dmz: {},
  // PUBG: DED.NET (revealed, pre-launch): section hubs only, no tool/meta/factions hub -> omit.
  'pubg-dednet': {},
  // Bodycam (indexable:false -> whole subtree noindex): no live indexable CTA target -> omit.
  bodycam: {},
};

// BACKWARD-COMPAT: the Marathon /marathon/* map that lib/games/marathon.js reads for its
// vocabulary.links + editorial.primaryTool.href. Kept here so there is ONE route source of truth;
// lib/games/marathonRoutes.js re-exports this.
export const MARATHON_ROUTES = {
  cradle:   '/marathon/cradle',
  factions: '/marathon/factions',
  meta:     '/marathon/meta',
};
