// lib/dmz/hubTiles.js
// /dmz hub tile grouping (2026-10-21). PURE: no I/O, so it is unit-testable without the supabase
// singleton; app/dmz/page.js does the reads and passes the results in.
//
// A tile is LIVE (the Coverage grid) when the page it links to has content by the SAME rule that drives
// that page's robots, and otherwise sits in the quieter "In progress" row. So a tile graduates on
// its own the moment its page becomes indexable -- no manual move, and the hub never calls an empty page
// live:
//   - a section (/dmz/<slug>): >= 1 eligible article (the hub's own counts) or a standalone reference
//     block -- the sectionHasContent rule (lib/dmz/sections.js) the section's noindex tag uses;
//   - an entity or builds hub: >= 1 row -- the rows.length > 0 / buildHubRobots rule those routes use
//     (pois: visible rows, the /dmz/pois route's own rule).
// Tiles show no database counts beyond the existing section "N reports" line.

// The standalone hub routes the /dmz hub links to (formerly the "Reference" grid). Copy unchanged.
export var DMZ_HUB_ROUTES = [
  { key: 'pois', href: '/dmz/pois', label: 'Locations', desc: 'Hajin map, POIs and regions.' },
  { key: 'missions', href: '/dmz/missions', label: 'Missions', desc: 'Objectives and rewards.' },
  { key: 'builds', href: '/dmz/builds', label: 'Builds', desc: 'FOB Gunsmith builds by weapon, listed once every part is verified.' },
  { key: 'keys', href: '/dmz/keys', label: 'Keys', desc: 'Keys recorded so far, with rarity and, where known, location and rewards.' },
  { key: 'items', href: '/dmz/items', label: 'Items', desc: 'Values, categories and uses.' },
];

// LIVE-ONLY hub routes (Brief 163): a Coverage tile once the page is indexable, and NOT listed in "In progress"
// before that. Weapons: routeRows.weapons is the count of VERIFIED weapons (the /dmz/weapons robots rule).
export var DMZ_LIVE_ONLY_ROUTES = [
  { key: 'weapons', href: '/dmz/weapons', label: 'Weapons', desc: 'Stats, attachment types and Apex attachments by class, from the launch post.' },
];

// sections: dmz.sections; counts: { [slug]: articleCount }; isStandalone: (section) -> boolean
// (lib/dmz/sections.js isStandaloneReference); routeRows: { [key]: rowCount } (missing = 0).
// Returns { live, later }, each in config order: sections first, then hub routes, then live-only routes (live only).
export function splitHubTiles(sections, counts, isStandalone, routeRows) {
  var live = [];
  var later = [];
  (sections || []).forEach(function (sec) {
    var count = (counts && counts[sec.slug]) || 0;
    var tile = { kind: 'section', key: sec.slug, section: sec, count: count };
    (count > 0 || (isStandalone && isStandalone(sec)) ? live : later).push(tile);
  });
  DMZ_HUB_ROUTES.forEach(function (r) {
    var rows = (routeRows && routeRows[r.key]) || 0;
    (rows > 0 ? live : later).push({ kind: 'route', key: r.key, route: r });
  });
  DMZ_LIVE_ONLY_ROUTES.forEach(function (r) {
    if (((routeRows && routeRows[r.key]) || 0) > 0) live.push({ kind: 'route', key: r.key, route: r });
  });
  return { live: live, later: later };
}
