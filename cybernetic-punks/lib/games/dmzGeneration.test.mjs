// lib/games/dmzGeneration.test.mjs
// DMZ generation scaffolding (2026-10-07, D3 report): the config the generation path reads is present
// but DORMANT. generateNews stays OFF, so DMZ is not generation-active and /api/cron?game=dmz is refused.
// The scaffold keys (holdForReview, editorsRequiringPatch, sources, vocabulary) are pinned here so a later
// flip is one deliberate line. Modelled on lib/games/bodycamGeneration.test.mjs and
// marathonSelfSelect.test.mjs. Run inside the suite (ext-resolve hook). NO network and NO DB: fetch is
// replaced by a rejecting stub for the gather checks, and gatherAll is NOT called (its
// runDexterStatPipeline can write wiki_meta + stats tables -- lib/gather/dexter-stats.js:602).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dmz } from './dmz.js';
import { marathon } from './marathon.js';
import { getGenerationGames } from './index.js';
import { heldForReviewAppliesForGame } from '../content/heldForReview.js';
import { patchGatedRunDecision } from '../content/patchCoverage.js';
import { resolveVocab } from '../editors/promptVocab.js';
import { gatherYouTube } from '../gather/youtube.js';
import { gatherReddit } from '../gather/reddit.js';
import { gatherTwitchClips } from '../gather/twitch.js';
import { gatherPatchNotes } from '../gather/patchnotes/index.js';

test('DMZ generation is OFF: generateNews is not true', () => {
  assert.notEqual(dmz.editorial.generateNews, true,
    'DMZ generation must stay OFF. Flipping generateNews requires reading the D3 report (2026-10-07: untuned '
    + 'Steam detection, no official MW4 posts yet) and deliberately updating this test in the same change.');
});

test('getGenerationGames() excludes dmz; the active set is unchanged', () => {
  assert.equal(getGenerationGames().includes('dmz'), false);
  assert.deepEqual(getGenerationGames(), ['marathon', 'wardogs', 'bodycam']);
});

test('cron guard: ?game=dmz is refused with 400 game_not_generation_active (predicate + guard source)', () => {
  // No request-level seam exists for app/api/cron/route.js; assert the predicate it uses
  // (GENERATION_SLUGS.indexOf(requestedGame) === -1, GENERATION_SLUGS = getGenerationGames()) and that the
  // 400 branch is still in the route source.
  assert.equal(getGenerationGames().indexOf('dmz'), -1, 'the guard predicate refuses dmz');
  const src = readFileSync(new URL('../../app/api/cron/route.js', import.meta.url), 'utf8');
  assert.match(src, /var GENERATION_SLUGS = getGenerationGames\(\);/);
  assert.match(src, /if \(GENERATION_SLUGS\.indexOf\(requestedGame\) === -1\) \{/);
  assert.match(src, /error: 'game_not_generation_active'[^\n]*\{ status: 400 \}/);
});

test('every DMZ draft is held for review, with STORE_ROW_CITATION_ENABLED unset AND set', () => {
  assert.equal(dmz.editorial.holdForReview, true);
  const prev = process.env.STORE_ROW_CITATION_ENABLED;
  try {
    delete process.env.STORE_ROW_CITATION_ENABLED;
    assert.equal(heldForReviewAppliesForGame('NEXUS', process.env.STORE_ROW_CITATION_ENABLED === 'true', dmz), true, 'flag unset');
    process.env.STORE_ROW_CITATION_ENABLED = 'true';
    assert.equal(heldForReviewAppliesForGame('NEXUS', process.env.STORE_ROW_CITATION_ENABLED === 'true', dmz), true, 'flag set');
    // Any editor name, too: the per-game hold does not depend on HELD_EDITORS.
    assert.equal(heldForReviewAppliesForGame('SOME_FUTURE_EDITOR', false, dmz), true);
  } finally {
    if (prev === undefined) delete process.env.STORE_ROW_CITATION_ENABLED; else process.env.STORE_ROW_CITATION_ENABLED = prev;
  }
});

test('NEXUS is patch-gated: with no detected official event it is patch_frozen (no model call)', () => {
  assert.ok(dmz.editorial.editorsRequiringPatch.includes('NEXUS'));
  assert.deepEqual(dmz.editorial.editors, ['NEXUS'], 'roster unchanged: NEXUS only');
  assert.notEqual(dmz.editorial.allowSelfSelect, true, 'DMZ never self-selects');
  const d = patchGatedRunDecision({ editorName: 'NEXUS', editorsRequiringPatch: dmz.editorial.editorsRequiringPatch, hasPatch: false });
  assert.deepEqual(d, { run: false, skipReason: 'patch_frozen' });
});

test('DMZ sources never resolve to Marathon data', () => {
  const s = dmz.sources;
  assert.equal(s.steamAppId, '4435490', 'MW4 on Steam (publisher Activision, appdetails 2026-10-07)');
  assert.notEqual(s.steamAppId, marathon.sources.steamAppId);
  assert.notEqual(s.steamAppId, '3065800');
  assert.equal(s.patchNotes.appId, s.steamAppId, 'news feed reads the same app');
  assert.notEqual(s.patchNotes.label, marathon.sources.patchNotes.label, 'not BUNGIE NEWS');
  for (const [k, v] of [['youtube.searchQueries', s.youtube.searchQueries], ['youtube.creatorChannels', s.youtube.creatorChannels],
    ['reddit.subreddits', s.reddit.subreddits], ['twitch.gameNames', s.twitch.gameNames]]) {
    assert.ok(Array.isArray(v), k + ' is an array');
    assert.equal(v.length, 0, k + ' is empty (official-only posture)');
  }
  assert.equal(s.patchNotes.type, 'steam-news');
  assert.equal(s.patchNotes.detection.officialFeedName, 'steam_community_announcements');
  assert.ok(s.patchNotes.detection.versionRe instanceof RegExp);
  assert.ok(Array.isArray(s.patchNotes.detection.keywords) && s.patchNotes.detection.keywords.length > 0);
});

test('vocabulary: only what the config supports; NEXUS grade name deliberately unset', () => {
  const v = resolveVocab(dmz);
  assert.equal(v.game, 'DMZ');
  assert.equal(v.dev, 'Activision');
  assert.equal(v.reader, 'Operator');
  assert.equal(v.readers, 'Operators');
  assert.equal(v['grade.nexus'], undefined, 'operator naming decision, not guessed');
});

test('gatherers do not throw on DMZ config and make no real network call (fetch stubbed to reject)', async () => {
  const realFetch = globalThis.fetch;
  const prevYt = process.env.YOUTUBE_API_KEY;
  let calls = 0;
  globalThis.fetch = async () => { calls++; throw new Error('network disabled in test'); };
  try {
    delete process.env.YOUTUBE_API_KEY; // gatherYouTube reads config, then returns [] without a key
    assert.deepEqual(await gatherYouTube(dmz), []);
    process.env.YOUTUBE_API_KEY = 'test-key-not-used'; // with a key: empty query list -> no request
    assert.deepEqual(await gatherYouTube(dmz), []);
    assert.deepEqual(await gatherReddit(dmz), [], 'empty subreddits -> no request');
    assert.ok(Array.isArray(await gatherTwitchClips(dmz)), 'twitch resolves (errors are caught inside)');
    assert.ok(Array.isArray(await gatherPatchNotes(dmz)), 'patch notes resolve (adapter errors -> [])');
    // The synchronous reads gatherAll makes on its own (lib/gather/index.js:188) also succeed.
    assert.equal(dmz.sources.reddit.subreddits.map((x) => 'r/' + x).join(' + '), '');
  } finally {
    globalThis.fetch = realFetch;
    if (prevYt === undefined) delete process.env.YOUTUBE_API_KEY; else process.env.YOUTUBE_API_KEY = prevYt;
  }
  assert.ok(calls > 0, 'the steam-news adapter did attempt a request, and it hit the stub, not the network');
});
