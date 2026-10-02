// lib/games/sectionArticles.test.mjs
// Section lists + counts + indexability go through the SHARED resolver (2026-10-02). Uses the REAL game
// configs/resolvers and an in-memory feed_items fake that APPLIES the query filters, so these assert
// behavior: a fallback-routed (unmapped) article appears in its section list and count, a section whose
// only article is fallback-routed is indexable, mapped articles are unchanged, eligibility is
// published + noindex=false + not rejected, and rows from another game are never counted.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fakeFeedDb, row } from './fakeFeedDb.test-helper.mjs';
import {
  fetchArticleIndex, sectionCounts, sectionHasArticles, loadSectionArticles,
  countsBySection, slugsInSection, isEligibleArticle,
} from './sectionArticles.js';
import { sectionHasContent as dmzHasContent } from '../dmz/sections.js';
import { sectionHasContent as wardogsHasContent } from '../wardogs/sections.js';
import { sectionHasContent as dednetHasContent } from '../pubg-dednet/sections.js';
import { wardogs } from './wardogs.js';
import { dmz } from './dmz.js';
import { pubgDednet } from './pubg-dednet.js';
import { bodycam } from './bodycam.js';

// Per game: a REAL mapped slug -> its NON-default mapped section, and the game's own predicate (if any).
const GAMES = [
  { slug: 'wardogs',     config: wardogs,    mapped: 'wardogs-control-zone',                                 mappedSection: 'systems', hasContent: wardogsHasContent },
  { slug: 'dmz',         config: dmz,        mapped: 'dmz-forward-operating-base-every-hub-system-detailed', mappedSection: 'fob',     hasContent: dmzHasContent },
  { slug: 'pubg-dednet', config: pubgDednet, mapped: 'dednet-the-run-and-roms',                              mappedSection: 'systems', hasContent: dednetHasContent },
  { slug: 'bodycam',     config: bodycam,    mapped: 'bodycam-game-modes-after-locked-and-loaded',           mappedSection: 'modes',   hasContent: null },
];
const UNMAPPED = 'brand-new-cron-slug-never-mapped-xyz';
const section = (g, slug) => g.config.sections.find((s) => s.slug === slug);
const explodingDb = { from() { throw new Error('DB must NOT be queried'); } };

// ── fallback-only article: in its section's list AND count ─────────────────────────────────────────
test('fallback-only (unmapped) article appears in its default section list and count', async () => {
  for (const g of GAMES) {
    const db = fakeFeedDb([row(g.slug, UNMAPPED)]);
    const list = await loadSectionArticles(g.slug, 'field-intel', { client: db });
    assert.deepEqual(list.map((r) => r.slug), [UNMAPPED], g.slug + ': listed under field-intel');
    const counts = await sectionCounts(g.slug, db);
    assert.equal(counts['field-intel'], 1, g.slug + ': counted under field-intel');
    // ...and nowhere else (one live section per article).
    for (const s of g.config.sections) if (s.slug !== 'field-intel') assert.ok(!counts[s.slug], g.slug + ': not counted under ' + s.slug);
  }
});

// ── a section whose ONLY article is fallback-routed is indexable ───────────────────────────────────
test('section whose only article is fallback-routed is indexable (sectionHasContent true)', async () => {
  for (const g of GAMES) {
    const db = fakeFeedDb([row(g.slug, UNMAPPED)]);
    const fi = section(g, 'field-intel');
    assert.equal(await sectionHasArticles(g.slug, fi, db), true, g.slug + ': shared predicate true');
    if (g.hasContent) assert.equal(await g.hasContent(fi, db), true, g.slug + ': lib/<game>/sections.js predicate true');
    // the mapped section has no rows here -> still false (no over-exposure)
    assert.equal(await sectionHasArticles(g.slug, section(g, g.mappedSection), db), false, g.slug + ': empty mapped section stays noindex');
  }
});

// ── mapped articles unchanged ──────────────────────────────────────────────────────────────────────
test('mapped article stays in its mapped section (map wins over the default)', async () => {
  for (const g of GAMES) {
    const db = fakeFeedDb([row(g.slug, g.mapped)]);
    assert.deepEqual((await loadSectionArticles(g.slug, g.mappedSection, { client: db })).map((r) => r.slug), [g.mapped]);
    assert.deepEqual(await loadSectionArticles(g.slug, 'field-intel', { client: db }), [], g.slug + ': not duplicated under the default');
    assert.deepEqual(await sectionCounts(g.slug, db), { [g.mappedSection]: 1 });
    assert.equal(await sectionHasArticles(g.slug, section(g, g.mappedSection), db), true);
  }
});

// ── cross-game rows never counted ──────────────────────────────────────────────────────────────────
test('cross-game: rows of other games are never listed or counted', async () => {
  // Every game's mapped slug + an unmapped slug, each stored under EVERY game -- plus same-slug collisions.
  const all = [];
  for (const owner of GAMES) for (const g of GAMES) {
    all.push(row(owner.slug, g.mapped + (owner.slug === g.slug ? '' : '--' + owner.slug)));
  }
  all.push(row('bodycam', 'only-in-bodycam'));
  for (const g of GAMES) {
    const db = fakeFeedDb(all);
    const idx = await fetchArticleIndex(g.slug, db);
    assert.ok(idx.length > 0 && idx.every((r) => r.game_slug === g.slug), g.slug + ': index is game-scoped');
    const own = all.filter((r) => r.game_slug === g.slug).length;
    assert.ok(own < all.length, 'fixture has foreign rows');
    const total = Object.values(await sectionCounts(g.slug, db)).reduce((a, b) => a + b, 0);
    assert.equal(total, own, g.slug + ': counts only its own ' + own + ' rows');
  }
  // A bodycam-mapped slug published under WARDOGS is just an unmapped wardogs row: wardogs default,
  // never bodycam 'modes'.
  const db = fakeFeedDb([row('wardogs', 'bodycam-game-modes-after-locked-and-loaded'), row('bodycam', 'bodycam-game-modes-after-locked-and-loaded')]);
  assert.deepEqual(await sectionCounts('wardogs', db), { 'field-intel': 1 });
  assert.deepEqual(await sectionCounts('bodycam', db), { modes: 1 });
});

// ── eligibility: published + noindex=false + rejected IS NOT TRUE ──────────────────────────────────
test('eligibility: noindex / unpublished / rejected rows are never listed, counted, or make a section indexable', async () => {
  for (const g of GAMES) {
    const bad = [
      row(g.slug, 'a-noindex', { noindex: true }),
      row(g.slug, 'a-unpublished', { is_published: false }),
      row(g.slug, 'a-rejected', { rejected: true }),
    ];
    const db = fakeFeedDb(bad);
    assert.deepEqual(await sectionCounts(g.slug, db), {}, g.slug + ': nothing counted');
    assert.deepEqual(await loadSectionArticles(g.slug, 'field-intel', { client: db }), [], g.slug + ': nothing listed');
    assert.equal(await sectionHasArticles(g.slug, section(g, 'field-intel'), db), false, g.slug + ': not indexable');
    // rejected = null / false both pass (SQL IS NOT TRUE)
    const ok = fakeFeedDb([row(g.slug, 'r-null', { rejected: null }), row(g.slug, 'r-false', { rejected: false })]);
    assert.equal((await sectionCounts(g.slug, ok))['field-intel'], 2, g.slug + ': rejected null/false are eligible');
  }
  assert.equal(isEligibleArticle(row('dmz', 'x', { noindex: true })), false);
  assert.equal(isEligibleArticle(row('dmz', 'x')), true);
});

// ── DMZ discourse TAG still routes to the Discourse section ───────────────────────────────────────
test('dmz: a discourse-tagged (unmapped) article counts under discourse, not the default', async () => {
  const db = fakeFeedDb([row('dmz', 'vantage-generated-123', { tags: ['discourse'] })]);
  assert.deepEqual(await sectionCounts('dmz', db), { discourse: 1 });
  assert.equal(await dmzHasContent(section(GAMES[1], 'discourse'), db), true);
  assert.equal(await dmzHasContent(section(GAMES[1], 'field-intel'), db), false);
});

// ── data sections never touch the DB; read errors are loud ────────────────────────────────────────
test('data section -> false without a DB read; a read error THROWS (loud failure)', async () => {
  assert.equal(await sectionHasArticles('bodycam', section(GAMES[3], 'arsenal'), explodingDb), false);
  assert.equal(await dmzHasContent(section(GAMES[1], 'printer'), explodingDb), false);
  assert.equal(await sectionHasArticles('dmz', null, explodingDb), false);
  await assert.rejects(() => sectionCounts('wardogs', fakeFeedDb([], { error: 'boom' })), /wardogs article index read failed: boom/);
  await assert.rejects(() => loadSectionArticles('bodycam', 'field-intel', { client: fakeFeedDb([], { error: 'boom' }) }), /read failed/);
});

// ── list order + limit ────────────────────────────────────────────────────────────────────────────
test('section list is newest-first and honors the limit', async () => {
  const rows = [1, 2, 3, 4].map((d) => row('bodycam', 'n' + d, { created_at: '2026-10-0' + d + 'T00:00:00Z' }));
  const db = fakeFeedDb(rows);
  assert.deepEqual((await loadSectionArticles('bodycam', 'field-intel', { client: db, limit: 3 })).map((r) => r.slug), ['n4', 'n3', 'n2']);
});

// ── pure helpers ──────────────────────────────────────────────────────────────────────────────────
test('pure helpers: slugsInSection / countsBySection agree with the resolver', () => {
  const rows = [row('wardogs', 'wardogs-control-zone'), row('wardogs', UNMAPPED), row('wardogs', 'z', { noindex: true })];
  assert.deepEqual(slugsInSection('wardogs', 'systems', rows), ['wardogs-control-zone']);
  assert.deepEqual(slugsInSection('wardogs', 'field-intel', rows), [UNMAPPED]);
  assert.deepEqual(countsBySection('wardogs', rows), { systems: 1, 'field-intel': 1 });
  assert.deepEqual(countsBySection('wardogs', null), {});
});
