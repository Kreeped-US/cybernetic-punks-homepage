// lib/content/tierSnapshots.test.mjs
// meta_tier_snapshots row builder: rows without a tier are skipped (the column is NOT NULL and
// one null row used to fail the whole batch). Run: node --test lib/content/tierSnapshots.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTierSnapshotRows } from './tierSnapshots.js';

const R = (name, type, tier) => ({ name, type, tier, trend: tier == null ? null : 'stable', note: '' });

test('mixed set: only rows with a tier are kept; null and empty tiers are reported as skipped', () => {
  const meta = [R('Recon', 'shell', 'A'), R('Rook', 'shell', null), R('Sentinel', 'shell', null), R('Magnum MC', 'weapon', 'B'), R('Odd', 'weapon', '  ')];
  const out = buildTierSnapshotRows(meta, 'marathon', '2026-10-07T19:02:00.000Z');
  assert.deepEqual(out.rows, [
    { game_slug: 'marathon', entity: 'Recon', entity_type: 'shell', tier: 'A', regrade_id: '2026-10-07T19:02:00.000Z' },
    { game_slug: 'marathon', entity: 'Magnum MC', entity_type: 'weapon', tier: 'B', regrade_id: '2026-10-07T19:02:00.000Z' },
  ]);
  assert.deepEqual(out.skipped, ['Rook', 'Sentinel', 'Odd']);
});

test('all-null set: inserts nothing, does not throw', () => {
  const out = buildTierSnapshotRows([R('Rook', 'shell', null), R('Sentinel', 'shell', undefined)], 'marathon', 'x');
  assert.deepEqual(out.rows, []);
  assert.deepEqual(out.skipped, ['Rook', 'Sentinel']);
});

test('all-valid set: unchanged shape, one row per item, nothing skipped', () => {
  const meta = [R('Thief', 'shell', 'S'), R('Repeater HPR', 'weapon', 'B'), R('Biotoxic Disinjector', 'weapon', 'C')];
  const out = buildTierSnapshotRows(meta, 'marathon', 'rid');
  assert.equal(out.rows.length, 3);
  assert.deepEqual(out.skipped, []);
  out.rows.forEach((row, i) => assert.deepEqual(row, { game_slug: 'marathon', entity: meta[i].name, entity_type: meta[i].type, tier: meta[i].tier, regrade_id: 'rid' }));
});

test('no tier is invented: a skipped row never appears with a placeholder letter', () => {
  const out = buildTierSnapshotRows([R('Rook', 'shell', null)], 'marathon', 'rid');
  assert.equal(out.rows.some((r) => r.entity === 'Rook'), false);
});

test('empty or missing input: no rows, no throw; game slug comes from the caller', () => {
  assert.deepEqual(buildTierSnapshotRows([], 'marathon', 'r'), { rows: [], skipped: [] });
  assert.deepEqual(buildTierSnapshotRows(null, 'marathon', 'r'), { rows: [], skipped: [] });
  assert.equal(buildTierSnapshotRows([R('X', 'weapon', 'A')], 'othergame', 'r').rows[0].game_slug, 'othergame');
});
