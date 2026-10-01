// lib/cronOutcomeDecision.test.mjs
// Unit tests for the pure cron-alert decision core.
// Run: node --test lib/cronOutcomeDecision.test.mjs
//
// One case per row of the zero-article cause table. Plain inputs, no DB, no email --
// the core is pure, so this proves the DECISION only. Proving the Resend TRANSPORT
// still works is a SEPARATE claim, made by a one-off live send against the real env
// (see the HANDOFF entry); a green run here does not establish that an email leaves
// the building, and must not be read as if it does.
//
// SUBJECT STRINGS ARE ASSERTED VERBATIM. The subject is the only part visible without
// opening the email, so it carries the "nothing ran" vs "everything failed"
// distinction. If a future edit re-merges those two states, these assertions fail --
// which is the point. (The one EXPECTED future change is the self-skip row noted in
// cronOutcomeDecision.mjs.)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyCronOutcome, freezeExplainsZero } from './cronOutcomeDecision.mjs';

// The live Marathon shape: single-editor roster, that editor patch-gated.
var FROZEN_CTX = { configuredRoster: ['NEXUS'], patchGated: ['NEXUS'], hasPatch: false };

var ok = function (name) { return { editor: name, success: true }; };
var bad = function (name, why) { return { editor: name, success: false, error: why }; };
// A RECOGNIZED result-level skip (dedup duplicate): attempted, generated, skipped at publish.
var skip = function (name, reason) { return { editor: name, success: false, skipped: true, skipReason: reason || 'dedup_duplicate', error: 'dup' }; };

// ── A: FREEZE -- the designed zero. The false alarm this commit removes. ──
test('A frozen: no editors attempted, freeze explains it -> NO alert', () => {
  var d = classifyCronOutcome([], FROZEN_CTX);
  assert.equal(d.alert, false);
  assert.equal(d.kind, 'frozen');
  assert.equal(d.subject, null);
});

// ── B: roster empty/misconfigured -- must NOT be buried by the suppression. ──
test('B config bug: configured roster EMPTY -> ALERT none_attempted', () => {
  var d = classifyCronOutcome([], { configuredRoster: [], patchGated: [], hasPatch: false });
  assert.equal(d.alert, true);
  assert.equal(d.kind, 'none_attempted');
  assert.equal(d.subject, '[CyberneticPunks] Cron: no editors attempted (unexpected)');
});

test("B' unexplained: nothing attempted but hasPatch TRUE -> ALERT", () => {
  var d = classifyCronOutcome([], { configuredRoster: ['NEXUS'], patchGated: ['NEXUS'], hasPatch: true });
  assert.equal(d.alert, true);
  assert.equal(d.kind, 'none_attempted');
});

test('B" unexplained: an UNGATED editor exists, so it should have run -> ALERT', () => {
  var d = classifyCronOutcome([], { configuredRoster: ['NEXUS', 'VANTAGE'], patchGated: ['NEXUS'], hasPatch: false });
  assert.equal(d.alert, true);
  assert.equal(d.kind, 'none_attempted');
});

// ── FAIL LOUD: ambiguity must never suppress. ──
test('FAIL LOUD: missing context -> ALERT, never silent', () => {
  assert.equal(classifyCronOutcome([], undefined).alert, true);
  assert.equal(classifyCronOutcome([], {}).alert, true);
  assert.equal(classifyCronOutcome([], { configuredRoster: ['NEXUS'] }).alert, true);
});

test('FAIL LOUD: hasPatch must be EXPLICITLY false, not merely falsy', () => {
  assert.equal(freezeExplainsZero({ configuredRoster: ['NEXUS'], patchGated: ['NEXUS'] }), false);
  assert.equal(freezeExplainsZero({ configuredRoster: ['NEXUS'], patchGated: ['NEXUS'], hasPatch: null }), false);
  assert.equal(freezeExplainsZero({ configuredRoster: ['NEXUS'], patchGated: ['NEXUS'], hasPatch: false }), true);
});

test('FAIL LOUD: malformed results (not an array) is treated as zero-attempt', () => {
  assert.equal(classifyCronOutcome(null, FROZEN_CTX).kind, 'frozen');
  assert.equal(classifyCronOutcome(null, {}).alert, true);
});

// ── SKIP-REASON path (2026-09-28): a zero explained by RECOGNIZED legitimate per-editor skips. ──
// The real Sep 26/27 wardogs shape: NEXUS patch_frozen (no patch), MIRANDA self_select_no_directive.
var WARDOGS_SEP26 = {
  configuredRoster: ['NEXUS', 'MIRANDA'], patchGated: ['NEXUS'], hasPatch: false,
  skipReasons: { NEXUS: 'patch_frozen', MIRANDA: 'self_select_no_directive' },
};

test('SKIP legit mixed freeze (real wardogs Sep 26): patch_frozen + self_select_no_directive -> NO alert', () => {
  var d = classifyCronOutcome([], WARDOGS_SEP26);
  assert.equal(d.alert, false);
  assert.equal(d.kind, 'frozen');
  assert.equal(d.subject, null);
});

test('SKIP MIRANDA reason MISSING -> ALERT (unexplained zero stays loud)', () => {
  var ctx = { configuredRoster: ['NEXUS', 'MIRANDA'], patchGated: ['NEXUS'], hasPatch: false,
    skipReasons: { NEXUS: 'patch_frozen' } }; // MIRANDA has no recorded reason
  var d = classifyCronOutcome([], ctx);
  assert.equal(d.alert, true);
  assert.equal(d.kind, 'none_attempted');
});

test('SKIP unrecognized reason -> ALERT', () => {
  var ctx = { configuredRoster: ['NEXUS', 'MIRANDA'], hasPatch: false,
    skipReasons: { NEXUS: 'patch_frozen', MIRANDA: 'mystery_reason' } };
  assert.equal(classifyCronOutcome([], ctx).alert, true);
});

test('SKIP patch_frozen is only legitimate when hasPatch is false', () => {
  var ctx = { configuredRoster: ['NEXUS'], hasPatch: true, skipReasons: { NEXUS: 'patch_frozen' } };
  assert.equal(freezeExplainsZero(ctx), false, 'patch_frozen with a patch present is not a legit explanation');
});

// FIX A (2026-10-01): a single-editor patch-gated roster skipped because the patch is ALREADY
// COVERED -> explained zero, NO alert -- even though hasPatch is TRUE (unlike patch_frozen).
test('SKIP patch_already_covered explains a zero even with hasPatch TRUE -> NO alert', () => {
  var ctx = { configuredRoster: ['NEXUS'], patchGated: ['NEXUS'], hasPatch: true,
    skipReasons: { NEXUS: 'patch_already_covered' } };
  assert.equal(freezeExplainsZero(ctx), true);
  var d = classifyCronOutcome([], ctx);
  assert.equal(d.alert, false);
  assert.equal(d.kind, 'frozen');
});

test('SKIP empty roster still alerts even with a skipReasons object present', () => {
  assert.equal(classifyCronOutcome([], { configuredRoster: [], skipReasons: {} }).kind, 'none_attempted');
});

// ── C: attempted and all threw -- a REAL total outage. ──
test('C total outage: single attempted editor threw -> ALERT with 0/N subject', () => {
  var d = classifyCronOutcome([bad('NEXUS', 'boom')], FROZEN_CTX);
  assert.equal(d.alert, true);
  assert.equal(d.kind, 'total_outage');
  assert.equal(d.subject, '[CyberneticPunks] Cron: 0/1 editors generated (total outage)');
});

test('C total outage is NOT suppressed even when the freeze context is present', () => {
  // The context says "frozen", but editors WERE attempted -- attempts beat context.
  var d = classifyCronOutcome([bad('NEXUS', 'x'), bad('DEXTER', 'y')], FROZEN_CTX);
  assert.equal(d.alert, true);
  assert.equal(d.subject, '[CyberneticPunks] Cron: 0/2 editors generated (total outage)');
});

// ── D4: the write-failure path. The one that would catch a game_slug/NOT NULL break. ──
test('D4 insert error -> ALERT (meta_tiers-style write failure stays loud)', () => {
  var d = classifyCronOutcome([bad('NEXUS', 'null value in column "game_slug" violates not-null constraint')], FROZEN_CTX);
  assert.equal(d.alert, true);
  assert.equal(d.kind, 'total_outage');
});

// ── D3: dedup is a SKIP, not a failure (dedup-alert change, 2026-10-01). A duplicate means the topic
// is already covered -- it must NOT raise an outage/partial alert on its own. REVERSES the prior rule
// (which alerted on wholesale dedup); real failures still alert (see D3b/D3c). ──
test('D3 all dedup-skipped -> NO alert (a duplicate is a skip, not a generation failure)', () => {
  var d = classifyCronOutcome([skip('NEXUS', 'dedup_duplicate')], FROZEN_CTX);
  assert.equal(d.alert, false);
  assert.equal(d.kind, 'all_skipped');
  assert.equal(d.subject, null);
});

test('D3a mixed success + dedup-skip -> NO alert (all_succeeded; the skip is not a failure)', () => {
  var d = classifyCronOutcome([ok('NEXUS'), skip('MIRANDA', 'dedup_duplicate')], FROZEN_CTX);
  assert.equal(d.alert, false);
  assert.equal(d.kind, 'all_succeeded');
  assert.equal(d.succeeded, 1);
  assert.equal(d.skipped, 1);
  assert.equal(d.failed, 0);
});

test('D3b dedup-skip + a REAL failure -> ALERT (real failures still alert through the skips)', () => {
  var d = classifyCronOutcome([skip('NEXUS', 'dedup_duplicate'), bad('DEXTER', 'boom')], FROZEN_CTX);
  assert.equal(d.alert, true);
  assert.equal(d.kind, 'total_outage'); // 0 succeeded, >=1 genuine failure
  assert.equal(d.failed, 1);
  assert.equal(d.skipped, 1);
});

test('D3c FAIL LOUD: skipped:true with an UNRECOGNIZED reason counts as a failure, not a skip', () => {
  var d = classifyCronOutcome([{ editor: 'NEXUS', success: false, skipped: true, skipReason: 'mystery' }], FROZEN_CTX);
  assert.equal(d.alert, true);
  assert.equal(d.kind, 'total_outage');
  assert.equal(d.skipped, 0);
  assert.equal(d.failed, 1);
});

// ── E: partial -- unchanged behaviour, kept under assertion so it cannot drift. ──
test('E partial failure -> ALERT with M/N subject', () => {
  var d = classifyCronOutcome([ok('NEXUS'), bad('DEXTER', 'body too short (40 words)')], FROZEN_CTX);
  assert.equal(d.alert, true);
  assert.equal(d.kind, 'partial_failure');
  assert.equal(d.subject, '[CyberneticPunks] Cron: 1/2 editors generated');
});

// ── Happy path: silence on success (the pre-existing no-fatigue rule). ──
test('happy: all attempted editors succeeded -> NO alert', () => {
  var d = classifyCronOutcome([ok('NEXUS'), ok('DEXTER')], FROZEN_CTX);
  assert.equal(d.alert, false);
  assert.equal(d.kind, 'all_succeeded');
  assert.equal(d.subject, null);
});

// ── Counts are reported accurately for the email body. ──
test('counts: total/succeeded/failed are carried through', () => {
  var d = classifyCronOutcome([ok('A'), ok('B'), bad('C', 'e')], FROZEN_CTX);
  assert.equal(d.total, 3);
  assert.equal(d.succeeded, 2);
  assert.equal(d.failed, 1);
});
