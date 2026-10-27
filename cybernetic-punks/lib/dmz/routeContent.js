// lib/dmz/routeContent.js
// The DMZ routes whose pages can be empty, and the content map lib/games/linkGate.js reads (Brief 174).
// Each route is counted with the rule its own page uses: published articles that resolve to the section,
// entity rows, indexable builds. A route with a count of 0 renders as text in the /dmz "In progress" row; it
// becomes a link again on its own once the count is above zero. Links only: robots and sitemaps are unchanged.
// Brief 190: a section that sets navMinArticles (lib/games/navMin.js) is in the map too, at 0 until its
// article count reaches that minimum, so the same gate covers it; its nav tab is hidden on the same rule.
import { dmz } from '../games/dmz.js';
import { navMinArticles, navMinContent, navHiddenSlugs } from '../games/navMin.js';

var BASE = '/dmz/';

// href -> where its count comes from (documentation and the test's fixed list).
export var DMZ_GATED_ROUTES = {
  '/dmz/meta': 'published articles in the section',
  '/dmz/discourse': 'published articles in the section',
  '/dmz/missions': 'dmz_missions rows',
  '/dmz/builds': 'indexable builds (every cited part verified)',
  '/dmz/keys': 'dmz_keys rows',
  '/dmz/items': 'dmz_items rows',
};
dmz.sections.forEach(function (sec) {
  var min = navMinArticles(sec);
  if (min !== null) DMZ_GATED_ROUTES[BASE + sec.slug] = 'published articles in the section, linked from ' + min + ' (navMinArticles)';
});

// Routes that stay linked even with no entries, and why. They are left out of the content map, so
// gatedHref always links them.
export var DMZ_LINK_EXEMPT = {
  '/dmz/traits': 'carries sourced facts on the page even with no verified traits (Brief 174 decision)',
};

// Build the content map from counts the caller already holds. sectionCounts: { [section slug]: articles };
// routeRows: { missions, keys, items, builds } (missing = 0). Exempt routes are never in the map.
export function dmzRouteContent(sectionCounts, routeRows) {
  var s = sectionCounts || {};
  var r = routeRows || {};
  return Object.assign({
    '/dmz/meta': s.meta || 0,
    '/dmz/discourse': s.discourse || 0,
    '/dmz/missions': r.missions || 0,
    '/dmz/builds': r.builds || 0,
    '/dmz/keys': r.keys || 0,
    '/dmz/items': r.items || 0,
  }, navMinContent(dmz.sections, s, BASE));
}

// Brief 190: the section slugs whose DMZ nav tab is hidden, read from a content map that carries the
// navMinArticles entries (the layout's map from lib/dmz/routeContentData.js). A missing entry counts as 0.
export function dmzNavHiddenSections(content) {
  var counts = {};
  dmz.sections.forEach(function (sec) {
    if (navMinArticles(sec) !== null) counts[sec.slug] = Number(content && content[BASE + sec.slug]) || 0;
  });
  return navHiddenSlugs(dmz.sections, counts);
}
