// app/intel/[slug]/opengraph-image.js
// PER-ARTICLE dynamic OG card. Fetches the article by slug (anon-readable feed_items;
// no force-dynamic -- the route is already on-demand, no generateStaticParams), colors
// the card by game_slug, and renders the headline with length-based sizing + a 3-line
// clamp. Unknown/deleted slug -> falls back to the network default card (never throws).

import { ImageResponse } from 'next/og';
import { supabase } from '@/lib/supabase';
import { Card } from '@/lib/og/card';
import { OG_COLORS, blockTextColor } from '@/lib/og/colors';
import { loadExo2 } from '@/lib/og/fonts';

export const runtime = 'nodejs';

export const alt = 'Cybernetic Punks - competitive-shooter intelligence';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Length-based headline sizing so long headlines shrink instead of overflowing; the
// Card additionally clamps to 3 lines.
function headlineSize(headline) {
  var n = headline.length;
  if (n <= 40) return 50;
  if (n <= 70) return 42;
  return 36;
}

export default async function Image({ params }) {
  const fonts = await loadExo2();
  const { slug } = await params;

  // Best-effort fetch -- a missing/unknown slug or a query error must NOT throw; it
  // falls through to the network default card below.
  let item = null;
  try {
    const res = await supabase
      .from('feed_items')
      .select('headline, game_slug')
      .eq('slug', slug)
      .maybeSingle();
    item = res && res.data ? res.data : null;
  } catch (e) {
    item = null;
  }

  // Accent + game tag from game_slug; network burgundy is the fallback.
  let accent = OG_COLORS.network;
  let gameTag = null;
  if (item && item.game_slug === 'marathon') {
    accent = OG_COLORS.marathon;
    gameTag = 'MARATHON';
  } else if (item && item.game_slug === 'dmz') {
    accent = OG_COLORS.dmz;
    gameTag = 'DMZ';
  }

  const headline = (item && item.headline) || 'Competitive-shooter intelligence network';

  return new ImageResponse(
    (
      <Card
        accent={accent}
        blockTextColor={blockTextColor(accent)}
        gameTag={gameTag}
        headline={headline}
        tagline="NO HYPE. JUST INTEL."
        headlineFontSize={headlineSize(headline)}
      />
    ),
    { ...size, fonts }
  );
}
