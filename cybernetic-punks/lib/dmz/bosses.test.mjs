// lib/dmz/bosses.test.mjs
// /dmz/bosses (Boss Board dossier page): sources equal the bounty page's, every fact has a source and a section
// heading, no number the posts do not state, no Lieutenant name and no third-party boss name, no "Most Wanted",
// "Killers" or the other gap word, no FAQPage, every dossier text server-rendered, evidence meter math, the
// tree shows the two boss types as siblings, the sitemap entry, the hub link and the auto-linker phrases.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { SOURCES, FACTS, UNPUBLISHED, TREE, FIELDS, DOSSIERS, UPDATE_LOG, LAST_UPDATED, PAGE_URL, TITLE, DESC, factById, evidence } from './bosses.js';
import { SOURCES as BOUNTY_SOURCES } from './bounties.js';
import { parseBody, linkifyArticleSegments } from './articleContent.js';
import { loadComponent, render } from '../games/jsxHarness.test-helper.mjs';

const src = (p) => readFileSync(path.resolve(p), 'utf8');
const dec = (s) => s.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&');
const ALL_TEXT = () => [...FACTS.map((f) => f.text), ...UNPUBLISHED.map((u) => u.text), ...UPDATE_LOG.map((u) => u.text), TITLE, DESC,
  ...DOSSIERS.flatMap((d) => [d.designation, d.rank, d.note || '']), TREE.root.title, ...TREE.branches.flatMap((b) => [b.title, ...b.nodes.map((n) => n.title)])];
const THIRD_PARTY = /\b(Scavenger|Doctor|Jin[- ]?Tae|Bale|Iskra|Roze|Gorani)\b/i;

let html;
before(async () => {
  const mod = await loadComponent('app/dmz/bosses/page.js', { stubs: { './DossierController': "export default function DossierController() { return null; }\n" } });
  html = render(mod.default);
});

test('sources: same labels and URLs as the bounty page (duplicated, kept equal)', () => {
  for (const k of ['PART1', 'PART2']) {
    assert.equal(SOURCES[k].label, BOUNTY_SOURCES[k].label, k);
    assert.equal(SOURCES[k].href, BOUNTY_SOURCES[k].href, k);
    assert.equal(SOURCES[k].date, BOUNTY_SOURCES[k].date, k);
  }
  assert.deepEqual(Object.keys(SOURCES), ['PART1', 'PART2']);
});

test('facts: unique ids, one Deep Dive source each, a real section heading, no digits', () => {
  const LOCS = { PART2: ['Boss Board: Lieutenants and Commanders', 'Lieutenants', 'Commanders'], PART1: ['Commander Encounters', 'Hajin Enemy Intel: A Field Guide to Hostile Forces'] };
  const ids = [...FACTS.map((f) => f.id), ...UNPUBLISHED.map((u) => u.id)];
  assert.equal(new Set(ids).size, ids.length, 'duplicate id');
  for (const f of FACTS) {
    const key = Object.keys(SOURCES).find((k) => SOURCES[k] === f.src);
    assert.ok(key, 'unknown source: ' + f.id);
    assert.ok(LOCS[key].includes(f.loc), 'bad section for ' + f.id + ': ' + f.loc);
    // '3D Printer' and 'Part 1' / 'Part 2' are names, not values.
    assert.ok(!/\d/.test(f.text.replace(/3D Printer/g, '').replace(/\bPart [12]\b/g, '')), 'digit in fact ' + f.id);
  }
  for (const u of UNPUBLISHED) assert.ok(!/\d/.test(u.text.replace(/\bPart [12]\b/g, '')), 'digit in ' + u.id);
  // The only numbers on the page are the source dates and our own evidence-meter counts.
  for (const u of UPDATE_LOG) for (const n of (u.text.match(/\d+/g) || [])) assert.ok(['1', '2', '5', '9'].includes(n), 'number in log: ' + n);
  assert.equal(LAST_UPDATED, '2026-10-12');
});

test('wording: no third-party boss names, no Lieutenant names, no "Most Wanted" / "Killers" / the other gap word', () => {
  const visible = dec(html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' '));
  for (const t of [...ALL_TEXT(), visible]) {
    assert.ok(!THIRD_PARTY.test(t), 'third-party or narrative name in: ' + t.slice(0, 120));
    assert.ok(!/most wanted/i.test(t), '"Most Wanted" in: ' + t.slice(0, 120));
    assert.ok(!/\bkillers?\b/i.test(t), '"Killers" in: ' + t.slice(0, 120));
    assert.ok(!/classif/i.test(t), 'gap word in: ' + t.slice(0, 120));
  }
  assert.ok(!/classif/i.test(src('lib/dmz/bosses.js') + src('app/dmz/bosses/page.js') + src('app/dmz/bosses/DossierController.js')));
  // Undisclosed rewards are stated neutrally.
  assert.match(factById('lt-more-rewards').text, /does not disclose/);
  assert.match(factById('cmd-more-rewards').text, /does not disclose/);
  assert.ok(visible.includes('Boss Board') && visible.includes('Target dossier'));
});

test('tree: the Boss Board station with Lieutenants and Commanders as sibling branches, no ranking', () => {
  assert.deepEqual(TREE.root.facts, ['bb-unlock', 'bb-intel', 'bb-rewards']);
  assert.match(factById('bb-unlock').text, /second DMZ Order/);
  assert.deepEqual(TREE.branches.map((b) => b.title), ['Lieutenants', 'Commanders']);
  const lt = TREE.branches[0], cmd = TREE.branches[1];
  assert.deepEqual(lt.nodes, [{ dossier: 'lieutenants', title: 'Names not published' }]);
  assert.deepEqual(cmd.nodes.map((n) => n.title), ['Colossus', 'Deathstalker', 'Tank']);
  // Siblings in markup: both branch nodes sit in one .bb-branches grid, directly under the root.
  const tree = html.slice(html.indexOf('class="bb-tree"'), html.indexOf('</section>', html.indexOf('class="bb-tree"')));
  assert.ok(tree.indexOf('id="boss-board"') < tree.indexOf('class="bb-branches"'));
  assert.equal((tree.match(/class="bb-branch"/g) || []).length, 2);
  // No chain of command is stated anywhere, and the open question says so.
  for (const t of ALL_TEXT()) assert.ok(!/outrank|chain of command|superior|subordinate|reports? to/i.test(t), t);
  assert.match(UNPUBLISHED.find((u) => u.id === 'tier-ranking').text, /neither post says/);
});

test('dossiers: three Commanders and one unnamed Lieutenant dossier; every field text server-rendered', () => {
  assert.deepEqual(DOSSIERS.map((d) => [d.id, d.designation, d.rank]), [['colossus', 'Colossus', 'Commander'], ['deathstalker', 'Deathstalker', 'Commander'], ['tank', 'Tank', 'Commander'], ['lieutenants', 'Names not published', 'Lieutenant']]);
  const h = dec(html);
  for (const d of DOSSIERS) {
    assert.ok(html.includes('<article id="' + d.id + '" class="bb-card bb-dossier" data-dossier="' + d.id + '"'), 'article ' + d.id);
    assert.ok(html.includes('href="#' + d.id + '" data-dossier-open="' + d.id + '"'), 'poster or node link ' + d.id);
    assert.deepEqual(Object.keys(d.fields).sort(), FIELDS.map((f) => f.key).sort(), d.id);
    for (const f of FIELDS) {
      const v = d.fields[f.key];
      if (Array.isArray(v)) for (const id of v) { assert.ok(factById(id), id); if (!['designation', 'rank'].includes(f.key)) assert.ok(h.includes(factById(id).text), 'not rendered: ' + id); }
      else assert.ok(UNPUBLISHED.some((u) => u.id === v.open), d.id + '.' + f.key);
    }
  }
  for (const f of FACTS) assert.ok(h.includes(f.text), 'fact not on the page: ' + f.id);
  for (const u of UNPUBLISHED) assert.ok(h.includes(u.text), 'unpublished item not on the page: ' + u.id);
  // Portrait slots reserved, no image files.
  assert.equal((html.match(/SURVEILLANCE PHOTO PENDING/g) || []).length, 6);
  assert.ok(!/<img\b/.test(html));
  // Each fact shows its source and section.
  assert.ok(h.includes('Source: ') && h.includes(', section "Commanders"') && h.includes(', section "Commander Encounters"'));
});

test('evidence meter: confirmed fields over all fields, computed from the config', () => {
  const byId = Object.fromEntries(DOSSIERS.map((d) => [d.id, evidence(d)]));
  for (const id of ['colossus', 'deathstalker', 'tank']) assert.deepEqual(byId[id], { confirmed: 7, unpublished: 5, total: 12, pct: 58 }, id);
  assert.deepEqual(byId.lieutenants, { confirmed: 6, unpublished: 6, total: 12, pct: 50 });
  assert.equal((html.match(/7 of 12 confirmed/g) || []).length, 6);
  assert.equal((html.match(/6 of 12 confirmed/g) || []).length, 2);
  // An unresolved fact id counts as UNPUBLISHED.
  assert.equal(evidence({ fields: { designation: ['no-such-fact'] } }).confirmed, 0);
});

test('SEO: title, description, canonical, JSON-LD WebPage + ItemList + BreadcrumbList, never FAQPage', () => {
  assert.ok(TITLE.length <= 60 && DESC.length <= 155, TITLE.length + ' / ' + DESC.length);
  assert.equal(PAGE_URL, 'https://cyberneticpunks.com/dmz/bosses');
  assert.ok(!html.includes('FAQPage'));
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
  assert.deepEqual(blocks.map((b) => b['@type']).sort(), ['BreadcrumbList', 'ItemList', 'WebPage']);
  const wp = blocks.find((b) => b['@type'] === 'WebPage');
  assert.equal(wp.dateModified, LAST_UPDATED);
  assert.deepEqual(wp.citation.map((c) => c.url), [SOURCES.PART1.href, SOURCES.PART2.href]);
  const il = blocks.find((b) => b['@type'] === 'ItemList');
  assert.deepEqual(il.itemListElement.map((x) => [x.position, x.name, x.url]), [[1, 'Colossus', PAGE_URL + '#colossus'], [2, 'Deathstalker', PAGE_URL + '#deathstalker'], [3, 'Tank', PAGE_URL + '#tank']]);
  const page = src('app/dmz/bosses/page.js');
  assert.ok(page.includes('alternates: { canonical: PAGE_URL }'));
  const elig = src('lib/sitemap/eligible.js');
  assert.ok(elig.includes("add(BASE + '/dmz/bosses', D, 'dmz-section', BOSSES_LAST_UPDATED, 'weekly', 0.8);"));
  assert.ok(elig.includes("import { LAST_UPDATED as BOSSES_LAST_UPDATED } from '@/lib/dmz/bosses';"));
});

test('progressive enhancement: dossiers open as an accessible dialog with JS; nothing exists only in client JS', () => {
  const c = src('app/dmz/bosses/DossierController.js');
  assert.match(c, /^'use client';/);
  assert.match(c, /return null;\s*\}\s*$/);
  for (const s of ["setAttribute('role', 'dialog')", "setAttribute('aria-modal', 'true')", "e.key === 'Escape'", "e.key !== 'Tab'", 'history.replaceState', 'trigger.focus()', "addEventListener('hashchange'"]) assert.ok(c.includes(s), s);
  // The controller holds no page copy: every visible string lives in the server-rendered page.
  assert.ok(!/UNPUBLISHED|Commander|Lieutenant/.test(c.replace(/^\/\/.*$/gm, '')));
  // Reduced motion switches the animations off.
  assert.match(html, /@media \(prefers-reduced-motion:reduce\)\{\s*\.bb-scan,\.bb-open\{animation:none\}/);
});

test('hub link and auto-linker phrases for /dmz/bosses', () => {
  const hub = src('app/dmz/page.js');
  assert.ok(hub.includes("var FAQ_BOSSES = { href: '/dmz/bosses', label: 'the DMZ Boss Board' };"));
  assert.match(hub, /\{FAQ_BOUNTIES_SUF\}\s*\{FAQ_BOSSES_PRE\}\s*<Link href=\{FAQ_BOSSES\.href\} style=\{faqLinkStyle\}>\{FAQ_BOSSES\.label\}<\/Link>\s*\{FAQ_BOSSES_SUF\}/);
  const suf = (hub.match(/var FAQ_BOSSES_SUF = '([^']*)'/) || [])[1];
  assert.ok(!THIRD_PARTY.test(suf) && !/most wanted|killers?/i.test(suf));
  for (const n of ['Colossus', 'Deathstalker', 'Tank']) assert.ok(suf.includes(n), n);
  // Linker list: exactly three phrases to /dmz/bosses; never "Commander" or "Tank".
  const route = src('app/dmz/[section]/[slug]/page.js');
  const LIST = new Function(route.slice(route.indexOf('var DMZ_SYSTEM_LINKS = ['), route.indexOf('];', route.indexOf('var DMZ_SYSTEM_LINKS = [')) + 2) + '\nreturn DMZ_SYSTEM_LINKS;')();
  const boss = LIST.filter((e) => e.href === '/dmz/bosses');
  assert.deepEqual(boss.map((e) => e.name), ['Boss Board', 'Colossus', 'Deathstalker']);
  for (const e of boss) assert.equal(e.slug, 'dmz-bosses');
  assert.ok(!LIST.some((e) => /^(Commanders?|Tank|Lieutenants?)$/.test(e.name)));
  // Contract on a sample body: headings never linked, one link per article, no self-link.
  const entries = (slug) => LIST.filter((e) => e.slug !== slug).map((e) => ({ name: e.name, slug: e.slug, href: e.href || '/dmz/' + e.section + '/' + e.slug })).sort((a, b) => b.name.length - a.name.length);
  const links = (body, slug) => { const seen = new Set(); const out = []; for (const b of parseBody(body)) { if (b.type === 'h2' || b.type === 'quote') continue; for (const t of (b.type === 'ul' ? b.items : [b.text])) for (const s of linkifyArticleSegments(t, entries(slug), seen)) if (s.type === 'alink' && s.href === '/dmz/bosses') out.push(s.value); } return out; };
  const body = '**The Boss Board**\n\nColossus roams.\n\nThe Boss Board and Deathstalker.';
  assert.deepEqual(links(body, 'some-article'), ['Colossus']);
  assert.deepEqual(links(body, 'dmz-bosses'), []);
});
