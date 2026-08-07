// lib/dmz/savedBuilds.test.mjs
// The security-relevant pure bits of thin saves: build_ref validation (junk out of the table) and
// the server-side cap gate. Run: node --test lib/dmz/savedBuilds.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validBuildRef, overCap, SAVED_BUILD_CAP, SAVED_GAME_SLUG } from './savedBuilds.js';

test('validBuildRef: accepts a weapon-slug shape', () => {
  assert.equal(validBuildRef('kastov-762'), true);
  assert.equal(validBuildRef('m13b'), true);
  assert.equal(validBuildRef('a'), true);
});

test('validBuildRef: rejects junk (empty, non-string, uppercase, spaces, injection, over-length)', () => {
  assert.equal(validBuildRef(''), false);
  assert.equal(validBuildRef(null), false);
  assert.equal(validBuildRef(123), false);
  assert.equal(validBuildRef('Kastov'), false, 'uppercase not a slug');
  assert.equal(validBuildRef('kastov 762'), false, 'space');
  assert.equal(validBuildRef('-leading'), false, 'must start alnum');
  assert.equal(validBuildRef("k'; drop table"), false, 'no injection-ish chars');
  assert.equal(validBuildRef('x'.repeat(65)), false, 'over 64');
});

test('overCap: false below the cap, true at/over the cap', () => {
  assert.equal(overCap(0), false);
  assert.equal(overCap(SAVED_BUILD_CAP - 1), false);
  assert.equal(overCap(SAVED_BUILD_CAP), true, 'at the cap -> a NEW save is rejected');
  assert.equal(overCap(SAVED_BUILD_CAP + 5), true);
});

test('overCap: non-number -> false (never blocks on a bad count read)', () => {
  assert.equal(overCap(null), false);
  assert.equal(overCap(undefined), false);
});

test('constants: cap 100, game_slug dmz', () => {
  assert.equal(SAVED_BUILD_CAP, 100);
  assert.equal(SAVED_GAME_SLUG, 'dmz');
});
