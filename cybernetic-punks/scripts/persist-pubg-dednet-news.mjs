// scripts/persist-pubg-dednet-news.mjs
// ============================================================
// Persist the SIX dry-run-reviewed PUBG: DED.NET pre-launch articles into feed_items
// (game_slug='pubg-dednet') AS DRAFTS (is_published=FALSE). Same frozen-persister pattern as
// persist-wardogs-news.mjs / persist-dmz-news.mjs: the article TEXT below is FROZEN -- it is the
// gen-pubg-dednet-news.mjs dry-run output (the post-attribution-fix run, generator commit
// a9ee2ed) that the owner reviews. This script does NOT call the generator.
//
// >>> OWNER CONFIRMATION REQUIRED BEFORE RUNNING <<<
// Dry-runs are NON-DETERMINISTIC: re-running the generator will NOT reproduce these bodies
// byte-for-byte. THIS persister is now the source of truth for the shipped text. Re-read each
// frozen body below and confirm it matches the approved dry-run before running the write.
//
// DRAFTS, NOT PUBLISHED: is_published=FALSE + noindex=TRUE (defense-in-depth while unpublished).
// pubg-dednet.indexable is still FALSE and DEDNET_ARTICLE_SECTION (lib/games/pubg-dednet.js) is
// still empty, so publishing now would create indexed-but-unroutable pages. These wait as
// owner-reviewed drafts. GO-LIVE (separate step): populate DEDNET_ARTICLE_SECTION with the 6
// slug->section entries below, then flip indexable:true.
//
// SOURCE_URL BINDING: NOT hand-picked. Each row's source_url is derived by the shared grounding
// library's resolveCitations() from the article's tier-ordered sources -- first-party (Steam /
// ded.net / KRAFTON press) outranks attributed (Curd / Inven), so a mixed-grounding row binds to
// its first-party URL, and an attributed-only row (the two interview pieces) binds to the Inven
// URL, attributed. A citation is a REAL url or null -- never synthesized.
//
// IDEMPOTENT: explicit deterministic slugs; skips any slug already present for
// game_slug='pubg-dednet' -- safe to re-run.
//
// WRITES TO THE DB (service key). The OWNER runs it (not the generator, not Claude):
//   node scripts/persist-pubg-dednet-news.mjs            (insert any missing of the 6 as DRAFTS)
//   node scripts/persist-pubg-dednet-news.mjs --dry      (print the PLAN -- writes nothing)

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { logCoverageShadow } from '../lib/coverageShadow.js';
import { makeSourceRegistry, resolveCitations, TIER } from '../lib/generation/grounding.js';

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

// 4-tier registry -- a FROZEN copy of the citable sources from gen-pubg-dednet-news.mjs. Only the
// citable tiers are needed here (source_url binding); secondary/unknown never bind a row.
const REGISTRY = makeSourceRegistry({
  steam: { label: 'the PUBG: DED.NET Steam store page (app 2726580)', url: 'https://store.steampowered.com/app/2726580/', tier: TIER.FIRST_PARTY, code: 'STEAM' },
  dednet: { label: 'the official ded.net site', url: 'https://ded.net', tier: TIER.FIRST_PARTY, code: 'DED.NET' },
  press: { label: 'the KRAFTON press release (gamescom ONL Press Room)', url: 'https://press.krafton.com/KRAFTON-SHOWCASES-FIVE-NEW-TITLES-AT-GAMESCOM-2026-OPENING-NIGHT-LIVE', tier: TIER.FIRST_PARTY, code: 'PRESS' },
  interview: { label: 'the Inven Global interview with PUBG Studios CD Dave Curd', url: 'https://www.invenglobal.com/articles/25264', tier: TIER.ATTRIBUTED, attribution: "PUBG Studios' Dave Curd told Inven Global", attributionCues: ['Curd', 'Inven Global', 'Inven'], code: 'INVEN' },
});

// The 4 valid DED.NET section slugs (lib/games/pubg-dednet.js sections). section is NOT a
// feed_items column -- it drives DEDNET_ARTICLE_SECTION (slug->section) at go-live + the
// intended /pubg-dednet/<section>/<slug> path. Carried here per record for that mapping.
const VALID_SECTIONS = ['field-intel', 'systems', 'world', 'arsenal'];

// ---------------------------------------------------------------------------
// THE 6 FROZEN, REVIEWED ARTICLES. Bodies are the exact reviewed dry-run text.
// sources = the tier-ordered grounding keys; source_url is derived from them (not hand-set).
// ---------------------------------------------------------------------------
const ARTICLES = [
  {
    slug: "dednet-the-reveal",
    section: "field-intel",
    sources: ['press', 'steam', 'dednet'],
    headline: "DED.NET revealed at gamescom ONL: PUBG Studios' new roguelite FPS",
    tags: ["pubg dednet", "krafton", "roguelite", "gamescom", "pubg studios", "closed beta"],
    body: `**The Announcement**

PUBG: DED.NET made its first public appearance on August 25, 2026, during gamescom Opening Night Live -- one day before gamescom 2026 officially opened. According to the KRAFTON press release (gamescom ONL Press Room), the title was one of five upcoming games KRAFTON unveiled at the event. The press release describes it as "a new title in the PUBG franchise" and "a new PvP FPS from PUBG STUDIOS."

The PUBG: DED.NET Steam store page (app 2726580) lists the developer as PUBG Madison and the publisher as KRAFTON, Inc. The release date is listed simply as "To be announced."

**What Has Been Announced**

The Steam store page describes PUBG: DED.NET as "a multi-player FPS with roguelite elements set in 1990's Cascadia." That is the full genre and setting description currently available from first-party sources. The official ded.net site opens with the line "Welcome to Cascadia" and carries the tagline "Death is Only the Beginning" -- a phrase also present on the Steam store page.

Beyond the genre description, the Steam store page and press release do not yet detail specific systems, progression mechanics, or modes. The ded.net site and Steam page do not currently specify map count, player counts per match, or how the roguelite elements interact with the multiplayer structure.

**Closed Beta and Pre-Registration**

Pre-registration for a closed beta is open now. The KRAFTON press release states: "Players can now also register for the upcoming closed beta." The official ded.net site instructs players to "Sign in with your KRAFTON Player Account and pre-register for the closed beta waiting list." No start date for the closed beta has been announced through these first-party sources.

Players can pre-register directly at ded.net. The Steam store page is live at store.steampowered.com/app/2726580/ and can be added to wishlists.

**What Is Not Yet Detailed**

The first-party sources available at reveal do not specify platforms, a launch window beyond "To be announced," or any details about modes, settings customization, or the scope of the roguelite progression. Those details have not been provided by the KRAFTON press release, the Steam store page, or the official ded.net site as of the gamescom ONL reveal.

PUBG: DED.NET was revealed by PUBG Studios (KRAFTON) at gamescom Opening Night Live, with the release date still to be announced. A closed beta is coming.`,
  },
  {
    slug: "dednet-the-run-and-roms",
    section: "systems",
    sources: ['interview'],
    headline: "DED.NET runs and ROMs: the roguelite spine explained",
    tags: ["pubg dednet", "krafton", "roguelite", "roms", "run progression", "dave curd"],
    body: `**What a Run Actually Is**

PUBG: DED.NET does not organize play around individual matches. According to PUBG Studios' Dave Curd, speaking to Inven Global, a run is "a continuous journey spanning multiple matches" -- the unit of progression that holds everything else together. Before a run begins, you choose a contestant and set a rough character route toward a target archetype: a support role, a fire-cover role, or a melee door-breaker. Each subsequent match inside that run builds on the last.

Curd framed the design against PUBG directly: DED.NET is "not PUBG's twin brother, but its mutant cousin." The distinction he drew is structural. In a traditional PUBG match, a loss ends the session. Here, Curd told Inven Global, "every time you lose, you get one step closer to the perfect build" -- a lost match is not a full reset.

**How Long a Run Lasts**

Curd gave two figures for average run length in the same Inven Global interview: "8 to 12" matches and "6 to 10" matches. He noted the range shifts based on wins and losses, injuries accumulated along the way, and player skill. The source does not specify which figure applies to which conditions, only that both represent the developer's stated expectation.

**ROMs: Chips That Change How You Play**

ROMs are chips plugged into the head that unlock new gameplay abilities. Curd's examples to Inven Global span a wide band: standard perks such as faster reload speed and increased dive distance sit alongside what he called more radical choices -- slithering flat on your belly like a snake, turning into a small lethal doll, or ripping off a car door to use as a shield.

Curd illustrated how ROMs combine through two example builds. The first pairs "Peekaboo" -- which reveals player outlines within 10 meters through walls and buildings -- with "Blade Hands" for lethal close range, a Hong-Kong-action dive/slide mobility skill, and a boombox that heals himself and squadmates. The second pairs "Creeper" -- hiding inside a refrigerator and peeking through the door crack -- with "Killer Vibes," which makes a controller vibrate subtly when enemies are nearby. Curd offered these as illustrative examples; the source does not present them as a complete or final ability roster.

**Injuries and the Run's End**

Injuries accumulate across every match inside a run. Curd described specific examples to Inven Global: coughing in smoke, dropping a weapon while reloading, and taking greater penalties in water. "If too many pile up," he said, "your run ends." The overall loop, as Curd summarized it: "You play matches, find ROMs, build power, manage damage, and extract before injuries finally catch up to you." The source does not yet specify how injury severity is tracked or displayed between matches.

PUBG: DED.NET was revealed by PUBG Studios (KRAFTON) at gamescom Opening Night Live, with the release date still to be announced. A closed beta is coming.`,
  },
  {
    slug: "dednet-match-structure",
    section: "systems",
    sources: ['interview'],
    headline: "DED.NET match structure: 60 players, 5 phases, wandering blue zone",
    tags: ["pubg dednet", "krafton", "roguelite", "battle royale", "match structure", "blue zone"],
    body: `**60 Players, 3-Player Squads**

PUBG Studios' Dave Curd told Inven Global that each PUBG: DED.NET match fields 60 players organized into 3-player squads. The squad size was not arbitrary. According to Curd, asymmetry playtests conducted over two years shaped the decision: a 1v4 situation proved virtually insurmountable, a 1v2 lacked excitement, and a 1v3 offered slim odds without a predetermined outcome. "It's more fun with friends, and three is the magic number," Curd said. Curd also told Inven Global that solo play has been tested internally and is being considered if demand and the player base support it -- though the source does not specify a timeline or commitment for that mode.

**Five Phases and Simultaneous Ability Unlocks**

Curd described a match structure divided into five phases. At each phase milestone, abilities unlock simultaneously for all 60 players -- meaning, as Curd framed it, a situation where one contestant has five abilities while another has zero cannot occur. He noted that abilities grant strategic opportunity, each carrying strengths and weaknesses, and that none of them involve numerical stat inflation. The source does not detail the specific abilities or what triggers each phase milestone.

**The Blue Zone and the Map**

According to the Inven Global interview, the initial blue zone covers 2.5x2.5 km, while the full map runs slightly over 5x5 km. After a few phases, the blue zone begins to wander rather than follow a predictable circle shrink. Curd stated that players "won't know which district of Cascadia will be selected each game," making zone positioning a variable that shifts from match to match. A single match lasts approximately 30 minutes for the final survivor, per Curd.

Curd also cited the map's verticality -- towering cliffs and low plains -- and what he described as "the densest forest ever rendered in a battle royale" as key points of difference from BATTLEGROUNDS.

**How DED.NET Differs from BATTLEGROUNDS**

Curd drew a direct comparison to PUBG: BATTLEGROUNDS for context. BATTLEGROUNDS seats 100 players who all start on identical footing. DED.NET seats 60, but because it carries roguelite progression across runs, all 60 contestants in a given lobby can be at different stages of their campaign. Curd put it plainly: "A player in their very first match can meet a player on their 12th match in the same lobby." The source does not detail how that cross-run asymmetry interacts with the simultaneous phase-based ability unlocks within a single match.

Curd told Inven Global that PUBG: DED.NET is an FPS -- a camera perspective he described as "fundamentally different" from BATTLEGROUNDS -- and that the game is planned for PC, PS5, and Xbox Series X|S, with a console-first rollout. Those platform and rollout details are attributed to Curd via that interview.

PUBG: DED.NET was revealed by PUBG Studios (KRAFTON) at gamescom Opening Night Live, with the release date still to be announced. A closed beta is coming.`,
  },
  {
    slug: "dednet-grungehouse-setting",
    section: "world",
    sources: ['press', 'steam', 'dednet', 'interview'],
    headline: "DED.NET GRUNGEHOUSE: Cascadia 1996 setting and Dog-Eat-Dog tone detailed",
    tags: ["pubg dednet", "grungehouse", "cascadia", "krafton", "roguelite", "king of killers"],
    body: `**What Has Been Announced**

PUBG: DED.NET is set in Cascadia, a fictional region inspired by the American Pacific Northwest, in 1996. The KRAFTON press release (gamescom ONL Press Room) describes it as "a darker new setting for the PUBG franchise." The Steam store page (app 2726580) carries a short tone statement: "Grunge Music. Body Horror. The Occult. DEDNET is a dark, dark place. But you'll never feel so alive, even when you die. You'll come back better..."

The official ded.net site offers one described world location -- Cryptid Cove -- in its own language: "Dead-eyed fiberglass cryptids bear witness to the slaughter. Seek shelter deep within the Silly Hole."

**GRUNGEHOUSE and the Dog-Eat-Dog Premise**

PUBG Studios Creative Director Dave Curd told Inven Global that the studio coined a specific tone term for the game: "GRUNGEHOUSE" -- his word for 1990s grunge culture fused with grindhouse films. He framed the era itself as "'90s decay, first reality shows, VHS, internet revolution, grindhouse movies, uncensored violence."

Curd told Inven Global that DED.NET stands for "Dog Eat Dog," and the central objective is chasing the throne of "King of Killers" in an underworld built on that premise. The roguelite lore, as he described it, is "bartering your body for power," with no upgrades reversible during a run. The source does not specify which upgrade types or body modifications are available beyond that framing.

**The Reality-Show Layer and Licensed Music**

Curd told Inven Global that the game is framed as a dark-web reality show, with "benefactors" acting as viewers who can intervene in the field. He cited the yellow telephone ringing at the trailer's start as a viewer trying to influence the match, and said that relationships with those benefactors can decide victory or defeat. He named Stephen King's "The Running Man" (published as Richard Bachman) as an influence on this structure.

On audio, Curd told Inven Global that the game features licensed era-defining music -- naming The Notorious B.I.G. (Biggie), Wu-Tang Clan, Pixies, and Nine Inch Nails -- across rap stations and alternative/grunge stations. He described that music playing through malls, dive bars, strip clubs, car radios, or an opponent's boombox. The source does not detail the full licensed catalog or specify how stations are selected during a run.

**What Remains Unspecified**

The KRAFTON press release and Steam store page establish the Cascadia setting and tone broadly but do not elaborate on the benefactor system, music mechanics, or the GRUNGEHOUSE term -- those details come exclusively from the Inven Global interview with Curd. The source does not yet specify how many world locations beyond Cryptid Cove will be named or described at launch.

PUBG: DED.NET was revealed by PUBG Studios (KRAFTON) at gamescom Opening Night Live, with the release date still to be announced. A closed beta is coming.`,
  },
  {
    slug: "dednet-unorthodox-tactics",
    section: "systems",
    sources: ['steam'],
    headline: "DED.NET unorthodox tactics: car doors, cannibalism, and payphone hacks",
    tags: ["pubg dednet", "krafton", "roguelite", "unorthodox tactics", "cascadia", "pre-launch"],
    body: `**What the Steam Page Lists**

The PUBG: DED.NET Steam store page (app 2726580) has published its feature list ahead of launch, and one section in particular stands out for its specificity. Under the heading "UNORTHODOX TACTICS," the store page lists four distinct actions players can take during a run:

- Use car doors as riot shields
- Cannibalize enemies for health
- Play dead
- Hack payphones to steal money from rivals

These are not described in the excerpt as passive perks or random events -- the store page presents them as deliberate actions available to players navigating 1990s Cascadia. The source does not specify whether these are tied to particular abilities, items, or conditions, or whether they are available by default at all times.

**How These Connect to the Announced Systems**

The Steam store page organizes its feature list around several interlocking concepts. "PLAYSTYLE FREEDOM" promises players the ability to "mix and match dozens of abilities to build your own custom approach to combat." The unorthodox tactics section sits alongside that framing, though the store page does not explicitly state which tactics are ability-gated and which are open to any contestant at any time.

The store page also details a broader survival loop under "DEATH IS ONLY THE BEGINNING": every lost match is described as feeding your next run, with players able to "scavenge resources, retain progression, and evolve your build." The overall goal, per the "PATH TO DOMINANCE" section, is to "make your run through 1990s Cascadia to treat injuries, earn abilities, and outlast competitors to become the king of killers."

The store page frames the game's genre as "multiplayer FPS combat with run-based roguelite progression" -- its own words under "GENRE-BENDING SURVIVAL." The source does not detail how the four listed unorthodox tactics interact with that roguelite layer specifically, or whether they carry any cross-run progression implications.

**What Is Not Yet Detailed**

The Steam store page names these four tactics but does not elaborate on mechanics, cooldowns, resource costs, or unlock requirements for any of them. It does not clarify, for example, whether "cannibalize enemies for health" is situational, ability-dependent, or universally available. It does not specify how much money a successful payphone hack yields or how rival contestants are affected. These open questions remain unaddressed in the current store listing.

The source also does not connect any of the four tactics to named ability categories or describe how "mix and match" ability building intersects with accessing them. Players looking for that level of detail will need to wait for further official disclosure.

PUBG: DED.NET was revealed by PUBG Studios (KRAFTON) at gamescom Opening Night Live, with the release date still to be announced. A closed beta is coming.`,
  },
  {
    slug: "dednet-confirmed-vs-unknown",
    section: "field-intel",
    sources: ['steam', 'press', 'interview'],
    headline: "DED.NET confirmed vs unknown: the honest pre-launch ledger",
    tags: ["pubg dednet", "krafton", "roguelite", "pre-launch", "gamescom 2026", "fps"],
    body: `**What We Know**

PUBG: DED.NET is a multiplayer FPS with roguelite progression across runs, set in Cascadia in the 1990s -- the KRAFTON press release (gamescom ONL Press Room) places the setting in 1996, while the PUBG: DED.NET Steam store page (app 2726580) uses the broader label "1990's." The game is developed by PUBG Studios and published by KRAFTON. The studio's tagline, carried on the Steam page, is "Death is Only the Beginning." A closed beta is open for pre-registration at ded.net; the release date is listed as "To be announced."

**What the Developer Has Detailed -- and Who Said It**

PUBG Studios' Dave Curd told Inven Global that a single match seats 60 players in 3-player squads, lasts roughly 30 minutes, and moves through five phases that unlock abilities simultaneously across all contestants. The blue zone opens at 2.5x2.5 km on a map slightly over 5x5 km and later wanders -- a structural detail Curd provided directly. ROMs are chips plugged into the head that grant those abilities; Curd offered illustrative examples of what ROMs can do but did not specify the complete roster, exact counts, or the precise mechanics of how ROMs are found or slotted per phase. A full run spans an average Curd described two ways in the same interview: "6 to 10" matches and "8 to 12" matches, a range he noted varies depending on wins, losses, injuries, and skill. On monetization, Curd told Inven Global that the expectation is cosmetics-only with no pay-to-win; the actual price, editions, and store model have not been stated. On platforms, Curd told Inven Global the game is targeting PC, PS5, and Xbox Series X|S, with a console-first rollout planned.

**What Remains Unspecified**

Several material gaps are worth naming plainly, because the sources do not fill them:

- **Release date and beta date.** Both are TBA. The closed beta is described as coming following the gamescom reveal; no specific date is given.
- **The full world.** Five locations exist on ded.net. Of those, Cryptid Cove is described and one additional location ("Inside the City") is named in the available material; the remaining three are represented by images only -- names and descriptions are not captured in any primary source reviewed here.
- **The complete ROM roster.** The Inven Global interview contains examples, not a full list. Exact effects, total count, and per-phase slotting rules are not specified.
- **Run length as a fixed number.** The developer gave a range -- twice -- and flagged that it varies. There is no single confirmed match count per run.
- **Solo mode.** Curd told Inven Global it has been tested internally and is "considered if demand and player base support it." It is not confirmed.
- **Price and editions.** Not announced in any primary source reviewed here.

The honest read on this announcement is straightforward: the core loop structure and session scale are detailed; ability systems and world scope are outlined with examples; and the commercial and scheduling specifics have not yet been shared.

PUBG: DED.NET was revealed by PUBG Studios (KRAFTON) at gamescom Opening Night Live, with the release date still to be announced. A closed beta is coming.`,
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
    if (VALID_SECTIONS.indexOf(a.section) === -1) throw new Error('bad section for ' + a.slug + ': ' + a.section);
    const primary = resolveCitations(REGISTRY, a.sources).primary; // tier-priority bind (first-party > attributed)
    return {
      headline: a.headline,
      body: a.body,
      editor: 'NEXUS',
      source: primary.source,
      source_url: primary.source_url, // REAL url or null -- derived by tier, never synthesized
      tags: a.tags,
      ce_score: 0,
      is_published: false, // DRAFT -- owner-reviewed before publish
      noindex: true,        // defense-in-depth while unpublished
      thumbnail: null,
      slug: a.slug,
      game_slug: 'pubg-dednet',
    };
  });

  console.log('PUBG: DED.NET news persistence' + (dry ? ' (DRY -- no write)' : '') + '. Target: feed_items, game_slug=pubg-dednet, is_published=FALSE (drafts).');
  console.log('');
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const a = ARTICLES[i];
    console.log('  slug        : ' + r.slug + '   -> /pubg-dednet/' + a.section + '/' + r.slug);
    console.log('  headline    : ' + r.headline);
    console.log('  source      : ' + r.source + '   source_url: ' + (r.source_url || 'null (honest-null)'));
    console.log('  is_published: ' + r.is_published + '   game_slug: ' + r.game_slug + '   body chars: ' + r.body.length);
    console.log('');
  }

  if (dry) {
    console.log('DRY -- nothing written. Re-run without --dry to insert the 6 drafts (idempotent).');
    console.log('GO-LIVE reminder: add these slug->section entries to DEDNET_ARTICLE_SECTION, then flip indexable:true.');
    return;
  }

  const supabase = createClient(url, key);
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const existing = await supabase.from('feed_items').select('id').eq('slug', row.slug).eq('game_slug', 'pubg-dednet').maybeSingle();
    if (existing.data) { console.log('SKIP (exists): ' + row.slug + '  id=' + existing.data.id); continue; }
    await logCoverageShadow(supabase, { source: 'pubg-dednet-news', editor: row.editor, gameSlug: row.game_slug, headline: row.headline });
    const ins = await supabase.from('feed_items').insert(row).select('id, slug, is_published').maybeSingle();
    if (ins.error) console.error('FAIL: ' + row.slug + ' -> ' + ins.error.message);
    else console.log('INSERTED DRAFT: ' + ins.data.slug + '  id=' + ins.data.id + '  is_published=' + ins.data.is_published);
  }
  console.log('Done. All 6 are DRAFTS (is_published=false). Publish + indexable flip are separate owner steps after review.');
}

main();
