// app/api/twitch-debug/route.js
// Temporary — delete after debugging

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
  if (!res.ok) return { error: res.status };
  return res.json();
}

export async function GET() {
  // Search for all possible Marathon game entries
  const search1 = await twitchFetch('games?name=Marathon');
  const search2 = await twitchFetch('games?name=Marathon (2026)');
  const search3 = await twitchFetch('search/categories?query=Marathon&first=10');

  // If we find a game ID, check streams
  let streams = null;
  let gameId = null;

  if (search1 && search1.data && search1.data.length > 0) {
    gameId = search1.data[0].id;
    streams = await twitchFetch('streams?game_id=' + gameId + '&first=5&type=live');
  }

  return NextResponse.json({
    exact_marathon: search1,
    marathon_2026: search2,
    search_results: search3,
    game_id_used: gameId,
    sample_streams: streams,
  });
}