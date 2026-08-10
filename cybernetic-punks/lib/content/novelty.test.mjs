// lib/content/novelty.test.mjs
// The pure parts of the network-wide novelty check (check b): the candidate-topic
// string builder and the closest-duplicate scorer. Uses a flat idf ({_max:1}) so
// topicJaccard reduces to plain set Jaccard (shared/union) and the scores are
// deterministic. The async DB path is exercised by the cron log pass, not here.
// Run: node --test lib/content/novelty.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { topicTokens } from '../topicTokens.js';
import {
  candidateTopicString,
  closestDuplicate,
  DUP_MIN_SHARED_TOKENS,
} from './novelty.js';

// flat idf: every token weight = _max = 1, so topicJaccard == |shared| / |union|.
const FLAT_IDF = { _max: 1 };

test('candidateTopicString: joins entity + facet, drops empties', () => {
  assert.equal(candidateTopicString('Destroyer', 'shell'), 'Destroyer shell');
  assert.equal(candidateTopicString('Twin Tap HBR', 'weapon'), 'Twin Tap HBR weapon');
  assert.equal(candidateTopicString('Destroyer', ''), 'Destroyer');
  assert.equal(candidateTopicString('', 'shell'), 'shell');
  assert.equal(candidateTopicString(null, null), '');
});

test('closestDuplicate: a near-identical published headline is a dup', () => {
  const cand = topicTokens('Destroyer shell build');            // [destroyer, shell, build]
  const corpus = [{ headline: 'Destroyer shell build guide', slug: 'destroyer-guide', editor: 'DEXTER' }];
  // union = {destroyer,shell,build,guide}=4, shared=3 -> 0.75 >= 0.7 -> dup
  const best = closestDuplicate(cand, corpus, FLAT_IDF);
  assert.ok(best, 'should find a duplicate');
  assert.equal(best.slug, 'destroyer-guide');
  assert.equal(best.shared, 3);
  assert.ok(best.score >= 0.7);
});

test('closestDuplicate: an unrelated corpus yields no dup', () => {
  const cand = topicTokens('Destroyer shell build');
  const corpus = [
    { headline: 'Vandal weapon tier list ranked', slug: 'vandal-tier', editor: 'NEXUS' },
    { headline: 'Season 2 patch notes breakdown', slug: 'patch-notes', editor: 'NEXUS' },
  ];
  assert.equal(closestDuplicate(cand, corpus, FLAT_IDF), null);
});

test('closestDuplicate: fewer than the min shared tokens -> null (guard)', () => {
  const cand = topicTokens('Destroyer');                        // 1 token < 3
  const corpus = [{ headline: 'Destroyer shell build guide', slug: 'x', editor: 'DEXTER' }];
  assert.equal(closestDuplicate(cand, corpus, FLAT_IDF), null);
  assert.ok(DUP_MIN_SHARED_TOKENS >= 3);
});

test('closestDuplicate: picks the HIGHEST-scoring dup among several', () => {
  const cand = topicTokens('Destroyer shell build');
  const corpus = [
    { headline: 'Destroyer shell build guide', slug: 'partial', editor: 'DEXTER' },   // 0.75
    { headline: 'Destroyer shell build',       slug: 'exact',   editor: 'GHOST' },     // 1.00
  ];
  const best = closestDuplicate(cand, corpus, FLAT_IDF);
  assert.equal(best.slug, 'exact', 'the exact-match (score 1.0) should win');
  assert.equal(best.score, 1);
});

test('closestDuplicate: skips corpus rows with no headline', () => {
  const cand = topicTokens('Destroyer shell build');
  const corpus = [
    { headline: null, slug: 'nullish', editor: 'X' },
    { headline: 'Destroyer shell build', slug: 'ok', editor: 'GHOST' },
  ];
  const best = closestDuplicate(cand, corpus, FLAT_IDF);
  assert.equal(best.slug, 'ok');
});
