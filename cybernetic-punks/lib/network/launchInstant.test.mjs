// lib/network/launchInstant.test.mjs
// Brief 100 (2026-10-21): DMZ launch state. A game that declares launch_at is live only at that confirmed
// instant (or status 'live'); DMZ declares it as null, so its launch DATE alone never flips anything. From
// the observed Early Access instant (early_access_at) until launch the hero badge reads 'IN EARLY ACCESS'.
// Every game that declares neither key behaves exactly as before: checked against a verbatim copy of the
// pre-Brief-100 logic at many instants.
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isGameLive, isInEarlyAccess, networkGameStatus, preLaunchEarlyAccess } from './gameStatus.js';
import { showLaunchNotify, launchText, emptyStateCopy } from './launchCopy.js';
import { heroStatusBadge } from '../games/heroModel.js';
import { dmzHubCopy } from '../dmz/hubCopy.js';
import { dmz } from '../games/dmz.js';
import { marathon } from '../games/marathon.js';
import { wardogs } from '../games/wardogs.js';
import { bodycam } from '../games/bodycam.js';
import { pubgDednet } from '../games/pubg-dednet.js';

const realNow = Date.now;
function at(iso) { Date.now = () => Date.parse(iso); }
afterEach(() => { Date.now = realNow; });
const src = (p) => readFileSync(new URL('../../' + p, import.meta.url), 'utf8');

// ── the pre-Brief-100 logic, copied verbatim (the baseline every non-gated game must match) ──────────
function oldDaysUntil(iso) {
  if (!iso) return null;
  var ms = new Date(iso + 'T00:00:00Z').getTime() - Date.now();
  if (isNaN(ms)) return null;
  var days = Math.ceil(ms / 86400000);
  return days > 0 ? days : 0;
}
function oldIsGameLive(cfg) {
  if (!cfg) return false;
  if (cfg.status === 'live') return true;
  return oldDaysUntil(cfg.launch_date) === 0;
}
function oldBadge(c) {
  c = c || {};
  if (oldIsGameLive(c)) return { label: c.earlyAccess ? 'EARLY ACCESS — LIVE' : 'LIVE', live: true };
  if (c.earlyAccess) return { label: 'EARLY ACCESS', live: false };
  if (c.status === 'revealed') return { label: 'REVEALED', live: false };
  return { label: 'PRE-LAUNCH', live: false };
}

const INSTANTS = ['2026-09-01T00:00:00Z', '2026-10-20T16:59:59Z', '2026-10-20T17:00:00Z', '2026-10-22T23:59:59Z',
  '2026-10-23T00:00:00Z', '2026-10-23T17:00:00Z', '2026-11-05T00:00:00Z', '2027-01-01T00:00:00Z'];

test('game-agnostic: Marathon, Wardogs, Bodycam, PUBG and ungated synthetic configs match the old logic exactly', () => {
  const synthetic = [
    { status: 'pre-launch', launch_date: '2026-10-23' },
    { status: 'pre-launch', launch_date: '2026-11-05', early_access_date: '2026-11-01' },
    { status: 'pre-launch', launch_date: '2026-11-05', earlyAccess: true },
    { status: 'revealed', launch_date: null },
    { status: 'pre-launch', launch_date: 'bad' },
  ];
  for (const t of INSTANTS) {
    at(t);
    for (const cfg of [marathon, wardogs, bodycam, pubgDednet].concat(synthetic)) {
      const tag = (cfg.slug || JSON.stringify(cfg)) + ' @ ' + t;
      assert.equal(Object.prototype.hasOwnProperty.call(cfg, 'launch_at'), false, tag + ': no launch_at');
      assert.equal(cfg.early_access_at, undefined, tag + ': no early_access_at');
      assert.equal(isGameLive(cfg), oldIsGameLive(cfg), tag);
      assert.deepEqual(heroStatusBadge(cfg), oldBadge(cfg), tag);
      assert.equal(isInEarlyAccess(cfg), false, tag);
      assert.equal(showLaunchNotify(cfg), !oldIsGameLive(cfg), tag);
    }
  }
});

test('DMZ as configured (launch_at null): never live on the date alone; Early Access badge from the observed instant', () => {
  assert.ok(Object.prototype.hasOwnProperty.call(dmz, 'launch_at') && dmz.launch_at === null, 'launch switch declared, unset');
  assert.equal(dmz.status, 'pre-launch');
  assert.equal(dmz.early_access_at, '2026-10-20T17:00:00Z');
  at('2026-10-20T16:59:59Z');
  assert.deepEqual(heroStatusBadge(dmz), { label: 'PRE-LAUNCH', live: false }, 'one second before Early Access');
  for (const t of ['2026-10-20T17:00:00Z', '2026-10-21T12:00:00Z', '2026-10-23T00:00:00Z', '2026-10-23T17:00:00Z', '2026-11-15T00:00:00Z']) {
    at(t);
    assert.equal(isGameLive(dmz), false, t);
    assert.equal(isInEarlyAccess(dmz), true, t);
    assert.deepEqual(heroStatusBadge(dmz), { label: 'IN EARLY ACCESS', live: true }, t);
    assert.deepEqual(networkGameStatus(dmz), { text: 'EA FROM OCT 20 / LAUNCH OCT 23', live: false }, t + ': /about keeps the dated label, never LIVE');
    assert.equal(showLaunchNotify(dmz), true, t + ': signup block stays');
    assert.equal(launchText(dmz, 'pre', 'post'), 'pre', t);
    assert.deepEqual(preLaunchEarlyAccess(dmz), { short: 'Oct 20', long: 'October 20' }, t);
    assert.match(dmzHubCopy().vsWarzoneTail, /Early Access began October 20/, t);
    assert.equal(emptyStateCopy(dmz, 'Keys', 'pre text').text, 'pre text', t);
  }
});

test('DMZ with the switch set: live exactly at the confirmed instant; status live is the manual override', () => {
  const confirmed = { ...dmz, launch_at: '2026-10-23T17:00:00Z' };
  at('2026-10-23T16:59:59Z');
  assert.equal(isGameLive(confirmed), false);
  assert.equal(heroStatusBadge(confirmed).label, 'IN EARLY ACCESS');
  at('2026-10-23T17:00:00Z');
  assert.equal(isGameLive(confirmed), true);
  assert.equal(isInEarlyAccess(confirmed), false, 'Early Access ends at launch');
  assert.deepEqual(heroStatusBadge(confirmed), { label: 'LIVE', live: true });
  assert.deepEqual(networkGameStatus(confirmed), { text: 'LIVE', live: true });
  assert.equal(showLaunchNotify(confirmed), false);
  assert.equal(preLaunchEarlyAccess(confirmed), null);
  // manual override, at any time
  at('2026-10-21T12:00:00Z');
  assert.equal(isGameLive({ ...dmz, status: 'live' }), true);
  // a malformed instant never flips (fails safe: stays pre-launch)
  assert.equal(isGameLive({ ...dmz, launch_at: 'tomorrow' }), false);
});

test('/dmz countdown (R4 option b): from day 0 until launch it reads "Launches October 23", never "T-Minus 0 Days"', () => {
  const page = src('app/dmz/page.js');
  // The T-Minus number renders only while days remain; day 0 (not live) renders the launch-date label.
  assert.ok(page.includes('{daysToLaunch > 0 ? ('), 'T-Minus only while days remain');
  assert.ok(page.includes("{'Launches ' + launchMonthDay}"), 'day-0 label');
  assert.equal(page.split('>T-Minus<').length - 1, 1, 'one T-Minus render path');
  assert.ok(page.includes("var launchMonthDay = new Date(dmz.launch_date + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: 'UTC' });"));
  assert.equal(new Date(dmz.launch_date + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: 'UTC' }), 'October 23');
  // The same day count the page uses: > 0 before 2026-10-23T00:00Z, 0 from then on (while launch_at is unset).
  const days = () => Math.max(0, Math.ceil((new Date(dmz.launch_date + 'T00:00:00Z').getTime() - Date.now()) / 86400000));
  at('2026-10-22T23:59:59Z'); assert.equal(days(), 1);
  at('2026-10-23T00:00:00Z'); assert.equal(days(), 0); assert.equal(isGameLive(dmz), false, 'day 0, not live -> the label shows');
  at('2026-10-24T12:00:00Z'); assert.equal(days(), 0); assert.equal(isGameLive(dmz), false);
});

test('home page: the DMZ countdown says LIVE only when isGameLive(dmz) is true', () => {
  const home = src('app/page.js');
  assert.ok(home.includes('{dmzDays > 0 && !dmzLive ? <>'), 'countdown only while not live');
  assert.ok(home.includes(": !dmzLive ? <>&#9670; DMZ LAUNCHES <b>{(eaDateLabel(dmz.launch_date) || '').toUpperCase()}</b></> : <>&#9670; DMZ IS <b>LIVE</b></>}"));
});
