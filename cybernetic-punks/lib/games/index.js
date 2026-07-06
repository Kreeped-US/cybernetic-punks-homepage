// lib/games/index.js
// Per-game config registry (Gap 2, Phase A). Shared gather/editorial code reads
// a game's config from here instead of hardcoding Marathon literals. Marathon is
// the only game today; DMZ (lib/games/dmz.js) is added in Phase B.
// See docs/network/GATHER_GAP2_DMZ_SCOPING.md.

import { marathon } from './marathon.js';

export const GAMES = {
  marathon,
};

// Default game slug for callers that haven't been parameterized yet (keeps the
// single-game behavior identical while Phase A wires consumers through).
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
