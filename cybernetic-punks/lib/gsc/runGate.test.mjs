// lib/gsc/runGate.test.mjs
// runGate (Phase 4): the shared gate extracted from the inline insert-path block. Two things proven:
//  1. THE DEEP-EQUAL NO-OP PROOF -- runGate's decision/findings/gap are BYTE-IDENTICAL to the former
//     inline classify+detect+decide, on the same inputs (the refactor changed nothing observable).
//  2. runGate's safety contract -- clean->publish, hold-class->held, throw->held (fail-closed),
//     mode DERIVED from game_slug (a DMZ draft is fail-closed; an unknown game holds).
// Run: node --test lib/gsc/runGate.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runGate } from './runGate.js';
import { classifyCorroboration } from './corroboration.js';
import { detectUnparseable } from './hardStatDetector.js';
import { decideGate } from './prePublishGate.js';
import { getGameConfig } from '../games/index.js';

const RUN_DATE = '2026-10-24';
const WEAPON_VERIFIED   = { type: 'dmz-weapon', name: 'PLACEHOLDER Rifle', aliases: [], fields: { name: 'PLACEHOLDER Rifle', stats: { damage: 24 } }, verified: true, verified_source: 'official' };
const WEAPON_UNVERIFIED = { type: 'dmz-weapon', name: 'PLACEHOLDER Rifle', aliases: [], fields: { name: 'PLACEHOLDER Rifle', stats: { damage: 24 } }, verified: false, verified_source: null };
const dmzDraft = (body) => ({ slug: 'd', editor: 'x', created_at: RUN_DATE, body, game_slug: 'dmz' });

// The EXACT computation that used to live inline in processEditor (classify + detect + decide,
// verifiedOnly:true, mode from the game config, no throw). runGate must reproduce this byte-for-byte.
function inlineReference(store, draft, mode) {
  const gateOut = classifyCorroboration([draft], { entities: store.entities }, { runDate: RUN_DATE, verifiedOnly: true });
  const gateFindings = gateOut.findings || [];
  const det = detectUnparseable([draft], { entities: store.entities });
  const gateUnparse = det.unparseable;
  return {
    decision: decideGate(gateFindings.concat(gateUnparse), mode, false),
    findings: gateFindings,
    unparseable: gateUnparse,
    corroborations: gateOut.corroborations || [],
    gap: det.gap,
  };
}

// ── 1. THE DEEP-EQUAL NO-OP PROOF ────────────────────────────────────────────────────────────────
const PROOF_CASES = [
  { label: 'clean corroboration (24 vs verified 24)', store: { entities: [WEAPON_VERIFIED] }, body: 'The PLACEHOLDER Rifle deals 24 damage.' },
  { label: 'CONTRADICTED (99 vs verified 24)',        store: { entities: [WEAPON_VERIFIED] }, body: 'The PLACEHOLDER Rifle deals 99 damage.' },
  { label: 'UNPARSEABLE (uncovered field)',           store: { entities: [WEAPON_VERIFIED] }, body: 'The PLACEHOLDER Rifle has higher recoil control now.' },
  { label: 'provisional anchor demoted (24 vs unverified 24)', store: { entities: [WEAPON_UNVERIFIED] }, body: 'The PLACEHOLDER Rifle deals 24 damage.' },
];
for (const c of PROOF_CASES) {
  test('deep-equal no-op proof [' + c.label + ']: runGate == the former inline gate (byte-identical)', () => {
    const mode = getGameConfig('dmz').prePublishGate;             // 'fail-closed' -- what the inline code derived
    const ref = inlineReference(c.store, dmzDraft(c.body), mode);
    const got = runGate(c.store, dmzDraft(c.body), { runDate: RUN_DATE });
    assert.equal(got.mode, mode, 'mode DERIVED, equals the inline-derived mode');
    assert.deepEqual(got.decision, ref.decision, 'decision byte-identical');
    assert.deepEqual(got.findings, ref.findings, 'findings byte-identical');
    assert.deepEqual(got.unparseable, ref.unparseable, 'unparseable byte-identical');
    assert.deepEqual(got.corroborations, ref.corroborations, 'corroborations byte-identical');
    assert.deepEqual(got.gap, ref.gap, 'gap byte-identical');
  });
}

// ── 2. runGate's safety contract (pure unit) ─────────────────────────────────────────────────────
test('runGate: a CLEAN pass (verified match) -> publish (hold=false, is_published=true, gate_status=clear)', () => {
  const res = runGate({ entities: [WEAPON_VERIFIED] }, dmzDraft('The PLACEHOLDER Rifle deals 24 damage.'), { runDate: RUN_DATE });
  assert.equal(res.decision.hold, false);
  assert.equal(res.decision.is_published, true);
  assert.equal(res.decision.gate_status, 'clear');
  assert.equal(res.corroborations.length, 1, 'the verified match is the freeing row');
});

test('runGate: a hold-class finding (CONTRADICTED) -> held', () => {
  const res = runGate({ entities: [WEAPON_VERIFIED] }, dmzDraft('The PLACEHOLDER Rifle deals 99 damage.'), { runDate: RUN_DATE });
  assert.equal(res.decision.hold, true);
  assert.equal(res.decision.is_published, false);
  assert.equal(res.decision.gate_status, 'held');
  assert.equal(res.decision.gate_findings.filter((f) => f.class === 'CONTRADICTED').length, 1);
});

test('runGate: a PROVISIONAL anchor (verified=false, matching value) -> UNCORROBORATED-held (demoted, recognition preserved)', () => {
  const res = runGate({ entities: [WEAPON_UNVERIFIED] }, dmzDraft('The PLACEHOLDER Rifle deals 24 damage.'), { runDate: RUN_DATE });
  assert.equal(res.decision.hold, true, 'a provisional-anchor claim stays HELD (never echo-released)');
  assert.equal(res.corroborations.length, 0, 'no echo: the unverified row cannot corroborate');
  assert.equal(res.decision.gate_findings.filter((f) => f.class === 'UNCORROBORATED').length, 1);
});

test('runGate: a classifier/detector THROW -> held (fail-closed); runGate itself NEVER throws', () => {
  const throwingStore = { get entities() { throw new Error('store boom'); } };
  let res;
  assert.doesNotThrow(() => { res = runGate(throwingStore, dmzDraft('The PLACEHOLDER Rifle deals 24 damage.'), { runDate: RUN_DATE }); });
  assert.equal(res.threw, true);
  assert.equal(res.decision.hold, true, 'a broken re-pass HOLDS, never publishes');
  assert.equal(res.decision.gate_findings[0].class, 'GATE_INFRA_FAILURE');
});

test('runGate: MODE is DERIVED from game_slug -- a DMZ draft is fail-closed (holds), NOT log-only', () => {
  // The footgun the derivation eliminates: no caller can pass 'log-only' for a DMZ draft.
  const res = runGate({ entities: [WEAPON_VERIFIED] }, dmzDraft('The PLACEHOLDER Rifle deals 99 damage.'), { runDate: RUN_DATE });
  assert.equal(res.mode, 'fail-closed');
  assert.equal(res.decision.hold, true);
});

test('runGate: a MARATHON draft derives log-only -> publishes even on a hold-class finding (fail-open, unchanged)', () => {
  const marWeapon = { type: 'weapon', name: 'Twin Tap HBR', aliases: [], fields: { name: 'Twin Tap HBR', damage: 24 }, verified: true, verified_source: 'official' };
  const draft = { slug: 'm', editor: 'x', created_at: RUN_DATE, body: 'The Twin Tap HBR deals 99 damage.', game_slug: 'marathon' };
  const res = runGate({ entities: [marWeapon] }, draft, { runDate: RUN_DATE });
  assert.equal(res.mode, 'log-only');
  assert.equal(res.decision.hold, false, 'Marathon log-only never holds');
  assert.equal(res.findings.filter((f) => f.class === 'CONTRADICTED').length, 1, 'the finding is still computed (logged), just not held');
});

test('runGate: an UNKNOWN game_slug -> held (fail-closed), never published (config/data error is not a release)', () => {
  const res = runGate({ entities: [] }, { slug: 'z', editor: 'x', created_at: RUN_DATE, body: 'anything.', game_slug: 'not-a-game' }, { runDate: RUN_DATE });
  assert.equal(res.mode, 'unknown');
  assert.equal(res.threw, true);
  assert.equal(res.decision.hold, true);
  assert.equal(res.decision.is_published, false);
});
