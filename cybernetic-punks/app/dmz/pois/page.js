// app/dmz/pois/page.js
// DMZ POI (Locations) HUB route. force-dynamic; reads all rows, renders the shared
// DmzEntityHub. ROW-COUNT-GATED INDEXING: zero rows -> noindex,follow (thin,
// pre-launch), flips to index automatically once rows exist -- same mechanism as
// the keys/missions/items hubs. Wrapped by app/dmz/layout.
import { getDmzEntity, fetchDmzRows, visiblePoiRows, poiHubDesc } from '@/lib/dmz/entities';
import { withOgImages } from '@/lib/seo/ogImage';
import DmzEntityHub from '@/components/dmz/DmzEntityHub';

export const dynamic = 'force-dynamic';
var ENTITY_KEY = 'pois';

export async function generateMetadata() {
  var entity = getDmzEntity(ENTITY_KEY);
  // Rows whose legacy slug redirect is live (POI_LEGACY_REDIRECTS) are hidden from the hub.
  var rows = visiblePoiRows(await fetchDmzRows(entity));
  var url = 'https://cyberneticpunks.com' + entity.routeBase;
  var robots = rows.length > 0 ? undefined : { index: false, follow: true };
  // Part 1 wording only once the listed rows are Part 1 rows (poiHubDesc).
  var desc = poiHubDesc(entity, rows);
  return withOgImages({
    title: { absolute: entity.hubTitle },
    description: desc,
    robots: robots,
    alternates: { canonical: url },
    openGraph: { title: entity.hubTitle + ' | Cybernetic Punks', description: desc, url: url, siteName: 'Cybernetic Punks', type: 'website' },
    twitter: { card: 'summary_large_image', site: '@Cybernetic87250', title: entity.hubTitle, description: desc },
  }, 'dmz');
}

export default async function DmzPoiHubPage() {
  var entity = getDmzEntity(ENTITY_KEY);
  var rows = visiblePoiRows(await fetchDmzRows(entity));
  // The visible intro repeats the description, so it uses the same row-dependent wording.
  return <DmzEntityHub entity={Object.assign({}, entity, { hubDesc: poiHubDesc(entity, rows) })} rows={rows} />;
}
