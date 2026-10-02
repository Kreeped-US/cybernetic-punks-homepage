// lib/games/hubModel.test.mjs
// Shared hub layout B view-model (lib/games/hubModel.js), using the REAL game configs + resolver:
// Latest Intel order / limit / hidden-when-empty / resolver URLs (incl. a fallback-routed article), the
// facts strip (sourced facts only; version hidden when unavailable), the Coverage-card vs Coming-row
// rule, and RSC-plainness of everything the hub hands to components.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { selectLatestIntel, latestUpdatedAt, buildHubFacts, splitCoverage, LATEST_INTEL_LIMIT } from './hubModel.js';
import { bodycam } from './bodycam.js';
import { wardogs } from './wardogs.js';
import { dmz } from './dmz.js';
import { row } from './fakeFeedDb.test-helper.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const day = (d) => '2026-09-' + String(d).padStart(2, '0') + 'T18:00:00Z';

// Same recursive check as gameNavProps.test.mjs: only primitives / plain arrays / plain objects.
function isRscPlain(v) {
  if (v === null) return true;
  const t = typeof v;
  if (t === 'string' || t === 'number' || t === 'boolean') return true;
  if (t !== 'object') return false;
  if (Array.isArray(v)) return v.every(isRscPlain);
  const proto = Object.getPrototypeOf(v);
  if (proto !== Object.prototype && proto !== null) return false;
  return Object.values(v).every(isRscPlain);
}

// ── LATEST INTEL ───────────────────────────────────────────────────────────────────────────────────
test('latest intel: newest first, capped at 5 by default', () => {
  const rows = [3, 9, 1, 7, 5, 8, 2].map((d) => row('bodycam', 'unmapped-' + d, { created_at: day(d) }));
  const out = selectLatestIntel(bodycam, rows);
  assert.equal(LATEST_INTEL_LIMIT, 5);
  assert.deepEqual(out.map((a) => a.href.split('/').pop()), ['unmapped-9', 'unmapped-8', 'unmapped-7', 'unmapped-5', 'unmapped-3']);
  assert.equal(selectLatestIntel(bodycam, rows, 2).length, 2, 'explicit limit honored');
});

test('latest intel: empty / all-ineligible -> [] (the component renders nothing)', () => {
  assert.deepEqual(selectLatestIntel(bodycam, []), []);
  assert.deepEqual(selectLatestIntel(bodycam, null), []);
  assert.deepEqual(selectLatestIntel(bodycam, [
    row('bodycam', 'a', { noindex: true }), row('bodycam', 'b', { is_published: false }), row('bodycam', 'c', { rejected: true }),
  ]), []);
});

test('latest intel: URLs + labels come from the shared resolver (mapped AND fallback-routed)', () => {
  const out = selectLatestIntel(bodycam, [
    row('bodycam', 'bodycam-game-modes-after-locked-and-loaded', { headline: 'Modes piece', created_at: day(20) }), // mapped -> modes
    row('bodycam', 'brand-new-cron-slug', { headline: 'Cron piece', created_at: day(21) }),                        // unmapped -> fallback
  ]);
  assert.deepEqual(out[0], { href: '/bodycam/field-intel/brand-new-cron-slug', headline: 'Cron piece', sectionLabel: 'News', date: 'September 21, 2026', dateTime: day(21) });
  assert.equal(out[1].href, '/bodycam/modes/bodycam-game-modes-after-locked-and-loaded');
  assert.equal(out[1].sectionLabel, 'Modes');
  // game-agnostic: the same function serves another game with its own basePath + resolver
  assert.equal(selectLatestIntel(wardogs, [row('wardogs', 'wardogs-control-zone')])[0].href, '/wardogs/systems/wardogs-control-zone');
});

test('latestUpdatedAt: newest updated_at (created_at fallback), eligible rows only; null when none', () => {
  assert.equal(latestUpdatedAt([
    row('bodycam', 'a', { created_at: day(1), updated_at: day(10) }),
    row('bodycam', 'b', { created_at: day(12), updated_at: null }),
    row('bodycam', 'c', { created_at: day(1), updated_at: day(28), noindex: true }),
  ]), new Date(day(12)).toISOString());
  assert.equal(latestUpdatedAt([]), null);
});

// ── FACTS STRIP ────────────────────────────────────────────────────────────────────────────────────
test('facts: config facts in order, then version, reports, intel updated, store', () => {
  const facts = buildHubFacts(bodycam, {
    reportCount: 6, updatedAt: day(30),
    version: { version: 'v0.8', url: 'https://store.steampowered.com/news/x', date: day(25), title: 'Bodycam PATCH NOTES V0.8 #6' },
  });
  assert.deepEqual(facts.map((f) => f.label), ['Developer', 'Platform', 'Status', 'Engine', 'Current version', 'Reports', 'Intel updated', 'Store']);
  assert.deepEqual(facts[4], { label: 'Current version', value: 'v0.8', href: 'https://store.steampowered.com/news/x', note: 'patch notes September 25, 2026' });
  assert.equal(facts[5].value, '6 published');
  assert.equal(facts[7].href, bodycam.storeUrl);
});

test('facts: version HIDDEN when unavailable (fetch failure -> null); no estimates; 0 reports reads honestly', () => {
  const facts = buildHubFacts(bodycam, { reportCount: 0, updatedAt: null, version: null });
  const labels = facts.map((f) => f.label);
  assert.ok(!labels.includes('Current version'), 'no version fact');
  assert.ok(!labels.includes('Intel updated'), 'no updated fact without a date');
  assert.equal(facts.find((f) => f.label === 'Reports').value, 'Being built');
  for (const banned of ['Weapons', 'Modes', 'Maps', 'Players', 'Release']) assert.ok(!labels.some((l) => l.includes(banned)), 'no ' + banned + ' fact');
});

test('facts: the hardcoded page array moved to config verbatim; hubIntro is the operator sentence', () => {
  assert.deepEqual(bodycam.facts, [
    { label: 'Developer', value: 'Reissad Studio' }, { label: 'Platform', value: 'PC (Steam)' },
    { label: 'Status', value: 'Early Access - live now' }, { label: 'Engine', value: 'Unreal Engine 5' },
  ]);
  assert.equal(bodycam.hubIntro, 'Coverage of the Reissad Studio body-camera tactical FPS - weapons, the real-parts attachment system with its compatibility gates, the competitive modes, and the maps - grounded in official material and in-game observation. Structure is confirmed; specific numbers stay flagged until verified in-game.');
  const page = fs.readFileSync(path.join(ROOT, 'app/bodycam/page.js'), 'utf8');
  assert.ok(!page.includes("['Developer', 'Reissad Studio']") && !page.includes('Coverage of the Reissad Studio'), 'no copy left hardcoded in the page');
});

// ── COVERAGE + COMING ROW ──────────────────────────────────────────────────────────────────────────
test('coverage rule: editor section with >= 1 article -> card; everything else -> Coming chip (linked)', () => {
  const { cards, coming } = splitCoverage(bodycam, { 'field-intel': 5, modes: 1 });
  assert.deepEqual(cards, [{ slug: 'field-intel', count: 5 }, { slug: 'modes', count: 1 }]);
  assert.deepEqual(coming, [
    { slug: 'arsenal', label: 'Arsenal', href: '/bodycam/arsenal' },
    { slug: 'maps', label: 'Maps', href: '/bodycam/maps' },
  ]);
  // an editor section with 0 articles is a chip, not a card; a data section never becomes a card
  const empty = splitCoverage(bodycam, { modes: 0, arsenal: 99 });
  assert.deepEqual(empty.cards, []);
  assert.deepEqual(empty.coming.map((c) => c.slug), ['field-intel', 'modes', 'arsenal', 'maps']);
});

test('coverage rule: hideFromNav sections never appear as Coming chips, but get a card once live', () => {
  const disc = dmz.sections.find((s) => s.slug === 'discourse');
  assert.ok(disc.hideFromNav, 'fixture: dmz discourse is hideFromNav');
  assert.ok(!splitCoverage(dmz, {}).coming.some((c) => c.slug === 'discourse'));
  assert.ok(splitCoverage(dmz, { discourse: 2 }).cards.some((c) => c.slug === 'discourse'));
});

// ── RSC PLAINNESS ──────────────────────────────────────────────────────────────────────────────────
test('plainness: everything the hub hands to components is RSC-plain (no RegExp/function crosses)', () => {
  assert.equal(isRscPlain(bodycam), false, 'sanity: the raw config carries a RegExp');
  const rows = [row('bodycam', 'brand-new-cron-slug'), row('bodycam', 'bodycam-trenches-map')];
  const version = { version: 'v0.8', url: 'https://x.test/a', date: day(25), title: 't' };
  assert.equal(isRscPlain(selectLatestIntel(bodycam, rows)), true, 'latest intel items');
  assert.equal(isRscPlain(buildHubFacts(bodycam, { reportCount: 2, updatedAt: day(2), version })), true, 'facts items');
  assert.equal(isRscPlain(splitCoverage(bodycam, { 'field-intel': 2 })), true, 'coverage split');
});

test('plainness: the new hub pieces are SERVER components (no "use client" boundary to cross)', () => {
  for (const f of ['components/game/HubLatestIntel.js', 'components/game/HubFactsStrip.js', 'components/game/GameSectionPage.js']) {
    const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
    assert.ok(!/^\s*['"]use client['"]/m.test(src), f + ' must not be a client component');
  }
});
