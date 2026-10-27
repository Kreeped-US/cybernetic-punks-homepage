// lib/games/navMin.test.mjs
// Brief 190: the thin-section rule is pure and game-agnostic: a section with navMinArticles is shown and linked
// only at or above that article count; sections without it are never affected; no game names in the module.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { navMinArticles, meetsNavMin, navMinContent, navHiddenSlugs } from './navMin.js';
import { gatedHref } from './linkGate.js';

const SECTIONS = [{ slug: 'news' }, { slug: 'thin', navMinArticles: 3 }, { slug: 'odd', navMinArticles: 0 }, { slug: 'bad', navMinArticles: '3' }];

test('navMinArticles: a positive number only; anything else means no minimum', () => {
  assert.deepEqual(SECTIONS.map(navMinArticles), [null, 3, null, null]);
  assert.equal(navMinArticles(null), null);
});

test('meetsNavMin: below the minimum false, at or above true; no minimum always true', () => {
  const thin = SECTIONS[1];
  assert.deepEqual([0, 1, 2, 3, 9].map((n) => meetsNavMin(thin, n)), [false, false, false, true, true]);
  assert.equal(meetsNavMin(thin, undefined), false);
  for (const n of [0, 1, undefined]) assert.equal(meetsNavMin(SECTIONS[0], n), true);
});

test('navMinContent: only sections with a minimum, the count when met, else 0, under the given base path', () => {
  assert.deepEqual(navMinContent(SECTIONS, { news: 9, thin: 1 }, '/g/'), { '/g/thin': 0 });
  assert.deepEqual(navMinContent(SECTIONS, { thin: 4 }, '/g/'), { '/g/thin': 4 });
  assert.equal(gatedHref('/g/thin', navMinContent(SECTIONS, { thin: 2 }, '/g/')), null);
  assert.equal(gatedHref('/g/thin', navMinContent(SECTIONS, { thin: 3 }, '/g/')), '/g/thin');
  assert.equal(gatedHref('/g/news', navMinContent(SECTIONS, {}, '/g/')), '/g/news', 'no minimum: never gated');
});

test('navHiddenSlugs: hidden only below a set minimum', () => {
  assert.deepEqual(navHiddenSlugs(SECTIONS, { thin: 1 }), ['thin']);
  assert.deepEqual(navHiddenSlugs(SECTIONS, {}), ['thin']);
  assert.deepEqual(navHiddenSlugs(SECTIONS, { thin: 3 }), []);
  assert.deepEqual(navHiddenSlugs(null, {}), []);
});

test('game-agnostic: no game names and no I/O in the module', () => {
  const src = readFileSync(path.resolve('lib/games/navMin.js'), 'utf8').replace(/^\s*\/\/.*$/gm, '');
  assert.ok(!/dmz|marathon|wardogs|bodycam/i.test(src));
  assert.ok(!/import|fetch|supabase|require\(/.test(src));
});
