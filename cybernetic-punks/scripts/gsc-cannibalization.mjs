// scripts/gsc-cannibalization.mjs
// Level 3 CANNIBALIZATION runner -- RANK-SPLITTING class. READ-ONLY. Does the DB reads + feed_items
// body-depth join and calls the pure core lib/gsc/cannibalization.js. Prints: the flip-rate
// distribution (to justify the threshold), the flagged rank-splitting clusters, the healthy /
// low-confidence buckets, and PROVES the cross-franchise marker filter drops cross-game queries.
// No writes, no UI, never enters generation.  RUN: node scripts/gsc-cannibalization.mjs
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { gameSlugForUrl, slugCandidate } from '../lib/gsc/storage.js';
import {
  classifyCannibalization, CANNIBAL_WINDOW_DAYS, CANNIBAL_FLIP_FLAG,
  CANNIBAL_FLIP_EXTREME, CANNIBAL_MIN_CO_DATES, CANNIBAL_MIN_SHARED_IMPRESSIONS,
} from '../lib/gsc/cannibalization.js';

function loadEnvLocal() {
  let raw; try { raw = readFileSync(new URL('../.env.local', import.meta.url), 'utf8'); } catch (e) { return; }
  raw.split('\n').forEach((line) => {
    line = line.trim(); if (!line || line.charAt(0) === '#') return;
    const eq = line.indexOf('='); if (eq === -1) return;
    const k = line.slice(0, eq).trim(); let v = line.slice(eq + 1).trim();
    if (v.length >= 2) { const f = v[0], l = v[v.length - 1]; if ((f === '"' || f === "'") && f === l) v = v.slice(1, -1); }
    if (!process.env[k]) process.env[k] = v;
  });
}
loadEnvLocal();
const supa = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const rel = (u) => u.replace('https://cyberneticpunks.com', '');

async function pageAll(table, sel, filter) {
  const out = []; for (let from = 0; ; from += 1000) { let q = supa.from(table).select(sel); if (filter) q = filter(q); const { data, error } = await q.range(from, from + 999); if (error) { console.error(table + ' read err: ' + error.message); break; } if (!data || !data.length) break; out.push(...data); if (data.length < 1000) break; } return out;
}

const all = await pageAll('gsc_query_metrics', 'query, page_url, position, impressions, clicks, date, game_slug');
const dates = all.map((r) => r.date).filter(Boolean).sort();
const maxD = dates[dates.length - 1];
const winStart = new Date(Date.parse(maxD) - CANNIBAL_WINDOW_DAYS * 86400000).toISOString().slice(0, 10);
const rows = all.filter((r) => r.date >= winStart);
console.log('window ' + winStart + '..' + maxD + ' (' + CANNIBAL_WINDOW_DAYS + 'd)  rows=' + rows.length + '/' + all.length);
console.log('thresholds: flip_flag(peer)>=' + CANNIBAL_FLIP_FLAG + '  flip_extreme(hub-child)>=' + CANNIBAL_FLIP_EXTREME
  + '  min_co_dates=' + CANNIBAL_MIN_CO_DATES + '  min_shared_imp=' + CANNIBAL_MIN_SHARED_IMPRESSIONS);

// feed_items body depth (survivor tie-break). slug -> body length, then map page_url -> depth.
const feed = await pageAll('feed_items', 'slug, body');
const depthBySlug = new Map(); feed.forEach((r) => { if (r.slug) depthBySlug.set(r.slug, (r.body || '').length); });
const depthByUrl = new Map();
new Set(rows.map((r) => r.page_url)).forEach((url) => { const s = slugCandidate(url); if (s && depthBySlug.has(s)) depthByUrl.set(url, depthBySlug.get(s)); });

const res = classifyCannibalization(rows, { depthByUrl });
const byGame = (c) => c.game;
const flagged = res.clusters.filter((c) => c.verdict === 'rank-splitting');
const healthy = res.clusters.filter((c) => c.verdict === 'healthy-dominance' || c.verdict === 'healthy-hub-child');
const lowConf = res.clusters.filter((c) => c.verdict === 'low-confidence');

// per-game overlap counts (sanity vs Step 0's "70 of 516")
const perGame = {};
res.clusters.forEach((c) => { perGame[c.game] = (perGame[c.game] || 0) + 1; });
console.log('\n=== OVERLAP CLUSTERS (>=2 distinct URLs share a query, marker-clean) ===  total=' + res.clusters.length
  + '  ' + JSON.stringify(perGame));
console.log('  verdicts: rank-splitting=' + flagged.length + '  healthy=' + healthy.length + '  low-confidence=' + lowConf.length
  + '  | cross-franchise-excluded=' + res.excludedCrossGame.length);

// FLIP-RATE DISTRIBUTION -- only over clusters with enough co-compete days (a trustworthy flip-rate),
// so the threshold is proposed from real alternation, not noise. Bucketed.
const scoreable = res.clusters.filter((c) => c.verdict !== 'low-confidence');
const buckets = [0, 0.1, 0.2, 0.3, 0.35, 0.4, 0.5, 0.6, 0.8, 1.01];
console.log('\n=== FLIP-RATE DISTRIBUTION (co_dates>=' + CANNIBAL_MIN_CO_DATES + ' clusters, n=' + scoreable.length + ') ===');
for (let i = 0; i < buckets.length - 1; i++) {
  const lo = buckets[i], hi = buckets[i + 1];
  const n = scoreable.filter((c) => c.flip_rate >= lo && c.flip_rate < hi).length;
  console.log('  [' + lo.toFixed(2) + ',' + hi.toFixed(2) + ')  ' + '#'.repeat(n) + ' ' + n);
}

function printCluster(c) {
  console.log('\n  [' + c.verdict.toUpperCase() + ']  ' + c.game + '  flip=' + c.flip_rate.toFixed(2)
    + '  dom=' + (100 * c.dominant_share).toFixed(0) + '%  co_days=' + c.n_co_dates + '/' + c.n_dates
    + '  shared_imp=' + c.shared_impressions + '  struct=' + c.structural + (c.hub ? '(hub ' + rel(c.hub) + ')' : ''));
  console.log('     query: "' + c.query + '"');
  c.urls.forEach((u) => console.log('       ' + (u.url === c.survivor.url ? 'KEEP>' : '     ')
    + ' [' + u.type.padEnd(6) + '] imp=' + String(u.impressions).padStart(3) + ' days=' + String(u.dates_present).padStart(2)
    + ' wins=' + String(u.wins).padStart(2) + ' depth=' + u.depth + '  ' + rel(u.url)));
  console.log('       survivor(advisory): ' + rel(c.survivor.url) + '  (' + c.survivor.reason + ')');
}

console.log('\n========== FLAGGED: RANK-SPLITTING (the standing signal) ==========');
if (!flagged.length) console.log('  (none)');
flagged.forEach(printCluster);

console.log('\n========== LOW-CONFIDENCE (too few head-to-head days / impressions) ==========  n=' + lowConf.length);
lowConf.slice(0, 8).forEach(printCluster);
if (lowConf.length > 8) console.log('  ... +' + (lowConf.length - 8) + ' more');

// VALIDATION: show the misery-disciple hub-child cluster explicitly proven healthy (if present).
const md = res.clusters.find((c) => c.query.indexOf('misery disciple') !== -1)
  || res.clusters.find((c) => c.hub && c.hub.indexOf('/uniques') !== -1);
console.log('\n========== VALIDATION: hub-child dominance NOT flagged ==========');
if (md) { console.log('  query "' + md.query + '"  -> verdict=' + md.verdict + ' (expected healthy-hub-child)'); printCluster(md); }
else console.log('  (no hub-child cluster in window)');

console.log('\n========== HEALTHY sample (dominance / hub-child) ==========  n=' + healthy.length);
healthy.slice(0, 6).forEach((c) => console.log('  [' + c.verdict + '] ' + c.game + ' flip=' + c.flip_rate.toFixed(2)
  + ' dom=' + (100 * c.dominant_share).toFixed(0) + '% struct=' + c.structural + '  "' + c.query + '"'));

console.log('\n========== MARKER-EXCLUSION PROOF (cross-franchise overlap queries dropped) ==========  n=' + res.excludedCrossGame.length);
if (!res.excludedCrossGame.length) console.log('  (none)');
res.excludedCrossGame.forEach((e) => console.log('  DROP  marker="' + e.marker + '" (' + e.franchise + ')  page-game=' + e.game
  + '  "' + e.query + '"  urls=' + e.urls.length));
process.exit(0);
