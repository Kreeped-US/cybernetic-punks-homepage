// lib/relatedLinks.test.mjs
// Brief 175: relatedLinksFor with an optional lib/games/linkGate.js content map. A gated route with 0
// entries is left out before the cap; it returns once its count is above zero; without a map nothing changes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { relatedLinksFor } from './relatedLinks.js';

const ZERO = { '/dmz/meta': 0, '/dmz/discourse': 0, '/dmz/missions': 0, '/dmz/keys': 0, '/dmz/items': 0, '/dmz/builds': 0 };
const hrefs = (l) => l.map((x) => x.href);

test('no content map: unchanged (primary builds link plus tag matches)', () => {
  assert.deepEqual(hrefs(relatedLinksFor('dmz', [])), ['/dmz/builds']);
  assert.deepEqual(hrefs(relatedLinksFor('dmz', ['missions', 'hajin', 'crafting'])), ['/dmz/builds', '/dmz/missions', '/dmz/pois', '/dmz/items']);
});

test('all gated routes at zero: left out; live routes stay; an all-gated list is empty (no Related block)', () => {
  assert.deepEqual(relatedLinksFor('dmz', [], ZERO), []);
  assert.deepEqual(hrefs(relatedLinksFor('dmz', ['missions', 'hajin', 'crafting', 'keys'], ZERO)), ['/dmz/pois']);
});

test('a route with entries comes back; the cap applies after filtering', () => {
  const some = Object.assign({}, ZERO, { '/dmz/builds': 3, '/dmz/items': 1 });
  assert.deepEqual(hrefs(relatedLinksFor('dmz', ['missions', 'crafting'], some)), ['/dmz/builds', '/dmz/items']);
  const all = { '/dmz/missions': 1, '/dmz/keys': 1, '/dmz/items': 1, '/dmz/builds': 1 };
  assert.equal(relatedLinksFor('dmz', ['missions', 'hajin', 'crafting', 'keys'], all).length, 4, 'capped at four');
  // With builds gated off, the fifth candidate (keys) takes the freed slot.
  assert.deepEqual(hrefs(relatedLinksFor('dmz', ['missions', 'hajin', 'crafting', 'keys'], Object.assign({}, all, { '/dmz/builds': 0 }))), ['/dmz/missions', '/dmz/pois', '/dmz/items', '/dmz/keys']);
});

test('other games: unaffected by a DMZ map; the module stays pure (no I/O)', () => {
  assert.deepEqual(relatedLinksFor('wardogs', ['weapons'], ZERO), relatedLinksFor('wardogs', ['weapons']));
  assert.deepEqual(relatedLinksFor('pubg-dednet', ['x'], ZERO), []);
  const src = readFileSync(path.resolve('lib/relatedLinks.js'), 'utf8');
  assert.ok(!/supabase|fetch\(/.test(src));
  assert.ok(src.includes("import { gatedHref } from './games/linkGate.js';"));
});

test('wiring: the DMZ article route passes the cached content map; other games do not', () => {
  const route = readFileSync(path.resolve('app/dmz/[section]/[slug]/page.js'), 'utf8');
  assert.ok(route.includes("var related = relatedLinksFor('dmz', tags, await fetchDmzLinkContent());"));
  for (const f of ['app/wardogs/[section]/[slug]/page.js', 'app/pubg-dednet/[section]/[slug]/page.js']) assert.ok(!/fetchDmzLinkContent/.test(readFileSync(path.resolve(f), 'utf8')), f);
});
