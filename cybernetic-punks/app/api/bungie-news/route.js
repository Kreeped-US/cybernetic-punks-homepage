// app/api/bungie-news/route.js
// Powers the DevTicker component with live Bungie news
// Pulls from Steam news API (patch notes, announcements) + X official posts
// Cached for 30 minutes to avoid hammering APIs on every page load

import { gatherBungieNews, formatBungieNewsForTicker } from '@/lib/gather/bungie';
import { gatherXPulse, formatXForTicker } from '@/lib/gather/xpulse';

export const revalidate = 1800; // 30 minutes

// Fallback headlines — updated to be accurate as of March 2026
const FALLBACK_HEADLINES = [
  'MARATHON LAUNCHES MARCH 5 ON PS5, XBOX SERIES X|S, AND PC — CROSS-PLAY ENABLED',
  'RANKED MODE NOW LIVE — CLIMB THE HOLOTAG LADDER AND PROVE YOUR WORTH',
  'SEASON 1: DEATH IS THE FIRST STEP — CRYO ARCHIVE NOW AVAILABLE',
  'BUNGIE CONFIRMS SEASONAL WIPES: GEAR, PROGRESSION, AND VAULT RESET EVERY 3 MONTHS',
  'REWARD PASSES NEVER EXPIRE — PURCHASE AND COMPLETE PAST PASSES ANYTIME',
  'NO PAY-TO-WIN: BUNGIE COMMITS TO COMPETITIVE INTEGRITY IN MARATHON',
  'FOUR ZONES AT LAUNCH: PERIMETER, DIRE MARSH, OUTPOST, AND CRYO ARCHIVE',
  'SEASON 2 NIGHTFALL: DIRE MARSH NIGHT VARIANT + SENTINEL SHELL INCOMING',
];

export async function GET() {
  try {
    // Fetch Bungie news and X official posts in parallel
    const [bungieNews, xPulse] = await Promise.all([
      gatherBungieNews(),
      gatherXPulse(),
    ]);

    const bungieHeadlines = formatBungieNewsForTicker(bungieNews) || [];
    const xHeadlines = formatXForTicker(xPulse) || [];

    // Merge: official X posts first (most real-time), then Bungie news
    const combined = [...xHeadlines, ...bungieHeadlines];

    if (combined.length === 0) {
      return Response.json({ headlines: FALLBACK_HEADLINES, source: 'fallback' });
    }

    // Pad with fallbacks if we have fewer than 4 headlines
    const final = combined.length < 4
      ? [...combined, ...FALLBACK_HEADLINES.slice(0, 4 - combined.length)]
      : combined;

    return Response.json({
      headlines: final,
      source: 'live',
      bungie_count: bungieHeadlines.length,
      x_count: xHeadlines.length,
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
