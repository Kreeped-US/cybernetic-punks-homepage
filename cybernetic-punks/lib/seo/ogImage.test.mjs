// lib/seo/ogImage.test.mjs
// Guards the shared OG-image helper: openGraph.images + twitter.images are ALWAYS present (per-game
// hero where one exists, else network default), existing images are preserved, and nothing else in
// the metadata is touched. Run: node --test lib/seo/ogImage.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withOgImages, ogImageFor, NETWORK_OG_IMAGE } from './ogImage.js';

test('ogImageFor: per-game hero where one exists, network default otherwise', () => {
  assert.equal(ogImageFor('wardogs'), '/images/games/wardogs-hero.jpg');
  assert.equal(ogImageFor('dmz'), '/images/games/dmz-hero.jpg');
  assert.equal(ogImageFor('pubg-dednet'), '/images/games/pubg-dednet-hero.jpg');
  assert.equal(ogImageFor(), NETWORK_OG_IMAGE);
  assert.equal(ogImageFor('nonsense'), NETWORK_OG_IMAGE);
  assert.equal(ogImageFor('marathon'), NETWORK_OG_IMAGE, 'marathon deferred -> falls to network default (no leak)');
});

test('withOgImages adds network default image to openGraph + twitter when absent', () => {
  const out = withOgImages({ title: 'X', openGraph: { title: 'X', url: 'u' }, twitter: { card: 'summary_large_image' } });
  assert.deepEqual(out.openGraph.images, [NETWORK_OG_IMAGE]);
  assert.deepEqual(out.twitter.images, [NETWORK_OG_IMAGE]);
  assert.equal(out.openGraph.title, 'X', 'existing openGraph fields preserved');
  assert.equal(out.openGraph.url, 'u');
  assert.equal(out.title, 'X', 'top-level fields untouched');
});

test('withOgImages uses the per-game hero when a game is given', () => {
  const out = withOgImages({ openGraph: { title: 'W' }, twitter: {} }, 'wardogs');
  assert.deepEqual(out.openGraph.images, ['/images/games/wardogs-hero.jpg']);
  assert.deepEqual(out.twitter.images, ['/images/games/wardogs-hero.jpg']);
});

test('withOgImages is non-destructive: an existing images array is preserved', () => {
  const out = withOgImages({ openGraph: { images: ['/custom.png'] }, twitter: { images: ['/custom.png'] } }, 'dmz');
  assert.deepEqual(out.openGraph.images, ['/custom.png']);
  assert.deepEqual(out.twitter.images, ['/custom.png']);
});

test('withOgImages tolerates missing openGraph/twitter objects', () => {
  const out = withOgImages({ title: 'Y' }, 'pubg-dednet');
  assert.deepEqual(out.openGraph.images, ['/images/games/pubg-dednet-hero.jpg']);
  assert.deepEqual(out.twitter.images, ['/images/games/pubg-dednet-hero.jpg']);
  assert.equal(out.title, 'Y');
});
