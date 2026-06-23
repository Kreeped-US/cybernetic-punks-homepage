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
//   - Marathon -> teal (#00d4ff, the --nexus token) per the locked positioning
//     doc (docs/network/cyberneticpunks-brand-positioning.md, "Marathon teal").
//   - DMZ      -> amber, sourced from the canonical lib/games/dmz.js theme.primary
//     (kept in sync with the .dmz-theme --green swap) so it is not re-hardcoded.
// Exact accents are POLISH-TUNABLE (a later styling pass). The STRUCTURE - one
// config entry per game, agnostic components reading it - is what is locked here.
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
    theme: { primary: '#00d4ff', tint: 'rgba(0,212,255,0.08)' }, // teal (= --nexus)
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
    theme: { primary: dmzGame.theme.primary, tint: 'rgba(232,154,44,0.08)' }, // amber
    pulse: {
      mode: 'pre-launch',
      note: 'Oct 23 / field intel incoming',
    },
  },
];

export default ROOT_GAMES;
