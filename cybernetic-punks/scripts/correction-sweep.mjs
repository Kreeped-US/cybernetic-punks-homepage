// scripts/correction-sweep.mjs
// ============================================================
// CORRECTION SWEEP -- READ ONLY. REPORTS, NEVER WRITES (DB).
// ============================================================
// Given a ratified correction (lib/corrections/registry.js), flags PUBLISHED
// content that may still assert the now-false claim, so violators surface in ONE
// pass instead of manual hunting.
//
// WHY THIS EXISTS (2026-09-08). A correction fixed the DATA (shell_stats Rook
// verified_source: "Rook cannot be selected in ranked") but nothing swept the
// already-published CONTENT that had duplicated the old claim into prose. One
// un-swept correction left 14 false Rook-in-ranked articles live for months, and
// remediating them took 7 manual query passes. Had this sweep existed on
// 2026-07-20, `--id rook-not-ranked` would have surfaced all 14 in one run.
//
// THIS IS A HIGH-RECALL, LOW-PRECISION HUMAN-REVIEW QUEUE, NOT A REMOVAL LIST.
// Co-occurrence of entity + a topic keyword flags CANDIDATES. Legitimate mentions
// and disclaimers (e.g. "Rook is not a ranked pick", "A-tier for LEARNING
// fundamentals") WILL appear and are CORRECT to appear -- they are why the sweep
// cannot auto-remove. The operator adjudicates each candidate at the SENTENCE
// level: is the entity being ASSERTED into the corrected-away topic, or merely
// MENTIONED near it? NEVER auto-remove from a sweep hit.
//
// SCOPE. Default surface is feed_items.body (published articles), scoped to the
// registry entry's game_slug (never hardcoded -- any game works). A registry entry
// may name extra_columns ([{table, column}]) to also scan free-text prose columns
// (e.g. meta_tiers.note) where a stale claim could live. DB-driven surfaces (tier
// lists, the Build Advisor) render FROM the tables the correction fixes, so they
// self-correct and are out of scope by design.
//
// EXIT CODE: non-zero when any candidate is found, so it can become a CI gate
// later. DELIBERATELY NOT WIRED INTO CI in the commit that adds it (mirrors
// scripts/provenance-check.mjs). A sweep hit needs human adjudication, so gating
// on raw candidate count would be red on legitimate mentions -- flagged for
// whoever wires it.
//
// RUN:  node scripts/correction-sweep.mjs                     (sweep ALL registry entries)
//       node scripts/correction-sweep.mjs --id rook-not-ranked (sweep one)
//       node scripts/correction-sweep.mjs --id rook-not-ranked --json  (+ write scripts/out/correction-sweep-<id>.json)
// Needs NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_KEY (auto-loaded from
// .env.local if not already in env). Read-only: only .select() is ever called on the DB.

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { CORRECTIONS } from '../lib/corrections/registry.js';

function loadEnvLocal() {
  let raw;
  try { raw = readFileSync(new URL('../.env.local', import.meta.url), 'utf8'); } catch (e) { return; }
  for (const line of raw.split(/\r?\n/)) {
    if (!line.includes('=') || line.startsWith('#')) continue;
    const i = line.indexOf('=');
    const k = line.slice(0, i).trim();
    if (!process.env[k]) process.env[k] = line.slice(i + 1).trim();
  }
}
loadEnvLocal();

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_KEY;
if (!URL_ || !KEY) {
  console.error('ABORT: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY required.');
  process.exit(2);
}
const supabase = createClient(URL_, KEY);

const only = process.argv.includes('--id')
  ? process.argv[process.argv.indexOf('--id') + 1]
  : null;
const wantJson = process.argv.includes('--json');

// Split prose into sentences for snippet extraction. Mirrors the sweep queries done
// by hand during the Rook remediation (CRLF-normalized, blank-line- and .!?-split).
function sentences(body) {
  return String(body || '')
    .replace(/\r/g, '')
    .split(/\n+|(?<=[.!?])\s+/)
    .map((s) => s.replace(/\*\*/g, '').trim())
    .filter(Boolean);
}

// WHOLE-WORD match, case-insensitive. Deliberately NOT a bare substring: `body
// ILIKE '%elo%'` matches "below"/"develop", which floods the queue with
// meaningless hits and buries the real candidates. Word-boundary keeps recall of
// the actual term ("elo", "tier", "solo queue") while dropping substring accidents.
// The server-side .ilike() on the entity stays a coarse prefilter; THIS is the
// precise decision.
function wordRe(term) {
  return new RegExp('\\b' + String(term).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
}

// A candidate: the text contains the entity AND at least one topic keyword (both
// as whole words). Returns { keywordsFound, sentenceHits } -- sentenceHits are
// sentences where the entity and a keyword co-occur (the strongest review signal);
// a candidate with keywordsFound but no sentenceHits is a document-level
// co-occurrence (entity and keyword in different sentences) -- still surfaced,
// still human-adjudicated.
function analyze(text, entity, keywords) {
  const body = String(text || '');
  if (!wordRe(entity).test(body)) return null;
  const keywordsFound = keywords.filter((k) => wordRe(k).test(body));
  if (keywordsFound.length === 0) return null;
  const entityRe = wordRe(entity);
  const sentenceHits = sentences(body).filter(
    (s) => entityRe.test(s) && keywords.some((k) => wordRe(k).test(s))
  );
  return { keywordsFound, sentenceHits };
}

let totalCandidates = 0;
const summary = [];
const entries = only ? CORRECTIONS.filter((c) => c.id === only) : CORRECTIONS;

console.log('='.repeat(72));
console.log('CORRECTION SWEEP -- read-only. Flags candidates for HUMAN REVIEW.');
console.log('This is a review queue, NOT a removal list. Adjudicate assert-vs-mention.');
console.log('='.repeat(72));

if (only && entries.length === 0) {
  console.error(`\nABORT: no registry entry with id "${only}". Known ids: ${CORRECTIONS.map((c) => c.id).join(', ') || '(none)'}`);
  process.exit(2);
}

for (const entry of entries) {
  console.log(`\n${'-'.repeat(72)}`);
  console.log(`### ${entry.id}  [game_slug=${entry.game_slug}]`);
  console.log(`    correction: ${entry.correction}`);
  console.log(`    entity: "${entry.entity}"  |  keywords: ${entry.topic_keywords.join(', ')}`);
  console.log(`    source: ${entry.source}  (recorded ${entry.date})`);

  const artifact = { id: entry.id, game_slug: entry.game_slug, entity: entry.entity, topic_keywords: entry.topic_keywords, feed_items: [], extra_columns: [] };

  // ── feed_items.body (published, game-scoped) ─────────────────────────────
  const { data, error } = await supabase
    .from('feed_items')
    .select('id, slug, headline, body')
    .eq('game_slug', entry.game_slug)
    .eq('is_published', true)
    .ilike('body', `%${entry.entity}%`);

  if (error) {
    console.log(`\n  feed_items: READ ERROR -- ${error.message}`);
  } else {
    const rows = data || [];
    const hits = [];
    for (const r of rows) {
      const a = analyze(r.body, entry.entity, entry.topic_keywords);
      if (a) hits.push({ id: r.id, slug: r.slug, headline: r.headline, ...a });
    }
    console.log(`\n  feed_items.body -- ${rows.length} published row(s) mention "${entry.entity}"; ${hits.length} co-occur a keyword (CANDIDATES):`);
    for (const h of hits) {
      totalCandidates += 1;
      console.log(`\n    * ${h.slug}`);
      console.log(`      id: ${h.id}  |  keywords present: ${h.keywordsFound.join(', ')}`);
      if (h.sentenceHits.length) {
        h.sentenceHits.slice(0, 3).forEach((s) => console.log(`      > ${s.slice(0, 200)}`));
        if (h.sentenceHits.length > 3) console.log(`      ... +${h.sentenceHits.length - 3} more sentence(s)`);
      } else {
        console.log('      > (document-level co-occurrence only -- entity and keyword in separate sentences; review the body)');
      }
      artifact.feed_items.push({ id: h.id, slug: h.slug, keywordsFound: h.keywordsFound, sentenceHits: h.sentenceHits });
    }
    if (!hits.length) console.log('      (no candidates)');
  }

  // ── extra_columns (opt-in free-text prose surfaces) ──────────────────────
  for (const ec of (entry.extra_columns || [])) {
    const { data: xd, error: xe } = await supabase
      .from(ec.table)
      .select('*')
      .ilike(ec.column, `%${entry.entity}%`);
    if (xe) { console.log(`\n  ${ec.table}.${ec.column}: READ ERROR -- ${xe.message}`); continue; }
    const xrows = xd || [];
    const xhits = [];
    for (const r of xrows) {
      const a = analyze(r[ec.column], entry.entity, entry.topic_keywords);
      if (a) xhits.push({ ident: r.name ?? r.id ?? '(row)', ...a });
    }
    console.log(`\n  ${ec.table}.${ec.column} -- ${xrows.length} row(s) mention "${entry.entity}"; ${xhits.length} co-occur a keyword (CANDIDATES):`);
    for (const h of xhits) {
      totalCandidates += 1;
      console.log(`    * ${ec.table}.${ec.column} [${h.ident}]  keywords: ${h.keywordsFound.join(', ')}`);
      h.sentenceHits.slice(0, 2).forEach((s) => console.log(`      > ${s.slice(0, 200)}`));
      artifact.extra_columns.push({ table: ec.table, column: ec.column, ident: h.ident, keywordsFound: h.keywordsFound, sentenceHits: h.sentenceHits });
    }
    if (!xhits.length) console.log('      (no candidates)');
  }

  summary.push({ id: entry.id, candidates: artifact.feed_items.length + artifact.extra_columns.length });

  if (wantJson) {
    try {
      mkdirSync(new URL('./out/', import.meta.url), { recursive: true });
      const outPath = new URL(`./out/correction-sweep-${entry.id}.json`, import.meta.url);
      writeFileSync(outPath, JSON.stringify(artifact, null, 2));
      console.log(`\n  [--json] wrote scripts/out/correction-sweep-${entry.id}.json`);
    } catch (e) {
      console.log(`\n  [--json] could not write artifact: ${e.message}`);
    }
  }
}

console.log(`\n${'='.repeat(72)}\nSUMMARY`);
summary.forEach((s) => console.log(`  ${s.id.padEnd(28)} ${String(s.candidates).padStart(4)} candidate(s)`));
console.log(`\n  TOTAL CANDIDATES FOR REVIEW: ${totalCandidates}`);
console.log(totalCandidates ? '  RESULT: candidates found (exit 1) -- REVIEW each; do not auto-remove.' : '  RESULT: clean (exit 0)');
console.log('='.repeat(72));

// Exit non-zero when candidates exist (CI-gate-ready), like scripts/provenance-check.mjs.
// NOTE (Windows dev only): calling process.exit() while the supabase client's async handles are
// still closing can occasionally trip a libuv teardown assertion ("UV_HANDLE_CLOSING", src\win\async.c)
// and surface as shell code 127 instead of 1. It is a cosmetic teardown race -- the report above is
// complete and the intended code is set; it does not occur on Linux/CI. Kept as process.exit() to
// match the house convention and guarantee the code.
process.exit(totalCandidates ? 1 : 0);
