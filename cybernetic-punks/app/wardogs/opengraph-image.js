// app/wardogs/opengraph-image.js -- OG card for /wardogs (the landing).
import { wardogsSectionCard, OG_SIZE } from '@/lib/og/wardogsSection';

export const runtime = 'nodejs';
export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'Wardogs - Early Access Intel Hub - Cybernetic Punks';

export default function Image() {
  return wardogsSectionCard('Wardogs: Loadouts, Arsenal & Intel');
}
