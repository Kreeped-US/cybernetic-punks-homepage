// lib/dmz/poiAreas.test.mjs
// Locations block on /dmz/regions (Brief 112): the pure grouping (by stored territory), the row filter
// (visible + verified, reusing visiblePoiRows), neighbor names, sources, the /dmz/regions config copy and
// description, and that the block shows no threat data. Fixture rows are obviously fake except where a
// real slug is needed to exercise POI_LEGACY_REDIRECTS.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { groupByField, poiAreaRows, neighborNames, distinctSources, joinNames } from './poiAreas.js';
import { DMZ_ENTITIES } from './entities.js';
import { dmz } from '../games/dmz.js';

const SRC = { source_label: 'Fixture Source One', source_url: 'https://example.test/one' };
const row = (slug, name, territory, extra) => Object.assign({ slug, name, territory, area: 'Fixture Area ' + slug, verified: true, neighbors: null }, SRC, extra || {});

test('groupByField by territory: stored codes kept exactly, groups and rows sorted, null/blank separated', () => {
  const rows = [
    row('b', 'Bravo', 'SK'),
    row('a', 'Alpha', 'NK'),
    row('c', 'Charlie', 'SK'),
    row('x', 'Xray', null),
    row('y', 'Yankee', '  '),
    row('z', 'Zulu', 'sk'), // different stored spelling -> its own group, never merged or expanded
  ];
  const g = groupByField(rows, 'territory', 'name');
  assert.deepEqual(g.groups.map((x) => x.key), ['NK', 'SK', 'sk']);
  assert.deepEqual(g.groups.map((x) => x.rows.map((r) => r.name)), [['Alpha'], ['Bravo', 'Charlie'], ['Zulu']]);
  assert.deepEqual(g.ungrouped.map((r) => r.name), ['Xray', 'Yankee'], 'null/blank territory is never a group');
  assert.ok(!g.groups.some((x) => x.key.trim() === ''));
  // Rows keep every stored field (the card reads area from the row as stored).
  assert.equal(g.groups[0].rows[0].area, 'Fixture Area a');
});

test('groupByField: no mutation, stable for equal names, tolerant of bad input', () => {
  const rows = [row('b', 'Same', 'NK'), row('a', 'Same', 'NK'), row('c', 'First', 'NK')];
  const before = JSON.stringify(rows);
  const g = groupByField(rows, 'territory', 'name');
  assert.equal(JSON.stringify(rows), before, 'input array and rows untouched');
  assert.deepEqual(g.groups[0].rows.map((r) => r.slug), ['c', 'b', 'a'], 'equal names keep input order');
  assert.notEqual(g.groups[0].rows, rows);
  assert.deepEqual(groupByField(null, 'territory', 'name'), { groups: [], ungrouped: [] });
  assert.deepEqual(groupByField([null, undefined], 'territory', 'name'), { groups: [], ungrouped: [] });
});

test('groupByField is game-agnostic: no game or place literals in poiAreas.js', () => {
  const src = readFileSync(path.resolve('lib/dmz/poiAreas.js'), 'utf8');
  assert.ok(!/Hajin|NuriGO|The Grid|Songdo|Wolves|Part 1|Deep Dive|\bNK\b|\bSK\b/.test(src));
});

test('poiAreaRows: unverified rows and rows with a live legacy redirect never appear', () => {
  const rows = [
    row('fixture-ok', 'Fixture OK', 'NK'),
    row('fixture-unverified', 'Fixture Unverified', 'NK', { verified: false }),
    row('fixture-null-verified', 'Fixture Null', 'NK', { verified: null }),
    // 'broadcast' redirects to the hub (always live) -> hidden even if verified.
    row('broadcast', 'Legacy Broadcast', 'SK'),
    // 'hospital' -> mirae-general-hospital: hidden only once the target row exists.
    row('hospital', 'Legacy Hospital', 'SK'),
  ];
  assert.deepEqual(poiAreaRows(rows).map((r) => r.slug), ['fixture-ok', 'hospital'], 'target absent -> hospital still visible');
  const withTarget = rows.concat([row('mirae-general-hospital', 'Fixture Target', 'SK')]);
  assert.deepEqual(poiAreaRows(withTarget).map((r) => r.slug), ['fixture-ok', 'mirae-general-hospital']);
  assert.deepEqual(poiAreaRows([]), []);
});

test('neighborNames: names in the row order, unknown or hidden slugs skipped; joinNames wording', () => {
  const city = row('city', 'Fixture City', null, { neighbors: ['d', 'missing', 'b', 'c'] });
  const rows = [city, row('b', 'Bravo', 'NK'), row('c', 'Charlie', 'NK'), row('d', 'Delta', 'SK')];
  assert.deepEqual(neighborNames(city, rows), ['Delta', 'Bravo', 'Charlie']);
  assert.deepEqual(neighborNames(row('n', 'None', null), rows), []);
  assert.equal(joinNames(['A', 'B', 'C', 'D']), 'A, B, C and D');
  assert.equal(joinNames(['A', 'B']), 'A and B');
  assert.equal(joinNames(['A']), 'A');
  assert.equal(joinNames([]), '');
});

test('distinctSources: each stored source_label once, with its url', () => {
  const rows = [row('a', 'A', 'NK'), row('b', 'B', 'NK'), row('c', 'C', 'NK', { source_label: 'Fixture Source Two', source_url: null }), row('d', 'D', 'NK', { source_label: null })];
  assert.deepEqual(distinctSources(rows), [{ label: 'Fixture Source One', url: 'https://example.test/one' }, { label: 'Fixture Source Two', url: null }]);
});

test('/dmz/regions config: block copy and description pinned', () => {
  const sec = dmz.sections.find((s) => s.slug === 'regions');
  const cfg = sec.poiAreas;
  assert.equal(cfg.entity, 'pois');
  assert.equal(cfg.groupBy, 'territory');
  assert.equal(cfg.cardDetail, 'area');
  assert.equal(cfg.heading, 'Locations by previous territory');
  assert.equal(cfg.threatNote, 'Threat levels are on each location\'s page.');
  assert.equal(cfg.noAreaNote('Hajin City', joinNames(['NuriGO Mall', 'The Grid', 'Songdo Wharf', 'Wolves Stadium'])),
    'Hajin City is the urban area containing NuriGO Mall, The Grid, Songdo Wharf and Wolves Stadium; Part 1 gives it no area or threat level of its own.');
  // The section description (meta description, visible intro, CollectionPage JSON-LD, /dmz coverage card).
  assert.equal(sec.description, 'The Hajin Exclusion Zone\'s locations by area and previous territory, as listed in Call of Duty\'s Deep Dive Part 1 (pre-release), plus related reports.');
  assert.ok(!/secure-and-extract|weather/.test(sec.description), 'unsupported wording removed');
  assert.equal(sec.label, 'Hajin Regions');
  // The detail page's territory label is unchanged.
  assert.deepEqual(DMZ_ENTITIES.pois.facts({ area: 'X', territory: 'SK', poi_type: 'zone' }).map((f) => f.label), ['Location', 'Previous territory', 'Type']);
});

test('the block shows no threat data: the render reads no threat field', () => {
  // The block lives in components/dmz/PoiAreaBlock.js since Brief 119 (moved out of the section page).
  const page = readFileSync(path.resolve('app/dmz/[section]/page.js'), 'utf8');
  const block = readFileSync(path.resolve('components/dmz/PoiAreaBlock.js'), 'utf8');
  assert.ok(block.includes('export default function PoiAreaBlock('));
  assert.ok(!page.includes('function PoiAreaBlock('), 'not duplicated in the page');
  assert.ok(!/threat_levels|\.level\b|DMZ_THREAT_LEVELS/.test(block), 'no threat levels, ranks or summaries');
  assert.match(block, /if \(!rows \|\| rows\.length === 0\) return null;/, 'zero rows -> renders nothing');
  assert.match(page, /\{areaRows\.length > 0 && <PoiAreaBlock /);
});
