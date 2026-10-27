// lib/games/linkGate.test.mjs
// Brief 174: gatedHref links a gated route only when its content count is above zero; routes not in the map
// and calls without a map always link. Pure; the module carries no game literal.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gatedHref } from './linkGate.js';

test('gatedHref: 0 or missing count -> text; above zero -> link; ungated or no map -> link', () => {
  const c = { '/g/a': 0, '/g/b': 2, '/g/c': '1', '/g/d': null, '/g/e': undefined, '/g/f': -1, '/g/g': NaN };
  assert.equal(gatedHref('/g/a', c), null);
  assert.equal(gatedHref('/g/b', c), '/g/b');
  assert.equal(gatedHref('/g/c', c), '/g/c', 'numeric string counts');
  for (const h of ['/g/d', '/g/e', '/g/f', '/g/g']) assert.equal(gatedHref(h, c), null, h);
  assert.equal(gatedHref('/g/other', c), '/g/other', 'not gated');
  assert.equal(gatedHref('/g/a'), '/g/a', 'no map');
  assert.equal(gatedHref('/g/a', null), '/g/a');
  assert.equal(gatedHref('toString', {}), 'toString', 'own keys only');
});

test('linkGate.js: no game names, no I/O', () => {
  const src = readFileSync(new URL('./linkGate.js', import.meta.url), 'utf8');
  assert.ok(!/dmz|marathon|wardogs|pubg|bodycam/i.test(src));
  assert.ok(!/import /.test(src));
});
