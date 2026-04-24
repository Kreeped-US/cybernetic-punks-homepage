// app/api/cron/stats/route.js
// Fetches live player counts from Steam and Twitch every 15 minutes.
// Writes to the `live_stats` table. Reads are instant from DB.

import { createClient } from '@supabase/supabase-js';
import { fetchSteamPlayerCount } from '@/lib/gather/steam';
import { getLiveStreamers } from '@/lib/gather/twitch';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function GET() {
  var results = { steam: null, twitch: null, errors: [] };

  // ── STEAM ──────────────────────────────────────────────
  try {
    var playerCount = await fetchSteamPlayerCount();
    if (typeof playerCount === 'number' && playerCount > 0) {
      var { error: steamError } = await supabase
        .from('live_stats')
        .upsert(
          {
            source: 'steam',
            value: playerCount,
            metadata: {},
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'source' }
        );

      if (steamError) {
        results.errors.push('steam: ' + steamError.message);
      } else {
        results.steam = playerCount;
        console.log('[CRON:STATS] Steam: ' + playerCount.toLocaleString() + ' players');
      }
    } else {
      results.errors.push('steam: no player count returned');
    }
  } catch (err) {
    results.errors.push('steam: ' + err.message);
  }

  // ── TWITCH ─────────────────────────────────────────────
  try {
    var streamers = await getLiveStreamers();
    if (Array.isArray(streamers)) {
      var totalViewers = streamers.reduce(function(sum, s) {
        return sum + (s.viewer_count || 0);
      }, 0);
      var streamCount = streamers.length;

      var { error: twitchError } = await supabase
        .from('live_stats')
        .upsert(
          {
            source: 'twitch',
            value: totalViewers,
            metadata: { stream_count: streamCount },
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'source' }
        );

      if (twitchError) {
        results.errors.push('twitch: ' + twitchError.message);
      } else {
        results.twitch = { viewers: totalViewers, streams: streamCount };
        console.log('[CRON:STATS] Twitch: ' + totalViewers.toLocaleString() + ' viewers across ' + streamCount + ' streams');
      }
    } else {
      results.errors.push('twitch: no streamer data returned');
    }
  } catch (err) {
    results.errors.push('twitch: ' + err.message);
  }

  return Response.json({
    success: results.errors.length === 0,
    timestamp: new Date().toISOString(),
    ...results,
  });
}
