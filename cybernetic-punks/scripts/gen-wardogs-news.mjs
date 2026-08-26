// scripts/gen-wardogs-news.mjs
// ============================================================
// WARDOGS PRE-LAUNCH NEWS GENERATOR (NEXUS voice) -- DRY-RUN, HONEST-CITATION.
// ============================================================
// The confirmed-systems explainers for Wardogs (Bulkhead / Team17, Steam Early
// Access Sep 10 2026), grounded STRICTLY in primary-source Bulkhead/Team17
// excerpts that were operator-verified against primary in
// docs/wardogs-firstparty-VERIFIED.md.
//
// DELIBERATELY NOT the DMZ pattern's weakness: citations here are the REAL source
// URLs carried from the verified excerpts -- NEVER synthesized. When a source's
// real URL is not yet supplied, its url stays null (HONEST-NULL) and the article
// attributes the source BY NAME only; a fabricated/aggregator URL is never emitted.
//
// GROUNDING: each topic's `source` is the ONLY factual basis the model gets, pasted
// VERBATIM from the verified doc's exact-wording bullets. The struck aggregator
// inventions (the "5 fixed classes" list; any faction MECHANICAL asymmetry) are NOT
// in any excerpt, so the model structurally cannot state them. Numbers ($10,000,
// 256km2, 2x2km, 100 points, 6 tracks) are Bulkhead's STATED PRE-LAUNCH figures and
// stay FLAGGED per the doc's tiering (unverified-until-in-game; EA economies rebalance).
//
// DRY-RUN BY CONSTRUCTION: prints to stdout, writes NOTHING. Persistence (with
// is_published:FALSE, owner-reviewed) is a SEPARATE later step, after review.
//
// RUN:  node scripts/gen-wardogs-news.mjs                 (all topics)
//       node scripts/gen-wardogs-news.mjs cash-economy    (one topic by slug)
// Needs ANTHROPIC_API_KEY -- auto-loaded from .env.local if not already in env.

import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'node:fs';
import { ARTICLE_MODEL } from '../lib/models.js';

// --- minimal .env.local loader ------------------------------------------------
function loadEnvLocal() {
  if (process.env.ANTHROPIC_API_KEY) return;
  let raw;
  try {
    raw = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
  } catch (e) {
    return;
  }
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

// --- SOURCES: real labels from the verified doc; url is HONEST-NULL until the -----
// owner supplies the actual URL. A citation is a REAL url or nothing -- never invented.
// (docs/wardogs-firstparty-VERIFIED.md names these sources but carries no literal URLs.)
const SOURCES = {
  // Real URLs supplied + operator-verified against the live pages (2026-08-26).
  topQuestions: { label: 'Bulkhead "WARDOGS - TOP QUESTIONS" (Steam, 18 Feb 2026)', url: 'https://store.steampowered.com/news/app/1867240/view/496095152751771744' },
  steamStore:   { label: 'the Wardogs Steam store page (Team17)', url: 'https://store.steampowered.com/app/1867240/WARDOGS/' },
  // HONEST-NULL: the Aug 11 devlog URL was NOT supplied. Claims tracing to it (the
  // hardened monetization quotes; the travel-time respawn design) ship name-only, never
  // a synthesized URL. Supply a real URL here later to upgrade those citations.
  aug11:        { label: 'Bulkhead\'s August 11 devlog', url: null },
};

// --- the honesty-first NEXUS-Wardogs-news system prompt -----------------------
const SYSTEM_PROMPT = [
  'You are NEXUS -- the byline tag for Remi Okafor, meta-intelligence analyst for',
  'Cybernetic Punks (cyberneticpunks.com).',
  '',
  'Normally you cover a live competitive meta. THIS task is different, and the',
  'difference is the entire point: you are writing a PRE-LAUNCH NEWS article about',
  'WARDOGS, a competitive shooter from Bulkhead (published by Team17) that is NOT OUT',
  'YET -- it enters Steam Early Access on September 10, 2026. You have not played it.',
  'No first-party gameplay data exists. Everything you write is reporting on what the',
  'developers have OFFICIALLY STATED, sourced to Bulkhead/Team17 primary material.',
  '',
  'VOICE -- PRE-LAUNCH NEWS MODE (this overrides your usual analyst habit):',
  '- There is no played data here, so the interpretive analyst voice is OFF. You are a',
  '  clear, sharp NEWS reporter: summarize and organize what was announced. You do not',
  '  analyze how it will play, feel, or land.',
  '- Redirect any "what this means" instinct into STRUCTURAL clarity: how the announced',
  '  systems connect, what is genuinely new, and what the source has NOT yet detailed.',
  '- Confident about the FACTS, never about GAMEPLAY IMPACT. No hype, no slogans.',
  '',
  'HONESTY RULES -- ABSOLUTE:',
  '1. ANNOUNCED, NOT VERIFIED. Never call any detail "confirmed by hands-on", "tested",',
  '   or imply you have played it. The right framing is "Bulkhead states", "announced",',
  '   "according to the Top Questions post". You report the announcement; you do not',
  '   validate it.',
  '2. NO UNEARNED INTERPRETATION. Do NOT characterize how any mechanic will FEEL, play,',
  '   reward, punish, or pressure players -- none of it has been played. State what each',
  '   system IS and how it connects to the other announced systems; let the reader judge',
  '   how it will play. Hedge words ("suggests", "reads like") do NOT make an',
  '   interpretive claim acceptable -- cut the claim. Noting an open question honestly',
  '   ("the source does not specify X yet") is reporting, and is encouraged.',
  '3. STAY STRICTLY INSIDE THE EXCERPT. (a) ABSENCE-CLAIMS NEED SOURCE TOO -- you may',
  '   note "the source does not specify X" (a statement about THIS source), but never',
  '   assert a wider fact the excerpt does not establish. (b) DO NOT CLASSIFY OR DEFINE',
  '   BEYOND THE EXCERPT -- if the excerpt names a term or gives only examples, use it',
  '   exactly as given; do NOT add an unstated definition, list, or classification even',
  '   if it is "common knowledge." The test is "is this literally in the excerpt."',
  '4. ATTRIBUTE EXPLICITLY. At least once in the body, name the source in plain text --',
  '   e.g. "Bulkhead\'s Top Questions post" or "the Steam store page" -- so the reader',
  '   knows where these facts come from. Use the SOURCE LABEL given in the user message.',
  '5. THE EXCERPT IS THE ONLY UNIVERSE (the load-bearing rule). You may state ONLY facts',
  '   that are LITERALLY PRESENT in the SOURCE EXCERPT for THIS topic. For this article you',
  '   have NO other knowledge of Wardogs. This is ABSOLUTE, and it does NOT matter whether an',
  '   outside fact happens to be true:',
  '   - FORBIDDEN: any fact from ANOTHER Wardogs topic or the wider game that is not in THIS',
  '     excerpt. For example, do NOT name the factions (Lonestar / Valkyra / Manticore), do',
  '     NOT state the $10,000 starting cash, and do NOT state the number of progression tracks',
  '     UNLESS those exact names/figures appear in the excerpt above for THIS topic.',
  '   - FORBIDDEN: "well-known" or "common knowledge" facts about the game, and ANYTHING from',
  '     your training memory. A fact being true ELSEWHERE never licenses stating it here.',
  '   - The ONLY test is: do these exact words or figures appear in the excerpt above? If not,',
  '     they do not appear in this article -- state the gap honestly instead ("this topic\'s',
  '     source does not cover X"). Never fill a gap from outside the excerpt. Do not invent or',
  '     import numbers, names, mechanics, dates, factions, or tracks.',
  '6. FLAGGED NUMBERS. Any figure in the excerpt -- the $10,000 starting balance, the',
  '   256km2 map, the 2x2km Control Zone, the 100-point win condition, the 6 progression',
  '   tracks -- is Bulkhead\'s STATED PRE-LAUNCH figure. Present it as "Bulkhead states',
  '   X" or "X, per Bulkhead\'s pre-launch figures", NEVER as a verified or tested value,',
  '   and you may note these can change as the game rebalances in Early Access. Never',
  '   present a flagged number as settled fact.',
  '7. WRONG-GAME VOCABULARY IS BANNED. This is WARDOGS -- a different game from both',
  '   Marathon and DMZ. NEVER use Marathon terms ("Runner", "Cradle", "shell", "holotag",',
  '   "Grid Pulse") or DMZ / Call of Duty terms ("Operator", "FOB", "Hajin", "Deep Dive",',
  '   "exclusion zone"). Use Wardogs\' own vocabulary from the source (Control Zone, Hot',
  '   Zone, Kolchia, PV-1, Lonestar / Valkyra / Manticore).',
  '8. READER ADDRESS. Address the audience as "you" or "players". Do NOT label the reader',
  '   with an in-world noun.',
  '9. END WITH THE LAUNCH NOTE. Close with a brief, plain note that Wardogs enters Steam',
  '   Early Access on September 10, 2026, from Bulkhead and Team17.',
  '',
  'ARTICLE FORM:',
  '- 350-550 words. Use **HEADER TEXT** section breaks; at least 2-3 sections.',
  '- Body markdown is limited to **bold headers** and simple "- " bullet lists. No',
  '  horizontal rules, no code fences, no tables. Do NOT place a separator before the',
  '  launch-date close -- end the final paragraph, then the launch note on its own line.',
  '- Straight quotes only. No backticks, no curly quotes, no emoji.',
  '- Headline: lead with "Wardogs" + the primary searchable term in the first few words.',
  '  58 characters target, 65 hard cap; sentence or title case, never all-caps; no site',
  '  suffix. Any hook goes after a colon or dash.',
  '- Tags: 3-6 short lowercase search tags (e.g. "wardogs", "bulkhead", "cash economy").',
].join('\n');

// --- the plain news tool (NO meta_update, NO tier list) -----------------------
const NEWS_TOOL = {
  name: 'publish_wardogs_news',
  description: 'Publish a single Wardogs pre-launch news article (headline, body, tags). Plain news shape -- no tier ratings, no meta scoring.',
  input_schema: {
    type: 'object',
    properties: {
      headline: { type: 'string', description: 'Leads with "Wardogs" + the searchable term; 65 chars max (58 target); not all-caps; no site suffix.' },
      body: { type: 'string', description: '350-550 words. **HEADER** section breaks. Explicitly attributes facts to the named Bulkhead/Team17 source. Flags all numbers as Bulkhead pre-launch figures. Ends with the Sep 10 2026 EA launch note. Straight quotes only.' },
      tags: { type: 'array', items: { type: 'string' }, description: '3-6 short lowercase search tags.' },
    },
    required: ['headline', 'body', 'tags'],
  },
};

// --- TOPICS: each `source` is VERBATIM primary wording from the verified doc ----
// (docs/wardogs-firstparty-VERIFIED.md). `sources` lists which SOURCES key(s) the
// excerpt is drawn from -- carried into the article as REAL labels (+ url when supplied).
const TOPICS = [
  {
    slug: 'what-wardogs-is',
    name: 'What Wardogs actually is -- the three-team Control Zone',
    sources: ['topQuestions'],
    source: [
      'Inspired by King of the Hill, three teams fight for control of a randomized 2x2km "Control Zone" within a 256km2 map. The team with the most players within the Control Zone earns points - the first team to reach 100 points wins the match.',
      '',
      'Maximise profit in the "Hot Zone", a shifting sub-zone within the larger "Control Zone". Players count as double towards their player count, leading to match-swinging potential. The "Hot Zone" also yields DOUBLE CASH!',
      '',
      'Set in war-torn "Kolchia", WARDOGS centers on the fight for PV-1, a rare resource fuelling decades of Eurasian conflict.',
    ].join('\n'),
  },
  {
    slug: 'factions',
    name: 'The three factions -- Lonestar, Valkyra, Manticore',
    sources: ['topQuestions'],
    source: [
      'The three factions of WARDOGS:',
      '- LONESTAR: "The heavy-hitters in the Western paramilitary world."',
      '- VALKYRA: "Aims to return the Soviet People\'s Republic to greatness."',
      '- MANTICORE: "The Kingdom of Persia, Tehran\'s shadow army."',
      '',
      'Set in war-torn "Kolchia", WARDOGS centers on the fight for PV-1, a rare resource fuelling decades of Eurasian conflict.',
      '',
      '(The source gives these faction descriptions as narrative/lore only. It does NOT state that the factions differ mechanically -- no statement of different weapons, vehicles, abilities, or balance.)',
    ].join('\n'),
  },
  {
    slug: 'cash-economy',
    name: 'How the Wardogs cash economy works (FLAGSHIP)',
    sources: ['topQuestions', 'steamStore'],
    source: [
      '"Cash persists from match to match."',
      '',
      '"Each life, you purchase a custom loadout from a wide selection of weapons, gear, utility, and vehicles..."',
      '',
      '"Earn cash in the zone via teamplay actions. Revives, transport, kills, spotting, and MORE! Teamplay isn\'t encouraged, it\'s rewarded."',
      '',
      '"Every player starts their journey with $10,000." (a starting balance, once per account)',
    ].join('\n'),
  },
  {
    slug: 'roles-not-classes',
    name: 'Roles, not classes -- player-defined loadouts',
    sources: ['topQuestions'],
    source: [
      '"Roles are totally player-defined. Purchase specialist items to build your perfect loadout to earn XP across 6 progression tracks. From Medic to Pilot, create a loadout that suits your playstyle..."',
    ].join('\n'),
  },
  {
    slug: 'map-and-respawn',
    name: 'The map and the travel-time respawn design',
    sources: ['topQuestions', 'aug11'],
    source: [
      'Inspired by King of the Hill, three teams fight for control of a randomized 2x2km "Control Zone" within a 256km2 map.',
      '',
      'From Bulkhead\'s 11 August 2026 "10 Reasons" material, on respawns: respawn is driven by player choices (where you spawn, whether you take a vehicle, the route you pick). Travel time and the risk of the trip back replace an arbitrary respawn timer, and the outcome of a life hits your persistent cash balance rather than a per-match reset.',
    ].join('\n'),
  },
  {
    slug: 'monetization',
    name: 'Bulkhead\'s monetization promises',
    sources: ['topQuestions', 'aug11', 'steamStore'],
    source: [
      'From the Top Questions post: "No Battlepass. No Pay to Win. No Nikki Minaj Skins. No Bullshit. Earn cosmetics by playing."',
      '',
      'From the 11 August 2026 announcement: "We will NOT monetize the game at any point during Early Access." / "We will NEVER monetize in-game cash or gold bars, they must be earned through play." / "We will NEVER allow you to directly purchase camos..." The one stated exception is the optional Supporter Edition.',
      '',
      'On Steam: Supporter Edition is $49.99 (one-time, pre-order; base game plus a Supporter Pack of limited cosmetics). Standard Early Access is $39.99.',
    ].join('\n'),
  },
];

// --- generation ---------------------------------------------------------------
function sourceLine(topic) {
  return topic.sources.map(function (k) {
    var s = SOURCES[k];
    return '- ' + s.label + (s.url ? ' (' + s.url + ')' : ' (real URL not yet supplied -- attribute by name only)');
  }).join('\n');
}

function buildUserPrompt(topic) {
  return [
    'TOPIC: ' + topic.name,
    '',
    'SOURCE(S) -- attribute by these exact names in the body:',
    sourceLine(topic),
    '',
    'SOURCE EXCERPT -- this is the ONLY factual basis; do not state anything beyond it:',
    '',
    topic.source,
    '',
    'Write a single NEXUS pre-launch Wardogs news article on this topic, in your voice,',
    'obeying every honesty rule (flag all numbers as Bulkhead pre-launch figures). Call',
    'the publish_wardogs_news tool with the result.',
  ].join('\n');
}

async function generate(client, topic) {
  const message = await client.messages.create({
    model: ARTICLE_MODEL,
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    tools: [NEWS_TOOL],
    tool_choice: { type: 'tool', name: NEWS_TOOL.name },
    messages: [{ role: 'user', content: buildUserPrompt(topic) }],
  });
  let block = null;
  if (Array.isArray(message.content)) {
    block = message.content.find(function (b) { return b.type === 'tool_use' && b.name === NEWS_TOOL.name; });
  }
  if (!block) throw new Error('no tool_use block (stop_reason: ' + message.stop_reason + ')');
  return block.input;
}

function printArticle(topic, art) {
  const tags = Array.isArray(art.tags) ? art.tags.join(', ') : '';
  const cites = topic.sources.map(function (k) {
    var s = SOURCES[k];
    return '  - ' + s.label + '  ->  source_url: ' + (s.url ? s.url : 'null (HONEST-NULL -- real URL to be supplied by owner; never fabricated)');
  }).join('\n');
  const out = [
    '',
    '================================================================',
    'TOPIC SLUG : ' + topic.slug,
    'EDITOR     : NEXUS (Remi Okafor)',
    'GAME_SLUG  : wardogs   (intended feed_items stamp; is_published:FALSE on persist -- NOT written in dry-run)',
    '----------------------------------------------------------------',
    'GROUNDING EXCERPT (the ONLY factual basis the model was given):',
    topic.source,
    '----------------------------------------------------------------',
    'CITATION(S) carried into the article:',
    cites,
    '----------------------------------------------------------------',
    'HEADLINE   : ' + (art.headline || '(none)'),
    'TAGS       : ' + tags,
    '----------------------------------------------------------------',
    art.body || '(no body)',
    '================================================================',
  ].join('\n');
  console.log(out);
}

async function main() {
  loadEnvLocal();
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
  console.log('Wardogs pre-launch news generator -- DRY-RUN (no DB write).');
  console.log('Model: ' + ARTICLE_MODEL + '   Topics this run: ' + queue.map(function (t) { return t.slug; }).join(', '));
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  for (let i = 0; i < queue.length; i++) {
    try {
      const art = await generate(client, queue[i]);
      printArticle(queue[i], art);
    } catch (e) {
      console.error('[' + queue[i].slug + '] generation failed: ' + e.message);
    }
  }
  console.log('');
  console.log('DRY-RUN complete. Nothing was written to feed_items.');
  console.log('Citations carry REAL source labels; source_url stays HONEST-NULL until the owner');
  console.log('supplies the actual Bulkhead/Steam URLs -- a fabricated/aggregator URL is never emitted.');
}

main();
