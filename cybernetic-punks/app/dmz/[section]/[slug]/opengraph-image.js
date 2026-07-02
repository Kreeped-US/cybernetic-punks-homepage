// app/dmz/[section]/[slug]/opengraph-image.js
// PER-ARTICLE DMZ OG card. Overrides the generic /dmz card (app/dmz/opengraph-image.js)
// for /dmz/[section]/[slug] URLs, so a shared DMZ article shows its OWN headline on a
// DMZ-branded (forest-green) card instead of the generic one. Reuses lib/og/card.js
// with gameTag='DMZ' -- no marathonLogo is passed, so the DMZ text pill renders (no
// Marathon logo/neon green). Card code is NOT duplicated; only this route is new.
//
// Font is the bundled Exo 2 buffer (loadExo2) -- next/og needs the bytes, not a bare
// import (same gotcha as the other cards). Node runtime for the font read.

import { ImageResponse } from 'next/og';
import { supabase } from '@/lib/supabase';
import { Card } from '@/lib/og/card';
import { OG_COLORS, blockTextColor } from '@/lib/og/colors';
import { loadExo2 } from '@/lib/og/fonts';

export const runtime = 'nodejs';

export const alt = 'DMZ article on the Cybernetic Punks network';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

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
  try {
    const res = await supabase
      .from('feed_items')
      .select('headline')
      .eq('slug', p.slug)
      .eq('game_slug', 'dmz')
      .eq('is_published', true)
      .maybeSingle();
    if (res && res.data && res.data.headline) headline = res.data.headline;
  } catch (e) {
    // keep the fallback headline
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
