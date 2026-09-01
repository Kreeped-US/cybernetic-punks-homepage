// lib/content/topicBucket.test.mjs
// Verifies the GAME-AGNOSTIC, ALL-ENTITY-TYPE (entity, overview) bucket: it catches reworded
// same-entity OVERVIEWS the lexical gate misses (Marathon shell 9qk2 vs 6efy; Marathon MAP Cryo
// overviews; DMZ entity overviews), does NOT over-block distinct builds/news, and never collides
// across games or entity types.  Run: node --test lib/content/topicBucket.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyIntent, matchEntity, overviewBucket, buildOverviewIndex,
  loadGameEntities, ENTITY_TABLES,
} from './topicBucket.js';

// Constructed per-game entity lists (the shape loadGameEntities returns).
const MARATHON = [
  { name: 'recon', type: 'shell' }, { name: 'assassin', type: 'shell' },
  { name: 'cryo archive', type: 'map' }, { name: 'night marsh', type: 'map' },
  { name: 'misriah 2442', type: 'weapon' },
];
const DMZ = [
  { name: 'ashika island key', type: 'dmz-key' }, { name: 'ch7 editorial dept', type: 'dmz-poi' },
];

// The real Recon cluster headlines.
const H = {
  ov_9qk2:  'Marathon Recon Shell: Intel, Tracking, and Ranked',        // near-dup that slipped through
  ov_6efy:  'Marathon Recon Shell: Map Control and Ranked Squad Guide', // live canonical overview
  build_9cx5: 'Marathon Recon Build: Early Warning System Solo Ranked Guide',
  news_tlgw:  'CRYO ARCHIVE RETURNS + RECON BUFFS + KNIFE NERF INCOMING',
  mapscoped:  'Marathon Recon Shell: Night Marsh PvP Breakdown',
  // Marathon MAP overviews (the Cryo case the shells-only version MISSED):
  cryo_a: 'Marathon Cryo Archive Guide: Learning the Endgame',
  cryo_b: 'Cryo Archive Guide: Secret Vault Locations and Loot',
  // DMZ entity overview:
  dmz_a: 'DMZ Ashika Island Key Guide: Where It Drops',
  dmz_b: 'DMZ Ashika Island Key: Complete Guide and Uses',
};

test('classifyIntent is game-agnostic (overview vs distinct)', () => {
  assert.equal(classifyIntent(H.ov_9qk2), 'overview');
  assert.equal(classifyIntent(H.ov_6efy), 'overview');
  assert.equal(classifyIntent(H.cryo_a), 'overview');   // map overview via "Guide"
  assert.equal(classifyIntent(H.dmz_a), 'overview');    // dmz overview via "Guide"
  assert.equal(classifyIntent(H.build_9cx5), 'build');
  assert.equal(classifyIntent(H.news_tlgw), 'news');
  assert.notEqual(classifyIntent(H.mapscoped), 'overview'); // PvP/Breakdown -> mechanic
});

test('MARATHON SHELL: 9qk2 and 6efy bucket to the same entity (shell:recon) -> would block', () => {
  const index = buildOverviewIndex([{ headline: H.ov_6efy, slug: '6efy' }], MARATHON);
  assert.equal(overviewBucket(H.ov_9qk2, MARATHON), 'shell:recon');
  assert.ok(index.has('shell:recon'));
  assert.equal(index.get('shell:recon').slug, '6efy');
});

test('MARATHON MAP: two Cryo Archive overviews collide (the case the shells-only version missed)', () => {
  const index = buildOverviewIndex([{ headline: H.cryo_a, slug: 'cryoA' }], MARATHON);
  assert.equal(overviewBucket(H.cryo_b, MARATHON), 'map:cryo archive');
  assert.ok(index.has('map:cryo archive'), 'a live Cryo Archive map overview occupies the bucket');
  assert.equal(index.get('map:cryo archive').slug, 'cryoA');
});

test('NON-MARATHON (DMZ): an entity overview dedups against that game\'s canonical', () => {
  const index = buildOverviewIndex([{ headline: H.dmz_a, slug: 'dmzA' }], DMZ);
  assert.equal(overviewBucket(H.dmz_b, DMZ), 'dmz-key:ashika island key');
  assert.ok(index.has('dmz-key:ashika island key'));
  assert.equal(index.get('dmz-key:ashika island key').slug, 'dmzA');
});

test('CROSS-GAME does NOT collide: a Marathon recon overview is absent from a DMZ index', () => {
  const dmzIndex = buildOverviewIndex([{ headline: H.dmz_a, slug: 'dmzA' }], DMZ);
  // The Marathon candidate's bucket (built with Marathon entities) is not in the DMZ index.
  assert.equal(overviewBucket(H.ov_9qk2, MARATHON), 'shell:recon');
  assert.ok(!dmzIndex.has('shell:recon'));
  // And the Marathon headline matches no DMZ entity, so against DMZ entities it buckets to null.
  assert.equal(overviewBucket(H.ov_9qk2, DMZ), null);
});

test('distinct BUILDS / NEWS are never bucketed (any entity type, not over-blocked)', () => {
  assert.equal(overviewBucket(H.build_9cx5, MARATHON), null);
  assert.equal(overviewBucket(H.news_tlgw, MARATHON), null);
  assert.equal(overviewBucket(H.mapscoped, MARATHON), null); // mechanic
});

test('entity matching is word-bounded (no substring false-match)', () => {
  assert.equal(matchEntity('reconnaissance drills guide', MARATHON), null); // "recon" inside a word
  assert.equal(matchEntity('Marathon Recon Shell Guide', MARATHON).name, 'recon');
  // longest match wins across types
  assert.equal(matchEntity('Cryo Archive night marsh crossover guide', MARATHON).name, 'cryo archive');
});

test('config-driven: ENTITY_TABLES covers all 4 games (new game = add a row, no logic change)', () => {
  for (const g of ['marathon', 'dmz', 'wardogs', 'pubg-dednet']) {
    assert.ok(Array.isArray(ENTITY_TABLES[g]) && ENTITY_TABLES[g].length > 0, g + ' has entity tables');
    for (const spec of ENTITY_TABLES[g]) { assert.ok(spec.table && spec.col && spec.type); }
  }
});

test('loadGameEntities: game-scopes, spans entity types, dedupes, drops short names, fail-open', async () => {
  const data = {
    shell_stats:  [{ name: 'Recon', game_slug: 'marathon' }, { name: 'Assassin', game_slug: 'marathon' }, { name: 'Recon', game_slug: 'marathon' }],
    game_maps:    [{ name: 'Cryo Archive', game_slug: 'marathon' }, { name: 'Ash', game_slug: 'marathon' }], // "Ash" < 4 chars -> dropped
    // weapon_stats + unique_weapons absent -> per-table fail-open
  };
  const supabase = {
    from(table) {
      const rows = data[table] || null; let game = null;
      const api = {
        select() { return api; },
        eq(col, val) { if (col === 'game_slug') game = val; return api; },
        async range() { return rows === null ? { data: null, error: { message: 'no relation' } } : { data: (game ? rows.filter(r => r.game_slug === game) : rows), error: null }; },
      };
      return api;
    },
  };
  const ents = await loadGameEntities(supabase, 'marathon');
  const names = ents.map((e) => e.name).sort();
  assert.deepEqual(names, ['assassin', 'cryo archive', 'recon']); // deduped, lowercased, "ash" dropped, missing tables skipped
  assert.equal(ents.find((e) => e.name === 'cryo archive').type, 'map');
  assert.equal(ents.find((e) => e.name === 'recon').type, 'shell');
});
