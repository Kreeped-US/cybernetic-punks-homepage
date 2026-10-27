// lib/dmz/routeContent.test.mjs
// Brief 174: the six DMZ routes whose pages can be empty, their content map, the explicit /dmz/traits
// exemption, and the wiring: the /dmz "In progress" tiles go through gatedHref. Robots and sitemaps are
// untouched by this mechanism.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { DMZ_GATED_ROUTES, DMZ_LINK_EXEMPT, dmzRouteContent } from './routeContent.js';
import { gatedHref } from '../games/linkGate.js';

const read = (f) => readFileSync(path.resolve(f), 'utf8');
const SIX = ['/dmz/meta', '/dmz/discourse', '/dmz/missions', '/dmz/builds', '/dmz/keys', '/dmz/items'];

test('the six gated routes, each with its rule; /dmz/traits exempt with a reason', () => {
  assert.deepEqual(Object.keys(DMZ_GATED_ROUTES), SIX);
  for (const h of SIX) assert.ok(typeof DMZ_GATED_ROUTES[h] === 'string' && DMZ_GATED_ROUTES[h].length > 0, h);
  assert.deepEqual(Object.keys(DMZ_LINK_EXEMPT), ['/dmz/traits']);
  assert.match(DMZ_LINK_EXEMPT['/dmz/traits'], /sourced facts/);
  for (const h of Object.keys(DMZ_LINK_EXEMPT)) assert.ok(!SIX.includes(h), 'exempt and gated at once: ' + h);
});

test('dmzRouteContent: counts from the hub reads; missing = 0; every gated route text at zero, a link once above', () => {
  const zero = dmzRouteContent({}, {});
  assert.deepEqual(Object.keys(zero), SIX);
  for (const h of SIX) assert.equal(gatedHref(h, zero), null, h);
  const some = dmzRouteContent({ meta: 1, discourse: 2, 'field-intel': 5 }, { missions: 1, builds: 1, keys: 1, items: 1, pois: 14 });
  for (const h of SIX) assert.equal(gatedHref(h, some), h, h);
  // Exempt and live routes are never in the map, so they always link, even at zero.
  for (const h of ['/dmz/traits', '/dmz/pois', '/dmz/weapons', '/dmz/field-intel', '/dmz/bosses']) assert.equal(gatedHref(h, zero), h, h);
  assert.ok(!Object.prototype.hasOwnProperty.call(dmzRouteContent({}, { traits: 0 }), '/dmz/traits'));
});

test('wiring: hub In-progress tiles are gated, Trait Planner goes through the gate and stays linked; robots and sitemaps do not read it', () => {
  const hub = read('app/dmz/page.js');
  assert.ok(hub.includes('var routeContent = dmzRouteContent(counts, loaded[1]);'));
  assert.ok(hub.includes('href={gatedHref(t.route.href, routeContent)}'));
  assert.ok(hub.includes("href={gatedHref('/dmz/' + t.section.slug, routeContent)}"));
  assert.ok(hub.includes("href={gatedHref('/dmz/traits', routeContent)}"));
  const row = hub.slice(hub.indexOf('>In progress</h2>'), hub.indexOf('02 THE DESK'));
  assert.ok(!/<Link /.test(row), 'no ungated Link left in the In progress row');
  assert.ok(row.includes('{IN_PROGRESS_NOTE}'));
  assert.match(hub, /var IN_PROGRESS_NOTE = 'The other pages here have no entries yet, so they are not linked; each one is linked again as soon as it has some\.';/);
  for (const f of ['app/dmz/layout.js', 'app/dmz/DmzNav.js', 'lib/sitemap/eligible.js', 'lib/sitemap/partition.js', 'app/dmz/[section]/page.js', 'app/dmz/traits/page.js']) {
    assert.ok(!/linkGate|routeContent/.test(read(f)), f + ' does not read the link gate');
  }
});
