// lib/dmz/ogImage.test.mjs
// Brief 216: the five DMZ routes that set their own openGraph/twitter objects without an opengraph-image file
// (weapon detail, POI detail, weapons hub, keys hub, Boss Board) list the generic DMZ card explicitly. Each page's
// generated metadata is read with its data reads stubbed: openGraph and twitter carry exactly DMZ_OG_IMAGE (absolute
// URL on the canonical origin, 1200x630, PNG, the card's own alt), and no weapon, POI or boss name is in the alt.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DMZ_OG_IMAGE } from './ogImage.js';
import { loadComponent } from '../games/jsxHarness.test-helper.mjs';

const NULL_COMPONENT = (name) => 'export default function ' + name + '() { return null; }\n';
const NAV = 'export function notFound() { throw new Error("notFound"); }\nexport function permanentRedirect() { throw new Error("redirect"); }\n';
const WEAPON = { slug: 'han-86', name: 'Han 86', class_slug: 'assault-rifles', verified: true };
const POI = { slug: 'deadtown', name: 'Deadtown', verified: true };
const NAMES = ['Han 86', 'Deadtown', 'Colossus', 'Deathstalker', 'Tank', 'Lieutenant'];

test('the constant: the generic DMZ card route, absolute, 1200x630 PNG, alt equal to the card route\'s own alt', () => {
  assert.deepEqual(DMZ_OG_IMAGE, { url: 'https://cyberneticpunks.com/dmz/opengraph-image', width: 1200, height: 630, type: 'image/png', alt: DMZ_OG_IMAGE.alt });
  const route = readFileSync('app/dmz/opengraph-image.js', 'utf8');
  assert.ok(route.includes("export const alt = '" + DMZ_OG_IMAGE.alt + "';"), 'alt matches app/dmz/opengraph-image.js');
  assert.ok(route.includes('export const size = { width: 1200, height: 630 };') && route.includes("export const contentType = 'image/png';"));
});

async function metadataOf(file, stubs, params) {
  const mod = await loadComponent(file, { stubs });
  if (mod.metadata) return mod.metadata;
  return mod.generateMetadata(params ? { params: Promise.resolve(params) } : undefined);
}

const CASES = [
  ['app/dmz/weapons/[slug]/page.js', {
    '@/lib/dmz/weaponsData': 'export async function fetchDmzWeapon() { return ' + JSON.stringify(WEAPON) + '; }\nexport async function fetchDmzWeapons() { return [' + JSON.stringify(WEAPON) + ']; }\nexport async function fetchDmzWeaponClassNames() { return { "assault-rifles": "Assault Rifles" }; }\n',
    '@/components/dmz/DmzWeaponDetail': NULL_COMPONENT('DmzWeaponDetail'),
    'next/navigation': NAV,
  }, { slug: 'han-86' }],
  ['app/dmz/pois/[slug]/page.js', {
    '@/lib/dmz/entities': 'export function getDmzEntity() { return { singular: "Location", routeBase: "/dmz/pois", detailTitle: (r) => "DMZ " + r.name, detailDesc: (r) => r.name + " in DMZ." }; }\nexport async function fetchDmzRows() { return [' + JSON.stringify(POI) + ']; }\nexport function poiLegacyTarget() { return null; }\nexport function visiblePoiRows(rows) { return rows; }\n',
    '@/lib/dmz/containedPlaces': 'export function containedPlaces() { return []; }\n',
    '@/lib/games/entityDepth': 'export function entityDetailIndexable() { return true; }\n',
    '@/components/dmz/DmzEntityDetail': NULL_COMPONENT('DmzEntityDetail'),
    'next/navigation': NAV,
  }, { slug: 'deadtown' }],
  ['app/dmz/weapons/page.js', {
    '@/lib/dmz/weaponsData': 'export async function fetchDmzWeapons() { return [' + JSON.stringify(WEAPON) + ']; }\nexport async function fetchDmzWeaponClassNames() { return {}; }\n',
    '@/components/dmz/DmzWeaponsTable': NULL_COMPONENT('DmzWeaponsTable'),
    '@/components/dmz/WeaponArmory': NULL_COMPONENT('WeaponArmory'),
    '@/components/game/HubPageHeader': NULL_COMPONENT('HubPageHeader') + 'export var HUB_PAGE_CSS = "";\n',
  }],
  ['app/dmz/keys/page.js', {
    '@/lib/dmz/entities': 'export function getDmzEntity() { return { routeBase: "/dmz/keys", hubTitle: "DMZ Keys", hubDesc: "Keys." }; }\nexport async function fetchDmzRows() { return []; }\n',
    '@/components/dmz/DmzEntityHub': NULL_COMPONENT('DmzEntityHub'),
  }],
  ['app/dmz/bosses/page.js', {
    './DossierController': NULL_COMPONENT('DossierController'),
    '@/components/game/CutCard': NULL_COMPONENT('CutCard'),
    '@/components/game/HubPageHeader': NULL_COMPONENT('HubPageHeader') + 'export var HUB_PAGE_CSS = "";\n',
  }],
];

for (const [file, stubs, params] of CASES) {
  test('og and twitter images: ' + file, async () => {
    const md = await metadataOf(file, stubs, params);
    assert.deepEqual(md.openGraph.images, [DMZ_OG_IMAGE], 'openGraph.images');
    assert.deepEqual(md.twitter.images, [DMZ_OG_IMAGE], 'twitter.images');
    assert.equal(md.twitter.card, 'summary_large_image');
    for (const img of [md.openGraph.images[0], md.twitter.images[0]]) {
      assert.match(img.url, /^https:\/\/cyberneticpunks\.com\//, 'absolute, canonical origin');
      assert.ok(img.width === 1200 && img.height === 630);
      for (const n of NAMES) assert.ok(!img.alt.includes(n), 'a page name in the image alt: ' + n);
    }
    // The rest of the page's own openGraph/twitter objects is unchanged in shape.
    assert.deepEqual(Object.keys(md.openGraph), ['title', 'description', 'url', 'siteName', 'type', 'images']);
    assert.deepEqual(Object.keys(md.twitter), ['card', 'site', 'title', 'description', 'images']);
  });
}
