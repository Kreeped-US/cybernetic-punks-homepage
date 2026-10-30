// lib/content/markdownLinkGate.test.mjs
// Brief 244: a publish-gate check for markdown links. A link that would render as literal text, or an
// internal link outside the article's game's live routes (lib/games/gameRoutes.js), blocks; https links
// are allowed. The check uses the renderer's own splitter, so gate and renderer agree. Pins the check,
// its two integrations (checkBodyIntegrity, detectPipelineLeak -> runGate) and every publish caller.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkMarkdownLinks, allowedLinkPaths, linkPath } from './markdownLinkGate.js';
import { splitMarkdownLinks } from './markdownLinks.js';
import { checkBodyIntegrity } from './bodyIntegrity.js';
import { detectPipelineLeak } from '../gsc/detectPipelineLeak.js';
import { decideGate } from '../gsc/prePublishGate.js';

const codes = (r) => r.blocks.map((b) => b.code);

test('(a) a markdown-shaped run that would not render blocks as MD_LINK_UNRENDERABLE', () => {
  for (const t of ['http://example.com/a', 'javascript:alert(1)', 'data:text/html,x', 'mailto:a@b.c', '//evil.example/x', 'marathon/cradle', '#top']) {
    const r = checkMarkdownLinks('See [this](' + t + ') now.', 'marathon');
    assert.deepEqual(codes(r), ['MD_LINK_UNRENDERABLE'], t);
    assert.equal(r.blocks[0].label, 'this');
    // A target ends at its first ")" (the Brief 243 known limit), so "javascript:alert(1)" reports "javascript:alert(1".
    assert.ok(t.startsWith(r.blocks[0].target) && r.blocks[0].target.length > 0, t);
  }
  assert.deepEqual(codes(checkMarkdownLinks('An [](/marathon/cradle) link.', 'marathon')), ['MD_LINK_UNRENDERABLE'], 'empty label');
  assert.deepEqual(codes(checkMarkdownLinks('A [ ](/marathon/cradle) link.', 'marathon')), ['MD_LINK_UNRENDERABLE'], 'blank label');
});

test('(b) an internal link outside the game\'s live routes blocks as MD_LINK_UNLISTED', () => {
  const r = checkMarkdownLinks('Use the [planner](/marathon/planner) first.', 'marathon');
  assert.deepEqual(codes(r), ['MD_LINK_UNLISTED']);
  assert.equal(r.blocks[0].target, '/marathon/planner');
  assert.match(r.blocks[0].context, /Use the \[planner\]\(\/marathon\/planner\) first\./);
});

test('(c) https links are allowed and reported separately, never blocked', () => {
  const r = checkMarkdownLinks('Per the [patch notes](https://www.bungie.net/7/en/News/x).', 'marathon');
  assert.deepEqual(r.blocks, []);
  assert.equal(r.external.length, 1);
  assert.equal(r.external[0].target, 'https://www.bungie.net/7/en/News/x');
});

test('(d) Sources / Source lines are checked the same way', () => {
  assert.deepEqual(codes(checkMarkdownLinks('Body.\n\nSources: [Bungie](http://bungie.net/x); https://example.com/y.', 'marathon')), ['MD_LINK_UNRENDERABLE']);
  assert.deepEqual(codes(checkMarkdownLinks('Body.\n\nSource: [our planner](/marathon/nope).', 'marathon')), ['MD_LINK_UNLISTED']);
  assert.deepEqual(codes(checkMarkdownLinks('Body.\n\nSources: [Bungie](https://bungie.net/x).', 'marathon')), []);
});

test('a trailing slash and a query string or anchor on an allowed path pass', () => {
  for (const t of ['/marathon/cradle/', '/marathon/cradle?shell=vandal', '/marathon/meta#weapons', '/marathon/factions/?x=1']) {
    assert.deepEqual(codes(checkMarkdownLinks('See [it](' + t + ').', 'marathon')), [], t);
  }
  assert.equal(linkPath('/marathon/cradle/?x=1#y'), '/marathon/cradle');
});

test('a game with no live routes blocks every internal link; an unknown game too', () => {
  assert.deepEqual(allowedLinkPaths('dmz'), []);
  assert.deepEqual(codes(checkMarkdownLinks('See the [printer](/dmz/printer).', 'dmz')), ['MD_LINK_UNLISTED']);
  assert.deepEqual(codes(checkMarkdownLinks('See the [planner](/marathon/cradle).', 'not-a-game')), ['MD_LINK_UNLISTED']);
});

test('a body with no markdown links has no findings', () => {
  assert.deepEqual(checkMarkdownLinks('Plain prose. [UNVERIFIED] tags and [Chip] brackets are not links.', 'marathon'), { blocks: [], external: [] });
  assert.deepEqual(checkMarkdownLinks(undefined, 'marathon'), { blocks: [], external: [] });
});

test('the 12-article shape passes for marathon; the same path fails under another game', () => {
  const body = 'Heat matters. Map the path in the [Cradle planner](/marathon/cradle) first.';
  assert.deepEqual(codes(checkMarkdownLinks(body, 'marathon')), []);
  assert.deepEqual(codes(checkMarkdownLinks(body, 'wardogs')), ['MD_LINK_UNLISTED']);
  assert.deepEqual(codes(checkMarkdownLinks('Try the [Loadout Finder](/wardogs/loadouts).', 'wardogs')), []);
});

test('without a game, only renderability is checked (every publish path passes the game)', () => {
  assert.deepEqual(codes(checkMarkdownLinks('See [it](/anything/at/all).', undefined)), []);
  assert.deepEqual(codes(checkMarkdownLinks('See [it](http://x.example).', undefined)), ['MD_LINK_UNRENDERABLE']);
});

test('gate and renderer agree: a run passes (a) exactly when splitMarkdownLinks renders it as a link', () => {
  const runs = ['[a](/x)', '[a](https://x.example/y)', '[a](http://x.example)', '[a](javascript:alert(1))', '[](/x)', '[ ](/x)',
    '[a](//x.example)', '[a](/\\x.example)', '[a](x/y)', '[a](#top)', '[a](mailto:a@b.c)', '[a]()', '[a b](/x?y=1)', '[a](HTTPS://x.example)'];
  for (const run of runs) {
    const segs = splitMarkdownLinks('Before ' + run + ' after.');
    const renders = segs.some((s) => s.type === 'link');
    const unrenderable = checkMarkdownLinks('Before ' + run + ' after.', undefined).blocks.some((b) => b.code === 'MD_LINK_UNRENDERABLE');
    assert.equal(renders, !unrenderable, run);
  }
});

test('integration: checkBodyIntegrity reports the link findings in its problem format', () => {
  const body = 'x'.repeat(420) + '\n\nSee the [planner](/marathon/planner) and [bad](http://x.example).';
  const r = checkBodyIntegrity({ headline: 'A headline', body, gameSlug: 'marathon' });
  const link = r.problems.filter((p) => p.code.startsWith('MD_LINK_'));
  assert.deepEqual(link.map((p) => p.code), ['MD_LINK_UNLISTED', 'MD_LINK_UNRENDERABLE']);
  assert.ok(link.every((p) => typeof p.message === 'string' && typeof p.detail === 'string'));
  assert.match(link[0].message, /\/marathon\/cradle, \/marathon\/factions, \/marathon\/meta/);
  const ok = checkBodyIntegrity({ headline: 'A headline', body: 'x'.repeat(420) + '\n\nMap it in the [Cradle planner](/marathon/cradle) first.', gameSlug: 'marathon' });
  assert.equal(ok.problems.filter((p) => p.code.startsWith('MD_LINK_')).length, 0);
});

test('integration: detectPipelineLeak blocks with PIPELINE_LEAK, which holds even in Marathon log-only mode', () => {
  const r = detectPipelineLeak([{ slug: 's', game_slug: 'marathon', body: 'Use the [planner](/marathon/planner) and [notes](https://example.com/n).' }]);
  const link = r.findings.filter((f) => f.kind.startsWith('md-link'));
  assert.deepEqual(link.map((f) => [f.class, f.kind, f.matched]), [['PIPELINE_LEAK', 'md-link-unlisted', '[planner](/marathon/planner)']]);
  assert.deepEqual(r.flags.filter((f) => f.kind === 'md-link-external').map((f) => f.matched), ['[notes](https://example.com/n)']);
  const decision = decideGate(r.findings, 'log-only', false);
  assert.equal(decision.hold, true);
  assert.equal(decision.gate_status, 'held');
  const clean = detectPipelineLeak([{ slug: 'c', game_slug: 'marathon', body: 'Map it in the [Cradle planner](/marathon/cradle) first.' }]);
  assert.equal(clean.findings.length, 0);
});

test('wiring: every checkBodyIntegrity publish caller passes the game; runGate feeds detectPipelineLeak the draft', () => {
  const read = (f) => readFileSync(new URL('../../' + f, import.meta.url), 'utf8');
  const sites = [
    ['app/api/cron/route.js', 'checkBodyIntegrity({ headline: insertData.headline, body: insertData.body, gameSlug: insertData.game_slug })', 1],
    ['app/api/admin/drafts/approve/route.js', 'checkBodyIntegrity({ headline: draft.headline, body: draft.body, gameSlug: draft.game_slug })', 1],
    ['app/api/admin/drafts/edit/route.js', 'checkBodyIntegrity({ headline: data.headline, body: data.body, gameSlug: data.game_slug })', 1],
    ['lib/gsc/releaseHeld.js', 'checkBodyIntegrity({ headline: row.headline, body: row.body, gameSlug: row.game_slug })', 1],
    ['scripts/persist-dmz-news.mjs', 'checkBodyIntegrity({ headline: row.headline, body: row.body, gameSlug: row.game_slug })', 2],
    ['scripts/persist-dmz-news.mjs', 'checkBodyIntegrity({ headline: rows[i].headline, body: rows[i].body, gameSlug: rows[i].game_slug })', 1],
    ['scripts/publish-drafts.mjs', 'checkBodyIntegrity({ headline: d.headline, body: d.body, gameSlug: d.game_slug })', 1],
    ['scripts/check-published-bodies.mjs', 'checkBodyIntegrity({ headline: r.headline, body: r.body, gameSlug: r.game_slug })', 1],
  ];
  for (const [f, call, n] of sites) assert.equal(read(f).split(call).length - 1, n, f);
  for (const f of new Set(sites.map((x) => x[0]))) {
    const calls = read(f).match(/checkBodyIntegrity\(\{[^}]*\}\)/g) || [];
    assert.ok(calls.length > 0 && calls.every((c) => c.includes('gameSlug:')), f + ': every call passes gameSlug');
  }
  assert.ok(read('lib/gsc/detectPipelineLeak.js').includes('const links = checkMarkdownLinks(body, art.game_slug);'));
  assert.ok(read('lib/gsc/runGate.js').includes('const pl = detectPipelineLeak([draft]);'));
  assert.ok(read('lib/gsc/releaseHeld.js').includes('game_slug'), 'release reads game_slug');
  assert.ok(read('lib/content/bodyIntegrity.js').includes('checkMarkdownLinks(body, o.gameSlug).blocks'));
});
