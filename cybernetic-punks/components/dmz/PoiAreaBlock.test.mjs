// components/dmz/PoiAreaBlock.test.mjs
// Locations block on /dmz/regions with image cards (Brief 119), rendered through the JSX harness with
// obviously-fake rows: an image card renders a decorative lazy img (alt="", srcSet/sizes from the entity
// image config) under a dark text band; image-less cards keep the exact pre-image markup; an invalid image
// base falls back to the image-less card; the credit renders once and only when an image card exists; the
// hover zoom sits only inside prefers-reduced-motion: no-preference.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { loadComponent, render } from '../../lib/games/jsxHarness.test-helper.mjs';
import { DMZ_ENTITIES } from '../../lib/dmz/entities.js';
import { dmz } from '../../lib/games/dmz.js';

let Block;
before(async () => {
  Block = (await loadComponent('components/dmz/PoiAreaBlock.js')).default;
});

const POI = DMZ_ENTITIES.pois;
const CFG = dmz.sections.find((s) => s.slug === 'regions').poiAreas;
const SRC = { source_label: 'Fixture Source', source_url: 'https://example.test/src' };
const row = (slug, name, territory, area, image) => Object.assign({ slug, name, territory, area, verified: true, neighbors: null, image_url: image || null, image_alt: image ? 'Fixture alt' : null }, SRC);
const html = (rows) => render(Block, { cfg: CFG, entity: POI, rows });
const count = (h, re) => (h.match(re) || []).length;

// The image-less card exactly as it rendered before image cards existed (Brief 112 markup; the harness Link
// stub writes href first). A one-off render of main's block confirmed the same bytes.
const PLAIN_CARD = '<li><a href="/dmz/pois/plain" style="display:block;background:var(--bg-card);border:1px solid var(--border);border-left:2px solid var(--green);border-radius:0 3px 3px 0;padding:14px 16px;text-decoration:none"><div style="font-family:Orbitron, monospace;font-size:14px;font-weight:800;color:#fff;margin-bottom:5px">Fixture Plain</div><div style="font-size:12px;color:var(--text-secondary)">Fixture Area</div></a></li>';

test('image card: decorative lazy img with srcSet/sizes from the entity config, width/height, under the dark text band', () => {
  const h = html([row('pic', 'Fixture Pic', 'NK', 'Fixture Area', '/images/x/pic')]);
  const img = h.match(/<img [^>]*>/)[0];
  assert.match(img, /class="dmz-area-card-img"/);
  assert.match(img, /src="\/images\/x\/pic-512\.webp"/);
  assert.match(img, /srcSet="\/images\/x\/pic-512\.webp 512w"/);
  assert.match(img, /sizes="\(max-width: 640px\) calc\(100vw - 40px\), 320px"/);
  assert.match(img, / alt=""/, 'decorative: the card text names the location');
  assert.match(img, /loading="lazy"/);
  assert.match(img, /decoding="async"/);
  assert.match(img, new RegExp('width="' + POI.imageSize.width + '" height="' + POI.imageSize.height + '"'));
  assert.match(img, /object-fit:cover/);
  assert.ok(!h.includes('Fixture alt'), 'the row alt is not used on the decorative card image');
  const card = h.match(/<a [^>]*class="dmz-area-card"[^>]*>[\s\S]*?<\/a>/)[0];
  assert.match(card, /min-height:150px/);
  assert.match(card, /border-left:2px solid var\(--green\)/);
  assert.match(card, /border-radius:0 3px 3px 0/);
  assert.match(card, /background:linear-gradient\(to top, rgba\(7,9,12,0\.9\) 0, rgba\(7,9,12,0\.9\) calc\(100% - 12px\), rgba\(7,9,12,0\) 100%\)/);
  assert.ok(card.indexOf('<img') < card.indexOf('Fixture Pic'), 'text after (above) the image');
  assert.match(card, /color:#fff;margin-bottom:5px">Fixture Pic</);
  assert.match(card, /color:var\(--text-secondary\)">Fixture Area</);
});

test('image-less card: byte-identical to the pre-image markup; no style tag and no credit when no card has an image', () => {
  const h = html([row('plain', 'Fixture Plain', 'NK', 'Fixture Area')]);
  assert.ok(h.includes(PLAIN_CARD), 'card markup unchanged');
  assert.equal(count(h, /<style/g), 0);
  assert.equal(count(h, /<img/g), 0);
  assert.ok(!h.includes(POI.imageCredit));
  assert.ok(!h.includes('target="_blank"'));
});

test('invalid image base falls back to the image-less card (no broken image)', () => {
  for (const bad of ['/images/x/pic.webp', '//cdn.example.test/x', 'images/x', ' /x', 'http://example.test/x']) {
    const h = html([row('plain', 'Fixture Plain', 'NK', 'Fixture Area', bad)]);
    assert.ok(h.includes(PLAIN_CARD), bad);
    assert.equal(count(h, /<img/g), 0, bad);
  }
  const noWidths = render(Block, { cfg: CFG, entity: { ...POI, imageWidths: undefined }, rows: [row('plain', 'Fixture Plain', 'NK', 'Fixture Area', '/images/x/pic')] });
  assert.ok(noWidths.includes(PLAIN_CARD), 'entity without imageWidths -> image-less card');
});

test('credit: once under the block, only when an image card exists, linked in a new tab', () => {
  const mixed = html([row('pic', 'Fixture Pic', 'NK', 'A', '/images/x/pic'), row('pic2', 'Fixture Pic Two', 'SK', 'B', '/images/x/pic2'), row('plain', 'Fixture Plain', 'SK', 'Fixture Area')]);
  assert.equal(count(mixed, new RegExp(POI.imageCredit, 'g')), 1);
  assert.match(mixed, /<p style="margin:0 0 6px;font-size:13px"><a href="https:\/\/www\.callofduty\.com\/guides\/modernwarfare4\/dmz-maps\/hajin" target="_blank" rel="noopener noreferrer" style="color:var\(--green\)">Image: Activision, Call of Duty DMZ Tac Map<\/a><\/p><\/div><\/section>$/);
  assert.ok(mixed.includes(PLAIN_CARD), 'image-less card unchanged next to image cards');
  assert.equal(count(mixed, /<img/g), 2);
});

test('motion: hover zoom only inside prefers-reduced-motion: no-preference; focus-visible outline always', () => {
  const h = html([row('pic', 'Fixture Pic', 'NK', 'A', '/images/x/pic')]);
  const css = h.match(/<style>([\s\S]*?)<\/style>/)[1];
  const at = css.indexOf('@media (prefers-reduced-motion: no-preference){');
  assert.ok(at >= 0, 'reduced-motion guard present');
  const outside = css.slice(0, at);
  assert.ok(!/:hover|transform|transition|animation/.test(outside), 'no hover or motion outside the no-preference block');
  assert.match(outside, /\.dmz-area-card:focus-visible\{outline:2px solid var\(--green\);outline-offset:2px\}/);
  const inside = css.slice(at);
  assert.match(inside, /transition:transform 0\.4s ease/);
  assert.match(inside, /\.dmz-area-card:hover \.dmz-area-card-img,\.dmz-area-card:focus-visible \.dmz-area-card-img\{transform:scale\(1\.04\)\}/);
  assert.ok(!/glow|box-shadow|text-shadow|animation/.test(css));
});
