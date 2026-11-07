// lib/games/dataFreshness.test.mjs
// Brief 316: the game-agnostic freshness rule (newest ledger patch vs the OLDEST combat-table updated_at) and its
// never-throw contract, against a fake Supabase client that records the queries it is asked for.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getDataFreshness, decideFreshness, utcDay, longDate, monthYear, shortDate } from './dataFreshness.js';

// Fake client: tables = { name: rows[] | Error }. Supports the chain the function uses and applies
// eq / not-null / order / limit so the test checks the real query shape, not just a canned answer.
function fakeClient(tables, log) {
  return {
    from(name) {
      const q = { name, filters: [], order: null, lim: null };
      const chain = {
        select(cols) { q.cols = cols; return chain; },
        eq(c, v) { q.filters.push((r) => r[c] === v); q.eqs = (q.eqs || []).concat([[c, v]]); return chain; },
        not(c, op, v) { if (op === 'is' && v === null) q.filters.push((r) => r[c] != null); return chain; },
        order(c, o) { q.order = [c, o && o.ascending]; return chain; },
        limit(n) { q.lim = n; return chain; },
        then(res, rej) {
          if (log) log.push(q);
          const t = tables[name];
          if (t instanceof Error) return Promise.resolve({ data: null, error: { message: t.message } }).then(res, rej);
          if (t === 'throw') return Promise.reject(new Error('network')).then(res, rej);
          let rows = (t || []).filter((r) => q.filters.every((f) => f(r)));
          if (q.order) {
            const [c, asc] = q.order;
            rows = rows.slice().sort((a, b) => (a[c] < b[c] ? -1 : a[c] > b[c] ? 1 : 0) * (asc ? 1 : -1));
          }
          if (q.lim != null) rows = rows.slice(0, q.lim);
          return Promise.resolve({ data: rows, error: null }).then(res, rej);
        },
      };
      return chain;
    },
  };
}

const TABLES = ['wardogs_ttk', 'wardogs_ballistics'];
// The 2026-11-07 baseline shape: ballistics all 2026-09-10; ttk mostly 2026-09-10 with four 2026-09-23 hand edits.
const BASE = {
  wardogs_ttk: [
    { game_slug: 'wardogs', updated_at: '2026-09-10T21:02:38.240572+00:00' },
    { game_slug: 'wardogs', updated_at: '2026-09-23T21:39:02+00:00' },
    { game_slug: 'marathon', updated_at: '2025-01-01T00:00:00+00:00' },
  ],
  wardogs_ballistics: [{ game_slug: 'wardogs', updated_at: '2026-09-10T21:02:38.240572+00:00' }],
};
const S2 = { game_slug: 'wardogs', patch_key: 'season-2', title: 'Season 2', released_on: '2026-10-14', source_url: 'https://patchbot.io/games/wardogs/articles/1783-season-02-patch-notes', source_label: 'PatchBot' };

test('stale: the Season 2 patch (2026-10-14) postdates the oldest combat row (2026-09-10)', async () => {
  const log = [];
  const f = await getDataFreshness(fakeClient({ ...BASE, game_patches: [S2] }, log), 'wardogs', TABLES);
  assert.equal(f.state, 'stale');
  assert.equal(f.dataAsOf, '2026-09-10', 'the OLDEST row, not the 2026-09-23 edits');
  assert.deepEqual(f.latestPatch, { label: 'Season 2', patchKey: 'season-2', releasedAt: '2026-10-14', sourceUrl: S2.source_url, sourceLabel: 'PatchBot' });
  // every read is scoped to the game; table reads ascend; the patch read descends
  for (const q of log) assert.deepEqual(q.eqs, [['game_slug', 'wardogs']], q.name);
  assert.deepEqual(log.map((q) => q.name), ['wardogs_ttk', 'wardogs_ballistics', 'game_patches']);
  assert.deepEqual(log[0].order, ['updated_at', true]);
  assert.deepEqual(log[2].order, ['released_on', false]);
});

test('current: every combat row was written on or after the newest patch day', async () => {
  const fresh = {
    wardogs_ttk: [{ game_slug: 'wardogs', updated_at: '2026-10-20T10:00:00Z' }],
    wardogs_ballistics: [{ game_slug: 'wardogs', updated_at: '2026-10-14T23:59:00Z' }],
  };
  const f = await getDataFreshness(fakeClient({ ...fresh, game_patches: [S2] }), 'wardogs', TABLES);
  assert.equal(f.state, 'current');
  assert.equal(f.dataAsOf, '2026-10-14', 'same day as the patch counts as current');
});

test('a partial reload after the patch stays stale (the oldest row decides)', async () => {
  const partial = { ...BASE, wardogs_ttk: BASE.wardogs_ttk.concat([{ game_slug: 'wardogs', updated_at: '2026-11-01T00:00:00Z' }]) };
  const f = await getDataFreshness(fakeClient({ ...partial, game_patches: [S2] }), 'wardogs', TABLES);
  assert.equal(f.state, 'stale');
});

test('the newest patch wins; rows with no release date are ignored', async () => {
  const patches = [S2, { ...S2, patch_key: 'hotfix', title: 'Hotfix', released_on: '2026-09-01' }, { ...S2, patch_key: 'tba', title: 'TBA', released_on: null }];
  const f = await getDataFreshness(fakeClient({ ...BASE, game_patches: patches }), 'wardogs', TABLES);
  assert.equal(f.latestPatch.patchKey, 'season-2');
  const old = await getDataFreshness(fakeClient({ ...BASE, game_patches: [patches[1], patches[2]] }), 'wardogs', TABLES);
  assert.equal(old.state, 'current', 'a patch before the data is not stale');
});

test('unknown: no patch rows (the ledger today), other games\' patches do not count', async () => {
  const f = await getDataFreshness(fakeClient({ ...BASE, game_patches: [] }), 'wardogs', TABLES);
  assert.deepEqual(f, { state: 'unknown', latestPatch: null, dataAsOf: '2026-09-10' });
  const other = await getDataFreshness(fakeClient({ ...BASE, game_patches: [{ ...S2, game_slug: 'marathon' }] }), 'wardogs', TABLES);
  assert.equal(other.state, 'unknown');
});

test('unknown: a combat table with no rows for the game', async () => {
  const f = await getDataFreshness(fakeClient({ ...BASE, wardogs_ballistics: [], game_patches: [S2] }), 'wardogs', TABLES);
  assert.equal(f.state, 'unknown');
});

test('DB error: an error result, a rejected query, or a throwing client all return unknown, never throw', async () => {
  for (const bad of [
    { ...BASE, game_patches: new Error('permission denied for table game_patches') },
    { ...BASE, wardogs_ttk: new Error('relation does not exist'), game_patches: [S2] },
    { ...BASE, game_patches: 'throw' },
  ]) {
    const f = await getDataFreshness(fakeClient(bad), 'wardogs', TABLES);
    assert.deepEqual(f, { state: 'unknown', latestPatch: null, dataAsOf: null });
  }
  const throwing = { from() { throw new Error('boom'); } };
  assert.equal((await getDataFreshness(throwing, 'wardogs', TABLES)).state, 'unknown');
  assert.equal((await getDataFreshness(null, 'wardogs', TABLES)).state, 'unknown');
  assert.equal((await getDataFreshness(fakeClient(BASE), 'wardogs', [])).state, 'unknown');
  assert.equal((await getDataFreshness(fakeClient(BASE), '', TABLES)).state, 'unknown');
});

test('decideFreshness and the date helpers are pure and UTC', () => {
  assert.equal(decideFreshness(null, '2026-09-10T00:00:00Z').state, 'unknown');
  assert.equal(decideFreshness(S2, null).state, 'unknown');
  assert.equal(decideFreshness({ ...S2, released_on: 'nonsense' }, '2026-09-10').state, 'unknown');
  assert.equal(utcDay('2026-09-10T23:30:00-05:00'), '2026-09-11', 'converted to UTC');
  assert.equal(utcDay('2026-10-14'), '2026-10-14');
  assert.equal(utcDay(''), null);
  assert.equal(longDate('2026-10-14'), 'October 14, 2026');
  assert.equal(monthYear('2026-09-10T21:02:38Z'), 'September 2026');
  assert.equal(shortDate('2026-09-10'), 'Sep 10, 2026');
  assert.equal(longDate(null), null);
});
