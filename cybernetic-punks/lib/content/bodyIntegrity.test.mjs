// lib/content/bodyIntegrity.test.mjs
// Unit tests for the body integrity guard. Uses the two REAL incident strings: the Sep 15 Wardogs
// placeholder body (17b28539) and the duplicated "cannon fire" sentence (2f4f11e1).
// Run: node --test lib/content/bodyIntegrity.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkBodyIntegrity, findRepeatedPhrase, summarizeProblems, MIN_BODY_CHARS } from './bodyIntegrity.js';

const REAL_PLACEHOLDER = '<full body — exact text, headers as **bold**, quotes escaped — in the committed file>';
const REAL_DUPLICATE = 'One fix in the bug section stands out for competitive play: a bug was causing the Havoc to take increased damage from 20mm and 30mm cannon fire from 20mm and 30mm cannon fire. That is not a minor cosmetic glitch.';

// A realistic clean body (well over the minimum, headers on their own lines, honest-null "TBD").
const CLEAN = [
  '**What changed**',
  '',
  'Bulkhead released Update 0.1.2 on September 30. Per the patch notes, it targets recent cash and XP exploits and fixes a Windows crash.',
  '',
  '**What is still unknown**',
  '',
  'Bulkhead has not said whether Season 02 resets progression. The release date of the next balance pass is TBD in the notes, and we will update this article when it is confirmed.',
  '',
  'Players who relied on the vehicle fly-through exploit will see capped rewards from now on. Revives are now validated by the server.',
].join('\n');
const codes = (r) => r.problems.map((p) => p.code);

test('clean article passes (honest-null TBD in prose is NOT a placeholder)', () => {
  const r = checkBodyIntegrity({ headline: 'Wardogs Update 0.1.2 fixes cash exploits', body: CLEAN });
  assert.ok(CLEAN.length >= MIN_BODY_CHARS);
  assert.equal(r.ok, true, summarizeProblems(r.problems));
  assert.deepEqual(r.problems, []);
});

// (a) length
test('(a) empty body -> BODY_EMPTY', () => {
  assert.deepEqual(codes(checkBodyIntegrity({ headline: 'H', body: '   ' })).filter((c) => c.startsWith('BODY')), ['BODY_EMPTY']);
  assert.ok(codes(checkBodyIntegrity({ headline: 'H', body: null })).includes('BODY_EMPTY'));
});

test('(a) a short body -> BODY_TOO_SHORT; exactly the minimum passes the length check', () => {
  assert.ok(codes(checkBodyIntegrity({ headline: 'H', body: 'A short stub that never got written.' })).includes('BODY_TOO_SHORT'));
  const atMin = 'x'.repeat(MIN_BODY_CHARS);
  assert.ok(!codes(checkBodyIntegrity({ headline: 'H', body: atMin })).includes('BODY_TOO_SHORT'));
  assert.ok(codes(checkBodyIntegrity({ headline: 'H', body: atMin.slice(1) })).includes('BODY_TOO_SHORT'));
});

// (b) placeholder
test('(b) the REAL Sep 15 placeholder body is caught (too short AND placeholder)', () => {
  const r = checkBodyIntegrity({ headline: "Wardogs Black Market: What's Actually Live vs. What's Still Coming", body: REAL_PLACEHOLDER });
  assert.equal(r.ok, false);
  assert.ok(codes(r).includes('BODY_TOO_SHORT'));
  assert.ok(codes(r).includes('PLACEHOLDER'));
  assert.ok(r.problems.some((p) => /single <\.\.\.> note/.test(p.message)));
});

test('(b) the placeholder is caught even inside an otherwise long body', () => {
  const r = checkBodyIntegrity({ headline: 'Headline', body: CLEAN + '\n\n' + REAL_PLACEHOLDER });
  assert.ok(codes(r).includes('PLACEHOLDER'));
  assert.ok(!codes(r).includes('BODY_TOO_SHORT'));
});

test('(b) each placeholder form is caught', () => {
  const forms = ['Lorem ipsum dolor sit amet.', 'TODO: write the intro.', 'PLACEHOLDER', 'TBD', '[insert patch summary here]', 'See <source> for details.', 'Read the [source] for more.', 'The {{cnp:game}} season starts soon.', 'Body goes here -- exact text: pending.'];
  for (const f of forms) {
    const r = checkBodyIntegrity({ headline: 'Headline', body: CLEAN + '\n\n' + f });
    assert.ok(codes(r).includes('PLACEHOLDER'), 'not caught: ' + f);
  }
});

test('(b) real prose that merely uses the words is NOT flagged', () => {
  const prose = ['1.1.0.4 is a placeholder on the calendar.', 'The release date is TBD.', 'We quote the exact text of the statement below.', 'Full body armor is not in the game.', 'Read more in the [source](https://example.com/post).'];
  for (const p of prose) {
    const r = checkBodyIntegrity({ headline: 'Headline', body: CLEAN + '\n\n' + p });
    assert.ok(!codes(r).includes('PLACEHOLDER'), 'false positive: ' + p + ' -> ' + summarizeProblems(r.problems));
  }
});

// (c) repeated phrase
test('(c) the REAL duplicated "cannon fire" sentence is caught', () => {
  const r = checkBodyIntegrity({ headline: 'Headline', body: CLEAN + '\n\n' + REAL_DUPLICATE });
  assert.ok(codes(r).includes('REPEATED_PHRASE'));
  const rep = findRepeatedPhrase(REAL_DUPLICATE);
  assert.equal(rep.words, 6);
  assert.equal(rep.phrase, 'from 20mm and 30mm cannon fire');
});

test('(c) a 3-word repeat, a header echoed by the next line, and repeated numbers are NOT flagged', () => {
  assert.equal(findRepeatedPhrase('It was very very very good and fine and fine.'), null);
  assert.equal(findRepeatedPhrase('**WHAT THE STRYDER M1T IS**\nThe Stryder M1T is a precision rifle.'), null);
  assert.equal(findRepeatedPhrase('Scores: 10 20 30 40 10 20 30 40 across rounds.'), null);
});

// (d) headline
test('(d) empty headline -> HEADLINE_EMPTY', () => {
  assert.ok(codes(checkBodyIntegrity({ headline: '  ', body: CLEAN })).includes('HEADLINE_EMPTY'));
});

test('(d) body that starts by restating the headline -> HEADLINE_IS_BODY_START', () => {
  const r = checkBodyIntegrity({ headline: 'What changed', body: CLEAN });
  assert.ok(codes(r).includes('HEADLINE_IS_BODY_START'));
  const ok = checkBodyIntegrity({ headline: 'Wardogs Update 0.1.2 fixes cash exploits', body: CLEAN });
  assert.ok(!codes(ok).includes('HEADLINE_IS_BODY_START'));
});

test('summarizeProblems joins codes and messages', () => {
  const s = summarizeProblems(checkBodyIntegrity({ headline: '', body: REAL_PLACEHOLDER }).problems);
  assert.match(s, /BODY_TOO_SHORT: .*PLACEHOLDER: .*HEADLINE_EMPTY: /);
});
