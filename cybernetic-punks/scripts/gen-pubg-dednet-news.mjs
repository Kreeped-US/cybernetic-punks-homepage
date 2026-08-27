// scripts/gen-pubg-dednet-news.mjs
// ============================================================
// PUBG: DED.NET PRE-LAUNCH NEWS GENERATOR (NEXUS voice) -- DRY-RUN, GROUNDED + VALIDATED.
// ============================================================
// The FIRST generator built on the shared library (lib/generation/grounding.js, Phase 2a/2b-i).
// It grounds STRICTLY in docs/dednet-firstparty-VERIFIED.md: every topic's source is a VERBATIM
// excerpt hand-copied from that doc, and NO topic exists without its real excerpt (the structural
// no-excerpt guard refuses one). Each generated article is run through validateGrounding() and its
// flag report prints alongside the dry-run for owner review.
//
// TIERING (Fable Q2, enforced by the 4-tier source registry + the ATTRIBUTION TIERS rule):
//   - DIRECT first-party (Steam / ded.net / KRAFTON press release) -- stated plainly.
//   - ATTRIBUTED (PUBG Studios CD Dave Curd, via the Inven Global interview) -- surfaced attributed
//     ("PUBG Studios' Dave Curd told Inven Global..."), NEVER as anonymous first-party.
//   - SECONDARY (press-only, e.g. "Cult Church") -- NEVER stated as fact (AVOID-listed every run).
//   - UNKNOWN (release/beta date, 3 of 5 locations, full ROM roster, solo mode, price) -- honest-null.
//
// VERIFY-DON'T-INHERIT NOTE: "King of Killers" and the car-door / cannibalize / play-dead / hack-
// payphone tactics are BOTH first-party (verbatim Steam feature list) AND attributed (Curd). They
// are therefore NOT in the attributed-only terms list -- putting them there would false-flag the
// legitimately first-party Steam facts in topic 5. attributionCues are the distinctive "Curd" /
// "Inven Global" (NOT "PUBG Studios", which recurs in the close note and would neuter the check).
//
// DRY-RUN BY CONSTRUCTION: prints to stdout, writes NOTHING. Persistence (is_published:FALSE, owner-
// reviewed) and the indexable flip are SEPARATE later owner steps, after review.
//
// RUN:  node scripts/gen-pubg-dednet-news.mjs              (all topics)
//       node scripts/gen-pubg-dednet-news.mjs the-reveal   (one topic by slug)
// Needs ANTHROPIC_API_KEY -- auto-loaded from .env.local if not already in env.

import Anthropic from '@anthropic-ai/sdk';
import { ARTICLE_MODEL } from '../lib/models.js';
import {
  loadEnvLocal, makeNewsTool, buildSystemPrompt, buildUserPrompt, generate,
  makeSourceRegistry, resolveCitations, TIER, buildLaunchNote,
  guardExcerpt, validateGrounding, formatGroundingReport,
} from '../lib/generation/grounding.js';

// --- 4-TIER SOURCE REGISTRY (real URLs; terms + cues drive the validator) ------------
// Real URLs are the ones captured in docs/dednet-firstparty-VERIFIED.md. Attributed terms
// are the interview-EXCLUSIVE proper nouns/systems (things NOT also in a first-party excerpt).
const REGISTRY = makeSourceRegistry({
  steam: {
    label: 'the PUBG: DED.NET Steam store page (app 2726580)',
    url: 'https://store.steampowered.com/app/2726580/',
    tier: TIER.FIRST_PARTY, code: 'STEAM',
  },
  dednet: {
    label: 'the official ded.net site',
    url: 'https://ded.net',
    tier: TIER.FIRST_PARTY, code: 'DED.NET',
  },
  press: {
    label: 'the KRAFTON press release (gamescom ONL Press Room)',
    url: 'https://press.krafton.com/KRAFTON-SHOWCASES-FIVE-NEW-TITLES-AT-GAMESCOM-2026-OPENING-NIGHT-LIVE',
    tier: TIER.FIRST_PARTY, code: 'PRESS',
  },
  interview: {
    label: 'the Inven Global interview with PUBG Studios CD Dave Curd',
    url: 'https://www.invenglobal.com/articles/25264',
    tier: TIER.ATTRIBUTED,
    attribution: "PUBG Studios' Dave Curd told Inven Global",
    attributionCues: ['Curd', 'Inven Global', 'Inven'],
    code: 'INVEN',
    // interview-EXCLUSIVE distinctive terms (NOT also in a first-party excerpt):
    terms: [
      'ROMs', 'Peekaboo', 'Blade Hands', 'Creeper', 'Killer Vibes', 'boombox',
      'GRUNGEHOUSE', 'benefactors', 'mutant cousin', 'Power Gates', 'densest forest',
      'bartering your body', 'The Running Man', 'Richard Bachman', 'Wu-Tang',
      'Nine Inch Nails', 'Pixies',
    ],
  },
  // SECONDARY -- press-only, never grounded. url null (never emitted); term is leak-checked.
  cult: {
    label: 'the GamesBeat "Cult Church" mention (press-only, NOT in official primary)',
    tier: TIER.SECONDARY,
    terms: ['Cult Church'],
  },
  // UNKNOWN -- the honest-null list (open facts; no URL; render honest-null).
  releaseDate: { label: 'the release date (To be announced)', tier: TIER.UNKNOWN },
  betaDate: { label: 'the closed-beta date (unannounced)', tier: TIER.UNKNOWN },
  worldRest: { label: '3 of the 5 world locations (image-based / not text-captured)', tier: TIER.UNKNOWN },
  romRoster: { label: 'the full ROM (ability) roster', tier: TIER.UNKNOWN },
  soloMode: { label: 'a solo mode (tested internally; not confirmed)', tier: TIER.UNKNOWN },
  price: { label: 'the price / editions / exact store model', tier: TIER.UNKNOWN },
});

// Recurring known proper nouns (game/studio/editor/outlet/setting chrome) -- allowed so the
// proper-noun check does not false-flag the article's own furniture. NOT fabrication: these are
// established first-party entities that appear across articles (incl. the close note).
const ALLOW = [
  'PUBG: DED.NET', 'PUBG: DEDNET', 'PUBG:DEDNET', 'DED.NET', 'DEDNET', 'PUBG',
  'PUBG Studios', 'PUBG Madison', 'KRAFTON', 'NEXUS', 'Remi Okafor', 'Okafor',
  'Cascadia', 'gamescom', 'Opening Night Live', 'Steam', 'ded.net',
  'Inven Global', 'Dave Curd', 'Curd', 'Pacific Northwest',
  '2726580', // the real Steam app id -- rides in on the citation line; a first-party identifier, not a fabricated figure
];

// TBA close note -- built via the library's TBA path (null date => no fabricated digits).
// NOTE: the close deliberately says only "a closed beta is coming" (first-party: ded.net +
// the press release both state a closed beta). The "console-first" qualifier is ATTRIBUTED
// (Curd/Inven), so it is kept OUT of this global sign-off -- otherwise it seeds articles
// (e.g. the-reveal) with an attributed claim as bare fact. Articles that discuss console-first
// draw it from their own attributed excerpt.
const CLOSE_NOTE = buildLaunchNote({
  game: 'PUBG: DED.NET',
  date: null,
  releasePhrase: 'was revealed by PUBG Studios (KRAFTON) at gamescom Opening Night Live, with the release date still to be announced',
  revealedNote: 'A closed beta is coming.',
});

// --- SYSTEM PROMPT (shared skeleton + DED.NET params + 2 extra rules) -----------------
const SYSTEM_PROMPT = buildSystemPrompt({
  personaLines: [
    'You are NEXUS -- the byline tag for Remi Okafor, meta-intelligence analyst for',
    'Cybernetic Punks (cyberneticpunks.com).',
  ],
  introLines: [
    'Normally you cover a live competitive meta. THIS task is different, and the',
    'difference is the entire point: you are writing a PRE-LAUNCH NEWS article about',
    'PUBG: DED.NET, a multiplayer FPS with roguelite progression from PUBG Studios',
    '(published by KRAFTON) that is NOT OUT YET. It was revealed at gamescom Opening',
    'Night Live (August 25, 2026); a console-first closed beta is coming and the release',
    'date is To Be Announced. You have not played it. No first-party gameplay data exists.',
    'Everything you write is reporting on what the developers OFFICIALLY STATED (Steam /',
    'ded.net / the KRAFTON press release) or told an outlet on the record (the Inven',
    'Global interview) -- sourced accordingly.',
  ],
  gameLabel: 'PUBG: DED.NET',
  headlineLeadTerm: 'DED.NET',
  ownVocab: 'run, contestant, ROMs, Power Gates, blue zone, King of Killers, GRUNGEHOUSE, Cascadia, benefactors',
  bannedVocab: [
    'Marathon terms ("Runner", "Cradle", "shell", "holotag", "Grid Pulse")',
    'DMZ / Call of Duty terms ("Operator", "FOB", "Hajin", "Deep Dive", "exclusion zone")',
    'Wardogs terms ("Control Zone", "Hot Zone", "Kolchia", "PV-1", "Lonestar", "Valkyra", "Manticore")',
  ],
  attributeExample: "PUBG Studios' Dave Curd told Inven Global, or the Steam store page",
  tagExample: '"pubg dednet", "krafton", "roguelite"',
  extraRules: [
    {
      title: 'ATTRIBUTION TIERS (load-bearing for this game).',
      lines: [
        'DIRECT first-party facts (Steam store, ded.net, the KRAFTON press release) may be',
        'stated plainly. ATTRIBUTED material -- anything the SOURCE(S) block or the excerpt marks',
        'ATTRIBUTED, i.e. PUBG Studios Creative Director Dave Curd speaking to Inven Global -- MUST',
        'be surfaced attributed in-body ("PUBG Studios\' Dave Curd told Inven Global that..."), NEVER',
        'as anonymous first-party. If an excerpt block is labelled ATTRIBUTED, every fact drawn from',
        'it carries the attribution. NEVER state a SECONDARY / press-only item as fact.',
        'SPECIFIC PROVENANCE TRAP: the platform list (PC / PS5 / Xbox Series X|S) and the',
        '"console-first" rollout are ATTRIBUTED (they come from the interview), NOT store facts.',
        'Attribute them to Curd / Inven Global; do NOT credit PS5/Xbox/console-first to Steam or',
        'the press release, and do NOT state "console-first" as a bare fact.',
      ],
    },
    {
      title: 'RUN-LENGTH RANGE (never invent a number).',
      lines: [
        'The average run length is a RANGE the developer gave two ways in the same interview:',
        '"6 to 10" AND "8 to 12" matches. If you mention run length, present it as that sourced',
        'range (give both figures, attributed) and note it varies by wins/losses, injuries, and',
        'skill. NEVER invent a single clean number or a different range.',
      ],
    },
  ],
  launchNote: CLOSE_NOTE,
});

const NEWS_TOOL = makeNewsTool({
  name: 'publish_pubg_dednet_news',
  gameLabel: 'PUBG: DED.NET',
  closeHint: 'Ends with the exact TBA close note (no fabricated date).',
  headlineHint: 'Leads with "DED.NET" + the searchable term; 65 chars max (58 target); not all-caps; no site suffix.',
});

// --- TOPICS: each source is VERBATIM from docs/dednet-firstparty-VERIFIED.md --------
// sources = registry keys (drive the in-prompt citation/attribution lines). ATTRIBUTED
// excerpt blocks are labelled inline so the model attributes them.
const TOPICS = [
  {
    slug: 'the-reveal',
    name: 'The reveal -- what KRAFTON announced at gamescom ONL',
    sources: ['press', 'steam', 'dednet'],
    section: 'field-intel',
    source: [
      'FIRST-PARTY (state plainly):',
      '',
      'KRAFTON press release: "KRAFTON, Inc. today unveiled five upcoming titles during gamescom 2026 Opening Night Live... Opening Night Live took place on August 25, one day before gamescom 2026 officially opens." DED.NET "made its first public appearance during Opening Night Live."',
      '',
      'KRAFTON press release: "a new title in the PUBG franchise" / "a new PvP FPS from PUBG STUDIOS."',
      '',
      'Steam: "PUBG: DED.NET is a multi-player FPS with roguelite elements set in 1990\'s Cascadia."',
      '',
      'Steam store fields: Developer "PUBG Madison"; Publisher "KRAFTON, Inc." Steam: "RELEASE DATE: To be announced."',
      '',
      'ded.net: "Welcome to Cascadia." / "Pre-register for the PUBG: DED.NET Closed Beta" / "Sign in with your KRAFTON Player Account and pre-register for the closed beta waiting list." KRAFTON press release: "Players can now also register for the upcoming closed beta."',
      '',
      'Tagline (ded.net + Steam): "Death is Only the Beginning."',
    ].join('\n'),
  },
  {
    slug: 'the-run-and-roms',
    name: 'The run and ROMs -- the roguelite spine (ATTRIBUTED)',
    sources: ['interview'],
    section: 'systems',
    source: [
      'ATTRIBUTED -- PUBG Studios Creative Director Dave Curd, via the Inven Global interview. Attribute every fact below in-body ("PUBG Studios\' Dave Curd told Inven Global...").',
      '',
      'Curd: DED.NET is "not PUBG\'s twin brother, but its mutant cousin."',
      '',
      'Curd: "in DED.NET, every time you lose, you get one step closer to the perfect build" / "You\'re not just playing a match; you\'re doing a run."',
      '',
      'A run is "a continuous journey spanning multiple matches." You choose a contestant and set a rough character route (target archetype: support role, fire-cover role, or melee door-breaker).',
      '',
      'Run length: Curd gave BOTH "8 to 12" AND "6 to 10" matches as the average in the same interview. It varies by wins/losses, accumulated injuries, and player skill. A lost match is not a full reset.',
      '',
      'ROMs = chips plugged into the head to unlock new gameplay abilities. Examples: standard perks (faster reload speed, increased dive distance) up to radical choices (slither flat on your belly like a snake, turn into a small lethal doll, rip off a car door to use as a shield).',
      '',
      'Curd\'s personal example build: "Peekaboo" (reveals player outlines within 10 meters through walls/buildings) + "Blade Hands" (lethal close range) + a Hong-Kong-action dive/slide mobility skill + a boombox that heals himself and squadmates. Ambush example: "Creeper" (hide inside a refrigerator, peek through the door crack) + "Killer Vibes" (controller vibrates subtly when enemies are near). [Curd\'s illustrative examples -- NOT a full/verified ability roster.]',
      '',
      'Injuries accumulate every match -- e.g. cough in smoke, drop your weapon while reloading, greater penalties in water. "If too many pile up, your run ends."',
      '',
      'Loop: "You play matches, find ROMs, build power, manage damage, and extract before injuries finally catch up to you."',
    ].join('\n'),
  },
  {
    slug: 'match-structure',
    name: 'The match structure -- 60 players, 3-squads, five phases (ATTRIBUTED)',
    sources: ['interview'],
    section: 'systems',
    source: [
      'ATTRIBUTED -- PUBG Studios Creative Director Dave Curd, via the Inven Global interview. Attribute every fact below in-body.',
      '',
      '60 players per match, structured around 3-player squads. "It\'s more fun with friends, and three is the magic number." Squad size came from asymmetry playtests over two years: a 1v4 is virtually insurmountable, a 1v2 lacks excitement, a 1v3 offers slim odds without a predetermined outcome. Solo has been tested internally; considered if demand and player base support it.',
      '',
      'Initial blue zone 2.5x2.5 km; full map slightly over 5x5 km.',
      '',
      'Verticality (towering cliffs and low plains) and "the densest forest ever rendered in a battle royale" are cited as key differences from BATTLEGROUNDS.',
      '',
      'A single match lasts about 30 minutes for the final survivor.',
      '',
      'Curd told Inven Global it is an FPS, planned for PC, PS5, and Xbox Series X|S, with a console-first rollout (the camera perspective vs BATTLEGROUNDS is "fundamentally different"). These platform/console-first details are ATTRIBUTED to Curd -- not store facts.',
      '',
      'A match has five phases; at each phase milestone, abilities unlock simultaneously for all players (so a 5-ability vs 0-ability start cannot happen). There are no numerical stat-inflation abilities; abilities grant strategic opportunity, each with strengths and weaknesses.',
      '',
      'After a few phases the blue zone wanders (straying from the predictable circle shrink of traditional battle royales); players "won\'t know which district of Cascadia will be selected each game."',
      '',
      'Versus PUBG: BATTLEGROUNDS: 100 players (BATTLEGROUNDS) vs 60 (DED.NET). In BATTLEGROUNDS everyone starts identical; in DED.NET all 60 are at different run stages ("A player in their very first match can meet a player on their 12th match in the same lobby").',
    ].join('\n'),
  },
  {
    slug: 'grungehouse-setting',
    name: 'GRUNGEHOUSE -- the 1996 Cascadia setting and Dog-Eat-Dog tone',
    sources: ['press', 'steam', 'dednet', 'interview'],
    section: 'world',
    source: [
      'FIRST-PARTY (state plainly):',
      '',
      'KRAFTON press release: "Set in Cascadia in 1996, a fictional region inspired by the American Pacific Northwest, the game introduces a darker new setting for the PUBG franchise..."',
      '',
      'Steam: "PUBG: DED.NET is a multi-player FPS with roguelite elements set in 1990\'s Cascadia." Steam (tone): "Grunge Music. Body Horror. The Occult. DEDNET is a dark, dark place. But you\'ll never feel so alive, even when you die. You\'ll come back better..."',
      '',
      'ded.net (the one described world location, verbatim -- Cryptid Cove): "Dead-eyed fiberglass cryptids bear witness to the slaughter. Seek shelter deep within the Silly Hole."',
      '',
      'ATTRIBUTED -- PUBG Studios Creative Director Dave Curd, via the Inven Global interview. Attribute every fact below in-body:',
      '',
      'The era is framed as "\'90s decay, first reality shows, VHS, internet revolution, grindhouse movies, uncensored violence." Curd coined the tone term "GRUNGEHOUSE" = 1990s grunge culture fused with grindhouse films.',
      '',
      'DED.NET = "Dog Eat Dog." The objective is to chase the throne of "King of Killers" in an underworld where dog eats dog. The roguelite lore is "bartering your body for power"; no upgrades are reversible during a run.',
      '',
      'A dark-web reality-show framing: "benefactors" are viewers who intervene (the yellow telephone ringing at the trailer\'s start is a viewer trying to influence the field); relationships with viewers can decide victory or defeat. Influence cited: Stephen King\'s "The Running Man" (as Richard Bachman).',
      '',
      'Licensed era-defining music: Biggie (The Notorious B.I.G.), Wu-Tang Clan, Pixies, Nine Inch Nails -- rap stations and alternative/grunge stations, played through malls, dive bars, strip clubs, car radios, or an opponent\'s boombox.',
    ].join('\n'),
  },
  {
    slug: 'unorthodox-tactics',
    name: 'The confirmed unorthodox tactics (first-party, verbatim Steam)',
    sources: ['steam'],
    section: 'systems',
    source: [
      'FIRST-PARTY (Steam feature list, verbatim -- state plainly):',
      '',
      '"THE PATH TO DOMINANCE: Make your run through 1990s Cascadia to treat injuries, earn abilities, and outlast competitors to become the king of killers."',
      '',
      '"PLAYSTYLE FREEDOM: Mix and match dozens of abilities to build your own custom approach to combat."',
      '',
      '"UNORTHODOX TACTICS: Use car doors as riot shields, cannibalize enemies for health, play dead, or hack payphones to steal money from rivals."',
      '',
      '"GENRE-BENDING SURVIVAL: Multiplayer FPS combat with run-based roguelite progression."',
      '',
      '"DEATH IS ONLY THE BEGINNING: Every lost match feeds your next run - scavenge resources, retain progression, and evolve your build."',
    ].join('\n'),
  },
  {
    slug: 'confirmed-vs-unknown',
    name: 'What is confirmed vs still unknown -- the honest ledger (FLAGSHIP)',
    sources: ['steam', 'press', 'interview'],
    section: 'field-intel',
    source: [
      'CONFIRMED, DIRECT FIRST-PARTY (state plainly): PUBG: DED.NET is a multiplayer FPS with roguelite progression across runs, set in Cascadia (1996 per the KRAFTON press release; Steam says "1990\'s"), from PUBG Studios / KRAFTON. Release date: "To be announced" (Steam). A closed beta is open for pre-registration (ded.net). Tagline: "Death is Only the Beginning."',
      '',
      'CONFIRMED, ATTRIBUTED (PUBG Studios\' Dave Curd told Inven Global -- attribute in-body): the match is 60 players in 3-player squads, a single match runs about 30 minutes, five phases unlock abilities simultaneously, the blue zone starts 2.5x2.5 km on a map slightly over 5x5 km and later wanders. A run spans an average of "6 to 10" AND "8 to 12" matches (a range that varies). ROMs are chips plugged into the head. Monetization is expected cosmetics-only with no pay-to-win. Platforms: PC, PS5, Xbox Series X|S, console-first.',
      '',
      'STILL UNKNOWN -- honest-null, do NOT fill these in:',
      '- The release date. "To be announced": no window, no year (still TBA per the interview too).',
      '- The closed-beta date. A console-first closed beta is coming "following the Gamescom reveal," but no specific date is stated.',
      '- The full world. Five world locations exist on ded.net; only Cryptid Cove is described and one more ("Inside the City") is named -- the other 3 of 5 are image-based / not text-captured, names and descriptions unknown.',
      '- The full ROM (ability) roster. Curd gave only illustrative examples; the complete list, exact effects, counts, and how ROMs are found/slotted per phase are not specified.',
      '- The exact run length. It is a range that varies ("6 to 10" AND "8 to 12"), never a single fixed number.',
      '- A solo mode. Tested internally; "considered if demand and player base support it." Not confirmed.',
      '- The price / editions / exact store model. Cosmetics-only and no-P2W is stated (attributed); the actual price and editions are not.',
    ].join('\n'),
  },
];

// A global AVOID line so every prompt is warned off the secondary press term.
const GLOBAL_AVOID = resolveCitations(REGISTRY, ['cult']).avoidLines;

// --- generation ----------------------------------------------------------------------
async function generateOne(client, topic) {
  guardExcerpt(topic); // structural: refuse a topic with no excerpt (no source => no fabrication)
  const cites = resolveCitations(REGISTRY, topic.sources);
  const userPrompt = buildUserPrompt({
    topicName: topic.name,
    excerpt: topic.source,
    citationLines: cites.promptLines,
    avoidLines: GLOBAL_AVOID.concat(cites.avoidLines || []),
    toolName: NEWS_TOOL.name,
    writeGuidance: 'Write a single NEXUS pre-launch PUBG: DED.NET news article on this topic, in your voice, obeying every honesty rule and the attribution tiers. Call the ' + NEWS_TOOL.name + ' tool with the result.',
  });
  const art = await generate(client, { model: ARTICLE_MODEL, system: SYSTEM_PROMPT, tool: NEWS_TOOL, userPrompt: userPrompt, maxTokens: 2048 });
  return { art: art, cites: cites };
}

function printArticle(topic, result) {
  const art = result.art;
  const cites = result.cites;
  const tags = Array.isArray(art.tags) ? art.tags.join(', ') : '';
  const primary = cites.primary || { source: null, source_url: null };

  // The grounding validator -- flags body content not traceable to THIS topic's excerpt.
  const report = validateGrounding({ body: art.body || '', excerpt: topic.source, registry: REGISTRY, allow: ALLOW });

  const citeLines = (cites.promptLines || []).map(function (l) { return '  ' + l; }).join('\n');
  const out = [
    '',
    '================================================================',
    'TOPIC SLUG : ' + topic.slug + '   (intended section: ' + topic.section + ')',
    'EDITOR     : NEXUS (Remi Okafor)',
    'GAME_SLUG  : pubg-dednet   (intended feed_items stamp; is_published:FALSE on persist -- NOT written in dry-run)',
    '----------------------------------------------------------------',
    'CITATION(S) resolved:',
    citeLines || '  (none)',
    'ROW BINDING (intended): source=' + (primary.source || 'null') + '   source_url=' + (primary.source_url || 'null (honest-null)'),
    '----------------------------------------------------------------',
    'HEADLINE   : ' + (art.headline || '(none)'),
    'TAGS       : ' + tags,
    '----------------------------------------------------------------',
    art.body || '(no body)',
    '----------------------------------------------------------------',
    formatGroundingReport(report, topic.slug),
    '================================================================',
  ].join('\n');
  console.log(out);
}

async function main() {
  loadEnvLocal(import.meta.url);
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ERROR: ANTHROPIC_API_KEY not set (not in env, not in .env.local).');
    process.exit(1);
  }
  const only = process.argv[2] ? process.argv[2].toLowerCase() : null;
  const queue = only ? TOPICS.filter(function (t) { return t.slug === only; }) : TOPICS;
  if (only && queue.length === 0) {
    console.error('Unknown topic slug: ' + only + '. Known: ' + TOPICS.map(function (t) { return t.slug; }).join(', '));
    process.exit(1);
  }

  console.log('PUBG: DED.NET pre-launch news generator -- DRY-RUN (no DB write).');
  console.log('Model: ' + ARTICLE_MODEL + '   Grounding: docs/dednet-firstparty-VERIFIED.md');
  console.log('Topics this run: ' + queue.map(function (t) { return t.slug; }).join(', '));

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  for (let i = 0; i < queue.length; i++) {
    try {
      const result = await generateOne(client, queue[i]);
      printArticle(queue[i], result);
    } catch (e) {
      console.error('[' + queue[i].slug + '] generation failed: ' + e.message);
    }
  }

  console.log('');
  console.log('DRY-RUN complete. Nothing was written to feed_items; indexable NOT flipped.');
  console.log('Grounding flags are a review ASSIST (they do not block) -- a human reviews every article.');
  console.log('Attributed material (Curd / Inven Global) must read attributed; secondary ("Cult Church") must not appear;');
  console.log('the UNKNOWN list stays honest-null. Persistence (is_published:FALSE) + the indexable flip are separate owner steps.');
}

main();
