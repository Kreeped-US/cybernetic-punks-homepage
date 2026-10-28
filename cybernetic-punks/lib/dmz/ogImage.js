// lib/dmz/ogImage.js
// The generic DMZ share card (app/dmz/opengraph-image.js) as an explicit metadata image, for DMZ pages that set
// their own openGraph/twitter objects and have no opengraph-image file in their segment (Brief 216). Next replaces
// the whole inherited openGraph object when a page defines one, so those pages carried no og:image at all; they
// list this card instead. The alt is the card's own alt export: it describes the card, never a weapon, POI or boss.
// The URL is the route itself on the canonical origin (the file-based pages add a content hash query; the route
// serves the same card without one).
export var DMZ_OG_IMAGE = {
  url: 'https://cyberneticpunks.com/dmz/opengraph-image',
  width: 1200,
  height: 630,
  type: 'image/png',
  alt: 'DMZ - extraction intelligence on the Cybernetic Punks network',
};
