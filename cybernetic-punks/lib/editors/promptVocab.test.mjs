// lib/editors/promptVocab.test.mjs
// Stage 2a: the token-swap mechanism. Marathon vocab reproduces the exact original
// tokens (byte-identity of the templated portions); a non-Marathon vocab produces NO
// "Marathon"/"Bungie"/"Runner" in the templated portions; an UNMAPPED placeholder fails
// LOUDLY (fail-closed), never silently emitting the raw placeholder or empty string.
//   Run: node --test lib/editors/promptVocab.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyVocab, resolveVocab, applyGameVocab, VOCAB_KEYS } from './promptVocab.js';

// Marathon's config-shaped fixture (mirrors lib/games/marathon.js: displayName + vocabulary).
const MARATHON = {
  displayName: 'Marathon',
  vocabulary: {
    developer: 'Bungie',
    readerTerm: 'Runner',
    readerTermPlural: 'Runners',
    grades: { cipher: 'Runner Grade', nexus: 'Grid Pulse', dexter: 'Loadout Grade' },
    links: { cradle: '/cradle', factions: '/factions', meta: '/meta' },
  },
};

// A synthetic NON-Marathon config (no real game touched -- just proves the swap is total).
const OTHER = {
  displayName: 'Wardogs',
  vocabulary: {
    developer: 'BULKHEAD',
    readerTerm: 'Operator',
    readerTermPlural: 'Operators',
    grades: { cipher: 'Threat Grade', nexus: 'Meta Pulse', dexter: 'Kit Grade' },
    links: { cradle: '/wardogs', factions: '/wardogs', meta: '/wardogs' },
  },
};

// A template exercising every token, interleaved with Layer-B prose that must pass through.
const TEMPLATE =
  'You are the {{cnp:game}} editor. Official {{cnp:dev}} news guides ranked {{cnp:game}} play. ' +
  'You assign {{cnp:grade.cipher}} / {{cnp:grade.nexus}} / {{cnp:grade.dexter}}. Address the reader as a ' +
  '{{cnp:reader}}; advice for {{cnp:readers}}. Point stat guides to {{cnp:link.cradle}}, gear to ' +
  '{{cnp:link.factions}}, and the {{cnp:link.meta}} page. ' +
  'LAYER B (unchanged): Runner Shells, the Cradle, holotag, the 8 shells (Sentinel...).';

test('applyVocab: Marathon vocab reproduces the exact original tokens', () => {
  const out = applyVocab(TEMPLATE, resolveVocab(MARATHON));
  const expected =
    'You are the Marathon editor. Official Bungie news guides ranked Marathon play. ' +
    'You assign Runner Grade / Grid Pulse / Loadout Grade. Address the reader as a ' +
    'Runner; advice for Runners. Point stat guides to /cradle, gear to ' +
    '/factions, and the /meta page. ' +
    'LAYER B (unchanged): Runner Shells, the Cradle, holotag, the 8 shells (Sentinel...).';
  assert.equal(out, expected);
  assert.equal(out.indexOf('{{cnp:'), -1, 'no placeholder survives');
});

test('applyGameVocab: same result via the config chokepoint helper', () => {
  assert.equal(applyGameVocab(TEMPLATE, MARATHON), applyVocab(TEMPLATE, resolveVocab(MARATHON)));
});

test('non-Marathon vocab: NO Marathon/Bungie/Runner in the TEMPLATED portions', () => {
  const out = applyVocab(TEMPLATE, resolveVocab(OTHER));
  // The templated tokens are all swapped:
  assert.ok(out.includes('Wardogs editor'));
  assert.ok(out.includes('BULKHEAD news'));
  assert.ok(out.includes('Threat Grade / Meta Pulse / Kit Grade'));
  assert.ok(out.includes('as a Operator'));
  assert.ok(out.includes('advice for Operators'));
  assert.ok(out.includes('to /wardogs, gear to /wardogs'));
  // Only the LAYER-B line (which carries NO placeholders, intentionally) still has the
  // Marathon words -- that is the 2a scope boundary, verified explicitly:
  const templated = out.replace(/LAYER B \(unchanged\):.*/s, '');
  assert.equal(/Marathon/.test(templated), false, 'no "Marathon" in templated portion');
  assert.equal(/Bungie/.test(templated), false, 'no "Bungie" in templated portion');
  assert.equal(/Runner/.test(templated), false, 'no "Runner" in templated portion');
});

test('unmapped placeholder FAILS LOUDLY (fail-closed) -- never silent/empty', () => {
  const missing = { game: 'X' }; // dev/reader/grades/links absent
  assert.throws(
    () => applyVocab('a {{cnp:dev}} b', missing),
    /unmapped placeholder \{\{cnp:dev\}\}/,
    'a missing key throws with a clear message',
  );
  // empty-string value is also treated as unmapped (fail-closed):
  assert.throws(() => applyVocab('{{cnp:reader}}', { reader: '' }), /unmapped placeholder/);
});

test('uppercase modifier: {{cnp:KEY^}} upper-cases one natural-case value at UPPER sites', () => {
  const v = resolveVocab(MARATHON);
  // Same token, both cases -- covers "with a Runner Grade" AND "RUNNER GRADE" byte-identically.
  assert.equal(applyVocab('You assign {{cnp:grade.cipher^}} to the build.', v), 'You assign RUNNER GRADE to the build.');
  assert.equal(applyVocab('a {{cnp:grade.cipher}} rates it.', v), 'a Runner Grade rates it.');
  assert.equal(applyVocab('OFFICIAL {{cnp:dev^}} NEWS', v), 'OFFICIAL BUNGIE NEWS');
  assert.equal(applyVocab('Official {{cnp:dev}} news', v), 'Official Bungie news');
  // non-Marathon reproduces THAT game's value, upper-cased at the upper site:
  assert.equal(applyVocab('{{cnp:dev^}}', resolveVocab(OTHER)), 'BULKHEAD');
});

test('text with no placeholder is returned unchanged (Layer-B pass-through)', () => {
  const layerB = 'Runner Shells and the Cradle: Assassin, Destroyer, ... Sentinel.';
  assert.equal(applyVocab(layerB, resolveVocab(MARATHON)), layerB);
  assert.equal(applyVocab(null, {}), null);
  assert.equal(applyVocab('', {}), '');
});

test('resolveVocab exposes exactly the documented key set', () => {
  const keys = Object.keys(resolveVocab(MARATHON)).sort();
  assert.deepEqual(keys, VOCAB_KEYS.slice().sort());
});
