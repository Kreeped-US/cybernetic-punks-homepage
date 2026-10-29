// lib/wardogs/hubGridMin.test.mjs
// Brief 231: the card grids on /wardogs and /wardogs/economy used repeat(auto-fit, minmax(300px, 1fr)), so on a 320px
// phone the single 300px column sat in a 272px box and the page laid out 324px wide. The minimum is now
// min(300px, 100%): it shrinks to the box on narrow screens and stays 300px wherever the grid already fit.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const FIXED = "gridTemplateColumns: 'repeat(auto-fit, minmax(min(300px, 100%), 1fr))'";
const OLD = "minmax(300px, 1fr)";

for (const f of ['app/wardogs/page.js', 'app/wardogs/economy/page.js']) {
  test(f + ': the card grid minimum shrinks on narrow screens', () => {
    const src = readFileSync(path.resolve(f), 'utf8');
    assert.equal(src.split(FIXED).length - 1, 1, 'one grid with min(300px, 100%)');
    assert.ok(!src.includes(OLD), 'no fixed 300px minimum left');
  });
}
