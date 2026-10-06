// lib/games/marathonSelfSelect.test.mjs
// Marathon MIRANDA self-select PAUSED 2026-10-06 until the 2026-10-20 checkpoint. The cron skips MIRANDA
// (self_select_no_directive) when she has no directive and allowSelfSelect !== true (app/api/cron/route.js
// activeRoster filter). These tests pin the config and how such a run is classified. Run inside the suite.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { marathon } from './marathon.js';
import { classifyCronOutcome, freezeExplainsZero } from '../cronOutcomeDecision.mjs';

test('Marathon self-select is paused (allowSelfSelect is not true)', () => {
  assert.notEqual(marathon.editorial.allowSelfSelect, true, 'paused until the 2026-10-20 checkpoint');
});

test('MIRANDA stays on the Marathon roster and is not patch-gated, so queue/human topics still run', () => {
  assert.ok(marathon.editorial.editors.includes('MIRANDA'), 'MIRANDA in editors[]');
  assert.equal((marathon.editorial.editorsRequiringPatch || []).includes('MIRANDA'), false, 'MIRANDA not patch-gated');
});

test('empty-queue day with no patch: MIRANDA + NEXUS both skipped -> frozen, no alert', () => {
  const ctx = {
    configuredRoster: marathon.editorial.editors,
    patchGated: marathon.editorial.editorsRequiringPatch,
    hasPatch: false,
    activeRoster: [],
    skipReasons: { NEXUS: 'patch_frozen', MIRANDA: 'self_select_no_directive' },
  };
  assert.equal(freezeExplainsZero(ctx), true);
  const out = classifyCronOutcome([], ctx);
  assert.equal(out.kind, 'frozen');
  assert.equal(out.alert, false);
});

test('empty-queue day with a patch: MIRANDA skipped, NEXUS succeeds -> all_succeeded, no alert', () => {
  const ctx = {
    configuredRoster: marathon.editorial.editors,
    patchGated: marathon.editorial.editorsRequiringPatch,
    hasPatch: true,
    activeRoster: ['NEXUS'],
    skipReasons: { MIRANDA: 'self_select_no_directive' },
  };
  const out = classifyCronOutcome([{ editor: 'NEXUS', success: true }], ctx);
  assert.equal(out.kind, 'all_succeeded');
  assert.equal(out.alert, false);
});
