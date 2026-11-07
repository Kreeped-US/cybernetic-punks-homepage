// lib/games/sourceClassification.test.mjs
// Brief 320: the game-agnostic weapon classification by data source. Synthetic registry (no game names) so the
// generic logic is tested on its own; the Wardogs wiring is tested in lib/wardogs/partialFreshness.test.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyBySource, classifyRows, sourceEntryOf } from './sourceClassification.js';

const REG = [
  { key: 'old', match: /^Old lab\b/, creditLabel: 'Old lab (attributed)', sourceDate: '2026-09-10' },
  { key: 'new', match: /^New sheet\b/, creditLabel: 'New sheet (attributed)', sourceDate: '2026-10-30' },
];
const P = { label: 'Patch A', patchKey: 'a', releasedAt: '2026-10-14' };
const r = (w, src, n = 2) => Array.from({ length: n }, () => ({ weapon_name: w, verified_source: src }));

test('sourceEntryOf: first matching entry, null for anything else', () => {
  assert.equal(sourceEntryOf(REG, 'Old lab run 3').key, 'old');
  assert.equal(sourceEntryOf(REG, 'New sheet v2').key, 'new');
  for (const x of [null, '', 'Someone else', 42]) assert.equal(sourceEntryOf(REG, x), null);
  assert.equal(sourceEntryOf(null, 'Old lab'), null);
});

test('none updated: every weapon still old (the state before an apply)', () => {
  const c = classifyBySource([...r('B', 'Old lab'), ...r('A', 'Old lab')], REG, P);
  assert.equal(c.state, 'none');
  assert.deepEqual([c.total, c.updated, c.stillOld], [2, [], ['A', 'B']], 'names sorted');
  assert.deepEqual(c.oldSources.map((e) => e.key), ['old']);
  assert.equal(c.newestSource.key, 'old');
  assert.equal(c.newestUpdatedSource, null);
  assert.equal(c.allNamed, true);
});

test('some updated: a weapon with ANY row from a source on/after the patch is updated; the rest still old', () => {
  const c = classifyBySource([...r('A', 'Old lab'), ...r('A', 'New sheet'), ...r('B', 'New sheet'), ...r('C', 'Old lab')], REG, P);
  assert.equal(c.state, 'some');
  assert.deepEqual([c.updated, c.stillOld], [['A', 'B'], ['C']]);
  assert.equal(c.weapons.A.status, 'updated', 'mixed rows -> updated');
  assert.deepEqual(c.weapons.A.entries.map((e) => e.key), ['old', 'new']);
  assert.equal(c.newestUpdatedSource.key, 'new');
  assert.deepEqual(c.oldSources.map((e) => e.key), ['old'], 'sources of the still-old weapons only');
});

test('all updated', () => {
  const c = classifyBySource([...r('A', 'New sheet'), ...r('B', 'Old lab'), ...r('B', 'New sheet')], REG, P);
  assert.equal(c.state, 'all');
  assert.deepEqual(c.stillOld, []);
  assert.equal(c.newestSource.key, 'new');
});

test('unknown: no rows, no registry, no dated patch, or any row naming no entry', () => {
  assert.equal(classifyBySource([], REG, P).state, 'unknown');
  assert.equal(classifyBySource(null, REG, P).state, 'unknown');
  assert.equal(classifyBySource(r('A', 'Old lab'), [], P).state, 'unknown');
  const noPatch = classifyBySource(r('A', 'Old lab'), REG, null);
  assert.equal(noPatch.state, 'unknown');
  assert.equal(noPatch.allNamed, true, 'every row named: the newest source date is still known');
  assert.equal(noPatch.newestSource.key, 'old');
  const unnamed = classifyBySource([...r('A', 'New sheet'), ...r('B', 'Someone else')], REG, P);
  assert.equal(unnamed.state, 'unknown');
  assert.deepEqual(unnamed.unknown, ['B']);
  assert.equal(unnamed.allNamed, false);
  assert.equal(unnamed.newestSource, null, 'an unnamed row: no date claim at all');
  assert.equal(classifyRows([{ text: 'Someone else' }], REG, '2026-10-14').reason, 'unnamed-source');
});

test('patch-day edge: a source dated ON the patch day counts as updated (on or after)', () => {
  const c = classifyBySource(r('A', 'New sheet'), REG, { ...P, releasedAt: '2026-10-30' });
  assert.equal(c.state, 'all');
  const d = classifyBySource(r('A', 'New sheet'), REG, { ...P, releasedAt: '2026-10-31' });
  assert.equal(d.state, 'none', 'one day later: still old');
});

test('a later patch (hypothetical Season 3) makes the newer sheet pre-patch again', () => {
  const rows = [...r('A', 'Old lab'), ...r('A', 'New sheet'), ...r('B', 'Old lab')];
  assert.equal(classifyBySource(rows, REG, P).state, 'some');
  const s3 = classifyBySource(rows, REG, { label: 'Patch B', patchKey: 'b', releasedAt: '2027-01-20' });
  assert.equal(s3.state, 'none');
  assert.deepEqual(s3.stillOld, ['A', 'B']);
  assert.deepEqual(s3.oldSources.map((e) => e.key), ['old', 'new']);
});

test('custom field names (game-agnostic)', () => {
  const c = classifyBySource([{ item: 'X', src: 'New sheet' }], REG, P, { nameField: 'item', sourceField: 'src' });
  assert.deepEqual([c.state, c.updated], ['all', ['X']]);
});
