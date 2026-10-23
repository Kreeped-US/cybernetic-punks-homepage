// lib/dmz/imageCard.js
// Shared pieces of the image-background location card, used by components/dmz/PoiAreaBlock.js (/dmz/regions)
// and components/dmz/DmzEntityHub.js (the entity hubs; images only where the entity config has imageWidths).
// Plain JS (no JSX), so both server components and their harness tests import it directly. Game-agnostic.
//
// The card image is decorative (alt=""; the card text names the place), absolutely positioned behind the text,
// object-fit cover, lazy. The text sits on a dark band: solid IMAGE_CARD_BAND_ALPHA from the bottom up to 12px
// below the band's top, then a 12px fade into the image; the band's top padding (26px) keeps all text on the
// solid part. Contrast was measured against every image (Briefs 119 and 120). The hover zoom runs only under
// prefers-reduced-motion: no-preference; the focus-visible outline always applies.

export var IMAGE_CARD_BAND_ALPHA = 0.9;
export var IMAGE_CARD_BAND = 'linear-gradient(to top, rgba(7,9,12,' + IMAGE_CARD_BAND_ALPHA + ') 0, rgba(7,9,12,' + IMAGE_CARD_BAND_ALPHA + ') calc(100% - 12px), rgba(7,9,12,0) 100%)';
export var IMAGE_CARD_CSS = '.dmz-area-card:focus-visible{outline:2px solid var(--green);outline-offset:2px}'
  + '@media (prefers-reduced-motion: no-preference){.dmz-area-card-img{transition:transform 0.4s ease}'
  + '.dmz-area-card:hover .dmz-area-card-img,.dmz-area-card:focus-visible .dmz-area-card-img{transform:scale(1.04)}}';

// The card link's style: the usual card border, left accent and radius, as a bottom-aligned flex column.
export function imageCardLinkStyle(minHeight, accent) {
  return { position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', minHeight: minHeight, overflow: 'hidden', background: 'var(--bg-card)', border: '1px solid var(--border)', borderLeft: '2px solid ' + accent, borderRadius: '0 3px 3px 0', textDecoration: 'none' };
}

// <img> attributes for an image set from lib/dmz/entityImage.js entityImageSet; size = the entity imageSize.
export function imageCardImgProps(img, size) {
  return {
    className: 'dmz-area-card-img', src: img.src, srcSet: img.srcSet, sizes: img.sizes, alt: '',
    width: size ? size.width : undefined, height: size ? size.height : undefined,
    loading: 'lazy', decoding: 'async',
    style: { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' },
  };
}

// The text band wrapper's style.
export var IMAGE_CARD_TEXT_STYLE = { position: 'relative', padding: '26px 16px 14px', background: IMAGE_CARD_BAND };
