// lib/network/rootGames.js
// NETWORK-ROOT presentation config: the games shown on the neutral front door,
// keyed by game_slug. This is the single source that drives the game-agnostic
// routing tiles and the game-segmented pulse columns on the root. Adding a third
// game to the front door = adding ONE entry here; no component edits.
//
// SCOPE: this is the ROOT (presentation) layer only. It is deliberately separate
// from the two existing, purpose-specific registries so neither has to absorb
// front-door concerns:
//   - lib/games/index.js   (GAMES)          -> gather/editorial backend config
//   - lib/games/registry.js (GAME_REGISTRY) -> DMZ route-group template registry
//     (Marathon is intentionally absent there; it runs on unprefixed routes.)
// This module carries ONLY what a tile + a pulse column need to render per game.
//
// THEME: theme.primary maps to the design-token palette (app/globals.css). The
// root renders all games on one page (not wrapped in a per-game .theme class), so
// each game's accent is declared here as an explicit value rather than relying on
// the CSS-variable cascade swap:
//   - Marathon -> green (#00ff41, the --green token) -- Marathon's established
//     site identity (Nav / homepage / meta). The positioning doc says "teal" but
//     that predates the green identity; green keeps the root consistent with the
//     hub it routes to.
//   - DMZ      -> amber, sourced from the canonical lib/games/dmz.js theme.primary
//     (kept in sync with the .dmz-theme --green swap) so it is not re-hardcoded.
// Accents are v1 STARTING VALUES, deliberately single-source here (one value per
// game) so they are trivially swappable when the exact palette is iterated. The
// STRUCTURE - one config entry per game, agnostic components reading it - is what
// is locked. Components must read these, never hardcode an accent.
//
// PULSE: pulse.mode is the agnostic switch the components render on (NOT the
// slug). 'live' = real online count + next-update + real feed_items column.
// 'pre-launch' = the designed coming-soon state, no live data. The page resolves
// the live numbers/items and passes them in; the config only declares intent.

import { dmz as dmzGame } from '@/lib/games/dmz';

export const ROOT_GAMES = [
  {
    slug: 'marathon',
    label: 'Marathon',
    route: '/marathon',
    // Optional atmosphere art, rendered as a treated (scrim-masked) tile
    // background by GameRoutingTile. SOURCE: press / promotional asset released by
    // the publisher for editorial use (traceability note). OWNER ACTION: the file
    // must be added to the repo at this public path; the component degrades
    // gracefully to the clean tile until the file exists.
    heroImage: '/images/games/marathon-hero.jpg',
    theme: { primary: '#00ff41', tint: 'rgba(0,255,65,0.08)' }, // green (= --green; Marathon site identity)
    pulse: {
      mode: 'live',
      onlineSource: 'steam',         // which live_stats source counts as "online"
      feed: { gameSlug: 'marathon' }, // feed_items scope for this game's column
    },
  },
  {
    slug: dmzGame.slug,              // 'dmz' from the canonical config
    label: dmzGame.label,           // 'DMZ'
    route: dmzGame.basePath,        // '/dmz' (pre-launch hub placeholder)
    // Optional atmosphere art, rendered as a treated (scrim-masked) tile
    // background by GameRoutingTile -- BEHIND the pre-launch markers, which stay
    // the foreground (the amber PRE-LAUNCH tag + the "Oct 23" note remain on top
    // and legible). SOURCE: press / promotional asset released by the publisher
    // for editorial use (traceability note). OWNER ACTION: file tracked in the
    // repo at this public path; component degrades to the clean tile if absent.
    heroImage: '/images/games/dmz-hero.jpg',
    theme: { primary: dmzGame.theme.primary, tint: 'rgba(232,154,44,0.08)' }, // amber
    pulse: {
      mode: 'pre-launch',
      note: 'Oct 23 / field intel incoming',
    },
  },
];

export default ROOT_GAMES;
