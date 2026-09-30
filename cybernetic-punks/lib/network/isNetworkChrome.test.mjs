// lib/network/isNetworkChrome.test.mjs
// Guards the network-chrome suppression allowlist. The failure it prevents (2026-09-30): a page added
// to the app/(network)/ route group gets NetworkNav from the group layout, but the ROOT layout still
// renders the Marathon <Nav> + <LivePulseStrip> unless isNetworkChrome() suppresses them -- so an
// UNLISTED network page wears both (the /history double-chrome bug). This test ENUMERATES the
// filesystem (not a hardcoded list), so the next network page added without an allowlist entry fails
// here instead of shipping the wrong chrome. It also pins that Marathon/game paths are unchanged.
// Run: node --test lib/network/isNetworkChrome.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { isNetworkChrome } from './isNetworkChrome.js';

// Resolve app/(network)/ relative to THIS file (cwd-independent), so the test runs the same from the
// project root or anywhere. lib/network/ -> ../../app/(network).
const here = path.dirname(fileURLToPath(import.meta.url));
const NETWORK_DIR = path.join(here, '..', '..', 'app', '(network)');

// Literal route segments only: skip files, nested route groups ('(...)'), dynamic segments ('[...]'),
// and private folders ('_...'). Every current (network) child (about, editors, methodology, history)
// is a literal segment that maps 1:1 to '/<name>'.
function networkRouteSegments() {
  return readdirSync(NETWORK_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((n) => !n.startsWith('(') && !n.startsWith('[') && !n.startsWith('_') && !n.startsWith('.'));
}

test('every app/(network)/ route directory is covered by isNetworkChrome (suppresses Marathon chrome)', () => {
  const segments = networkRouteSegments();
  assert.ok(segments.length >= 3, 'expected the network content routes on disk, found: [' + segments.join(', ') + ']');
  for (const name of segments) {
    assert.equal(isNetworkChrome('/' + name), true,
      '/' + name + ' is an app/(network)/ page but isNetworkChrome() does NOT cover it -- it would render Marathon Nav + LivePulseStrip ON TOP of NetworkNav. Add it to lib/network/isNetworkChrome.js.');
  }
});

test('/history specifically is network chrome (the fix that prompted this test)', () => {
  assert.equal(isNetworkChrome('/history'), true, '/history must suppress Marathon chrome');
  assert.equal(isNetworkChrome('/history/anything'), true, 'nested /history/* too');
});

test('Marathon + game paths behave exactly as before', () => {
  assert.equal(isNetworkChrome('/marathon'), false, '/marathon renders the Marathon Nav -- NOT network chrome');
  assert.equal(isNetworkChrome('/marathon/shells/assassin'), false, 'a Marathon entity page is NOT network chrome');
  assert.equal(isNetworkChrome('/dmz'), true, '/dmz (game route group) ships its own header -> network chrome');
  assert.equal(isNetworkChrome('/'), false, "root '/' is handled at each call site, NOT by this helper");
  assert.equal(isNetworkChrome(''), false, 'empty/undefined path is not network chrome');
});
