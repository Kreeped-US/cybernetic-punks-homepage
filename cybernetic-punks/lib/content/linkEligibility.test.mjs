// lib/content/linkEligibility.test.mjs
// Shared rule: a paragraph starting "Sources:" gets no render-time links and does not use a term's
// first-mention slot. Exercised through the real DMZ linkers, walked the way the DMZ article route
// walks a body (one Set per linker per article; paragraphs and list items only; bold spans skipped).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isLinkEligibleParagraph, SOURCES_PREFIX } from './linkEligibility.js';
import { parseBody, linkifyPoiSegments, linkifyArticleSegments } from '../dmz/articleContent.js';

const POIS = [{ name: 'Hajin City', slug: 'hajin-city' }];
const SYSTEMS = [
  { name: 'Hajin', slug: 'dmz-hajin', href: '/dmz/regions/dmz-hajin' },
  { name: 'FOB', slug: 'dmz-fob', href: '/dmz/fob/dmz-fob' },
].sort((a, b) => b.name.length - a.name.length);

// Mirrors ArticleBody in app/dmz/[section]/[slug]/page.js.
function links(body) {
  const poiLinked = new Set(), aLinked = new Set(), out = [];
  const span = (t, where) => {
    for (const ps of linkifyPoiSegments(t, POIS, poiLinked)) {
      if (ps.type === 'link') { out.push(where + ':' + ps.value); continue; }
      for (const as of linkifyArticleSegments(ps.value, SYSTEMS, aLinked)) if (as.type === 'alink') out.push(where + ':' + as.value);
    }
  };
  const inline = (t, where) => {
    if (!isLinkEligibleParagraph(t)) return;
    t.split(/(\*\*[^*]+\*\*)/).forEach((p) => { if (p && !/^\*\*[^*]+\*\*$/.test(p)) span(p, where); });
  };
  parseBody(body).forEach((b, i) => {
    if (b.type === 'p') inline(b.text, 'p' + i);
    else if (b.type === 'ul') b.items.forEach((it) => inline(it, 'u' + i));
  });
  return out;
}

test('rule: trimmed paragraph start, case-sensitive "Sources:"', () => {
  assert.equal(SOURCES_PREFIX, 'Sources:');
  assert.equal(isLinkEligibleParagraph('Sources: Bulkhead, "X" (October 14, 2026): https://example.com.'), false);
  assert.equal(isLinkEligibleParagraph('   Sources: a'), false);
  assert.equal(isLinkEligibleParagraph('sources: a'), true, 'case-sensitive');
  assert.equal(isLinkEligibleParagraph('SOURCES: a'), true, 'case-sensitive');
  assert.equal(isLinkEligibleParagraph('The Sources: section'), true, 'only at the start');
  assert.equal(isLinkEligibleParagraph('Update (October 15, 2026): the FOB'), true);
  assert.equal(isLinkEligibleParagraph('Correction (October 5, 2026): the FOB'), true);
  assert.equal(isLinkEligibleParagraph(undefined), true);
});

test('(a) a Sources paragraph gets no links', () => {
  const body = 'Plain prose with nothing to link.\n\nSources: Call of Duty blog, "Explore the Hajin Exclusion Zone" (June 6, 2026): https://example.com/a; "FOB guide" (October 9, 2026): https://example.com/b.';
  assert.deepEqual(links(body), []);
  // The linkers themselves also refuse a Sources line (span-level guard) and leave the Sets untouched.
  const s = new Set(), a = new Set();
  const line = 'Sources: "Hajin City guide" and the FOB and Hajin.';
  assert.deepEqual(linkifyPoiSegments(line, POIS, s), [{ type: 'text', value: line }]);
  assert.deepEqual(linkifyArticleSegments(line, SYSTEMS, a), [{ type: 'text', value: line }]);
  assert.equal(s.size + a.size, 0, 'no first-mention slot used');
});

test('(b) the first prose mention still links when the term also appears in Sources (before or after)', () => {
  assert.deepEqual(links('The FOB is where runs start.\n\nSources: "FOB guide": https://example.com.'), ['p0:FOB']);
  // Sources first, prose later: the Sources line must not consume the slot.
  assert.deepEqual(links('**Intro**\n\nSources: "FOB guide": https://example.com.\n\nLater the FOB opens.'), ['p2:FOB']);
});

test('(c) a term appearing only in Sources gets no link', () => {
  assert.deepEqual(links('Survival basics.\n\nSources: "Explore the Hajin Exclusion Zone": https://example.com.'), []);
});

test('(d) Update and Correction paragraphs are still linked as before', () => {
  assert.deepEqual(links('Intro.\n\nUpdate (October 15, 2026): the FOB moved.'), ['p1:FOB']);
  assert.deepEqual(links('Intro.\n\nCorrection (October 5, 2026): Hajin City was misnamed.'), ['p1:Hajin City']);
  // list items keep working; a list item starting "Sources:" is skipped
  assert.deepEqual(links('- Sources: the FOB\n- the FOB again'), ['u0:FOB']);
});

test('wiring: DMZ route and Marathon intel route use the shared rule', () => {
  const dmz = readFileSync(new URL('../../app/dmz/[section]/[slug]/page.js', import.meta.url), 'utf8');
  assert.ok(dmz.includes("import { isLinkEligibleParagraph } from '@/lib/content/linkEligibility';"));
  assert.ok(dmz.includes('poiEntries={poiFor(item)}') && dmz.includes('poiEntries={poiFor(b.text)}'));
  assert.ok(dmz.includes('articleEntries={articleFor(item)}') && dmz.includes('articleEntries={articleFor(b.text)}'));
  const mar = readFileSync(new URL('../../app/marathon/intel/[slug]/page.js', import.meta.url), 'utf8');
  assert.ok(mar.includes("import { isLinkEligibleParagraph } from '@/lib/content/linkEligibility';"));
  assert.equal(mar.split('allItems={itemsFor(el.content)}').length - 1, 2, 'paragraph + analysis renders');
  assert.ok(!mar.includes('allItems={allItems} mentionedSet'), 'no ungated card render left');
});
