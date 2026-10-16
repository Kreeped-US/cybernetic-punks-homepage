// lib/marathon/rankedStatus.test.mjs
// Ranked status (2026-10-16): one static source of truth, no clock. The visible Ranked copy on
// sitrep, status, ranked, leaderboard, intel, guides/[category] and nightfall must not carry the
// stale rotation / June-14 / "Bungie confirmed" / "rework" claims (no first-party post states a
// schedule or a return date; the pause is attributed to Del Chafe III's Sep 16 X post, which has
// no end date and no "rework"; the Oct 6 - Dec 7 window is a separate, roadmap-calendar clause).
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { RANKED_STATUS, getRankedStatus } from './rankedStatus.js';

const read = (p) => readFileSync(new URL('../../' + p, import.meta.url), 'utf8');
// Code only: drop // line comments, /* */ blocks and JSX {/* */} comments, so historical
// changelog comments do not count as visible copy. (No source line here starts a string with //.)
const code = (src) => src.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '').split(/\r?\n/).filter((l) => !/^\s*\/\//.test(l)).join('\n');

const PAGES = {
  sitrep: 'app/marathon/sitrep/page.js',
  status: 'app/marathon/status/page.js',
  ranked: 'app/marathon/ranked/RankedClient.js',
  leaderboard: 'app/marathon/leaderboard/page.js',
  intel: 'app/marathon/intel/page.js',
  guidesCategory: 'app/marathon/guides/[category]/page.js',
  nightfall: 'app/marathon/nightfall/page.js',
};
const FORBIDDEN = ['REOPENS SAT', 'Saturday 10AM PT', 'returns June 14', 'Bungie confirmed Ranked'];

test('constant is pinned: OFFLINE, no return date, attributed strings', () => {
  assert.deepEqual(RANKED_STATUS, {
    state: 'OFFLINE',
    label: 'OFFLINE',
    sub: 'NO RETURN DATE ANNOUNCED',
    noReturnDate: 'Bungie has not announced when Ranked returns.',
    pauseAttribution: 'Per Marathon Game Director Del Chafe III (@MarathonDevTeam on X, Sep 16, 2026), Ranked is not available during the Nightfall Refresh.',
    changesAttribution: 'Del Chafe III said the team has ideas to make Ranked more exciting and rewarding, that those changes will not be ready for October, and that Ranked will not return in its current form.',
    windowClause: "Bungie's Oct 6 roadmap calendar covers the Nightfall Refresh as Oct 6 - Dec 7.",
    symbiosisDate: "Symbiosis arrives December 8 (Bungie's Oct 6 roadmap).",
    finalWindowAttribution: 'Per @MarathonDevTeam on X (Sep 17, 2026), the Sep 20-24 Ranked Cryo Archive window was the final Ranked window of Season 2.',
    statusPageSub: "Per Marathon Game Director Del Chafe III (@MarathonDevTeam on X, Sep 16, 2026), Ranked is not available during the Nightfall Refresh. Bungie's Oct 6 roadmap calendar covers the Nightfall Refresh as Oct 6 - Dec 7. Bungie has not announced when Ranked returns.",
  });
  for (const v of Object.values(RANKED_STATUS)) assert.ok(!/[^\x00-\x7f]/.test(v), 'ASCII: ' + v);
});

test('no clock: still OFFLINE with the date mocked to 2026-12-09', () => {
  mock.timers.enable({ apis: ['Date'], now: new Date('2026-12-09T12:00:00Z') });
  try {
    assert.equal(new Date().toISOString(), '2026-12-09T12:00:00.000Z');
    assert.equal(getRankedStatus().state, 'OFFLINE');
    assert.equal(getRankedStatus().label, 'OFFLINE');
    assert.equal(getRankedStatus().sub, 'NO RETURN DATE ANNOUNCED');
  } finally {
    mock.timers.reset();
  }
  const src = read('lib/marathon/rankedStatus.js');
  assert.ok(!/new Date|Date\.now|RANKED_PAUSE_END/.test(code(src)), 'no Date logic in the module');
});

test('sitrep and status cards read the constant; rotation logic is gone', () => {
  for (const p of [PAGES.sitrep, PAGES.status]) {
    const c = code(read(p));
    assert.ok(c.includes("import { getRankedStatus } from '@/lib/marathon/rankedStatus';"), p);
    assert.ok(!/RANKED_RETURN|getDay\(\)|toLocaleString\('en-US', \{ timeZone: 'America\/Los_Angeles' \}\)/.test(c), p + ' has no rotation/date logic');
    assert.ok(c.includes('var queueLabel = queueStatus.label;'), p);
  }
  assert.ok(code(read(PAGES.sitrep)).includes('var queueSub   = queueStatus.sub;'));
  assert.ok(code(read(PAGES.status)).includes('var queueSub   = queueStatus.statusPageSub;'));
  assert.ok(read(PAGES.status).includes("desc: 'When Ranked runs, its featured zone and Holotag targets rotate each window. Ranked is offline during the Nightfall Refresh.'"));
  assert.ok(code(read(PAGES.status)).includes("sub: 'Ranked hub + tier list',") && !read(PAGES.status).includes('Queue schedule + tier list'));
});

test('ranked pill, banner, tile and FAQs read the constant; no pause window, no Dec 8 flip', () => {
  const c = code(read(PAGES.ranked));
  assert.ok(c.includes("import { RANKED_STATUS } from '@/lib/marathon/rankedStatus';"));
  assert.ok(c.includes('{RANKED_STATUS.label}'));
  assert.ok(c.includes("var isPaused = RANKED_STATUS.state === 'OFFLINE';"));
  assert.ok(!/RANKED_PAUSE_START|RANKED_PAUSE_END|rankedStatus\(\)|setInterval|QUEUE LIVE/.test(c));
  // timeAgo() legitimately uses the clock; the status path (component start -> pill state) must not.
  const statusPath = c.slice(c.indexOf('export default function RankedClient'), c.indexOf('var isPaused'));
  assert.ok(statusPath.length > 0 && !/Date\.now\(\)|new Date\(/.test(statusPath), 'no clock on the status path');
  assert.ok(!c.includes('PAUSED OCT 6'), 'no dated pause label anywhere');
  assert.ok(c.includes('>OFFLINE - NIGHTFALL REFRESH</div>'), 'schedule tile has no dates');
  assert.ok(c.includes('>Ranked is not available during the Nightfall Refresh.</strong>'), 'banner');
  assert.ok(c.includes("a: 'No. ' + RANKED_STATUS.pauseAttribution + ' ' + RANKED_STATUS.noReturnDate + ' In the meantime, Sponsored Queues (kit-only Extraction) run every weekend and a rotating PvE schedule fills the gap. ' + RANKED_STATUS.symbiosisDate }"));
  assert.ok(!c.includes('beta - systems'), 'unsourced beta sentence removed');
  assert.ok(c.includes('>RANKED STATUS</span>') && !c.includes('>WEEKLY ROTATION</span>') && !c.includes('>ROTATING</span>'), 'weekly box relabelled');
  assert.ok(c.includes("a: 'No. ' + RANKED_STATUS.pauseAttribution + ' ' + RANKED_STATUS.changesAttribution + ' ' + RANKED_STATUS.noReturnDate }"));
});

test('no Dec 7 inside an @MarathonDevTeam attribution; window is its own sentence', () => {
  const re = /@MarathonDevTeam[^.]*Dec 7/;
  for (const v of Object.values(RANKED_STATUS)) assert.ok(!re.test(v), 'constant: ' + v);
  for (const [name, p] of Object.entries(PAGES)) assert.ok(!re.test(code(read(p))), name);
  assert.ok(!/@MarathonDevTeam/.test(RANKED_STATUS.windowClause));
  assert.ok(RANKED_STATUS.windowClause.startsWith("Bungie's Oct 6 roadmap calendar"));
  const rankedSentences = RANKED_STATUS.pauseAttribution + RANKED_STATUS.changesAttribution + RANKED_STATUS.noReturnDate;
  assert.ok(!/Dec(ember)? [78]/.test(rankedSentences), 'no date in the Ranked sentences');
});

test('"rework" is absent from visible Ranked copy', () => {
  for (const [name, p] of Object.entries(PAGES)) assert.ok(!/rework/i.test(code(read(p))), name + ' still says rework');
  for (const v of Object.values(RANKED_STATUS)) assert.ok(!/rework/i.test(v));
});

test('nightfall: Ranked lines attributed, Dec 7 attributed to the roadmap calendar', () => {
  const c = code(read(PAGES.nightfall));
  assert.ok(c.includes("import { RANKED_STATUS } from '@/lib/marathon/rankedStatus';"));
  assert.ok(c.includes("note: RANKED_STATUS.pauseAttribution + ' ' + RANKED_STATUS.noReturnDate, tone: 'paused' }"));
  assert.ok(c.includes('{RANKED_STATUS.pauseAttribution} {RANKED_STATUS.changesAttribution} {RANKED_STATUS.noReturnDate} See the'));
  assert.ok(c.includes("running through December 7 (per the calendar in Bungie\\'s Oct 6 roadmap post on Steam) before Symbiosis on December 8."));
});

test('FAQ answers: leaderboard, intel, guides/[category]', () => {
  const lb = code(read(PAGES.leaderboard));
  assert.ok(lb.includes("q: 'When does Marathon ranked return?',"));
  assert.ok(lb.includes("a: 'Bungie has not announced when Ranked returns. Per @MarathonDevTeam on X (Sep 17, 2026), the Sep 20-24 Ranked Cryo Archive window was the final Ranked window of Season 2.',"));
  assert.ok(lb.includes(RANKED_STATUS.noReturnDate) && lb.includes(RANKED_STATUS.finalWindowAttribution));
  const intel = code(read(PAGES.intel));
  assert.ok(intel.includes('The new Ranked queue opened June 14.'));
  assert.ok(!intel.includes('Open Play Week runs through June 9') && !intel.includes('opening June 14'));
  const gc = code(read(PAGES.guidesCategory));
  assert.ok(gc.includes("a: 'Ranked is offline during the Nightfall Refresh, and Bungie has not announced when it returns.' }"));
  assert.ok(gc.includes("a: 'Yes. Holotag targets rotated every Ranked window in Season 2. Ranked is currently offline.' }"));
  assert.ok(gc.includes('weapons, or events that rotated each Ranked window in Season 2.'));
  assert.ok(!gc.includes('rotate each Ranked window'));
});

test('stale strings are gone from the touched pages (code, not comments)', () => {
  for (const [name, p] of Object.entries(PAGES)) {
    const c = code(read(p));
    for (const s of FORBIDDEN) assert.ok(!c.includes(s), name + ' still contains "' + s + '"');
  }
});
