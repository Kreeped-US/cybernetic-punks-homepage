// lib/auth/meDestination.test.mjs
// The /me routing decision (de-Marathoning, Option B). Marathon users render the dashboard
// unchanged; a DMZ/Discord-only account is handed off to /u/[handle], NOT bounced to /join; and a
// no-Marathon session NEVER reaches the Marathon query (render is gated on playerProfileId).
// Run: node --test lib/auth/meDestination.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { meDestination } from './meDestination.js';

test('no session -> /join (logged out, unchanged)', () => {
  assert.deepEqual(meDestination(null, null), { redirect: '/join' });
});

test('Marathon session (playerProfileId) -> render the dashboard (UNCHANGED)', () => {
  assert.deepEqual(meDestination({ playerProfileId: 'p1', accountId: null }, null), { render: true });
});

test('bridged Marathon session (playerProfileId + accountId) -> still renders the dashboard', () => {
  // A bridged user has both; playerProfileId wins -> the Marathon dashboard, never the hand-off.
  assert.deepEqual(meDestination({ playerProfileId: 'p1', accountId: 'a1' }, 'kreeped'), { render: true });
});

test('DMZ/Discord-only session (accountId, NO playerProfileId) -> hand off to /u/[handle], NOT /join', () => {
  assert.deepEqual(meDestination({ playerProfileId: null, accountId: 'a1' }, 'kreeped'), { redirect: '/u/kreeped' });
});

test('the hand-off NEVER reaches the Marathon query -> no render for a no-Marathon session', () => {
  const d = meDestination({ playerProfileId: null, accountId: 'a1' }, 'kreeped');
  assert.equal(d.render, undefined, 'a no-Marathon session is a redirect, never render (so eq(id,null).single() cannot run)');
});

test('account with NO handle -> defensive fallback /join (never an error)', () => {
  assert.deepEqual(meDestination({ playerProfileId: null, accountId: 'a1' }, null), { redirect: '/join' });
});

test('LOOP-SAFE: the only account redirect target is /u/[handle] (a public page that never redirects)', () => {
  const d = meDestination({ playerProfileId: null, accountId: 'a1' }, 'someone');
  assert.ok(d.redirect.startsWith('/u/'), '/me -> /u/[handle]; /u never redirects back -> no /me<->/u<->/join loop');
});
