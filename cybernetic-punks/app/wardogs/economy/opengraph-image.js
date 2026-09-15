// app/wardogs/economy/opengraph-image.js
// OG card for the Wardogs Economy hub. Leads with the OFFICIAL, VERIFIED launch-weekend figure
// ($562B spent) -- a first-party number is far more compelling in an unfurl than the modeled
// estimate, and it's unimpeachable. Static (a published snapshot never ticks). The page's spend
// MODEL still lives on-page, clearly labeled; the share card leads with the verified anchor.

import { wardogsEconomyCard, OG_SIZE } from '@/lib/og/wardogsEconomyCard';
import { WARDOGS_LAUNCH_STATS } from '@/lib/wardogs/launchStats';

export const runtime = 'nodejs';
export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'The Wardogs economy - official launch-weekend cash spent and earned | Cybernetic Punks';

export default async function Image() {
  const S = WARDOGS_LAUNCH_STATS;
  return wardogsEconomyCard({
    big: S.cash.spent.display + ' spent',
    label: 'in-game cash Wardogs players spent over the Early Access launch weekend (' + S.cash.earned.display + ' earned)',
    sub: 'Official Bulkhead figures — plus our live spend breakdown + unlock guide',
    footer: 'OFFICIAL · BULKHEAD @WARDOGS · cyberneticpunks.com/wardogs/economy',
  });
}
