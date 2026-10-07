// lib/dmz/traitsLinks.test.mjs
// Internal links to /dmz/traits (DMZ-only): the /dmz Operations Deck card, the DMZ footer Explore entry,
// and the guard that the Marathon nav, the sitemap code, the section predicate and dmz.sections still
// carry no /dmz/traits. The Related block on /dmz/traits is tested with the page in traits.test.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { dmz } from '../games/dmz.js';

const read = (f) => readFileSync(path.resolve(f), 'utf8');

test('/dmz hub: one Trait Planner card, last in the deck, literal "Work in progress"; planned badges untouched', () => {
  const src = read('app/dmz/page.js');
  assert.equal(src.split('href="/dmz/traits"').length - 1, 1, 'exactly one link to /dmz/traits');
  assert.equal(src.split('{PLANNED_TOOL_LABEL}').length - 1, 3, 'the three planned cards keep the shared label');
  assert.equal(src.split('{PLANNED_TOOLS_NOTE}').length - 1, 1, 'deck note unchanged');
  const deck = src.slice(src.indexOf('>Operations Deck'), src.indexOf('03 THE DESK'));
  assert.ok(src.indexOf('>Operations Deck') > 0 && deck.length > 0, 'deck located');
  const card = deck.slice(deck.indexOf('<Link href="/dmz/traits"'), deck.indexOf('</Link>') + '</Link>'.length);
  assert.ok(card.length > 0, 'card is inside the Operations Deck');
  assert.match(card, /<span style=\{opsName\}>Trait Planner<\/span>/);
  assert.match(card, /<span style=\{plannedBadge\}>Work in progress<\/span>/);
  assert.ok(!/PLANNED_TOOL_LABEL|\d/.test(card.replace(/\{\/\*[\s\S]*?\*\/\}/g, '')), 'no shared planned label and no digits in the card');
  assert.ok(deck.indexOf('<Link href="/dmz/traits"') > deck.lastIndexOf('{PLANNED_TOOL_LABEL}'), 'last in the deck');
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
