// lib/gather/steam.js
// Steam Web API — player count, news, reviews. No API key required.
// The Steam appid is per-game config (lib/games/<slug>.js sources.steamAppId);
// Marathon = 3065800. Each export defaults to the active game's appid so existing
// arg-less callers behave identically; gatherAll passes it explicitly (Phase A).

import { getGameConfig } from '../games';

// Steam announcement bodies (feedname "steam_community_announcements") are
// Bungie's official posts cross-posted to Steam, and carry the FULL patch
// notes -- but they are authored in BBCode ([h2], [list], [*], [p], [b],
// [url=...], etc.), not HTML. Convert to readable plain text so editors get
// the complete notes in a usable form. Closing block tags become line breaks,
// list items become "- " bullets, opening block + inline tags are stripped
// (their text is kept). No length cap -- the whole point of the fix is that the
// full notes survive ingest. See docs/network/GATHER_PIPELINE_AUDIT.md (Gap 1).
function bbcodeToText(raw) {
  if (!raw) return '';
  return String(raw)
    .replace(/\[\*\]\s*/gi, '\n- ')              // list items -> bullets
    .replace(/\[\/\*\]/gi, '')                   // closing list-item tags -> remove
    .replace(/\[\/(?:p|h[1-6]|list)\]/gi, '\n')  // closing block tags -> newline
    .replace(/\[(?:p|list|h[1-6])\]/gi, '')      // opening block tags -> remove
    .replace(/\[\/?[a-z*][^\]]*\]/gi, '')        // strip remaining inline bbcode, keep text
    .replace(/[ \t]+/g, ' ')                     // collapse runs of spaces/tabs
    .replace(/[ \t]*\n[ \t]*/g, '\n')            // trim spaces around newlines
    .replace(/\n{3,}/g, '\n\n')                  // cap blank-line runs
    .trim();
}

export async function fetchSteamPlayerCount(appId = getGameConfig().sources.steamAppId) {
  try {
    const res = await fetch(
      `https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=${appId}`
    );
    if (!res.ok) throw new Error(`Steam player count: ${res.status}`);
    const d = await res.json();
    const count = d?.response?.player_count;
    if (!count) throw new Error('No player count in response');
    console.log(`[steam.js] Live players: ${count.toLocaleString()}`);
    return count;
  } catch (err) {
    console.error('[steam.js] Player count failed:', err.message);
    return null;
  }
}

export async function fetchSteamNews(appId = getGameConfig().sources.steamAppId) {
  try {
    // maxlength=0 = NO truncation: return the full announcement body. This is
    // the core of the Gap 1 fix -- maxlength=600 was silently cutting patch
    // notes to a headline blurb at ingest, so editors published off incomplete
    // notes (the 1.1.0.2 "C.A.R.R.I.-only" failure). The full body is then
    // BBCode-cleaned below.
    const res = await fetch(
      `https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=${appId}&count=8&maxlength=0&format=json`
    );
    if (!res.ok) throw new Error(`Steam news: ${res.status}`);
    const d = await res.json();
    const items = d?.appnews?.newsitems || [];
    const articles = items.map(item => {
      const contents = bbcodeToText(item.contents || '');
      return {
        title:    item.title,
        url:      item.url,
        date:     new Date(item.date * 1000).toISOString(),
        contents,
        author:   item.author || 'Bungie',
        feedname: item.feedname || '',
        source:   'steam-news',
        // Completeness signal (Gap 1): the Steam news JSON is fetched uncapped,
        // so a non-empty body IS the full official notes. Empty -> not complete.
        // Threaded into the editor prompts so a partial ingest degrades to an
        // honest hedge instead of confident-wrong.
        notes_complete: contents.length > 0,
      };
    });
    console.log(`[steam.js] Steam news: ${articles.length} articles`);
    return articles;
  } catch (err) {
    console.error('[steam.js] News failed:', err.message);
    return [];
  }
}

export async function fetchSteamReviews(appId = getGameConfig().sources.steamAppId) {
  try {
    const res = await fetch(
      `https://store.steampowered.com/appreviews/${appId}?json=1&filter=recent&language=english&num_per_page=15&review_type=all`,
      { headers: { 'User-Agent': 'CyberneticPunks-Bot/1.0' } }
    );
    if (!res.ok) throw new Error(`Steam reviews: ${res.status}`);
    const d = await res.json();
    const reviews = (d?.reviews || [])
      .map(r => ({
        text:           r.review?.slice(0, 400) || '',
        voted_up:       r.voted_up,
        playtime_hours: Math.round((r.author?.playtime_at_review || 0) / 60),
        timestamp:      new Date(r.timestamp_created * 1000).toISOString(),
      }))
      .filter(r => r.text.length > 20);

    const totalReviews     = d?.query_summary?.total_reviews || 0;
    const positivePercent  = d?.query_summary?.review_score_desc || 'Unknown';

    console.log(`[steam.js] Steam reviews: ${reviews.length} recent reviews fetched`);
    return { reviews, totalReviews, positivePercent };
  } catch (err) {
    console.error('[steam.js] Reviews failed:', err.message);
    return { reviews: [], totalReviews: 0, positivePercent: 'Unknown' };
  }
}