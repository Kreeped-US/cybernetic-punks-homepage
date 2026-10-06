// lib/dmz/entities.poi.test.mjs
// POI slug move (official-name slugs): legacy redirects fire only once the destination row exists,
// hidden-from-lists follows the same rule, and linkifier aliases only appear for existing targets.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { POI_LEGACY_REDIRECTS, poiLegacyTarget, visiblePoiRows, poiLinkTargets, poiHubDesc, DMZ_THREAT_LEVELS, DMZ_ENTITIES } from './entities.js';

const OLD = ['broadcast', 'casino', 'fallout', 'farmlands', 'hajin-city', 'hospital', 'military-base', 'prison', 'town'];
const NEW = ['14th-political-prison', 'chang-san-air-base', 'deadtown', 'imjin-farmland', 'cheongun-village', 'mirae-general-hospital', 'cheonwang-peak-array', 'haneul-nuclear-reactor', 'nurigo-mall', 'the-grid', 'songdo-wharf', 'wolves-stadium', 'hajin-river-heights', 'hajin-city'];
const set = (slugs) => Object.fromEntries(slugs.map((s) => [s, true]));
// Before the SQL: today's 9 rows. After: the 4 updated in place are renamed; 10 inserted; the 5 old
// unverified rows still exist until the cleanup step.
const BEFORE = set(OLD);
const AFTER = set([...NEW, 'broadcast', 'casino', 'farmlands', 'hospital', 'town']);

test('before the slug SQL: renamed and repurposed slugs do NOT redirect (old pages keep rendering)', () => {
  for (const s of ['prison', 'fallout', 'military-base', 'casino', 'hospital', 'farmlands']) assert.equal(poiLegacyTarget(s, BEFORE), null, s);
});

test('hub-targeted legacy slugs redirect immediately (the hub always exists)', () => {
  assert.equal(poiLegacyTarget('broadcast', BEFORE), '/dmz/pois');
  assert.equal(poiLegacyTarget('town', BEFORE), '/dmz/pois');
});

test('after the slug SQL: every legacy slug redirects to its approved target', () => {
  assert.deepEqual(Object.fromEntries(Object.keys(POI_LEGACY_REDIRECTS).map((s) => [s, poiLegacyTarget(s, AFTER)])), {
    'prison': '/dmz/pois/14th-political-prison',
    'fallout': '/dmz/pois/haneul-nuclear-reactor',
    'military-base': '/dmz/pois/chang-san-air-base',
    'casino': '/dmz/pois/cheongun-village#heavenly-luck-casino',
    'hospital': '/dmz/pois/mirae-general-hospital',
    'farmlands': '/dmz/pois/imjin-farmland',
    'broadcast': '/dmz/pois',
    'town': '/dmz/pois',
  });
});

test('after the 5 old unverified rows are DELETED: every legacy slug still redirects (destination-only rule)', () => {
  const AFTER_DELETE = set(NEW); // broadcast, casino, farmlands, hospital, town rows gone
  assert.deepEqual(Object.fromEntries(Object.keys(POI_LEGACY_REDIRECTS).map((s) => [s, poiLegacyTarget(s, AFTER_DELETE)])), {
    'prison': '/dmz/pois/14th-political-prison',
    'fallout': '/dmz/pois/haneul-nuclear-reactor',
    'military-base': '/dmz/pois/chang-san-air-base',
    'casino': '/dmz/pois/cheongun-village#heavenly-luck-casino',
    'hospital': '/dmz/pois/mirae-general-hospital',
    'farmlands': '/dmz/pois/imjin-farmland',
    'broadcast': '/dmz/pois',
    'town': '/dmz/pois',
  });
});

test('hub description: Part 1 wording only once a listed row is Part 1-sourced; no count, no verified/unconfirmed claim', () => {
  const p = DMZ_ENTITIES.pois;
  assert.equal(poiHubDesc(p, [{ slug: 'prison' }]), p.hubDescLegacy);
  assert.equal(poiHubDesc(p, [{ slug: 'prison' }, { slug: 'deadtown', source_label: 'x' }]), p.hubDesc);
  assert.doesNotMatch(p.hubDesc, /verified|unconfirmed/i);
  assert.doesNotMatch(p.hubDesc, /\d+\s+(major\s+)?(locations|points of interest|POIs)/i, 'no hardcoded location count');
  assert.match(p.hubDesc, /Deep Dive Part 1 \(pre-release\)/);
  assert.ok(!/[^\x00-\x7f]/.test(p.hubDesc), 'ASCII only');
});

test('hajin-city and every new slug never redirect', () => {
  for (const s of NEW) assert.equal(poiLegacyTarget(s, AFTER), null, s);
});

test('lists hide rows whose redirect is live, and only those', () => {
  const rows = (slugs) => Object.keys(slugs).map((slug) => ({ slug, name: slug }));
  assert.deepEqual(visiblePoiRows(rows(BEFORE)).map((r) => r.slug).sort(), OLD.filter((s) => s !== 'broadcast' && s !== 'town').sort());
  assert.deepEqual(visiblePoiRows(rows(AFTER)).map((r) => r.slug).sort(), [...NEW].sort());
});

test('linkifier targets: aliases only for existing targets; longest first; legacy-live rows dropped', () => {
  const before = poiLinkTargets([{ slug: 'prison', name: 'Prison' }, { slug: 'fallout', name: 'Fallout' }, { slug: 'town', name: 'Town' }]);
  assert.deepEqual(before, [{ name: 'Fallout', slug: 'fallout' }, { name: 'Prison', slug: 'prison' }]);
  const after = poiLinkTargets([{ slug: '14th-political-prison', name: '14th Political Prison' }, { slug: 'haneul-nuclear-reactor', name: 'Haneul Nuclear Reactor' }, { slug: 'hajin-city', name: 'Hajin City' }]);
  assert.deepEqual(after.map((e) => e.name), ['Haneul Nuclear Reactor', '14th Political Prison', 'Hajin City', 'Fallout', 'Prison']);
  assert.equal(after.find((e) => e.name === 'Prison').slug, '14th-political-prison');
  assert.ok(!after.some((e) => e.name === 'Military Base'), 'no alias for the inferred Chang-san mapping');
});

test('threat labels and the threat note: exact labels; the note does not rank the middle levels', () => {
  assert.deepEqual(DMZ_THREAT_LEVELS, ['Low', 'Medium', 'High', 'Critical', 'Extreme']);
  const note = DMZ_ENTITIES.pois.threatNote;
  assert.match(note, /Low as the lowest/);
  assert.match(note, /Extreme as the highest/);
  assert.match(note, /does not define the order of Medium, High and Critical/);
});

test('POI facts and description: new fields only when present (older rows unchanged)', () => {
  const p = DMZ_ENTITIES.pois;
  const old = { name: 'Town', poi_type: 'town', notable_features: [] };
  assert.deepEqual(p.facts(old), [{ label: 'Type', value: 'town' }]);
  assert.equal(p.detailDesc(old), "Where to find Town in DMZ's Hajin Exclusion Zone (town): location, notable features, and how it fits the map.");
  const fresh = { name: 'Deadtown', poi_type: 'town', area: 'Southwest Hajin', territory: 'NK', source_label: 'x', notable_features: ['a', 'b'] };
  assert.deepEqual(p.facts(fresh).map((f) => f.label), ['Location', 'Previous territory', 'Type', 'Notable Features']);
  assert.match(p.detailDesc(fresh), /\(Southwest Hajin\): expected threat levels/);
});
