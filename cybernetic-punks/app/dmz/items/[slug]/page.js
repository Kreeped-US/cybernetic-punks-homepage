// app/dmz/items/[slug]/page.js
// DMZ items DETAIL route. Thin: force-dynamic, resolve the entity config, read the
// row by slug, notFound() if absent, render the shared DmzEntityDetail. An
// inserted row is a live page immediately (no rebuild). Wrapped by app/dmz/layout.
import { notFound } from 'next/navigation';
import { getDmzEntity, fetchDmzRow, fetchDmzRows } from '@/lib/dmz/entities';
import DmzEntityDetail from '@/components/dmz/DmzEntityDetail';

export const dynamic = 'force-dynamic';
var ENTITY_KEY = 'items';

export async function generateMetadata({ params }) {
  var slug = (await params).slug;
  var entity = getDmzEntity(ENTITY_KEY);
  var row = await fetchDmzRow(entity, slug);
  if (!row) return { title: 'DMZ ' + entity.singular + ' Not Found' };
  var title = entity.detailTitle(row);
  var desc = entity.detailDesc(row);
  var url = 'https://cyberneticpunks.com' + entity.routeBase + '/' + slug;
  // HONESTY + INDEXING: an UNVERIFIED row is provisional (may change or be
  // deleted), so it is noindex,follow until verified in-game -- indexing a guess
  // risks an indexed URL later 404ing or serving wrong data. A verified row omits
  // robots and inherits index:true.
  var robots = row.verified === true ? undefined : { index: false, follow: true };
  return {
    title: { absolute: title },
    description: desc,
    robots: robots,
    alternates: { canonical: url },
    openGraph: { title: title + ' | CyberneticPunks', description: desc, url: url, siteName: 'CyberneticPunks', type: 'website' },
    twitter: { card: 'summary_large_image', site: '@Cybernetic87250', title: title, description: desc },
  };
}

export default async function DmzEntityDetailPage({ params }) {
  var slug = (await params).slug;
  var entity = getDmzEntity(ENTITY_KEY);
  var row = await fetchDmzRow(entity, slug);
  if (!row) notFound();
  var all = await fetchDmzRows(entity);
  var siblings = all.filter(function (r) { return r.slug !== slug; }).slice(0, 6);
  return <DmzEntityDetail entity={entity} row={row} siblings={siblings} />;
}
