// lib/dmz/entityImage.js
// Responsive image set for an entity detail hero (components/dmz/DmzEntityDetail.js). PURE, game-agnostic.
//
// BASE-PATH CONVENTION: an entity row's image_url stores a BASE PATH, with no width suffix and no file
// extension, e.g. '/images/DMZ/pois/14th-political-prison'. The files are '<base>-<width>.webp', one per
// width in the entity config (imageWidths), e.g. '<base>-640.webp' and '<base>-1280.webp'. A base may also
// be an absolute https URL built the same way. Anything else (blank, a path with an extension, whitespace,
// a protocol-relative or non-https URL) is not a valid base and yields null, so no image renders.

var EXT = /\.[a-z0-9]{2,5}$/i;

export function validImageBase(base) {
  if (typeof base !== 'string') return false;
  var b = base.trim();
  if (b === '' || b !== base || /\s/.test(b)) return false;
  if (!(b.charAt(0) === '/' && b.charAt(1) !== '/') && b.indexOf('https://') !== 0) return false;
  if (EXT.test(b) || b.charAt(b.length - 1) === '/') return false;
  return true;
}

// Positive integer widths, ascending, de-duplicated. [] when none are usable.
function cleanWidths(widths) {
  var seen = {};
  return (Array.isArray(widths) ? widths : [])
    .filter(function (w) { return Number.isInteger(w) && w > 0 && !seen[w] && (seen[w] = true); })
    .sort(function (a, b) { return a - b; });
}

export function imageVariantUrl(base, width) {
  return base + '-' + width + '.webp';
}

// base + { widths, sizes } -> { src, srcSet, sizes, width } or null. src is the LARGEST variant (also the
// fallback for browsers without srcset); width is that variant's pixel width, the hero's maximum display
// width (never upscaled). sizes is passed through; when absent the largest width is used as a fixed size.
export function entityImageSet(base, opts) {
  if (!validImageBase(base)) return null;
  var widths = cleanWidths(opts && opts.widths);
  if (widths.length === 0) return null;
  var largest = widths[widths.length - 1];
  return {
    src: imageVariantUrl(base, largest),
    srcSet: widths.map(function (w) { return imageVariantUrl(base, w) + ' ' + w + 'w'; }).join(', '),
    sizes: (opts && typeof opts.sizes === 'string' && opts.sizes) || (largest + 'px'),
    width: largest,
  };
}

// Absolute URL of a variant (for JSON-LD). A site-relative base gets `origin`; an https base is kept.
export function absoluteImageUrl(base, width, origin) {
  var url = imageVariantUrl(base, width);
  return base.indexOf('https://') === 0 ? url : String(origin || '') + url;
}
