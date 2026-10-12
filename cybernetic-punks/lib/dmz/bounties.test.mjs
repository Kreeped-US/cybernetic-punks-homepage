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
  // The simulator is tested on its own (lib/dmz/bountyNet.test.mjs); here it is a marker.
  const mod = await loadComponent('app/dmz/bounties/page.js', { stubs: { '@/components/game/BountyNet': "export default function BountyNet() { return 'BOUNTYNET_STUB'; }\n" } });
  html = render(mod.default);
});

test('facts: each has exactly one labelled source; only dates, the Top 50 list size and platform names carry numbers', () => {
  // Pinned per fact: the launch dates, the Top 50 list size, and the Early Access dates plus the platform
  // names PlayStation 5 and Nintendo Switch 2. Every other fact carries no digit.
  const PINNED = { 'early-access': ['20', '23'], 'lb-weekly-top50': ['50', '50'], 'early-access-eligibility': ['20', '5', '2', '16', '23'], 'dogtag-case-level20': ['20'] };
  for (const f of FACTS) {
    assert.ok(f.src && f.src.label && Object.values(SOURCES).includes(f.src), f.text);
    assert.deepEqual(nums(f.text), PINNED[f.id] || [], 'number in fact: ' + f.text);
    // A note may cite a source (Part 1, Part 2, June 6, Oct 5, Oct 8) or the official Top 50 list size, never a
    // game value. "Part 2" is stripped as a whole source name, like "Top 50": a bare 2 still fails.
    if (f.note) for (const n of nums(f.note.replace(/Top 50/g, 'Top').replace(/\bDeep Dive Part 2\b/g, 'Deep Dive Part'))) assert.ok(['1', '5', '6', '8'].includes(n), 'number in note: ' + f.note);
    // A Part 2 fact names the Part 2 section it came from; no other source uses a locator.
    if (f.src === SOURCES.PART2) assert.ok(typeof f.loc === 'string' && f.loc.length > 3, 'Part 2 fact without a section: ' + f.id);
    else assert.equal(f.loc, undefined, f.id);
  }
});

test('no invented numbers anywhere: only source dates, Part 1/2, the launch and Early Access dates, platforms and Top 50', () => {
  // Source dates (June 6, Oct 5/8/9/12, 2026-10-09, 2026-10-12), Part 1/2, the launch dates (Oct 16, 20, 23),
  // the 4 in the game title Modern Warfare 4, the platform names PlayStation 5 / Nintendo Switch 2, and the
  // official Top 50 list size. Nothing else -- no kill counts, prices, tiers or amounts.
  const allowed = new Set(['1', '2', '4', '5', '6', '8', '9', '12', '16', '20', '23', '50', '2026', '10', '09']);
  for (const t of ALL_TEXT()) for (const n of nums(t)) assert.ok(allowed.has(n), 'unexpected number ' + n + ' in: ' + t);
  for (const t of ALL_TEXT()) {
    assert.ok(!/[$]/.test(t), 'dollar sign in: ' + t);
    assert.ok(!/\b(onyx|steel)\b/i.test(t), 'Dog Tag level in: ' + t);
  }
  assert.ok(!/[$]\d/.test(html));
});

test('"Most Wanted" appears only as the official term, attributed to the graphic or Deep Dive Part 2', () => {
  for (const f of FACTS.filter((x) => /most wanted/i.test(x.text + ' ' + (x.note || '')))) assert.ok([SOURCES.GRAPHIC, SOURCES.PART2].includes(f.src), f.id);
  for (const f of FAQ.filter((x) => /most wanted/i.test(x.q + ' ' + x.a))) assert.match(f.a, /official (term from the )?(Bounty Leaderboard FOB Station Intel )?graphic|Deep Dive Part 2/, f.q);
  for (const u of UPDATE_LOG.filter((x) => /most wanted/i.test(x.text))) assert.match(u.text, /Bounty Leaderboard FOB Station Intel graphic|Deep Dive Part 2/);
  for (const u of UNCONFIRMED_LIST) assert.ok(!/most wanted/i.test(u.text), u.id);
});

test('"Killers"/"killers" appears nowhere in page copy; only quoted Part 2 section headings keep it', () => {
  // Part 2 calls "Killers" an unofficial name. No exceptions: every fact text and note (graphic-sourced
  // lb-weekly-top50 included), open item, FAQ answer, log line, title and description.
  for (const t of ALL_TEXT()) assert.ok(!/\bkillers\b/i.test(t), 'Killers/killers in: ' + t);
  // Rendered page: the word survives only inside a quoted section locator, e.g. "PvP Hunters and Killers".
  const LOCS = [...new Set(FACTS.map((f) => f.loc).filter(Boolean))];
  let visible = html.replace(/<script[\s\S]*?<\/script>/g, ' ');
  for (const l of LOCS) visible = visible.split(l).join(' ');
  assert.ok(!/\bkillers\b/i.test(visible.replace(/<[^>]+>/g, ' ')), 'Killers/killers rendered outside a section locator');
  // And the locators that hold it really are Part 2 headings.
  for (const l of LOCS.filter((x) => /killers/i.test(x))) assert.equal(l, 'Bounty Leaderboard: PvP Hunters and Killers');
});

test('Deep Dive Part 2 second pass (2026-10-12): Lieutenant case rule, Dog Tag Case Level 20, Part 2 credits', () => {
  const byId = Object.fromEntries(FACTS.map((f) => [f.id, f]));
  // c. The Boss Board rule now follows Part 2: exfil with the case; it may come from another player.
  const leave = byId['lt-case-leave'];
  assert.equal(leave.src, SOURCES.PART2);
  assert.equal(leave.loc, 'Lieutenants');
  assert.equal(leave.text, 'Exfilling with a Lieutenant\'s Dog Tag Case progresses the Boss Board, whether you got the case by killing the Lieutenant or took it from another player.');
  for (const f of FACTS) assert.ok(!/pick it up to progress|pick (it|the case) up to progress/i.test(f.text + ' ' + (f.note || '')), 'old pick-up rule in ' + f.id);
  // e. New fact, Part 2, dog tags group.
  const l20 = byId['dogtag-case-level20'];
  assert.deepEqual([l20.src, l20.loc, l20.section, l20.text], [SOURCES.PART2, 'Dog Tag Case', 'dogtags', 'The Dog Tag Case station unlocks at DMZ Player Level 20.']);
  // d and f. The graphic and Part 1 facts keep their one source; Part 2 is credited in the note, with its section.
  assert.equal(byId['lb-available'].src, SOURCES.GRAPHIC);
  assert.match(byId['lb-available'].note, /^Deep Dive Part 2 says the same: its "Forward Operating Base \(FOB\): Overview" section lists the Bounty Leaderboard among the stations to access first, and its Bounty Leaderboard section is headed "Available Immediately"\./);
  assert.equal(byId['lt-case-broadcast'].src, SOURCES.PART1);
  assert.equal(byId['lt-case-broadcast'].note, 'Deep Dive Part 2 (section "Lieutenants") confirms it: a Lieutenant always drops the case, and picking it up broadcasts your position, alerting rival squads.');
  // a and b. Neutral wording, sources unchanged.
  assert.match(byId['lb-weekly-top50'].text, /Top 50 Most Wanted human players \(players with a Bounty, who earn notoriety/);
  assert.match(byId['leaderboard-tracks'].text, /bounty hunters and players with a Bounty across the Exclusion Zone/);
  assert.equal(byId['leaderboard-tracks'].src, SOURCES.PART1);
  // The log line for this pass, newest first, and every id it names exists.
  const log = UPDATE_LOG[0];
  assert.equal(log.date, '2026-10-12');
  assert.deepEqual(log.adds, ['dogtag-case-level20']);
  assert.deepEqual([...log.revises].sort(), ['lb-available', 'lb-weekly-top50', 'leaderboard-tracks', 'lt-case-broadcast', 'lt-case-leave']);
  for (const id of [...log.adds, ...log.revises]) assert.ok(byId[id], id);
  // Counts: 44 confirmed, 11 unconfirmed, and the page shows them.
  assert.deepEqual(counts(), { confirmed: 44, unconfirmed: 11 });
  assert.ok(html.includes('44 confirmed') && html.includes('11 unconfirmed'));
  // The changed facts render (apostrophes are HTML-escaped by React).
  for (const id of ['lt-case-leave', 'dogtag-case-level20', 'lb-weekly-top50', 'leaderboard-tracks']) assert.ok(html.includes(byId[id].text.replace(/'/g, '&#x27;')), 'not rendered: ' + id);
  for (const id of ['lb-available', 'lt-case-broadcast', 'lt-case-leave']) assert.ok(html.includes(byId[id].note.replace(/'/g, '&#x27;').replace(/"/g, '&quot;')), 'note not rendered: ' + id);
});

test('Deep Dive Part 2: source, new facts, moved ids, narrowed open items', () => {
  assert.equal(SOURCES.PART2.href, 'https://www.callofduty.com/blog/2026/10/call-of-duty-modern-warfare-4-dmz-how-to-play-forward-operating-base-guide');
  assert.deepEqual([SOURCES.PART2.date, SOURCES.PART2.accessed], ['2026-10-09', '2026-10-12']);
  const byId = Object.fromEntries(FACTS.map((f) => [f.id, f]));
  const NEW = ['wanted-four-kills', 'wanted-proximity-alert', 'bounty-factors', 'wanted-list-free', 'intel-cost-scales', 'tacmap-circle', 'payoff-any-bounty', 'hunter-reward-scale', 'clear-revived', 'death-loses-bounty', 'most-wanted-weekly', 'board-columns', 'case-upgrades-payout', 'early-access-eligibility'];
  for (const id of NEW) assert.equal(byId[id] && byId[id].src, SOURCES.PART2, id);
  // Moves keep their ids: early-access-eligibility into FACTS, intel-radius back to UNCONFIRMED_LIST.
  assert.ok(!UNCONFIRMED_LIST.some((u) => u.id === 'early-access-eligibility'));
  assert.ok(!byId['intel-radius']);
  const radius = UNCONFIRMED_LIST.find((u) => u.id === 'intel-radius').text;
  assert.ok(/graphic/.test(radius) && /Part 2/.test(radius) && /not reconciled/.test(radius));
  // The first Part 2 pass (the second pass, also 2026-10-12, sits above it and is tested separately).
  const log = UPDATE_LOG.find((u) => (u.adds || []).includes('wanted-four-kills'));
  assert.equal(UPDATE_LOG.indexOf(log), 1);
  assert.equal(log.date, '2026-10-12');
  assert.deepEqual(log.declassifies, ['early-access-eligibility']);
  assert.deepEqual(log.unconfirms, ['intel-radius']);
  assert.deepEqual([...log.adds].sort(), NEW.filter((id) => id !== 'early-access-eligibility').sort());
  for (const id of log.unconfirms) assert.ok(UNCONFIRMED_LIST.some((u) => u.id === id), id);
  // kill-threshold presents both Part 2 wordings and picks neither.
  const kt = UNCONFIRMED_LIST.find((u) => u.id === 'kill-threshold').text;
  assert.ok(/eventually/.test(kt) && /immediately/.test(kt) && /not settled/.test(kt));
  // The graphic-sourced facts keep their source (one source per fact).
  for (const id of ['payoff-station', 'clear-bounty', 'lb-weekly-top50']) assert.equal(byId[id].src, SOURCES.GRAPHIC, id);
  assert.equal(LAST_UPDATED, '2026-10-12');
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
  // intel-radius (G3, second half) is no longer a fact: Part 2 describes the Intel area differently.
  for (const id of ['lb-weekly-top50', 'leaderboard-scope', 'lb-available', 'bounty-on-dogtag', 'bounty-raisers', 'intel-buy', 'payoff-station', 'claim-bounty', 'clear-bounty']) {
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
  assert.equal(u.text, 'Deep Dive Part 2 lists three ways to lose a Bounty and extracting is not one of them, but it does not say that extracting cannot clear one. Whether extracting affects a Bounty is not stated.');
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
