// lib/data/dataOrThrow.test.mjs
// dataOrThrow / countOrThrow: error -> throws; genuine empty -> fallback / 0; rows -> passthrough.
// Run: node --test lib/data/dataOrThrow.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dataOrThrow, countOrThrow } from './dataOrThrow.js';

test('dataOrThrow: a read error THROWS (labelled), never returns the fallback', () => {
  assert.throws(
    () => dataOrThrow({ data: null, error: { message: 'statement timeout' } }, 'wardogs article foo', null),
    /wardogs article foo read failed: statement timeout/,
  );
});

test('dataOrThrow: genuine empty (no error) -> fallback (unchanged notFound/empty behavior)', () => {
  assert.equal(dataOrThrow({ data: null, error: null }, 'x', null), null);
  assert.deepEqual(dataOrThrow({ data: null, error: null }, 'x', []), []);
  assert.deepEqual(dataOrThrow({ data: [], error: null }, 'x', []), []); // [] passes through (falsy-empty -> fallback, same [])
});

test('dataOrThrow: rows -> passthrough', () => {
  const rows = [{ id: 1 }];
  assert.equal(dataOrThrow({ data: rows, error: null }, 'x', []), rows);
  const row = { slug: 'a' };
  assert.equal(dataOrThrow({ data: row, error: null }, 'x', null), row);
});

test('countOrThrow: a count error THROWS (labelled)', () => {
  assert.throws(
    () => countOrThrow({ count: null, error: { message: 'boom' } }, 'wardogs section shells'),
    /wardogs section shells count failed: boom/,
  );
});

test('countOrThrow: genuine empty -> 0; a real count -> passthrough', () => {
  assert.equal(countOrThrow({ count: null, error: null }, 'x'), 0);
  assert.equal(countOrThrow({ count: 0, error: null }, 'x'), 0);
  assert.equal(countOrThrow({ count: 7, error: null }, 'x'), 7);
});
