// lib/wardogs/articleBodyWrap.test.mjs
// Brief 229: Wardogs article bodies carry "Sources:" paragraphs with long plain-text URLs that cannot break by
// default, which laid the page out up to 608px wide on a 390px phone (12 of 16 articles). The body <article> on the
// Wardogs article route sets overflowWrap 'anywhere' so those URLs break inside the column. Pinned here so a later edit
// to the body style cannot drop it. Same rule as the DMZ article route (.dmza-col p ... {overflow-wrap:anywhere}).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const src = (p) => readFileSync(path.resolve(p), 'utf8');

test('the Wardogs article body sets overflowWrap anywhere on the body <article>', () => {
  const page = src('app/wardogs/[section]/[slug]/page.js');
  const bodies = page.match(/<article style=\{\{[^}]*\}\}>/g) || [];
  assert.equal(bodies.length, 1, 'one body <article>');
  assert.match(bodies[0], /overflowWrap: 'anywhere'/);
  // The body is still the one rendered from parseBody(article.body), directly after that <article>.
  assert.match(page, /<article style=\{\{[^}]*overflowWrap: 'anywhere'[^}]*\}\}>\r?\n\s+\{parseBody\(article\.body\)\.map/);
});

test('the DMZ article route keeps the same rule (the precedent this follows)', () => {
  assert.match(src('app/dmz/[section]/[slug]/page.js'), /\.dmza-col p,\.dmza-col li,\.dmza-src\{overflow-wrap:anywhere\}/);
});
