// lib/content/pipelineMarkers.test.mjs
// Brief 246: a publish-gate check for literal pipeline markers. verificationTag (lib/verification.js)
// appends [UNVERIFIED] / [SOURCE-LISTED] to stat lines in the model's input; a body that repeats one
// must not publish. Pins the check, its token source, its two integrations (checkBodyIntegrity,
// detectPipelineLeak -> decideGate) and that the generator's output is unchanged.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { findPipelineMarkers, PIPELINE_MARKER_TOKENS, describePipelineMarker } from './pipelineMarkers.js';
import { VERIFICATION_MARKERS, verificationTag, VERIFICATION_NOTE } from '../verification.js';
import { checkBodyIntegrity } from './bodyIntegrity.js';
import { detectPipelineLeak } from '../gsc/detectPipelineLeak.js';
import { decideGate } from '../gsc/prePublishGate.js';

const tokens = (body) => findPipelineMarkers(body).map((f) => f.token);

test('each token in prose is found, with its index and about 60 characters of context', () => {
  const body = 'Thief\'s sources list the Knife at [UNVERIFIED] 80 damage, which matters in close fights.';
  const r = findPipelineMarkers(body);
  assert.equal(r.length, 1);
  assert.equal(r[0].token, '[UNVERIFIED]');
  assert.equal(r[0].matched, '[UNVERIFIED]');
  assert.equal(r[0].index, body.indexOf('[UNVERIFIED]'));
  assert.equal(r[0].context, 'urces list the Knife at [UNVERIFIED] 80 damage, which matter');
  assert.equal(r[0].context.length, 60);
  assert.deepEqual(tokens('Bully SMG - sources list it at 540 RPM [SOURCE-LISTED].'), ['[SOURCE-LISTED]']);
});

test('both tokens in one body, every occurrence, in order', () => {
  assert.deepEqual(tokens('A [SOURCE-LISTED] b [UNVERIFIED] c [UNVERIFIED].'), ['[SOURCE-LISTED]', '[UNVERIFIED]', '[UNVERIFIED]']);
});

test('the bracketed form matches case-insensitively; token is canonical, matched is as written', () => {
  const r = findPipelineMarkers('Quick Vent [unverified] and Rodeo Mag [Source-Listed].');
  assert.deepEqual(r.map((f) => [f.token, f.matched]), [['[UNVERIFIED]', '[unverified]'], ['[SOURCE-LISTED]', '[Source-Listed]']]);
});

test('bare words and other bracket text are not flagged', () => {
  assert.deepEqual(findPipelineMarkers('The breakpoint is unverified; sources list it, source-listed or UNVERIFIED.'), []);
  assert.deepEqual(findPipelineMarkers('Hit the [Chip] and read [HP:125, Shield:30, Speed:Medium] first. [M2 Browning] [expletive]'), []);
  assert.deepEqual(findPipelineMarkers('[ UNVERIFIED ] and [UNVERIFIED-ish] and UNVERIFIED]'), []);
});

test('a markdown link is unaffected; a body with no markers returns no findings', () => {
  assert.deepEqual(findPipelineMarkers('Map it in the [Cradle planner](/marathon/cradle) first.'), []);
  assert.deepEqual(findPipelineMarkers('Plain prose with nothing to flag.'), []);
  assert.deepEqual(findPipelineMarkers(''), []);
  assert.deepEqual(findPipelineMarkers(undefined), []);
});

test('the token list comes from lib/verification.js', () => {
  assert.deepEqual([...PIPELINE_MARKER_TOKENS], Object.values(VERIFICATION_MARKERS));
  assert.deepEqual([...PIPELINE_MARKER_TOKENS].sort(), ['[SOURCE-LISTED]', '[UNVERIFIED]']);
  assert.ok(readFileSync(new URL('./pipelineMarkers.js', import.meta.url), 'utf8').includes("import { VERIFICATION_MARKERS } from '../verification.js';"));
  // What the generator emits is exactly what the gate looks for.
  assert.deepEqual(tokens('x' + verificationTag({ patch_verified: 's2' }) + verificationTag({})), ['[SOURCE-LISTED]', '[UNVERIFIED]']);
});

test('verificationTag and VERIFICATION_NOTE output is unchanged', () => {
  assert.equal(verificationTag({ verified: true, verified_source: 'owner in-game check' }), '');
  assert.equal(verificationTag({ patch_verified: 's2' }), ' [SOURCE-LISTED]');
  assert.equal(verificationTag({}), ' [UNVERIFIED]');
  assert.equal(verificationTag({ patch_verified: 's1' }), ' [UNVERIFIED]');
  assert.equal(verificationTag({ verified: true, verified_source: 'damage unverified' }), ' [UNVERIFIED]');
  // sha256 of VERIFICATION_NOTE as it was on main before Brief 246 (1634 characters).
  assert.equal(VERIFICATION_NOTE.length, 1634);
  assert.equal(createHash('sha256').update(VERIFICATION_NOTE).digest('hex'), '25c3100dd5bde62654db3407fcb5d7dad97a3a4ab110f98a3b23f4e2e48bd0af');
});

test('integration: checkBodyIntegrity reports one PIPELINE_MARKER problem per occurrence', () => {
  const body = 'x'.repeat(420) + '\n\nBoth perks are [UNVERIFIED] in their exact values; the Rodeo Mag is [SOURCE-LISTED] at +60.';
  const r = checkBodyIntegrity({ headline: 'A headline', body, gameSlug: 'marathon' });
  const m = r.problems.filter((p) => p.code === 'PIPELINE_MARKER');
  assert.equal(r.ok, false);
  assert.equal(m.length, 2);
  assert.equal(m[0].message, "The body contains the literal pipeline marker [UNVERIFIED]; say it in words, for example 'unconfirmed' or 'sources list it as'.");
  assert.equal(m[1].message, describePipelineMarker({ token: '[SOURCE-LISTED]' }));
  assert.ok(m.every((p) => typeof p.detail === 'string' && p.detail.length > 0));
  assert.match(m[0].detail, /Both perks are \[UNVERIFIED\] in their/);
  const ok = checkBodyIntegrity({ headline: 'A headline', body: 'x'.repeat(420) + '\n\nBoth perks are unconfirmed in their exact values.', gameSlug: 'dmz' });
  assert.equal(ok.problems.filter((p) => p.code === 'PIPELINE_MARKER').length, 0);
});

test('integration: detectPipelineLeak blocks with PIPELINE_LEAK, held even in Marathon log-only mode', () => {
  const r = detectPipelineLeak([{ slug: 's', game_slug: 'marathon', body: 'The [UNVERIFIED] Quick Vent perk accelerates heat recovery.' }]);
  const m = r.findings.filter((f) => f.kind === 'pipeline-marker');
  assert.deepEqual(m.map((f) => [f.class, f.kind, f.matched, f.slug]), [['PIPELINE_LEAK', 'pipeline-marker', '[UNVERIFIED]', 's']]);
  assert.match(m[0].verbatim, /The \[UNVERIFIED\] Quick Vent perk/);
  const decision = decideGate(r.findings, 'log-only', false);
  assert.equal(decision.hold, true);
  assert.equal(decision.gate_status, 'held');
  // Game-agnostic: the same body holds for every game.
  for (const g of ['dmz', 'wardogs', 'pubg-dednet', 'bodycam']) {
    assert.equal(detectPipelineLeak([{ slug: g, game_slug: g, body: 'Sources list it at 450 RPM [source-listed].' }]).findings.filter((f) => f.kind === 'pipeline-marker').length, 1, g);
  }
  const clean = detectPipelineLeak([{ slug: 'c', game_slug: 'marathon', body: 'The Quick Vent perk, unconfirmed in its exact values, speeds heat recovery. [Chip] [HP:125, Shield:30, Speed:Medium]' }]);
  assert.equal(clean.findings.filter((f) => f.kind === 'pipeline-marker').length, 0);
});

test('wiring: both gate families call the shared check', () => {
  const read = (f) => readFileSync(new URL('../../' + f, import.meta.url), 'utf8');
  assert.match(read('lib/content/bodyIntegrity.js'), /for \(const f of findPipelineMarkers\(body\)\) \{\r?\n\s*problems\.push\(\{ code: 'PIPELINE_MARKER'/);
  assert.ok(read('lib/gsc/detectPipelineLeak.js').includes("kind: 'pipeline-marker'"));
  assert.ok(read('lib/gsc/detectPipelineLeak.js').includes('for (const f of findPipelineMarkers(body)) {'));
});
