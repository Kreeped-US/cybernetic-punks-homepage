// scripts/persist-wardogs-news.mjs
// ============================================================
// Persist the SIX reviewed Wardogs pre-launch confirmed-systems articles into
// feed_items (game_slug='wardogs') AS DRAFTS (is_published=FALSE). The article
// TEXT below is FROZEN: it is the exact gen-wardogs-news.mjs dry-run output the
// owner reviewed and signed off this session -- NOT re-generated. Four bodies
// (cash-economy, factions, roles-not-classes, monetization) are the first-run
// reviewed text; two (what-wardogs-is, map-and-respawn) are the re-run text after
// the single-excerpt-grounding fix. This script does NOT call the generator.
//
// DRAFTS, NOT PUBLISHED: is_published=FALSE (unlike persist-dmz-news.mjs's true).
// The /wardogs/[section]/[slug] article route, the sitemap block, and the
// wardogs.indexable flip are NOT built yet (Stage 6 Track 2), so publishing now
// would create indexed-but-unroutable pages. These wait as owner-reviewed drafts.
//
// HONEST CITATIONS: source_url is the REAL per-topic URL (operator-verified live) or
// NULL -- never synthesized. The Aug 11 devlog has no supplied URL, so any article
// whose facts trace to it attributes it BY NAME in-body ("Bulkhead's August 11
// devlog"); the row's source_url points to the topic's PRIMARY real source.
//
// IDEMPOTENT: explicit deterministic slugs; skips any slug already present for
// game_slug='wardogs' -- safe to re-run.
//
// WRITES TO THE DB (service key). Run once:
//   node scripts/persist-wardogs-news.mjs            (insert any missing of the 6 as DRAFTS)
//   node scripts/persist-wardogs-news.mjs --dry      (print the PLAN -- writes nothing)

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { logCoverageShadow } from '../lib/coverageShadow.js';

function loadEnvLocal() {
  if (process.env.SUPABASE_SERVICE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL) return;
  let raw;
  try { raw = readFileSync(new URL('../.env.local', import.meta.url), 'utf8'); } catch (e) { return; }
  const lines = raw.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.charAt(0) === '#') continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (val.length >= 2 && (val.charAt(0) === '"' || val.charAt(0) === "'")) val = val.slice(1, -1);
    if (!process.env[key]) process.env[key] = val;
  }
}

// Real, operator-verified source URLs (2026-08-26). A citation is a real URL or NULL.
// After the article-weight review, all six rows' PRIMARY source is Top Questions (or
// honest-null for map-respawn). The Steam store page is cited in-body by monetization but is
// no longer any row's primary source_url; kept here as the verified store URL for reference.
const TOP_QUESTIONS_URL = 'https://store.steampowered.com/news/app/1867240/view/496095152751771744';
const STEAM_STORE_URL = 'https://store.steampowered.com/app/1867240/WARDOGS/'; // eslint-disable-line no-unused-vars -- retained for reference

// ---------------------------------------------------------------------------
// THE 6 FROZEN, REVIEWED ARTICLES. Bodies are the exact signed-off dry-run text.
// source_url = the topic's PRIMARY real source (never synthesized).
// ---------------------------------------------------------------------------
const ARTICLES = [
  {
    slug: 'wardogs-control-zone',
    headline: 'Wardogs Control Zone: three-team King of the Hill on a 256km2 map',
    tags: ['wardogs', 'bulkhead', 'control zone', 'hot zone', 'king of the hill', 'early access'],
    source: 'TOP QUESTIONS',
    source_url: TOP_QUESTIONS_URL,
    body: `**What Wardogs Is**

Wardogs is a competitive shooter built around a three-team fight for a single objective. According to Bulkhead's "WARDOGS - TOP QUESTIONS" post on Steam (18 Feb 2026), the game is directly inspired by King of the Hill: three teams contest control of a randomized 2x2km area called the "Control Zone," which sits inside a wider 256km2 map. All figures here are Bulkhead's stated pre-launch numbers and may change as the game develops in Early Access.

The scoring rule is straightforward, per the same source: the team with the most players physically inside the Control Zone earns points. The first team to reach 100 points wins the match. Bulkhead has not yet detailed in this source how ties or near-equal player counts inside the zone are resolved.

**The Hot Zone: A Shifting Sub-Objective**

Inside the Control Zone sits a smaller, shifting sub-zone called the "Hot Zone." Bulkhead states that players inside the Hot Zone count as double toward their team's player count for scoring purposes -- a mechanic the source describes as having "match-swinging potential." The Hot Zone also yields, in Bulkhead's words, "DOUBLE CASH."

The interaction between the two zones is the structural core of the announced design: the Control Zone sets the broad contest, while the Hot Zone creates a concentrated, higher-stakes focal point inside it. Because the Hot Zone shifts position, teams must decide whether to anchor the larger zone or chase the moving sub-objective. The source does not yet specify how frequently the Hot Zone moves or what governs its new position.

**Setting: Kolchia and the Fight for PV-1**

Bulkhead's post places the game in a war-torn region called "Kolchia." The conflict centers on PV-1, described as a rare resource that has fuelled decades of Eurasian conflict. The source does not expand further on PV-1's role in the in-match economy or how it connects mechanically to the cash reward from the Hot Zone -- those details are not covered in this source.

**What the Announced Structure Looks Like**

Pulling the pieces together as announced:

- A 256km2 map (Bulkhead pre-launch figure) contains a randomized 2x2km Control Zone (Bulkhead pre-launch figure)
- Three teams score points by holding a player-count majority inside that zone
- A shifting Hot Zone inside it doubles both scoring weight and cash earned
- First team to 100 points (Bulkhead pre-launch figure) wins
- The fiction is grounded in the Kolchia setting and the PV-1 resource conflict

No hands-on data exists for any of this. These are Bulkhead's stated design intentions ahead of launch.

Wardogs enters Steam Early Access on September 10, 2026, published by Team17.`,
  },
  {
    slug: 'wardogs-factions',
    headline: 'Wardogs factions revealed: Lonestar, Valkyra, and Manticore',
    tags: ['wardogs', 'bulkhead', 'factions', 'lonestar', 'valkyra', 'manticore'],
    source: 'TOP QUESTIONS',
    source_url: TOP_QUESTIONS_URL,
    body: `**Three Factions, One Battlefield**

Bulkhead has named the three factions players will align with in Wardogs, the competitive shooter set in the war-torn region of Kolchia. According to Bulkhead's "WARDOGS - TOP QUESTIONS" post published on Steam on February 18, 2026, the conflict centers on PV-1, a rare resource that the source describes as fueling decades of Eurasian conflict. The three groups fighting over it are Lonestar, Valkyra, and Manticore.

**Who the Factions Are**

Bulkhead's Top Questions post introduces each faction in lore terms. Here is what the source states, quoted directly:

- Lonestar: "The heavy-hitters in the Western paramilitary world."
- Valkyra: "Aims to return the Soviet People's Republic to greatness."
- Manticore: "The Kingdom of Persia, Tehran's shadow army."

Each description is framed as narrative context -- a sense of where each group comes from and what it wants. The post does not state that the factions differ from one another mechanically. There is no mention in the source of faction-specific weapons, vehicles, abilities, or balance distinctions. Whether those differences exist in the game is not addressed in this announcement.

**The Setting: Kolchia and PV-1**

The three factions converge on Kolchia, the game's fictional war-torn setting. The resource at the heart of the conflict is PV-1, which the source identifies as rare and as the driver of prolonged Eurasian fighting. Beyond those details, the Top Questions post does not elaborate on Kolchia's geography, its political history, or the specific properties of PV-1. Those details have not yet been disclosed in this source.

**What Remains Undetailed**

The faction reveal raises questions the source does not yet answer. It is not stated whether players choose a faction permanently, per session, or at some other point. The source does not specify whether faction choice has any effect on starting conditions, available gear, or in-match objectives. It also does not clarify how the three-faction structure maps onto the game's announced session format. Bulkhead has not addressed these points in the Top Questions post, and no hands-on data exists -- Wardogs has not launched.

What the announcement does establish is the geopolitical framing Bulkhead intends for the conflict: a three-way contest between a Western paramilitary force, a Soviet republican movement, and a Persian shadow army, all competing over a single scarce resource in a fictional Eurasian theater.

Wardogs enters Steam Early Access on September 10, 2026, published by Team17.`,
  },
  {
    slug: 'wardogs-cash-economy',
    headline: 'Wardogs cash economy: how persistent money and loadouts work',
    tags: ['wardogs', 'bulkhead', 'cash economy', 'loadout system', 'team17', 'early access'],
    source: 'TOP QUESTIONS',
    source_url: TOP_QUESTIONS_URL,
    body: `**What Bulkhead Has Announced**

Wardogs, the upcoming competitive shooter from Bulkhead and Team17, is built around a persistent cash economy -- meaning the money you earn does not reset between matches. According to Bulkhead's "WARDOGS - TOP QUESTIONS" post on Steam (published February 18, 2026), cash carries forward from session to session as the foundational resource tying together loadouts, progression, and teamplay rewards.

The Wardogs Steam store page and Team17 official page reinforce this framing: the economy is not a match-by-match currency but an ongoing balance that players manage across their time with the game.

**How Loadouts Are Purchased**

Bulkhead states that at the start of each life -- not each match, but each life -- players spend cash to build a custom loadout. The source describes the selection as drawing from "weapons, gear, utility, and vehicles," though Bulkhead's pre-launch materials do not yet detail the full scope of what falls under each of those categories or how pricing between items is structured.

This per-life purchase model means a single match could involve multiple spending decisions if a player dies and re-deploys. The source does not specify whether loadout costs are fixed or variable, or whether items carry over if a player survives an entire match.

**How Cash Is Earned In the Zone**

Bulkhead's "WARDOGS - TOP QUESTIONS" post lists the following as in-match earning actions:

- Revives
- Transport
- Kills
- Spotting

The source notes these are examples and flags that "MORE" actions contribute to earnings, without specifying them at this stage. The framing Bulkhead uses is direct: "Teamplay isn't encouraged, it's rewarded." The stated structure ties cash generation to cooperative play rather than solo performance alone, though the source does not specify exact cash values attached to any individual action -- those figures, if announced, are not present in the current pre-launch materials.

**The Starting Balance**

Bulkhead states that every player begins their account with $10,000. Per Bulkhead's pre-launch figures, this is described as a one-time starting balance for the journey -- not a per-match or per-session reset. As with all numbers in Wardogs' pre-launch materials, this figure should be treated as Bulkhead's stated value ahead of Early Access; balances and economies in Early Access titles frequently shift during development.

**What the Source Has Not Yet Detailed**

A few structural questions remain open based on current pre-launch materials. Bulkhead has not yet specified whether there is a cash floor (a minimum balance to prevent players from running out entirely), how vehicle costs compare to weapon costs, or whether any cash-earning multipliers exist for coordinated squad actions beyond the listed examples. These details may be addressed in future announcements.

Wardogs enters Steam Early Access on September 10, 2026, published by Team17 and developed by Bulkhead.`,
  },
  {
    slug: 'wardogs-roles-not-classes',
    headline: 'Wardogs roles are player-defined, not locked to preset classes',
    tags: ['wardogs', 'bulkhead', 'loadouts', 'progression', 'roles', 'early access'],
    source: 'TOP QUESTIONS',
    source_url: TOP_QUESTIONS_URL,
    body: `**No Class Lock: What Bulkhead Has Announced**

Wardogs will not assign players to fixed classes. According to Bulkhead's "WARDOGS - TOP QUESTIONS" post published on Steam on February 18, 2026, roles in the game are "totally player-defined." The mechanism behind that is loadout construction: players purchase specialist items to assemble a build rather than selecting a predefined archetype from a menu.

That is the full extent of what the source states about how role identity is established. Bulkhead does not specify in this post what specialist items are available, how they are priced, or what constraints -- if any -- exist on combining them.

**Progression Tied to Loadout Choices**

The same post connects loadout construction directly to progression. Bulkhead states that building a loadout earns XP across 6 progression tracks -- a figure presented here as a Bulkhead pre-launch number, subject to change as the game develops in Early Access.

The source does not specify what the 6 tracks are, how XP is distributed across them, or whether a given loadout advances all tracks simultaneously or only selected ones. Those details have not been published in this source.

**Examples Named in the Source**

Bulkhead's post uses "From Medic to Pilot" as illustrative examples of the range of playstyle a player can build toward. The source offers these two as endpoints of a spectrum; it does not provide a full list of specialist roles or confirm how many distinct build directions the item system supports.

**What Is and Is Not Clear**

To summarize what the source establishes and what it leaves open:

- Established: roles are player-defined through purchased specialist items, not selected from a fixed class list
- Established: loadouts generate XP across 6 progression tracks, per Bulkhead's pre-launch figures
- Established: Medic and Pilot are named examples of possible build directions
- Not yet detailed in this source: the full item catalog, any restrictions on loadout composition, how the 6 progression tracks are named or structured, and how XP is distributed between them

For players accustomed to games that hand you a role at the start of a match, the announced system represents a structural difference worth noting -- but how that difference plays out in practice remains untested and unpublished. Bulkhead may detail these systems further before or during Early Access.

Wardogs enters Steam Early Access on September 10, 2026, from Bulkhead and Team17.`,
  },
  {
    slug: 'wardogs-map-respawn',
    headline: 'Wardogs map and respawn design: travel time replaces timers',
    tags: ['wardogs', 'bulkhead', 'map design', 'respawn', 'control zone', 'early access'],
    // source_url NULL (operator call): the article's BULK is the Aug 11 respawn design
    // (name-only in-body, no supplied URL); Top Questions supplies only the minor map-
    // dimension line, so pointing the row at Top Questions would misrepresent what the
    // citation covers. Honest-null + name-only-in-body is the accurate call.
    source: 'AUG 11 DEVLOG',
    source_url: null,
    body: `**A 256km2 Map With a Roaming Objective**

According to the Bulkhead "WARDOGS - TOP QUESTIONS" post on Steam (18 Feb 2026), Wardogs places three teams inside a 256km2 map -- a figure Bulkhead presents as a pre-launch target that may shift as the game rebalances in Early Access. The active objective is not the full map but a randomized 2x2km area called the Control Zone, per that same source. The design is inspired by King of the Hill, meaning teams contest the same concentrated space rather than spreading across the full map simultaneously.

Because the Control Zone is randomized in placement, its position within the larger map will not be fixed from match to match. The Bulkhead "WARDOGS - TOP QUESTIONS" post does not specify how frequently the Control Zone moves, how many times it relocates per session, or what triggers a relocation -- those details are not yet covered in this source.

**Respawn as a Journey, Not a Countdown**

Bulkhead's August 11 devlog -- part of a "10 Reasons" breakdown -- describes the respawn system in terms of player-driven choices rather than a fixed timer. Three variables shape how quickly you return to the fight: where you choose to spawn, whether you use a vehicle, and which route you take back toward the Control Zone.

Travel time and the risk of the trip itself are framed by Bulkhead as the functional replacement for an arbitrary respawn countdown. The source does not describe what specific hazards exist along a return route, nor does it detail what vehicle types are available -- those specifics are not covered in this excerpt.

**Cash Balance Tied to Each Life**

The August 11 devlog connects the respawn loop to a persistent cash economy. Bulkhead states that the outcome of each life affects your running cash balance rather than resetting per match. This links the respawn decision directly to a financial consequence: the choices you make returning to the fight -- spawn location, vehicle, route -- sit alongside whatever economic result that life produced.

The source does not specify in this excerpt how exactly a life's outcome is calculated into the cash balance, or what the floor or ceiling of that balance is. Those details are not addressed here.

**What the Two Sources Cover Together**

Read alongside each other, the "WARDOGS - TOP QUESTIONS" post and the August 11 devlog sketch a structure where the large outer map (256km2, per Bulkhead's pre-launch figures) functions partly as the space players must navigate on the way back in. The randomized 2x2km Control Zone sets the destination; the return trip -- governed by player choice -- sets the pace and risk. How those two layers interact moment-to-moment during a live match remains undetailed in the available source material.

Wardogs enters Steam Early Access on September 10, 2026, from Bulkhead and Team17.`,
  },
  {
    slug: 'wardogs-monetization',
    headline: 'Wardogs monetization: no battle pass, no pay-to-win, one optional upgrade',
    tags: ['wardogs', 'bulkhead', 'monetization', 'early access', 'cosmetics', 'team17'],
    // source_url = Top Questions (operator call): the article leads with and is anchored by
    // the Top Questions "No Battlepass" material; store pricing is a trailing detail cited
    // in-body, so the row's URL grounds the lead/bulk, not the trailing pricing line.
    source: 'TOP QUESTIONS',
    source_url: TOP_QUESTIONS_URL,
    body: `**What Bulkhead Has Stated**

Bulkhead has published explicit monetization commitments for Wardogs ahead of its Early Access launch. The clearest statement comes from the Bulkhead "WARDOGS - TOP QUESTIONS" post on Steam, dated February 18, 2026: "No Battlepass. No Pay to Win. No Nikki Minaj Skins. No Bullshit. Earn cosmetics by playing."

That post is a single paragraph, but Bulkhead expanded on the specifics in its August 11 devlog, where the studio drew harder lines on three categories.

**The Three Stated Restrictions**

According to Bulkhead's August 11 devlog, the studio commits to the following:

- "We will NOT monetize the game at any point during Early Access."
- "We will NEVER monetize in-game cash or gold bars, they must be earned through play."
- "We will NEVER allow you to directly purchase camos..."

The devlog does not elaborate on what "directly purchase" means in practice beyond that phrasing, and the source does not specify whether indirect routes -- such as bundle rewards -- are addressed separately. These are stated pre-launch commitments; how they are maintained and enforced through Early Access is not detailed in either source.

**The One Stated Exception: Supporter Edition**

The single monetization option Bulkhead has announced is an optional Supporter Edition. Per the Wardogs Steam store page (Team17), this edition is listed at $49.99 as a one-time pre-order price, compared to the standard Early Access entry at $39.99 -- both figures are Bulkhead's stated pre-launch pricing and subject to change. The Supporter Edition is described as including the base game plus a Supporter Pack of limited cosmetics. The Steam store page does not specify which cosmetics are included in that pack beyond the "limited" designation.

The devlog frames this as a voluntary option for players who want to support development, not a recurring charge. No subscription, no seasonal pass structure, and no premium currency purchase option is mentioned in either source.

**What the Sources Do Not Yet Cover**

Neither the Top Questions post nor the August 11 devlog details what happens to these commitments after Early Access concludes. The sources do not specify whether a full-launch monetization model -- if any -- will differ from the Early Access stance. Bulkhead has not publicly addressed that question in the material available here.

The "earn cosmetics by playing" framing in the Top Questions post also leaves open how cosmetics are distributed in-game -- the sources do not yet specify earn rates, unlock structures, or what cosmetic categories exist beyond camos.

These are announced positions, not tested systems. Whether the studio's implementation matches its stated commitments will only be verifiable once players are inside the Early Access build.

Wardogs enters Steam Early Access on September 10, 2026, published by Team17.`,
  },
];

async function main() {
  loadEnvLocal();
  const dry = process.argv.indexOf('--dry') !== -1;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!dry && (!url || !key)) {
    console.error('ERROR: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY must be set (env or .env.local).');
    process.exit(1);
  }

  const rows = ARTICLES.map(function (a) {
    return {
      headline: a.headline,
      body: a.body,
      editor: 'NEXUS',
      source: a.source,
      source_url: a.source_url, // REAL url or null -- never synthesized
      tags: a.tags,
      ce_score: 0,
      is_published: false, // DRAFT -- owner-reviewed before publish (Track 2)
      noindex: true,        // defense-in-depth while unpublished
      thumbnail: null,
      slug: a.slug,
      game_slug: 'wardogs',
    };
  });

  console.log('Wardogs news persistence' + (dry ? ' (DRY -- no write)' : '') + '. Target: feed_items, game_slug=wardogs, is_published=FALSE (drafts).');
  console.log('');
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    console.log('  slug        : ' + r.slug);
    console.log('  headline    : ' + r.headline);
    console.log('  source      : ' + r.source + '   source_url: ' + (r.source_url || 'null (honest-null)'));
    console.log('  is_published: ' + r.is_published + '   game_slug: ' + r.game_slug + '   body chars: ' + r.body.length);
    console.log('');
  }

  if (dry) {
    console.log('DRY -- nothing written. Re-run without --dry to insert the 6 drafts (idempotent).');
    return;
  }

  const supabase = createClient(url, key);
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const existing = await supabase.from('feed_items').select('id').eq('slug', row.slug).eq('game_slug', 'wardogs').maybeSingle();
    if (existing.data) { console.log('SKIP (exists): ' + row.slug + '  id=' + existing.data.id); continue; }
    await logCoverageShadow(supabase, { source: 'wardogs-news', editor: row.editor, gameSlug: row.game_slug, headline: row.headline });
    const ins = await supabase.from('feed_items').insert(row).select('id, slug, is_published').maybeSingle();
    if (ins.error) console.error('FAIL: ' + row.slug + ' -> ' + ins.error.message);
    else console.log('INSERTED DRAFT: ' + ins.data.slug + '  id=' + ins.data.id + '  is_published=' + ins.data.is_published);
  }
  console.log('Done. All 6 are DRAFTS (is_published=false) -- publish is Track 2, after the route + sitemap + indexable flip.');
}

main();
