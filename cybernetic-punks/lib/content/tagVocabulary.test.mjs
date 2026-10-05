// lib/content/tagVocabulary.test.mjs
// Per-game tag vocabulary: flags, the narrowed tool description, stripping, odd input.
// Run: node --import ./scripts/ext-resolve.register.mjs --test lib/content/tagVocabulary.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hasRankedPlay, isExtractionMode, disallowedTagsFor, tagDescriptionFor, applyTagVocabulary, stripDisallowedTags } from './tagVocabulary.js';
import { getGameConfig } from '../games/index.js';

const DESC = '3-7 lowercase canonical tags. Always include at least one of: shells, weapons, mods, cradle, extraction, ranked, beginner, progression, maps, stealth, squad, solo, holotag, endgame, pvp, support, cryo-archive. Add sub-tags like shell names, weapon names, faction names, Cradle tracks as additional context.';
const TOOL = { name: 't', input_schema: { type: 'object', properties: { body: { type: 'string' }, tags: { type: 'array', description: DESC } } } };

test('flags: isExtractionMode defaults TRUE, hasRankedPlay defaults FALSE', () => {
  assert.equal(isExtractionMode(undefined), true);
  assert.equal(isExtractionMode({ editorial: {} }), true);
  assert.equal(isExtractionMode({ editorial: { isExtractionMode: false } }), false);
  assert.equal(hasRankedPlay({ editorial: {} }), false);
  assert.deepEqual(disallowedTagsFor({ editorial: {} }), ['ranked']);
  assert.deepEqual(disallowedTagsFor({ editorial: { hasRankedPlay: true } }), []);
});

test('per-game values: Marathon allows both; Wardogs disallows both; DMZ/PUBG disallow ranked; Bodycam allows both', () => {
  assert.deepEqual(disallowedTagsFor(getGameConfig('marathon')), []);
  assert.deepEqual(disallowedTagsFor(getGameConfig('wardogs')), ['extraction', 'ranked']);
  assert.deepEqual(disallowedTagsFor(getGameConfig('dmz')), ['ranked']);
  assert.deepEqual(disallowedTagsFor(getGameConfig('pubg-dednet')), ['ranked']);
  assert.deepEqual(disallowedTagsFor(getGameConfig('bodycam')), []);
});

test('tool description: Marathon gets the SAME tool object (byte-identical); Wardogs loses extraction + ranked only', () => {
  assert.equal(applyTagVocabulary(TOOL, getGameConfig('marathon')), TOOL);
  assert.equal(tagDescriptionFor(DESC, getGameConfig('marathon')), DESC);
  const w = applyTagVocabulary(TOOL, getGameConfig('wardogs'));
  assert.notEqual(w, TOOL);
  const d = w.input_schema.properties.tags.description;
  assert.ok(d.includes('Always include at least one of: shells, weapons, mods, cradle, beginner, progression,'));
  assert.ok(!/\bextraction\b/.test(d) && !/\branked\b/.test(d));
  assert.equal(d.replace('cradle, beginner', 'cradle, extraction, ranked, beginner'), DESC, 'nothing else changed');
  assert.equal(TOOL.input_schema.properties.tags.description, DESC, 'the shared schema is never mutated');
  assert.deepEqual(w.input_schema.properties.body, TOOL.input_schema.properties.body);
});

test('tool description: no tags property / no list -> returned unchanged', () => {
  const noTags = { name: 'x', input_schema: { type: 'object', properties: { body: {} } } };
  assert.equal(applyTagVocabulary(noTags, getGameConfig('wardogs')), noTags);
  assert.equal(tagDescriptionFor('3-6 short lowercase search tags.', getGameConfig('wardogs')), '3-6 short lowercase search tags.');
  assert.equal(applyTagVocabulary(undefined, getGameConfig('wardogs')), undefined);
});

test('strip: Wardogs drops extraction/ranked (case-insensitive, trimmed) and reports them; order kept', () => {
  const r = stripDisallowedTags(['weapons', 'Extraction', 'pvp', ' ranked ', 'squad'], getGameConfig('wardogs'));
  assert.deepEqual(r.tags, ['weapons', 'pvp', 'squad']);
  assert.deepEqual(r.stripped, ['Extraction', ' ranked ']);
  const keep = stripDisallowedTags(['extraction shooter', 'ranked-play'], getGameConfig('wardogs'));
  assert.deepEqual(keep.stripped, [], 'exact tag names only');
});

test('strip: Marathon unchanged (same array, nothing stripped)', () => {
  const tags = ['shells', 'extraction', 'ranked'];
  const r = stripDisallowedTags(tags, getGameConfig('marathon'));
  assert.equal(r.tags, tags);
  assert.deepEqual(r.stripped, []);
});

test('strip: odd input never throws (null, undefined, string, object, mixed array)', () => {
  const w = getGameConfig('wardogs');
  assert.deepEqual(stripDisallowedTags(null, w), { tags: null, stripped: [] });
  assert.deepEqual(stripDisallowedTags(undefined, w), { tags: undefined, stripped: [] });
  assert.deepEqual(stripDisallowedTags('extraction', w), { tags: 'extraction', stripped: [] });
  const obj = { a: 1 };
  assert.equal(stripDisallowedTags(obj, w).tags, obj);
  const mixed = stripDisallowedTags([null, 3, 'ranked', { x: 1 }, 'weapons'], w);
  assert.deepEqual(mixed.stripped, ['ranked']);
  assert.equal(mixed.tags.length, 4);
  assert.doesNotThrow(() => stripDisallowedTags([], undefined));
});
