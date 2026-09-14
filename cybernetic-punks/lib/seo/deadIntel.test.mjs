// lib/seo/deadIntel.test.mjs -- run: node --test lib/seo/deadIntel.test.mjs
// Drift guards for the dead-article 410 mechanism (proxy.js):
//  1. MARATHON_INTEL_KEEPER_SOURCES == the /marathon/intel/<slug> redirect sources in
//     next.config.mjs -- so proxy.js can never 410 a slug next.config means to 301 to a
//     keeper.
//  2. ARTICLE_SECTIONS[game] == the source==='editor' section slugs in each game config
//     (lib/games/*) -- so proxy.js only 410s under real article sections, never under a
//     data/entity/tool section (which would 410 live non-article pages).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { MARATHON_INTEL_KEEPER_SOURCES, ARTICLE_SECTIONS } from './deadIntel.js';
import { dmz } from '../games/dmz.js';
import { wardogs } from '../games/wardogs.js';
import { pubgDednet } from '../games/pubg-dednet.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.join(here, '..', '..', 'next.config.mjs');

// Editor (feed_items-backed) section slugs for a game config, sorted.
function editorSections(g) {
  return (g.sections || []).filter((s) => s.source === 'editor').map((s) => s.slug).sort();
}
function sortedSet(set) { return [...set].sort(); }

test('KEEPER_SOURCES == next.config /marathon/intel redirect sources', () => {
  const cfg = fs.readFileSync(configPath, 'utf8');
  const fromConfig = new Set(
    [...cfg.matchAll(/source:\s*'\/marathon\/intel\/([^']+)'/g)].map((m) => m[1])
  );
  const fromModule = MARATHON_INTEL_KEEPER_SOURCES;

  const missing = [...fromConfig].filter((s) => !fromModule.has(s)); // in config, not in module
  const extra = [...fromModule].filter((s) => !fromConfig.has(s));   // in module, not in config

  assert.deepEqual(missing, [], 'next.config has /marathon/intel redirect sources missing from deadIntel.js: ' + missing.join(', '));
  assert.deepEqual(extra, [], 'deadIntel.js lists keeper sources not present in next.config: ' + extra.join(', '));
  assert.equal(fromModule.size, fromConfig.size);
});

test('keeper sources and editor lanes do not overlap', () => {
  const lanes = new Set(['cipher', 'nexus', 'dexter', 'ghost', 'miranda']);
  for (const s of MARATHON_INTEL_KEEPER_SOURCES) assert.ok(!lanes.has(s));
});

test('ARTICLE_SECTIONS matches each game config (source=editor sections)', () => {
  assert.deepEqual(sortedSet(ARTICLE_SECTIONS.dmz), editorSections(dmz), 'dmz ARTICLE_SECTIONS drifted from lib/games/dmz.js');
  assert.deepEqual(sortedSet(ARTICLE_SECTIONS.wardogs), editorSections(wardogs), 'wardogs ARTICLE_SECTIONS drifted from lib/games/wardogs.js');
  assert.deepEqual(sortedSet(ARTICLE_SECTIONS['pubg-dednet']), editorSections(pubgDednet), 'pubg-dednet ARTICLE_SECTIONS drifted from lib/games/pubg-dednet.js');
});

test('marathon article section is intel, and its route exists', () => {
  assert.deepEqual([...ARTICLE_SECTIONS.marathon], ['intel']);
  const routePath = path.join(here, '..', '..', 'app', 'marathon', 'intel', '[slug]', 'page.js');
  assert.ok(fs.existsSync(routePath), 'app/marathon/intel/[slug]/page.js should exist');
});
