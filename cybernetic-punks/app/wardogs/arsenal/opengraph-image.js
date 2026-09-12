// app/wardogs/arsenal/opengraph-image.js -- OG card for /wardogs/arsenal (the roster).
import { wardogsSectionCard, OG_SIZE } from '@/lib/og/wardogsSection';

export const runtime = 'nodejs';
export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'Wardogs Weapons - Full Arsenal, TTK & Ballistics - Cybernetic Punks';

export default function Image() {
  return wardogsSectionCard('Wardogs Weapons: Full Arsenal & TTK');
}
