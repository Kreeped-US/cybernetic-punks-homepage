// scripts/gsc-dry-run.mjs
// ============================================================
// GSC CONSUMER A -- PHASE (2) DRY RUNNER. MANUAL. WRITES NOTHING.
// ============================================================
// Proves AUTH and DATA before storage exists in code. Fetches page-level search
// analytics and PRINTS what came back: row count, date range returned, whether
// pagination was exercised, and a sample. It does NOT touch Supabase -- this script
// imports no DB client at all, so "it accidentally wrote something" is unreachable.
// Storage (gsc_page_metrics + gsc_pull_log) is phase (3).
//
// RUN:  node scripts/gsc-dry-run.mjs
//       node scripts/gsc-dry-run.mjs --days 30            (window size; default 7)
//       node scripts/gsc-dry-run.mjs --data-state all      (default: final)
//       node scripts/gsc-dry-run.mjs --row-limit 100       (force pagination for a test)
//       node scripts/gsc-dry-run.mjs --sample 20           (rows to print; default 10)
//
// Needs GSC_CLIENT_EMAIL + GSC_PRIVATE_KEY (auto-loaded from .env.local if not already
// in env). The private key is server-only and is NEVER printed.

import { readFileSync } from 'node:fs';
import { fetchSearchAnalytics, daysAgo, FINAL_DATA_LAG_DAYS, GSC_SITE_URL } from '../lib/gsc/searchAnalytics.js';

function loadEnvLocal() {
  var raw;
  try { raw = readFileSync(new URL('../.env.local', import.meta.url), 'utf8'); } catch (e) { return; }
  raw.split('\n').forEach(function (line) {
    line = line.trim(); if (!line || line.charAt(0) === '#') return;
    var eq = line.indexOf('='); if (eq === -1) return;
    var k = line.slice(0, eq).trim(); var v = line.slice(eq + 1).trim();
    if (v.length >= 2 && (v.charAt(0) === '"' || v.charAt(0) === "'")) v = v.slice(1, -1);
    if (!process.env[k]) process.env[k] = v;
  });
}
loadEnvLocal();

function arg(name, fallback) {
  var i = process.argv.indexOf('--' + name);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

var days = parseInt(arg('days', '7'), 10);
var dataState = arg('data-state', 'final');
var rowLimit = parseInt(arg('row-limit', '25000'), 10);
var sampleN = parseInt(arg('sample', '10'), 10);

// Hard-exit on missing credentials rather than limping -- same discipline as the other
// standalone scripts, which hard-exit when SUPABASE_SERVICE_KEY is unset.
if (!process.env.GSC_CLIENT_EMAIL || !process.env.GSC_PRIVATE_KEY) {
  console.error('FATAL: GSC_CLIENT_EMAIL and GSC_PRIVATE_KEY must be set (env or .env.local).');
  process.exit(1);
}

var endDate = daysAgo(FINAL_DATA_LAG_DAYS);
var startDate = daysAgo(FINAL_DATA_LAG_DAYS + days);

console.log('=== GSC DRY RUN -- phase (2). NO WRITES. ===');
console.log('siteUrl:    ' + GSC_SITE_URL + '   (URL-prefix form, trailing slash REQUIRED)');
console.log('account:    ' + process.env.GSC_CLIENT_EMAIL);
console.log('window:     ' + startDate + ' .. ' + endDate + '   (' + days + 'd, ending ' + FINAL_DATA_LAG_DAYS + 'd back for the final-data lag)');
console.log('dataState:  ' + dataState);
console.log('rowLimit:   ' + rowLimit + ' per request');
console.log('');

var res = await fetchSearchAnalytics({
  startDate: startDate,
  endDate: endDate,
  dataState: dataState,
  dimensions: ['date', 'page'],
  rowLimit: rowLimit,
});

if (!res.ok) {
  console.error('FETCH FAILED (fail-open: nothing threw, nothing was written)');
  console.error('');
  console.error(res.error);
  process.exit(1);
}

console.log('--- RESULT ---');
console.log('rows fetched:          ' + res.rowCount);
console.log('requests made:         ' + res.pagesFetched);
console.log('pagination exercised:  ' + (res.paginated ? 'YES (>1 request)' : 'NO (single short page -- loop terminated on first page)'));
console.log('date range returned:   ' + (res.oldestDateReturned || '(none)') + ' .. ' + (res.newestDateReturned || '(none)'));
console.log('newest_date_returned:  ' + (res.newestDateReturned || '(none)') + '   <- the stall detector input');
console.log('');

if (res.rowCount === 0) {
  console.log('ZERO ROWS. Auth worked (no 403), so this is a DATA condition, not a permission one:');
  console.log('  - the window may predate the property having data, or');
  console.log('  - dataState=final lags ~2-3 days; try --data-state all for the fresh tail.');
} else {
  // Totals, to sanity-check the shape against what GSC's UI shows for the same window.
  var clicks = 0, impressions = 0;
  var urls = new Set();
  for (var i = 0; i < res.rows.length; i++) {
    clicks += res.rows[i].clicks || 0;
    impressions += res.rows[i].impressions || 0;
    if (res.rows[i].keys && res.rows[i].keys[1]) urls.add(res.rows[i].keys[1]);
  }
  console.log('totals over the window: ' + clicks + ' clicks, ' + impressions + ' impressions, ' + urls.size + ' distinct URLs');
  console.log('');
  console.log('--- SAMPLE (first ' + Math.min(sampleN, res.rowCount) + ' rows) ---');
  console.log('date        impr  clicks  pos    page');
  for (var j = 0; j < Math.min(sampleN, res.rows.length); j++) {
    var r = res.rows[j];
    var d = (r.keys && r.keys[0]) || '?';
    var p = (r.keys && r.keys[1]) || '?';
    console.log(
      d + '  ' +
      String(r.impressions == null ? '-' : r.impressions).padStart(5) + '  ' +
      String(r.clicks == null ? '-' : r.clicks).padStart(6) + '  ' +
      String(r.position == null ? '-' : r.position.toFixed(1)).padStart(5) + '  ' +
      p
    );
  }
}

console.log('');
console.log('=== DRY RUN COMPLETE -- nothing was written. Storage is phase (3). ===');
