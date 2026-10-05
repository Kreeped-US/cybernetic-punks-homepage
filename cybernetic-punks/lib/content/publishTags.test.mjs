// lib/content/publishTags.test.mjs
// Publish/edit-time tag vocabulary: strips by game slug, never throws, never blocks.
// Run: node --import ./scripts/ext-resolve.register.mjs --test lib/content/publishTags.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stripTagsForPublish } from './publishTags.js';

test('Wardogs: stale extraction/ranked tags are stripped at publish', () => {
  const r = stripTagsForPublish(['weapons', 'extraction', 'pvp', 'ranked'], 'wardogs');
  assert.deepEqual(r.tags, ['weapons', 'pvp']);
  assert.deepEqual(r.stripped, ['extraction', 'ranked']);
  assert.equal(r.error, null);
});

test('DMZ keeps extraction (strips ranked); PUBG strips both; Bodycam strips extraction (keeps ranked)', () => {
  assert.deepEqual(stripTagsForPublish(['extraction', 'ranked'], 'dmz').tags, ['extraction']);
  assert.deepEqual(stripTagsForPublish(['extraction', 'ranked'], 'pubg-dednet').tags, []);
  assert.deepEqual(stripTagsForPublish(['extraction', 'ranked'], 'bodycam').tags, ['ranked']);
});

test('Marathon unchanged: same array back, nothing stripped', () => {
  const tags = ['shells', 'extraction', 'ranked'];
  const r = stripTagsForPublish(tags, 'marathon');
  assert.equal(r.tags, tags);
  assert.deepEqual(r.stripped, []);
});

test('never throws: unknown game slug / null slug -> tags unchanged + error string', () => {
  const tags = ['ranked'];
  const r = stripTagsForPublish(tags, 'not-a-game');
  assert.equal(r.tags, tags);
  assert.deepEqual(r.stripped, []);
  assert.equal(typeof r.error, 'string');
  assert.equal(stripTagsForPublish(tags, null).tags, tags);
});

test('odd tag values pass through without error', () => {
  assert.deepEqual(stripTagsForPublish(null, 'wardogs'), { tags: null, stripped: [], error: null });
  assert.deepEqual(stripTagsForPublish('extraction', 'wardogs'), { tags: 'extraction', stripped: [], error: null });
});
