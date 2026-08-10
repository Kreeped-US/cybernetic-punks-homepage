// lib/content/gateLogPass.test.mjs
// The pure log-formatting helper for the novelty portion of the [GATE-LOG] line,
// including the increment-1b near-miss score. Decision-neutral: this only renders
// what checkNovelty already returned. Run: node --test lib/content/gateLogPass.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatNovelty } from './gateLogPass.js';

test('formatNovelty: a real dup renders dup:slug@score', () => {
  assert.equal(
    formatNovelty({ isDup: true, dupSlug: 'destroyer-shell', score: 0.85 }),
    'dup:destroyer-shell@0.85'
  );
});

test('formatNovelty: a new WITH a near-miss renders new(near:slug@score,shared=n) [1b]', () => {
  assert.equal(
    formatNovelty({ isDup: false, nearSlug: 'destroyer-guide', nearScore: 0.42, nearShared: 2 }),
    'new(near:destroyer-guide@0.42,shared=2)'
  );
});

test('formatNovelty: a bare new (no comparison) renders new', () => {
  assert.equal(formatNovelty({ isDup: false, reason: 'too-few-candidate-tokens' }), 'new');
  assert.equal(formatNovelty({ isDup: false, reason: null }), 'new');
});

test('formatNovelty: null / undefined novelty renders new (never throws)', () => {
  assert.equal(formatNovelty(null), 'new');
  assert.equal(formatNovelty(undefined), 'new');
});

test('formatNovelty: dup with a non-numeric score degrades to @?', () => {
  assert.equal(formatNovelty({ isDup: true, dupSlug: 's', score: null }), 'dup:s@?');
});
