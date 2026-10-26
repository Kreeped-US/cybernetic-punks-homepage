// lib/marathon/pageDates.test.mjs
// Two dates for /marathon/nightfall and /marathon/pve (Brief 137): the visible "checked" line reads the
// source-check date (LAST_UPDATED), while dateModified (nightfall; pve has no WebPage JSON-LD) and the
// sitemap lastmod read the last content change (CONTENT_CHANGED), imported from one module.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadComponent, render } from '../games/jsxHarness.test-helper.mjs';
import { NIGHTFALL_LAST_UPDATED, NIGHTFALL_CONTENT_CHANGED, PVE_LAST_UPDATED, PVE_CONTENT_CHANGED } from './pageDates.js';

const ELIG = readFileSync(new URL('../sitemap/eligible.js', import.meta.url), 'utf8');
const text = (h) => h.replace(/<[^>]+>/g, ' ').replace(/&mdash;/g, '-').replace(/\s+/g, ' ');
const ld = (h) => [...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));

// The sitemap line for `path` reads `constName` and holds no quoted date literal (scoped to that line).
function sitemapLine(path, constName) {
  const line = ELIG.split(/\r?\n/).find((l) => l.includes("[BASE + '" + path + "',"));
  assert.ok(line, 'sitemap line for ' + path);
  assert.ok(line.includes(constName), path + ' lastmod reads ' + constName);
  assert.ok(!/['"]\d{4}-\d{2}-\d{2}['"]/.test(line), path + ': no quoted date literal on the lastmod line');
}

test('values: source-check dates unchanged, content-change dates from git, never earlier', () => {
  assert.equal(NIGHTFALL_LAST_UPDATED, '2026-09-17');
  assert.equal(NIGHTFALL_CONTENT_CHANGED, '2026-10-16');
  assert.equal(PVE_LAST_UPDATED, '2026-09-14');
  assert.equal(PVE_CONTENT_CHANGED, '2026-10-15');
  assert.ok(NIGHTFALL_CONTENT_CHANGED >= NIGHTFALL_LAST_UPDATED);
  assert.ok(PVE_CONTENT_CHANGED >= PVE_LAST_UPDATED);
  assert.ok(ELIG.includes("import { NIGHTFALL_CONTENT_CHANGED, PVE_CONTENT_CHANGED } from '@/lib/marathon/pageDates';"));
});

test('nightfall: dateModified = CONTENT_CHANGED; visible label reads LAST_UPDATED; sitemap imports the constant', async () => {
  const mod = await loadComponent('app/marathon/nightfall/page.js');
  const html = render(mod.default);
  const wp = ld(html).find((x) => x['@type'] === 'WebPage');
  assert.equal(wp.dateModified, NIGHTFALL_CONTENT_CHANGED);
  assert.ok(text(html).includes('Checked against source on ' + NIGHTFALL_LAST_UPDATED));
  assert.ok(!text(html).includes('Checked against source on ' + NIGHTFALL_CONTENT_CHANGED));
  sitemapLine('/marathon/nightfall', 'NIGHTFALL_CONTENT_CHANGED');
});

test('pve: no WebPage JSON-LD (unchanged, so no dateModified); visible label reads LAST_UPDATED; sitemap imports the constant', async () => {
  const mod = await loadComponent('app/marathon/pve/page.js');
  const html = render(mod.default);
  assert.deepEqual(ld(html).map((x) => x['@type']).sort(), ['BreadcrumbList', 'FAQPage']);
  assert.ok(text(html).includes('last checked against the source ' + PVE_LAST_UPDATED));
  assert.ok(!text(html).includes(PVE_CONTENT_CHANGED));
  sitemapLine('/marathon/pve', 'PVE_CONTENT_CHANGED');
});
