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
import { loadKnownSlugs, buildMetricRows, upsertPageMetrics, buildQueryMetricRows, upsertQueryMetrics, writePullLog, buildInspectionRow, appendUrlInspection } from './storage.js';
import { inspectUrl, authorizeToken } from './urlInspection.js';
import { dmzSectionForArticle } from '../games/dmz.js';

const DAILY_WINDOW_DAYS = 5;        // trailing ~5 days -- the daily catch-up window
const RECONCILE_WINDOW_DAYS = 35;   // ~35-day monthly reconciliation
const RECONCILE_EVERY_DAYS = 30;    // run a reconciliation if the last one is older than this
const STALL_TOLERANCE_DAYS = 4;     // newest_date_returned this far behind window_end = stall

// ── URL INSPECTION (Consumer C, 5c-loop) constants ───────────────────────────
// Per-run cap: how many URLs one cron tick inspects. Well under the ~2000/day URL
// Inspection quota at ~745 pages, so the corpus cycles over a few days with headroom;
// the remainder each run is deferred and logged (skipped_for_quota -- no silent cap).
const INSPECTION_PER_RUN_CAP = 500;
// How many recent published rows to scan for the action-driven tier (a).
const INSPECTION_ACTION_SCAN = 1000;
const INSPECTION_BASE_URL = 'https://cyberneticpunks.com';
// DEFINITIVE signals only (exact coverageState from the API, confirmed by the 5a spike).
// A cohort URL is dropped from watching ONLY on a definite GONE signal; an action-driven
// URL ONLY on a definite INDEXED signal -- never on the mere absence of PASS or a
// transient error (append-per-inspection lets us keep watching cheaply).
const INSPECTION_INDEXED_COVERAGE = 'Submitted and indexed';
const INSPECTION_GONE_COVERAGE = new Set([
  'URL is unknown to Google',
  'Crawled - currently not indexed',
  "Excluded by 'noindex' tag",
]);

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

// ── URL INSPECTION PULL (Consumer C, 5c-loop) ────────────────────────────────
// A feed_items row -> its absolute public URL. Marathon articles live at /intel/<slug>;
// DMZ articles at /dmz/<section>/<slug> where section = dmzSectionForArticle (the
// DMZ_ARTICLE_SECTION map or the 'discourse' tag). A DMZ row with no resolvable section,
// or an unknown game, returns null -> the caller SKIPS it (cannot build a URL, never
// guesses one). gameSlugForUrl re-derives the game from the path at row-build time.
function feedItemInspectionUrl(row) {
  if (!row || !row.slug) return null;
  if (row.game_slug === 'marathon') return INSPECTION_BASE_URL + '/intel/' + row.slug;
  if (row.game_slug === 'dmz') {
    const section = dmzSectionForArticle(row);
    return section ? INSPECTION_BASE_URL + '/dmz/' + section + '/' + row.slug : null;
  }
  return null;
}

// Mirrors the A/B pulls' fail-open contract and single writePullLog row, but is NOT
// date-windowed -- no reconciliationDue, no checkStall. Cadence is per-run cap + resume:
// each tick inspects up to INSPECTION_PER_RUN_CAP URLs and defers the rest to next run.
//
// SELECTION (priority order): (b) DE-INDEX COHORT first -- the decaying prune-verification
// signal, inspected before quota can run out -- then (a) ACTION-DRIVEN. (c) the rolling
// sweep is DEFERRED (Path 1): it slots in at the one marked point once a reusable
// getIndexableUrls() is extracted from the sitemap (a separate gated refactor).
//
// NOTHING here enters a prompt; it feeds the index-state record, not the editor.
export async function runUrlInspectionPull(supabase) {
  const startedAt = new Date().toISOString();
  try {
    // CROSS-REF: latest inspection per url, reduced in JS from the whole append table.
    // KNOWN SCALING POINT: a latest-per-url VIEW is the intended future optimization;
    // fine now (the table is near-empty and grows ~one row per inspection). A failed read
    // is non-fatal -- an empty map just means we may RE-inspect (safe, never wrong data).
    const latestByUrl = new Map();
    {
      const { data, error } = await supabase
        .from('gsc_url_inspection')
        .select('url, coverage_state, inspected_at')
        .order('inspected_at', { ascending: false });
      if (error) console.error('[gsc] inspection cross-ref read failed (continuing, may re-inspect): ' + error.message);
      else (data || []).forEach(function (r) { if (r.url && !latestByUrl.has(r.url)) latestByUrl.set(r.url, r); });
    }
    function isConfirmedIndexed(url) {
      const r = latestByUrl.get(url);
      return !!(r && r.coverage_state === INSPECTION_INDEXED_COVERAGE);
    }
    function isConfirmedGone(url) {
      const r = latestByUrl.get(url);
      return !!(r && INSPECTION_GONE_COVERAGE.has(r.coverage_state));
    }

    const candidates = [];
    const seen = new Set(); // dedupe: a URL in cohort (b) is not also swept by (a)

    // (b) DE-INDEX COHORT -- inspect until CONFIRMED gone (definitive coverageState only).
    {
      const { data, error } = await supabase
        .from('feed_items')
        .select('slug, game_slug, tags, noindexed_at')
        .not('noindexed_at', 'is', null);
      if (error) console.error('[gsc] inspection cohort read failed (continuing): ' + error.message);
      (data || []).forEach(function (row) {
        const url = feedItemInspectionUrl(row);
        if (!url || seen.has(url) || isConfirmedGone(url)) return;
        seen.add(url); candidates.push(url);
      });
    }

    // (a) ACTION-DRIVEN -- published & indexable, not yet confirmed indexed.
    // created_at is a publish-time PROXY (there is NO published_at column) -> COARSE
    // recency only. The real gate is "not-yet-confirmed-indexed", not the timestamp; the
    // created_at order just scans the freshest rows first within the scan limit.
    {
      const { data, error } = await supabase
        .from('feed_items')
        .select('slug, game_slug, tags, created_at')
        .eq('is_published', true)
        .eq('noindex', false)
        .is('noindexed_at', null)
        .order('created_at', { ascending: false })
        .limit(INSPECTION_ACTION_SCAN);
      if (error) console.error('[gsc] inspection action-driven read failed (continuing): ' + error.message);
      (data || []).forEach(function (row) {
        const url = feedItemInspectionUrl(row);
        if (!url || seen.has(url) || isConfirmedIndexed(url)) return;
        seen.add(url); candidates.push(url);
      });
    }

    // (c) ROLLING SWEEP -- DEFERRED (Path 1). A third source pushes least-recently-
    // inspected corpus URLs HERE, after a reusable getIndexableUrls() is extracted from
    // sitemap.js. Built so this is the only insertion point.

    // AUTHORIZE ONCE per pull and thread the token into every inspectUrl call, so a run
    // auths once instead of per URL (the fix for the per-call re-auth that made the first
    // run ~54 min). One access token lives ~1hr, covering a full run; no mid-run refresh.
    // A failed up-front auth means there is no point looping -- write the fail-open error
    // row and return, same contract as the rest of the function.
    const auth = await authorizeToken();
    if (!auth.ok) {
      await writePullLog(supabase, {
        consumer: 'inspection', windowStart: null, windowEnd: null, rowsFetched: 0,
        newestDateReturned: null, dataState: null, status: 'error',
        error: 'auth: ' + auth.error, startedAt: startedAt,
      });
      console.error('[gsc] inspection pull ABORTED (auth failed): ' + auth.error);
      return { ok: false, reason: 'auth', inspected: 0, written: 0 };
    }
    const token = auth.token;

    // INSPECT up to the per-run cap; stop cleanly on the cap OR a quotaExhausted return.
    const rows = [];
    let inspected = 0;
    let droppedUnknownGame = 0;
    let quotaHit = false;
    let i = 0;
    for (; i < candidates.length; i++) {
      if (inspected >= INSPECTION_PER_RUN_CAP) break;        // cap -> remainder deferred
      const out = await inspectUrl(candidates[i], token);
      if (out.quotaExhausted) { quotaHit = true; break; }    // quota -> stop, remainder deferred
      if (!out.ok) {                                          // other error -> skip this URL, continue
        console.error('[gsc] inspect skipped ' + candidates[i] + ': ' + String(out.error).split('\n')[0]);
        continue;
      }
      const built = buildInspectionRow(out.result, candidates[i]);
      droppedUnknownGame += built.droppedUnknownGame;
      if (built.row) rows.push(built.row);
      inspected += 1;
    }
    // SELECTED-BUT-NOT-REACHED = the cap/quota truncation remainder (candidates from the
    // break point on); 0 when the loop completed. Logged so a silent cap is impossible.
    // other-error skips are NOT counted here -- those were attempted (and logged), not
    // truncated.
    const skippedForQuota = candidates.length - i;

    const up = rows.length > 0 ? await appendUrlInspection(supabase, rows) : { ok: true, written: 0 };
    const status = up.ok ? 'ok' : 'error';

    // ONE pull_log row -- absence vs zero, same as A/B. window_*/newest/data_state stay
    // null (inspection is not date-windowed); consumer tags it, and the three counts
    // (inspected via rows_fetched, dropped, skipped) make truncation loud.
    await writePullLog(supabase, {
      consumer: 'inspection',
      windowStart: null, windowEnd: null, rowsFetched: inspected,
      newestDateReturned: null, dataState: null,
      status: status, error: up.ok ? null : ('append: ' + up.error),
      droppedUnknownGame: droppedUnknownGame,
      skippedForQuota: skippedForQuota,
      startedAt: startedAt,
    });

    console.log('[gsc] inspection pull ' + status + ': candidates=' + candidates.length +
      ' inspected=' + inspected + ' written=' + up.written + ' dropped=' + droppedUnknownGame +
      ' skipped=' + skippedForQuota + (quotaHit ? ' [QUOTA]' : '') +
      (inspected >= INSPECTION_PER_RUN_CAP ? ' [CAP]' : ''));

    return {
      ok: up.ok, inspected: inspected, written: up.written,
      droppedUnknownGame: droppedUnknownGame, skippedForQuota: skippedForQuota,
      quotaExhausted: quotaHit, candidates: candidates.length,
    };
  } catch (err) {
    // Last-resort net: NEVER throw into the cron. Record what we can.
    try {
      await writePullLog(supabase, {
        consumer: 'inspection', windowStart: null, windowEnd: null, rowsFetched: 0,
        newestDateReturned: null, dataState: null, status: 'error',
        error: 'unexpected: ' + (err && err.message), startedAt: startedAt,
      });
    } catch (e2) { /* even the log failed */ }
    console.error('[gsc] inspection pull threw (contained, generation unaffected): ' + (err && err.message));
    return { ok: false, reason: 'threw', inspected: 0, written: 0 };
  }
}
