// lib/games/wardogsPatchGate.test.mjs
// Guards decision (a) 2026-09-25: NEXUS is patch-gated for Wardogs, and Wardogs' patch detection
// recognizes a REAL Bulkhead patch title ("... PATCH 0.11") while ignoring teaser/marketing posts.
// Run: node --test lib/games/wardogsPatchGate.test.mjs  (no resolve hook needed -- pure config + engine)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wardogs } from './wardogs.js';
import { mergeAndDetect } from '../gather/patchnotes/engine.js';

test('wardogs roster: NEXUS is patch-gated (editorsRequiringPatch), MIRANDA is not', () => {
  const rp = wardogs.editorial.editorsRequiringPatch || [];
  assert.ok(rp.includes('NEXUS'), 'NEXUS must be patch-gated');
  assert.equal(rp.includes('MIRANDA'), false, 'MIRANDA stays daily (not patch-gated)');
  assert.ok((wardogs.editorial.editors || []).includes('NEXUS'), 'NEXUS still in the roster');
});

// Detection: official-feed fixtures, all FRESH (date=now), through the real engine + wardogs rules.
const rules = wardogs.sources.patchNotes.detection;
const OFFICIAL = 'steam_community_announcements';
const art = (title, feedname = OFFICIAL) => ({ title, feedname, date: new Date().toISOString(), contents: '' });
const fires = (title) => {
  const [t] = mergeAndDetect([art(title)], rules);
  return !!t.is_patch_note;
};

test('a real Bulkhead patch title FIRES (Patch 0.11 -- the case /update.../ missed)', () => {
  assert.equal(fires('SCHEDULED MAINTENANCE & PATCH 0.11'), true);
  assert.equal(fires('WARDOGS Update 1.2.0'), true, 'still catches Update N.N.N');
  assert.equal(fires('Launch Stability Hotfix #1'), true, 'hotfix keyword still fires');
});

test('teaser / marketing / press titles do NOT fire (no false positives)', () => {
  assert.equal(fires('WARDOGS | Season 02 Teaser'), false);
  assert.equal(fires('2 MILLION COPIES SOLD'), false);
  assert.equal(fires('1.25 MILLION COPIES SOLD!'), false, 'a bare decimal without update/patch must not match');
  assert.equal(fires('WARDOGS LAUNCH TRAILER'), false);
  assert.equal(fires('Pre-Load Live & Season 1 Changelog'), false);
  assert.equal(fires('WARDOGS | Closed Beta 02 Announcement'), false);
});

test('freshness gates: a real patch title older than 48h does NOT fire', () => {
  const old = { title: 'SCHEDULED MAINTENANCE & PATCH 0.11', feedname: OFFICIAL, date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), contents: '' };
  const [t] = mergeAndDetect([old], rules);
  assert.equal(t.is_patch_note, false, 'a patch older than freshnessMs (48h) does not trigger NEXUS');
});

test('press (non-official feedname) never fires even with a patch-shaped title', () => {
  const [t] = mergeAndDetect([art('Wardogs Update 0.11 hands-on', 'PCGamesN')], rules);
  assert.equal(t.is_patch_note, false);
});
