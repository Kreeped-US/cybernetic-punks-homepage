// lib/dmz/printerRecipeLevels.test.mjs
// Brief 222: the /dmz/printer "Recipe unlock levels" block (Call of Duty's Oct 19, 2026 Progression post, tier
// ATTRIBUTED): the 19 recipe names in ascending level order, the separate Revive Pistol Field Upgrade line, the
// exclusions, the source block, ASCII, no costs or ingredients, the Reported chip without its caption, and the
// placement right after the starter-recipes group.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { RECIPE_LEVELS, RECIPE_LEVELS_ALSO, RECIPE_LEVELS_SOURCE, RECIPE_LEVELS_TIER } from './printerRecipeLevels.js';
import { dmz } from '../games/dmz.js';
import { loadComponent, render } from '../games/jsxHarness.test-helper.mjs';

const NAMES = [
  'Sedative Inhaler', 'Smoke Grenade', 'Concussion Grenade', 'Frag Grenade', 'Throwing Knife', 'Snapshot Grenade',
  'Ammo Box', 'Spotter Scope', 'Armor Box', 'Shock Stick', 'Sticky Grenade', 'Gas Mask', 'Care Package', 'UAV',
  'Molotov Cocktail', 'Thermite', 'Self-Revive Kit', 'Inflatable Decoy', 'Disposable Parachute',
];
const EXCLUDED = /Semtex|Dog Tag Case|Vendor|Gunsmith|Stash/i;
const COSTS = /\bcosts?\b|Synthetics|Chemicals|Metals|Electronics|Ingredient|Biomaterial|Catalyst/i;
const PRINTER = dmz.sections.find((s) => s.slug === 'printer').reference;

test('data: levels strictly ascending integers; exactly the 19 names in order; Revive Pistol only as the Field Upgrade line', () => {
  for (let i = 0; i < RECIPE_LEVELS.length; i++) {
    assert.ok(Number.isInteger(RECIPE_LEVELS[i].level) && RECIPE_LEVELS[i].level > 2);
    if (i > 0) assert.ok(RECIPE_LEVELS[i].level > RECIPE_LEVELS[i - 1].level, 'ascending at ' + RECIPE_LEVELS[i].level);
    assert.ok(RECIPE_LEVELS[i].names.length >= 1);
  }
  assert.deepEqual(RECIPE_LEVELS.flatMap((r) => r.names), NAMES);
  assert.deepEqual(RECIPE_LEVELS.map((r) => r.level), [3, 4, 7, 9, 12, 14, 17, 23, 26, 28, 31, 36, 41, 48, 52, 55]);
  assert.deepEqual(RECIPE_LEVELS_ALSO, { level: 64, name: 'Revive Pistol', kind: 'Field Upgrade' });
  assert.ok(!NAMES.includes('Revive Pistol'));
  for (const n of RECIPE_LEVELS.flatMap((r) => r.names)) assert.ok(!EXCLUDED.test(n) && n !== 'Revive Pistol', n);
});

test('source block (key P, Call of Duty, 2026-10-19, url) and tier attributed', () => {
  assert.deepEqual(RECIPE_LEVELS_SOURCE, {
    key: 'P',
    title: 'Ready for Launch: Modern Warfare 4 Progression and Prestige',
    publisher: 'Call of Duty',
    date: '2026-10-19',
    url: 'https://www.callofduty.com/blog/2026/10/call-of-duty-modern-warfare-4-ready-for-launch-progression-prestige',
  });
  assert.equal(RECIPE_LEVELS_TIER, 'attributed');
});

test('files: ASCII; the data holds no cost or ingredient text', () => {
  for (const f of ['lib/dmz/printerRecipeLevels.js', 'components/dmz/PrinterRecipeLevels.js', 'lib/dmz/printerRecipeLevels.test.mjs']) {
    assert.ok(!/[^\x00-\x7f]/.test(readFileSync(path.resolve(f), 'utf8')), f);
  }
  assert.ok(!COSTS.test(JSON.stringify([RECIPE_LEVELS, RECIPE_LEVELS_ALSO, RECIPE_LEVELS_SOURCE])));
});

test('config: the printer reference carries the data and places it right after the starter-recipes group', () => {
  const rl = PRINTER.recipeLevels;
  assert.equal(rl.levels, RECIPE_LEVELS);
  assert.equal(rl.also, RECIPE_LEVELS_ALSO);
  assert.equal(rl.source, RECIPE_LEVELS_SOURCE);
  assert.equal(rl.tier, 'attributed');
  assert.equal(rl.heading, 'Recipe unlock levels');
  const titles = PRINTER.groups.map((g) => g.title);
  const at = titles.indexOf(rl.afterGroup);
  assert.equal(rl.afterGroup, 'First recipes at DMZ Player Level 2 (Deep Dive Part 2)');
  assert.ok(at >= 0);
  assert.equal(titles[at + 1], 'Crafting categories (Deep Dive Part 2)');
  // The bottom Sources line is unchanged: the Progression post is not added there (HANDOFF follow-up).
  assert.ok(!PRINTER.sources.some((s) => s.href === RECIPE_LEVELS_SOURCE.url));
  // The page renders the block inside the group loop, after that group.
  const page = readFileSync(path.resolve('app/dmz/[section]/page.js'), 'utf8');
  assert.match(page, /reference\.recipeLevels\.afterGroup === g\.title/);
  assert.match(page, /\{rl && <PrinterRecipeLevels data=\{rl\} \/>\}/);
});

test('kit: the shared kit (components/game) names no recipe level or the Progression post', () => {
  for (const f of readdirSync(path.resolve('components/game')).filter((x) => x.endsWith('.js'))) {
    assert.ok(!/Recipe unlock|Progression and Prestige|printerRecipeLevels/i.test(readFileSync(path.resolve('components/game', f), 'utf8')), f);
  }
});

let Block;
before(async () => {
  const tiers = await loadComponent('components/network/confidenceTiers.js');
  globalThis.__ct_TierIcon = tiers.TierIcon;
  globalThis.__ct_TIERS = tiers.CONFIDENCE_TIERS;
  Block = (await loadComponent('components/dmz/PrinterRecipeLevels.js', { stubs: {
    '@/components/network/confidenceTiers': 'export var CONFIDENCE_TIERS = globalThis.__ct_TIERS;\nexport function TierIcon(p) { return globalThis.__ct_TierIcon(p); }\n',
  } })).default;
});

const text = (h) => h.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

test('render: 12px heading, Reported chip (label only), first sentence names the post, 19 names in the list, Revive Pistol outside it, source link', () => {
  const html = render(() => Block({ data: PRINTER.recipeLevels }));
  assert.match(html, /<h3 style="[^"]*font-size:12px[^"]*">Recipe unlock levels<\/h3>/);
  assert.match(html, /class="dmzrl-rep"><svg/, 'chip carries the tier icon');
  const t = text(html);
  assert.match(t, /^Recipe unlock levels Reported These DMZ Player Levels are as listed in Call of Duty's Oct 19, 2026 post 'Ready for Launch: Modern Warfare 4 Progression and Prestige'; we have not yet re-read the post's full list ourselves\./);
  assert.ok(!/community-reported/i.test(html), 'no tier caption');
  assert.ok(!/confirmed|verified|read by Justin/i.test(t), 'nothing labelled confirmed');
  assert.ok(!COSTS.test(t), 'no cost or ingredient text');
  assert.ok(!EXCLUDED.test(t), 'no excluded name');

  const list = html.match(/<ul data-recipe-list=""[^>]*>[\s\S]*?<\/ul>/)[0];
  const items = [...list.matchAll(/<li[^>]*><div[^>]*>Level (\d+)<\/div><div[^>]*>([^<]*)<\/div><\/li>/g)];
  assert.deepEqual(items.map((m) => Number(m[1])), [3, 4, 7, 9, 12, 14, 17, 23, 26, 28, 31, 36, 41, 48, 52, 55]);
  assert.deepEqual(items.flatMap((m) => m[2].split(', ')), NAMES);
  assert.ok(!/Revive Pistol|64/.test(list), 'Revive Pistol is not inside the recipe list');

  const also = html.match(/<p data-recipe-also=""[^>]*>([^<]*)<\/p>/);
  assert.ok(also);
  assert.equal(also[1], 'Also at Level 64: Revive Pistol (a Field Upgrade, not a recipe).');
  assert.ok(html.indexOf('data-recipe-also') > html.indexOf('</ul>'));

  assert.match(t, /Source: Ready for Launch: Modern Warfare 4 Progression and Prestige \(Call of Duty blog, Oct 19, 2026\)\.$/);
  const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(hrefs, [RECIPE_LEVELS_SOURCE.url], 'the only link is the post; names are plain text');
});
