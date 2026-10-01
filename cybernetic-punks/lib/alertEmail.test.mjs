// lib/alertEmail.test.mjs
// Guards the PURE per-editor alert body rendering (2026-09-28): each configured editor shows generated /
// FAILED (with error) / skipped-with-reason, driven by results + context.skipReasons. No mail is sent --
// perEditorStatusLines is pure. Run: node --import ./scripts/ext-resolve.register.mjs --test lib/alertEmail.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { perEditorStatusLines } from './alertEmail.js';

test('real wardogs Sep 26 shape: both editors show their legitimate skip reason', () => {
  const ctx = {
    configuredRoster: ['NEXUS', 'MIRANDA'],
    skipReasons: { NEXUS: 'patch_frozen', MIRANDA: 'self_select_no_directive' },
  };
  const lines = perEditorStatusLines(ctx, []);
  assert.deepEqual(lines, [
    '  - NEXUS - skipped (patch-gated; no patch this cycle)',
    '  - MIRANDA - skipped (self-select gate; no grounded candidate)',
  ]);
});

test('attempted editors show generated / FAILED with the error', () => {
  const ctx = { configuredRoster: ['NEXUS', 'MIRANDA'], skipReasons: {} };
  const lines = perEditorStatusLines(ctx, [
    { editor: 'NEXUS', success: true },
    { editor: 'MIRANDA', success: false, error: 'body too short (40 words)' },
  ]);
  assert.deepEqual(lines, [
    '  - NEXUS - generated',
    '  - MIRANDA - FAILED: body too short (40 words)',
  ]);
});

test('FIX A: an attempted editor dedup-skipped at publish reads "skipped (...)", not FAILED', () => {
  const ctx = { configuredRoster: ['NEXUS', 'MIRANDA'], skipReasons: {} };
  const lines = perEditorStatusLines(ctx, [
    { editor: 'NEXUS', success: true },
    { editor: 'MIRANDA', success: false, skipped: true, skipReason: 'dedup_duplicate', error: 'near-duplicate vs corpus' },
  ]);
  assert.deepEqual(lines, [
    '  - NEXUS - generated',
    '  - MIRANDA - skipped (near-duplicate of existing content)',
  ]);
});

test('a configured editor with no result and no reason reads "reason unknown" (kept visible)', () => {
  const lines = perEditorStatusLines({ configuredRoster: ['NEXUS'], skipReasons: {} }, []);
  assert.deepEqual(lines, ['  - NEXUS - skipped (reason unknown)']);
});

test('an unrecognized reason is shown verbatim (not hidden)', () => {
  const lines = perEditorStatusLines({ configuredRoster: ['NEXUS'], skipReasons: { NEXUS: 'mystery' } }, []);
  assert.deepEqual(lines, ['  - NEXUS - skipped (mystery)']);
});

test('no configured roster -> empty list', () => {
  assert.deepEqual(perEditorStatusLines({}, []), []);
  assert.deepEqual(perEditorStatusLines(undefined, undefined), []);
});
