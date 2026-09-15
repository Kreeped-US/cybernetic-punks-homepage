// lib/content/durabilityGate.test.mjs
// PROVES the durability gate blocks the ACTUAL recent churn and allows the ACTUAL
// recent durable pieces (all three were the same editor -- NEXUS -- verified in the
// DB). The load-bearing assertions the operator asked for: BLOCK the 1.1.9.1 patch
// reaction; ALLOW the Symbiosis-delay announcement + the Wardogs Black Market
// explainer. Plus the reset-window logic (config-driven, auto-lifting).
// Run: node --test lib/content/durabilityGate.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyDurability, isResetRestricted, RESET_WINDOW_DAYS,
  buildDurablePatchBlock, buildDurabilitySelfSelectBlock,
} from './durabilityGate.js';

// ── THE OPERATOR'S BLOCK/ALLOW TEST (real recent feed_items headlines) ──
test('BLOCKS the churn: "Marathon 1.1.9.1: Vault sell bug fixed, meta holds"', () => {
  const r = classifyDurability('Marathon 1.1.9.1: Vault sell bug fixed, meta holds');
  assert.equal(r.class, 'stale_fast', r.reason);
});
test('ALLOWS the announcement: "Marathon Delays Major Update to December, Resets Economy October"', () => {
  const r = classifyDurability('Marathon Delays Major Update to December, Resets Economy October');
  assert.equal(r.class, 'durable', r.reason);
});
test('ALLOWS the explainer: "Wardogs Black Market: What\'s Actually Live vs. What\'s Still Coming"', () => {
  const r = classifyDurability("Wardogs Black Market: What's Actually Live vs. What's Still Coming");
  assert.equal(r.class, 'durable', r.reason);
});

// ── MORE STALE-FAST (the churn class) ──
test('stale: patch-version reaction "Marathon Rook Shell: What the 1.1.9 Inventory Upgrade Means"', () => {
  assert.equal(classifyDurability('Marathon Rook Shell: What the 1.1.9 Inventory Upgrade Means').class, 'stale_fast');
});
test('stale: "Marathon Update 1.1.5.2: Twin Tap HBR and the Precision Meta"', () => {
  assert.equal(classifyDurability('Marathon Update 1.1.5.2: Twin Tap HBR and the Precision Meta').class, 'stale_fast');
});
test('stale: tier list', () => {
  assert.equal(classifyDurability('Marathon Shell Tier List: September Rankings').class, 'stale_fast');
});
test('stale: "best right now" current-meta call', () => {
  assert.equal(classifyDurability('The Best Shell Right Now After the Patch').class, 'stale_fast');
});
test('stale: nerf/buff balance snapshot', () => {
  assert.equal(classifyDurability('Every Weapon Nerfed This Season').class, 'stale_fast');
});

// ── MORE DURABLE (the good class) ──
test('durable: mechanics explainer "The Trickle Charge Mechanic"', () => {
  assert.equal(classifyDurability('Marathon Volt Battery Weapons: The Trickle Charge Mechanic').class, 'durable');
});
test('durable: how-it-works', () => {
  assert.equal(classifyDurability('How the Cradle Energy System Works').class, 'durable');
});
test('durable: sourced announcement (roadmap)', () => {
  assert.equal(classifyDurability('Bulkhead Confirms the Season 2 Roadmap').class, 'durable');
});
test('durable-by-default: an ambiguous topic is allowed (held-for-review is the backstop)', () => {
  const r = classifyDurability('A Field Guide to Extraction Routes');
  assert.equal(r.class, 'durable', r.reason);
});

// ── RESET-WINDOW (config-driven, auto-lifting) ──
const cfg = (resetDate) => ({ editorial: resetDate ? { resetDate } : {} });
test('restricted: Marathon reset 3 weeks out is inside the window', () => {
  const now = new Date('2026-09-15T12:00:00Z');
  assert.equal(isResetRestricted(cfg('2026-10-06'), now), true);
});
test('NOT restricted: no resetDate configured (other games)', () => {
  assert.equal(isResetRestricted(cfg(null), new Date('2026-09-15T12:00:00Z')), false);
});
test('AUTO-LIFT: the day after the reset, restriction is gone (no manual re-enable)', () => {
  assert.equal(isResetRestricted(cfg('2026-10-06'), new Date('2026-10-07T12:00:00Z')), false);
});
test('NOT restricted: a reset far beyond the window', () => {
  const farOut = new Date(Date.now() + (RESET_WINDOW_DAYS + 10) * 86400000).toISOString().slice(0, 10);
  assert.equal(isResetRestricted(cfg(farOut), new Date()), false);
});

// ── PROMPT BLOCKS ──
test('patch block forbids the snapshot + names the reset window when restricted', () => {
  const restricted = { editorial: { resetDate: '2026-10-06', resetLabel: 'October 6 season reset' } };
  const b = buildDurablePatchBlock([{ title: 'Update 1.1.9.1' }], restricted);
  assert.match(b, /Do NOT write a patch-reaction snapshot/);
  assert.match(b, /October 6 season reset/);
  assert.match(b, /1\.1\.9\.1/);
});
test('self-select block steers toward durable', () => {
  const b = buildDurabilitySelfSelectBlock({ editorial: { resetDate: '2026-10-06' } });
  assert.match(b, /Choose a DURABLE topic/);
  assert.match(b, /avoid those topics entirely/);
});
