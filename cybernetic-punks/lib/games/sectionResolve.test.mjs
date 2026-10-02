// lib/games/sectionResolve.test.mjs
// Unit tests for the shared, game-agnostic resolveArticleSection (2026-10-02 section-fallback brief).
// This locks the RESOLUTION ORDER that every per-game *SectionForArticle delegates to, so the detail
// route and the sitemap (both of which call those resolvers) behave identically. Run inside the suite
// (ext-resolve hook). See lib/games/articleSectionFallback.test.mjs for the real per-game behavior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveArticleSection } from './sectionResolve.js';

const MAP = { 'mapped-slug': 'systems', 'other-mapped': 'economy' };

test('1. static-map hit wins over everything (map > preDefault > default)', () => {
  // even with a preDefault AND a default set, a curated slug keeps its mapped section.
  assert.equal(resolveArticleSection(MAP, { slug: 'mapped-slug' }, 'field-intel', 'discourse'), 'systems');
  assert.equal(resolveArticleSection(MAP, { slug: 'other-mapped' }, 'field-intel'), 'economy');
});

test('2. unmapped slug falls back to defaultSection when set', () => {
  assert.equal(resolveArticleSection(MAP, { slug: 'brand-new-cron-slug' }, 'field-intel'), 'field-intel');
});

test('3. preDefault (e.g. DMZ discourse TAG) is slotted BEFORE the generic default', () => {
  // an unmapped row with a preDefault resolves to the preDefault, NOT the default.
  assert.equal(resolveArticleSection(MAP, { slug: 'vantage-123' }, 'field-intel', 'discourse'), 'discourse');
  // but the map still beats the preDefault (covered in test 1); and with no preDefault, default wins.
  assert.equal(resolveArticleSection(MAP, { slug: 'vantage-123' }, 'field-intel', null), 'field-intel');
});

test('4. no defaultSection -> null (pre-fallback behavior: route 404s, sitemap omits)', () => {
  assert.equal(resolveArticleSection(MAP, { slug: 'brand-new-cron-slug' }), null);
  assert.equal(resolveArticleSection(MAP, { slug: 'brand-new-cron-slug' }, undefined), null);
  assert.equal(resolveArticleSection(MAP, { slug: 'brand-new-cron-slug' }, ''), null);
});

test('5. null/empty article or missing slug -> null (never throws)', () => {
  assert.equal(resolveArticleSection(MAP, null, 'field-intel'), null);
  assert.equal(resolveArticleSection(MAP, {}, 'field-intel'), null);
  assert.equal(resolveArticleSection(MAP, { slug: '' }, 'field-intel'), null);
  assert.equal(resolveArticleSection(undefined, { slug: 'x' }, 'field-intel'), 'field-intel');
});

test('6. pure (map, slug) mapping -- does NOT read game_slug (cross-game guard is the caller fetch)', () => {
  // a "foreign" slug resolves to the default here; cross-game safety is the callers game_slug filter,
  // never this function. (See articleSectionFallback.test.mjs case 6 for the real per-game assertion.)
  assert.equal(resolveArticleSection(MAP, { slug: 'bodycam-foo', game_slug: 'bodycam' }, 'field-intel'), 'field-intel');
});
