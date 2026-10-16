// lib/marathon/rankedStatus.test.mjs
// Ranked status (2026-10-16): one static source of truth, no clock. The visible Ranked copy on
// sitrep, status, ranked, leaderboard, intel and guides/[category] must not carry the stale
// rotation / June-14 / "Bungie confirmed" claims (no first-party post states a schedule or a
// return date; the pause is attributed to @MarathonDevTeam on X).
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
};
const FORBIDDEN = ['REOPENS SAT', 'Saturday 10AM PT', 'returns June 14', 'Bungie confirmed Ranked'];

test('constant is pinned: OFFLINE, no return date, attributed strings', () => {
  assert.deepEqual(RANKED_STATUS, {
    state: 'OFFLINE',
    label: 'OFFLINE',
    sub: 'NO RETURN DATE ANNOUNCED',
    noReturnDate: 'Bungie has not announced when Ranked returns.',
    pauseAttribution: 'per @MarathonDevTeam on X (Sep 16, 2026)',
    finalWindowAttribution: 'Per @MarathonDevTeam on X (Sep 17, 2026), the Sep 20-24 Ranked Cryo Archive window was the final Ranked window of Season 2.',
    statusPageSub: 'Ranked is offline during the Nightfall Refresh (Oct 6 - Dec 7), per @MarathonDevTeam on X (Sep 16, 2026). Bungie has not announced when Ranked returns.',
  });
  for (const v of Object.values(RANKED_STATUS)) assert.ok(!/[^\x00-\x7f]/.test(v), 'ASCII: ' + v);
});

test('no clock: still OFFLINE with the date mocked to 2026-12-09', () => {
  mock.timers.enable({ apis: ['Date'], now: new Date('2026-12-09T12:00:00Z') });
  try {
    assert.equal(new Date().toISOString(), '2026-12-09T12:00:00.000Z');
    assert.equal(getRankedStatus().state, 'OFFLINE');
    assert.equal(getRankedStatus().label, 'OFFLINE');
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
});

test('ranked pill reads the constant; no pause window, no Dec 8 flip', () => {
  const c = code(read(PAGES.ranked));
  assert.ok(c.includes("import { RANKED_STATUS } from '@/lib/marathon/rankedStatus';"));
  assert.ok(c.includes('{RANKED_STATUS.label}'));
  assert.ok(!/RANKED_PAUSE_START|RANKED_PAUSE_END|rankedStatus\(\)|setInterval|QUEUE LIVE/.test(c));
  assert.ok(!c.includes("{isPaused ? 'PAUSED OCT 6 - DEC 7' : 'QUEUE LIVE'}"), 'pill no longer date-labelled');
  assert.ok(c.includes("a: 'No. Per @MarathonDevTeam on X (Sep 16, 2026), Ranked does not run during the Nightfall Refresh (Oct 6 - Dec 7, 2026). Bungie has not announced when Ranked returns. In the meantime,"));
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
});

test('stale strings are gone from the touched pages (code, not comments)', () => {
  for (const [name, p] of Object.entries(PAGES)) {
    const c = code(read(p));
    for (const s of FORBIDDEN) {
      // Known exception, deliberately left for the next brief: two RankedClient lines that
      // describe the Season 2 weekend window ("When it is running..." / "When running...").
      if (name === 'ranked' && s === 'Saturday 10AM PT') {
        assert.equal(c.split(s).length - 1, 2, 'RankedClient: exactly the 2 deferred weekend-window lines remain');
        continue;
      }
      assert.ok(!c.includes(s), name + ' still contains "' + s + '"');
    }
  }
});
