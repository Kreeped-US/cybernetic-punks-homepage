// app/api/advisor/route.js
// DEXTER Build Advisor — live Claude API call with full game context

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SHELLS = ['Assassin', 'Destroyer', 'Recon', 'Rook', 'Thief', 'Triage', 'Vandal'];

async function fetchAdvisorContext(shell) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  const [modsRes, coresRes, implantsRes, shellRes, weaponsRes] = await Promise.all([
    supabase
      .from('mod_stats')
      .select('name, slot_type, rarity, effect_desc, effect_summary, ranked_notes')
      .not('effect_desc', 'is', null)
      .order('rarity', { ascending: false })
      .limit(100),
    supabase
      .from('core_stats')
      .select('name, required_runner, rarity, effect_desc, ability_type, is_shell_exclusive, meta_rating')
      .or(`required_runner.is.null,required_runner.eq.${shell}`)
      .order('rarity', { ascending: false })
      .limit(80),
    supabase
      .from('implant_stats')
      .select('name, slot_type, rarity, description, passive_name, passive_desc, stat_1_label, stat_1_value, stat_2_label, stat_2_value, stat_3_label, stat_3_value, stat_4_label, stat_4_value')
      .order('rarity', { ascending: false })
      .limit(80),
    supabase
      .from('shell_stats')
      .select('*')
      .eq('name', shell)
      .single(),
    supabase
      .from('weapon_stats')
      .select('name, category, ammo_type, damage, fire_rate, magazine_size, range_rating, ranked_viable')
      .order('name')
      .limit(60),
  ]);

  let context = '';

  // Shell data
  if (shellRes.data) {
    const s = shellRes.data;
    context += `\n\n--- TARGET SHELL: ${shell.toUpperCase()} ---`;
    context += `\nRole: ${s.role || 'Unknown'} | Difficulty: ${s.difficulty || 'Unknown'}`;
    if (s.base_health) context += `\nBase HP: ${s.base_health} | Shield: ${s.base_shield || 'N/A'} | Speed: ${s.base_speed || 'TBD'}`;
    if (s.prime_ability_name) context += `\nPrime Ability: ${s.prime_ability_name} — ${s.prime_ability_description || 'TBD'}`;
    if (s.tactical_ability_name) context += `\nTactical Ability: ${s.tactical_ability_name} — ${s.tactical_ability_description || 'TBD'}`;
    if (s.trait_1_name) context += `\nTrait: ${s.trait_1_name} — ${s.trait_1_description || ''}`;
    if (s.ranked_tier_solo) context += `\nRanked: Solo ${s.ranked_tier_solo} | Squad ${s.ranked_tier_squad || 'TBD'}`;
    if (s.best_for) context += `\nBest For: ${s.best_for}`;
    if (s.strengths?.length) context += `\nStrengths: ${s.strengths.join(', ')}`;
    if (s.weaknesses?.length) context += `\nWeaknesses: ${s.weaknesses.join(', ')}`;
    context += `\n--- END SHELL ---`;
  }

  // Weapons
  if (weaponsRes.data?.length) {
    context += `\n\n--- WEAPONS DATABASE ---\n`;
    context += weaponsRes.data.map(w =>
      `${w.name} [${w.category}] — Ammo: ${w.ammo_type || 'N/A'}, Range: ${w.range_rating || 'N/A'}${w.damage ? ', Dmg: ' + w.damage : ''}${w.fire_rate ? ', RPM: ' + w.fire_rate : ''}${w.magazine_size ? ', Mag: ' + w.magazine_size : ''}${w.ranked_viable === false ? ' [AVOID IN RANKED]' : ''}`
    ).join('\n');
    context += `\n--- END WEAPONS ---`;
  }

  // Mods — grouped by slot with full stat context
  if (modsRes.data?.length) {
    const bySlot = {};
    for (const mod of modsRes.data) {
      const slot = mod.slot_type || 'Other';
      if (!bySlot[slot]) bySlot[slot] = [];
      let modLine = `${mod.name} (${mod.rarity}): ${mod.effect_desc || mod.effect_summary || 'No description'}`;
      if (mod.ranked_notes) modLine += ` [Ranked: ${mod.ranked_notes}]`;
      bySlot[slot].push(modLine);
    }
    context += `\n\n--- WEAPON MODS DATABASE ---\n`;
    context += Object.entries(bySlot).map(([slot, mods]) =>
      `${slot} Slot:\n${mods.map(m => `  - ${m}`).join('\n')}`
    ).join('\n\n');
    context += `\n--- END MODS ---`;
  }

  // Cores — shell-specific first, then universal
  if (coresRes.data?.length) {
    const shellSpecific = coresRes.data.filter(c => c.required_runner === shell);
    const universal = coresRes.data.filter(c => !c.required_runner);
    context += `\n\n--- SHELL CORES DATABASE ---`;
    if (shellSpecific.length) {
      context += `\n${shell}-Specific Cores (PRIORITIZE THESE):\n`;
      context += shellSpecific.map(c =>
        `  - ${c.name} (${c.rarity}, ${c.ability_type || 'Unknown'}${c.meta_rating ? ', Meta Rating: ' + c.meta_rating : ''}): ${c.effect_desc || 'TBD'}`
      ).join('\n');
    }
    if (universal.length) {
      context += `\nUniversal Cores (available to all shells):\n`;
      context += universal.slice(0, 25).map(c =>
        `  - ${c.name} (${c.rarity}, ${c.ability_type || 'Unknown'}): ${c.effect_desc || 'TBD'}`
      ).join('\n');
    }
    context += `\n--- END CORES ---`;
  }

  // Implants — with full stat values so DEXTER can match them to priority
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
      ].filter(Boolean);
      let impLine = `${imp.name} (${imp.rarity})`;
      if (stats.length) impLine += ` [${stats.join(', ')}]`;
      if (imp.passive_name) impLine += ` | Passive: ${imp.passive_name}${imp.passive_desc ? ' — ' + imp.passive_desc : ''}`;
      if (imp.description) impLine += ` — ${imp.description}`;
      bySlot[slot].push(impLine);
    }
    context += `\n\n--- IMPLANTS DATABASE ---\n`;
    context += `IMPORTANT: Implants have real stat values in brackets. Cross-reference these against the player's priority.\n`;
    context += `Stat guide: Agility = movement/speed, Hardware = armor/tank, Prime Recovery = ability cooldown reduction, Self-Repair = passive healing, Ping Duration = ability duration, Loot Speed = faster looting\n\n`;
    context += Object.entries(bySlot).map(([slot, imps]) =>
      `${slot} Slot:\n${imps.map(i => `  - ${i}`).join('\n')}`
    ).join('\n\n');
    context += `\n--- END IMPLANTS ---`;
  }

  return context;
}

function buildAdvisorPrompt(shell, playstyle, rankTarget, weaponPreference, teamSize, priority, experienceLevel, context) {

  const priorityGuidance = {
    combat:     'COMBAT POWER — Optimize for winning gunfights. Prioritize damage mods, weapon handling cores, and Hardware implants that increase survivability in direct fights. Weapon choice should have high DPS or burst damage.',
    extraction: 'CLEAN EXTRACTION — Optimize for getting out alive with loot. Prioritize mods that improve mobility or suppression, cores that aid disengagement or ability recharging, and Agility or Loot Speed implants. Weapon choice should enable quick fights then escape.',
    survival:   'SURVIVABILITY — Optimize for staying alive under sustained pressure. Prioritize shield/armor mods, defensive cores (Recuperation, healing-type passives), and Hardware or Self-Repair implants. Weapon choice should have reliable range to avoid close-quarters exposure.',
    speed:      'LOOT SPEED — Optimize for fast looting and repositioning. Prioritize Agility implants heavily, cores that reduce cooldowns (Prime Recovery), and mobility-enhancing mods. Weapon choice should be compact and fast to re-holster.',
  };

  const experienceGuidance = {
    new:         'NEW RUNNER — Write the playstyle summary and dexter_analysis in plain language. Avoid jargon. Explain what each item does in simple terms. Recommend forgiving, easy-to-execute options over high-skill-ceiling choices.',
    learning:    'LEARNING — Explain key interactions clearly but assume they understand basic mechanics. Point out 1-2 things to practice. Lean toward meta-proven options.',
    experienced: 'EXPERIENCED — Write at full technical depth. Reference exact stat interactions, cooldown windows, and positioning implications. They can handle complex combos.',
    veteran:     'VETERAN — Full theory-craft mode. Reference meta implications, edge cases, tradeoffs between items. They want to understand WHY this is optimal, not just what to equip.',
  };

  const rankGuidance = {
    unranked:  'Casual play — no ranked constraints. Optimize purely for fun and effectiveness.',
    bronze:    'Bronze Holotag (3,000 score target). Low loss penalty (600 pts). Good place to learn ranked fundamentals. Forgiving build choice.',
    silver:    'Silver Holotag (5,000 score target). Loss penalty 2,000 pts. Build needs to consistently hit extraction score. Balanced risk profile.',
    gold:      'Gold Holotag (7,000 score target). Loss penalty 4,200 pts. Build must be reliable. Mods and implants should support consistent extraction.',
    platinum:  'Platinum Holotag (10,000 score target). Loss penalty 8,000 pts. High stakes. Every item choice must justify itself for ranked efficiency.',
    diamond:   'Diamond Holotag (15,000 score target). Loss penalty 15,000 pts. Elite play. Build must be finely tuned. No wasted slots.',
    pinnacle:  'Pinnacle Holotag (20,000 score target). Loss penalty 20,000 pts. Top of the ladder. Every single item must serve a specific purpose. Maximum optimization required.',
  };

  return `You are DEXTER, the build analysis editor for Cybernetic Punks.

A Runner has submitted their preferences. Engineer the optimal loadout by cross-referencing their goals against the real stat values in the databases below.

RUNNER PROFILE:
- Shell: ${shell}
- Playstyle: ${playstyle}
- Priority Focus: ${priority} — ${priorityGuidance[priority] || ''}
- Rank Target: ${rankTarget} — ${rankGuidance[rankTarget] || ''}
- Weapon Preference: ${weaponPreference || 'No preference — recommend the best fit for this build'}
- Team Size: ${teamSize}
- Experience Level: ${experienceLevel} — ${experienceGuidance[experienceLevel] || ''}

CRITICAL INSTRUCTIONS:
1. IMPLANTS: Read the actual stat values in brackets. Choose implants whose stats directly serve the priority. A combat priority build needs Hardware or damage-enhancing stats. A speed priority build needs Agility stats. A survival build needs Hardware and Self-Repair. Do NOT pick implants randomly — justify each with its actual stat values.
2. MODS: Choose mods whose effects directly amplify the chosen weapon and playstyle. Don't just pick high-rarity — pick the right ones.
3. CORES: Prioritize ${shell}-specific cores first. Then pick universal cores that reinforce the priority. A Prime Recovery core makes sense for ability-heavy playstyles. A passive healing core makes sense for survival priority.
4. WEAPONS: From the WEAPONS DATABASE, pick weapons whose stats (damage, fire rate, range rating) suit the playstyle and priority. Don't just name weapons — reference why their stats fit.
5. EXPERIENCE: ${experienceGuidance[experienceLevel]}

${context}

Return ONLY valid JSON — no markdown, no explanation:
{
  "build_name": "catchy 2-4 word name that captures this build's identity",
  "loadout_grade": "S|A|B|C|D",
  "shell": "${shell}",
  "playstyle_summary": "2 sentences — what this build does and how to play it",
  "primary_weapon": { "name": "exact weapon name from WEAPONS DATABASE", "reason": "cite specific stats that make it right for this build" },
  "secondary_weapon": { "name": "exact weapon name from WEAPONS DATABASE", "reason": "what gap it fills" },
  "mods": [
    { "slot": "slot type", "name": "exact mod name from WEAPON MODS DATABASE", "reason": "specific effect and why it serves this build" }
  ],
  "cores": [
    { "name": "exact core name from SHELL CORES DATABASE", "ability_type": "Prime|Tactical|Passive", "reason": "specific synergy with this shell and priority" }
  ],
  "implants": [
    { "slot": "Head|Torso|Legs", "name": "exact implant name from IMPLANTS DATABASE", "stat_change": "cite actual stat values e.g. Agility: +8, Hardware: -3", "reason": "why these specific stats serve the priority" }
  ],
  "ranked_viable": true,
  "holotag_tier": "Bronze|Silver|Gold|Platinum|Diamond|Pinnacle|null",
  "ranked_note": "1 sentence specific to the rank target — mention the score target and whether this build can hit it",
  "strengths": ["specific strength tied to items chosen", "strength 2", "strength 3"],
  "weaknesses": ["specific weakness of this configuration", "weakness 2"],
  "dexter_analysis": "150-200 words in DEXTER voice. Reference specific item interactions and stat values. Explain why this combination works at the ${experienceLevel} level and for the ${priority} priority. Name items explicitly. Be opinionated.",
  "tags": ["${shell.toLowerCase()}", "playstyle-tag", "other-relevant-tags"]
}`;
}

export async function POST(req) {
  try {
    const { shell, playstyle, rankTarget, weaponPreference, teamSize, priority, experienceLevel } = await req.json();

    if (!shell || !SHELLS.includes(shell)) {
      return Response.json({ error: 'Invalid shell' }, { status: 400 });
    }

    const context = await fetchAdvisorContext(shell);
    const prompt = buildAdvisorPrompt(
      shell,
      playstyle || 'balanced',
      rankTarget || 'gold',
      weaponPreference || '',
      teamSize || 'Solo',
      priority || 'combat',
      experienceLevel || 'learning',
      context
    );

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: `You are DEXTER, the build analysis editor for Cybernetic Punks. You are technical, opinionated, and builder-minded. You cross-reference real stat values from the databases provided — you never guess at stats or invent item names. Output valid JSON only — no markdown, no explanation, no preamble.`,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = message.content[0].text;
    const clean = text.replace(/```json|```/g, '').trim();
    const build = JSON.parse(clean);

    return Response.json({ build }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    console.error('[advisor] error:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
