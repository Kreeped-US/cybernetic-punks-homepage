// Brief 282: build confidence label -- pure helpers, inline fixtures, no DB, no network.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizePartName, labelNames, computeBuildLabel, formatCheckedDate, loadBuildLabel } from './buildLabel.js';
import { citedSources } from '../advisor/generateBuild.js';

const BUILD = {
  shell: 'Thief',
  primary_weapon: { name: 'Overrun AR' },
  secondary_weapon: { name: 'Magnum MC' },
  mods: [{ name: 'Cloudborn (Standard)' }, { name: 'Cloudborn (Superior)' }],
  cores: [{ name: 'Ghost Step' }],
  implants: [{ name: 'Energy Harvesting V4 (Superior)' }],
  cradle: { summary: 'x', tracks: [{ track: 'Dexterity', perk: 'Quickdraw', energy: 40 }] },
};

const OK = (name) => ({ name, verified: true, verified_source: 'owner in-game observation 2026-10-01' });

test('normalizePartName strips one trailing parenthetical, same as citedSources', () => {
  assert.equal(normalizePartName('Cloudborn (Standard)'), 'Cloudborn');
  assert.equal(normalizePartName('Overrun AR'), 'Overrun AR');
  assert.equal(normalizePartName(null), '');
  // citedSources keeps a loaded row only when its normalized build name matches -- so it agrees with ours.
  const loaded = [{ type: 'mod', name: 'Cloudborn' }, { type: 'implant', name: 'Energy Harvesting V4' }, { type: 'mod', name: 'Other' }];
  const cited = citedSources(loaded, BUILD).map((s) => s.type + '|' + s.name).sort();
  assert.deepEqual(cited, ['implant|Energy Harvesting V4', 'mod|Cloudborn']);
  assert.deepEqual(labelNames(BUILD).mod, ['Cloudborn']);
  assert.deepEqual(labelNames(BUILD).implant, ['Energy Harvesting V4']);
});

test('labelNames de-dupes and ignores the Cradle plan', () => {
  const n = labelNames(BUILD);
  assert.deepEqual(n, { shell: ['Thief'], weapon: ['Overrun AR', 'Magnum MC'], mod: ['Cloudborn'], core: ['Ghost Step'], implant: ['Energy Harvesting V4'] });
  assert.deepEqual(labelNames(null), { shell: [], weapon: [], mod: [], core: [], implant: [] });
});

test('all parts confirmed -> verified, N of N', () => {
  const rows = { shell: [OK('Thief')], weapon: [OK('Overrun AR'), OK('Magnum MC')], mod: [OK('Cloudborn')], core: [OK('Ghost Step')], implant: [OK('Energy Harvesting V4')] };
  assert.deepEqual(computeBuildLabel(BUILD, rows), { tier: 'verified', verified: 6, total: 6 });
});

test('lowest tier wins: one source-agreed part -> attributed (Reported)', () => {
  const rows = { shell: [OK('Thief')], weapon: [OK('Overrun AR'), { name: 'Magnum MC', verified: false, verified_source: null, patch_verified: '1.1.5' }],
    mod: [OK('Cloudborn')], core: [OK('Ghost Step')], implant: [OK('Energy Harvesting V4')] };
  assert.deepEqual(computeBuildLabel(BUILD, rows), { tier: 'attributed', verified: 5, total: 6 });
});

test('unchecked row, a source that says "unverified", and a missing row all count as pending (Unconfirmed)', () => {
  const rows = { shell: [OK('Thief')], weapon: [OK('Overrun AR'), { name: 'Magnum MC', verified: true, verified_source: 'patch notes; damage unverified' }],
    mod: [{ name: 'Cloudborn', verified: false, verified_source: '', patch_verified: 's1' }], core: [], implant: [OK('Energy Harvesting V4')] };
  assert.deepEqual(computeBuildLabel(BUILD, rows), { tier: 'pending', verified: 3, total: 6 });
});

test('name match is case-insensitive; a build naming no parts gives null', () => {
  const rows = { shell: [OK('THIEF')] };
  assert.deepEqual(computeBuildLabel({ shell: 'Thief' }, rows), { tier: 'verified', verified: 1, total: 1 });
  assert.equal(computeBuildLabel({}, {}), null);
});

test('formatCheckedDate uses UTC and a long month', () => {
  assert.equal(formatCheckedDate(new Date('2026-11-03T23:59:00Z')), 'November 3, 2026');
  assert.equal(formatCheckedDate('not a date'), null);
});

// Fake Supabase query builder: records each table query and resolves with canned rows.
function fakeSupabase(byTable, failTable) {
  const calls = [];
  return {
    calls,
    from(table) {
      const q = { table, filters: [] };
      calls.push(q);
      const api = {
        select(c) { q.cols = c; return api; },
        eq(k, v) { q.filters.push(['eq', k, v]); return api; },
        in(k, v) { q.filters.push(['in', k, v]); return Promise.resolve(table === failTable ? { data: null, error: { message: 'boom' } } : { data: byTable[table] || [], error: null }); },
      };
      return api;
    },
  };
}

test('loadBuildLabel: 5 queries, one per table, scoped to marathon, with the date', async () => {
  const sb = fakeSupabase({ shell_stats: [OK('Thief')], weapon_stats: [OK('Overrun AR'), OK('Magnum MC')], mod_stats: [OK('Cloudborn')], core_stats: [OK('Ghost Step')], implant_stats: [OK('Energy Harvesting V4')] });
  const label = await loadBuildLabel(sb, BUILD, new Date('2026-11-03T12:00:00Z'));
  assert.deepEqual(label, { tier: 'verified', verified: 6, total: 6, checkedOn: 'November 3, 2026' });
  assert.deepEqual(sb.calls.map((c) => c.table), ['shell_stats', 'weapon_stats', 'mod_stats', 'core_stats', 'implant_stats']);
  for (const c of sb.calls) assert.deepEqual(c.filters[0], ['eq', 'game_slug', 'marathon']);
  assert.equal(sb.calls.find((c) => c.table === 'core_stats').cols.includes('patch_verified'), false);
});

test('loadBuildLabel fails closed: any query error -> null (no label)', async () => {
  const sb = fakeSupabase({ shell_stats: [OK('Thief')] }, 'mod_stats');
  assert.equal(await loadBuildLabel(sb, BUILD, new Date()), null);
});
