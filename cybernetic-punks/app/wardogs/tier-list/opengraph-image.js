// app/wardogs/tier-list/opengraph-image.js -- shareable OG card for the tier list (distribution play).
import { wardogsSectionCard, OG_SIZE } from '@/lib/og/wardogsSection';

export const runtime = 'nodejs';
export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'Wardogs Weapon Tier List - ranked by real TTK - Cybernetic Punks';

export default function Image() {
  return wardogsSectionCard('Wardogs Weapon Tier List: Ranked by TTK');
}
