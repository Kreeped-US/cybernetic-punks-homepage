// components/Footer.test.mjs
// Brief 175: the footer's optional linkContent (lib/games/linkGate.js). A gated EXPLORE route with 0 entries
// renders as plain text; a count above zero links again; no linkContent keeps every link. DMZ uses the THEMED
// footer (components/game/ThemedGameFooter.js), which components/Footer.js hands linkContent to; the generic
// footer path gets the same rule (tested with DMZ's footer forced to non-themed through a stub).
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { loadComponent, render } from '../lib/games/jsxHarness.test-helper.mjs';
import { getGameConfig } from '../lib/games/index.js';

let Themed;
let Footer;
before(async () => {
  Themed = (await loadComponent('components/game/ThemedGameFooter.js', {})).default;
  const reactUrl = pathToFileURL(createRequire(import.meta.url).resolve('react')).href;
  const gamesUrl = pathToFileURL(path.resolve('lib/games/index.js')).href;
  Footer = (await loadComponent('components/Footer.js', {
    stubs: {
      react: "import R from '" + reactUrl + "';\nexport const useState = R.useState;\n",
      // DMZ's footer with themed switched off, so the generic EXPLORE path renders.
      '@/lib/games': "import * as real from '" + gamesUrl + "';\nexport * from '" + gamesUrl + "';\n"
        + "export function getGameConfig(s) { var c = real.getGameConfig(s); return s === 'dmz' ? Object.assign({}, c, { footer: Object.assign({}, c.footer, { themed: null }) }) : c; }\n",
      '@/components/wardogs/WardogsFooter': 'export default function WardogsFooter() { return null; }\n',
      '@/components/game/ThemedGameFooter': 'export default function ThemedGameFooter() { return null; }\n',
    },
  })).default;
});

const GATED = ['/dmz/items', '/dmz/keys', '/dmz/missions', '/dmz/builds'];
const LABELS = ['Items', 'Keys', 'Missions', 'Builds'];
const LIVE = ['/dmz/field-intel', '/dmz/pois', '/dmz/weapons', '/dmz/traits', '/dmz/bounties'];
const ZERO = { '/dmz/meta': 0, '/dmz/discourse': 0, '/dmz/missions': 0, '/dmz/keys': 0, '/dmz/items': 0, '/dmz/builds': 0 };
const exploreOf = (html) => { const a = html.indexOf('EXPLORE'); return a < 0 ? '' : html.slice(a, html.indexOf('CONTACT', a) > 0 ? html.indexOf('CONTACT', a) : html.indexOf('DISCOVER', a)); };

function checkZero(ex, what) {
  assert.ok(ex.length > 0, what + ': EXPLORE found');
  for (const h of GATED) assert.ok(!ex.includes('href="' + h + '"'), what + ' not linked: ' + h);
  for (const l of LABELS) assert.match(ex, new RegExp('<span data-unlinked="true"[^>]*>' + l + '</span>'), what + ' ' + l);
  for (const h of LIVE) assert.ok(ex.includes('href="' + h + '"'), what + ' linked: ' + h);
}

test('DMZ themed footer (the one DMZ renders): gated entries text at zero; Trait Planner and live routes linked', () => {
  const cfg = getGameConfig('dmz');
  assert.ok(cfg.footer.themed && cfg.footer.themed.enabled, 'DMZ uses the themed footer');
  checkZero(exploreOf(render(Themed, { config: cfg, linkContent: ZERO })), 'themed');
  const back = exploreOf(render(Themed, { config: cfg, linkContent: Object.assign({}, ZERO, { '/dmz/keys': 2 }) }));
  assert.ok(back.includes('href="/dmz/keys"') && !back.includes('href="/dmz/items"'), 'a route with entries links again');
  // Readable and unlike a link: a dark chip behind the text (measured 7.1:1 worst case on the DMZ backdrop),
  // default cursor, no hover class, not an <a>.
  const chip = render(Themed, { config: cfg, linkContent: ZERO }).match(/<span data-unlinked="true" style="([^"]*)">Missions<\/span>/);
  assert.ok(chip, 'Missions chip');
  assert.match(chip[1], /color:rgba\(255,255,255,0\.62\)/);
  assert.match(chip[1], /background:rgba\(8,9,12,0\.85\)/);
  assert.match(chip[1], /cursor:default/);
  assert.ok(!/tg-foot-link|text-decoration:underline/.test(chip[0]));
  const plain = render(Themed, { config: cfg });
  assert.ok(!plain.includes('data-unlinked'));
  for (const h of GATED) assert.ok(exploreOf(plain).includes('href="' + h + '"'), 'no linkContent: ' + h);
});

test('generic footer path: the same rule; other games unchanged by a DMZ map', () => {
  checkZero(exploreOf(render(Footer, { game: 'dmz', linkContent: ZERO })), 'generic');
  const plain = exploreOf(render(Footer, { game: 'dmz' }));
  for (const h of GATED) assert.ok(plain.includes('href="' + h + '"'), h);
  assert.ok(!plain.includes('data-unlinked'));
  for (const g of ['marathon', 'wardogs', 'pubg-dednet']) assert.equal(render(Footer, { game: g, linkContent: ZERO }), render(Footer, { game: g }), g);
});

test('wiring: Footer hands linkContent to the themed footer; the DMZ layout passes the cached map', () => {
  const src = readFileSync(path.resolve('components/Footer.js'), 'utf8');
  assert.ok(src.includes('return <ThemedGameFooter config={cfg} linkContent={linkContent} />;'));
  const layout = readFileSync(path.resolve('app/dmz/layout.js'), 'utf8');
  assert.ok(layout.includes('var linkContent = await fetchDmzLinkContent();'));
  assert.ok(layout.includes('<Footer game="dmz" linkContent={linkContent} />'));
  for (const f of ['components/Footer.js', 'components/game/ThemedGameFooter.js']) assert.ok(!/dmz/i.test(readFileSync(path.resolve(f), 'utf8').match(/gatedHref[\s\S]{0,200}/g).join(' ')), f + ': gate code carries no game literal');
});
