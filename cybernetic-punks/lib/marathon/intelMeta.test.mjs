// lib/marathon/intelMeta.test.mjs
// /marathon/intel head text (Brief 139): no hard-coded article count. "1,000+" was false (384 published,
// indexable Marathon articles on 2026-10-26); meta and OG now say "Hundreds of articles on shells, weapons, and
// factions" (true for the set the page lists; the unverifiable "every shell" claim is gone too). Title and twitter
// text unchanged. Source-level: the page imports the DB client.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const SRC = readFileSync(new URL('../../app/marathon/intel/page.js', import.meta.url), 'utf8');
const head = SRC.slice(SRC.indexOf('export async function generateMetadata'), SRC.indexOf('alternates: { canonical: canonical },'));

test('intel meta/OG/twitter: no "1,000+" count and no "every shell" claim; meta and OG say "Hundreds of articles on shells, weapons, and factions"', () => {
  assert.ok(head.length > 0);
  const code = SRC.split(/\r?\n/).filter((l) => !/^\s*\/\//.test(l)).join('\n');
  assert.ok(!/1,000\+|1000\+/.test(code), 'no 1,000+ claim in any non-comment line');
  assert.ok(!/every shell/i.test(code), 'no "every shell" claim in any non-comment line');
  assert.equal((head.match(/Hundreds of articles on shells, weapons, and factions/g) || []).length, 2, 'meta + OG');
  assert.ok(head.includes("title: { absolute: 'Marathon News & Updates - Builds, Meta & Patches' + suffix },"), 'title unchanged');
  assert.ok(head.includes("description: 'Latest Marathon news, builds, meta shifts, and ranked intel. Refreshed throughout the day.',"), 'twitter unchanged');
});
