// lib/sitemap/partition.test.mjs
// The correctness gate for sitemap segmentation: the three children must be a
// genuine PARTITION of the one eligible set -- pairwise disjoint AND their union is
// exactly the input. Tested against a synthetic set covering every (game, type)
// combination the real computeEligible() emits, so a predicate that drops or
// double-counts a type FAILS here. Plus the throw-on-unassignable guard (a new
// game/type nobody gave a child) and the XML serializers' omit-when-null discipline.
// Run: node --test lib/sitemap/partition.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { partitionEligible, assertPartition, urlsetXml, sitemapIndexXml, newestLastmod } from './partition.js';

// One representative URL for every (game, type) computeEligible() produces.
const SET = [
  { url: 'https://x/dmz', game: 'dmz', type: 'dmz-section' },
  { url: 'https://x/dmz/fob', game: 'dmz', type: 'dmz-section' },
  { url: 'https://x/dmz/fob/a', game: 'dmz', type: 'dmz-article', lastmod: '2026-07-10T00:00:00-07:00' },
  { url: 'https://x/dmz/pois', game: 'dmz', type: 'dmz-entity' },
  { url: 'https://x/intel/one', game: 'marathon', type: 'intel', lastmod: '2026-06-01T00:00:00-07:00' },
  { url: 'https://x/intel/two', game: 'marathon', type: 'intel', lastmod: '2026-08-01T00:00:00-07:00' },
  { url: 'https://x/weapons/w', game: 'marathon', type: 'weapon', lastmod: '2026-05-01T00:00:00-07:00' },
  { url: 'https://x/shells/s', game: 'marathon', type: 'shell' },
  { url: 'https://x/maps/m', game: 'marathon', type: 'map' },
  { url: 'https://x/mods/core', game: 'marathon', type: 'modslot' },
  { url: 'https://x/matchups/mm', game: 'marathon', type: 'matchup' },
  { url: 'https://x/shells', game: 'marathon', type: 'hub' },
  { url: 'https://x/guides/ranked', game: 'marathon', type: 'guide' },
  { url: 'https://x/', game: 'marathon', type: 'static' },
];

test('partition is a genuine partition: union == input AND pairwise disjoint', () => {
  const { dmz, intel, entities } = partitionEligible(SET);
  const all = [...dmz, ...intel, ...entities];
  // union == input (same size, same URL set)
  assert.equal(all.length, SET.length, 'union size == eligible size');
  const inUrls = new Set(SET.map((e) => e.url));
  const outUrls = new Set(all.map((e) => e.url));
  assert.equal(outUrls.size, inUrls.size, 'no URL lost or duplicated');
  for (const u of inUrls) assert.ok(outUrls.has(u), 'every eligible URL present: ' + u);
  // pairwise disjoint: no URL in two children
  const seen = new Set();
  for (const e of all) { assert.ok(!seen.has(e.url), 'URL in exactly one child: ' + e.url); seen.add(e.url); }
});

test('children route by (game, type==intel): dmz->dmz, intel-articles->intel, rest->entities', () => {
  const { dmz, intel, entities } = partitionEligible(SET);
  assert.ok(dmz.every((e) => e.game === 'dmz'), 'dmz child is all game=dmz');
  assert.equal(dmz.length, 4, 'the 4 dmz URLs');
  assert.ok(intel.every((e) => e.game === 'marathon' && e.type === 'intel'), 'intel child is marathon+intel only');
  assert.equal(intel.length, 2, 'the 2 intel articles');
  assert.ok(entities.every((e) => e.game === 'marathon' && e.type !== 'intel'), 'entities is marathon non-intel');
  assert.equal(entities.length, 8, 'the 8 non-intel marathon URLs');
});

test('an unassignable URL (new game/type) THROWS -- drift fails loud, never silent-drop', () => {
  assert.throws(() => partitionEligible([{ url: 'https://x/z', game: 'valorant', type: 'agent' }]),
    /belongs to no child/, 'unknown game must throw, not vanish from the sitemap');
});

test('assertPartition: passes on a valid set, THROWS on a duplicate URL (pairwise-disjoint violation)', () => {
  assert.doesNotThrow(() => assertPartition(SET), 'a valid partition passes the runtime assertion');
  // same URL emitted twice (a partition-breaking bug) -> the runtime invariant throws.
  const dup = [...SET, { url: SET[7].url, game: 'marathon', type: 'weapon' }];
  assert.throws(() => assertPartition(dup), /more than one child|union URL set/, 'a duplicate URL fails the assertion loudly');
});

test('urlsetXml: emits lastmod ONLY when present (omit-when-null discipline)', () => {
  const xml = urlsetXml([
    { url: 'https://x/a', lastmod: '2026-08-01T00:00:00-07:00', changeFrequency: 'monthly', priority: 0.6 },
    { url: 'https://x/b', changeFrequency: 'daily', priority: 0.9 }, // no lastmod
  ]);
  assert.match(xml, /<loc>https:\/\/x\/a<\/loc>/);
  assert.match(xml, /<lastmod>2026-08-01T00:00:00-07:00<\/lastmod>/, 'present lastmod emitted');
  // b has a loc but NO lastmod element
  const bBlock = xml.slice(xml.indexOf('https://x/b'));
  assert.ok(!bBlock.includes('<lastmod>'), 'absent lastmod is OMITTED, never faked');
  assert.match(xml, /<priority>0.6<\/priority>/);
  assert.match(xml, /<changefreq>daily<\/changefreq>/);
});

test('sitemapIndexXml: lists children, per-child lastmod optional', () => {
  const xml = sitemapIndexXml([
    { loc: 'https://x/sitemap-dmz.xml', lastmod: '2026-07-10T00:00:00-07:00' },
    { loc: 'https://x/sitemap-marathon-intel.xml' }, // no lastmod
  ]);
  assert.match(xml, /<sitemapindex/);
  assert.match(xml, /<loc>https:\/\/x\/sitemap-dmz.xml<\/loc>/);
  assert.match(xml, /<lastmod>2026-07-10T00:00:00-07:00<\/lastmod>/);
  const intelBlock = xml.slice(xml.indexOf('sitemap-marathon-intel'));
  assert.ok(!intelBlock.includes('<lastmod>'), 'child with no lastmod omits it');
});

test('newestLastmod returns the max ISO string, or null when none', () => {
  assert.equal(newestLastmod([{ lastmod: '2026-06-01' }, { lastmod: '2026-08-01' }, { lastmod: '2026-05-01' }]), '2026-08-01');
  assert.equal(newestLastmod([{ url: 'a' }, { url: 'b' }]), null, 'no lastmod anywhere -> null (index omits it)');
});

test('XML-escapes ampersands in loc', () => {
  const xml = urlsetXml([{ url: 'https://x/a?b=1&c=2', changeFrequency: 'monthly', priority: 0.6 }]);
  assert.match(xml, /&amp;c=2/, 'ampersand escaped');
  assert.ok(!/&c=2/.test(xml.replace(/&amp;/g, '')), 'no raw ampersand');
});
