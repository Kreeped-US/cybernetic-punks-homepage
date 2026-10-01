// lib/content/patchCoverage.test.mjs
// FIX A (2026-10-01): patch-coverage memory. Proves the pure decisions (override active / patch-gated
// run) and the marker read+write helpers (with a tiny fake supabase). No DB, no cron invocation.
// Run: node --test lib/content/patchCoverage.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  patchOverrideActive,
  patchGatedRunDecision,
  patchAlreadyCoveredMarker,
  markPatchCovered,
  coverApprovedDraftPatch,
  PATCH_COVERED_EVENT,
} from './patchCoverage.js';

// Minimal chainable fake: select...limit/maybeSingle resolve { data, error }; insert records the row.
function makeSupabase(opts) {
  opts = opts || {};
  const inserts = [];
  const api = {
    inserts,
    from() { return api; },
    select() { return api; },
    eq() { return api; },
    gte() { return api; },
    order() { return api; },
    limit() { return Promise.resolve({ data: opts.existing || [], error: opts.readError || null }); },
    maybeSingle() { return Promise.resolve({ data: (opts.existing && opts.existing[0]) || null, error: opts.readError || null }); },
    insert(row) { inserts.push(row); return Promise.resolve({ data: null, error: opts.insertError || null }); },
  };
  return api;
}

// ── patchOverrideActive ──────────────────────────────────────────────────────
test('patchOverrideActive: active only when a patch is present AND not covered', () => {
  assert.equal(patchOverrideActive(true, false), true);   // uncovered patch -> inject override
  assert.equal(patchOverrideActive(true, true), false);   // covered patch -> suppress
  assert.equal(patchOverrideActive(false, false), false); // no patch -> nothing to inject
});

// ── patchGatedRunDecision ────────────────────────────────────────────────────
const GATED = ['NEXUS'];

test('not patch-gated -> always runs (this gate says nothing about it)', () => {
  const d = patchGatedRunDecision({ editorName: 'MIRANDA', editorsRequiringPatch: GATED, hasPatch: true, patchAlreadyCovered: true });
  assert.deepEqual(d, { run: true, skipReason: null });
});

test('UNCOVERED patch -> patch-gated editor runs (unchanged behaviour)', () => {
  const d = patchGatedRunDecision({ editorName: 'NEXUS', editorsRequiringPatch: GATED, hasPatch: true, patchAlreadyCovered: false });
  assert.deepEqual(d, { run: true, skipReason: null });
});

test('no patch -> patch_frozen (unchanged behaviour)', () => {
  const d = patchGatedRunDecision({ editorName: 'NEXUS', editorsRequiringPatch: GATED, hasPatch: false, patchAlreadyCovered: false });
  assert.deepEqual(d, { run: false, skipReason: 'patch_frozen' });
});

test('COVERED patch, no human directive -> skip patch_already_covered', () => {
  const d = patchGatedRunDecision({ editorName: 'NEXUS', editorsRequiringPatch: GATED, hasPatch: true, patchAlreadyCovered: true });
  assert.deepEqual(d, { run: false, skipReason: 'patch_already_covered' });
});

test('COVERED patch WITH a human directive -> still runs (covered patch is not the SOLE reason)', () => {
  const d = patchGatedRunDecision({ editorName: 'NEXUS', editorsRequiringPatch: GATED, hasPatch: true, patchAlreadyCovered: true, hasHumanDirective: true });
  assert.deepEqual(d, { run: true, skipReason: null });
});

// ── patchAlreadyCoveredMarker ────────────────────────────────────────────────
test('marker exists -> true; absent -> false', async () => {
  assert.equal(await patchAlreadyCoveredMarker(makeSupabase({ existing: [{ id: 1 }] }), 'wardogs', 'patch 0.1.2'), true);
  assert.equal(await patchAlreadyCoveredMarker(makeSupabase({ existing: [] }), 'wardogs', 'patch 0.1.2'), false);
});

test('read error -> FAIL-CLOSED true (a DB blip must not cause a re-cover)', async () => {
  assert.equal(await patchAlreadyCoveredMarker(makeSupabase({ readError: { message: 'boom' } }), 'wardogs', 'patch 0.1.2'), true);
});

test('falsy patch_key -> false, no read attempted', async () => {
  assert.equal(await patchAlreadyCoveredMarker(makeSupabase({ existing: [{ id: 1 }] }), 'wardogs', null), false);
});

// ── markPatchCovered ─────────────────────────────────────────────────────────
test('markPatchCovered: no existing marker -> inserts the correct row', async () => {
  const sb = makeSupabase({ existing: [] });
  const r = await markPatchCovered(sb, 'wardogs', 'patch 0.1.2', { via: 'cron', title: 'PATCH 0.1.2' });
  assert.deepEqual(r, { marked: true });
  assert.equal(sb.inserts.length, 1);
  assert.equal(sb.inserts[0].game_slug, 'wardogs');
  assert.equal(sb.inserts[0].event_name, PATCH_COVERED_EVENT);
  assert.equal(sb.inserts[0].event_data.patch_key, 'patch 0.1.2');
  assert.equal(sb.inserts[0].event_data.via, 'cron');
});

test('markPatchCovered: existing marker -> no duplicate insert', async () => {
  const sb = makeSupabase({ existing: [{ id: 7 }] });
  const r = await markPatchCovered(sb, 'wardogs', 'patch 0.1.2', { via: 'cron' });
  assert.deepEqual(r, { marked: false, reason: 'already-marked' });
  assert.equal(sb.inserts.length, 0);
});

test('markPatchCovered: falsy patch_key -> no insert', async () => {
  const sb = makeSupabase({ existing: [] });
  const r = await markPatchCovered(sb, 'wardogs', '', { via: 'cron' });
  assert.deepEqual(r, { marked: false, reason: 'no-patch-key' });
  assert.equal(sb.inserts.length, 0);
});

// ── coverApprovedDraftPatch (the /api/admin/drafts/approve hook) ──────────────
test('approve hook: draft WITH patch_key -> writes the marker', async () => {
  const sb = makeSupabase({ existing: [] });
  const r = await coverApprovedDraftPatch(sb, { id: 42, game_slug: 'wardogs', patch_key: 'patch 0.1.2' });
  assert.deepEqual(r, { marked: true });
  assert.equal(sb.inserts.length, 1);
  assert.equal(sb.inserts[0].event_data.patch_key, 'patch 0.1.2');
  assert.equal(sb.inserts[0].event_data.via, 'approve');
  assert.equal(sb.inserts[0].event_data.feed_item_id, 42);
});

test('approve hook: draft WITHOUT patch_key -> no marker written', async () => {
  const sb = makeSupabase({ existing: [] });
  const r = await coverApprovedDraftPatch(sb, { id: 42, game_slug: 'wardogs', patch_key: null });
  assert.deepEqual(r, { marked: false, reason: 'no-patch-key' });
  assert.equal(sb.inserts.length, 0);
});
