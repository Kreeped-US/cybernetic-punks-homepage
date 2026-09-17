// lib/gsc/storeLoader.test.mjs
// loadDMZStore (Phase 3a): the DMZ store shape + the error-vs-empty (fail-closed) posture + the
// loadGateStore dispatch. Run: node --test lib/gsc/storeLoader.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadDMZStore, loadGateStore } from './storeLoader.js';

// Minimal mock supabase client: from(table).select(sel).eq(col,val).range(a,b) -> {data,error}.
// Returns the canned rows on the first page (a===0), empty after (single-page). failTable -> error.
function mockClient(tables, opts) {
  return {
    from(table) {
      const chain = {
        select() { return chain; },
        eq() { return chain; },
        range(a) {
          if (opts && opts.failTable === table) return Promise.resolve({ data: null, error: { message: 'boom' } });
          return Promise.resolve({ data: a === 0 ? (tables[table] || []) : [], error: null });
        },
      };
      return chain;
    },
  };
}

const FULL = {
  dmz_recipes: [{ slug: 'r1', name: 'Recipe One', acquisition: 'Armory', prints_type: 'gear', verified: true, verified_source: 'x' }],
  dmz_ingredients: [{ slug: 'i1', name: 'Ingredient One', acquisition: 'world drop', verified: false, verified_source: null }],
  dmz_lieutenants: [{ slug: 'l1', name: 'Bombmaker', acquisition: 'boss board', verified: true }],
  dmz_weapons: [{ slug: 'w1', name: 'Rifle', stats: { damage: 24, fire_rate: 600 }, verified: false }],
  dmz_attachments: [{ slug: 'a1', name: 'Suppressor', cost: 3000, cost_tier: 'mid', verified: false }],
  dmz_recipe_ingredients: [{ recipe_slug: 'r1', ingredient_slug: 'i1', quantity: 2 }],
};

test('loadDMZStore: maps the DMZ tables to the {type,name,fields,verified,patch_verified:null} entity shape', async () => {
  const { entities, counts } = await loadDMZStore(mockClient(FULL), 'dmz');
  assert.equal(entities.length, 5, 'recipe + ingredient + lieutenant + weapon + attachment (NOT builds/pois)');
  const byType = {};
  entities.forEach((e) => { byType[e.type] = e; });
  assert.equal(byType['dmz-weapon'].fields.stats.damage, 24, 'weapon carries its stats jsonb');
  assert.equal(byType['dmz-attachment'].fields.cost, 3000, 'attachment carries cost');
  assert.equal(byType['dmz-recipe'].patch_verified, null, 'DMZ has NO patch_verified -> null');
  assert.equal(byType['dmz-ingredient'].verified, false);
  assert.deepEqual(byType['dmz-recipe'].fields.ingredients, ['Ingredient One'], 'recipe carries its joined ingredient list (for a 3b list extractor)');
  assert.deepEqual(counts, { recipe: 1, ingredient: 1, lieutenant: 1, weapon: 1, attachment: 1 });
});

test('loadDMZStore: ERROR-VS-EMPTY -> THROWS on a read error (fail-closed store, never a silent partial)', async () => {
  await assert.rejects(() => loadDMZStore(mockClient(FULL, { failTable: 'dmz_weapons' }), 'dmz'), /dmz_weapons read failed/);
});

test('loadDMZStore: empty tables -> [] entities (legitimate empty, no throw)', async () => {
  const { entities } = await loadDMZStore(mockClient({}), 'dmz');
  assert.deepEqual(entities, []);
});

test('loadGateStore: dmz -> loadDMZStore; an unknown game -> empty store (no loader)', async () => {
  const dmz = await loadGateStore(mockClient(FULL), 'dmz');
  assert.equal(dmz.entities.length, 5);
  // game_slug is stamped on the returned store (game_slug boundary: runGate asserts store==draft game).
  assert.deepEqual(await loadGateStore(mockClient({}), 'valorant'), { entities: [], counts: {}, game_slug: 'valorant' });
});

// REGISTRY DISPATCH (2026-09-17): the if-switch became a slug->loader registry. These prove the
// dispatch is byte-identical: marathon still routes to loadMarathonStore, and a game with no
// registered loader (e.g. wardogs today) gets the empty store.
const MARA = {
  unique_weapons: [{ name: 'BR33 Victory Lap', verified: true, verified_source: 'bungie', patch_verified: 'S2' }],
  shell_stats: [{ name: 'Vandal', verified: true, verified_source: 'bungie', patch_verified: 'S2' }],
  weapon_stats: [{ name: 'M77', verified: true, verified_source: 'bungie', patch_verified: 'S2' }],
};
test('loadGateStore: marathon -> loadMarathonStore (registry dispatch, loader unchanged)', async () => {
  const m = await loadGateStore(mockClient(MARA), 'marathon');
  assert.equal(m.entities.length, 3, 'unique + shell + weapon');
  assert.equal(m.game_slug, 'marathon');
  assert.deepEqual(m.counts, { unique: 1, shell: 1, weapon: 1 });
  const types = m.entities.map((e) => e.type).sort();
  assert.deepEqual(types, ['shell', 'unique', 'weapon']);
});
test('loadGateStore: a game with no registered loader (wardogs) -> empty store', async () => {
  assert.deepEqual(await loadGateStore(mockClient({}), 'wardogs'), { entities: [], counts: {}, game_slug: 'wardogs' });
});
