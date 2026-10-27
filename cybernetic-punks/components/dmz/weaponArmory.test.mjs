// components/dmz/weaponArmory.test.mjs
// Brief 168: the armory hub panel, class tabs, Gunsmith bench and weapon images, with invented fixture weapons.
// Checks: the image-set builder; the slot grid marks a slot blocked ONLY when the post states a Blocks list naming
// it; the bench and the tabs read without JavaScript (every node and every class section in the server HTML);
// tags (Confirmed only on verified rows, the amber note on flagged rows); no unlock text anywhere.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { loadComponent, render } from '../../lib/games/jsxHarness.test-helper.mjs';
import {
  WEAPON_IMAGE, FLAG_LABELS, weaponImageSet, weaponImageAlt, slotGrid, hasBench, weaponFlags, hubCounts, classTabs, weaponCardStats,
} from '../../lib/dmz/weapons.js';
import { armoryCss } from './weaponArmoryCss.js';

const reactUrl = pathToFileURL(createRequire(import.meta.url).resolve('react')).href;
const REACT_STUB = "import R from '" + reactUrl + "';\nexport const useState = R.useState;\nexport const useEffect = R.useEffect;\n";

const W = (slug, cls, stats, verified = false) => ({ slug, name: slug.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' '), class_slug: cls, stats, verified });
const RIFLE = W('alpha-rifle', 'fixture-rifles', { post_order: 1, slot: 'primary', group_as_printed: 'Fixture Rifles', levels_to_max: 70, magazine_rounds: 30, reserve_rounds: 90,
  fire_rate_rpm: 700, fire_rate_printed: '700 RPM', attachment_types: ['Optic', 'Muzzle', 'Barrel', 'Stock', 'Rear Grip'],
  apex: { name: 'Alpha Kit', blocks: ['optic', 'Barrel'], blocks_stated: true }, player_level_card: 13, player_level_table: 5 });
const UNSTATED = W('bravo-rifle', 'fixture-rifles', { post_order: 2, slot: 'primary', group_as_printed: 'Fixture Rifles', levels_to_max: 60, magazine_rounds: 25, reserve_rounds: 75,
  fire_rate_rpm: 650, fire_rate_printed: '650 RPM', attachment_types: ['Optic', 'Barrel'], apex: { name: 'Bravo Kit', blocks: ['Optic'], blocks_stated: false } }, true);
const PISTOL = W('charlie-pistol', 'fixture-pistols', { post_order: 3, slot: 'secondary', group_as_printed: 'Fixture Pistols', levels_to_max: 38, magazine_rounds: 10, reserve_rounds: 40,
  fire_rate_rpm: null, fire_rate_printed: '260 BPM', attachment_types: ['Optic'], apex: { name: 'Charlie Kit', blocks: ['Laser'], blocks_stated: true } });
const LAUNCHER = W('delta-launcher', 'fixture-launchers', { post_order: 4, slot: 'secondary', group_as_printed: 'Fixture Launchers', levels_to_max: 46, magazine_rounds: 1, reserve_rounds: 1,
  fire_rate_rpm: 8, fire_rate_printed: '8 RPM', attachment_types: [], apex: null });
const ALL = [LAUNCHER, PISTOL, UNSTATED, RIFLE];
const visible = (h) => h.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<script[\s\S]*?<\/script>/g, '');

test('image set: path from the slug, 512 and 1024 widths, intrinsic size, override for a 3:1 source, null for a bad slug', () => {
  const set = weaponImageSet(RIFLE, WEAPON_IMAGE.cardSizes);
  assert.deepEqual(set, {
    src: '/images/DMZ/weapons/alpha-rifle-1024.webp',
    srcSet: '/images/DMZ/weapons/alpha-rifle-512.webp 512w, /images/DMZ/weapons/alpha-rifle-1024.webp 1024w',
    sizes: WEAPON_IMAGE.cardSizes, width: 1024, height: 512,
  });
  assert.deepEqual(WEAPON_IMAGE.sizeOverrides, { 'sang-9mm': { width: 1024, height: 341 } });
  assert.equal(weaponImageSet({ slug: 'sang-9mm' }).height, 341);
  for (const bad of [null, {}, { slug: '' }, { slug: '../x' }, { slug: 'A B' }]) assert.equal(weaponImageSet(bad), null);
  assert.equal(weaponImageAlt(RIFLE), 'Alpha Rifle (Call of Duty: Modern Warfare 4 weapon image)');
  assert.equal(WEAPON_IMAGE.credit, 'Image: Call of Duty: Modern Warfare 4');
});

test('slot grid: a slot is blocked only when the post states a Blocks list naming it (case-insensitive)', () => {
  assert.deepEqual(slotGrid(RIFLE), {
    slots: [{ name: 'Optic', blocked: true }, { name: 'Muzzle', blocked: false }, { name: 'Barrel', blocked: true }, { name: 'Stock', blocked: false }, { name: 'Rear Grip', blocked: false }],
    blocksStated: true, unlisted: [],
  });
  const u = slotGrid(UNSTATED);
  assert.equal(u.blocksStated, false);
  assert.ok(u.slots.every((s) => !s.blocked), 'blocks_stated false: nothing is marked, even with a list present');
  assert.deepEqual(slotGrid(PISTOL).unlisted, ['Laser'], 'a Blocks entry the weapon does not list is reported, not drawn');
  assert.deepEqual(slotGrid(LAUNCHER), { slots: [], blocksStated: false, unlisted: [] });
  assert.equal(hasBench(LAUNCHER), false);
  assert.equal(hasBench(RIFLE), true);
});

test('flags, counts and tabs come from the rows', () => {
  assert.deepEqual(weaponFlags(PISTOL), ['unit']);
  assert.deepEqual(weaponFlags(UNSTATED), ['noBlocks']);
  assert.deepEqual(weaponFlags(RIFLE), []);
  assert.deepEqual(FLAG_LABELS, { unit: 'Fire-rate unit unconfirmed', classNote: 'Class as listed by the post', noBlocks: 'No blocked slots stated' });
  assert.equal(WEAPON_IMAGE.hubCredit, 'Weapon images: Call of Duty: Modern Warfare 4');
  assert.deepEqual(hubCounts(ALL), { weapons: 4, withApex: 3, classes: 3, flagged: 2, verified: 1 });
  assert.deepEqual(classTabs(ALL, { 'fixture-rifles': 'Rifles' }).map((t) => t.slug + ':' + t.label + ':' + t.count),
    ['fixture-rifles:Rifles:2', 'fixture-pistols:Fixture Pistols:1', 'fixture-launchers:Fixture Launchers:1']);
  assert.deepEqual(weaponCardStats(PISTOL).map((s) => s.label + '=' + s.value), ['Rounds=10', 'Reserve=40', 'Fire rate=260 BPM (unit unconfirmed)', 'Levels to max=38']);
  assert.ok(!JSON.stringify(weaponCardStats(RIFLE)).match(/level \d|unlock|player/i));
});

let Bench, Armory, Tabs;
before(async () => {
  Bench = await loadComponent('components/dmz/WeaponBench.js', { stubs: { './BenchToggle.js': "export default function BenchToggle() { return 'TOGGLE'; }\n" } });
  Armory = (await loadComponent('components/dmz/WeaponArmory.js', { stubs: { './ArmoryTabs.js': "export default function ArmoryTabs() { return 'TABS_HERE'; }\n" } })).default;
  Tabs = (await loadComponent('components/dmz/ArmoryTabs.js', { stubs: { react: REACT_STUB } })).default;
});

test('bench without JavaScript: every node in the HTML, blocked labels only on stated blocks, Apex line, illustrative tag', () => {
  const html = render(() => Bench.default({ row: RIFLE }));
  for (const t of RIFLE.stats.attachment_types) assert.match(html, new RegExp('<span class="wb-nm">' + t + '</span>'));
  assert.equal((html.match(/class="wb-node bl"/g) || []).length, 2);
  assert.equal((html.match(/Blocked by the Apex/g) || []).length, 2);
  assert.match(html, /data-apex="off"/);
  assert.match(html, /Illustrative layout/);
  assert.match(html, /The arrangement is ours, not the in-game Gunsmith layout\./);
  assert.match(html, /Blocks optic and Barrel attachments\./, 'the Blocks list is printed as stored');
  assert.match(html, /TOGGLE/);
  const u = render(() => Bench.default({ row: UNSTATED }));
  assert.equal((u.match(/Blocked by the Apex/g) || []).length, 0);
  assert.match(u, /No blocked slots are stated\./);
  assert.equal(render(() => Bench.default({ row: LAUNCHER })), '', 'no bench without attachment types');
  assert.ok(!/unlock|player level|level \d/i.test(visible(html)));
});

test('armory without JavaScript: every class section and card in the HTML, counts strip, tags', () => {
  const html = render(() => Armory({ rows: ALL, classNames: {} }));
  assert.match(html, /id="armory"[^>]*data-filter="all"|data-filter="all"[^>]*id="armory"/);
  for (const s of ['fixture-rifles', 'fixture-pistols', 'fixture-launchers']) assert.match(html, new RegExp('id="' + s + '" class="wa-sec" data-cls="' + s + '"'));
  assert.equal((html.match(/class="wa-card"/g) || []).length, 4);
  assert.match(html, /<b>4<\/b>weapons/);
  assert.match(html, /<b>3<\/b>with an Apex/);
  assert.match(html, /<b>3<\/b>classes/);
  assert.match(html, /<b>2<\/b>with a source note/);
  assert.equal((html.match(/>Confirmed</g) || []).length, 1, 'Confirmed only on the verified row');
  assert.equal((html.match(/>Source note</g) || []).length, 2);
  assert.equal((html.match(/loading="eager"/g) || []).length, 4, 'first row eager (all 4 fixtures here)');
  assert.equal((html.match(/<img [^>]*fetchPriority="high"/gi) || []).length, 1, 'one high-priority card image (React may add a matching preload link)');
  assert.match(html, /TABS_HERE/);
  // Brief 168 GO: one credit line in the panel footer, none on the cards.
  assert.equal((html.match(/Weapon images: Call of Duty: Modern Warfare 4/g) || []).length, 1);
  assert.match(html, /<p class="wa-foot">Weapon images: Call of Duty: Modern Warfare 4<\/p><\/section>$/);
  assert.ok(!/Image: Call of Duty/.test(html), 'no per-card credit');
  assert.ok(!/unlock|player level|level \d/i.test(visible(html)));
  const css = armoryCss(['a-b', 'c']);
  assert.match(css, /\.wa\[data-filter="a-b"\] \.wa-sec:not\(\[data-cls="a-b"\]\)\{display:none\}/);
  assert.match(css, /@media \(prefers-reduced-motion:no-preference\)/);
});

test('class tabs without JavaScript: plain links to each class section, All current, counts', () => {
  const html = render(Tabs, { tabs: classTabs(ALL, {}), rootId: 'armory' });
  const links = html.match(/<a [^>]*>/g) || [];
  assert.deepEqual(links.map((a) => a.match(/href="([^"]+)"/)[1]), ['#armory', '#fixture-rifles', '#fixture-pistols', '#fixture-launchers']);
  assert.equal(links.filter((a) => a.includes('aria-current="true"')).length, 1);
  assert.ok(links[0].includes('aria-current="true"'), 'All is current by default');
  assert.match(html, />All<small>4<\/small>/);
});
