// app/marathon/modes/vault-breaker/vaultBreakerBody.test.mjs
// Body-copy fix (2026-10-15): the page states Bungie's Oct 20 - Nov 9 return (Update 1.1.9.2) and the
// Symbiosis move (Sep 14 post) instead of "Season 3, which arrives September 22". Brief 134 (2026-10-23, after the
// Oct 20 freeze ended in Brief 133): the JSON-LD Event dates and the meta, OG and twitter text carry the return
// run from lib/vaultBreaker.js; dateModified and the sitemap lastmod read CONTENT_CHANGED; the title, SOURCES
// (JSON-LD citations) and FACTS_UPDATED (the visible source-check date) are unchanged.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FACTS_UPDATED, CONTENT_CHANGED, FIRST_RUN, RETURN_RUN, runLabel } from '../../../../lib/vaultBreaker.js';
import { loadComponent, render } from '../../../../lib/games/jsxHarness.test-helper.mjs';

const SRC = readFileSync(new URL('./page.js', import.meta.url), 'utf8');

test('the Season 3 / September 22 claim is gone from the body', () => {
  assert.ok(!SRC.includes('Season 3, which arrives September 22, 2026.'));
  assert.ok(!/arrives September 22/.test(SRC.replace(/^\s*\/\/.*$/gm, '')), 'not in any rendered string');
});

test('the Oct 20 - Nov 9 return is stated in body copy and attributed to Update 1.1.9.2', () => {
  assert.ok(SRC.includes('RETURN RUN OCT 20 TO NOV 9'));
  assert.ok(SRC.includes('<FactCard label="Return run" value="October 20 to November 9, 2026" note="Per Bungie\'s Update 1.1.9.2 (October 6)" />'));
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
  const added = ['RETURN RUN OCT 20 TO NOV 9', 'October 20 to November 9, 2026', "Per Bungie's Update 1.1.9.2 (October 6)",
    'The October 20 to November 9 return and the Symbiosis', 'experimental PvE mode, on the way to a full PvE mode then planned for Season 3.'];
  for (const s of added) { assert.ok(SRC.includes(s), s); assert.ok(!/[^\x00-\x7f]/.test(s), s); }
});

test('head and JSON-LD (Brief 134): title unchanged; meta, OG, twitter and the Event use the return run; SOURCES and FACTS_UPDATED unchanged', () => {
  // Unchanged: the title (an open decision), the source-check date, the citations, the event status, the first-run row.
  assert.equal(FACTS_UPDATED, '2026-07-21');
  assert.ok(SRC.includes("title: { absolute: 'Marathon Vault Breaker - Dates, Vault Data & How It Works' },"));
  assert.ok(SRC.includes("eventStatus: 'https://schema.org/EventScheduled',"));
  assert.ok(SRC.includes('start_date: FIRST_RUN.startDate,') && SRC.includes('end_date: FIRST_RUN.endDate,'), 'the first-run row (visible hero) keeps the first run');
  const sources = SRC.slice(SRC.indexOf('const SOURCES = ['), SRC.indexOf('];', SRC.indexOf('const SOURCES = [')));
  assert.equal((sources.match(/name: '/g) || []).length, 3, 'SOURCES (JSON-LD citations) still the original three');
  assert.ok(!sources.includes('1845383656396920') && !sources.includes('1843481262702400'));
  // Changed: the head text and the Event come from the one run definition; the old first-run-only head text is gone.
  assert.ok(SRC.includes('description: META_DESCRIPTION,') && SRC.includes('description: OG_DESCRIPTION,') && SRC.includes('description: TWITTER_DESCRIPTION,'));
  assert.ok(SRC.includes('description: EVENT_DESCRIPTION,') && SRC.includes('startDate: RETURN_RUN.startDate,') && SRC.includes('endDate: RETURN_RUN.endDate,'));
  assert.ok(SRC.includes('dateModified: CONTENT_CHANGED,') && !/dateModified: FACTS_UPDATED/.test(SRC));
  for (const old of ['Marathon Vault Breaker runs July 21 - August 4, 2026 (Update 1.1.5).', "description: 'July 21 - August 4, 2026.", "description: 'July 21 - Aug 4."]) assert.ok(!SRC.includes(old), old);
  assert.ok(!/frozen until after Oct 20/.test(SRC), 'stale freeze comment gone');
  // The return run is the one Update 1.1.9.2 states; dates only (the post gives no time).
  assert.deepEqual(RETURN_RUN, { startDate: '2026-10-20', endDate: '2026-11-09', source: 'Update 1.1.9.2' });
  assert.deepEqual(FIRST_RUN, { startDate: '2026-07-21', endDate: '2026-08-04' });
  assert.equal(runLabel(RETURN_RUN), 'October 20 - November 9, 2026');
  assert.equal(runLabel(RETURN_RUN, true), 'Oct 20 - Nov 9, 2026');
  assert.equal(runLabel(FIRST_RUN), 'July 21 - August 4, 2026');
  // Two dates: CONTENT_CHANGED is never earlier than FACTS_UPDATED; the sitemap imports it (no new literal there).
  assert.equal(CONTENT_CHANGED, '2026-10-26');
  assert.ok(CONTENT_CHANGED >= FACTS_UPDATED);
  const elig = readFileSync(new URL('../../../../lib/sitemap/eligible.js', import.meta.url), 'utf8');
  assert.ok(elig.includes("import { CONTENT_CHANGED as VAULT_BREAKER_CONTENT_CHANGED } from '@/lib/vaultBreaker';"));
  assert.ok(elig.includes("[BASE + '/marathon/modes/vault-breaker', facts, 'daily', 0.9],"));
  // The vault-breaker lastmod comes from the imported constant: the line that sets `facts` reads
  // VAULT_BREAKER_CONTENT_CHANGED and holds no quoted date literal.
  const factsLine = elig.split(/\r?\n/).find((l) => /^\s*const facts =/.test(l));
  assert.ok(factsLine && factsLine.includes('VAULT_BREAKER_CONTENT_CHANGED'), 'lastmod line reads the imported constant');
  assert.ok(!/['"]\d{4}-\d{2}-\d{2}['"]/.test(factsLine), 'no quoted date literal on the lastmod line');
});

test('rendered (Brief 134): Event dates, meta, OG and twitter agree with the one run definition; dateModified = CONTENT_CHANGED; visible check date unchanged', async () => {
  const mod = await loadComponent('app/marathon/modes/vault-breaker/page.js');
  const html = render(mod.default);
  const ld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
  const page = ld.find((x) => x['@type'] === 'WebPage');
  const event = page.mainEntity;
  assert.equal(event['@type'], 'Event');
  assert.equal(event.startDate, RETURN_RUN.startDate);
  assert.equal(event.endDate, RETURN_RUN.endDate);
  assert.equal(page.dateModified, CONTENT_CHANGED);
  const long = runLabel(RETURN_RUN), short = runLabel(RETURN_RUN, true), first = runLabel(FIRST_RUN), firstShort = runLabel(FIRST_RUN, true);
  const md = mod.metadata;
  for (const [k, t] of [['meta', md.description], ['og', md.openGraph.description], ['event', event.description]]) {
    assert.ok(t.includes(long), k + ' has the return run');
    assert.ok(t.includes(first), k + ' has the first run as history');
    assert.ok(t.includes(RETURN_RUN.source), k + ' attributes the return run');
  }
  assert.ok(md.twitter.description.includes(short) && md.twitter.description.includes(firstShort) && md.twitter.description.includes(RETURN_RUN.source));
  for (const t of [md.description, md.openGraph.description, md.twitter.description, event.description]) {
    assert.ok(!/[^\x00-\x7f]/.test(t), 'ASCII: ' + t);
    assert.ok(!/\b(runs|is running|returns|will run|ends|ongoing|live now)\b/i.test(t), 'tense-neutral: ' + t);
  }
  assert.equal(md.title.absolute, 'Marathon Vault Breaker - Dates, Vault Data & How It Works');
  assert.ok(html.includes('Checked against all three sources') && html.includes(FACTS_UPDATED), 'visible source-check date still FACTS_UPDATED');
  // Brief 135: the hero sentence is not present tense about the first run.
  assert.ok(!html.includes('Runs July 21'), 'hero has no present-tense first run');
  // Brief 136: tense-neutral return-run badge; no UPDATE 1.1.5 badge; the Patch card names the first run.
  assert.ok(!html.includes('RETURNS OCT 20') && html.includes('RETURN RUN OCT 20 TO NOV 9'), 'return-run badge is tense-neutral');
  assert.ok(!html.includes('UPDATE 1.1.5'), 'no UPDATE 1.1.5 badge');
  assert.ok(html.includes('FIRST RUN PATCH') && !/>PATCH</.test(html), 'Patch card label names the first run');
  assert.ok(html.includes('RETURN RUN</div>') && !html.includes('RETURNING'), 'At a Glance card label is "Return run", not "Returning"');
});
