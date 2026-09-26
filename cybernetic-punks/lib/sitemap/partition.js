// lib/sitemap/partition.js
// PURE (no DB, no imports) -> node-testable. Two jobs:
//   1. partitionEligible(): split the ONE computed eligible set into the three
//      children by IMMUTABLE {game, type}, so the children are FILTERS over one
//      set, never divergent queries. Each URL lands in exactly one child or the
//      function THROWS -- so a new game/type that nobody assigned a child fails
//      loudly (build/request error) instead of silently vanishing from the sitemap.
//      That is what makes segmentation drift a failing test, not a review concern.
//   2. the XML serializers for a urlset (a child) and a sitemapindex (the index).

// Partition the flat eligible set into the four children.
//   sitemap-dmz-builds.xml       -> game === 'dmz' && type === 'dmz-build'  (checked FIRST)
//   sitemap-dmz.xml              -> game === 'dmz' (every OTHER dmz type)
//   sitemap-marathon-intel.xml   -> game === 'marathon' && type === 'intel'
//   sitemap-marathon-entities.xml-> game === 'marathon' && type !== 'intel'
// Invariant (guaranteed by the mutually-exclusive branches + the throw): the four
// are pairwise disjoint AND their union is exactly the input -- a genuine partition.
// NOTE the dmz-build branch is BEFORE the dmz catch-all, so /dmz/builds/* routes to its
// own child rather than being absorbed into sitemap-dmz.xml.
export function partitionEligible(eligible) {
  const dmz = [], dmzBuilds = [], intel = [], entities = [], wardogs = [], pubgDednet = [], bodycam = [];
  for (const e of eligible) {
    if (e.game === 'dmz' && e.type === 'dmz-build') dmzBuilds.push(e);
    else if (e.game === 'dmz') dmz.push(e);
    else if (e.game === 'wardogs') wardogs.push(e); // Stage 6 Track 2: own child sitemap-wardogs.xml
    else if (e.game === 'pubg-dednet') pubgDednet.push(e); // DED.NET Phase 1: own child sitemap-pubg-dednet.xml
    else if (e.game === 'bodycam') bodycam.push(e); // Bodycam: own child sitemap-bodycam.xml (inert until indexable flip)
    else if (e.game === 'marathon' && e.type === 'intel') intel.push(e);
    else if (e.game === 'marathon') entities.push(e);
    else throw new Error('[sitemap] partition: URL belongs to no child -- ' + e.url +
      ' (game=' + e.game + ', type=' + e.type + '). Add a child or fix the tag.');
  }
  // Defensive union check (the branches already make this exact; a mismatch would
  // mean an element was counted twice, which the append-once logic cannot do).
  if (dmz.length + dmzBuilds.length + intel.length + entities.length + wardogs.length + pubgDednet.length + bodycam.length !== eligible.length) {
    throw new Error('[sitemap] partition: union != eligible set');
  }
  return { dmz, dmzBuilds, intel, entities, wardogs, pubgDednet, bodycam };
}

// RUNTIME partition invariant (Change 1), asserted at COMPUTE time -- i.e. per ISR
// revalidation (~24x/day), microseconds on <1000 strings, NOT per request. Verifies
// union == eligible-set AND pairwise-disjoint, throwing on any violation. Degradation
// is ideal: a throwing regeneration makes Next keep serving the LAST-GOOD cached ISR
// version, so a broken partition FREEZES the sitemap at last-known-good with a loud
// error -- it never serves a wrong partition and never 500s Googlebot. Same property
// the 7 unit tests cover, now also enforced on the live set every regeneration.
export function assertPartition(eligible) {
  const { dmz, dmzBuilds, intel, entities, wardogs, pubgDednet, bodycam } = partitionEligible(eligible); // throws on unassignable game/type + union-size mismatch
  const seen = new Set();
  for (const bucket of [dmz, dmzBuilds, intel, entities, wardogs, pubgDednet, bodycam]) {
    for (const e of bucket) {
      if (seen.has(e.url)) throw new Error('[sitemap] partition: URL in more than one child -- ' + e.url);
      seen.add(e.url);
    }
  }
  const eligibleUrls = new Set(eligible.map((e) => e.url));
  if (seen.size !== eligibleUrls.size) {
    throw new Error('[sitemap] partition: union URL set != eligible URL set (' + seen.size + ' vs ' + eligibleUrls.size + ')');
  }
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// A child sitemap (urlset). Emits <lastmod> ONLY when present -- the omit-when-null
// discipline (never fake a date). priority/changefreq passed through per entry.
export function urlsetXml(entries) {
  let x = '<?xml version="1.0" encoding="UTF-8"?>\n'
    + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  for (const e of entries) {
    x += '  <url>\n    <loc>' + esc(e.url) + '</loc>\n';
    if (e.lastmod) x += '    <lastmod>' + esc(e.lastmod) + '</lastmod>\n';
    if (e.changeFrequency) x += '    <changefreq>' + esc(e.changeFrequency) + '</changefreq>\n';
    if (e.priority != null) x += '    <priority>' + String(e.priority) + '</priority>\n';
    x += '  </url>\n';
  }
  return x + '</urlset>\n';
}

// The index. children: [{ loc, lastmod? }] -- the index's own lastmod per child is
// the newest lastmod among that child's URLs (honest: it tells crawlers which child
// actually changed), omitted when the child has none.
export function sitemapIndexXml(children) {
  let x = '<?xml version="1.0" encoding="UTF-8"?>\n'
    + '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  for (const c of children) {
    x += '  <sitemap>\n    <loc>' + esc(c.loc) + '</loc>\n';
    if (c.lastmod) x += '    <lastmod>' + esc(c.lastmod) + '</lastmod>\n';
    x += '  </sitemap>\n';
  }
  return x + '</sitemapindex>\n';
}

// Newest lastmod string among a child's entries (lexicographic works on ISO dates),
// or null when none carries one -> the index then omits that child's lastmod.
export function newestLastmod(entries) {
  let best = null;
  for (const e of entries) {
    if (!e.lastmod) continue;
    if (best === null || e.lastmod > best) best = e.lastmod;
  }
  return best;
}

// A bare 'YYYY-MM-DD' -> the same PT start-of-day our offset-stamped dates use, so a bare
// go-live floor compares against toISOWithPTOffset() strings as the SAME instant scale.
// Already-offset (or datetime) strings pass through. Parse failure sorts as -Infinity so it
// never wins a max. (PT summer offset -07:00; day-granularity, so DST drift is immaterial.)
function lastmodInstant(s) {
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(s) ? s + 'T00:00:00-07:00' : s;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? -Infinity : t;
}

// honestLastmod(real, floor): the LATER of a page's real content/data change date and the
// route's go-live date at its CURRENT url -- the "max(real, go-live)" rule in ONE place.
// Both args may be undefined; either may be a bare 'YYYY-MM-DD' or a full offset ISO. Returns
// the WINNING string verbatim (so a real, more-precise datetime is preserved), the floor when
// no real date is known, or undefined when neither is. It NEVER synthesizes now()/build time --
// the only dates it can emit are ones it was handed. This is what keeps a migrated route from
// telling crawlers its CURRENT url is older than the day that url went live, without ever
// faking freshness on a page that has genuinely not changed since.
export function honestLastmod(real, floor) {
  if (!real) return floor || undefined;
  if (!floor) return real;
  return lastmodInstant(real) >= lastmodInstant(floor) ? real : floor;
}

// Apply the migrated-namespace lastmod floor to an eligible set IN PLACE (returns it too).
// PURE + testable: no DB, no clock. Floors e.lastmod = honestLastmod(e.lastmod, floor) for every
// entry that (a) is in the migrated game, (b) sits under the migrated url prefix, and (c) is NOT
// in `dateless` -- the exact-url allowlist of continuously-live pages that must keep making NO
// freshness claim (a fixed past lastmod on an hourly page understates it and can slow crawl).
// The allowlist is EXACT-match, so the /marathon/intel HUB stays dateless while every
// /marathon/intel/<slug> article is still floored. `dateless` may be a Set or any iterable.
export function applyLastmodFloor(entries, { game, prefix, floor, dateless } = {}) {
  const skip = dateless instanceof Set ? dateless : new Set(dateless || []);
  for (const e of entries) {
    if (e.game === game && typeof e.url === 'string' && e.url.startsWith(prefix) && !skip.has(e.url)) {
      e.lastmod = honestLastmod(e.lastmod, floor);
    }
  }
  return entries;
}
