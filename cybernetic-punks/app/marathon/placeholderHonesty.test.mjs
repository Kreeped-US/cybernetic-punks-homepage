// app/marathon/placeholderHonesty.test.mjs
// Brief 333: the two Marathon placeholder pages (/marathon/stats, /marathon/leaderboard) make no present-tense
// claim of a player-lookup or leaderboard capability we do not have, and the stats page names its date and its two
// third-party sources. Renders the real server components through the JSX harness (no DB, no network).
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { loadComponent, render } from '../../lib/games/jsxHarness.test-helper.mjs';

const VIEWTRACKER_STUB = 'export default function ViewTracker() { return null; }\n';

let statsHtml, boardHtml;
before(async () => {
  const Stats = (await loadComponent('app/marathon/stats/page.js')).default;
  const Board = (await loadComponent('app/marathon/leaderboard/page.js', { stubs: { '@/components/ViewTracker': VIEWTRACKER_STUB } })).default;
  statsHtml = render(Stats);
  boardHtml = render(Board);
});

// Visible text only: drop the JSON-LD script, then the tags; decode the entities React emits.
function visibleText(html) {
  return html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
}

const REMOVED = [
  'We search across all platforms', 'already built and ready', 'wipes gear and progression',
  // Brief 334
  'everything in one view', 'Stack your stats', 'across wipes', 'filterable by platform, region',
  'HOW IT WORKS', 'Marathon supports full cross-play', 'Bungie has not opened an API', 'Marathon has no public stats API',
  'tracked snapshots since March 2026',
  'Track the top Marathon Runners worldwide', 'Marathon has no public ranked API', 'tracks the top competitive Runners',
  'reflects extraction efficiency', 'nobody has Marathon player stats', 'Live data activates when Bungie ships',
  'ACTIVATES WHEN BUNGIE API GOES LIVE', 'ACTIVATES WITH BUNGIE API', "pulled directly from Bungie's official Marathon API",
  'the way the Destiny 2 ecosystem works',
];

test('removed claims appear on neither page', () => {
  for (const [name, html] of [['stats', statsHtml], ['leaderboard', boardHtml]]) {
    for (const s of REMOVED) assert.ok(!html.includes(s), name + ' still contains: ' + s);
  }
  assert.ok(!statsHtml.includes('persist permanently'));
});

test('stats page states its date and links both third-party sources', () => {
  const text = visibleText(statsHtml);
  assert.ok(text.includes('As of November 10, 2026, we know of no public Marathon player-stats API from Bungie'));
  assert.ok(text.includes('Checked November 10, 2026: marathondb.gg/player-profiles and run.report (third-party sites, not Bungie).'));
  for (const url of ['https://marathondb.gg/player-profiles/', 'https://run.report/']) {
    const m = statsHtml.match(new RegExp('<a href="' + url.replace(/[.\/]/g, '\\$&') + '"[^>]*>'));
    assert.ok(m, 'missing link ' + url);
    assert.match(m[0], /rel="nofollow noopener noreferrer"/);
  }
  assert.ok(text.includes('When player data becomes available, you will be able to enter a Bungie Name, Steam ID, or gamertag.'));
  assert.ok(text.includes('We do not yet know how Marathon will expose per-player history across seasons, so we make no promise about it.'));
});

test('leaderboard FAQ says the ranked data is not available', () => {
  assert.ok(visibleText(boardHtml).includes('The leaderboard needs ranked player data from Bungie, which is not available to us yet.'));
});

test('Brief 334: stats steps, heading and FAQs are conditional; leaderboard hero says not live', () => {
  const s = visibleText(statsHtml);
  for (const t of [
    'HOW IT WILL WORK',
    'When player data becomes available, this view is planned to show extraction rates, K/D, weapon mastery, Runner Shell breakdown, and ranked history.',
    'When player data becomes available, you will be able to compare your stats with friends and other players.',
    'If Bungie exposes per-player history, we plan to track your performance over time. We do not yet know whether that history will span seasons.',
    'As of November 10, 2026, we know of no public Marathon player-stats API from Bungie, and nothing on this page can work without one.',
    'Right now the honest answer is that none of the Marathon tracker projects we checked (MarathonDB and Run Report) has live player stats, us included, and as of November 10, 2026, we know of no public Marathon player-stats API from Bungie.',
    "When player data becomes available, we aim to support lookup by Bungie Name, Steam ID, or gamertag. We have not confirmed which platforms' data any future API would include.",
    'There are no stats here to be accurate or inaccurate yet. If Bungie makes an official Marathon API available, we plan to pull data directly from it, and the refresh rate would depend on what that API supports. We will not fill the gap with manual entry, screenshot parsing, or third-party estimation, and we are not publishing estimated standings in the meantime.',
    'PLAYER SEARCH IS NOT LIVE. IT DEPENDS ON A BUNGIE API.',
  ]) assert.ok(s.includes(t), 'stats missing: ' + t);
  const b = visibleText(boardHtml);
  assert.ok(b.includes('A Marathon ranked leaderboard is planned here but is not live. It needs ranked player data from Bungie, which is not available to us yet. If Bungie makes ranked data publicly available, we plan to add it here.'));
  assert.ok(b.includes('As of November 10, 2026, we know of no public Marathon ranked-data API from Bungie.'));
  assert.ok(b.includes('LEADERBOARD DATA IS NOT LIVE. IT DEPENDS ON BUNGIE RANKED DATA.'));
  assert.ok(b.includes('A Marathon ranked leaderboard is planned here but is not live. It would list top ranked Runners once ranked player data is available to us, which it is not yet.'));
  assert.ok(b.includes('What we do have now: live Steam concurrent players on player count , and current shell and weapon tiers on the meta report'));
});

// Present-tense capability claims about player lookup / stats / leaderboard data (the 2026-07-20 removals plus
// this brief's). Future or conditional wording ("will", "when ... becomes available") is allowed.
const PRESENT_TENSE_CLAIMS = [
  /\bwe search\b/i, /\blook up any\b/i, /\btrack your marathon stats\b/i, /\binfrastructure is (already )?built\b/i,
  /\bis (already )?built and ready\b/i, /\brefresh(es)? in real time\b/i, /\bpairs your stats\b/i,
  /\bstats persist\b/i, /\bplayer (search|lookup) is live\b/i, /\bsearch any player across\b/i,
  // Brief 334
  /\beverything in one view\b/i, /\bstack your stats\b/i, /\bfilterable by\b/i, /\bhow it works\b/i,
];

test('no present-tense player-lookup capability claim on either page', () => {
  for (const [name, html] of [['stats', statsHtml], ['leaderboard', boardHtml]]) {
    const text = visibleText(html);
    for (const re of PRESENT_TENSE_CLAIMS) assert.ok(!re.test(text), name + ' matches ' + re + ': ' + (text.match(new RegExp('.{0,60}' + re.source + '.{0,60}', 'i')) || [''])[0]);
  }
});
