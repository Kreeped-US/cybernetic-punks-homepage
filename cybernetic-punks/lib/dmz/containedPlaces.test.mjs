// lib/dmz/containedPlaces.test.mjs
// "Located in" rule (Brief 129), with invented names only. Row R is inside row E when both are verified,
// visible (in the passed rows) and share game_slug, R.slug != E.slug, R.area is non-empty, and the
// normalized area ends with E.name as a whole tail (start-of-string or a space before it).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { containedPlaces, areaEndsWithName } from './containedPlaces.js';

const G = 'game-a';
const row = (slug, name, area, extra) => ({ slug, name, area, verified: true, game_slug: G, ...(extra || {}) });
const CONTAINER = row('ovara-city', 'Ovara City', null);
const slugs = (list) => list.map((r) => r.slug);

test('exact tail match: area ending with the container name is inside it', () => {
  const rows = [CONTAINER, row('kestrel-docks', 'Kestrel Docks', 'Eastern Ovara City'), row('far-field', 'Far Field', 'Western Ovara')];
  assert.deepEqual(slugs(containedPlaces(CONTAINER, rows)), ['kestrel-docks']);
  assert.equal(areaEndsWithName('Ovara City', 'Ovara City'), true, 'the whole area is the name');
});

test('case and whitespace differences still match', () => {
  const rows = [CONTAINER, row('a', 'Alpha Yard', '  north   OVARA  city '), row('b', 'Beta Yard', 'south ovara\tcity')];
  assert.deepEqual(slugs(containedPlaces(CONTAINER, rows)), ['a', 'b']);
});

test('no match when the name appears mid-string or as part of a longer word', () => {
  const rows = [CONTAINER,
    row('mid', 'Mid Spot', 'Ovara City Outskirts'),
    row('glued', 'Glued Spot', 'NorthOvara City'),
    row('hyphen', 'Hyphen Spot', 'North-Ovara City'),
    row('punct', 'Punct Spot', 'Ovara City.'),
  ];
  assert.deepEqual(containedPlaces(CONTAINER, rows), []);
  assert.equal(areaEndsWithName('NorthOvara City', 'Ovara City'), false);
  assert.equal(areaEndsWithName('North-Ovara City', 'Ovara City'), false);
});

test('the row itself never matches, even when its own area ends with its name', () => {
  const self = row('ovara-city', 'Ovara City', 'Central Ovara City');
  assert.deepEqual(containedPlaces(self, [self]), []);
});

test('unverified rows are excluded, as member or as container', () => {
  const member = row('m', 'Member Yard', 'East Ovara City', { verified: false });
  assert.deepEqual(containedPlaces(CONTAINER, [CONTAINER, member]), []);
  const unverifiedContainer = { ...CONTAINER, verified: false };
  assert.deepEqual(containedPlaces(unverifiedContainer, [unverifiedContainer, row('m2', 'Member Two', 'East Ovara City')]), []);
});

test('a different game_slug is excluded', () => {
  const other = row('other', 'Other Yard', 'East Ovara City', { game_slug: 'game-b' });
  assert.deepEqual(containedPlaces(CONTAINER, [CONTAINER, other]), []);
});

test('empty or missing area is excluded; a container not in the visible rows gets nothing', () => {
  const rows = [CONTAINER, row('e1', 'Empty One', ''), row('e2', 'Empty Two', '   '), row('e3', 'Empty Three', null)];
  assert.deepEqual(containedPlaces(CONTAINER, rows), []);
  assert.deepEqual(containedPlaces(CONTAINER, [row('k', 'Kestrel Docks', 'Eastern Ovara City')]), [], 'container hidden (e.g. a live legacy redirect)');
  assert.deepEqual(containedPlaces(null, [CONTAINER]), []);
  assert.deepEqual(containedPlaces(CONTAINER, null), []);
});

test('stable order: verified then name (code-unit), stored area kept verbatim, input not mutated', () => {
  const input = [CONTAINER,
    row('z', 'Zulu Pier', 'South Central Ovara City'),
    row('a', 'Alpha Mall', 'Northeast Ovara City'),
    row('m', 'Mike Grid', 'Central Ovara City'),
  ];
  const before = JSON.stringify(input);
  const out = containedPlaces(CONTAINER, input);
  assert.deepEqual(out.map((r) => [r.name, r.area]), [['Alpha Mall', 'Northeast Ovara City'], ['Mike Grid', 'Central Ovara City'], ['Zulu Pier', 'South Central Ovara City']]);
  assert.equal(JSON.stringify(input), before, 'input untouched');
  assert.deepEqual(slugs(containedPlaces(CONTAINER, input.slice().reverse())), ['a', 'm', 'z'], 'same order whatever the input order');
});

test('literals guard: the helper holds no game, place or entity names (only field names and separators)', () => {
  const src = readFileSync(new URL('./containedPlaces.js', import.meta.url), 'utf8');
  const code = src.split(/\r?\n/).filter((l) => !/^\s*\/\//.test(l)).join('\n');
  const literals = (code.match(/'[^'\n]*'|"[^"\n]*"/g) || []).map((s) => s.slice(1, -1));
  const ALLOWED = new Set(['', ' ']);
  for (const s of literals) assert.ok(ALLOWED.has(s), 'unexpected string literal in shared helper: ' + JSON.stringify(s));
});
