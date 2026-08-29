// app/dmz/builds/page.js
// DMZ weapon-builds HUB route: /dmz/builds. Lists every INDEXABLE build (the same set B2's sitemap
// emits) so the /dmz/builds/[weapon] detail pages are reachable by browse. Mirrors the entity-hub
// pattern (app/dmz/keys/page.js): force-dynamic, row-count honesty gate, shared DmzEntityHub render.
//
// ONE GATE, THREE CALLERS: fetchIndexableBuildEntries applies isBuildIndexable -- the SAME predicate
// the detail route (B1) and the sitemap (B2) use. So hub content === sitemap set === indexable set,
// never a reimplementation. A build is a composite recommendation, so it is all-or-nothing verified
// (strict isBuildIndexable): the hub shows only fully-verified builds -- no partial/amber cards, so
// DmzEntityHub's "Unconfirmed" branch never fires here (every row verified=true).
//
// ERROR-VS-EMPTY inherited from fetchIndexableBuildEntries (throws on a genuine read error -> this
// force-dynamic route 500s, loud; returns [] on a legitimate empty -> the empty-state renders).
//
// The builds config is a STANDALONE constant here, deliberately NOT in DMZ_ENTITIES: a build is a
// derived artifact, not an entity vertical -- adding it to DMZ_ENTITIES would wrongly pull it into
// DMZ_ENTITY_KEYS routing and the dmz-entity sitemap block.

import { fetchIndexableBuildEntries } from '@/lib/dmz/weaponBuilds';
import { buildHubRows, buildHubRobots } from '@/lib/dmz/buildsHub';
import DmzEntityHub from '@/components/dmz/DmzEntityHub';

export const dynamic = 'force-dynamic';

// Builds-hub copy (the DmzEntityHub `entity` shape: routeBase / plural / hubH1 / hubDesc / hubEmpty;
// hubTitle is used only by generateMetadata below).
const BUILDS_HUB = {
  routeBase: '/dmz/builds',
  plural: 'Builds',
  hubH1: 'DMZ Weapon Builds',
  hubTitle: 'DMZ Weapon Builds: The Best MW4 FOB Loadouts',
  hubDesc: 'Every verified DMZ weapon build: the FOB Gunsmith loadout for each gun -- attachments by slot plus the Apex conversion, assembled from verified in-game data. Updated as the zone opens.',
  hubEmpty: 'No weapon builds are verified yet. DMZ launches October 23, 2026; verified FOB Gunsmith loadouts land here as the zone opens.',
};

export async function generateMetadata() {
  var entries = await fetchIndexableBuildEntries();
  var url = 'https://cyberneticpunks.com' + BUILDS_HUB.routeBase;
  // ROW-COUNT HONESTY GATE (like the entity hubs): 0 indexable -> noindex,follow (thin/pre-launch);
  // >= 1 -> index. No stored flag -- the hub indexes automatically once a build verifies.
  var robots = buildHubRobots(entries.length);
  return {
    title: { absolute: BUILDS_HUB.hubTitle },
    description: BUILDS_HUB.hubDesc,
    robots: robots,
    alternates: { canonical: url },
    openGraph: { title: BUILDS_HUB.hubTitle + ' | Cybernetic Punks', description: BUILDS_HUB.hubDesc, url: url, siteName: 'Cybernetic Punks', type: 'website' },
    twitter: { card: 'summary_large_image', site: '@Cybernetic87250', title: BUILDS_HUB.hubTitle, description: BUILDS_HUB.hubDesc },
  };
}

export default async function DmzBuildsHubPage() {
  var entries = await fetchIndexableBuildEntries();
  return <DmzEntityHub entity={BUILDS_HUB} rows={buildHubRows(entries)} />;
}
