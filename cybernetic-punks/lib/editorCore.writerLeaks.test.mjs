// lib/editorCore.writerLeaks.test.mjs
// Guards the writer-template PIPELINE_LEAK fix (2026-09-24). Two properties:
//   (cond 4) renderCradlePerkLine honest-nulls an UNCHECKED perk (no Energy number, no marker), and
//            no RENDERED Marathon editor prompt contains a bare /segment outside a markdown link.
//   (cond 5) the fixed CTA example lines (the markdown internal links) PASS the PIPELINE_LEAK detector.
// Renders through the REAL chokepoint (applyVocab(applyKit(...))) exactly like scripts/render-prompts.mjs.
// NOTE: editorCore.js uses extensionless imports, so run this file WITH the resolve hook:
//   node --import ./scripts/ext-resolve.register.mjs --test lib/editorCore.writerLeaks.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EDITOR_PROMPTS, buildMirandaPrompt, renderCradlePerkLine } from './editorCore.js';
import { resolveKit, applyKit, resolveVocab, applyVocab } from './editors/promptVocab.js';
import { getGameConfig } from './games/index.js';
import { detectPipelineLeak } from './gsc/detectPipelineLeak.js';

const cfg = getGameConfig('marathon');
const render = (text) => applyVocab(applyKit(text, resolveKit(cfg)), resolveVocab(cfg));
const MIRANDA_STUB = {
  videos: [], redditPosts: [], devNews: [], devRedditPosts: [],
  shellContext: [], weaponContext: [], modContext: [], implantContext: [],
  recentHeadlines: [], xData: null, _directive: null,
};

const rendered = {};
for (const ed of ['CIPHER', 'NEXUS', 'DEXTER', 'GHOST', 'MIRANDA']) rendered[ed] = render(EDITOR_PROMPTS[ed]);
rendered.buildMirandaPrompt = render(buildMirandaPrompt(MIRANDA_STUB));

// ── (cond 4) renderCradlePerkLine honest-null ─────────────────────────────────────────────────
test('UNCHECKED cradle perk renders with NO number and NO marker (honest-null)', () => {
  const line = renderCradlePerkLine({ node_name: 'Quick Vent', cumulative_energy: 12, effect: 'faster vent', is_perk: true });
  assert.ok(line.includes('Quick Vent'), 'perk name still renders');
  assert.ok(line.includes('faster vent'), 'qualitative effect still renders');
  assert.ok(line.includes('@ breakpoint'), 'renders "@ breakpoint" instead of the number');
  assert.equal(line.includes('12'), false, 'the unverified Energy NUMBER never reaches the prompt');
  assert.equal(line.includes('[UNVERIFIED]'), false, 'no hedge marker on an omitted number');
});

test('CONFIRMED cradle perk renders its Energy number, no marker', () => {
  const line = renderCradlePerkLine({ node_name: 'Quick Vent', cumulative_energy: 12, effect: 'x', is_perk: true, verified: true, verified_source: 'datamine' });
  assert.ok(line.includes('12 Energy'), 'confirmed number is stated as fact');
  assert.equal(line.includes('[UNVERIFIED]'), false);
  assert.equal(line.includes('[SOURCE-LISTED]'), false);
});

test('SOURCE-LISTED cradle perk keeps its number + attribution marker (unchanged register)', () => {
  const line = renderCradlePerkLine({ node_name: 'Quick Vent', cumulative_energy: 12, effect: 'x', is_perk: true, patch_verified: 's2' });
  assert.ok(line.includes('12 Energy'), 'source-listed number is attributed, not withheld');
  assert.ok(line.includes('[SOURCE-LISTED]'), 'attribution marker preserved');
});

// ── (cond 4) no bare /segment in any rendered Marathon prompt (outside markdown link syntax) ────
test('no rendered Marathon prompt contains a bare route path outside a markdown link', () => {
  for (const [ed, text] of Object.entries(rendered)) {
    const routes = detectPipelineLeak([{ slug: ed, body: text }]).findings.filter((f) => f.kind === 'route');
    assert.equal(routes.length, 0, ed + ' leaks a bare route: ' + JSON.stringify(routes));
  }
});

// ── (cond 4) the leak phrase is gone from the templates ────────────────────────────────────────
test('no rendered Marathon prompt still tells the model to say "exact values are unconfirmed"', () => {
  for (const [ed, text] of Object.entries(rendered)) {
    assert.equal(text.toLowerCase().includes('exact values are unconfirmed'), false, ed + ' still narrates the leak phrase');
  }
});

// ── (cond 5) the fixed CTA markdown-link lines PASS the PIPELINE_LEAK detector ──────────────────
test('the CTA internal-link lines pass the PIPELINE_LEAK detector (markdown link, not bare path)', () => {
  const ctaLines = Object.values(rendered).join('\n').split('\n').filter((l) => l.includes('](/marathon/'));
  assert.ok(ctaLines.length > 0, 'expected rendered CTA markdown links containing (/marathon/...)');
  const hits = detectPipelineLeak([{ slug: 'cta', body: ctaLines.join('\n') }]).findings;
  assert.equal(hits.length, 0, 'CTA lines must pass the detector: ' + JSON.stringify(hits));
});
