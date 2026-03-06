// app/api/bungie-stats/route.js
// Marathon player stats API — STUB
// Ready to connect when Bungie opens the Marathon API
// Currently returns placeholder structure showing expected data format

export async function GET(request) {
  var { searchParams } = new URL(request.url);
  var query = searchParams.get('q');
  var platform = searchParams.get('platform') || 'all';

  if (!query) {
    return Response.json({
      error: 'Missing search query. Use ?q=BungieName or ?q=SteamID',
      status: 'API_NOT_LIVE',
      message: 'Marathon API is not yet available. This endpoint will activate when Bungie releases the Marathon API.',
    }, { status: 400 });
  }

  // When Bungie API is live, replace this with actual API calls:
  // 1. Search player: GET /Platform/Destiny2/SearchDestinyPlayer/{platform}/{query}
  //    (Marathon will likely have similar: /Platform/Marathon/SearchPlayer/)
  // 2. Get profile: GET /Platform/Marathon/{membershipType}/Profile/{membershipId}/
  // 3. Get stats: GET /Platform/Marathon/{membershipType}/Account/{membershipId}/Stats/
  // 4. Get activity history: GET /Platform/Marathon/{membershipType}/Account/{membershipId}/Activities/
  //
  // Required header: X-API-Key from process.env.BUNGIE_API_KEY
  // OAuth needed for private data (inventory, loadouts)

  return Response.json({
    status: 'API_NOT_LIVE',
    message: 'Marathon stats API will activate when Bungie releases the Marathon API.',
    query: query,
    platform: platform,
    expected_response_format: {
      player: {
        bungie_name: 'PlayerName#1234',
        membership_id: '4611686018xxxxx',
        platform: 'steam',
        season_level: 0,
        current_rank: null,
        peak_rank: null,
      },
      stats: {
        total_runs: 0,
        successful_extractions: 0,
        extraction_rate: 0,
        total_kills_pvp: 0,
        total_kills_pve: 0,
        total_deaths: 0,
        kd_ratio: 0,
        headshot_percentage: 0,
        total_loot_value: 0,
        average_loot_per_run: 0,
        time_played_hours: 0,
        finishers: 0,
        assists: 0,
      },
      shell_stats: {
        most_used: null,
        time_per_shell: {},
        win_rate_per_shell: {},
      },
      weapon_stats: {
        top_weapon: null,
        kills_per_category: {},
        accuracy_per_weapon: {},
      },
      ranked: {
        current_rank: null,
        peak_rank_season: null,
        ranked_extraction_rate: 0,
        holotag_average: 0,
        ranked_wins: 0,
      },
      season_history: [],
    },
  });
}
