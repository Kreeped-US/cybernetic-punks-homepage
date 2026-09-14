// app/marathon/pve/opengraph-image.js
// Shareable OG card for the pre-launch Marathon PvE hub. Reuses the shared Marathon section
// card (same lib the /marathon root + other sections use), so the unfurl matches the vertical.
import { marathonSectionCard } from '@/lib/og/marathonSection';

export const runtime = 'nodejs';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = "Marathon PvE -- Coming December 8 (Symbiosis) | Cybernetic Punks";

export default function Image() {
  return marathonSectionCard("Marathon's First PvE -- Coming Dec 8");
}
