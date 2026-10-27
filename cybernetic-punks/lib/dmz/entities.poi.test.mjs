// lib/dmz/entities.poi.test.mjs
// POI slug move (official-name slugs): legacy redirects fire only once the destination row exists,
// hidden-from-lists follows the same rule, and linkifier aliases only appear for existing targets.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { POI_LEGACY_REDIRECTS, poiLegacyTarget, visiblePoiRows, poiLinkTargets, poiHubDesc, DMZ_THREAT_LEVELS, DMZ_ENTITIES, capitalisePlainWord } from './entities.js';

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

test('hub description (sourced branch) claims only what the hub shows: no "threat levels and regions", no count', () => {
  const d = DMZ_ENTITIES.pois.hubDesc;
  assert.doesNotMatch(d, /threat levels and regions/i);
  // The only digit allowed is the source's own name, "Deep Dive Part 1".
  assert.doesNotMatch(d.replace('Deep Dive Part 1', 'Deep Dive Part'), /\d/, 'no digit apart from the source name');
  assert.match(d, /Open a location for its expected threat levels\.$/, 'threat levels pointed to the detail pages');
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
  // value stays as stored; display is the capitalised form (Brief 121, display only).
  assert.deepEqual(p.facts(old), [{ label: 'Type', value: 'town', display: 'Town' }]);
  assert.equal(p.detailDesc(old), "Where to find Town in DMZ's Hajin Exclusion Zone (town): location, notable features, and how it fits the map.");
  const fresh = { name: 'Deadtown', poi_type: 'town', area: 'Southwest Hajin', territory: 'NK', source_label: 'x', notable_features: ['a', 'b'] };
  assert.deepEqual(p.facts(fresh).map((f) => f.label), ['Location', 'Previous territory', 'Type', 'Notable Features']);
  // Brief 174: each clause only when the page shows that block. fresh has features but no threat rows or neighbours.
  assert.equal(p.detailDesc(fresh), "Where to find Deadtown in DMZ's Hajin Exclusion Zone (Southwest Hajin): notable features, per Activision's pre-release Deep Dive Part 1.");
});

// Brief 174: the Part 1 description names only the blocks the page renders (threat table, Notable Features,
// "Located in", "Nearby locations"), in page order; ctx carries the route's resolved nearby / contained counts.
test('POI description: clauses follow the rendered blocks, never an empty one', () => {
  const p = DMZ_ENTITIES.pois;
  const base = { name: 'X', area: 'Northwest Hajin', source_label: 'x' };
  const T = [{ name: 'A', level: 'High' }];
  const tail = ", per Activision's pre-release Deep Dive Part 1.";
  const head = "Where to find X in DMZ's Hajin Exclusion Zone (Northwest Hajin)";
  // All four.
  assert.equal(p.detailDesc(Object.assign({}, base, { threat_levels: T, notable_features: ['f'] }), { nearby: 2, contained: 3 }),
    head + ': expected threat levels, notable features, the locations inside it and nearby locations' + tail);
  // The 14th Political Prison shape: threats and features, no neighbours.
  assert.equal(p.detailDesc(Object.assign({}, base, { threat_levels: T, notable_features: ['f'], neighbors: [] })),
    head + ': expected threat levels and notable features' + tail);
  // The Hajin City shape: no threat rows, no area, features, members only (neighbours all members -> nearby 0).
  assert.equal(p.detailDesc({ name: 'X', source_label: 'x', threat_levels: [], notable_features: ['f'], neighbors: ['a', 'b'] }, { nearby: 0, contained: 4 }),
    "Where to find X in DMZ's Hajin Exclusion Zone: notable features and the locations inside it" + tail);
  // Nothing to show -> no colon clause at all.
  assert.equal(p.detailDesc(Object.assign({}, base, { threat_levels: [{ name: 'A' }], notable_features: [] }), { nearby: 0 }), head + tail);
  // Without ctx, nearby falls back to the stored neighbours.
  assert.match(p.detailDesc(Object.assign({}, base, { neighbors: ['a'] })), /: nearby locations, per/);
  // The other entities ignore ctx.
  for (const k of ['keys', 'missions', 'items']) {
    const r = { name: 'Y', slug: 'y' };
    assert.equal(DMZ_ENTITIES[k].detailDesc(r, { nearby: 5, contained: 5 }), DMZ_ENTITIES[k].detailDesc(r), k);
  }
});

test('POI facts: Type capitalised for display only when a plain lowercase word; features carry the stored list', () => {
  const p = DMZ_ENTITIES.pois;
  const type = (t) => p.facts({ poi_type: t }).find((f) => f.label === 'Type');
  for (const [t, shown] of [['district', 'District'], ['facility', 'Facility'], ['city', 'City'], ['zone', 'Zone'], ['town', 'Town']]) {
    assert.deepEqual(type(t), { label: 'Type', value: t, display: shown }, t);
  }
  for (const t of ['City Hall', 'District', 'zone-2', 'u2', 'two words', 'Zone']) {
    assert.deepEqual(type(t), { label: 'Type', value: t }, 'not a plain lowercase word: ' + t);
  }
  assert.equal(capitalisePlainWord(42), 42);
  assert.equal(capitalisePlainWord(''), '');
  const stored = ['Steel wall; razor wire', 'Second entry', 'Third'];
  const nf = p.facts({ notable_features: stored }).find((f) => f.label === 'Notable Features');
  assert.equal(nf.value, 'Steel wall; razor wire; Second entry; Third', 'string form unchanged (JSON-LD)');
  assert.deepEqual(nf.items, stored, 'entries and order as stored');
  assert.notEqual(nf.items, stored, 'a copy, not the row array');
  assert.equal(p.facts({ notable_features: [] }).find((f) => f.label === 'Notable Features'), undefined);
  // Other entity types are untouched: no display or items fields.
  for (const key of ['keys', 'missions', 'items']) {
    const fs = DMZ_ENTITIES[key].facts({ location: 'l', unlocks: 'u', map_region: 'm', faction: 'f', tier: 1, objectives: ['a', 'b'], reward: 'r', category: 'c', sell_value: 1, use: 'x' });
    for (const f of fs) assert.deepEqual(Object.keys(f), ['label', 'value'], key + ' ' + f.label);
  }
});
