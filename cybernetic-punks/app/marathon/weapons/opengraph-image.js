import { marathonSectionCard } from '@/lib/og/marathonSection';

export const runtime = 'nodejs';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Marathon Weapon Stats & Tiers - Cybernetic Punks';

export default function Image() {
  return marathonSectionCard('Marathon Weapon Stats & Tiers');
}
