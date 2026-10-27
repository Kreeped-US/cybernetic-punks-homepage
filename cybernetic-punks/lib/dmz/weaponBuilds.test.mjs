// lib/dmz/weaponBuilds.test.mjs
// Brief 178: isBuildIndexable (the derived honesty gate shared by the build route, the /dmz/builds hub and
// sitemap-dmz-builds.xml). Indexable only when the weapon AND every standard attachment AND the cited Apex
// resolve to verified rows, with the depth floor (weapon + at least one standard attachment).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isBuildIndexable } from './weaponBuilds.js';

const W = { slug: 'han-86', name: 'Han 86', verified: true };
const A = (slug, verified, extra) => Object.assign({ slug, verified }, extra || {});
const resolved = (opts) => ({
  build: { slug: 'han-86-fob' },
  build_json: Object.assign({
    weapon: { slug: 'han-86', name: 'Han 86' },
    standard_attachments: [{ slot_slug: 'optic', attachment_slug: 'o1' }, { slot_slug: 'muzzle', attachment_slug: 'm1' }],
    apex_attachment: { attachment_slug: 'x1' },
  }, opts.bj || {}),
  weapon: 'weapon' in opts ? opts.weapon : W,
  attachmentsBySlug: opts.attach || { o1: A('o1', true), m1: A('m1', true), x1: A('x1', true, { is_apex: true }) },
});

test('verified: weapon, every standard attachment and the Apex verified -> indexable', () => {
  assert.equal(isBuildIndexable(resolved({})), true);
  // No Apex cited: the standard set alone decides.
  assert.equal(isBuildIndexable(resolved({ bj: { apex_attachment: null }, attach: { o1: A('o1', true), m1: A('m1', true) } })), true);
});

test('unverified: an unverified weapon, standard attachment or Apex -> not indexable', () => {
  assert.equal(isBuildIndexable(resolved({ weapon: Object.assign({}, W, { verified: false }) })), false);
  assert.equal(isBuildIndexable(resolved({ attach: { o1: A('o1', false), m1: A('m1', true), x1: A('x1', true) } })), false);
  assert.equal(isBuildIndexable(resolved({ attach: { o1: A('o1', true), m1: A('m1', true), x1: A('x1', false) } })), false);
  // verified must be strictly true (not truthy).
  assert.equal(isBuildIndexable(resolved({ attach: { o1: A('o1', 'true'), m1: A('m1', true), x1: A('x1', true) } })), false);
});

test('partial: a cited attachment or Apex that does not resolve (orphan) -> not indexable', () => {
  assert.equal(isBuildIndexable(resolved({ attach: { o1: A('o1', true), x1: A('x1', true) } })), false, 'missing standard row');
  assert.equal(isBuildIndexable(resolved({ attach: { o1: A('o1', true), m1: A('m1', true) } })), false, 'missing Apex row');
  assert.equal(isBuildIndexable(resolved({ weapon: null })), false, 'missing weapon row');
});

test('empty: no build, no build_json, or no standard attachment (depth floor) -> not indexable', () => {
  assert.equal(isBuildIndexable(null), false);
  assert.equal(isBuildIndexable(undefined), false);
  assert.equal(isBuildIndexable({ build_json: null }), false);
  assert.equal(isBuildIndexable(resolved({ bj: { standard_attachments: [] } })), false);
  assert.equal(isBuildIndexable(resolved({ bj: { standard_attachments: undefined, apex_attachment: null } })), false);
});
