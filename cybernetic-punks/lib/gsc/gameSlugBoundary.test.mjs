// lib/gsc/gameSlugBoundary.test.mjs
// GAME_SLUG BOUNDARY (Stage 1): game_slug flows through every layer -- context, citation,
// store, gate -- with cross-game references REFUSED at each boundary. This file is the
// guarantee as CI (not intention): a block from game B cited in a game-A article, or a
// game-B store handed to a game-A draft, is rejected / fail-closed-held. Also proves the
// Marathon single-game path is byte-unchanged (matching game -> resolves / passes; an
// unstamped registry or store -> no rejection, exactly as before this stage).
//   Run: node --test lib/gsc/gameSlugBoundary.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildBlockRegistry, resolveCitedBlocks, makeStoreMinter } from '../gather/blockId.js';
import { runGate } from './runGate.js';

// -- CITATION BOUNDARY: resolveCitedBlocks refuses a cross-game block --------------

test('THE FIXTURE: a game-B block cited in a game-A article is REFUSED (rejected, never sourced)', () => {
  // A registry holding a DMZ-stamped external block (as if it leaked from a DMZ gather).
  const reg = buildBlockRegistry({ bungieNews: [{ url: 'https://example/dmz-note' }], youtubeVideos: [] }, 'dmz');
  // The SAME id cited by a MARATHON article.
  const vs = resolveCitedBlocks(['BN1'], reg, 'marathon');
  assert.equal(vs.verified_source, null, 'cross-game block does not become the source');
  assert.equal(vs.verified_source_url, null, 'no cross-game URL leaks through');
  assert.deepEqual(vs.rejected, ['BN1'], 'the game-B block is REJECTED for a game-A article');
});

test('cross-game refusal also covers STORE-ROW citations (minter-stamped game_slug)', () => {
  const m = makeStoreMinter('dmz'); // a DMZ store minter
  m.tag('weapon_stats', { verified: true, verified_source: 'DMZ in-game' }); // WS1, stamped game_slug=dmz
  const vs = resolveCitedBlocks(['WS1'], m.registry, 'marathon');
  assert.equal(vs.verified_source, null);
  assert.deepEqual(vs.rejected, ['WS1'], 'a DMZ store row cannot source a Marathon article');
});

test('SAME-game citation still resolves (positive control -- the boundary is not over-broad)', () => {
  const reg = buildBlockRegistry({ bungieNews: [{ url: 'https://bungie/x' }], youtubeVideos: [] }, 'marathon');
  const vs = resolveCitedBlocks(['BN1'], reg, 'marathon');
  assert.equal(vs.verified_source, 'BUNGIE');
  assert.equal(vs.verified_source_url, 'https://bungie/x');
  assert.deepEqual(vs.rejected, []);
});

test('BYTE-UNCHANGED: no articleGameSlug -> no rejection (legacy callers / single-game)', () => {
  const reg = buildBlockRegistry({ bungieNews: [{ url: 'https://bungie/x' }], youtubeVideos: [] }, 'marathon');
  const vs = resolveCitedBlocks(['BN1'], reg); // third arg omitted
  assert.equal(vs.verified_source, 'BUNGIE', 'omitting the article game -> resolves exactly as before');
  assert.deepEqual(vs.rejected, []);
});

test('BYTE-UNCHANGED: an unstamped registry entry (game_slug null) is never rejected', () => {
  const reg = buildBlockRegistry({ bungieNews: [{ url: 'https://bungie/x' }], youtubeVideos: [] }); // no gameSlug -> null
  const vs = resolveCitedBlocks(['BN1'], reg, 'marathon'); // article game known, entry game null
  assert.equal(vs.verified_source, 'BUNGIE', 'null entry game -> no game to check -> resolves');
  assert.deepEqual(vs.rejected, []);
});

// -- GATE BOUNDARY: runGate refuses a cross-game store (fail-closed) ----------------

function draft(gameSlug) {
  return { slug: 's', editor: 'NEXUS', created_at: '2026-08-25T00:00:00Z', body: 'A short benign paragraph with no hard stats.', game_slug: gameSlug };
}

test('THE FIXTURE (gate): a game-B store handed to a game-A draft is FAIL-CLOSED HELD', () => {
  const store = { entities: [], game_slug: 'dmz' };
  const res = runGate(store, draft('marathon'), { runDate: '2026-08-25' });
  assert.equal(res.threw, true, 'store/draft game mismatch is treated as an infra failure');
  assert.equal(res.decision.hold, true, 'the draft is HELD (never published against the wrong store)');
  assert.equal(res.decision.is_published, false);
  assert.equal(res.decision.gate_status, 'held');
});

test('gate mismatch is fail-closed even for a LOG-OPEN game (mode does not weaken the boundary)', () => {
  // draft game = marathon (log-only); store = dmz. Must STILL hold, not publish on log-only.
  const res = runGate({ entities: [], game_slug: 'dmz' }, draft('marathon'), { runDate: '2026-08-25' });
  assert.equal(res.mode, 'log-only', 'mode is still derived from the draft game');
  assert.equal(res.decision.hold, true, 'log-only does NOT let a cross-game store publish');
});

test('BYTE-UNCHANGED (gate): matching game store passes the boundary (Marathon publishes)', () => {
  const res = runGate({ entities: [], game_slug: 'marathon' }, draft('marathon'), { runDate: '2026-08-25' });
  assert.equal(res.mode, 'log-only');
  assert.equal(res.decision.hold, false, 'store game == draft game -> boundary passes, normal flow');
  assert.equal(res.decision.is_published, true);
});

test('BYTE-UNCHANGED (gate): an unstamped store (no game_slug) skips the check (legacy caller)', () => {
  const res = runGate({ entities: [] }, draft('marathon'), { runDate: '2026-08-25' }); // no store.game_slug
  assert.equal(res.decision.hold, false, 'no store game -> nothing to assert -> proceeds as before');
  assert.equal(res.decision.is_published, true);
});
