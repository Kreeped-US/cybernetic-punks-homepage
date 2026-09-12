// lib/og/wardogsSection.js
// Shared Wardogs-amber SECTION card for next/og. Wardogs routes each need their OWN
// opengraph-image.js (a page that declares metadata.openGraph does NOT inherit an ancestor
// segment's file-based image -- only a SAME-SEGMENT file merges), so every Wardogs hub gets a
// thin opengraph-image.js that calls wardogsSectionCard(headline). Amber accent (#e0a13a).
// The game identity is the OFFICIAL Wardogs wordmark (white full lockup, on-brand on the dark
// card ground), embedded top-right in place of the old "WARDOGS" text tag -- used under
// Bulkhead/Team17 press-kit terms; the Wardogs footer carries the "UNOFFICIAL FAN SITE - NOT
// AFFILIATED WITH OR ENDORSED BY BULKHEAD OR TEAM17" disclaimer (lib/games/wardogs.js). The CNP
// logo stays left, so the card is a CNP fan-site card identifying the game -- never an official
// card. Reuses lib/og/{fonts,colors,card,wardogsLogo}.js.

import { ImageResponse } from 'next/og';
import { Card } from './card';
import { OG_COLORS, blockTextColor } from './colors';
import { loadExo2 } from './fonts';
import { loadWardogsLogo, WARDOGS_LOGO_ASPECT } from './wardogsLogo';

export const OG_SIZE = { width: 1200, height: 630 };

const LOGO_HEIGHT = 66; // px; width derives from the native aspect (~5.037:1) -> ~332px

export async function wardogsSectionCard(headline, headlineFontSize = 46) {
  const [fonts, logoSrc] = await Promise.all([loadExo2(), loadWardogsLogo()]);
  const accent = OG_COLORS.wardogs;

  return new ImageResponse(
    (
      <Card
        accent={accent}
        blockTextColor={blockTextColor(accent)}
        gameTag="WARDOGS"
        gameLogoSrc={logoSrc}
        gameLogoAlt="Wardogs"
        gameLogoHeight={LOGO_HEIGHT}
        gameLogoWidth={Math.round(LOGO_HEIGHT * WARDOGS_LOGO_ASPECT)}
        headline={headline}
        tagline="NO HYPE. JUST INTEL."
        headlineFontSize={headlineFontSize}
      />
    ),
    { ...OG_SIZE, fonts }
  );
}
