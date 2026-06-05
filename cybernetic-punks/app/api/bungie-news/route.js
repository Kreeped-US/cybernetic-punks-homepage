// app/api/bungie-news/route.js
// Pulls from Steam news API (patch notes, announcements).
// Cached for 30 minutes to avoid hammering APIs on every page load.
//
// X intake removed April 27, 2026 — Free tier doesn't permit search endpoint.
// Ticker now shows Bungie news only (more authoritative anyway).

import { gatherBungieNews, formatBungieNewsForTicker } from '@/lib/gather/bungie';

export const revalidate = 1800; // 30 minutes

// Fallback headlines — used when Bungie news fetch returns empty.
// Cleaned of canceled Cryo Archive references April 27, 2026.
// JUNE 5, 2026 - S2 refresh: removed stale pre-S2 headlines that asserted the
// wrong current state when shown as live ticker copy. Fixes: "Season 1... NOW
// LIVE" (S1 ended; S2 launched June 2), "RANKED MODE LIVE" (ranked returns
// June 14, not live at S2 launch), and "Season 2... INCOMING" (it's live now).
// Kept evergreen design-philosophy headlines. Season-state lines kept
// season-agnostic where possible so they don't restale each season.
const FALLBACK_HEADLINES = [
  'SEASON 2 NIGHTFALL NOW LIVE — NIGHT MARSH, THE SENTINEL SHELL, AND THE CRADLE',
  'THE CRADLE REPLACES THE FACTION STAT GRIND — RESPEC FREELY, SHARED ACROSS ALL SHELLS',
  'NIGHT MARSH: DIRE MARSH AFTER DARK — NEAR-TOTAL DARKNESS, NEW THREATS, NEW LIGHT GEAR',
  'RANKED RETURNS JUNE 14 — SINGLE MERGED QUEUE, CLIMB THE HOLOTAG LADDER',
  'OPEN PLAY WEEK JUNE 2-9 — FREE ON PS5, XBOX SERIES X|S, AND PC, PROGRESS CARRIES OVER',
  'BUNGIE CONFIRMS SEASONAL WIPES: GEAR, PROGRESSION, AND VAULT RESET EACH SEASON',
  'REWARD PASSES NEVER EXPIRE — PURCHASE AND COMPLETE PAST PASSES ANYTIME',
  'NO PAY-TO-WIN: BUNGIE COMMITS TO COMPETITIVE INTEGRITY IN MARATHON',
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