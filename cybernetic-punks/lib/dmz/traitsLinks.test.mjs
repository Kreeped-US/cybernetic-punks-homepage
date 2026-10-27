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

test('/dmz hub: one Trait Planner entry, last in "Not covered yet", literal "Work in progress"; no planned-tool tiles', () => {
  const src = read('app/dmz/page.js');
  // Brief 174: the tile is a LaterTile whose href goes through gatedHref, and /dmz/traits is exempt
  // (DMZ_LINK_EXEMPT: the page carries sourced facts), so it stays linked. The source names it exactly once.
  assert.equal(src.split("'/dmz/traits'").length - 1, 1, 'exactly one /dmz/traits reference');
  // Brief 192: the In-progress row is gone; the entry sits in "Not covered yet" and its link still goes through the gate.
  assert.ok(src.includes("var traitsHref = gatedHref('/dmz/traits', routeContent);"), 'the link goes through the gate');
  assert.equal(gatedHref('/dmz/traits', dmzRouteContent({}, {})), '/dmz/traits', 'exempt: linked even with every count at zero');
  // Brief 184: the three planned-tool tiles are removed (no page, best / tier claims), and their shared label with them.
  assert.equal(src.split('{PLANNED_TOOL_LABEL}').length - 1, 0, 'no planned-tool tiles');
  // Brief 128: the row note ("Planned - not live yet") is removed; it was inaccurate for the live tiles.
  assert.equal(src.split('{PLANNED_TOOLS_NOTE}').length - 1, 0, 'row note removed');
  assert.ok(!src.includes('Planned - not live yet'), 'row note text absent');
  assert.ok(!src.includes('>In progress</h2>') && !src.includes('LaterTile'), 'the In-progress row is gone');
  const band = src.slice(src.indexOf('<h2 id="dmzh-nc-h">Not covered yet</h2>'), src.indexOf('<h2 id="dmzh-desk-h">'));
  assert.ok(band.length > 0, 'Not covered yet located');
  const card = band.slice(band.indexOf('{traitsHref ?'), band.indexOf('</li>', band.indexOf('{traitsHref ?')));
  assert.ok(/<Link [^>]*href={traitsHref}/.test(card) && card.includes("' (Work in progress): Each Operator has its own trait tree, per the June Deep Dive'"));
  assert.ok(!/PLANNED_TOOL_LABEL/.test(card) && !/\d/.test((card.match(/'[^']*'|>[^<{]*</g) || []).join('')), 'no shared planned label and no digits in the visible text');
  assert.equal(band.slice(band.indexOf('{traitsHref ?')).split('<li').length - 1, 0, 'last in the block');
  assert.ok(!/[^\x00-\x7F]/.test(card), 'ASCII');
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
