// lib/og/marathonSection.js
// Shared Marathon-green SECTION card for next/og. Marathon routes are unprefixed
// siblings under app/, so each Marathon top-level dir gets a thin opengraph-image.js
// that calls marathonSectionCard(headline) -- giving Marathon pages a GREEN card while
// the root app/opengraph-image.js stays burgundy for home + network/account routes.
//
// Green accent (#00ff41) -> black CNP block text (the colors.js contrast rule) + a
// MARATHON tag. Reuses lib/og/{fonts,colors,card}.js. Each section file still declares
// its own runtime/size/contentType/alt exports (Next reads those statically per route).

import { ImageResponse } from 'next/og';
import { Card } from './card';
import { OG_COLORS, blockTextColor } from './colors';
import { loadExo2 } from './fonts';
import { loadMarathonLogo } from './logo';

export const OG_SIZE = { width: 1200, height: 630 };

export async function marathonSectionCard(headline) {
  const fonts = await loadExo2();
  const marathonLogo = await loadMarathonLogo();
  const accent = OG_COLORS.marathon;

  return new ImageResponse(
    (
      <Card
        accent={accent}
        blockTextColor={blockTextColor(accent)}
        gameTag="MARATHON"
        marathonLogo={marathonLogo}
        headline={headline}
        tagline="NO HYPE. JUST INTEL."
      />
    ),
    { ...OG_SIZE, fonts }
  );
}
