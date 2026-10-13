// lib/dmz/sitemapLastmod.test.mjs
// Sitemap lastmod for /dmz, field-intel, loadouts, printer, fob and regions: the later-of rule, the
// hash pins that keep lib/dmz/pageDates.js honest, and a guard that DMZ inputs never move non-DMZ output.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dmz } from '../games/dmz.js';
import { dmzPageLastmod, pinnedContent, canonicalJson, stringLiterals } from './sitemapLastmod.js';
import { PAGE_DATES } from './pageDates.js';
import { partitionEligible, urlsetXml } from '../sitemap/partition.js';

const B = 'https://cyberneticpunks.com';
const art = (section, slug, lastmod) => ({ url: B + '/dmz/' + section + '/' + slug, game: 'dmz', type: 'dmz-article', lastmod, changeFrequency: 'monthly', priority: 0.6 });
const PAGES = ['hub', 'field-intel', 'loadouts', 'printer', 'fob', 'regions'];
const SECTIONS = [
  { slug: 'field-intel' }, { slug: 'loadouts' }, { slug: 'fob' }, { slug: 'regions' },
  { slug: 'printer', reference: { featuredArticle: { section: 'loadouts', slug: 'crafting' } } },
];
const NO_DATES = {};

test('later of the newest listed article and the config date; the winning string is kept verbatim', () => {
  const entries = [art('field-intel', 'a', '2026-10-01T10:00:00-07:00'), art('field-intel', 'b', '2026-10-05T10:00:00-07:00')];
  assert.equal(dmzPageLastmod('field-intel', entries, { sections: SECTIONS, pageDates: NO_DATES }), '2026-10-05T10:00:00-07:00');
  // Config newer -> config wins (rendered in the same PT-offset form as the article dates).
  assert.equal(dmzPageLastmod('field-intel', entries, { sections: SECTIONS, pageDates: { 'field-intel': { lastUpdated: '2026-10-12T22:55:07Z' } } }), '2026-10-12T15:55:07-07:00');
  // Config older -> the article wins.
  assert.equal(dmzPageLastmod('field-intel', entries, { sections: SECTIONS, pageDates: { 'field-intel': { lastUpdated: '2026-06-30T23:14:35Z' } } }), '2026-10-05T10:00:00-07:00');
  // Compared as instants, not strings: a PST date can be later than a lexically larger PDT one.
  const dst = [art('fob', 'x', '2026-11-05T23:30:00-07:00'), art('fob', 'y', '2026-11-05T23:00:00-08:00')];
  assert.equal(dmzPageLastmod('fob', dst, { sections: SECTIONS, pageDates: NO_DATES }), '2026-11-05T23:00:00-08:00');
});

test('undefined when the page has neither a listed article nor a config date (the tag is omitted)', () => {
  assert.equal(dmzPageLastmod('loadouts', [], { sections: SECTIONS, pageDates: NO_DATES }), undefined);
  assert.equal(dmzPageLastmod('loadouts', [art('fob', 'x', '2026-10-01T10:00:00-07:00')], { sections: SECTIONS, pageDates: NO_DATES }), undefined);
  assert.equal(dmzPageLastmod('regions', [art('regions', 'x', undefined)], { sections: SECTIONS, pageDates: NO_DATES }), undefined);
});

test('which articles a page lists: its own section, the featured article, the hub lists all; nothing else counts', () => {
  const entries = [
    art('loadouts', 'crafting', '2026-10-03T10:00:00-07:00'),
    art('field-intel', 'n', '2026-10-09T10:00:00-07:00'),
    art('field-intelx', 'lookalike', '2026-12-01T10:00:00-08:00'),
    { url: B + '/dmz/fob/a', game: 'dmz', type: 'dmz-section', lastmod: '2026-12-01T10:00:00-08:00' },
    { url: B + '/dmz/fob/b', game: 'wardogs', type: 'dmz-article', lastmod: '2026-12-01T10:00:00-08:00' },
  ];
  const o = { sections: SECTIONS, pageDates: NO_DATES };
  assert.equal(dmzPageLastmod('printer', entries, o), '2026-10-03T10:00:00-07:00', 'featured article');
  assert.equal(dmzPageLastmod('field-intel', entries, o), '2026-10-09T10:00:00-07:00', 'look-alike section ignored');
  assert.equal(dmzPageLastmod('fob', entries, o), undefined, 'non-article and non-DMZ entries ignored');
  assert.equal(dmzPageLastmod('hub', entries, o), '2026-12-01T10:00:00-08:00', 'hub lists every DMZ article');
});

test('never reads the clock: no Date.now or new Date in the helper, and it still works with Date.now broken', () => {
  const src = readFileSync(new URL('./sitemapLastmod.js', import.meta.url), 'utf8');
  assert.ok(!/Date\.now|new Date\(/.test(src.replace(/\/\/.*$/gm, '')));
  const real = Date.now;
  Date.now = () => { throw new Error('clock read'); };
  try { assert.equal(dmzPageLastmod('fob', [art('fob', 'a', '2026-10-01T10:00:00-07:00')], { sections: SECTIONS, pageDates: NO_DATES }), '2026-10-01T10:00:00-07:00'); }
  finally { Date.now = real; }
});

test('eligible.js wiring: the six pages read the helper after the dmz-article emitter (its published/noindex filter), inside the DMZ block only', () => {
  const src = readFileSync(new URL('../sitemap/eligible.js', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  const dmzStart = src.indexOf("── DMZ (game='dmz')"), dmzEnd = src.indexOf('── WARDOGS');
  const block = src.slice(dmzStart, dmzEnd);
  // The one allowed line outside the block: the import, in the DMZ import cluster right after bosses.
  const IMPORT = "import { dmzPageLastmod } from '@/lib/dmz/sitemapLastmod';";
  assert.equal(src.split(IMPORT).length - 1, 1, 'exactly one helper import');
  assert.ok(src.includes("from '@/lib/dmz/bosses';\n" + IMPORT + '\n'), 'the import sits in the DMZ import cluster');
  const outside = (src.slice(0, dmzStart) + src.slice(dmzEnd)).replace(IMPORT, '');
  assert.equal((outside.match(/dmzPageLastmod|sitemapLastmod/g) || []).length, 0, 'no other use outside the DMZ block');
  assert.match(block, /\.eq\('game_slug', D\)\.eq\('is_published', true\)\.eq\('noindex', false\)/);
  assert.ok(block.indexOf("'dmz-article'") < block.indexOf('dmzPageLastmod(sec.slug, out)'), 'articles are emitted before the section hubs read them');
  assert.match(block, /add\(BASE \+ '\/dmz\/' \+ sec\.slug, D, 'dmz-section', dmzPageLastmod\(sec\.slug, out\), 'weekly', 0\.8\)/);
  assert.match(block, /add\(BASE \+ '\/dmz', D, 'dmz-section', dmzPageLastmod\('hub', out\), 'daily', 0\.9\)/);
});

test('hash pins: each page date is pinned to its static config content (update BOTH when content changes)', () => {
  const hubSrc = readFileSync(new URL('./hubCopy.js', import.meta.url), 'utf8');
  for (const p of PAGES) {
    const d = PAGE_DATES[p];
    assert.ok(d, 'PAGE_DATES has no entry for ' + p);
    assert.match(d.lastUpdated, /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/, p + ': lastUpdated must be a UTC commit time');
    const hash = createHash('sha256').update(canonicalJson(pinnedContent(p, dmz, hubSrc))).digest('hex');
    assert.equal(hash, d.contentHash,
      'DMZ page "' + p + '" content changed. Set PAGE_DATES["' + p + '"].lastUpdated to this content commit\'s time (UTC) '
      + 'AND contentHash to ' + hash + ' in lib/dmz/pageDates.js, in the same commit.');
  }
});

test('pins ignore what is not content: hero art and overlay, key order, CRLF, comments in hubCopy.js', () => {
  const hubSrc = readFileSync(new URL('./hubCopy.js', import.meta.url), 'utf8');
  const h = (cfg, src) => canonicalJson(pinnedContent('hub', cfg, src));
  const restyled = { ...dmz, hero: { ...dmz.hero, image: { src: '/other.webp' }, overlay: { side: 'none' } } };
  assert.equal(h(restyled, hubSrc), h(dmz, hubSrc));
  assert.equal(h(dmz, hubSrc.replace(/\r\n/g, '\n')), h(dmz, hubSrc.replace(/\r?\n/g, '\r\n')));
  assert.equal(h(dmz, hubSrc + '\n// a comment with "quotes"\n'), h(dmz, hubSrc));
  assert.notEqual(h({ ...dmz, early_access_date: '2026-10-21' }, hubSrc), h(dmz, hubSrc), 'a content change does move the hash');
  assert.deepEqual(stringLiterals("var a = 'x'; // 'no'\n/* \"no\" */ var b = \"y\\\"z\";"), ['x', 'y"z']);
  assert.equal(canonicalJson({ b: 1, a: [2, { d: 3, c: 4 }] }), canonicalJson({ a: [2, { c: 4, d: 3 }], b: 1 }));
});

test('guard: changing DMZ inputs never changes non-DMZ entries or their sitemap XML', () => {
  const nonDmz = [
    { url: B + '/marathon/intel/x', game: 'marathon', type: 'intel', lastmod: '2026-10-08T08:57:53-07:00', changeFrequency: 'monthly', priority: 0.6 },
    { url: B + '/marathon/shells/rook', game: 'marathon', type: 'shell', lastmod: undefined, changeFrequency: 'weekly', priority: 0.75 },
    { url: B + '/wardogs/news/y', game: 'wardogs', type: 'wardogs-article', lastmod: '2026-10-05T08:36:36-07:00', changeFrequency: 'monthly', priority: 0.6 },
    { url: B + '/pubg-dednet', game: 'pubg-dednet', type: 'pubg-dednet-section', lastmod: undefined, changeFrequency: 'daily', priority: 0.9 },
    { url: B + '/bodycam/field-intel/z', game: 'bodycam', type: 'bodycam-article', lastmod: '2026-10-02T06:23:29-07:00', changeFrequency: 'monthly', priority: 0.6 },
  ];
  // Build an eligible set the way eligible.js does: DMZ articles, then the six pages with the helper.
  const build = (dmzArticles, pageDates) => {
    const out = nonDmz.map((e) => ({ ...e })).concat(dmzArticles);
    for (const p of PAGES) out.push({ url: B + (p === 'hub' ? '/dmz' : '/dmz/' + p), game: 'dmz', type: 'dmz-section', lastmod: dmzPageLastmod(p, out, { sections: dmz.sections, pageDates }), changeFrequency: 'weekly', priority: 0.8 });
    return partitionEligible(out);
  };
  const a = build([art('fob', 'f', '2026-10-01T10:00:00-07:00')], NO_DATES);
  const b = build([art('fob', 'f', '2026-12-24T10:00:00-08:00'), art('regions', 'r', '2026-12-25T10:00:00-08:00')], PAGE_DATES);
  for (const k of ['intel', 'entities', 'wardogs', 'pubgDednet', 'bodycam']) assert.equal(urlsetXml(a[k]), urlsetXml(b[k]), k + ' changed with DMZ inputs');
  assert.notEqual(urlsetXml(a.dmz), urlsetXml(b.dmz), 'the DMZ child does move');
  assert.deepEqual(nonDmz.map((e) => e.lastmod), ['2026-10-08T08:57:53-07:00', undefined, '2026-10-05T08:36:36-07:00', undefined, '2026-10-02T06:23:29-07:00'], 'inputs not mutated');
});
