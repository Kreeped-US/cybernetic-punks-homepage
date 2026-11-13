// lib/games/marathonHold.test.mjs
// Brief 381 (2026-11-13): Marathon sets editorial.holdForReview:true, so every Marathon cron draft is
// held for operator review INDEPENDENT of STORE_ROW_CITATION_ENABLED. Pure: no model call, no DB, no network.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { marathon } from './marathon.js';
import { heldForReviewAppliesForGame, heldPublishState } from '../content/heldForReview.js';
import { decideGate } from '../gsc/prePublishGate.js';

test('Marathon config: editorial.holdForReview is true', () => {
  assert.equal(marathon.editorial.holdForReview, true);
  assert.equal(marathon.prePublishGate, 'log-only', 'gate mode unchanged');
  assert.deepEqual(marathon.editorial.editors, ['NEXUS', 'MIRANDA'], 'roster unchanged');
});

test('Marathon drafts are held with the env flag OFF and ON, for NEXUS, MIRANDA and any other editor', () => {
  for (const flagOn of [false, true]) {
    for (const editor of ['NEXUS', 'MIRANDA', 'CIPHER', 'DEXTER', 'GHOST']) {
      assert.equal(heldForReviewAppliesForGame(editor, flagOn, marathon), true, editor + ' flag=' + flagOn);
    }
  }
});

test('flag OFF: a Marathon draft the log-only gate would publish lands as the held draft shape', () => {
  // Mirrors processEditor (app/api/cron/route.js): gate decision first, then the held override.
  const d = decideGate([], 'log-only', false);
  const insertData = { is_published: d.is_published, gate_status: d.gate_status };
  assert.equal(insertData.is_published, true, 'log-only alone would publish');
  if (heldForReviewAppliesForGame('NEXUS', false, marathon)) Object.assign(insertData, heldPublishState());
  assert.deepEqual(insertData, { is_published: false, gate_status: 'clear' });
});

test('cron source: the held override reads the game config at the insert site', () => {
  const src = readFileSync(new URL('../../app/api/cron/route.js', import.meta.url), 'utf8');
  assert.match(src, /var heldForReview = heldForReviewAppliesForGame\(editorName, storeRowCitationEnabled\(\), PRODUCING_GAME\);/);
});

test("gate-release only touches gate_status='held' rows, never the held-for-review draft state ('clear')", () => {
  const src = readFileSync(new URL('../gsc/releaseHeld.js', import.meta.url), 'utf8');
  assert.match(src, /\.eq\('gate_status', 'held'\)/);
  assert.match(src, /\.eq\('id', row\.id\)\.eq\('gate_status', 'held'\)/);
  assert.equal(heldPublishState().gate_status, 'clear');
});
