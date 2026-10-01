// lib/games/bodycamGeneration.test.mjs
// Bodycam wired into generation (2026-10-01): it is generation-active, NEXUS-only + patch-gated, every
// draft is HELD for operator review, and the patch detector matches Reissad's "V0.8 #N" / "V0.8 Locked
// & Loaded" titles while ignoring SteamDB press + marketing. Titles are from the live feed
// (docs/sources/bodycam/steam-news-2026-10-01.json, Part 0). Run inside the suite (ext-resolve hook).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bodycam } from './bodycam.js';
import { marathon } from './marathon.js';
import { getGenerationGames } from './index.js';
import { mergeAndDetect } from '../gather/patchnotes/engine.js';
import { heldForReviewApplies, heldForReviewAppliesForGame } from '../content/heldForReview.js';

test('Bodycam is generation-active (getGenerationGames includes it)', () => {
  assert.ok(getGenerationGames().includes('bodycam'), 'generateNews:true -> in getGenerationGames()');
});

test('Bodycam roster: NEXUS only, patch-gated, NO MIRANDA / NO self-select, hold-for-review on', () => {
  const e = bodycam.editorial;
  assert.deepEqual(e.editors, ['NEXUS'], 'NEXUS only');
  assert.ok((e.editorsRequiringPatch || []).includes('NEXUS'), 'NEXUS is patch-gated');
  assert.equal((e.editors || []).includes('MIRANDA'), false, 'no MIRANDA');
  assert.notEqual(e.allowSelfSelect, true, 'no self-select (no verified store yet)');
  assert.equal(e.generateNews, true, 'generation switch on');
  assert.equal(e.holdForReview, true, 'every draft held for operator review');
  assert.equal(bodycam.prePublishGate, 'fail-closed', 'gate stays fail-closed (overridden to clear by hold)');
  assert.equal(bodycam.indexable, false, 'still noindex (indexing flips separately)');
});

// ── Patch detection through the REAL shared engine + bodycam rules (all FRESH) ────────────────
const rules = bodycam.sources.patchNotes.detection;
const OFFICIAL = 'steam_community_announcements';
const art = (title, feedname = OFFICIAL) => ({ title, feedname, date: new Date().toISOString(), contents: '' });
const fires = (title, feedname = OFFICIAL) => { const [t] = mergeAndDetect([art(title, feedname)], rules); return !!t.is_patch_note; };

test('every Part-0 PATCH NOTES title fires (V0.8 #1 .. #6)', () => {
  for (let n = 1; n <= 6; n++) {
    assert.equal(fires('Bodycam PATCH NOTES · V0.8 #' + n), true, 'V0.8 #' + n + ' must fire');
  }
});

test('"V0.8 Locked & Loaded" titles fire (brief requirement)', () => {
  assert.equal(fires('Bodycam Major Update Release Date | V0.8 Locked & Loaded'), true);
  assert.equal(fires('Bodycam Devlog Part [3/4] : Trenches | V0.8 Locked & Loaded'), true, 'devlog matches too (freshness neutralizes the past ones)');
});

test('marketing / non-version official titles do NOT fire', () => {
  assert.equal(fires('Bodycam Major Update OUT NOW! | Trench Warfare, Loadout System & Much More!'), false, 'no version token, not a patch-notes/hotfix keyword');
  assert.equal(fires('Bodycam Has Reached 3,000,000 Wishlists!'), false);
  assert.equal(fires('The Locked and Loaded update officially releases today at 17:00 UTC.'), false);
  assert.equal(fires('Locked & Loaded Update | First Reactions'), false);
  assert.equal(fires('Bodycam Locked And Loaded New Soundtrack'), false);
});

test('SteamDB press rows never fire (not the official feed), even version-shaped', () => {
  assert.equal(fires('Bodycam PATCH NOTES · V0.8 #6', 'SteamDB'), false, 'press feedname is not official');
  assert.equal(fires('Steam Global Top Sellers for week of 8 Sep — 15 September 2026', 'SteamDB'), false);
});

test('a real patch title older than 48h does NOT fire (freshness)', () => {
  const old = { title: 'Bodycam PATCH NOTES · V0.8 #6', feedname: OFFICIAL, date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), contents: '' };
  const [t] = mergeAndDetect([old], rules);
  assert.equal(t.is_patch_note, false);
});

// ── Hold-for-review: every Bodycam draft is held, independent of the global flag ──────────────
test('heldForReviewAppliesForGame: Bodycam holds EVERY draft even with the global flag OFF', () => {
  assert.equal(heldForReviewAppliesForGame('NEXUS', false, bodycam), true, 'per-game hold wins regardless of flag');
  assert.equal(heldForReviewAppliesForGame('NEXUS', true, bodycam), true);
});

test('heldForReviewAppliesForGame: a game WITHOUT holdForReview falls back to flag+HELD_EDITORS', () => {
  // Marathon does not set holdForReview -> identical to heldForReviewApplies (byte-identical behaviour).
  assert.equal(heldForReviewAppliesForGame('NEXUS', false, marathon), heldForReviewApplies('NEXUS', false)); // false
  assert.equal(heldForReviewAppliesForGame('NEXUS', true, marathon), heldForReviewApplies('NEXUS', true));   // true
  assert.equal(heldForReviewAppliesForGame('NEXUS', false, marathon), false);
});
