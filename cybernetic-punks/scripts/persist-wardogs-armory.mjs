// scripts/persist-wardogs-armory.mjs
// ============================================================
// Persist ONE reviewed Wardogs pre-launch article -- the ARMORY piece -- into
// feed_items (game_slug='wardogs') AS A DRAFT (is_published=FALSE, noindex=TRUE),
// exactly like scripts/persist-wardogs-news.mjs. Kept as its OWN script so the six
// FROZEN confirmed-systems drafts stay untouched: this article deliberately mixes
// CONFIRMED facts with ATTRIBUTED playtest intel (clearly flagged in-body), a
// different confidence posture from the six.
//
// CONFIDENCE TIERS IN THE BODY (the whole point):
//   - CONFIRMED (Bulkhead official): 37 weapons at EA, the 3 named starters, the
//     buy-per-life armory SYSTEM. Stated as fact.
//   - ATTRIBUTED (Closed Alpha/Beta playtest captures): the ~33-35 gun vendor roster
//     and any beta price -- flagged "playtest-captured, unconfirmed, may change".
//     Never stated as fact. The Verba MANPADS is flagged as inconsistently seen.
//   - THE GAP: 37 confirmed vs ~35 seen -> stated honestly, NOT filled with
//     speculation (.338 Norma / Verba stay labeled speculation or omitted).
//
// SOURCE: the 37 count is Bulkhead's August 11 devlog ("10 Reasons NOT to Buy
// WARDOGS"); no URL was supplied for it, so source_url is honest-NULL and the devlog
// is attributed BY NAME in-body (same convention as persist-wardogs-news.mjs).
//
// DRAFT, NOT PUBLISHED: is_published=false. The owner reviews, then publishes via the
// approve route or scripts/publish-drafts.mjs (which clears noindex on publish).
//
// IDEMPOTENT: skips the slug if already present for game_slug='wardogs'.
//
// WRITES TO THE DB (service key). Run:
//   node scripts/persist-wardogs-armory.mjs --dry   (print the PLAN -- writes nothing)
//   node scripts/persist-wardogs-armory.mjs         (insert the draft)

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
  slug: 'wardogs-armory',
  headline: 'Wardogs armory: 37 weapons at Early Access and how the buy-per-life system works',
  tags: ['wardogs', 'bulkhead', 'armory', 'weapons', 'loadout', 'early access'],
  source: 'AUG 11 DEVLOG',
  source_url: null, // honest-null: the Aug 11 devlog URL was not supplied; attributed by name in-body.
  body: `**What Bulkhead Has Confirmed**

Wardogs launches into Steam Early Access on September 10, 2026 with 37 weapons. That count is on the record: it comes from Bulkhead's August 11 devlog ("10 Reasons NOT to Buy WARDOGS"), where the studio stated the Early Access armory size outright. Treat 37 as a confirmed figure - one of the few hard numbers Bulkhead has committed to ahead of launch.

Bulkhead has also named three starter rifles, each carried in one faction's camo:

- A-91, in Valkyra camo
- Bushmaster, in Lonestar camo
- KH-2002, in Manticore camo

These three are official. Bulkhead presents them as free starting weapons available from the first life, regardless of how much cash an account has.

**How the Armory Works**

The Wardogs armory is not a class picker. There is no preset "assault" or "sniper" class you lock into at spawn. Per Bulkhead's confirmed loadout mechanics, you buy your kit for each life out of a persistent cash balance that carries across matches. Die, redeploy, and you spend again - so the armory is a running economic decision, not a one-time character choice.

Two things follow directly from what Bulkhead has confirmed:

- The free starters matter. Because A-91, Bushmaster, and KH-2002 cost nothing, a player who has spent down their cash - or a fresh, wiped account - can always field a working rifle and keep fighting. There is no state in which you cannot deploy.
- The expensive weapons are a bankroll call. Bulkhead has pointed to high-end hardware such as the FAL, the AMR 50 anti-materiel rifle, and the MGL-40 grenade launcher as premium buys - the kind of purchase you weigh against your balance rather than pick freely. Bringing one is a bet.

Bulkhead has also said the armory is not fixed at 37 forever: new weapons are planned to arrive during Early Access, not held back for a distant 1.0. The launch roster is a starting point, not a ceiling.

**The Playtest Vendor (Attributed - Not Confirmed)**

Everything above is Bulkhead's official word. What follows is not. The detail we have on the specific vendor comes from Closed Alpha and Closed Beta playtest captures, not from an official weapon list. Treat all of it as attributed, unconfirmed, and subject to change: the live Early Access vendor has not been made public, prices seen in a playtest can be retuned, and the exact roster may shift before or during launch.

With that flag firmly attached, here is the roster that appeared in the playtest vendor, grouped by category. These are the weapon names as captured; the three official starters are marked as confirmed. We are listing names by category only - not per-gun calibers, stats, or fixed prices (the caliber detail was not part of the capture, so we are not inventing it; prices are covered below).

Assault rifles: Bushmaster M17S (confirmed starter, Lonestar camo), A-91 (confirmed starter, Valkyra camo), KH-2002 (confirmed starter, Manticore camo), T-21, AK74, Galil, M4, FAL.

Submachine guns: AMP-9, PP-19 Vityaz, MP5, Super-45.

Shotguns: MP43, M500.

Light machine guns: M249 SAW, PKM.

Marksman rifles: SKS, SVD, BMR-308.

Sniper rifles: Scout Rifle TD, Mosin Nagant, SV98, MK22, AMR 50.

Bow: Compound Bow.

Sidearms: GGX 17, GGX 18, Judge, M1911, Deagle.

Launchers: RPG-7, MAAWS, MGL-40. Flagged here as well: the Verba MANPADS (a man-portable anti-air launcher) has turned up in files and on some community lists, but it did not appear consistently on the playtest vendor - we are not counting it as a confirmed launch weapon. It may be present, cut, or held back; we will not guess.

That is 33 named weapons, or 34 counting the flagged Verba. On prices: we are not publishing per-gun costs, because a price from a Closed Alpha or Beta build is a snapshot of one tuning pass, not the launch economy, and Early Access vendors routinely re-price between the last playtest and the public build. For scale only - and still flagged as unconfirmed beta capture - playtest costs ranged from roughly $200 for a sidearm up to about $8,800 for the AMR 50 anti-materiel rifle, numbers that can and likely will move at the live vendor. We will not tell you a gun "costs" a set amount until it can be checked in the public build.

**The Gap: 37 Confirmed, About 35 Seen**

Here is the honest arithmetic. Bulkhead confirms 37 weapons at Early Access. The itemized playtest roster above names 33, or 34 counting the flagged Verba - call it roughly 35. That leaves two to four weapons Bulkhead has not announced and that did not clearly appear in the captures we have.

We are not going to fill that gap with guesses. Community threads have floated candidates - a .338 Norma Magnum sniper, the Verba noted above - but neither is confirmed by Bulkhead, and presenting speculation as the "missing" weapons is exactly the kind of invented fact this network exists to avoid. The statement we will stand on is the plain one: Bulkhead confirms 37, roughly 35 appeared in playtest, and the final few are unannounced.

**What We Will Confirm At Launch**

When Wardogs opens on September 10, the armory becomes checkable. At that point we will verify the real launch roster, the actual per-life prices, whether the free starters behave as described, and how the high-end buys price against a working cash balance. Until then the confirmed spine is small and solid - 37 weapons, three named free starters, a buy-per-life economy, more guns arriving in Early Access - and everything past it is playtest intel, flagged and provisional.

Wardogs enters Steam Early Access on September 10, 2026, developed by Bulkhead and published by Team17.`,
};

async function main() {
  loadEnvLocal();
  const dry = process.argv.indexOf('--dry') !== -1;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!dry && (!url || !key)) {
    console.error('ERROR: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY must be set (env or .env.local).');
    process.exit(1);
  }

  const row = {
    headline: ARTICLE.headline,
    body: ARTICLE.body,
    editor: 'NEXUS',
    source: ARTICLE.source,
    source_url: ARTICLE.source_url, // REAL url or null -- never synthesized
    tags: ARTICLE.tags,
    ce_score: 0,
    is_published: false, // DRAFT -- owner-reviewed before publish
    noindex: true,        // defense-in-depth while unpublished
    thumbnail: null,
    slug: ARTICLE.slug,
    game_slug: 'wardogs',
  };

  console.log('Wardogs armory persistence' + (dry ? ' (DRY -- no write)' : '') + '. Target: feed_items, game_slug=wardogs, is_published=FALSE (draft).');
  console.log('');
  console.log('  slug        : ' + row.slug);
  console.log('  headline    : ' + row.headline);
  console.log('  editor      : ' + row.editor + '   section (map in lib/games/wardogs.js): systems');
  console.log('  source      : ' + row.source + '   source_url: ' + (row.source_url || 'null (honest-null)'));
  console.log('  is_published: ' + row.is_published + '   noindex: ' + row.noindex + '   body chars: ' + row.body.length);
  console.log('');

  if (dry) {
    console.log('DRY -- nothing written. Re-run without --dry to insert the draft (idempotent).');
    return;
  }

  const supabase = createClient(url, key);
  const existing = await supabase.from('feed_items').select('id').eq('slug', row.slug).eq('game_slug', 'wardogs').maybeSingle();
  if (existing.data) { console.log('SKIP (exists): ' + row.slug + '  id=' + existing.data.id); return; }
  await logCoverageShadow(supabase, { source: 'wardogs-armory', editor: row.editor, gameSlug: row.game_slug, headline: row.headline });
  const ins = await supabase.from('feed_items').insert(row).select('id, slug, is_published').maybeSingle();
  if (ins.error) console.error('FAIL: ' + row.slug + ' -> ' + ins.error.message);
  else console.log('INSERTED DRAFT: ' + ins.data.slug + '  id=' + ins.data.id + '  is_published=' + ins.data.is_published);
  console.log('Done. DRAFT only (is_published=false). Publish via the approve route or scripts/publish-drafts.mjs after review.');
}

main().catch((e) => { console.error(e); process.exit(1); });
