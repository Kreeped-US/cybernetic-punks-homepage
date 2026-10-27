// lib/games/navMin.js
// Thin-section rule (Brief 190). PURE and game-agnostic: no I/O, no game names.
//
// A section config may set navMinArticles (a positive number). Its hub is shown as a nav tab, and linked from
// the other surfaces that pass this rule into lib/games/linkGate.js, only once its published article count
// reaches that number. A section without the field is never affected. Links and nav only: the route, its robots
// and its sitemap entry keep their own rules.

// The section's minimum, or null when it sets none.
export function navMinArticles(section) {
  var n = section && section.navMinArticles;
  return typeof n === 'number' && n > 0 ? n : null;
}

// true when the section may be shown and linked: no minimum, or count >= minimum.
export function meetsNavMin(section, count) {
  var min = navMinArticles(section);
  return min === null || (Number(count) || 0) >= min;
}

// Content-map entries (the { [href]: count } map gatedHref reads) for the sections that set a minimum: the
// count when it meets the minimum, 0 when it does not, so gatedHref renders the link as plain text.
// basePath is the game's route prefix ending in a slash; counts is { [section slug]: articles } (missing = 0).
export function navMinContent(sections, counts, basePath) {
  var out = {};
  (sections || []).forEach(function (sec) {
    if (navMinArticles(sec) === null) return;
    var n = Number(counts && counts[sec.slug]) || 0;
    out[basePath + sec.slug] = meetsNavMin(sec, n) ? n : 0;
  });
  return out;
}

// Slugs of the sections whose nav tab is hidden: they set a minimum and their count is below it.
export function navHiddenSlugs(sections, counts) {
  return (sections || []).filter(function (sec) {
    return navMinArticles(sec) !== null && !meetsNavMin(sec, counts && counts[sec.slug]);
  }).map(function (sec) { return sec.slug; });
}
