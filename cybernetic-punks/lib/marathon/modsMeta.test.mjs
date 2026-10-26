// lib/marathon/modsMeta.test.mjs
// /marathon/mods head text (Brief 140): no hard-coded mod count. "all 151 mods" matched our data on 2026-10-26
// (151 distinct trimmed names) but read as an in-game total no repo source states, and would go stale as rows
// change; the "every/all" completeness wording in meta, OG and twitter is gone too. Title unchanged.
// Source-level: the page imports the DB client.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const SRC = readFileSync(new URL('../../app/marathon/mods/page.js', import.meta.url), 'utf8');
const head = SRC.slice(SRC.indexOf('export const metadata'), SRC.indexOf('alternates: { canonical:'));

test('mods meta/OG/twitter: no "151" count and no "every"/"all" completeness claim; new wording present', () => {
  assert.ok(head.length > 0);
  const code = SRC.split(/\r?\n/).filter((l) => !/^\s*\/\//.test(l)).join('\n');
  assert.ok(!/\b151\b/.test(code), 'no 151 in any non-comment line');
  const descs = [...head.matchAll(/description: '([^']*)'/g)].map((m) => m[1]);
  assert.equal(descs.length, 3, 'meta + OG + twitter');
  for (const d of descs) assert.ok(!/\bevery\b|\ball\b/i.test(d), 'no every/all in: ' + d);
  assert.ok(descs[0].includes('Effects, rarity tiers, and credit cost for each mod we list'), 'meta');
  assert.ok(descs[1].includes('credit cost for each Marathon weapon mod we list'), 'OG');
  assert.ok(descs[2].includes('credit cost for each Marathon weapon mod we list'), 'twitter');
  assert.ok(head.includes("title: { absolute: 'Marathon Mods - Every Weapon Mod, Effect & Rarity' },"), 'title unchanged');
});
