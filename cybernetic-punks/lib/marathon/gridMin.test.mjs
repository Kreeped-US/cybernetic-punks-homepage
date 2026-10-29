// lib/marathon/gridMin.test.mjs
// Brief 235: twelve Marathon card grids used repeat(auto-fit, minmax(340px|360px, 1fr)), wider than a phone's content
// box, so ten Marathon pages laid out wider than a 360px screen. Each minimum is now min(Npx, 100%): unchanged wherever the grid
// already fit, and no wider than its box on narrow screens. Pins each line by file and line number, and that the
// six-column ranked tier row (RankedClient.js:297) was deliberately left as repeat(6, 1fr).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const LINES = [
  ['app/marathon/builds/page.js', 481, 340],
  ['app/marathon/cradle/CradleClient.js', 177, 340],
  ['app/marathon/guides/page.js', 599, 340],
  ['app/marathon/guides/page.js', 647, 340],
  ['app/marathon/guides/[category]/page.js', 719, 340],
  ['app/marathon/guides/[category]/page.js', 738, 340],
  ['app/marathon/weapons/[slug]/WeaponDetailClient.js', 354, 340],
  ['app/marathon/shells/[slug]/ShellDetailClient.js', 747, 340],
  ['app/marathon/shells/[slug]/ShellDetailClient.js', 354, 360],
  ['app/marathon/ranked/RankedClient.js', 458, 340],
  ['app/marathon/maps/[slug]/page.js', 623, 340],
  ['app/marathon/maps/[slug]/page.js', 644, 340],
];
const lineOf = (f, n) => readFileSync(path.resolve(f), 'utf8').split(/\r?\n/)[n - 1];

for (const [f, n, px] of LINES) {
  test(f + ':' + n + ' card grid minimum is min(' + px + 'px, 100%)', () => {
    const l = lineOf(f, n);
    assert.ok(l.includes("gridTemplateColumns: 'repeat(auto-fit, minmax(min(" + px + "px, 100%), 1fr))'"), l.trim());
  });
}

test('no fixed 340px or 360px card-grid minimum is left in the changed files', () => {
  for (const f of new Set(LINES.map((x) => x[0]))) {
    assert.ok(!/minmax\((340|360)px, 1fr\)/.test(readFileSync(path.resolve(f), 'utf8')), f);
  }
});

test('the six-column ranked tier row is deliberately unchanged', () => {
  assert.ok(lineOf('app/marathon/ranked/RankedClient.js', 297).includes("gridTemplateColumns: 'repeat(6, 1fr)'"));
});
