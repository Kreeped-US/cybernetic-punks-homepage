// lib/advisor/buildStaleness.test.mjs
// Brief 302: the build-refresh staleness check reads MAX(updated_at) from one game's rows only, so a newer
// Wardogs or Bodycam row no longer marks Marathon builds stale. A build whose source_updated_at equals the
// Marathon max is not stale (strict <), including timestamps with microseconds. No DB, no model call.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { contextMax, staleBuilds, CONTEXT_TABLES } from './buildStaleness.js';

// Fake supabase client: from(table).select().eq(col, v).order(col, {ascending}).limit(n) over in-memory rows.
function fakeSupabase(tables) {
  return {
    from(table) {
      let rows = (tables[table] || []).slice();
      const q = {
        select() { return q; },
        eq(col, v) { rows = rows.filter((r) => r[col] === v); return q; },
        order(col, opts) {
          const asc = !(opts && opts.ascending === false);
          rows.sort((a, b) => (a[col] < b[col] ? -1 : a[col] > b[col] ? 1 : 0) * (asc ? 1 : -1));
          return q;
        },
        limit(n) { return Promise.resolve({ data: rows.slice(0, n), error: null }); },
      };
      return q;
    },
  };
}

// The Nov 7 production state (newest row per table and game).
const NOV7 = {
  weapon_stats: [
    { game_slug: 'wardogs', updated_at: '2026-10-26T21:23:53.46154+00:00' },
    { game_slug: 'bodycam', updated_at: '2026-10-08T20:29:34+00:00' },
    { game_slug: 'marathon', updated_at: '2026-10-08T16:40:00.260427+00:00' },
  ],
  shell_stats: [{ game_slug: 'marathon', updated_at: '2026-10-06T20:50:43+00:00' }],
  mod_stats: [{ game_slug: 'marathon', updated_at: '2026-07-16T00:00:00+00:00' }],
  core_stats: [{ game_slug: 'marathon', updated_at: '2026-06-05T00:00:00+00:00' }],
  implant_stats: [{ game_slug: 'marathon', updated_at: '2026-06-05T00:00:00+00:00' }],
};

test('contextMax ignores newer Wardogs and Bodycam rows and returns the Marathon max', async () => {
  assert.equal(await contextMax(fakeSupabase(NOV7), 'marathon'), '2026-10-08T16:40:00.260427+00:00');
  assert.deepEqual(CONTEXT_TABLES, ['shell_stats', 'weapon_stats', 'mod_stats', 'core_stats', 'implant_stats']);
});

test('a newer non-Marathon row does NOT mark a Marathon build stale', async () => {
  const max = await contextMax(fakeSupabase(NOV7), 'marathon');
  const builds = [{ slug: 'assassin', source_updated_at: '2026-10-08T16:40:00.260427+00:00' }];
  assert.deepEqual(staleBuilds(builds, max), []);
});

test('a newer Marathon row DOES mark the build stale', async () => {
  const tables = Object.assign({}, NOV7, {
    mod_stats: NOV7.mod_stats.concat([{ game_slug: 'marathon', updated_at: '2026-11-12T18:00:00.5+00:00' }]),
  });
  const max = await contextMax(fakeSupabase(tables), 'marathon');
  assert.equal(max, '2026-11-12T18:00:00.5+00:00');
  const builds = [{ slug: 'assassin', source_updated_at: '2026-10-08T16:40:00.260427+00:00' }];
  assert.deepEqual(staleBuilds(builds, max).map((b) => b.slug), ['assassin']);
});

test('equal to the Marathon max is NOT stale (microsecond timestamps, and Z vs +00:00)', () => {
  const max = '2026-10-08T16:40:00.260427+00:00';
  assert.deepEqual(staleBuilds([{ slug: 'a', source_updated_at: '2026-10-08T16:40:00.260427+00:00' }], max), []);
  assert.deepEqual(staleBuilds([{ slug: 'b', source_updated_at: '2026-10-08T16:40:00.260427Z' }], max), []);
  // Date.parse keeps milliseconds only: values inside the same millisecond compare equal (not stale).
  assert.deepEqual(staleBuilds([{ slug: 'c', source_updated_at: '2026-10-08T16:40:00.2601+00:00' }], max), []);
});

test('an older build is stale; a missing source_updated_at is stale', () => {
  const max = '2026-10-08T16:40:00.260427+00:00';
  const builds = [
    { slug: 'older-ms', source_updated_at: '2026-10-08T16:40:00.259+00:00' },
    { slug: 'older-day', source_updated_at: '2026-09-28T12:00:00+00:00' },
    { slug: 'none', source_updated_at: null },
  ];
  assert.deepEqual(staleBuilds(builds, max).map((b) => b.slug), ['older-ms', 'older-day', 'none']);
});

test('no context max (empty tables) -> only builds with no source_updated_at are stale', () => {
  const builds = [{ slug: 'a', source_updated_at: '2026-10-08T16:40:00+00:00' }, { slug: 'b', source_updated_at: null }];
  assert.deepEqual(staleBuilds(builds, null).map((b) => b.slug), ['b']);
});

const ROUTE = readFileSync(path.resolve('app/api/cron/build-refresh/route.js'), 'utf8');

test('the route reads the Marathon max through the shared helpers', () => {
  assert.ok(ROUTE.includes("import { contextMax, staleBuilds } from '@/lib/advisor/buildStaleness';"));
  assert.ok(ROUTE.includes("const GAME = 'marathon';"));
  assert.ok(ROUTE.includes('globalMax = await contextMax(supabase, GAME);'));
  assert.ok(ROUTE.includes('const stale = staleBuilds(builds, globalMax);'));
  assert.ok(!ROUTE.includes('async function contextMax'), 'no local copy of contextMax in the route');
});

test('route.js exports only GET and the existing dynamic config', () => {
  const exported = (ROUTE.match(/^export\s+(?:async\s+)?(?:function|const|let|var|class)\s+([A-Za-z_$][\w$]*)/gm) || [])
    .map((s) => s.replace(/^export\s+(?:async\s+)?(?:function|const|let|var|class)\s+/, ''));
  assert.deepEqual(exported.sort(), ['GET', 'dynamic']);
  assert.ok(!/^export\s*\{/m.test(ROUTE) && !/^export\s+default/m.test(ROUTE), 'no export list or default export');
});
