// lib/security/cronAuth.test.mjs
// Unit tests for the fail-closed cron auth gate. Run:
//   node --import ./scripts/ext-resolve.register.mjs --test lib/security/cronAuth.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { authorizeCron } from './cronAuth.js';

// Minimal Request stand-in: only headers.get('authorization') is read by the gate.
function req(authValue) {
  return { headers: { get: (k) => (k === 'authorization' ? authValue : null) } };
}

const ORIG = process.env.CRON_SECRET;
function withSecret(v, fn) {
  if (v === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = v;
  try { return fn(); }
  finally {
    if (ORIG === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = ORIG;
  }
}

test('CRON_SECRET unset -> deny (503), never allow', () => {
  withSecret(undefined, () => {
    const g = authorizeCron(req('Bearer anything'), 'test');
    assert.equal(g.ok, false);
    assert.equal(g.response.status, 503);
  });
});

test('CRON_SECRET blank/whitespace -> deny (503)', () => {
  withSecret('   ', () => {
    const g = authorizeCron(req('Bearer   '), 'test');
    assert.equal(g.ok, false);
    assert.equal(g.response.status, 503);
  });
});

test('wrong secret -> deny (401)', () => {
  withSecret('s3cret-value', () => {
    const g = authorizeCron(req('Bearer wrong-value'), 'test');
    assert.equal(g.ok, false);
    assert.equal(g.response.status, 401);
  });
});

test('missing Authorization header -> deny (401)', () => {
  withSecret('s3cret-value', () => {
    const g = authorizeCron(req(null), 'test');
    assert.equal(g.ok, false);
    assert.equal(g.response.status, 401);
  });
});

test('bare secret without "Bearer " prefix -> deny (401)', () => {
  withSecret('s3cret-value', () => {
    const g = authorizeCron(req('s3cret-value'), 'test');
    assert.equal(g.ok, false);
    assert.equal(g.response.status, 401);
  });
});

test('correct Bearer secret -> allow', () => {
  withSecret('s3cret-value', () => {
    const g = authorizeCron(req('Bearer s3cret-value'), 'test');
    assert.equal(g.ok, true);
    assert.equal(g.response, undefined);
  });
});
