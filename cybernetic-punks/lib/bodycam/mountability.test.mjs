// lib/bodycam/mountability.test.mjs
// Locks the Bodycam mountability DAG resolver (lib/bodycam/mountability.js) -- the ONE novel piece
// (no flat-slot precedent), proven correct in isolation BEFORE any UI/route/data depends on it.
// Run: node --test lib/bodycam/mountability.test.mjs
//
// SYNTHETIC FIXTURES ONLY. Every part below is CLEARLY FAKE (test-* slugs / "Test ..." names). They
// exist to exercise the graph logic; they are NEVER seeded into the DB and NEVER rendered as product
// content. This is logic verification, not fabrication of game data.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveMountable,
  providedSlots,
  compatibleSlugSet,
  mountableSlugs,
  BASE_SLOTS_DEFAULT,
  REASON,
} from './mountability.js';

const WEAPON = 'TestGun';

// --- synthetic fixtures (fake parts) ----------------------------------------
const RAIL = { slug: 'test-rail', name: 'Test Side Rail', slot_type: 'side-rail', requires_slots: [], provides_slots: ['optic-mount'], toggle_group: null };
const OPTIC = { slug: 'test-optic', name: 'Test Optic', slot_type: 'optic', requires_slots: ['optic-mount'], provides_slots: [], toggle_group: null };
const BARREL = { slug: 'test-barrel', name: 'Test Barrel', slot_type: 'barrel', requires_slots: [], provides_slots: [], toggle_group: null };
const BARREL_2 = { slug: 'test-barrel-2', name: 'Test Barrel Two', slot_type: 'barrel', requires_slots: [], provides_slots: [], toggle_group: null };
// canted-optic toggle pair: both occupy slot_type 'optic', both require optic-mount, share a toggle_group
const OPTIC_PRIMARY = { slug: 'test-optic-primary', name: 'Test Primary Optic', slot_type: 'optic', requires_slots: ['optic-mount'], provides_slots: [], toggle_group: 'og1' };
const OPTIC_CANTED = { slug: 'test-optic-canted', name: 'Test Canted Optic', slot_type: 'optic', requires_slots: ['optic-mount'], provides_slots: [], toggle_group: 'og1' };

// compat helper: mark every given attachment compatible with WEAPON
function compatAll(parts, weapon = WEAPON) {
  return parts.map((p) => ({ weapon_name: weapon, attachment_slug: p.slug, compatible: true }));
}
function findRow(rows, slug) {
  return rows.find((r) => r.slug === slug);
}

// --- the confirmed dependency edge: rail before sight -----------------------

test('confirmed edge: optic is NOT mountable until a rail (provides optic-mount) is mounted', () => {
  const attachments = [RAIL, OPTIC];
  const compatibility = compatAll(attachments);

  // nothing mounted: rail mountable, optic locked (needs optic-mount)
  const before = resolveMountable({ weapon: WEAPON, attachments, compatibility, mountedParts: [] });
  assert.equal(findRow(before, 'test-rail').mountable, true, 'rail mounts on the bare weapon');
  const opticBefore = findRow(before, 'test-optic');
  assert.equal(opticBefore.mountable, false, 'optic locked with no rail');
  assert.equal(opticBefore.reason, REASON.REQUIRES_SLOTS);
  assert.deepEqual(opticBefore.missing, ['optic-mount'], 'reason names the missing mount-point');
});

test('confirmed edge: mounting the rail UNLOCKS the optic', () => {
  const attachments = [RAIL, OPTIC];
  const compatibility = compatAll(attachments);
  const after = resolveMountable({ weapon: WEAPON, attachments, compatibility, mountedParts: [RAIL] });
  const optic = findRow(after, 'test-optic');
  assert.equal(optic.mountable, true, 'optic mountable once the rail provides optic-mount');
  assert.equal(optic.reason, null);
});

// --- base-slot parts (empty requires) ---------------------------------------

test('base-slot part (requires_slots empty) is mountable immediately', () => {
  const attachments = [BARREL];
  const rows = resolveMountable({ weapon: WEAPON, attachments, compatibility: compatAll(attachments), mountedParts: [] });
  assert.equal(findRow(rows, 'test-barrel').mountable, true);
});

// --- weapon incompatibility -------------------------------------------------

test('weapon incompatibility gates a part out regardless of slots', () => {
  const attachments = [BARREL];
  // compatibility row says compatible:false -> not in the compatible set
  const compatibility = [{ weapon_name: WEAPON, attachment_slug: BARREL.slug, compatible: false }];
  const rows = resolveMountable({ weapon: WEAPON, attachments, compatibility, mountedParts: [] });
  const barrel = findRow(rows, 'test-barrel');
  assert.equal(barrel.mountable, false);
  assert.equal(barrel.reason, REASON.INCOMPATIBLE);
});

test('a part with NO compatibility row for this weapon is incompatible', () => {
  const attachments = [BARREL];
  const compatibility = compatAll(attachments, 'OtherGun'); // compatible with a different weapon only
  const rows = resolveMountable({ weapon: WEAPON, attachments, compatibility, mountedParts: [] });
  assert.equal(findRow(rows, 'test-barrel').reason, REASON.INCOMPATIBLE);
});

// --- slot occupancy + the canted-optic toggle exception ---------------------

test('a filled slot_type blocks another part in that slot', () => {
  const attachments = [BARREL, BARREL_2];
  const rows = resolveMountable({ weapon: WEAPON, attachments, compatibility: compatAll(attachments), mountedParts: [BARREL] });
  const second = findRow(rows, 'test-barrel-2');
  assert.equal(second.mountable, false);
  assert.equal(second.reason, REASON.SLOT_OCCUPIED);
});

test('canted-optic toggle: a second optic sharing a toggle_group CO-EXISTS in the optic slot', () => {
  const attachments = [RAIL, OPTIC_PRIMARY, OPTIC_CANTED];
  const compatibility = compatAll(attachments);
  // rail + primary optic mounted; the canted optic shares toggle_group 'og1'
  const rows = resolveMountable({ weapon: WEAPON, attachments, compatibility, mountedParts: [RAIL, OPTIC_PRIMARY] });
  const canted = findRow(rows, 'test-optic-canted');
  assert.equal(canted.mountable, true, 'canted optic mounts alongside the primary via shared toggle_group');
  assert.equal(canted.reason, null);
});

test('a non-toggle second optic is still blocked by the occupied optic slot', () => {
  const NON_TOGGLE_OPTIC = { slug: 'test-optic-plain', name: 'Test Plain Optic', slot_type: 'optic', requires_slots: ['optic-mount'], provides_slots: [], toggle_group: null };
  const attachments = [RAIL, OPTIC_PRIMARY, NON_TOGGLE_OPTIC];
  const compatibility = compatAll(attachments);
  const rows = resolveMountable({ weapon: WEAPON, attachments, compatibility, mountedParts: [RAIL, OPTIC_PRIMARY] });
  const plain = findRow(rows, 'test-optic-plain');
  assert.equal(plain.mountable, false);
  assert.equal(plain.reason, REASON.SLOT_OCCUPIED);
});

// --- already-mounted ---------------------------------------------------------

test('an already-mounted part is reported already-mounted (not slot-occupied)', () => {
  const attachments = [BARREL];
  const rows = resolveMountable({ weapon: WEAPON, attachments, compatibility: compatAll(attachments), mountedParts: [BARREL] });
  const barrel = findRow(rows, 'test-barrel');
  assert.equal(barrel.mountable, false);
  assert.equal(barrel.reason, REASON.ALREADY_MOUNTED);
});

// --- skeleton / empty-input cases (zero parts, no weapon) -------------------

test('empty attachment list -> empty result (the empty-table skeleton case, no crash)', () => {
  assert.deepEqual(resolveMountable({ weapon: WEAPON, attachments: [], compatibility: [], mountedParts: [] }), []);
});

test('no weapon selected -> every part reports no-weapon-selected', () => {
  const attachments = [RAIL, OPTIC];
  const rows = resolveMountable({ weapon: null, attachments, compatibility: compatAll(attachments), mountedParts: [] });
  assert.equal(rows.length, 2);
  assert.ok(rows.every((r) => r.mountable === false && r.reason === REASON.NO_WEAPON));
});

test('resolveMountable() with no args does not throw and returns []', () => {
  assert.deepEqual(resolveMountable(), []);
});

// --- helper units -----------------------------------------------------------

test('providedSlots unions baseSlots with mounted parts provides_slots (de-duped)', () => {
  assert.deepEqual(providedSlots([]).sort(), [], 'empty by default (BASE_SLOTS_DEFAULT is empty)');
  assert.deepEqual(providedSlots([RAIL]).sort(), ['optic-mount']);
  // baseSlots override (the per-weapon integral-mount seam)
  assert.deepEqual(providedSlots([], ['optic-mount']).sort(), ['optic-mount']);
  // de-dup: base provides optic-mount AND a rail provides it -> single entry
  assert.deepEqual(providedSlots([RAIL], ['optic-mount']).sort(), ['optic-mount']);
});

test('BASE_SLOTS_DEFAULT is empty (rail-before-sight: optic-mount is not free)', () => {
  assert.deepEqual(BASE_SLOTS_DEFAULT, []);
});

test('baseSlots override lets an integral optic-mount weapon take an optic with no rail', () => {
  const attachments = [OPTIC];
  const rows = resolveMountable({ weapon: WEAPON, attachments, compatibility: compatAll(attachments), mountedParts: [], baseSlots: ['optic-mount'] });
  assert.equal(findRow(rows, 'test-optic').mountable, true, 'optic mounts directly when the weapon provides optic-mount');
});

test('compatibleSlugSet only includes compatible=true rows for the weapon', () => {
  const rows = [
    { weapon_name: WEAPON, attachment_slug: 'a', compatible: true },
    { weapon_name: WEAPON, attachment_slug: 'b', compatible: false },
    { weapon_name: 'OtherGun', attachment_slug: 'c', compatible: true },
  ];
  const set = compatibleSlugSet(rows, WEAPON);
  assert.equal(set.has('a'), true);
  assert.equal(set.has('b'), false, 'compatible:false excluded');
  assert.equal(set.has('c'), false, 'other weapon excluded');
});

test('mountableSlugs returns just the mountable slugs', () => {
  const attachments = [RAIL, OPTIC, BARREL];
  const slugs = mountableSlugs({ weapon: WEAPON, attachments, compatibility: compatAll(attachments), mountedParts: [] });
  assert.deepEqual(slugs.sort(), ['test-barrel', 'test-rail'], 'rail + barrel mount now; optic waits for the rail');
});
