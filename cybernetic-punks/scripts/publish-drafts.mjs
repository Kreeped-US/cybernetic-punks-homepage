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
    .select('id, slug, headline, noindex, noindexed_at, created_at')
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

  console.log('Would publish ' + drafts.length + ' draft(s) -> is_published=true, noindex=false, noindexed_at=null:');
  for (const d of drafts) {
    console.log('  ' + d.slug + '   noindex=' + d.noindex + (d.noindexed_at ? '  noindexed_at=' + d.noindexed_at : '') + '   ' + (d.headline || '').slice(0, 60));
  }
  console.log('');

  if (!commit) {
    console.log('DRY -- nothing written. Re-run with --commit to publish (clears noindex on the way).');
    return;
  }

  // ATOMIC-per-row publish: WHERE is_published=false guards against ever re-touching a live row.
  let ok = 0, fail = 0;
  for (const d of drafts) {
    const { data, error } = await supabase.from('feed_items')
      .update({ is_published: true, noindex: false, noindexed_at: null })
      .eq('id', d.id).eq('is_published', false)
      .select('id, slug, is_published, noindex').maybeSingle();
    if (error) { console.error('  FAIL ' + d.slug + ': ' + error.message); fail++; continue; }
    if (!data) { console.log('  SKIP ' + d.slug + ' (already published -- not re-touched)'); continue; }
    console.log('  PUBLISHED ' + data.slug + '  is_published=' + data.is_published + '  noindex=' + data.noindex);
    ok++;
  }
  console.log('\nDone. published=' + ok + '  failed=' + fail + '. Every published row has noindex=false + noindexed_at=null.');
}

main().catch((e) => { console.error(e); process.exit(1); });
