// scripts/gen-dmz-news.mjs
// ============================================================
// PARALLEL DMZ PRE-LAUNCH NEWS GENERATOR (NEXUS voice) -- DRY-RUN.
// ============================================================
// A small, FULLY ISOLATED generation path for a handful of DMZ pre-launch NEWS
// articles, hand-fed from the official MW4 DMZ Deep Dive blog. Per the
// NEXUS-writes-DMZ investigation this deliberately does NOT reuse the Marathon
// editor machinery, so Marathon coupling cannot leak in:
//   - NO callEditor / EDITOR_PROMPTS / EDITOR_TOOLS  (those carry the Marathon
//     voice + the publish_meta_intel tier-list tool)
//   - NO fetchGameContext                            (injects Marathon stat data)
//   - NO getGameConfig                               (throws on 'dmz' anyway)
//   - NO gather pipeline, NO cron, NO Supabase write
// It reuses ONLY: the Anthropic SDK + ARTICLE_MODEL (single-source model string).
//
// These are NEWS articles: they report what Call of Duty OFFICIALLY ANNOUNCED in
// the Deep Dive, explicitly sourced -- NOT first-party verified intel (DMZ is not
// out; no first-party data can exist yet). The system prompt enforces that honesty.
//
// DRY-RUN BY CONSTRUCTION: this prints the generated articles to stdout for owner
// review. It writes NOTHING to feed_items. Persistence is Part 2, behind a separate
// explicit step after the owner approves these.
//
// RUN:  node scripts/gen-dmz-news.mjs            (all topics that have a source)
//       node scripts/gen-dmz-news.mjs fob        (one topic by slug)
// Needs ANTHROPIC_API_KEY -- auto-loaded from .env.local if not already in env.

import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'node:fs';
import { ARTICLE_MODEL } from '../lib/models.js';

// --- minimal .env.local loader (bare-node has no Next env injection) ----------
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
    if (val.length >= 2 && (val.charAt(0) === '"' || val.charAt(0) === "'")) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

// --- the honesty-first NEXUS-DMZ-news system prompt ---------------------------
// Built as a line array joined with '\n' (no template literals).
const SYSTEM_PROMPT = [
  'You are NEXUS -- the byline tag for Remi Okafor, meta-intelligence analyst for',
  'Cybernetic Punks (cyberneticpunks.com).',
  '',
  'Normally you cover a live competitive meta. THIS task is different, and the',
  'difference is the entire point: you are writing a PRE-LAUNCH NEWS article about',
  'Call of Duty: Modern Warfare 4\'s DMZ mode, which is NOT OUT YET. You have not',
  'played it. No first-party data exists. Everything you write is reporting on what',
  'the developers have OFFICIALLY ANNOUNCED, sourced to Call of Duty\'s official blog',
  '(the "DMZ Deep Dive").',
  '',
  'VOICE -- PRE-LAUNCH NEWS MODE (this overrides your usual analyst habit):',
  '- You normally analyze a live, PLAYED meta. There is no played data here, so the',
  '  interpretive analyst voice is OFF. Pre-launch, you are a clear, sharp NEWS',
  '  reporter: summarize and organize what was announced. You do not analyze how it',
  '  will play, feel, or land.',
  '- Where your instinct is to add a "what this means" take, redirect that energy',
  '  into STRUCTURAL clarity instead: how the announced systems connect to each',
  '  other, what is genuinely new, and what the blog has NOT yet detailed. Structure',
  '  and accuracy are the craft here, not the hot take.',
  '- Confident about the FACTS, never confident about GAMEPLAY IMPACT. No hype, no',
  '  slogans, no catchphrases. Save the forward-lean analyst voice for post-launch,',
  '  when there is real data to read.',
  '',
  'HONESTY RULES -- ABSOLUTE:',
  '1. ANNOUNCED, NOT VERIFIED. Never call any detail "confirmed by hands-on",',
  '   "tested", "verified intel", or imply you have played it. The right framing is',
  '   "announced", "detailed", "according to the Deep Dive". You report the',
  '   announcement; you do not validate it.',
  '2. NO UNEARNED INTERPRETATION (the key rule for this batch). Do NOT characterize',
  '   how any mechanic will FEEL, play, reward, punish, or pressure players -- none',
  '   of it has been played. Banned moves include "this creates pressure", "this',
  '   rewards X", "this punishes Y", "a genuine tactical edge", "built to punish',
  '   static thinking", "every choice matters", "preparation is itself gameplay".',
  '   State what each system IS and how it connects to the other announced systems;',
  '   let the reader judge how it will play. Hedge words ("suggests", "reads like",',
  '   "implies") do NOT make an interpretive claim acceptable -- cut the claim, do',
  '   not soften it. Noting an open question honestly ("the blog does not specify X',
  '   yet") is encouraged -- that is reporting, not speculation.',
  '3. STAY STRICTLY INSIDE THE EXCERPT. Two specific traps:',
  '   (a) ABSENCE-CLAIMS NEED SOURCE TOO. Do not state that something has NOT been',
  '       shown, detailed, confirmed, released, or published unless the excerpt',
  '       itself says so. You MAY note that "the blog/excerpt does not specify X" --',
  '       that is a statement about THIS source and is fine -- but never assert a',
  '       fact about the wider announcement (e.g. "no screenshots have been shared",',
  '       "not yet revealed elsewhere") that the excerpt does not establish. The',
  '       test is "is this literally in the excerpt", not "is this probably true".',
  '   (b) DO NOT CLASSIFY OR DEFINE BEYOND THE EXCERPT. If the excerpt names a term',
  '       or entity without defining it, use it exactly as given. Do not add an',
  '       unstated definition, distinction, or classification -- e.g. do not label',
  '       who is human vs. AI, or explain what a named thing "means" -- even if it',
  '       is common or well-known knowledge about the game. Only the excerpt counts.',
  '4. ATTRIBUTE EXPLICITLY. At least once in the body, name the source in plain',
  '   text -- "Call of Duty\'s official blog" or "the DMZ Deep Dive" -- so the reader',
  '   knows where these facts come from.',
  '5. NO FABRICATION. Use ONLY the facts in the SOURCE EXCERPT given in the user',
  '   message. Do not invent numbers, names, mechanics, dates, regions, or details',
  '   not in that excerpt. If a natural question is not answered, you may note the',
  '   excerpt does not specify it (per rule 3a) -- never fill the gap with a guess.',
  '6. WRONG-GAME VOCABULARY IS BANNED. This is DMZ / Modern Warfare 4, a DIFFERENT',
  '   game from Marathon. Never use Marathon terms: no "Runner"/"Runners", "Cradle",',
  '   "holotag", "shell" or shell names, "Grid Pulse", "Runner Grade", or any',
  '   Marathon lore. Use DMZ\'s own vocabulary from the source (Operators, FOB,',
  '   Hajin, and so on).',
  '7. READER ADDRESS. Address the audience as "you" or "players". Do NOT label the',
  '   reader with an in-world noun -- do not call the reader "Operator". Using DMZ',
  '   entity names correctly for in-world things (e.g. "Operators" as the in-game',
  '   characters) is fine.',
  '8. END WITH THE LAUNCH NOTE. Close with a brief, plain note that DMZ launches',
  '   October 23, 2026 as part of Call of Duty: Modern Warfare 4.',
  '',
  'ARTICLE FORM:',
  '- 350-550 words. Use **HEADER TEXT** section breaks; at least 2-3 sections.',
  '- Body markdown is limited to **bold headers** and simple "- " bullet lists.',
  '  No horizontal rules ("---"), no code fences, no tables, no other markup. Do',
  '  NOT place any separator line before the launch-date close -- end the final',
  '  paragraph, then the launch note on its own line.',
  '- Straight quotes only. No backticks, no curly quotes, no emoji.',
  '- Headline: lead with "DMZ" and the primary searchable term (FOB, crafting,',
  '  map name) in the first few words. Keep it short -- 58 characters is the',
  '  target, 65 the hard cap; count before you finalize. Sentence or title',
  '  case only -- never all-caps. Any persona hook goes AFTER a colon or dash. Do',
  '  not append the site name or any suffix.',
  '- Tags: 3-6 short lowercase search tags (e.g. "dmz", "modern warfare 4", "fob").',
].join('\n');

// --- the plain news tool (NO meta_update, NO tier list) -----------------------
const NEWS_TOOL = {
  name: 'publish_dmz_news',
  description:
    'Publish a single DMZ pre-launch news article (headline, body, tags). Plain '
    + 'news shape -- no tier ratings, no meta scoring.',
  input_schema: {
    type: 'object',
    properties: {
      headline: {
        type: 'string',
        description: 'Leads with "DMZ" + the searchable term; 65 chars max (58 target); not all-caps; no site suffix.',
      },
      body: {
        type: 'string',
        description: '350-550 words. **HEADER** section breaks. Explicitly attributes facts to the official Deep Dive. Ends with the Oct 23 2026 launch note. Straight quotes only.',
      },
      tags: {
        type: 'array',
        items: { type: 'string' },
        description: '3-6 short lowercase search tags.',
      },
    },
    required: ['headline', 'body', 'tags'],
  },
};

// --- hand-fed source excerpts (VERBATIM from the official MW4 DMZ Deep Dive) ---
// These are the verbatim excerpts supplied from the official Call of Duty blog
// "Modern Warfare 4 DMZ Deep Dive: Explore the Hajin Exclusion Zone" (callofduty.com,
// June 6 2026, by Call of Duty Staff). This REPLACES the earlier web-search
// reconstruction, which had uncertain provenance -- the "nine regions" count and the
// Al Mazrah size comparison are NOT in this verbatim text and were dropped. This
// excerpt is the ONLY factual basis the model gets; nothing beyond it may be stated.
const SOURCE_URL = 'https://www.callofduty.com/blog/2026/06/call-of-duty-modern-warfare-4-dmz-deep-dive';
const SOURCE_LABEL = 'the official Call of Duty MW4 DMZ Deep Dive (callofduty.com, June 6 2026)';

const TOPICS = [
  {
    slug: 'fob',
    name: 'The Forward Operating Base (FOB): your between-deployments hub',
    source: [
      'Before and after every extraction operation inside the DMZ, players return to',
      'their Forward Operating Base (FOB), a central hub built around preparation,',
      'progression, and long-term squad support. The FOB gives players access to key',
      'operational services including the 3D Printer crafting station, The Stash where',
      'inventory items can be stored deployment to deployment, weapon purchasing, a',
      'firing range, bounty boards, and additional upgrade systems that unlock over',
      'time. It also serves as a staging ground and social hub where squad members can',
      'regroup, rearm, inspect their Operators, assist with onboarding newer players,',
      'and prepare before deployment. As players earn XP, complete Missions, progress',
      'through the Trait System, gaining the reputation and skillset of an elite Tier 1',
      'operator over time, the Forward Operating Base evolves alongside you, unlocking',
      'new functionality while visually transforming to better support your growing',
      'capabilities.',
      '',
      'A Tour of Your Forward Operating Base: Orders and Objectives (track active',
      'Missions, review completed objectives, check rewards, plan future operations).',
      'Stash and Loadout (persistent inventory of weapons, equipment, consumables,',
      'valuables; gear organized between Stash and your Active Duty Operator\'s',
      'Backpack/Loadout; Stash size upgrades by ranking up; a Free Loadout option for',
      'immediate infil). Wallet (in-game cash primarily for weapons and Gunsmithing',
      'attachments, rescuing MIA operators, paying for Lieutenant Intel; completing',
      'Missions and Ops is the primary source of cash, wired directly to the Wallet;',
      'players may employ an Active Duty Operator as a cash mule with particular skills',
      'when breaking into vaults, defeating HVTs, or completing Dynamic Ops). 3D Printer',
      '(gather resources, return to the FOB\'s crafting station; manufactures functional',
      'equipment and support gear excluding Primary/Secondary/Melee weapons; recipes',
      'unlock crafting gear like NVGs, ballistic vests, backpacks, consumables,',
      'Killstreaks). Gunsmith (purchase weapons and attachments with cash; more',
      'effective gear costs more; up to five Attachments plus an Apex Attachment per',
      'weapon, though eight-Attachment weapons have been confirmed within Hajin; weapon',
      'progression tracks across Multiplayer and DMZ). Weapon Vendor (limited rotating',
      'selection of specialized weaponry purchasable with cash, refreshing',
      'periodically). Firing Range (first-person, test Primary/Secondary builds). Active',
      'Duty/Operators (manage available Operators including those awaiting recovery after',
      'failed exfils; each Operator has a persistent Backpack, Loadout, and Trait Tree).',
      'Boss Board (intel on hostile Lieutenants; pay for intel to pinpoint locations, or',
      'climb Hunt Towers for intel on the closest Lieutenant; slaying a Lieutenant drops',
      'Dog Tags, which populate your Boss Board but are also trackable/valuable to enemy',
      'squads). Bounty Leaderboard (monitor the most dangerous rival players currently in',
      'the Exclusion Zone). Deploy (choose infil method via the Paid Infil System --',
      'quiet on foot, or fast and loud via helicopter or plane, with optional vehicle',
      'drop).',
    ].join('\n'),
  },
  {
    slug: 'crafting',
    name: 'The 3D Printer: DMZ\'s crafting system',
    source: [
      'Crafting gives players greater control over how they prepare for future',
      'operations by transforming recovered resources into valuable equipment and',
      'combat-ready tools. Materials are disassembled automatically during a mission so',
      'players can stay focused on the action, while inventory management is easy to',
      'navigate. Extracted loot can be used back at your FOB within an intuitive',
      'crafting system built around a powerful upgradable 3D Printer capable of',
      'unlocking increasingly advanced crafting options, allowing players to manufacture',
      'equipment and rare gear.',
      '',
      'The categories of Gear you can 3D print are as follows: Gear (tactical equipment',
      'such as NVGs and Parachutes). Backpacks (packs of varying sizes and',
      'specializations). Plate Carriers (different types of armor vests). Tacticals',
      '(strategic, non-lethal equipment). Lethals (offensive equipment designed to',
      'damage or eliminate threats). Consumables (beneficial items, from pain killers to',
      'radiation blockers). Field Upgrades (abilities providing tactical support or',
      'intelligence; unlike Multiplayer, Field Upgrades in DMZ do not recharge). Fire',
      'Support Items (deployable offensive killstreak support). Tracked Recipes (a series',
      'of tagged recipes you\'re on the hunt for). Special Items (a wide variety of items',
      'for a wide variety of purposes). The deeper players push into the region, the more',
      'opportunities they uncover to secure rarer resources needed to support stronger',
      'loadouts and specialized playstyles.',
    ].join('\n'),
  },
  {
    slug: 'hajin',
    name: 'Hajin: the setting / the exclusion zone',
    source: [
      'Following the events of the Modern Warfare 4 Campaign, an exclusion zone across',
      'the Korean peninsula remains saturated with abandoned military technology,',
      'weapons stockpiles, and destabilizing threats. Operating as a shadow CIA asset,',
      'you are deployed behind enemy lines and tasked with securing the various weapons',
      'and technology left behind before they fall into enemy hands. Both Rogue',
      'Operators and enemy combatants are active throughout the zone, forcing every',
      'squad to decide when to cooperate, when to engage, and when to disappear before',
      'tensions escalate. Loot, fight, negotiate, betray, and extract whatever you can',
      'carry.',
      '',
      'Nestled within a tri-point region bordering Russia and the Korean peninsula,',
      'Hajin is a contested exclusion zone where rival forces battle for control of',
      'abandoned military technology and strategic assets left behind after the events',
      'of the Modern Warfare 4 Campaign. The atmosphere within the Hajin Exclusion Zone',
      'shifts can change based environmental effects, creating new opportunities and',
      'challenges on every run. Sudden downpours can reduce visibility and force',
      'Operators to adapt how they explore, move and engage, while dense fog banks and',
      'overcast skies transform familiar routes into tense navigational gambles. Scarred',
      'by radiation, mass evacuation, and the collapse of civilian infrastructure, the',
      'region is one of the largest and most ambitious Call of Duty environments ever',
      'built, designed around exploration, environmental storytelling, and high-risk',
      'operations. From the irradiated Fallout reactor and the highly secured Prison',
      'complex to the remains of Hajin City and the heavily defended Military Base, every',
      'region inside the border area and exclusion zone offers different combat',
      'opportunities, sealed or secret areas waiting to be discovered, traversal',
      'challenges and points of interest with unexpected entrances accessible only via',
      'water, and other operational risks. Players willing to push deeper into the',
      'unknown can uncover hidden mysteries, pursue high-value gear, and engage in',
      'increasingly dangerous missions with greater risks and rewards.',
    ].join('\n'),
  },
];

// Remaining scoped topics for later batches -- intentionally NO source here. They
// are NOT generated until the owner supplies/confirms the verbatim excerpt for each
// (no source => no fabrication).
const PENDING_TOPICS = [
  'the vendor (buying/selling at the FOB)',
  'the gunsmith (weapon building at the FOB)',
  'Operator progression and DMZ rank',
  'missions / contracts structure',
  'extraction and the stash (what carries over)',
  'pricing / package (part of the $70 MW4, not free-to-play)',
];

// --- generation ---------------------------------------------------------------
function buildUserPrompt(topic) {
  return [
    'TOPIC: ' + topic.name,
    '',
    'SOURCE EXCERPT -- from ' + SOURCE_LABEL + '. This is the ONLY factual basis;',
    'do not state anything beyond it:',
    '',
    topic.source,
    '',
    'Write a single NEXUS pre-launch DMZ news article on this topic, in your voice,',
    'obeying every honesty rule. Call the publish_dmz_news tool with the result.',
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
    block = message.content.find(function (b) {
      return b.type === 'tool_use' && b.name === NEWS_TOOL.name;
    });
  }
  if (!block) {
    throw new Error('no tool_use block (stop_reason: ' + message.stop_reason + ')');
  }
  return block.input;
}

function printArticle(topic, art) {
  const tags = Array.isArray(art.tags) ? art.tags.join(', ') : '';
  const out = [
    '',
    '================================================================',
    'TOPIC SLUG : ' + topic.slug,
    'EDITOR     : NEXUS (Remi Okafor)',
    'GAME_SLUG  : dmz   (intended feed_items stamp -- NOT written in dry-run)',
    'SOURCE     : ' + SOURCE_URL,
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

  console.log('DMZ pre-launch news generator -- DRY-RUN (no DB write).');
  console.log('Model: ' + ARTICLE_MODEL + '   Topics this run: ' + queue.map(function (t) { return t.slug; }).join(', '));

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  for (let i = 0; i < queue.length; i++) {
    const topic = queue[i];
    try {
      const art = await generate(client, topic);
      printArticle(topic, art);
    } catch (e) {
      console.error('[' + topic.slug + '] generation failed: ' + e.message);
    }
  }

  console.log('');
  console.log('DRY-RUN complete. Nothing was written to feed_items.');
  console.log('Pending scoped topics (need a verbatim source excerpt before generating):');
  for (let j = 0; j < PENDING_TOPICS.length; j++) {
    console.log('  - ' + PENDING_TOPICS[j]);
  }
}

main();
