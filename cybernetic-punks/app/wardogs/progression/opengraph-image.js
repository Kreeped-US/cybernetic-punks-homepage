// app/wardogs/economy/opengraph-image.js -- OG card for the Wardogs Progression Planner.
import { wardogsSectionCard, OG_SIZE } from '@/lib/og/wardogsSection';

export const runtime = 'nodejs';
export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'Wardogs Progression Planner - what to unlock, what to save for | Cybernetic Punks';

export default function Image() {
  return wardogsSectionCard('Wardogs Unlock Guide: What to Save For');
}
