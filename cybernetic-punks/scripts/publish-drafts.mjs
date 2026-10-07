// scripts/publish-drafts.mjs
// SAFE TRACK-2 BULK PUBLISH for feed_items drafts. Flips reviewed drafts (is_published=false)
// to published AND clears the de-index flags in ONE write -- is_published=true, noindex=false,
// noindexed_at=null -- exactly matching app/api/admin/drafts/approve/route.js.
//
// WHY THIS EXISTS: persisted pre-launch drafts (wardogs / pubg-dednet) carry noindex=true as
// defense-in-depth WHILE UNPUBLISHED. There is no code publish path for those games (the
// persisters are drafts-only; gate-release only touches gate_status='held'; approve was not used),
// so they were published by a MANUAL bulk `UPDATE ... is_published=true` that forgot to clear
// noindex -> the rows shipped stale-noindexed. This tool is the safe replacement for that raw SQL:
// it can never publish without clearing noindex, so the staleness cannot recur.
//
// ELIGIBILITY (2026-10-07, lib/content/publishEligibility.js): this tool does NOT approve. It skips,
// with a printed reason, any row that is rejected, any row with gate_status='held', and any row that
// requires approval (editor in HELD_EDITORS, or the game sets editorial.holdForReview) but has no
// operator_approved_at. Those go through /admin/review (POST /api/admin/drafts/approve), which stamps
// the approval receipt. This tool NEVER writes operator_approved_at. The rule is environment-
// independent: STORE_ROW_CITATION_ENABLED is not consulted.
//
// SAFETY:
//   - DRY-RUN BY DEFAULT: prints the plan and writes NOTHING unless you pass --commit AND --yes.
//   - --commit alone prints the exact would-publish and skipped lists and still writes NOTHING.
//   - DRAFTS ONLY: every write is filtered on id + is_published=false + not rejected + gate_status
//     not 'held' (+ operator_approved_at present when the row requires approval), so a race cannot
//     publish an ineligible row; RETURNING confirms each write, and an eligible row that comes back
//     empty makes the run exit non-zero.
//   - PER-GAME: --game is required; the tool never publishes across all games at once.
//   - SERVICE KEY REQUIRED (drafts are not anon-readable): fails loudly without it.
//
// USAGE:
//   node scripts/publish-drafts.mjs --game wardogs                        (DRY: plan for ALL wardogs drafts)
//   node scripts/publish-drafts.mjs --game wardogs --slugs a,b,c          (DRY: plan for just those slugs)
//   node scripts/publish-drafts.mjs --game wardogs --commit               (prints the lists; writes NOTHING)
//   node scripts/publish-drafts.mjs --game wardogs --commit --yes         (PUBLISH the eligible drafts)
//   node scripts/publish-drafts.mjs --game wardogs --slugs a,b --commit --yes   (PUBLISH just a,b if eligible)

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
// Correction guard (piece 2): before publishing a draft, warn if its body co-occurs a
// recorded correction's entity+keywords (shared matcher -- same logic as the read-only sweep).
// A match HOLDS the draft (skipped) unless --force is passed; a no-match draft publishes unchanged.
import { matchCorrectionsForBody } from '../lib/corrections/match.js';
// Body integrity (2026-10-05): a placeholder / stub / garbled body is NEVER published -- a HARD
// block that --force does not override (edit the draft instead). See lib/content/bodyIntegrity.js.
import { checkBodyIntegrity, summarizeProblems } from '../lib/content/bodyIntegrity.js';
import { publishEligibility, requiresApproval } from '../lib/content/publishEligibility.js';
import { getGameConfig } from '../lib/games/index.js';

// Load .env.local into process.env (only fills what is not already set) -- mirrors the persist scripts.
function ensureEnv() {
  if (process.env.SUPABASE_SERVICE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL) return;
  let raw;
  try { raw = readFileSync(new URL('../.env.local', import.meta.url), 'utf8'); } catch (e) { return; }
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    const key = m[1];
    const val = m[2].replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = val;
  }
}

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : null;
}

export const KNOWN_GAMES = ['marathon', 'dmz', 'wardogs', 'pubg-dednet'];

// Read the DRAFTS for a game (is_published=false, optional slug filter), with every column the
// eligibility rule and the guards need. Unchanged scope: the eligibility rule is applied in planPublish.
export async function readDrafts(supabase, game, slugs) {
  let q = supabase.from('feed_items')
    .select('id, slug, headline, body, editor, game_slug, rejected, gate_status, operator_approved_at, noindex, noindexed_at, created_at')
    .eq('game_slug', game).eq('is_published', false)
    .order('created_at', { ascending: true });
  if (slugs) q = q.in('slug', slugs);
  return await q;
}

// Classify every draft. ineligible -> skipped (with reasons); eligible -> the existing guards decide:
// body integrity (hard block) then the correction guard (HELD unless --force). Pure (no I/O).
export function planPublish(drafts, game, gameConfig, opts) {
  const force = !!(opts && opts.force);
  const out = { publish: [], skipped: [], blocked: [], held: [] };
  for (const d of drafts) {
    const elig = publishEligibility(d, gameConfig);
    const matches = matchCorrectionsForBody(d.body, game);
    const integrity = checkBodyIntegrity({ headline: d.headline, body: d.body });
    const entry = { d, elig, matches, integrity, needsApproval: requiresApproval(d, gameConfig) };
    if (!elig.eligible) { out.skipped.push(entry); continue; }
    if (!integrity.ok) { out.blocked.push(entry); continue; }
    if (matches.length && !force) { out.held.push(entry); continue; }
    out.publish.push(entry);
  }
  return out;
}

// Print the plan: the exact would-publish list and every skipped/blocked/held row with its reason.
export function printPlan(plan, log) {
  log('Would publish ' + plan.publish.length + ' draft(s) -> is_published=true, noindex=false, noindexed_at=null:');
  for (const e of plan.publish) {
    log('  PUBLISH  id=' + e.d.id + '  slug=' + e.d.slug + '  game=' + e.d.game_slug + '  editor=' + e.d.editor
      + '   noindex=' + e.d.noindex + (e.d.noindexed_at ? '  noindexed_at=' + e.d.noindexed_at : ''));
    for (const hit of e.matches) {
      log('       ! correction "' + hit.entry.id + '": ' + hit.entry.correction + '  (--force acknowledged)');
    }
  }
  log('');
  log('Skipped (not eligible) ' + plan.skipped.length + ':');
  for (const e of plan.skipped) {
    log('  SKIP     id=' + e.d.id + '  slug=' + e.d.slug + '  game=' + e.d.game_slug + '  editor=' + e.d.editor + '  -- ' + e.elig.reasons.join('; '));
  }
  if (plan.blocked.length) {
    log('');
    log(plan.blocked.length + ' draft(s) BLOCKED by body integrity. These are never published (--force does not override). Fix the body first.');
    for (const e of plan.blocked) log('  BLOCKED  id=' + e.d.id + '  slug=' + e.d.slug + ' -- body integrity: ' + summarizeProblems(e.integrity.problems));
  }
  if (plan.held.length) {
    log('');
    log(plan.held.length + ' draft(s) flagged by the correction guard. These are HELD (not published) unless you pass --force to acknowledge.');
    log('Review each: is the entity being ASSERTED into the corrected-away topic, or merely mentioned? Only --force once you have checked.');
    for (const e of plan.held) {
      log('  HELD     id=' + e.d.id + '  slug=' + e.d.slug + ' -- correction guard (' + e.matches.map((x) => x.entry.id).join(', ') + ')');
      for (const hit of e.matches) {
        const snip = hit.sentenceHits[0] || ('(document-level co-occurrence -- keywords: ' + hit.keywordsFound.join(', ') + ')');
        log('         > ' + String(snip).slice(0, 180));
      }
    }
  }
  log('');
}

// Publish the plan's eligible rows. Each write re-asserts eligibility in its WHERE (race-safe) and
// RETURNs the row; NEVER writes operator_approved_at. Returns { ok, failed }.
export async function runPublish(supabase, plan, log) {
  let ok = 0;
  const failed = [];
  for (const e of plan.publish) {
    const d = e.d;
    let u = supabase.from('feed_items')
      .update({ is_published: true, noindex: false, noindexed_at: null })
      .eq('id', d.id).eq('is_published', false)
      .not('rejected', 'is', true)
      .or('gate_status.is.null,gate_status.neq.held');
    if (e.needsApproval) u = u.not('operator_approved_at', 'is', null);
    const { data, error } = await u.select('id, slug, is_published, noindex').maybeSingle();
    if (error) { log('  FAIL ' + d.slug + ': ' + error.message); failed.push(d.slug); continue; }
    if (!data) {
      log('  FAIL ' + d.slug + ' -- the write matched no row (published, rejected, held or unapproved since the read). Not published.');
      failed.push(d.slug);
      continue;
    }
    log('  PUBLISHED ' + data.slug + '  is_published=' + data.is_published + '  noindex=' + data.noindex);
    ok++;
  }
  return { ok, failed };
}

async function main() {
  ensureEnv();
  const commit = process.argv.indexOf('--commit') !== -1;
  const yes = process.argv.indexOf('--yes') !== -1;
  const force = process.argv.indexOf('--force') !== -1; // acknowledge correction warnings and publish anyway
  const game = argValue('--game');
  const slugsArg = argValue('--slugs');
  const slugs = slugsArg ? slugsArg.split(',').map((s) => s.trim()).filter(Boolean) : null;

  if (!game) {
    console.error('ERROR: --game <slug> is required (e.g. --game wardogs). Nothing done.');
    process.exit(1);
  }
  if (!KNOWN_GAMES.includes(game)) {
    console.error('ERROR: --game "' + game + '" is not a known game (' + KNOWN_GAMES.join(', ') + '). Nothing done.');
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    console.error('ERROR: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY must be set (env or .env.local).');
    console.error('       (Drafts are not anon-readable, so even the dry-run plan needs the service key.)');
    process.exit(1);
  }
  const supabase = createClient(url, key);

  const { data: drafts, error: readErr } = await readDrafts(supabase, game, slugs);
  if (readErr) {
    console.error('ERROR reading drafts: ' + readErr.message);
    process.exit(1);
  }

  console.log('publish-drafts' + (commit && yes ? ' (COMMIT)' : commit ? ' (COMMIT requested, --yes missing -- no write)' : ' (DRY -- no write)')
    + '. game=' + game + (slugs ? '  slugs=' + slugs.join(',') : '  slugs=ALL drafts') + '\n');

  if (!drafts || drafts.length === 0) {
    console.log('No matching DRAFTS (is_published=false) found. Nothing to publish.');
    if (slugs) console.log('(Check the slugs -- already-published rows are intentionally excluded.)');
    return;
  }

  const plan = planPublish(drafts, game, getGameConfig(game), { force });
  printPlan(plan, console.log);

  if (!commit) {
    console.log('DRY -- nothing written. Re-run with --commit --yes to publish the eligible drafts (clears noindex on the way).');
    return;
  }
  if (!yes) {
    console.log('NOTHING WRITTEN: --commit needs --yes to write. Check the lists above, then re-run with --commit --yes.');
    return;
  }

  const res = await runPublish(supabase, plan, console.log);
  console.log('\nDone. published=' + res.ok + '  skipped=' + plan.skipped.length + '  held=' + plan.held.length
    + '  blocked=' + plan.blocked.length + '  failed=' + res.failed.length + '. Every published row has noindex=false + noindexed_at=null.');
  if (plan.held.length) console.log('  ' + plan.held.length + ' draft(s) HELD by the correction guard -- re-run with --force once reviewed.');
  if (res.failed.length) {
    console.error('ERROR: ' + res.failed.length + ' eligible draft(s) were not published: ' + res.failed.join(', '));
    process.exit(1);
  }
}

// Run only when executed directly; importing the module (the tests) never runs main or touches a DB.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
