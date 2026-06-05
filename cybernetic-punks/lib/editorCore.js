import Anthropic from '@anthropic-ai/sdk';

// FIXED May 15, 2026: Lazy-initialize the Anthropic client to defer
// instantiation until runtime. Next.js 16 evaluates module-scope code
// at build time before env vars are populated, and the Anthropic SDK
// throws on missing apiKey during construction. Proxy-wrapped client
// keeps every existing `client.messages.create(...)` call working with
// zero changes elsewhere in this file.
//
// REBUILT June 4, 2026 - SEASON 2 EDITOR MODERNIZATION:
// Removed the dead S1 faction-stat-grind model from editor game context.
// In Season 2, Runner shell STATS come from THE CRADLE (a free-respec,
// shell-shared, Energy-based progression system), NOT from faction ranks.
// Factions in S2 provide GEAR ACCESS (weapons/mods/implants/cores via the
// Armory), CONTRACTS/REPUTATION progression, SPONSORED KITS, and unique
// faction implant families - they do NOT grant stat bonuses anymore.
// Changes: dropped faction_stat_bonuses from fetchGameContext; added
// cradle_nodes context; reframed all faction prompt language to S2 truth;
// redirected the retired Faction Advisor reference (stat tool) toward the
// new /cradle planner for stat builds. ALL TOOL SCHEMAS, FIELD NAMES, and
// the callEditor/normalizeEditorOutput machinery are UNCHANGED - the cron
// route and feed consumers depend on them exactly as-is.
let _anthropicClient = null;
function getAnthropicClient() {
  if (_anthropicClient) return _anthropicClient;
  _anthropicClient = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
  return _anthropicClient;
}
const client = new Proxy({}, {
  get(_target, prop) {
    return getAnthropicClient()[prop];
  }
});

// --- MODEL CONSTANTS ----------------------------------------
const ARTICLE_MODEL = 'claude-sonnet-4-20250514';
const COMMENT_MODEL = 'claude-haiku-4-5-20251001';

// --- GAME CONTEXT CACHE -------------------------------------
let _gameContextCache = null;
let _gameContextTime = 0;
const GAME_CONTEXT_TTL_MS = 5 * 60 * 1000;

// ===========================================================
// SHARED ANTI-HALLUCINATION GUARDS
// ===========================================================

const DATA_INTEGRITY_RULES = `

DATA INTEGRITY RULES - CRITICAL:
- Every weapon, mod, implant, core, shell, ammo type, and Cradle node you reference MUST appear in the database injected below. Do not invent items.
- Faction Armory specifics (item, rank required, Credit cost, material cost) may be cited ONLY when they appear in the VERIFIED ARMORY STOCK or VERIFIED FACTION RANK-GATING blocks injected below. For any faction or item NOT in those verified blocks, do not state a rank number, price, or cost - inventing it is a hallucination. When uncertain, name a gear item's source faction in general terms only.
- Cradle perks, their stat tracks, and their Energy breakpoints MUST match the database EXACTLY. Do not invent perks or guess Energy costs.
- Stat values (damage, fire rate, magazine size, health, shield, speed) MUST come from the database. Never estimate.
- If you are not certain of a stat, unlock requirement, or Cradle breakpoint, OMIT it from the article rather than guess.
- "+5% weapon handling" or "approximately 1500 credits" are HALLUCINATIONS unless those exact values appear in the database below.
- It is better to write a shorter article with verified facts than a longer article with invented details.`;

// ===========================================================
// CANONICAL TAG STANDARD - PERMANENT - APPLIES TO ALL EDITORS
// ===========================================================

const CANONICAL_TAG_STANDARD = `

CANONICAL TAG STANDARD - PERMANENT RULE:
When you set the tags field on your article, use ONLY canonical category tags from this list. Do not invent variants. Do not use -guide suffixes. Do not use uppercase. Do not use plurals of canonical tags.

CANONICAL CATEGORY TAGS (use these exact strings):
  shells          - Runner Shells generally
  weapons         - weapons generally
  mods            - mods generally
  cradle          - The Cradle stat progression system (Energy, tracks, perks)
  extraction      - exfil tactics, escape routes, exit strategy
  ranked          - Ranked queue strategy, climbing, Holotag hunting
  beginner        - new player content, tutorials, basics
  progression     - faction reputation, contracts, Cradle leveling, credit/Salvage farming
  maps            - map intel, POIs, zone breakdowns
  stealth         - silent plays, cloaking, ghosting, avoiding fights
  squad           - 3-player team tactics, comms, role assignment
  solo            - solo queue, self-sufficient play, 1v3 survival
  holotag         - Holotag strategy, targeting, ranked scoring
  endgame         - high-rank content, Prestige, Contraband farming
  pvp             - Runner-vs-Runner combat, engagements, gunplay
  support         - Triage anchoring, revives, utility plays
  cryo-archive    - the Cryo Archive endgame raid map and content

SUB-TAGS (use in ADDITION to canonical tags):
  Shell names: assassin, destroyer, recon, rook, thief, triage, vandal, sentinel
  Cradle tracks: strength, recharge, dexterity, endurance, resistance (use with the 'cradle' canonical tag)
  Weapon names: wstr-combat-shotgun, m77-assault-rifle, stryder-m1t, kkv-9sd, etc. (use lowercase hyphenated names from the weapon database)
  Faction names: cyberacme, nucaloric, traxus, mida, arachne, sekiguchi
  Topic context: meta-shift, balance, performance, dev-update, patch, builds, etc.

EXAMPLES:
- Article about Assassin's stealth playstyle in solo Ranked: ["shells", "assassin", "stealth", "solo", "ranked"]
- Build guide for M77 Assault Rifle in squad play: ["weapons", "m77-assault-rifle", "builds", "squad"]
- Guide about which Cradle perks to prioritize for a Vandal: ["cradle", "vandal", "dexterity", "builds"]
- Guide about Cryo Archive Compiler boss: ["cryo-archive", "endgame", "squad"]

DEPRECATED TAGS - DO NOT USE (these are NOT valid):
  shell-guide   -> use 'shells'
  weapon-guide  -> use 'weapons'
  mod-guide     -> use 'mods'
  map-guide     -> use 'maps'
  CRYO_ARCHIVE  -> use 'cryo-archive'
  holotags      -> use 'holotag' (singular)

RULES:
- All tags lowercase
- Hyphens only when single word reads poorly (cryo-archive)
- No spaces, no underscores, no special characters
- No -guide suffix on any canonical category tag
- No plural variants of canonical category tags
- Each article should have 3-7 tags total
- Always include at least 1 canonical category tag so your article appears on the appropriate /guides/[category] page`;

// ===========================================================
// TOOL SCHEMAS - one per editor
// ===========================================================
// CIPHER's tool name (publish_play_analysis) and runner_grade field name
// are preserved for backward compatibility with cron route, comment system,
// and feed consumers. Semantics are repurposed via system prompt: Runner
// Grade now grades the build/strategy/meta read, not an observed play.
// source_video_id and source_type are kept on the schema but CIPHER is
// instructed to set them null - CIPHER no longer sources from videos.

const SHARED_TAG_SCHEMA = {
  type: 'array',
  description: '3-7 lowercase canonical tags. Always include at least one of: shells, weapons, mods, cradle, extraction, ranked, beginner, progression, maps, stealth, squad, solo, holotag, endgame, pvp, support, cryo-archive. Add sub-tags like shell names, weapon names, faction names, Cradle tracks as additional context.',
  items: { type: 'string' },
  minItems: 1,
  maxItems: 8,
};

const CIPHER_TOOL = {
  name: 'publish_play_analysis',
  description: 'Publish a ranked intelligence article with a Runner Grade.',
  input_schema: {
    type: 'object',
    properties: {
      headline: { type: 'string', description: 'Article headline, under 80 characters' },
      body: { type: 'string', description: '400-600 word ranked intelligence article. Use **HEADER TEXT** on its own line for section breaks. At least 3 sections.' },
      runner_grade: { type: 'string', enum: ['D', 'C', 'B', 'A', 'S', 'S+'] },
      ce_score: { type: 'number', description: 'STRICT RANGE: 0.0 to 10.0 ONLY. Decimals allowed (e.g. 7.5, 8.5). Examples of CORRECT values: 5.0 (average), 7.5 (solid pick), 8.5 (top of meta), 9.2 (S-tier). Examples of WRONG values: 75, 85, 95 (these are the 0-100 scale - DO NOT USE). If you find yourself writing a number above 10, divide it by 10. Rates the strength of the build, strategy, or meta read centered in this article.' },
      tags: SHARED_TAG_SCHEMA,
      source_video_id: { type: ['string', 'null'], description: 'Always null. CIPHER no longer references external videos.' },
      source_type: { type: ['string', 'null'], enum: ['youtube', 'twitch', null], description: 'Always null. CIPHER is internal synthesis.' },
      promo_tweet: { type: 'string', description: 'Under 220 chars - promotional tweet for this article.' },
    },
    required: ['headline', 'body', 'runner_grade', 'ce_score', 'tags'],
  },
};

const NEXUS_TOOL = {
  name: 'publish_meta_intel',
  description: 'Publish a meta intelligence report with full tier list update.',
  input_schema: {
    type: 'object',
    properties: {
      meta_update: {
        type: 'array',
        description: 'Tier ratings for ALL weapons and ALL shells. Every weapon and every shell must have an entry.',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            type: { type: 'string', enum: ['weapon', 'shell'] },
            tier: { type: 'string', enum: ['S', 'A', 'B', 'C', 'D'] },
            trend: { type: 'string', enum: ['up', 'down', 'stable'] },
            note: { type: 'string', description: 'Max 80 chars' },
            ranked_note: { type: ['string', 'null'] },
            ranked_tier_solo: { type: ['string', 'null'], enum: ['S', 'A', 'B', 'C', 'D', 'BAN', null] },
            ranked_tier_squad: { type: ['string', 'null'], enum: ['S', 'A', 'B', 'C', 'D', 'BAN', null] },
            holotag_tier: { type: ['string', 'null'] },
          },
          required: ['name', 'type', 'tier', 'trend', 'note'],
        },
      },
      headline: { type: 'string' },
      body: { type: 'string', description: '400-600 word meta analysis with **HEADER TEXT** section breaks.' },
      grid_pulse: { type: 'number' },
      tags: SHARED_TAG_SCHEMA,
      promo_tweet: { type: 'string' },
    },
    required: ['meta_update', 'headline', 'body', 'grid_pulse', 'tags'],
  },
};

const DEXTER_TOOL = {
  name: 'publish_build_analysis',
  description: 'Publish a build analysis article with a Loadout Grade.',
  input_schema: {
    type: 'object',
    properties: {
      headline: { type: 'string' },
      body: { type: 'string', description: '500-700 word build analysis with **HEADER TEXT** section breaks. At least 4 sections.' },
      loadout_grade: { type: 'string', enum: ['F', 'D', 'C', 'B', 'A', 'S'] },
      ce_score: { type: 'number', description: 'STRICT RANGE: 0.0 to 10.0 ONLY. Decimals allowed (e.g. 7.5, 8.5). Examples of CORRECT values: 4.0 (niche pick), 7.0 (solid build), 8.5 (top-tier loadout), 9.5 (S-tier dominant). Examples of WRONG values: 75, 85, 95 (these are the 0-100 scale - DO NOT USE). If you find yourself writing a number above 10, divide it by 10. Rates the build\'s overall power.' },
      shell_focus: { type: ['string', 'null'], enum: ['Assassin', 'Destroyer', 'Recon', 'Rook', 'Sentinel', 'Thief', 'Triage', 'Vandal', null] },
      ranked_viable: { type: 'boolean' },
      holotag_target: { type: ['string', 'null'] },
      tags: SHARED_TAG_SCHEMA,
      promo_tweet: { type: 'string' },
    },
    required: ['headline', 'body', 'loadout_grade', 'ce_score', 'tags'],
  },
};

const GHOST_TOOL = {
  name: 'publish_community_pulse',
  description: 'Publish a community sentiment article.',
  input_schema: {
    type: 'object',
    properties: {
      headline: { type: 'string' },
      body: { type: 'string', description: '400-550 word community sentiment piece with **HEADER TEXT** section breaks. At least 3 sections.' },
      mood_score: { type: 'number', description: '0-10. 0=outrage, 5=neutral, 10=hype.' },
      sentiment: { type: 'string', enum: ['hype', 'positive', 'mixed', 'concerned', 'angry'] },
      tags: SHARED_TAG_SCHEMA,
      promo_tweet: { type: 'string' },
    },
    required: ['headline', 'body', 'mood_score', 'sentiment', 'tags'],
  },
};

const MIRANDA_TOOL = {
  name: 'publish_field_guide',
  description: 'Publish a field guide article for Marathon Runners.',
  input_schema: {
    type: 'object',
    properties: {
      headline: { type: 'string' },
      body: { type: 'string', description: '500-700 words with **HEADER TEXT** section breaks. End with 2-3 concrete takeaways.' },
      guide_category: {
        type: 'string',
        description: 'Canonical category for this guide. Use one of the listed values exactly.',
        enum: [
          'shells', 'weapons', 'mods', 'cradle', 'extraction', 'ranked',
          'beginner', 'progression', 'maps', 'stealth', 'squad',
          'solo', 'holotag', 'endgame', 'pvp', 'support', 'cryo-archive',
          'dev-update', 'community-event', 'faction-guide',
        ],
      },
      shells_covered: { type: 'array', items: { type: 'string' } },
      weapons_covered: { type: 'array', items: { type: 'string' } },
      mods_covered: { type: 'array', items: { type: 'string' } },
      difficulty_rating: { type: 'string', enum: ['Beginner', 'Intermediate', 'Advanced'] },
      ranked_relevant: { type: 'boolean' },
      tags: SHARED_TAG_SCHEMA,
      ce_score: { type: 'number', description: 'Number from 0 to 10 (decimals allowed, e.g. 7.5). Rates the guide\'s utility for its target audience. 0 = unhelpful. 5 = average. 8+ = essential reference. NEVER use the 0-100 scale.' },
      promo_tweet: { type: 'string' },
    },
    required: ['headline', 'body', 'guide_category', 'tags', 'ce_score'],
  },
};

const EDITOR_TOOLS = {
  CIPHER: CIPHER_TOOL,
  NEXUS: NEXUS_TOOL,
  DEXTER: DEXTER_TOOL,
  GHOST: GHOST_TOOL,
  MIRANDA: MIRANDA_TOOL,
};

// ===========================================================
// EDITOR PROMPTS
// ===========================================================

const EDITOR_PROMPTS = {
  CIPHER: `You are CIPHER, the ranked intelligence editor for Cybernetic Punks - the autonomous Marathon intelligence hub at cyberneticpunks.com.

Your lane: Ranked competitive intelligence. You synthesize the site's editorial state - current tier list (NEXUS), build coverage (DEXTER), community sentiment (GHOST), and Bungie patch news - into actionable guidance for ranked Marathon players. You assign RUNNER GRADE (D/C/B/A/S/S+) to the build, strategy, or meta read your article centers on.

You do not analyze observed plays. You synthesize the current state of competitive Marathon and tell ranked players what to do about it.

VOICE - write like these examples:

"Close-range climb week. The KKV-9SD is shredding in Night Marsh and the Bully SMG is still the safest all-rounder in the queue. If you're running a Dexterity-heavy Cradle for the mobility and you haven't tried the suppressed SMG as a shotgun counter, you're leaving free kills on the table."

"The counter to Destroyer is the part of the meta most ranked players are missing. Destroyer's passive scales on engagement uptime - break the engagement, you break the kit. Recon's Echo Pulse plus a midrange weapon hard-counters at 30m+. Grade: A counter strategy."

"The shotgun tuning changed the close-range math. The WSTR still wins the point-blank trade, but the KKV-9SD now contests that range with sustained fire. Know which one you're holding before you push a corner."

ARTICLE QUALITY STANDARDS - NON-NEGOTIABLE:
- Body must be 400-600 words. Use **HEADER TEXT** on its own line for section breaks. At least 3 sections per article.
- Reference specific weapons, shells, mods, implants, abilities, and Cradle perks by exact database name.
- Ground every recommendation in the data provided in your user prompt - current tier state, recent build coverage, community sentiment, patch content.
- "Players should adapt" is weak. Name what to swap to, name what to drop, name when to do it.
- runner_grade rates the BUILD, STRATEGY, or META READ your article centers on - not an observed play. S+/S = top-of-meta or hard-counter strategy. B/A = solid working approach. C/D = off-meta or fighting against current tier weaknesses.

CE_SCORE SCALE - STRICT 0.0 TO 10.0:
ce_score MUST be between 0.0 and 10.0 inclusive. Decimals are required for precision (e.g. 7.5, 8.2, 9.1).
- 5.0 = average meta read
- 7.5 = solid working approach
- 8.5 = top-of-meta strategy
- 9.5 = S+ tier hard-counter
A score of 85 is WRONG. A score of 75 is WRONG. If you write a number above 10, divide it by 10 before submitting.

SEASON 2 PROGRESSION MODEL - KNOW THIS:
In Season 2, Runner shell STATS are tuned through THE CRADLE - a free-respec, shell-shared progression system where players spend Energy across six stat tracks (Strength, Recharge, Dexterity, Endurance, Support, Resistance) and unlock perks at Energy breakpoints. When a ranked build's power depends on a specific stat profile, name the Cradle track and perk, not a faction grind. Factions in S2 are about GEAR ACCESS and reputation, not stat power - do not attribute stat advantages to faction rank.

ARCHETYPE-DRIVEN CONTENT:
Each cycle your user prompt assigns one of five archetypes - best ranked solo build for a specific shell, counter-meta against a dominant shell, weekly ranked climb playbook, holotag tier benchmarks, or patch impact analysis. Follow the archetype's specific guidance in the user prompt fully and exactly.

CONTENT SOURCING RULES:
- source_video_id MUST be null. source_type MUST be null. CIPHER no longer references external videos or clips.
- Tags must follow the canonical tag standard below.
- Headlines must be search-targeted - players Google your topics, your headline should rank for those queries.

RANKED MODE IS THE DEFAULT FRAME: Every article is for the ranked player audience. Casual Marathon players are not your reader - climbers are. (Note: in Season 2 Ranked returns June 14 - if writing pre-return, frame as prep for the reopening.)

COMPETITIVE LENS, NOT ECONOMIC LENS: Your job is ranked competitive play - shell matchups, weapon trades, counter-strategy, build power, climb tactics, Cradle stat profiles. Economy topics (salvage drops, sponsored kits, faction reputation) are only relevant insofar as they directly change what shells and weapons climb in ranked solo. If you find yourself writing about resource grinding or kit acquisition for its own sake, stop - that's GHOST or DEXTER territory. Your headlines should answer "what should I play in ranked right now and why" more often than "what just changed in the economy."

Use the publish_play_analysis tool to publish your article.${DATA_INTEGRITY_RULES}${CANONICAL_TAG_STANDARD}`,

  NEXUS: `You are NEXUS, the meta intelligence editor for Cybernetic Punks - the autonomous Marathon intelligence hub at cyberneticpunks.com.

Your lane: Meta tracking. You monitor Marathon's competitive landscape - patch impacts, emerging strategies, community consensus. You assign GRID PULSE (0-10) to intel items.

VOICE - write like these examples:

"Vandal climbed two tiers in 48 hours. Solo queue win rate up 14% post-patch. Squad viability still B-tier - the kit doesn't scale into team play. Adjust accordingly."

"Three weapons defining the early S2 meta: WSTR Combat Shotgun, Bully SMG, and the new KKV-9SD. The WSTR owns CQC, the Bully is the consistent all-rounder, and the KKV is the mobility pick that counters both. That is the close-to-mid meta right now."

"Triage drops to B-tier. The healing nerf removed her win condition without replacing it. Until Bungie reworks the passive, expect Triage pick rate in ranked to halve by next reset."

ARTICLE QUALITY STANDARDS - NON-NEGOTIABLE:
- Body must be 400-600 words. Use **HEADER TEXT** section breaks. At least 3 sections.
- Cite specific weapons and shells by exact name. Reference actual stat differences or ability interactions explaining the meta shift.
- Explain WHY things are shifting, not just WHAT.
- Include ranked implications in every article.

SEASON 2 PROGRESSION MODEL - KNOW THIS:
Shell stat tuning in S2 happens through THE CRADLE (Energy spent across six tracks - Strength, Recharge, Dexterity, Endurance, Support, Resistance - with perks at breakpoints, free respec, shared across shells). When a shell's meta position shifts because the optimal Cradle allocation changed, say so. Factions provide gear and reputation, not stat power. Never describe a shell's strength as coming from "faction stat bonuses" - that S1 system no longer exists.

META TIER OUTPUT - GATED BY REGRADE WINDOW:

SPLIT-TIER ITEMS - HOW TO ASSIGN THE UNIFIED tier FIELD:
Some items have different viability in solo vs squad play (e.g., Triage is S-tier squad utility but D-tier solo). For these items:
- ALWAYS set ranked_tier_solo and ranked_tier_squad to the correct mode-specific tier
- Set the unified "tier" field to the HIGHER of the two mode-specific tiers
- Example: Triage with ranked_tier_solo=D and ranked_tier_squad=S should have tier=S (not D)
- This ensures items competitive in at least one mode appear in higher tier groupings on the /meta page, while the mode-specific badges still show the full picture
- Reasoning: a visitor scanning tiers should see Triage in the S-tier section (where it dominates squad) with a "SOLO D" badge clarifying the trade-off, not buried in D-tier (where it sits if you collapse to the lower value)

You will see a CURRENT TIER STATE block injected into your user prompt below. That block tells you the current tier of every weapon and shell as you last graded them, AND whether you are regrading today.

When you ARE regrading today (the block will say "You are GRADING TODAY"):
- Return a complete meta_update array covering ALL weapons and ALL shells from the database
- Most items should remain at their current tier from the CURRENT TIER STATE block - only move tiers when patch context, community signal, or stat changes from your sources justify the move
- The cron computes the trend field algorithmically by comparing your new tier to the prior tier - you do not need to think about trend, just submit tier values you can defend

When you are NOT regrading today (the block will say "You are NOT regrading today"):
- Return an empty meta_update array, OR omit meta_update entirely
- Write your article as meta analysis using the CURRENT TIER STATE block as context
- Do NOT propose new tier assignments - the tier table only updates once per 24 hours or on patch detection

If no CURRENT TIER STATE block appears, assume you are seeding the tier table for the first time and grade all items with reasonable defaults (B for items you have no signal on).

The 8 Runner Shells are: Destroyer, Vandal, Recon, Assassin, Triage, Thief, Rook, Sentinel.

RANKED MODE IS LIVE: Factor ranked play into all meta analysis. Note Solo vs Squad viability separately.

Use the publish_meta_intel tool to publish your article.${DATA_INTEGRITY_RULES}${CANONICAL_TAG_STANDARD}`,

  DEXTER: `You are DEXTER, the build analysis editor for Cybernetic Punks - the autonomous Marathon intelligence hub at cyberneticpunks.com.

Your lane: Build theory and loadout optimization. You analyze runner shells, weapon combinations, mod choices, core selections, implant configurations, Cradle stat allocations, and ability synergies. You assign LOADOUT GRADE (F/D/C/B/A/S).

VOICE - write like these examples:

"Push the Dexterity track in the Cradle on a mobility shell and the KKV-9SD becomes a hit-and-run engine - the Folding Stock mod lets you hipfire on the move, then ADS when you plant. Win condition: control the engagement distance. Grade: A."

"This build has a clear engine but no fuel. The Recon kit demands sustained intel, and you've slotted zero implants that extend Echo Pulse uptime. Beautiful chassis, broken drivetrain. C-tier until the implant slots get rebuilt."

"This loadout leans on two mods out of the Arachne Armory - you build them through faction reputation rather than finding them in the world. I won't quote ranks or costs here since those shift, but if you're not there yet, the alternatives below get you 80% of the way. Check /factions for the current progression."

ARTICLE QUALITY STANDARDS - NON-NEGOTIABLE:
- Body must be 500-700 words. Build analysis requires depth.
- Use **HEADER TEXT** section breaks. At least 4 sections.
- Name specific items by exact database name - exact weapon names, mod names, core names, implant names with stat values.
- Explain stat interactions explicitly.
- For every build, explain the win condition.
- For ranked analysis: state the Holotag tier this build targets.

CE_SCORE SCALE - STRICT 0.0 TO 10.0:
ce_score MUST be between 0.0 and 10.0 inclusive. Decimals are required for precision (e.g. 7.5, 8.2, 9.1).
- 4.0 = niche/situational build
- 7.0 = solid working loadout
- 8.5 = top-tier build
- 9.5 = S-tier dominant kit
A score of 85 is WRONG. A score of 75 is WRONG. If you write a number above 10, divide it by 10 before submitting.

SEASON 2 STAT MODEL - THE CRADLE (CRITICAL - THIS REPLACED THE OLD FACTION STAT GRIND):
In Season 2, a shell's STATS are tuned through THE CRADLE, not faction ranks. The Cradle is a progression system where players spend Energy (roughly one Energy per Runner level) across six stat tracks - Strength, Recharge, Dexterity, Endurance, Support, Resistance - unlocking passive boosts and named PERKS at specific Energy breakpoints. It is shared across all shells, can be re-spec'd freely at any time with no penalty, and resets each season. The CRADLE PROGRESSION DATABASE below lists the real tracks, perks, and Energy breakpoints - use ONLY those.
- When a build's power comes from a stat profile, prescribe the Cradle allocation: which tracks to invest in, which perks to hit, and the Energy breakpoint each perk unlocks at. Example shape: "Take Recharge to the [perk name] breakpoint for faster Tactical recovery."
- Do NOT describe stats as coming from faction rank or "faction stat bonuses." That S1 system was removed in Season 2.
- Because respec is free, you can recommend an exact optimal Cradle path without worrying about commitment cost - say so; it lowers the barrier for readers.

FACTION GEAR AWARENESS (S2 model):
Factions in Season 2 are about GEAR ACCESS and reputation, not stat power. They unlock weapons, mods, implants, cores, and Sponsored Kits through their Armory as you raise faction reputation via Contracts. Mods and implants that come from a faction are tagged in the database via faction_source - you may name that source faction (e.g. "this mod comes from the Arachne Armory").
CITING FACTION SPECIFICS - VERIFIED ONLY: A partial set of verified S2 faction Armory data is injected below (VERIFIED ARMORY STOCK and VERIFIED FACTION RANK-GATING blocks). You MAY cite the specific items, prices, ranks, and rank-gating facts that appear there, by their exact values - e.g. naming a verified item and the rank that unlocks it. For any faction or item NOT in those verified blocks (factions with no rows, or items shown as "unnamed"), you must NOT state a rank number, Credit cost, or material cost - that data is uncaptured and inventing it is a hallucination. Speak about those in general terms and point readers to /factions. Sponsored Kits remain a fair, general mention as a fast way to try a playstyle.

PLANNING TOOLS YOU CAN POINT READERS TO:
- For STAT builds (Cradle allocation, which perks to chase): the Cradle planner at /cradle lets readers map their exact Energy path and see perks light up at breakpoints. Mention it when a build hinges on a specific Cradle profile.
- For GEAR progression (which faction gates what): the /factions page covers faction Armories and reputation. Point readers there instead of citing specific unlock costs.
Use these naturally - only when knowing the path would genuinely help the reader commit to the build.

CONTENT VARIETY: Rotate through ALL 8 shells (including Sentinel). Rotate through weapon categories. If you analyzed an aggressive build last cycle, analyze support or stealth this cycle.

The 8 Runner Shells are: Destroyer, Vandal, Recon, Assassin, Triage, Thief, Rook, Sentinel.

Use the publish_build_analysis tool to publish your article.${DATA_INTEGRITY_RULES}${CANONICAL_TAG_STANDARD}`,

  GHOST: `You are GHOST, the community pulse editor for Cybernetic Punks - the autonomous Marathon intelligence hub at cyberneticpunks.com.

Your lane: Community sentiment. You track Reddit discussions and Steam reviews. You surface what real players are actually saying - not what creators or press say.

VOICE - write like these examples:

"r/MarathonTheGame is split on the Cradle this week. The top thread loves the free respec - experiment without punishment. The second-highest comment argues it flattens build identity since everyone converges on the same Dexterity path. Both are right, and that tension IS the story."

"u/_dropshot_22 captured the frustration in one line: 'the game punishes solo queue and rewards stack queue, and that's a design choice they keep doubling down on.' That post hit 1.8K upvotes in twelve hours. The community has spoken."

"Steam reviewers averaging 80+ hours played are mostly positive. Reviewers under 20 hours are angry. That's not a Marathon problem - that's an onboarding problem. Bungie should be reading these specifically."

ARTICLE QUALITY STANDARDS - NON-NEGOTIABLE:
- Body must be 400-550 words. Use **HEADER TEXT** section breaks. At least 3 sections.
- Quote or closely paraphrase specific community voices when their phrasing captures the moment.
- Ground every sentiment claim in specific evidence (Reddit thread, Steam review, post engagement metric).
- Include at least one contrarian perspective per article. The community is rarely unanimous.
- When Reddit and Steam diverge, that divergence IS the story. Lead with it.
- No PR voice, no manufactured drama. Just what people are actually saying and why it matters.

SEASON 2 COMMUNITY LANDSCAPE - WHAT PLAYERS ARE TALKING ABOUT:
Season 2 (Nightfall) launched June 2 with a full reset, and the community conversation is centered on a specific set of S2 topics. Track sentiment on these:
- THE CRADLE: the new stat-progression system (Energy across six tracks, free respec, seasonal reset). Reactions split between "freedom to experiment" and "build homogenization." High-engagement topic.
- SPONSORED KITS: ready-made faction loadouts. Community debates their value, whether they trivialize gearing, and the rep bonus for using them.
- FASTER PROGRESSION: S2 sped up faction reputation and reduced material grind. Returning S1 players have strong opinions on whether it's "too easy now" vs. "finally respects my time."
- RANKED RETURNS JUNE 14: ranked is NOT live at launch. Pre-return anticipation, anxiety about the single-queue + 5,000 minimum changes, and Rook being banned are live threads.
- OPEN PLAY WEEK (June 2-9) + the full reset: new-player influx vs. veteran "everything I earned is gone" sentiment. The new-vs-returning divide is a recurring story.
- NIGHT MARSH + SENTINEL: the new dark zone and 8th shell - first-impression reactions.
When the community reacts to any of these, that's your lane. Do NOT reference the removed S1 faction-stat-grind as if it still exists - that system is gone, replaced by the Cradle.

RANKED MODE IS LIVE: Track ranked-specific sentiment closely. (Ranked returns June 14 in S2 - pre-return community anticipation is fair game.)

Use the publish_community_pulse tool to publish your article.${DATA_INTEGRITY_RULES}${CANONICAL_TAG_STANDARD}`,

  MIRANDA: `You are MIRANDA, the field guide editor for Cybernetic Punks - the autonomous Marathon intelligence hub at cyberneticpunks.com.

Your lane: Player development. You write structured guides - shell breakdowns, mod analysis, Cradle progression, ranked prep, survival tactics - for new and improving Runners. You call players "Runners."

VOICE - write like these examples:

"Runners new to extraction shooters often misread the timer. The countdown is not telling you when to leave. It's telling you when the third-party shows up. Plan your route at the 3:00 mark, not the 0:30 mark."

"The Triage kit is the kindest shell to a new Runner. Active heal cuts squad mistakes. Passive ammo regen forgives ammo discipline you haven't learned yet. Start here. Earn the right to play Vandal."

"The Cradle is where your stats come from in Season 2. Spend your Energy in one or two tracks rather than spreading thin - and because respec is free, experiment. There is no wrong first choice you cannot undo."

ARTICLE QUALITY STANDARDS - NON-NEGOTIABLE:
- Body must be 500-700 words. Use **HEADER TEXT** section breaks. At least 4 sections.
- Include specific, actionable advice with exact item names and stat values.
- End every guide with 2-3 concrete takeaways.
- You teach without condescending. Runners are improving, not stupid.

SEASON 2 STAT MODEL - THE CRADLE (teach this correctly):
In Season 2, Runner shell stats are improved through THE CRADLE, not faction ranks. Runners spend Energy (about one per level) across six tracks - Strength, Recharge, Dexterity, Endurance, Support, Resistance - unlocking passives and named perks at Energy breakpoints. It is shared across all shells, fully re-spec-able at any time with no penalty, and resets each season. The CRADLE PROGRESSION DATABASE below has the real tracks, perks, and breakpoints - teach only those. A great beginner lesson: because respec is free, encourage new Runners to experiment without fear. When teaching a stat-focused build, tell Runners which track to invest in and which perk breakpoint to aim for.

FACTION GUIDE RESPONSIBILITY (S2 model): In Season 2, factions are about GEAR and reputation, not stats. You may tell Runners which faction's Armory a piece of gear comes from and explain that factions gate gear behind reputation built through Contracts. A partial set of VERIFIED faction Armory data is injected below - you MAY cite the specific items, prices, and rank-gates that appear in the VERIFIED ARMORY STOCK and VERIFIED FACTION RANK-GATING blocks, by their exact values. For any faction or item NOT in those verified blocks, do NOT cite a rank number, Credit cost, or material cost - that data is uncaptured and inventing it is a hallucination; speak generally and point Runners to /factions. Do not tell Runners to grind factions for stat bonuses - that S1 system is gone; stats come from the Cradle now. You can point new Runners to Sponsored Kits as a low-risk way to try a faction's playstyle before committing.

PLANNING TOOLS YOU CAN POINT READERS TO:
- For STAT builds and Cradle planning: the Cradle planner at /cradle lets Runners map their Energy path and preview perks at each breakpoint. Point stat-focused guides there.
- For GEAR and faction progression: the /factions page covers faction Armories and reputation. Point gear-progression guides there.
Use these sparingly - only when the article meaningfully benefits Runners planning that path, not as a forced CTA.

Use the publish_field_guide tool to publish your article.${DATA_INTEGRITY_RULES}${CANONICAL_TAG_STANDARD}`,
};

// ===========================================================
// GAME CONTEXT FETCH
// ===========================================================

async function fetchGameContext() {
  if (_gameContextCache && (Date.now() - _gameContextTime) < GAME_CONTEXT_TTL_MS) {
    return _gameContextCache;
  }

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    // SEASON 2: faction_stat_bonuses query REMOVED - that table held the dead
    // S1 faction-stat-grind model (stats now come from the Cradle). Added a
    // cradle_nodes query so editors can reference real Cradle tracks/perks/
    // breakpoints.
    //
    // JUNE 5, 2026: faction_unlocks query REMOVED. An audit found that table
    // holds the dead S1 .EXE stat-upgrade catalog (e.g. QUICK_VENT.EXE granting
    // "Heat Recover Speed -20" at Cyberacme Rank 4) - the exact stat-grind
    // system S2 retired and moved to the Cradle. Those .EXE "upgrades" literally
    // BECAME the Cradle perks (Quick Vent, Leech, Slider, Loot Siphon, Full
    // Throttle are all Cradle perks now). Feeding it to editors made DEXTER
    // publish self-contradicting articles (citing Quick Vent as both a Cradle
    // perk AND a faction .EXE unlock). The table stays in the DB but is no
    // longer fed to editors. Re-add a real S2 faction-Armory-gear query here
    // once that table is reseeded with actual S2 gear data. The `factions`
    // query (names/leaders/focus) is kept - that info is still valid.
    const [modsRes, coresRes, implantsRes, weaponsRes, shellsRes, factionsRes, cradleRes, factionArmoryRes, factionUpgradesRes] = await Promise.all([
      supabase.from('mod_stats').select('name, slot_type, rarity, effect_desc, stat_changes, faction_source').not('effect_desc', 'is', null).order('rarity', { ascending: false }).limit(20),
      supabase.from('core_stats').select('name, required_runner, rarity, effect_desc, meta_rating, is_shell_exclusive, ability_type').order('rarity', { ascending: false }).limit(20),
      supabase.from('implant_stats').select('name, slot_type, rarity, description, passive_name, passive_desc, stat_1_label, stat_1_value, stat_2_label, stat_2_value, stat_3_label, stat_3_value, stat_4_label, stat_4_value, stat_5_label, stat_5_value, faction_source').order('rarity', { ascending: false }).limit(18),
      supabase.from('weapon_stats').select('name, weapon_type, ammo_type, damage, fire_rate, magazine_size, range_rating, ranked_viable').order('name').limit(30),
      supabase.from('shell_stats').select('name, role, base_health, base_shield, base_speed, active_ability_name, passive_ability_name, ranked_tier_solo, ranked_tier_squad, ranked_notes').limit(10),
      supabase.from('factions').select('name, leader, focus, description').order('name'),
      supabase.from('cradle_nodes').select('stat_track, node_order, node_name, is_perk, energy_cost, cumulative_energy, effect, stat_improved').eq('game_slug', 'marathon').order('stat_track', { ascending: true }).order('node_order', { ascending: true }),
      supabase.from('faction_armory').select('faction_slug, section, item_name, item_type, rarity, credit_cost, material_cost, rank_required, shell_slug, is_free, notes').eq('game_slug', 'marathon').eq('verified', true),
      supabase.from('faction_upgrades').select('faction_slug, node_name, node_kind, rank_required, effect_desc, unlocks_in_armory').eq('game_slug', 'marathon').eq('verified', true),
    ]);

    let output = '';

    if (modsRes.data?.length) {
      const bySlot = {};
     for (const mod of modsRes.data) {
        const slot = mod.slot_type || 'Other';
        if (!bySlot[slot]) bySlot[slot] = [];
        var factionTag = mod.faction_source ? ' [' + mod.faction_source + ' Armory unlock]' : '';
        var statTag = '';
        if (mod.stat_changes && typeof mod.stat_changes === 'object') {
          var statPairs = Object.entries(mod.stat_changes).map(function(e) { return e[0] + ' ' + e[1]; });
          if (statPairs.length > 0) statTag = ' [' + statPairs.join(', ') + ']';
        }
        bySlot[slot].push(`${mod.name} (${mod.rarity || 'Unknown'})${factionTag}: ${mod.effect_desc}${statTag}`);
      }
      const lines = Object.entries(bySlot)
        .map(([slot, mods]) => `${slot} Mods:\n${mods.map(m => `  - ${m}`).join('\n')}`)
        .join('\n\n');
      output += `\n\n--- WEAPON MODS DATABASE (use exact names only) ---\n${lines}\n--- END MODS ---`;
    }

    if (coresRes.data?.length) {
      const byRunner = {};
      for (const core of coresRes.data) {
        const runner = core.required_runner || 'Unknown';
        if (!byRunner[runner]) byRunner[runner] = [];
        byRunner[runner].push(`${core.name} (${core.rarity}${core.meta_rating ? ', Meta: ' + core.meta_rating : ''}${core.is_shell_exclusive ? ', Shell-Exclusive' : ', Universal'}${core.ability_type ? ', Ability: ' + core.ability_type : ''}): ${core.effect_desc || 'Effect TBD'}`);
      }
      const lines = Object.entries(byRunner)
        .map(([runner, cores]) => `${runner} Cores:\n${cores.map(c => `  - ${c}`).join('\n')}`)
        .join('\n\n');
      output += `\n\n--- SHELL CORES DATABASE (shell-specific upgrades, use exact names) ---\n${lines}\n--- END CORES ---`;
    }

    if (implantsRes.data?.length) {
      const bySlot = {};
      for (const imp of implantsRes.data) {
        const slot = imp.slot_type || 'Other';
        if (!bySlot[slot]) bySlot[slot] = [];
        const stats = [
          imp.stat_1_label && imp.stat_1_value ? `${imp.stat_1_label}: ${imp.stat_1_value}` : null,
          imp.stat_2_label && imp.stat_2_value ? `${imp.stat_2_label}: ${imp.stat_2_value}` : null,
          imp.stat_3_label && imp.stat_3_value ? `${imp.stat_3_label}: ${imp.stat_3_value}` : null,
          imp.stat_4_label && imp.stat_4_value ? `${imp.stat_4_label}: ${imp.stat_4_value}` : null,
          imp.stat_5_label && imp.stat_5_value ? `${imp.stat_5_label}: ${imp.stat_5_value}` : null,
        ].filter(Boolean).join(', ');
        var factionTag = imp.faction_source ? ' [' + imp.faction_source + ' Armory unlock]' : '';
        bySlot[slot].push(`${imp.name} (${imp.rarity})${factionTag}${imp.description ? ' - ' + imp.description : ''}${imp.passive_name ? ' | ' + imp.passive_name : ''}${stats ? ' [' + stats + ']' : ''}`);
      }
      const lines = Object.entries(bySlot)
        .map(([slot, imps]) => `${slot} Slot:\n${imps.map(i => `  - ${i}`).join('\n')}`)
        .join('\n\n');
      output += `\n\n--- IMPLANTS DATABASE (slot upgrades) ---\n${lines}\n--- END IMPLANTS ---`;
    }

    if (weaponsRes.data && weaponsRes.data.length > 0) {
      const weaponLines = weaponsRes.data.map(function(w) {
        var parts = [
          w.weapon_type ? w.weapon_type.toUpperCase() : '',
          w.ammo_type || '',
          w.damage ? 'DMG:' + w.damage : '',
          w.fire_rate ? 'RPM:' + w.fire_rate : '',
          w.magazine_size ? 'MAG:' + w.magazine_size : '',
          w.range_rating ? 'RANGE:' + w.range_rating : '',
          w.ranked_viable === false ? '[RANKED-AVOID]' : '',
        ].filter(Boolean).join(' | ');
        return '  ' + w.name + (parts ? ' - ' + parts : '');
      }).join('\n');
      output += '\n\n--- WEAPON STATS DATABASE ---\n' + weaponLines + '\n--- END WEAPONS ---';
    }

    if (shellsRes.data && shellsRes.data.length > 0) {
      const shellLines = shellsRes.data.map(function(s) {
        return [
          '  ' + s.name + (s.role ? ' [' + s.role + ']' : ''),
          s.base_health ? '    HP:' + s.base_health + (s.base_shield ? ' | SHIELD:' + s.base_shield : '') + (s.base_speed ? ' | SPD:' + s.base_speed : '') : '',
          s.active_ability_name ? '    Active: ' + s.active_ability_name : '',
          s.passive_ability_name ? '    Passive: ' + s.passive_ability_name : '',
          (s.ranked_tier_solo || s.ranked_tier_squad) ? '    Ranked: Solo=' + (s.ranked_tier_solo || '?') + ' Squad=' + (s.ranked_tier_squad || '?') + (s.ranked_notes ? ' - ' + s.ranked_notes : '') : '',
        ].filter(Boolean).join('\n');
      }).join('\n\n');
      output += '\n\n--- SHELL STATS DATABASE ---\n' + shellLines + '\n--- END SHELLS ---';
    }

    // CRADLE PROGRESSION (S2 stat system - replaced the faction stat grind)
    if (cradleRes.data && cradleRes.data.length > 0) {
      output += '\n\n--- CRADLE PROGRESSION DATABASE (Season 2 shell stat system) ---';
      output += '\nIn Season 2, shell STATS come from the Cradle. Players spend Energy (about one per Runner level) across six stat tracks. Investment is shared across all shells, can be re-spec\'d freely with no penalty, and resets each season. Named PERKS unlock at specific Energy breakpoints. Use ONLY the tracks, perks, and breakpoints below. Do not invent perks or Energy costs.\n';
      var byTrack = {};
      cradleRes.data.forEach(function(n) {
        var t = n.stat_track || 'Other';
        if (!byTrack[t]) byTrack[t] = [];
        byTrack[t].push(n);
      });
      Object.entries(byTrack).forEach(function(entry) {
        var track = entry[0];
        var nodes = entry[1];
        output += '\n' + track.toUpperCase() + ' TRACK:\n';
        nodes.forEach(function(n) {
          if (n.is_perk) {
            // Perks are the load-bearing, citeable breakpoints.
            output += '  PERK "' + n.node_name + '" @ ' + (n.cumulative_energy != null ? n.cumulative_energy + ' Energy' : 'breakpoint') +
              (n.effect ? ' - ' + n.effect : '') + '\n';
          }
        });
        // Summarize the track's stat direction from its passive nodes without
        // asserting per-node magnitudes (those are not datamined as of June 4).
        var improves = {};
        nodes.forEach(function(n) { if (n.stat_improved) improves[n.stat_improved] = true; });
        var statList = Object.keys(improves);
        if (statList.length > 0) {
          output += '  (improves: ' + statList.join(', ') + ')\n';
        }
      });
      output += '--- END CRADLE ---';
    }

    // FACTION SYSTEM (S2 model: gear access + reputation + Sponsored Kits,
    // NOT stat bonuses - those moved to the Cradle above).
    // JUNE 5, 2026: wired to the reseeded faction_armory + faction_upgrades
    // tables (verified=true rows only). Editors may now cite the SPECIFIC
    // verified items/prices/rank-gates rendered below, but the fence holds:
    // anything NOT rendered here (factions with no verified rows, obscured
    // item names) must still be spoken about in general terms only - never
    // invented. The dataset is partial (NuCaloric + CyberAcme have depth;
    // others are sparse or absent) and grows as more in-game data is captured.
    var hasFactionData = (factionsRes.data?.length > 0);

    if (hasFactionData) {
      output += '\n\n--- FACTION SYSTEM DATABASE ---';
      output += '\nMarathon has 6 factions. In Season 2, players raise faction REPUTATION by completing Contracts (Standard and Priority) and exfiltrating with faction valuables. Higher reputation unlocks more items in that faction\'s ARMORY for purchase with Credits. Factions provide GEAR ACCESS (weapons, mods, implants, cores), SPONSORED KITS (ready-made loadouts), and unique faction implant families. Factions do NOT grant shell stat bonuses in Season 2 - shell stats come from the Cradle.\n';

      if (factionsRes.data?.length > 0) {
        output += '\nFACTIONS (names and focus):\n';
        factionsRes.data.forEach(function(f) {
          output += '  ' + f.name + (f.leader ? ' (Leader: ' + f.leader + ')' : '') + (f.focus ? ' - ' + f.focus : '') + '\n';
          if (f.description) output += '    ' + f.description + '\n';
        });
      }

      // VERIFIED ARMORY ITEMS (read directly off in-game captures).
      // Grouped by faction. Rows with a null item_name are price/slot facts
      // only (the in-game icon was obscured) - cite the price/section, never
      // a guessed name.
      var armory = factionArmoryRes.data || [];
      if (armory.length > 0) {
        output += '\nVERIFIED ARMORY STOCK (cite ONLY what appears here; null-name rows = price known, name not yet captured):\n';
        var armoryByFaction = {};
        armory.forEach(function(a) {
          var fk = a.faction_slug || 'unknown';
          if (!armoryByFaction[fk]) armoryByFaction[fk] = [];
          armoryByFaction[fk].push(a);
        });
        Object.keys(armoryByFaction).sort().forEach(function(fk) {
          output += '  ' + fk.toUpperCase() + ':\n';
          armoryByFaction[fk].forEach(function(a) {
            var name = a.item_name ? a.item_name : '(unnamed ' + (a.item_type || 'item') + ' - name not captured)';
            var bits = [
              a.section ? a.section : null,
              a.rarity ? a.rarity : null,
              (a.credit_cost != null) ? a.credit_cost + ' Credits' : null,
              a.material_cost ? a.material_cost : null,
              (a.rank_required != null) ? 'Rank ' + a.rank_required : null,
              a.shell_slug ? 'for ' + a.shell_slug : null,
              a.is_free ? 'FREE daily' : null,
            ].filter(Boolean).join(', ');
            output += '    - ' + name + (bits ? ' [' + bits + ']' : '') + (a.notes ? ' - ' + a.notes : '') + '\n';
          });
        });
      }

      // VERIFIED RANK-GATING UPGRADE NODES (which faction rank unlocks what
      // in the Armory). These are facts read off the upgrade-tree tooltips.
      var upgrades = factionUpgradesRes.data || [];
      if (upgrades.length > 0) {
        output += '\nVERIFIED FACTION RANK-GATING (upgrade nodes that unlock Armory stock or grant a stat):\n';
        upgrades.forEach(function(u) {
          var head = (u.faction_slug || '').toUpperCase() + ' Rank ' + (u.rank_required != null ? u.rank_required : '?') + ' - "' + u.node_name + '"';
          output += '  - ' + head + (u.effect_desc ? ': ' + u.effect_desc : '') + (u.unlocks_in_armory ? ' (unlocks: ' + u.unlocks_in_armory + ')' : '') + '\n';
        });
      }

      output += '\nFENCE - READ CAREFULLY: The verified data above is PARTIAL. You may cite the specific items, prices, ranks, and rank-gating facts shown above by their exact values. For any faction or item NOT listed above (e.g. factions with no rows, or items shown only as "unnamed"), you MUST speak in general terms only - do NOT invent an item name, price, rank, or cost. Point readers to /factions for fuller progression. Inventing a faction specific not shown above is a hallucination.\n';

      output += '--- END FACTION SYSTEM ---';
    }

    _gameContextCache = output;
    _gameContextTime = Date.now();
    return output;
  } catch (err) {
    console.error('[editorCore] fetchGameContext error:', err.message);
    return '';
  }
}

// ===========================================================
// MIRANDA PROMPT BUILDER (with voice examples)
// ===========================================================

export function buildMirandaPrompt(data) {
  const { videos, redditPosts, devNews, devRedditPosts, shellContext, weaponContext, modContext, implantContext, recentHeadlines, xData, _directive } = data;

  const videoSummaries = videos.slice(0, 6).map(v =>
    `TITLE: ${v.title}\nCHANNEL: ${v.channelTitle}\nDESC: ${v.description?.slice(0, 200)}\nVIDEO_ID: ${v.videoId}`
  ).join('\n---\n');

  const redditSummaries = redditPosts.slice(0, 5).map(p =>
    `TITLE: ${p.title}\nFLAIR: ${p.flair}\nCONTENT: ${p.selftext}\nSCORE: ${p.score}`
  ).join('\n---\n');

  const shellData = shellContext.length > 0
    ? shellContext.map(s => [
        `${s.name}: Role=${s.role}, Difficulty=${s.difficulty}, BestFor=${s.best_for}`,
        s.active_ability_name    ? `  Active: ${s.active_ability_name} - ${s.active_ability_description || 'TBD'}${s.active_ability_cooldown_seconds ? ' (' + s.active_ability_cooldown_seconds + 's cooldown)' : ''}` : '  Active: TBD',
        s.passive_ability_name   ? `  Passive: ${s.passive_ability_name} - ${s.passive_ability_description || 'TBD'}` : '  Passive: TBD',
        s.trait_1_name           ? `  Trait: ${s.trait_1_name} - ${s.trait_1_description}` : '',
        s.base_health            ? `  Health=${s.base_health}, Shield=${s.base_shield || 'N/A'}, Speed=${s.base_speed || 'TBD'}` : '',
        s.ranked_tier            ? `  Ranked Solo=${s.ranked_tier_solo || s.ranked_tier}, Squad=${s.ranked_tier_squad || s.ranked_tier}${s.ranked_notes ? ' - ' + s.ranked_notes : ''}` : '',
        s.strengths?.length      ? `  Strengths: ${s.strengths.join(', ')}` : '',
        s.weaknesses?.length     ? `  Weaknesses: ${s.weaknesses.join(', ')}` : '',
        s.synergizes_with?.length ? `  Pairs with: ${s.synergizes_with.join(', ')}` : ''
      ].filter(Boolean).join('\n')
      ).join('\n\n')
    : 'Shell data seeding in progress.';

  const weaponData = weaponContext.length > 0
    ? weaponContext.slice(0, 20).map(w =>
        `${w.name}: ${w.category}, ${w.ammo_type}, Range=${w.range_rating}${w.damage ? ', Dmg=' + w.damage : ''}${w.fire_rate ? ', RPM=' + w.fire_rate : ''}${w.ranked_viable === false ? ' [AVOID IN RANKED]' : ''}`
      ).join('\n')
    : 'Weapon data seeding in progress.';

  const modData = modContext.length > 0
    ? modContext.map(m =>
        `${m.name} [${m.slot_type}]: ${m.effect_summary}${m.ranked_notes ? ' - Ranked: ' + m.ranked_notes : ''}${m.faction_source ? ' [' + m.faction_source + ' Armory unlock]' : ''}`
      ).join('\n')
    : 'Mod data seeding in progress.';

  const implantData = implantContext && implantContext.length > 0
    ? implantContext.map(imp => {
        const stats = [
          imp.stat_1_label && imp.stat_1_value ? `${imp.stat_1_label}: ${imp.stat_1_value}` : null,
          imp.stat_2_label && imp.stat_2_value ? `${imp.stat_2_label}: ${imp.stat_2_value}` : null,
          imp.stat_3_label && imp.stat_3_value ? `${imp.stat_3_label}: ${imp.stat_3_value}` : null,
          imp.stat_4_label && imp.stat_4_value ? `${imp.stat_4_label}: ${imp.stat_4_value}` : null,
        ].filter(Boolean).join(', ');
        return `${imp.name} [${imp.slot_type}] (${imp.rarity})${stats ? ' - ' + stats : ''}${imp.passive_name ? ' | ' + imp.passive_name : ''}${imp.faction_source ? ' [' + imp.faction_source + ' Armory unlock]' : ''}`;
      }).join('\n')
    : 'Implant data seeding in progress.';

  const bungieNewsData = devNews?.length > 0
    ? devNews.map(n => `TITLE: ${n.title}\nURL: ${n.url}`).join('\n---\n')
    : 'No recent Bungie news found.';

  const devRedditData = devRedditPosts?.length > 0
    ? devRedditPosts.map(p => `TITLE: ${p.title}\nAUTHOR: ${p.author}\nCONTENT: ${p.selftext}\nURL: ${p.url}`).join('\n---\n')
    : 'No recent official Reddit posts found.';

  const recentHeadlinesBlock = recentHeadlines?.length > 0
    ? recentHeadlines.map((h, i) => `${i + 1}. ${h}`).join('\n')
    : 'None yet - all topics are fair game.';

  var directiveBlock = '';
  if (_directive) {
    directiveBlock = `\n\n--- EDITOR DIRECTIVE - THIS IS YOUR ASSIGNED TOPIC THIS CYCLE ---\nASSIGNMENT: ${_directive.instruction}\n${_directive.url ? 'SOURCE URL: ' + _directive.url + '\n' : ''}Write your article specifically about this topic. This overrides your normal content selection.\n---`;
  }

  // X intel block kept for backward compat - xData is null after April 27, 2026
  let xIntelBlock = '';
  if (xData?.posts?.length) {
    let xOut = '\n\n--- X COMMUNITY INTELLIGENCE ---';
    if (xData.eventPosts?.length > 0) {
      xOut += '\n\nACTIVE EVENTS / TOURNAMENTS DETECTED:\n';
      xOut += xData.eventPosts.slice(0, 6).map(p => `@${p.author}: "${p.text.slice(0, 300)}"`).join('\n\n');
    }
    if (xData.officialPosts?.length > 0) {
      xOut += '\n\nOFFICIAL BUNGIE/MARATHON POSTS:\n';
      xOut += xData.officialPosts.slice(0, 5).map(p => `@${p.author}: "${p.text.slice(0, 300)}"`).join('\n\n');
    }
    if (xData.communityPosts?.length > 0) {
      xOut += '\n\nCOMMUNITY CREATOR POSTS:\n';
      xOut += xData.communityPosts.slice(0, 10).map(p => `@${p.author}: "${p.text.slice(0, 250)}"`).join('\n\n');
    }
    xOut += '\n--- END X INTELLIGENCE ---';
    xIntelBlock = xOut;
  }

  return `You are MIRANDA, the field guide editor for Cybernetic Punks - the autonomous Marathon intelligence hub at cyberneticpunks.com.

You are the only editor who teaches rather than reports. You write structured guides for new and improving Runners. You call players "Runners."

VOICE - write like these examples:

"Runners new to extraction shooters often misread the timer. The countdown is not telling you when to leave. It's telling you when the third-party shows up. Plan your route at the 3:00 mark, not the 0:30 mark."

"The Triage kit is the kindest shell to a new Runner. Active heal cuts squad mistakes. Passive ammo regen forgives ammo discipline you haven't learned yet. Start here. Earn the right to play Vandal."

"The Cradle is where your stats come from in Season 2. Pick one or two tracks and commit your Energy - and because respec is free, never be afraid to experiment with a different path."

CONTENT PRIORITY ORDER:
1. Active directive (if assigned below) - cover immediately
2. Active community events / tournaments
3. Official Bungie dev news / patch notes
4. Guide content based on YouTube and Reddit
${directiveBlock}
${xIntelBlock}

VERIFIED SHELL DATA:
${shellData}

VERIFIED WEAPON DATA:
${weaponData}

VERIFIED MOD DATA:
${modData}

VERIFIED IMPLANT DATA:
${implantData}

OFFICIAL DEV NEWS:
${bungieNewsData}

OFFICIAL DEV REDDIT POSTS:
${devRedditData}

YOUTUBE GUIDE CONTENT:
${videoSummaries}

REDDIT COMMUNITY TIPS:
${recentHeadlinesBlock}

SEASON 2 STAT MODEL: Shell stats come from the Cradle (Energy across six tracks - Strength, Recharge, Dexterity, Endurance, Support, Resistance - perks at breakpoints, free respec, seasonal reset), NOT faction ranks. Teach the Cradle correctly and point stat-build guides to the planner at /cradle. Factions in S2 provide gear/Armory access and reputation, not stat bonuses; point gear-progression guides to /factions. Use both links sparingly and only when they genuinely help the reader.

Use the publish_field_guide tool to publish your article. Name real shells, weapons, mods, factions, and Cradle perks. Be specific and actionable. End with 2-3 concrete takeaways.${DATA_INTEGRITY_RULES}${CANONICAL_TAG_STANDARD}`;
}

// ===========================================================
// SEO KEYWORD TARGETING
// ===========================================================

async function getTargetKeyword(editor, supabase) {
  try {
    var cutoff = new Date(Date.now() - 72 * 3600 * 1000).toISOString();
    var { data } = await supabase
      .from('seo_keywords')
      .select('id, keyword, target_shell, target_weapon')
      .eq('target_editor', editor)
      .or('last_targeted_at.is.null,last_targeted_at.lt.' + cutoff)
      .order('priority', { ascending: true })
      .order('last_targeted_at', { ascending: true, nullsFirst: true })
      .limit(1)
      .single();
    if (!data) return null;
    return data;
  } catch (err) {
    return null;
  }
}

// ===========================================================
// CALL EDITOR
// ===========================================================
//
// UPDATED May 18, 2026: ce_score clamp added to normalizeEditorOutput.
// CIPHER and DEXTER were returning 0-100 scale values (e.g. 85) despite
// the prompt saying NEVER use 0-100. This is a defensive safety net:
// any ce_score above 10 gets divided by 10 and logged for visibility.

function normalizeEditorOutput(editor, toolInput) {
  var result = Object.assign({}, toolInput);
  if (editor === 'NEXUS') {
    result.ce_score = toolInput.grid_pulse;
  } else if (editor === 'GHOST') {
    result.ce_score = toolInput.mood_score;
  }
  if (!result.tags) result.tags = [];

  if (typeof result.ce_score !== 'number') {
    result.ce_score = 0;
  } else if (result.ce_score > 10) {
    // Defensive: editor returned 0-100 scale despite prompt instruction.
    // Normalize to 0-10. Logged so we can identify which editors drift.
    console.log('[editorCore] ' + editor + ' returned ce_score=' + result.ce_score + ' (>10), normalizing to ' + (result.ce_score / 10));
    result.ce_score = result.ce_score / 10;
  }

  return result;
}

export async function callEditor(editor, userPrompt, supabaseClient) {
  var systemPrompt = EDITOR_PROMPTS[editor];
  if (!systemPrompt) throw new Error('Unknown editor: ' + editor);

  if (['DEXTER', 'NEXUS', 'CIPHER', 'GHOST', 'MIRANDA'].includes(editor)) {
    const gameContext = await fetchGameContext();
    if (gameContext) systemPrompt += gameContext;
  }

  var kwData = null;
  if (supabaseClient) {
    kwData = await getTargetKeyword(editor, supabaseClient);
    if (kwData) {
      systemPrompt += '\n\n--- SEO TARGET FOR THIS ARTICLE ---\n';
      systemPrompt += 'TARGET KEYWORD: "' + kwData.keyword + '"\n';
      if (kwData.target_shell) systemPrompt += 'FOCUS SHELL: ' + kwData.target_shell + '\n';
      if (kwData.target_weapon) systemPrompt += 'FOCUS WEAPON: ' + kwData.target_weapon + '\n';
      systemPrompt += 'INSTRUCTION: Write this article so it naturally answers the search query "' + kwData.keyword + '". Include the keyword naturally in the headline and body.\n';
      systemPrompt += '--- END SEO TARGET ---\n';
    }
  }

  var maxTokens = 2048;
  if (editor === 'NEXUS')   maxTokens = 4096;
  if (editor === 'CIPHER')  maxTokens = 2048;
  if (editor === 'MIRANDA') maxTokens = 3072;
  if (editor === 'GHOST')   maxTokens = 2048;

  var tool = EDITOR_TOOLS[editor];
  if (!tool) throw new Error('No tool defined for editor: ' + editor);

  var message;
  try {
    message = await client.messages.create({
      model: ARTICLE_MODEL,
      max_tokens: maxTokens,
      system: systemPrompt,
      tools: [tool],
      tool_choice: { type: 'tool', name: tool.name },
      messages: [{ role: 'user', content: userPrompt }],
    });
  } catch (apiErr) {
    console.log('[editorCore] ' + editor + ' API error: ' + apiErr.message);
    return { _error: 'api_error', _message: apiErr.message };
  }

  var toolUseBlock = null;
  if (message.content && Array.isArray(message.content)) {
    toolUseBlock = message.content.find(function(b) { return b.type === 'tool_use' && b.name === tool.name; });
  }

  if (!toolUseBlock) {
    console.log('[editorCore] ' + editor + ' did not return tool_use block. Stop reason: ' + message.stop_reason);
    return { _error: 'no_tool_use', _stop_reason: message.stop_reason };
  }

  var parsed = normalizeEditorOutput(editor, toolUseBlock.input);

  if (kwData) {
    parsed._seo_keyword_id = kwData.id;
  }

  return parsed;
}

export async function consumeKeyword(supabase, keywordId) {
  if (!supabase || !keywordId) return;
  try {
    await supabase
      .from('seo_keywords')
      .update({ last_targeted_at: new Date().toISOString() })
      .eq('id', keywordId);
  } catch (err) {
    console.log('[editorCore] consumeKeyword error: ' + err.message);
  }
}

// ===========================================================
// COMMENT VOICES
// ===========================================================

const COMMENT_VOICES = {
  CIPHER: `You are CIPHER, the ranked intelligence editor for Cybernetic Punks. Cold, analytical, climber-focused.

Examples of how you react to articles:

"Build math is right. KKV-9SD with a Dexterity-leaning Cradle is what's climbing Holotag this week. Players running the mobility profile are extracting more often than fighting."

"This counter holds. Destroyer's passive falls off at 30m+ and the Recon kit covers exactly that range. Solid read on the engagement break."

"The shotgun tuning is the real story this patch. Ranked solo is swinging toward SMG-range duels as the WSTR loses a little of its old dominance. Adjust your engagement distance."

RULES:
- 2-3 sentences max
- No emojis
- Cite specific items, mechanics, tier states, Cradle perks, or stats
- Never hedge. Don't soften your read.`,

  NEXUS: `You are NEXUS, the meta strategist for Cybernetic Punks. Data-driven, urgent, structural.

Examples of how you react to articles:

"This build is symptomatic. Three other meta loadouts ran similar Dexterity-Endurance Cradle profiles this week. The mobility trend is real."

"Confirms what the tier list is showing. Vandal's stock is up. Solo win rate moved 14 points post-patch and squad meta is following."

"The community is sleeping on the Recon resurgence. This article connects to a meta shift that started 72 hours ago - Echo Pulse uptime hit a tipping point."

RULES:
- 2-3 sentences max
- Connect the article to broader meta or trend implications
- Cite numbers, percentages, or tier movements when relevant
- Speak like a war room briefing - concise, decisive`,

  DEXTER: `You are DEXTER, the build engineer for Cybernetic Punks. Technical, builder-minded, accessible.

Examples of how you react to articles:

"The build math checks out. A Dexterity Cradle path plus the KKV-9SD is the right axis for this shell. Win condition is mobility-driven tempo - exactly as called."

"This loadout grades higher in squad than solo. The Triage support layer needs another body to cover the heal animation. Worth flagging."

"For Runners who haven't unlocked that Armory item yet, the Reinforced Barrel substitutes at 80% effectiveness. Don't skip the build because of a reputation wall."

RULES:
- 2-3 sentences max
- Reference loadout implications, stat interactions, Cradle allocation, or accessibility
- When discussing faction-gated gear, suggest alternatives for lower-reputation players
- Technical but never gatekeepy`,

  GHOST: `You are GHOST, the community pulse tracker for Cybernetic Punks. Embedded in the playerbase, ground-level.

Examples of how you react to articles:

"The Reddit thread on this hit 2K upvotes in six hours. Community is louder about it than the patch notes suggest."

"Steam reviews are saying the same thing in different words. Long-time players see it. Casuals don't yet. That gap closes in a week."

"Worth noting: r/MarathonTheGame is split on this. Top comment agrees, second comment dismantles the take. The community isn't unanimous."

RULES:
- 2-3 sentences max
- Reference what Reddit/Steam/community is actually saying
- Cite engagement metrics, divergence between sources, or contrarian voices
- Grounded, no hype, no doom-posting`,

  MIRANDA: `You are MIRANDA, the field guide editor for Cybernetic Punks. Calm, teaching tone, calls players Runners.

Examples of how you react to articles:

"For Runners trying this build, remember the Cradle respec is free - test the stat path for a few runs before you decide it's wrong for you."

"This is the right read. New Runners often misjudge extraction timing the same way. The 3:00 mark rule covers most map states."

"The Armory unlock cost is real, but the alternative is worth practicing first. Run the standard variant for 20 matches before committing the Credits."

RULES:
- 2-3 sentences max
- Translate the article's insight into actionable advice for new or improving Runners
- Reference Cradle accessibility (free respec) or faction reputation accessibility when relevant
- Warm, helpful, never condescending. Use "Runner" not "player".`,
};

// ===========================================================
// TOPIC-AWARE COMMENTER SELECTION
// ===========================================================

const COMMENT_AFFINITY = {
  CIPHER:  ['NEXUS', 'GHOST'],
  NEXUS:   ['DEXTER', 'CIPHER'],
  DEXTER:  ['NEXUS', 'MIRANDA'],
  GHOST:   ['MIRANDA', 'NEXUS'],
  MIRANDA: ['DEXTER', 'GHOST'],
};

function selectCommenters(publishingEditor) {
  const affinity = COMMENT_AFFINITY[publishingEditor] || ['NEXUS', 'GHOST'];
  const all = ['CIPHER', 'NEXUS', 'DEXTER', 'GHOST', 'MIRANDA'].filter(e => e !== publishingEditor);
  const wildcards = all.filter(e => !affinity.includes(e));

  const selected = [...affinity];

  if (Math.random() < 0.3 && wildcards.length > 0) {
    const wildcard = wildcards[Math.floor(Math.random() * wildcards.length)];
    selected.push(wildcard);
  }

  return selected;
}

// ===========================================================
// COMMENT GENERATION - Haiku, parallel, topic-aware
// ===========================================================

export async function generateArticleComments(article, publishingEditor, supabaseClient, tierChangeContext) {
  var selected = selectCommenters(publishingEditor);

  // MAY 20, 2026 - Tier-change-aware commentary:
  // When tierChangeContext is provided (only from cron during a NEXUS regrade
  // cycle that produced actual movers), use an alternate prompt telling the
  // commenting editors they are reacting to specific tier changes rather than
  // a generic article. COMMENT_VOICES (the per-editor personalities) are
  // unchanged - only the user prompt body differs. Defaults to existing
  // behavior when tierChangeContext is null/empty.
  var prompt;
  if (tierChangeContext && tierChangeContext.isTierRegrade && Array.isArray(tierChangeContext.movers) && tierChangeContext.movers.length > 0) {
    var moversText = tierChangeContext.movers.map(function(m) {
      var arrow = m.trend === 'up' ? 'UP' : (m.trend === 'down' ? 'DOWN' : 'CHANGED');
      return '  - ' + m.name + ' (' + (m.type || '').toUpperCase() + '): ' + (m.oldTier || '?') + ' -> ' + (m.newTier || '?') + ' [' + arrow + ']';
    }).join('\n');
    prompt = 'NEXUS just regraded the Marathon meta tier list. These items moved tiers this cycle:\n\n' + moversText + '\n\nReact to these SPECIFIC tier changes in your editorial voice. Pick the 1-2 movers that matter most given your focus. Say whether you agree with the move, what it means for players, or what NEXUS might be missing. Be specific to the items that moved - do NOT write a generic meta take. Keep it to 2-3 sentences max.\n\nARTICLE HEADLINE: ' + article.headline + '\n\nARTICLE BODY (first 400 chars): ' + (article.body || '').slice(0, 400) + '\n\nRespond with ONLY your comment text - no JSON, no labels, no quotes around the comment.';
  } else {
    prompt = 'React to this Marathon gaming article in your voice. Keep it to 2-3 sentences max. Be specific to the content - quote a specific point, react to a specific claim, or extend the argument.\n\nHEADLINE: ' + article.headline + '\n\nARTICLE BODY (first 400 chars): ' + (article.body || '').slice(0, 400) + '\n\nRespond with ONLY your comment text - no JSON, no labels, no quotes around the comment.';
  }

  var settled = await Promise.allSettled(
    selected.map(function(editor) {
      return client.messages.create({
        model: COMMENT_MODEL,
        max_tokens: 200,
        system: COMMENT_VOICES[editor],
        messages: [{ role: 'user', content: prompt }],
      }).then(function(message) {
        var commentText = message.content[0].text.trim();
        if (commentText && commentText.length > 10) {
          return { editor: editor, body: commentText };
        }
        return null;
      });
    })
  );

  var comments = [];
  settled.forEach(function(result, idx) {
    if (result.status === 'fulfilled' && result.value) {
      comments.push(result.value);
    } else if (result.status === 'rejected') {
      console.log('[editorCore] comment generation failed for ' + selected[idx] + ': ' + (result.reason?.message || 'unknown'));
    }
  });

  if (comments.length > 0 && supabaseClient) {
    try {
      var rows = comments.map(function(c) { return { article_id: article.id, editor: c.editor, body: c.body }; });
      var { error } = await supabaseClient.from('article_comments').insert(rows);
      if (error) console.log('[editorCore] comment insert error: ' + error.message);
      else console.log('[editorCore] inserted ' + comments.length + ' comments (' + selected.join('+') + ') for: ' + article.headline.slice(0, 50));
    } catch (err) {
      console.log('[editorCore] comment DB error: ' + err.message);
    }
  }

  return comments;
}