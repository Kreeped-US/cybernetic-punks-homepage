// /intel INDEX card (the /intel feed landing). The per-article card lives at
// app/intel/[slug]/opengraph-image.js -- the more-specific [slug] segment wins, so this
// index card does NOT override per-article cards.

import { marathonSectionCard } from '@/lib/og/marathonSection';

export const runtime = 'nodejs';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Marathon News & Intel - Cybernetic Punks';

export default function Image() {
  return marathonSectionCard('Marathon News & Intel');
}
