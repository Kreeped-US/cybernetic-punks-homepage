// lib/dmz/entityImage.test.mjs
// Entity hero image helper (Brief 115): base path + widths -> { src, srcSet, sizes, width }; invalid
// bases and missing widths -> null; absolute URL for JSON-LD.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { entityImageSet, validImageBase, imageVariantUrl, absoluteImageUrl } from './entityImage.js';

test('base + widths -> srcSet ascending, src is the largest variant, width is the largest width', () => {
  const s = entityImageSet('/images/DMZ/pois/fixture-place', { widths: [1280, 640] });
  assert.deepEqual(s, {
    src: '/images/DMZ/pois/fixture-place-1280.webp',
    srcSet: '/images/DMZ/pois/fixture-place-640.webp 640w, /images/DMZ/pois/fixture-place-1280.webp 1280w',
    sizes: '1280px',
    width: 1280,
  });
  assert.equal(imageVariantUrl('/a/b', 640), '/a/b-640.webp');
});

test('any widths list: de-duplicated, sorted, non-integers dropped; sizes passed through', () => {
  const s = entityImageSet('/x/y', { widths: [800, 400, 400, 1600.5, -1, 0, '1200', 1200], sizes: '50vw' });
  assert.equal(s.srcSet, '/x/y-400.webp 400w, /x/y-800.webp 800w, /x/y-1200.webp 1200w');
  assert.equal(s.src, '/x/y-1200.webp');
  assert.equal(s.width, 1200);
  assert.equal(s.sizes, '50vw');
  assert.equal(entityImageSet('/x/y', { widths: [500] }).srcSet, '/x/y-500.webp 500w');
});

test('empty or invalid base, or no usable widths -> null', () => {
  const W = { widths: [640, 1280] };
  for (const bad of [null, undefined, '', '   ', 42, {}, ' /a/b', '/a/b ', '/a b', '/a/b.webp', '/a/b.jpg', '/a/b/', '//cdn.example.test/a', 'http://example.test/a', 'images/a', 'javascript:alert(1)']) {
    assert.equal(entityImageSet(bad, W), null, JSON.stringify(bad));
    assert.equal(validImageBase(bad), false, JSON.stringify(bad));
  }
  assert.equal(entityImageSet('/a/b', {}), null);
  assert.equal(entityImageSet('/a/b', { widths: [] }), null);
  assert.equal(entityImageSet('/a/b', { widths: [0, -5, 'x'] }), null);
  assert.equal(entityImageSet('/a/b'), null);
  assert.ok(validImageBase('https://example.test/img/a'));
});

test('absoluteImageUrl: site-relative bases get the origin, https bases are kept', () => {
  assert.equal(absoluteImageUrl('/images/DMZ/pois/x', 1280, 'https://cyberneticpunks.com'), 'https://cyberneticpunks.com/images/DMZ/pois/x-1280.webp');
  assert.equal(absoluteImageUrl('https://example.test/x', 1280, 'https://cyberneticpunks.com'), 'https://example.test/x-1280.webp');
});
