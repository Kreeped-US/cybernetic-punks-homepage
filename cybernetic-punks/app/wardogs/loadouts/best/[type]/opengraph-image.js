// app/wardogs/loadouts/best/[type]/opengraph-image.js -- OG card for a best-by-class hub.
import { WEAPON_TYPE_HUBS } from '@/lib/wardogs/loadoutHubs';
import { wardogsSectionCard, OG_SIZE } from '@/lib/og/wardogsSection';

export const runtime = 'nodejs';
export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'Best Wardogs loadout by class - Cybernetic Punks';

export default async function Image({ params }) {
  const type = (await params).type;
  const hub = (WEAPON_TYPE_HUBS || []).find((h) => h.slug === type);
  const label = hub ? hub.lower : 'weapon';
  return wardogsSectionCard('Best Wardogs ' + label + ' loadout');
}
