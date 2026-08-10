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
  closestMatch,
  coverageScore,
  phraseContained,
  DUP_MIN_SHARED_TOKENS,
  CANDIDATE_MIN_SHARED_TOKENS,
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

test('1a floors: candidate path is 2, headline path stays 3 (MIRANDA guard untouched)', () => {
  assert.equal(CANDIDATE_MIN_SHARED_TOKENS, 2);
  assert.equal(DUP_MIN_SHARED_TOKENS, 3, 'headline-path floor must stay 3');
});

test('1a: a 2-token candidate COMPARES (does not short-circuit) with minShared=2', () => {
  const cand = topicTokens('Destroyer shell');                  // [destroyer, shell] = 2 tokens
  // exact topic match -> shared 2, union 2 -> score 1.0 >= 0.7 -> a dup, PRODUCING a score.
  const corpus = [{ headline: 'Destroyer shell', slug: 'destroyer-shell', editor: 'DEXTER' }];
  const best = closestDuplicate(cand, corpus, FLAT_IDF, { minShared: CANDIDATE_MIN_SHARED_TOKENS });
  assert.ok(best, '2-token candidate should now compare, not short-circuit');
  assert.equal(best.slug, 'destroyer-shell');
  assert.equal(best.shared, 2);
  assert.equal(best.score, 1);
  // and under the OLD headline floor (3), the same 2-token candidate short-circuits to null
  assert.equal(closestDuplicate(cand, corpus, FLAT_IDF, { minShared: 3 }), null);
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

// ── increment 1b: closestMatch (observability, sub-threshold top score) ──────
test('1b closestMatch: returns the top SUB-threshold row that closestDuplicate drops', () => {
  const cand = topicTokens('Destroyer shell');                  // 2 tokens
  // 'Destroyer shell build guide' -> shared 2, union 4 -> 0.5 (below 0.7).
  const corpus = [{ headline: 'Destroyer shell build guide', slug: 'ds-guide', editor: 'DEXTER' }];
  // closestDuplicate finds nothing (0.5 < 0.7)...
  assert.equal(closestDuplicate(cand, corpus, FLAT_IDF, { minShared: 2 }), null);
  // ...but closestMatch surfaces it for the log.
  const near = closestMatch(cand, corpus, FLAT_IDF, { minShared: 2 });
  assert.ok(near, 'closestMatch returns the sub-threshold row');
  assert.equal(near.slug, 'ds-guide');
  assert.equal(near.shared, 2);
  assert.equal(near.score, 0.5);
});

test('1b closestMatch: picks the HIGHEST sub-threshold score among several', () => {
  const cand = topicTokens('Destroyer shell');
  const corpus = [
    { headline: 'Destroyer shell build guide', slug: 'lower', editor: 'A' },  // 2/4 = 0.50
    { headline: 'Destroyer shell build',       slug: 'higher', editor: 'B' }, // 2/3 = 0.667
  ];
  const near = closestMatch(cand, corpus, FLAT_IDF, { minShared: 2 });
  assert.equal(near.slug, 'higher');
  assert.ok(Math.abs(near.score - 2 / 3) < 1e-9);
});

test('1b closestMatch: respects the minShared floor (short cand / no qualifying row -> null)', () => {
  // candidate too short for the floor
  assert.equal(closestMatch(topicTokens('Destroyer'), [{ headline: 'Destroyer shell', slug: 'x' }], FLAT_IDF, { minShared: 2 }), null);
  // no corpus row shares >= minShared tokens with the candidate
  const cand = topicTokens('Destroyer shell');
  const corpus = [{ headline: 'Vandal weapon tier list', slug: 'y', editor: 'N' }];
  assert.equal(closestMatch(cand, corpus, FLAT_IDF, { minShared: 2 }), null);
});

// ── increment 1c: asymmetric coverage (containment) metric ───────────────────
test('1c coverageScore: full containment=1.0, partial, zero, guarded denominator', () => {
  assert.equal(coverageScore(2, 2), 1, 'both candidate tokens covered -> 1.0');
  assert.equal(coverageScore(1, 2), 0.5, 'half the candidate covered');
  assert.equal(coverageScore(0, 3), 0, 'nothing covered');
  assert.equal(coverageScore(3, 3), 1);
  assert.equal(coverageScore(2, 0), 0, 'zero-length candidate -> 0 (no divide-by-zero)');
  assert.equal(coverageScore(1, undefined), 0, 'missing denominator -> 0');
});

test('1c closestMatch: attaches coverage=shared/candidateTokens (Jaccard diluted, coverage clean)', () => {
  const cand = topicTokens('Destroyer shell');                  // 2 tokens
  // a long headline that FULLY contains the candidate but has a descriptive tail:
  // shared 2, union 6 -> jaccard 0.33, but coverage 2/2 = 1.00 (the 1c point).
  const corpus = [{ headline: 'Destroyer shell squad dominance ranked guide', slug: 'ds', editor: 'NEXUS' }];
  const near = closestMatch(cand, corpus, FLAT_IDF, { minShared: 2 });
  assert.equal(near.shared, 2);
  assert.ok(near.score < 0.5, 'symmetric Jaccard is diluted by the headline tail');
  assert.equal(near.coverage, 1, 'coverage cleanly reads full containment');
});

// ── increment 1d-observe: phrase (bigram) containment separates true vs false ─
test('1d phraseContained: a CONTIGUOUS candidate phrase in the page -> true (true reinforce)', () => {
  // "Destroyer shell" bigram destroyer_shell appears contiguously in the page title.
  assert.equal(
    phraseContained('Destroyer shell', 'Marathon Destroyer Shell: Squad Dominance and Ranked Guide'),
    true
  );
  assert.equal(phraseContained('Recon shell', 'Marathon Recon Shell: Map Control and Ranked Squad Guide'), true);
});

test('1d phraseContained: SCATTERED tokens (cov=1.00 false-positive) -> false', () => {
  // "Squad ranked" fully covers this page by tokens, but squad_ranked is NOT contiguous
  // ("Squad Support Engine for Ranked") -> the discriminator that coverage/jaccard miss.
  assert.equal(
    phraseContained('Squad ranked', 'Marathon Triage Build: The Squad Support Engine for Ranked'),
    false
  );
  assert.equal(
    phraseContained('Extraction build', 'Marathon Thief Build: Solo Ranked Holotag Extraction Guide'),
    false
  );
});

test('1d phraseContained: a 1-token (or empty) candidate has no bigram -> null (guarded edge)', () => {
  assert.equal(phraseContained('Destroyer', 'Marathon Destroyer Shell: guide'), null);
  assert.equal(phraseContained('', 'anything'), null);
  assert.equal(phraseContained(null, 'anything'), null);
});

test('1d phraseContained: order matters (a reversed phrase is not contiguous) + null headline safe', () => {
  // candidate bigram destroyer_shell; page has "shell destroyer" (reversed) -> no match.
  assert.equal(phraseContained('Destroyer shell', 'The shell destroyer walkthrough'), false);
  assert.equal(phraseContained('Destroyer shell', null), false);
});
