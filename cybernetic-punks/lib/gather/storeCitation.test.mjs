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
  toolWithStoreCites, renderRelationLine, CITED_BLOCKS_SCHEMA_STORE_DESC,
  validateRecommendations, RECOMMENDATIONS_SCHEMA,
} from './blockId.js';

// ── STEP 3: gate premise-validation ─────────────────────────────────────────
test('toolWithStoreCites: the clone GAINS the recommendations field (step 3)', () => {
  const tool = { name: 't', input_schema: { type: 'object', properties: { cited_blocks: { type: 'array', description: 'x' } } } };
  const out = toolWithStoreCites(tool);
  assert.equal(out.input_schema.properties.recommendations, RECOMMENDATIONS_SCHEMA);
  // original untouched (per-call clone) -> OFF is byte-identical
  assert.equal(tool.input_schema.properties.recommendations, undefined);
});

test('validateRecommendations: all premises resolve -> NO finding (incl. a provenance-null verified row)', () => {
  const m = makeStoreMinter();
  m.tag('shell_stats', { verified: true, verified_source: 'in-game S2 shell screen' }); // SH1 (has provenance)
  m.tag('core_stats',  { verified: true, verified_source: null });                       // CS1 (verified, provenance-null)
  const recs = [{ claim_text: 'run CS1 on SH1 because ...', supporting_block_ids: ['SH1', 'CS1'] }];
  assert.deepEqual(validateRecommendations(recs, m.registry), [], 'CS1 is verified-but-provenance-null -> membership==verified -> PASS');
});

test('validateRecommendations: a recommendation with NO supporting_block_ids -> UNSUPPORTED-RECOMMENDATION', () => {
  const m = makeStoreMinter();
  const findings = validateRecommendations([{ claim_text: 'trust me', supporting_block_ids: [] }], m.registry);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].class, 'UNSUPPORTED-RECOMMENDATION');
  assert.match(findings[0].reason, /no supporting_block_ids/);
});

test('validateRecommendations: an UNRESOLVED id -> UNSUPPORTED-RECOMMENDATION (unknown/unverified = not in registry)', () => {
  const m = makeStoreMinter();
  m.tag('shell_stats', { verified: true, verified_source: 'x' }); // SH1 exists
  const findings = validateRecommendations([{ claim_text: 'c', supporting_block_ids: ['SH1', 'CS99'] }], m.registry); // CS99 never minted
  assert.equal(findings.length, 1);
  assert.deepEqual(findings[0].unresolved, ['CS99']);
});

test('validateRecommendations: NEVER grades reasoning (a wild claim with resolving premises PASSES)', () => {
  const m = makeStoreMinter();
  m.tag('shell_stats', { verified: true, verified_source: 'x' }); // SH1
  // an absurd recommendation -- but its premise resolves, so the gate does NOT judge it
  assert.deepEqual(validateRecommendations([{ claim_text: 'Sentinel is the best shell in every mode by far', supporting_block_ids: ['SH1'] }], m.registry), []);
});

test('validateRecommendations: no recommendations (undefined / non-array / flag-off) -> [] (gate byte-identical)', () => {
  assert.deepEqual(validateRecommendations(undefined, new Map()), []);
  assert.deepEqual(validateRecommendations(null, new Map()), []);
  assert.deepEqual(validateRecommendations('nope', new Map()), []);
  assert.deepEqual(validateRecommendations([], new Map()), []);
});

// ── STORE ADJACENCY (step 2) ─────────────────────────────────────────────────
test('renderRelationLine: OFF (disabled) -> "" so the shell block is byte-identical', () => {
  assert.equal(renderRelationLine('Countered by', ['Vandal', 'Thief'], false), '');
});

test('renderRelationLine: ON -> the labelled neighborhood line', () => {
  assert.equal(renderRelationLine('Countered by', ['Vandal', 'Thief', 'Assassin'], true), '    Countered by: Vandal, Thief, Assassin');
  assert.equal(renderRelationLine('Counter items', ['Signal Jammers'], true), '    Counter items: Signal Jammers');
});

test('renderRelationLine: ON but empty / non-array -> "" (no dangling label)', () => {
  assert.equal(renderRelationLine('Synergizes with', [], true), '');
  assert.equal(renderRelationLine('Synergizes with', null, true), '');
  assert.equal(renderRelationLine('Synergizes with', undefined, true), '');
  assert.equal(renderRelationLine('Synergizes with', ['a', null, 'b'], true), '    Synergizes with: a, b', 'drops falsy entries');
});

test('toolWithStoreCites: swaps the cited_blocks description to the recommendation-aware store desc', () => {
  const tool = { name: 't', input_schema: { type: 'object', properties: { headline: { type: 'string' }, cited_blocks: { type: 'array', description: 'ORIGINAL' } } } };
  const out = toolWithStoreCites(tool);
  assert.equal(out.input_schema.properties.cited_blocks.description, CITED_BLOCKS_SCHEMA_STORE_DESC);
  // the store desc instructs citing recommendation premises (the step-2 lever)
  assert.match(CITED_BLOCKS_SCHEMA_STORE_DESC, /RECOMMENDATION/);
  assert.match(CITED_BLOCKS_SCHEMA_STORE_DESC, /premise/);
  // original tool is NOT mutated (per-call clone)
  assert.equal(tool.input_schema.properties.cited_blocks.description, 'ORIGINAL');
  // other properties are preserved
  assert.ok(out.input_schema.properties.headline);
});

test('toolWithStoreCites: a tool with no cited_blocks is returned unchanged', () => {
  const tool = { name: 't', input_schema: { type: 'object', properties: { headline: { type: 'string' } } } };
  assert.equal(toolWithStoreCites(tool), tool);
});

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
