// lib/content/heldForReview.test.mjs
// STEP 4: held-for-review applicability + the publish-state override. Pure logic;
// the cron applies it at the inline insert. Run: node --test lib/content/heldForReview.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { heldForReviewApplies, heldPublishState, HELD_EDITORS } from './heldForReview.js';

test('heldForReviewApplies: ON + NEXUS -> true (armed reasoning editor is reviewed first)', () => {
  assert.equal(heldForReviewApplies('NEXUS', true), true);
});

test('heldForReviewApplies: flag OFF -> false for everyone (byte-identical to today)', () => {
  assert.equal(heldForReviewApplies('NEXUS', false), false);
  assert.equal(heldForReviewApplies('CIPHER', false), false);
  assert.equal(heldForReviewApplies('MIRANDA', false), false);
});

test('heldForReviewApplies: ON but a non-reasoning editor -> false (scoped to NEXUS)', () => {
  assert.equal(heldForReviewApplies('CIPHER', true), false);
  assert.equal(heldForReviewApplies('DEXTER', true), false);
  assert.equal(heldForReviewApplies('GHOST', true), false);
  assert.equal(heldForReviewApplies('MIRANDA', true), false);
});

test('heldForReviewApplies: falsy/garbage inputs -> false (never throws)', () => {
  assert.equal(heldForReviewApplies('NEXUS', undefined), false);
  assert.equal(heldForReviewApplies('NEXUS', null), false);
  assert.equal(heldForReviewApplies(undefined, true), false);
  assert.equal(heldForReviewApplies('', true), false);
});

test('heldPublishState: is_published=false + gate_status=clear (DRAFT state, NEVER "held")', () => {
  const hp = heldPublishState();
  assert.equal(hp.is_published, false);
  assert.equal(hp.gate_status, 'clear', 'MUST be clear -- "held" would auto-release + hide from drafts');
  assert.notEqual(hp.gate_status, 'held');
});

test('HELD_EDITORS: the reasoning editor set is [NEXUS] (the only active producer)', () => {
  assert.deepEqual(HELD_EDITORS, ['NEXUS']);
});

test('the override applied over gate-driven values yields the held draft shape', () => {
  // simulate the processEditor override: gate says publish (Marathon log-only), held overrides it.
  const insertData = { is_published: true, gate_status: 'clear' }; // gate-driven (Marathon)
  if (heldForReviewApplies('NEXUS', true)) Object.assign(insertData, heldPublishState());
  assert.deepEqual(insertData, { is_published: false, gate_status: 'clear' });
});
