// lib/dmz/bounties.test.mjs
// /dmz/bounties: sourced facts carry no number the sources do not state, no FAQPage schema, title and
// description lengths, the explicit sitemap entry, the visible counts / checked line / update log, and
// the internal links (FOB station, footer) that point at the page.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SOURCES, FACTS, UNCONFIRMED_LIST, UPDATE_LOG, FAQ, LAST_UPDATED, TITLE, DESC, PAGE_URL, VIDEO_EXAMPLE_NOTE, counts } from './bounties.js';
import { dmz } from '../games/dmz.js';
import { loadComponent, render } from '../games/jsxHarness.test-helper.mjs';

const nums = (s) => (String(s).match(/\d+/g) || []);
const ALL_TEXT = () => [
  ...FACTS.map((f) => f.text + ' ' + (f.note || '')), ...UNCONFIRMED_LIST, ...FAQ.map((f) => f.q + ' ' + f.a),
  ...UPDATE_LOG.map((u) => u.text), VIDEO_EXAMPLE_NOTE, TITLE, DESC,
];

let html;
before(async () => {
  const mod = await loadComponent('app/dmz/bounties/page.js');
  html = render(mod.default);
});

test('facts: each has exactly one labelled source; only the launch fact carries numbers (20 and 23)', () => {
  for (const f of FACTS) {
    assert.ok(f.src && f.src.label && Object.values(SOURCES).includes(f.src), f.text);
    if (f.section === 'launch') assert.deepEqual(nums(f.text), ['20', '23']);
    else assert.deepEqual(nums(f.text), [], 'number in fact: ' + f.text);
    // A note may cite a source (Part 1, June 6, Oct 5, Oct 8), never a game value.
    if (f.note) for (const n of nums(f.note)) assert.ok(['1', '5', '6', '8'].includes(n), 'number in note: ' + f.note);
  }
});

test('no invented numbers anywhere: only source dates, Part 1/2 and the two launch dates', () => {
  // Source dates (June 6, Oct 5/8/9, 2026-10-09), Part 1/2, the two launch dates, and the 4 in the game
  // title Modern Warfare 4. Nothing else -- no kill counts, prices, tiers or amounts.
  const allowed = new Set(['1', '2', '4', '5', '6', '8', '9', '20', '23', '2026', '10', '09']);
  for (const t of ALL_TEXT()) for (const n of nums(t)) assert.ok(allowed.has(n), 'unexpected number ' + n + ' in: ' + t);
  for (const t of ALL_TEXT()) {
    assert.ok(!/[$]/.test(t), 'dollar sign in: ' + t);
    assert.ok(!/most wanted/i.test(t), 'Most Wanted used in: ' + t);
    assert.ok(!/\b(onyx|steel)\b/i.test(t), 'Dog Tag level in: ' + t);
  }
  assert.ok(!/most wanted/i.test(html) && !/[$]\d/.test(html));
});

test('title <= 60 and description <= 155 characters', () => {
  assert.equal(TITLE, 'DMZ Bounty System: How Bounties Work and How to Pay One Off');
  assert.ok(TITLE.length <= 60, String(TITLE.length));
  assert.ok(DESC.length <= 155, String(DESC.length));
});

test('JSON-LD: BreadcrumbList + WebPage with dateModified, never FAQPage', () => {
  assert.ok(!html.includes('FAQPage'));
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
  assert.deepEqual(blocks.map((b) => b['@type']).sort(), ['BreadcrumbList', 'WebPage']);
  const wp = blocks.find((b) => b['@type'] === 'WebPage');
  assert.equal(wp.dateModified, LAST_UPDATED);
  assert.equal(wp.url, PAGE_URL);
});

test('visible: counts from the constants, checked-against line, update log, every unconfirmed item, FAQ as text', () => {
  const c = counts();
  assert.ok(html.includes(c.confirmed + ' confirmed') && html.includes(c.unconfirmed + ' unconfirmed'));
  assert.ok(html.includes('Checked against source on ' + LAST_UPDATED) || html.includes('Checked against source on <!-- -->' + LAST_UPDATED));
  for (const u of UPDATE_LOG) assert.ok(html.includes(u.date));
  for (const u of UNCONFIRMED_LIST) assert.ok(html.includes(u.replace(/'/g, '&#x27;')), u);
  for (const f of FAQ) assert.ok(html.includes(f.q));
  // The Oct 9 Early Access source renders as two citation links.
  assert.ok(html.includes('href="https://x.com/CallofDuty/status/2108588346671026335"'));
  assert.ok(html.includes('href="https://x.com/InfinityWard/status/2108588536614310081"'));
  for (const h of ['How the bounty system works', 'Bounty Stations and paying off your own bounty', 'What the official video shows', 'The FOB Bounty Leaderboard', 'Dog tags: rival Operators vs Lieutenants', 'The Hunt Operators Dynamic Op', 'What we know vs unconfirmed', 'FAQ']) {
    assert.ok(html.includes('>' + h + '</h2>'), 'missing H2 ' + h);
  }
});

test('sitemap: explicit /dmz/bounties entry with the fixed LAST_UPDATED lastmod', () => {
  const src = readFileSync(new URL('../sitemap/eligible.js', import.meta.url), 'utf8');
  assert.ok(src.includes("add(BASE + '/dmz/bounties', D, 'dmz-section', BOUNTIES_LAST_UPDATED, 'weekly', 0.8);"));
  assert.ok(src.includes("import { LAST_UPDATED as BOUNTIES_LAST_UPDATED } from '@/lib/dmz/bounties';"));
  assert.match(LAST_UPDATED, /^\d{4}-\d{2}-\d{2}$/);
});

test('internal links: FOB Bounty Leaderboard station and the DMZ footer point at /dmz/bounties', () => {
  const fob = dmz.sections.find((s) => s.slug === 'fob');
  const station = fob.reference.groups.flatMap((g) => g.stations).find((s) => s.name === 'Bounty Leaderboard');
  assert.equal(station.href, '/dmz/bounties');
  assert.ok(dmz.footer.links.explore.some((l) => l.href === '/dmz/bounties'));
});
