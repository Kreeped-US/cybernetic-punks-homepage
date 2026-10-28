// lib/dmz/keys.test.mjs
// Brief 180: DMZ keys with a name and rarity only (operator observation) until a location, unlock or map region is
// known. Rarity fact and hub card note only when set (also when the rarity column does not exist yet); data-aware
// detail title / description and hub title / description; the depth floor on the detail robots, the sitemap and
// the hub ItemList; other entities do not opt in.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { DMZ_ENTITIES, DMZ_KEY_RARITIES } from './entities.js';
import { entityDetailIndexable } from '../games/entityDepth.js';
import { loadComponent, render } from '../games/jsxHarness.test-helper.mjs';

const K = DMZ_ENTITIES.keys;
const read = (f) => readFileSync(path.resolve(f), 'utf8');
const SRC = 'Observed in-game by the site operator, 2026-10-27';
// A row as the table holds it today: no rarity column at all (the key is absent, not null).
const NO_COL = { name: "Doctor's Office", slug: 'doctors-office', verified: true, verified_source: SRC, location: null, unlocks: null, map_region: null };
const RARE = Object.assign({}, NO_COL, { rarity: 'Rare' });

test('rarity labels: the documented list (incl. Ultra); not a validator', () => {
  assert.deepEqual(DMZ_KEY_RARITIES, ['Uncommon', 'Rare', 'Epic', 'Legendary', 'Ultra']);
  // An unknown label renders exactly as stored.
  assert.deepEqual(K.facts(Object.assign({}, NO_COL, { rarity: 'Mythic' })), [{ label: 'Rarity', value: 'Mythic' }]);
});

test('facts and card note: rarity only when set; nothing when the column is absent, null or blank', () => {
  assert.deepEqual(K.facts(NO_COL), []);
  for (const r of [null, '', '  ']) assert.deepEqual(K.facts(Object.assign({}, NO_COL, { rarity: r })), [], JSON.stringify(r));
  assert.deepEqual(K.facts(RARE), [{ label: 'Rarity', value: 'Rare' }]);
  assert.equal(K.hubCardNote(NO_COL), null);
  assert.equal(K.hubCardNote(RARE), 'Rare');
  assert.deepEqual(K.facts(Object.assign({}, RARE, { location: 'Hajin Pier', unlocks: 'A locker', map_region: 'East' })).map((f) => f.label), ['Rarity', 'Location', 'Unlocks', 'Region']);
});

test('detail title and description: name and rarity only; location / rewards wording only when set', () => {
  assert.equal(K.detailTitle(NO_COL), "DMZ Doctor's Office Key");
  assert.equal(K.detailTitle(RARE), "DMZ Doctor's Office Key (Rare)");
  assert.equal(K.detailTitle(Object.assign({}, RARE, { name: 'Pier Storage Key' })), 'DMZ Pier Storage Key (Rare)', 'no "Key Key"');
  assert.equal(K.detailTitle(Object.assign({}, RARE, { location: 'Pier' })), "DMZ Doctor's Office: Location");
  assert.equal(K.detailTitle(Object.assign({}, RARE, { unlocks: 'A locker' })), "DMZ Doctor's Office: Rewards");
  assert.equal(K.detailTitle(Object.assign({}, RARE, { map_region: 'East', unlocks: 'A locker' })), "DMZ Doctor's Office: Location & Rewards");
  assert.equal(K.detailDesc(NO_COL), "Doctor's Office is a key in DMZ (Modern Warfare 4).");
  assert.equal(K.detailDesc(RARE), "Doctor's Office is a Rare key in DMZ (Modern Warfare 4).");
  assert.equal(K.detailDesc(Object.assign({}, RARE, { rarity: 'Epic' })), "Doctor's Office is an Epic key in DMZ (Modern Warfare 4).");
  assert.equal(K.detailDesc(Object.assign({}, RARE, { rarity: 'Ultra', location: 'Pier', map_region: 'East', unlocks: 'A locker' })),
    "Doctor's Office is an Ultra key in DMZ (Modern Warfare 4). Where it is found: Pier, East. What it unlocks: A locker.");
  for (const r of [NO_COL, RARE]) {
    assert.doesNotMatch(K.detailTitle(r) + ' ' + K.detailDesc(r), /Location|Rewards|Where to find|Where it is found|unlocks:/, 'no promise when empty');
  }
});

test('hub title and description: what the rows carry; empty state keeps the static copy', () => {
  assert.equal(K.hubTitleFor([NO_COL]), 'DMZ Keys');
  assert.equal(K.hubTitleFor([NO_COL, RARE]), 'DMZ Keys: Rarity');
  assert.equal(K.hubTitleFor([RARE, Object.assign({}, NO_COL, { location: 'Pier', unlocks: 'x' })]), 'DMZ Keys: Rarity, Locations & Rewards');
  assert.equal(K.hubDescFor([RARE, NO_COL]), 'DMZ keys listed by name and rarity label, as observed in game. Each entry is marked verified or unconfirmed.');
  assert.equal(K.hubDescFor([NO_COL]), 'DMZ keys listed by name, as observed in game. Each entry is marked verified or unconfirmed.');
  assert.equal(K.hubDescFor([Object.assign({}, RARE, { verified_source: 'Another source' })]), 'DMZ keys listed by name and rarity label. Each entry is marked verified or unconfirmed.', 'observed wording only when every row says so');
  assert.equal(K.hubDescFor([RARE, Object.assign({}, NO_COL, { map_region: 'East' })]), 'DMZ keys listed by name and rarity label, as observed in game; locations where known. Each entry is marked verified or unconfirmed.');
  assert.match(K.hubDescFor([RARE, Object.assign({}, NO_COL, { location: 'x', unlocks: 'y' })]), /; locations where known; rewards where known\./);
  for (const d of [K.hubDescFor([RARE]), K.hubDescFor([RARE, Object.assign({}, NO_COL, { location: 'x', unlocks: 'y' })])]) {
    assert.ok(d.length <= 160, d.length);
    assert.doesNotMatch(d, /\bevery\b|\bcomplete\b|\bbest\b/i);
  }
  const hub = read('app/dmz/keys/page.js');
  assert.ok(hub.includes('if (rows.length === 0) return { title: entity.hubTitle, desc: entity.hubDesc };'));
  assert.ok(hub.includes('hubDesc: hubCopy(entity, rows).desc'));
});

test('depth floor: keys opt in (location, unlocks, map_region); pois, missions and items do not', () => {
  assert.deepEqual(K.depthFloor, ['location', 'unlocks', 'map_region']);
  for (const k of ['pois', 'missions', 'items']) assert.equal(DMZ_ENTITIES[k].depthFloor, undefined, k);
  assert.equal(entityDetailIndexable(K, RARE), false, 'name + rarity only: noindex');
  assert.equal(entityDetailIndexable(K, Object.assign({}, RARE, { unlocks: 'A locker' })), true);
  assert.equal(entityDetailIndexable(K, Object.assign({}, RARE, { verified: false, location: 'x' })), false);
});

test('wiring: detail robots and the sitemap use the floor; fetchDmzSlugs reads the floor fields; hub robots unchanged', () => {
  for (const e of ['keys', 'missions', 'items', 'pois']) {
    const r = read('app/dmz/' + e + '/[slug]/page.js');
    assert.ok(r.includes('var robots = entityDetailIndexable(entity, row) ? undefined : { index: false, follow: true };'), e);
  }
  assert.ok(read('app/dmz/keys/page.js').includes('var robots = rows.length > 0 ? undefined : { index: false, follow: true };'), 'hub indexable once any row exists');
  const sm = read('lib/sitemap/eligible.js');
  assert.ok(sm.includes("rows.filter((r) => entityDetailIndexable(entity, r)).forEach((r) =>"));
  assert.ok(sm.includes("add(BASE + entity.routeBase, D, 'dmz-entity', lm(maxUpdatedAt(rows.filter((r) => r.verified === true))), 'daily', 0.85);"), 'hub lastmod rule unchanged');
  assert.ok(read('lib/dmz/entities.js').includes("var cols = ['slug', 'updated_at', 'verified'].concat(depthFloorFields(entity));"));
  assert.match(read('lib/dmz/hubTiles.js'), /key: 'keys'.*desc: 'Keys recorded so far, with rarity and, where known, location and rewards\.'/);
});

// The hub component from fixture data: rarity line on cards, ItemList urls only for indexable keys.
let Hub;
before(async () => {
  // Brief 217: the hub is on the hub kit; the kit components are bridged through globalThis (one file per compile).
  for (const c of ['CutCard', 'StatNumeral']) globalThis['__hk_' + c] = (await loadComponent('components/game/' + c + '.js')).default;
  globalThis.__hk_isShownCount = (await loadComponent('components/game/StatNumeral.js')).isShownCount;
  const bridge = (c) => 'export default function ' + c + '(p) { return globalThis.__hk_' + c + '(p); }\n';
  const header = await loadComponent('components/game/HubPageHeader.js', { stubs: { './CutCard': bridge('CutCard'), './StatNumeral': 'export function isShownCount(v) { return globalThis.__hk_isShownCount(v); }\n' + bridge('StatNumeral') } });
  globalThis.__hk_HubPageHeader = header.default;
  globalThis.__hk_HUB_PAGE_CSS = header.HUB_PAGE_CSS;
  Hub = (await loadComponent('components/dmz/DmzEntityHub.js', {
    stubs: {
      'next/headers': 'export async function cookies() { return { get() { return undefined; } }; }\n',
      './DmzNotifyStrip': 'export default function DmzNotifyStrip() { return null; }\n',
      '@/components/game/CutCard': bridge('CutCard'),
      '@/components/game/HubPageHeader': bridge('HubPageHeader') + 'export var HUB_PAGE_CSS = globalThis.__hk_HUB_PAGE_CSS;\n',
    },
  })).default;
});
const renderHub = async (entity, rows) => { const el = await Hub({ entity, rows }); return render(() => el); };
const itemList = (html) => JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]).mainEntity.itemListElement;

test('hub render: rarity card note; ItemList url only for keys over the floor; pois unchanged', async () => {
  const rows = [RARE, Object.assign({}, NO_COL, { name: 'Pier Storage', slug: 'pier-storage', unlocks: 'A locker' })];
  const html = await renderHub(K, rows);
  assert.equal((html.match(/data-card-note=""/g) || []).length, 1, 'one card with a rarity');
  assert.match(html, /<div data-card-note="" class="ehub-note">Rare<\/div>/);
  const il = itemList(html);
  assert.deepEqual(il.map((x) => [x.name, x.url || null]), [["Doctor's Office", null], ['Pier Storage', 'https://cyberneticpunks.com/dmz/keys/pier-storage']]);
  // Cards still link every key page (noindex pages stay reachable).
  assert.ok(html.includes('href="/dmz/keys/doctors-office"') && html.includes('href="/dmz/keys/pier-storage"'));
  // An entity without a floor keeps a url on every ListItem, verified or not, and has no card note.
  const P = DMZ_ENTITIES.pois;
  const poiHtml = await renderHub(P, [{ name: 'A', slug: 'a', verified: false }, { name: 'B', slug: 'b', verified: true }]);
  assert.ok(itemList(poiHtml).every((x) => x.url));
  assert.ok(!poiHtml.includes('data-card-note'));
});
