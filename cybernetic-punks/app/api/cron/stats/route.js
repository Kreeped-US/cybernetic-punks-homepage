// app/api/cron/stats/route.js
// Fetches live player counts from Steam and Twitch every 15 minutes.
// Writes to the `live_stats` table. Reads are instant from DB.
//
// FIX (May 15, 2026): createClient() moved inside GET handler.
// Previously at module scope, which caused Vercel build to fail with
// "supabaseUrl is required" because Next.js 16's stricter pre-rendering
// evaluates module-scope code at build time before env vars are
// available. force-dynamic prevents Next.js from attempting static
// analysis on this route.

import { createClient } from '@supabase/supabase-js';
import { fetchSteamPlayerCount } from '@/lib/gather/steam';
import { getLiveStreamers } from '@/lib/gather/twitch';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  // FAIL-SAFE cron auth guard, mirrored from /api/cron and /api/cron/inspect: inert until
  // CRON_SECRET is set (so deploying before the env var does not lock out Vercel's scheduled
  // job), then requires the Bearer header Vercel Cron sends automatically.
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.warn('[stats] CRON_SECRET not set -- route is UNGUARDED. Set CRON_SECRET in Vercel env to arm the guard.');
  } else {
    const auth = req && req.headers ? req.headers.get('authorization') : null;
    if (auth !== 'Bearer ' + cronSecret) {
      console.warn('[stats] Rejected request: missing/invalid Authorization Bearer.');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  // SERVICE KEY REQUIRED -- NO ANON FALLBACK. live_stats is RLS-enabled with a public SELECT
  // policy (confirmed: anon can read). Writes must go through the service key regardless of
  // policy; the anon client cannot be relied on to UPSERT, so drop the fallback and fail LOUDLY,
  // matching /api/cron and /api/cron/inspect.
  if (!process.env.SUPABASE_SERVICE_KEY) {
    console.error('[stats] ABORT: SUPABASE_SERVICE_KEY is not set. Refusing to run on the anon key -- ' +
      'RLS-protected writes would be silently rejected. Set SUPABASE_SERVICE_KEY in the Vercel env.');
    return Response.json({ error: 'SUPABASE_SERVICE_KEY not configured' }, { status: 500 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  var results = { steam: null, twitch: null, errors: [] };

  // -- STEAM --
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

  // -- TWITCH --
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