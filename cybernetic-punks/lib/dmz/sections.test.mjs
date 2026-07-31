// lib/dmz/sections.test.mjs
// Regression guard for sectionHasContent's SOURCE-MAPPING logic -- the predicate
// that now gates BOTH sitemap inclusion AND section indexability (noindex tag). A
// mapping regression would silently break discovery on future DMZ canonicals, so
// its testable core deserves a guard. Tests the MAPPING (data vs editor; discourse
// tag vs DMZ_ARTICLE_SECTION slug map; empty-map short-circuit) with a FAKE supabase
// -- NOT the live count. Run: node --test lib/dmz/sections.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sectionHasContent } from './sections.js';
import { dmz } from '../games/dmz.js';

const sectionBySlug = (slug) => dmz.sections.find((s) => s.slug === slug);

// Fake supabase: records the branch taken (which terminal filter fired + its args)
// and resolves the awaited chain to a fixed { count }. Thenable terminal so
// `await db.from(...)...contains(...)` / `.in(...)` yields { count } like PostgREST.
function fakeSupabase(count) {
  const spy = { called: false, table: null, contains: null, in: null, eq: [] };
  const q = {
    select() { return q; },
    eq(k, v) { spy.eq.push([k, v]); return q; },
    contains(k, v) { spy.contains = [k, v]; return q; },
    in(k, v) { spy.in = [k, v]; return q; },
    then(resolve) { spy.called = true; return Promise.resolve().then(() => resolve({ count: count })); },
  };
  const db = { from(t) { spy.table = t; return q; } };
  return { db, spy };
}
// A fake that EXPLODES if the DB is touched -- proves a pure-mapping short-circuit.
const explodingDb = { from() { throw new Error('DB must NOT be queried on a pure-mapping short-circuit'); } };

// ── DATA section -> false, WITHOUT touching the DB (pure mapping) ──────────────
test('data section (printer) returns false and never queries the DB', async () => {
  const printer = sectionBySlug('printer');
  assert.equal(printer.source, 'data', 'fixture: printer is a data section');
  const result = await sectionHasContent(printer, explodingDb); // would throw if DB touched
  assert.equal(result, false, 'data section is a coming-soon shell -> not indexable');
});

// ── EDITOR + empty slug-map -> false, WITHOUT touching the DB ──────────────────
// field-intel has NO entry in DMZ_ARTICLE_SECTION (Hajin+FOB moved out), so
// dmzArticleSlugsForSection returns [] and the predicate short-circuits pre-DB.
test('editor section with empty slug-map (field-intel) returns false without a DB count', async () => {
  const fi = sectionBySlug('field-intel');
  assert.equal(fi.source, 'editor', 'fixture: field-intel is an editor section');
  const result = await sectionHasContent(fi, explodingDb); // empty map -> no DB call
  assert.equal(result, false, 'no article maps here -> empty slug-set -> not indexable');
});

// ── EDITOR + slug-map WITH an entry (fob) -> queries by .in('slug', [mapped]) ──
// Uses the REAL DMZ_ARTICLE_SECTION map, so a regression that drops fob's article
// mapping is caught here (the slug-set would go empty and the branch would change).
test('editor section via slug-map (fob) queries feed_items by the mapped slug', async () => {
  const fob = sectionBySlug('fob');
  const { db, spy } = fakeSupabase(1);
  const result = await sectionHasContent(fob, db);
  assert.equal(result, true, 'a published article resolves -> indexable');
  assert.equal(spy.table, 'feed_items', 'queried feed_items');
  assert.ok(spy.in && spy.in[0] === 'slug', 'took the SLUG-MAP branch (.in on slug), not the tag branch');
  assert.ok(spy.in[1].includes('dmz-forward-operating-base-every-hub-system-detailed'),
    'resolved the REAL DMZ_ARTICLE_SECTION mapping for fob');
  assert.equal(spy.contains, null, 'did NOT take the discourse tag branch');
  assert.deepEqual(spy.eq, [['is_published', true], ['game_slug', 'dmz']], 'scoped to published DMZ rows');
});

// ── EDITOR + byTag (discourse) -> queries by .contains('tags', ['discourse']) ──
test('editor section via byTag (discourse) queries feed_items by the discourse tag', async () => {
  const disc = sectionBySlug('discourse');
  assert.ok(disc.contentFilter && disc.contentFilter.byTag === 'discourse', 'fixture: discourse maps by tag');
  const { db, spy } = fakeSupabase(1);
  const result = await sectionHasContent(disc, db);
  assert.equal(result, true, 'a tagged item resolves -> indexable');
  assert.deepEqual(spy.contains, ['tags', ['discourse']], 'took the TAG branch (.contains on tags)');
  assert.equal(spy.in, null, 'did NOT take the slug-map branch');
});

// ── The boolean maps from the count (mapping resolved, zero rows -> false) ─────
// Not testing the count value itself, only that a resolved mapping with zero
// published rows yields false (the shell state) -- the exact case the 4 shells hit.
test('mapped section with zero published rows returns false (the shell state)', async () => {
  const fob = sectionBySlug('fob');
  const { db } = fakeSupabase(0);
  assert.equal(await sectionHasContent(fob, db), false, 'mapping resolved but no rows -> not indexable');
});

// ── Guard: a missing/nullish section is false (never throws) ──────────────────
test('missing section returns false', async () => {
  assert.equal(await sectionHasContent(null, explodingDb), false);
  assert.equal(await sectionHasContent(undefined, explodingDb), false);
});
