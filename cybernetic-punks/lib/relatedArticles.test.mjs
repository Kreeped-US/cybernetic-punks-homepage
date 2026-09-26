// lib/relatedArticles.test.mjs
// Guards the PURE rankRelated(): self-exclusion (id + slug), eligibility filtering (unpublished /
// noindex / rejected), overlap-then-recency ranking, case-insensitive tag overlap, the recency
// fallback (same-section then same-game) when overlap < 3, max + dedupe, and empty/null-tag inputs.
// Run: node --test lib/relatedArticles.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rankRelated } from './relatedArticles.js';

// A published, indexable, non-rejected candidate with sane defaults.
function art(o) {
  return Object.assign({ is_published: true, noindex: false, rejected: false, tags: [], created_at: '2026-01-01T00:00:00Z' }, o);
}
const slugs = (rows) => rows.map((r) => r.slug);

test('rankRelated excludes the current article by id AND by slug', () => {
  const current = art({ id: 1, slug: 'me', tags: ['a'] });
  const candidates = [
    art({ id: 1, slug: 'me-again', tags: ['a'] }),   // same id -> excluded
    art({ id: 9, slug: 'me', tags: ['a'] }),         // same slug -> excluded
    art({ id: 2, slug: 'other', tags: ['a'] }),      // kept
  ];
  assert.deepEqual(slugs(rankRelated(current, candidates, { max: 5 })), ['other']);
});

test('rankRelated excludes unpublished / noindex / rejected candidates', () => {
  const current = art({ id: 1, slug: 'me', tags: ['a'] });
  const candidates = [
    art({ id: 2, slug: 'unpub', tags: ['a'], is_published: false }),
    art({ id: 3, slug: 'noindex', tags: ['a'], noindex: true }),
    art({ id: 4, slug: 'rejected', tags: ['a'], rejected: true }),
    art({ id: 5, slug: 'good', tags: ['a'] }),
  ];
  assert.deepEqual(slugs(rankRelated(current, candidates, { max: 5 })), ['good']);
});

test('rankRelated ranks by overlap count DESC, then created_at DESC', () => {
  const current = art({ id: 1, slug: 'me', tags: ['a', 'b', 'c'] });
  const candidates = [
    art({ id: 2, slug: 'one-old', tags: ['a'], created_at: '2026-01-01T00:00:00Z' }),      // overlap 1
    art({ id: 3, slug: 'three', tags: ['a', 'b', 'c'], created_at: '2026-02-01T00:00:00Z' }), // overlap 3
    art({ id: 4, slug: 'two', tags: ['a', 'b'], created_at: '2026-03-01T00:00:00Z' }),      // overlap 2
    art({ id: 5, slug: 'one-new', tags: ['b'], created_at: '2026-05-01T00:00:00Z' }),       // overlap 1, newer
  ];
  // 3 > 2 > (1 newest 'one-new' before 1 older 'one-old')
  assert.deepEqual(slugs(rankRelated(current, candidates, { max: 5 })), ['three', 'two', 'one-new', 'one-old']);
});

test('rankRelated tag overlap is case-insensitive (and dedupes candidate tags)', () => {
  const current = art({ id: 1, slug: 'me', tags: ['Economy', 'Weapons'] });
  const candidates = [
    art({ id: 2, slug: 'match', tags: ['ECONOMY', 'economy', ' weapons '] }), // dupes + case + whitespace -> overlap 2
    art({ id: 3, slug: 'none', tags: ['maps'] }),
  ];
  const out = rankRelated(current, candidates, { max: 5 });
  assert.equal(out[0].slug, 'match', 'case/whitespace-insensitive overlap match ranks first');
});

test('rankRelated: when overlap < 3, fill same-section first, then same-game any-section (recency)', () => {
  const current = art({ id: 1, slug: 'me', tags: ['a'], section: 'economy' });
  const candidates = [
    art({ id: 2, slug: 'overlap', tags: ['a'], section: 'systems', created_at: '2026-01-01T00:00:00Z' }), // 1 overlap
    art({ id: 3, slug: 'samesec-new', tags: ['z'], section: 'economy', created_at: '2026-06-01T00:00:00Z' }),
    art({ id: 4, slug: 'samesec-old', tags: ['z'], section: 'economy', created_at: '2026-03-01T00:00:00Z' }),
    art({ id: 5, slug: 'othersec', tags: ['z'], section: 'field-intel', created_at: '2026-09-01T00:00:00Z' }),
  ];
  // overlap match first, then same-section by recency (new before old), then any-section (othersec last)
  assert.deepEqual(slugs(rankRelated(current, candidates, { max: 5 })), ['overlap', 'samesec-new', 'samesec-old', 'othersec']);
});

test('rankRelated: >= 3 overlap matches -> no recency padding (only relevant links)', () => {
  const current = art({ id: 1, slug: 'me', tags: ['a', 'b', 'c'], section: 'economy' });
  const candidates = [
    art({ id: 2, slug: 'o1', tags: ['a'] }), art({ id: 3, slug: 'o2', tags: ['b'] }), art({ id: 4, slug: 'o3', tags: ['c'] }),
    art({ id: 5, slug: 'filler', tags: ['z'], section: 'economy' }), // would only appear via fallback
  ];
  assert.deepEqual(slugs(rankRelated(current, candidates, { max: 5 })).sort(), ['o1', 'o2', 'o3'], 'no fallback when overlap >= 3');
});

test('rankRelated respects max and never returns duplicates', () => {
  const current = art({ id: 1, slug: 'me', tags: ['a'] });
  const candidates = [
    art({ id: 2, slug: 'a1', tags: ['a'] }), art({ id: 3, slug: 'a2', tags: ['a'] }),
    art({ id: 4, slug: 'a3', tags: ['a'] }), art({ id: 5, slug: 'dup', tags: ['a'] }),
    art({ id: 5, slug: 'dup', tags: ['a'] }), // duplicate row
  ];
  const out = rankRelated(current, candidates, { max: 2 });
  assert.equal(out.length, 2, 'capped at max');
  assert.equal(new Set(slugs(out)).size, out.length, 'no duplicate slugs');
});

test('rankRelated: empty candidates -> []', () => {
  assert.deepEqual(rankRelated(art({ id: 1, slug: 'me', tags: ['a'] }), [], { max: 5 }), []);
});

test('rankRelated: current with null/empty tags -> fallback only, no crash', () => {
  const current = art({ id: 1, slug: 'me', tags: null, section: 'economy' });
  const candidates = [
    art({ id: 2, slug: 'samesec', tags: ['x'], section: 'economy', created_at: '2026-05-01T00:00:00Z' }),
    art({ id: 3, slug: 'othersec', tags: ['y'], section: 'systems', created_at: '2026-09-01T00:00:00Z' }),
  ];
  // No overlap possible -> pure fallback: same-section first, then any-section.
  assert.deepEqual(slugs(rankRelated(current, candidates, { max: 5 })), ['samesec', 'othersec']);
});
