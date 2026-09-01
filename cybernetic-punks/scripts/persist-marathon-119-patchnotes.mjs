// scripts/persist-marathon-119-patchnotes.mjs
// ============================================================
// Persist ONE reviewed Marathon article -- the 1.1.9 patch-notes summary (NEXUS) -- into
// feed_items (game_slug='marathon') AS A DRAFT (is_published=FALSE, noindex=TRUE). Mirrors
// scripts/persist-wardogs-economy.mjs. Marathon articles render in the /marathon/intel feed;
// there is NO section map to touch (unlike wardogs/dmz).
//
// GROUNDING: strictly Bungie's official Marathon Update 1.1.9 patch notes (first-party). The
// article reports the changes AS BUNGIE STATED THEM -- no invented meta-impact. One framing
// call is load-bearing: the Full-Auto Selector item is a DESCRIPTION FIX, not a nerf (the mod
// never increased rate of fire; its in-game text incorrectly claimed it did, and Bungie
// corrected the text). This matches the data correction already flagged for the mod_stats row.
//
// SOURCE: Bungie 1.1.9 patch notes; source_url is the real first-party article URL.
//
// DRAFT, NOT PUBLISHED. DRY-RUN BY DEFAULT (--commit to write). Idempotent (skips the slug if
// already present for game_slug='marathon'). Publish via the approve route or
// scripts/publish-drafts.mjs after review.
//
//   node scripts/persist-marathon-119-patchnotes.mjs           (DRY: print the plan)
//   node scripts/persist-marathon-119-patchnotes.mjs --commit  (insert the draft)

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

// THE FROZEN, REVIEWED ARTICLE. Straight hyphens / ASCII (house style).
const ARTICLE = {
  slug: 'marathon-1-1-9-patch-notes',
  headline: 'Marathon 1.1.9 Patch Notes: Rook, Economy & Mod Fixes',
  tags: ['marathon', 'patch notes', '1.1.9', 'update', 'carri', 'rook', 'economy', 'mods', 'cryo archive'],
  source: 'Bungie 1.1.9 Patch Notes',
  source_url: 'https://www.bungie.net/News/Article/marathon_update_1_1_9',
  body: `Bungie has shipped Marathon Update 1.1.9. Drawing on Bungie's official 1.1.9 patch notes, here is what the update touches - the item economy, Rook's loadout, a mod description fix, and a run of contract, codex, zone, and Cryo Archive fixes. Reported as Bungie stated them.

**Item Economy: The C.A.R.R.I. Armory**

The C.A.R.R.I. Armory gains two new Superior-tier items: a Superior Shield Implant and a Superior Backpack. Each is available three times per week.

Several Commendation costs come down in 1.1.9:
- Deluxe Backpack: 20 to 15
- Deluxe Shield Implant: 12 to 10
- Deluxe Key Template: 40 to 30
- Superior Key Template: 75 to 50

These are straight cost reductions - the same items for fewer Commendations.

**Combat: Rook's Temporary Loadout**

Rook's inventory now carries a Compromised Sneak Pack, two Claymores, one Depleted Self Revive, and one Signal Jammer. Read the window carefully: this is a temporary change that runs until the end of Season 2, not a permanent addition to the shell.

**Mods: Full-Auto Selector Tooltip Fix (Not a Nerf)**

Read this one carefully, because the effect and the fix are two different things. The Full-Auto Selector does increase rate of fire: per Bungie's Season 2 Combat Tuning Preview it adds +90 RPM (retuned down from +150 earlier in development), alongside +50 ADS Speed, +50 ADS Accuracy, and dual-mode behavior - full-auto from the hip, tighter and longer-ranged when you aim. What 1.1.9 changed is the in-game tooltip, which stated that rate-of-fire increase incorrectly: the wording was off, not the effect. So this is a tooltip fix, not a nerf - the mod still boosts rate of fire exactly as before, and only the text describing it was corrected. If you run the Full-Auto Selector on the Misriah 2442, the +90 RPM is real. (Sources: Bungie's Season 2 Combat Tuning Preview on Steam for the mod's effect; the 1.1.9 patch notes on bungie.net for the tooltip fix.)

**Contracts**

Bungie addressed issues with two contracts: Return on Investment (4/5) and Unsanctioned Hostilities (5/5).

**Codex**

Fixes to a challenge-credit issue and to the Century Runner emblem claim.

**Zones**

Sponsored Night Marsh returns.

**Cryo Archive**

Fixes to an out-of-bounds spot and to the Compiler door.

**UI and Audio**

Fixes to the Threat indicator text and to invite/join audio.

**Localization**

A Russian text fix.

**General**

Fixes touching the Acid Abyss Thief skin and the KKV-9SD, plus a typo correction in the Thief Weaverunner description.

Source: Bungie's official Marathon Update 1.1.9 patch notes (bungie.net). Where 1.1.9 only lists a fix without further detail, this summary reports it at that level rather than guessing at specifics.`,
};

async function main() {
  loadEnvLocal();
  const commit = process.argv.indexOf('--commit') !== -1;

  const row = {
    headline: ARTICLE.headline,
    body: ARTICLE.body,
    editor: 'NEXUS',
    source: ARTICLE.source,
    source_url: ARTICLE.source_url, // REAL first-party URL (the Bungie 1.1.9 article)
    tags: ARTICLE.tags,
    ce_score: 0,
    is_published: false, // DRAFT -- owner-reviewed before publish
    noindex: true,        // defense-in-depth while unpublished
    thumbnail: null,
    slug: ARTICLE.slug,
    game_slug: 'marathon',
  };

  console.log('Marathon 1.1.9 patch-notes persistence' + (commit ? ' (COMMIT)' : ' (DRY -- no write)') + '. Target: feed_items, game_slug=marathon, is_published=FALSE (draft).');
  console.log('');
  console.log('  slug        : ' + row.slug);
  console.log('  headline    : ' + row.headline + '   (' + row.headline.length + ' chars)');
  console.log('  editor      : ' + row.editor + '   (renders in the /marathon/intel feed -- no section map)');
  console.log('  source      : ' + row.source + '   source_url: ' + row.source_url);
  console.log('  is_published: ' + row.is_published + '   noindex: ' + row.noindex + '   body chars: ' + row.body.length);
  console.log('');

  if (!commit) {
    console.log('DRY -- nothing written. Re-run with --commit to insert the draft (idempotent).');
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
  await logCoverageShadow(supabase, { source: 'marathon-1-1-9-patch-notes', editor: row.editor, gameSlug: row.game_slug, headline: row.headline });
  const ins = await supabase.from('feed_items').insert(row).select('id, slug, is_published').maybeSingle();
  if (ins.error) console.error('FAIL: ' + row.slug + ' -> ' + ins.error.message);
  else console.log('INSERTED DRAFT: ' + ins.data.slug + '  id=' + ins.data.id + '  is_published=' + ins.data.is_published);
  console.log('Done. DRAFT only (is_published=false). Publish via the approve route or scripts/publish-drafts.mjs after review.');
}

main().catch((e) => { console.error(e); process.exit(1); });
