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
// SAFETY:
//   - DRY-RUN BY DEFAULT: prints the plan and writes NOTHING unless you pass --commit.
//   - DRAFTS ONLY: the WHERE is filtered is_published=false, so a live row is never re-touched
//     (mirrors the approve route's guard) -- re-running is idempotent (0 rows the second time).
//   - PER-GAME: --game is required; the tool never publishes across all games at once.
//   - SERVICE KEY REQUIRED (drafts are not anon-readable): fails loudly without it.
//
// USAGE:
//   node scripts/publish-drafts.mjs --game wardogs                 (DRY: plan for ALL wardogs drafts)
//   node scripts/publish-drafts.mjs --game wardogs --slugs a,b,c   (DRY: plan for just those slugs)
//   node scripts/publish-drafts.mjs --game wardogs --commit        (PUBLISH all wardogs drafts)
//   node scripts/publish-drafts.mjs --game wardogs --slugs a,b --commit   (PUBLISH just a,b)

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
// Correction guard (piece 2): before publishing a draft, warn if its body co-occurs a
// recorded correction's entity+keywords (shared matcher -- same logic as the read-only sweep).
// A match HOLDS the draft (skipped) unless --force is passed; a no-match draft publishes unchanged.
import { matchCorrectionsForBody } from '../lib/corrections/match.js';

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

const KNOWN_GAMES = ['marathon', 'dmz', 'wardogs', 'pubg-dednet'];

async function main() {
  ensureEnv();
  const commit = process.argv.indexOf('--commit') !== -1;
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

  // Read the DRAFTS this run would publish (is_published=false, this game, optional slug filter).
  let q = supabase.from('feed_items')
    .select('id, slug, headline, body, noindex, noindexed_at, created_at')
    .eq('game_slug', game).eq('is_published', false)
    .order('created_at', { ascending: true });
  if (slugs) q = q.in('slug', slugs);
  const { data: drafts, error: readErr } = await q;
  if (readErr) {
    console.error('ERROR reading drafts: ' + readErr.message);
    process.exit(1);
  }

  console.log('publish-drafts' + (commit ? ' (COMMIT)' : ' (DRY -- no write)') + '. game=' + game
    + (slugs ? '  slugs=' + slugs.join(',') : '  slugs=ALL drafts') + '\n');

  if (!drafts || drafts.length === 0) {
    console.log('No matching DRAFTS (is_published=false) found. Nothing to publish.');
    if (slugs) console.log('(Check the slugs -- already-published rows are intentionally excluded.)');
    return;
  }

  // CORRECTION GUARD (piece 2): flag any draft whose body co-occurs a recorded correction's
  // entity+keywords. High-recall/low-precision -> this WARNS, it does not hard-block; a flagged
  // draft is HELD (skipped) unless --force. A draft matching no correction is untouched by the guard.
  const matchesById = {};
  for (const d of drafts) matchesById[d.id] = matchCorrectionsForBody(d.body, game);
  const flaggedCount = drafts.filter((d) => matchesById[d.id].length).length;

  console.log('Would publish ' + drafts.length + ' draft(s) -> is_published=true, noindex=false, noindexed_at=null:');
  for (const d of drafts) {
    const m = matchesById[d.id];
    console.log('  ' + (m.length ? 'WARN ' : '') + d.slug + '   noindex=' + d.noindex + (d.noindexed_at ? '  noindexed_at=' + d.noindexed_at : '') + '   ' + (d.headline || '').slice(0, 60));
    for (const hit of m) {
      console.log('       ! correction "' + hit.entry.id + '": ' + hit.entry.correction);
      const snip = hit.sentenceHits[0] || ('(document-level co-occurrence -- keywords: ' + hit.keywordsFound.join(', ') + ')');
      console.log('         > ' + String(snip).slice(0, 180));
    }
  }
  console.log('');
  if (flaggedCount) {
    console.log(flaggedCount + ' draft(s) flagged by the correction guard. These are HELD (not published) unless you pass --force to acknowledge.');
    console.log('Review each: is the entity being ASSERTED into the corrected-away topic, or merely mentioned? Only --force once you have checked.\n');
  }

  if (!commit) {
    console.log('DRY -- nothing written. Re-run with --commit to publish (clears noindex on the way).');
    return;
  }

  // ATOMIC-per-row publish: WHERE is_published=false guards against ever re-touching a live row.
  let ok = 0, fail = 0, held = 0;
  for (const d of drafts) {
    // CORRECTION GUARD: a flagged draft is HELD unless --force acknowledges it. This is the ONLY
    // added gate -- an unflagged draft (matchesById[d.id] empty) falls straight through to the
    // exact same update as before, so the common case is byte-identical to pre-guard behavior.
    const m = matchesById[d.id];
    if (m.length && !force) {
      console.log('  HELD ' + d.slug + ' -- correction guard (' + m.map((x) => x.entry.id).join(', ') + '). Not published. Review, then re-run with --force to publish anyway.');
      held++;
      continue;
    }
    if (m.length && force) {
      console.log('  (--force) correction warning acknowledged for ' + d.slug + ': ' + m.map((x) => x.entry.id).join(', '));
    }
    const { data, error } = await supabase.from('feed_items')
      .update({ is_published: true, noindex: false, noindexed_at: null })
      .eq('id', d.id).eq('is_published', false)
      .select('id, slug, is_published, noindex').maybeSingle();
    if (error) { console.error('  FAIL ' + d.slug + ': ' + error.message); fail++; continue; }
    if (!data) { console.log('  SKIP ' + d.slug + ' (already published -- not re-touched)'); continue; }
    console.log('  PUBLISHED ' + data.slug + '  is_published=' + data.is_published + '  noindex=' + data.noindex);
    ok++;
  }
  console.log('\nDone. published=' + ok + '  held=' + held + '  failed=' + fail + '. Every published row has noindex=false + noindexed_at=null.');
  if (held) console.log('  ' + held + ' draft(s) HELD by the correction guard -- re-run with --force once reviewed.');
}

main().catch((e) => { console.error(e); process.exit(1); });
