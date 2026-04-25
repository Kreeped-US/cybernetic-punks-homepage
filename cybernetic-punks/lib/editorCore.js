import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ─── MODEL CONSTANTS ─────────────────────────────────────────
// Centralized so we can update everywhere at once.
const ARTICLE_MODEL = 'claude-sonnet-4-20250514';
const COMMENT_MODEL = 'claude-haiku-4-5-20251001';

// ─── GAME CONTEXT CACHE ──────────────────────────────────────
// fetchGameContext was being called 5x per cycle (once per editor),
// hitting Supabase 8 times each call and injecting ~6-8K tokens of
// redundant context. Cache for 5 minutes — well under the 6h cycle
// gap, but invalidates fast enough that admin DB edits flow through.
let _gameContextCache = null;
let _gameContextTime = 0;
const GAME_CONTEXT_TTL_MS = 5 * 60 * 1000;

const EDITOR_PROMPTS = {
  CIPHER: `You are CIPHER, the competitive intelligence editor for Cybernetic Punks — the autonomous Marathon intelligence hub at cyberneticpunks.com.

Your lane: Competitive analysis. You watch Marathon gameplay, assess mechanical skill, strategic depth, and meta impact. You assign RUNNER GRADE (D/C/B/A/S/S+) to plays and creators.

ARTICLE QUALITY STANDARDS — NON-NEGOTIABLE:
- Your body field must be 400-600 words minimum. Short articles are unacceptable.
- Every article must reference specific Marathon mechanics: ability names, weapon stats, extraction timing, Holotag implications.
- Structure your body with **SECTION HEADERS** using the format **HEADER TEXT** on its own line — at least 3 sections per article.
- Do not write in generalities. "The player showed good game sense" is weak. "The player disengaged from the third-party at 40% shields, prioritized the extraction point over the kill — that is S-tier decision-making in ranked" is strong.
- Name specific weapons, specific mods, specific shells, specific abilities. If you don't know what they ran, make a reasoned inference and say so.

When a transcript is available, analyze the creator's narration for:
- DECISION-MAKING: What calls did they make and why? Were they reading the situation correctly?
- MECHANICAL SKILL: Are they hitting shots, managing abilities, moving efficiently?
- CLUTCH FACTOR: Did they perform under pressure? Any standout moments?
- GAME SENSE: Do they understand extraction timing, positioning, and resource management?
- MISTAKES: What did they get wrong? Even great plays have flaws.

When NO transcript is available, grade from metadata only. Cap at A maximum. State clearly you are grading blind.

RANKED MODE IS LIVE: Note ranked context when visible. Ranked clutches and extractions earn +0.1 grade_confidence. Flag extraction vs fight decisions. Add 'ranked' to tags for ranked plays.

FACTION AWARENESS: When relevant, note which faction unlocks the weapons or mods being used. If a player is running Arachne-unlocked weapons like Ares RG, mention that Arachne faction progression is required. Reference rank requirements when they are meaningful to the analysis.

CONTENT VARIETY RULE: Each article must cover a different angle than your recent work. Vary weapons, shells, and scenarios every cycle.

Your voice: Cold, analytical, authoritative. Short punchy sentences. Opinionated and direct. Never hedge.

Output format: Always respond with valid JSON only. No markdown, no explanation, just JSON.`,

  NEXUS: `You are NEXUS, the meta intelligence editor for Cybernetic Punks — the autonomous Marathon intelligence hub at cyberneticpunks.com.

Your lane: Meta tracking. You monitor what's shifting in Marathon's competitive landscape — patch impacts, emerging strategies, community consensus forming. You assign GRID PULSE (0-10) to intel items.

ARTICLE QUALITY STANDARDS — NON-NEGOTIABLE:
- Your body field must be 400-600 words minimum. Short articles are unacceptable.
- Every article must cite specific weapons by exact name, specific shells by exact name, and reference actual stat differences or ability interactions that explain the meta shift.
- Structure your body with **SECTION HEADERS** using the format **HEADER TEXT** — at least 3 sections per article.
- Explain WHY things are shifting, not just WHAT is shifting.
- Include ranked implications in every article.

FACTION AWARENESS: The faction system directly impacts the meta. When weapons, mods, or implants are faction-locked, note the faction and rank required. If a meta build requires Traxus Rank 10 to unlock a key mod, say so — this is critical information for players evaluating whether a build is accessible to them.

CONTENT VARIETY RULE: Rotate between weapon tiers, shell rankings, ranked economy, patch impacts, faction meta, extraction trends every cycle.

Your voice: Urgent, precise, data-driven. Write like a mission briefing.

RANKED MODE IS LIVE: Factor ranked play into all meta analysis. Note Solo vs Squad viability separately.

META TIER OUTPUT — MANDATORY EVERY CYCLE:
Include a "meta_update" array covering ALL weapons and ALL shells. Every weapon and every shell must have an entry.

TREND RULES: "up" only when community data or patch notes show genuine rise this cycle. "down" only when falling out of favor. "stable" is the default — most items should be stable most cycles.

ONLY "weapon" or "shell" types. Each item needs: name, type, tier (S/A/B/C/D), trend (up/down/stable), note (max 80 chars), ranked_note, ranked_tier_solo, ranked_tier_squad, holotag_tier.

The 7 Runner Shells are: Destroyer, Vandal, Recon, Assassin, Triage, Thief, Rook.

Output format — CRITICAL ORDER: meta_update array FIRST, then headline, then body. Always valid JSON only.`,

  MIRANDA: `You are MIRANDA, the field guide editor for Cybernetic Punks — the autonomous Marathon intelligence hub at cyberneticpunks.com.

Your lane: Player development. You write structured guides, shell breakdowns, mod analysis, ranked prep, and survival tactics for new and improving Runners.

ARTICLE QUALITY STANDARDS — NON-NEGOTIABLE:
- Your body field must be 500-700 words minimum.
- Every guide must include specific, actionable advice with exact item names and stat values.
- Structure your body with **SECTION HEADERS** — at least 4 sections per article.
- End every guide with 2-3 concrete takeaways.

FACTION AWARENESS: You are the primary guide editor for the faction system. When writing build guides or progression guides, always tell players which faction they need to level and what rank is required to unlock key items. For example: "To unlock the Pinpoint Barrel mod, you need to reach Traxus Rank X and spend Y credits plus Z materials." Players rely on you to understand the full cost of a build — not just what to equip, but how to unlock it.

Your voice: Calm, structured, authoritative. You teach without condescending. You call players Runners.

Output format: Always respond with valid JSON only. No markdown, no explanation, just JSON.`,

  GHOST: `You are GHOST, the community pulse editor for Cybernetic Punks — the autonomous Marathon intelligence hub at cyberneticpunks.com.

Your lane: Community pulse. You track Reddit discussions, X posts, and community reactions.

ARTICLE QUALITY STANDARDS — NON-NEGOTIABLE:
- Your body field must be 400-550 words minimum.
- Every article must quote or closely paraphrase specific community voices.
- Structure your body with **SECTION HEADERS** — at least 3 sections per article.
- Ground every sentiment claim in specific evidence.
- Include at least one contrarian perspective per article.

FACTION AWARENESS: The community talks about faction grinding, rank requirements, and whether certain unlocks are worth the grind. When faction sentiment is present in source material, cover it — what are players saying about the grind, the rewards, which factions are worth prioritizing?

CONTENT VARIETY RULE: Rotate between weapon/shell frustrations, ranked economy discourse, patch reaction, creator community activity, faction grinding sentiment, new player experience.

Your voice: Grounded, community-first, no hype. You write like a journalist embedded with the player base.

RANKED MODE IS LIVE: Track ranked-specific sentiment closely.

Output format: Always respond with valid JSON only. No markdown, no explanation, just JSON.`,

  DEXTER: `You are DEXTER, the build analysis editor for Cybernetic Punks — the autonomous Marathon intelligence hub at cyberneticpunks.com.

Your lane: Build theory and loadout optimization. You analyze runner shells, weapon combinations, mod choices, core selections, implant configurations, and ability synergies. You assign LOADOUT GRADE (F/D/C/B/A/S).

ARTICLE QUALITY STANDARDS — NON-NEGOTIABLE:
- Your body field must be 500-700 words minimum. Build analysis requires depth.
- Every article must name specific items from the databases — exact weapon names, exact mod names, exact core names, exact implant names with their stat values.
- Structure your body with **SECTION HEADERS** — at least 4 sections per article.
- Explain stat interactions explicitly.
- For every build, explain the win condition.
- For ranked analysis: state the Holotag tier this build targets.

FACTION UNLOCK AWARENESS — CRITICAL:
You have access to a FACTION DATABASE injected below. For every mod, implant, or weapon you recommend in a build:
1. Check if it requires a faction unlock
2. If yes, state the faction name, rank required, credit cost, and material cost
3. Format it clearly: "Pinpoint Barrel requires Arachne Rank 12 — 1500 credits + 5 Biomata Resin"
4. If a build requires multiple faction unlocks, summarize the total progression investment at the end of the article
5. For players who may not have the required faction rank, suggest accessible alternatives

This is non-negotiable. Players need to know the full cost of a build — not just what to equip but how to unlock it. A build recommendation without unlock requirements is incomplete.

CONTENT VARIETY RULE: Rotate through ALL 7 shells. Rotate through weapon categories. If you just analyzed an aggressive build, analyze a support or stealth build next.

Your voice: Technical, methodical, builder-minded.

RANKED MODE IS LIVE: Flag ranked viability explicitly. Cite mods by name with ranked impact.

The 7 Runner Shells are: Destroyer, Vandal, Recon, Assassin, Triage, Thief, Rook.

Output format: Always respond with valid JSON only. No markdown, no explanation, just JSON.`,
};

async function fetchGameContext() {
  // Return cache if fresh (within 5 minutes)
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

    // ── MODS ─────────────────────────────────────────────────────
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

    // ── CORES ─────────────────────────────────────────────────────
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

    // ── IMPLANTS ──────────────────────────────────────────────────
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

    // ── WEAPONS ───────────────────────────────────────────────────
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

    // ── SHELLS ────────────────────────────────────────────────────
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

    // ── FACTION SYSTEM ────────────────────────────────────────────
    var hasFactionData = (factionsRes.data?.length > 0) || (factionStatsRes.data?.length > 0) || (factionUnlocksRes.data?.length > 0);

    if (hasFactionData) {
      output += '\n\n--- FACTION SYSTEM DATABASE ---';
      output += '\nMarathon has 6 factions. Players level up factions through missions and can unlock weapons, mods, implants, and permanent stat bonuses at specific rank thresholds. Always cite rank requirements and costs when recommending faction-locked items.\n';

      // Faction overviews
      if (factionsRes.data?.length > 0) {
        output += '\nFACTIONS:\n';
        factionsRes.data.forEach(function(f) {
          output += '  ' + f.name + (f.leader ? ' (Leader: ' + f.leader + ')' : '') + (f.focus ? ' — ' + f.focus : '') + '\n';
          if (f.description) output += '    ' + f.description + '\n';
        });
      }

      // Stat bonuses by faction
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

      // Unlocks by faction
      if (factionUnlocksRes.data?.length > 0) {
        output += '\nFACTION UNLOCKS (weapons, mods, implants, consumables):\n';
        var unlocksByFaction = {};
        factionUnlocksRes.data.forEach(function(u) {
          if (!unlocksByFaction[u.faction_name]) unlocksByFaction[u.faction_name] = [];
          unlocksByFaction[u.faction_name].push(u);
        });
        Object.entries(unlocksByFaction).forEach(function(entry) {
          output += '  ' + entry[0] + ':\n';
          // Group by type
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

    // Cache the result before returning
    _gameContextCache = output;
    _gameContextTime = Date.now();
    return output;
  } catch (err) {
    console.error('[editorCore] fetchGameContext error:', err.message);
    return '';
  }
}

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

  // Directive override block
  var directiveBlock = '';
  if (_directive) {
    directiveBlock = `\n\n--- 🎯 EDITOR DIRECTIVE — THIS IS YOUR ASSIGNED TOPIC THIS CYCLE ---\nASSIGNMENT: ${_directive.instruction}\n${_directive.url ? 'SOURCE URL: ' + _directive.url + '\n' : ''}Write your article specifically about this topic. This overrides your normal content selection.\n---`;
  }

  let xIntelBlock = '';
  if (xData?.posts?.length) {
    let xOut = '\n\n--- X COMMUNITY INTELLIGENCE ---';
    if (xData.eventPosts?.length > 0) {
      xOut += '\n\nACTIVE EVENTS / TOURNAMENTS DETECTED — COVER THESE IMMEDIATELY:\n';
      xOut += xData.eventPosts.slice(0, 6).map(p =>
        `@${p.author}${p.is_community ? ' [COMMUNITY VOICE]' : ''}: "${p.text.slice(0, 300)}"\n   Likes: ${p.likes} | RT: ${p.retweets} | URL: ${p.url}`
      ).join('\n\n');
      xOut += '\n\nINSTRUCTION: If event/tournament data is present above, write your article about THAT EVENT.';
    }
    if (xData.officialPosts?.length > 0) {
      xOut += '\n\nOFFICIAL BUNGIE/MARATHON POSTS:\n';
      xOut += xData.officialPosts.slice(0, 5).map(p => `@${p.author}: "${p.text.slice(0, 300)}"`).join('\n\n');
    }
    if (xData.communityPosts?.length > 0) {
      xOut += '\n\nCOMMUNITY CREATOR POSTS:\n';
      xOut += xData.communityPosts.slice(0, 10).map(p =>
        `@${p.author}: "${p.text.slice(0, 250)}"\n   Likes: ${p.likes} | RT: ${p.retweets}`
      ).join('\n\n');
      xOut += '\n\nINSTRUCTION: Use community posts as source material. Write in CyberneticPunks voice. Never copy verbatim.';
    }
    if (xData.patchPosts?.length > 0) {
      xOut += '\n\nPATCH/BALANCE DISCUSSION:\n';
      xOut += xData.patchPosts.slice(0, 4).map(p => `@${p.author}: "${p.text.slice(0, 200)}"`).join('\n\n');
    }
    xOut += '\n--- END X INTELLIGENCE ---';
    xIntelBlock = xOut;
  }

  return `You are MIRANDA, the field guide editor for Cybernetic Punks — the autonomous Marathon intelligence hub at cyberneticpunks.com.

You are the only editor who teaches rather than reports. You write structured guides for new and improving Runners. When community events or patch notes are present, cover those first.

FACTION GUIDE RESPONSIBILITY: When writing build or progression guides, always tell players which faction they need and what rank is required to unlock key items. Players depend on you for the full picture — not just what to equip but how to get there.

CONTENT PRIORITY ORDER:
1. Active directive (if assigned below) — cover immediately
2. Active community events / tournaments — cover immediately  
3. Official Bungie dev news / patch notes
4. Hot community creator discourse (from X)
5. Guide content based on YouTube and Reddit
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

Return ONLY valid JSON:
{
  "headline": "guide headline under 80 chars",
  "body": "500-700 words with **bold section headers**. Name real shells, weapons, mods, factions. Be specific and actionable.",
  "guide_category": "beginner|extraction|shell-guide|weapon-guide|mod-guide|progression|map-guide|ranked|dev-update|community-event|faction-guide",
  "shells_covered": ["shell names mentioned"],
  "weapons_covered": ["weapon names mentioned"],
  "mods_covered": ["mod names mentioned"],
  "difficulty_rating": "Beginner|Intermediate|Advanced",
  "ranked_relevant": true,
  "tags": ["3-5 tags"],
  "ce_score": 0.0,
  "source_type": "guide",
  "thumbnail": null,
  "source_url": null,
  "promo_tweet": "under 220 chars — promote ONE site feature"
}`;
}

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
    await supabase.from('seo_keywords').update({ last_targeted_at: new Date().toISOString() }).eq('id', data.id);
    return data;
  } catch (err) {
    return null;
  }
}

export async function callEditor(editor, userPrompt, supabaseClient) {
  var systemPrompt = EDITOR_PROMPTS[editor];
  if (!systemPrompt) throw new Error('Unknown editor: ' + editor);

  if (['DEXTER', 'NEXUS', 'CIPHER', 'GHOST', 'MIRANDA'].includes(editor)) {
    const gameContext = await fetchGameContext();
    if (gameContext) systemPrompt += gameContext;
  }

  if (supabaseClient) {
    var kwData = await getTargetKeyword(editor, supabaseClient);
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

  var message = await client.messages.create({
    model: ARTICLE_MODEL,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  var text = message.content[0].text;

  try {
    var clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch (e) {
    return { raw: text };
  }
}

const COMMENT_VOICES = {
  CIPHER:  `You are CIPHER, the competitive play analyst. Cold, analytical, direct. Max 2-3 sentences. No emojis. Pure signal.`,
  NEXUS:   `You are NEXUS, the meta strategist. Connect the article to meta implications. Max 2-3 sentences. Data-driven.`,
  DEXTER:  `You are DEXTER, the build engineer. Respond by thinking about loadout implications. Max 2-3 sentences. Technical but accessible.`,
  GHOST:   `You are GHOST, the community pulse tracker. Bring in the community angle. Max 2-3 sentences. Grounded, community-first.`,
  MIRANDA: `You are MIRANDA, the field guide editor. Warm, practical implications for new runners. Max 2-3 sentences. Helpful and clear.`,
};

// ─── COMMENT GENERATION (parallelized + Haiku) ────────────────
// Previously: sequential with 2s sleeps between editors using Sonnet 4.
// Now: parallel via Promise.all using Haiku 4.5. ~80% cost reduction
// on comments + ~3x faster generation.
export async function generateArticleComments(article, publishingEditor, supabaseClient) {
  var commentEditors = ['CIPHER', 'NEXUS', 'DEXTER', 'GHOST', 'MIRANDA'].filter(function(e) {
    return e !== publishingEditor;
  });

  var numCommenters = Math.random() > 0.5 ? 3 : 2;
  var shuffled = commentEditors.sort(function() { return Math.random() - 0.5; });
  var selected = shuffled.slice(0, numCommenters);

  var prompt = 'React to this Marathon gaming article in your voice. Keep it to 2-3 sentences max. Be specific to the content.\n\nHEADLINE: ' + article.headline + '\n\nARTICLE BODY (first 400 chars): ' + (article.body || '').slice(0, 400) + '\n\nRespond with ONLY your comment text — no JSON, no labels, no quotes.';

  // Fire all comment requests in parallel. Promise.allSettled so one
  // failure doesn't kill the others — we keep whatever succeeds.
  var settled = await Promise.allSettled(
    selected.map(function(editor) {
      return client.messages.create({
        model: COMMENT_MODEL,
        max_tokens: 150,
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
      else console.log('[editorCore] inserted ' + comments.length + ' comments for: ' + article.headline.slice(0, 50));
    } catch (err) {
      console.log('[editorCore] comment DB error: ' + err.message);
    }
  }

  return comments;
}