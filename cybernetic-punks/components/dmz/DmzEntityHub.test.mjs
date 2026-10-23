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
  Hub = (await loadComponent('components/dmz/DmzEntityHub.js', {
    stubs: {
      'next/headers': 'export async function cookies() { return { get() { return undefined; } }; }\n',
      './DmzNotifyStrip': "export default function DmzNotifyStrip() { return 'NOTIFY_STRIP'; }\n",
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

// The plain card exactly as it rendered before image cards (the harness Link stub writes href first).
const PLAIN_POI_CARD = '<a href="/dmz/pois/plain" style="display:block;background:var(--bg-card);border:1px solid var(--border);border-left:2px solid var(--green);border-radius:0 3px 3px 0;padding:14px 16px;text-decoration:none"><div style="font-family:Orbitron, monospace;font-size:14px;font-weight:800;color:#fff;margin-bottom:5px">Fixture Plain</div><div style="font-size:12px;color:var(--text-secondary);margin-bottom:5px">Fixture Area (NK)</div><div style="font-size:9px;letter-spacing:1.5px;font-weight:700;text-transform:uppercase;font-family:monospace;color:var(--green)">Pre-release source</div></a>';

test('POI image card: shared image card, decorative lazy img, min-height 170, three text lines on the band', async () => {
  const h = await html(POI, [poiRow('pic', 'Fixture Pic', { image_url: '/images/x/pic', image_alt: 'Fixture alt' })]);
  const card = h.match(/<a [^>]*class="dmz-area-card"[^>]*>[\s\S]*?<\/a>/)[0];
  assert.match(card, /min-height:170px/);
  assert.match(card, /border-left:2px solid var\(--green\)/);
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
  assert.match(band, /color:var\(--green\)">Pre-release source</, 'status label keeps its colour');
});

test('unconfirmed image card keeps the amber accent and label', async () => {
  const h = await html(POI, [poiRow('u', 'Fixture Unconfirmed', { verified: false, source_label: null, image_url: '/images/x/u' })]);
  assert.match(h, /class="dmz-area-card" style="[^"]*border-left:2px solid #ffb400/);
  assert.match(h, /color:#ffb400">Unconfirmed</);
});

test('image-less cards render byte-identically; no style tag and no credit without an image card', async () => {
  const h = await html(POI, [poiRow('plain', 'Fixture Plain')]);
  assert.ok(h.includes(PLAIN_POI_CARD));
  assert.equal(count(h, /<style/g), 0);
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
    assert.equal(count(h, /<style/g), 0, key);
    assert.match(h, new RegExp('<a href="' + e.routeBase + '/fx" style="display:block;'), key);
  }
});

test('credit: once under the grid, only when an image card exists, linked in a new tab', async () => {
  const h = await html(POI, [poiRow('a', 'Fixture A', { image_url: '/images/x/a' }), poiRow('b', 'Fixture B', { image_url: '/images/x/b' }), poiRow('plain', 'Fixture Plain')]);
  assert.equal(count(h, new RegExp(POI.imageCredit, 'g')), 1);
  assert.match(h, /<\/a><\/div><p style="margin:12px 0 0;font-size:13px;line-height:1.6"><a href="https:\/\/www\.callofduty\.com\/guides\/modernwarfare4\/dmz-maps\/hajin" target="_blank" rel="noopener noreferrer" style="color:var\(--green\)">Image: Activision, Call of Duty DMZ Tac Map<\/a><\/p>/);
  assert.ok(h.includes(PLAIN_POI_CARD), 'plain card unchanged next to image cards');
  assert.equal(count(h, /<img/g), 2);
});

test('motion: hover zoom only inside prefers-reduced-motion: no-preference; focus outline always', async () => {
  const h = await html(POI, [poiRow('pic', 'Fixture Pic', { image_url: '/images/x/pic' })]);
  const css = h.match(/<style>([\s\S]*?)<\/style>/)[1];
  const at = css.indexOf('@media (prefers-reduced-motion: no-preference){');
  assert.ok(at >= 0);
  assert.ok(!/:hover|transform|transition|animation/.test(css.slice(0, at)), 'no hover or motion outside the no-preference block');
  assert.match(css.slice(0, at), /\.dmz-area-card:focus-visible\{outline:2px solid var\(--green\);outline-offset:2px\}/);
  assert.match(css.slice(at), /transform:scale\(1\.04\)/);
});
