import { marathonSectionCard } from '@/lib/og/marathonSection';

export const runtime = 'nodejs';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'The Cybernetic Punks Newsroom - Meet the Editors';

export default function Image() {
  return marathonSectionCard('The Cybernetic Punks Newsroom');
}
