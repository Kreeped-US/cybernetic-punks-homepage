// app/api/live-stats/route.js
// Aggregates live Marathon stats: Steam current/peak, Twitch viewer count
// Cached 5 minutes — called client-side from HeroBanner

export const revalidate = 300; // 5 min edge cache

const MARATHON_APP_ID = 3065800;
const MARATHON_GAME_NAME = 'Marathon'; // Twitch game name

async function fetchSteamStats() {
  try {
    // Current players
    const currentRes = await fetch(
      `https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=${MARATHON_APP_ID}`,
      { next: { revalidate: 300 } }
    );
    const currentJson = await currentRes.json();
    const current = currentJson?.response?.player_count ?? null;

    // 24h peak via SteamSpy (free, no key required)
    const spyRes = await fetch(
      `https://steamspy.com/api.php?request=appdetails&appid=${MARATHON_APP_ID}`,
      { next: { revalidate: 300 } }
    );
    const spyJson = await spyRes.json();
    const peak24h = spyJson?.ccu ?? null; // SteamSpy `ccu` = 24h peak concurrent

    return { current, peak24h };
  } catch (err) {
    console.log('[live-stats] Steam fetch failed:', err.message);
    return { current: null, peak24h: null };
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
    // Get game ID for Marathon
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

    // Get live streams for Marathon
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

    return {
      viewers: totalViewers,
      streams: streams.length,
    };
  } catch (err) {
    console.log('[live-stats] Twitch fetch failed:', err.message);
    return { viewers: null, streams: null };
  }
}

export async function GET() {
  const [steam, twitch] = await Promise.all([
    fetchSteamStats(),
    fetchTwitchStats(),
  ]);

  return Response.json({
    steam: {
      current: steam.current,
      peak24h: steam.peak24h,
    },
    twitch: {
      viewers: twitch.viewers,
      streams: twitch.streams,
    },
    fetchedAt: new Date().toISOString(),
  }, {
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    },
  });
}