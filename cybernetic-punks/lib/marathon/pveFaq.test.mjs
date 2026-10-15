// lib/marathon/pveFaq.test.mjs
// /marathon/pve (2026-10-15): the CONFIRMED card quotes Bungie's exact Sep 14 wording; the three FAQ Q&As
// render visibly from PVE_FAQ_ITEMS, the same array that feeds the FAQPage JSON-LD. FREEZE: the JSON-LD
// text is pinned byte-for-byte to the production capture taken before the change, and the title, meta,
// OG, twitter and canonical strings are pinned as they were.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PVE_FAQ_ITEMS, pveFaqSchema } from './pveFaq.js';
import { safeJsonLd } from '../security/safeJsonLd.js';

const SRC = readFileSync(new URL('../../app/marathon/pve/page.js', import.meta.url), 'utf8');

// Captured from https://cyberneticpunks.com/marathon/pve on 2026-10-15, before this change (958 chars).
const PROD_FAQ_LD = `{"@context":"https://schema.org","@type":"FAQPage","mainEntity":[{"@type":"Question","name":"When does Marathon PvE launch?","acceptedAnswer":{"@type":"Answer","text":"Marathon's first permanent PvE experience launches with the Symbiosis update on December 8, 2026, per Bungie's September 14, 2026 dev update."}},{"@type":"Question","name":"Is Marathon getting a PvE mode?","acceptedAnswer":{"@type":"Answer","text":"Yes. Bungie confirmed Marathon's first permanent PvE experience -- a new way to explore and progress beyond the extraction loop -- arriving with Symbiosis on December 8, 2026."}},{"@type":"Question","name":"What is Marathon Symbiosis?","acceptedAnswer":{"@type":"Answer","text":"Symbiosis is Marathon's December 8, 2026 update. Bungie says it brings the first permanent PvE experience, a refreshed Perimeter zone, a new Runner shell, a social space with a firing range, an experimental Team Deathmatch mode, and onboarding improvements."}}]}`;

test('(a) CONFIRMED card quotes Bungie exactly, with attribution; the misquote is gone', () => {
  assert.ok(SRC.includes('Bungie says it will provide \\"a new way to explore, progress, and engage with the world beyond traditional PvPvE extraction gameplay.\\"'));
  assert.ok(!SRC.includes('a new way to explore and progress beyond the traditional PvPvE extraction loop'));
  assert.ok(!SRC.includes('Bungie frames it as'));
});

test('(b) visible FAQ renders all 3 Q&As from the same array that feeds the JSON-LD', () => {
  assert.equal(PVE_FAQ_ITEMS.length, 3);
  assert.ok(SRC.includes("import { PVE_FAQ_ITEMS, pveFaqSchema } from '@/lib/marathon/pveFaq';"));
  assert.ok(SRC.includes('var faqSchema = pveFaqSchema();'));
  assert.ok(SRC.includes('{PVE_FAQ_ITEMS.map(function (item) {'));
  assert.ok(SRC.includes('<h3 style={{ fontSize: 14, fontWeight: 800, color: \'#fff\', margin: \'0 0 6px\', lineHeight: 1.4 }}>{item.q}</h3>'));
  assert.ok(SRC.includes('lineHeight: 1.65 }}>{item.a}</p>'));
  // No second copy of the FAQ text left in the page.
  for (const f of PVE_FAQ_ITEMS) assert.ok(!SRC.includes(f.q), 'question not duplicated inline: ' + f.q);
  const ld = pveFaqSchema();
  assert.deepEqual(ld.mainEntity.map((m) => [m.name, m.acceptedAnswer.text]), PVE_FAQ_ITEMS.map((f) => [f.q, f.a]));
});

test('(c) FAQPage JSON-LD text is byte-identical to production', () => {
  assert.equal(PROD_FAQ_LD.length, 958);
  assert.equal(safeJsonLd(pveFaqSchema()), PROD_FAQ_LD);
});

test('(d) FREEZE: title, meta, OG, twitter, canonical unchanged', () => {
  for (const s of [
    "title: { absolute: 'Marathon PvE: Everything We Know (Symbiosis, December 8) | Cybernetic Punks' },",
    "description: \"Marathon's first permanent PvE experience launches with the Symbiosis update on December 8, 2026. Here is everything Bungie has confirmed about Marathon PvE, what is still unknown, and what we will cover at launch. Sourced, pre-launch, no guesses.\",",
    'alternates: { canonical: PAGE_URL },',
    "title: \"Marathon's First PvE Is Coming December 8 -- Everything We Know\",",
    "description: \"Marathon's first permanent PvE experience launches with Symbiosis on December 8, 2026. The confirmed facts, the honest unknowns, and what we'll cover at launch.\",",
    "card: 'summary_large_image',",
    "site: '@Cybernetic87250',",
    "title: \"Marathon's First PvE Is Coming December 8\",",
    "description: \"Marathon's first permanent PvE experience launches with Symbiosis on December 8, 2026. Confirmed facts + honest unknowns.\",",
  ]) assert.ok(SRC.includes(s), s);
  assert.ok(SRC.includes("const PAGE_URL = 'https://cyberneticpunks.com/marathon/pve';"));
});

test('new strings are ASCII', () => {
  assert.ok(!/[^\x00-\x7f]/.test(readFileSync(new URL('./pveFaq.js', import.meta.url), 'utf8')));
  for (const f of PVE_FAQ_ITEMS) assert.ok(!/[^\x00-\x7f]/.test(f.q + f.a));
});
