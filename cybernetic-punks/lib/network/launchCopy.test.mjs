// lib/network/launchCopy.test.mjs
// Launch-dependent copy flips on isGameLive(dmz) at 2026-10-23T00:00Z with no edit. Each affected
// surface is rendered through the same helper its component uses, with Date.now pinned one second
// before and exactly at the launch instant:
//   - entity hub empty states: keys, missions, items, pois (DMZ_ENTITIES) + builds (BUILDS_HUB),
//     rendered by components/dmz/DmzEntityHub.js via emptyStateCopy
//   - /dmz Operations Deck badge + section note (PLANNED_TOOL_LABEL / PLANNED_TOOLS_NOTE)
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { emptyStateCopy, PLANNED_TOOL_LABEL, PLANNED_TOOLS_NOTE } from './launchCopy.js';
import { isGameLive } from './gameStatus.js';
import { dmz } from '../games/dmz.js';
import { DMZ_ENTITIES } from '../dmz/entities.js';
import { BUILDS_HUB } from '../dmz/buildsHub.js';

const realNow = Date.now;
const PRE = Date.parse('2026-10-22T23:59:59Z');
const POST = Date.parse('2026-10-23T00:00:00Z');
function at(ms) { Date.now = () => ms; }
afterEach(() => { Date.now = realNow; });

const SURFACES = [
  ['keys', DMZ_ENTITIES.keys],
  ['missions', DMZ_ENTITIES.missions],
  ['items', DMZ_ENTITIES.items],
  ['pois', DMZ_ENTITIES.pois],
  ['builds', BUILDS_HUB],
];

test('the flip instant is dmz.launch_date 00:00Z (no new date constant)', () => {
  assert.equal(dmz.launch_date, '2026-10-23');
  at(PRE); assert.equal(isGameLive(dmz), false);
  at(POST); assert.equal(isGameLive(dmz), true);
});

for (const [name, entity] of SURFACES) {
  test(name + ' hub empty state: PRE-LAUNCH keeps the dated line + "Awaiting launch"', () => {
    at(PRE);
    const c = emptyStateCopy(dmz, entity.plural, entity.hubEmpty);
    assert.equal(c.heading, 'Awaiting launch');
    assert.equal(c.text, entity.hubEmpty);
    assert.match(c.text, /launches October 23, 2026/);
  });

  test(name + ' hub empty state: POST-LAUNCH says live + verified-as-confirmed, no date/count/tool', () => {
    at(POST);
    const c = emptyStateCopy(dmz, entity.plural, entity.hubEmpty);
    assert.equal(c.heading, 'None verified yet');
    assert.equal(c.text, 'DMZ is live. Verified ' + entity.plural.toLowerCase() + ' are added here as each one is confirmed in-game.');
    assert.doesNotMatch(c.heading + ' ' + c.text, /launch|October|2026|\d|Gunsmith|tool|land here|as the zone opens/i);
  });
}

test('exact post-launch strings per surface', () => {
  at(POST);
  const text = (e) => emptyStateCopy(dmz, e.plural, e.hubEmpty).text;
  assert.equal(text(DMZ_ENTITIES.keys), 'DMZ is live. Verified keys are added here as each one is confirmed in-game.');
  assert.equal(text(DMZ_ENTITIES.missions), 'DMZ is live. Verified missions are added here as each one is confirmed in-game.');
  assert.equal(text(DMZ_ENTITIES.items), 'DMZ is live. Verified items are added here as each one is confirmed in-game.');
  assert.equal(text(DMZ_ENTITIES.pois), 'DMZ is live. Verified locations are added here as each one is confirmed in-game.');
  assert.equal(text(BUILDS_HUB), 'DMZ is live. Verified builds are added here as each one is confirmed in-game.');
});

test('Operations Deck: badge + note are honest and identical before and after launch', () => {
  for (const ms of [PRE, POST]) {
    at(ms);
    assert.equal(PLANNED_TOOL_LABEL, 'In development');
    assert.equal(PLANNED_TOOLS_NOTE, 'Planned - not live yet');
    assert.doesNotMatch(PLANNED_TOOL_LABEL + ' ' + PLANNED_TOOLS_NOTE, /at launch|go live|live now/i);
  }
});

test('/dmz page source: the 3 deck badges + note use the shared constants; no launch-promise copy left', () => {
  const src = readFileSync(new URL('../../app/dmz/page.js', import.meta.url), 'utf8');
  assert.equal(src.split('{PLANNED_TOOL_LABEL}').length - 1, 3);
  assert.equal(src.split('{PLANNED_TOOLS_NOTE}').length - 1, 1);
  assert.doesNotMatch(src, /Live at launch|Tools go live with the zone|Live tier rankings|Live rankings, moved/);
  const hub = readFileSync(new URL('../../components/dmz/DmzEntityHub.js', import.meta.url), 'utf8');
  assert.match(hub, /emptyStateCopy\(dmz, entity\.plural, entity\.hubEmpty\)/);
  assert.doesNotMatch(hub, />\s*Awaiting launch\s*</);
});

test('game-agnostic: another game config gets its own name, and a status:live game is post-launch', () => {
  const other = { displayName: 'Wardogs', status: 'live', launch_date: '2026-09-10' };
  const c = emptyStateCopy(other, 'Weapons', 'pre');
  assert.equal(c.text, 'Wardogs is live. Verified weapons are added here as each one is confirmed in-game.');
});
