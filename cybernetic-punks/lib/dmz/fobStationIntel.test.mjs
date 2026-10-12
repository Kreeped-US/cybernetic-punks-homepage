// lib/dmz/fobStationIntel.test.mjs
// /dmz/printer and /dmz/fob reference blocks after the official FOB Station Intel graphics (observed by
// Justin, 2026-10-09): Level 2 unlock, the four Resource names, rarity tiers in order, the Stash shared by
// all Operators, no stated count of printable categories, and no number in a graphics-sourced statement
// beyond the Level 2 unlock and the source date. Then Deep Dive Part 2 (2026-10-12): the source and its
// section headings, the FOB groups and unlock rules, Stash/Operators/station lines, the printer additions,
// no "(Killers)" and no pending-Part-2 wording.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dmz, DMZ_ARTICLE_SEO } from '../games/dmz.js';
import { SOURCES as BOUNTY_SOURCES } from './bounties.js';

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

// A desc can mix sources: split it into statements, each ending at its own "(Source: ...)". Text after
// the last source (or a desc with none) belongs to the group's source.
// Statement text may hold parentheses ("(Rare loot)") and a Part 2 section name may too ("(FOB)"), so
// scan for each "(Source: " and read to its close: a quoted section ends at '")', anything else at ')'.
const statements = (desc) => {
  const out = [];
  let last = 0;
  for (let at = desc.indexOf('(Source: '); at !== -1; at = desc.indexOf('(Source: ', last)) {
    const body = at + '(Source: '.length;
    const q = desc.indexOf('section "', body);
    const quoted = q !== -1 && q < (desc.indexOf(')', body) === -1 ? Infinity : desc.indexOf(')', body));
    const end = quoted ? desc.indexOf('")', q) + 1 : desc.indexOf(')', body);
    out.push({ text: desc.slice(last, at), source: desc.slice(body, end) });
    last = end + 1;
  }
  if (/\w/.test(desc.slice(last))) out.push({ text: desc.slice(last), source: null });
  return out;
};
const PART2_HEADINGS = ['Forward Operating Base (FOB): Overview', 'Recruiting an Operator', 'MIA Operators', 'Stash/Loadout Station', 'Upgraded Unlocks: Unique, Single-Use Crafting Sessions', 'Progression: How Does DMZ Progression Work?', 'Events', 'Vendor', 'Gunsmith: How is the Gunsmith Used in DMZ?', 'Dog Tag Case', '3D Printer: How Does Crafting Work in DMZ?', 'Your First 3D Printer Recipes', 'Crafting Gear', 'Commanders'];

test('graphics-sourced statements carry no number except the Level 2 unlock and the source date', () => {
  const lines = [];
  for (const r of [PRINTER, FOB]) {
    for (const g of r.groups) {
      for (const s of g.stations) {
        // A whole group sourced to the graphics (title says so) counts entirely as graphics statements.
        if (g.title.includes(GRAPHICS)) { lines.push(s.name + ' ' + (s.desc || '')); continue; }
        for (const st of statements(s.desc || '')) if (st.source && st.source.includes(GRAPHICS)) lines.push(st.text);
      }
    }
  }
  for (const k of KEY_FACTS) if (k.includes(GRAPHICS)) lines.push(k);
  assert.ok(lines.length >= 10);
  for (const t of lines) {
    // Strip numbers that are names, not values: 3D Printer, Deep Dive Part 1, the level 70 track.
    const nums = (t.replace(/3D Printer/g, '').replace(/Part 1/g, '').replace(/level 70/g, '').match(/\d+/g) || []);
    for (const n of nums) assert.ok(['2', '2026', '10', '09'].includes(n), 'unexpected number ' + n + ' in: ' + t);
  }
  // The graphics source is listed on both pages, as text (no URL).
  for (const r of [PRINTER, FOB]) assert.ok(r.sources.some((s) => s.label === 'Official FOB Station Intel graphics, observed by Justin, 2026-10-09' && !s.href));
});

// ---- Deep Dive Part 2 (published 2026-10-09, accessed 2026-10-12) ----

const group = (r, title) => r.groups.find((g) => g.title === title);
const names = (g) => g.stations.map((s) => s.name);
const part2Statements = (r) => stations(r).flatMap((s) => statements(s.desc || '').filter((st) => st.source && st.source.startsWith('Deep Dive Part 2')).map((st) => ({ station: s.name, ...st })));

test('/dmz/fob credits the Bounty Leaderboard graphic with the same label and URL as the bounties page', () => {
  const G = BOUNTY_SOURCES.GRAPHIC;
  // Sources list: capitalised label, linked to the official post.
  const src = FOB.sources.find((s) => s.href === G.href);
  assert.ok(src, 'graphic missing from /dmz/fob sources');
  assert.equal(src.label, 'O' + G.label.slice(1));
  assert.equal(G.label.charAt(0), 'o');
  // Station description: lower-case label inside "(Source: ...)", text only (descriptions carry no links).
  assert.ok(item(FOB, 'Bounty Leaderboard').desc.includes('(Source: ' + G.label + ').'));
  // The old unlinked label is gone from the whole DMZ config (the FOB Station Intel graphics source is a different one).
  assert.ok(!JSON.stringify(dmz).includes('Bounty Leaderboard FOB Station Intel graphic, observed by Justin, 2026-10-09'));
});

test('Part 2 is a source on both pages (same label and URL as the bounties page) and the follow-up no longer says pending', () => {
  for (const r of [PRINTER, FOB]) {
    const src = r.sources.find((s) => s.href === BOUNTY_SOURCES.PART2.href);
    assert.ok(src, 'Part 2 missing from sources');
    assert.equal(src.label, BOUNTY_SOURCES.PART2.label);
    assert.ok(!/will be updated when it is published|has announced a Part 2/i.test(r.followUp), r.followUp);
    assert.match(r.followUp, /Deep Dive Part 2.*is now a source/);
  }
});

test('every Part 2 statement names a real Part 2 section heading', () => {
  const all = [...part2Statements(PRINTER), ...part2Statements(FOB)];
  assert.ok(all.length >= 20);
  for (const st of all) {
    const m = /^Deep Dive Part 2, section "(.+)"$/.exec(st.source);
    assert.ok(m, 'bad Part 2 source: ' + st.source);
    assert.ok(PART2_HEADINGS.includes(m[1]), 'not a Part 2 heading: ' + m[1]);
  }
});

test('/dmz/fob groups: nine stations from the start (incl. DMZ Progression and Events), five gated by Part 2 rules', () => {
  const start = group(FOB, 'Available from the start');
  for (const n of ['Operators (Active Duty)', 'DMZ Orders', 'Stash/Loadout', 'Firing Range', 'Survival Kits', 'Bounty Leaderboard', 'DMZ Progression', 'Events', 'Deploy']) assert.ok(names(start).includes(n), n);
  assert.equal(start.stations.length, 9);
  const gated = group(FOB, 'Unlocks through play');
  assert.deepEqual(names(gated), ['3D Printer', 'Boss Board', 'Vendor', 'Gunsmith', 'Dog Tag Case']);
  const rule = { '3D Printer': /Unlocks at DMZ Player Level 2 /, 'Boss Board': /Unlocks after you complete your second DMZ Order /, Vendor: /Unlocks at DMZ Player Level 5 /, Gunsmith: /Unlocks at DMZ Player Level 10 /, 'Dog Tag Case': /Unlocks at DMZ Player Level 20 / };
  // The 3D Printer's Level 2 rule is the graphics statement; its Part 2 statement confirms the same level.
  const part2Rule = Object.assign({}, rule, { '3D Printer': /gives the same Level 2 unlock / });
  for (const s of gated.stations) {
    assert.match(s.desc, rule[s.name], s.name);
    assert.ok(statements(s.desc).some((st) => part2Rule[s.name].test(st.text + ' ') && st.source === 'Deep Dive Part 2, section "Forward Operating Base (FOB): Overview"'), s.name + ' rule not attributed to Part 2');
  }
  assert.ok(!FOB.groups.some((g) => g.title === 'Unlocks as you progress'));
  // The Bounty Leaderboard keeps its Part 1 history and adds that the graphic and Part 2 agree.
  const bl = item(FOB, 'Bounty Leaderboard').desc;
  assert.match(bl, /That graphic and Deep Dive Part 2 both say it is available immediately/);
  assert.match(bl, /Deep Dive Part 1 had listed it among the stations that unlock as you progress/);
});

test('/dmz/fob Stash, Operators, Dog Tag Case, Vendor, Gunsmith: Part 2 statements', () => {
  const stash = statements(item(FOB, 'Stash/Loadout').desc);
  assert.ok(stash.some((st) => /40 items and 12 weapons, counted separately/.test(st.text) && /Weapons, Gear, Consumables, 3D Printer Ingredients, Keys and valuables you do not want to sell/.test(st.text) && st.source.includes('Stash/Loadout Station')));
  assert.ok(stash.some((st) => /shared by all your Active Duty Operators/.test(st.text)));
  assert.ok(stash.some((st) => /The June Deep Dive described Stash size as growing as you rank up/.test(st.text)), 'June line kept');
  const ops = item(FOB, 'Operators (Active Duty)').desc;
  assert.match(ops, /two Active Duty slots and can unlock one more through your DMZ level; the Vault Edition starts with three/);
  assert.match(ops, /cost set by their Trait Points, or dismiss them/);
  assert.match(item(FOB, 'Dog Tag Case').desc, /raises the DMZ Cash you get from bounties/);
  assert.match(item(FOB, 'Gunsmith').desc, /weapon progression is shared with Multiplayer/);
  assert.match(item(FOB, 'Events').desc, /Available immediately \(Source: Deep Dive Part 2, section "Events"\)/);
  // Numbers in Part 2 statements on /dmz/fob are only unlock levels, slot counts and Stash sizes.
  for (const st of part2Statements(FOB)) for (const n of (st.text.replace(/3D/g, '').replace(/level 70/g, '').match(/\d+/g) || [])) assert.ok(['2', '5', '10', '20', '40', '12'].includes(n), 'number ' + n + ' in ' + st.station);
});

test('/dmz/printer Part 2: recipe payout, FOB upgrades not published, first recipes, categories without a count', () => {
  assert.match(item(PRINTER, 'Extracted Recipes and Weapon Manuals').desc, /always pays 5,000 DMZ Cash; an extracted Weapon Manual pays the same/);
  const up = item(PRINTER, 'Permanent FOB upgrades').desc;
  assert.match(up, /Bank, Stash Item Capacity, MIA Recovery Discounts, Stash Weapon Capacity, and printing increasingly rare Ingredients/);
  assert.match(up, /How many tiers each has, and what they cost, is not published\./);
  assert.match(item(PRINTER, 'Valuables').desc, /sold for DMZ Cash or kept for FOB upgrades/);
  const first = group(PRINTER, 'First recipes at DMZ Player Level 2 (Deep Dive Part 2)');
  assert.deepEqual(names(first), ['Bandage', 'Medkit', '1-Plate Armor Vest', '2-Plate Armor Vest', 'Small Backpack', 'Medium Backpack']);
  const COSTS = { Bandage: ['15', '15'], Medkit: ['30', '1', '5'], '1-Plate Armor Vest': ['25', '25'], '2-Plate Armor Vest': ['50', '5'], 'Small Backpack': ['25', '25'], 'Medium Backpack': ['50', '5'] };
  for (const s of first.stations) {
    const st = statements(s.desc);
    assert.equal(st.length, 1, s.name);
    assert.equal(st[0].source, 'Deep Dive Part 2, section "Your First 3D Printer Recipes"');
    assert.deepEqual(st[0].text.replace(/^(1|2)-Plate/, '').match(/\d+/g), COSTS[s.name], s.name);
  }
  assert.match(item(PRINTER, 'Categories listed').desc, /^Upgrades, Consumables, Plate Carriers, Backpacks, Tacticals, Lethals, Field Upgrades, Fire Support, Gear and Ingredients \(Source: Deep Dive Part 2, section "Crafting Gear"\)/);
  assert.ok(PRINTER.notes.some((n) => /Deep Dive Part 2 lists the same categories as the in-game menu except Tracked/.test(n) && /Part 2 gives no count/.test(n)));
});

test('/dmz/printer Commanders: Ingredients need a kill AND extraction, credited to Part 2 "Commanders" only', () => {
  const desc = item(PRINTER, 'Commanders').desc;
  assert.equal(desc, 'Killing a Commander and extracting yields valuable 3D Printer Ingredients (Source: Deep Dive Part 2, section "Commanders").');
  assert.ok(!/Taking down a Commander|prized|Deep Dive Part 1/.test(desc), desc);
});

test('no Commander-reward sentence in the DMZ config states a reward without the extraction condition', () => {
  // Every sentence in dmz.sections or the article SEO config that ties a Commander to Ingredients or loot must say extracting.
  const sentences = JSON.stringify([dmz.sections, DMZ_ARTICLE_SEO]).split(/(?<=[.!?])\s+|","|":"/);
  const hits = sentences.filter((s) => /Commander/.test(s) && /Ingredient|loot|reward|yield/i.test(s));
  assert.ok(hits.length >= 1, 'the printer Commanders line is found');
  for (const s of hits) assert.match(s, /extract/i, s);
});

test('no "(Killers)", no CLASSIFIED and no pending Part 2 wording on /dmz/fob or /dmz/printer', () => {
  for (const r of [PRINTER, FOB]) {
    const all = [...texts(r), r.followUp, ...r.sources.map((s) => s.label)].join(' | ');
    assert.ok(!/\(Killers\)/.test(all));
    assert.ok(!/\bclassified\b/i.test(all));
    assert.ok(!/Part 2 (will|is coming|is pending)|when it is published/i.test(all));
    assert.ok(!/most wanted/i.test(all.replace(/Most Wanted players and Bounty Hunters/g, '')), 'Most Wanted outside the leaderboard line');
  }
});
