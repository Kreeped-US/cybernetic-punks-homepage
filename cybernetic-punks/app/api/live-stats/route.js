// app/api/live-stats/route.js
// Aggregates live Marathon stats: Steam current/peak, Twitch viewer count
// Cached 5 minutes — called client-side from HeroBanner

import { createClient } from '@supabase/supabase-js';

export const revalidate = 300;

const MARATHON_APP_ID = 3065800;
const MARATHON_GAME_NAME = 'Marathon';

async function fetchSteamCurrent() {
  try {
    const res = await fetch(
      `https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=${MARATHON_APP_ID}`,
      { next: { revalidate: 300 } }
    );
    const json = await res.json();
    return json?.response?.player_count ?? null;
  } catch (err) {
    console.log('[live-stats] Steam current fetch failed:', err.message);
    return null;
  }
}

async function fetchSteamPeak24h() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('steam_snapshots')
      .select('player_count')
      .gte('recorded_at', since)
      .order('player_count', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return null;
    return data.player_count;
  } catch (err) {
    console.log('[live-stats] Steam peak fetch failed:', err.message);
    return null;
  }
}

async function fetchTwitchStats() {
  const clientId = process.env.TWITCH_CLIENT_ID;
  const accessToken = process.env.TWITCH_ACCESS_TOKEN;

  if (!clientId || !accessToken) {
    console.log('[live-stats] Twitch credentials not set');
    return { viewers: null, streams: null };
  }

  try {
    const gameRes = await fetch(
      `https://api.twitch.tv/helix/games?name=${encodeURIComponent(MARATHON_GAME_NAME)}`,
      {
        headers: {
          'Client-ID': clientId,
          Authorization: `Bearer ${accessToken}`,
        },
        next: { revalidate: 300 },
      }
    );
    const gameJson = await gameRes.json();
    const gameId = gameJson?.data?.[0]?.id;
    if (!gameId) return { viewers: null, streams: null };

    const streamsRes = await fetch(
      `https://api.twitch.tv/helix/streams?game_id=${gameId}&first=100`,
      {
        headers: {
          'Client-ID': clientId,
          Authorization: `Bearer ${accessToken}`,
        },
        next: { revalidate: 300 },
      }
    );
    const streamsJson = await streamsRes.json();
    const streams = streamsJson?.data || [];
    const totalViewers = streams.reduce((sum, s) => sum + (s.viewer_count || 0), 0);

    return { viewers: totalViewers, streams: streams.length };
  } catch (err) {
    console.log('[live-stats] Twitch fetch failed:', err.message);
    return { viewers: null, streams: null };
  }
}

export async function GET() {
  const [current, peak24h, twitch] = await Promise.all([
    fetchSteamCurrent(),
    fetchSteamPeak24h(),
    fetchTwitchStats(),
  ]);

  return Response.json({
    steam: { current, peak24h },
    twitch: { viewers: twitch.viewers, streams: twitch.streams },
    fetchedAt: new Date().toISOString(),
  }, {
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    },
  });
}
