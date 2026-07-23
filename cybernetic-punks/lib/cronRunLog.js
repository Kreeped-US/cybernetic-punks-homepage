// lib/cronRunLog.js
// PERSISTED PROOF-OF-LIFE for the daily generation cron: one row in `cron_runs`
// per run, ON EVERY PATH -- success, frozen, and the error path.
//
// WHY A DEDICATED TABLE, and not one of the ones we already have:
//
//  - NOT site_events. As of today site_events.game_slug is NOT NULL with NO DEFAULT
//    (the default-removal arc, 17 tables). A cron heartbeat is a NETWORK-LEVEL
//    OPERATIONAL FACT, not a fact about a game, so writing one there would force us
//    to INVENT a game attribution for a row that is not about a game. That is exactly
//    the silently-wrong-attribution hazard the multi-game audit exists to hunt -- it
//    would be building the bug into the fix.
//  - NOT the keyword heartbeat. That is a LOG LINE (keywordHeartbeat.js console.log),
//    not a persisted row, and it answers a different question.
//  - NOT keyword_match_log. That is a closed-outcome audit table for match decisions.
//
// PATTERN: follows the gsc_pull_log design (docs/gsc-integration-build-plan-v5.md:178)
// -- one row per run with counts, status, started/finished, error; RLS enabled with no
// policies (service-role only). Same discipline, same reason: without a per-run log,
// ABSENCE and ZERO are indistinguishable.
//
// WHAT THIS DOES NOT DO -- stated plainly so it is never mistaken for coverage:
// THIS DOES NOT CLOSE THE DEAD-CRON GAP. A watchdog cannot live inside the process it
// watches: a cron that never executes cannot write its own "I did not run" row. This is
// the ENABLING step -- it makes absence QUERYABLE. The external check (a digest
// asserting a cron_runs row within 26h) is a separate future task, and `cron_runs` is
// precisely the table it will query.
//
// NEVER THROWS. A heartbeat that can fail the run it measures is worse than no
// heartbeat. Every failure is caught and logged; the caller is never affected.

// row: {
//   route, kind, status, has_patch, editors_configured, editors_attempted,
//   editors_succeeded, editors_failed, alert_sent, articles_published,
//   error, started_at
// }
// game_slug is deliberately NOT set here -- see the HANDOFF entry: the column is
// NULLABLE and left for the multi-game audit to decide (one network row per run, or a
// row per game once the cron goes per-game). Do not pre-decide it by stamping a value.
export async function recordCronRun(supabase, row) {
  try {
    if (!supabase) {
      console.log('[cron_runs] no supabase client -- run NOT recorded');
      return { ok: false };
    }
    var payload = {
      route: row.route || '/api/cron',
      kind: row.kind || null,
      status: row.status || 'ok',
      has_patch: typeof row.has_patch === 'boolean' ? row.has_patch : null,
      editors_configured: num(row.editors_configured),
      editors_attempted: num(row.editors_attempted),
      editors_succeeded: num(row.editors_succeeded),
      editors_failed: num(row.editors_failed),
      alert_sent: typeof row.alert_sent === 'boolean' ? row.alert_sent : null,
      articles_published: num(row.articles_published),
      error: row.error ? String(row.error).slice(0, 500) : null,
      started_at: row.started_at || new Date().toISOString(),
      finished_at: new Date().toISOString(),
    };

    var res = await supabase.from('cron_runs').insert(payload);
    if (res && res.error) {
      // Loud, but non-fatal. If the table is missing (DDL not yet run) this is the
      // line that says so, rather than the run silently going unrecorded.
      console.log('[cron_runs] insert failed (non-fatal): ' + res.error.message);
      return { ok: false };
    }
    console.log('[cron_runs] recorded kind=' + payload.kind +
      ' status=' + payload.status +
      ' has_patch=' + payload.has_patch +
      ' attempted=' + payload.editors_attempted +
      ' succeeded=' + payload.editors_succeeded +
      ' alert_sent=' + payload.alert_sent);
    return { ok: true };
  } catch (err) {
    console.log('[cron_runs] recordCronRun error (non-fatal): ' + (err && err.message));
    return { ok: false };
  }
}

function num(v) {
  return typeof v === 'number' && isFinite(v) ? v : null;
}
