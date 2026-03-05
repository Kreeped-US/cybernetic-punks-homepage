// app/api/rising-runners/route.js
// Returns Marathon streamers with under 100 viewers

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
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'client_credentials',
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    cachedToken = data.access_token;
    tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
    return cachedToken;
  } catch (err) {
    return null;
  }
}

async function twitchFetch(endpoint) {
  const token = await getToken();
  if (!token) return null;

  const res = await fetch('https://api.twitch.tv/helix/' + endpoint, {
    headers: {
      'Client-ID': process.env.TWITCH_CLIENT_ID,
      'Authorization': 'Bearer ' + token,
    },
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
    } else {
      const gameData2 = await twitchFetch('games?name=Marathon (2026)');
      if (gameData2 && gameData2.data && gameData2.data.length > 0) {
        gameId = gameData2.data[0].id;
      }
    }

    if (!gameId) {
      return NextResponse.json({ runners: [], source: 'no_game_id' });
    }

    // Fetch up to 100 streams to find smaller ones
    const data = await twitchFetch(
      'streams?game_id=' + gameId + '&first=100&type=live'
    );

    if (!data || !data.data) {
      return NextResponse.json({ runners: [], source: 'no_streams' });
    }

    // Filter to under 100 viewers
    const rising = data.data
      .filter((s) => s.viewer_count < 100 && s.viewer_count > 0)
      .map((stream) => ({
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
      }))
      .sort((a, b) => b.viewer_count - a.viewer_count);

    return NextResponse.json({ runners: rising, source: 'twitch' });
  } catch (error) {
    return NextResponse.json({ runners: [], source: 'error' });
  }
}