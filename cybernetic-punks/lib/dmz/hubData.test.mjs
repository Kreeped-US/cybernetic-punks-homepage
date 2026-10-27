// lib/dmz/hubData.test.mjs
// Brief 192: the /dmz hub's pure builders. Every number comes from the rows handed in; a failed read (null) yields
// no counter and no tile, never a 0; class tiles come from classTabs over VERIFIED rows; key rarity chips carry
// real counts and only counts > 0; "Not covered yet" lists only gated hub routes with no entries.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hubCounters, verifiedWeaponCount, weaponClassTiles, poiPreview, keyRarityChips, latestArticles, notCoveredRoutes, coveredRoutes, factsById, lieutenantCard, isHubCount } from './hubData.js';
import { classTabs } from './weapons.js';
import { LT_SEEN } from './bosses.js';
import { dmzRouteContent } from './routeContent.js';
import { gatedHref } from '../games/linkGate.js';

const W = (slug, cls, verified) => ({ slug, name: slug, class_slug: cls, verified, stats: { post_order: 1 } });

test('counters: only positive counts, in a fixed order; a failed read (null) or 0 is omitted, never printed', () => {
  assert.deepEqual(hubCounters({ weapons: 33, keys: 42, locations: 14, lieutenants: 9 }).map((c) => [c.key, c.value, c.label]),
    [['weapons', 33, 'verified weapons'], ['keys', 42, 'keys'], ['locations', 14, 'Hajin locations'], ['lieutenants', 9, 'Lieutenants seen']]);
  assert.deepEqual(hubCounters({ weapons: null, keys: 0, locations: 14, lieutenants: undefined }).map((c) => c.key), ['locations']);
  assert.deepEqual(hubCounters({}), []);
  assert.equal(verifiedWeaponCount(null), null);
  assert.equal(verifiedWeaponCount([W('a', 'x', true), W('b', 'x', false)]), 1);
  assert.deepEqual([0, -1, 1.5, '3', NaN, 2].map(isHubCount), [false, false, false, false, false, true]);
});

test('class tiles: classTabs over VERIFIED rows, linking to the class section on the weapons page; null -> none', () => {
  const rows = [W('a', 'ar', true), W('b', 'ar', true), W('c', 'smg', true), W('d', 'lmg', false)];
  const tiles = weaponClassTiles(rows, { ar: 'Assault Rifles', smg: 'SMGs', lmg: 'LMGs' }, '/dmz/weapons');
  assert.deepEqual(tiles, classTabs(rows.filter((r) => r.verified), { ar: 'Assault Rifles', smg: 'SMGs', lmg: 'LMGs' }).map((t) => ({ slug: t.slug, label: t.label, count: t.count, href: '/dmz/weapons#' + t.slug })));
  assert.ok(!tiles.some((t) => t.slug === 'lmg'), 'an unverified-only class has no tile');
  assert.deepEqual(weaponClassTiles(null, {}, '/dmz/weapons'), []);
});

test('POI preview: first five by name, each linked, plus how many more; null read -> null', () => {
  const rows = 'golf alpha echo bravo delta foxtrot charlie'.split(' ').map((s) => ({ slug: s, name: s[0].toUpperCase() + s.slice(1) }));
  const p = poiPreview(rows, 5, '/dmz/pois');
  assert.equal(p.total, 7);
  assert.deepEqual(p.shown.map((s) => [s.name, s.href]), [['Alpha', '/dmz/pois/alpha'], ['Bravo', '/dmz/pois/bravo'], ['Charlie', '/dmz/pois/charlie'], ['Delta', '/dmz/pois/delta'], ['Echo', '/dmz/pois/echo']]);
  assert.equal(p.more, 2);
  assert.equal(poiPreview(null, 5, '/dmz/pois'), null);
});

test('key rarity chips: documented labels in order, real counts, only counts > 0', () => {
  const rows = [{ rarity: 'Rare' }, { rarity: 'Rare' }, { rarity: 'Ultra' }, { rarity: null }, { rarity: 'Mythic' }];
  assert.deepEqual(keyRarityChips(rows), [{ label: 'Rare', count: 2 }, { label: 'Ultra', count: 1 }]);
  assert.deepEqual(keyRarityChips(null), []);
});

test('latest articles: newest first as given, section href, skips rows with no section, date from created_at', () => {
  const idx = [
    { slug: 'a', headline: 'A', created_at: '2026-10-23T10:00:00Z' },
    { slug: 'x', headline: 'X', created_at: '2026-10-22T10:00:00Z' },
    { slug: 'b', headline: 'B', created_at: '2026-10-21T10:00:00Z' },
    { slug: 'c', headline: 'C', created_at: '2026-10-20T10:00:00Z' },
    { slug: 'd', headline: 'D', created_at: '2026-10-19T10:00:00Z' },
  ];
  const sec = (r) => (r.slug === 'x' ? null : 'field-intel');
  assert.deepEqual(latestArticles(idx, 3, sec, '/dmz/'), [
    { headline: 'A', href: '/dmz/field-intel/a', date: '2026-10-23' },
    { headline: 'B', href: '/dmz/field-intel/b', date: '2026-10-21' },
    { headline: 'C', href: '/dmz/field-intel/c', date: '2026-10-20' },
  ]);
  assert.deepEqual(latestArticles(null, 3, sec, '/dmz/'), []);
});

test('Not covered yet: gated hub routes with no entries only; a route with entries leaves the list', () => {
  assert.deepEqual(notCoveredRoutes(dmzRouteContent({}, { pois: 14, keys: 42 })).map((r) => r.href), ['/dmz/missions', '/dmz/builds', '/dmz/items']);
  assert.deepEqual(notCoveredRoutes(dmzRouteContent({}, { pois: 14, keys: 42, missions: 3 })).map((r) => r.href), ['/dmz/builds', '/dmz/items']);
  // /dmz/pois is not a gated route, so it is never listed, even at 0.
  assert.ok(!notCoveredRoutes(dmzRouteContent({}, {})).some((r) => r.href === '/dmz/pois'));
});

test('facts by id: in the given order; a missing id is skipped', () => {
  const facts = [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }];
  assert.deepEqual(factsById(facts, ['b', 'zz', 'a']).map((f) => f.id), ['b', 'a']);
});

test('Lieutenants card: count from the roster, the words after the count and the rest of the note from LT_SEEN', () => {
  const c = lieutenantCard(LT_SEEN);
  assert.equal(c.count, LT_SEEN.names.length);
  assert.equal(c.after, 'seen so far');
  assert.equal(c.rest, 'The list may be incomplete: the Deep Dives do not say how many Lieutenants there are.');
  assert.equal(c.label, LT_SEEN.label);
  assert.ok(LT_SEEN.note.startsWith(LT_SEEN.note.split(' ')[0] + ' ' + c.after + '. ' + c.rest.slice(0, 10)));
});

test('Also covered: a gated hub route with entries leaves Not covered yet and becomes a gated link chip', () => {
  const c0 = dmzRouteContent({}, { pois: 14, keys: 42 });
  assert.deepEqual(coveredRoutes(c0, gatedHref).map((r) => [r.label, r.href]), [['Keys', '/dmz/keys']]);
  const c1 = dmzRouteContent({}, { pois: 14, keys: 42, missions: 3 });
  assert.deepEqual(coveredRoutes(c1, gatedHref).map((r) => [r.label, r.href]), [['Missions', '/dmz/missions'], ['Keys', '/dmz/keys']]);
  assert.ok(!notCoveredRoutes(c1).some((r) => r.href === '/dmz/missions'));
  // A gate that refuses every link yields no chip (a chip is never a dead link).
  assert.deepEqual(coveredRoutes(c1, () => null), []);
});
