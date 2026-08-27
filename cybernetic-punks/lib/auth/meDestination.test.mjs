// lib/auth/meDestination.test.mjs
// The /me routing decision (Community v1 Piece A). /me is the game-agnostic network hub:
// ANY authenticated account renders it; the Marathon dashboard is a conditional section.
// There is no non-Marathon bounce -- a Discord-only account now RENDERS the hub (was: a
// redirect to /u/[handle]). Owner-gate lives in the caller; this proves the pure branch table.
// Run: node --test lib/auth/meDestination.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { meDestination } from './meDestination.js';

test('no session -> /join (logged out)', () => {
  assert.deepEqual(meDestination(null), { redirect: '/join' });
});

test('Marathon session (playerProfileId) -> render the hub (Marathon section shows)', () => {
  assert.deepEqual(meDestination({ playerProfileId: 'p1', accountId: null }), { render: true });
});

test('bridged session (playerProfileId + accountId) -> render the hub', () => {
  assert.deepEqual(meDestination({ playerProfileId: 'p1', accountId: 'a1' }), { render: true });
});

test('Discord-only session (accountId, NO playerProfileId) -> RENDER the hub (was: /u/[handle] bounce)', () => {
  assert.deepEqual(meDestination({ playerProfileId: null, accountId: 'a1' }), { render: true });
});

test('empty session object (neither id) -> defensive /join (never an error)', () => {
  assert.deepEqual(meDestination({ playerProfileId: null, accountId: null }), { redirect: '/join' });
});

test('owner-only: the decision is render-or-/join, never a redirect to another user', () => {
  const d = meDestination({ playerProfileId: null, accountId: 'a1' });
  assert.equal(d.render, true);
  assert.equal(d.redirect, undefined, 'the hub never redirects an authed owner to another path');
});
