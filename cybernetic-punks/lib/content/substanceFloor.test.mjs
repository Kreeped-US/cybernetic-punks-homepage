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
  substanceFloor,
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

test('FACET_TABLE_MAP: game-world facets are gameScoped; marathon-implicit are not', () => {
  // marathon-implicit tables are NOT game-scoped (no game_slug column)
  for (const f of ['weapon', 'shell', 'mod', 'core', 'implant']) {
    assert.equal(FACET_TABLE_MAP[f].gameScoped, false, f + ' has no game_slug column');
  }
  // per-game tables ARE game-scoped
  for (const f of ['cradle', 'armory', 'map', 'zone', 'boss', 'event', 'mode']) {
    assert.equal(FACET_TABLE_MAP[f].gameScoped, true, f + ' filters on game_slug');
  }
});

test('FACET_TABLE_MAP: no facet carries a patchVerified flag (1a: verified-is-verified)', () => {
  // patch_verified is a SEASON STRING, not a boolean -- it must NOT be a filter.
  // Removing the flag is what prevents a future reader re-adding .eq(patch_verified,true).
  for (const f of Object.keys(FACET_TABLE_MAP)) {
    assert.equal('patchVerified' in FACET_TABLE_MAP[f], false, f + ' must not carry patchVerified');
  }
});

// A tiny chainable fake that records every .eq()/.ilike() applied, so we can assert
// the verified-count query filters on `verified` but NEVER on `patch_verified`.
function fakeSupabase(count) {
  const calls = [];
  const q = {
    select() { return q; },
    ilike(col, val) { calls.push('ilike:' + col + '=' + val); return q; },
    eq(col, val) { calls.push('eq:' + col + '=' + val); return q; },
    then(resolve) { resolve({ count: count, error: null }); },
  };
  return { from(table) { calls.push('from:' + table); return q; }, _calls: calls };
}

test('substanceFloor: counts verified=true and does NOT filter on patch_verified (1a fix)', async () => {
  const client = fakeSupabase(5);
  const res = await substanceFloor(client, 'marathon', 'Destroyer', 'shell', undefined);
  // it queried the right table and filtered on verified=true
  assert.ok(client._calls.includes('from:shell_stats'));
  assert.ok(client._calls.includes('eq:verified=true'), 'must filter verified=true');
  // it NEVER filtered on patch_verified (the bug the first log run surfaced)
  assert.ok(!client._calls.some((c) => c.startsWith('eq:patch_verified')), 'must NOT filter patch_verified');
  // a verified row (any season) counts: 5 >= threshold(1) -> passes
  assert.equal(res.verifiedCount, 5);
  assert.equal(res.passes, true);
});

test('substanceFloor: a gameScoped facet still filters game_slug (unchanged by 1a)', async () => {
  const client = fakeSupabase(4);
  await substanceFloor(client, 'marathon', 'Strength', 'cradle', undefined);
  assert.ok(client._calls.includes('from:cradle_nodes'));
  assert.ok(client._calls.includes('eq:game_slug=marathon'), 'cradle is gameScoped');
  assert.ok(!client._calls.some((c) => c.startsWith('eq:patch_verified')));
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
