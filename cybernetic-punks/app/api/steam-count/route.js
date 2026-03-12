// app/api/steam-count/route.js
// Returns live Marathon concurrent player count from Steam's public API.
// Cached by Next.js for 5 minutes — no API key required.

const MARATHON_APP_ID = 3065800;
const STEAM_URL = `https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=${MARATHON_APP_ID}`;

export const revalidate = 300; // 5-minute edge cache

export async function GET() {
  try {
    const res = await fetch(STEAM_URL, {
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      return Response.json({ count: null, error: 'Steam API unavailable' }, { status: 502 });
    }

    const json = await res.json();

    // Steam returns: { response: { player_count: number, result: 1 } }
    const count = json?.response?.player_count ?? null;

    if (count === null) {
      return Response.json({ count: null, error: 'Unexpected Steam response' }, { status: 502 });
    }

    return Response.json({ count }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
      },
    });
  } catch (err) {
    console.error('[steam-count] fetch error:', err.message);
    return Response.json({ count: null, error: 'Failed to reach Steam API' }, { status: 500 });
  }
}