// lib/content/substanceFloor.test.mjs
// The pure parts of the substance floor (check a): the facet->table map, the
// threshold resolution (default + per-game override), and the count->passes logic.
// The async query path is DB-backed and exercised by the cron log pass, not here.
// Run: node --test lib/content/substanceFloor.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  FACET_TABLE_MAP,
  DEFAULT_SUBSTANCE_THRESHOLDS,
  resolveFacet,
  thresholdFor,
  passesFloor,
} from './substanceFloor.js';

test('resolveFacet: known facets map to a table entry; unknown -> null', () => {
  assert.equal(resolveFacet('weapon').table, 'weapon_stats');
  assert.equal(resolveFacet('cradle').table, 'cradle_nodes');
  assert.equal(resolveFacet('map').table, 'game_maps');
  assert.equal(resolveFacet('nope'), null);
  assert.equal(resolveFacet(''), null);
  assert.equal(resolveFacet(null), null);
  assert.equal(resolveFacet(123), null);
});

test('FACET_TABLE_MAP: stat facets carry patchVerified; game-world facets are gameScoped', () => {
  // stat tables have patch_verified
  for (const f of ['weapon', 'shell', 'mod', 'cradle']) {
    assert.equal(FACET_TABLE_MAP[f].patchVerified, true, f + ' should require patch_verified');
  }
  // marathon-implicit tables are NOT game-scoped (no game_slug column)
  for (const f of ['weapon', 'shell', 'mod', 'core', 'implant']) {
    assert.equal(FACET_TABLE_MAP[f].gameScoped, false, f + ' has no game_slug column');
  }
  // per-game tables ARE game-scoped
  for (const f of ['cradle', 'armory', 'map', 'zone', 'boss', 'event', 'mode']) {
    assert.equal(FACET_TABLE_MAP[f].gameScoped, true, f + ' filters on game_slug');
  }
});

test('every facet in the table map has a default threshold (no orphan facets)', () => {
  for (const f of Object.keys(FACET_TABLE_MAP)) {
    assert.equal(typeof DEFAULT_SUBSTANCE_THRESHOLDS[f], 'number', f + ' needs a default threshold');
  }
});

test('thresholdFor: falls back to the conservative default when no override', () => {
  assert.equal(thresholdFor('weapon', undefined), 1);
  assert.equal(thresholdFor('cradle', {}), 3);
  assert.equal(thresholdFor('cradle', { editorial: {} }), 3);
});

test('thresholdFor: a per-game config override wins over the default', () => {
  const config = { editorial: { contentGate: { substanceFloor: { thresholds: { weapon: 4, cradle: 9 } } } } };
  assert.equal(thresholdFor('weapon', config), 4);
  assert.equal(thresholdFor('cradle', config), 9);
  // a facet not in the override still falls back to the default
  assert.equal(thresholdFor('mod', config), 1);
});

test('thresholdFor: unknown facet -> Infinity (fails safe, nothing clears it)', () => {
  assert.equal(thresholdFor('nope', {}), Infinity);
});

test('passesFloor: verifiedCount >= threshold, with type guards', () => {
  assert.equal(passesFloor(3, 3), true, 'at the threshold passes');
  assert.equal(passesFloor(4, 3), true);
  assert.equal(passesFloor(2, 3), false, 'under the threshold fails');
  assert.equal(passesFloor(0, 1), false);
  assert.equal(passesFloor(5, Infinity), false, 'unknown-facet Infinity threshold never passes');
  assert.equal(passesFloor(undefined, 1), false, 'non-number count fails');
  assert.equal(passesFloor(1, null), false, 'non-number threshold fails');
});
