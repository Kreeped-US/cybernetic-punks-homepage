// lib/content/dedupGate.test.mjs
// Guards decision (b) 2026-09-25: the dedup corpus is REJECTED-AWARE -- a rejected draft's topic counts
// as covered for REJECTED_COVERAGE_DAYS, so a rejected topic is not re-minted day after day (the Wardogs
// "Season 02 teaser" churn). Uses a fake supabase (no DB). dedupGate.js imports via the "@/" alias, so
// run WITH the resolve hook: node --import ./scripts/ext-resolve.register.mjs --test lib/content/dedupGate.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadSurvivorCorpus, findCorpusDuplicate, REJECTED_COVERAGE_DAYS } from './dedupGate.js';

const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();

// Fake supabase: an in-memory feed_items table + a filter engine covering the chains loadSurvivorCorpus
// uses (.eq / .not('noindex','is',true) / .or('rejected.is.null,rejected.eq.false') / .gte / .range).
// Entity-table reads (loadGameEntities) return [] so the overview index is empty (not under test here).
function fakeSupabase(rows) {
  return {
    from(table) {
      const conds = [];
      const q = {
        select() { return q; },
        eq(k, v) { conds.push((r) => r[k] === v); return q; },
        not(k, op, v) { if (op === 'is' && v === true) conds.push((r) => r[k] !== true); return q; },
        or() { conds.push((r) => r.rejected == null || r.rejected === false); return q; },
        gte(k, v) { conds.push((r) => r[k] != null && r[k] >= v); return q; },
        order() { return q; },
        contains() { return q; },
        range(a, b) {
          if (table !== 'feed_items') return Promise.resolve({ data: [], error: null });
          const out = rows.filter((r) => conds.every((f) => f(r))).slice(a, b + 1);
          return Promise.resolve({ data: out, error: null });
        },
      };
      return q;
    },
  };
}

const REJECTED_HEADLINE = 'Wardogs Season 02 Teaser: What The October Date Means';
const rows = [
  // published survivor
  { headline: 'Wardogs Loadout Basics for New Players', slug: 'p1', editor: 'MIRANDA', game_slug: 'wardogs', is_published: true, noindex: false, rejected: false, created_at: daysAgo(30) },
  // RECENT rejected (within window) -> should be IN the corpus
  { headline: REJECTED_HEADLINE, slug: 'r-recent', editor: 'NEXUS', game_slug: 'wardogs', is_published: false, rejected: true, created_at: daysAgo(1) },
  // OLD rejected (outside window) -> should be EXCLUDED
  { headline: 'Wardogs Ancient Rejected Topic Nobody Reused', slug: 'r-old', editor: 'NEXUS', game_slug: 'wardogs', is_published: false, rejected: true, created_at: daysAgo(REJECTED_COVERAGE_DAYS + 5) },
  // another game's recent rejected -> must NOT leak into wardogs corpus
  { headline: 'Marathon Vandal Rejected Draft', slug: 'r-other', editor: 'NEXUS', game_slug: 'marathon', is_published: false, rejected: true, created_at: daysAgo(1) },
];

test('REJECTED_COVERAGE_DAYS is 14', () => {
  assert.equal(REJECTED_COVERAGE_DAYS, 14);
});

test('corpus INCLUDES a recent rejected draft and EXCLUDES one older than the window', async () => {
  const { corpus } = await loadSurvivorCorpus(fakeSupabase(rows), 'wardogs');
  const slugs = corpus.map((r) => r.slug);
  assert.ok(slugs.includes('p1'), 'published survivor present');
  assert.ok(slugs.includes('r-recent'), 'recent rejected draft is now in the corpus (the fix)');
  assert.equal(slugs.includes('r-old'), false, 'rejected older than REJECTED_COVERAGE_DAYS is excluded');
  assert.equal(slugs.includes('r-other'), false, 'another game\'s rejected draft never leaks in (game-scoped)');
});

// A re-mint of a rejected topic reuses near-identical phrasing (cf. the real 2026-09-24/25 teasers). Use
// the same headline to test the deterministic BLOCK path; the point is the rejected row is now in scope.
const REMINT = REJECTED_HEADLINE;

test('a re-mint of a recently-rejected topic is BLOCKED by dedup (the churn fix)', async () => {
  const { corpus, idf } = await loadSurvivorCorpus(fakeSupabase(rows), 'wardogs');
  const res = findCorpusDuplicate(REMINT, corpus, idf);
  assert.equal(res.block, true, 'regenerated rejected topic should be blocked');
  assert.ok(res.match && res.match.slug === 'r-recent', 'matched against the recent rejected draft');
});

test('WITHOUT the recent rejected row, the same topic is NOT caught (proves the row is what catches it)', async () => {
  const noRejected = rows.filter((r) => r.slug !== 'r-recent');
  const { corpus, idf } = await loadSurvivorCorpus(fakeSupabase(noRejected), 'wardogs');
  const res = findCorpusDuplicate(REMINT, corpus, idf);
  assert.equal(res.block, false, 'no rejected coverage -> the old bug (re-mint passes dedup)');
  assert.equal(res.reviewFlag, false, 'not even review-flagged without the rejected row');
});
