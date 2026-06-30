import { marathonSectionCard } from '@/lib/og/marathonSection';

export const runtime = 'nodejs';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Rising Marathon Streamers - Cybernetic Punks';

export default function Image() {
  return marathonSectionCard('Rising Marathon Streamers');
}
