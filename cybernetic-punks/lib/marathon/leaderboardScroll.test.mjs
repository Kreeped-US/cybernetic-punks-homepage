// lib/marathon/leaderboardScroll.test.mjs
// Brief 236: the /marathon/leaderboard rows need about 740px, so on phones the whole page panned sideways (418px
// too wide at 320). The header and data rows now sit in one focusable region that scrolls sideways below 768px,
// with a visible hint; at 768px and wider nothing changes. Pins the region's attributes, the CSS and the hint.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const src = readFileSync(path.resolve('app/marathon/leaderboard/page.js'), 'utf8');

test('the rows sit in one focusable region labelled "Leaderboard rows"', () => {
  assert.ok(src.includes('<div className="lb-scroll" tabIndex={0} role="region" aria-label="Leaderboard rows">'));
  assert.equal(src.split('className="lb-scroll"').length - 1, 1);
  assert.ok(src.includes('<div className="lb-rows">'));
});

test('the region scrolls sideways and shows a 2px gold focus ring', () => {
  assert.ok(src.includes("'.lb-scroll{overflow-x:auto}'"));
  assert.ok(src.includes("'.lb-scroll:focus-visible{outline:2px solid #ffcc00;outline-offset:3px}'"));
});

test('the 740px row minimum and the hint apply only below 768px', () => {
  assert.ok(src.includes("'.lb-hint{display:none}'"));
  assert.ok(src.includes("'@media (max-width:767.98px){.lb-rows{min-width:740px}.lb-hint{display:block}}'"));
});

test('the hint line says the box scrolls', () => {
  assert.match(src, /<p className="lb-hint" style=\{\{[^}]*fontSize: 12,[^}]*\}\}>\s*Swipe sideways to see every column\s*<\/p>/);
});

test('no page-wide overflow-x was added', () => {
  assert.ok(!/(html|body)\s*\{[^}]*overflow-x/.test(src));
});
