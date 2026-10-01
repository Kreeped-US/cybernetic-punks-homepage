// lib/seo/hubJsonLd.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hubBreadcrumbLd, hubCollectionLd, hubJsonLd } from './hubJsonLd.js';
import { safeJsonLd } from '../security/safeJsonLd.js';

const BASE = 'https://cyberneticpunks.com';

test('breadcrumb: Network -> leaf, leaf has no item (current page)', () => {
  const b = hubBreadcrumbLd({ crumbLeaf: 'Wardogs', path: '/wardogs' });
  assert.equal(b['@type'], 'BreadcrumbList');
  assert.deepEqual(b.itemListElement[0], { '@type': 'ListItem', position: 1, name: 'Network', item: BASE + '/' });
  assert.deepEqual(b.itemListElement[1], { '@type': 'ListItem', position: 2, name: 'Wardogs' });
  assert.equal('item' in b.itemListElement[1], false, 'leaf (current page) carries no item');
});

test('breadcrumb: crumbRoot override', () => {
  const b = hubBreadcrumbLd({ crumbLeaf: 'Marathon', crumbRoot: 'Home' });
  assert.equal(b.itemListElement[0].name, 'Home');
});

test('collection: name/url/description/isPartOf; no mainEntity without sections', () => {
  const c = hubCollectionLd({ name: 'DMZ Hub', path: '/dmz', description: 'd' });
  assert.equal(c['@type'], 'CollectionPage');
  assert.equal(c.name, 'DMZ Hub');
  assert.equal(c.url, BASE + '/dmz');
  assert.equal(c.description, 'd');
  assert.deepEqual(c.isPartOf, { '@type': 'WebSite', name: 'Cybernetic Punks', url: BASE });
  assert.equal('mainEntity' in c, false);
});

test('collection: mainEntity ItemList built from sections, URLs under the hub path', () => {
  const c = hubCollectionLd({ name: 'n', path: '/dmz', description: 'd', sections: [
    { slug: 'regions', label: 'Regions' },
    { slug: 'fob', label: 'FOB' },
    { bad: true }, // dropped (no slug/label)
  ] });
  assert.equal(c.mainEntity['@type'], 'ItemList');
  assert.equal(c.mainEntity.itemListElement.length, 2);
  assert.deepEqual(c.mainEntity.itemListElement[0], { '@type': 'ListItem', position: 1, name: 'Regions', url: BASE + '/dmz/regions' });
  assert.deepEqual(c.mainEntity.itemListElement[1], { '@type': 'ListItem', position: 2, name: 'FOB', url: BASE + '/dmz/fob' });
});

test('hubJsonLd: returns [BreadcrumbList, CollectionPage]', () => {
  const [a, b] = hubJsonLd({ name: 'n', path: '/bodycam', description: 'd', crumbLeaf: 'Bodycam' });
  assert.equal(a['@type'], 'BreadcrumbList');
  assert.equal(b['@type'], 'CollectionPage');
});

test('every emitted block JSON-parses through safeJsonLd (round-trip deep-equal)', () => {
  const blocks = hubJsonLd({ name: 'n', path: '/pubg-dednet', description: 'desc with </script> & <b>', crumbLeaf: 'PUBG: DED.NET', sections: [{ slug: 'systems', label: 'Systems' }] });
  for (const ld of blocks) {
    const out = safeJsonLd(ld);
    assert.equal(out.includes('</script'), false);
    assert.deepEqual(JSON.parse(out), ld);
  }
});
