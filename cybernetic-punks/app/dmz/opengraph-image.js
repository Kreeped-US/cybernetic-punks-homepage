// app/dmz/opengraph-image.js
// DMZ SECTION default OG card (forest-green accent + DMZ game tag). Inherits to
// /dmz and every /dmz/[section] that has no more-specific opengraph-image. Per-article
// DMZ cards come from app/intel/[slug]/opengraph-image.js once DMZ articles exist.

import { ImageResponse } from 'next/og';
import { Card } from '@/lib/og/card';
import { OG_COLORS, blockTextColor } from '@/lib/og/colors';
import { loadExo2 } from '@/lib/og/fonts';

export const runtime = 'nodejs';

export const alt = 'DMZ - extraction intelligence on the Cybernetic Punks network';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  const fonts = await loadExo2();
  const accent = OG_COLORS.dmz;

  return new ImageResponse(
    (
      <Card
        accent={accent}
        blockTextColor={blockTextColor(accent)}
        gameTag="DMZ"
        headline="Call of Duty DMZ intelligence"
        tagline="NO HYPE. JUST INTEL."
      />
    ),
    { ...size, fonts }
  );
}
