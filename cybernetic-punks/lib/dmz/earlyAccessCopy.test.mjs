// lib/dmz/earlyAccessCopy.test.mjs
// DMZ Early Access copy (2026-10-12): every changed DMZ date line names Early Access on October 20 with the
// official eligibility wording and the launch on October 23, plus "dates may change and depend on time zone"
// where it has room; the bare launch phrases are gone from the edited files; the /dmz meta, og and twitter
// descriptions are one string of at most 155 characters; the /dmz title, canonical and robots are unchanged.
// Ground truth: the early-access and early-access-eligibility facts in lib/dmz/bounties.js (Deep Dive Part 2).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FACTS } from './bounties.js';
import { dmz } from '../games/dmz.js';
import { DMZ_META_DESC, DMZ_EARLY_ACCESS_LINE, dmzHubCopy } from './hubCopy.js';
import { DMZ_ENTITIES } from './entities.js';
import { BUILDS_HUB } from './buildsHub.js';

const src = (p) => readFileSync(new URL('../../' + p, import.meta.url), 'utf8');
const ELIGIBILITY = /digital pre-order or pre-purchase of the Standard Digital or Vault Edition|digitally pre-ordered or pre-purchased the Standard Digital or Vault Edition/;
const TZ = 'dates may change and depend on time zone';
const PRE = Date.parse('2026-10-12T12:00:00Z');

// Pin the clock before the launch instant so launchText returns the pre-launch strings.
const withClock = (ms, fn) => { const real = Date.now; Date.now = () => ms; try { return fn(); } finally { Date.now = real; } };

// [id, text, hasRoomForTimeZone]
const changed = () => {
  const hub = withClock(PRE, () => dmzHubCopy());
  const fromSource = (file, needle) => {
    const line = src(file).split(/\r?\n/).find((l) => l.includes(needle));
    assert.ok(line, file + ' missing: ' + needle);
    return line.trim();
  };
  return [
    ['K2 /dmz meta description', DMZ_META_DESC, false],
    ['K3 /dmz hero line', DMZ_EARLY_ACCESS_LINE, true],
    ['K5 naming line', hub.namingLine, true],
    ['K6 release-date FAQ', hub.faqLaunchA, true],
    ['K8 vs-Warzone tail', hub.vsWarzoneTail, true],
    ['K14 keys', DMZ_ENTITIES.keys.hubEmpty, true],
    ['K14 missions', DMZ_ENTITIES.missions.hubEmpty, true],
    ['K14 items', DMZ_ENTITIES.items.hubEmpty, true],
    ['K14 locations', DMZ_ENTITIES.pois.hubEmpty, true],
    ['K14 builds', BUILDS_HUB.hubEmpty, true],
    ['K10 notify block', fromSource('components/dmz/DmzNotifyBlock.js', 'One briefing when'), true],
    ['K15 home hero sub', fromSource('app/page.js', 'DMZ coverage from launch on October 23'), true],
    ['K16 home about', fromSource('app/page.js', 'DMZ, launching October 23 with Early Access'), true],
    ['K25 Vantage calibration', fromSource('lib/network/vantage.js', 'DMZ Early Access opens October 20'), true],
    ['K27 profile-preview card', fromSource('app/profile-preview/ShareableCard.js', 'Launch Oct 23 / Early Access Oct 20'), false],
    ['K27 profile-preview note', fromSource('app/profile-preview/page.js', 'Tracking from launch (Oct 23'), true],
  ];
};

test('each changed DMZ date line names Early Access on October 20 (and the time-zone clause where it has room)', () => {
  for (const [id, text, roomy] of changed()) {
    assert.match(text, /Early Access/, id);
    assert.match(text, /\b(October|Oct) 20\b/, id);
    if (roomy) assert.ok(text.includes(TZ), id + ': missing time-zone clause');
    // Eligibility is stated only in the official wording (the short card names no eligibility).
    if (/pre-order|pre-purchase|pre-ordered/.test(text)) assert.match(text, ELIGIBILITY, id);
    // Nothing the source does not state: no regions or hours of day.
    assert.ok(!/\b(region|regions|NA|EU|PST|PDT|UTC|a\.m\.|p\.m\.|\d{1,2}(am|pm))\b/.test(text), id + ': regions or hours');
  }
});

test('K6 platform list is identical to the early-access-eligibility fact in lib/dmz/bounties.js', () => {
  const fact = FACTS.find((f) => f.id === 'early-access-eligibility').text;
  const PLATFORMS = 'Xbox Series X|S, Xbox on PC, PlayStation 5, Battle.net, Steam and Nintendo Switch 2';
  assert.ok(fact.includes(PLATFORMS));
  assert.ok(withClock(PRE, () => dmzHubCopy()).faqLaunchA.includes(PLATFORMS));
  assert.match(withClock(PRE, () => dmzHubCopy()).faqLaunchA, /Many players search for it as "DMZ 2", but the official name is simply DMZ\./);
});

test('removed bare launch phrases are gone from the edited files; the no-date notify lines carry no date', () => {
  const FILES = ['app/dmz/page.js', 'lib/dmz/hubCopy.js', 'lib/dmz/entities.js', 'lib/dmz/buildsHub.js', 'components/dmz/DmzNotifyBlock.js', 'components/dmz/DmzNotifyForm.js', 'components/dmz/DmzNotifyStrip.js', 'app/page.js', 'lib/network/vantage.js', 'app/profile-preview/ShareableCard.js', 'app/profile-preview/page.js'];
  const GONE = ['DMZ releases October 23', 'it arrives October 23', 'comes out on October 23', 'as the zone opens', 'the day it lands', 'goes live on October 23', 'goes live October 23', 'from launch day', 'DMZ from October 23', 'DMZ lands October 23', 'the day the Hajin Exclusion Zone opens', 'Oct 23 · field intel incoming', 'Tracking at launch (Oct 23)', 'once the zone goes live'];
  for (const f of FILES) {
    // Comments are not copy.
    const copy = src(f).split(/\r?\n/).filter((l) => !/^\s*(\/\/|\*|\/\*|\{\/\*)/.test(l)).join('\n');
    for (const g of GONE) assert.ok(!copy.includes(g), f + ' still has: ' + g);
  }
  assert.ok(src('components/dmz/DmzNotifyForm.js').includes('"You\'re on the list -- we\'ll email you when our DMZ launch coverage goes live."'));
  assert.ok(src('components/dmz/DmzNotifyStrip.js').includes('Get one email when our DMZ launch coverage goes live -- nothing else.'));
  assert.ok(src('app/page.js').includes('Marathon and Wardogs live now, DMZ from launch, and PUBG'));
});

test('/dmz meta, og and twitter descriptions are one string of at most 155 characters', () => {
  const page = src('app/dmz/page.js');
  assert.equal((page.match(/description: DMZ_META_DESC,/g) || []).length, 3, 'meta + og + twitter use the one constant');
  assert.ok(!/description: '/.test(page.slice(page.indexOf('export const metadata'), page.indexOf('};', page.indexOf('export const metadata')))), 'no inline description left');
  assert.ok(DMZ_META_DESC.length <= 155, String(DMZ_META_DESC.length));
  assert.match(DMZ_META_DESC, /Oct 23, 2026/);
  assert.ok(page.includes('{DMZ_EARLY_ACCESS_LINE}'), 'static hero line rendered');
});

test('/dmz title, canonical and robots unchanged; title still the release-date title', () => {
  const page = src('app/dmz/page.js');
  assert.ok(page.includes("title: { absolute: 'MW4 DMZ Release Date: October 23, 2026 (Modern Warfare 4)' },"));
  assert.equal((page.match(/title: 'MW4 DMZ Release Date: October 23, 2026 \(Modern Warfare 4\)',/g) || []).length, 2, 'og + twitter titles');
  assert.ok(page.includes("alternates: { canonical: 'https://cyberneticpunks.com/dmz' },"));
  assert.ok(!/robots:/.test(page.slice(page.indexOf('export const metadata'), page.indexOf('};', page.indexOf('export const metadata')))), 'no robots override (inherits the DMZ layout gate)');
  assert.equal(dmz.launch_date, '2026-10-23', 'launch date config unchanged (logic is out of scope)');
});
