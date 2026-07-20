// app/dmz/missions/page.js
// DMZ missions HUB route. force-dynamic; reads all rows, renders the shared
// DmzEntityHub. ROW-COUNT-GATED INDEXING: zero rows -> noindex,follow (thin,
// pre-launch), flips to index automatically once rows exist -- same mechanism as
// the /dmz/[section] gate. Wrapped by app/dmz/layout.
import { getDmzEntity, fetchDmzRows } from '@/lib/dmz/entities';
import DmzEntityHub from '@/components/dmz/DmzEntityHub';

export const dynamic = 'force-dynamic';
var ENTITY_KEY = 'missions';

export async function generateMetadata() {
  var entity = getDmzEntity(ENTITY_KEY);
  var rows = await fetchDmzRows(entity);
  var url = 'https://cyberneticpunks.com' + entity.routeBase;
  var robots = rows.length > 0 ? undefined : { index: false, follow: true };
  return {
    title: { absolute: entity.hubTitle },
    description: entity.hubDesc,
    robots: robots,
    alternates: { canonical: url },
    openGraph: { title: entity.hubTitle + ' | CyberneticPunks', description: entity.hubDesc, url: url, siteName: 'CyberneticPunks', type: 'website' },
    twitter: { card: 'summary_large_image', site: '@Cybernetic87250', title: entity.hubTitle, description: entity.hubDesc },
  };
}

export default async function DmzEntityHubPage() {
  var entity = getDmzEntity(ENTITY_KEY);
  var rows = await fetchDmzRows(entity);
  return <DmzEntityHub entity={entity} rows={rows} />;
}
