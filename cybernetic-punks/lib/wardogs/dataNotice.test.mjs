// lib/wardogs/dataNotice.test.mjs
// The Wardogs data-version notice: config present and ASCII, the source is Bulkhead's Steam Season 2 patch notes,
// the helper is game-agnostic and page-scoped, and every listed page renders it with its own key.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { wardogs } from '../games/wardogs.js';
import { dataNoticeFor } from './dataNotice.js';
import { loadComponent, render } from '../games/jsxHarness.test-helper.mjs';

const N = wardogs.dataNotice;
const PAGE_FILES = {
  'hub': 'app/wardogs/page.js',
  'arsenal': 'app/wardogs/arsenal/page.js',
  'arsenal/[slug]': 'app/wardogs/arsenal/[slug]/page.js',
  'tier-list': 'app/wardogs/tier-list/page.js',
  'loadouts': 'app/wardogs/loadouts/page.js',
  'loadouts/best/[type]': 'app/wardogs/loadouts/best/[type]/page.js',
  'loadouts/build/[slug]': 'app/wardogs/loadouts/build/[slug]/page.js',
  'attachments': 'app/wardogs/attachments/page.js',
  'economy': 'app/wardogs/economy/page.js',
};

test('config entry exists with text, source and pages; all ASCII', () => {
  assert.ok(N, 'wardogs.dataNotice is set');
  assert.equal(N.since, '2026-10-16');
  for (const k of ['text', 'sourceLabel', 'sourceUrl']) {
    assert.ok(typeof N[k] === 'string' && N[k].length > 0, k);
    assert.ok(!/[^\x00-\x7f]/.test(N[k]), k + ' is ASCII');
  }
  assert.ok(!/[\u2013\u2014\u2018\u2019\u201c\u201d`]/.test(N.text + N.sourceLabel));
  assert.ok(!/\d+(\.\d+)?\s*%|\d+\s*(ms|rpm|dmg)\b/i.test(N.text), 'no figures in the notice');
});

test('one text on every listed page (no overrides); the override mechanism stays game-agnostic', () => {
  assert.equal(N.overrides, undefined, 'Season 2 partial-update text fits every page');
  for (const p of N.pages) {
    const n = dataNoticeFor(wardogs, p);
    assert.equal(n.text, N.text, p);
    assert.equal(n.sourceUrl, N.sourceUrl, p);
    assert.equal(n.sourceLabel, N.sourceLabel, p);
  }
  const g ={ dataNotice: { text: 'd', sourceLabel: 'y', sourceUrl: 'z', pages: ['a', 'b'], overrides: { b: { text: 'o' }, c: { text: 'x' } } } };
  assert.equal(dataNoticeFor(g, 'a').text, 'd');
  assert.equal(dataNoticeFor(g, 'b').text, 'o');
  assert.equal(dataNoticeFor(g, 'c'), null, 'an override does not list a page by itself');
});

test('source is Bulkhead\'s Steam Season 2 patch notes post', () => {
  assert.equal(N.sourceUrl, 'https://store.steampowered.com/news/app/1867240/view/670630562731396445');
  assert.equal(N.sourceLabel, "Bulkhead's Season 2 patch notes (Oct 14, 2026)");
  assert.equal(N.text, "As of October 16, 2026: many vendor prices and unlock levels have been updated to Bulkhead's Season 02 patch notes (October 14); some are still being applied. Unlock fees, attachment prices, new Season 2 items and weapon damage and ballistics are still Season 1 community-aggregated values and are being re-checked. Season 2 cuts base damage for several calibres, adjusts recoil and suppression and changes armor and helmet protection, so weapon figures may differ.");
  const all = N.text + N.sourceLabel + N.sourceUrl;
  assert.ok(!/October 9|Oct 9|preview|670630562731395011/i.test(all), 'no reference to the superseded Oct 9 preview');
});

test('dataNoticeFor: page-scoped, game-agnostic, null when absent or incomplete', () => {
  assert.equal(dataNoticeFor(wardogs, 'tier-list'), N);
  assert.equal(dataNoticeFor(wardogs, 'field-intel'), null, 'unlisted page');
  assert.equal(dataNoticeFor({ dataNotice: null }, 'tier-list'), null);
  assert.equal(dataNoticeFor({}, 'tier-list'), null);
  assert.equal(dataNoticeFor(null, 'tier-list'), null);
  assert.equal(dataNoticeFor({ dataNotice: { text: 'x', sourceLabel: 'y', sourceUrl: 'z', pages: ['p'] } }, 'p').text, 'x', 'any game config');
  assert.equal(dataNoticeFor({ dataNotice: { text: 'x', sourceLabel: 'y', pages: ['p'] } }, 'p'), null, 'missing source -> null');
});

test('every listed page renders the notice exactly once with its own key, and nothing else is listed', () => {
  assert.deepEqual([...N.pages].sort(), Object.keys(PAGE_FILES).sort());
  for (const [key, file] of Object.entries(PAGE_FILES)) {
    const src = readFileSync(new URL('../../' + file, import.meta.url), 'utf8');
    assert.equal(src.split('<WardogsDataNotice page="' + key + '"').length - 1, 1, file);
    assert.equal(src.split('<WardogsDataNotice').length - 1, 1, file + ' renders one notice');
  }
});

test('economy page renders the Season 2 partial-update notice with its as-of date and source link', async () => {
  const src = readFileSync(new URL('../../app/wardogs/economy/page.js', import.meta.url), 'utf8');
  assert.ok(src.includes('<WardogsDataNotice page="economy"'), 'economy page renders the notice');
  const mod = await loadComponent('app/wardogs/WardogsDataNotice.js');
  const html = render(mod.default, { page: 'economy' });
  assert.ok(html.includes('As of October 16, 2026:'), 'as-of date is visible');
  assert.ok(html.includes('many vendor prices and unlock levels have been updated to Bulkhead&#x27;s Season 02 patch notes'), 'states what was updated');
  assert.ok(html.includes('are still Season 1 community-aggregated values'), 'states what is still Season 1');
  assert.ok(html.includes('href="' + N.sourceUrl + '"'), 'links the patch notes');
  assert.ok(!/\b\d+ rows?\b/i.test(html), 'names no row count');
});

test('economy page: the future-tense Season 2 caveat is gone', () => {
  const src = readFileSync(new URL('../../app/wardogs/economy/page.js', import.meta.url), 'utf8');
  assert.ok(!src.includes('may reorder items'));
  assert.ok(src.includes('last updated 2026-09-12. Not owner-verified.</span>'), 'planner caveat ends at "Not owner-verified."');
});
