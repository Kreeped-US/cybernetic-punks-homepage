// lib/sitemap/partition.js
// PURE (no DB, no imports) -> node-testable. Two jobs:
//   1. partitionEligible(): split the ONE computed eligible set into the three
//      children by IMMUTABLE {game, type}, so the children are FILTERS over one
//      set, never divergent queries. Each URL lands in exactly one child or the
//      function THROWS -- so a new game/type that nobody assigned a child fails
//      loudly (build/request error) instead of silently vanishing from the sitemap.
//      That is what makes segmentation drift a failing test, not a review concern.
//   2. the XML serializers for a urlset (a child) and a sitemapindex (the index).

// Partition the flat eligible set into the three children.
//   sitemap-dmz.xml              -> game === 'dmz'
//   sitemap-marathon-intel.xml   -> game === 'marathon' && type === 'intel'
//   sitemap-marathon-entities.xml-> game === 'marathon' && type !== 'intel'
// Invariant (guaranteed by the mutually-exclusive branches + the throw): the three
// are pairwise disjoint AND their union is exactly the input -- a genuine partition.
export function partitionEligible(eligible) {
  const dmz = [], intel = [], entities = [];
  for (const e of eligible) {
    if (e.game === 'dmz') dmz.push(e);
    else if (e.game === 'marathon' && e.type === 'intel') intel.push(e);
    else if (e.game === 'marathon') entities.push(e);
    else throw new Error('[sitemap] partition: URL belongs to no child -- ' + e.url +
      ' (game=' + e.game + ', type=' + e.type + '). Add a child or fix the tag.');
  }
  // Defensive union check (the branches already make this exact; a mismatch would
  // mean an element was counted twice, which the append-once logic cannot do).
  if (dmz.length + intel.length + entities.length !== eligible.length) {
    throw new Error('[sitemap] partition: union != eligible set');
  }
  return { dmz, intel, entities };
}

// RUNTIME partition invariant (Change 1), asserted at COMPUTE time -- i.e. per ISR
// revalidation (~24x/day), microseconds on <1000 strings, NOT per request. Verifies
// union == eligible-set AND pairwise-disjoint, throwing on any violation. Degradation
// is ideal: a throwing regeneration makes Next keep serving the LAST-GOOD cached ISR
// version, so a broken partition FREEZES the sitemap at last-known-good with a loud
// error -- it never serves a wrong partition and never 500s Googlebot. Same property
// the 7 unit tests cover, now also enforced on the live set every regeneration.
export function assertPartition(eligible) {
  const { dmz, intel, entities } = partitionEligible(eligible); // throws on unassignable game/type + union-size mismatch
  const seen = new Set();
  for (const bucket of [dmz, intel, entities]) {
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
