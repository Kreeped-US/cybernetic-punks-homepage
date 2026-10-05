// lib/editors/nexusTierList.test.mjs -- the NEXUS tier-list gate.
import test from 'node:test';
import assert from 'node:assert/strict';
import { nexusMaintainsTierList, NEXUS_TIER_SECTION, NEXUS_NO_TIER_SECTION, applyNexusTierGate, nexusToolForGame } from './nexusTierList.js';
import marathon from '../games/marathon.js';
import wardogs from '../games/wardogs.js';

const PROMPT = 'HEAD\n\n' + NEXUS_TIER_SECTION + '\n\nTAIL';
const TOOL = {
  name: 'publish_meta_intel',
  description: 'Publish a meta intelligence report with full tier list update.',
  input_schema: { type: 'object', properties: { meta_update: { type: 'array' }, headline: { type: 'string' }, body: { type: 'string' } }, required: ['meta_update', 'headline', 'body'] },
};

test('only a game with nexusTierRegrade maintains a NEXUS tier list', () => {
  assert.equal(nexusMaintainsTierList(marathon), true);
  assert.equal(nexusMaintainsTierList(wardogs), false);
  assert.equal(nexusMaintainsTierList(undefined), false);
});

test('tier game: system prompt and tool come back unchanged (same string, same object)', () => {
  assert.equal(applyNexusTierGate(PROMPT, marathon), PROMPT);
  assert.equal(nexusToolForGame(TOOL, marathon), TOOL);
});

test('non-tier game: tier section swapped for the no-tier section, nothing else changes', () => {
  const out = applyNexusTierGate(PROMPT, wardogs);
  assert.equal(out, 'HEAD\n\n' + NEXUS_NO_TIER_SECTION + '\n\nTAIL');
  assert.ok(!/seeding the tier table/.test(out));
  assert.ok(/Do not return a meta_update array/.test(out));
});

test('non-tier game: tool drops meta_update from properties and required, and the tier-update promise', () => {
  const t = nexusToolForGame(TOOL, wardogs);
  assert.notEqual(t, TOOL);
  assert.equal(t.description, 'Publish a meta intelligence report.');
  assert.ok(!('meta_update' in t.input_schema.properties));
  assert.deepEqual(t.input_schema.required, ['headline', 'body']);
  assert.ok('meta_update' in TOOL.input_schema.properties, 'shared tool object is not mutated');
});

test('a prompt without the tier section is returned unchanged for a non-tier game', () => {
  assert.equal(applyNexusTierGate('NO SECTION HERE', wardogs), 'NO SECTION HERE');
});

test('the no-tier section is ASCII and tells NEXUS not to claim tier actions', () => {
  assert.ok(!/[^\x00-\x7F]/.test(NEXUS_NO_TIER_SECTION));
  assert.ok(/never say or imply that we graded, seeded, updated, published or set a baseline/.test(NEXUS_NO_TIER_SECTION));
});
