// lib/seo/hubJsonLd.js
// Game-agnostic JSON-LD for a game HUB page (AI-crawler citability parity).
//
// Before this, /wardogs and /dmz hand-rolled BreadcrumbList + CollectionPage inline while
// /pubg-dednet and /bodycam emitted none. This is the SINGLE builder every hub drives from its
// own config (name / path / description / crumb leaf / optional coverage sections), so a new game
// gets hub structured data for free by calling hubJsonLd(...). The <script> tag and safeJsonLd
// serialization stay at the call site (the page), so this module is pure and dependency-free.
//
// Shapes mirror what /wardogs + /dmz already emitted:
//   - BreadcrumbList: root (default "Network") -> <Game>. The game hub IS the current page, so the
//     leaf carries no `item` (schema.org's current-page convention).
//   - CollectionPage: name / url / description + isPartOf WebSite, plus an OPTIONAL mainEntity
//     ItemList of the hub's coverage sections (included only when `sections` is passed).

const BASE = 'https://cyberneticpunks.com';
const SITE = { '@type': 'WebSite', name: 'Cybernetic Punks', url: BASE };

// Network -> <Game> breadcrumb. `crumbRoot` defaults to "Network" (every game hub's visible
// breadcrumb roots at the network front door); pass a different root only if a hub's visible
// crumb differs (e.g. Marathon uses "Home" -- so Marathon keeps its own inline breadcrumb and
// does not call this).
export function hubBreadcrumbLd({ crumbLeaf, crumbRoot = 'Network' }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: crumbRoot, item: BASE + '/' },
      { '@type': 'ListItem', position: 2, name: crumbLeaf },
    ],
  };
}

export function hubCollectionLd({ name, path, description, sections }) {
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name,
    url: BASE + path,
    description,
    isPartOf: SITE,
  };
  const secs = (sections || []).filter((s) => s && s.slug && s.label);
  if (secs.length) {
    ld.mainEntity = {
      '@type': 'ItemList',
      itemListElement: secs.map((s, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: s.label,
        url: BASE + path + '/' + s.slug,
      })),
    };
  }
  return ld;
}

// The common case: both hub schemas as an array. Hubs render each through safeJsonLd.
export function hubJsonLd(cfg) {
  return [hubBreadcrumbLd(cfg), hubCollectionLd(cfg)];
}
