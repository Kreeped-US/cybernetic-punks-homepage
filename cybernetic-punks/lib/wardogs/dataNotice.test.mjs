// lib/wardogs/dataNotice.test.mjs
// The Wardogs data-version notice: config present and ASCII, the source is Bulkhead's Steam Season 2 patch notes,
// the helper is game-agnostic and page-scoped, and every listed page renders it with its own key.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { wardogs } from '../games/wardogs.js';
import { dataNoticeFor } from './dataNotice.js';

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
  assert.equal(N.since, '2026-10-15');
  for (const k of ['text', 'sourceLabel', 'sourceUrl']) {
    assert.ok(typeof N[k] === 'string' && N[k].length > 0, k);
    assert.ok(!/[^\x00-\x7f]/.test(N[k]), k + ' is ASCII');
  }
  assert.ok(!/[\u2013\u2014\u2018\u2019\u201c\u201d`]/.test(N.text + N.sourceLabel));
  assert.ok(!/\d+(\.\d+)?\s*%|\d+\s*(ms|rpm|dmg)\b/i.test(N.text), 'no figures in the notice');
});

test('per-page overrides: ASCII, no figures, only for listed pages; economy uses its own text with the same source', () => {
  const ov = N.overrides || {};
  for (const [page, o] of Object.entries(ov)) {
    assert.ok(N.pages.includes(page), 'override for a listed page: ' + page);
    assert.ok(typeof o.text === 'string' && o.text.length > 0, page);
    assert.ok(!/[^\x00-\x7f]/.test(o.text), page + ' override is ASCII');
    assert.ok(!/\d+(\.\d+)?\s*%|\d+\s*(ms|rpm|dmg)\b/i.test(o.text), page + ' override has no figures');
  }
  const eco = dataNoticeFor(wardogs, 'economy');
  assert.equal(eco.text, ov.economy.text);
  assert.ok(eco.text.startsWith('Prices and unlock figures in this planner come from Season 1 community data'));
  assert.equal(eco.sourceUrl, N.sourceUrl);
  assert.equal(eco.sourceLabel, N.sourceLabel);
  assert.equal(dataNoticeFor(wardogs, 'tier-list').text, N.text, 'other pages keep the default text');
  assert.equal(N.text.startsWith('Figures on this page'), true, 'config default text is not mutated by the override');
  const g = { dataNotice: { text: 'd', sourceLabel: 'y', sourceUrl: 'z', pages: ['a', 'b'], overrides: { b: { text: 'o' }, c: { text: 'x' } } } };
  assert.equal(dataNoticeFor(g, 'a').text, 'd');
  assert.equal(dataNoticeFor(g, 'b').text, 'o');
  assert.equal(dataNoticeFor(g, 'c'), null, 'an override does not list a page by itself');
});

test('source is Bulkhead\'s Steam Season 2 patch notes post', () => {
  assert.equal(N.sourceUrl, 'https://store.steampowered.com/news/app/1867240/view/670630562731396445');
  assert.equal(N.sourceLabel, "Bulkhead's Season 2 patch notes (Oct 14, 2026)");
  assert.equal(N.text, "Figures on this page come from Season 1 testing. Season 2 (released October 15, 2026) cuts base damage for several calibres, adjusts recoil and suppression, changes armor and helmet protection and changes many prices, per Bulkhead's October 14 Season 2 patch notes. We will update these numbers when Season 2 data is re-tested.");
  assert.equal(N.overrides.economy.text, "Prices and unlock figures in this planner come from Season 1 community data and have not been re-checked for Season 2 (released October 15, 2026). Bulkhead's October 14 Season 2 patch notes change many vendor prices, unlock levels and build costs, so many figures here may now differ.");
  assert.equal(N.overrides.hub.text, "The weapon counts, data points and tool descriptions on this page come from Season 1 testing. Season 2 (released October 15, 2026) cuts base damage for several calibres, adjusts recoil and suppression, changes armor and helmet protection and changes many prices, per Bulkhead's October 14 Season 2 patch notes. We will update these numbers when Season 2 data is re-tested.");
  const all = N.text + N.sourceLabel + N.sourceUrl + N.overrides.economy.text + N.overrides.hub.text;
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

test('economy page: the future-tense Season 2 caveat is gone', () => {
  const src = readFileSync(new URL('../../app/wardogs/economy/page.js', import.meta.url), 'utf8');
  assert.ok(!src.includes('may reorder items'));
  assert.ok(src.includes('last updated 2026-09-12. Not owner-verified.</span>'), 'planner caveat ends at "Not owner-verified."');
});
