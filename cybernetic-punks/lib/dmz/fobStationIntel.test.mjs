// lib/dmz/fobStationIntel.test.mjs
// /dmz/printer and /dmz/fob reference blocks after the official FOB Station Intel graphics (observed by
// Justin, 2026-10-09): Level 2 unlock, the four Resource names, rarity tiers in order, the Stash shared by
// all Operators, no stated count of printable categories, and no number in a graphics-sourced line beyond
// the Level 2 unlock and the source date.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dmz, DMZ_ARTICLE_SEO } from '../games/dmz.js';

const GRAPHICS = 'FOB Station Intel graphics';
const ref = (slug) => dmz.sections.find((s) => s.slug === slug).reference;
const stations = (r) => r.groups.flatMap((g) => g.stations);
const item = (r, name) => stations(r).find((s) => s.name === name);
const texts = (r) => [r.intro, ...(r.notes || []), ...r.groups.map((g) => g.title), ...stations(r).map((s) => s.name + ' ' + (s.desc || ''))];
const PRINTER = ref('printer');
const FOB = ref('fob');
const KEY_FACTS = DMZ_ARTICLE_SEO['dmz-3d-printer-crafting-system-every-category-detailed'].keyFacts;

test('3D Printer unlocks at DMZ Player Level 2 (printer page, FOB station, article key fact)', () => {
  assert.match(item(PRINTER, 'When it unlocks').desc, /unlocks at DMZ Player Level 2 \(Source: official FOB Station Intel graphics, observed by Justin, 2026-10-09\)/);
  // The Part 1 wording is kept, but not as the unlock rule.
  assert.match(item(PRINTER, 'When it unlocks').desc, /Deep Dive Part 1 describes it as one of the FOB stations that open up as your deployments keep succeeding/);
  assert.match(item(FOB, '3D Printer').desc, /Unlocks at DMZ Player Level 2/);
  assert.ok(KEY_FACTS.some((k) => /unlocks at DMZ Player Level 2/.test(k)));
});

test('the four Resource names, automatic breakdown, and intact Ingredients', () => {
  const d = item(PRINTER, 'What it uses').desc;
  for (const r of ['Synthetics', 'Electronics', 'Chemicals', 'Metals']) assert.ok(d.includes(r), r);
  assert.match(d, /break down automatically when looted/);
  assert.match(d, /3D Printer Ingredients stay intact and are found in specific areas/);
});

test('rarity tiers in order with colours on the FOB page; the printer page links to it', () => {
  const d = item(FOB, 'Item rarity').desc;
  const order = ['Common (gray)', 'Uncommon (green)', 'Rare (blue)', 'Epic (purple)', 'Legendary (orange)', 'Ultra (red)'];
  const idx = order.map((t) => d.indexOf(t));
  assert.ok(idx.every((i) => i >= 0), d);
  assert.deepEqual(idx, [...idx].sort((a, b) => a - b));
  assert.equal(item(PRINTER, 'Item rarity').href, '/dmz/fob');
});

test('Stash: shared by all Operators, upgraded in the 3D Printer Upgrades menu, June wording kept with its source', () => {
  const d = item(FOB, 'Stash/Loadout').desc;
  assert.match(d, /Items in the Stash are shared by all Operators/);
  assert.match(d, /upgraded in the 3D Printer Upgrades menu/);
  assert.match(d, /The June Deep Dive described Stash size as growing as you rank up/);
  assert.match(item(FOB, 'Stash sorting').desc, /Type, then Rarity.*Rarity, then Type.*identical stacks can be merged/);
  assert.match(item(FOB, 'Getting to a station').desc, /left-side blade menu/);
});

test('no count of printable categories is stated; both lists are shown and neither is called complete', () => {
  const all = [...texts(PRINTER), ...KEY_FACTS].join(' | ');
  assert.ok(!/\b(ten|eleven|twelve|\d+)\s+(printable\s+)?categor/i.test(all), 'a category count is stated');
  assert.ok(stations(PRINTER).some((s) => s.name === 'Special Items'), 'June list kept');
  assert.match(item(PRINTER, 'Menu categories shown').desc, /^Tracked, Upgrades, Consumables, Plate Carriers, Backpacks, Tacticals, Lethals, Field Upgrades, Fire Support, Gear and Ingredients\.$/);
  assert.ok(PRINTER.notes.some((n) => /Neither list is presented as complete/.test(n) && /Upgrades and Ingredients/.test(n) && /Special Items/.test(n)));
  assert.match(item(PRINTER, 'Consumables').desc, /Energy Drink, Bandage, Pain Killers, Sedative Inhaler, Radiation Blockers, Smelling Salts, Medkit, Self-Revive Kit, Door Breacher Charge/);
});

test('graphics-sourced lines carry no number except the Level 2 unlock and the source date', () => {
  const lines = [...texts(PRINTER), ...texts(FOB), ...KEY_FACTS].filter((t) => t.includes(GRAPHICS) || /Level 2|rarity|Stash sorting|blade menu|Menu categories/i.test(t));
  assert.ok(lines.length >= 10);
  for (const t of lines) {
    // Strip numbers that are names, not values: 3D Printer, Deep Dive Part 1, the level 70 track.
    const nums = (t.replace(/3D Printer/g, '').replace(/Part 1/g, '').replace(/level 70/g, '').match(/\d+/g) || []);
    for (const n of nums) assert.ok(['2', '2026', '10', '09'].includes(n), 'unexpected number ' + n + ' in: ' + t);
  }
  // The graphics source is listed on both pages, as text (no URL).
  for (const r of [PRINTER, FOB]) assert.ok(r.sources.some((s) => s.label === 'Official FOB Station Intel graphics, observed by Justin, 2026-10-09' && !s.href));
});
