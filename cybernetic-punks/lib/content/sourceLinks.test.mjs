// lib/content/sourceLinks.test.mjs
// Brief 232: URLs inside an article's "Sources:" / "Source:" line render as links whose text is the
// hostname (www. dropped) and whose href is the URL exactly as written; nothing else in a body links.
// Pins the helper's rules and the wiring in the five body renderers.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sourceLinkSegments, linkSourceUrls } from './sourceLinks.js';

const L = (text, href) => ({ type: 'link', text, href });
const T = (text) => ({ type: 'text', text });

test('bare URL', () => {
  assert.deepEqual(sourceLinkSegments('Sources: https://example.com/a'), [T('Sources: '), L('example.com', 'https://example.com/a')]);
});

test('two URLs, separators stay as text', () => {
  assert.deepEqual(sourceLinkSegments('Sources: A, https://a.example/x; B, https://b.example/y.'), [
    T('Sources: A, '), L('a.example', 'https://a.example/x'), T('; B, '), L('b.example', 'https://b.example/y'), T('.'),
  ]);
});

test('trailing period, comma, semicolon and bracket stay outside the link', () => {
  assert.deepEqual(sourceLinkSegments('Sources: X: https://example.com/p.'), [T('Sources: X: '), L('example.com', 'https://example.com/p'), T('.')]);
  assert.deepEqual(sourceLinkSegments('Sources: https://example.com/p];'), [T('Sources: '), L('example.com', 'https://example.com/p'), T('];')]);
});

test('parenthesised URL: the closing parenthesis is text; a balanced one inside the URL is kept', () => {
  assert.deepEqual(sourceLinkSegments('Source: the post (https://example.com/a).'), [T('Source: the post ('), L('example.com', 'https://example.com/a'), T(').')]);
  assert.deepEqual(sourceLinkSegments('Sources: https://en.wikipedia.org/wiki/Foo_(bar).'), [T('Sources: '), L('en.wikipedia.org', 'https://en.wikipedia.org/wiki/Foo_(bar)'), T('.')]);
});

test('a markdown link in the line is left as text for the markdown-link layer; bare URLs still link (Brief 243)', () => {
  assert.deepEqual(sourceLinkSegments('Sources: [Patch notes](https://example.com/p); https://example.com/q.'), [
    T('Sources: [Patch notes](https://example.com/p); '), L('example.com', 'https://example.com/q'), T('.'),
  ]);
  const onlyMd = 'Sources: [Patch notes](http://example.com/p).';
  assert.deepEqual(sourceLinkSegments(onlyMd), [T(onlyMd)], 'an http: target inside markdown syntax is not linked either');
});

test('javascript: and other schemes are never linked', () => {
  const line = 'Sources: javascript:alert(1); data:text/html,x; ftp://example.com/f.';
  assert.deepEqual(sourceLinkSegments(line), [T(line)]);
});

test('a URL with credentials stays plain text; a later good URL still links', () => {
  assert.deepEqual(sourceLinkSegments('Sources: https://user:pass@example.com/a; https://example.org/b.'), [
    T('Sources: https://user:pass@example.com/a; '), L('example.org', 'https://example.org/b'), T('.'),
  ]);
});

test('no Sources line: nothing links, even with a URL', () => {
  const p = 'Read more at https://example.com/a in prose.';
  assert.deepEqual(sourceLinkSegments(p), [T(p)]);
  assert.deepEqual(sourceLinkSegments('The Sources: are https://example.com/a'), [T('The Sources: are https://example.com/a')]);
  assert.deepEqual(sourceLinkSegments(undefined), [T('')]);
});

test('"Source:" singular links, and a line with no URL is unchanged', () => {
  assert.deepEqual(sourceLinkSegments('Source: Marathon Development Team, detail post - https://x.com/MarathonDevTeam/status/2100253598609535344'), [
    T('Source: Marathon Development Team, detail post - '), L('x.com', 'https://x.com/MarathonDevTeam/status/2100253598609535344'),
  ]);
  const noUrl = 'Source: Bungie\'s official Marathon Update 1.1.9 patch notes (bungie.net).';
  assert.deepEqual(sourceLinkSegments(noUrl), [T(noUrl)]);
});

test('www. is dropped from the link text only; the href keeps it', () => {
  assert.deepEqual(sourceLinkSegments('Sources: https://www.callofduty.com/blog/2026/06/x.'), [T('Sources: '), L('callofduty.com', 'https://www.callofduty.com/blog/2026/06/x'), T('.')]);
});

test('a query string stays in the href', () => {
  assert.deepEqual(sourceLinkSegments('Sources: Bulkhead devlog (YouTube), https://www.youtube.com/watch?v=J2VxjMnMDw4.'), [
    T('Sources: Bulkhead devlog (YouTube), '), L('youtube.com', 'https://www.youtube.com/watch?v=J2VxjMnMDw4'), T('.'),
  ]);
});

test('linkSourceUrls links a fragment of a line already known to be the citation line', () => {
  assert.deepEqual(linkSourceUrls('A, https://example.com/a;'), [T('A, '), L('example.com', 'https://example.com/a'), T(';')]);
  assert.deepEqual(linkSourceUrls(''), [T('')]);
});

test('anchors open in a new tab with rel noopener noreferrer, as DiscourseArticle body links do', () => {
  const c = readFileSync(new URL('../../components/network/SourceLinkText.js', import.meta.url), 'utf8');
  assert.ok(c.includes('target="_blank" rel="noopener noreferrer"'));
  assert.ok(c.includes(".src-link:focus-visible{outline:2px solid currentColor;outline-offset:2px}"));
});

test('wired into the five body renderers, only for the citation line', () => {
  const files = ['app/dmz/[section]/[slug]/page.js', 'app/wardogs/[section]/[slug]/page.js', 'app/pubg-dednet/[section]/[slug]/page.js', 'components/game/GameArticle.js', 'app/marathon/intel/[slug]/page.js'];
  for (const f of files) {
    const s = readFileSync(new URL('../../' + f, import.meta.url), 'utf8');
    assert.ok(s.includes("import SourceLinkText, { SOURCE_LINK_CSS } from '@/components/network/SourceLinkText';"), f);
    assert.ok(/isSourcesParagraph\((b\.text|blk\.text|el\.content)\)/.test(s), f);
  }
});
