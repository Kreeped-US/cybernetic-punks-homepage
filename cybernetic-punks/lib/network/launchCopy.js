// lib/network/launchCopy.js
// Game-agnostic LAUNCH-DEPENDENT copy. Every string a launch makes false is branched here on
// isGameLive(cfg) -- the same single pre-launch -> live signal the hub hero, countdown and footer
// peer label use (lib/network/gameStatus.js) -- so they all flip together on the game's
// launch_date with no edit, no rebuild and no new date constant.
//
// POST-LAUNCH wording must be true with ZERO rows and stay true once rows exist (the empty state
// only renders at 0 rows): it says the game is live and that verified entries are added as they
// are confirmed in-game. No dates, no counts, no named tools. Pre-launch wording is the caller's
// own (it may keep the dated "launches <date>" copy, which is true until the date).
//
// Any game can reuse this: pass its config (needs displayName + status/launch_date) and the
// entity's pre-launch line. Pure, server-safe, no state.

import { isGameLive } from './gameStatus.js';

// The generic switch: the caller's pre-launch text until the game is live, its post-launch text
// after. Both strings belong to the caller; this only decides which one is true right now.
export function launchText(cfg, preLaunchText, postLaunchText) {
  return isGameLive(cfg) ? postLaunchText : preLaunchText;
}

// Whether a "notify me at launch" capture (form, strip or block) should render for this game. True only
// BEFORE launch: once the game is live, "we'll email you when it launches" is no longer true, so the
// capture UI disappears on the same isGameLive signal as everything else -- no redeploy at launch.
// Gate at the SERVER render site (with any wrapper/label around the capture), never inside a client
// component, so the decision uses the server clock and never causes a hydration mismatch.
export function showLaunchNotify(cfg) {
  return !isGameLive(cfg);
}

// Empty-state heading + body for an entity hub with no rows.
//   cfg            game config (displayName, status, launch_date)
//   plural         the entity's plural label ("Keys", "Locations") -- lower-cased in the copy
//   preLaunchText  the entity's own pre-launch line (e.g. entity.hubEmpty)
export function emptyStateCopy(cfg, plural, preLaunchText) {
  if (isGameLive(cfg)) {
    return {
      heading: 'None verified yet',
      text: cfg.displayName + ' is live. Verified ' + String(plural).toLowerCase()
        + ' are added here as each one is confirmed in-game.',
    };
  }
  return { heading: 'Awaiting launch', text: preLaunchText };
}

// Status label for a PLANNED tool card (a tool with no backing data yet). Deliberately the SAME
// before and after launch: a launch does not make a tool exist. A card may only claim "live" once
// its own data exists, which is the caller's check, not the clock's.
export var PLANNED_TOOL_LABEL = 'In development';

// Section note beside a deck of planned tools. Same before and after launch, for the same reason;
// never promises a delivery date.
export var PLANNED_TOOLS_NOTE = 'Planned - not live yet';
