// lib/dmz/buildsHub.test.mjs
// The /dmz/builds hub's pure logic: row shaping (indexable entries -> DmzEntityHub cards) + the
// row-count honesty gate. Proves the two render outcomes the hub must get right:
//   - PRE-LAUNCH (0 indexable) -> [] rows (DmzEntityHub renders its empty-state) + noindex robots.
//   - SIMULATED-VERIFIED (>= 1 indexable) -> a verified card row + index robots (undefined).
// Run: node --test lib/dmz/buildsHub.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildHubRows, buildHubRobots, titleCase } from './buildsHub.js';

// ── row shaping ───────────────────────────────────────────────────────────────────────────────
test('buildHubRows: an indexable entry -> a DmzEntityHub card row { name, slug, verified:true }', () => {
  const rows = buildHubRows([{ weaponSlug: 'kastov-762', weaponName: 'Kastov 762', updatedAt: '2026-10-24T00:00:00Z' }]);
  assert.deepEqual(rows, [{ name: 'Kastov 762', slug: 'kastov-762', verified: true }]);
});

test('buildHubRows: every card is verified:true (indexable => fully verified; no partial/amber)', () => {
  const rows = buildHubRows([
    { weaponSlug: 'a', weaponName: 'Alpha', updatedAt: 'x' },
    { weaponSlug: 'b', weaponName: 'Bravo', updatedAt: 'y' },
  ]);
  assert.ok(rows.every((r) => r.verified === true), 'the "Unconfirmed" branch never fires on the builds hub');
});

test('buildHubRows: PRE-LAUNCH (0 indexable) -> [] -> DmzEntityHub empty-state', () => {
  assert.deepEqual(buildHubRows([]), []);
  assert.deepEqual(buildHubRows(null), [], 'null-safe');
});

test('buildHubRows: a missing weaponName falls back to a title-cased slug (defensive)', () => {
  const rows = buildHubRows([{ weaponSlug: 'm13-b', weaponName: null, updatedAt: 'x' }]);
  assert.equal(rows[0].name, 'M13 B');
});

test('titleCase: slug -> Title Case', () => {
  assert.equal(titleCase('kastov-762'), 'Kastov 762');
  assert.equal(titleCase(''), '');
});

// ── the row-count honesty gate ──────────────────────────────────────────────────────────────────
test('buildHubRobots: 0 indexable -> noindex,follow (pre-launch hub is thin -> not indexed)', () => {
  assert.deepEqual(buildHubRobots(0), { index: false, follow: true });
});

test('buildHubRobots: >= 1 indexable -> undefined (index:true inherited -> the hub indexes at launch)', () => {
  assert.equal(buildHubRobots(1), undefined);
  assert.equal(buildHubRobots(9), undefined);
});
