// lib/games/index.js
// Per-game config registry (Gap 2, Phase A). Shared gather/editorial code reads
// a game's config from here instead of hardcoding Marathon literals. Marathon is
// the only game today; DMZ (lib/games/dmz.js) is added in Phase B.
// See docs/network/GATHER_GAP2_DMZ_SCOPING.md.

import { marathon } from './marathon.js';
import { dmz } from './dmz.js';

// DMZ registered 2026-07-20 so getGameConfig('dmz') resolves instead of throwing.
// This does NOT make the cron produce DMZ -- the cron calls getGameConfig() with
// no argument, so PRODUCING_GAME is always the default (marathon). Game-param
// cron selection is Phase D (launch-time). Registering here unblocks scripts and
// any future per-game caller that needs the DMZ config.
export const GAMES = {
  marathon,
  dmz,
};

// Default game slug for callers that haven't been parameterized yet (keeps the
// single-game behavior identical while Phase A wires consumers through). STILL
// marathon -- adding DMZ to GAMES does not change the default, so getGameConfig()
// with no argument resolves to marathon exactly as before.
export const DEFAULT_GAME_SLUG = 'marathon';

// Look up a game's config by slug. Throws on an unknown slug rather than
// silently returning undefined (a typo'd slug should fail loudly, not gather
// nothing). Defaults to Marathon when no slug is passed.
export function getGameConfig(slug = DEFAULT_GAME_SLUG) {
  const config = GAMES[slug];
  if (!config) {
    throw new Error('[games] Unknown game slug: ' + slug);
  }
  return config;
}

// Resolve a game's section by slug. Returns the section object or null.
//
// Moved here from the former lib/games/registry.js (deleted): that file held a
// SECOND, null-returning getGameConfig with ZERO external callers -- a latent
// mis-import hazard next to this file's throwing one. getGameSection was its only
// live export, so it moves to the single registry and the duplicate is gone.
//
// It does NOT call the throwing getGameConfig on purpose. This is the section
// lookup for the /dmz/[section] routes; an unknown game or a game with no sections
// must yield null (the routes render notFound()), NOT throw. The guard checks
// `!g.sections` as well as `!g` BECAUSE marathon.js has no `sections` field --
// getGameSection('marathon', ...) must return null, not blow up on
// undefined.find(). Public getGameConfig still throws (a missing game is a
// programming error); section resolution is legitimately optional, so it is the
// one place a null is correct.
export function getGameSection(gameSlug, sectionSlug) {
  const g = GAMES[gameSlug];
  if (!g || !g.sections) return null;
  return g.sections.find(function (s) { return s.slug === sectionSlug; }) || null;
}
