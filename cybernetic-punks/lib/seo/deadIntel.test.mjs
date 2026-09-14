// lib/seo/deadIntel.test.mjs -- run: node --test lib/seo/deadIntel.test.mjs
// Drift guard for Fix #1 (dead-intel 410). Asserts MARATHON_INTEL_KEEPER_SOURCES in
// lib/seo/deadIntel.js is EXACTLY the set of /marathon/intel/<slug> redirect sources in
// next.config.mjs. If a consolidation redirect is added/removed in next.config without
// updating deadIntel.js, this fails -- so the middleware can never accidentally 410 a
// slug that next.config means to 301 to a keeper.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { MARATHON_INTEL_KEEPER_SOURCES } from './deadIntel.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.join(here, '..', '..', 'next.config.mjs');

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
