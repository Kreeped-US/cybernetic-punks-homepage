// lib/og/wardogsSection.js
// Shared Wardogs-amber SECTION card for next/og. Wardogs routes each need their OWN
// opengraph-image.js (a page that declares metadata.openGraph does NOT inherit an ancestor
// segment's file-based image -- only a SAME-SEGMENT file merges), so every Wardogs hub gets a
// thin opengraph-image.js that calls wardogsSectionCard(headline). Amber accent (#e0a13a) ->
// black CNP block text (colors.js contrast rule) + a WARDOGS tag. Reuses lib/og/{fonts,colors,card}.

import { ImageResponse } from 'next/og';
import { Card } from './card';
import { OG_COLORS, blockTextColor } from './colors';
import { loadExo2 } from './fonts';

export const OG_SIZE = { width: 1200, height: 630 };

export async function wardogsSectionCard(headline, headlineFontSize = 46) {
  const fonts = await loadExo2();
  const accent = OG_COLORS.wardogs;

  return new ImageResponse(
    (
      <Card
        accent={accent}
        blockTextColor={blockTextColor(accent)}
        gameTag="WARDOGS"
        headline={headline}
        tagline="NO HYPE. JUST INTEL."
        headlineFontSize={headlineFontSize}
      />
    ),
    { ...OG_SIZE, fonts }
  );
}
