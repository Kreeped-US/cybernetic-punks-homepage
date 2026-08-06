// lib/gsc/prePublishGate.test.mjs
// The safety gate for the pre-publish HOLD decision. The dangerous cases: a fail-closed DMZ
// draft must HOLD on a hold-class finding AND on a gate-infra throw (gate-down = hold); a
// log-only Marathon draft must NEVER hold (fail-open) -- not on findings, not on a throw.
// Run: node --test lib/gsc/prePublishGate.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decideGate, HOLD_CLASSES } from './prePublishGate.js';

const CONTRA = { class: 'CONTRADICTED', entity: 'Test Rifle', field: 'damage', claimed_value: 99 };
const UNCORR = { class: 'UNCORROBORATED', entity: 'Test Rifle', field: 'fire_rate', claimed_value: 600 };

test('fail-closed: a CONTRADICTED finding HOLDS (is_published=false, gate_status=held, findings recorded)', () => {
  const d = decideGate([CONTRA], 'fail-closed', false);
  assert.equal(d.hold, true);
  assert.equal(d.is_published, false);
  assert.equal(d.gate_status, 'held');
  assert.deepEqual(d.gate_findings, [CONTRA], 'the hold-class finding is recorded as the why');
});

test('fail-closed: a THROW HOLDS even with NO findings (gate-down = hold) + records an infra-failure marker', () => {
  const d = decideGate([], 'fail-closed', true);
  assert.equal(d.hold, true, 'gate-infra failure holds -- the deliberate divergence from house fail-open');
  assert.equal(d.is_published, false);
  assert.equal(d.gate_status, 'held');
  assert.equal(d.gate_findings[0].class, 'GATE_INFRA_FAILURE', 'the throw records why the row held');
});

test('fail-closed: NO findings + NO throw -> PUBLISHES (clear)', () => {
  const d = decideGate([], 'fail-closed', false);
  assert.equal(d.hold, false);
  assert.equal(d.is_published, true);
  assert.equal(d.gate_status, 'clear');
  assert.equal(d.gate_findings, null);
});

test('fail-closed (2b): UNCORROBORATED now HOLDS (hard-stat by construction)', () => {
  const d = decideGate([UNCORR], 'fail-closed', false);
  assert.equal(d.hold, true);
  assert.equal(d.gate_status, 'held');
  assert.deepEqual(d.gate_findings, [UNCORR]);
});

test('fail-closed (2b): UNPARSEABLE HOLDS (unverifiable-by-instrument)', () => {
  const UNPARSE = { class: 'UNPARSEABLE', entity: 'Test Rifle', field: null, verbatim: 'moved to S tier' };
  const d = decideGate([UNPARSE], 'fail-closed', false);
  assert.equal(d.hold, true);
  assert.equal(d.gate_status, 'held');
  assert.deepEqual(d.gate_findings, [UNPARSE]);
});

test('log-only (Marathon): a CONTRADICTED finding NEVER holds -- publishes regardless (fail-open, unchanged)', () => {
  const d = decideGate([CONTRA], 'log-only', false);
  assert.equal(d.hold, false, 'Marathon log-only must not hold on any finding');
  assert.equal(d.is_published, true);
  assert.equal(d.gate_status, 'clear');
});

test('log-only (Marathon): a THROW publishes -- Marathon fails OPEN, never holds', () => {
  const d = decideGate([], 'log-only', true);
  assert.equal(d.hold, false, 'Marathon fails open on a gate throw');
  assert.equal(d.is_published, true);
});

test('unknown/absent mode: PUBLISHES (house fail-open default; a game without the field is ungated)', () => {
  assert.equal(decideGate([CONTRA], undefined, false).is_published, true);
  assert.equal(decideGate([CONTRA], 'off', true).is_published, true);
});

test('2b hold-class set = CONTRADICTED + UNCORROBORATED + UNPARSEABLE (decideGate logic unchanged)', () => {
  assert.deepEqual(HOLD_CLASSES, ['CONTRADICTED', 'UNCORROBORATED', 'UNPARSEABLE']);
});
