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
    // No hero style. (The only style tag is the notable-features list CSS, Brief 121; the fixture has features.)
    assert.equal((h.match(/<style>[\s\S]*?<\/style>/g) || []).filter((s) => !s.includes('.dmz-fact-list')).length, 0);
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

test('facts (Brief 121): Type shown capitalised; Notable Features as a full-width list in stored order; JSON-LD unchanged', async () => {
  const features = ['Steel wall; razor wire', 'Second <b>entry</b>', 'Third'];
  const h = await html(POI, { ...BASE_ROW, poi_type: 'district', notable_features: features });
  // Type: display capitalised, JSON-LD keeps the stored value.
  assert.match(h, />Type<\/div><div style="font-size:15px;color:var\(--text-primary\);line-height:1.5">District<\/div>/);
  const place = ld(h).find((x) => x['@type'] === 'WebPage').mainEntity;
  assert.deepEqual(place.additionalProperty.find((p) => p.name === 'Type'), { '@type': 'PropertyValue', name: 'Type', value: 'district' });
  assert.deepEqual(place.additionalProperty.find((p) => p.name === 'Notable Features'), { '@type': 'PropertyValue', name: 'Notable Features', value: 'Steel wall; razor wire; Second <b>entry</b>; Third' });
  // List: one ul, entries in order, text unchanged (escaped, not parsed), card spans the grid.
  const card = h.match(/<div style="[^"]*grid-column:1 \/ -1">[\s\S]*?<\/ul><\/div>/)[0];
  assert.match(card, /^<div style="background:var\(--bg-card\);border:1px solid var\(--border\);border-radius:3px;padding:14px 16px;grid-column:1 \/ -1">/);
  assert.match(card, />Notable Features<\/div><ul class="dmz-fact-list" style="margin:0;padding-left:18px;font-size:15px;color:var\(--text-primary\);line-height:1.5">/);
  const items = [...card.matchAll(/<li style="margin:0 0 4px">([\s\S]*?)<\/li>/g)].map((m) => m[1]);
  assert.deepEqual(items, ['Steel wall; razor wire', 'Second &lt;b&gt;entry&lt;/b&gt;', 'Third']);
  // Columns: 2 from 720px, entries never split; the style tag appears once.
  assert.equal(count(h, /\.dmz-fact-list li\{break-inside:avoid\}@media \(min-width:720px\)\{\.dmz-fact-list\{columns:2;column-gap:28px\}\}/g), 1);
  // Facts without a list keep the exact card markup.
  assert.match(h, /<div style="background:var\(--bg-card\);border:1px solid var\(--border\);border-radius:3px;padding:14px 16px"><div style="font-size:9px;[^"]*">Location<\/div><div style="font-size:15px;color:var\(--text-primary\);line-height:1.5">Fixture Area<\/div><\/div>/);
});

test('facts without a list render no list CSS; a non-plain Type is shown as stored', async () => {
  const h = await html(POI, { ...BASE_ROW, poi_type: 'City Hall', notable_features: [] });
  assert.equal(count(h, /dmz-fact-list/g), 0);
  assert.equal(count(h, /<ul/g), 0);
  assert.match(h, />Type<\/div><div style="font-size:15px;color:var\(--text-primary\);line-height:1.5">City Hall<\/div>/);
});

test('source line: 12px --text-secondary (was 11px --text-tertiary), both forms; link colour kept', async () => {
  const sourced = await html(POI, BASE_ROW);
  assert.match(sourced, /<div style="font-size:12px;color:var\(--text-secondary\);margin-top:6px;line-height:1.5">Source: per <a href="https:\/\/example\.test\/src" rel="noopener" style="color:var\(--green\)">Fixture Source Label<\/a><\/div>/);
  const plain = await html(DMZ_ENTITIES.keys, { slug: 'k', name: 'Fixture Key', verified: true, verified_source: 'owner in-game check', updated_at: '2026-10-06T00:00:00Z' });
  assert.match(plain, /<div style="font-size:12px;color:var\(--text-secondary\);margin-top:6px;line-height:1.5">Source: owner in-game check<\/div>/);
  for (const h of [sourced, plain]) assert.ok(!h.includes('font-size:11px;color:var(--text-tertiary);margin-top:6px'), 'old source-line style gone');
  // The eyebrow label keeps its own style.
  assert.match(plain, /<div style="font-size:10px;color:var\(--text-tertiary\);letter-spacing:3px;font-weight:700;margin-bottom:6px;font-family:monospace;text-transform:uppercase">DMZ <!-- -->Key<\/div>|<div style="font-size:10px;color:var\(--text-tertiary\);letter-spacing:3px;font-weight:700;margin-bottom:6px;font-family:monospace;text-transform:uppercase">DMZ Key<\/div>/);
});

// -- "Located in" (Brief 129): rows whose stored area ends with this row's name --
async function htmlWith(entity, row, props) {
  Date.now = () => Date.parse('2026-11-01T00:00:00Z');
  const el = await Detail({ entity, row, siblings: [], related: [], ...props });
  return render(() => el);
}
const MEMBERS = [
  { slug: 'fixture-member-a', name: 'Fixture Member A', area: 'North Fixture Place', verified: true },
  { slug: 'fixture-member-b', name: 'Fixture Member B', area: 'South Central Fixture Place', verified: true },
];

test('Located in: heading from the row name, one card per member with a link to its page and its stored area verbatim', async () => {
  const h = await htmlWith(POI, BASE_ROW, { contained: MEMBERS });
  assert.equal(count(h, /<h2[^>]*>Located in Fixture Place<\/h2>/g), 1);
  const sec = h.slice(h.indexOf('>Located in Fixture Place</h2>'), h.indexOf('</ul>', h.indexOf('>Located in Fixture Place</h2>')));
  for (const m of MEMBERS) {
    assert.ok(sec.includes('<a href="' + POI.routeBase + '/' + m.slug + '"'), 'link to ' + m.slug);
    assert.ok(sec.includes('>' + m.name + '</a>'), 'link text is the member name');
    assert.ok(sec.includes('>' + m.area + '</div>'), 'secondary text is the stored area');
  }
  assert.ok(sec.indexOf('Fixture Member A') < sec.indexOf('Fixture Member B'), 'given order kept');
  // Same card styles as Named places; no new colours, no threat or territory colouring.
  assert.equal(count(sec, /<li style="background:var\(--bg-card\);border:1px solid var\(--border\);border-radius:3px;padding:10px 14px">/g), 2);
  assert.ok(!/--green|--red|--amber|--accent|#[0-9a-f]{6}/i.test(sec), 'no new colour tokens');
  // JSON-LD unchanged by the section.
  assert.deepEqual(ld(h), ld(await htmlWith(POI, BASE_ROW, {})));
});

test('Located in: absent when there are no members; [] and a missing prop render byte-identically', async () => {
  const none = await htmlWith(POI, BASE_ROW, {});
  const empty = await htmlWith(POI, BASE_ROW, { contained: [] });
  assert.equal(empty, none, 'POI with no members: byte-identical');
  assert.ok(!none.includes('Located in'));
  for (const key of ['keys', 'missions', 'items']) {
    const r = { slug: 'fx', name: 'Fixture ' + key, verified: true, verified_source: 'fixture', updated_at: '2026-10-06T00:00:00Z' };
    assert.equal(await htmlWith(DMZ_ENTITIES[key], r, { contained: [] }), await htmlWith(DMZ_ENTITIES[key], r, {}), key + ': byte-identical');
  }
});

test('Located in: the template block carries no place or game literal (heading built from the row name)', async () => {
  const { readFileSync } = await import('node:fs');
  const src = readFileSync(new URL('./DmzEntityDetail.js', import.meta.url), 'utf8');
  const block = src.slice(src.indexOf('{contained && contained.length > 0 && ('), src.indexOf('{pageNote && ('));
  assert.ok(block.length > 0);
  const literals = (block.split(/\r?\n/).filter((l) => !/^\s*(\{\/\*|\/\/)/.test(l) && !/\*\/\}\s*$/.test(l)).join('\n').match(/'[^'\n]*'/g) || []).map((s) => s.slice(1, -1));
  const ALLOWED = new Set(['Located in ', '/', '0 0 10px', 'none', 'grid', 'var(--bg-card)', '1px solid var(--border)', '10px 14px', '#fff', 'var(--text-secondary)']);
  for (const s of literals) assert.ok(ALLOWED.has(s), 'unexpected literal in the Located in block: ' + JSON.stringify(s));
});

// -- Route (Brief 129 revision): members under "Located in" are not repeated under "Nearby locations" --
const ROUTE_STUBS = {
  'next/navigation': 'export function notFound() { throw new Error("notFound"); }\nexport function permanentRedirect(p) { throw new Error("redirect " + p); }\n',
  '@/lib/dmz/entities': [
    'export function getDmzEntity() { return globalThis.__ROUTE_ENTITY; }',
    'export async function fetchDmzRows() { return globalThis.__ROUTE_ROWS; }',
    'export function poiLegacyTarget() { return null; }',
    'export function visiblePoiRows(rows) { return rows; }',
  ].join('\n') + '\n',
  '@/components/dmz/DmzEntityDetail': 'export default function DmzEntityDetailStub() { return null; }\n',
};
let Route;
before(async () => {
  Route = (await loadComponent('app/dmz/pois/[slug]/page.js', { stubs: ROUTE_STUBS })).default;
});
const place = (slug, name, area, neighbors) => ({ slug, name, area, neighbors: neighbors || [], verified: true, game_slug: 'game-a' });
const ROUTE_ROWS = [
  place('fixture-district', 'Fixture District', null, ['member-one', 'member-two', 'outside-spot']),
  place('member-one', 'Member One', 'North Fixture District', ['fixture-district']),
  place('member-two', 'Member Two', 'South Fixture District'),
  place('outside-spot', 'Outside Spot', 'Far Fixture Plains', ['member-one']),
  place('enclosed-hub', 'Enclosed Hub', null, ['enclosed-member']),
  place('enclosed-member', 'Enclosed Member', 'Central Enclosed Hub'),
];
async function routeProps(slug) {
  globalThis.__ROUTE_ENTITY = POI;
  globalThis.__ROUTE_ROWS = ROUTE_ROWS;
  const el = await Route({ params: Promise.resolve({ slug }) });
  return el.props;
}

test('route: a container drops its members from related; a non-member neighbour stays', async () => {
  const p = await routeProps('fixture-district');
  assert.deepEqual(p.contained.map((r) => r.slug), ['member-one', 'member-two']);
  assert.deepEqual(p.related.map((r) => r.slug), ['outside-spot']);
});

test('route: no members -> related passes through unchanged (order kept)', async () => {
  const p = await routeProps('outside-spot');
  assert.deepEqual(p.contained, []);
  assert.deepEqual(p.related.map((r) => r.slug), ['member-one']);
  const m = await routeProps('member-one');
  assert.deepEqual(m.contained, []);
  assert.deepEqual(m.related.map((r) => r.slug), ['fixture-district'], 'a member page still lists its container as nearby');
});

test('route + template: a container whose related becomes empty renders no Nearby heading', async () => {
  const p = await routeProps('enclosed-hub');
  assert.deepEqual(p.contained.map((r) => r.slug), ['enclosed-member']);
  assert.deepEqual(p.related, []);
  const h = await htmlWith(POI, { ...BASE_ROW, slug: 'enclosed-hub', name: 'Enclosed Hub' }, { related: p.related, contained: p.contained });
  assert.ok(h.includes('>Located in Enclosed Hub</h2>'));
  assert.ok(!h.includes('Nearby locations'), 'no empty Nearby heading');
});
