// lib/gsc/dailyPull.js
// GSC page-level phase (4): the daily pull, wired into /api/cron.
//
// ORCHESTRATION ONLY -- it composes the PROVEN storage path (loadKnownSlugs ->
// fetchSearchAnalytics -> buildMetricRows -> upsertPageMetrics -> writePullLog) that
// scripts/gsc-pull.mjs validated (auth, pagination by row-set equality, content-level
// idempotence). There is NO separate storage logic here; a divergent second write path is
// exactly what this reuse avoids.
//
// FAIL-OPEN, HARD REQUIREMENT. This runs inside the generation cron. A GSC failure --
// auth, network, quota, 403, malformed response -- must NEVER break generation. Every
// path returns { ok, ... } and NEVER throws; the cron also wraps the call, so the failure
// is contained twice. On failure it still writes a gsc_pull_log row with status='error',
// so absence stays distinguishable from zero.

import { fetchSearchAnalytics, daysAgo, FINAL_DATA_LAG_DAYS } from './searchAnalytics.js';
import { loadKnownSlugs, buildMetricRows, upsertPageMetrics, buildQueryMetricRows, upsertQueryMetrics, writePullLog } from './storage.js';

const DAILY_WINDOW_DAYS = 5;        // trailing ~5 days -- the daily catch-up window
const RECONCILE_WINDOW_DAYS = 35;   // ~35-day monthly reconciliation
const RECONCILE_EVERY_DAYS = 30;    // run a reconciliation if the last one is older than this
const STALL_TOLERANCE_DAYS = 4;     // newest_date_returned this far behind window_end = stall

function daysBetween(aIso, bIso) {
  // whole days between two YYYY-MM-DD strings (b - a)
  return Math.round((Date.parse(bIso) - Date.parse(aIso)) / 86400000);
}

// MONTHLY RECONCILIATION by DATA, not by calendar day. A day-of-month check silently
// skips a whole month if the cron happens to miss that one day. Instead: look at
// gsc_pull_log for the most recent RECONCILIATION (a row whose window span is wide), and
// run one if none has happened in RECONCILE_EVERY_DAYS. This self-heals a missed day.
async function reconciliationDue(supabase, consumer) {
  try {
    const { data, error } = await supabase
      .from('gsc_pull_log')
      .select('window_start, window_end, started_at, status, consumer')
      .eq('status', 'ok')
      .eq('consumer', consumer) // per-consumer cadence: page and query reconcile independently
      .order('started_at', { ascending: false })
      .limit(120);
    if (error) {
      console.log('[gsc] reconciliation check failed, defaulting to DAILY: ' + error.message);
      return false; // fail toward the cheap path; a daily still self-heals via overlap
    }
    const rows = data || [];
    const cutoffMs = Date.now() - RECONCILE_EVERY_DAYS * 86400000;
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r.window_start || !r.window_end) continue;
      const span = daysBetween(r.window_start, r.window_end);
      if (span >= RECONCILE_WINDOW_DAYS - 5) {
        // a reconciliation-shaped pull exists; due only if it is older than the cadence
        return Date.parse(r.started_at) < cutoffMs;
      }
    }
    return true; // no reconciliation on record -> one is due
  } catch (e) {
    console.log('[gsc] reconciliation check threw, defaulting to DAILY: ' + (e && e.message));
    return false;
  }
}

// STALL DETECTOR. The known failure is the pipeline stalling (Google stops returning
// recent data / our requests hit stale), NOT slow revision. newest_date_returned should
// track window_end within the normal final-data lag; more than STALL_TOLERANCE_DAYS behind
// is a stall, said out loud on the run that noticed.
function checkStall(newestDateReturned, windowEnd) {
  if (!newestDateReturned) {
    console.error('[gsc][STALL] no newest_date_returned -- the pull returned no dated rows for ' +
      windowEnd + '. Pipeline may be stalled (distinct from an empty final-data tail).');
    return true;
  }
  const behind = daysBetween(newestDateReturned, windowEnd);
  if (behind > STALL_TOLERANCE_DAYS) {
    console.error('[gsc][STALL] newest_date_returned ' + newestDateReturned +
      ' is ' + behind + ' days behind window_end ' + windowEnd +
      ' (tolerance ' + STALL_TOLERANCE_DAYS + '). Pipeline likely stalled, not slow revision.');
    return true;
  }
  return false;
}

// Runs ONE pull (daily or, when due, the wider reconciliation) and writes exactly one
// gsc_pull_log row. Never throws. Returns a summary the cron can log/surface.
export async function runDailyGscPull(supabase) {
  const startedAt = new Date().toISOString();
  const endDate = daysAgo(FINAL_DATA_LAG_DAYS);
  let windowDays = DAILY_WINDOW_DAYS;
  let isReconciliation = false;

  try {
    if (await reconciliationDue(supabase, 'page')) {
      windowDays = RECONCILE_WINDOW_DAYS;
      isReconciliation = true;
    }
    const startDate = daysAgo(FINAL_DATA_LAG_DAYS + windowDays);

    const slugRes = await loadKnownSlugs(supabase);
    if (!slugRes.ok) {
      await writePullLog(supabase, {
        consumer: 'page', windowStart: startDate, windowEnd: endDate, rowsFetched: 0,
        newestDateReturned: null, dataState: 'final', status: 'error',
        error: 'loadKnownSlugs: ' + slugRes.error, startedAt,
      });
      console.error('[gsc] daily pull ABORTED (slug load failed): ' + slugRes.error);
      return { ok: false, reason: 'slug-load', rowsWritten: 0, isReconciliation };
    }

    const res = await fetchSearchAnalytics({
      startDate, endDate, dataState: 'final',
      dimensions: ['date', 'page'], rowLimit: 25000,
    });

    if (!res.ok) {
      await writePullLog(supabase, {
        consumer: 'page', windowStart: startDate, windowEnd: endDate, rowsFetched: 0,
        newestDateReturned: null, dataState: 'final', status: 'error',
        error: res.error, startedAt,
      });
      console.error('[gsc] daily pull FAILED (fetch): ' + res.error);
      return { ok: false, reason: 'fetch', rowsWritten: 0, isReconciliation };
    }

    const built = buildMetricRows(res.rows, slugRes.slugs, 'final');
    const up = await upsertPageMetrics(supabase, built.rows);

    // One pull_log row, regardless of upsert outcome -- absence vs zero. The C4 drop
    // count is persisted here so a silent drop cannot hide (step-3 follow-up).
    await writePullLog(supabase, {
      consumer: 'page', windowStart: startDate, windowEnd: endDate,
      rowsFetched: res.rowCount, newestDateReturned: res.newestDateReturned,
      dataState: 'final', status: up.ok ? 'ok' : 'error',
      error: up.ok ? null : ('upsert: ' + up.error),
      droppedUnknownGame: built.droppedUnknownGame, startedAt,
    });

    const stalled = checkStall(res.newestDateReturned, endDate);

    if (!up.ok) {
      console.error('[gsc] daily pull FAILED (upsert): ' + up.error);
      return { ok: false, reason: 'upsert', rowsWritten: up.written, isReconciliation, stalled };
    }

    console.log('[gsc] daily pull ok: ' + (isReconciliation ? 'RECONCILIATION ' : '') +
      startDate + '..' + endDate + '  fetched=' + res.rowCount + ' written=' + up.written +
      ' dropped=' + built.droppedUnknownGame + ' newest=' + res.newestDateReturned +
      ' requests=' + res.pagesFetched);
    return {
      ok: true, isReconciliation, rowsFetched: res.rowCount, rowsWritten: up.written,
      droppedUnknownGame: built.droppedUnknownGame,
      newestDateReturned: res.newestDateReturned, windowStart: startDate, windowEnd: endDate,
      stalled,
    };
  } catch (err) {
    // Last-resort net: NEVER let this throw into the cron. Record what we can.
    try {
      await writePullLog(supabase, {
        consumer: 'page', windowStart: daysAgo(FINAL_DATA_LAG_DAYS + windowDays), windowEnd: endDate,
        rowsFetched: 0, newestDateReturned: null, dataState: 'final',
        status: 'error', error: 'unexpected: ' + (err && err.message), startedAt,
      });
    } catch (e2) { /* even the log failed; the console line below is the last word */ }
    console.error('[gsc] daily pull threw (contained, generation unaffected): ' + (err && err.message));
    return { ok: false, reason: 'threw', rowsWritten: 0, isReconciliation };
  }
}

// ── QUERY-LEVEL PULL (Consumer B, v8 step 4) ─────────────────────────────────
// Mirrors runDailyGscPull with the page+query dimension pair. Same trailing window and
// dataState, upsert arbitered on (date, page_url, query). Writes gsc_query_metrics and one
// gsc_pull_log row tagged consumer='query'. Never throws. NOTHING here enters a prompt --
// this feeds the review surface, not the editor (the lens-not-gate boundary).
export async function runQueryGscPull(supabase) {
  const startedAt = new Date().toISOString();
  const endDate = daysAgo(FINAL_DATA_LAG_DAYS);
  let windowDays = DAILY_WINDOW_DAYS;
  let isReconciliation = false;

  try {
    if (await reconciliationDue(supabase, 'query')) {
      windowDays = RECONCILE_WINDOW_DAYS;
      isReconciliation = true;
    }
    const startDate = daysAgo(FINAL_DATA_LAG_DAYS + windowDays);

    const res = await fetchSearchAnalytics({
      startDate, endDate, dataState: 'final',
      dimensions: ['date', 'page', 'query'], rowLimit: 25000,
    });

    if (!res.ok) {
      await writePullLog(supabase, {
        consumer: 'query', windowStart: startDate, windowEnd: endDate, rowsFetched: 0,
        newestDateReturned: null, dataState: 'final', status: 'error',
        error: res.error, startedAt,
      });
      console.error('[gsc] query pull FAILED (fetch): ' + res.error);
      return { ok: false, reason: 'fetch', rowsWritten: 0, isReconciliation };
    }

    const built = buildQueryMetricRows(res.rows);
    const up = await upsertQueryMetrics(supabase, built.rows);

    await writePullLog(supabase, {
      consumer: 'query', windowStart: startDate, windowEnd: endDate,
      rowsFetched: res.rowCount, newestDateReturned: res.newestDateReturned,
      dataState: 'final', status: up.ok ? 'ok' : 'error',
      error: up.ok ? null : ('upsert: ' + up.error),
      droppedUnknownGame: built.droppedUnknownGame, startedAt,
    });

    const stalled = checkStall(res.newestDateReturned, endDate);

    if (!up.ok) {
      console.error('[gsc] query pull FAILED (upsert): ' + up.error);
      return { ok: false, reason: 'upsert', rowsWritten: up.written, isReconciliation, stalled };
    }

    console.log('[gsc] query pull ok: ' + (isReconciliation ? 'RECONCILIATION ' : '') +
      startDate + '..' + endDate + '  fetched=' + res.rowCount + ' written=' + up.written +
      ' dropped=' + built.droppedUnknownGame + ' newest=' + res.newestDateReturned +
      ' requests=' + res.pagesFetched);
    return {
      ok: true, isReconciliation, rowsFetched: res.rowCount, rowsWritten: up.written,
      droppedUnknownGame: built.droppedUnknownGame,
      newestDateReturned: res.newestDateReturned, windowStart: startDate, windowEnd: endDate,
      stalled,
    };
  } catch (err) {
    try {
      await writePullLog(supabase, {
        consumer: 'query', windowStart: daysAgo(FINAL_DATA_LAG_DAYS + windowDays), windowEnd: endDate,
        rowsFetched: 0, newestDateReturned: null, dataState: 'final',
        status: 'error', error: 'unexpected: ' + (err && err.message), startedAt,
      });
    } catch (e2) { /* even the log failed */ }
    console.error('[gsc] query pull threw (contained, generation unaffected): ' + (err && err.message));
    return { ok: false, reason: 'threw', rowsWritten: 0, isReconciliation };
  }
}
