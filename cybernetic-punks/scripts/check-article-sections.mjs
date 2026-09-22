// scripts/check-article-sections.mjs
// ============================================================
// ARTICLE-SECTION GUARD -- READ ONLY. REPORTS, NEVER WRITES.
// ============================================================
// The section-mapped network games (wardogs, dmz, pubg-dednet) build every article URL
// as /<game>/<section>/<slug>, where <section> comes from a hand-maintained per-slug map in
// each game's config. feed_items has no section column and the resolver has NO default: a
// PUBLISHED article whose slug was never added to that map resolves to null and 404s at every
// path -- silently, because it still publishes, counts as is_published, and can even enter the
// sitemap-eligible set. This has bitten wardogs three times (patch-011, week-one, smg-tier).
//
// This guard queries every published article for those games and resolves it through the SAME
// shared helper the sitemap uses (lib/games/articleSection.js), so the two cannot drift. It
// prints per-game published/mapped/unmapped counts + the unmapped slugs, and EXITS 1 if any
// article is unmapped (0 when clean) -- so it can gate a post-INSERT check by hand.
//
// WHY NOT BUILD-TIME ONLY: a DB INSERT does not trigger a Vercel build, so a build-time check
// never runs when a new article goes live. This is a manual gate: run it after any wardogs /
// dmz / pubg article INSERT; a nonzero exit means "add the section mapping before calling it
// live." (Deliberately NOT wired into the Vercel build.)
//
// Needs NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_KEY (auto-loaded from .env.local).
// RUN:  node scripts/check-article-sections.mjs

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { sectionForArticle, SECTION_MAPPED_GAMES } from '../lib/games/articleSection.js';

// -- env (same loader as scripts/provenance-check.mjs) --
try {
  for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
    const i = line.indexOf('=');
    if (i < 0) continue;
    const k = line.slice(0, i).trim();
    if (!process.env[k]) process.env[k] = line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  }
} catch { /* .env.local optional if the vars are already in the environment */ }

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_KEY;
if (!URL_ || !KEY) {
  console.error('ABORT: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY required.');
  process.exit(2);
}
const supabase = createClient(URL_, KEY);

// PostgREST caps a page at 1000; paginate so a growing corpus never silently truncates.
async function selectPublished(game) {
  const out = [];
  let from = 0;
  const page = 1000;
  for (;;) {
    const { data, error } = await supabase
      .from('feed_items')
      .select('slug, tags')
      .eq('game_slug', game)
      .eq('is_published', true)
      .range(from, from + page - 1);
    if (error) throw new Error(game + ': ' + error.message);
    out.push(...data);
    if (data.length < page) break;
    from += page;
  }
  return out;
}

(async () => {
  let totalUnmapped = 0;
  console.log('ARTICLE-SECTION GUARD -- published articles vs their section map (READ ONLY)\n');
  for (const game of SECTION_MAPPED_GAMES) {
    const rows = await selectPublished(game);
    const unmapped = rows.filter((r) => !sectionForArticle(game, r));
    totalUnmapped += unmapped.length;
    console.log(
      game.padEnd(12) + ' published ' + String(rows.length).padStart(3) +
      ' | mapped ' + String(rows.length - unmapped.length).padStart(3) +
      ' | unmapped ' + String(unmapped.length).padStart(2) +
      (unmapped.length ? '  -> ' + unmapped.map((r) => r.slug).join(', ') : '  OK')
    );
  }
  if (totalUnmapped > 0) {
    console.error('\nFAIL: ' + totalUnmapped + ' published article(s) have no section mapping and will 404.');
    console.error('Add each slug to its game\'s ARTICLE_SECTION map before calling the article live.');
    process.exit(1);
  }
  console.log('\nOK: every published article in the section-mapped games resolves to a section.');
  process.exit(0);
})().catch((err) => {
  console.error('ERROR:', err.message);
  process.exit(2);
});
