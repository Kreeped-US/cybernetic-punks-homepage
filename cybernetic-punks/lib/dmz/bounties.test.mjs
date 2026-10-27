// lib/dmz/bounties.test.mjs
// /dmz/bounties: sourced facts carry no number the sources do not state, no FAQPage schema, title and
// description lengths, the explicit sitemap entry, the visible counts / checked line / update log, and
// the internal links (FOB station, footer) that point at the page, the Bounty Leaderboard graphic facts,
// unique ids, and "Most Wanted" only as the official term attributed to that graphic.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SOURCES, FACTS, UNCONFIRMED_LIST, UPDATE_LOG, FAQ, LAST_UPDATED, CONTENT_CHANGED, TITLE, DESC, PAGE_URL, VIDEO_EXAMPLE_NOTE, BOSS_REWARDS_POINTER, counts } from './bounties.js';
import { dmz } from '../games/dmz.js';
import { loadComponent, render } from '../games/jsxHarness.test-helper.mjs';

// Brief 188: the source-check entries (an observation entry is not a source check and does not move LAST_UPDATED).
const CHECKS = UPDATE_LOG.filter((u) => u.kind !== 'observation');

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
  // The log line for this pass (the third and fourth passes, also 2026-10-12, sit above it), and every id it names exists.
  const log = UPDATE_LOG.find((u) => (u.adds || []).includes('dogtag-case-level20'));
  assert.equal(CHECKS.indexOf(log), 3);
  assert.equal(log.date, '2026-10-12');
  assert.deepEqual(log.adds, ['dogtag-case-level20']);
  assert.deepEqual([...log.revises].sort(), ['lb-available', 'lb-weekly-top50', 'leaderboard-tracks', 'lt-case-broadcast', 'lt-case-leave']);
  for (const id of [...log.adds, ...log.revises]) assert.ok(byId[id], id);
  // This pass added one fact: 44 confirmed (counts after the third pass are pinned in its own test).
  assert.equal(counts().confirmed, 44);
  assert.ok(html.includes('44 confirmed'));
  // The changed facts render (apostrophes are HTML-escaped by React).
  for (const id of ['lt-case-leave', 'dogtag-case-level20', 'lb-weekly-top50', 'leaderboard-tracks']) assert.ok(html.includes(byId[id].text.replace(/'/g, '&#x27;')), 'not rendered: ' + id);
  for (const id of ['lb-available', 'lt-case-broadcast', 'lt-case-leave']) assert.ok(html.includes(byId[id].note.replace(/'/g, '&#x27;').replace(/"/g, '&quot;')), 'note not rendered: ' + id);
});

test('claim-bounty wording (2026-10-12): the Hunter Exfils with the Wanted player\'s Dog Tag, never "their"', () => {
  const byId = Object.fromEntries(FACTS.map((f) => [f.id, f]));
  assert.equal(byId['claim-bounty'].text, 'Hunters claim a Bounty by killing a Wanted player and Exfilling with that player\'s Dog Tag.');
  assert.equal(byId['claim-bounty'].src, SOURCES.GRAPHIC);
  assert.equal(byId['claim-bounty'].loc, undefined);
  // No claim-rule sentence anywhere in the page copy says "with their Dog Tag" (ambiguous: the hunter's own tag?).
  for (const t of ALL_TEXT()) assert.ok(!/with their Dog Tag/i.test(t), '"with their Dog Tag" in: ' + t);
  assert.ok(!html.includes('Exfilling with their Dog Tag'));
  assert.ok(html.includes('Exfilling with that player&#x27;s Dog Tag.'));
  assert.match(FAQ.find((f) => f.q === 'How is a bounty claimed or cleared?').a, /^Per the official graphic, hunters claim a Bounty by killing a Wanted player and Exfilling with that player's Dog Tag\. /);
  assert.match(byId['dogtag-payouts'].note, /hunters claim a Bounty by killing a Wanted player and Exfilling with that player's Dog Tag\.$/);
  // The log line for this pass, newest first; counts unchanged.
  const log = CHECKS[0];
  assert.deepEqual([log.date, log.text, log.revises], ['2026-10-12', 'Clarified whose Dog Tag a Hunter Exfils with to claim a Bounty (the Wanted player\'s).', ['claim-bounty']]);
  assert.deepEqual(counts(), { confirmed: 44, unconfirmed: 15 });
  assert.equal(LAST_UPDATED, '2026-10-12');
});

test('graphic source (2026-10-12): official @CallofDuty post and image URLs; intel-radius lists only what is unpublished', () => {
  // The source: label records who posted it, when, and that the text was supplied, not fetched.
  assert.deepEqual(SOURCES.GRAPHIC, {
    label: 'official Bounty Leaderboard FOB Station Intel graphic, posted by @CallofDuty on X, Oct 9, 2026 (observed by Justin)',
    href: 'https://x.com/CallofDuty/status/2108607750616097114',
    alt: 'https://pbs.twimg.com/media/HUNGInXa8AA11p9.jpg',
    altLabel: 'image',
    date: '2026-10-09',
  });
  // The page renders it as two citation links (post + image), and the WebPage JSON-LD cites the post.
  assert.ok(html.includes('href="https://x.com/CallofDuty/status/2108607750616097114"'));
  assert.ok(html.includes('href="https://pbs.twimg.com/media/HUNGInXa8AA11p9.jpg"'));
  const wp = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1])).find((b) => b['@type'] === 'WebPage');
  assert.ok(wp.citation.some((c) => c.url === SOURCES.GRAPHIC.href && c.name === SOURCES.GRAPHIC.label && c.datePublished === '2026-10-09'));
  // intel-radius: unpublished specifics plus both official descriptions, neither called the same nor in conflict.
  const r = UNCONFIRMED_LIST.find((u) => u.id === 'intel-radius');
  assert.equal(r.text, 'The Intel circle size and refresh interval at each Wanted level, and how many Wanted tiers change the size, are not published. The official graphic says higher levels of notoriety reveal more of the target\'s vicinity. Deep Dive Part 2 (Killer Visibility) says the circle shrinks and updates more rapidly the more Wanted the player is.');
  assert.ok(!/reconcil|conflict|contradict|disagree|same mechanic|differ/i.test(r.text));
  assert.ok(!FACTS.some((f) => f.id === 'intel-radius'));
  assert.ok(html.includes(r.text.replace(/'/g, '&#x27;')));
  assert.equal(counts().unconfirmed, 15);
  // The log line for this pass (the claim-bounty wording pass, also 2026-10-12, sits above it).
  const log = UPDATE_LOG.find((u) => (u.revises || []).includes('intel-radius'));
  assert.equal(CHECKS.indexOf(log), 1);
  assert.equal(log.date, '2026-10-12');
  assert.deepEqual(log.revises, ['intel-radius']);
  assert.equal(LAST_UPDATED, '2026-10-12');
});

test('Deep Dive Part 2 third pass (2026-10-12): pay-off wording, kill start rule, revive rule, four new open items', () => {
  const byId = Object.fromEntries(FACTS.map((f) => [f.id, f]));
  const open = Object.fromEntries(UNCONFIRMED_LIST.map((u) => [u.id, u]));
  // 1. Pay-off says only what L316 says: no "any", no timing.
  assert.equal(byId['payoff-any-bounty'].text, 'A player with a Bounty can pay their own Bounty off with DMZ Cash at a Bounty Station within Hajin.');
  assert.deepEqual([byId['payoff-any-bounty'].src, byId['payoff-any-bounty'].loc], [SOURCES.PART2, 'PvP Killer: Losing a Bounty']);
  for (const t of ALL_TEXT()) {
    assert.ok(!/\bany player with a Bounty\b|\bany Bounty\b/i.test(t), '"any" pay-off wording in: ' + t);
    assert.ok(!/pay[- ]?off[^.]*\b(before|only when|only once|after) (you are |they are |a player is )?Wanted\b/i.test(t) || /not stated/.test(t), 'pay-off timing stated in: ' + t);
  }
  const payFaq = FAQ.find((f) => f.q === 'How do you pay off a bounty in DMZ?').a;
  assert.match(payFaq, /a player with a Bounty can pay their own Bounty off with DMZ Cash at a Bounty Station within Hajin\. When the Bounty Station offers the pay-off is not stated, and the cost has not been published\.$/);
  // 3. Kill start rule from L304 / L295 / L305; no "eventually" anywhere.
  assert.equal(open['kill-threshold'].text, 'How much each kill adds to a Bounty is not published.');
  assert.equal(byId['bounty-on-dogtag'].src, SOURCES.GRAPHIC);
  assert.equal(byId['bounty-on-dogtag'].note, 'Deep Dive Part 2 says the same: its "PvP Killer: Most Wanted System" section says a kill earns a Bounty immediately, listed on the killer\'s own Dog Tag.');
  assert.equal(FAQ.find((f) => f.q === 'How many kills does it take to get a bounty?').a, 'One. Deep Dive Part 2 says a kill earns a Bounty immediately, listed on the killer\'s own Dog Tag, and that taking down four Operators, counted across deployments, makes a player Wanted. The official graphic says kill chains, squad wipes and kills while Wanted raise a Bounty. How much each kill adds is not published.');
  for (const t of ALL_TEXT()) assert.ok(!/\beventually\b/i.test(t), '"eventually" in: ' + t);
  // 5. clear-revived carries L314's opening condition and does not widen it.
  assert.equal(byId['clear-revived'].text, 'You lose your Bounty if you exfil without your Dog Tag because another player killed you, took the tag and extracted with it, whether or not you were revived.');
  assert.deepEqual([byId['clear-revived'].src, byId['clear-revived'].loc], [SOURCES.PART2, 'PvP Killer: Losing a Bounty']);
  // 4. Four new open items, exact text, in UNCONFIRMED_LIST only.
  const NEW_OPEN = {
    'revive-alone': 'Whether a player who is revived, and whose Dog Tag was not taken, keeps or loses their Bounty is not stated. Deep Dive Part 2 covers a revive only when another player took the Dog Tag and extracted with it.',
    'payoff-timing': 'When the Bounty Station offers the pay-off, before a player is Wanted or only once they are Wanted, is not stated. Deep Dive Part 2 gives no condition other than having a Bounty.',
    'four-kill-counter': 'Deep Dive Part 2 says the four kills that make a player Wanted are counted across deployments. Whether that count ever resets, and on what, is not stated.',
    'hunters-weekly': 'Whether the Bounty Hunters list is updated weekly is not stated: Deep Dive Part 2 gives a weekly update only for the list of the biggest Bounties.',
  };
  for (const [id, text] of Object.entries(NEW_OPEN)) {
    assert.equal(open[id] && open[id].text, text, id);
    assert.ok(!byId[id], id + ' must not be a fact');
    assert.ok(html.includes(text.replace(/'/g, '&#x27;')), 'open item not rendered: ' + id);
  }
  // 6. The log line for this pass (the fourth pass, also 2026-10-12, sits above it).
  const log = UPDATE_LOG.find((u) => (u.opens || []).includes('revive-alone'));
  assert.equal(CHECKS.indexOf(log), 2);
  assert.equal(log.date, '2026-10-12');
  assert.deepEqual([...log.revises].sort(), ['bounty-on-dogtag', 'clear-revived', 'kill-threshold', 'payoff-any-bounty']);
  assert.deepEqual(log.opens, Object.keys(NEW_OPEN));
  for (const id of log.revises) assert.ok(byId[id] || open[id], id);
  assert.equal(LAST_UPDATED, '2026-10-12');
  // Counts after this pass: 44 confirmed, 15 unconfirmed, shown on the page.
  assert.deepEqual(counts(), { confirmed: 44, unconfirmed: 15 });
  assert.ok(html.includes('44 confirmed') && html.includes('15 unconfirmed'));
  assert.ok(!html.includes('eventually earn one'));
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
  // intel-radius stays open; its exact text is pinned in the graphic-source test.
  assert.ok(UNCONFIRMED_LIST.some((u) => u.id === 'intel-radius'));
  // The first Part 2 pass (the second, third and fourth passes, also 2026-10-12, sit above it and are tested separately).
  const log = UPDATE_LOG.find((u) => (u.adds || []).includes('wanted-four-kills'));
  assert.equal(CHECKS.indexOf(log), 4);
  assert.equal(log.date, '2026-10-12');
  assert.deepEqual(log.declassifies, ['early-access-eligibility']);
  assert.deepEqual(log.unconfirms, ['intel-radius']);
  assert.deepEqual([...log.adds].sort(), NEW.filter((id) => id !== 'early-access-eligibility').sort());
  for (const id of log.unconfirms) assert.ok(UNCONFIRMED_LIST.some((u) => u.id === id), id);
  // kill-threshold is narrowed to the per-kill value (L304 gives the start rule; see the third-pass test).
  assert.equal(UNCONFIRMED_LIST.find((u) => u.id === 'kill-threshold').text, 'How much each kill adds to a Bounty is not published.');
  // The graphic-sourced facts keep their source (one source per fact).
  for (const id of ['payoff-station', 'clear-bounty', 'lb-weekly-top50']) assert.equal(byId[id].src, SOURCES.GRAPHIC, id);
  assert.equal(LAST_UPDATED, '2026-10-12');
});

// Brief 125: DMZ is live, so the launch-date FAQ answer is in the past tense. Same question, same dates (October
// 16, 20 and 23, 2026) and the same sources (the Oct 9 announcement and Deep Dive Part 2); LAST_UPDATED is unchanged.
test('launch FAQ (Brief 125): question kept, answer past tense, no present-tense launch claim', () => {
  const f = FAQ.find((x) => x.q === 'When does DMZ launch?');
  assert.ok(f, 'question kept');
  assert.equal(f.a, 'DMZ\'s launch date was October 23, 2026, per the Oct 9 announcement from Call of Duty and Infinity Ward on X, which also gave October 20 as the start of DMZ Early Access. Deep Dive Part 2 said DMZ Early Access was for anyone who digitally pre-ordered or pre-purchased the Standard Digital or Vault Edition, and that Campaign Early Access would start October 16. Regions are not stated.');
  assert.doesNotMatch(f.a, /still says|\bbegins\b|\bstarts\b|\bis for anyone\b/);
  assert.deepEqual(nums(f.a).sort(), ['16', '2', '20', '2026', '23', '9'].sort());
  assert.ok(html.includes('DMZ&#x27;s launch date was October 23, 2026'), 'rendered as visible text');
  assert.equal(LAST_UPDATED, CHECKS[0].date);
});

// Brief 188: "in an official post" qualifiers, one pointer to the observed Boss Board figures (no figure here,
// outside BountyNet), payout-amounts still open, an observation log entry that does not move LAST_UPDATED.
test('observed Boss Board rewards: qualifiers, pointer outside BountyNet, no figure, LAST_UPDATED unchanged', () => {
  const byId = Object.fromEntries(FACTS.map((f) => [f.id, f]));
  assert.match(byId['dogtag-payouts'].text, /No amount is given in an official post\.$/);
  assert.match(byId['hunter-reward-scale'].text, /No amounts are published in an official post\.$/);
  assert.match(VIDEO_EXAMPLE_NOTE, /not values documented in an official post/);
  assert.ok(UNCONFIRMED_LIST.some((u) => u.id === 'payout-amounts') && !byId['payout-amounts'], 'payout-amounts stays open');
  assert.equal(BOSS_REWARDS_POINTER.href, '/dmz/bosses');
  assert.ok(!/\d|[$]/.test(BOSS_REWARDS_POINTER.text + BOSS_REWARDS_POINTER.linkText), 'no figure in the pointer');
  const p = (html.match(/<p data-boss-rewards-pointer=""[\s\S]*?<\/p>/g) || []);
  assert.equal(p.length, 1);
  assert.ok(p[0].includes('href="/dmz/bosses"') && p[0].replace(/<[^>]+>/g, '').replace(/&#x27;/g, "'").startsWith(BOSS_REWARDS_POINTER.text));
  // Brief 191: Bounty Net moved below the fact sections, so "outside" is checked by containment, not by order.
  const bnStart = html.indexOf('aria-labelledby="bountynet-h"');
  const bnBlock = html.slice(bnStart, html.indexOf('</section>', bnStart));
  assert.ok(bnBlock.includes('BOUNTYNET_STUB') && !bnBlock.includes('data-boss-rewards-pointer'), 'outside BountyNet');
  const obs = UPDATE_LOG.filter((u) => u.kind === 'observation');
  assert.equal(obs.length, 1);
  assert.ok(obs[0] === UPDATE_LOG[0] && obs[0].date === CONTENT_CHANGED && !/\d|[$]/.test(obs[0].text));
  assert.equal(LAST_UPDATED, '2026-10-12');
  assert.ok(!html.includes('Checked against source on ' + obs[0].date) && !html.includes('Checked against source on <!-- -->' + obs[0].date));
});

// Brief 191: answers first, simulator lower. Reorder and demote only: the same facts, sources and dates.
test('layout: short version under the status card, fact sections, then Bounty Net, then status; open items in a closed <details>', () => {
  const ids = [...html.matchAll(/<h2 id="([a-z-]+)"/g)].map((m) => m[1]);
  assert.deepEqual(ids, ['short', 'how', 'stations', 'video', 'leaderboard', 'dogtags', 'hunt', 'bountynet-h', 'status', 'faq']);
  assert.ok(html.indexOf('Intel status') < html.indexOf('id="short"'), 'short version after the Intel status card');
  assert.ok(html.includes('<h2 id="bountynet-h"') && html.includes('>Bounty Net: an illustrative simulator</h2>'));
  assert.ok(!html.includes('Bounty Net: the bounty lifecycle, simulated'));
  assert.ok(html.includes('An illustrative simulator: build a bounty, get hunted, then see it claimed or cleared.'));
  // The short version: five existing facts by id, each with its own source tag, rendered as in its own section.
  const short = html.slice(html.indexOf('id="short"'), html.indexOf('</section>', html.indexOf('id="short"')));
  const SHORT = ['wanted-four-kills', 'payoff-any-bounty', 'claim-bounty', 'clear-bounty', 'hunter-reward-scale'];
  const items = short.match(/<li[^>]*>[\s\S]*?<\/li>/g) || [];
  assert.equal(items.length, SHORT.length);
  SHORT.forEach((id, i) => {
    const f = FACTS.find((x) => x.id === id);
    assert.ok(f, id);
    assert.ok(items[i].includes(f.text.replace(/'/g, '&#x27;')), 'short item ' + i + ' is ' + id);
    assert.ok(items[i].includes('(Source: ') && items[i].includes(f.src.label.replace(/'/g, '&#x27;')), 'source tag for ' + id);
    // Same markup as in its own section: the short-version item appears verbatim in the rest of the page too.
    const rest = html.slice(html.indexOf('id="how"'));
    assert.ok(rest.includes(items[i]), id + ' renders identically in its own section');
  });
  // Every fact still renders in its own section exactly once; the five short-version facts appear twice in total.
  for (const f of FACTS) {
    const t = f.text.replace(/&/g, '&amp;').replace(/'/g, '&#x27;').replace(/"/g, '&quot;');
    assert.equal(html.split('<li style="margin-bottom:6px">' + t + ' ').length - 1, SHORT.includes(f.id) ? 2 : 1, f.id);
  }
  // Open items: closed <details> (no open attribute), counted summary, still in the server HTML; the log stays visible.
  const det = (html.match(/<details data-unconfirmed-list=""[^>]*>[\s\S]*?<\/details>/) || [''])[0];
  assert.ok(det && !/<details[^>]*\sopen/.test(det), 'closed by default');
  assert.ok(det.includes('<summary') && det.includes('What is not published yet (' + UNCONFIRMED_LIST.length + ')'));
  for (const u of UNCONFIRMED_LIST) assert.ok(det.includes(u.text.replace(/'/g, '&#x27;')), u.id);
  assert.ok(html.indexOf('</details>', html.indexOf('data-unconfirmed-list')) < html.indexOf('>Update log</h3>'), 'the update log is outside the <details>');
  // Unchanged: the status card text and the source-check date.
  assert.ok(html.includes('44 confirmed') && html.includes('15 unconfirmed'));
  assert.equal(LAST_UPDATED, '2026-10-12');
});

test('no digit appears as a bounty or cash value', () => {
  const VALUE = /([$]|\bcash\b|\bbount\w*)\W{0,3}\d|\d\W{0,3}(dmz cash|cash|bount\w*)/i;
  for (const t of ALL_TEXT()) assert.ok(!VALUE.test(t.replace(/Top 50/g, 'Top')), 'value-like number in: ' + t);
  // Brief 188: an element marked data-observed-value is stripped first (this page has none; the figures live on /dmz/bosses).
  const visible = html.replace(/<[a-z]+ data-observed-value=""[^>]*>[^<]*<\/[a-z]+>/g, ' ').replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/Top 50/g, 'Top');
  assert.ok(!html.includes('data-observed-value'), 'no observed figure on this page');
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
  assert.match(byId['claim-bounty'].text, /killing a Wanted player and Exfilling with that player's Dog Tag/);
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
  assert.equal(wp.dateModified, CONTENT_CHANGED);
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

test('sitemap: explicit /dmz/bounties entry with the fixed CONTENT_CHANGED lastmod', () => {
  const src = readFileSync(new URL('../sitemap/eligible.js', import.meta.url), 'utf8');
  assert.ok(src.includes("add(BASE + '/dmz/bounties', D, 'dmz-section', BOUNTIES_CONTENT_CHANGED, 'weekly', 0.8);"));
  assert.ok(src.includes("import { CONTENT_CHANGED as BOUNTIES_CONTENT_CHANGED } from '@/lib/dmz/bounties';"));
  assert.match(LAST_UPDATED, /^\d{4}-\d{2}-\d{2}$/);
  assert.match(CONTENT_CHANGED, /^\d{4}-\d{2}-\d{2}$/);
});

// Brief 128: two dates. LAST_UPDATED is the source-check date (visible "Checked against source on" line and
// BountyNet's "Last checked" labels); CONTENT_CHANGED is the last wording change (sitemap lastmod and
// WebPage.dateModified). A wording change never moves the source-check date.
test('two dates: CONTENT_CHANGED >= LAST_UPDATED; visible labels read LAST_UPDATED, dateModified reads CONTENT_CHANGED', () => {
  assert.equal(LAST_UPDATED, '2026-10-12');
  assert.equal(CONTENT_CHANGED, '2026-10-27');
  assert.ok(CONTENT_CHANGED >= LAST_UPDATED);
  assert.equal(LAST_UPDATED, CHECKS[0].date, 'LAST_UPDATED is the newest source-check entry');
  for (const u of UPDATE_LOG) assert.ok(u.kind === undefined || u.kind === 'observation', 'unknown log kind ' + u.kind);
  assert.ok(html.includes('Checked against source on ' + LAST_UPDATED) || html.includes('Checked against source on <!-- -->' + LAST_UPDATED));
  assert.ok(!html.includes('Checked against source on ' + CONTENT_CHANGED) && !html.includes('Checked against source on <!-- -->' + CONTENT_CHANGED));
  const page = readFileSync(new URL('../../app/dmz/bounties/page.js', import.meta.url), 'utf8');
  assert.ok(page.includes('Checked against source on {LAST_UPDATED}'));
  assert.ok(page.includes('dateModified: CONTENT_CHANGED,'));
  assert.ok(!/dateModified: LAST_UPDATED/.test(page));
  // BountyNet's "Not published yet. Last checked <date>." reads the model's lastChecked = LAST_UPDATED.
  assert.ok(readFileSync(new URL('./bountyNet.js', import.meta.url), 'utf8').includes('lastChecked: d.LAST_UPDATED,'));
  assert.ok(!html.includes('Last checked ' + CONTENT_CHANGED));
});

test('early-access fact (Brief 128): past tense, same dates and source, no observation claim', () => {
  const f = FACTS.find((x) => x.id === 'early-access');
  assert.equal(f.text, 'DMZ Early Access was set to begin October 20. The full launch card gave October 23.');
  assert.equal(f.src, SOURCES.OCT9);
  assert.doesNotMatch(f.text, /still says|\bbegins\b|\bbegan\b|\bopened\b/);
  assert.ok(html.includes('DMZ Early Access was set to begin October 20. The full launch card gave October 23.'));
});

test('early-access-eligibility fact (Brief 128): past tense, same dates, numbers and source, no observation claim', () => {
  const f = FACTS.find((x) => x.id === 'early-access-eligibility');
  assert.equal(f.text, 'DMZ Early Access from October 20 was for anyone who digitally pre-ordered or pre-purchased the Standard Digital or Vault Edition, on Xbox Series X|S, Xbox on PC, PlayStation 5, Battle.net, Steam and Nintendo Switch 2. Campaign Early Access was set to start earlier, on October 16, and launch was set for October 23. Regions are not stated, and the post said start dates could change and would depend on time zone.');
  assert.equal(f.src, SOURCES.PART2);
  assert.equal(f.loc, 'How Do I Access the Modern Warfare 4 Campaign and DMZ Early?');
  assert.doesNotMatch(f.text, /\bis for anyone\b|\bstarts earlier\b|\blaunch is October\b|\bmay change and depend\b|\bbegan\b|\bopened\b/);
  assert.ok(html.includes(f.text.replace(/'/g, '&#x27;')), 'rendered as visible text');
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
