// lib/dmz/buildsHub.js
// Pure helpers for the /dmz/builds hub route (app/dmz/builds/page.js), factored out so the row
// shaping + the honesty-gate robots are unit-testable WITHOUT importing the supabase singleton (the
// dataOrThrow pattern). fetchIndexableBuildEntries (lib/dmz/weaponBuilds.js) does the gated read;
// these shape its output for DmzEntityHub and derive the robots gate.

export function titleCase(slug) {
  return String(slug || '').split('-').map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1); }).join(' ');
}

// Indexable build entries ({ weaponSlug, weaponName, updatedAt }) -> DmzEntityHub rows
// ({ name, slug, verified }). Every indexable build is fully verified (strict isBuildIndexable), so
// verified:true for all -- the hub shows no partial/amber cards. weaponName is null-guarded (falls
// back to a title-cased slug, though an indexable build always has a resolved+verified weapon).
export function buildHubRows(entries) {
  return (entries || []).map(function (e) {
    return { name: e.weaponName || titleCase(e.weaponSlug), slug: e.weaponSlug, verified: true };
  });
}

// Row-count honesty gate (identical to the entity hubs): 0 indexable -> noindex,follow (thin/pre-
// launch); >= 1 -> index (undefined robots = inherit index:true). No stored flag.
export function buildHubRobots(count) {
  return count > 0 ? undefined : { index: false, follow: true };
}
