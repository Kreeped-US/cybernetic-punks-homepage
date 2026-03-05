// lib/gather/twitch.js
// Fetches Marathon clips and live streamers from Twitch API
// Requires TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET env vars

let cachedToken = null;
let tokenExpiry = 0;

/**
 * Get an app access token from Twitch (auto-caches)
 */
async function getToken() {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;

  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.log('[GATHER:TWITCH] No Twitch credentials — skipping');
    return null;
  }

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

    if (!res.ok) {
      console.error('[GATHER:TWITCH] Token request failed:', res.status);
      return null;
    }

    const data = await res.json();
    cachedToken = data.access_token;
    tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
    return cachedToken;
  } catch (err) {
    console.error('[GATHER:TWITCH] Token error:', err.message);
    return null;
  }
}

/**
 * Make an authenticated Twitch API request
 */
async function twitchFetch(endpoint) {
  const token = await getToken();
  if (!token) return null;

  const res = await fetch('https://api.twitch.tv/helix/' + endpoint, {
    headers: {
      'Client-ID': process.env.TWITCH_CLIENT_ID,
      'Authorization': 'Bearer ' + token,
    },
  });

  if (!res.ok) {
    console.error('[GATHER:TWITCH] API error on ' + endpoint + ':', res.status);
    return null;
  }

  return res.json();
}

/**
 * Get the Twitch game ID for Marathon
 */
async function getMarathonGameId() {
  const data = await twitchFetch('games?name=Marathon');
  if (!data || !data.data || data.data.length === 0) {
    // Try alternate name
    const data2 = await twitchFetch('games?name=Marathon (2026)');
    if (!data2 || !data2.data || data2.data.length === 0) return null;
    return data2.data[0].id;
  }
  return data.data[0].id;
}

/**
 * Fetch top Marathon clips from the last 48 hours
 * Returns array of clip objects for CIPHER to analyze
 */
export async function gatherTwitchClips() {
  try {
    const gameId = await getMarathonGameId();
    if (!gameId) {
      console.log('[GATHER:TWITCH] Could not find Marathon game ID');
      return [];
    }

    const startedAt = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const data = await twitchFetch(
      'clips?game_id=' + gameId + '&first=10&started_at=' + startedAt
    );

    if (!data || !data.data) return [];

    const clips = data.data.map((clip) => ({
      id: clip.id,
      title: clip.title,
      creator: clip.creator_name,
      broadcaster: clip.broadcaster_name,
      view_count: clip.view_count,
      duration: clip.duration,
      thumbnail: clip.thumbnail_url,
      embed_url: clip.embed_url + '&parent=cyberneticpunks.com',
      clip_url: clip.url,
      created_at: clip.created_at,
      source: 'TWITCH',
    }));

    console.log('[GATHER:TWITCH] Found ' + clips.length + ' Marathon clips');
    return clips;
  } catch (err) {
    console.error('[GATHER:TWITCH] Clips error:', err.message);
    return [];
  }
}

/**
 * Fetch currently live Marathon streamers
 * Used by the TwitchLive homepage component (client-side via API route)
 */
export async function getLiveStreamers() {
  try {
    const gameId = await getMarathonGameId();
    if (!gameId) return [];

    const data = await twitchFetch(
      'streams?game_id=' + gameId + '&first=12&type=live'
    );

    if (!data || !data.data) return [];

    const streamers = data.data.map((stream) => ({
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
    }));

    console.log('[GATHER:TWITCH] Found ' + streamers.length + ' live Marathon streamers');
    return streamers;
  } catch (err) {
    console.error('[GATHER:TWITCH] Live streamers error:', err.message);
    return [];
  }
}

/**
 * Format Twitch clips for CIPHER to analyze alongside YouTube videos
 */
export function formatClipsForCipher(clips) {
  if (!clips.length) return null;

  const clipSummaries = clips.slice(0, 5).map((c, i) => {
    return `${i + 1}. TWITCH CLIP: "${c.title}" clipped from ${c.broadcaster}'s stream by ${c.creator}
   Views: ${c.view_count.toLocaleString()} | Duration: ${Math.round(c.duration)}s
   Clip URL: ${c.clip_url}
   Clip ID: ${c.id}`;
  }).join('\n\n');

  return clipSummaries;
}