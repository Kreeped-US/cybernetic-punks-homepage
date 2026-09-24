// lib/games/marathonRoutes.test.mjs
// Condition-2 guard: every entry in the hand-listed MARATHON_ROUTES allowlist must map to a REAL
// app-router page (app/marathon/<segment>/page.js). This is what makes the hand-listed constant
// "router-derived": a typo, a stale entry, or a deleted page fails here instead of shipping a prompt
// that teaches the model a dead internal link. Run: node --test lib/games/marathonRoutes.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MARATHON_ROUTES } from './marathonRoutes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_MARATHON = path.resolve(__dirname, '..', '..', 'app', 'marathon');

test('every MARATHON_ROUTES value is a canonical /marathon/<seg> path (no bare path, no redirect hop)', () => {
  for (const [key, route] of Object.entries(MARATHON_ROUTES)) {
    assert.match(route, /^\/marathon\/[a-z0-9-]+(\/[a-z0-9-]+)*$/, key + ' must be a /marathon/-prefixed path, got: ' + route);
  }
});

test('every MARATHON_ROUTES value has a real app/marathon/<seg>/page.js (router-backed)', () => {
  for (const [key, route] of Object.entries(MARATHON_ROUTES)) {
    const seg = route.replace(/^\/marathon\//, ''); // e.g. "cradle" (or "a/b" for nested)
    const pageJs = path.join(APP_MARATHON, ...seg.split('/'), 'page.js');
    assert.ok(fs.existsSync(pageJs), key + ' (' + route + ') has no router page at ' + path.relative(APP_MARATHON, pageJs));
  }
});
