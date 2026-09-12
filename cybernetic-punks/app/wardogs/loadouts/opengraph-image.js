// app/wardogs/loadouts/opengraph-image.js -- OG card for the loadout advisor landing.
import { wardogsSectionCard, OG_SIZE } from '@/lib/og/wardogsSection';

export const runtime = 'nodejs';
export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'Wardogs Loadout Advisor - Cybernetic Punks';

export default function Image() {
  return wardogsSectionCard('Wardogs: The Loadout Advisor');
}
