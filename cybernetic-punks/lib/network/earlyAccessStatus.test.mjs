// lib/network/earlyAccessStatus.test.mjs
// Optional early_access_date (lib/network/gameStatus.js; DMZ sets '2026-10-20'): the status label reads
// "EA FROM OCT 20 / LAUNCH OCT 23" until the unchanged live flip (dmz.launch_date 00:00Z), the /dmz hero
// "Early Access from October 20" line, the gated eligibility line and the home "EARLY ACCESS OCT 20" text
// show only before that flip, the entity-hub empty states switch tense on it, and the EA date is never
// compared with the clock. Every other game's networkGameStatus/isGameLive output is frozen against the
// baseline recorded on main 36b97c8d before this change (2026-10-12).
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { networkGameStatus, isGameLive, preLaunchEarlyAccess } from './gameStatus.js';
import { emptyStateCopy } from './launchCopy.js';
import { dmz } from '../games/dmz.js';
import { marathon } from '../games/marathon.js';
import { wardogs } from '../games/wardogs.js';
import { bodycam } from '../games/bodycam.js';
import { pubgDednet } from '../games/pubg-dednet.js';
import { DMZ_ENTITIES } from '../dmz/entities.js';
import { BUILDS_HUB } from '../dmz/buildsHub.js';
// LAUNCH CONFIRMED (simulated, 2026-10-21): since Brief 100 DMZ is launch-instant gated (lib/games/dmz.js
// launch_at; null until Justin confirms the launch hour). These post-launch assertions describe the site AFTER
// that switch, so this file sets the confirmed instant to the original flip, 2026-10-23T00:00:00Z. The real
// unset config is covered by lib/network/launchInstant.test.mjs (never live on the date alone).
dmz.launch_at = '2026-10-23T00:00:00Z';

const realNow = Date.now;
function at(iso) { Date.now = () => Date.parse(iso); }
afterEach(() => { Date.now = realNow; });
const src = (p) => readFileSync(new URL('../../' + p, import.meta.url), 'utf8');

const INSTANTS = ['2026-10-14T12:00:00Z', '2026-10-21T12:00:00Z', '2026-10-22T23:59:59Z', '2026-10-23T00:00:00Z', '2026-10-24T12:00:00Z'];
const PRE_FLIP = new Set(INSTANTS.slice(0, 3));

// Baseline recorded on main 36b97c8d (before this change): every game except DMZ must stay identical.
const BASELINE = {
  marathon: ['LIVE', true],
  wardogs: ['LIVE', true],
  bodycam: ['LIVE', true],
  'pubg-dednet': ['REVEALED', false],
};
const GAMES = { marathon, wardogs, bodycam, 'pubg-dednet': pubgDednet };

test('every non-DMZ game: networkGameStatus and isGameLive identical to the baseline at all five instants', () => {
  for (const t of INSTANTS) {
    at(t);
    for (const [slug, cfg] of Object.entries(GAMES)) {
      assert.deepEqual(networkGameStatus(cfg), { text: BASELINE[slug][0], live: BASELINE[slug][1] }, slug + ' @ ' + t);
      assert.equal(isGameLive(cfg), BASELINE[slug][1], slug + ' @ ' + t);
      assert.equal(cfg.early_access_date, undefined, slug + ' has no early_access_date');
    }
  }
});

test('DMZ at each instant: label, isGameLive, hero/home Early Access text, entity empty-state tense', () => {
  assert.equal(dmz.early_access_date, '2026-10-20');
  assert.equal(dmz.launch_date, '2026-10-23', 'live-flip date unchanged');
  assert.ok(!dmz.earlyAccess, 'the earlyAccess flag is not set for DMZ');
  const HUBS = [['Keys', DMZ_ENTITIES.keys], ['Missions', DMZ_ENTITIES.missions], ['Items', DMZ_ENTITIES.items], ['Locations', DMZ_ENTITIES.pois], ['Builds', BUILDS_HUB]];
  for (const t of INSTANTS) {
    at(t);
    const pre = PRE_FLIP.has(t);
    // Only the pre-flip label changed (baseline: "ARRIVES OCT 23"); the flip itself is unchanged.
    assert.deepEqual(networkGameStatus(dmz), pre ? { text: 'EA FROM OCT 20 / LAUNCH OCT 23', live: false } : { text: 'LIVE', live: true }, t);
    assert.equal(isGameLive(dmz), !pre, t);
    // The /dmz hero line, the gated eligibility line and the home secondary text all hang on this value.
    assert.deepEqual(preLaunchEarlyAccess(dmz), pre ? { short: 'Oct 20', long: 'October 20' } : null, t);
    for (const [plural, entity] of HUBS) {
      const c = emptyStateCopy(dmz, plural, entity.hubEmpty);
      if (pre) {
        assert.equal(c.heading, 'Awaiting launch', plural + ' @ ' + t);
        assert.match(c.text, /Early Access opens October 20/, plural + ' @ ' + t);
      } else {
        assert.equal(c.text, 'DMZ is live. Verified ' + plural.toLowerCase() + ' are added here as each one is confirmed in-game.', plural + ' @ ' + t);
        assert.doesNotMatch(c.heading + ' ' + c.text, /Early Access|October|launch/i, plural + ' @ ' + t);
      }
    }
  }
});

test('the Early Access date is never compared with the clock (no "Early Access is live/has started")', () => {
  // Before the EA date, on it, and after it (but before launch) the label and dates are identical.
  const seen = new Set();
  for (const t of ['2026-10-19T12:00:00Z', '2026-10-20T00:00:00Z', '2026-10-20T23:00:00Z', '2026-10-22T12:00:00Z']) {
    at(t);
    seen.add(JSON.stringify([networkGameStatus(dmz), preLaunchEarlyAccess(dmz)]));
  }
  assert.equal(seen.size, 1);
  const gs = src('lib/network/gameStatus.js');
  assert.ok(!/early_access_date[^\n]*Date\.now|daysUntil\(cfg\.early_access_date\)/.test(gs), 'EA date compared with the clock');
  for (const f of ['lib/network/gameStatus.js', 'app/dmz/page.js', 'app/page.js']) {
    // ("Early Access opens October 20" is a date statement, not a claim that it is open now.)
    assert.ok(!/Early Access (is live|has started|is open now|now open)\b|EARLY ACCESS (LIVE|IS LIVE|OPEN)\b/i.test(src(f).split(/\r?\n/).filter((l) => !/^\s*(\/\/|\*|\{\/\*)/.test(l)).join('\n')), f);
  }
});

test('game-agnostic: the field only changes games that set it; the earlyAccess flag keeps its own label', () => {
  at('2026-10-14T12:00:00Z');
  const base = { status: 'pre-launch', launch_date: '2026-11-05' };
  assert.deepEqual(networkGameStatus(base), { text: 'ARRIVES NOV 5', live: false });
  assert.deepEqual(networkGameStatus({ ...base, early_access_date: '2026-11-01' }), { text: 'EA FROM NOV 1 / LAUNCH NOV 5', live: false });
  assert.deepEqual(networkGameStatus({ ...base, earlyAccess: true }), { text: 'EARLY ACCESS NOV 5', live: false });
  assert.deepEqual(networkGameStatus({ ...base, earlyAccess: true, early_access_date: '2026-11-01' }), { text: 'EARLY ACCESS NOV 5', live: false }, 'earlyAccess wins');
  assert.deepEqual(networkGameStatus({ ...base, early_access_date: 'not-a-date' }), { text: 'ARRIVES NOV 5', live: false }, 'bad EA date falls back');
  assert.deepEqual(networkGameStatus({ status: 'live', early_access_date: '2026-11-01' }), { text: 'LIVE', live: true });
  assert.equal(preLaunchEarlyAccess(base), null);
  assert.equal(preLaunchEarlyAccess({ ...base, early_access_date: 'bad' }), null);
  assert.deepEqual(preLaunchEarlyAccess({ ...base, early_access_date: '2026-11-01' }), { short: 'Nov 1', long: 'November 1' });
  // ASCII only, no middle dot.
  assert.match(networkGameStatus({ ...base, early_access_date: '2026-11-01' }).text, /^[\x20-\x7e]+$/);
});

test('page wiring: /dmz hero line + gated eligibility line, home secondary text, /about via the helper', () => {
  const page = src('app/dmz/page.js');
  assert.ok(page.includes('var dmzEA = preLaunchEarlyAccess(dmz);'));
  assert.ok(page.includes("{dmzEA && <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)', marginTop: 6 }}>{'Early Access from ' + dmzEA.long}</div>}"));
  assert.ok(page.includes('{!dmzLive && <p style={{ fontSize: 13, color: \'var(--text-secondary)\', lineHeight: 1.5, margin: \'10px 0 0\' }}>{DMZ_EARLY_ACCESS_LINE}</p>}'));
  // The countdown header label is unchanged ("Countdown Active" stays true: it still counts to launch).
  assert.ok(page.includes("{dmzLive ? 'Live Now' : 'Countdown Active'}"));
  const home = src('app/page.js');
  assert.ok(home.includes('var dmzEA = preLaunchEarlyAccess(dmz);'));
  assert.ok(home.includes("{dmzEA && <span style={{ fontSize: '0.85em', opacity: 0.8, whiteSpace: 'nowrap' }}>{'EARLY ACCESS ' + dmzEA.short.toUpperCase()}</span>}"));
  assert.ok(home.includes('&#9670; DMZ LAUNCHES IN <b>'), 'home countdown still counts to launch');
  // Post-launch pill markup is unchanged: "<diamond> DMZ IS <b>LIVE</b>".
  assert.ok(home.includes(': <>&#9670; DMZ IS <b>LIVE</b></>}'));
  assert.ok(src('app/(network)/about/page.js').includes('var st = networkGameStatus(cfg);'), '/about renders the helper label');
});

test('/about is ISR with a one-hour revalidate, so its status labels flip after a live date without a deploy', () => {
  const about = src('app/(network)/about/page.js');
  assert.equal((about.match(/^export const revalidate = 3600;$/m) || []).length, 1);
  assert.ok(!/^export const dynamic\b/m.test(about), 'not force-dynamic');
});
