// app/dmz/keys/page.js
// DMZ keys HUB route. force-dynamic; reads all rows, renders the shared
// DmzEntityHub. ROW-COUNT-GATED INDEXING: zero rows -> noindex,follow (thin,
// pre-launch), flips to index automatically once rows exist -- same mechanism as
// the /dmz/[section] gate. Wrapped by app/dmz/layout.
import { getDmzEntity, fetchDmzRows } from '@/lib/dmz/entities';
import DmzEntityHub from '@/components/dmz/DmzEntityHub';
import { DMZ_OG_IMAGE } from '@/lib/dmz/ogImage';

export const dynamic = 'force-dynamic';
var ENTITY_KEY = 'keys';

// Brief 180: with rows, the title and description state what the rows carry (entity.hubTitleFor /
// hubDescFor); with none, the static empty-state copy stays.
function hubCopy(entity, rows) {
  if (rows.length === 0) return { title: entity.hubTitle, desc: entity.hubDesc };
  return { title: entity.hubTitleFor ? entity.hubTitleFor(rows) : entity.hubTitle, desc: entity.hubDescFor ? entity.hubDescFor(rows) : entity.hubDesc };
}

export async function generateMetadata() {
  var entity = getDmzEntity(ENTITY_KEY);
  var rows = await fetchDmzRows(entity);
  var url = 'https://cyberneticpunks.com' + entity.routeBase;
  var robots = rows.length > 0 ? undefined : { index: false, follow: true };
  var copy = hubCopy(entity, rows);
  return {
    title: { absolute: copy.title },
    description: copy.desc,
    robots: robots,
    alternates: { canonical: url },
    openGraph: { title: copy.title + ' | Cybernetic Punks', description: copy.desc, url: url, siteName: 'Cybernetic Punks', type: 'website', images: [DMZ_OG_IMAGE] },
    twitter: { card: 'summary_large_image', site: '@Cybernetic87250', title: copy.title, description: copy.desc, images: [DMZ_OG_IMAGE] },
  };
}

export default async function DmzEntityHubPage() {
  var entity = getDmzEntity(ENTITY_KEY);
  var rows = await fetchDmzRows(entity);
  // The visible intro repeats the description, so it uses the same row-dependent wording.
  return <DmzEntityHub entity={Object.assign({}, entity, { hubDesc: hubCopy(entity, rows).desc })} rows={rows} />;
}
