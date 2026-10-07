// lib/marathon/nightfall.test.mjs
// /marathon/nightfall: the two rows corrected from Bungie's Oct 6 roadmap (Outpost open from Thu Oct 8;
// Cryo Archive from Thu Oct 15, ends Mondays), the three sources, LAST_UPDATED unchanged (the roadmap
// check covered four rows, not the page), and that the title and meta description did not move.
// The page is rendered through the JSX harness.
import { test, before, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { loadComponent, render } from '../games/jsxHarness.test-helper.mjs';

const X_CALENDAR = 'https://x.com/MarathonDevTeam/status/2100253598609535344';
const DEV_UPDATE = 'https://www.bungie.net/7/en/News/Article/nightfallrefreshandsymbiosis';
const ROADMAP = 'https://www.bungie.net/7/en/News/Article/nighfall_refresh_symbiosis_roadmap';
const realNow = Date.now;
let mod;
before(async () => { mod = await loadComponent('app/marathon/nightfall/page.js'); });
afterEach(() => { Date.now = realNow; });

function textOf(html) {
  return html.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ');
}
function weekCard(html, n) {
  const i = html.indexOf('>Week ' + n + '<');
  assert.ok(i > -1, 'week ' + n + ' card renders');
  return textOf(html.slice(i, html.indexOf('</ul>', i)));
}

test('title and meta description are unchanged', () => {
  assert.equal(mod.metadata.title.absolute, 'Marathon Nightfall Refresh Schedule (Oct 6 - Dec 7): What to Play Each Week');
  assert.equal(mod.metadata.description, "The full Marathon Nightfall Refresh schedule (Oct 6 - Dec 7, 2026): sponsored queue rotation, Cryo Archive weekly from Oct 15, Vault Breaker weeks 3-5, Sponsored Survival, CARRI, Enhanced Kits, and the free NuCaloric pass. Ranked is paused the whole window. Bridges into Symbiosis on Dec 8. Sourced from Bungie.");
  assert.equal(mod.metadata.alternates.canonical, 'https://cyberneticpunks.com/marathon/nightfall');
});

test('week 1: Outpost open from Thu Oct 8 (no longer "Locked")', () => {
  Date.now = () => Date.parse('2026-10-07T18:00:00Z');
  const html = render(mod.default);
  const w1 = weekCard(html, 1);
  assert.ok(w1.includes('Outpost: Open from Thu Oct 8'), w1);
  assert.ok(!/Locked/.test(html), 'no "Locked" anywhere on the page');
  assert.ok(w1.includes('Sponsored Map: Perimeter') && w1.includes('Login Rewards 2'));
});

test('week 2: Cryo Archive from Thu Oct 15, ends Mondays; later weeks keep plain "Cryo Archive"', () => {
  const html = render(mod.default);
  assert.ok(weekCard(html, 2).includes('Cryo Archive: from Thu Oct 15, ends Mondays'));
  for (const n of [3, 4, 5, 6, 7, 8, 9]) assert.ok(weekCard(html, n).includes('Cryo Archive'), 'week ' + n);
  assert.ok(weekCard(html, 3).includes('Vault Breaker'), 'Vault Breaker still starts week 3');
});

test('sources: X calendar, Sep 14 dev update and Oct 6 roadmap; LAST_UPDATED stays 2026-09-17', () => {
  const html = render(mod.default);
  for (const url of [X_CALENDAR, DEV_UPDATE, ROADMAP]) {
    // hero source box + footer each link every source once
    assert.equal(html.split('href="' + url + '"').length - 1, 2, url);
  }
  const ld = html.match(/"citation":\[[^\]]*\]/)[0];
  for (const url of [X_CALENDAR, DEV_UPDATE, ROADMAP]) assert.ok(ld.includes('"url":"' + url + '"'), 'JSON-LD ' + url);
  assert.ok(textOf(html).includes('Marathon: Nightfall Refresh and Symbiosis Roadmap (2026-10-06)'));
  assert.ok(textOf(html).includes('Checked against source on 2026-09-17'));
  assert.ok(html.includes('"dateModified":"2026-09-17"'));
  assert.ok(!html.includes('2026-10-07'));
});
