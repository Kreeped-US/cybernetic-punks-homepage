// app/opengraph-image.js
// NETWORK-DEFAULT OG card (Stage 1). The file convention auto-wires og:image +
// twitter:image for the root segment once the old static og-image.png declarations are
// removed (that strip is Stage 2 -- this build leaves the legacy wiring in place and
// just proves the generated pipeline renders).
//
// Burgundy network accent, no game tag. Per-game (Marathon green / DMZ forest) and
// per-article (dynamic headline) cards are Stage 2.

import { ImageResponse } from 'next/og';
import { Card } from '@/lib/og/card';
import { OG_COLORS, blockTextColor } from '@/lib/og/colors';
import { loadExo2 } from '@/lib/og/fonts';

// Node runtime: the shared font loader reads the bundled TTFs via fs.readFile.
export const runtime = 'nodejs';

export const alt = 'Cybernetic Punks - the competitive-shooter intelligence network';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  const fonts = await loadExo2();
  const accent = OG_COLORS.network;

  return new ImageResponse(
    (
      <Card
        accent={accent}
        blockTextColor={blockTextColor(accent)}
        gameTag={null}
        headline="Competitive-shooter intelligence network"
        tagline="NO HYPE. JUST INTEL."
      />
    ),
    { ...size, fonts }
  );
}
