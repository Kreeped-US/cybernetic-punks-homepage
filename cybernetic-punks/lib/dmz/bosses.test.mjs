// lib/dmz/bosses.test.mjs
// /dmz/bosses (Boss Board dossier page): sources equal the bounty page's, every fact has a source and a section
// heading, no number the posts do not state, no third-party or narrative boss name (the nine Lieutenant names seen
// in game appear only in the labeled roster, Brief 172), no "Most Wanted", "Killers" or the other gap word, no
// FAQPage, every dossier text server-rendered, evidence meter math, the tree shows the two boss types as siblings,
// the sitemap entry, the hub link and the auto-linker phrases.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { SOURCES, FACTS, UNPUBLISHED, TREE, FIELDS, DOSSIERS, UPDATE_LOG, LAST_UPDATED, CONTENT_CHANGED, PAGE_URL, TITLE, DESC, BOSS_IMAGE, LT_SEEN, REWARDS_SEEN, factById, evidence, bossImageSet, bossImageAlt, lieutenantImageAlt } from './bosses.js';
import { SOURCES as BOUNTY_SOURCES } from './bounties.js';
import { parseBody, linkifyArticleSegments } from './articleContent.js';
import { loadComponent, render } from '../games/jsxHarness.test-helper.mjs';

const src = (p) => readFileSync(path.resolve(p), 'utf8');
const dec = (s) => s.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&');
const ALL_TEXT = () => [...FACTS.map((f) => f.text), ...UNPUBLISHED.map((u) => u.text), ...UPDATE_LOG.map((u) => u.text), TITLE, DESC,
  ...DOSSIERS.flatMap((d) => [d.designation, d.rank, d.note || '']), TREE.root.title, ...TREE.branches.flatMap((b) => [b.title, ...b.nodes.map((n) => n.title)])];
// Names that circulate from Part 1's narrative field reports and third-party sites. Banned from every page text
// (Brief 128 intent: the page states only sourced facts). Brief 172 exception, deliberate and narrow: the nine
// Lieutenant names the operator saw in game (LT_SEEN) may appear ONLY inside the labeled roster in the Lieutenants
// dossier (and as its image alt text). Jin-Tae and any other name stay banned everywhere, roster included.
const THIRD_PARTY = /\b(Scavenger|Doctor|Jin[- ]?Tae|Bale|Iskra|Roze|Gorani)\b/i;
const SEEN_NINE = ['Bale', 'Gorani', 'Iskra', 'Jang-Ui', 'Roze', 'Scavenger', 'The Chemist', 'The Doctor', 'Warden'];
const SEEN_RE = /\b(Bale|Gorani|Iskra|Jang-Ui|Roze|Scavenger|Chemist|Doctor|Warden)\b/i;
const ROSTER_RE = /<section class="bb-roster" data-lt-seen=""[\s\S]*?<\/section>/g;
// Image file paths carry the lowercase image ids (e.g. /images/DMZ/bosses/bale-512.webp); a path is not a name shown.
const noUrls = (s) => s.replace(/\s(src|srcSet)="[^"]*"/g, '');

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

test('wording: no third-party boss names, Lieutenant names only in the roster, no "Most Wanted" / "Killers" / the other gap word', () => {
  const visible = dec(html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' '));
  // Everything except the roster, markup and attributes included, carries none of the banned or seen names.
  const outside = noUrls(html.replace(ROSTER_RE, ' '));
  assert.equal((html.match(ROSTER_RE) || []).length, 1, 'exactly one roster');
  assert.ok(!THIRD_PARTY.test(outside) && !SEEN_RE.test(outside), 'a Lieutenant or narrative name outside the roster: ' + (outside.match(THIRD_PARTY) || outside.match(SEEN_RE) || [])[0]);
  assert.ok(!/Jin[- ]?Tae/i.test(html), 'Jin-Tae is banned everywhere');
  for (const t of [...ALL_TEXT(), dec(outside.replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' '))]) {
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
  assert.deepEqual(lt.nodes, [{ dossier: 'lieutenants', title: 'Nine seen in game' }]);
  assert.deepEqual(cmd.nodes.map((n) => n.title), ['Colossus', 'Deathstalker', 'Tank']);
  // Siblings in markup: both branch nodes sit in one .bb-branches grid, directly under the root.
  const tree = html.slice(html.indexOf('class="bb-tree"'), html.indexOf('</section>', html.indexOf('class="bb-tree"')));
  assert.ok(tree.indexOf('id="boss-board"') < tree.indexOf('class="bb-branches"'));
  assert.equal((tree.match(/class="bb-branch"/g) || []).length, 2);
  // No chain of command is stated anywhere, and the open question says so.
  for (const t of ALL_TEXT()) assert.ok(!/outrank|chain of command|superior|subordinate|reports? to/i.test(t), t);
  assert.match(UNPUBLISHED.find((u) => u.id === 'tier-ranking').text, /neither post says/);
});

test('dossiers: three Commanders and one Lieutenants dossier; every field text server-rendered', () => {
  assert.deepEqual(DOSSIERS.map((d) => [d.id, d.designation, d.rank]), [['colossus', 'Colossus', 'Commander'], ['deathstalker', 'Deathstalker', 'Commander'], ['tank', 'Tank', 'Commander'], ['lieutenants', 'Nine seen in game', 'Lieutenant']]);
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
  // Portrait slots: only Deathstalker keeps "photo pending" (poster and dossier); Colossus and the Tank show their
  // images; the Lieutenants show the mosaic (poster) and the roster (dossier). "Names not published" is gone.
  assert.equal((html.match(/SURVEILLANCE PHOTO PENDING/g) || []).length, 2);
  assert.ok(!/NAMES NOT PUBLISHED|Names not published/.test(html));
  for (const id of ['deathstalker']) assert.ok(html.slice(html.indexOf('<article id="' + id + '"'), html.indexOf('</article>', html.indexOf('<article id="' + id + '"'))).includes('SURVEILLANCE PHOTO PENDING'), id);
  // Each fact shows its source and section.
  assert.ok(h.includes('Source: ') && h.includes(', section "Commanders"') && h.includes(', section "Commander Encounters"'));
});

// Briefs 171 and 173: the Tank and Colossus images (scripts/convert-dmz-boss-images.mjs -> public/images/DMZ/bosses/).
// Deathstalker held.
test('images: Colossus and Tank on poster and dossier, whole in the 4:3 slot, credited, files present', async () => {
  const imaged = DOSSIERS.filter((d) => d.image === true).map((d) => d.id);
  assert.deepEqual(imaged, ['colossus', 'tank']);
  const { BOSS_SOURCES } = await import('../../scripts/convert-dmz-boss-images.mjs');
  const ltIds = LT_SEEN.names.map((n) => n.id);
  assert.deepEqual(Object.keys(BOSS_SOURCES), imaged.concat(ltIds), 'the converter covers exactly the image: true dossiers and the Lieutenants seen');
  assert.equal(new Set(Object.values(BOSS_SOURCES)).size, Object.keys(BOSS_SOURCES).length, 'one source file per image id');
  for (const id of imaged.concat(ltIds)) for (const w of BOSS_IMAGE.widths) assert.ok(existsSync(path.resolve('public/images/DMZ/bosses/' + id + '-' + w + '.webp')), id + ' ' + w);
  for (const id of ['deathstalker', 'lieutenants']) assert.equal(bossImageSet(DOSSIERS.find((d) => d.id === id)), null, id);
  assert.ok(!existsSync(path.resolve('public/images/DMZ/bosses/deathstalker-512.webp')) && !existsSync(path.resolve('public/images/DMZ/bosses/deathstalker-1024.webp')));
  const imgs = html.match(/<img\b[^>]*>/g) || [];
  assert.equal(imgs.length, 4 + 9 + 9, 'Colossus and Tank poster + dossier, the nine in the mosaic and the nine in the roster');
  for (const id of imaged) {
    const set = 'srcSet="/images/DMZ/bosses/' + id + '-512.webp 512w, /images/DMZ/bosses/' + id + '-1024.webp 1024w"';
    const poster = html.slice(html.indexOf('data-dossier-open="' + id + '" aria-label='), html.indexOf('</a>', html.indexOf('data-dossier-open="' + id + '" aria-label=')));
    assert.ok(poster.includes(set) && poster.includes('alt=""') && poster.includes('sizes="' + BOSS_IMAGE.posterSizes + '"'), 'poster ' + id);
    const art = html.slice(html.indexOf('<article id="' + id + '"'), html.indexOf('</article>', html.indexOf('<article id="' + id + '"')));
    const d = DOSSIERS.find((x) => x.id === id);
    assert.ok(art.includes(set) && art.includes('alt="' + bossImageAlt(d) + '"') && art.includes('sizes="' + BOSS_IMAGE.dossierSizes + '"'), 'dossier ' + id);
    assert.ok(art.includes('<figcaption class="bb-credit">' + BOSS_IMAGE.credit + '</figcaption>'), 'credit ' + id);
    assert.ok(!art.includes('PHOTO PENDING'), id);
  }
  for (const i of imgs) assert.ok(/loading="lazy"/.test(i) && !/fetchPriority|fetchpriority/i.test(i), i);
  assert.equal((html.match(/<p class="bb-credit">Boss images: Call of Duty: Modern Warfare 4<\/p>/g) || []).length, 1);
  assert.equal((html.match(/Image: Call of Duty: Modern Warfare 4/g) || []).length, 2);
  assert.match(html, /\.bb-ph img\{position:absolute;inset:0;width:100%;height:100%;object-fit:contain\}/);
});

// Brief 172: the nine Lieutenants the site operator saw in game. Names only, labeled as an operator observation
// (not an official post), shown only in the Lieutenants roster, never paired with a Commander, area or date, and
// never presented as the full roster.
test('Lieutenants seen in game: exactly the nine, labeled, roster-only, unpaired, not the full roster', () => {
  assert.deepEqual(LT_SEEN.names.map((n) => n.name), SEEN_NINE);
  for (const n of LT_SEEN.names) assert.deepEqual(Object.keys(n).sort(), ['id', 'name'], 'names only: ' + n.name);
  assert.match(LT_SEEN.label, /^Seen in game \(operator observation, not in an official post\)$/);
  assert.match(LT_SEEN.note, /may be incomplete/);
  assert.ok(!/\d/.test(LT_SEEN.label + LT_SEEN.note), 'no digits');
  // The roster lives in the Lieutenants dossier, once; each name is one figcaption with its image.
  const art = html.slice(html.indexOf('<article id="lieutenants"'), html.indexOf('</article>', html.indexOf('<article id="lieutenants"')));
  const roster = (html.match(ROSTER_RE) || [''])[0];
  assert.ok(roster && art.includes(roster), 'roster inside the Lieutenants dossier');
  assert.ok(dec(roster).includes(LT_SEEN.label) && dec(roster).includes(LT_SEEN.note) && roster.includes('<p class="bb-credit">' + LT_SEEN.credit + '</p>'));
  assert.deepEqual([...roster.matchAll(/<figcaption>([^<]*)<\/figcaption>/g)].map((m) => m[1]), SEEN_NINE);
  for (const n of LT_SEEN.names) {
    assert.ok(roster.includes('alt="' + lieutenantImageAlt(n) + '"') && roster.includes('/images/DMZ/bosses/' + n.id + '-512.webp 512w'), n.name);
    assert.ok(roster.includes('sizes="' + LT_SEEN.rosterSizes + '"'));
  }
  // No Commander, area or date sits in the roster.
  assert.ok(!/Colossus|Deathstalker|Tank|Commander|Hajin|\d{4}-\d{2}-\d{2}/.test(dec(roster).replace(/<[^>]+>/g, ' ')));
  // The poster mosaic: the nine images, decorative (alt=""), no names.
  const poster = html.slice(html.indexOf('data-dossier-open="lieutenants" aria-label='), html.indexOf('</a>', html.indexOf('data-dossier-open="lieutenants" aria-label=')));
  assert.equal((poster.match(/<img\b[^>]*alt=""[^>]*>/g) || []).length, 9);
  assert.ok(poster.includes('class="bb-ph bb-mosaic"') && !SEEN_RE.test(noUrls(poster)));
  // The corrected copy: the hero says the names are the exception to "official post", and the open item says the
  // Deep Dives still name none.
  // Brief 188: the observed Boss Board reward figures are the second exception, named in the same sentence.
  assert.ok(dec(html).includes('Every line is sourced to an official post, except the Lieutenant names and the Boss Board reward figures, which the site operator saw in game and which are labeled that way'));
  assert.match(UNPUBLISHED.find((u) => u.id === 'lt-names').text, /neither Deep Dive names any/);
  assert.ok(UNPUBLISHED.some((u) => u.id === 'lt-count'), 'the count stays open: nine is not the full roster');
  const obs = UPDATE_LOG.find((u) => u.kind === 'observation' && /on or before this date/.test(u.text));
  assert.ok(obs && obs.date === '2026-10-27' && /^Correction: /.test(obs.text) && /may be incomplete/.test(obs.text));
});

// Brief 182: the in-game spelling is "Jang-Ui" (capital U; Boss Board and the key "Jang-Ui's Converted Power Room
// Key"). The image id and file names stay lowercase. The correction is an observation entry, so LAST_UPDATED stays.
test('Lieutenant spelling: Jang-Ui shown, id and image files unchanged, dated correction in the log', () => {
  const lt = LT_SEEN.names.find((n) => n.id === 'jang-ui');
  assert.equal(lt.name, 'Jang-Ui');
  assert.ok(!LT_SEEN.names.some((n) => n.name === 'Jang-ui'));
  assert.match(lieutenantImageAlt(lt), /Jang-Ui/);
  assert.ok(existsSync(path.resolve('public/images/DMZ/bosses/jang-ui-512.webp')) && existsSync(path.resolve('public/images/DMZ/bosses/jang-ui-1024.webp')));
  const fix = UPDATE_LOG.find((u) => /matches the game/.test(u.text));
  assert.ok(fix.kind === 'observation' && fix.date === '2026-10-27' && /^Correction: /.test(fix.text) && /matches the game/.test(fix.text));
  assert.ok(!SEEN_RE.test(fix.text), 'no name in the log');
  assert.equal(LAST_UPDATED, '2026-10-12');
});

// Brief 188: the Boss Board reward figures the operator saw on the in-game board cards (2026-10-23, Xbox Series X
// and PC). An operator observation, never "official" or "confirmed"; a sibling of LT_SEEN, outside FACTS and
// UNPUBLISHED (so the digit rules, the counts and the evidence meters are unchanged); rendered once, under the
// sourced reward facts, with each figure inside a data-observed-value element and nowhere else on the page.
test('Boss Board rewards seen in game: exact items, labeled, figures only inside data-observed-value', () => {
  assert.deepEqual(REWARDS_SEEN, {
    label: 'Seen in game (operator observation, not an official figure)',
    observed_date: '2026-10-23',
    platforms: ['Xbox Series X', 'PC'],
    build: null,
    paid: 'Paid once per boss (operator observation)',
    items: [
      { id: 'lieutenants', what: 'Each Lieutenant card', value: '$10,000', unit: null },
      { id: 'commanders', what: 'Deathstalker and Tank cards', value: '$50,000', unit: null },
    ],
    colossus_note: 'The Colossus card showed CLAIMED, with no amount.',
  });
  // Not inside LT_SEEN, not a fact or an open item, and no Lieutenant name in it.
  assert.equal(LT_SEEN.rewards, undefined);
  const rs = JSON.stringify(REWARDS_SEEN);
  assert.ok(!SEEN_RE.test(rs) && !THIRD_PARTY.test(rs), 'a Lieutenant name in REWARDS_SEEN');
  assert.match(REWARDS_SEEN.label, /not an official figure\)$/);
  assert.ok(!/\bconfirmed\b/i.test(rs), 'never "confirmed"');
  assert.ok(!/colossus/i.test(REWARDS_SEEN.items.map((i) => i.what).join(' ')), 'no Colossus amount');
  for (const t of [...FACTS.map((f) => f.text), ...UNPUBLISHED.map((u) => u.text), ...UPDATE_LOG.map((u) => u.text)]) assert.ok(!/[$]/.test(t), '$ in: ' + t);
  // Rendered once, after the sourced reward facts in the Boss Board section, outside the roster.
  const blocks = html.match(/<section class="bb-rseen" data-rewards-seen=""[\s\S]*?<\/section>/g) || [];
  assert.equal(blocks.length, 1);
  const b = dec(blocks[0]);
  const tree = html.slice(html.indexOf('aria-labelledby="bb-tree-h"'), html.indexOf('aria-labelledby="bb-wall-h"'));
  assert.ok(tree.includes(blocks[0]) && dec(tree).lastIndexOf(factById('bb-rewards').text) < dec(tree).indexOf(b), 'under the sourced reward facts');
  assert.ok(!(html.match(ROSTER_RE) || [''])[0].includes('data-rewards-seen'));
  const text = b.replace(/<[^>]+>/g, '');
  assert.ok(text.startsWith('OBSERVED' + REWARDS_SEEN.label));
  assert.ok(text.includes('Each Lieutenant card showed REWARD $10,000.'));
  assert.ok(text.includes('Deathstalker and Tank cards showed REWARD $50,000.'));
  assert.ok(text.includes('Paid once per boss (operator observation).'));
  assert.ok(text.includes('The Colossus card showed CLAIMED, with no amount.'));
  assert.ok(text.includes('Seen on 2026-10-23, on Xbox Series X and PC; build not recorded.'));
  // Each figure is inside a data-observed-value element; no amount anywhere else on the page.
  assert.deepEqual([...html.matchAll(/<span data-observed-value="">([^<]*)<\/span>/g)].map((m) => m[1]), ['$10,000', '$50,000']);
  const rest = dec(html.replace(/<span data-observed-value="">[^<]*<\/span>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' '));
  assert.ok(!/[$]\s?\d|\d{1,3},\d{3}/.test(rest), 'a reward amount outside data-observed-value');
  // Not published: counters, card states, Swap Intel, Dog Tag payouts.
  assert.ok(!/\b\d+\/\d+\b|PURCHASED|ELIMINATED|SWAP INTEL/i.test(b.replace(/<[^>]+>/g, ' ')));
  assert.ok(!/dog tag|extract/i.test(text));
  // The open item and the hero say amounts are not in an official post.
  assert.match(UNPUBLISHED.find((u) => u.id === 'reward-amounts').text, /in an official post/);
  assert.ok(dec(html).includes('Lieutenant names and board rewards seen in game'));
  // The log entry: an observation, no digits, no figures; LAST_UPDATED stays.
  const log = UPDATE_LOG.find((u) => /reward figures/.test(u.text));
  assert.ok(log && log.kind === 'observation' && log.date === CONTENT_CHANGED && !/\d/.test(log.text));
  assert.equal(LAST_UPDATED, '2026-10-12');
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
  assert.equal(wp.dateModified, CONTENT_CHANGED);
  assert.deepEqual(wp.citation.map((c) => c.url), [SOURCES.PART1.href, SOURCES.PART2.href]);
  const il = blocks.find((b) => b['@type'] === 'ItemList');
  assert.deepEqual(il.itemListElement.map((x) => [x.position, x.name, x.url]), [[1, 'Colossus', PAGE_URL + '#colossus'], [2, 'Deathstalker', PAGE_URL + '#deathstalker'], [3, 'Tank', PAGE_URL + '#tank']]);
  const page = src('app/dmz/bosses/page.js');
  assert.ok(page.includes('alternates: { canonical: PAGE_URL }'));
  const elig = src('lib/sitemap/eligible.js');
  assert.ok(elig.includes("add(BASE + '/dmz/bosses', D, 'dmz-section', BOSSES_CONTENT_CHANGED, 'weekly', 0.8);"));
  assert.ok(elig.includes("import { CONTENT_CHANGED as BOSSES_CONTENT_CHANGED } from '@/lib/dmz/bosses';"));
});

// Brief 128: two dates, same design as /dmz/bounties. LAST_UPDATED is the source-check date (the visible
// "Checked against source on" line); CONTENT_CHANGED is the last wording change (sitemap lastmod and
// WebPage.dateModified). A wording change never moves the source-check date.
test('two dates: CONTENT_CHANGED >= LAST_UPDATED; visible label reads LAST_UPDATED, dateModified and sitemap read CONTENT_CHANGED', () => {
  assert.equal(LAST_UPDATED, '2026-10-12');
  assert.equal(CONTENT_CHANGED, '2026-10-27');
  assert.ok(CONTENT_CHANGED >= LAST_UPDATED);
  // The newest Deep Dive check sets LAST_UPDATED; an in-game observation entry (Brief 172) does not move it.
  assert.equal(LAST_UPDATED, UPDATE_LOG.find((u) => u.kind !== 'observation').date, 'LAST_UPDATED is the newest source-check entry');
  for (const u of UPDATE_LOG) assert.ok(u.kind === undefined || u.kind === 'observation', 'unknown log kind ' + u.kind);
  assert.ok(html.includes('Checked against source on ' + LAST_UPDATED));
  assert.ok(!html.includes('Checked against source on ' + CONTENT_CHANGED));
  const page = src('app/dmz/bosses/page.js');
  assert.ok(page.includes("{'Checked against source on ' + LAST_UPDATED}"));
  assert.ok(page.includes('dateModified: CONTENT_CHANGED,'));
  assert.ok(!/dateModified: LAST_UPDATED/.test(page));
  assert.ok(src('lib/sitemap/eligible.js').includes('BOSSES_CONTENT_CHANGED, \'weekly\''));
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
  assert.match(hub, /\{FAQ_BOUNTIES_SUF\}\s*\{FAQ_BOSSES_PRE\}\s*<Link href=\{FAQ_BOSSES\.href\} style=\{faqLinkStyle\}>\{FAQ_BOSSES\.label\}<\/Link>\s*<SourcedText text=\{FAQ_BOSSES_SUF\} linkStyle=\{faqLinkStyle\} \/>/);
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
