// app/pubg-dednet/[section]/[slug]/opengraph-image.js
// PER-ARTICLE PUBG: DED.NET OG card. Mirrors the DMZ/intel per-article generators: a shared
// lib/og/card.js card, headline fetched by slug, DED.NET-branded (blood-red accent). gameTag is
// TEXT ("DED.NET") -- no publisher logo, matching the CNP-text-branded, IP-safe posture of the
// other cards. Card code is NOT duplicated; only this route is new.
//
// Font is the bundled Exo 2 buffer (loadExo2) -- next/og needs the bytes, not a bare import.
// Node runtime for the font read. A missing/unknown slug falls back to a generic line (never throws).

import { ImageResponse } from 'next/og';
import { supabase } from '@/lib/supabase';
import { Card } from '@/lib/og/card';
import { OG_COLORS, blockTextColor } from '@/lib/og/colors';
import { loadExo2 } from '@/lib/og/fonts';

export const runtime = 'nodejs';

export const alt = 'PUBG: DED.NET article on the Cybernetic Punks network';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Length-based headline sizing (mirrors the other per-article cards); the Card clamps to 3 lines.
function headlineSize(headline) {
  var n = (headline || '').length;
  if (n <= 40) return 50;
  if (n <= 70) return 42;
  return 36;
}

export default async function Image({ params }) {
  const fonts = await loadExo2();
  const p = await params;

  // Best-effort headline fetch -- a missing/unknown slug falls back to the generic DED.NET line.
  let headline = 'PUBG: DED.NET intelligence';
  try {
    const res = await supabase
      .from('feed_items')
      .select('headline')
      .eq('slug', p.slug)
      .eq('game_slug', 'pubg-dednet')
      .eq('is_published', true)
      .maybeSingle();
    if (res && res.data && res.data.headline) headline = res.data.headline;
  } catch (e) {
    // keep the fallback headline
  }

  const accent = OG_COLORS['pubg-dednet']; // grindhouse blood-red (#cc2936)

  return new ImageResponse(
    (
      <Card
        accent={accent}
        blockTextColor={blockTextColor(accent)}
        gameTag="DED.NET"
        headline={headline}
        tagline="NO HYPE. JUST INTEL."
        headlineFontSize={headlineSize(headline)}
      />
    ),
    { ...size, fonts }
  );
}
