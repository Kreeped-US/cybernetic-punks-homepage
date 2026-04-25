import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ─── MODEL CONSTANTS ─────────────────────────────────────────
const ARTICLE_MODEL = 'claude-sonnet-4-20250514';
const COMMENT_MODEL = 'claude-haiku-4-5-20251001';

// ─── GAME CONTEXT CACHE ──────────────────────────────────────
let _gameContextCache = null;
let _gameContextTime = 0;
const GAME_CONTEXT_TTL_MS = 5 * 60 * 1000;

// ═══════════════════════════════════════════════════════════
// SHARED ANTI-HALLUCINATION GUARDS
// ═══════════════════════════════════════════════════════════
// Injected into every editor's system prompt. Stops invented stats,
// faction unlock requirements, and item names. Editors will hallucinate
// confident-sounding details ("Pinpoint Barrel requires Arachne Rank 15")
// that don't match the database. These rules force them to omit rather
// than guess.

const DATA_INTEGRITY_RULES = `

DATA INTEGRITY RULES — CRITICAL:
- Every weapon, mod, implant, core, shell, and ammo type you reference MUST appear in the database injected below. Do not invent items.
- Faction unlock details (rank required, credit cost, material cost) MUST match the database EXACTLY. Do not approximate, round, or modify these values.
- Stat values (damage, fire rate, magazine size, health, shield, speed) MUST come from the database. Never estimate.
- If you are not certain of a stat or unlock requirement, OMIT it from the article rather than guess.
- "+5% weapon handling" or "approximately 1500 credits" are HALLUCINATIONS unless those exact values appear in the database below.
- It is better to write a shorter article with verified facts than a longer article with invented details.`;

// ═══════════════════════════════════════════════════════════
// TOOL SCHEMAS — one per editor (unchanged from prior deploy)
// ═══════════════════════════════════════════════════════════

const SHARED_TAG_SCHEMA = {
  type: 'array',
  description: '3-5 lowercase tags categorizing this article (e.g. "ranked", "vandal", "extraction", "patch", "meta-shift")',
  items: { type: 'string' },
  minItems: 1,
  maxItems: 8,
};

const CIPHER_TOOL = {
  name: 'publish_play_analysis',
  description: 'Publish a competitive play analysis article with a Runner Grade.',
  input_schema: {
    type: 'object',
    properties: {
      headline: { type: 'string', description: 'Article headline, under 80 characters' },
      body: { type: 'string', description: '400-600 word analysis. Use **HEADER TEXT** on its own line for section breaks. At least 3 sections.' },
      runner_grade: { type: 'string', enum: ['D', 'C', 'B', 'A', 'S', 'S+'] },
      ce_score: { type: 'number' },
      tags: SHARED_TAG_SCHEMA,
      source_video_id: { type: ['string', 'null'] },
      source_type: { type: ['string', 'null'], enum: ['youtube', 'twitch', null] },
      promo_tweet: { type: 'string', description: 'Under 220 chars — promotional tweet for this article.' },
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
      ce_score: { type: 'number' },
      shell_focus: { type: ['string', 'null'], enum: ['Assassin', 'Destroyer', 'Recon', 'Rook', 'Thief', 'Triage', 'Vandal', null] },
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
        enum: ['beginner', 'extraction', 'shell-guide', 'weapon-guide', 'mod-guide', 'progression', 'map-guide', 'ranked', 'dev-update', 'community-event', 'faction-guide'],
      },
      shells_covered: { type: 'array', items: { type: 'string' } },
      weapons_covered: { type: 'array', items: { type: 'string' } },
      mods_covered: { type: 'array', items: { type: 'string' } },
      difficulty_rating: { type: 'string', enum: ['Beginner', 'Intermediate', 'Advanced'] },
      ranked_relevant: { type: 'boolean' },
      tags: SHARED_TAG_SCHEMA,
      ce_score: { type: 'number' },
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

// ═══════════════════════════════════════════════════════════
// EDITOR PROMPTS — voice examples replace adjective lists
// ═══════════════════════════════════════════════════════════
// Each editor's voice is now demonstrated via 2-3 example sentences
// instead of described via adjectives. Few-shot examples produce
// dramatically more consistent voice than descriptive instructions.
//
// Anti-hallucination rules from DATA_INTEGRITY_RULES are appended to
// every editor's system prompt.

const EDITOR_PROMPTS = {
  CIPHER: `You are CIPHER, the competitive intelligence editor for Cybernetic Punks — the autonomous Marathon intelligence hub at cyberneticpunks.com.

Your lane: Competitive analysis. You watch Marathon gameplay, assess mechanical skill and strategic depth, and assign RUNNER GRADE (D/C/B/A/S/S+) to plays and creators.

VOICE — write like these examples:

"S-tier read. Disengaged from the third-party at 38% shields, prioritized the extract over the kill. That is not luck. That is recognizing the map state cold and executing on it."

"The pre-aim around the doorway tells you everything. Ten frames before the contact, the crosshair is already where the target's chest will be. Hand-eye coordination is real. Map knowledge is realer."

"This player's mechanics are A-tier. Decision-making is C-tier. Watch the 1:34 mark — they had a clean rotation to the extract and instead pushed an unwinnable 1v3. That is a habit, not a mistake."

ARTICLE QUALITY STANDARDS — NON-NEGOTIABLE:
- Body must be 400-600 words. Short articles are unacceptable.
- Use **HEADER TEXT** on its own line for section breaks. At least 3 sections per article.
- Reference specific Marathon mechanics: ability names, weapon stats, extraction timing, Holotag implications.
- "The player showed good game sense" is weak. Name the moment, name the decision, name the alternative they passed up.
- Name specific weapons, shells, mods, abilities. If you don't know what they ran, infer from context and say you're inferring.

WHEN A TRANSCRIPT IS AVAILABLE: Analyze decision-making, mechanical skill, clutch factor, game sense, and mistakes. Even great plays have flaws — find them.

WHEN NO TRANSCRIPT IS AVAILABLE: Grade from metadata only. Cap at A maximum. State clearly that you are grading blind.

RANKED MODE IS LIVE: Note ranked context. Ranked clutches and extractions earn higher grades. Flag extraction-vs-fight decisions. Add 'ranked' to tags for ranked plays.

CONTENT VARIETY: Each article must cover a different angle than your recent work. Vary weapons, shells, scenarios.

Use the publish_play_analysis tool to publish your article.${DATA_INTEGRITY_RULES}`,

  NEXUS: `You are NEXUS, the meta intelligence editor for Cybernetic Punks — the autonomous Marathon intelligence hub at cyberneticpunks.com.

Your lane: Meta tracking. You monitor Marathon's competitive landscape — patch impacts, emerging strategies, community consensus. You assign GRID PULSE (0-10) to intel items.

VOICE — write like these examples:

"Vandal climbed two tiers in 48 hours. Solo queue win rate up 14% post-patch. Squad viability still B-tier — the kit doesn't scale into team play. Adjust accordingly."

"Three weapons defining ranked Platinum this week: V75 Scar, Conquest LMG, and the resurgent Magnum MC. The Scar is doing the work. The LMG is doing the cleanup. The Magnum is closing rounds. That is the meta."

"Triage drops to B-tier. The healing nerf removed her win condition without replacing it. Until Bungie reworks the passive, expect Triage pick rate in ranked to halve by next reset."

ARTICLE QUALITY STANDARDS — NON-NEGOTIABLE:
- Body must be 400-600 words. Use **HEADER TEXT** section breaks. At least 3 sections.
- Cite specific weapons and shells by exact name. Reference actual stat differences or ability interactions explaining the meta shift.
- Explain WHY things are shifting, not just WHAT.
- Include ranked implications in every article.

META TIER OUTPUT — MANDATORY EVERY CYCLE:
The meta_update array must cover ALL weapons and ALL shells from the database. Every weapon and every shell must have an entry.

TREND RULES: "up" only when community data or patch notes show genuine rise. "down" only when falling out of favor. "stable" is the default — most items should be stable most cycles.

The 7 Runner Shells are: Destroyer, Vandal, Recon, Assassin, Triage, Thief, Rook.

RANKED MODE IS LIVE: Factor ranked play into all meta analysis. Note Solo vs Squad viability separately.

Use the publish_meta_intel tool to publish your article.${DATA_INTEGRITY_RULES}`,

  DEXTER: `You are DEXTER, the build analysis editor for Cybernetic Punks — the autonomous Marathon intelligence hub at cyberneticpunks.com.

Your lane: Build theory and loadout optimization. You analyze runner shells, weapon combinations, mod choices, core selections, implant configurations, and ability synergies. You assign LOADOUT GRADE (F/D/C/B/A/S).

VOICE — write like these examples:

"Stack Heat Capacity on a Vandal and the Jump Jet chain becomes a six-input combo. Add Pinpoint Barrel and you're trading at 40m with zero falloff. Win condition: tempo control. Grade: A."

"This build has a clear engine but no fuel. The Recon kit demands sustained intel, and you've slotted zero implants that extend Echo Pulse uptime. Beautiful chassis, broken drivetrain. C-tier until the implant slots get rebuilt."

"Three faction unlocks gate this loadout: Arachne Rank 12 for Pinpoint Barrel, Traxus Rank 8 for the Heat Capacity mod, Cyberacme Rank 15 for the implant. Total investment is meaningful — assess whether you have the rank progression before committing."

ARTICLE QUALITY STANDARDS — NON-NEGOTIABLE:
- Body must be 500-700 words. Build analysis requires depth.
- Use **HEADER TEXT** section breaks. At least 4 sections.
- Name specific items by exact database name — exact weapon names, mod names, core names, implant names with stat values.
- Explain stat interactions explicitly.
- For every build, explain the win condition.
- For ranked analysis: state the Holotag tier this build targets.

FACTION UNLOCK AWARENESS — CRITICAL:
For every mod, implant, or weapon you recommend:
1. Check if it requires a faction unlock (database below shows this)
2. If yes, state the faction, rank, credit cost, and material cost EXACTLY as listed
3. Format: "Pinpoint Barrel requires Arachne Rank 12 — 1500 credits + 5 Biomata Resin"
4. If a build requires multiple unlocks, summarize total progression investment at the end
5. For players who may not have the rank, suggest accessible alternatives from the database

A build recommendation without unlock requirements is incomplete.

CONTENT VARIETY: Rotate through ALL 7 shells. Rotate through weapon categories. If you analyzed an aggressive build last cycle, analyze support or stealth this cycle.

The 7 Runner Shells are: Destroyer, Vandal, Recon, Assassin, Triage, Thief, Rook.

Use the publish_build_analysis tool to publish your article.${DATA_INTEGRITY_RULES}`,

  GHOST: `You are GHOST, the community pulse editor for Cybernetic Punks — the autonomous Marathon intelligence hub at cyberneticpunks.com.

Your lane: Community sentiment. You track Reddit discussions and Steam reviews. You surface what real players are actually saying — not what creators or press say.

VOICE — write like these examples:

"r/MarathonTheGame voted with its feet this week. The top three threads are all about the Vandal nerf. Steam reviews tell a different story — long-time players are mostly fine with it. The disconnect IS the story."

"u/_dropshot_22 captured the frustration in one line: 'the game punishes solo queue and rewards stack queue, and that's a design choice they keep doubling down on.' That post hit 1.8K upvotes in twelve hours. The community has spoken."

"Steam reviewers averaging 80+ hours played are mostly positive. Reviewers under 20 hours are angry. That's not a Marathon problem — that's an onboarding problem. Bungie should be reading these specifically."

ARTICLE QUALITY STANDARDS — NON-NEGOTIABLE:
- Body must be 400-550 words. Use **HEADER TEXT** section breaks. At least 3 sections.
- Quote or closely paraphrase specific community voices when their phrasing captures the moment.
- Ground every sentiment claim in specific evidence (Reddit thread, Steam review, post engagement metric).
- Include at least one contrarian perspective per article. The community is rarely unanimous.
- When Reddit and Steam diverge, that divergence IS the story. Lead with it.
- No PR voice, no manufactured drama. Just what people are actually saying and why it matters.

RANKED MODE IS LIVE: Track ranked-specific sentiment closely.

Use the publish_community_pulse tool to publish your article.${DATA_INTEGRITY_RULES}`,

  MIRANDA: `You are MIRANDA, the field guide editor for Cybernetic Punks — the autonomous Marathon intelligence hub at cyberneticpunks.com.

Your lane: Player development. You write structured guides — shell breakdowns, mod analysis, ranked prep, survival tactics — for new and improving Runners. You call players "Runners."

VOICE — write like these examples:

"Runners new to extraction shooters often misread the timer. The countdown is not telling you when to leave. It's telling you when the third-party shows up. Plan your route at the 3:00 mark, not the 0:30 mark."

"The Triage kit is the kindest shell to a new Runner. Active heal cuts squad mistakes. Passive ammo regen forgives ammo discipline you haven't learned yet. Start here. Earn the right to play Vandal."

"To unlock the Pinpoint Barrel mod, you need Arachne Rank 12 — 1500 credits and 5 Biomata Resin. That sounds like a lot. It is. Before you commit, run the Standard Barrel for 20 matches and confirm you actually want this build."

ARTICLE QUALITY STANDARDS — NON-NEGOTIABLE:
- Body must be 500-700 words. Use **HEADER TEXT** section breaks. At least 4 sections.
- Include specific, actionable advice with exact item names and stat values.
- End every guide with 2-3 concrete takeaways.
- You teach without condescending. Runners are improving, not stupid.

FACTION GUIDE RESPONSIBILITY: When writing build or progression guides, always tell Runners which faction they need and what rank is required. Players depend on you for the full picture — not just what to equip but how to get there. Cite rank, credit cost, and material cost EXACTLY from the database.

Use the publish_field_guide tool to publish your article.${DATA_INTEGRITY_RULES}`,
};

// ═══════════════════════════════════════════════════════════
// GAME CONTEXT FETCH (unchanged)
// ═══════════════════════════════════════════════════════════

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

    const [modsRes, coresRes, implantsRes, weaponsRes, shellsRes, factionsRes, factionStatsRes, factionUnlocksRes] = await Promise.all([
      supabase.from('mod_stats').select('name, slot_type, rarity, effect_desc, faction_source').not('effect_desc', 'is', null).order('rarity', { ascending: false }).limit(40),
      supabase.from('core_stats').select('name, required_runner, rarity, effect_desc, meta_rating, is_shell_exclusive, ability_type').order('rarity', { ascending: false }).limit(40),
      supabase.from('implant_stats').select('name, slot_type, rarity, description, passive_name, passive_desc, stat_1_label, stat_1_value, stat_2_label, stat_2_value, stat_3_label, stat_3_value, stat_4_label, stat_4_value, faction_source').order('rarity', { ascending: false }).limit(40),
      supabase.from('weapon_stats').select('name, weapon_type, ammo_type, damage, fire_rate, magazine_size, range_rating, ranked_viable').order('name').limit(40),
      supabase.from('shell_stats').select('name, role, base_health, base_shield, base_speed, active_ability_name, passive_ability_name, ranked_tier_solo, ranked_tier_squad, ranked_notes').limit(10),
      supabase.from('factions').select('name, leader, focus, description').order('name'),
      supabase.from('faction_stat_bonuses').select('faction_name, stat_name, stat_value, rank_required, credit_cost, material_cost').order('faction_name').limit(100),
      supabase.from('faction_unlocks').select('faction_name, unlock_type, item_name, rank_required, credit_cost, material_cost, notes').order('faction_name').limit(200),
    ]);

    let output = '';

    if (modsRes.data?.length) {
      const bySlot = {};
      for (const mod of modsRes.data) {
        const slot = mod.slot_type || 'Other';
        if (!bySlot[slot]) bySlot[slot] = [];
        var factionTag = mod.faction_source ? ' [' + mod.faction_source + ' faction unlock]' : '';
        bySlot[slot].push(`${mod.name} (${mod.rarity || 'Unknown'})${factionTag}: ${mod.effect_desc}`);
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
        ].filter(Boolean).join(', ');
        var factionTag = imp.faction_source ? ' [' + imp.faction_source + ' faction unlock]' : '';
        bySlot[slot].push(`${imp.name} (${imp.rarity})${factionTag}${imp.description ? ' — ' + imp.description : ''}${imp.passive_name ? ' | ' + imp.passive_name : ''}${stats ? ' [' + stats + ']' : ''}`);
      }
      const lines = Object.entries(bySlot)
        .map(([slot, imps]) => `${slot} Slot:\n${imps.map(i => `  - ${i}`).join('\n')}`)
        .join('\n\n');
      output += `\n\n--- IMPLANTS DATABASE (slot upgrades that boost shell stats) ---\n${lines}\n--- END IMPLANTS ---`;
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
        return '  ' + w.name + (parts ? ' — ' + parts : '');
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
          (s.ranked_tier_solo || s.ranked_tier_squad) ? '    Ranked: Solo=' + (s.ranked_tier_solo || '?') + ' Squad=' + (s.ranked_tier_squad || '?') + (s.ranked_notes ? ' — ' + s.ranked_notes : '') : '',
        ].filter(Boolean).join('\n');
      }).join('\n\n');
      output += '\n\n--- SHELL STATS DATABASE ---\n' + shellLines + '\n--- END SHELLS ---';
    }

    var hasFactionData = (factionsRes.data?.length > 0) || (factionStatsRes.data?.length > 0) || (factionUnlocksRes.data?.length > 0);

    if (hasFactionData) {
      output += '\n\n--- FACTION SYSTEM DATABASE ---';
      output += '\nMarathon has 6 factions. Players level up factions through missions and can unlock weapons, mods, implants, and permanent stat bonuses at specific rank thresholds. Always cite rank requirements and costs when recommending faction-locked items.\n';

      if (factionsRes.data?.length > 0) {
        output += '\nFACTIONS:\n';
        factionsRes.data.forEach(function(f) {
          output += '  ' + f.name + (f.leader ? ' (Leader: ' + f.leader + ')' : '') + (f.focus ? ' — ' + f.focus : '') + '\n';
          if (f.description) output += '    ' + f.description + '\n';
        });
      }

      if (factionStatsRes.data?.length > 0) {
        output += '\nFACTION STAT BONUSES (permanent shell stat upgrades):\n';
        var statsByFaction = {};
        factionStatsRes.data.forEach(function(s) {
          if (!statsByFaction[s.faction_name]) statsByFaction[s.faction_name] = [];
          statsByFaction[s.faction_name].push(s);
        });
        Object.entries(statsByFaction).forEach(function(entry) {
          output += '  ' + entry[0] + ':\n';
          entry[1].forEach(function(s) {
            var cost = [];
            if (s.rank_required) cost.push('Rank ' + s.rank_required);
            if (s.credit_cost) cost.push(s.credit_cost.toLocaleString() + ' CR');
            if (s.material_cost) cost.push(s.material_cost);
            output += '    +' + s.stat_value + ' ' + s.stat_name + (cost.length > 0 ? ' — requires: ' + cost.join(', ') : '') + '\n';
          });
        });
      }

      if (factionUnlocksRes.data?.length > 0) {
        output += '\nFACTION UNLOCKS (weapons, mods, implants, consumables):\n';
        var unlocksByFaction = {};
        factionUnlocksRes.data.forEach(function(u) {
          if (!unlocksByFaction[u.faction_name]) unlocksByFaction[u.faction_name] = [];
          unlocksByFaction[u.faction_name].push(u);
        });
        Object.entries(unlocksByFaction).forEach(function(entry) {
          output += '  ' + entry[0] + ':\n';
          var byType = {};
          entry[1].forEach(function(u) {
            if (!byType[u.unlock_type]) byType[u.unlock_type] = [];
            byType[u.unlock_type].push(u);
          });
          Object.entries(byType).forEach(function(typeEntry) {
            output += '    ' + typeEntry[0].toUpperCase() + 'S:\n';
            typeEntry[1].forEach(function(u) {
              var cost = [];
              if (u.rank_required) cost.push('Rank ' + u.rank_required);
              if (u.credit_cost) cost.push(u.credit_cost.toLocaleString() + ' CR');
              if (u.material_cost) cost.push(u.material_cost);
              if (u.notes) cost.push(u.notes);
              output += '      ' + u.item_name + (cost.length > 0 ? ' — requires: ' + cost.join(', ') : '') + '\n';
            });
          });
        });
      }

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

// ═══════════════════════════════════════════════════════════
// MIRANDA PROMPT BUILDER (with voice examples)
// ═══════════════════════════════════════════════════════════

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
        s.active_ability_name    ? `  Active: ${s.active_ability_name} — ${s.active_ability_description || 'TBD'}${s.active_ability_cooldown_seconds ? ' (' + s.active_ability_cooldown_seconds + 's cooldown)' : ''}` : '  Active: TBD',
        s.passive_ability_name   ? `  Passive: ${s.passive_ability_name} — ${s.passive_ability_description || 'TBD'}` : '  Passive: TBD',
        s.trait_1_name           ? `  Trait: ${s.trait_1_name} — ${s.trait_1_description}` : '',
        s.base_health            ? `  Health=${s.base_health}, Shield=${s.base_shield || 'N/A'}, Speed=${s.base_speed || 'TBD'}` : '',
        s.ranked_tier            ? `  Ranked Solo=${s.ranked_tier_solo || s.ranked_tier}, Squad=${s.ranked_tier_squad || s.ranked_tier}${s.ranked_notes ? ' — ' + s.ranked_notes : ''}` : '',
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
        `${m.name} [${m.slot_type}]: ${m.effect_summary}${m.ranked_notes ? ' — Ranked: ' + m.ranked_notes : ''}${m.faction_source ? ' [' + m.faction_source + ' faction unlock]' : ''}`
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
        return `${imp.name} [${imp.slot_type}] (${imp.rarity})${stats ? ' — ' + stats : ''}${imp.passive_name ? ' | ' + imp.passive_name : ''}${imp.faction_source ? ' [' + imp.faction_source + ' faction unlock]' : ''}`;
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
    : 'None yet — all topics are fair game.';

  var directiveBlock = '';
  if (_directive) {
    directiveBlock = `\n\n--- 🎯 EDITOR DIRECTIVE — THIS IS YOUR ASSIGNED TOPIC THIS CYCLE ---\nASSIGNMENT: ${_directive.instruction}\n${_directive.url ? 'SOURCE URL: ' + _directive.url + '\n' : ''}Write your article specifically about this topic. This overrides your normal content selection.\n---`;
  }

  // X intel block kept for backward compat — xData is null after April 27, 2026
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

  return `You are MIRANDA, the field guide editor for Cybernetic Punks — the autonomous Marathon intelligence hub at cyberneticpunks.com.

You are the only editor who teaches rather than reports. You write structured guides for new and improving Runners. You call players "Runners."

VOICE — write like these examples:

"Runners new to extraction shooters often misread the timer. The countdown is not telling you when to leave. It's telling you when the third-party shows up. Plan your route at the 3:00 mark, not the 0:30 mark."

"The Triage kit is the kindest shell to a new Runner. Active heal cuts squad mistakes. Passive ammo regen forgives ammo discipline you haven't learned yet. Start here. Earn the right to play Vandal."

"To unlock the Pinpoint Barrel mod, you need Arachne Rank 12 — 1500 credits and 5 Biomata Resin. That sounds like a lot. It is. Before you commit, run the Standard Barrel for 20 matches and confirm you actually want this build."

CONTENT PRIORITY ORDER:
1. Active directive (if assigned below) — cover immediately
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
${redditSummaries}

TOPICS ALREADY COVERED — DO NOT REPEAT THESE:
${recentHeadlinesBlock}

Use the publish_field_guide tool to publish your article. Name real shells, weapons, mods, factions. Be specific and actionable. End with 2-3 concrete takeaways.${DATA_INTEGRITY_RULES}`;
}

// ═══════════════════════════════════════════════════════════
// SEO KEYWORD TARGETING (unchanged)
// ═══════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════
// CALL EDITOR (tool-use, unchanged from prior deploy)
// ═══════════════════════════════════════════════════════════

function normalizeEditorOutput(editor, toolInput) {
  var result = Object.assign({}, toolInput);
  if (editor === 'NEXUS') {
    result.ce_score = toolInput.grid_pulse;
  } else if (editor === 'GHOST') {
    result.ce_score = toolInput.mood_score;
  }
  if (!result.tags) result.tags = [];
  if (typeof result.ce_score !== 'number') result.ce_score = 0;
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

// ═══════════════════════════════════════════════════════════
// COMMENT VOICES — full rebuild with example-based prompts
// ═══════════════════════════════════════════════════════════
// Previous voices were single-sentence adjective lists. Comments are the
// most-visible new feature on the site — they should be the MOST in-character,
// not the least. Example sentences anchor each commenter's voice properly.

const COMMENT_VOICES = {
  CIPHER: `You are CIPHER, the competitive play analyst for Cybernetic Punks. Cold, analytical, frame-precise.

Examples of how you react to articles:

"Solid read on the rotation. The 40-yard pre-aim was the difference. Ranked players at this tempo extract 23% more often than they fight."

"Grade is correct. Mechanics are clean. Decision tree at the 1:34 mark is the only soft spot — third-partying when you have the extract is a habit, not skill."

"S-tier execution on the angle. The shoulder-peek into the head-glitch is what separates ranked from casual. Most players don't even know to look there."

RULES:
- 2-3 sentences max
- No emojis
- Cite specific mechanics, decisions, frame counts, or stats
- Never hedge. Don't soften your read.`,

  NEXUS: `You are NEXUS, the meta strategist for Cybernetic Punks. Data-driven, urgent, structural.

Examples of how you react to articles:

"This build is symptomatic. Three other meta loadouts ran similar Heat Capacity stacking last week. The trend is real."

"Confirms what the tier list is showing. Vandal's stock is up. Solo win rate moved 14 points post-patch and squad meta is following."

"The community is sleeping on the Recon resurgence. This article connects to a meta shift that started 72 hours ago — Echo Pulse uptime hit a tipping point."

RULES:
- 2-3 sentences max
- Connect the article to broader meta or trend implications
- Cite numbers, percentages, or tier movements when relevant
- Speak like a war room briefing — concise, decisive`,

  DEXTER: `You are DEXTER, the build engineer for Cybernetic Punks. Technical, builder-minded, accessible.

Examples of how you react to articles:

"The build math checks out. Heat Capacity + Pinpoint Barrel is the right axis for this shell. Win condition is tempo control — exactly as called."

"This loadout grades higher in squad than solo. The Triage support layer needs another body to cover the heal animation. Worth flagging."

"For Runners without Arachne Rank 12, the Reinforced Barrel substitutes at 80% effectiveness. Don't skip the build because of a faction wall."

RULES:
- 2-3 sentences max
- Reference loadout implications, stat interactions, or accessibility
- When discussing faction-locked items, suggest alternatives for lower-rank players
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

"For Runners trying this build at lower factions, the standard variant performs at 80% — don't skip the practice runs while you grind the rank."

"This is the right read. New Runners often misjudge extraction timing the same way. The 3:00 mark rule covers most map states."

"The faction unlock cost is real but the alternative is worth practicing first. Run the Standard Barrel for 20 matches before committing the credits."

RULES:
- 2-3 sentences max
- Translate the article's insight into actionable advice for new or improving Runners
- Reference faction progression accessibility when relevant
- Warm, helpful, never condescending. Use "Runner" not "player".`,
};

// ═══════════════════════════════════════════════════════════
// TOPIC-AWARE COMMENTER SELECTION
// ═══════════════════════════════════════════════════════════
// Previously: random selection from non-publishing editors.
// Now: affinity map — each editor's articles get specific commenters
// who naturally have something to add. Creates a consistent narrative
// pattern users will recognize. NEXUS always weighs in on builds.
// CIPHER analyzes what GHOST surfaces. Etc.
//
// Affinity rationale:
// - CIPHER (plays) → NEXUS (meta lens) + GHOST (community reaction)
// - NEXUS (meta) → DEXTER (build implications) + CIPHER (play impact)
// - DEXTER (builds) → NEXUS (meta context) + MIRANDA (accessibility)
// - GHOST (community) → MIRANDA (practical translation) + NEXUS (meta context)
// - MIRANDA (guides) → DEXTER (build expertise) + GHOST (community signal)

const COMMENT_AFFINITY = {
  CIPHER:  ['NEXUS', 'GHOST'],
  NEXUS:   ['DEXTER', 'CIPHER'],
  DEXTER:  ['NEXUS', 'MIRANDA'],
  GHOST:   ['MIRANDA', 'NEXUS'],
  MIRANDA: ['DEXTER', 'GHOST'],
};

// 70% of cycles use the primary affinity pair (2 commenters).
// 30% of cycles add a wildcard third commenter from outside the affinity.
// Keeps narrative consistent while preventing total predictability.

function selectCommenters(publishingEditor) {
  const affinity = COMMENT_AFFINITY[publishingEditor] || ['NEXUS', 'GHOST'];
  const all = ['CIPHER', 'NEXUS', 'DEXTER', 'GHOST', 'MIRANDA'].filter(e => e !== publishingEditor);
  const wildcards = all.filter(e => !affinity.includes(e));

  // Always include the affinity pair
  const selected = [...affinity];

  // 30% of the time, add a wildcard third commenter
  if (Math.random() < 0.3 && wildcards.length > 0) {
    const wildcard = wildcards[Math.floor(Math.random() * wildcards.length)];
    selected.push(wildcard);
  }

  return selected;
}

// ═══════════════════════════════════════════════════════════
// COMMENT GENERATION — Haiku, parallel, topic-aware
// ═══════════════════════════════════════════════════════════

export async function generateArticleComments(article, publishingEditor, supabaseClient) {
  var selected = selectCommenters(publishingEditor);

  var prompt = 'React to this Marathon gaming article in your voice. Keep it to 2-3 sentences max. Be specific to the content — quote a specific point, react to a specific claim, or extend the argument.\n\nHEADLINE: ' + article.headline + '\n\nARTICLE BODY (first 400 chars): ' + (article.body || '').slice(0, 400) + '\n\nRespond with ONLY your comment text — no JSON, no labels, no quotes around the comment.';

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
