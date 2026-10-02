// lib/network/rootGamesHref.test.mjs
// ROOT_GAMES pulse.articleHref (homepage pulse feed + /me feed) resolves network-game article URLs through
// the SHARED section resolver (2026-10-02), so a fallback-routed article gets its one live URL instead of
// being dropped, and a DMZ discourse article (resolved by TAG) needs the row passed in. Marathon unchanged.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ROOT_GAMES } from './rootGames.js';

const href = (game, slug, row) => ROOT_GAMES.find((g) => g.slug === game).pulse.articleHref(slug, row);

test('unmapped (fallback-routed) network-game slug -> its default-section URL, not dropped', () => {
  for (const g of ['wardogs', 'dmz', 'pubg-dednet', 'bodycam']) {
    assert.equal(href(g, 'brand-new-cron-slug', { tags: [] }), '/' + g + '/field-intel/brand-new-cron-slug');
  }
});

test('mapped slug keeps its mapped section URL', () => {
  assert.equal(href('wardogs', 'wardogs-control-zone', { tags: [] }), '/wardogs/systems/wardogs-control-zone');
  assert.equal(href('bodycam', 'bodycam-game-modes-after-locked-and-loaded', { tags: [] }), '/bodycam/modes/bodycam-game-modes-after-locked-and-loaded');
});

test('dmz discourse article resolves by TAG when the row is passed', () => {
  assert.equal(href('dmz', 'vantage-generated-1', { tags: ['discourse'] }), '/dmz/discourse/vantage-generated-1');
});

test('marathon builder is unchanged (flat /marathon/intel/<slug>, ignores the row)', () => {
  assert.equal(href('marathon', 'some-intel', { tags: ['discourse'] }), '/marathon/intel/some-intel');
});
