// app/api/bungie-news/route.js
// Powers the DevTicker component with live Bungie news.
// Pulls from Steam news API (patch notes, announcements).
// Cached for 30 minutes to avoid hammering APIs on every page load.
//
// X intake removed April 27, 2026 — Free tier doesn't permit search endpoint.
// Ticker now shows Bungie news only (more authoritative anyway).

import { gatherBungieNews, formatBungieNewsForTicker } from '@/lib/gather/bungie';

export const revalidate = 1800; // 30 minutes

// Fallback headlines — used when Bungie news fetch returns empty.
// Cleaned of canceled Cryo Archive references April 27, 2026.
const FALLBACK_HEADLINES = [
  'MARATHON LAUNCHED MARCH 5 ON PS5, XBOX SERIES X|S, AND PC — CROSS-PLAY ENABLED',
  'RANKED MODE LIVE — CLIMB THE HOLOTAG LADDER AND PROVE YOUR WORTH',
  'SEASON 1: DEATH IS THE FIRST STEP — NOW LIVE',
  'BUNGIE CONFIRMS SEASONAL WIPES: GEAR, PROGRESSION, AND VAULT RESET EVERY 3 MONTHS',
  'REWARD PASSES NEVER EXPIRE — PURCHASE AND COMPLETE PAST PASSES ANYTIME',
  'NO PAY-TO-WIN: BUNGIE COMMITS TO COMPETITIVE INTEGRITY IN MARATHON',
  'FOUR ZONES AT LAUNCH: PERIMETER, DIRE MARSH, OUTPOST, AND THE FOUNDRY',
  'SEASON 2 NIGHTFALL: DIRE MARSH NIGHT VARIANT + SENTINEL SHELL INCOMING',
];

export async function GET() {
  try {
    const bungieNews = await gatherBungieNews();
    const bungieHeadlines = formatBungieNewsForTicker(bungieNews) || [];

    if (bungieHeadlines.length === 0) {
      return Response.json({ headlines: FALLBACK_HEADLINES, source: 'fallback' });
    }

    // Pad with fallbacks if we have fewer than 4 headlines
    const final = bungieHeadlines.length < 4
      ? [...bungieHeadlines, ...FALLBACK_HEADLINES.slice(0, 4 - bungieHeadlines.length)]
      : bungieHeadlines;

    return Response.json({
      headlines: final,
      source: 'live',
      bungie_count: bungieHeadlines.length,
      patch_notes: bungieNews.filter(a => a.is_patch_note).map(a => ({
        title: a.title,
        url: a.url,
        date: a.date,
      })),
    });
  } catch (err) {
    console.error('[bungie-news API] Error:', err.message);
    return Response.json({ headlines: FALLBACK_HEADLINES, source: 'fallback', error: err.message });
  }
}