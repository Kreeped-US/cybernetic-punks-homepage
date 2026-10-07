// lib/network/launchCopy.test.mjs
// Launch-dependent copy flips on isGameLive(dmz) at 2026-10-23T00:00Z with no edit. Each affected
// surface is rendered through the same helper its component uses, with Date.now pinned one second
// before and exactly at the launch instant:
//   - entity hub empty states: keys, missions, items, pois (DMZ_ENTITIES) + builds (BUILDS_HUB),
//     rendered by components/dmz/DmzEntityHub.js via emptyStateCopy
//   - /dmz Operations Deck badge + section note (PLANNED_TOOL_LABEL / PLANNED_TOOLS_NOTE)
//   - part 2: /dmz naming line, two FAQ answers, vs-Warzone tail (lib/dmz/hubCopy.js via launchText),
//     Meta card badge + section description, hero intro, and the launch-neutral hub descriptions
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { emptyStateCopy, launchText, PLANNED_TOOL_LABEL, PLANNED_TOOLS_NOTE } from './launchCopy.js';
import { dmzHubCopy, META_CARD_BADGE } from '../dmz/hubCopy.js';
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

// ── part 2 (2026-10-07): /dmz hub copy, Meta card, hero intro, hub descriptions ──────────────────

test('launchText: caller pre text until the launch instant, post text from it', () => {
  at(PRE); assert.equal(launchText(dmz, 'pre', 'post'), 'pre');
  at(POST); assert.equal(launchText(dmz, 'pre', 'post'), 'post');
});

const HUB_PRE = {
  namingLine: 'Often searched as "DMZ 2". The official name is DMZ, the extraction mode in Call of Duty: Modern Warfare 4, and it arrives October 23, 2026.',
  faqLaunchA: 'DMZ comes out on October 23, 2026. Many players search for it as "DMZ 2", but the official name is simply DMZ: the extraction mode shipping inside Call of Duty: Modern Warfare 4. The date is confirmed by the official Call of Duty announcement, which states Modern Warfare 4 releases Friday, October 23, 2026, and DMZ ships as part of the game.',
  faqBackA: 'Yes. Call of Duty: Modern Warfare 4 includes a mode called DMZ, launching October 23, 2026, and Activision has detailed it in an official Deep Dive. What has not been confirmed is how it relates to the original DMZ from Modern Warfare II, including whether progression, factions, or any other systems carry over.',
  vsWarzoneTail: 'The detailed, mechanic-by-mechanic comparison lands when the mode goes live on October 23, 2026 - verified from play, not guessed before launch.',
};
const HUB_POST = {
  namingLine: 'Often searched as "DMZ 2". The official name is DMZ, the extraction mode in Call of Duty: Modern Warfare 4.',
  faqLaunchA: 'DMZ\'s release date is October 23, 2026. Many players search for it as "DMZ 2", but the official name is simply DMZ: the extraction mode in Call of Duty: Modern Warfare 4. The date is confirmed by the official Call of Duty announcement, which states Modern Warfare 4 releases Friday, October 23, 2026, with DMZ as part of the game.',
  faqBackA: 'Yes. Call of Duty: Modern Warfare 4 includes a mode called DMZ, and Activision has detailed it in an official Deep Dive. What has not been confirmed is how it relates to the original DMZ from Modern Warfare II, including whether progression, factions, or any other systems carry over.',
  vsWarzoneTail: 'Mechanic-by-mechanic differences are added here only once they are verified from play.',
};

test('/dmz hub copy PRE-LAUNCH: the existing wording, byte for byte', () => {
  at(PRE); assert.deepEqual(dmzHubCopy(), HUB_PRE);
});

test('/dmz hub copy POST-LAUNCH: exact strings, no launch promise', () => {
  at(POST);
  const c = dmzHubCopy();
  assert.deepEqual(c, HUB_POST);
  for (const k of Object.keys(c)) assert.doesNotMatch(c[k], /arrives|comes out|launching|goes live|lands when|before launch|shipping inside|\bships\b/i, k);
  // Only the release-date FAQ keeps a date (tense-neutral); nothing else post-launch carries one.
  for (const k of ['namingLine', 'faqBackA', 'vsWarzoneTail']) assert.doesNotMatch(c[k], /October|2026|\bOct\b/, k);
});

test('Meta card badge + section description: honest and identical before and after launch', () => {
  const meta = dmz.sections.find((s) => s.slug === 'meta');
  for (const ms of [PRE, POST]) {
    at(ms);
    assert.equal(META_CARD_BADGE, 'Awaiting data');
    assert.equal(meta.description, 'Weapon and loadout tier tracking. Activates once real match data exists.');
    assert.doesNotMatch(META_CARD_BADGE + ' ' + meta.description, /at launch/i);
  }
});

test('hero intro is launch-neutral (no tools promise)', () => {
  assert.equal(dmz.hubIntro, 'Confirmed coverage of Modern Warfare 4\'s extraction mode — setting, systems, and field intel.');
  assert.doesNotMatch(dmz.hubIntro, /tools|landing|goes live|launch|October/i);
});

const HUB_DESC = {
  keys: 'DMZ keys: where each key is found, what it unlocks and which region of the map it is in. Each entry is marked verified in-game or unconfirmed.',
  missions: 'DMZ missions: the objectives and rewards of each mission in Modern Warfare 4\'s DMZ. Each entry is marked verified in-game or unconfirmed.',
  items: 'DMZ items: the category, sell value and use of each item in Modern Warfare 4\'s DMZ. Each entry is marked verified in-game or unconfirmed.',
  builds: 'DMZ weapon builds: the FOB Gunsmith loadout for a gun, with attachments by slot and the Apex conversion. Listed only once all of its parts are verified.',
  pois: 'Locations in DMZ\'s Hajin Exclusion Zone as named in Call of Duty\'s Deep Dive Part 1 (pre-release), with threat levels and regions.',
};

test('hub descriptions (also the meta descriptions): exact, launch-neutral, no overclaim, <= 160 chars', () => {
  const got = { keys: DMZ_ENTITIES.keys.hubDesc, missions: DMZ_ENTITIES.missions.hubDesc, items: DMZ_ENTITIES.items.hubDesc, builds: BUILDS_HUB.hubDesc, pois: DMZ_ENTITIES.pois.hubDesc };
  assert.deepEqual(got, HUB_DESC);
  for (const [k, d] of Object.entries(got)) {
    assert.ok(d.length <= 160, k + ' ' + d.length);
    assert.doesNotMatch(d, /\bevery\b|\bcomplete\b|as the zone opens|launch|October|2026/i, k);
  }
  assert.doesNotMatch(DMZ_ENTITIES.pois.hubDescLegacy, /as the zone opens/i);
});

// Source guard: every remaining launch-dated or launch-promise phrase in the DMZ UI sources must be
// on this list, with its reason. A new one (or one that moved) fails until it is branched or listed.
const ALLOWED = [
  ['app/dmz/page.js', "title: { absolute: 'MW4 DMZ Release Date: October 23, 2026", 'page title, not changed (title rule)'],
  ['app/dmz/page.js', "description: 'DMZ releases October 23, 2026", 'meta description, reported, not in scope'],
  ['app/dmz/page.js', "title: 'MW4 DMZ Release Date: October 23, 2026", 'og/twitter title mirrors the page title'],
  ['app/dmz/page.js', "'DMZ launches October 23, 2026'}", 'pre-launch branch of dmzLive'],
  ['app/dmz/DmzShare.js', "'DMZ launches Oct 23, 2026.'}", 'pre-launch branch of the live prop (isGameLive)'],
  ['app/dmz/DmzEmptyState.js', 'the zone goes live.', 'reported (noindexed meta/discourse), not in scope'],
  ['app/dmz/DmzComingSoon.js', 'launches with the zone', 'reported, not in scope'],
  ['app/dmz/DmzComingSoon.js', 'once DMZ goes live', 'reported, not in scope'],
  ['app/dmz/[section]/page.js', 'coverage arrives as official details are confirmed', 'no launch date; fallback description'],
  ['components/dmz/DmzNotifyBlock.js', 'goes live on October 23, 2026', 'HELD for Justin (notify signup)'],
  ['components/dmz/DmzNotifyForm.js', 'goes live October 23.', 'HELD for Justin (notify signup)'],
  ['components/dmz/DmzNotifyStrip.js', 'the day it lands', 'HELD for Justin (notify signup)'],
  ['lib/dmz/articleContent.js', 'launches october 23', 'detector regex, not copy'],
  ['lib/dmz/hubCopy.js', 'it arrives October 23, 2026', 'pre-launch branch'],
  ['lib/dmz/hubCopy.js', 'DMZ comes out on October 23, 2026', 'pre-launch branch'],
  ['lib/dmz/hubCopy.js', 'release date is October 23, 2026', 'post-launch release-date FAQ, tense-neutral fact'],
  ['lib/dmz/hubCopy.js', 'launching October 23, 2026', 'pre-launch branch'],
  ['lib/dmz/hubCopy.js', 'lands when the mode goes live on October 23, 2026', 'pre-launch branch'],
  ['lib/dmz/entities.js', 'DMZ launches October 23, 2026; verified', 'hubEmpty: pre-launch only (emptyStateCopy)'],
  ['lib/dmz/buildsHub.js', 'DMZ launches October 23, 2026; verified', 'hubEmpty: pre-launch only (emptyStateCopy)'],
  ['lib/games/dmz.js', "DMZ\\'s Oct 23, 2026 return", 'vs-Warzone article SEO description, reported, not in scope'],
];
const SCAN = ['app/dmz/page.js', 'app/dmz/DmzShare.js', 'app/dmz/DmzEmptyState.js', 'app/dmz/DmzComingSoon.js', 'app/dmz/[section]/page.js',
  'components/dmz/DmzEntityHub.js', 'components/dmz/DmzNotifyBlock.js', 'components/dmz/DmzNotifyForm.js', 'components/dmz/DmzNotifyStrip.js',
  'lib/dmz/articleContent.js', 'lib/dmz/hubCopy.js', 'lib/dmz/entities.js', 'lib/dmz/buildsHub.js', 'lib/games/dmz.js'];
const PHRASE = /october 23|oct 23|goes live|go live|day it lands|at launch|arrives |as the zone opens|landing as/i;

test('source guard: no unlisted launch-dated or launch-promise copy in the DMZ UI sources', () => {
  const unlisted = [];
  for (const f of SCAN) {
    const lines = readFileSync(new URL('../../' + f, import.meta.url), 'utf8').split(/\r?\n/);
    lines.forEach((line, i) => {
      const t = line.trim();
      // comments are not copy (line comments, block-comment lines, and the closing line of a JSX comment)
      if (!PHRASE.test(t) || /^(\/\/|\*|\/\*|\{\/\*)/.test(t) || /\*\/\}?$/.test(t)) return;
      if (!ALLOWED.some(([af, sub]) => af === f && line.includes(sub))) unlisted.push(f + ':' + (i + 1) + ' ' + t.slice(0, 90));
    });
  }
  assert.deepEqual(unlisted, []);
});

test('/dmz page source: the part-2 strings come from hubCopy, none left inline', () => {
  const src = readFileSync(new URL('../../app/dmz/page.js', import.meta.url), 'utf8');
  for (const s of ['DMZ_NAMING_LINE = hubCopy.namingLine', 'FAQ_LAUNCH_A = hubCopy.faqLaunchA', 'FAQ_BACK_A = hubCopy.faqBackA', '{hubCopy.vsWarzoneTail}', '<Pill text={META_CARD_BADGE}']) assert.ok(src.includes(s), s);
  assert.doesNotMatch(src, /Activates at launch"|it arrives October|comes out on October|lands when the mode goes live/);
});
