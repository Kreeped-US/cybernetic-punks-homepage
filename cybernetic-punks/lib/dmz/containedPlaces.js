// lib/dmz/containedPlaces.js
// "Located in" list for a place detail page: the rows whose STORED area text names this row as the larger
// place they sit in. PURE and game-agnostic (no game, place or entity names here): it reads only stored
// fields (slug, name, area, verified, game_slug) and never mutates its input.
//
// RULE. Row R is "inside" row E when ALL hold:
//   - R and E are both in `rows` (the caller passes the VISIBLE rows of ONE entity type, e.g. with live
//     legacy redirects already removed), and both are verified (verified === true);
//   - R.game_slug === E.game_slug, and R.slug !== E.slug;
//   - R.area is non-empty;
//   - the normalized R.area (trim, collapse whitespace, case-insensitive) ENDS WITH the normalized E.name,
//     and the character before that tail is start-of-string or a space.
// Nothing else counts: a name inside the area text but not at its end, a partial word, or punctuation
// differences are NOT matches. No match -> [] (the page renders nothing new).
//
// Order: verified first, then name (code-unit order, deterministic across runtimes), the hub's order.

function norm(s) {
  return String(s == null ? '' : s).trim().replace(/\s+/g, ' ').toLowerCase();
}

// True when normalized `area` ends with normalized `name` as a whole tail (start-of-string or a space
// before it).
export function areaEndsWithName(area, name) {
  var a = norm(area);
  var n = norm(name);
  if (!a || !n || a.length < n.length) return false;
  if (a.slice(a.length - n.length) !== n) return false;
  return a.length === n.length || a.charAt(a.length - n.length - 1) === ' ';
}

function byVerifiedThenName(x, y) {
  var vx = x.verified === true ? 0 : 1;
  var vy = y.verified === true ? 0 : 1;
  if (vx !== vy) return vx - vy;
  var a = String(x.name == null ? '' : x.name);
  var b = String(y.name == null ? '' : y.name);
  return a < b ? -1 : a > b ? 1 : 0;
}

// container: the row whose page is being rendered. rows: the visible rows of the same entity type.
// Returns the member rows (the original row objects, sorted), each carrying its stored `area` verbatim.
export function containedPlaces(container, rows) {
  if (!container || container.verified !== true || !container.slug) return [];
  var list = Array.isArray(rows) ? rows : [];
  if (!list.some(function (r) { return r && r.slug === container.slug; })) return [];
  return list.filter(function (r) {
    return !!r
      && r.verified === true
      && r.slug !== container.slug
      && r.game_slug === container.game_slug
      && norm(r.area) !== ''
      && areaEndsWithName(r.area, container.name);
  }).slice().sort(byVerifiedThenName);
}
