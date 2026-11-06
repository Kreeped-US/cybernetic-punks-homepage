// app/marathon/advisor/AdvisorLabel.test.mjs
// Brief 293: the Advisor result renders the build confidence label with the same component and wording as
// the stored build pages, differing only in the date phrase; with no label it renders none (never a default
// Unconfirmed). Rendered with react-dom/server through the JSX harness; no DB, no network, no model call.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { loadComponent, render } from '../../../lib/games/jsxHarness.test-helper.mjs';

const reactUrl = pathToFileURL(createRequire(import.meta.url).resolve('react')).href;
// The harness compiles one file at a time, so JSX children are loaded first and handed over via globals.
const TIERS_STUB = 'export const CONFIDENCE_TIERS = globalThis.__b293Tiers.CONFIDENCE_TIERS;\nexport const TierIcon = globalThis.__b293Tiers.TierIcon;\n';
const NOTE_STUB = 'export default globalThis.__b293Note;\n';

let BuildLabelNote, AdvisorClient, BuildView;
before(async () => {
  globalThis.__b293Tiers = await loadComponent('components/network/confidenceTiers.js');
  BuildLabelNote = (await loadComponent('components/marathon/BuildLabelNote.js', { stubs: { '@/components/network/confidenceTiers': TIERS_STUB } })).default;
  globalThis.__b293Note = BuildLabelNote;
  AdvisorClient = (await loadComponent('app/marathon/advisor/AdvisorClient.js', {
    stubs: {
      react: "import R from '" + reactUrl + "';\nexport const useState = R.useState;\nexport const useRef = R.useRef;\nexport const useEffect = R.useEffect;\n",
      '@/lib/useIsMobile': 'export function useIsMobile() { return false; }\n',
      '@/lib/useTrack': 'export function track() {}\n',
      '@/lib/monetization': 'export function isMonetizationEnabled() { return false; }\n',
      '@supabase/supabase-js': 'export function createClient() { return {}; }\n',
      '@/components/marathon/BuildLabelNote': NOTE_STUB,
    },
  })).default;
  BuildView = (await loadComponent('app/marathon/tools/build/[shell]/BuildView.js', { stubs: { '@/components/marathon/BuildLabelNote': NOTE_STUB } })).default;
});

const LABEL = { tier: 'verified', verified: 14, total: 14, checkedOn: 'November 6, 2026' };
const BUILD = {
  build_name: 'Fixture Build', loadout_grade: 'A', shell: 'Thief', playstyle_summary: 'Fixture summary.',
  primary_weapon: { name: 'Fixture AR', reason: 'r' }, secondary_weapon: { name: 'Fixture SMG', reason: 'r' },
  mods: [{ slot: 'Optic', name: 'Fixture Mod', reason: 'r' }], cores: [{ name: 'Fixture Core', ability_type: 'Prime', reason: 'r' }],
  implants: [{ slot: 'Head', name: 'Fixture Implant', stat_change: 'x', reason: 'r' }],
  cradle: { summary: 'c', tracks: [] }, strengths: ['s'], weaknesses: ['w'], dexter_analysis: 'a',
};
const SHELLS = [{ name: 'Thief', color: '#ff8800', role: 'Fixture', desc: 'd', symbol: 'T', primeName: 'p', tacticalName: 't' }];

test('the shared label renders the tier, the count and the generated-date wording', () => {
  const html = render(BuildLabelNote, { label: LABEL, checkedPhrase: 'when this build was generated' });
  assert.ok(html.includes('Verified'));
  assert.ok(html.includes('14 of 14 parts verified'));
  assert.ok(html.includes('The Cradle stat plan is not covered by this label.'));
  assert.ok(html.includes('Checked against our data when this build was generated: November 6, 2026.'));
  assert.ok(!html.includes('when this page was built'));
});

test('the shared label maps attributed to Reported and pending to Unconfirmed', () => {
  assert.ok(render(BuildLabelNote, { label: Object.assign({}, LABEL, { tier: 'attributed' }) }).includes('Reported'));
  assert.ok(render(BuildLabelNote, { label: Object.assign({}, LABEL, { tier: 'pending' }) }).includes('Unconfirmed'));
});

test('no checkedPhrase -> no date sentence, tier and counts still shown', () => {
  const html = render(BuildLabelNote, { label: LABEL });
  assert.ok(html.includes('Verified'));
  assert.ok(html.includes('14 of 14 parts verified'));
  assert.ok(html.includes('The Cradle stat plan is not covered by this label.'));
  assert.ok(!html.includes('Checked against our data'));
  assert.ok(!html.includes('November 6, 2026'));
});

test('no label in -> nothing rendered', () => {
  assert.equal(render(BuildLabelNote, { label: null, checkedPhrase: 'when this build was generated' }), '');
});

test('the Advisor result shows the label near the build name, with the generated-date wording', () => {
  const html = render(AdvisorClient, { shells: SHELLS, initialBuild: BUILD, initialLabel: LABEL });
  const at = html.indexOf('14 of 14 parts verified');
  assert.ok(at > 0, 'label rendered');
  assert.ok(html.includes('Checked against our data when this build was generated: November 6, 2026.'));
  const name = html.indexOf('Fixture Build');
  assert.ok(name > at && name - at < 4000, 'label sits just above the build card that carries the build name');
});

test('the Advisor result with no label shows no label and no default tier', () => {
  const html = render(AdvisorClient, { shells: SHELLS, initialBuild: BUILD });
  assert.ok(html.includes('Fixture Build'));
  assert.ok(!html.includes('parts verified'));
  assert.ok(!html.includes('Unconfirmed'));
  assert.ok(!html.includes('Checked against our data'));
});

test('the stored build pages keep their wording through the same component', () => {
  const html = render(BuildView, { build: BUILD, label: LABEL });
  assert.ok(html.includes('14 of 14 parts verified'));
  assert.ok(html.includes('Checked against our data when this page was built: November 6, 2026.'));
  assert.ok(!html.includes('when this build was generated'));
});
