// lib/verification.test.mjs
// Guards the verification classifier, focused on the 2026-09-28 UNVERIFIED-SOURCE GUARD: a source
// whose text says "unverified" forces whole-row honest-null (UNCHECKED) regardless of the verified
// flag, cascading to honestNumber (number withheld) and verificationTag ([UNVERIFIED]). Plus the
// Misriah 2442 regression and confirmation that normal CONFIRMED/SOURCE_AGREED/UNCHECKED still hold.
// Run: node --test lib/verification.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { verificationState, honestNumber, verificationTag, verifiedBadgeLabel, isConfirmedSubject } from './verification.js';

test('unverified-source guard: /unverified/i text -> UNCHECKED even when verified===true', () => {
  const row = { verified: true, verified_source: 'Datamine v3; damage UNVERIFIED' };
  assert.equal(verificationState(row), 'UNCHECKED');
  assert.equal(honestNumber(row, 'DMG:24'), '', 'number withheld');
  assert.equal(verificationTag(row), ' [UNVERIFIED]', 'tag downgraded');
});

test('Misriah 2442 regression: real source string forces honest-null', () => {
  const misriah = {
    verified: true,
    verified_source: 'Bungie Update 1.1.5 patch notes (precision_multiplier, fire_rate); damage unverified - see docs/HANDOFF.md shotgun scale',
    damage: 24, fire_rate: 65, magazine_size: 6,
  };
  assert.equal(verificationState(misriah), 'UNCHECKED');
  assert.equal(honestNumber(misriah, ', Dmg: 24'), '', 'damage withheld');
  assert.equal(honestNumber(misriah, ', RPM: 65'), '', 'fire_rate also withheld (whole-row honest-null, per decision)');
  assert.equal(verificationTag(misriah), ' [UNVERIFIED]');
});

test('a normal verified+sourced row (no "unverified" text) is still CONFIRMED', () => {
  const row = { verified: true, verified_source: 'Bungie Update 1.1.5 patch notes' };
  assert.equal(verificationState(row), 'CONFIRMED');
  assert.equal(honestNumber(row, 'DMG:30'), 'DMG:30', 'confirmed number passes through');
  assert.equal(verificationTag(row), '', 'no marker when confirmed');
});

test('guard does not disturb SOURCE_AGREED / UNCHECKED for rows without the word', () => {
  assert.equal(verificationState({ verified: false, verified_source: '', patch_verified: '1.1.5' }), 'SOURCE_AGREED');
  assert.equal(verificationState({ verified: false, verified_source: '', patch_verified: 's1' }), 'UNCHECKED');
  assert.equal(verificationState({ verified: false, verified_source: '' }), 'UNCHECKED');
});

test('guard is case-insensitive and matches as a substring', () => {
  assert.equal(verificationState({ verified: true, verified_source: 'all fields Unverified pending recheck' }), 'UNCHECKED');
});

// ── isConfirmedSubject (2026-09-28): the SUBJECT-GROUNDING gate. Only a fully CONFIRMED row may seed a
//    grounding block or become a citable verified fact. Guards the recurring invented-claims anchor. ──
test('isConfirmedSubject: PREDATOR regression -- verified===true but source blank is NOT a confirmed subject', () => {
  // The exact failure shape: a verified=true core row with NO verified_source (a hand-set flag / bogus
  // "Assassin Predator" core) must NOT be allowed to anchor a draft as confirmed fact.
  assert.equal(isConfirmedSubject({ verified: true, verified_source: null }), false, 'null source -> not confirmed');
  assert.equal(isConfirmedSubject({ verified: true, verified_source: '' }), false, 'blank source -> not confirmed');
  assert.equal(isConfirmedSubject({ verified: true, verified_source: '   ' }), false, 'whitespace source -> not confirmed');
});

test('isConfirmedSubject: verified===true AND non-blank source -> confirmed subject', () => {
  assert.equal(isConfirmedSubject({ verified: true, verified_source: 'owner in-game visual verification (Justin), S2 2026-09-28' }), true);
  assert.equal(isConfirmedSubject({ verified: true, verified_source: 'Bungie Update 1.1.5 patch notes' }), true);
});

test('isConfirmedSubject: an "unverified"-source row is never a confirmed subject even with verified===true', () => {
  assert.equal(isConfirmedSubject({ verified: true, verified_source: 'Datamine v3; damage UNVERIFIED' }), false, 'guard cascades: source says unverified -> UNCHECKED -> not a subject');
});

test('isConfirmedSubject: unflagged / source-agreed rows are not confirmed subjects', () => {
  assert.equal(isConfirmedSubject({ verified: false, verified_source: 'src' }), false, 'flag false -> not confirmed');
  assert.equal(isConfirmedSubject({ verified: false, verified_source: '', patch_verified: '1.1.5' }), false, 'SOURCE_AGREED is not CONFIRMED');
  assert.equal(isConfirmedSubject({}), false, 'empty row -> not confirmed');
});

test('verifiedBadgeLabel: in-game only when the source attests in-game; else neutral "Verified"', () => {
  // Official/blog/patch-notes sources -> "Verified" (the citation carries "official"), never "in-game".
  assert.equal(verifiedBadgeLabel('Call of Duty blog, MW4 DMZ Deep Dive, 2026-06-06 (https://www.callofduty.com/blog/...)'), 'Verified');
  assert.equal(verifiedBadgeLabel('Bungie Update 1.1.5 patch notes'), 'Verified');
  // Explicit in-game attestation -> "Verified in-game".
  assert.equal(verifiedBadgeLabel('owner in-game visual verification (Justin), S2 2026-09-28'), 'Verified in-game');
  // The launch-flip stamp form (contains "game" but NOT "in-game") -> in-game via the startsWith clause.
  assert.equal(verifiedBadgeLabel('game-verified@1.2.3'), 'Verified in-game');
  // Case-insensitivity + hyphen/space variants of "in-game" / "in game".
  assert.equal(verifiedBadgeLabel('Owner IN-GAME check'), 'Verified in-game');
  assert.equal(verifiedBadgeLabel('confirmed in game by owner'), 'Verified in-game');
  // Null / empty -> neutral "Verified" (badge only renders for confirmed rows; never fabricate in-game).
  assert.equal(verifiedBadgeLabel(null), 'Verified');
  assert.equal(verifiedBadgeLabel(''), 'Verified');
  assert.equal(verifiedBadgeLabel(undefined), 'Verified');
});
