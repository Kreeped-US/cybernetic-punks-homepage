// app/api/rising-runners/route.js
// Paginates through Marathon streams to find under-100 viewer streamers

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

export async function GET() {
  try {
    // Find Marathon game ID
    let gameId = null;
    const gameData = await twitchFetch('games?name=Marathon');
    if (gameData && gameData.data && gameData.data.length > 0) {
      gameId = gameData.data[0].id;
    }
    if (!gameId) {
      return NextResponse.json({ runners: [], source: 'no_game_id' });
    }

    // Paginate through streams until we find under-100 viewer ones
    // Twitch returns streams sorted by viewer count (highest first)
    // So we need to page through until we hit the smaller streamers
    let rising = [];
    let cursor = null;
    let pages = 0;
    const maxPages = 5; // Max 5 pages = 500 streams scanned

    while (pages < maxPages) {
      let url = 'streams?game_id=' + gameId + '&first=100&type=live';
      if (cursor) url += '&after=' + cursor;

      const data = await twitchFetch(url);
      if (!data || !data.data || data.data.length === 0) break;

      // Check each stream
      for (const stream of data.data) {
        if (stream.viewer_count < 100 && stream.viewer_count > 0) {
          rising.push({
            id: stream.id,
            user_name: stream.user_name,
            user_login: stream.user_login,
            title: stream.title,
            viewer_count: stream.viewer_count,
            thumbnail_url: stream.thumbnail_url
              .replace('{width}', '440')
              .replace('{height}', '248'),
            started_at: stream.started_at,
            stream_url: 'https://www.twitch.tv/' + stream.user_login,
          });
        }
      }

      // If we found enough or the last stream on this page is already under 100, we're done
      if (rising.length >= 12) break;

      // If the lowest viewer count on this page is under 100, no need to paginate more
      const lowestOnPage = data.data[data.data.length - 1].viewer_count;
      if (lowestOnPage < 100) break;

      // Get next page cursor
      if (data.pagination && data.pagination.cursor) {
        cursor = data.pagination.cursor;
      } else {
        break;
      }

      pages++;
    }

    // Sort by viewer count descending (highest of the small ones first)
    rising.sort((a, b) => b.viewer_count - a.viewer_count);

    return NextResponse.json({
      runners: rising.slice(0, 12),
      total_found: rising.length,
      pages_scanned: pages + 1,
      source: 'twitch',
    });
  } catch (error) {
    return NextResponse.json({ runners: [], source: 'error', error: error.message });
  }
}
