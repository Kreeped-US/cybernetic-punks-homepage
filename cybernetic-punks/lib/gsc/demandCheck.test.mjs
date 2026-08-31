// lib/gsc/demandCheck.test.mjs
// Unit tests for the demand-check join core. Proves the three verdicts, that the LEFT JOIN
// surfaces committed-but-unserved demand (GSC cannot see it), that "already served"
// short-circuits, and that the shared aggregator leaves reviewList's aggregation identical.
// Run: node --test lib/gsc/demandCheck.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  deriveRow, buildDemandRows, lookupDemand,
  VERDICT_BUILD, VERDICT_SERVED, VERDICT_NO_DEMAND,
} from './demandCheck.js';
import { aggregateByQuery } from './queryAggregate.js';

// GSC row helper
const g = (query, page_url, position, impressions, clicks = 0, game_slug = 'marathon') =>
  ({ query, page_url, position, impressions, clicks, game_slug });
// keyword_target row helper
const kt = (keyword, is_active, volume, extra = {}) =>
  ({ keyword, game_slug: 'marathon', is_active, volume, ...extra });

test('verdict BUILD: committed demand (forecast volume), not served', () => {
  // a keyword_target with forecast volume and NO GSC match at all (GSC never saw it).
  const rows = buildDemandRows([kt('marathon faction tier list', false, 500)], []);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].verdict, VERDICT_BUILD);
  assert.equal(rows[0].position, null, 'committed-but-unserved: no GSC page');
  assert.equal(rows[0].committed, 'page-gap');
});

test('verdict BUILD is surfaced by the LEFT JOIN even with zero GSC rows', () => {
  // The whole point: GSC structurally cannot see this query. Driving the join from
  // keyword_targets is what keeps the committed row present.
  const rows = buildDemandRows([kt('marathon best sniper', true, 320)], []);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].verdict, VERDICT_BUILD);
  assert.equal(rows[0].committed, 'accepted');
});

test('verdict ALREADY-SERVED: a page ranks page-1 (the tier-list cannibalization guard)', () => {
  // "marathon tier list" is NOT in keyword_targets, but /marathon/meta ranks it at pos 4.
  const rows = buildDemandRows([], [g('marathon tier list', 'https://cyberneticpunks.com/marathon/meta', 4, 40, 3)]);
  const row = rows.find((r) => r.query === 'marathon tier list');
  assert.ok(row, 'uncommitted served query must surface');
  assert.equal(row.verdict, VERDICT_SERVED);
  assert.equal(row.best_page, 'https://cyberneticpunks.com/marathon/meta');
  assert.equal(row.committed, 'unreviewed');
});

test('ALREADY-SERVED short-circuits BUILD even with committed forecast demand', () => {
  // committed target WITH volume, but a page already ranks pos 3 -> do not fork.
  const rows = buildDemandRows(
    [kt('marathon best weapons', true, 900)],
    [g('marathon best weapons', 'https://cyberneticpunks.com/marathon/meta', 3, 120, 10)],
  );
  assert.equal(rows[0].verdict, VERDICT_SERVED);
});

test('verdict NO-DEMAND: not committed, below the impression floor', () => {
  // a query the operator has an intuition about: no keyword_target, only 2 impressions.
  const rows = buildDemandRows([], [g('marathon hidden lore', 'https://cyberneticpunks.com/marathon/x', 45, 2)]);
  // below the floor AND not served -> excluded from the browser entirely (no committed demand).
  assert.equal(rows.length, 0, 'sub-floor uncommitted query is not a demand row');
  // and via direct lookup it reports no-demand.
  const one = lookupDemand('marathon hidden lore', [], [g('marathon hidden lore', 'https://cyberneticpunks.com/marathon/x', 45, 2)]);
  assert.equal(one.verdict, VERDICT_NO_DEMAND);
});

test('weak-position committed query is BUILD (proven demand, not served)', () => {
  // GSC shows demand (impr 30) but best rank is pos 18 -> unserved -> build/reframe candidate.
  const rows = buildDemandRows([], [g('marathon medic build', 'https://cyberneticpunks.com/marathon/y', 18, 30, 1)]);
  assert.equal(rows[0].verdict, VERDICT_BUILD);
});

test('lookup of an unknown query returns NO-DEMAND (in neither table)', () => {
  const one = lookupDemand('completely novel phrase', [kt('marathon tier list', true, 100)], []);
  assert.equal(one.verdict, VERDICT_NO_DEMAND);
  assert.equal(one.committed, 'unreviewed');
});

test('case-insensitive join between keyword_targets and GSC', () => {
  const rows = buildDemandRows(
    [kt('Marathon Tier List', true, 100)],
    [g('marathon tier list', 'https://cyberneticpunks.com/marathon/meta', 4, 50, 4)],
  );
  // one merged row, not two -- and served wins.
  assert.equal(rows.length, 1);
  assert.equal(rows[0].verdict, VERDICT_SERVED);
  assert.equal(rows[0].position, 4);
});

test('shared aggregator: minPos/bestPage/impressions match the hand-rolled reviewList math', () => {
  const rows = [
    g('q', 'https://x/a', 12, 10),
    g('q', 'https://x/b', 5, 4),   // best rank -> bestPage b
    g('q', 'https://x/c', 20, 6),
  ];
  const m = aggregateByQuery(rows, { noindexedSlugs: new Set() });
  const agg = m.get('q');
  assert.equal(agg.impressions, 20);
  assert.equal(agg.minPos, 5);
  assert.equal(agg.bestPage, 'https://x/b');
  assert.equal(agg.posCount, 3);
});
