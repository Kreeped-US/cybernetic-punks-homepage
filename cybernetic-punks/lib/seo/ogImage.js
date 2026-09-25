// lib/seo/ogImage.js
// Shared OG/Twitter image default (2026-09-25). Next.js merges the `metadata.openGraph` object
// SHALLOWLY: a page that sets its own `openGraph` (title/description/url) with NO `images` drops any
// inherited image, and the file-convention opengraph-image.js is NOT inherited by nested segments --
// so many non-Marathon hub/section pages shipped with og:title but NO og:image (Ahrefs 2026-09-22).
//
// withOgImages(meta, game) returns a copy of the metadata with openGraph.images + twitter.images
// ALWAYS present: the per-game hero image where one exists, else the network default (1200x630).
// IDEMPOTENT and non-destructive -- it only ADDS images when the page has not set its own; it never
// changes title/description/url/canonical. Relative paths are absolutized by Next against
// metadataBase (app/layout.js), so the rendered tags carry absolute URLs.

export const NETWORK_OG_IMAGE = '/og-image.png'; // public/og-image.png, 1200x630

// Per-game hub/hero images (public/images/games/<game>-hero.jpg). Landscape, OG-usable. Marathon is
// intentionally ABSENT here (its 51 pages are frozen until post-Oct-20; the same helper applies then).
const GAME_OG_IMAGE = {
  wardogs: '/images/games/wardogs-hero.jpg',
  dmz: '/images/games/dmz-hero.jpg',
  'pubg-dednet': '/images/games/pubg-dednet-hero.jpg',
};

// The default OG image URL for a game (or the network default when no game / no per-game image).
export function ogImageFor(game) {
  return (game && GAME_OG_IMAGE[game]) || NETWORK_OG_IMAGE;
}

// Return a copy of `meta` guaranteed to carry openGraph.images + twitter.images. Existing images are
// preserved (never overwritten). `game` picks the per-game hero; omit it for the network default.
export function withOgImages(meta, game) {
  var m = meta || {};
  var url = ogImageFor(game);
  var og = m.openGraph || {};
  var tw = m.twitter || {};
  return Object.assign({}, m, {
    openGraph: Object.assign({}, og, { images: (og.images && og.images.length) ? og.images : [url] }),
    twitter: Object.assign({}, tw, { images: (tw.images && tw.images.length) ? tw.images : [url] }),
  });
}
