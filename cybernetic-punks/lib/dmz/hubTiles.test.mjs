// lib/dmz/hubTiles.test.mjs
// /dmz hub rework (2026-10-21): tiles move between "Coming after launch" and the Coverage grid by the same
// content rule each page's robots uses; the "What's confirmed" block carries only repo-sourced facts with a
// named source; the Early Access note is static ASCII; no frozen field on /dmz changed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dmz } from '../games/dmz.js';
import { splitHubTiles, DMZ_HUB_ROUTES } from './hubTiles.js';
import { isStandaloneReference } from './sections.js';
import { FAQ_SOURCE_PHRASES } from './hubCopy.js';

const src = (p) => readFileSync(new URL('../../' + p, import.meta.url), 'utf8');
const keys = (tiles) => tiles.map((t) => t.key);

test('A1: a tile is live exactly when its page has content (articles, a standalone reference, or rows)', () => {
  const sections = [
    { slug: 'field-intel', source: 'editor' }, { slug: 'meta', source: 'editor' },
    { slug: 'printer', source: 'data', reference: { standalone: true, groups: [{}] } }, { slug: 'discourse', source: 'editor' },
  ];
  const none = splitHubTiles(sections, { 'field-intel': 5 }, isStandaloneReference, {});
  assert.deepEqual(keys(none.live), ['field-intel', 'printer']);
  assert.deepEqual(keys(none.later), ['meta', 'discourse', 'pois', 'missions', 'builds', 'keys', 'items']);
  // The first article / first row moves the tile up on its own; zero or a missing count keeps it down.
  const some = splitHubTiles(sections, { 'field-intel': 5, meta: 1 }, isStandaloneReference, { pois: 19, items: 1, keys: 0 });
  assert.deepEqual(keys(some.live), ['field-intel', 'meta', 'printer', 'pois', 'items']);
  assert.deepEqual(keys(some.later), ['discourse', 'missions', 'builds', 'keys']);
  assert.equal(some.live.find((t) => t.key === 'meta').count, 1);
});

test('the real config today: 5 live sections + Locations = 6 Coverage tiles; Meta and Discourse wait', () => {
  const counts = { 'field-intel': 5, loadouts: 1, fob: 1, regions: 1 };
  const t = splitHubTiles(dmz.sections, counts, isStandaloneReference, { pois: 19 });
  assert.deepEqual(keys(t.live), ['field-intel', 'loadouts', 'printer', 'fob', 'regions', 'pois']);
  assert.deepEqual(keys(t.later), ['meta', 'discourse', 'missions', 'builds', 'keys', 'items']);
  assert.deepEqual(DMZ_HUB_ROUTES.map((r) => r.href), ['/dmz/pois', '/dmz/missions', '/dmz/builds', '/dmz/keys', '/dmz/items']);
});

test("What's confirmed: seven repo-sourced facts, each crediting a named post or a dated observation; positive closing line", () => {
  const f = dmz.confirmedFacts;
  assert.deepEqual(f.items.map((i) => i.label), ['Early Access and launch', 'Hajin Exclusion Zone', 'Progression', 'Vendor', 'Gunsmith', '3D Printer', 'Traits']);
  const linkable = FAQ_SOURCE_PHRASES.map((p) => p.phrase);
  for (const it of f.items) {
    assert.ok(it.label && it.text, it.label);
    assert.ok(linkable.includes(it.source) || /observed by Justin, \d{4}-\d\d-\d\d$/.test(it.source), it.label + ': source must be a linked official post or a dated observation');
  }
  // The Level 2 unlock credits what the repo's 3D Printer block credits first: the FOB Station Intel graphics.
  assert.equal(f.items.find((i) => i.label === '3D Printer').source, 'official FOB Station Intel graphics, observed by Justin, 2026-10-09');
  assert.equal(dmz.earlyAccessNoteSource, 'observed by Justin, 2026-10-20');
  const all = JSON.stringify(f);
  assert.ok(!/[^\x00-\x7f]/.test(all + dmz.earlyAccessNote), 'ASCII only');
  assert.ok(!/\b32\b|\b66\b/.test(all), 'unsourced counts (32 weapons, 66 Traits) stay out');
  assert.ok(!/not (been )?published|unpublished/i.test(all), 'closing line states nothing as unpublished');
  assert.equal(f.closing.href, '/dmz/printer');
});

test('Early Access note: the operator wording, static, rendered once in the hero area, never clock-compared', () => {
  assert.equal(dmz.earlyAccessNote, 'DMZ Early Access opens October 20, 10:00 AM PT for digital pre-order and pre-purchase owners. Full launch is October 23.');
  const page = src('app/dmz/page.js');
  assert.equal(page.split('{dmz.earlyAccessNote}').length - 1, 1);
  assert.ok(page.indexOf('{dmz.earlyAccessNote}') < page.indexOf('OPERATION CLOCK'), 'above the countdown');
  assert.ok(!/earlyAccessNote[^\n]*(dmzLive|Date\.now|isGameLive)/.test(page), 'no clock logic on the note');
});

test('D: no decorative tier skeleton or S/S/A arrows left on the hub; no frozen field moved', () => {
  const page = src('app/dmz/page.js');
  assert.ok(!/MetaCard|gridTemplateColumns: '22px 1fr 38px 42px'|\['S', 'up'\]/.test(page));
  // Frozen fields: metadata export, JSON-LD builders and robots are untouched by this rework.
  const meta = page.slice(page.indexOf('export const metadata'), page.indexOf('};', page.indexOf('export const metadata')));
  assert.ok(meta.includes("title: { absolute: 'MW4 DMZ Release Date: October 23, 2026 (Modern Warfare 4)' },"));
  assert.ok(!/robots:/.test(meta));
  assert.ok(page.includes('var hubLd = hubJsonLd({'));
});
