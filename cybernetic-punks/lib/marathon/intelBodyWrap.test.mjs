// lib/marathon/intelBodyWrap.test.mjs
// Brief 239: the Marathon intel body had no wrap rule, so the unbroken URL in a "Sources:" paragraph laid 17
// articles out up to 381px wider than a phone and ran into the sidebar at 768. The BodyRenderer root now sets
// overflowWrap anywhere (the Wardogs body rule). Pins that rule on the root and that it is the only one added.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const src = readFileSync(path.resolve('app/marathon/intel/[slug]/page.js'), 'utf8');

test('the BodyRenderer root wraps long strings anywhere', () => {
  const fn = src.slice(src.indexOf('function BodyRenderer('));
  const root = fn.slice(fn.indexOf('return ('), fn.indexOf('{parsed.map('));
  assert.ok(root.includes("<div style={{ overflowWrap: 'anywhere' }}>"), root);
});

test('overflowWrap is set only on the BodyRenderer root', () => {
  assert.equal(src.split('overflowWrap').length - 1, 1);
});
