// lib/articleBody.test.mjs
// Locks the shared parser's behavior (used by BOTH the public intel route and the admin
// drafts preview -- so a regression here would change the live article render).
// Run: node --test lib/articleBody.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseBody, isWholeQuote } from './articleBody.js';

test('empty / null body -> []', () => {
  assert.deepEqual(parseBody(''), []);
  assert.deepEqual(parseBody(null), []);
});

test('whole-paragraph **bold** -> header element', () => {
  const els = parseBody('**THE TIER PICTURE**');
  assert.equal(els.length, 1);
  assert.equal(els[0].type, 'header');
  assert.equal(els[0].content, 'THE TIER PICTURE');
});

test('standalone "quote" -> quote element (quotes stripped)', () => {
  const els = parseBody('"the meta is settling"');
  assert.equal(els[0].type, 'quote');
  assert.equal(els[0].content, 'the meta is settling');
});

test('leading **Header** fused to text -> header + para', () => {
  const els = parseBody('**Weapons** The Impact HAR stays S-tier.');
  assert.equal(els[0].type, 'header');
  assert.equal(els[0].content, 'Weapons');
  assert.equal(els[1].type, 'para');
  assert.equal(els[1].content, 'The Impact HAR stays S-tier.');
});

test('plain paragraph -> para; blank-line split into multiple', () => {
  const els = parseBody('First para.\n\nSecond para.');
  assert.equal(els.length, 2);
  assert.equal(els[0].type, 'para');
  assert.equal(els[1].content, 'Second para.');
});

test('citation tags are stripped from parsed content (shared stripCitationTags)', () => {
  const els = parseBody('The V75 Scar [WS5] holds A-tier.');
  assert.equal(els[0].type, 'para');
  assert.equal(/\[(WS|SH|CS|MS|IS|BN|YT)\d+\]/.test(els[0].content), false, 'no citation tag in parsed prose');
});

test('isWholeQuote: exactly one quoted pair', () => {
  assert.equal(isWholeQuote('"a"'), true);
  assert.equal(isWholeQuote('no quotes'), false);
  assert.equal(isWholeQuote('"a" and "b"'), false);
});
