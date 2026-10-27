// lib/dmz/weapons.test.mjs
// DMZ weapons vertical (Brief 163), with invented fixture weapons: missing values are omitted (never TBD or 0),
// a fire rate printed in a non-RPM unit is shown with that unit flagged and is not ranked, in-class ranks share
// ties, the Apex Blocks list is shown only when stated, no unlock level is ever rendered, and the hub, the
// sitemap and the /dmz Coverage tile all gate on VERIFIED rows only.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  WEAPONS_HUB, WEAPON_NOTES, fireRateDisplay, weaponFacts, apexBlocksText, apexOf, classRanks, ordinal, sortWeapons,
  countVerified, weaponsHubRobots, weaponDetailRobots, weaponTitle, weaponDesc, weaponTableRows, attachmentTypes, classCardText,
} from './weapons.js';
import { APEX_NOTES } from './weaponApexNotes.js';
import { splitHubTiles, DMZ_LIVE_ONLY_ROUTES } from './hubTiles.js';
import { loadComponent, render } from '../games/jsxHarness.test-helper.mjs';

const src = (p) => readFileSync(new URL('../../' + p, import.meta.url), 'utf8');

const W = (slug, name, cls, stats, verified = false) => ({ slug, name, class_slug: cls, stats, verified, verified_source: 'fixture', updated_at: '2026-10-27T12:00:00Z' });
const ALPHA = W('alpha-rifle', 'Alpha Rifle', 'fixture-rifles', {
  post_order: 1, slot: 'primary', group_as_printed: 'Fixture Rifles', levels_to_max: 70, magazine_rounds: 30, reserve_rounds: 90,
  fire_rate_rpm: 700, fire_rate_printed: '700 RPM', attachment_types: ['Optic', 'Barrel'],
  apex: { name: 'Alpha Kit', blocks: ['Optic', 'Stock', 'Barrel'], blocks_stated: true }, player_level_card: 13, player_level_table: 5,
});
const BRAVO = W('bravo-rifle', 'Bravo Rifle', 'fixture-rifles', {
  post_order: 2, slot: 'primary', group_as_printed: 'Fixture Rifles', levels_to_max: 60, magazine_rounds: 30, reserve_rounds: 60,
  fire_rate_rpm: 800, fire_rate_printed: '800 RPM', attachment_types: [], apex: { name: 'Bravo Kit', blocks: [], blocks_stated: false },
  player_level_card: 4, player_level_table: 4,
});
const CHARLIE = W('charlie-pistol', 'Charlie Pistol', 'fixture-pistols', {
  post_order: 3, slot: 'secondary', group_as_printed: 'Fixture Pistols', levels_to_max: 38, magazine_rounds: 10, reserve_rounds: 40,
  fire_rate_rpm: null, fire_rate_printed: '260 BPM', attachment_types: ['Optic'], apex: null, player_level_card: 7, player_level_table: null,
});
const DELTA = W('delta-pistol', 'Delta Pistol', 'fixture-pistols', {
  post_order: 4, slot: 'secondary', group_as_printed: 'Fixture Pistols', levels_to_max: 37, magazine_rounds: 7, reserve_rounds: 21,
  fire_rate_rpm: 166, fire_rate_printed: '166 RPM', attachment_types: ['Optic'], apex: { name: 'Delta Kit', blocks: ['Laser'], blocks_stated: true },
});
const ECHO = W('echo-blade', 'Echo Blade', 'fixture-melee', {
  post_order: 5, slot: 'melee', group_as_printed: 'Fixture Melee', levels_to_max: 46, magazine_rounds: null, reserve_rounds: null,
  fire_rate_rpm: null, fire_rate_printed: null, attachment_types: [], apex: null, player_level_card: 4, player_level_table: 4,
});
const ALL = [ECHO, DELTA, CHARLIE, BRAVO, ALPHA];

test('fire rate: RPM as printed; another printed unit is flagged and not converted; nothing printed -> null', () => {
  assert.equal(fireRateDisplay(ALPHA), '700 RPM');
  assert.equal(fireRateDisplay(CHARLIE), '260 (printed as BPM; unit unconfirmed)');
  assert.equal(fireRateDisplay(ECHO), null);
});

test('facts: in order, missing values omitted (never TBD or 0), no unlock level', () => {
  assert.deepEqual(weaponFacts(ALPHA, 'Fixture Rifles'), [
    { label: 'Class', value: 'Fixture Rifles, primary weapon' }, { label: 'Levels to max', value: 70 },
    { label: 'Rounds', value: 30 }, { label: 'Reserve', value: 90 }, { label: 'Fire rate', value: '700 RPM' },
  ]);
  assert.deepEqual(weaponFacts(ECHO).map((f) => f.label), ['Class', 'Levels to max']);
  // Brief 165b: the slot is not repeated when it equals the class label ignoring case.
  assert.equal(weaponFacts({ ...ECHO, stats: { ...ECHO.stats, group_as_printed: 'Melee Weapon' } })[0].value, 'Melee Weapon');
  assert.equal(weaponFacts(CHARLIE)[0].value, 'Fixture Pistols, secondary weapon');
  assert.equal(classCardText('Pistols', 'Secondary weapon'), 'Pistols, secondary weapon');
  assert.equal(classCardText('Launchers', 'Secondary weapon'), 'Launchers, secondary weapon');
  assert.equal(classCardText('Melee Weapon', 'Melee weapon'), 'Melee Weapon');
  assert.equal(classCardText('Assault Rifles', 'Primary weapon'), 'Assault Rifles, primary weapon');
  assert.equal(classCardText(null, 'Primary weapon'), null);
  assert.equal(classCardText('Assault Rifles', null), 'Assault Rifles');
  for (const w of ALL) assert.ok(!JSON.stringify(weaponFacts(w)).match(/level \d|player|unlock|TBD/i), w.slug);
});

test('Apex Blocks text only when the post states a list; singular and plural wording', () => {
  assert.equal(apexBlocksText(apexOf(ALPHA)), 'Blocks Optic, Stock and Barrel attachments.');
  assert.equal(apexBlocksText(apexOf(DELTA)), 'Blocks the Laser attachment.');
  assert.equal(apexBlocksText(apexOf(BRAVO)), null, 'an unstated list is not shown as "blocks nothing"');
  assert.equal(apexOf(CHARLIE), null);
  assert.deepEqual(attachmentTypes(BRAVO), []);
});

test('in-class ranks: highest first, ties shared, non-RPM and missing values neither ranked nor counted', () => {
  assert.deepEqual(classRanks(ALPHA, ALL).map((r) => r.label + ' ' + r.text), ['Magazine joint 1st of 2', 'Reserve 1st of 2', 'Fire rate 2nd of 2']);
  assert.deepEqual(classRanks(BRAVO, ALL).map((r) => r.label + ' ' + r.text), ['Magazine joint 1st of 2', 'Reserve 2nd of 2', 'Fire rate 1st of 2']);
  // Charlie's fire rate was printed in BPM: no fire-rate rank for it, and Delta has no comparable peer.
  assert.deepEqual(classRanks(CHARLIE, ALL).map((r) => r.label), ['Magazine', 'Reserve']);
  assert.deepEqual(classRanks(DELTA, ALL).map((r) => r.label), ['Magazine', 'Reserve']);
  assert.deepEqual(classRanks(ECHO, ALL), [], 'a one-weapon class has no ranks');
  // Brief 163b: no rank block for the launchers or melee classes, even with comparable peers; other classes keep it.
  assert.deepEqual(WEAPONS_HUB.noRankClasses, ['launchers', 'melee']);
  const L1 = { ...DELTA, slug: 'l1', class_slug: 'launchers' }, L2 = { ...CHARLIE, slug: 'l2', class_slug: 'launchers' };
  const M1 = { ...DELTA, slug: 'm1', class_slug: 'melee' }, M2 = { ...ALPHA, slug: 'm2', class_slug: 'melee' };
  assert.deepEqual(classRanks(L1, [L1, L2]), []);
  assert.deepEqual(classRanks(M1, [M1, M2]), []);
  const P1 = { ...DELTA, slug: 'p1', class_slug: 'pistols' }, P2 = { ...CHARLIE, slug: 'p2', class_slug: 'pistols' };
  assert.deepEqual(classRanks(P1, [P1, P2]).map((r) => r.label), ['Magazine', 'Reserve']);
  assert.deepEqual([1, 2, 3, 4, 11, 12, 13, 21, 22, 23].map(ordinal), ['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '23rd']);
});

test('order, verified counting and robots: hub and detail are noindex until verified', () => {
  assert.deepEqual(sortWeapons(ALL).map((r) => r.slug), ['alpha-rifle', 'bravo-rifle', 'charlie-pistol', 'delta-pistol', 'echo-blade']);
  assert.equal(countVerified(ALL), 0);
  assert.deepEqual(weaponsHubRobots(0), { index: false, follow: true });
  assert.equal(weaponsHubRobots(1), undefined);
  assert.deepEqual(weaponDetailRobots(ALPHA), { index: false, follow: true });
  assert.equal(weaponDetailRobots({ ...ALPHA, verified: true }), undefined);
  assert.equal(countVerified([{ ...ALPHA, verified: true }, BRAVO]), 1);
});

test('titles and descriptions: <= 60 chars, real values only, no unlock level', () => {
  for (const w of ALL) {
    assert.ok(weaponTitle(w).length <= 60, w.slug);
    assert.ok(!/level \d|unlock|player/i.test(weaponDesc(w)), w.slug);
  }
  assert.equal(weaponDesc(ECHO, 'x'), "The Echo Blade (Fixture Melee) in MW4 DMZ: 46 levels to max. Figures from Activision's October 19, 2026 launch post.");
  assert.match(weaponDesc(CHARLIE), /fire rate 260 \(printed as BPM; unit unconfirmed\)/);
});

test('table rows: plain values in post order, empty values stay null', () => {
  const t = weaponTableRows(ALL, {});
  assert.deepEqual(t.map((r) => r.slug), ['alpha-rifle', 'bravo-rifle', 'charlie-pistol', 'delta-pistol', 'echo-blade']);
  assert.deepEqual(t[4], { slug: 'echo-blade', name: 'Echo Blade', className: 'Fixture Melee', order: 4, levels: 46, rounds: null, reserve: null, fireRpm: null, fire: null, verified: false });
  assert.equal(t[2].fireRpm, null);
  assert.ok(!JSON.stringify(t).includes('player_level'));
});

test('copy: ASCII; source and scope lines; Apex notes one line each, ASCII, no unlock levels', () => {
  assert.equal(WEAPONS_HUB.sourceLabel, "Activision's Call of Duty blog, October 19 2026 launch weapons post");
  assert.equal(WEAPONS_HUB.scopeLine, 'Figures are as published in the launch post.');
  assert.equal(WEAPON_NOTES['cronen-squall'], 'Listed as an assault rifle by the post; its description calls it a marksman rifle.');
  const all = JSON.stringify(WEAPONS_HUB) + JSON.stringify(WEAPON_NOTES) + JSON.stringify(APEX_NOTES);
  assert.ok(!/[^\x00-\x7f]/.test(all), 'ASCII only');
  assert.equal(Object.keys(APEX_NOTES).length, 28);
  assert.equal(APEX_NOTES['axion'], 'A hip-fire conversion built around a chainsaw-style rear grip; it also adds a foregrip handlebar, a hip-mounted laser and canted aiming.');
  assert.equal(APEX_NOTES['wz-55-striga'], 'Lets you dual-wield the Wz.55 Striga, one in each hand.');
  assert.equal(APEX_NOTES['astaroth-57'], 'Pings with sonar and radio waves to reveal enemies behind cover and walls; magazine capacity drops to 1.');
  assert.equal(APEX_NOTES['x-58-nyx'], 'A subsonic modification that makes the shot quieter and minimizes hit-direction indicators.');
  assert.equal(APEX_NOTES['krait-p68'], 'Adds a tactical knife held in an icepick grip that raises melee damage and lunge range; the off-hand also steadies the weapon for recoil control.');
  assert.equal(WEAPONS_HUB.sourceUrl, 'https://www.callofduty.com/blog/2026/10/call-of-duty-modern-warfare-4-launch-multiplayer-operators-weapons-equipment-create-a-class');
  for (const [k, v] of Object.entries(APEX_NOTES)) {
    assert.match(k, /^[a-z0-9]+(-[a-z0-9]+)*$/, k);
    assert.ok(v.length <= 160 && /\.$/.test(v) && v.split('. ').length === 1, k + ': one sentence');
    assert.ok(!/level|unlock/i.test(v), k);
  }
});

test('hub tile: Weapons joins the Coverage grid only with >= 1 verified weapon and never sits in "In progress"', () => {
  const none = splitHubTiles([], {}, () => false, {});
  assert.ok(!none.live.concat(none.later).some((t) => t.key === 'weapons'));
  const zero = splitHubTiles([], {}, () => false, { weapons: 0 });
  assert.ok(!zero.later.some((t) => t.key === 'weapons'));
  const one = splitHubTiles([], {}, () => false, { weapons: 1 });
  assert.deepEqual(one.live.filter((t) => t.key === 'weapons').map((t) => t.route.href), ['/dmz/weapons']);
  assert.deepEqual(DMZ_LIVE_ONLY_ROUTES.map((r) => r.href), ['/dmz/weapons']);
  // The /dmz page counts VERIFIED weapons for that tile.
  assert.match(src('app/dmz/page.js'), /weapons: function \(\) \{ return fetchDmzWeaponSlugs\(\)\.then\(function \(r\) \{ return countVerified\(r\); \}\); \}/);
});

test('sitemap: the weapons block emits the hub and details from VERIFIED rows only; footer links the hub', async () => {
  const e = src('lib/sitemap/eligible.js');
  assert.match(e, /const verifiedWeapons = weaponRows\.filter\(\(r\) => r\.verified === true\);/);
  assert.match(e, /if \(verifiedWeapons\.length > 0\) \{/);
  assert.match(e, /verifiedWeapons\.forEach\(\(r\) => add\(BASE \+ WEAPONS_HUB\.routeBase \+ '\/' \+ r\.slug/);
  const { dmz } = await import('../games/dmz.js');
  assert.equal(dmz.footer.links.explore.filter((l) => l.href === '/dmz/weapons').length, 1);
  assert.ok(!dmz.sections.some((s) => s.slug === 'weapons'), 'not a section');
});

let Detail;
before(async () => {
  Detail = (await loadComponent('components/dmz/DmzWeaponDetail.js')).default;
});

test('detail render: values, flagged unit, ranks label, Apex, note; never an unlock level; unconfirmed banner', () => {
  const html = render(() => Detail({ row: CHARLIE, rows: ALL, className: 'Fixture Pistols' }));
  assert.match(html, /260 \(printed as BPM; unit unconfirmed\)/);
  assert.match(html, /UNCONFIRMED/);
  assert.match(html, /Source: <a href="https:\/\/www\.callofduty\.com\/blog\/2026\/10\//);
  assert.match(html, /Figures are as published in the launch post\./);
  assert.match(html, /Derived from the post&#x27;s figures\./);
  assert.ok(!/Player Level|player level|unlock/i.test(html.replace(/<script[\s\S]*?<\/script>/g, '')), 'no unlock level');
  assert.ok(!/>7<|>13<|>5</.test(html), 'stored card/table levels are not rendered');
  const a = render(() => Detail({ row: { ...ALPHA, verified: true }, rows: ALL, className: 'Fixture Rifles' }));
  assert.ok(!/UNCONFIRMED/.test(a));
  assert.match(a, /Alpha Kit/);
  assert.match(a, /Blocks Optic, Stock and Barrel attachments\./);
  assert.match(a, /Optic, Barrel/);
  const e = render(() => Detail({ row: ECHO, rows: ALL, className: 'Fixture Melee' }));
  assert.ok(!/Rounds|Reserve|Fire rate|Apex attachment|Attachment types|TBD|>0</.test(e.replace(/<script[\s\S]*?<\/script>/g, '')), 'missing values omitted');
});

test('table sort: numeric columns highest first, missing values last in both directions, ties keep post order', async () => {
  const { createRequire } = await import('node:module');
  const { pathToFileURL } = await import('node:url');
  const reactUrl = pathToFileURL(createRequire(import.meta.url).resolve('react')).href;
  const mod = await loadComponent('components/dmz/DmzWeaponsTable.js', { stubs: { react: "import R from '" + reactUrl + "';\nexport const useState = R.useState;\n" } });
  const rows = weaponTableRows(ALL, {});
  assert.deepEqual(mod.sortRows(rows, 'fireRpm', 'desc').map((r) => r.slug), ['bravo-rifle', 'alpha-rifle', 'delta-pistol', 'charlie-pistol', 'echo-blade']);
  assert.deepEqual(mod.sortRows(rows, 'fireRpm', 'asc').map((r) => r.slug), ['delta-pistol', 'alpha-rifle', 'bravo-rifle', 'charlie-pistol', 'echo-blade']);
  assert.deepEqual(mod.sortRows(rows, 'rounds', 'desc').map((r) => r.slug), ['alpha-rifle', 'bravo-rifle', 'charlie-pistol', 'delta-pistol', 'echo-blade']);
  assert.deepEqual(mod.sortRows(rows, 'order', 'asc').map((r) => r.slug), rows.map((r) => r.slug));
  const html = render(mod.default, { rows, routeBase: '/dmz/weapons' });
  assert.equal((html.match(/<tr>/g) || []).length, 6, 'header + one row per weapon');
  assert.match(html, /href="\/dmz\/weapons\/alpha-rifle"/);
  assert.ok(!/TBD|>0</.test(html), 'missing values are empty cells');
});
