// lib/dmz/routeContent.test.mjs
// Brief 174: the six DMZ routes whose pages can be empty, their content map, the explicit /dmz/traits
// exemption, and the wiring: the /dmz "In progress" tiles go through gatedHref. Robots and sitemaps are
// untouched by this mechanism.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { DMZ_GATED_ROUTES, DMZ_LINK_EXEMPT, dmzRouteContent, dmzNavHiddenSections } from './routeContent.js';
import { gatedHref } from '../games/linkGate.js';

const read = (f) => readFileSync(path.resolve(f), 'utf8');
const SIX = ['/dmz/meta', '/dmz/discourse', '/dmz/missions', '/dmz/builds', '/dmz/keys', '/dmz/items'];
// Brief 190: plus every section that sets navMinArticles (today only /dmz/loadouts, minimum 3).
const GATED = [...SIX, '/dmz/loadouts'];

test('the six gated routes plus the navMinArticles sections, each with its rule; /dmz/traits exempt with a reason', () => {
  assert.deepEqual(Object.keys(DMZ_GATED_ROUTES), GATED);
  assert.equal(DMZ_GATED_ROUTES['/dmz/loadouts'], 'published articles in the section, linked from 3 (navMinArticles)');
  for (const h of GATED) assert.ok(typeof DMZ_GATED_ROUTES[h] === 'string' && DMZ_GATED_ROUTES[h].length > 0, h);
  assert.deepEqual(Object.keys(DMZ_LINK_EXEMPT), ['/dmz/traits']);
  assert.match(DMZ_LINK_EXEMPT['/dmz/traits'], /sourced facts/);
  for (const h of Object.keys(DMZ_LINK_EXEMPT)) assert.ok(!SIX.includes(h), 'exempt and gated at once: ' + h);
});

test('dmzRouteContent: counts from the hub reads; missing = 0; every gated route text at zero, a link once above', () => {
  const zero = dmzRouteContent({}, {});
  assert.deepEqual(Object.keys(zero), GATED);
  for (const h of GATED) assert.equal(gatedHref(h, zero), null, h);
  const some = dmzRouteContent({ meta: 1, discourse: 2, 'field-intel': 5, loadouts: 3 }, { missions: 1, builds: 1, keys: 1, items: 1, pois: 14 });
  for (const h of GATED) assert.equal(gatedHref(h, some), h, h);
  // Brief 190: loadouts is text below its minimum of 3 (today: 1 article), a link at 3 and above.
  for (const n of [0, 1, 2]) assert.equal(gatedHref('/dmz/loadouts', dmzRouteContent({ loadouts: n }, {})), null, String(n));
  for (const n of [3, 4]) assert.equal(gatedHref('/dmz/loadouts', dmzRouteContent({ loadouts: n }, {})), '/dmz/loadouts', String(n));
  // Exempt and live routes are never in the map, so they always link, even at zero.
  for (const h of ['/dmz/traits', '/dmz/pois', '/dmz/weapons', '/dmz/field-intel', '/dmz/bosses']) assert.equal(gatedHref(h, zero), h, h);
  assert.ok(!Object.prototype.hasOwnProperty.call(dmzRouteContent({}, { traits: 0 }), '/dmz/traits'));
});

// Brief 190: the nav hides a section below its navMinArticles, read from the same content map.
test('dmzNavHiddenSections: loadouts hidden below 3 articles, shown at 3; no other section ever hidden', () => {
  assert.deepEqual(dmzNavHiddenSections({}), ['loadouts']);
  assert.deepEqual(dmzNavHiddenSections(dmzRouteContent({ loadouts: 1, 'field-intel': 5, fob: 1, regions: 1 }, {})), ['loadouts']);
  assert.deepEqual(dmzNavHiddenSections(dmzRouteContent({ loadouts: 3 }, {})), []);
  assert.deepEqual(dmzNavHiddenSections(dmzRouteContent({ loadouts: 7 }, {})), []);
  assert.deepEqual(dmzNavHiddenSections(null), ['loadouts'], 'no map: fail-closed, hidden');
});

test('wiring: hub In-progress tiles are gated, Trait Planner goes through the gate and stays linked; robots and sitemaps do not read it', () => {
  const hub = read('app/dmz/page.js');
  // Brief 192: the redesigned hub. The content map is built from the hub's reads (a failed read counts as 0);
  // the gated routes it links (keys, Trait Planner) go through gatedHref; the In-progress row and the Coverage
  // tiles are gone; "Not covered yet" lists only the gated hub routes with no entries, as plain text.
  assert.ok(hub.includes('var routeContent = dmzRouteContent(counts, {'));
  assert.ok(hub.includes("var keysHref = gatedHref('/dmz/keys', routeContent);") && hub.includes('{keysHref ? <><br /><Link className="dmzh-more" href={keysHref}>'));
  assert.ok(hub.includes("var traitsHref = gatedHref('/dmz/traits', routeContent);"));
  assert.ok(!hub.includes('>In progress</h2>') && !hub.includes('IN_PROGRESS_NOTE') && !hub.includes('CountCard'));
  assert.ok(!/href="\/dmz\/(keys|missions|items|builds|meta|discourse)"|href=\{'\/dmz\/(keys|missions|items|builds|meta|discourse)'\}/.test(hub), 'no ungated link to a gated route');
  const nc = hub.slice(hub.indexOf('<ul data-not-covered="">'), hub.indexOf('</ul>', hub.indexOf('<ul data-not-covered="">')));
  assert.ok(nc.length > 0 && !/<Link /.test(nc), 'Not covered yet is plain text');
  // The layout reads the footer map (Brief 175, lib/dmz/routeContentData.js); the nav, robots and sitemaps do not.
  // Brief 190: /dmz/traits reads the map for its Related list only (a gated entry is dropped); robots stay its own.
  const traits = read('app/dmz/traits/page.js');
  assert.ok(traits.includes('RELATED.filter(function (r) { return gatedHref(r.href, linkContent) !== null; })'));
  assert.ok(!/routeContent\b|DMZ_GATED_ROUTES/.test(traits.replace(/routeContentData/g, '')), 'traits reads only the cached map, not the route list');
  for (const f of ['app/dmz/DmzNav.js', 'lib/sitemap/eligible.js', 'lib/sitemap/partition.js', 'app/dmz/[section]/page.js']) {
    assert.ok(!/linkGate|routeContent/.test(read(f)), f + ' does not read the link gate');
  }
});
