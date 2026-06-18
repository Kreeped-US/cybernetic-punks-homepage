// lib/gather/twitch.js
// Fetches clips and live streamers from Twitch API for the active game.
// The Twitch game name(s) are per-game config (lib/games/<slug>.js
// sources.twitch.gameNames); Marathon = ['Marathon','Marathon (2026)'].
// Requires TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET env vars

import { getGameConfig } from '../games';

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
 * Get the Twitch game ID for the active game. Tries each configured name in
 * order (Marathon: 'Marathon' then 'Marathon (2026)') and returns the first
 * match. Names are passed unencoded to match the prior request shape exactly.
 */
async function getGameId(gameNames) {
  for (const name of gameNames) {
    const data = await twitchFetch('games?name=' + name);
    if (data && data.data && data.data.length > 0) return data.data[0].id;
  }
  return null;
}

/**
 * Fetch top Marathon clips from the last 48 hours
 * Returns array of clip objects for CIPHER to analyze
 */
export async function gatherTwitchClips(config = getGameConfig()) {
  try {
    const gameId = await getGameId(config.sources.twitch.gameNames);
    if (!gameId) {
      console.log('[GATHER:TWITCH] Could not find game ID');
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
 */
export async function getLiveStreamers(config = getGameConfig()) {
  try {
    const gameId = await getGameId(config.sources.twitch.gameNames);
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
 * Fetch Twitch profile avatars for a list of logins (added June 9, 2026).
 * Used by /rising to put real creator faces on the spotlight cards.
 *
 * Helix GET /users accepts up to 100 login params in a single request, so this
 * is ONE API call regardless of how many creators are passed. Returns a plain
 * object mapping lowercased login -> profile_image_url. On any failure (no
 * credentials, API error, empty input) it returns an empty object, so callers
 * can always safely do `avatars[login]` and fall back to a placeholder when
 * undefined. Never throws.
 *
 * @param {string[]} logins - Twitch login names (case-insensitive)
 * @returns {Promise<Object>} login(lowercase) -> avatar URL
 */
export async function getUserAvatars(logins) {
  try {
    if (!Array.isArray(logins) || logins.length === 0) return {};

    // Normalize, dedupe, drop empties, cap at 100 (Helix limit).
    const seen = {};
    const clean = [];
    for (let i = 0; i < logins.length; i++) {
      const raw = logins[i];
      if (typeof raw !== 'string') continue;
      const login = raw.trim().toLowerCase();
      if (!login || seen[login]) continue;
      seen[login] = true;
      clean.push(login);
      if (clean.length >= 100) break;
    }
    if (clean.length === 0) return {};

    const query = clean.map(function (l) { return 'login=' + encodeURIComponent(l); }).join('&');
    const data = await twitchFetch('users?' + query);
    if (!data || !data.data) return {};

    const map = {};
    for (let i = 0; i < data.data.length; i++) {
      const u = data.data[i];
      if (u && u.login && u.profile_image_url) {
        map[u.login.toLowerCase()] = u.profile_image_url;
      }
    }
    console.log('[GATHER:TWITCH] Resolved ' + Object.keys(map).length + ' creator avatars');
    return map;
  } catch (err) {
    console.error('[GATHER:TWITCH] Avatar fetch error:', err.message);
    return {};
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

/**
 * Format Twitch clips as a COMMUNITY-ATTENTION SIGNAL for GHOST (added June 8,
 * 2026). This is NOT clip analysis: GHOST receives only clip TITLES, the
 * broadcaster name, and VIEW COUNTS - never the clip contents (no editor can
 * watch a video). The titles + view counts tell GHOST what players found
 * notable enough to clip and rewatch, which is a legitimate attention signal.
 * The prompt that consumes this (in gather/index.js) carries an explicit guard
 * forbidding GHOST from describing what happens in a clip or inventing outcomes.
 *
 * Returns null when there are no clips, so the section is simply omitted (no
 * filler that could invite fabrication).
 */
export function formatClipsForGhost(clips) {
  if (!Array.isArray(clips) || clips.length === 0) return null;

  // Sort by view_count desc so the strongest attention signal is first.
  const ranked = clips
    .slice()
    .sort(function(a, b) { return (b.view_count || 0) - (a.view_count || 0); })
    .slice(0, 8);

  const lines = ranked.map(function(c, i) {
    var views = typeof c.view_count === 'number' ? c.view_count.toLocaleString() : 'unknown';
    var who = c.broadcaster ? c.broadcaster : 'unknown streamer';
    var title = (c.title || '').trim() || '(untitled clip)';
    return (i + 1) + '. "' + title + '" — clipped from ' + who + '\'s stream — ' + views + ' views';
  }).join('\n');

  return '--- TWITCH CLIP ACTIVITY (community ATTENTION signal, last 48h) ---\n'
    + 'These are the most-viewed Marathon clips on Twitch right now, ranked by views.\n'
    + 'This is an ATTENTION signal: it tells you WHAT players found notable enough to clip\n'
    + 'and rewatch. You have ONLY the clip titles, the broadcaster, and the view counts below.\n'
    + 'You have NOT watched these clips and do not know what happens in them.\n\n'
    + lines + '\n'
    + '--- END TWITCH CLIP ACTIVITY ---';
}