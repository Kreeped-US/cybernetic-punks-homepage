// app/wardogs/economy/launch-stats/opengraph-image.js
// OG card for the OFFICIAL Wardogs launch-stats surface. STATIC verified figures (no live
// compute) -- $562B spent is the hook, badged OFFICIAL (not "modeled"). Reuses the shared
// Wardogs economy card with an official footer.

import { wardogsEconomyCard, OG_SIZE } from '@/lib/og/wardogsEconomyCard';
import { WARDOGS_LAUNCH_STATS } from '@/lib/wardogs/launchStats';

export const runtime = 'nodejs';
export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'Wardogs Early Access launch weekend, by the numbers - official Bulkhead stats | Cybernetic Punks';

export default async function Image() {
  const S = WARDOGS_LAUNCH_STATS;
  return wardogsEconomyCard({
    big: S.cash.spent.display + ' spent',
    label: 'Wardogs players spent ' + S.cash.spent.display + ' and earned ' + S.cash.earned.display + ' in in-game cash over the Early Access launch weekend',
    sub: '123M kills · 61M revives · 63M spotted-target kills — official Bulkhead figures',
    footer: 'OFFICIAL · BULKHEAD @WARDOGS · EA LAUNCH WEEKEND',
  });
}
