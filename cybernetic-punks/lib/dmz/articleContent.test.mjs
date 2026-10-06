// lib/dmz/articleContent.test.mjs
// Guards extractKeyFacts after the P2 (long-list) rule was removed 2026-10-01: a FIRST bullet list of
// 6+ items must FALL THROUGH to the lede-sentence fallback (no longer fabricate a box from the first 4
// items); a 2-5 short-item first list (P1) is unchanged.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractKeyFacts, linkifyPoiSegments } from './articleContent.js';

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

// -- POI linkifier: longer-name guard (audit #8) --
// Live dmz_pois names, longest-first (the caller's contract).
const POIS = [
  { name: 'Military Base', slug: 'military-base' },
  { name: 'Hajin City', slug: 'hajin-city' },
  { name: 'Hospital', slug: 'hospital' },
  { name: 'Fallout', slug: 'fallout' },
  { name: 'Prison', slug: 'prison' },
  { name: 'Casino', slug: 'casino' },
];
const poiLinks = (text, linked) => linkifyPoiSegments(text, POIS, linked || new Set())
  .filter((s) => s.type === 'link').map((s) => s.value + '->' + s.slug);
const joined = (text) => linkifyPoiSegments(text, POIS, new Set()).map((s) => s.value).join('');

test('the three live Hajin mislinks do NOT link (POI name inside a longer proper name)', () => {
  assert.deepEqual(poiLinks('14th Political Prison (northwest, NK)'), []);
  assert.deepEqual(poiLinks('Mirae General Hospital (north central, SK)'), []);
  assert.deepEqual(poiLinks('Cheongun Outskirts, Heavenly Luck Casino and the Russian Border'), []);
  assert.deepEqual(poiLinks('14th Political Prison: the Fortress Prison Yard and the Citadel'), []);
});

test('a standalone mention of the place still links (lowercase and sentence-start determiners)', () => {
  assert.deepEqual(poiLinks('its map coverage names the Fallout reactor, the Prison complex, Hajin City and the Military Base.'),
    ['Fallout->fallout', 'Prison->prison', 'Hajin City->hajin-city', 'Military Base->military-base']);
  assert.deepEqual(poiLinks('The Prison sits in the northwest.'), ['Prison->prison']);
  assert.deepEqual(poiLinks('NuriGO Mall (northeast Hajin City, SK)'), ['Hajin City->hajin-city']);
});

test('a skipped longer-name match does not use up the POI: a later standalone mention links', () => {
  const linked = new Set();
  assert.deepEqual(poiLinks('14th Political Prison holds the north. Later, the Prison yard opens.', linked), ['Prison->prison']);
  assert.ok(linked.has('prison'));
  // and a skip-only span leaves the POI available for the next span
  const l2 = new Set();
  assert.deepEqual(poiLinks('Mirae General Hospital', l2), []);
  assert.deepEqual(poiLinks('Near the Hospital, a road.', l2), ['Hospital->hospital']);
});

test('number / ordinal before, capitalized word after, and punctuation / line-start edges', () => {
  assert.deepEqual(poiLinks('Block 7 Prison'), []);            // number before
  assert.deepEqual(poiLinks('the 2nd Hospital wing'), []);      // ordinal before
  assert.deepEqual(poiLinks('the Prison Yard'), []);            // capitalized word after
  assert.deepEqual(poiLinks('Prison Yard'), []);                // line start + capitalized after
  assert.deepEqual(poiLinks('Prison (northwest)'), ['Prison->prison']);   // line start, punctuation after
  assert.deepEqual(poiLinks('Prison.'), ['Prison->prison']);
  assert.deepEqual(poiLinks('(Prison)'), ['Prison->prison']);
  assert.deepEqual(poiLinks('Fallout, Prison and Casino'), ['Fallout->fallout', 'Prison->prison', 'Casino->casino']); // comma-separated list: separate names
  assert.deepEqual(poiLinks('Political-Prison'), ['Prison->prison']);    // hyphen-joined is not a space-joined name (unchanged behaviour)
  assert.deepEqual(poiLinks('the prison and imprisoned'), []);          // case-sensitive + whole-word (unchanged)
});

test('linkify never alters the text: segments rejoin to the input byte-for-byte', () => {
  for (const t of ['14th Political Prison (northwest, NK)', 'the Prison complex, Hajin City and the Military Base.', 'Prison', '']) {
    assert.equal(joined(t), t);
  }
});
