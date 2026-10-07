// app/dmz/DmzNav.test.mjs
// The DMZ nav's extra TRAITS tab: rendered once, outside dmz.sections, active on exactly /dmz/traits,
// and it never steals or gives away another tab's active state. Plus source checks that /dmz/traits is
// not in the Marathon nav, the sitemap code, the shared section predicate or dmz.sections.
// DmzNav is rendered through the JSX harness with usePathname stubbed per test.
import { test, before, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { loadComponent, render } from '../../lib/games/jsxHarness.test-helper.mjs';
import { dmz } from '../../lib/games/dmz.js';

let Nav;
let TRAITS_TAB;
before(async () => {
  // 'react' hooks map to the same React instance the harness renders with (useEffect does not run
  // in a server render); usePathname reads the path each test sets.
  const reactUrl = pathToFileURL(createRequire(import.meta.url).resolve('react')).href;
  const mod = await loadComponent('app/dmz/DmzNav.js', {
    stubs: {
      react: "import R from '" + reactUrl + "';\nexport const useEffect = R.useEffect;\nexport const useRef = R.useRef;\n",
      'next/navigation': 'export function usePathname() { return globalThis.__dmzNavPath; }\n',
    },
  });
  Nav = mod.default;
  TRAITS_TAB = mod.TRAITS_TAB;
});
afterEach(() => { delete globalThis.__dmzNavPath; });

function renderAt(p) {
  globalThis.__dmzNavPath = p;
  return render(Nav, {});
}
const links = (html) => html.match(/<a [^>]*>.*?<\/a>/g) || [];
const activeLinks = (html) => links(html).filter((a) => a.includes('data-active="true"'));
const traitsLinks = (html) => links(html).filter((a) => a.includes('href="/dmz/traits"'));

test('TRAITS_TAB constant: /dmz/traits, WIP chip, not a dmz.sections entry', () => {
  assert.deepEqual(TRAITS_TAB, { label: 'Traits', href: '/dmz/traits', chip: 'WIP' });
  assert.ok(!dmz.sections.some((s) => s.slug === 'traits' || s.navHref === '/dmz/traits'));
});

test('exactly one /dmz/traits link, after the section tabs, with the WIP chip', () => {
  const html = renderAt('/dmz');
  assert.equal(traitsLinks(html).length, 1);
  assert.match(traitsLinks(html)[0], />Traits<span[^>]*>WIP<\/span><\/a>/);
  const hrefs = links(html).map((a) => a.match(/href="([^"]+)"/)[1]);
  assert.equal(hrefs.indexOf('/dmz/traits'), hrefs.length - 2, 'last tab, before the Network link');
  assert.equal(hrefs[hrefs.length - 1], '/');
});

test('WIP chip reuses the SOON chip style (one shared CHIP_STYLE)', () => {
  // No section renders SOON today (the only data section, printer, is a standalone reference), so
  // the shared style is pinned by source, and the rendered WIP chip by its exact style.
  const src = readFileSync(path.resolve('app/dmz/DmzNav.js'), 'utf8');
  assert.match(src, /<span style=\{CHIP_STYLE\}>SOON<\/span>/);
  assert.match(src, /<span style=\{CHIP_STYLE\}>\{TRAITS_TAB\.chip\}<\/span>/);
  assert.equal((src.match(/fontSize: 7,/g) || []).length, 1, 'the chip style is defined once');
  const wip = renderAt('/dmz').match(/<span style="([^"]*)">WIP<\/span>/);
  assert.equal(wip[1], 'font-size:7px;font-weight:700;letter-spacing:1px;color:var(--text-tertiary);border:1px solid var(--border);border-radius:2px;padding:1px 4px');
});

test('on /dmz/traits: the TRAITS tab is the only active tab', () => {
  const html = renderAt('/dmz/traits');
  const act = activeLinks(html);
  assert.equal(act.length, 1);
  assert.match(act[0], /href="\/dmz\/traits"/);
  assert.match(act[0], /aria-current="page"/);
});

test('active on no other path: hub, sections, articles, look-alike and sub paths', () => {
  for (const p of ['/dmz', '/dmz/field-intel', '/dmz/fob/some-article', '/dmz/pois', '/dmz/regions', '/dmz/keys', '/dmz/builds', '/dmz/traitsx', '/dmz/traits/x', '/dmz/trait']) {
    const t = traitsLinks(renderAt(p))[0];
    assert.ok(!t.includes('data-active'), p);
  }
});

test('section tabs keep their active state (the extra tab takes nothing from them)', () => {
  for (const [p, href] of [['/dmz/field-intel', '/dmz/field-intel'], ['/dmz/fob/some-article', '/dmz/fob'], ['/dmz/regions', '/dmz/pois'], ['/dmz/pois/x', '/dmz/pois']]) {
    const act = activeLinks(renderAt(p));
    assert.equal(act.length, 1, p);
    assert.match(act[0], new RegExp('href="' + href.replace(/\//g, '\\/') + '"'), p);
  }
});

test('source checks: /dmz/traits is not in the Marathon nav, sitemap code, section predicate or dmz.sections', () => {
  const root = path.resolve('.');
  const files = ['components/Nav.js', 'lib/dmz/sections.js']
    .concat(readdirSync(path.join(root, 'lib/sitemap')).filter((f) => f.endsWith('.js')).map((f) => 'lib/sitemap/' + f));
  for (const f of files) assert.ok(!readFileSync(path.join(root, f), 'utf8').includes('/dmz/traits'), f);
  assert.ok(!JSON.stringify(dmz.sections).includes('/dmz/traits'), 'dmz.sections');
  assert.ok(!JSON.stringify(dmz.sections).includes('traits'), 'no traits section slug');
});
