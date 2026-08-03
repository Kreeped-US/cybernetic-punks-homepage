// scripts/gsc-corroboration.mjs
// GAME-DB CORROBORATION runner. READ-ONLY. Loads feed_items bodies + the verified entity STORE
// (unique_weapons / shell_stats / weapon_stats) and calls the pure classifier lib/gsc/corroboration.js.
// Prints findings grouped by claim (entity, field, value) with the verbatim source sentence, the
// store value + its verified_source + patch tag, class, seniority, and suggested disposition. It
// NEVER writes -- to the store or anywhere. Headless, like near-miss / cannibalization.
// RUN: node scripts/gsc-corroboration.mjs
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { classifyCorroboration, PATCH_DATES } from '../lib/gsc/corroboration.js';

function loadEnvLocal() {
  let raw; try { raw = readFileSync(new URL('../.env.local', import.meta.url), 'utf8'); } catch (e) { return; }
  raw.split('\n').forEach((line) => {
    line = line.trim(); if (!line || line.charAt(0) === '#') return;
    const eq = line.indexOf('='); if (eq === -1) return;
    const k = line.slice(0, eq).trim(); let v = line.slice(eq + 1).trim();
    if (v.length >= 2) { const f = v[0], l = v[v.length - 1]; if ((f === '"' || f === "'") && f === l) v = v.slice(1, -1); }
    if (!process.env[k]) process.env[k] = v;
  });
}
loadEnvLocal();
const supa = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const GAME = 'marathon';

async function pageAll(table, sel, filter) {
  const out = []; for (let from = 0; ; from += 1000) { let q = supa.from(table).select(sel); if (filter) q = filter(q); const { data, error } = await q.range(from, from + 999); if (error) { console.error(table + ' read err: ' + error.message); break; } if (!data || !data.length) break; out.push(...data); if (data.length < 1000) break; } return out;
}

// STORE: the three verified entity tables. aliases are CANONICAL-ONLY here (precision-first): the
// runner matches full entity names, so it under-reports articles that use short forms (a missed
// claim is silence, never a false finding). Alias curation is the recall lever, banked as a follow-on.
const [uniques, shells, weapons] = await Promise.all([
  pageAll('unique_weapons', '*', (q) => q.eq('game_slug', GAME)),
  pageAll('shell_stats', '*', (q) => q.eq('game_slug', GAME)),
  pageAll('weapon_stats', '*', (q) => q.eq('game_slug', GAME)),
]);
const entities = []
  .concat(uniques.map((r) => ({ type: 'unique', name: r.name, aliases: [], fields: r, verified: r.verified, verified_source: r.verified_source, patch_verified: r.patch_verified })))
  .concat(shells.map((r) => ({ type: 'shell', name: r.name, aliases: [], fields: r, verified: r.verified, verified_source: r.verified_source, patch_verified: r.patch_verified })))
  .concat(weapons.map((r) => ({ type: 'weapon', name: r.name, aliases: [], fields: r, verified: r.verified, verified_source: r.verified_source, patch_verified: r.patch_verified })))
  .filter((e) => e.name);

const articles = await pageAll('feed_items', 'slug, editor, created_at, body, is_published, game_slug',
  (q) => q.eq('game_slug', GAME).eq('is_published', true).not('body', 'is', null));

const runDate = new Date().toISOString().slice(0, 10);
console.log('corroboration run ' + runDate + '  articles=' + articles.length + '  store entities: unique=' + uniques.length + ' shell=' + shells.length + ' weapon=' + weapons.length);
console.log('PATCH_DATES calendar: ' + JSON.stringify(PATCH_DATES) + '  (store patches not in the map -> seniority indeterminate)');

const { findings, corroborations, skippedAmbiguous } = classifyCorroboration(articles, { entities }, { runDate });

const contradicted = findings.filter((f) => f.class === 'CONTRADICTED');
const uncorrob = findings.filter((f) => f.class === 'UNCORROBORATED');
console.log('\n=== SUMMARY ===  findings=' + findings.length + ' (CONTRADICTED=' + contradicted.length + ', UNCORROBORATED=' + uncorrob.length + ')'
  + '  corroborations=' + corroborations.length + '  skipped-ambiguous=' + skippedAmbiguous.length);

function printFinding(f, i) {
  console.log('\n  #' + (i + 1) + '  [' + f.class + ']  ' + f.entity + ' . ' + f.field + '  (' + f.n_affected + ' article' + (f.n_affected === 1 ? '' : 's') + ')');
  console.log('     claimed: ' + JSON.stringify(f.claimed_value));
  console.log('     store:   ' + (f.store_display == null ? 'NULL (field unset)' : JSON.stringify(f.store_display))
    + '  [verified=' + f.store_verified + (f.store_verified_source ? ', source="' + String(f.store_verified_source).slice(0, 60) + '"' : '') + ', patch=' + f.store_patch + (f.store_patch_date ? '->' + f.store_patch_date : '') + ']');
  if (f.class === 'CONTRADICTED') console.log('     seniority: ' + f.seniority + '  ->  disposition: ' + f.suggested_disposition);
  else console.log('     disposition: ' + f.suggested_disposition);
  if (f.evidence_note) console.log('     NOTE: ' + f.evidence_note);
  f.affected.slice(0, 4).forEach((a) => console.log('       - ' + a.slug + '  (' + a.editor + ', ' + a.created_at + (a.seniority ? ', ' + a.seniority : '') + ')\n         "' + a.verbatim.slice(0, 180) + (a.verbatim.length > 180 ? '...' : '') + '"'));
  if (f.affected.length > 4) console.log('       ... +' + (f.affected.length - 4) + ' more articles');
}

console.log('\n========== CONTRADICTED ==========');
if (!contradicted.length) console.log('  (none)');
contradicted.forEach(printFinding);

console.log('\n========== UNCORROBORATED (verification-task candidates) ==========');
if (!uncorrob.length) console.log('  (none)');
uncorrob.slice(0, 15).forEach(printFinding);
if (uncorrob.length > 15) console.log('\n  ... +' + (uncorrob.length - 15) + ' more UNCORROBORATED findings');

console.log('\n========== CORROBORATION STAMPS (matches -> "corroborated-against-store ' + runDate + '") ==========  n=' + corroborations.length);
corroborations.slice(0, 8).forEach((c) => console.log('  ' + c.slug + '  ' + c.entity + '.' + c.field + '=' + JSON.stringify(c.value)));
if (corroborations.length > 8) console.log('  ... +' + (corroborations.length - 8) + ' more');
process.exit(0);
