// app/dmz/pois/[slug]/page.js
// DMZ POI (Location) DETAIL route. Thin: force-dynamic, resolve the entity config,
// read the rows, notFound() if absent, render the shared DmzEntityDetail. An
// inserted row is a live page immediately (no rebuild). Wrapped by app/dmz/layout.
//
// LEGACY SLUGS (official-name slug move, 2026-10): POI_LEGACY_REDIRECTS (lib/dmz/entities.js) maps
// old slugs to new ones. The 308 fires only once the destination row exists, so the code can ship
// before the slug SQL and the old URL keeps rendering until the row is renamed -- no 404 window.
import { notFound, permanentRedirect } from 'next/navigation';
import { getDmzEntity, fetchDmzRows, poiLegacyTarget, visiblePoiRows } from '@/lib/dmz/entities';
import DmzEntityDetail from '@/components/dmz/DmzEntityDetail';

export const dynamic = 'force-dynamic';
var ENTITY_KEY = 'pois';

function indexBySlug(rows) {
  var bySlug = {};
  rows.forEach(function (r) { bySlug[r.slug] = r; });
  return bySlug;
}

export async function generateMetadata({ params }) {
  var slug = (await params).slug;
  var entity = getDmzEntity(ENTITY_KEY);
  var bySlug = indexBySlug(await fetchDmzRows(entity));
  var target = poiLegacyTarget(slug, bySlug);
  if (target) permanentRedirect(target);
  var row = bySlug[slug] || null;
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
    openGraph: { title: title + ' | Cybernetic Punks', description: desc, url: url, siteName: 'Cybernetic Punks', type: 'website' },
    twitter: { card: 'summary_large_image', site: '@Cybernetic87250', title: title, description: desc },
  };
}

export default async function DmzPoiDetailPage({ params }) {
  var slug = (await params).slug;
  var entity = getDmzEntity(ENTITY_KEY);
  var all = await fetchDmzRows(entity);
  var bySlug = indexBySlug(all);
  var target = poiLegacyTarget(slug, bySlug);
  if (target) permanentRedirect(target);
  var row = bySlug[slug] || null;
  if (!row) notFound();
  var siblings = visiblePoiRows(all).filter(function (r) { return r.slug !== slug; }).slice(0, 6);
  // Nearby locations Part 1 names (dmz_pois.neighbors) that have a live, non-redirected row.
  var related = (Array.isArray(row.neighbors) ? row.neighbors : [])
    .map(function (s) { return bySlug[s]; })
    .filter(function (r) { return r && !poiLegacyTarget(r.slug, bySlug); });
  return <DmzEntityDetail entity={entity} row={row} siblings={siblings} related={related} />;
}
