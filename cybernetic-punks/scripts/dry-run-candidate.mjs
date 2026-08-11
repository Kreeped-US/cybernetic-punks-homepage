// scripts/dry-run-candidate.mjs
// FAITHFUL DRY-RUN for STORE-ROW CITATION (build-order step 1). Generates a
// candidate's article through the REAL production path (candidate ->
// buildCandidateDirective -> the ACTUAL callEditor -> resolveCitedBlocks against the
// store registry), CAPTURES it, and DISCARDS. This is the before/after proof that
// verified store rows are now citable: was verified_source=null (rows were prose),
// now the editor cites a [SH#]/[WS#]/... store id and verified_source resolves NON-NULL.
//
// ================== ABSOLUTE SAFETY BOUNDARY ==================
// NEVER inserts, NEVER publishes. Imports only write-free pieces: callEditor
// (generation), getStoreRegistry (read the cached registry), resolveCitedBlocks/
// buildBlockRegistry (pure), buildCandidateDirective, runAssignmentGate. No
// processEditor, no feed_items insert, no content_candidate write. Capture-and-discard.
// =============================================================
//
// Real paid Sonnet call. Run under the resolve hook:
//   node --env-file=.env.local --import ./scripts/_node-resolve.mjs scripts/dry-run-candidate.mjs [entity] [facet] [target_phrase]
// Default candidate: Sentinel weapon.

import { writeFileSync, mkdirSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { callEditor, getStoreRegistry } from '../lib/editorCore.js';
import { getGameConfig } from '../lib/games/index.js';
import { buildBlockRegistry, resolveCitedBlocks, validateRecommendations } from '../lib/gather/blockId.js';
import { buildCandidateDirective } from '../lib/content/candidateAssignment.js';
import { runAssignmentGate } from '../lib/content/assignmentGate.js';

// FORCE the store-row-citation master flag ON for the dry-run, so the capability
// stays proven even though it is staged OFF in production. The flag is read at CALL
// time (inside fetchGameContext, when callEditor runs below), so setting it here --
// after the hoisted imports, before callEditor -- takes effect.
process.env.STORE_ROW_CITATION_ENABLED = 'true';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;
if (!url || !key) { console.error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_KEY (run with --env-file=.env.local)'); process.exit(1); }
if (!process.env.ANTHROPIC_API_KEY) { console.error('Missing ANTHROPIC_API_KEY (real generation needs it)'); process.exit(1); }
const supabase = createClient(url, key);
const config = getGameConfig('marathon');

const entity = process.argv[2] || 'Sentinel';
const facet = process.argv[3] || 'weapon';
const target_phrase = process.argv[4] || null;
const candidate = { game_slug: 'marathon', entity, facet, target_phrase };

console.log('==================================================================');
console.log(' STORE-ROW CITATION DRY-RUN  --  real callEditor, NO insert/publish');
console.log('==================================================================');
console.log('candidate: ' + JSON.stringify(candidate));

// 1. GATE decision.
const gate = await runAssignmentGate({ game_slug: 'marathon', entity, facet }, supabase, config);
console.log('\n-- GATE --');
console.log('decision  : ' + gate.decision);
console.log('substance : ' + gate.substance.verifiedCount + '/' + gate.substance.threshold + ' (' + (gate.substance.passes ? 'ok' : 'under') + ')' + (gate.substance.reason ? ' [' + gate.substance.reason + ']' : ''));

// 2. Build the candidate-directive + generate via the REAL callEditor. callEditor
//    calls fetchGameContext internally, which now tags verified rows + caches the
//    store registry (read below via getStoreRegistry).
const directive = buildCandidateDirective(candidate);
console.log('\n-- GENERATING (real callEditor NEXUS -- real paid Sonnet call) --');
const article = await callEditor('NEXUS', directive, supabase, config);
if (!article || article._error || !article.headline) {
  console.log('generation returned no usable article: ' + JSON.stringify(article).slice(0, 500));
  process.exit(1);
}

// 3. Resolve cited_blocks EXACTLY as processEditor does, now WITH the store registry
//    merged in (the write-site plumbing). No gathered [YT]/[BN] sources in the prompt,
//    so buildBlockRegistry is empty; the store registry supplies the resolvable ids.
const vsRegistry = buildBlockRegistry({ youtubeVideos: [], bungieNews: [] });
const storeReg = getStoreRegistry(config);
storeReg.forEach((v, k) => vsRegistry.set(k, v));
const vs = resolveCitedBlocks(article.cited_blocks || [], vsRegistry);

// 3b. STEP 3: validate the editor's declared recommendations' premises resolve in the
//     same merged registry (== verified by construction; provenance-null passes). Findings
//     shaped like the gate's; on Marathon this is log-only (never holds).
const recFindings = validateRecommendations(article.recommendations, vsRegistry);

// 4. CAPTURE + print. DISCARD.
mkdirSync(new URL('./out/', import.meta.url), { recursive: true });
const safe = (entity + '-' + facet).toLowerCase().replace(/[^a-z0-9]+/g, '-');
const outUrl = new URL('./out/dry-run-' + safe + '.json', import.meta.url);
writeFileSync(outUrl, JSON.stringify({
  captured_at_note: 'STORE-ROW CITATION dry-run. Real callEditor. NOT inserted, NOT published.',
  candidate,
  gate: { decision: gate.decision, substance: gate.substance },
  article,
  store_registry_size: storeReg.size,
  resolved: { verified_source: vs.verified_source, verified_source_url: vs.verified_source_url, resolved: vs.resolved, rejected: vs.rejected },
  recommendations: article.recommendations || null,
  recommendation_findings: recFindings,
}, null, 2));

console.log('\n================= GENERATED ARTICLE (dry-run, NOT published) =================');
console.log('HEADLINE: ' + article.headline);
console.log('\nBODY:\n' + article.body);
console.log('\nstore_registry_size : ' + storeReg.size + ' verified store rows were citable this run');
console.log('cited_blocks        : ' + JSON.stringify(article.cited_blocks));
console.log('resolved cites      : ' + JSON.stringify(vs.resolved.map((r) => r.id + '->' + (r.source ? String(r.source).slice(0, 48) : 'null'))));
if (vs.rejected.length) console.log('rejected ids        : ' + JSON.stringify(vs.rejected));
console.log('verified_source     : ' + JSON.stringify(vs.verified_source) + (vs.verified_source ? '  <-- NON-NULL (was null before store-row citation)' : '  (null)'));
console.log('\n-- STEP 3: RECOMMENDATIONS (declared reasoning chain) --');
const recs = article.recommendations || [];
console.log('recommendations count: ' + recs.length);
recs.forEach((r, i) => console.log('  [' + (i + 1) + '] premises=' + JSON.stringify(r.supporting_block_ids) + '  "' + (r.claim_text || '').slice(0, 90) + '"'));
console.log('recommendation_findings (UNSUPPORTED-RECOMMENDATION): ' + JSON.stringify(recFindings) +
  (recFindings.length === 0 ? '  <-- ALL premises resolve (verified=true; provenance-null passes)' : '  <-- log-only on Marathon (never holds)'));
console.log('\ncaptured to: scripts/out/dry-run-' + safe + '.json');
console.log('\n[DRY-RUN COMPLETE] No feed_items.insert; no processEditor write; no feed_item; live feed + NEXUS untouched.');
