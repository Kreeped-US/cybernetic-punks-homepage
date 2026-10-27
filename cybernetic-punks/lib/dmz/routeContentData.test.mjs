// lib/dmz/routeContentData.test.mjs
// Brief 175: the content map behind the DMZ footer and the article Related block. Counts per route from the
// injected readers; a failed read counts as 0 (fail-closed: plain text); meta and discourse are 0 here (not
// read; neither surface links them); /dmz/traits is never in the map (exempt, Brief 174). Cached per request.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { loadDmzLinkContent } from './routeContentData.js';
import { DMZ_GATED_ROUTES } from './routeContent.js';
import { gatedHref } from '../games/linkGate.js';

test('counts by route from the readers; same keys as the gated list; no /dmz/traits', async () => {
  const seen = [];
  const map = await loadDmzLinkContent({ rows: async (t) => { seen.push(t); return { dmz_missions: 2, dmz_keys: 0, dmz_items: 5 }[t]; }, builds: async () => 1 });
  assert.deepEqual(seen.sort(), ['dmz_items', 'dmz_keys', 'dmz_missions']);
  assert.deepEqual(map, { '/dmz/meta': 0, '/dmz/discourse': 0, '/dmz/missions': 2, '/dmz/keys': 0, '/dmz/items': 5, '/dmz/builds': 1 });
  assert.deepEqual(Object.keys(map).sort(), Object.keys(DMZ_GATED_ROUTES).sort());
  assert.ok(!('/dmz/traits' in map));
  assert.equal(gatedHref('/dmz/keys', map), null);
  assert.equal(gatedHref('/dmz/items', map), '/dmz/items');
});

test('fail-closed: a throwing or rejecting reader counts as 0 for that route only', async () => {
  const err = console.error;
  const logged = [];
  console.error = (m) => logged.push(m);
  try {
    const map = await loadDmzLinkContent({ rows: (t) => { if (t === 'dmz_keys') throw new Error('down'); return Promise.resolve(3); }, builds: () => Promise.reject(new Error('x')) });
    assert.deepEqual(map, { '/dmz/meta': 0, '/dmz/discourse': 0, '/dmz/missions': 3, '/dmz/keys': 0, '/dmz/items': 3, '/dmz/builds': 0 });
    assert.equal(logged.length, 2);
    assert.ok(logged.every((m) => /^\[dmz\] link gate (keys|builds) read failed/.test(m)));
  } finally {
    console.error = err;
  }
});

test('source: cached per request with React cache(); head counts only; no robots or sitemap use', () => {
  const src = readFileSync(path.resolve('lib/dmz/routeContentData.js'), 'utf8');
  assert.ok(src.includes("import { cache } from 'react';"));
  assert.ok(src.includes('export var fetchDmzLinkContent = cache('));
  assert.ok(src.includes("select('slug', { count: 'exact', head: true })"));
  for (const f of ['lib/sitemap/eligible.js', 'lib/sitemap/partition.js']) assert.ok(!/routeContentData|linkGate/.test(readFileSync(path.resolve(f), 'utf8')), f);
});
