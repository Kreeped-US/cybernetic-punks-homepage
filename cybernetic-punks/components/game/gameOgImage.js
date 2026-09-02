// components/game/gameOgImage.js
// SHARED per-article OG-card factory. Returns the next/og Image function for a game, using the
// shared lib/og/card.js card (CNP-text-branded, IP-safe -- gameTag is TEXT, no publisher logo).
// The accent resolves from OG_COLORS[slug] when present, else the game config's theme.accent -- so a
// new game's OG "just works" from config with no edit to the shared OG color map. Headline is fetched
// by slug (best-effort; a missing/unknown slug falls back to a generic line, never throws).
//
// Usage in a game's opengraph-image route:
//   export const runtime = 'nodejs';
//   export const size = { width: 1200, height: 630 };
//   export const contentType = 'image/png';
//   export const alt = '<Game> article on the Cybernetic Punks network';
//   export default makeGameOgImage(config);

import { ImageResponse } from 'next/og';
import { supabase } from '@/lib/supabase';
import { Card } from '@/lib/og/card';
import { OG_COLORS, blockTextColor } from '@/lib/og/colors';
import { loadExo2 } from '@/lib/og/fonts';

function headlineSize(headline) {
  var n = (headline || '').length;
  if (n <= 40) return 50;
  if (n <= 70) return 42;
  return 36;
}

export function makeGameOgImage(config) {
  var accent = OG_COLORS[config.slug] || (config.theme && config.theme.accent) || '#888888';
  var gameTag = config.ogTag || String(config.displayName || config.slug).toUpperCase();
  var fallbackHeadline = (config.displayName || 'Network') + ' intelligence';
  var size = { width: 1200, height: 630 };

  return async function Image({ params }) {
    var fonts = await loadExo2();
    var p = await params;
    var headline = fallbackHeadline;
    try {
      var res = await supabase
        .from('feed_items')
        .select('headline')
        .eq('slug', p.slug)
        .eq('game_slug', config.slug)
        .eq('is_published', true)
        .maybeSingle();
      if (res && res.data && res.data.headline) headline = res.data.headline;
    } catch (e) { /* keep fallback */ }

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
  };
}
