// lib/og/colors.js
// Accent colors for the code-generated OG cards (next/og ImageResponse) + the
// CNP-block text-contrast rule. The accent drives the top rule, the CNP block
// background, and (on game cards) the game-tag pill border/text.
//
// Values come from lib/brandColors.js (the JS single source of truth). Imported via a
// RELATIVE path with extension so the bare-node icon script (scripts/gen-icons.mjs ->
// iconMark.js -> this file -> brandColors.js) resolves the whole chain.

import { NETWORK_BURGUNDY, MARATHON_GREEN, DMZ_FOREST, DEDNET_BLOOD, WARDOGS_AMBER } from '../brandColors.js';

export const OG_COLORS = {
  network:  NETWORK_BURGUNDY,   // burgundy -- the CNP network default (no game tag)
  marathon: MARATHON_GREEN,     // neon green -- the live Marathon --green
  dmz:      DMZ_FOREST,         // forest green -- DMZ
  'pubg-dednet': DEDNET_BLOOD,  // grindhouse blood-red (#cc2936) -- PUBG: DED.NET
  wardogs:  WARDOGS_AMBER,      // warm amber (#e0a13a) -- Wardogs
};

// CNP block text color: BLACK on the BRIGHT blocks (Marathon neon green + Wardogs amber -- white
// text on them would be unreadable), WHITE on the darker blocks (burgundy, forest, blood-red).
export function blockTextColor(accent) {
  return (accent === OG_COLORS.marathon || accent === OG_COLORS.wardogs) ? '#000000' : '#ffffff';
}
