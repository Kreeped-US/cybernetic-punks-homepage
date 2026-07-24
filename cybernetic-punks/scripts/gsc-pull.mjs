// scripts/gsc-pull.mjs
// ============================================================
// GSC CONSUMER A -- FETCH + STORE. MANUAL (phase 4 wires the cron).
// ============================================================
// Fetches page-level search analytics and upserts them into gsc_page_metrics, writing one
// gsc_pull_log row per run. The SAME command serves both phase-(3) jobs -- the small
// trailing window and the one-shot historical backfill -- differing only in dates. There
// is deliberately no separate backfill storage path.
//
// RUN:  node scripts/gsc-pull.mjs                        (default: 7d ending 3d back)
//       node scripts/gsc-pull.mjs --days 30
//       node scripts/gsc-pull.mjs --start 2026-02-01 --end 2026-07-20
//       node scripts/gsc-pull.mjs --chunk-months 1       (split a long window into
//                                                         monthly requests; the WINDOW is
//                                                         chunked, the write path is not)
//       node scripts/gsc-pull.mjs --dry-run              (fetch + map, write NOTHING)
//
// Needs GSC_CLIENT_EMAIL, GSC_PRIVATE_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_KEY
// (auto-loaded from .env.local). Credentials are never printed.

import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { fetchSearchAnalytics, daysAgo, FINAL_DATA_LAG_DAYS, GSC_SITE_URL } from '../lib/gsc/searchAnalytics.js';
import { loadKnownSlugs, buildMetricRows, upsertPageMetrics, buildQueryMetricRows, upsertQueryMetrics, writePullLog } from '../lib/gsc/storage.js';

function loadEnvLocal() {
  var raw;
  try { raw = readFileSync(new URL('../.env.local', import.meta.url), 'utf8'); } catch (e) { return; }
  raw.split('\n').forEach(function (line) {
    line = line.trim(); if (!line || line.charAt(0) === '#') return;
    var eq = line.indexOf('='); if (eq === -1) return;
    var k = line.slice(0, eq).trim();
    var v = line.slice(eq + 1).trim();
    if (v.length >= 2) {
      var first = v.charAt(0);
      var last = v.charAt(v.length - 1);
      if ((first === '"' || first === "'") && first === last) v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  });
}
loadEnvLocal();

function arg(name, fallback) {
  var i = process.argv.indexOf('--' + name);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}
function flag(name) { return process.argv.indexOf('--' + name) !== -1; }

var DRY = flag('dry-run');
var QUERY = flag('query'); // page+query pull into gsc_query_metrics (default: page into gsc_page_metrics)
var dataState = arg('data-state', 'final');
var days = parseInt(arg('days', '7'), 10);
var endDate = arg('end', daysAgo(FINAL_DATA_LAG_DAYS));
var startDate = arg('start', daysAgo(FINAL_DATA_LAG_DAYS + days));
var chunkMonths = parseInt(arg('chunk-months', '0'), 10);

if (!process.env.GSC_CLIENT_EMAIL || !process.env.GSC_PRIVATE_KEY) {
  console.error('FATAL: GSC_CLIENT_EMAIL and GSC_PRIVATE_KEY must be set.');
  process.exit(1);
}
if (!process.env.SUPABASE_SERVICE_KEY) {
  console.error('FATAL: SUPABASE_SERVICE_KEY must be set (service role required -- RLS is on with no policies).');
  process.exit(1);
}

var supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
var startedAt = new Date().toISOString();

// ── GSC RETENTION CLAMP (rolling, not fixed) ─────────────────────────────────
// Search Analytics retains ~16 months. The build plan names a FIXED backfill start of
// 2026-02-01, which is correct TODAY and silently becomes wrong later: once that date
// falls outside the retention window GSC simply returns nothing for the early part, and
// the backfill UNDER-DELIVERS without failing. A short window and a quiet period look
// identical in the data -- the same absence-vs-zero ambiguity gsc_pull_log exists to
// resolve, one level up.
//
// So clamp to a 15-month rolling floor (one month inside the ~16-month limit) and SAY SO
// when clamping. Reporting is the point: a silently shortened window is the failure mode.
var RETENTION_MONTHS = 15;
function retentionFloor() {
  var d = new Date();
  d.setUTCMonth(d.getUTCMonth() - RETENTION_MONTHS);
  return d.toISOString().slice(0, 10);
}
var floorDate = retentionFloor();
var clampedFrom = null;
if (startDate < floorDate) {
  clampedFrom = startDate;
  startDate = floorDate;
}

// Split [start,end] into month-sized windows when asked. This chunks the WINDOW only --
// every chunk flows through the same fetch and the same write path.
function windows(start, end, months) {
  if (!months || months < 1) return [{ start: start, end: end }];
  var out = [];
  var cur = new Date(start + 'T00:00:00Z');
  var stop = new Date(end + 'T00:00:00Z');
  while (cur <= stop) {
    var next = new Date(cur);
    next.setUTCMonth(next.getUTCMonth() + months);
    next.setUTCDate(next.getUTCDate() - 1);
    if (next > stop) next = stop;
    out.push({ start: cur.toISOString().slice(0, 10), end: next.toISOString().slice(0, 10) });
    var after = new Date(next);
    after.setUTCDate(after.getUTCDate() + 1);
    cur = after;
  }
  return out;
}

var wins = windows(startDate, endDate, chunkMonths);

console.log('=== GSC PULL ' + (DRY ? '(DRY RUN -- NO WRITES)' : '(WRITES ENABLED)') + ' ===');
console.log('siteUrl:    ' + GSC_SITE_URL);
console.log('window:     ' + startDate + ' .. ' + endDate);
if (clampedFrom) {
  console.log('  *** CLAMPED: requested start ' + clampedFrom + ' is outside GSC\'s ~' +
    RETENTION_MONTHS + '-month retention; using ' + startDate + ' instead.');
  console.log('  *** Data before ' + startDate + ' is NO LONGER AVAILABLE from the API.');
}
console.log('dataState:  ' + dataState);
console.log('chunks:     ' + wins.length + (chunkMonths ? ' (' + chunkMonths + '-month each)' : ' (single window)'));
console.log('');

// QUERY mode (--query) pulls the page+query dimension pair into gsc_query_metrics via the
// same proven write path; PAGE mode (default) pulls date+page into gsc_page_metrics. The
// query builder needs no feed_items slug set, so only load it in page mode.
var slugRes = { ok: true, slugs: new Set() };
if (!QUERY) {
  slugRes = await loadKnownSlugs(supabase);
  if (!slugRes.ok) {
    console.error('FATAL: could not load feed_items slugs: ' + slugRes.error);
    process.exit(1);
  }
  console.log('known feed_items slugs loaded: ' + slugRes.slugs.size);
}
console.log('mode:       ' + (QUERY ? 'QUERY (date+page+query -> gsc_query_metrics)' : 'PAGE (date+page -> gsc_page_metrics)'));
console.log('');

var totalFetched = 0, totalWritten = 0, totalRequests = 0, totalDropped = 0;
var newestOverall = null, oldestOverall = null;
var failure = null;

for (var w = 0; w < wins.length; w++) {
  var win = wins[w];
  var res = await fetchSearchAnalytics({
    startDate: win.start,
    endDate: win.end,
    dataState: dataState,
    dimensions: QUERY ? ['date', 'page', 'query'] : ['date', 'page'],
    rowLimit: 25000,
  });

  if (!res.ok) {
    failure = res.error;
    console.error('FETCH FAILED for ' + win.start + '..' + win.end + ': ' + res.error);
    break;
  }

  totalFetched += res.rowCount;
  totalRequests += res.pagesFetched;
  if (res.newestDateReturned && (!newestOverall || res.newestDateReturned > newestOverall)) newestOverall = res.newestDateReturned;
  if (res.oldestDateReturned && (!oldestOverall || res.oldestDateReturned < oldestOverall)) oldestOverall = res.oldestDateReturned;

  var built = QUERY ? buildQueryMetricRows(res.rows) : buildMetricRows(res.rows, slugRes.slugs, dataState);
  var mapped = built.rows;
  totalDropped += built.droppedUnknownGame;

  var line = '  ' + win.start + '..' + win.end +
    '  fetched=' + res.rowCount +
    ' requests=' + res.pagesFetched +
    ' mapped=' + mapped.length +
    ' dropped=' + built.droppedUnknownGame;

  if (DRY) {
    console.log(line + '  (dry run -- not written)');
  } else {
    var up = QUERY ? await upsertQueryMetrics(supabase, mapped) : await upsertPageMetrics(supabase, mapped);
    if (!up.ok) {
      failure = up.error;
      console.error(line + '  UPSERT FAILED: ' + up.error);
      break;
    }
    totalWritten += up.written;
    console.log(line + ' written=' + up.written);
  }
}

// ONE pull-log row per run, on EVERY path including failure -- absence must stay
// distinguishable from zero. consumer tags which pull this was (page vs query).
if (!DRY) {
  await writePullLog(supabase, {
    consumer: QUERY ? 'query' : 'page',
    windowStart: startDate,
    windowEnd: endDate,
    rowsFetched: totalFetched,
    newestDateReturned: newestOverall,
    dataState: dataState,
    status: failure ? 'error' : 'ok',
    error: failure,
    droppedUnknownGame: totalDropped,
    startedAt: startedAt,
  });
}

console.log('');
console.log('--- SUMMARY ---');
console.log('  rows fetched:          ' + totalFetched);
console.log('  rows written:          ' + (DRY ? '(dry run)' : totalWritten));
console.log('  dropped_unknown_game:  ' + totalDropped);
console.log('  requests made:         ' + totalRequests);
console.log('  date range returned:   ' + (oldestOverall || '(none)') + ' .. ' + (newestOverall || '(none)'));
console.log('  newest_date_returned:  ' + (newestOverall || '(none)'));
console.log('  window clamped:        ' + (clampedFrom ? 'YES (requested ' + clampedFrom + ', used ' + startDate + ')' : 'no'));
console.log('  status:                ' + (failure ? 'ERROR' : 'ok'));
if (failure) { console.log('  error: ' + failure); process.exit(1); }
console.log('  elapsed:               ' + (((Date.now() - Date.parse(startedAt)) / 1000).toFixed(1)) + 's');
