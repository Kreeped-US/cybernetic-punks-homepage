// lib/marathon/provenanceBadge.test.mjs
// Node test runner: `node --test lib/marathon/provenanceBadge.test.mjs`
// Asserts the pure transform against the operator-confirmed 40-row Marathon map (32 weapon_stats +
// 8 shell_stats, verbatim stored verified_source strings pulled read-only from the live DB). This
// file IS the acceptance artifact: if a stored string ever changes shape, a case here should fail.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { provenanceBadge } from './provenanceBadge.js';

function badge(src) { return provenanceBadge(true, src); }

// --- WEAPONS (32) -- verbatim verified_source -> expected clean badge --------------------------
const WEAPONS = [
  ['Ares RG', 'owner in-game visual verification (Justin), S2 2026-08', 'Owner-verified in-game (S2)', 'verified'],
  ['Biotoxic Disinjector', 'In-game weapon inspect (S2), stats confirmed', 'Owner-verified in-game (S2)', 'verified'],
  ['BR33 Volley Rifle', 'Bungie Update 1.1.0 patch notes', 'Verified · Bungie 1.1.0 patch notes', 'verified'],
  ['BRRT SMG', 'Bungie Update 1.1.0 patch notes', 'Verified · Bungie 1.1.0 patch notes', 'verified'],
  ['Bully SMG', 'owner in-game visual verification (Justin), S2 2026-08', 'Owner-verified in-game (S2)', 'verified'],
  ['CE Tactical Sidearm', 'Bungie Update 1.1.0 patch notes', 'Verified · Bungie 1.1.0 patch notes', 'verified'],
  ['Conquest LMG', 'owner in-game visual verification (Justin), S2 2026-08', 'Owner-verified in-game (S2)', 'verified'],
  ['Copperhead RF', 'Bungie Update 1.1.0 patch notes', 'Verified · Bungie 1.1.0 patch notes', 'verified'],
  ['D54 Battle Pistol', 'Bungie Update 1.1.0 patch notes', 'Verified · Bungie 1.1.0 patch notes', 'verified'],
  ['Demolition HMG', 'owner in-game visual verification (Justin), S2 2026-08', 'Owner-verified in-game (S2)', 'verified'],
  ['Hardline PR', 'owner in-game visual verification (Justin), S2 2026-08', 'Owner-verified in-game (S2)', 'verified'],
  ['Impact HAR', 'In-game weapon inspect 2026-08-03 (owner-verified, re-confirmed)', 'Owner-verified in-game (S2)', 'verified'],
  ['KKV-9SD', 'Bungie Update 1.1.5 patch notes (damage, precision_multiplier) + 1.1.5.2 patch notes (magazine_size 28); other fields in-game S2', 'Verified · Bungie 1.1.5 patch notes', 'verified'],
  ['Knife', 'owner in-game visual verification (Justin), S2 2026-08', 'Owner-verified in-game (S2)', 'verified'],
  ['Longshot', 'owner in-game visual verification (Justin), S2 2026-08', 'Owner-verified in-game (S2)', 'verified'],
  ['M77 Assault Rifle', 'owner in-game visual verification (Justin), S2 2026-08', 'Owner-verified in-game (S2)', 'verified'],
  ['Magnum MC', 'Bungie Update 1.1.0 patch notes', 'Verified · Bungie 1.1.0 patch notes', 'verified'],
  ['Misriah 2442', 'Bungie Update 1.1.5 patch notes (precision_multiplier, fire_rate); damage unverified - see docs/HANDOFF.md shotgun scale', 'Partially verified', 'partial'],
  ['Outland', 'owner in-game visual verification (Justin), S2 2026-08', 'Owner-verified in-game (S2)', 'verified'],
  ['Overrun AR', 'Bungie Update 1.1.0 patch notes', 'Verified · Bungie 1.1.0 patch notes', 'verified'],
  ['Repeater HPR', 'In-game weapon inspect S2 (base, no mods)', 'Owner-verified in-game (S2)', 'verified'],
  ['Retaliator LMG', 'owner in-game visual verification (Justin), S2 2026-08', 'Owner-verified in-game (S2)', 'verified'],
  ['Stryder M1T', 'owner in-game visual verification (Justin), S2 2026-08', 'Owner-verified in-game (S2)', 'verified'],
  ['Twin Tap HBR', 'Bungie Update 1.1.5 patch notes (damage, precision_multiplier); other fields Update 1.1.0', 'Verified · Bungie 1.1.5 patch notes', 'verified'],
  ['V00 Zeus RG', 'owner in-game visual verification (Justin), S2 2026-08', 'Owner-verified in-game (S2)', 'verified'],
  ['V11 Punch', 'owner in-game visual verification (Justin), S2 2026-08', 'Owner-verified in-game (S2)', 'verified'],
  ['V22 Volt Thrower', 'owner in-game visual verification (Justin), S2 2026-08', 'Owner-verified in-game (S2)', 'verified'],
  ['V66 Lookout', 'Bungie Update 1.1.0 patch notes', 'Verified · Bungie 1.1.0 patch notes', 'verified'],
  ['V75 Scar', 'Bungie Update 1.1.0 patch notes', 'Verified · Bungie 1.1.0 patch notes', 'verified'],
  ['V85 Circuit Breaker', 'owner in-game visual verification (Justin), S2 2026-08', 'Owner-verified in-game (S2)', 'verified'],
  ['V99 Channel Rifle', 'owner in-game visual verification (Justin), S2 2026-08', 'Owner-verified in-game (S2)', 'verified'],
  ['WSTR Combat Shotgun', 'Confirmed in-game S2 (Justin)', 'Owner-verified in-game (S2)', 'verified'],
];

// --- SHELLS (8) -------------------------------------------------------------------------------
const COMPOUND = 'in-game S2 shell screen (owner-verified); matchup data owner-verified in-game (S2, 2026-07-17); base_health 120 owner-verified in-game 2026-08-03';
const SHELLS = [
  ['Assassin', COMPOUND, 'Owner-verified in-game (S2)', 'verified'],
  ['Destroyer', COMPOUND, 'Owner-verified in-game (S2)', 'verified'],
  ['Recon', COMPOUND, 'Owner-verified in-game (S2)', 'verified'],
  ['Rook', 'CORRECTED 2026-07-20 (owner-verified in-game): Rook cannot be selected in ranked of any kind. The prior row claimed ranked tiers C/B and a solo-only restriction; both were wrong. Role corrected Flex -> Scavenger.; base_health 120 owner-verified in-game 2026-08-03', 'Owner-verified in-game (S2)', 'verified'],
  ['Sentinel', 'Bungie Update 1.1.0 patch notes; matchup data owner-verified in-game (S2, 2026-07-17); base_health 120 owner-verified in-game 2026-08-03', 'Verified · Bungie 1.1.0 patch notes', 'verified'],
  ['Thief', COMPOUND, 'Owner-verified in-game (S2)', 'verified'],
  ['Triage', COMPOUND, 'Owner-verified in-game (S2)', 'verified'],
  ['Vandal', COMPOUND, 'Owner-verified in-game (S2)', 'verified'],
];

for (const [name, src, wantLabel, wantTier] of [...WEAPONS, ...SHELLS]) {
  test(name + ' -> ' + wantLabel, () => {
    const b = badge(src);
    assert.ok(b, name + ' produced no badge');
    assert.equal(b.label, wantLabel, name + ' label');
    assert.equal(b.tier, wantTier, name + ' tier');
    // No-leak guarantees on EVERY rendered label:
    assert.ok(!/justin/i.test(b.label), name + ' leaked a personal name');
    assert.ok(!/handoff|docs\//i.test(b.label), name + ' leaked an internal path');
    assert.ok(!/corrected|prior row|were wrong/i.test(b.label), name + ' leaked correction history');
  });
}

// --- Edge / defensive cases -------------------------------------------------------------------
test('unverified beats patch (order)', () => {
  const b = badge('Bungie 1.2.0 patch notes; damage unverified');
  assert.equal(b.label, 'Partially verified');
  assert.equal(b.tier, 'partial');
});

test('verified=false -> null (honest-null, no badge)', () => {
  assert.equal(provenanceBadge(false, 'Bungie 1.1.0 patch notes'), null);
});

test('verified=true but empty source -> null', () => {
  assert.equal(provenanceBadge(true, ''), null);
  assert.equal(provenanceBadge(true, null), null);
});

test('unrecognized verified source -> safe generic, never the raw string', () => {
  const b = badge('some future provenance shape we did not anticipate');
  assert.equal(b.label, 'Verified');
  assert.equal(b.tier, 'verified');
});
