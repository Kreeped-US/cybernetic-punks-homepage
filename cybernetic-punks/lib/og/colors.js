// lib/og/colors.js
// Accent colors for the code-generated OG cards (next/og ImageResponse) + the
// CNP-block text-contrast rule. The accent drives the top rule, the CNP block
// background, and (on game cards) the game-tag pill border/text.
//
// Values come from lib/brandColors.js (the JS single source of truth). Imported via a
// RELATIVE path with extension so the bare-node icon script (scripts/gen-icons.mjs ->
// iconMark.js -> this file -> brandColors.js) resolves the whole chain.

import { NETWORK_BURGUNDY, MARATHON_GREEN, DMZ_FOREST } from '../brandColors.js';

export const OG_COLORS = {
  network:  NETWORK_BURGUNDY, // burgundy -- the CNP network default (no game tag)
  marathon: MARATHON_GREEN,   // neon green -- the live Marathon --green
  dmz:      DMZ_FOREST,       // forest green -- DMZ
};

// CNP block text color: BLACK on the neon-green Marathon block (contrast on bright
// green), WHITE on the burgundy + forest blocks.
export function blockTextColor(accent) {
  return accent === OG_COLORS.marathon ? '#000000' : '#ffffff';
}
