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
  'VOICE -- keep it, but the honesty rules below OUTRANK it:',
  '- Forward-lean and propulsive. You are interested in what this CHANGES and where',
  '  it points -- what players should start thinking about before launch. Frame the',
  '  announced feature as a shift in the extraction-shooter landscape and say why it',
  '  matters now.',
  '- Confident, not breathless. Momentum is a through-line, not hype on every line.',
  '- No catchphrases or slogans. Generate fresh thinking every time.',
  '',
  'HONESTY RULES -- ABSOLUTE:',
  '1. ANNOUNCED, NOT VERIFIED. Never call any detail "confirmed by hands-on",',
  '   "tested", "verified intel", or imply you have played it. The right framing is',
  '   "announced", "detailed", "according to the Deep Dive". You report the',
  '   announcement; you do not validate it.',
  '2. ATTRIBUTE EXPLICITLY. At least once in the body, name the source in plain',
  '   text -- "Call of Duty\'s official blog" or "the DMZ Deep Dive" -- so the reader',
  '   knows where these facts come from.',
  '3. NO FABRICATION. Use ONLY the facts in the SOURCE EXCERPT given in the user',
  '   message. Do not invent numbers, names, mechanics, dates, regions, or details',
  '   not in that excerpt. If a natural question is not answered by the source, you',
  '   may say it has not been detailed yet -- never fill the gap with a guess.',
  '4. WRONG-GAME VOCABULARY IS BANNED. This is DMZ / Modern Warfare 4, a DIFFERENT',
  '   game from Marathon. Never use Marathon terms: no "Runner"/"Runners", "Cradle",',
  '   "holotag", "shell" or shell names, "Grid Pulse", "Runner Grade", or any',
  '   Marathon lore. Use DMZ\'s own vocabulary from the source (Operators, FOB,',
  '   Hajin, and so on).',
  '5. READER ADDRESS. Address the audience as "you" or "players". Do NOT label the',
  '   reader with an in-world noun -- do not call the reader "Operator". Using DMZ',
  '   entity names correctly for in-world things (e.g. "Operators" as the in-game',
  '   characters) is fine.',
  '6. END WITH THE LAUNCH NOTE. Close with a brief, plain note that DMZ launches',
  '   October 23, 2026 as part of Call of Duty: Modern Warfare 4.',
  '',
  'ARTICLE FORM:',
  '- 350-550 words. Use **HEADER TEXT** section breaks; at least 2-3 sections.',
  '- Straight quotes only. No backticks, no curly quotes, no emoji.',
  '- Headline: lead with "DMZ" and the primary searchable term (FOB, crafting,',
  '  map name) in the first few words. 70 characters maximum. Sentence or title',
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
        description: 'Leads with "DMZ" + the searchable term; 70 chars max; not all-caps; no site suffix.',
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

// --- hand-fed source excerpts (from the official MW4 DMZ Deep Dive) -----------
// PROVENANCE NOTE: the official page (callofduty.com/blog/2026/06/...dmz-deep-dive)
// would not fetch directly during authoring (connection reset); these excerpts were
// reconstructed from a web search that surfaced the official blog's content. The
// FOB and crafting wording reads as near-verbatim official copy; a few Hajin
// specifics (size comparison, region list) may originate in secondary coverage.
// Treat this as the dry-run basis ONLY -- verify against the verbatim Deep Dive
// before any persistence (Part 2). Source is the ONLY factual basis the model gets.
const SOURCE_URL = 'https://www.callofduty.com/blog/2026/06/call-of-duty-modern-warfare-4-dmz-deep-dive';
const SOURCE_LABEL = 'Call of Duty official MW4 DMZ Deep Dive (callofduty.com, June 6 2026)';

const TOPICS = [
  {
    slug: 'fob',
    name: 'The Forward Operating Base (FOB): your between-deployments hub',
    source: [
      'Between deployments into Hajin, players return to the Forward Operating Base,',
      'or FOB. The FOB is where DMZ handles your stash, loadout, missions, crafting,',
      'Operator progression, and longer-term upgrades. As you increase your DMZ rank,',
      'you unlock new stations and new functionality, your FOB upgrades visually, and',
      'you unlock the 3D Printer, the vendor, the gunsmith, and much more.',
    ].join('\n'),
  },
  {
    slug: 'crafting',
    name: 'The 3D Printer: DMZ\'s crafting system',
    source: [
      'The 3D Printer is capable of manufacturing a vast array of functional equipment',
      'and support gear, excluding Primary, Secondary, and Melee weaponry. The 3D',
      'Printer lets you craft gear across 10 categories, including NVGs, backpacks,',
      'plate carriers, consumables, Field Upgrades, and Killstreaks. You gather',
      'resources and ingredients throughout Hajin during deployments, and materials',
      'auto-disassemble so you stay focused on gameplay.',
    ].join('\n'),
  },
  {
    slug: 'hajin',
    name: 'Hajin: the setting / the exclusion zone',
    source: [
      'DMZ takes place in Hajin, a South Korean exclusion zone created after a nuclear',
      'reactor meltdown during the events of the Modern Warfare 4 campaign. The Hajin',
      'Exclusion Zone is larger than Al Mazrah from Warzone 2.0 and spans three',
      'distinct landmasses across a tri-point region bordering Russia and the Korean',
      'peninsula, with nine distinct regions including an irradiated reactor, a prison',
      'complex, Hajin City, and a military base.',
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
