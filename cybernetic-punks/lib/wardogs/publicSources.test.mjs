// lib/wardogs/publicSources.test.mjs
// Brief 320: the Finder / hub "Sources:" text (loadoutSolver inheritProvenance) and the article grounding SOURCE line
// (lib/content/grounding.js) carry the registry's public credit labels, never the rows' raw verified_source text.
// Fed the EXACT Evo4Fun strings the staged Season 2 apply SQL writes (read out of the files, not retyped).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { publicSourceCredits, GENERIC_COMBAT_CREDIT, COMBAT_SOURCE_LABEL } from './combatSource.js';
import { inheritProvenance } from './loadoutSolver.js';
import { fetchVerifiedStatBlock } from '../content/grounding.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const literals = (file, prefix) => {
  const sql = readFileSync(path.join(ROOT, 'docs/migrations', file), 'utf8').split(/\r?\n/).filter((l) => !l.trim().startsWith('--')).join('\n');
  const m = [...sql.matchAll(/'((?:[^']|'')*)'/g)].map((x) => x[1].replace(/''/g, "'")).filter((s) => s.startsWith(prefix) && !s.endsWith('%'));
  return [...new Set(m)];
};
const EVO_B = literals('2026-11-07-wardogs-s2-apply-1-ballistics.sql', 'Evo4Fun in-game testing workbook (EVA WARDOGS)');
const EVO_T = literals('2026-11-07-wardogs-s2-apply-2-ttk.sql', 'Evo4Fun workbook shots-to-kill');
const SWOLE = 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified';
const EVO_CREDIT = 'Evo4Fun in-game testing workbook, sheet dated 30/10/2026 (attributed)';

test('the SQL really does carry "per operator" (so this guard is meaningful)', () => {
  assert.equal(EVO_B.length, 1);
  assert.equal(EVO_T.length, 2);
  assert.ok([...EVO_B, ...EVO_T].some((s) => /per operator/.test(s)));
});

test('publicSourceCredits: registry labels in registry order, de-duplicated, generic for an unnamed source', () => {
  const rows = [...EVO_T, ...EVO_B, SWOLE, EVO_T[0]].map((v) => ({ verified_source: v }));
  assert.deepEqual(publicSourceCredits(rows), [COMBAT_SOURCE_LABEL, EVO_CREDIT]);
  assert.deepEqual(publicSourceCredits([{ verified_source: SWOLE }, { verified_source: 'a private note' }, { verified_source: null }]), [COMBAT_SOURCE_LABEL, GENERIC_COMBAT_CREDIT]);
  assert.deepEqual(publicSourceCredits([]), []);
});

test('Finder provenance: sources are credit labels; no raw text, no "per operator"', () => {
  const W = [{ name: 'A-91' }, { name: 'MP43' }];
  const ttk = [
    ...EVO_T.map((v, i) => ({ weapon_name: 'A-91', ammo_type: 'FMJ', armor_tier: i, ttk_ms: 300, confidence_tier: 'attributed', verified_source: v })),
    { weapon_name: 'MP43', ammo_type: 'FMJ', armor_tier: 0, ttk_ms: 500, confidence_tier: 'attributed', verified_source: SWOLE },
  ];
  const p = inheritProvenance({ ttkRows: ttk, weapons: W });
  assert.deepEqual(p.sources, [COMBAT_SOURCE_LABEL, EVO_CREDIT]);
  const shown = 'Basis: ' + p.basis + '. Sources: ' + p.sources.join(' | ');
  assert.ok(!/per operator/i.test(shown), shown);
  assert.ok(shown.includes(EVO_CREDIT), shown);
  for (const raw of [...EVO_T, SWOLE]) assert.ok(!shown.includes(raw), 'no raw verified_source text');
  const unnamed = inheritProvenance({ ttkRows: [{ weapon_name: 'A-91', verified_source: 'a private note' }], weapons: [W[0]] });
  assert.deepEqual(unnamed.sources, [GENERIC_COMBAT_CREDIT]);
});

// A fake Supabase client for the grounding block: from(table) -> chain ending in the table's rows.
function fakeSb(tables) {
  return {
    from(t) {
      const chain = { select() { return chain; }, eq() { return chain; }, ilike() { return chain; }, is() { return chain; },
        maybeSingle() { return Promise.resolve({ data: tables[t] || null, error: null }); },
        then(res, rej) { return Promise.resolve({ data: tables[t] || [], error: null }).then(res, rej); } };
      return chain;
    },
  };
}

test('article grounding SOURCE: credit labels for the exact Evo4Fun texts; no "per operator", no raw text', async () => {
  const block = await fetchVerifiedStatBlock(fakeSb({
    wardogs_ttk: [{ ammo_type: 'FMJ', armor_tier: 0, ttk_ms: 280, verified_source: EVO_T[0] }, { ammo_type: 'FMJ', armor_tier: 1, ttk_ms: 330, verified_source: SWOLE }],
    wardogs_ballistics: [{ ammo_type: 'FMJ', armor_tier: 0, body_part: 'CHEST', damage: 27.28, shots_to_kill: 4, verified_source: EVO_B[0] }],
    weapon_stats: { name: 'A-91', weapon_type: 'Assault Rifle', fire_rate: 721, verified_source: 'Closed Alpha/Beta playtest capture | fire_rate: ... | Update 2026-10-16: ...' },
  }), 'wardogs', 'A-91', 'weapon');
  assert.ok(block, 'a block is built');
  const line = block.split('\n').find((l) => l.startsWith('SOURCE: '));
  assert.equal(line, 'SOURCE: ' + COMBAT_SOURCE_LABEL + ' | ' + EVO_CREDIT);
  assert.ok(!/per operator/i.test(block), block);
  for (const raw of [...EVO_T, ...EVO_B, SWOLE]) assert.ok(!block.includes(raw), 'no raw verified_source text');
  assert.ok(!block.includes('Closed Alpha/Beta'), 'no weapon_stats provenance fallback');
  const unnamed = await fetchVerifiedStatBlock(fakeSb({
    wardogs_ttk: [{ ammo_type: 'FMJ', armor_tier: 0, ttk_ms: 280, verified_source: 'a private note' }], wardogs_ballistics: [], weapon_stats: { name: 'X' },
  }), 'wardogs', 'X', 'weapon');
  assert.ok(unnamed.includes('SOURCE: ' + GENERIC_COMBAT_CREDIT + '\n'), unnamed);
});
