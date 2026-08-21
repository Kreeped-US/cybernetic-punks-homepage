// scripts/seed-gap-candidates.mjs
// STAGE A of Miranda-reopen: seed REAL coverage-gap content_candidate rows.
//
// Replaces the 10 hardcoded TEST seeds (warrant_source='seed_reinforce', incl.
// "Nonexistent Widget") with substance-warranted GAPS: verified entities
// (weapons/mods/cores/implants/cradle) that LACK a Miranda field guide -- so when the
// 2-arm consumer (Stage B) feeds Miranda, she writes about ACTUAL gaps, not the
// saturated shells (all 8 shells already have guides). Shells are deliberately excluded.
//
// DATA ONLY -- inserts content_candidate rows (NOT feed_items). Nothing generates: the
// cron consumer stays 2-OBSERVE and Miranda stays frozen. This only populates the queue.
//
// OPERATOR-RUN + REVIEWABLE (the INSERT/DELETE are writes):
//   node scripts/seed-gap-candidates.mjs           # DRY RUN: compute + print the tranche, write NOTHING
//   node scripts/seed-gap-candidates.mjs --apply    # delete the test seeds + upsert the tranche
//
// "HAS A GUIDE" (coverage) = the entity NAME appears as a whole space-boundaried phrase
// in a published Miranda survivor headline (primary-subject proxy -- guide headlines lead
// with their subject). Deliberately CONSERVATIVE: a loose match marks an entity COVERED,
// so we UNDER-seed rather than seed a near-dup (and the roster-wide dedup gate is the
// backstop at generation anyway). Substance = verified store rows (substanceFloor's floor);
// only entities that CLEAR the floor are seeded (substance is the warrant, per doctrine).

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import { FACET_TABLE_MAP, DEFAULT_SUBSTANCE_THRESHOLDS } from '../lib/content/substanceFloor.js';

const APPLY = process.argv.includes('--apply');
const GAME = 'marathon';
const TRANCHE_SIZE = 25;                                   // bound the first cohort (reviewable)
const FACETS = ['weapon', 'mod', 'core', 'implant', 'cradle'];  // non-shell (shells saturated)
const FACET_ORDER = { weapon: 0, core: 1, mod: 2, implant: 3, cradle: 4 };  // guide-worthiness

function envGet(k) {
  if (process.env[k]) return process.env[k];
  try {
    const e = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
    const m = e.match(new RegExp('^' + k + '=(.*)$', 'm'));
    return m ? m[1].trim().replace(/^["']|["']$/g, '') : undefined;
  } catch (_) { return undefined; }
}

const url = envGet('NEXT_PUBLIC_SUPABASE_URL');
const key = envGet('SUPABASE_SERVICE_KEY');
if (!url || !key) { console.error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_KEY.'); process.exit(1); }
const sb = createClient(url, key);

async function pageAll(table, cols, scoped) {
  const out = []; let from = 0;
  for (;;) {
    let q = sb.from(table).select(cols).range(from, from + 999);
    if (scoped) q = q.eq('game_slug', GAME);
    const { data, error } = await q;
    if (error) throw new Error(table + ': ' + error.message);
    out.push(...(data || []));
    if (!data || data.length < 1000) break;
    from += 1000;
  }
  return out;
}

// Miranda's published-survivor guide headlines -> the coverage corpus.
const mirRows = [];
{ let from = 0; for (;;) {
  const { data } = await sb.from('feed_items').select('headline')
    .eq('game_slug', GAME).eq('editor', 'MIRANDA').eq('is_published', true).not('noindex', 'is', true)
    .range(from, from + 999);
  if (!data || !data.length) break; mirRows.push(...data); if (data.length < 1000) break; from += 1000;
} }
const heads = mirRows.map(r => ' ' + String(r.headline || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim() + ' ');
function covered(name) {
  const n = ' ' + String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim() + ' ';
  if (n.trim().length < 3) return true;
  return heads.some(h => h.includes(n));
}

// keyword_targets that carry an entity mapping (for optional demand ranking / keyword_ref).
const { data: ktRows } = await sb.from('keyword_targets')
  .select('id, entity_type, entity_slug, facet, keyword, is_active').eq('game_slug', GAME);
const slugify = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
function keywordFor(entity) {
  const es = slugify(entity);
  return (ktRows || []).find(r => r.entity_slug && slugify(r.entity_slug) === es) || null;
}

// Build the gap list.
const gaps = [];
for (const facet of FACETS) {
  const { table, matchCol, gameScoped } = FACET_TABLE_MAP[facet];
  const rows = await pageAll(table, '*', gameScoped);
  const hasVerified = rows[0] && ('verified' in rows[0]);
  const byEnt = {};
  for (const r of rows) { const k = r[matchCol]; if (k == null) continue; (byEnt[k] = byEnt[k] || []).push(r); }
  const thr = DEFAULT_SUBSTANCE_THRESHOLDS[facet];
  for (const e of Object.keys(byEnt)) {
    if (covered(e)) continue;
    const rs = byEnt[e];
    const substance = hasVerified ? rs.filter(r => r.verified === true).length : rs.length;
    if (substance < thr) continue;
    const kt = keywordFor(e);
    gaps.push({ facet, entity: e, substance_count: substance, keyword_ref: kt ? kt.id : null, target_phrase: kt ? kt.keyword : null });
  }
}

// Rank: guide-worthiness (facet order) -> keyword demand present -> substance desc -> name.
gaps.sort((a, b) =>
  (FACET_ORDER[a.facet] - FACET_ORDER[b.facet]) ||
  ((b.keyword_ref ? 1 : 0) - (a.keyword_ref ? 1 : 0)) ||
  (b.substance_count - a.substance_count) ||
  a.entity.localeCompare(b.entity));

const tranche = gaps.slice(0, TRANCHE_SIZE).map((g, i) => ({
  game_slug: GAME, entity: g.entity, facet: g.facet,
  warrant_source: 'substance_floor', substance_count: g.substance_count,
  disposition: 'new', status: 'queued',
  priority: TRANCHE_SIZE - i,            // descending so selectQueuedCandidate picks the top-ranked first
  keyword_ref: g.keyword_ref, target_phrase: g.target_phrase,
}));

const byFacet = {}; tranche.forEach(t => { byFacet[t.facet] = (byFacet[t.facet] || 0) + 1; });
console.log('GAP UNIVERSE: ' + gaps.length + ' uncovered+substance-warranted entities across ' + FACETS.join('/'));
console.log('FIRST TRANCHE (cap ' + TRANCHE_SIZE + '): ' + JSON.stringify(byFacet));
tranche.forEach(t => console.log('  [p' + t.priority + '] ' + t.facet.padEnd(8) + ' sub=' + t.substance_count + ' kw=' + (t.keyword_ref ? 'Y' : '-') + '  ' + t.entity));

if (!APPLY) {
  console.log('\nDRY RUN -- nothing written. Re-run with --apply to: (1) DELETE the ' +
    'test seeds (warrant_source=seed_reinforce), (2) upsert the ' + tranche.length + ' tranche rows.');
  process.exit(0);
}

// --apply: replace the test seeds with the real tranche.
const del = await sb.from('content_candidate').delete()
  .eq('game_slug', GAME).eq('warrant_source', 'seed_reinforce').select('id');
if (del.error) { console.error('delete test seeds failed:', del.error.message); process.exit(1); }
console.log('\nDeleted ' + (del.data ? del.data.length : 0) + ' test seed rows (warrant_source=seed_reinforce).');

const ins = await sb.from('content_candidate')
  .upsert(tranche, { onConflict: 'game_slug,entity,facet' })
  .select('id, entity, facet, priority');
if (ins.error) { console.error('insert tranche failed:', ins.error.message); process.exit(1); }
console.log('Upserted ' + ins.data.length + ' substance_floor gap candidates (status=queued).');
console.log('Verify: SELECT status, warrant_source, facet, count(*) FROM content_candidate WHERE game_slug=\'marathon\' GROUP BY 1,2,3;');
