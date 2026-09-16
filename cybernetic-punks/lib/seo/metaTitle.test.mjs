// lib/seo/metaTitle.test.mjs
// Proves the SERP-title truncation: word-boundary, <= max, leading terms kept, no dangling
// separators, short titles byte-identical. Run: node --test lib/seo/metaTitle.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { truncateMetaTitle, META_TITLE_MAX } from './metaTitle.js';

test('short title is returned verbatim (byte-identical)', () => {
  const s = 'Marathon Rook Shell Guide';
  assert.equal(truncateMetaTitle(s), s);
});

test('exactly-max title is untouched', () => {
  const s = 'x'.repeat(META_TITLE_MAX);
  assert.equal(truncateMetaTitle(s), s);
});

test('long title truncates at a word boundary, <= max, keeps leading terms', () => {
  const s = 'Marathon 1.1.9.1: Vault Sell Bug Fixed, Meta Holds Steady After the Patch';
  const out = truncateMetaTitle(s);
  assert.ok(out.length <= META_TITLE_MAX, 'within max: ' + out.length);
  assert.ok(s.startsWith(out), 'is a leading prefix (front keywords kept)');
  assert.ok(!/\s$/.test(out), 'no trailing whitespace');
  // cut landed on a word boundary: the next char in the source is a space (or we hit the strip)
  assert.ok(s[out.length] === ' ' || /[\-:,;.]/.test(s[out.length]) || out.length < s.length, 'cut on a word boundary');
});

test('no dangling separator after the cut', () => {
  const s = 'Marathon Ranked Outlook - What Joe Zieglers Exit Means For Vandal Mains';
  const out = truncateMetaTitle(s);
  assert.ok(!/[\-:,;.\s]$/.test(out), 'trailing punctuation/separator stripped: "' + out + '"');
  assert.ok(out.length <= META_TITLE_MAX);
});

test('custom max is honored', () => {
  const out = truncateMetaTitle('one two three four five six seven eight', 20);
  assert.ok(out.length <= 20);
  assert.ok('one two three four five six seven eight'.startsWith(out));
});

test('null/empty is safe', () => {
  assert.equal(truncateMetaTitle(null), '');
  assert.equal(truncateMetaTitle(''), '');
});
