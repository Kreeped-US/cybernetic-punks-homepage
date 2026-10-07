// components/dmz/TraitSharePanel.test.mjs
// Share panel markup (first render through the JSX harness): Copy link, Copy text, Post on X, Share on
// Reddit (new tab, rel noopener noreferrer), read-only link / text / build code fields built from the
// server-passed page URL, and the Load field. Source checks: no window.location, clipboard writes only
// inside handlers with the select-and-hint fallback.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { loadComponent, render } from '../../lib/games/jsxHarness.test-helper.mjs';
import { createPlannerState, togglePick, encodeBuild } from '../../lib/dmz/traitBuild.js';

const PAGE_URL = 'https://cyberneticpunks.com/dmz/traits';
let Panel;
before(async () => {
  const reactUrl = pathToFileURL(createRequire(import.meta.url).resolve('react')).href;
  Panel = (await loadComponent('components/dmz/TraitSharePanel.js', {
    stubs: { react: "import R from '" + reactUrl + "';\nexport const useState = R.useState;\nexport const useRef = R.useRef;\n" },
  })).default;
});

// Client-shaped nodes (test-only).
const NODES = {
  a1: { slug: 'a1', tree: 't1', tier: 1, verified: true, cost: 1, name: 'Fixture A1' },
  b1: { slug: 'b1', tree: 't2', tier: 1, verified: true, cost: 1, name: 'Fixture B1' },
};
function state() {
  return togglePick(togglePick(createPlannerState(), 'a1', NODES, null), 'b1', NODES, null);
}
const unescape = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;/g, "'");

test('buttons and external links: Copy link, Copy text, Post on X, Share on Reddit (new tab, noopener noreferrer)', () => {
  const html = render(Panel, { shareUrl: PAGE_URL, state: state(), nodes: NODES, onLoad() {} });
  assert.match(html, />Share this plan</);
  assert.match(html, /<button type="button" class="tp-btn">Copy link<\/button>/);
  assert.match(html, /<button type="button" class="tp-btn">Copy text<\/button>/);
  const x = html.match(/<a class="tp-btn"[^>]*href="(https:\/\/twitter\.com\/intent\/tweet\?text=[^"]+)" target="_blank" rel="noopener noreferrer">Post on X<\/a>/);
  const r = html.match(/<a class="tp-btn"[^>]*href="(https:\/\/www\.reddit\.com\/submit\?url=[^"]+)" target="_blank" rel="noopener noreferrer">Share on Reddit<\/a>/);
  assert.ok(x && r);
  const code = encodeBuild(state());
  const link = PAGE_URL + '?b=' + code;
  const text = 'My DMZ trait plan for Operator 1: 2 picks across 2 trees (verified traits only). Work in progress: ' + link;
  assert.equal(decodeURIComponent(unescape(x[1]).split('text=')[1]), text);
  const rq = new URL(unescape(r[1])).searchParams;
  assert.equal(rq.get('url'), link);
  assert.equal(rq.get('title'), 'My DMZ trait plan for Operator 1: 2 picks across 2 trees (verified traits only).');
});

test('read-only link, text and build code fields from the server page URL; Load field for a pasted code', () => {
  const html = render(Panel, { shareUrl: PAGE_URL, state: state(), nodes: NODES, onLoad() {} });
  const code = encodeBuild(state());
  assert.match(html, new RegExp('<input id="tp-share-link" readOnly=""[^>]*value="' + PAGE_URL.replace(/[.\/]/g, '\\$&') + '\\?b=' + code + '"'));
  assert.match(html, /<textarea id="tp-share-text" readOnly="" rows="2"[^>]*>My DMZ trait plan for Operator 1: 2 picks across 2 trees/);
  assert.match(html, new RegExp('<input id="tp-share-code" readOnly=""[^>]*value="' + code + '"'));
  assert.match(html, /<input id="tp-share-load" placeholder="Paste a build code"[^>]*value=""/);
  assert.match(html, /<button type="button" class="tp-btn" disabled="">Load<\/button>/);
  assert.match(html, /aria-live="polite"/);
  assert.ok(!/Fixture A1|Fixture B1/.test(html), 'no trait names in the share text or link');
});

test('a different page URL is used verbatim (the client builds no origin of its own)', () => {
  const html = render(Panel, { shareUrl: 'https://example.test/x', state: state(), nodes: NODES, onLoad() {} });
  assert.match(html, /id="tp-share-link" readOnly=""[^>]*value="https:\/\/example\.test\/x\?b=/);
  const src = readFileSync(path.resolve('components/dmz/TraitSharePanel.js'), 'utf8');
  assert.ok(!/window\.location|location\.origin|location\.href|history\.(push|replace)State/.test(src), 'no origin reads, no URL rewrite');
  assert.ok(!/cyberneticpunks\.com/.test(src), 'no hardcoded origin in the client');
});

test('clipboard only inside the click handler, with the select-and-hint fallback; Load uses the share limits', () => {
  const src = readFileSync(path.resolve('components/dmz/TraitSharePanel.js'), 'utf8');
  assert.equal((src.match(/navigator\.clipboard\.writeText\(/g) || []).length, 1);
  const copyFn = src.slice(src.indexOf('function copy('), src.indexOf('function load('));
  assert.match(copyFn, /navigator\.clipboard\.writeText\(value\)\.then\(function \(\) \{ setMsg\(done\); \}, fallback\)/);
  assert.match(copyFn, /ref\.current\.select\(\)/);
  assert.match(copyFn, /setMsg\(COPY_HINT\)/);
  const loadFn = src.slice(src.indexOf('function load('));
  assert.match(loadFn, /acceptShareCode\(raw\) \? decodeBuild\(raw\) : null/);
  assert.match(loadFn, /decodeBuild\(raw, nodes\)/);
  assert.match(loadFn, /onLoad\(kept\)/);
});
