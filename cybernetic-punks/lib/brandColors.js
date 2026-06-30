// lib/brandColors.js
// SINGLE SOURCE OF TRUTH for the JS-side brand + editor colors. Every JS consumer
// imports from here: the OG/icon colors (lib/og/colors.js), the games config
// (lib/games/dmz.js), the network root tiles (lib/network/rootGames.js), the profile
// mock (app/profile-preview), and the web manifest (app/manifest.js). Change a brand
// color here and all of them update at once.
//
// CSS keeps its OWN parallel tokens (app/globals.css :root / .dmz-theme) -- CSS cannot
// import JS, so the two layers are kept in sync BY HAND (change a brand color here AND
// in globals.css).
//
// KEEP THIS MODULE IMPORT-FREE (no '@/' alias, no relative deps): lib/og/colors.js
// imports it and is itself pulled into the bare-node icon script
// (scripts/gen-icons.mjs -> iconMark.js -> colors.js -> here), which has no module
// resolver for '@/' and needs every link in the chain to be plain/relative.

// Brand accents (network -> per-game).
export const NETWORK_BURGUNDY = '#b32d40'; // CNP network default
export const MARATHON_GREEN   = '#00ff41'; // Marathon (= globals.css :root --green)
export const DMZ_FOREST        = '#3f7d44'; // DMZ (= globals.css .dmz-theme --green)

// Editor accent colors (mirror globals.css :root --cipher/--nexus/--dexter/--ghost/--miranda).
export const EDITOR_COLORS = {
  cipher:  '#ff2222',
  nexus:   '#00d4ff',
  dexter:  '#ff8800',
  ghost:   '#00ff88',
  miranda: '#9b5de5',
};

// Shared dark page background (mirror globals.css :root --bg-page).
export const BG_PAGE = '#121418';
