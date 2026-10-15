// app/marathon/modes/vault-breaker/vaultBreakerBody.test.mjs
// Body-copy fix (2026-10-15): the page states Bungie's Oct 20 - Nov 9 return (Update 1.1.9.2) and the
// Symbiosis move (Sep 14 post) instead of "Season 3, which arrives September 22". The FROZEN inputs --
// title, meta, OG, twitter, the JSON-LD Event (summary/startDate/endDate/eventStatus), SOURCES (JSON-LD
// citations) and FACTS_UPDATED (dateModified + sitemap lastmod) -- are pinned unchanged until after Oct 20.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FACTS_UPDATED } from '../../../../lib/vaultBreaker.js';

const SRC = readFileSync(new URL('./page.js', import.meta.url), 'utf8');

test('the Season 3 / September 22 claim is gone from the body', () => {
  assert.ok(!SRC.includes('Season 3, which arrives September 22, 2026.'));
  assert.ok(!/arrives September 22/.test(SRC.replace(/^\s*\/\/.*$/gm, '')), 'not in any rendered string');
});

test('the Oct 20 - Nov 9 return is stated in body copy and attributed to Update 1.1.9.2', () => {
  assert.ok(SRC.includes('RETURNS OCT 20 TO NOV 9'));
  assert.ok(SRC.includes('<FactCard label="Returning" value="October 20 to November 9, 2026" note="Per Bungie\'s Update 1.1.9.2 (October 6)" />'));
  assert.ok(SRC.includes("Bungie\\'s Update 1.1.9.2 (October 6) schedules it again from October 20 to November 9, 2026. It is a limited-time event."));
  assert.ok(SRC.includes("url: 'https://steamstore-a.akamaihd.net/news/externalpost/steam_community_announcements/1845383656396920'"));
  assert.ok(!/OCT 20.{0,20}\d{1,2}(:\d\d)?\s*(AM|PM|UTC|PT)/i.test(SRC), 'no start time stated (1.1.9.2 gives none)');
});

test('the Symbiosis move is attributed to the Sep 14 post; the first run stays as history', () => {
  assert.ok(SRC.includes("url: 'https://steamstore-a.akamaihd.net/news/externalpost/steam_community_announcements/1843481262702400'"));
  assert.ok(SRC.includes('moved the content planned for September into the'));
  assert.ok(SRC.includes('Symbiosis update on December 8, which brings Marathon&#39;s first permanent PvE'));
  assert.ok(SRC.includes('<FactCard label="First run" value="July 21 – August 4, 2026" />'));
  assert.ok(SRC.includes('JUL 21 &ndash; AUG 4'), 'first-run badge kept');
});

test('new body strings are ASCII (entities aside)', () => {
  const added = ['RETURNS OCT 20 TO NOV 9', 'October 20 to November 9, 2026', "Per Bungie's Update 1.1.9.2 (October 6)",
    'The October 20 to November 9 return and the Symbiosis', 'experimental PvE mode, on the way to a full PvE mode then planned for Season 3.'];
  for (const s of added) { assert.ok(SRC.includes(s), s); assert.ok(!/[^\x00-\x7f]/.test(s), s); }
});

test('FREEZE: title, meta, OG, twitter, JSON-LD Event inputs, SOURCES and FACTS_UPDATED unchanged', () => {
  assert.equal(FACTS_UPDATED, '2026-07-21');
  assert.ok(SRC.includes("title: { absolute: 'Marathon Vault Breaker - Dates, Vault Data & How It Works' },"));
  assert.ok(SRC.includes("description: 'Marathon Vault Breaker runs July 21 - August 4, 2026 (Update 1.1.5). The first experimental PvE mode: roguelite Vault runs in Cryo Archive, Solo/Duo/Trio, any Runner Level. How Vault Data, the Sponsored Kit, and the Armory work - sourced from Bungie.',"));
  assert.ok(SRC.includes("description: 'July 21 - August 4, 2026. Marathon\\'s first experimental PvE mode: roguelite Vaults in Cryo Archive, Solo/Duo/Trio, any Runner Level. Vault Data, Sponsored Kit, and Armory explained.',"));
  assert.ok(SRC.includes("description: 'July 21 - Aug 4. First experimental PvE mode: roguelite Vaults in Cryo Archive, Solo/Duo/Trio, any Runner Level.',"));
  assert.ok(SRC.includes("start_date: '2026-07-21',") && SRC.includes("end_date: '2026-08-04',"));
  assert.ok(SRC.includes("eventStatus: 'https://schema.org/EventScheduled',"));
  assert.ok(SRC.includes("summary: 'Marathon\\'s first experimental PvE mode: a roguelite run through progressively tougher Vaults inside Cryo Archive, played Solo, Duo, or Trio at any Runner Level. Runs July 21 to August 4, 2026 with Update 1.1.5.',"));
  const sources = SRC.slice(SRC.indexOf('const SOURCES = ['), SRC.indexOf('];', SRC.indexOf('const SOURCES = [')));
  assert.equal((sources.match(/name: '/g) || []).length, 3, 'SOURCES (JSON-LD citations) still the original three');
  assert.ok(!sources.includes('1845383656396920') && !sources.includes('1843481262702400'));
});
