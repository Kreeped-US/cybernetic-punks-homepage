// lib/content/sourceLabel.test.mjs
// Brief 198: the "Sourced from ..." noun depends on the source_url path. /patchnotes/ -> 'patch notes';
// a blog URL, a null URL or an unparsable one keep 'blog'. The DMZ article page and the section cards
// both render through the helper, with no hard-coded noun left.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sourceNoun, sourceLabel, DEFAULT_SOURCE_NOUN } from './sourceLabel.js';

const PATCH = 'https://www.callofduty.com/patchnotes/2026/10/call-of-duty-modern-warfare-4-launch-patch-notes';
const BLOG = 'https://www.callofduty.com/blog/2026/06/call-of-duty-modern-warfare-4-dmz-deep-dive';

test('a /patchnotes/ source_url reads "patch notes"', () => {
  assert.equal(sourceNoun(PATCH), 'patch notes');
  assert.equal(sourceNoun('/patchnotes/2026/10/x'), 'patch notes');
  assert.equal(sourceLabel('Acme', PATCH), 'the official Acme patch notes');
});

test('any other source_url keeps "blog" (unchanged)', () => {
  assert.equal(sourceNoun(BLOG), 'blog');
  assert.equal(sourceLabel('Acme', BLOG), 'the official Acme blog');
  // Only the path counts: the word elsewhere in the URL does not switch the noun.
  assert.equal(sourceNoun('https://example.com/blog/patchnotes/x'), 'blog');
  assert.equal(sourceNoun('https://example.com/blog?ref=/patchnotes/'), 'blog');
});

test('a null, empty or unparsable source_url keeps "blog"', () => {
  [null, undefined, '', '   ', 'not a url', 42].forEach((v) => assert.equal(sourceNoun(v), DEFAULT_SOURCE_NOUN));
  assert.equal(sourceLabel('Acme', null), 'the official Acme blog');
});

test('wiring: the DMZ article page and the section cards render through the helper, no hard-coded noun', () => {
  const article = readFileSync(new URL('../../app/dmz/[section]/[slug]/page.js', import.meta.url), 'utf8');
  const section = readFileSync(new URL('../../app/dmz/[section]/page.js', import.meta.url), 'utf8');
  for (const src of [article, section]) {
    assert.match(src, /import \{ sourceLabel \} from '@\/lib\/content\/sourceLabel';/);
    assert.match(src, /sourceLabel\(SOURCE_PUBLISHER, (article|a)\.source_url\)/);
    assert.ok(!src.includes('official Call of Duty blog'), 'no hard-coded "official Call of Duty blog" left');
  }
});

test('the helper carries no game or publisher literal', () => {
  const src = readFileSync(new URL('./sourceLabel.js', import.meta.url), 'utf8');
  assert.ok(!/call of duty|dmz|marathon|wardogs|bodycam|pubg/i.test(src));
});
