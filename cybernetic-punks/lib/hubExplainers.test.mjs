// lib/hubExplainers.test.mjs
// Guards the PURE selectExplainers(): eligibility (unpublished / noindex / rejected / null-section
// dropped), dedupe by href, excludeHrefs (FAQ dedup), grouped-by-section + oldest-first ordering,
// and the cap (keep oldest, drop newest, warn). Run: node --test lib/hubExplainers.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectExplainers } from './hubExplainers.js';

// A published, indexable, non-rejected row with a derived section + built href.
function art(o) {
  const base = { is_published: true, noindex: false, rejected: false, section: 'field-intel', created_at: '2026-01-01T00:00:00Z' };
  const a = Object.assign(base, o);
  if (a.href === undefined) a.href = a.slug ? ('/g/' + a.section + '/' + a.slug) : null;
  return a;
}
const hrefs = (rows) => rows.map((r) => r.href);

test('selectExplainers includes eligible articles and excludes unpublished / noindex / rejected', () => {
  const rows = [
    art({ slug: 'ok' }),
    art({ slug: 'unpub', is_published: false }),
    art({ slug: 'noidx', noindex: true }),
    art({ slug: 'rej', rejected: true }),
  ];
  assert.deepEqual(hrefs(selectExplainers(rows, { cap: 30 })), ['/g/field-intel/ok']);
});

test('selectExplainers drops null-section rows (not linkable)', () => {
  const rows = [art({ slug: 'has-sec', section: 'economy' }), art({ slug: 'no-sec', section: null, href: null })];
  assert.deepEqual(hrefs(selectExplainers(rows, { cap: 30 })), ['/g/economy/has-sec']);
});

test('selectExplainers orders grouped-by-section, oldest-first within a section', () => {
  const rows = [
    art({ slug: 'fi-new', section: 'field-intel', created_at: '2026-05-01T00:00:00Z' }),
    art({ slug: 'fi-old', section: 'field-intel', created_at: '2026-02-01T00:00:00Z' }),
    art({ slug: 'eco-new', section: 'economy', created_at: '2026-06-01T00:00:00Z' }),
    art({ slug: 'eco-old', section: 'economy', created_at: '2026-01-01T00:00:00Z' }),
  ];
  // economy's oldest (Jan) < field-intel's oldest (Feb) -> economy group first; oldest-first within.
  assert.deepEqual(hrefs(selectExplainers(rows, { cap: 30 })), [
    '/g/economy/eco-old', '/g/economy/eco-new', '/g/field-intel/fi-old', '/g/field-intel/fi-new',
  ]);
});

test('selectExplainers excludeHrefs removes FAQ-duplicated links', () => {
  const rows = [art({ slug: 'keep', section: 'fob' }), art({ slug: 'faq', section: 'fob' })];
  const out = selectExplainers(rows, { cap: 30, excludeHrefs: ['/g/fob/faq'] });
  assert.deepEqual(hrefs(out), ['/g/fob/keep']);
});

test('selectExplainers dedupes by href', () => {
  const rows = [art({ slug: 'dup', section: 'systems' }), art({ slug: 'dup', section: 'systems' })];
  assert.deepEqual(hrefs(selectExplainers(rows, { cap: 30 })), ['/g/systems/dup']);
});

test('selectExplainers caps by dropping the NEWEST, keeping oldest, and warns', () => {
  const rows = [];
  for (let i = 0; i < 5; i++) rows.push(art({ slug: 's' + i, section: 'systems', created_at: '2026-0' + (i + 1) + '-01T00:00:00Z' }));
  const warnings = [];
  const orig = console.warn; console.warn = (m) => warnings.push(m);
  let out;
  try { out = selectExplainers(rows, { cap: 3, gameSlug: 'wardogs' }); } finally { console.warn = orig; }
  // 5 -> cap 3: keep the 3 OLDEST (s0,s1,s2), oldest-first.
  assert.deepEqual(hrefs(out), ['/g/systems/s0', '/g/systems/s1', '/g/systems/s2']);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /\[hubExplainers\] wardogs truncated 5 -> 3/);
});

test('selectExplainers: empty input -> []', () => {
  assert.deepEqual(selectExplainers([], { cap: 30 }), []);
  assert.deepEqual(selectExplainers(undefined, { cap: 30 }), []);
});
