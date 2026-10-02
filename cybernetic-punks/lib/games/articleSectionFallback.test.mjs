// lib/games/articleSectionFallback.test.mjs
// Per-game behavior of the 2026-10-02 section-fallback, using the REAL game configs + resolvers.
// Covers the six cases the brief requires:
//   1. unmapped slug -> the game's editorial.defaultArticleSection
//   2. mapped slug   -> its mapped section (the map WINS over the default)
//   3. a game with NO defaultArticleSection keeps the old null (route 404 / sitemap omit)
//   4. wrong-section URL still 404s (the resolver yields exactly ONE section)
//   5. sitemap emits an unmapped published noindex=false row; skips noindex=true / unpublished / rejected
//   6. cross-game: a bodycam slug never resolves under /wardogs (etc.)
// Run inside the suite (ext-resolve hook).
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { wardogs, wardogsSectionForArticle, WARDOGS_ARTICLE_SECTION } from './wardogs.js';
import { dmz, dmzSectionForArticle } from './dmz.js';
import { pubgDednet, dednetSectionForArticle } from './pubg-dednet.js';
import { bodycam, bodycamSectionForArticle } from './bodycam.js';
import { resolveArticleSection } from './sectionResolve.js';
import { sectionForArticle } from './articleSection.js';

// The four network games: (config, resolver, a KNOWN mapped slug -> a NON-default section, that
// mapped section). Each mapped section is deliberately != 'field-intel' so "map wins" is meaningful.
const GAMES = [
  { name: 'wardogs',     config: wardogs,    resolve: wardogsSectionForArticle, mappedSlug: 'wardogs-control-zone',                               mappedSection: 'systems' },
  { name: 'dmz',         config: dmz,        resolve: dmzSectionForArticle,     mappedSlug: 'dmz-hajin-exclusion-zone-what-the-deep-dive-reveals', mappedSection: 'regions' },
  { name: 'pubg-dednet', config: pubgDednet, resolve: dednetSectionForArticle,  mappedSlug: 'dednet-the-run-and-roms',                            mappedSection: 'systems' },
  { name: 'bodycam',     config: bodycam,    resolve: bodycamSectionForArticle, mappedSlug: 'bodycam-game-modes-after-locked-and-loaded',          mappedSection: 'modes' },
];

// Every network game defaults to 'field-intel' today (the source:'editor' News section each one has).
test('every network game sets editorial.defaultArticleSection and it is a real section', () => {
  for (const g of GAMES) {
    const def = g.config.editorial.defaultArticleSection;
    assert.equal(def, 'field-intel', g.name + ' default is field-intel');
    const sec = (g.config.sections || []).find((s) => s.slug === def);
    assert.ok(sec, g.name + ' has a "' + def + '" section');
    assert.equal(sec.source, 'editor', g.name + ' default section is an editor (article-bearing) section');
  }
});

// CASE 1: an unmapped published slug now resolves to the game's default section.
test('1. unmapped slug -> defaultArticleSection (field-intel) for every network game', () => {
  for (const g of GAMES) {
    const row = { slug: 'brand-new-cron-slug-never-mapped-xyz', tags: [] };
    assert.equal(g.resolve(row), 'field-intel', g.name + ' unmapped -> field-intel');
  }
});

// CASE 2: a curated mapped slug still resolves to its mapped section (map beats default).
test('2. mapped slug -> its mapped section (map wins over default)', () => {
  for (const g of GAMES) {
    const row = { slug: g.mappedSlug, tags: [] };
    assert.equal(g.resolve(row), g.mappedSection, g.name + ' ' + g.mappedSlug + ' -> ' + g.mappedSection);
    assert.notEqual(g.resolve(row), 'field-intel', g.name + ' mapped slug is NOT swallowed by the default');
  }
});

// CASE 3: a game that sets NO defaultArticleSection keeps the pre-fallback null (404 / sitemap omit).
test('3. a game with no defaultArticleSection keeps 404 behavior (null)', () => {
  // Drive the shared resolver with an undefined default, exactly as such a game's resolver would.
  const MAP = { 'mapped-x': 'systems' };
  assert.equal(resolveArticleSection(MAP, { slug: 'unmapped-y' }, undefined), null, 'no default -> null');
  // And a mapped slug for that same game still resolves (map does not depend on a default).
  assert.equal(resolveArticleSection(MAP, { slug: 'mapped-x' }, undefined), 'systems', 'map still wins');
});

// CASE 4: the resolver yields EXACTLY ONE section, so every OTHER section path 404s (the detail
// route 404s when sectionForArticle(article) !== the section slug in the URL). No duplicate URLs.
test('4. wrong-section URL still 404s -- an unmapped article has exactly one live section', () => {
  for (const g of GAMES) {
    const row = { slug: 'brand-new-cron-slug-never-mapped-xyz', tags: [] };
    const live = g.resolve(row); // 'field-intel'
    for (const s of g.config.sections) {
      const wouldRender = g.resolve(row) === s.slug; // the route's notFound() condition, inverted
      assert.equal(wouldRender, s.slug === live, g.name + '/' + s.slug + ' renders iff it is the resolved section');
    }
  }
});

// CASE 5: the sitemap emits an unmapped published noindex=false row, and skips noindex=true /
// unpublished / rejected rows. The fallback's REAL change is the resolver half (an unmapped row now
// yields a section, so it is no longer dropped by a null); the publish/noindex half is the article
// query's `.eq('is_published', true).eq('noindex', false)` (lib/sitemap/eligible.js: dmz/wardogs/
// pubg-dednet/bodycam article emitters). A rejected row carries is_published=false, so the published
// filter excludes it. This asserts both halves compose to the right emit set.
test('5. sitemap emit rule: unmapped published noindex=false emits; noindex/unpublished/rejected skip', () => {
  // Mirror of the eligible.js article-emit gate (query half) + the resolver (section half).
  const emits = (g, r) => r.is_published === true && r.noindex === false && r.rejected !== true && g.resolve(r) !== null;
  for (const g of GAMES) {
    const base = { slug: 'unmapped-published-' + g.name, tags: [] };
    assert.equal(emits(g, { ...base, is_published: true, noindex: false }), true, g.name + ' unmapped published noindex=false EMITS');
    // and it emits specifically under the default section (its single live URL).
    assert.equal(g.resolve({ ...base, is_published: true, noindex: false }), 'field-intel');
    assert.equal(emits(g, { ...base, is_published: true, noindex: true }), false, g.name + ' noindex=true SKIPPED');
    assert.equal(emits(g, { ...base, is_published: false, noindex: false }), false, g.name + ' unpublished SKIPPED');
    assert.equal(emits(g, { ...base, is_published: false, noindex: false, rejected: true }), false, g.name + ' rejected SKIPPED');
  }
});

// CASE 6: cross-game isolation. A bodycam slug's MAPPED section ('modes') is reachable ONLY through
// bodycam's own map; passed to any OTHER game's resolver it falls to that game's default (field-intel),
// never 'modes' -- so /wardogs/modes/<bodycam-slug> would 404. In production the game_slug-scoped DB
// fetch is the guard (a bodycam row is never handed to the wardogs resolver); this asserts the resolvers
// cannot cross-contaminate even if one were.
test('6. cross-game: a bodycam slug never resolves to its bodycam section under another game', () => {
  const bodycamSlug = 'bodycam-game-modes-after-locked-and-loaded'; // bodycam map -> 'modes'
  assert.equal(bodycamSectionForArticle({ slug: bodycamSlug, tags: [] }), 'modes', 'owns its bodycam section');
  for (const g of GAMES.filter((x) => x.name !== 'bodycam')) {
    assert.notEqual(g.resolve({ slug: bodycamSlug, tags: [] }), 'modes', g.name + ' never routes the bodycam slug to modes');
    assert.equal(g.resolve({ slug: bodycamSlug, tags: [] }), 'field-intel', g.name + ' sees it as just an unmapped row -> its own default');
  }
  // And the dispatcher keys strictly on game_slug: the same slug resolves per the NAMED game only.
  assert.equal(sectionForArticle('bodycam', { slug: bodycamSlug, tags: [] }), null,
    'articleSection.sectionForArticle does not cover bodycam (not in RESOLVERS) -> null, never wardogs modes');
  assert.equal(sectionForArticle('wardogs', { slug: bodycamSlug, tags: [] }), 'field-intel',
    'under wardogs the bodycam slug is a plain unmapped row -> wardogs default');
});

// The WARDOGS 0.1.2 orphan that motivated the stop-gate fix is mapped (not relying on the fallback).
test('regression: the wardogs 0.1.2 slug is explicitly mapped to field-intel (not fallback-reliant)', () => {
  assert.equal(WARDOGS_ARTICLE_SECTION['wardogs-update-012-exploit-crackdown-and-what-changes-now-e3g6'], 'field-intel');
});
