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
  // Brief 186: name and class first, at most three facts, the source credit only when it fits.
  assert.equal(weaponDesc(ECHO, 'x'), 'Echo Blade (Fixture Melee) in MW4 DMZ: 46 levels to max. Source: Activision, Oct 19 2026.');
  assert.match(weaponDesc(CHARLIE), /fire rate 260 \(printed as BPM; unit unconfirmed\)/);
  assert.equal(weaponDesc(CHARLIE), 'Charlie Pistol (Fixture Pistols) in MW4 DMZ: 10-round magazine, fire rate 260 (printed as BPM; unit unconfirmed), 38 levels to max.');
  assert.equal(weaponDesc(ALPHA), 'Alpha Rifle (Fixture Rifles) in MW4 DMZ: 30-round magazine, fire rate 700 RPM, Apex attachment Alpha Kit. Source: Activision, Oct 19 2026.');
  // No published fact: the name sentence only, no source credit.
  assert.equal(weaponDesc(W('no-facts', 'No Facts', 'x', {})), 'No Facts in MW4 DMZ.');
});

// Brief 186: the 33 weapons as stored in dmz_weapons (Activision's Oct 19 2026 launch post; read 2026-10-27), only
// the fields the description reads: slug, name, group_as_printed, magazine, reserve, fire_rate_rpm,
// fire_rate_printed, levels_to_max, Apex name.
const LIVE33 = [
  ['han-86', 'Han 86', 'Assault Rifles', 30, 90, 740, '740 RPM', 72, 'Han X20 Skybreaker'],
  ['m4', 'M4', 'Assault Rifles', 30, 90, 810, '810 RPM', 72, 'M4 Hurricane'],
  ['hyeon-burst', 'Hyeon Burst', 'Assault Rifles', 30, 90, 375, '375 RPM', 68, 'Hyeon Hyperburst'],
  ['patriot-xmr', 'Patriot XMR', 'Assault Rifles', 25, 100, 645, '645 RPM', 72, 'Patriot XMR Volt'],
  ['kastov-762', 'Kastov 762', 'Assault Rifles', 30, 90, 600, '600 RPM', 68, 'Kastov ARC'],
  ['oden', 'Oden', 'Assault Rifles', 20, 60, 413, '413 RPM', 65, 'Oden Sentinel'],
  ['axion', 'Axion', 'Assault Rifles', 30, 90, 705, '705 RPM', 69, 'Axion Clearcut'],
  ['cronen-squall', 'Cronen Squall', 'Assault Rifles', 20, 80, 673, '673 RPM', 67, 'Cronen Maelstrom'],
  ['iso-nightshade', 'ISO Nightshade', 'Submachine Guns (SMGs)', 30, 90, 923, '923 RPM', 64, 'ISO Trace'],
  ['vel-46', 'VEL 46', 'Submachine Guns (SMGs)', 40, 120, 952, '952 RPM', 60, 'VEL 46 Snap'],
  ['wz-55-striga', 'Wz.55 Striga', 'Submachine Guns (SMGs)', 25, 75, 651, '651 RPM', 60, 'WZ.55 Striga Rampage'],
  ['ppsh-41', 'PPSh-41', 'Submachine Guns (SMGs)', 71, 71, 1110, '1110 RPM', 62, 'PPSh-41 Ember'],
  ['x-58-nyx', 'X-58 Nyx', 'Submachine Guns (SMGs)', 40, 120, 800, '800 RPM', 53, 'X-58 Void'],
  ['rezi-12', 'Rezi 12', 'Shotguns', 6, 24, 150, '150 RPM', 60, 'Rezi 12 Enforcer'],
  ['warlord', 'Warlord', 'Shotguns', 14, 42, 105, '105 RPM', 60, 'Warlord Lumen'],
  ['finn-lmg', 'FiNN LMG', 'Light Machine Guns (LMGs)', 100, 100, 587, '587 RPM', 59, 'FiNN Adverse'],
  ['type-73', 'Type 73', 'Light Machine Guns (LMGs)', 60, 60, 821, '821 RPM', 65, 'Type 73 Assault'],
  ['apoc-338', 'APOC-338', 'Light Machine Guns (LMGs)', 50, 100, 554, '554 RPM', 56, 'APOC-338 Praetor'],
  ['mar-9', 'MAR-9', 'Marksman Rifles', 20, 60, 315, '315 RPM', 73, 'MAR-9 Auto'],
  ['oris-8-6', 'Oris 8.6', 'Marksman Rifles', 10, 30, 89, '89 RPM', 70, 'Oris 8.6 Razor'],
  ['mosin-nagant', 'Mosin-Nagant', 'Marksman Rifles', 5, 15, 44, '44 RPM', 69, 'Mosin Harpoon'],
  ['kg-7-vulcan', 'KG-7 Vulcan', 'Sniper Rifles', 10, 20, 41, '41 RPM', 75, 'KG-7 Drillcharge'],
  ['astaroth-57', 'Astaroth .57', 'Sniper Rifles', 3, 9, 34, '34 RPM', 54, 'Astaroth .57 Infiltrator'],
  ['signal-50', 'Signal 50', 'Sniper Rifles', 7, 21, 111, '111 RPM', 74, 'Signal Inferno'],
  ['sang-9mm', 'SANG 9mm', 'Pistols', 13, 39, 370, '370 RPM', 38, 'SANG Breach'],
  ['krait-p68', 'Krait P68', 'Pistols', 10, 40, 260, '260 RPM', 38, 'Krait P68 Commando'],
  ['50-gs', '.50 GS', 'Pistols', 7, 21, 166, '166 RPM', 37, 'GS Magna'],
  ['mojave-357', 'Mojave .357', 'Pistols', 8, 32, 141, '141 RPM', 44, 'Mojave Lawless'],
  ['pila', 'PILA', 'Launchers', 1, 1, 8, '8 RPM', 46, null],
  ['rpg-8', 'RPG-8', 'Launchers', 1, 1, 20, '20 RPM', 46, null],
  ['jokr', 'JOKR', 'Launchers', 1, 1, 13, '13 RPM', 46, null],
  ['pm-40-anvil', 'PM-40 Anvil', 'Launchers', 3, 6, 38, '38 RPM', 46, null],
  ['fss-carbon-edge-1095', 'FSS Carbon Edge 1095', 'Melee Weapon', null, null, null, null, 46, null],
].map(([slug, name, group, mag, reserve, rpm, printed, levels, apex]) => W(slug, name, 'x', {
  group_as_printed: group, magazine_rounds: mag, reserve_rounds: reserve, fire_rate_rpm: rpm, fire_rate_printed: printed,
  levels_to_max: levels, apex: apex ? { name: apex, blocks: [], blocks_stated: false } : null,
}, true));

test('descriptions for the 33 live weapons: <= 155, unique, name and class first, no banned or empty words', () => {
  assert.equal(LIVE33.length, 33);
  const d = LIVE33.map((w) => weaponDesc(w));
  assert.equal(new Set(d).size, 33, 'unique');
  LIVE33.forEach((w, i) => {
    assert.ok(d[i].length <= 155, d[i].length + ' ' + d[i]);
    assert.ok(d[i].startsWith(w.name + ' (' + w.stats.group_as_printed + ') in MW4 DMZ'), d[i]);
    assert.doesNotMatch(d[i], /\b(best|top|rank\w*|tiers?)\b/i, d[i]);
    assert.doesNotMatch(d[i], /undefined|null|NaN|TBD|\b0-round/, d[i]);
  });
  const by = Object.fromEntries(LIVE33.map((w, i) => [w.slug, d[i]]));
  assert.equal(by['han-86'], 'Han 86 (Assault Rifles) in MW4 DMZ: 30-round magazine, fire rate 740 RPM, Apex attachment Han X20 Skybreaker. Source: Activision, Oct 19 2026.');
  assert.equal(by['krait-p68'], 'Krait P68 (Pistols) in MW4 DMZ: 10-round magazine, fire rate 260 RPM, Apex attachment Krait P68 Commando. Source: Activision, Oct 19 2026.');
  // No Apex: levels to max takes the third place.
  assert.equal(by['pila'], 'PILA (Launchers) in MW4 DMZ: 1-round magazine, fire rate 8 RPM, 46 levels to max. Source: Activision, Oct 19 2026.');
  // Only levels to max is published: nothing else is printed.
  assert.equal(by['fss-carbon-edge-1095'], 'FSS Carbon Edge 1095 (Melee Weapon) in MW4 DMZ: 46 levels to max. Source: Activision, Oct 19 2026.');
  // The longest: the credit does not fit, so it is left off and the three facts stay.
  assert.equal(by['wz-55-striga'], 'Wz.55 Striga (Submachine Guns (SMGs)) in MW4 DMZ: 25-round magazine, fire rate 651 RPM, Apex attachment WZ.55 Striga Rampage.');
  assert.equal(d.filter((x) => x.endsWith(' Source: Activision, Oct 19 2026.')).length, 32);
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
  // Brief 192: the /dmz page reads the full weapon rows and counts / tiles VERIFIED weapons only (lib/dmz/hubData.js).
  const page = src('app/dmz/page.js');
  assert.ok(page.includes('weapons: function () { return fetchDmzWeapons(); },'));
  assert.ok(page.includes('weapons: verifiedWeaponCount(reads.weapons),') && page.includes('weaponClassTiles(reads.weapons, reads.classNames || {}, WEAPONS_HUB.routeBase)'));
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
  // The bench is a JSX child (tested in components/dmz/weaponArmory.test.mjs): stubbed here. Brief 213: the hub-kit
  // components render for real; the harness compiles one file at a time, so each is loaded and bridged through
  // globalThis (as in lib/dmz/bounties.test.mjs).
  for (const c of ['CutCard', 'StatNumeral']) globalThis['__hk_' + c] = (await loadComponent('components/game/' + c + '.js')).default;
  globalThis.__hk_isShownCount = (await loadComponent('components/game/StatNumeral.js')).isShownCount;
  const bridge = (c) => 'export default function ' + c + '(p) { return globalThis.__hk_' + c + '(p); }\n';
  const header = await loadComponent('components/game/HubPageHeader.js', { stubs: { './CutCard': bridge('CutCard'), './StatNumeral': 'export function isShownCount(v) { return globalThis.__hk_isShownCount(v); }\n' + bridge('StatNumeral') } });
  globalThis.__hk_HubPageHeader = header.default;
  globalThis.__hk_HUB_PAGE_CSS = header.HUB_PAGE_CSS;
  // Brief 221: the camo block's Reported chip comes from the network tier module (JSX), bridged the same way.
  const tiers = await loadComponent('components/network/confidenceTiers.js');
  globalThis.__ct_TierIcon = tiers.TierIcon;
  globalThis.__ct_TIERS = tiers.CONFIDENCE_TIERS;
  Detail = (await loadComponent('components/dmz/DmzWeaponDetail.js', { stubs: {
    './WeaponBench.js': "export const NO_BLOCKS_STATED = 'No blocked slots are stated.';\nexport default function WeaponBench() { return 'BENCH_HERE'; }\n",
    '@/components/game/CutCard': bridge('CutCard'),
    '@/components/game/HubPageHeader': bridge('HubPageHeader') + 'export var HUB_PAGE_CSS = globalThis.__hk_HUB_PAGE_CSS;\n',
    '@/components/network/confidenceTiers': 'export var CONFIDENCE_TIERS = globalThis.__ct_TIERS;\nexport function TierIcon(p) { return globalThis.__ct_TierIcon(p); }\n',
  } })).default;
});

// Brief 221: the "Camos (reported)" block (data-camos) carries the tracker's own camo levels; the no-unlock-level
// checks below run on the page with that block removed, and the block gets its own checks.
const CAMO_BLOCK = /<div[^>]*data-camos=""[^>]*>[\s\S]*?<\/div>/;
const noCamos = (h) => h.replace(CAMO_BLOCK, '');

test('detail render: values, flagged unit, ranks label, Apex, note; never an unlock level; unconfirmed banner', () => {
  const html = render(() => Detail({ row: CHARLIE, rows: ALL, className: 'Fixture Pistols' }));
  assert.match(html, /260 \(printed as BPM; unit unconfirmed\)/);
  assert.match(html, /UNCONFIRMED/);
  assert.match(html, /Source: <a href="https:\/\/www\.callofduty\.com\/blog\/2026\/10\//);
  assert.match(html, /Figures are as published in the launch post\./);
  assert.match(html, /Derived from the post&#x27;s figures\./);
  assert.ok(!/Player Level|player level|unlock/i.test(noCamos(html).replace(/<script[\s\S]*?<\/script>/g, '')), 'no unlock level');
  assert.ok(!/>7<|>13<|>5</.test(noCamos(html)), 'stored card/table levels are not rendered');
  // The same checks on a real weapon slug, whose page carries the camo block; the block never says Player Level,
  // confirmed, verified or observed.
  const real = { ...CHARLIE, slug: 'sang-9mm', name: 'SANG 9mm' };
  const r = render(() => Detail({ row: real, rows: [real], className: 'Fixture Pistols' }));
  const block = (r.match(CAMO_BLOCK) || [''])[0];
  assert.ok(block.length > 0, 'camo block present on a real weapon');
  assert.ok(!/Player Level|player level|unlock/i.test(noCamos(r).replace(/<script[\s\S]*?<\/script>/g, '')), 'no unlock level outside the camo block');
  assert.ok(!/>7<|>13<|>5</.test(noCamos(r)), 'stored card/table levels are not rendered outside the camo block');
  assert.ok(!/Player Level/i.test(block), 'camo block: no Player Level');
  assert.ok(!/confirmed|verified|observed/i.test(block.replace(/<[^>]+>/g, ' ')), 'camo block: no confirmed, verified or observed');
  const a = render(() => Detail({ row: { ...ALPHA, verified: true }, rows: ALL, className: 'Fixture Rifles' }));
  assert.ok(!/UNCONFIRMED/.test(a));
  assert.match(a, /Alpha Kit/);
  assert.match(a, /Blocks Optic, Stock and Barrel attachments\./);
  assert.match(a, /BENCH_HERE/, 'the bench renders on a weapon with attachment types');
  // Brief 168: the hero image, its credit and alt text; Confirmed only on a verified row.
  assert.match(a, /src="\/images\/DMZ\/weapons\/alpha-rifle-1024\.webp"/);
  assert.match(a, /alt="Alpha Rifle \(Call of Duty: Modern Warfare 4 weapon image\)"/);
  assert.match(a, /Image: Call of Duty: Modern Warfare 4/);
  assert.match(a, />Confirmed</);
  const b = render(() => Detail({ row: BRAVO, rows: ALL, className: 'Fixture Rifles' }));
  assert.match(b, /No blocked slots are stated\./, 'the Apex card states that no list is stated');
  assert.match(b, /Source note: No blocked slots stated/);
  assert.ok(!/>Confirmed</.test(b), 'no Confirmed tag on an unverified row');
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
