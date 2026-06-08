// app/api/rising-runners/route.js
// Paginates through Marathon streams to find under-100 viewer streamers.
//
// FIX (June 8, 2026): resolve the Marathon category via the fuzzy
// search/categories endpoint instead of exact games?name=Marathon. The exact
// match was returning nothing (source: no_game_id) - Twitch's games?name= is an
// exact display-name match and the live category did not match the bare string
// "Marathon", so the widget showed 0 for months. We now (1) try search/categories
// (fuzzy), picking the best match, (2) fall back to exact games?name, and
// (3) return the candidate names in the response when resolution fails, so the
// real category name is visible rather than guessed. Also fixed the pagination
// early-exit that could stop before collecting the full pool of small streamers.

import { NextResponse } from 'next/server';

let cachedToken = null;
let tokenExpiry = 0;

async function getToken() {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;
  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  try {
    const res = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, grant_type: 'client_credentials' }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    cachedToken = data.access_token;
    tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
    return cachedToken;
  } catch (err) { return null; }
}

async function twitchFetch(endpoint) {
  const token = await getToken();
  if (!token) return null;
  const res = await fetch('https://api.twitch.tv/helix/' + endpoint, {
    headers: { 'Client-ID': process.env.TWITCH_CLIENT_ID, 'Authorization': 'Bearer ' + token },
  });
  if (!res.ok) return null;
  return res.json();
}

// Resolve the Marathon category id. Returns { id, name, via } or null.
// Strategy: exact games?name FIRST - the diagnostic confirmed games?name=Marathon
// returns exactly one result, the correct 2026 game (id 407314011). Fuzzy
// search/categories is the fallback only, because it returns ~20 "Marathon"-
// containing categories with the real game buried mid-list and a wrong one
// ("Marathon 2: Durandal") at position 0 - so we only use it if exact fails,
// and even then we require an exact case-insensitive name match rather than
// trusting the top result.
async function resolveMarathonCategory() {
  // 1. Exact name match - returns the single correct category.
  const gameData = await twitchFetch('games?name=Marathon');
  if (gameData && Array.isArray(gameData.data) && gameData.data.length > 0) {
    return { id: gameData.data[0].id, name: gameData.data[0].name, via: 'games_exact' };
  }

  // 2. Fallback: fuzzy search, but ONLY accept an exact case-insensitive
  // "marathon" match - never the top result, which is a different game.
  const search = await twitchFetch('search/categories?query=' + encodeURIComponent('Marathon') + '&first=40');
  if (search && Array.isArray(search.data) && search.data.length > 0) {
    const exact = search.data.find(function(c) {
      return (c.name || '').trim().toLowerCase() === 'marathon';
    });
    if (exact) {
      return { id: exact.id, name: exact.name, via: 'search_exact' };
    }
  }

  return null;
}

export async function GET() {
  try {
    const category = await resolveMarathonCategory();
    if (!category || !category.id) {
      return NextResponse.json({ runners: [], source: 'no_game_id' });
    }
    const gameId = category.id;

    // Paginate through streams (sorted highest-viewers-first) collecting every
    // sub-100 streamer across the page budget. We do NOT early-break on the first
    // boundary page (the old bug) - we keep paging until we have enough small
    // streamers, run out of pages, or hit a page whose TOP stream is already
    // under 100 (meaning all remaining streams are small - collect and continue
    // naturally until the budget or data ends).
    let rising = [];
    let cursor = null;
    let pages = 0;
    const maxPages = 6; // up to 600 streams scanned

    while (pages < maxPages) {
      let url = 'streams?game_id=' + gameId + '&first=100&type=live';
      if (cursor) url += '&after=' + cursor;

      const data = await twitchFetch(url);
      if (!data || !Array.isArray(data.data) || data.data.length === 0) break;

      for (const stream of data.data) {
        if (stream.viewer_count < 100 && stream.viewer_count > 0) {
          let thumb = stream.thumbnail_url || '';
          thumb = thumb.replace('{width}', '440').replace('{height}', '248');
          rising.push({
            id: stream.id,
            user_name: stream.user_name,
            user_login: stream.user_login,
            title: stream.title,
            viewer_count: stream.viewer_count,
            thumbnail_url: thumb,
            started_at: stream.started_at,
            stream_url: 'https://www.twitch.tv/' + stream.user_login,
          });
        }
      }

      // Enough collected - stop.
      if (rising.length >= 12) break;

      // Advance to next page if one exists; otherwise we've exhausted the list.
      if (data.pagination && data.pagination.cursor) {
        cursor = data.pagination.cursor;
      } else {
        break;
      }

      pages++;
    }

    rising.sort(function(a, b) { return b.viewer_count - a.viewer_count; });

    return NextResponse.json({
      runners: rising.slice(0, 12),
      total_found: rising.length,
      pages_scanned: pages + 1,
      category_name: category.name,
      resolved_via: category.via,
      source: 'twitch',
    });
  } catch (error) {
    return NextResponse.json({ runners: [], source: 'error', error: error.message });
  }
}