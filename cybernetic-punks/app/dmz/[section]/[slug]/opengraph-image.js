// app/dmz/[section]/[slug]/opengraph-image.js
// PER-ARTICLE DMZ OG card. Overrides the generic /dmz card (app/dmz/opengraph-image.js)
// for /dmz/[section]/[slug] URLs, so a shared DMZ article shows its OWN headline on a
// DMZ-branded (forest-green) card instead of the generic one. Reuses lib/og/card.js
// with gameTag='DMZ' -- the DMZ text pill renders (CNP-text-branded, no game logo).
// Card code is NOT duplicated; only this route is new.
//
// Font is the bundled Exo 2 buffer (loadExo2) -- next/og needs the bytes, not a bare
// import (same gotcha as the other cards). Node runtime for the font read.
//
// Sibling og file (Brief 272): when the row has a valid thumbnail (the page's hero rule: a same-site
// /images/ path or an https URL on the site's own host that passes safeHref), this route first tries <base>-og-1200x630.jpg
// next to it (e.g. /images/DMZ/season-1/dmz-season-1-hero.webp -> .../dmz-season-1-hero-og-1200x630.jpg)
// and returns it as-is. Any failure (no thumbnail, bad path, non-200, not an image, timeout) falls through
// to the generated card below, unchanged. contentType stays 'image/png': Next sets og:image:type from this
// export once per route, so a row served the JPEG still reads image/png in that meta tag (the response
// itself carries image/jpeg).

import { ImageResponse } from 'next/og';
import { supabase } from '@/lib/supabase';
import { Card } from '@/lib/og/card';
import { OG_COLORS, blockTextColor } from '@/lib/og/colors';
import { loadExo2 } from '@/lib/og/fonts';
import { safeHref } from '@/lib/security/safeHref';

export const runtime = 'nodejs';

export const alt = 'DMZ article on the Cybernetic Punks network';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

var CANONICAL_BASE = 'https://cyberneticpunks.com';
var OG_FETCH_TIMEOUT_MS = 3000;
var OG_MAX_BYTES = 8 * 1024 * 1024; // the largest image the main share crawlers accept

// The sibling og path for a thumbnail, or null (then the generated card is used).
function ogSiblingSrc(thumbnail) {
  var s = safeHref(thumbnail);
  if (!s) return null;
  if (s.indexOf('/images/') !== 0) {
    // An https URL is accepted only on the site's own host (CANONICAL_BASE), so the route never fetches
    // another host.
    var u;
    try { u = new URL(s); } catch (e) { return null; }
    if (u.protocol !== 'https:' || u.host !== new URL(CANONICAL_BASE).host) return null;
  }
  if (!/\.(webp|jpe?g|png)$/i.test(s)) return null;
  return s.replace(/\.(webp|jpe?g|png)$/i, '-og-1200x630.jpg');
}

// Fetch the sibling file (same-site paths by absolute URL; public/ is served by the CDN, not bundled
// with this function). Returns { body, type } only for a 200 image response within the timeout and size cap.
async function loadOgSibling(src) {
  var url = src.charAt(0) === '/' ? CANONICAL_BASE + src : src;
  var ctrl = new AbortController();
  var timer = setTimeout(function () { ctrl.abort(); }, OG_FETCH_TIMEOUT_MS);
  try {
    var res = await fetch(url, { signal: ctrl.signal, cache: 'no-store' });
    var type = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    if (res.status !== 200 || type.indexOf('image/') !== 0) return null;
    var body = await res.arrayBuffer();
    if (!body.byteLength || body.byteLength > OG_MAX_BYTES) return null;
    return { body: body, type: type };
  } catch (e) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Length-based headline sizing (mirrors the /intel per-article card); the Card
// additionally clamps to 3 lines.
function headlineSize(headline) {
  var n = (headline || '').length;
  if (n <= 40) return 50;
  if (n <= 70) return 42;
  return 36;
}

export default async function Image({ params }) {
  const fonts = await loadExo2();
  const p = await params;

  // Best-effort headline fetch -- a missing/unknown slug falls back to the generic
  // DMZ line rather than throwing.
  let headline = 'Call of Duty DMZ intelligence';
  let thumbnail = null;
  try {
    const res = await supabase
      .from('feed_items')
      .select('headline, thumbnail')
      .eq('slug', p.slug)
      .eq('game_slug', 'dmz')
      .eq('is_published', true)
      .maybeSingle();
    if (res && res.data && res.data.headline) headline = res.data.headline;
    if (res && res.data) thumbnail = res.data.thumbnail;
  } catch (e) {
    // keep the fallback headline
  }

  const ogSrc = ogSiblingSrc(thumbnail);
  const og = ogSrc ? await loadOgSibling(ogSrc) : null;
  if (og) {
    return new Response(og.body, {
      headers: {
        'content-type': og.type,
        // Same Cache-Control that ImageResponse sets for the generated card.
        'cache-control': process.env.NODE_ENV === 'development' ? 'no-cache, no-store' : 'public, max-age=0, must-revalidate',
      },
    });
  }

  const accent = OG_COLORS.dmz; // forest green (#3f7d44)

  return new ImageResponse(
    (
      <Card
        accent={accent}
        blockTextColor={blockTextColor(accent)}
        gameTag="DMZ"
        headline={headline}
        tagline="NO HYPE. JUST INTEL."
        headlineFontSize={headlineSize(headline)}
      />
    ),
    { ...size, fonts }
  );
}
