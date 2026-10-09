// app/dmz/bounties/opengraph-image.js
// OG card for /dmz/bounties. Text only (no screenshots, no player names); the confirmed and
// unconfirmed counts come from the same constants as the page (lib/dmz/bounties.js).

import { ImageResponse } from 'next/og';
import { Card } from '@/lib/og/card';
import { OG_COLORS, blockTextColor } from '@/lib/og/colors';
import { loadExo2 } from '@/lib/og/fonts';
import { counts } from '@/lib/dmz/bounties';

export const runtime = 'nodejs';

export const alt = 'DMZ Bounty System: what is confirmed and what is not, on Cybernetic Punks';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  const fonts = await loadExo2();
  const accent = OG_COLORS.dmz;
  const c = counts();

  return new ImageResponse(
    (
      <Card
        accent={accent}
        blockTextColor={blockTextColor(accent)}
        gameTag="DMZ"
        headline="DMZ Bounty System: how bounties work"
        tagline={c.confirmed + ' CONFIRMED / ' + c.unconfirmed + ' UNCONFIRMED'}
      />
    ),
    { ...size, fonts }
  );
}
