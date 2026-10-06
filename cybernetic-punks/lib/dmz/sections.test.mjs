// lib/dmz/sections.test.mjs
// Regression guard for DMZ sectionHasContent -- the predicate that gates BOTH sitemap inclusion AND
// section indexability (noindex tag). Since 2026-10-02 it resolves membership through the SHARED
// section resolver (lib/games/sectionArticles.js -> dmzSectionForArticle) instead of the static
// DMZ_ARTICLE_SECTION map + a separate discourse tag count, so this now tests BEHAVIOR against an
// in-memory feed_items fake that applies the real filters (not the old query-shape spy).
// Run: node --test lib/dmz/sections.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sectionHasContent } from './sections.js';
import { dmz } from '../games/dmz.js';
import { fakeFeedDb, row } from '../games/fakeFeedDb.test-helper.mjs';

const sectionBySlug = (slug) => dmz.sections.find((s) => s.slug === slug);
// A fake that EXPLODES if the DB is touched -- proves a pure-mapping short-circuit.
const explodingDb = { from() { throw new Error('DB must NOT be queried on a pure-mapping short-circuit'); } };

// -- a plain DATA section (no standalone reference) -> false, WITHOUT touching the DB --
test('data section returns false and never queries the DB', async () => {
  assert.equal(await sectionHasContent({ slug: 'some-tool', source: 'data' }, explodingDb), false);
});

// -- STANDALONE reference section (printer) -> true, WITHOUT touching the DB --
test('standalone reference section (printer) is content in its own right and never queries the DB', async () => {
  const printer = sectionBySlug('printer');
  assert.equal(printer.source, 'data', 'fixture: printer stays a data section');
  assert.equal(printer.reference && printer.reference.standalone, true, 'fixture: printer reference is standalone');
  assert.equal(await sectionHasContent(printer, explodingDb), true);
});

// -- a NON-standalone reference block (FOB) keeps the article rule --
test('FOB reference block is not standalone: its indexability still depends on its articles', async () => {
  const fob = sectionBySlug('fob');
  assert.ok(fob.reference && !fob.reference.standalone, 'fixture: fob has a reference block, not standalone');
  assert.equal(await sectionHasContent(fob, fakeFeedDb([])), false);
});

// ── EDITOR section with no resolving rows -> false (meta has no mapped article) ─
test('editor section with no eligible resolving article (meta) returns false', async () => {
  const m = sectionBySlug('meta');
  assert.equal(m.source, 'editor', 'fixture: meta is an editor section');
  const db = fakeFeedDb([row('dmz', 'dmz-forward-operating-base-every-hub-system-detailed')]); // a fob row
  assert.equal(await sectionHasContent(m, db), false, 'nothing resolves to meta -> not indexable');
});

// ── EDITOR via the REAL slug map (fob) ──────────────────────────────────────────
test('editor section via slug-map (fob): a published mapped article makes it indexable', async () => {
  const fob = sectionBySlug('fob');
  const db = fakeFeedDb([row('dmz', 'dmz-forward-operating-base-every-hub-system-detailed')]);
  assert.equal(await sectionHasContent(fob, db), true, 'the REAL DMZ_ARTICLE_SECTION mapping for fob resolves');
});

// ── EDITOR via the discourse TAG ────────────────────────────────────────────────
test('editor section via byTag (discourse): a tagged article makes it indexable', async () => {
  const disc = sectionBySlug('discourse');
  assert.ok(disc.contentFilter && disc.contentFilter.byTag === 'discourse', 'fixture: discourse maps by tag');
  const db = fakeFeedDb([row('dmz', 'vantage-generated-xyz', { tags: ['discourse'] })]);
  assert.equal(await sectionHasContent(disc, db), true);
});

// ── mapped section with zero eligible rows -> false (the shell state) ───────────
test('mapped section with zero eligible rows returns false (the shell state)', async () => {
  const fob = sectionBySlug('fob');
  const db = fakeFeedDb([row('dmz', 'dmz-forward-operating-base-every-hub-system-detailed', { is_published: false })]);
  assert.equal(await sectionHasContent(fob, db), false, 'mapping resolves but the row is unpublished -> not indexable');
});

// ── Guard: a missing/nullish section is false (never throws) ────────────────────
test('missing section returns false', async () => {
  assert.equal(await sectionHasContent(null, explodingDb), false);
  assert.equal(await sectionHasContent(undefined, explodingDb), false);
});
