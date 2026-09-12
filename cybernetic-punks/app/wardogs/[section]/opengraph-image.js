// app/wardogs/[section]/opengraph-image.js -- OG card for a Wardogs section hub (economy, news...).
import { getGameSection } from '@/lib/games';
import { wardogsSectionCard, OG_SIZE } from '@/lib/og/wardogsSection';

export const runtime = 'nodejs';
export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'Wardogs intel - Cybernetic Punks';

export default async function Image({ params }) {
  const sectionSlug = (await params).section;
  const section = getGameSection('wardogs', sectionSlug);
  return wardogsSectionCard(section ? 'Wardogs: ' + section.label : 'Wardogs Intel');
}
