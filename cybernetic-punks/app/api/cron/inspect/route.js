// app/api/cron/inspect/route.js
// DEDICATED Consumer C URL Inspection cron -- SEPARATE from the generation cron
// (/api/cron) so its chunked fire fits the DEFAULT 60s function ceiling. The
// generation cron's ~50-min inspection pull was a NO-OP (killed at 60s, wrote
// nothing); this route runs a small chunk every 15 minutes instead. vercel.json
// schedules it. Own service-key client, same fail-safe guards as the generation cron.
import { createClient } from '@supabase/supabase-js';
import { runInspectionChunk } from '@/lib/gsc/inspectionRun';
import { getGenerationGames, getGameConfig } from '@/lib/games';
import { stalenessDecision, stalenessDedupKey, DEFAULT_STALE_AFTER_DAYS } from '@/lib/staleness';
import { sendOpsAlert } from '@/lib/opsNotify';

// STALENESS WATCHDOG (2026-09-28). Runs from the DAILY inspect cron so it is INDEPENDENT of the
// generation cron: if a generation cron stops firing entirely, this still runs and alarms. For each
// generation-live game (getGenerationGames -- config-driven, so DMZ/pre-launch games are excluded) it
// checks (a) STALE: newest feed_items.created_at older than editorial.staleAfterDays, and (b)
// MISSED_RUNS: newest cron_runs.started_at older than 36h (plus no_rows_ever). At most one email per
// game per UTC day via a site_events dedup marker. Uses the route's SERVICE-ROLE client (cron_runs is
// RLS service-role-only). Fully guarded: it can never break the inspection cron.
async function runStalenessWatchdog(supabase) {
  var summary = [];
  try {
    var games = getGenerationGames();
    var nowMs = Date.now();
    for (var gi = 0; gi < games.length; gi++) {
      var g = games[gi];
      try {
        var draftRes = await supabase.from('feed_items').select('created_at')
          .eq('game_slug', g).order('created_at', { ascending: false }).limit(1);
        var runRes = await supabase.from('cron_runs').select('started_at, kind, skip_reasons')
          .eq('game_slug', g).order('started_at', { ascending: false }).limit(1);
        var draftRow = (draftRes.data || [])[0] || null;
        var runRow = (runRes.data || [])[0] || null;
        var lastDraftAtMs = draftRow ? Date.parse(draftRow.created_at) : null;
        var lastCronRunAtMs = runRow ? Date.parse(runRow.started_at) : null;
        var cfg = getGameConfig(g);
        var staleAfterDays = (cfg && cfg.editorial && cfg.editorial.staleAfterDays) || DEFAULT_STALE_AFTER_DAYS;

        var decision = stalenessDecision({ isLive: true, nowMs: nowMs, lastDraftAtMs: lastDraftAtMs, lastCronRunAtMs: lastCronRunAtMs, staleAfterDays: staleAfterDays });
        summary.push(g + ':' + (decision.alert ? decision.reasons.join('+') : 'fresh'));
        if (!decision.alert) continue;

        // One email per game per UTC day.
        var key = stalenessDedupKey(g, nowMs);
        var prior = await supabase.from('site_events').select('id')
          .eq('event_name', 'staleness_alert').eq('game_slug', g).eq('event_data->>key', key).limit(1);
        if (prior.data && prior.data.length > 0) { summary[summary.length - 1] += '(deduped)'; continue; }

        var daysTxt = decision.staleDays == null ? 'never (no drafts)' : decision.staleDays.toFixed(1) + ' days';
        var runTxt = runRow ? (runRow.started_at + ' (kind=' + runRow.kind + ', skip_reasons=' + JSON.stringify(runRow.skip_reasons || null) + ')') : 'never (no cron_runs rows)';
        var body =
          'Game: ' + g + '\n' +
          'Checks fired: ' + decision.reasons.join(', ') + '\n' +
          'Days since last draft: ' + daysTxt + ' (threshold ' + decision.thresholdDays + 'd)\n' +
          'Last cron_runs row: ' + runTxt + '\n' +
          (decision.hoursSinceRun == null ? '' : 'Hours since last run: ' + decision.hoursSinceRun.toFixed(1) + ' (threshold ' + decision.missedHours + 'h)\n') +
          '\nThis is the independent daily staleness watchdog (runs from /api/cron/inspect, so it fires even ' +
          'if the generation cron itself stopped). Legitimate-freeze suppression can hide a broken patch ' +
          'detector as a permanent quiet week -- this is the backstop for that.';
        await sendOpsAlert({ subject: '[CyberneticPunks] Staleness: ' + g + ' -- ' + decision.reasons.join(', '), body: body });
        try {
          await supabase.from('site_events').insert({ game_slug: g, event_name: 'staleness_alert',
            event_data: { key: key, reasons: decision.reasons, stale_days: decision.staleDays, hours_since_run: decision.hoursSinceRun } });
        } catch (insErr) { console.log('[staleness] dedup marker insert failed (non-fatal): ' + (insErr && insErr.message)); }
      } catch (gErr) {
        console.log('[staleness] check failed for ' + g + ' (non-fatal): ' + (gErr && gErr.message));
      }
    }
  } catch (err) {
    console.log('[staleness] watchdog error (non-fatal): ' + (err && err.message));
  }
  return summary;
}

export const dynamic = 'force-dynamic';
// DEFAULT ceiling -- the chunk (lib/gsc/inspectionRun.js) is sized to fit INSIDE 60s,
// not to raise it. Do not increase this without resizing CHUNK.
export const maxDuration = 60;

export async function GET(req) {
  // FAIL-SAFE cron auth guard, mirrored from /api/cron: inert until CRON_SECRET is set
  // (so deploying before the env var does not lock out Vercel's scheduled job), then
  // requires the Bearer header Vercel Cron sends automatically.
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.warn('[inspect] CRON_SECRET not set -- route is UNGUARDED. Set CRON_SECRET in Vercel env to arm the guard.');
  } else {
    const auth = req && req.headers ? req.headers.get('authorization') : null;
    if (auth !== 'Bearer ' + cronSecret) {
      console.warn('[inspect] Rejected request: missing/invalid Authorization Bearer.');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  // SERVICE KEY REQUIRED -- NO ANON FALLBACK. inspection_runs + gsc_url_inspection are
  // RLS-enabled with no policies, so an anon client would have its writes silently rejected.
  if (!process.env.SUPABASE_SERVICE_KEY) {
    console.error('[inspect] ABORT: SUPABASE_SERVICE_KEY is not set. Refusing to run on the anon key -- ' +
      'RLS-protected writes would be silently rejected. Set SUPABASE_SERVICE_KEY in the Vercel env.');
    return Response.json({ error: 'SUPABASE_SERVICE_KEY not configured' }, { status: 500 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  // The fire never throws into the route (fail-open), but wrap the dispatch too.
  let res = null;
  try {
    res = await runInspectionChunk(supabase);
  } catch (err) {
    console.error('[inspect] dispatch error (contained, non-fatal): ' + (err && err.message));
  }

  // Independent daily staleness watchdog (never throws into the route).
  const staleness = await runStalenessWatchdog(supabase);

  // HEARTBEAT: backlog + this fire's outcome, surfaced in the response body (Vercel shows
  // it in the cron invocation detail) -- "inspection: backlog=N" without log spelunking.
  return Response.json({
    success: true,
    timestamp: new Date().toISOString(),
    inspection: res
      ? ('backlog=' + res.backlog + ' status=' + res.status + ' attempted=' + res.attempted +
         ' written=' + res.written + ' mean_ms=' + res.meanLatencyMs +
         ' indexation_flags_open=' + res.openFlags)
      : 'dispatch-error',
    staleness: staleness,
  });
}
