// lib/dmz/articleContent.test.mjs
// Guards extractKeyFacts after the P2 (long-list) rule was removed 2026-10-01: a FIRST bullet list of
// 6+ items must FALL THROUGH to the lede-sentence fallback (no longer fabricate a box from the first 4
// items); a 2-5 short-item first list (P1) is unchanged.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractKeyFacts } from './articleContent.js';

test('6+ item first list -> falls through to the lede-sentence fallback (NOT the list items)', () => {
  const body = [
    '**The Short Answer**',
    '',
    'First lede sentence explaining what the thing is. Trailing clause.',
    '',
    'Second paragraph carrying another real fact sentence. Trailing clause.',
    '',
    'Six weapons were added:',
    '',
    '- BK-101 shotgun',
    '- Rivington sniper rifle',
    '- SG9-X machine pistol',
    '- Veaper machine pistol',
    '- CR-75 pistol',
    '- SG5-X machine pistol',
  ].join('\n');
  const box = extractKeyFacts(body);
  // the box is the lede sentences, not the first-4 weapons
  assert.deepEqual(box, [
    'First lede sentence explaining what the thing is.',
    'Second paragraph carrying another real fact sentence.',
  ]);
  // explicitly: no weapon name from the long first list leaked into the box
  assert.ok(!box.some((f) => /BK-101|Rivington|SG9-X|Veaper/.test(f)), 'no first-list item in the box');
});

test('2-5 short items first list -> P1 verbatim (unchanged)', () => {
  const body = [
    '- Alpha',
    '- Bravo',
    '- Charlie',
  ].join('\n');
  assert.deepEqual(extractKeyFacts(body), ['Alpha', 'Bravo', 'Charlie']);
});

test('6+ item first list with no usable lede -> null (box hidden), not a fabricated list box', () => {
  const body = [
    'A list of things:',
    '',
    '- one',
    '- two',
    '- three',
    '- four',
    '- five',
    '- six',
  ].join('\n');
  // no non-list paragraph with >=2 fact sentences -> fallback yields < 2 -> null
  assert.equal(extractKeyFacts(body), null);
});
