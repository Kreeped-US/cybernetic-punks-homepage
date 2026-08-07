// lib/dmz/dataOrThrow.test.mjs (named entities.test.mjs by history; tests lib/dmz/dataOrThrow.js)
// The DMZ entity-read error-vs-empty split (Finding-1 class). The fetchDmz* helpers route their
// Supabase { data, error } result through dataOrThrow, which THROWS on a genuine read error and
// returns the fallback ([]/null) on a legitimate empty. The split MUST key on res.error, never on
// row count -- else a transient read failure masquerades as the pre-launch empty state (silent 404
// / dropped sitemap URLs). Run: node --test lib/dmz/entities.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dataOrThrow } from './dataOrThrow.js';

// ── a genuine read ERROR -> THROWS (loud), for both the []-fallback and null-fallback callers ─────
test('dataOrThrow: a Supabase read error THROWS (rows caller) -- loud 500, not a silent []', () => {
  assert.throws(
    () => dataOrThrow({ data: null, error: { message: 'connection reset' } }, 'dmz_keys rows', []),
    /dmz_keys rows read failed: connection reset/,
  );
});

test('dataOrThrow: a Supabase read error THROWS (row caller) -- loud 500, not a silent 404', () => {
  assert.throws(
    () => dataOrThrow({ data: null, error: { message: 'timeout' } }, 'dmz_keys row (slug=x)', null),
    /dmz_keys row \(slug=x\) read failed: timeout/,
  );
});

// ── a LEGITIMATE EMPTY (no error, no rows) -> the fallback, NEVER a throw ──────────────────────────
test('dataOrThrow: a legitimate empty list (no error, no rows) -> [] (renders empty, not a 500)', () => {
  assert.deepEqual(dataOrThrow({ data: [], error: null }, 'dmz_keys rows', []), []);
  // maybeSingle on zero rows returns data:null, error:null -> still the [] fallback for a list read.
  assert.deepEqual(dataOrThrow({ data: null, error: null }, 'dmz_keys rows', []), []);
});

test('dataOrThrow: a legitimate missing row (no error, null data) -> null (route notFound, not a 500)', () => {
  assert.equal(dataOrThrow({ data: null, error: null }, 'dmz_keys row (slug=x)', null), null);
});

// ── rows present -> returned through unchanged (the split does not disturb the happy path) ─────────
test('dataOrThrow: rows present (no error) -> the data, unchanged', () => {
  const rows = [{ slug: 'a', name: 'Alpha', verified: true }];
  assert.deepEqual(dataOrThrow({ data: rows, error: null }, 'dmz_keys rows', []), rows);
});

test('dataOrThrow: one row present (no error) -> the row, unchanged', () => {
  const row = { slug: 'a', name: 'Alpha', verified: true };
  assert.deepEqual(dataOrThrow({ data: row, error: null }, 'dmz_keys row (slug=a)', null), row);
});

// ── the split keys on res.error, NOT on row count: a non-empty result with an error still THROWS ──
test('dataOrThrow: error set WINS even if data is somehow non-null -> THROWS (keys on the error object)', () => {
  assert.throws(
    () => dataOrThrow({ data: [{ slug: 'partial' }], error: { message: 'partial read' } }, 'dmz_keys rows', []),
    /read failed: partial read/,
  );
});
