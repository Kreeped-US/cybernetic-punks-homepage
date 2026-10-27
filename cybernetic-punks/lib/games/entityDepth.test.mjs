// lib/games/entityDepth.test.mjs
// Brief 180: the per-entity depth floor. No floor = the old rule (verified alone); with a floor, a detail page is
// indexable only when verified AND at least one floor field has a value. Pure; no game names.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { depthFloorFields, meetsDepthFloor, entityDetailIndexable } from './entityDepth.js';

const FLOOR = { depthFloor: ['a', 'b', 'c'] };

test('no floor: verified alone decides (other entities unchanged)', () => {
  for (const e of [{}, { depthFloor: [] }, null, { depthFloor: 'a' }]) {
    assert.deepEqual(depthFloorFields(e), []);
    assert.equal(meetsDepthFloor(e, { x: 1 }), true);
    assert.equal(entityDetailIndexable(e, { verified: true }), true);
    assert.equal(entityDetailIndexable(e, { verified: false }), false);
  }
});

test('floor: zero, one and many filled fields', () => {
  assert.equal(meetsDepthFloor(FLOOR, {}), false, 'zero (fields absent)');
  assert.equal(meetsDepthFloor(FLOOR, { a: null, b: '', c: '   ' }), false, 'zero (null / blank)');
  assert.equal(meetsDepthFloor(FLOOR, { b: 'x' }), true, 'one');
  assert.equal(meetsDepthFloor(FLOOR, { a: 'x', b: 'y', c: 'z' }), true, 'many');
  assert.equal(meetsDepthFloor(FLOOR, { c: ['x'] }), true, 'non-empty array');
  assert.equal(meetsDepthFloor(FLOOR, { c: [] }), false, 'empty array');
  assert.equal(entityDetailIndexable(FLOOR, { verified: true }), false, 'verified but under the floor');
  assert.equal(entityDetailIndexable(FLOOR, { verified: true, a: 'x' }), true);
  assert.equal(entityDetailIndexable(FLOOR, { verified: false, a: 'x' }), false, 'over the floor but unverified');
  assert.equal(entityDetailIndexable(FLOOR, { verified: 'true', a: 'x' }), false, 'verified must be strictly true');
  assert.equal(entityDetailIndexable(FLOOR, null), false);
});

test('module: no game names, no I/O', () => {
  const src = readFileSync(new URL('./entityDepth.js', import.meta.url), 'utf8');
  assert.ok(!/dmz|marathon|wardogs|pubg|bodycam/i.test(src));
  assert.ok(!/import /.test(src));
});
