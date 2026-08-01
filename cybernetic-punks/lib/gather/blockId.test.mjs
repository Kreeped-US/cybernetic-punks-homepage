// lib/gather/blockId.test.mjs
// Guards the verified_source-capture LYNCHPIN: the SAME blockId() feeds both the
// prompt formatters (emit [ID]) and the write-site resolver (registry keys), so a
// cited id resolves; and the closed-set resolver never trusts an unknown id or an
// LLM-authored URL. Run: node --test lib/gather/blockId.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { blockId, BLOCK_CAP, buildBlockRegistry, resolveCitedBlocks } from './blockId.js';

// A fake rawData shaped like prompts._rawData (bungieNews + youtubeVideos [filtered]).
function fakeRawData() {
  return {
    bungieNews: [
      { title: 'Patch 1.1.5.1', url: 'https://bungie.example/1151', is_patch_note: true },
      { title: 'Dev blog', url: 'https://bungie.example/devblog' },
      { title: 'No-URL item', url: null },
    ],
    youtubeVideos: [
      { title: 'Meta vid', youtube_id: 'abc12345' },
      { title: 'No-id vid' }, // no youtube_id
    ],
  };
}

// ── THE LYNCHPIN: formatter-path id === resolver-path key (one function) ───────
test('a cited id computed the formatter way resolves through the registry (same blockId)', () => {
  const rd = fakeRawData();
  // FORMATTER PATH: what the formatter would emit next to bungieNews[0] / youtubeVideos[0].
  const emittedBungie = blockId('bungie', 0 + 1); // formatter uses (i+1)
  const emittedYt = blockId('youtube', 0 + 1);
  assert.equal(emittedBungie, 'BN1');
  assert.equal(emittedYt, 'YT1');
  // RESOLVER PATH: the registry is keyed by the SAME blockId over the SAME rawData.
  const reg = buildBlockRegistry(rd);
  assert.ok(reg.has(emittedBungie), 'the id the formatter emits is a real registry key');
  assert.ok(reg.has(emittedYt), 'youtube id lines up too');
  // So a cite of the emitted id resolves to the right item.
  assert.equal(reg.get(emittedBungie).source, 'BUNGIE');
});

// ── Bungie cite -> verified_source=BUNGIE + the block's URL FROM THE REGISTRY ──
test('citing a Bungie block resolves BUNGIE + the pipeline URL (not any LLM string)', () => {
  const rd = fakeRawData();
  const reg = buildBlockRegistry(rd);
  // The LLM only ever sends the id string 'BN1' -- never a URL.
  const out = resolveCitedBlocks(['BN1'], reg);
  assert.equal(out.verified_source, 'BUNGIE');
  assert.equal(out.verified_source_url, 'https://bungie.example/1151',
    'URL came from rawData.bungieNews[0].url via the registry, not from LLM output');
  // Prove it is the registry value: it equals rawData, and no LLM-authored string exists.
  assert.equal(out.verified_source_url, rd.bungieNews[0].url);
});

// ── Cite nothing -> null + flagged (honest-unknown) ───────────────────────────
test('citing nothing resolves verified_source=null (honest-unknown)', () => {
  const reg = buildBlockRegistry(fakeRawData());
  const empty = resolveCitedBlocks([], reg);
  assert.equal(empty.verified_source, null);
  assert.equal(empty.verified_source_url, null);
  const undef = resolveCitedBlocks(undefined, reg);
  assert.equal(undef.verified_source, null, 'missing cited_blocks -> null, never throws');
});

// ── Hallucinated id -> rejected, verified_source not corrupted ────────────────
test('an unknown/hallucinated id is rejected, does not corrupt verified_source', () => {
  const reg = buildBlockRegistry(fakeRawData());
  const bad = resolveCitedBlocks(['BN99', 'YT42', 'not-an-id'], reg);
  assert.equal(bad.verified_source, null, 'all-unknown -> null, never fabricated');
  assert.deepEqual(bad.rejected, ['BN99', 'YT42', 'not-an-id']);
  // A mix: one real BN1 + one bogus -> resolves the real one, rejects the bogus.
  const mix = resolveCitedBlocks(['BN1', 'BN99'], reg);
  assert.equal(mix.verified_source, 'BUNGIE');
  assert.deepEqual(mix.rejected, ['BN99']);
});

// ── Multi-source: BUNGIE outranks YOUTUBE as the primary fact-source ──────────
test('when both BUNGIE and YOUTUBE are cited, BUNGIE is the primary', () => {
  const reg = buildBlockRegistry(fakeRawData());
  const out = resolveCitedBlocks(['YT1', 'BN1'], reg); // cited in either order
  assert.equal(out.verified_source, 'BUNGIE', 'official notes outrank creator coverage');
  assert.equal(out.verified_source_url, 'https://bungie.example/1151');
});

// ── URL never invented: an item with no URL resolves url=null ─────────────────
test('a cited block whose item has no URL resolves url=null (never invented)', () => {
  const reg = buildBlockRegistry(fakeRawData());
  const noUrlBungie = resolveCitedBlocks(['BN3'], reg); // bungieNews[2].url === null
  assert.equal(noUrlBungie.verified_source, 'BUNGIE');
  assert.equal(noUrlBungie.verified_source_url, null, 'no URL in the item -> null, not fabricated');
  const noIdYt = resolveCitedBlocks(['YT2'], reg); // youtubeVideos[1] has no youtube_id
  assert.equal(noIdYt.verified_source, 'YOUTUBE');
  assert.equal(noIdYt.verified_source_url, null);
});

// ── Caps: only the top-N per source get ids (matches the formatter slices) ─────
test('registry respects the per-source caps (BN<=6, YT<=5)', () => {
  const many = { bungieNews: Array.from({ length: 9 }, (_, i) => ({ title: 't' + i, url: 'u' + i })),
                 youtubeVideos: Array.from({ length: 8 }, (_, i) => ({ title: 'v' + i, youtube_id: 'id' + i })) };
  const reg = buildBlockRegistry(many);
  assert.ok(reg.has(blockId('bungie', BLOCK_CAP.bungie)), 'BN' + BLOCK_CAP.bungie + ' present');
  assert.ok(!reg.has(blockId('bungie', BLOCK_CAP.bungie + 1)), 'BN' + (BLOCK_CAP.bungie + 1) + ' absent (past cap)');
  assert.ok(reg.has(blockId('youtube', BLOCK_CAP.youtube)), 'YT' + BLOCK_CAP.youtube + ' present');
  assert.ok(!reg.has(blockId('youtube', BLOCK_CAP.youtube + 1)), 'YT past cap absent');
});
