// lib/gather/sourcePriority.test.mjs
// Provenance priority is game-agnostic (2026-10-16, Brief 84): when an article cites BOTH its game's
// official news post and a YouTube video, verified_source must be the game's OWN configured official
// label (config.newsSourceLabel) with that post's URL -- not YOUTUBE. Marathon resolution must be
// byte-identical to the old hard-coded { BUNGIE: 0, YOUTUBE: 1 } ranking, and a game with no
// configured label must behave as before (BUNGIE fallback label at priority 0).
// Run: node --test lib/gather/sourcePriority.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildBlockRegistry, resolveCitedBlocks, sourcePriority, STORE_SOURCE_PRIORITY } from './blockId.js';
import { getGameConfig } from '../games/index.js';

const GAMES = ['marathon', 'wardogs', 'pubg-dednet', 'dmz', 'bodycam'];
const YT_URL = 'https://www.youtube.com/watch?v=vid00001';
const rawFor = (g) => ({
  bungieNews: [{ title: g + ' official post', url: 'https://official.example/' + g + '/post' }],
  youtubeVideos: [{ title: g + ' creator video', youtube_id: 'vid00001' }],
});

// The pre-change resolver ordering, reproduced verbatim, to prove Marathon is unchanged.
const OLD_PRIORITY = { BUNGIE: 0, YOUTUBE: 1 };
function oldResolve(citedBlocks, registry, articleGameSlug) {
  const resolved = [], rejected = [];
  const articleGame = articleGameSlug || null;
  for (const id of (Array.isArray(citedBlocks) ? citedBlocks : [])) {
    const hit = registry.get(id);
    if (!hit) { rejected.push(id); continue; }
    if (articleGame && hit.game_slug && hit.game_slug !== articleGame) { rejected.push(id); continue; }
    resolved.push({ id, source: hit.source, url: hit.url, priority: hit.priority });
  }
  if (!resolved.length) return { verified_source: null, verified_source_url: null, resolved, rejected };
  const prio = (r) => (r.priority != null ? r.priority : (OLD_PRIORITY[r.source] != null ? OLD_PRIORITY[r.source] : 99));
  resolved.sort((a, b) => prio(a) - prio(b));
  return { verified_source: resolved[0].source, verified_source_url: resolved[0].url, resolved, rejected };
}

test('every configured game: official post + YouTube -> the game\'s official label and the post URL (either cite order)', () => {
  for (const g of GAMES) {
    const label = getGameConfig(g).newsSourceLabel;
    assert.ok(label && label !== 'YOUTUBE', g + ' has a configured official label');
    const reg = buildBlockRegistry(rawFor(g), g);
    for (const order of [['YT1', 'BN1'], ['BN1', 'YT1']]) {
      const out = resolveCitedBlocks(order, reg, g);
      assert.equal(out.verified_source, label, g + ' ' + order.join(','));
      assert.equal(out.verified_source_url, 'https://official.example/' + g + '/post', g + ' url');
      assert.deepEqual(out.resolved.map((r) => r.source), [label, 'YOUTUBE'], g + ' official first, YouTube second');
    }
  }
});

test('the Wardogs case that broke: BULKHEAD Steam notes outrank YouTube', () => {
  const reg = buildBlockRegistry({
    bungieNews: [{ url: 'https://store.steampowered.com/news/app/1867240/view/670630562731396445' }],
    youtubeVideos: [{ youtube_id: '02QJb5SU8V0' }],
  }, 'wardogs');
  const out = resolveCitedBlocks(['YT1', 'BN1'], reg, 'wardogs');
  assert.equal(out.verified_source, 'BULKHEAD');
  assert.equal(out.verified_source_url, 'https://store.steampowered.com/news/app/1867240/view/670630562731396445');
});

test('YouTube-only still resolves YOUTUBE (official source simply absent)', () => {
  for (const g of GAMES) {
    const out = resolveCitedBlocks(['YT1'], buildBlockRegistry(rawFor(g), g), g);
    assert.equal(out.verified_source, 'YOUTUBE');
    assert.equal(out.verified_source_url, YT_URL);
  }
});

test('Marathon output is identical to the old ranking for every cite combination', () => {
  const rd = {
    bungieNews: [{ url: 'https://bungie.example/a' }, { url: 'https://bungie.example/b' }, { url: null }],
    youtubeVideos: [{ youtube_id: 'aaaaaaaa' }, { youtube_id: 'bbbbbbbb' }, {}],
  };
  const ids = ['BN1', 'BN2', 'BN3', 'YT1', 'YT2', 'YT3', 'BN99', 'XX1'];
  const combos = [];
  for (let mask = 1; mask < (1 << ids.length); mask++) combos.push(ids.filter((_, i) => mask & (1 << i)));
  for (const slug of ['marathon', null, undefined]) {
    const reg = buildBlockRegistry(rd, slug);
    // plus a store-row style entry with an explicit priority, and an unknown label
    reg.set('WS1', { source: 'owner-verified in-game', url: null, priority: STORE_SOURCE_PRIORITY, game_slug: slug || null });
    reg.set('ZZ1', { source: 'SOMETHING ELSE', url: 'https://x.example', game_slug: slug || null });
    for (const c of combos) {
      for (const extra of [[], ['WS1'], ['ZZ1'], ['ZZ1', 'WS1']]) {
        const cites = c.concat(extra).reverse();
        assert.deepEqual(resolveCitedBlocks(cites, reg, slug), oldResolve(cites, reg, slug), String(slug) + ' ' + cites.join(','));
      }
    }
  }
});

test('a game with no configured label behaves as today (BUNGIE fallback label, priority 0)', () => {
  // An unknown slug: getGameConfig throws inside newsLabelFor -> BUNGIE fallback, exactly as before.
  const reg = buildBlockRegistry(rawFor('nope'), 'nope');
  assert.equal(reg.get('BN1').source, 'BUNGIE');
  const out = resolveCitedBlocks(['YT1', 'BN1'], reg, 'nope');
  assert.deepEqual(out, oldResolve(['YT1', 'BN1'], reg, 'nope'));
  assert.equal(out.verified_source, 'BUNGIE');
});

test('sourcePriority: official label of THIS game = 0, YOUTUBE = 1, anything else = 99; no game names hard-coded', () => {
  for (const g of GAMES) {
    assert.equal(sourcePriority(getGameConfig(g).newsSourceLabel, g), 0, g);
    assert.equal(sourcePriority('YOUTUBE', g), 1, g);
    assert.equal(sourcePriority('SOMETHING ELSE', g), 99, g);
  }
  assert.equal(sourcePriority('BUNGIE', 'wardogs'), 99, 'another game\'s label is not official here');
  assert.equal(sourcePriority('BULKHEAD', 'marathon'), 99);
  assert.equal(sourcePriority(null, 'marathon'), 99);
  assert.equal(sourcePriority('BUNGIE', null), 0, 'no game -> default config (Marathon) -> BUNGIE, as before');
});
