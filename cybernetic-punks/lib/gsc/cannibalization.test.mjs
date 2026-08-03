// lib/gsc/cannibalization.test.mjs
// Unit tests for the RANK-SPLITTING cannibalization core. Pure, no DB. RUN: node lib/gsc/cannibalization.test.mjs
import assert from 'node:assert';
import { classifyCannibalization, CANNIBAL_FLIP_FLAG } from './cannibalization.js';

const B = 'https://cyberneticpunks.com';
let passed = 0;
function test(name, fn) { fn(); passed++; console.log('  ok  ' + name); }

// helper: emit daily rows for a query, given a per-date { url: position } map.
function rows(query, series, impPerDay) {
  const out = [];
  for (const [date, byUrl] of Object.entries(series)) {
    for (const [url, position] of Object.entries(byUrl)) {
      out.push({ query, page_url: url, position, impressions: impPerDay == null ? 10 : impPerDay, clicks: 0, date });
    }
  }
  return out;
}
function findCluster(res, query) { return res.clusters.find((c) => c.query === query); }

// 1. VALIDATION CASE (misery-disciple shape): hub + child both rank, hub dominates almost every
//    day -> LOW flip-rate + structural hub-child -> HEALTHY, NOT flagged.
test('hub-child dominance (misery-disciple shape) is NOT flagged', () => {
  const hub = B + '/uniques';
  const child = B + '/uniques/misery-disciple';
  const series = {};
  // 20 days: hub wins every day except one -> flip_rate ~ 2/19, well below any threshold.
  for (let d = 1; d <= 20; d++) {
    const day = String(d).padStart(2, '0');
    series['2026-07-' + day] = d === 10 ? { [child]: 8, [hub]: 9 } : { [hub]: 8, [child]: 9 };
  }
  const res = classifyCannibalization(rows('misery disciple marathon', series));
  const c = findCluster(res, 'misery disciple marathon');
  assert.ok(c, 'cluster found');
  assert.strictEqual(c.structural, 'hub-child', 'structural = hub-child (path containment)');
  assert.strictEqual(c.hub, hub, 'hub is /uniques');
  assert.ok(c.flip_rate < CANNIBAL_FLIP_FLAG, 'flip_rate low: ' + c.flip_rate.toFixed(3));
  assert.strictEqual(c.verdict, 'healthy-hub-child', 'verdict healthy, not flagged');
});

// 2. PEER ALTERNATION: two sibling news articles, Google swaps the winner almost every day ->
//    HIGH flip-rate + peer -> RANK-SPLITTING (flagged).
test('peer-vs-peer high alternation IS flagged rank-splitting', () => {
  const a = B + '/intel/faction-guide-alpha-1234';
  const b = B + '/intel/faction-guide-beta-5678';
  const series = {};
  for (let d = 1; d <= 20; d++) {
    const day = String(d).padStart(2, '0');
    // alternate the winner every single day -> flip_rate ~ 1.0
    series['2026-07-' + day] = d % 2 === 0 ? { [a]: 4, [b]: 6 } : { [a]: 6, [b]: 4 };
  }
  const res = classifyCannibalization(rows('best faction guide', series));
  const c = findCluster(res, 'best faction guide');
  assert.strictEqual(c.structural, 'peer', 'siblings are peers');
  assert.ok(c.flip_rate >= CANNIBAL_FLIP_FLAG, 'flip_rate high: ' + c.flip_rate.toFixed(3));
  assert.strictEqual(c.verdict, 'rank-splitting', 'flagged');
});

// 3. PEER but STABLE dominance: two peers, one wins nearly every day -> low flip-rate -> healthy
//    (Fable: stable dominance is healthy even between peers; only alternation is cannibalization).
test('peer with stable dominance is healthy, not flagged', () => {
  const a = B + '/intel/winner-article-1111';
  const b = B + '/intel/loser-article-2222';
  const series = {};
  for (let d = 1; d <= 20; d++) {
    const day = String(d).padStart(2, '0');
    series['2026-07-' + day] = d === 15 ? { [a]: 6, [b]: 5 } : { [a]: 4, [b]: 7 };
  }
  const res = classifyCannibalization(rows('faction leveling', series));
  const c = findCluster(res, 'faction leveling');
  assert.strictEqual(c.structural, 'peer');
  assert.ok(c.flip_rate < CANNIBAL_FLIP_FLAG, 'flip_rate low: ' + c.flip_rate.toFixed(3));
  assert.strictEqual(c.verdict, 'healthy-dominance');
});

// 4. FRANCHISE-MARKER exclusion FIRST: a cross-franchise query on our pages is excluded, never
//    classified (even if it would otherwise flip).
test('cross-franchise query is excluded before classification', () => {
  const a = B + '/intel/marathon-thing-1111';
  const b = B + '/intel/marathon-thing-2222';
  const series = {};
  for (let d = 1; d <= 20; d++) {
    const day = String(d).padStart(2, '0');
    series['2026-07-' + day] = d % 2 === 0 ? { [a]: 4, [b]: 6 } : { [a]: 6, [b]: 4 };
  }
  const res = classifyCannibalization(rows('warzone signal jammer', series));
  assert.strictEqual(findCluster(res, 'warzone signal jammer'), undefined, 'not in clusters');
  const ex = res.excludedCrossGame.find((e) => e.query === 'warzone signal jammer');
  assert.ok(ex, 'recorded in excludedCrossGame');
  assert.strictEqual(ex.franchise, 'CoD');
});

// 5. DENSITY GATE: too few head-to-head days -> low-confidence, never flagged (noise guard).
test('insufficient co-compete days -> low-confidence', () => {
  const a = B + '/intel/thin-a-1111';
  const b = B + '/intel/thin-b-2222';
  // only 3 days where both compete, alternating -> would be flip_rate ~1 but < MIN_CO_DATES
  const series = {
    '2026-07-01': { [a]: 4, [b]: 6 },
    '2026-07-02': { [a]: 6, [b]: 4 },
    '2026-07-03': { [a]: 4, [b]: 6 },
  };
  const res = classifyCannibalization(rows('thin query', series));
  const c = findCluster(res, 'thin query');
  assert.strictEqual(c.verdict, 'low-confidence', 'below MIN_CO_DATES');
});

// 6. SURVIVOR advisory: entity/canonical page outranks a news page regardless of impressions.
test('survivor advisory prefers entity/canonical over news', () => {
  const entity = B + '/weapons/some-gun';
  const news = B + '/intel/some-gun-guide-9999';
  const series = {};
  for (let d = 1; d <= 20; d++) {
    const day = String(d).padStart(2, '0');
    // news has MORE impressions, but entity must still be the advised survivor by type-rank
    series['2026-07-' + day] = d % 2 === 0
      ? { [entity]: 4, [news]: 6 } : { [entity]: 6, [news]: 4 };
  }
  const r = rows('some gun', series).map((x) => x.page_url === news ? Object.assign({}, x, { impressions: 100 }) : x);
  const res = classifyCannibalization(r);
  const c = findCluster(res, 'some gun');
  assert.strictEqual(c.survivor.url, entity, 'entity is advised survivor despite lower impressions');
  assert.strictEqual(c.survivor.type, 'entity');
});

// 7. SINGLE-URL query is not an overlap cluster (no cannibalization possible).
test('single-URL query yields no cluster', () => {
  const only = B + '/intel/solo-1234';
  const series = { '2026-07-01': { [only]: 5 }, '2026-07-02': { [only]: 6 } };
  const res = classifyCannibalization(rows('solo query', series));
  assert.strictEqual(findCluster(res, 'solo query'), undefined);
});

console.log('\n' + passed + ' passed');
