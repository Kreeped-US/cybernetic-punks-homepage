// lib/og/colors.js
// Accent colors for the code-generated OG cards (next/og ImageResponse), + the
// CNP-block text-contrast rule. The accent drives the top rule, the CNP block
// background, and (on game cards) the game-tag pill border/text.

export const OG_COLORS = {
  network:  '#b32d40', // burgundy -- the CNP network default (no game tag)
  marathon: '#00ff41', // neon green -- matches the live Marathon --green
  dmz:      '#3f7d44', // forest green -- DMZ
};

// CNP block text color: BLACK on the neon-green Marathon block (contrast on bright
// green), WHITE on the burgundy + forest blocks.
export function blockTextColor(accent) {
  return accent === OG_COLORS.marathon ? '#000000' : '#ffffff';
}
