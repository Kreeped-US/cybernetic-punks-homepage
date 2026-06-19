// lib/entitlementsDecision.test.mjs
// Unit tests for the pure access-decision core. Run: node --test lib/entitlementsDecision.test.mjs
// Covers every Stage-1 scenario. Plain inputs, no DB -- the core is pure.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateGate, applyDailyLimit, UNLIMITED_LIMIT } from './entitlementsDecision.mjs';

// Data-derived tier order (mirrors subscription_tiers by price asc). Passed in,
// never hardcoded in the core.
var RANK = { scout: 0, runner: 1, specialist: 2, operative: 3, ghost_protocol: 4 };
var rankOf = function (t) { return RANK[t] != null ? RANK[t] : 0; };

var AUDIT = [
  { feature_name: 'audit_run', min_tier: 'scout', daily_limit: 1, enabled: true },
  { feature_name: 'audit_run', min_tier: 'runner', daily_limit: 999, enabled: true },
];
var ASK = [
  { feature_name: 'ask_editor', min_tier: 'scout', daily_limit: 3, enabled: true },
  { feature_name: 'ask_editor', min_tier: 'runner', daily_limit: 999, enabled: true },
];
var BUILD_LAB = [{ feature_name: 'build_lab', min_tier: 'operative', daily_limit: 999, enabled: true }];

var ENF = { monetizationEnabled: true, overrideAllFree: false }; // enforcing context

test('scout audit_run is metered -> needsCount, limit 1', () => {
  var ev = evaluateGate({ ...ENF, gates: AUDIT, tier: 'scout', rankOf });
  assert.equal(ev.needsCount, true);
  assert.equal(ev.limit, 1);
});

test('scout audit_run: 0 used -> ALLOW; 1 used -> DENY daily_limit_reached', () => {
  assert.equal(applyDailyLimit(0, 1).allowed, true);
  var d = applyDailyLimit(1, 1);
  assert.equal(d.allowed, false);
  assert.equal(d.reason, 'daily_limit_reached');
});

test('scout ask_editor: limit 3; 2 used -> ALLOW; 3 used -> DENY', () => {
  var ev = evaluateGate({ ...ENF, gates: ASK, tier: 'scout', rankOf });
  assert.equal(ev.limit, 3);
  assert.equal(applyDailyLimit(2, 3).allowed, true);
  assert.equal(applyDailyLimit(3, 3).allowed, false);
});

test('runner audit_run -> tier_presence ALLOW (999, no count)', () => {
  var ev = evaluateGate({ ...ENF, gates: AUDIT, tier: 'runner', rankOf });
  assert.equal(ev.allowed, true);
  assert.equal(ev.reason, 'tier_presence');
  assert.ok(!ev.needsCount);
});

test('scout build_lab (min operative) -> DENY tier_insufficient', () => {
  var ev = evaluateGate({ ...ENF, gates: BUILD_LAB, tier: 'scout', rankOf });
  assert.equal(ev.allowed, false);
  assert.equal(ev.reason, 'tier_insufficient');
  assert.equal(ev.min_tier, 'operative');
});

test('override_all_free=true -> ALLOW short-circuit (before any gate logic) [today]', () => {
  var ev = evaluateGate({ monetizationEnabled: true, overrideAllFree: true, gates: AUDIT, tier: 'scout', rankOf });
  assert.equal(ev.allowed, true);
  assert.equal(ev.reason, 'override_all_free');
});

test('monetization disabled -> ALLOW short-circuit', () => {
  var ev = evaluateGate({ monetizationEnabled: false, overrideAllFree: false, gates: AUDIT, tier: 'scout', rankOf });
  assert.equal(ev.allowed, true);
  assert.equal(ev.reason, 'monetization_disabled');
});

test('no gate row (advisor) -> ALLOW no_gate', () => {
  var ev = evaluateGate({ ...ENF, gates: [], tier: 'scout', rankOf });
  assert.equal(ev.allowed, true);
  assert.equal(ev.reason, 'no_gate');
});

test('FAIL-SAFE: rankOf throws -> ALLOW failsafe_allow', () => {
  var ev = evaluateGate({ ...ENF, gates: AUDIT, tier: 'scout', rankOf: function () { throw new Error('boom'); } });
  assert.equal(ev.allowed, true);
  assert.equal(ev.reason, 'failsafe_allow');
});

test('FAIL-SAFE: applyDailyLimit bad input -> ALLOW failsafe_allow', () => {
  var d = applyDailyLimit('x', null);
  assert.equal(d.allowed, true);
  assert.equal(d.reason, 'failsafe_allow');
});

test('disabled gate row -> ALLOW gate_disabled', () => {
  var ev = evaluateGate({ ...ENF, gates: [{ feature_name: 'audit_run', min_tier: 'scout', daily_limit: 1, enabled: false }], tier: 'scout', rankOf });
  assert.equal(ev.allowed, true);
  assert.equal(ev.reason, 'gate_disabled');
});
