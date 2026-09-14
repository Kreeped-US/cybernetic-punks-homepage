// scripts/persist-marathon-sept14-devupdate.mjs
// ============================================================
// Persist / UPDATE ONE reviewed Marathon article -- the Sept 14 2026 Bungie dev update
// "Nightfall Refresh and Symbiosis" (NEXUS) -- in feed_items (game_slug='marathon') AS A DRAFT
// (is_published=FALSE). Marathon articles render in the /marathon/intel feed; there is NO
// section map to touch (unlike wardogs/dmz).
//
// UPSERT (changed from the original skip-if-exists): the draft was already inserted
// (id=ea443d2b-5bdc-47b3-bca1-a14c9f73987d) with a thin body; this now UPDATES that existing
// DRAFT row in place -- match by slug + game_slug='marathon', guarded WHERE is_published=false
// so it can ONLY ever touch a DRAFT, never a live row. If no draft exists (fresh env) it INSERTs
// instead. It updates only headline / body / tags / source / source_url; it never flips
// is_published or noindex (those stay draft; the approve route flips them on publish).
//
// GROUNDING: strictly Bungie's official dev update, first-party. Every date + feature is AS
// BUNGIE STATED THEM -- no invented specifics. Where the dev update lists an item without
// further detail, this reports it at that level rather than guessing (honest-null discipline).
// The "What It Means for Players" section is CLEARLY MARKED analysis, not a Bungie statement.
//
// TITLE vs META (schema note): for a feed_items article, the /marathon/intel/[slug] route sets
// `title: { absolute: item.headline }` -- so feed_items.headline IS BOTH the on-page H1 AND the
// SERP <title>. There is NO separate meta-title column for articles (the per-editor metaTitle is
// only for the 5 editor LANE pages). So the headline is tightened to ~60 chars to serve as the
// SERP title; the meta description auto-derives from the body's opening (buildMetaDescription).
//
// NOINDEX: the DRAFT stays noindex=TRUE (defense-in-depth while unpublished; not served, not in
// the sitemap). The approve route flips noindex=FALSE on approval, so it is INDEXABLE the moment
// it publishes.
//
// SOURCE: Bungie dev update "Nightfall Refresh and Symbiosis" (Sept 14 2026); source_url is the
// real first-party article URL.
//
// DRAFT, NOT PUBLISHED. DRY-RUN BY DEFAULT (--commit to write). Publish via the approve route or
// scripts/publish-drafts.mjs after review.
//
//   node scripts/persist-marathon-sept14-devupdate.mjs           (DRY: print the plan)
//   node scripts/persist-marathon-sept14-devupdate.mjs --commit  (UPDATE the existing draft, else insert)

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { logCoverageShadow } from '../lib/coverageShadow.js';

function loadEnvLocal() {
  if (process.env.SUPABASE_SERVICE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL) return;
  let raw;
  try { raw = readFileSync(new URL('../.env.local', import.meta.url), 'utf8'); } catch (e) { return; }
  for (const line0 of raw.split('\n')) {
    const line = line0.trim();
    if (!line || line.charAt(0) === '#') continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (val.length >= 2 && (val.charAt(0) === '"' || val.charAt(0) === "'")) val = val.slice(1, -1);
    if (!process.env[key]) process.env[key] = val;
  }
}

// THE FROZEN, REVIEWED ARTICLE. Straight hyphens / ASCII (house style). Facts strictly from
// Bungie's dev update; the "What It Means for Players" block is clearly-marked analysis.
//
// The Symbiosis section lists the Bungie-official feature set from the dev update (first PvE
// experience, refreshed Perimeter, new Runner shell, social space + firing range, experimental
// TDM, new-player onboarding), corroborated across coverage -- reported as Bungie stated them.
const ARTICLE = {
  slug: 'marathon-symbiosis-delay-october-nightfall-refresh-economy-reset',
  headline: 'Marathon Delays Major Update to December, Resets Economy Oct 6',
  tags: ['marathon', 'dev update', 'symbiosis', 'nightfall refresh', 'season 2', 'economy', 'progression', 'vault breaker', 'roadmap'],
  source: 'Bungie Dev Update: Nightfall Refresh and Symbiosis',
  source_url: 'https://www.bungie.net/7/en/News/Article/nightfallrefreshandsymbiosis',
  body: `Bungie has published a Marathon dev update, "Nightfall Refresh and Symbiosis" (September 14, 2026). It carries two headlines: the major Symbiosis update has slipped from September 22 to December 8, and a mid-season Nightfall Refresh arrives on October 6 with a progression and economy reset. Reported as Bungie stated them.

**Symbiosis Slips From September 22 to December 8**

Symbiosis, Marathon's next major content update, was targeted for September 22. Bungie has now moved it to December 8. It remains the season's headline update; the October 6 Nightfall Refresh (below) bridges the roughly eleven-week gap the delay opens up.

Per the dev update, Symbiosis brings:
- Marathon's first permanent PvE experience -- a new way to explore and progress beyond the traditional PvPvE extraction loop
- A refreshed Perimeter zone
- A new Runner shell
- A social space with a firing range
- An experimental Team Deathmatch (TDM) mode
- The first of several new-player onboarding improvements

**The October 6 Nightfall Refresh**

To keep Season 2 fresh while Symbiosis is finished, Bungie is shipping a mid-season Nightfall Refresh on October 6. Per the dev update, the Refresh brings:
- A progression reset and an economy reset -- a mid-season fresh start
- A new Rewards Pass
- Quality-of-life improvements
- Balance changes
- The return of the Vault Breaker mode

Where the dev update names a Refresh item without further detail, this summary reports it at that level rather than guessing at specifics.

**What the Seasonal Schedule Now Looks Like**

The move reshapes Season 2's cadence. Instead of a single September drop, the season now runs through an October 6 Refresh that resets the progression and economy loops, then builds to the December 8 Symbiosis launch. In practice that is two beats in the back half of the season: the Refresh in October, the major update in December.

**What It Means for Players (Analysis)**

The following is our read, not a Bungie statement. The October 6 economy and progression reset is the practical headline: it is a mid-season reset, so anything you are stockpiling now is worth spending before the Refresh rather than carrying into it. With Symbiosis now a December target, the next two months are shaped by the Refresh's balance pass, the new Rewards Pass grind, and the return of Vault Breaker, not by the next major expansion. The delay itself is a schedule change, not a statement about the update's scope.

Source: Bungie's official dev update "Nightfall Refresh and Symbiosis" (bungie.net), September 14, 2026. All dates and features are as Bungie stated them; the "What It Means for Players" section is analysis, clearly marked.`,
};

async function main() {
  loadEnvLocal();
  const commit = process.argv.indexOf('--commit') !== -1;

  // Fields updated in place on the existing draft (or set on insert). is_published + noindex are
  // NOT in the UPDATE set -- the draft stays a draft; the approve route flips them on publish.
  const content = {
    headline: ARTICLE.headline,
    body: ARTICLE.body,
    source: ARTICLE.source,
    source_url: ARTICLE.source_url, // REAL first-party URL (the Bungie dev-update article)
    tags: ARTICLE.tags,
  };
  // Full row used ONLY on the insert fallback (no existing draft).
  const insertRow = Object.assign({}, content, {
    editor: 'NEXUS',
    ce_score: 0,
    is_published: false, // DRAFT -- owner-reviewed before publish
    noindex: true,        // defense-in-depth while unpublished (approve route flips to false)
    thumbnail: null,
    slug: ARTICLE.slug,
    game_slug: 'marathon',
  });

  console.log('Marathon Sept 14 dev-update UPSERT' + (commit ? ' (COMMIT)' : ' (DRY -- no write)') + '. Target: feed_items, game_slug=marathon, is_published=FALSE (draft).');
  console.log('');
  console.log('  slug        : ' + ARTICLE.slug);
  console.log('  headline    : ' + ARTICLE.headline + '   (' + ARTICLE.headline.length + ' chars -- serves as H1 AND SERP title)');
  console.log('  editor      : NEXUS   (renders in the /marathon/intel feed -- no section map)');
  console.log('  source      : ' + ARTICLE.source + '   source_url: ' + ARTICLE.source_url);
  console.log('  tags        : ' + ARTICLE.tags.join(', '));
  console.log('  is_published: false (unchanged)   noindex: true (unchanged)   body chars: ' + ARTICLE.body.length);
  console.log('');
  console.log('  --- BODY (what would be written) ---');
  console.log(ARTICLE.body.split('\n').map(function (l) { return '  | ' + l; }).join('\n'));
  console.log('  --- END BODY ---');
  console.log('');

  if (!commit) {
    console.log('DRY -- nothing written. Re-run with --commit to UPDATE the existing draft (by slug, WHERE is_published=false), or INSERT if none exists.');
    return;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    console.error('ERROR: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY must be set (env or .env.local).');
    process.exit(1);
  }
  const supabase = createClient(url, key);

  // Find the existing DRAFT (is_published=false) for this slug. Guarding is_published=false means
  // this can never overwrite a live row -- if the article was already approved/published, we do
  // NOT touch it (report + stop).
  const existing = await supabase.from('feed_items')
    .select('id, is_published')
    .eq('slug', ARTICLE.slug).eq('game_slug', 'marathon')
    .maybeSingle();

  if (existing.error) { console.error('ERROR reading feed_items: ' + existing.error.message); process.exit(1); }

  if (existing.data && existing.data.is_published === true) {
    console.log('REFUSING: ' + ARTICLE.slug + ' is already PUBLISHED (id=' + existing.data.id + '). This script only edits a DRAFT. No change made.');
    return;
  }

  if (existing.data) {
    // UPDATE the existing draft in place. WHERE id + is_published=false (belt-and-suspenders).
    const upd = await supabase.from('feed_items')
      .update(content)
      .eq('id', existing.data.id).eq('is_published', false)
      .select('id, slug, is_published').maybeSingle();
    if (upd.error) { console.error('FAIL (update): ' + ARTICLE.slug + ' -> ' + upd.error.message); process.exit(1); }
    console.log('UPDATED DRAFT: ' + upd.data.slug + '  id=' + upd.data.id + '  is_published=' + upd.data.is_published);
    console.log('Done. Still a DRAFT (is_published=false). Review + approve in the Drafts panel.');
    return;
  }

  // No existing row -> INSERT the draft (fallback for a fresh environment).
  await logCoverageShadow(supabase, { source: 'marathon-sept14-devupdate', editor: 'NEXUS', gameSlug: 'marathon', headline: ARTICLE.headline });
  const ins = await supabase.from('feed_items').insert(insertRow).select('id, slug, is_published').maybeSingle();
  if (ins.error) { console.error('FAIL (insert): ' + ARTICLE.slug + ' -> ' + ins.error.message); process.exit(1); }
  console.log('INSERTED DRAFT: ' + ins.data.slug + '  id=' + ins.data.id + '  is_published=' + ins.data.is_published);
  console.log('Done. DRAFT only (is_published=false). Publish via the approve route or scripts/publish-drafts.mjs after review.');
}

main().catch((e) => { console.error(e); process.exit(1); });
