// lib/gather/storeCitation.test.mjs
// Store-row citation (content-model precondition): the minter mints ids for VERIFIED
// rows only, and resolveCitedBlocks resolves a store-row id -> the row's provenance,
// with the STORE tier outranking external labels. Run:
//   node --test lib/gather/storeCitation.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  makeStoreMinter, resolveCitedBlocks, buildBlockRegistry,
  STORE_PREFIX, STORE_SOURCE_PRIORITY, storeRowCitationEnabled,
} from './blockId.js';

test('MASTER FLAG storeRowCitationEnabled: OFF by default / unset / anything!=="true"', () => {
  const prev = process.env.STORE_ROW_CITATION_ENABLED;
  try {
    delete process.env.STORE_ROW_CITATION_ENABLED;
    assert.equal(storeRowCitationEnabled(), false, 'unset -> OFF (staged, byte-identical to main)');
    process.env.STORE_ROW_CITATION_ENABLED = 'false';
    assert.equal(storeRowCitationEnabled(), false);
    process.env.STORE_ROW_CITATION_ENABLED = '1';
    assert.equal(storeRowCitationEnabled(), false, 'only the exact string "true" arms it');
    process.env.STORE_ROW_CITATION_ENABLED = 'true';
    assert.equal(storeRowCitationEnabled(), true, 'ON only when exactly "true" (the dry-run/arm state)');
  } finally {
    if (prev === undefined) delete process.env.STORE_ROW_CITATION_ENABLED;
    else process.env.STORE_ROW_CITATION_ENABLED = prev;
  }
});

test('minter: a VERIFIED row gets a tagged id + a registry entry with its provenance', () => {
  const m = makeStoreMinter();
  const tag = m.tag('shell_stats', { verified: true, verified_source: 'in-game S2 shell screen (owner-verified)' });
  assert.equal(tag, '[SH1] ');
  const entry = m.registry.get('SH1');
  assert.deepEqual(entry, { source: 'in-game S2 shell screen (owner-verified)', url: null, priority: STORE_SOURCE_PRIORITY });
});

test('minter: UNVERIFIED rows get NO id and NO registry entry (a cite must mean verified)', () => {
  const m = makeStoreMinter();
  assert.equal(m.tag('shell_stats', { verified: false, verified_source: 'tauceti.gg' }), '');
  assert.equal(m.tag('shell_stats', { verified: undefined, verified_source: 'x' }), '');
  assert.equal(m.tag('weapon_stats', null), '');
  assert.equal(m.registry.size, 0);
});

test('minter: an UNKNOWN table gets no id (only the 5 stat tables have prefixes)', () => {
  const m = makeStoreMinter();
  assert.equal(m.tag('game_maps', { verified: true, verified_source: 'x' }), '');
  assert.equal(m.registry.size, 0);
  // the 5 stat tables all have a prefix
  for (const t of ['weapon_stats', 'shell_stats', 'core_stats', 'mod_stats', 'implant_stats']) {
    assert.ok(STORE_PREFIX[t], t + ' should have a store prefix');
  }
});

test('minter: ids increment PER prefix across verified rows, skipping unverified', () => {
  const m = makeStoreMinter();
  assert.equal(m.tag('weapon_stats', { verified: true, verified_source: 'a' }), '[WS1] ');
  assert.equal(m.tag('weapon_stats', { verified: false, verified_source: 'skip' }), ''); // no id
  assert.equal(m.tag('weapon_stats', { verified: true, verified_source: 'b' }), '[WS2] ');
  assert.equal(m.tag('shell_stats', { verified: true, verified_source: 'c' }), '[SH1] ');
  assert.deepEqual([...m.registry.keys()], ['WS1', 'WS2', 'SH1']);
});

test('resolveCitedBlocks: resolves a store-row id -> the row verified_source (non-null)', () => {
  const m = makeStoreMinter();
  m.tag('shell_stats', { verified: true, verified_source: 'in-game S2 shell screen (owner-verified)' });
  const vs = resolveCitedBlocks(['SH1'], m.registry);
  assert.equal(vs.verified_source, 'in-game S2 shell screen (owner-verified)');
  assert.equal(vs.verified_source_url, null);
  assert.deepEqual(vs.rejected, []);
});

test('resolveCitedBlocks: unknown store-ish id is rejected (closed set), verified_source null', () => {
  const m = makeStoreMinter();
  m.tag('shell_stats', { verified: true, verified_source: 'x' });
  const vs = resolveCitedBlocks(['SH9'], m.registry); // SH9 never minted
  assert.equal(vs.verified_source, null);
  assert.deepEqual(vs.rejected, ['SH9']);
});

test('resolveCitedBlocks: STORE tier outranks a YOUTUBE block when both are cited', () => {
  // merge a store entry (priority 0) + a YT entry (SOURCE_PRIORITY YOUTUBE=1) into one registry
  const reg = buildBlockRegistry({ youtubeVideos: [{ youtube_id: 'abc' }], bungieNews: [] }); // mints YT1
  const m = makeStoreMinter();
  m.tag('weapon_stats', { verified: true, verified_source: 'Bungie Update 1.1.5 patch notes' });
  m.registry.forEach((v, k) => reg.set(k, v));
  const vs = resolveCitedBlocks(['YT1', 'WS1'], reg);
  assert.equal(vs.verified_source, 'Bungie Update 1.1.5 patch notes', 'the store row (priority 0) wins over YT (1)');
});

test('resolveCitedBlocks: external [BN]/[YT]-only resolution is UNCHANGED (backward-compatible)', () => {
  const reg = buildBlockRegistry({ bungieNews: [{ url: 'https://bungie.net/x' }], youtubeVideos: [{ youtube_id: 'v' }] });
  const vs = resolveCitedBlocks(['YT1', 'BN1'], reg);
  assert.equal(vs.verified_source, 'BUNGIE', 'BUNGIE (0) still outranks YOUTUBE (1)');
  assert.equal(vs.verified_source_url, 'https://bungie.net/x');
});
