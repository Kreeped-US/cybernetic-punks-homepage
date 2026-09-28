// lib/staleness.test.mjs
// Guards the PURE staleness watchdog decision: stale / fresh / not-live / no_rows_ever /
// exactly-at-threshold / missed-runs boundary (35h no alert, 37h alert) / dedup key format.
// Run: node --test lib/staleness.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stalenessDecision, stalenessDedupKey, DEFAULT_STALE_AFTER_DAYS, MISSED_RUNS_HOURS } from './staleness.js';

const NOW = Date.parse('2026-09-28T12:00:00Z');
const daysAgo = (d) => NOW - d * 86400000;
const hoursAgo = (h) => NOW - h * 3600000;

test('fresh: recent draft + recent run -> no alert', () => {
  const d = stalenessDecision({ isLive: true, nowMs: NOW, lastDraftAtMs: daysAgo(1), lastCronRunAtMs: hoursAgo(12), staleAfterDays: 10 });
  assert.equal(d.alert, false);
  assert.equal(d.reason, 'fresh');
});

test('stale: draft older than staleAfterDays -> alert stale', () => {
  const d = stalenessDecision({ isLive: true, nowMs: NOW, lastDraftAtMs: daysAgo(11), lastCronRunAtMs: hoursAgo(12), staleAfterDays: 10 });
  assert.equal(d.alert, true);
  assert.deepEqual(d.reasons, ['stale']);
});

test('not-live: never alerts (DMZ / any non-generation game)', () => {
  const d = stalenessDecision({ isLive: false, nowMs: NOW, lastDraftAtMs: daysAgo(999), lastCronRunAtMs: daysAgo(999), staleAfterDays: 10 });
  assert.equal(d.alert, false);
  assert.equal(d.reason, 'not_live');
});

test('no_rows_ever: null lastDraft OR null lastCronRun -> alert', () => {
  const noDrafts = stalenessDecision({ isLive: true, nowMs: NOW, lastDraftAtMs: null, lastCronRunAtMs: hoursAgo(1), staleAfterDays: 10 });
  assert.equal(noDrafts.alert, true);
  assert.ok(noDrafts.reasons.includes('no_rows_ever'));
  const noRuns = stalenessDecision({ isLive: true, nowMs: NOW, lastDraftAtMs: daysAgo(1), lastCronRunAtMs: null, staleAfterDays: 10 });
  assert.equal(noRuns.alert, true);
  assert.ok(noRuns.reasons.includes('no_rows_ever'));
});

test('exactly-at-threshold: staleDays === staleAfterDays does NOT alert (strict older-than)', () => {
  const d = stalenessDecision({ isLive: true, nowMs: NOW, lastDraftAtMs: daysAgo(10), lastCronRunAtMs: hoursAgo(1), staleAfterDays: 10 });
  assert.equal(d.reasons.includes('stale'), false, '10.0 days at a 10-day threshold is not "older than"');
  assert.equal(d.alert, false);
});

test('missed-runs boundary: 35h -> no alert, 37h -> alert (36h default)', () => {
  const at35 = stalenessDecision({ isLive: true, nowMs: NOW, lastDraftAtMs: daysAgo(1), lastCronRunAtMs: hoursAgo(35), staleAfterDays: 10 });
  assert.equal(at35.reasons.includes('missed_runs'), false);
  assert.equal(at35.alert, false);
  const at37 = stalenessDecision({ isLive: true, nowMs: NOW, lastDraftAtMs: daysAgo(1), lastCronRunAtMs: hoursAgo(37), staleAfterDays: 10 });
  assert.deepEqual(at37.reasons, ['missed_runs']);
  assert.equal(at37.alert, true);
  assert.equal(MISSED_RUNS_HOURS, 36);
});

test('both checks can fire together', () => {
  const d = stalenessDecision({ isLive: true, nowMs: NOW, lastDraftAtMs: daysAgo(20), lastCronRunAtMs: hoursAgo(48), staleAfterDays: 14 });
  assert.deepEqual(d.reasons.sort(), ['missed_runs', 'stale']);
});

test('default threshold applies when staleAfterDays omitted', () => {
  const d = stalenessDecision({ isLive: true, nowMs: NOW, lastDraftAtMs: daysAgo(DEFAULT_STALE_AFTER_DAYS + 1), lastCronRunAtMs: hoursAgo(1) });
  assert.equal(d.thresholdDays, DEFAULT_STALE_AFTER_DAYS);
  assert.ok(d.reasons.includes('stale'));
});

test('dedup key format: staleness_alert:<game>:<YYYY-MM-DD> (UTC day)', () => {
  assert.equal(stalenessDedupKey('wardogs', NOW), 'staleness_alert:wardogs:2026-09-28');
  assert.equal(stalenessDedupKey('marathon', Date.parse('2026-12-01T23:59:59Z')), 'staleness_alert:marathon:2026-12-01');
});
