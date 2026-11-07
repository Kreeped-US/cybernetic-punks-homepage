// app/marathon/advisor/AdvisorClaims.test.mjs
// Brief 297: unbacked claims removed from the Marathon Advisor. (a) No Personal Coach / Early Adopter / priority
// access teaser renders on the Advisor input or result view, signed in or not. (b) The Cradle "resets each season"
// claim is gone from the stored build view and from every Cradle or respec line under app/ and lib/. (c) The
// generation prompt carries no loss-penalty figure for any rank target and keeps every score target.
// Rendered through the JSX harness; no DB, no network, no model call.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { loadComponent, render } from '../../../lib/games/jsxHarness.test-helper.mjs';
import { buildAdvisorPrompt } from '../../../lib/advisor/generateBuild.js';

const reactUrl = pathToFileURL(createRequire(import.meta.url).resolve('react')).href;

let AdvisorClient, BuildView;
before(async () => {
  AdvisorClient = (await loadComponent('app/marathon/advisor/AdvisorClient.js', {
    stubs: {
      react: "import R from '" + reactUrl + "';\nexport const useState = R.useState;\nexport const useRef = R.useRef;\nexport const useEffect = R.useEffect;\n",
      '@/lib/useIsMobile': 'export function useIsMobile() { return false; }\n',
      '@/lib/useTrack': 'export function track() {}\n',
      '@supabase/supabase-js': 'export function createClient() { return {}; }\n',
      '@/components/marathon/BuildLabelNote': 'export default function BuildLabelNote() { return null; }\n',
    },
  })).default;
  BuildView = (await loadComponent('app/marathon/tools/build/[shell]/BuildView.js', {
    stubs: { '@/components/marathon/BuildLabelNote': 'export default function BuildLabelNote() { return null; }\n' },
  })).default;
});

const BUILD = {
  build_name: 'Fixture Build', loadout_grade: 'A', shell: 'Thief', playstyle_summary: 'Fixture summary.',
  primary_weapon: { name: 'Fixture AR', reason: 'r' }, secondary_weapon: { name: 'Fixture SMG', reason: 'r' },
  mods: [{ slot: 'Optic', name: 'Fixture Mod', reason: 'r' }], cores: [{ name: 'Fixture Core', ability_type: 'Prime', reason: 'r' }],
  implants: [{ slot: 'Head', name: 'Fixture Implant', stat_change: 'x', reason: 'r' }],
  cradle: { summary: 'Fixture cradle summary.', tracks: [] }, strengths: ['s'], weaknesses: ['w'], dexter_analysis: 'a',
};
const SHELLS = [{ name: 'Thief', color: '#ff8800', role: 'Fixture', desc: 'd', symbol: 'T', primeName: 'p', tacticalName: 't' }];
const PREFILL = { shell: 'Thief', playstyle: 'balanced', name: 'Fixture Runner' };
const TEASER = /priority access|early adopter|personal coach|generic build/i;

test('(a) no Personal Coach or Early Adopter teaser on the Advisor input or result view, signed in or not', () => {
  const views = {
    'input, signed out': render(AdvisorClient, { shells: SHELLS }),
    'input, signed in': render(AdvisorClient, { shells: SHELLS, profilePrefill: PREFILL }),
    'result, signed out': render(AdvisorClient, { shells: SHELLS, initialBuild: BUILD }),
    'result, signed in': render(AdvisorClient, { shells: SHELLS, initialBuild: BUILD, profilePrefill: PREFILL }),
  };
  assert.ok(views['result, signed in'].includes('Fixture Build'), 'the result view rendered');
  for (const [name, html] of Object.entries(views)) assert.ok(!TEASER.test(html), name + ' shows a teaser phrase');
  const src = readFileSync(path.resolve('app/marathon/advisor/AdvisorClient.js'), 'utf8');
  assert.ok(!/isMonetizationEnabled|monetizationOn/.test(src), 'the flag import and variable are gone');
  assert.ok(!/EARLY ADOPTER|Priority access|Personal Coach/.test(src), 'the teaser text is gone from the source (the Sign in links stay)');
});

function walk(dir, out) {
  for (const e of readdirSync(dir)) {
    if (e === 'node_modules' || e.startsWith('.')) continue;
    const p = path.join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(m?js)$/.test(e) && !/\.test\.mjs$/.test(e)) out.push(p);
  }
  return out;
}

test('(b) "resets each season" is gone from the build view and from every Cradle or respec line', () => {
  const html = render(BuildView, { build: BUILD, label: null });
  assert.ok(html.includes('Free respec'), 'the respec note stays');
  assert.ok(!html.includes('resets each season'));
  const hits = [];
  for (const f of walk(path.resolve('app'), walk(path.resolve('lib'), []))) {
    readFileSync(f, 'utf8').split(/\r?\n/).forEach((line, i) => {
      if (line.includes('resets each season')) hits.push({ f: path.relative(process.cwd(), f).split(path.sep).join('/'), i: i + 1, line });
    });
  }
  for (const h of hits) {
    const isComment = /^\s*\/\//.test(h.line);
    // Remaining rendered uses are other claims (faction and rank progress), outside Brief 297; none is about the
    // Cradle or respec. Code comments that record the Cradle claim's removal are allowed.
    if (!isComment) {
      assert.ok(!/respec|cradle/i.test(h.line), h.f + ':' + h.i + ' ties "resets each season" to the Cradle or respec');
      assert.ok(/faction|rank/i.test(h.line), h.f + ':' + h.i + ' is an unexpected "resets each season" line');
    }
  }
});

test('(c) the generation prompt has no loss-penalty figure for any rank target and keeps the score targets', () => {
  const targets = { unranked: null, bronze: '3,000', silver: '5,000', gold: '7,000', platinum: '10,000', diamond: '15,000', pinnacle: '20,000' };
  for (const [rank, score] of Object.entries(targets)) {
    const p = buildAdvisorPrompt('Thief', 'balanced', rank, '', 'Solo', 'combat', 'learning', 'CONTEXT');
    assert.ok(!/loss penalty|penalty/i.test(p), rank + ' prompt still mentions a penalty');
    if (score) assert.ok(p.includes(score + ' score target'), rank + ' keeps its score target');
  }
  const p = buildAdvisorPrompt('Thief', 'balanced', 'platinum', '', 'Solo', 'combat', 'learning', 'CONTEXT');
  assert.ok(p.includes('Platinum Holotag (10,000 score target). High stakes. Every item choice must justify itself for ranked efficiency.'));
  assert.ok(p.includes('"ranked_note": "1 sentence specific to the rank target'), 'the ranked_note schema instruction is unchanged');
});
