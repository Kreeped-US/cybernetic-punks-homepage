// app/dmz/bountiesLinks.test.mjs
// DMZ-scoped internal links to /dmz/bounties: the /dmz hub FAQ sentence (source check: the hub page reads
// the DB, so it is not rendered here) and the article cross-linker names "Bounty Station" and "Most Wanted".
// The linker contract is exercised through the real linkifyArticleSegments with the real DMZ_SYSTEM_LINKS
// list read from the article route source: headings are never linked, one link per target per article,
// longest name first, whole word, case-sensitive, and an article never links itself.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parseBody, linkifyArticleSegments } from '../../lib/dmz/articleContent.js';
import { FACTS } from '../../lib/dmz/bounties.js';

const HUB = readFileSync(path.resolve('app/dmz/page.js'), 'utf8');
const ROUTE = readFileSync(path.resolve('app/dmz/[section]/[slug]/page.js'), 'utf8');

// The real list, evaluated from the route source (it is a plain array literal of object literals).
const LIST_SRC = ROUTE.slice(ROUTE.indexOf('var DMZ_SYSTEM_LINKS = ['), ROUTE.indexOf('];', ROUTE.indexOf('var DMZ_SYSTEM_LINKS = [')) + 2);
const DMZ_SYSTEM_LINKS = new Function(LIST_SRC + '\nreturn DMZ_SYSTEM_LINKS;')();
// Same as articleLinkEntries() in the route: self-skip by slug, then longest name first.
const entriesFor = (slug) => DMZ_SYSTEM_LINKS.filter((e) => e.slug !== slug)
  .map((e) => ({ name: e.name, slug: e.slug, href: e.href || '/dmz/' + e.section + '/' + e.slug }))
  .sort((a, b) => b.name.length - a.name.length);
// Same block walk as ArticleBody: headings and pull-quotes are skipped, bold runs are skipped, ONE Set.
function bodyLinks(body, slug) {
  const seen = new Set();
  const out = [];
  for (const b of parseBody(body)) {
    if (b.type === 'h2' || b.type === 'quote') continue;
    for (const t of (b.type === 'ul' ? b.items : [b.text])) {
      for (const part of t.split(/(\*\*[^*]+\*\*)/)) {
        if (/^\*\*[^*]+\*\*$/.test(part)) continue;
        for (const s of linkifyArticleSegments(part, entriesFor(slug), seen)) if (s.type === 'alink') out.push(s.value + ' -> ' + s.href);
      }
    }
  }
  return out;
}

test('hub FAQ: one /dmz/bounties link with a descriptive anchor, rendered after the FOB / Printer / Hajin links', () => {
  assert.ok(HUB.includes("var FAQ_BOUNTIES = { href: '/dmz/bounties', label: 'the DMZ bounty system' };"));
  assert.ok(HUB.includes("var FAQ_BOUNTIES_PRE = ' Our guide to ';"));
  assert.ok(HUB.includes("var FAQ_BOUNTIES_SUF = ' covers the weekly Most Wanted board, paying off a bounty at a Bounty Station, and which bounty details are confirmed by official posts and which are not yet.';"));
  const jsx = HUB.slice(HUB.indexOf('{FAQ_CONFIRMED_PRE}'), HUB.indexOf('{FAQ_BOUNTIES_SUF}') + 20);
  assert.match(jsx, /\{FAQ_CONFIRMED_SUF\}\s*\{FAQ_BOUNTIES_PRE\}\s*<Link href=\{FAQ_BOUNTIES\.href\} style=\{faqLinkStyle\}>\{FAQ_BOUNTIES\.label\}<\/Link>\s*\{FAQ_BOUNTIES_SUF\}/);
  for (const k of ['fob', 'printer', 'hajin']) assert.ok(jsx.includes('FAQ_ARTICLES.' + k + '.href'), k);
  // Not a feed article: kept out of FAQ_ARTICLES (whose hrefs feed the explainer list's excludeHrefs).
  const faqArticles = HUB.slice(HUB.indexOf('var FAQ_ARTICLES = {'), HUB.indexOf('};', HUB.indexOf('var FAQ_ARTICLES = {')));
  assert.ok(!faqArticles.includes('/dmz/bounties'));
});

test('hub FAQ sentence: doctrine (Most Wanted official, no Killers) and only facts the bounties page states', () => {
  const sentence = (HUB.match(/var FAQ_BOUNTIES_SUF = '([^']*)'/) || [])[1];
  assert.ok(!/killers?/i.test(sentence));
  assert.ok(!/\b(will|launches|soon|best|ultimate)\b/i.test(sentence), 'no future tense or hype');
  const byId = Object.fromEntries(FACTS.map((f) => [f.id, f]));
  // weekly Most Wanted board (graphic-sourced lb-weekly-top50) and paying off at a Bounty Station.
  assert.match(byId['lb-weekly-top50'].text, /weekly Top 50 Most Wanted/);
  assert.match(byId['payoff-any-bounty'].text, /pay it off with DMZ Cash at a Bounty Station/);
});

test('linker list: Bounty Station and Most Wanted point at /dmz/bounties with the shared slug', () => {
  const b = DMZ_SYSTEM_LINKS.filter((e) => e.href === '/dmz/bounties');
  assert.deepEqual(b.map((e) => e.name), ['Bounty Leaderboard', 'Bounty Station', 'Most Wanted']);
  for (const e of b) assert.equal(e.slug, 'dmz-bounties');
  assert.deepEqual(entriesFor('x').filter((e) => e.href === '/dmz/bounties').map((e) => e.name), ['Bounty Leaderboard', 'Bounty Station', 'Most Wanted'], 'longest first');
});

test('linker contract: headings and bold are never linked; first prose occurrence only; whole word; case-sensitive', () => {
  const body = [
    '**The Most Wanted board**',
    'Players can pay off a bounty at a **Bounty Station** in Hajin.',
    'Pay at a Bounty Station during a deployment. The Most Wanted list updates weekly.',
    'Every Bounty Stations visit and the most wanted list stay plain. A Bounty Station again.',
  ].join('\n\n');
  // Heading (block 1) and bold (block 2) skipped; block 3 holds both names in one span: one link, the
  // longest name wins; block 4: plural and lowercase never match, and the target is already used.
  const toBounties = (links) => links.filter((l) => l.endsWith('-> /dmz/bounties'));
  assert.equal(parseBody(body)[0].type, 'h2', 'block 1 is a heading');
  assert.deepEqual(toBounties(bodyLinks(body, 'some-article')), ['Bounty Station -> /dmz/bounties']);
  // Most Wanted links when it is the first prose span that names the target.
  assert.deepEqual(toBounties(bodyLinks('The Most Wanted list updates weekly.\n\nA Bounty Station too.', 'some-article')), ['Most Wanted -> /dmz/bounties']);
  // Existing linker behaviour, pinned: within ONE span the longest name wins even when a shorter name
  // comes earlier, so the single link can land on the later phrase of that paragraph.
  assert.deepEqual(toBounties(bodyLinks('The Most Wanted list updates weekly. A Bounty Station too.', 'some-article')), ['Bounty Station -> /dmz/bounties']);
});

test('linker contract: an article never links itself, and the bounties page is not an article route', () => {
  // Self-skip by slug: if an article ever had the slug dmz-bounties, none of the three names would link.
  assert.deepEqual(bodyLinks('The Bounty Leaderboard, a Bounty Station and the Most Wanted list.', 'dmz-bounties'), []);
  // /dmz/bounties is its own static route (app/dmz/bounties/page.js), which renders no linker.
  const bountiesPage = readFileSync(path.resolve('app/dmz/bounties/page.js'), 'utf8');
  assert.ok(!/linkifyArticleSegments|DMZ_SYSTEM_LINKS/.test(bountiesPage));
});
