// lib/content/markdownLinks.test.mjs
// Brief 243: markdown links [label](target) in article bodies render as links in every body renderer.
// Internal paths (one leading "/") and https only; everything else stays literal text. Labels never reach
// the linkers or item cards, so no anchor can nest. Pins the helper, the component and the wiring.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { splitMarkdownLinks, hasMarkdownLink, markdownLinkSpans, splitMarkdownLinksOutsideBold } from './markdownLinks.js';
import { linkifyPoiSegments } from '../dmz/articleContent.js';
import { loadComponent, render } from '../games/jsxHarness.test-helper.mjs';

const T = (text) => ({ type: 'text', text });
const IN = (label, href) => ({ type: 'link', label, href, internal: true });
const EX = (label, href) => ({ type: 'link', label, href, internal: false });

test('internal path', () => {
  assert.deepEqual(splitMarkdownLinks('Map it in the [Cradle planner](/marathon/cradle) first.'), [T('Map it in the '), IN('Cradle planner', '/marathon/cradle'), T(' first.')]);
});

test('https external', () => {
  assert.deepEqual(splitMarkdownLinks('Per the [patch notes](https://www.bungie.net/7/en/News/x?a=1).'), [T('Per the '), EX('patch notes', 'https://www.bungie.net/7/en/News/x?a=1'), T('.')]);
});

test('http:, javascript:, data:, mailto:, protocol-relative, relative and #anchor targets stay text', () => {
  for (const t of ['http://example.com/a', 'javascript:alert(1)', 'data:text/html,x', 'mailto:a@b.c', '//evil.example/x', '/\\evil.example', 'marathon/cradle', '#top', 'JavaScript:alert(1)']) {
    const s = 'See [this](' + t + ') now.';
    assert.deepEqual(splitMarkdownLinks(s), [T(s)], t);
  }
});

test('empty or blank label and nested brackets stay text', () => {
  for (const s of ['An [](/marathon/cradle) link.', 'A [ ](/marathon/cradle) link.', 'A [a [b] c](/marathon/cradle) link.']) {
    assert.deepEqual(splitMarkdownLinks(s), [T(s)], s);
  }
});

test('two links in one paragraph', () => {
  assert.deepEqual(splitMarkdownLinks('Use the [Cradle planner](/marathon/cradle) and the [meta tier list](/marathon/meta).'), [
    T('Use the '), IN('Cradle planner', '/marathon/cradle'), T(' and the '), IN('meta tier list', '/marathon/meta'), T('.'),
  ]);
});

test('malformed syntax and no markdown at all: one text segment; never throws', () => {
  for (const s of ['Broken [a](b', 'Broken [a]( /x)', '[a] (/x)', 'Plain prose with no links.', '']) assert.deepEqual(splitMarkdownLinks(s), [T(s)], s);
  assert.deepEqual(splitMarkdownLinks(undefined), [T('')]);
  assert.deepEqual(splitMarkdownLinks(null), [T('')]);
  assert.equal(hasMarkdownLink('Plain.'), false);
  assert.equal(hasMarkdownLink('A [x](http://example.com).'), false, 'an http: link is not a link');
  assert.equal(hasMarkdownLink('A [x](/y).'), true);
});

test('link inside bold: bold runs stay whole for the bold renderer, whose inner text then splits', () => {
  const p = 'Before **see the [Cradle planner](/marathon/cradle)** after [meta](/marathon/meta).';
  assert.deepEqual(splitMarkdownLinksOutsideBold(p), [T('Before '), T('**see the [Cradle planner](/marathon/cradle)**'), T(' after '), IN('meta', '/marathon/meta'), T('.')]);
  assert.deepEqual(splitMarkdownLinks('see the [Cradle planner](/marathon/cradle)'), [T('see the '), IN('Cradle planner', '/marathon/cradle')]);
});

test('a label that contains an item or POI name is never a text segment (cards and linkers only see text)', () => {
  const p = 'Read the [BR33 Volley Rifle guide](/marathon/weapons/br33-volley-rifle) first.';
  for (const segs of [splitMarkdownLinks(p), splitMarkdownLinksOutsideBold(p)]) {
    assert.equal(segs.filter((s) => s.type === 'link').length, 1);
    assert.ok(segs.filter((s) => s.type === 'text').every((s) => !s.text.includes('BR33')));
  }
});

test('markdownLinkSpans marks every markdown-shaped run, linkable or not', () => {
  assert.deepEqual(markdownLinkSpans('a [x](/y) b [z](http://q) c'), [[2, 9], [12, 25]]);
  assert.deepEqual(markdownLinkSpans('none'), []);
});

// Render BodyLinkText for real (Next's SWC + react-dom/server; next/link stubbed to <a href>).
const require = createRequire(import.meta.url);
globalThis.__react243 = require('react');
const loadBodyLinkText = () => loadComponent('components/network/BodyLinkText.js', { stubs: { react: 'export const Fragment = globalThis.__react243.Fragment;\n' } });

test('component: internal link in the same tab (no target, no rel); https link in a new tab with rel noopener noreferrer', async () => {
  const React = require('react');
  const { default: BodyLinkText } = await loadBodyLinkText();
  const html = render(() => React.createElement(BodyLinkText, { text: 'Use the [Cradle planner](/marathon/cradle) or [notes](https://example.com/n).', className: 'dmza-link' }));
  assert.ok(html.includes('<a href="/marathon/cradle" class="body-link dmza-link">Cradle planner</a>'), html);
  assert.ok(html.includes('<a href="https://example.com/n" target="_blank" rel="noopener noreferrer" class="body-link dmza-link">notes</a>'), html);
  assert.ok(!/\]\(/.test(html), 'no literal markdown left');
});

test('no nested anchors: a label holding a POI name renders exactly one anchor through the real DMZ linker', async () => {
  const React = require('react');
  const { default: BodyLinkText } = await loadBodyLinkText();
  const POIS = [{ name: 'Hajin City', slug: 'hajin-city' }];
  const linked = new Set();
  // renderText mirrors the DMZ route: remaining text goes through linkifyPoiSegments.
  const rest = (t) => React.createElement(React.Fragment, null, ...linkifyPoiSegments(t, POIS, linked).map((s, i) => s.type === 'link' ? React.createElement('a', { key: i, href: '/dmz/pois/' + s.slug }, s.value) : s.value));
  const html = render(() => React.createElement(BodyLinkText, { text: 'Plan the route with the [Hajin City map](/dmz/regions/dmz-hajin) first.', renderText: rest }));
  assert.equal((html.match(/<a /g) || []).length, 1, html);
  assert.ok(!/<a [^>]*>[^<]*<a /.test(html), 'no anchor inside an anchor');
  assert.equal(linked.size, 0, 'the label did not use the POI first-mention slot');
  // The same name in the remaining text still links (once), outside the markdown link.
  const html2 = render(() => React.createElement(BodyLinkText, { text: 'The [Hajin City map](/dmz/regions/dmz-hajin) covers Hajin City.', renderText: rest }));
  assert.equal((html2.match(/<a /g) || []).length, 2, html2);
  assert.ok(!/<a [^>]*>[^<]*<a /.test(html2));
});

test('wiring: the five body renderers render markdown links; DiscourseArticle is unchanged', () => {
  const read = (f) => readFileSync(new URL('../../' + f, import.meta.url), 'utf8');
  const imp = "import BodyLinkText, { BODY_LINK_CSS } from '@/components/network/BodyLinkText';";
  const dmz = read('app/dmz/[section]/[slug]/page.js');
  assert.ok(dmz.includes(imp));
  // Every call site renders exactly the old JSX when a run has no markdown link (byte-identical pages).
  assert.ok(dmz.includes('{hasMarkdownLink(m[1]) ? <BodyLinkText text={m[1]} className="dmza-link" /> : m[1]}'));
  assert.ok(dmz.includes('if (hasMarkdownLink(part)) return <BodyLinkText key={i} text={part} className="dmza-link" renderText={rest} />;'));
  for (const f of ['app/wardogs/[section]/[slug]/page.js', 'app/pubg-dednet/[section]/[slug]/page.js', 'components/game/GameArticle.js']) {
    const s = read(f);
    assert.ok(s.includes(imp), f);
    assert.ok(s.includes('if (!hasMarkdownLink(t)) return sources ? sourceLinkRun(t) : t;'), f);
    assert.ok(s.includes('{bodyRun(stripMarkers(blk.text), isSourcesParagraph(blk.text))}</p>'), f);
    assert.ok(s.includes("<li key={i} style={{ margin: '4px 0' }}>{bodyRun(stripMarkers(it), false)}</li>"), f);
    assert.ok(s.includes('{hasMarkdownLink(article.body) ? <style dangerouslySetInnerHTML={{ __html: BODY_LINK_CSS }} /> : null}'), f);
  }
  const mar = read('app/marathon/intel/[slug]/page.js');
  assert.ok(mar.includes("import BodyLinkText, { BodyLink, BODY_LINK_CSS } from '@/components/network/BodyLinkText';"));
  assert.ok(mar.includes("if (seg.type === 'mdlink') return <BodyLink key={i} seg={seg.link} style={BODY_LINK_STYLE} />;"));
  assert.ok(mar.includes('if (hasMarkdownLink(part)) return <span key={i}><BodyLinkText text={part} style={BODY_LINK_STYLE} renderText={sources ? sourceLinkRun : undefined} /></span>;'));
  assert.ok(mar.includes('if (foundOnce || seg.type !== \'text\')'), 'the card loop only searches text segments');
  assert.ok(!read('components/DiscourseArticle.js').includes('BodyLinkText'));
});
