// lib/qualityMetricsCore.test.mjs
// Unit tests for the pure quality-metrics core. Run: node --test lib/qualityMetricsCore.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeQualityMetrics } from './qualityMetricsCore.mjs';

// Stub classifier mirroring lib/verification.js verificationState (kept simple
// + local so the core is tested in isolation).
function classify(row) {
  if (row && row.verified === true) return 'CONFIRMED';
  var pv = (row && row.patch_verified) || '';
  if (pv && !/^s1\b/i.test(pv)) return 'SOURCE_AGREED';
  return 'UNCHECKED';
}

// shell_stats-like: 1 confirmed of 8 (the real bad-news number we must surface).
var SHELLS = [
  { verified: true, patch_verified: 's2', verified_source: 'wiki' },
  { verified: false, patch_verified: null },
  { verified: false, patch_verified: null },
  { verified: false, patch_verified: 's1' },     // stale stamp -> UNCHECKED
  { verified: false, patch_verified: null },
  { verified: false, patch_verified: null },
  { verified: false, patch_verified: null },
  { verified: false, patch_verified: null },
];
// weapons-like with verified_source on some confirmed rows + one SOURCE_AGREED
var WEAPONS = [
  { verified: true, verified_source: 'wiki' },        // confirmed + sourced
  { verified: true, verified_source: null },          // confirmed, NOT sourced
  { verified: false, patch_verified: 's2' },          // SOURCE_AGREED (current stamp)
  { verified: false, patch_verified: 's1' },          // stale -> UNCHECKED
];

function run() {
  return computeQualityMetrics({
    tables: [
      { name: 'shell_stats', rows: SHELLS, hasVerifiedSource: true },
      { name: 'weapon_stats', rows: WEAPONS, hasVerifiedSource: true },
    ],
    classify: classify,
    currency: [{ table_name: 'shell_stats', last_fetched: '2026-06-18T00:00:00Z' }],
    nowMs: new Date('2026-06-19T00:00:00Z').getTime(),
  });
}

test('raw counts present + bad-news visible (shells 1/8)', () => {
  var m = run();
  assert.equal(m.per_table.shell_stats.total, 8);
  assert.equal(m.per_table.shell_stats.confirmed, 1);
  assert.equal(m.per_table.shell_stats.confirmed_data_share, 12.5);
});

test('all three buckets represented, incl empty SOURCE_AGREED', () => {
  var m = run();
  var s = m.per_table.shell_stats;
  assert.ok('source_agreed' in s, 'source_agreed key present');
  assert.equal(s.source_agreed, 0, 'empty middle shown as 0, not omitted');
  assert.equal(s.unchecked, 7);
  // weapons has a real SOURCE_AGREED row
  assert.equal(m.per_table.weapon_stats.source_agreed, 1);
});

test('stale-stamp derived without regex duplication (s1 stamp counted)', () => {
  var m = run();
  assert.equal(m.per_table.shell_stats.stale_stamp_count, 1); // the s1 shell
  assert.equal(m.per_table.weapon_stats.stale_stamp_count, 1); // the s1 weapon
});

test('source-attribution share = confirmed-with-source / confirmed', () => {
  var m = run();
  var w = m.per_table.weapon_stats;
  assert.equal(w.confirmed, 2);
  assert.equal(w.confirmed_with_source, 1);
  assert.equal(w.source_attribution_share, 50);
});

test('overall sums across tables + share computed', () => {
  var m = run();
  assert.equal(m.overall.total, 12);
  assert.equal(m.overall.confirmed, 3);     // 1 shell + 2 weapon
  assert.equal(m.overall.source_agreed, 1);
  assert.equal(m.overall.unchecked, 8);
  assert.equal(m.overall.confirmed_data_share, 25); // 3/12
});

test('data currency is coarse age in hours', () => {
  var m = run();
  assert.equal(m.data_currency[0].age_hours, 24);
});

test('share is null (not faked) when denominator is 0', () => {
  var m = computeQualityMetrics({ tables: [{ name: 'empty', rows: [], hasVerifiedSource: false }], classify: classify, currency: [], nowMs: 0 });
  assert.equal(m.per_table.empty.confirmed_data_share, null);
});

test('naming cannot be misread as accuracy (no accuracy KEY; disclaimer text is fine)', () => {
  var m = run();
  var keys = [];
  (function walk(o) {
    if (!o || typeof o !== 'object') return;
    Object.keys(o).forEach(function (k) { keys.push(k.toLowerCase()); walk(o[k]); });
  })(m);
  assert.ok(!keys.some(function (k) { return k.includes('accuracy'); }), 'no object key named/containing accuracy');
  assert.ok(keys.includes('confirmed_data_share'), 'uses confirmed_data_share');
  // the disclaimer VALUE may say "accuracy" (to deny it) -- that is intended.
  assert.ok(JSON.stringify(m.notes).toLowerCase().includes('not an article-accuracy'), 'headline disclaims accuracy');
});
