// lib/dmz/buildPage.test.mjs
// Brief 178: build-page honesty. No ranking claim in the title, H1, description or hub title; a grade only when
// stored (never a default letter); "verified" wording only when every cited row is verified; the view renders
// accordingly (fixture data, no DB).
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { BUILD_GRADES, buildTitle, buildH1, buildDescription, buildGrade } from './buildPage.js';
import { BUILDS_HUB } from './buildsHub.js';
import { loadComponent, render } from '../games/jsxHarness.test-helper.mjs';

const BEST = /\bbest\b/i;

test('title, H1 and description: no "best"; weapon named; title <= 60', () => {
  for (const name of ['Han 86', 'FSS Carbon Edge 1095', 'A Very Long Weapon Name That Keeps Going On And On']) {
    const t = buildTitle(name);
    assert.ok(t.length <= 60 && !BEST.test(t), t);
    assert.ok(!BEST.test(buildH1(name)) && buildH1(name).includes(name));
  }
  assert.equal(buildH1('Han 86'), 'MW4 DMZ Han 86 Build: FOB Gunsmith Loadout');
  assert.ok(!BEST.test(BUILDS_HUB.hubTitle) && !BEST.test(BUILDS_HUB.hubDesc));
});

test('description: verified wording only when confirmed; never "in-game"; Apex only when cited', () => {
  const withApex = { apex_attachment: { attachment_slug: 'x1' } };
  assert.equal(buildDescription('Han 86', withApex, true), 'The MW4 DMZ Han 86 build for the FOB Gunsmith: attachments by slot plus the Apex attachment. Every part is verified against its source.');
  assert.equal(buildDescription('Han 86', {}, false), 'The MW4 DMZ Han 86 build for the FOB Gunsmith: attachments by slot. Not every part is verified yet.');
  for (const c of [true, false]) {
    const d = buildDescription('Han 86', withApex, c);
    assert.ok(!BEST.test(d) && !/in-game|in game/i.test(d), d);
    assert.equal(/Every part is verified/.test(d), c);
  }
});

test('grade: the stored letter only; missing, blank or unknown -> null (no default)', () => {
  assert.deepEqual(BUILD_GRADES, ['S', 'A', 'B', 'C', 'D']);
  for (const g of BUILD_GRADES) assert.equal(buildGrade({ loadout_grade: g }), g);
  assert.equal(buildGrade({ loadout_grade: ' b ' }), 'B');
  for (const bj of [null, undefined, {}, { loadout_grade: '' }, { loadout_grade: 'A+' }, { loadout_grade: 'F' }, { loadout_grade: 3 }]) assert.equal(buildGrade(bj), null, JSON.stringify(bj));
});

// The view, rendered from fixture data (async server component called directly; client children stubbed).
let View;
before(async () => {
  View = (await loadComponent('components/dmz/DmzBuildView.js', {
    stubs: {
      'next/headers': 'export async function cookies() { return { get() { return undefined; } }; }\n',
      './DmzNotifyStrip': 'export default function DmzNotifyStrip() { return null; }\n',
      './SaveBuildButton': 'export default function SaveBuildButton() { return null; }\n',
    },
  })).default;
});
const FIX = (grade, verified) => ({
  build: { slug: 'han-86-fob' },
  build_json: Object.assign({ weapon: { slug: 'han-86', name: 'Han 86' }, standard_attachments: [{ slot_slug: 'optic', attachment_slug: 'o1', name: 'Fixture Optic' }], apex_attachment: null }, grade ? { loadout_grade: grade } : {}),
  weapon: { slug: 'han-86', name: 'Han 86', verified: true },
  attachmentsBySlug: { o1: { slug: 'o1', name: 'Fixture Optic', verified } },
});
const html = async (r) => {
  const el = await View({ resolved: r, weaponName: 'Han 86', weaponSlug: 'han-86' });
  return render(() => el);
};

test('view: no grade block without a stored grade; the stored grade shows; neutral H1; banner wording', async () => {
  const none = await html(FIX(null, false));
  assert.ok(!none.includes('LOADOUT GRADE'), 'no grade block');
  assert.match(none, /<h1[^>]*>MW4 DMZ Han 86 Build: FOB Gunsmith Loadout<\/h1>/);
  assert.ok(!BEST.test(none.replace(/<style[\s\S]*?<\/style>/g, '')), 'no "best" anywhere');
  assert.ok(none.includes('UNCONFIRMED - one or more components are not yet verified. This page is'));
  assert.ok(!/or at launch/.test(none));
  const graded = await html(FIX('B', true));
  assert.ok(graded.includes('LOADOUT GRADE') && />B<\/div>/.test(graded));
  assert.ok(!graded.includes('UNCONFIRMED'), 'verified build: no banner');
});

test('source: the route uses the pure helpers; the old strings are gone', () => {
  const route = readFileSync(path.resolve('app/dmz/builds/[weapon]/page.js'), 'utf8');
  assert.ok(route.includes('const description = buildDescription(weaponName, resolved.build_json, indexable);'));
  const view = readFileSync(path.resolve('components/dmz/DmzBuildView.js'), 'utf8');
  for (const s of ["bj.loadout_grade || 'A'", 'Best MW4 DMZ', 'assembled from verified in-game data']) {
    assert.ok(!view.includes(s) && !route.includes(s), s);
  }
});
