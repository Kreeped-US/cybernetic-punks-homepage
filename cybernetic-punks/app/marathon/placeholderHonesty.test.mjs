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

const REMOVED = ['We search across all platforms', 'already built and ready', 'wipes gear and progression'];

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

// Present-tense capability claims about player lookup / stats / leaderboard data (the 2026-07-20 removals plus
// this brief's). Future or conditional wording ("will", "when ... becomes available") is allowed.
const PRESENT_TENSE_CLAIMS = [
  /\bwe search\b/i, /\blook up any\b/i, /\btrack your marathon stats\b/i, /\binfrastructure is (already )?built\b/i,
  /\bis (already )?built and ready\b/i, /\brefresh(es)? in real time\b/i, /\bpairs your stats\b/i,
  /\bstats persist\b/i, /\bplayer (search|lookup) is live\b/i, /\bsearch any player across\b/i,
];

test('no present-tense player-lookup capability claim on either page', () => {
  for (const [name, html] of [['stats', statsHtml], ['leaderboard', boardHtml]]) {
    const text = visibleText(html);
    for (const re of PRESENT_TENSE_CLAIMS) assert.ok(!re.test(text), name + ' matches ' + re + ': ' + (text.match(new RegExp('.{0,60}' + re.source + '.{0,60}', 'i')) || [''])[0]);
  }
});
