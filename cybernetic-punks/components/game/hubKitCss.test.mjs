// components/game/hubKitCss.test.mjs
// Brief 212: the hub kit's linked CutCard (a.hk-cut) keyboard focus ring. .hk-cut is clipped by clip-path, which also
// clips an outline drawn outside the box, so the ring must sit inside the edge: a negative outline-offset, on
// :focus-visible only (no ring on mouse click). The kit stays game-agnostic.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HUB_KIT_CSS } from './hubKitCss.js';

test('a.hk-cut focus ring: 2px accent outline with a negative offset, focus-visible only', () => {
  const m = HUB_KIT_CSS.match(/a\.hk-cut:focus-visible\{([^}]*)\}/);
  assert.ok(m, 'a.hk-cut:focus-visible rule present');
  assert.match(m[1], /outline:2px solid var\(--hk-accent,#[0-9a-f]{6}\)/);
  const off = m[1].match(/outline-offset:(-?\d+)px/);
  assert.ok(off && Number(off[1]) < 0, 'outline-offset is negative (inside the clip-path): ' + (off && off[1]));
  assert.ok(/\.hk-cut\{[^}]*clip-path:/.test(HUB_KIT_CSS), 'the card is clipped, which is why the offset is negative');
  assert.ok(!/a\.hk-cut:focus\{/.test(HUB_KIT_CSS), 'no plain :focus ring (mouse clicks show none)');
});

test('the kit CSS names no game', () => {
  assert.ok(!/dmz|marathon|wardogs|pubg|hajin/i.test(HUB_KIT_CSS));
});
