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

test('formatNovelty: a new WITH a near-miss renders jaccard + coverage side by side [1c]', () => {
  assert.equal(
    formatNovelty({ isDup: false, nearSlug: 'destroyer-guide', nearScore: 0.33, nearCoverage: 1, nearShared: 2 }),
    'new(near:destroyer-guide@0.33,cov=1.00,shared=2)'
  );
  // partial coverage renders too
  assert.equal(
    formatNovelty({ isDup: false, nearSlug: 'x', nearScore: 0.25, nearCoverage: 0.5, nearShared: 1 }),
    'new(near:x@0.25,cov=0.50,shared=1)'
  );
});

test('formatNovelty: a near-miss with missing coverage degrades to cov=? (never throws)', () => {
  assert.equal(
    formatNovelty({ isDup: false, nearSlug: 'x', nearScore: 0.4, nearShared: 2 }),
    'new(near:x@0.40,cov=?,shared=2)'
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
