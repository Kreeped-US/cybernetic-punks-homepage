// components/dmz/DmzEntityDetail.test.mjs
// Entity detail hero (Briefs 115 and 117), rendered through the JSX harness with obviously-fake rows: rows
// without an image keep the pre-hero markup; a row with an image base renders one figure (srcSet, sizes,
// explicit width/height, the config ratio, fetchPriority, the credit) with the header beside or below it in
// its normal styles and ONE H1; the figure is never wider than the largest variant; the JSON-LD Place gains
// "image" only then; a missing image_alt does not crash; keys/missions/items unchanged.
import { test, before, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { loadComponent, render } from '../../lib/games/jsxHarness.test-helper.mjs';
import { DMZ_ENTITIES } from '../../lib/dmz/entities.js';

const realNow = Date.now;
afterEach(() => { Date.now = realNow; });

let Detail;
before(async () => {
  Detail = (await loadComponent('components/dmz/DmzEntityDetail.js', {
    stubs: {
      'next/headers': 'export async function cookies() { return { get() { return undefined; } }; }\n',
      './DmzNotifyStrip': "export default function DmzNotifyStrip() { return 'NOTIFY_STRIP'; }\n",
    },
  })).default;
});

const POI = DMZ_ENTITIES.pois;
const BASE_ROW = {
  slug: 'fixture-place', name: 'Fixture Place', description: 'Fixture description text.', poi_type: 'zone',
  area: 'Fixture Area', territory: 'NK', notable_features: ['Fixture feature'], verified: true,
  verified_source: 'fixture source', source_label: 'Fixture Source Label', source_url: 'https://example.test/src',
  threat_levels: [{ name: 'Fixture Zone', level: 'Low' }], sub_locations: null, neighbors: null,
  image_url: null, image_alt: null, updated_at: '2026-10-06T17:07:44Z',
};

async function html(entity, row) {
  Date.now = () => Date.parse('2026-11-01T00:00:00Z'); // after launch: no notify strip
  const el = await Detail({ entity, row, siblings: [], related: [] });
  return render(() => el);
}
const ld = (h) => [...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
const count = (h, re) => (h.match(re) || []).length;

test('no image: pre-hero markup (no figure, no style, no srcset), one H1 in normal flow, no JSON-LD image', async () => {
  for (const row of [BASE_ROW, { ...BASE_ROW, image_url: '' }, { ...BASE_ROW, image_url: '/bad/path.webp', image_alt: 'x' }]) {
    const h = await html(POI, row);
    assert.equal(count(h, /<figure/g), 0);
    assert.equal(count(h, /<style/g), 0);
    assert.equal(count(h, /srcSet|srcset/g), 0);
    assert.equal(count(h, /<img/g), 0);
    assert.ok(!h.includes('dmz-entity-hero'));
    assert.ok(!h.includes(POI.imageCredit));
    assert.equal(count(h, /<h1/g), 1);
    // Order unchanged: type label, H1, source badge, description.
    const i = (s) => h.indexOf(s);
    assert.ok(i('>DMZ Location<') > 0 && i('>DMZ Location<') < i('<h1') && i('<h1') < i('Pre-release source') && i('Pre-release source') < i('>Fixture description text.</p>'));
    const place = ld(h).find((x) => x['@type'] === 'WebPage').mainEntity;
    assert.equal(place.image, undefined);
  }
});

test('with an image base: figure beside/above the header, img attributes from the helper and config, header styled as without an image, credit, one H1', async () => {
  const withImg = await html(POI, { ...BASE_ROW, image_url: '/images/DMZ/pois/fixture-place', image_alt: 'Fixture alt text' });
  const noImg = await html(POI, BASE_ROW);
  const h = withImg;
  assert.equal(count(h, /<figure/g), 1);
  assert.equal(count(h, /<h1/g), 1, 'the H1 is not duplicated');
  const img = h.match(/<img [^>]*>/)[0];
  assert.match(img, /src="\/images\/DMZ\/pois\/fixture-place-512\.webp"/);
  assert.match(img, /srcSet="\/images\/DMZ\/pois\/fixture-place-512\.webp 512w"/);
  assert.match(img, /sizes="\(max-width: 552px\) calc\(100vw - 40px\), 512px"/);
  assert.match(img, /alt="Fixture alt text"/);
  assert.match(img, new RegExp('width="' + POI.imageSize.width + '" height="' + POI.imageSize.height + '"'));
  assert.match(img, /fetchPriority="high"/);
  assert.match(img, /decoding="async"/);
  assert.match(img, /object-fit:cover/);
  // Frame: the config imageSize ratio; no scrim, no fixed 16:7 or 4:3 ratio, no text over the image.
  const hero = h.slice(h.indexOf('<div class="dmz-entity-hero"'), h.indexOf('>Fixture description text.</p>'));
  const fig = hero.slice(hero.indexOf('<figure'), hero.indexOf('</figure>') + 9);
  assert.match(fig, new RegExp('aspect-ratio:' + POI.imageSize.width + ' / ' + POI.imageSize.height));
  assert.ok(!/linear-gradient|16\/7|4\/3/.test(hero), 'no scrim and no fixed crop ratio');
  assert.ok(!fig.includes('<h1') && !fig.includes('Pre-release source'), 'no header text inside the figure');
  // Layout: stacked below 720px; from 720px a grid whose image column is capped at the image width.
  assert.match(hero, /@media \(min-width:720px\)\{\.dmz-entity-hero\{display:grid;grid-template-columns:minmax\(0,512px\) 1fr;gap:24px;align-items:end\}/);
  assert.ok(hero.indexOf('</figure>') < hero.indexOf('<div class="dmz-entity-hero-header">'), 'header after the figure in the DOM');
  // The header markup is byte-identical to the image-less render (same elements, styles and colours).
  const headerOf = (x) => x.slice(x.indexOf('<div style="font-size:10px;color:var(--text-tertiary);letter-spacing:3px'), x.indexOf('<p style="font-size:16px'));
  const plainHeader = headerOf(noImg);
  assert.ok(plainHeader.length > 100);
  assert.ok(hero.includes(plainHeader.replace(/\s+$/, '')), 'same header markup as without an image');
  // Credit links to the source when imageCreditUrl is set (new tab, noopener noreferrer).
  assert.equal(POI.imageCredit, 'Image: Activision, Call of Duty DMZ Tac Map');
  assert.equal(POI.imageCreditUrl, 'https://www.callofduty.com/guides/modernwarfare4/dmz-maps/hajin');
  assert.match(fig, /<figcaption[^>]*><a href="https:\/\/www\.callofduty\.com\/guides\/modernwarfare4\/dmz-maps\/hajin" target="_blank" rel="noopener noreferrer"[^>]*>Image: Activision, Call of Duty DMZ Tac Map<\/a><\/figcaption>/);
  assert.ok(!/In-game screenshot|Cybernetic Punks/.test(fig.slice(fig.indexOf('<figcaption'))), 'no claim that the image is our own screenshot');
  assert.ok(h.indexOf('</figure>') < h.indexOf('>Fixture description text.</p>'), 'description follows the hero');
  const place = ld(h).find((x) => x['@type'] === 'WebPage').mainEntity;
  assert.equal(place.image, 'https://cyberneticpunks.com/images/DMZ/pois/fixture-place-512.webp');
});

test('credit without imageCreditUrl stays plain text (no link)', async () => {
  const plain = { ...POI, imageCreditUrl: undefined };
  const h = await html(plain, { ...BASE_ROW, image_url: '/images/DMZ/pois/fixture-place', image_alt: 'Fixture alt text' });
  const cap = h.match(/<figcaption[^>]*>[\s\S]*?<\/figcaption>/)[0];
  assert.match(cap, />Image: Activision, Call of Duty DMZ Tac Map<\/figcaption>$/);
  assert.ok(!cap.includes('<a '), 'no link without imageCreditUrl');
});

test('the frame is never wider than the largest variant at any viewport: figure max-width = largest width, grid column capped at it', async () => {
  for (const [widths, size] of [[[512], { width: 512, height: 283 }], [[320, 480], { width: 480, height: 270 }], [[640, 1280], { width: 1280, height: 720 }]]) {
    const e = { ...POI, imageWidths: widths, imageSize: size };
    const largest = Math.max(...widths);
    const h = await html(e, { ...BASE_ROW, image_url: '/x/img', image_alt: 'Img' });
    // The cap is an inline style on the figure (applies at every viewport); no CSS rule overrides it.
    assert.match(h, new RegExp('<figure style="max-width:' + largest + 'px;margin:0">'));
    const css = h.match(/<style>([\s\S]*?)<\/style>/)[1];
    assert.ok(!/max-width\s*:/.test(css.replace(/@media \(min-width:720px\)/, '')), 'no CSS rule changes the figure max-width');
    assert.match(css, new RegExp('minmax\\(0,' + Math.min(largest, size.width) + 'px\\)'));
    assert.match(h, new RegExp('src="/x/img-' + largest + '\\.webp"'));
    assert.match(h, new RegExp('width="' + size.width + '" height="' + size.height + '"'));
    const cap = Math.min(largest, 960);
    assert.match(h, new RegExp('sizes="\\(max-width: ' + (cap + 40) + 'px\\) calc\\(100vw - 40px\\), ' + cap + 'px"'));
  }
});

test('image_alt missing while image_url is set: renders with alt="" and does not crash', async () => {
  const h = await html(POI, { ...BASE_ROW, image_url: '/images/DMZ/pois/fixture-place', image_alt: null });
  assert.match(h.match(/<img [^>]*>/)[0], /alt=""/);
  assert.equal(count(h, /<h1/g), 1);
});

test('keys/missions/items: no image config, so even an image_url never renders a hero', async () => {
  for (const key of ['keys', 'missions', 'items']) {
    const e = DMZ_ENTITIES[key];
    assert.equal(e.imageWidths, undefined, key);
    const h = await html(e, { slug: 'fx', name: 'Fixture ' + key, verified: true, verified_source: 'fixture', image_url: '/images/x/fx', image_alt: 'x', updated_at: '2026-10-06T00:00:00Z' });
    assert.equal(count(h, /<figure/g), 0, key);
    assert.equal(count(h, /<img/g), 0, key);
    assert.equal(count(h, /<h1/g), 1, key);
  }
});
