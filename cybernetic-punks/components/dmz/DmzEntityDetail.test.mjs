// components/dmz/DmzEntityDetail.test.mjs
// Entity detail hero (Brief 115), rendered through the JSX harness with obviously-fake rows: rows without
// an image keep the pre-hero markup; a row with an image base renders one figure (srcSet, sizes, explicit
// width/height, fetchPriority, the shared scrim, the header over the image, the credit) with ONE H1; the
// JSON-LD Place gains "image" only then; a missing image_alt does not crash; keys/missions/items unchanged.
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

test('with an image base: one figure, img attributes from the helper and config, header over the image, credit, one H1', async () => {
  const h = await html(POI, { ...BASE_ROW, image_url: '/images/DMZ/pois/fixture-place', image_alt: 'Fixture alt text' });
  assert.equal(count(h, /<figure/g), 1);
  assert.equal(count(h, /<h1/g), 1, 'the H1 is not duplicated');
  const img = h.match(/<img [^>]*>/)[0];
  assert.match(img, /src="\/images\/DMZ\/pois\/fixture-place-1280\.webp"/);
  assert.match(img, /srcSet="\/images\/DMZ\/pois\/fixture-place-640\.webp 640w, \/images\/DMZ\/pois\/fixture-place-1280\.webp 1280w"/);
  assert.match(img, /sizes="\(max-width: 1000px\) calc\(100vw - 40px\), 960px"/);
  assert.match(img, /alt="Fixture alt text"/);
  assert.match(img, new RegExp('width="' + POI.imageSize.width + '"'));
  assert.match(img, new RegExp('height="' + POI.imageSize.height + '"'));
  assert.match(img, /fetchPriority="high"/);
  assert.match(img, /decoding="async"/);
  // Figure capped at the largest variant width; frame class + CSS; scrim; H1 and badge INSIDE the figure.
  const fig = h.slice(h.indexOf('<figure'), h.indexOf('</figure>') + 9);
  assert.match(fig, /^<figure style="max-width:1280px;margin:0 auto 26px">/);
  assert.match(fig, /class="dmz-entity-hero-frame"/);
  assert.match(fig, /aspect-ratio:16\/7/);
  assert.match(fig, /linear-gradient\(0deg/);
  assert.ok(fig.includes('<h1') && fig.includes('Pre-release source'), 'header sits over the image');
  assert.match(fig, /<figcaption[^>]*>In-game screenshot, Cybernetic Punks<\/figcaption>/);
  assert.equal(POI.imageCredit, 'In-game screenshot, Cybernetic Punks');
  assert.ok(h.indexOf('</figure>') < h.indexOf('>Fixture description text.</p>'), 'description follows the hero');
  const place = ld(h).find((x) => x['@type'] === 'WebPage').mainEntity;
  assert.equal(place.image, 'https://cyberneticpunks.com/images/DMZ/pois/fixture-place-1280.webp');
});

test('the hero is never wider than the largest variant; a narrow largest variant is centered and sized to it', async () => {
  const narrow = { ...POI, imageWidths: [320, 480], imageSize: { width: 480, height: 270 } };
  const h = await html(narrow, { ...BASE_ROW, image_url: '/x/narrow', image_alt: 'Narrow' });
  assert.match(h, /<figure style="max-width:480px;margin:0 auto 26px">/);
  assert.match(h, /sizes="\(max-width: 520px\) calc\(100vw - 40px\), 480px"/);
  assert.match(h, /width="480" height="270"/);
  assert.match(h, /src="\/x\/narrow-480\.webp"/);
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
