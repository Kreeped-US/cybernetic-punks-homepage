// lib/games/gameRoutes.test.mjs
// Guards the per-game CTA route allowlist (lib/games/gameRoutes.js). Every declared route must map to
// a REAL app-router page (app/<game>/<seg>/page.js) -- a typo or a deleted page fails here instead of
// shipping a prompt CTA that points at a dead internal link. The `live` flag is a reviewed constant
// (indexability is a runtime/data fact), so this test does NOT assert it -- it only asserts every
// entry (live or not) has a real page. Run: node --test lib/games/gameRoutes.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GAME_ROUTES, MARATHON_ROUTES } from './gameRoutes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP = path.resolve(__dirname, '..', '..', 'app');

function pageExists(route) {
  // '/marathon/cradle' -> app/marathon/cradle/page.js
  const segs = route.replace(/^\//, '').split('/');
  return fs.existsSync(path.join(APP, ...segs, 'page.js'));
}

test('every GAME_ROUTES entry has a canonical /<game>/... path and a real page.js', () => {
  for (const [game, routes] of Object.entries(GAME_ROUTES)) {
    for (const [key, r] of Object.entries(routes)) {
      assert.ok(r && typeof r.path === 'string', game + '.' + key + ' must have a path');
      assert.match(r.path, /^\/[a-z0-9-]+(\/[a-z0-9-]+)*$/, game + '.' + key + ' path shape: ' + r.path);
      assert.equal(typeof r.live, 'boolean', game + '.' + key + ' must set a boolean live flag');
      assert.ok(pageExists(r.path), game + '.' + key + ' (' + r.path + ') has no app router page');
    }
  }
});

test('MARATHON_ROUTES still resolves to real pages (re-exported via marathonRoutes.js)', () => {
  for (const [key, route] of Object.entries(MARATHON_ROUTES)) {
    assert.ok(pageExists(route), key + ' (' + route + ') has no app router page');
  }
});

test('live CTA routes never point at a known-noindex subtree (dmz/pubg/bodycam have no live CTA yet)', () => {
  // Pre-launch / noindex games must not expose a live CTA route until their tools are indexable.
  for (const g of ['dmz', 'pubg-dednet', 'bodycam']) {
    const routes = GAME_ROUTES[g] || {};
    for (const [key, r] of Object.entries(routes)) {
      assert.equal(r.live, false, g + '.' + key + ' must be live:false pre-launch (' + r.path + ')');
    }
  }
});
