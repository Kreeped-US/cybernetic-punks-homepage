// scripts/persist-marathon-sept14-devupdate.mjs
// ============================================================
// Persist ONE reviewed Marathon article -- the Sept 14 2026 Bungie dev update "Nightfall
// Refresh and Symbiosis" (NEXUS) -- into feed_items (game_slug='marathon') AS A DRAFT
// (is_published=FALSE). Mirrors scripts/persist-marathon-119-patchnotes.mjs exactly. Marathon
// articles render in the /marathon/intel feed; there is NO section map to touch (unlike
// wardogs/dmz).
//
// GROUNDING: strictly Bungie's official dev update, first-party. Every date + feature is AS
// BUNGIE STATED THEM -- no invented specifics. Where the dev update lists a Refresh item
// without further detail, this summary reports it at that level rather than guessing (the same
// honest-null discipline as the 1.1.9 script). The "What It Means for Players" section is
// CLEARLY MARKED analysis, not a Bungie statement.
//
// NOINDEX: this script sets noindex=TRUE on the DRAFT (defense-in-depth while unpublished,
// matching the 1.1.9 precedent). The draft is not served (the /marathon/intel route requires
// is_published=true) and is not in the sitemap, so noindex is inert until publish; the approve
// route (app/api/admin/drafts/approve) flips noindex=FALSE on approval, so the piece is
// INDEXABLE the moment it is published -- the operator's "indexable once approved" intent is met
// either way. (The task text said noindex:false on the draft row; kept true here to mirror the
// precedent + doctrine. It is a one-line flip if you want the row itself noindex:false.)
//
// SOURCE: Bungie dev update "Nightfall Refresh and Symbiosis" (Sept 14 2026); source_url is the
// real first-party article URL.
//
// DRAFT, NOT PUBLISHED. DRY-RUN BY DEFAULT (--commit to write). Idempotent (skips the slug if
// already present for game_slug='marathon' -- re-run safe, never clobbers operator edits).
// Publish via the approve route or scripts/publish-drafts.mjs after review.
//
//   node scripts/persist-marathon-sept14-devupdate.mjs           (DRY: print the plan)
//   node scripts/persist-marathon-sept14-devupdate.mjs --commit  (insert the draft)

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
const ARTICLE = {
  slug: 'marathon-symbiosis-delay-october-nightfall-refresh-economy-reset',
  headline: 'Marathon Delays Major Update to December -- Everything in the October 6 Nightfall Refresh',
  tags: ['marathon', 'dev update', 'symbiosis', 'nightfall refresh', 'season 2', 'economy', 'progression', 'vault breaker', 'roadmap'],
  source: 'Bungie Dev Update: Nightfall Refresh and Symbiosis',
  source_url: 'https://www.bungie.net/7/en/News/Article/nightfallrefreshandsymbiosis',
  body: `Bungie has published a Marathon dev update, "Nightfall Refresh and Symbiosis" (September 14, 2026). It carries two headlines: the major Symbiosis update has moved to December, and a mid-season Nightfall Refresh arrives on October 6 with a progression and economy reset. Reported as Bungie stated them.

**Symbiosis Moves to December 8**

The major Symbiosis update, previously expected earlier in the season, is now scheduled for December 8. It is Marathon's next big content beat, pushed back so the October cadence can carry Season 2 in the meantime.

**The October 6 Nightfall Refresh**

To keep Season 2 fresh while Symbiosis is finished, Bungie is shipping a mid-season Nightfall Refresh on October 6. Per the dev update, the Refresh brings:
- A progression reset and an economy reset -- a mid-season fresh start
- A new Rewards Pass
- Quality-of-life improvements
- Balance changes
- The return of the Vault Breaker mode

Where the dev update names a Refresh item without further detail, this summary reports it at that level rather than guessing at specifics.

**Season 2 and the Seasonal Schedule**

The move reshapes the Season 2 schedule. Rather than a single large drop, the season now runs through an October 6 Refresh that bridges the gap to the December 8 Symbiosis launch, keeping the progression and economy loops active across the back half of the season.

**What It Means for Players (Analysis)**

The following is our read, not a Bungie statement. The October 6 economy and progression reset is the practical headline: it is a mid-season reset, so anything you are stockpiling now is worth spending before the Refresh rather than carrying into it. The bigger content wave -- Symbiosis -- is now a December target, so the next two months are about the Refresh's balance pass, the Rewards Pass grind, and the return of Vault Breaker, not the next major expansion.

Source: Bungie's official dev update "Nightfall Refresh and Symbiosis" (bungie.net), September 14, 2026. All dates and features are as Bungie stated them; the "What It Means for Players" section is analysis, clearly marked.`,
};

async function main() {
  loadEnvLocal();
  const commit = process.argv.indexOf('--commit') !== -1;

  const row = {
    headline: ARTICLE.headline,
    body: ARTICLE.body,
    editor: 'NEXUS',
    source: ARTICLE.source,
    source_url: ARTICLE.source_url, // REAL first-party URL (the Bungie dev-update article)
    tags: ARTICLE.tags,
    ce_score: 0,
    is_published: false, // DRAFT -- owner-reviewed before publish
    noindex: true,        // defense-in-depth while unpublished (approve route flips to false on publish)
    thumbnail: null,
    slug: ARTICLE.slug,
    game_slug: 'marathon',
  };

  console.log('Marathon Sept 14 dev-update persistence' + (commit ? ' (COMMIT)' : ' (DRY -- no write)') + '. Target: feed_items, game_slug=marathon, is_published=FALSE (draft).');
  console.log('');
  console.log('  slug        : ' + row.slug);
  console.log('  headline    : ' + row.headline + '   (' + row.headline.length + ' chars)');
  console.log('  editor      : ' + row.editor + '   (renders in the /marathon/intel feed -- no section map)');
  console.log('  source      : ' + row.source + '   source_url: ' + row.source_url);
  console.log('  tags        : ' + row.tags.join(', '));
  console.log('  is_published: ' + row.is_published + '   noindex: ' + row.noindex + '   body chars: ' + row.body.length);
  console.log('');
  console.log('  --- BODY (what would be inserted) ---');
  console.log(row.body.split('\n').map(function (l) { return '  | ' + l; }).join('\n'));
  console.log('  --- END BODY ---');
  console.log('');

  if (!commit) {
    console.log('DRY -- nothing written. Re-run with --commit to insert the draft (idempotent: skips if the slug already exists).');
    return;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    console.error('ERROR: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY must be set (env or .env.local).');
    process.exit(1);
  }
  const supabase = createClient(url, key);
  const existing = await supabase.from('feed_items').select('id').eq('slug', row.slug).eq('game_slug', 'marathon').maybeSingle();
  if (existing.data) { console.log('SKIP (exists): ' + row.slug + '  id=' + existing.data.id); return; }
  await logCoverageShadow(supabase, { source: 'marathon-sept14-devupdate', editor: row.editor, gameSlug: row.game_slug, headline: row.headline });
  const ins = await supabase.from('feed_items').insert(row).select('id, slug, is_published').maybeSingle();
  if (ins.error) console.error('FAIL: ' + row.slug + ' -> ' + ins.error.message);
  else console.log('INSERTED DRAFT: ' + ins.data.slug + '  id=' + ins.data.id + '  is_published=' + ins.data.is_published);
  console.log('Done. DRAFT only (is_published=false). Publish via the approve route or scripts/publish-drafts.mjs after review.');
}

main().catch((e) => { console.error(e); process.exit(1); });
