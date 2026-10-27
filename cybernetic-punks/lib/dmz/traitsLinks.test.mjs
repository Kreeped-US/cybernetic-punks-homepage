// lib/dmz/traitsLinks.test.mjs
// Internal links to /dmz/traits (DMZ-only): the /dmz Operations Deck card, the DMZ footer Explore entry,
// and the guard that the Marathon nav, the sitemap code, the section predicate and dmz.sections still
// carry no /dmz/traits. The Related block on /dmz/traits is tested with the page in traits.test.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { dmz } from '../games/dmz.js';
import { gatedHref } from '../games/linkGate.js';
import { dmzRouteContent } from './routeContent.js';

const read = (f) => readFileSync(path.resolve(f), 'utf8');

test('/dmz hub: one Trait Planner tile, last in the "In progress" row, literal "Work in progress"; no planned-tool tiles', () => {
  const src = read('app/dmz/page.js');
  // Brief 174: the tile is a LaterTile whose href goes through gatedHref, and /dmz/traits is exempt
  // (DMZ_LINK_EXEMPT: the page carries sourced facts), so it stays linked. The source names it exactly once.
  assert.equal(src.split("'/dmz/traits'").length - 1, 1, 'exactly one /dmz/traits reference');
  assert.ok(src.includes("href={gatedHref('/dmz/traits', routeContent)}"), 'the tile link goes through the gate');
  assert.equal(gatedHref('/dmz/traits', dmzRouteContent({}, {})), '/dmz/traits', 'exempt: linked even with every count at zero');
  // Brief 184: the three planned-tool tiles are removed (no page, best / tier claims), and their shared label with them.
  assert.equal(src.split('{PLANNED_TOOL_LABEL}').length - 1, 0, 'no planned-tool tiles');
  // Brief 128: the row note ("Planned - not live yet") is removed; it was inaccurate for the live tiles.
  assert.equal(src.split('{PLANNED_TOOLS_NOTE}').length - 1, 0, 'row note removed');
  assert.ok(!src.includes('Planned - not live yet'), 'row note text absent');
  // The planned tools moved from the Operations Deck into the "In progress" row (2026-10-21).
  const deck = src.slice(src.indexOf('>In progress'), src.indexOf('02 THE DESK'));
  assert.ok(src.indexOf('>In progress') > 0 && deck.length > 0, 'row located');
  const start = deck.indexOf('<LaterTile name="Trait Planner"');
  const card = deck.slice(start, deck.indexOf('/>', deck.indexOf('Work in progress</span>', start)) + 2);
  assert.ok(start > 0 && card.length > 0, 'tile is inside the In progress row');
  assert.match(card, /desc="Each Operator has its own trait tree, per the June Deep Dive"/);
  assert.match(card, /badge=\{<span style=\{laterBadge\}>Work in progress<\/span>\}/);
  assert.ok(!/PLANNED_TOOL_LABEL|\d/.test(card.replace(/\{\/\*[\s\S]*?\*\/\}/g, '')), 'no shared planned label and no digits in the card');
  assert.equal(deck.slice(start).split('<LaterTile').length - 1, 1, 'last in the deck');
  assert.ok(!/[^\x00-\x7F]/.test(card), 'ASCII card');
});

test('DMZ footer Explore: one "Trait Planner" entry for /dmz/traits, appended last', () => {
  const explore = dmz.footer.links.explore;
  const hits = explore.filter((l) => l.href === '/dmz/traits');
  assert.deepEqual(hits, [{ label: 'Trait Planner', href: '/dmz/traits' }]);
  assert.deepEqual(explore[explore.length - 1], { label: 'Trait Planner', href: '/dmz/traits' });
  assert.deepEqual(explore[explore.length - 2], { label: 'Builds', href: '/dmz/builds' });
});

test('source check: Marathon nav, sitemap code, section predicate and dmz.sections carry no /dmz/traits', () => {
  const files = ['components/Nav.js', 'lib/dmz/sections.js']
    .concat(readdirSync(path.resolve('lib/sitemap')).filter((f) => f.endsWith('.js')).map((f) => 'lib/sitemap/' + f));
  for (const f of files) assert.ok(!read(f).includes('/dmz/traits'), f);
  assert.ok(!JSON.stringify(dmz.sections).includes('/dmz/traits'));
  for (const f of ['app/dmz/page.js', 'app/dmz/traits/page.js', 'lib/games/dmz.js']) {
    assert.ok(!/from ['"]@\/components\/Nav['"]/.test(read(f)), f + ' does not import the Marathon nav');
  }
});
