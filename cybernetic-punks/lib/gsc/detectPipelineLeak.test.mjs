// lib/gsc/detectPipelineLeak.test.mjs
// Regression guard for the PIPELINE_LEAK detector -- the pre-publish stage that holds a draft when
// pipeline/meta vocabulary or a bare route path leaks into reader-facing text. The dangerous cases:
// a real leak must BLOCK, a legitimate markdown link must NOT, and 'verified' must FLAG without
// blocking. Also pins the two rejected 2026-09-24 drafts (block) vs clean reader prose (pass).
// Run: node --test lib/gsc/detectPipelineLeak.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectPipelineLeak, PIPELINE_LEAK_PHRASES } from './detectPipelineLeak.js';

const block = (arts) => detectPipelineLeak(arts).findings;
const flags = (arts) => detectPipelineLeak(arts).flags;

// ── (a) PHRASES: each blocks, case-insensitive, in headline OR body ───────────────────────────
test('every phrase in PIPELINE_LEAK_PHRASES blocks (case-insensitive), in body', () => {
  for (const p of PIPELINE_LEAK_PHRASES) {
    const f = block([{ slug: 's', body: 'Lead sentence. ' + p.toUpperCase() + ' here.' }]);
    assert.ok(f.some((x) => x.kind === 'phrase' && x.matched === p), 'phrase should block: ' + p);
    assert.ok(f[0].verbatim && f[0].verbatim.length > 0, 'a snippet is recorded for: ' + p);
  }
});

test('a phrase in the HEADLINE blocks too', () => {
  const f = block([{ slug: 's', headline: 'Values are not verified yet', body: 'clean body.' }]);
  assert.ok(f.some((x) => x.kind === 'phrase' && x.matched === 'are not verified'));
});

test('the delta phrases are enforced/relaxed as tuned', () => {
  // 'this cycle' was DROPPED -> must NOT block.
  assert.equal(block([{ slug: 's', body: 'Coverage this cycle was light.' }]).length, 0);
  // bare 'not verified' was NARROWED to 'are not verified' -> reader-facing honesty does NOT block...
  assert.equal(block([{ slug: 's', body: 'Announced, not verified in-game yet.' }]).length, 0);
  // ...but the pipeline construction still blocks.
  assert.ok(block([{ slug: 's', body: 'The exact numbers are not verified.' }]).length > 0);
});

// ── (b) BARE ROUTE PATHS: block in prose, but NOT inside a markdown link / URL ─────────────────
test('a bare route path in prose BLOCKS', () => {
  const f = block([{ slug: 's', body: 'Map it to /cradle to plan your Energy.' }]);
  assert.ok(f.some((x) => x.kind === 'route' && x.matched === '/cradle'), 'bare /cradle blocks');
});

test('a multi-segment bare route path blocks and keeps its full path', () => {
  const f = block([{ slug: 's', body: 'The planner at /marathon/cradle helps.' }]);
  assert.ok(f.some((x) => x.kind === 'route' && x.matched === '/marathon/cradle'));
});

test('a route inside a markdown link does NOT block (href is stripped first)', () => {
  const f = block([{ slug: 's', body: 'Use the [Cradle planner](/marathon/cradle) to map it.' }]);
  assert.equal(f.filter((x) => x.kind === 'route').length, 0, 'a legitimate markdown href is not a leak');
});

test('a bare URL does NOT produce a route hit (URL stripped first)', () => {
  const f = block([{ slug: 's', body: 'See https://cyberneticpunks.com/marathon/cradle for details.' }]);
  assert.equal(f.filter((x) => x.kind === 'route').length, 0);
});

test('a fraction/date like 9/24 does NOT block (segment must be letter-led)', () => {
  const f = block([{ slug: 's', body: 'The patch on 9/24 changed things; a 3/4 ratio held.' }]);
  assert.equal(f.filter((x) => x.kind === 'route').length, 0);
});

test('route scan is body-only (a slash-word in a headline is not scanned as a route)', () => {
  const f = block([{ slug: 's', headline: 'Go to /cradle now', body: 'clean body.' }]);
  assert.equal(f.filter((x) => x.kind === 'route').length, 0);
});

// ── (c) 'verified' is FLAG-only: never in findings, always in flags ────────────────────────────
test("'verified' flags but never blocks", () => {
  const arts = [{ slug: 's', body: 'These are verified in-game values.' }];
  assert.equal(block(arts).length, 0, 'verified must NOT be a BLOCK finding');
  const fl = flags(arts);
  assert.ok(fl.some((x) => x.kind === 'verified' && x.class === 'PIPELINE_LEAK_FLAG'));
  assert.ok(fl[0].verbatim.length > 0, 'the flag carries a snippet');
});

// ── Finding shape: every BLOCK finding carries class/kind/matched/verbatim/slug ────────────────
test('every BLOCK finding carries the full shape (class, kind, matched, verbatim, slug)', () => {
  const f = block([{ slug: 'the-slug', body: 'in the database, map it to /cradle.' }]);
  assert.ok(f.length >= 2);
  for (const x of f) {
    assert.equal(x.class, 'PIPELINE_LEAK');
    assert.ok(x.kind === 'phrase' || x.kind === 'route');
    assert.ok(typeof x.matched === 'string' && x.matched.length > 0);
    assert.ok(typeof x.verbatim === 'string' && x.verbatim.length > 0);
    assert.equal(x.slug, 'the-slug');
  }
});

// ── Regression: the rejected 2026-09-24 drafts block; clean reader prose passes ────────────────
test('rejected 2026-09-24 evidence blocks (wardogs teaser + marathon V66 shapes)', () => {
  const wardogs = block([{ slug: 'w', body: 'All stat values in the database remain unverified. Coverage was only partially available. This article will not manufacture a trend.' }]);
  assert.ok(wardogs.length >= 3, 'wardogs leak phrases block');
  const v66 = block([{ slug: 'v', body: 'Both values are from unconfirmed sources and the exact numbers are not verified. Map it to /cradle to plan.' }]);
  assert.ok(v66.some((x) => x.kind === 'phrase' && x.matched === 'unconfirmed source'));
  assert.ok(v66.some((x) => x.kind === 'phrase' && x.matched === 'exact numbers are not'));
  assert.ok(v66.some((x) => x.kind === 'route' && x.matched === '/cradle'));
});

test('clean reader prose with a proper markdown link passes with zero BLOCK findings', () => {
  const clean = [{
    slug: 'c',
    headline: 'Vandal Shell: Movement and Heat',
    body: 'The Vandal excels at aggressive pushes. Use the [Cradle planner](/marathon/cradle) to map your Energy path before committing to a build.',
  }];
  assert.equal(block(clean).length, 0, 'no false positives on clean prose + a real link');
});

test('empty / missing input never throws and yields no hits', () => {
  assert.deepEqual(detectPipelineLeak([]), { findings: [], flags: [] });
  assert.deepEqual(detectPipelineLeak(null), { findings: [], flags: [] });
  assert.deepEqual(detectPipelineLeak([null, {}]), { findings: [], flags: [] });
});
