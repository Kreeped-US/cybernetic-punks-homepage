// components/dmz/DmzEntityHub.test.mjs
// Entity hub image cards (Brief 120), rendered through the JSX harness with obviously-fake rows: a POI row
// with a valid image base gets the shared image card (lib/dmz/imageCard.js) with its three text lines on the
// band; image-less cards and every entity without imageWidths keep the plain card byte for byte; the credit
// renders once and only with an image card; hover motion only under prefers-reduced-motion: no-preference.
import { test, before, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { loadComponent, render } from '../../lib/games/jsxHarness.test-helper.mjs';
import { DMZ_ENTITIES } from '../../lib/dmz/entities.js';
import { IMAGE_CARD_BAND_ALPHA } from '../../lib/dmz/imageCard.js';

const realNow = Date.now;
afterEach(() => { Date.now = realNow; });

let Hub;
before(async () => {
  // Brief 217: the hub is on the hub kit. The harness compiles one file at a time, so the kit components are loaded
  // and bridged through globalThis, as in lib/dmz/bounties.test.mjs.
  for (const c of ['CutCard', 'StatNumeral']) globalThis['__hk_' + c] = (await loadComponent('components/game/' + c + '.js')).default;
  globalThis.__hk_isShownCount = (await loadComponent('components/game/StatNumeral.js')).isShownCount;
  const bridge = (c) => 'export default function ' + c + '(p) { return globalThis.__hk_' + c + '(p); }\n';
  const header = await loadComponent('components/game/HubPageHeader.js', { stubs: { './CutCard': bridge('CutCard'), './StatNumeral': 'export function isShownCount(v) { return globalThis.__hk_isShownCount(v); }\n' + bridge('StatNumeral') } });
  globalThis.__hk_HubPageHeader = header.default;
  globalThis.__hk_HUB_PAGE_CSS = header.HUB_PAGE_CSS;
  Hub = (await loadComponent('components/dmz/DmzEntityHub.js', {
    stubs: {
      'next/headers': 'export async function cookies() { return { get() { return undefined; } }; }\n',
      './DmzNotifyStrip': "export default function DmzNotifyStrip() { return 'NOTIFY_STRIP'; }\n",
      '@/components/game/CutCard': bridge('CutCard'),
      '@/components/game/HubPageHeader': bridge('HubPageHeader') + 'export var HUB_PAGE_CSS = globalThis.__hk_HUB_PAGE_CSS;\n',
    },
  })).default;
});

const POI = DMZ_ENTITIES.pois;
async function html(entity, rows) {
  Date.now = () => Date.parse('2026-11-01T00:00:00Z'); // after launch: no notify strip
  const el = await Hub({ entity, rows });
  return render(() => el);
}
const count = (h, re) => (h.match(re) || []).length;
const poiRow = (slug, name, extra) => Object.assign({ slug, name, area: 'Fixture Area', territory: 'NK', verified: true, source_label: 'Fixture Source', image_url: null, image_alt: null }, extra || {});

// The plain card exactly (the harness Link stub writes href first). Brief 217: a kit cut card; status by class and
// by its text label.
const PLAIN_POI_CARD = '<a href="/dmz/pois/plain" class="hk-cut ehub-card ehub-ok"><div class="ehub-name">Fixture Plain</div><div class="ehub-area">Fixture Area (NK)</div><div class="ehub-st">Pre-release source</div></a>';
// The shared image-card CSS (lib/dmz/imageCard.js) renders only with an image card.
const IMAGE_CSS_MARK = '.dmz-area-card:focus-visible{';

test('POI image card: shared image card, decorative lazy img, min-height 170, three text lines on the band', async () => {
  const h = await html(POI, [poiRow('pic', 'Fixture Pic', { image_url: '/images/x/pic', image_alt: 'Fixture alt' })]);
  const card = h.match(/<a [^>]*class="hk-cut dmz-area-card[^"]*"[^>]*>[\s\S]*?<\/a>/)[0];
  assert.match(card, /^<a [^>]*class="hk-cut dmz-area-card ehub-card ehub-img ehub-ok"/);
  assert.match(h, /\.hk a\.ehub-img\{[^}]*min-height:170px/);
  const img = card.match(/<img [^>]*>/)[0];
  assert.match(img, /class="dmz-area-card-img"/);
  assert.match(img, /src="\/images\/x\/pic-512\.webp"/);
  assert.match(img, /srcSet="\/images\/x\/pic-512\.webp 512w"/);
  assert.match(img, /sizes="\(max-width: 640px\) calc\(100vw - 40px\), 360px"/);
  assert.match(img, / alt=""/);
  assert.match(img, /loading="lazy"/);
  assert.match(img, /decoding="async"/);
  assert.match(img, new RegExp('width="' + POI.imageSize.width + '" height="' + POI.imageSize.height + '"'));
  assert.ok(!h.includes('Fixture alt'));
  assert.equal(IMAGE_CARD_BAND_ALPHA, 0.9);
  const band = card.slice(card.indexOf('<div style="position:relative;padding:26px 16px 14px;background:linear-gradient(to top, rgba(7,9,12,0.9)'));
  assert.ok(band.length > 0, 'text band present');
  assert.ok(band.includes('>Fixture Pic<') && band.includes('>Fixture Area (NK)<') && band.includes('>Pre-release source<'), 'all three lines on the band');
  assert.match(band, /<div class="ehub-st">Pre-release source</, 'status label is text, colored by the card status class');
});

test('unconfirmed image card keeps the amber accent and label', async () => {
  const h = await html(POI, [poiRow('u', 'Fixture Unconfirmed', { verified: false, source_label: null, image_url: '/images/x/u' })]);
  assert.match(h, /class="hk-cut dmz-area-card ehub-card ehub-img ehub-unc"/);
  assert.match(h, /<div class="ehub-st">Unconfirmed</);
  assert.match(h, /\.ehub-unc\{--ehub-acc:#ffb400;--ehub-st:#ffb400\}/);
});

test('image-less cards render byte-identically; no style tag and no credit without an image card', async () => {
  const h = await html(POI, [poiRow('plain', 'Fixture Plain')]);
  assert.ok(h.includes(PLAIN_POI_CARD));
  assert.ok(!h.includes(IMAGE_CSS_MARK));
  assert.equal(count(h, /<img/g), 0);
  assert.ok(!h.includes(POI.imageCredit));
  // Invalid bases fall back to the plain card.
  for (const bad of ['/x/a.webp', '//cdn.example.test/a', 'x/a']) {
    const hb = await html(POI, [poiRow('plain', 'Fixture Plain', { image_url: bad })]);
    assert.ok(hb.includes(PLAIN_POI_CARD), bad);
  }
});

test('entities without imageWidths (keys, missions, items) never render image cards, even with an image_url', async () => {
  for (const key of ['keys', 'missions', 'items']) {
    const e = DMZ_ENTITIES[key];
    assert.equal(e.imageWidths, undefined, key);
    const h = await html(e, [{ slug: 'fx', name: 'Fixture ' + key, verified: true, image_url: '/images/x/fx' }]);
    assert.equal(count(h, /<img/g), 0, key);
    assert.equal(count(h, /dmz-area-card/g), 0, key);
    assert.ok(!h.includes(IMAGE_CSS_MARK), key);
    assert.match(h, new RegExp('<a href="' + e.routeBase + '/fx" class="hk-cut ehub-card ehub-ok">'), key);
  }
});

test('credit: once under the grid, only when an image card exists, linked in a new tab', async () => {
  const h = await html(POI, [poiRow('a', 'Fixture A', { image_url: '/images/x/a' }), poiRow('b', 'Fixture B', { image_url: '/images/x/b' }), poiRow('plain', 'Fixture Plain')]);
  assert.equal(count(h, new RegExp(POI.imageCredit, 'g')), 1);
  assert.match(h, /<\/a><\/div><p class="ehub-credit"><a href="https:\/\/www\.callofduty\.com\/guides\/modernwarfare4\/dmz-maps\/hajin" target="_blank" rel="noopener noreferrer">Image: Activision, Call of Duty DMZ Tac Map<\/a><\/p>/);
  assert.ok(h.includes(PLAIN_POI_CARD), 'plain card unchanged next to image cards');
  assert.equal(count(h, /<img/g), 2);
});

test('motion: hover zoom only inside prefers-reduced-motion: no-preference; focus outline always', async () => {
  const h = await html(POI, [poiRow('pic', 'Fixture Pic', { image_url: '/images/x/pic' })]);
  // The image-card style block (Brief 217: the kit's block renders first; its own hover lift is no-preference only).
  const css = [...h.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((m) => m[1]).find((s) => s.includes(IMAGE_CSS_MARK));
  // On the hub the kit's cut-card ring (drawn inside the clip-path) wins over the image card's own outline.
  assert.ok(h.includes('a.hk-cut:focus-visible{outline:2px solid var(--hk-accent,#ff6a1f);outline-offset:-3px}'));
  const at = css.indexOf('@media (prefers-reduced-motion: no-preference){');
  assert.ok(at >= 0);
  assert.ok(!/:hover|transform|transition|animation/.test(css.slice(0, at)), 'no hover or motion outside the no-preference block');
  assert.match(css.slice(0, at), /\.dmz-area-card:focus-visible\{outline:2px solid var\(--green\);outline-offset:2px\}/);
  assert.match(css.slice(at), /transform:scale\(1\.04\)/);
});
