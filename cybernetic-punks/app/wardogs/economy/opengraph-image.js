// app/wardogs/economy/opengraph-image.js -- OG card for the Wardogs Economy hub.
import { wardogsSectionCard, OG_SIZE } from '@/lib/og/wardogsSection';

export const runtime = 'nodejs';
export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'Wardogs Economy - live spend tracker, unlock guide & what to save for | Cybernetic Punks';

export default function Image() {
  return wardogsSectionCard('Wardogs Economy: Where the Cash Flows');
}
