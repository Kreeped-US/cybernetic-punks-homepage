// lib/dmz/bounties.test.mjs
// /dmz/bounties: sourced facts carry no number the sources do not state, no FAQPage schema, title and
// description lengths, the explicit sitemap entry, the visible counts / checked line / update log, and
// the internal links (FOB station, footer) that point at the page, the Bounty Leaderboard graphic facts,
// unique ids, and "Most Wanted" only as the official term attributed to that graphic.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SOURCES, FACTS, UNCONFIRMED_LIST, UPDATE_LOG, FAQ, LAST_UPDATED, TITLE, DESC, PAGE_URL, VIDEO_EXAMPLE_NOTE, counts } from './bounties.js';
import { dmz } from '../games/dmz.js';
import { loadComponent, render } from '../games/jsxHarness.test-helper.mjs';

const nums = (s) => (String(s).match(/\d+/g) || []);
const ALL_TEXT = () => [
  ...FACTS.map((f) => f.text + ' ' + (f.note || '')), ...UNCONFIRMED_LIST.map((u) => u.text), ...FAQ.map((f) => f.q + ' ' + f.a),
  ...UPDATE_LOG.map((u) => u.text), VIDEO_EXAMPLE_NOTE, TITLE, DESC,
];

let html;
before(async () => {
  const mod = await loadComponent('app/dmz/bounties/page.js');
  html = render(mod.default);
});

test('facts: each has exactly one labelled source; only the launch dates and the Top 50 list size are numbers', () => {
  for (const f of FACTS) {
    assert.ok(f.src && f.src.label && Object.values(SOURCES).includes(f.src), f.text);
    if (f.id === 'early-access') assert.deepEqual(nums(f.text), ['20', '23']);
    else if (f.id === 'lb-weekly-top50') assert.deepEqual(nums(f.text), ['50', '50']);
    else assert.deepEqual(nums(f.text), [], 'number in fact: ' + f.text);
    // A note may cite a source (Part 1, June 6, Oct 5, Oct 8) or the official Top 50 list size, never a game value.
    if (f.note) for (const n of nums(f.note.replace(/Top 50/g, 'Top'))) assert.ok(['1', '5', '6', '8'].includes(n), 'number in note: ' + f.note);
  }
});

test('no invented numbers anywhere: only source dates, Part 1/2, the two launch dates and Top 50', () => {
  // Source dates (June 6, Oct 5/8/9, 2026-10-09), Part 1/2, the two launch dates, the 4 in the game title
  // Modern Warfare 4, and the official Top 50 list size. Nothing else -- no kill counts, prices, tiers or amounts.
  const allowed = new Set(['1', '2', '4', '5', '6', '8', '9', '20', '23', '50', '2026', '10', '09']);
  for (const t of ALL_TEXT()) for (const n of nums(t)) assert.ok(allowed.has(n), 'unexpected number ' + n + ' in: ' + t);
  for (const t of ALL_TEXT()) {
    assert.ok(!/[$]/.test(t), 'dollar sign in: ' + t);
    assert.ok(!/\b(onyx|steel)\b/i.test(t), 'Dog Tag level in: ' + t);
  }
  assert.ok(!/[$]\d/.test(html));
});

test('"Most Wanted" appears only as the official term, attributed to the Bounty Leaderboard graphic', () => {
  for (const f of FACTS.filter((x) => /most wanted/i.test(x.text + ' ' + (x.note || '')))) assert.equal(f.src, SOURCES.GRAPHIC, f.id);
  for (const f of FAQ.filter((x) => /most wanted/i.test(x.q + ' ' + x.a))) assert.match(f.a, /official (term from the )?(Bounty Leaderboard FOB Station Intel )?graphic/, f.q);
  for (const u of UPDATE_LOG.filter((x) => /most wanted/i.test(x.text))) assert.match(u.text, /Bounty Leaderboard FOB Station Intel graphic/);
  for (const u of UNCONFIRMED_LIST) assert.ok(!/most wanted/i.test(u.text), u.id);
});

test('no digit appears as a bounty or cash value', () => {
  const VALUE = /([$]|\bcash\b|\bbount\w*)\W{0,3}\d|\d\W{0,3}(dmz cash|cash|bount\w*)/i;
  for (const t of ALL_TEXT()) assert.ok(!VALUE.test(t.replace(/Top 50/g, 'Top')), 'value-like number in: ' + t);
  const visible = html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/Top 50/g, 'Top');
  assert.ok(!VALUE.test(visible));
});

test('ids: every FACTS and UNCONFIRMED_LIST entry has a unique, non-empty id', () => {
  const ids = [...FACTS.map((f) => f.id), ...UNCONFIRMED_LIST.map((u) => u.id)];
  for (const id of ids) assert.ok(typeof id === 'string' && /^[a-z0-9-]+$/.test(id), 'bad id ' + id);
  assert.equal(new Set(ids).size, ids.length, 'duplicate id');
  // Answered items keep their id: leaderboard-scope moved into FACTS and is no longer open.
  assert.ok(FACTS.some((f) => f.id === 'leaderboard-scope') && !UNCONFIRMED_LIST.some((u) => u.id === 'leaderboard-scope'));
  for (const id of UPDATE_LOG.flatMap((u) => u.declassifies || [])) assert.ok(FACTS.some((f) => f.id === id), 'declassified id not in FACTS: ' + id);
});

test('Bounty Leaderboard graphic: G1-G6 are present as facts with the graphic as source', () => {
  const byId = Object.fromEntries(FACTS.map((f) => [f.id, f]));
  for (const id of ['lb-weekly-top50', 'leaderboard-scope', 'lb-available', 'bounty-on-dogtag', 'bounty-raisers', 'intel-buy', 'intel-radius', 'payoff-station', 'claim-bounty', 'clear-bounty']) {
    assert.ok(byId[id], 'missing ' + id);
    assert.equal(byId[id].src, SOURCES.GRAPHIC, id);
  }
  // G2: all three raisers.
  for (const w of ['Consecutive kills', 'wiping squads', 'killing while Wanted']) assert.ok(byId['bounty-raisers'].text.includes(w), w);
  // G5 and G6.
  assert.match(byId['claim-bounty'].text, /killing a Wanted player and Exfilling with their Dog Tag/);
  for (const w of ['losing their Dog Tag', 'dying without Exfilling', 'paying off the Bounty at the in-game Bounty Station']) assert.ok(byId['clear-bounty'].text.includes(w), w);
  assert.match(byId['leaderboard-scope'].text, /globally or among Friends/);
  assert.ok(html.includes('>Claim or clear</h3>'));
});

test('extract-clears stays unpublished and is never stated as a fact', () => {
  const u = UNCONFIRMED_LIST.find((x) => x.id === 'extract-clears');
  assert.equal(u.text, 'The three listed ways to clear a bounty do not include extracting. Whether extracting affects it is not stated.');
  assert.ok(!FACTS.some((f) => f.id === 'extract-clears'));
  for (const f of FACTS) assert.ok(!/extract\w*[^.]*\bclears?\b|\bclears?\b[^.]*\bextract/i.test(f.text), 'extract-clears stated as fact: ' + f.id);
  assert.ok(html.includes(u.text));
});

test('title <= 60 and description <= 155 characters', () => {
  assert.equal(TITLE, 'DMZ Bounty System: Most Wanted & How to Pay Off a Bounty');
  for (const w of ['Most Wanted', 'Bounty Hunters', 'pay off', 'Confirmed vs unconfirmed']) assert.ok(DESC.includes(w), w);
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
  for (const u of UNCONFIRMED_LIST) assert.ok(html.includes(u.text.replace(/'/g, '&#x27;')), u.text);
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
  // The graphic says the station is available immediately, so it sits in the start group.
  const group = fob.reference.groups.find((g) => g.stations.includes(station));
  assert.equal(group.title, 'Available from the start');
  assert.ok(dmz.footer.links.explore.some((l) => l.href === '/dmz/bounties'));
});
