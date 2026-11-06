// lib/advisor/advisorLabel.test.mjs
// Brief 293: the /api/advisor response body is { build, label }, where label comes from the SAME
// loadBuildLabel the stored build pages use, and is null (never a default Unconfirmed) with a logged
// reason when it cannot be computed. A fake Supabase client stands in for the 5 part lookups; no DB,
// no network, no model call.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { withBuildLabel } from './advisorLabel.js';
import { loadBuildLabel } from '../marathon/buildLabel.js';

const BUILD = {
  shell: 'Thief',
  primary_weapon: { name: 'Overrun AR' },
  secondary_weapon: { name: 'Magnum MC' },
  mods: [{ name: 'Cloudborn (Standard)' }],
  cores: [{ name: 'Ghost Step' }],
  implants: [{ name: 'Energy Harvesting V4 (Superior)' }],
  cradle: { summary: 'x', tracks: [] },
};
const OK = (name) => ({ name, verified: true, verified_source: 'owner in-game observation 2026-10-01' });
const ALL_OK = {
  shell_stats: [OK('Thief')],
  weapon_stats: [OK('Overrun AR'), OK('Magnum MC')],
  mod_stats: [OK('Cloudborn')],
  core_stats: [OK('Ghost Step')],
  implant_stats: [OK('Energy Harvesting V4')],
};
const NOW = new Date('2026-11-06T18:00:00Z');

// Fake supabase-js chain: from(t).select(c).eq('game_slug','marathon').in('name', names) -> { data, error }.
function fakeSupabase(tables, opts) {
  const o = opts || {};
  const calls = [];
  return {
    calls,
    from(table) {
      const rec = { table };
      calls.push(rec);
      const q = {
        select(cols) { rec.cols = cols; return q; },
        eq(col, val) { rec.eq = [col, val]; return q; },
        in(col, names) {
          rec.in = [col, names];
          if (o.throwOn === table) return Promise.reject(new Error('boom'));
          if (o.errorOn === table) return Promise.resolve({ data: null, error: { message: 'fake error' } });
          return Promise.resolve({ data: tables[table] || [], error: null });
        },
      };
      return q;
    },
  };
}

test('response body is exactly { build, label } with the computed label', async () => {
  const logs = [];
  const body = await withBuildLabel(fakeSupabase(ALL_OK), BUILD, { now: NOW, log: (m) => logs.push(m) });
  assert.deepEqual(Object.keys(body).sort(), ['build', 'label']);
  assert.equal(body.build, BUILD);
  assert.deepEqual(body.label, { tier: 'verified', verified: 6, total: 6, checkedOn: 'November 6, 2026' });
  assert.deepEqual(logs, []);
});

test('same function as the stored pages: identical label for identical rows', async () => {
  const rows = Object.assign({}, ALL_OK, { core_stats: [] }); // a part with no row -> Unconfirmed tier
  const body = await withBuildLabel(fakeSupabase(rows), BUILD, { now: NOW, log: () => {} });
  const direct = await loadBuildLabel(fakeSupabase(rows), BUILD, NOW);
  assert.deepEqual(body.label, direct);
  assert.deepEqual(body.label, { tier: 'pending', verified: 5, total: 6, checkedOn: 'November 6, 2026' });
});

test('lookups are scoped to Marathon and the 5 part tables', async () => {
  const sb = fakeSupabase(ALL_OK);
  await withBuildLabel(sb, BUILD, { now: NOW, log: () => {} });
  assert.deepEqual(sb.calls.map((c) => c.table).sort(), ['core_stats', 'implant_stats', 'mod_stats', 'shell_stats', 'weapon_stats']);
  for (const c of sb.calls) assert.deepEqual(c.eq, ['game_slug', 'marathon']);
});

test('a failed lookup gives label null (no default tier) and logs the failure', async () => {
  const logs = [];
  const body = await withBuildLabel(fakeSupabase(ALL_OK, { errorOn: 'mod_stats' }), BUILD, { now: NOW, log: (m) => logs.push(m) });
  assert.equal(body.label, null);
  assert.equal(body.build, BUILD);
  assert.equal(logs.length, 1);
  assert.match(logs[0], /build label not computed \(part lookup failed\)/);
});

test('a thrown lookup also gives label null and is logged, never thrown', async () => {
  const logs = [];
  const body = await withBuildLabel(fakeSupabase(ALL_OK, { throwOn: 'weapon_stats' }), BUILD, { now: NOW, log: (m) => logs.push(m) });
  assert.equal(body.label, null);
  assert.equal(logs.length, 1);
});

test('a build that names no parts gives label null with its own logged reason', async () => {
  const logs = [];
  const body = await withBuildLabel(fakeSupabase(ALL_OK), { cradle: {} }, { now: NOW, log: (m) => logs.push(m) });
  assert.equal(body.label, null);
  assert.match(logs[0], /build names no parts/);
});

test('/api/advisor returns the withBuildLabel body after generateBuild, through the service client', () => {
  const src = readFileSync(path.resolve('app/api/advisor/route.js'), 'utf8');
  assert.ok(src.includes("import { withBuildLabel } from '@/lib/advisor/advisorLabel';"));
  const gen = src.indexOf('await generateBuild({');
  const lab = src.indexOf('const payload = await withBuildLabel(gateSupabase, build);');
  const ret = src.indexOf('return Response.json(payload, {');
  assert.ok(gen > 0 && lab > gen && ret > lab, 'generateBuild -> withBuildLabel -> response');
  assert.ok(!src.includes('Response.json({ build }'), 'the build is no longer returned without its label');
});
