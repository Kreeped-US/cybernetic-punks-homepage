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

test('formatNovelty: a near-miss renders jaccard + coverage + phrase side by side [1c+1d]', () => {
  // phrase=yes (true reinforce shape)
  assert.equal(
    formatNovelty({ isDup: false, nearSlug: 'destroyer-guide', nearScore: 0.33, nearCoverage: 1, nearPhrase: true, nearShared: 2 }),
    'new(near:destroyer-guide@0.33,cov=1.00,phrase=yes,shared=2)'
  );
  // phrase=no (the cov=1.00 false-positive shape)
  assert.equal(
    formatNovelty({ isDup: false, nearSlug: 'triage-x', nearScore: 0.27, nearCoverage: 1, nearPhrase: false, nearShared: 2 }),
    'new(near:triage-x@0.27,cov=1.00,phrase=no,shared=2)'
  );
});

test('formatNovelty: phrase=na when the candidate had no bigram (null nearPhrase)', () => {
  assert.equal(
    formatNovelty({ isDup: false, nearSlug: 'x', nearScore: 0.25, nearCoverage: 0.5, nearPhrase: null, nearShared: 1 }),
    'new(near:x@0.25,cov=0.50,phrase=na,shared=1)'
  );
  // missing nearPhrase entirely -> also na
  assert.equal(
    formatNovelty({ isDup: false, nearSlug: 'x', nearScore: 0.4, nearShared: 2 }),
    'new(near:x@0.40,cov=?,phrase=na,shared=2)'
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
