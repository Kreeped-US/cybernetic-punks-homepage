// lib/og/marathonSection.js
// Shared Marathon-green SECTION card for next/og. Marathon routes are unprefixed
// siblings under app/, so each Marathon top-level dir gets a thin opengraph-image.js
// that calls marathonSectionCard(headline) -- giving Marathon pages a GREEN card while
// the root app/opengraph-image.js stays burgundy for home + network/account routes.
//
// Green accent (#00ff41) -> black CNP block text (the colors.js contrast rule). The
// game identity is the OFFICIAL Marathon press-kit wordmark (acid-green, on-brand on the
// dark card ground), embedded top-right in place of the old "MARATHON" text tag -- used
// under Bungie press-kit terms; the Marathon footer carries the "NOT AFFILIATED WITH
// BUNGIE / MARATHON IS A TRADEMARK OF BUNGIE, INC." disclaimer (lib/games/marathon.js).
// The CNP lockup stays left, so the card is a CNP fan-site card identifying the game --
// never an official Bungie card. Reuses lib/og/{fonts,colors,card,marathonLogo}.js.

import { ImageResponse } from 'next/og';
import { Card } from './card';
import { OG_COLORS, blockTextColor } from './colors';
import { loadExo2 } from './fonts';
import { loadMarathonLogo, MARATHON_LOGO_ASPECT } from './marathonLogo';

export const OG_SIZE = { width: 1200, height: 630 };

const LOGO_HEIGHT = 74; // px; width derives from the native aspect (~2.954:1) -> ~219px

export async function marathonSectionCard(headline) {
  const [fonts, logoSrc] = await Promise.all([loadExo2(), loadMarathonLogo()]);
  const accent = OG_COLORS.marathon;

  return new ImageResponse(
    (
      <Card
        accent={accent}
        blockTextColor={blockTextColor(accent)}
        gameTag="MARATHON"
        gameLogoSrc={logoSrc}
        gameLogoAlt="Marathon"
        gameLogoHeight={LOGO_HEIGHT}
        gameLogoWidth={Math.round(LOGO_HEIGHT * MARATHON_LOGO_ASPECT)}
        headline={headline}
        tagline="NO HYPE. JUST INTEL."
      />
    ),
    { ...OG_SIZE, fonts }
  );
}
