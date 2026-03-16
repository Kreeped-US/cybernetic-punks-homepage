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

  const [modsRes, coresRes, implantsRes, shellRes] = await Promise.all([
    supabase.from('mod_stats').select('name, slot_type, rarity, effect_desc').not('effect_desc', 'is', null).order('rarity', { ascending: false }).limit(80),
    supabase.from('core_stats').select('name, required_runner, rarity, effect_desc, ability_type, is_shell_exclusive, meta_rating').or(`required_runner.is.null,required_runner.eq.${shell}`).order('rarity', { ascending: false }).limit(60),
    supabase.from('implant_stats').select('name, slot_type, rarity, description, stat_1_label, stat_1_value, stat_2_label, stat_2_value, stat_3_label, stat_3_value, stat_4_label, stat_4_value, passive_name').order('rarity', { ascending: false }).limit(60),
    supabase.from('shell_stats').select('*').eq('name', shell).single(),
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
    context += `\n--- END SHELL ---`;
  }

  // Mods
  if (modsRes.data?.length) {
    const bySlot = {};
    for (const mod of modsRes.data) {
      const slot = mod.slot_type || 'Other';
      if (!bySlot[slot]) bySlot[slot] = [];
      bySlot[slot].push(`${mod.name} (${mod.rarity}): ${mod.effect_desc}`);
    }
    context += `\n\n--- WEAPON MODS DATABASE ---\n`;
    context += Object.entries(bySlot).map(([slot, mods]) =>
      `${slot}:\n${mods.map(m => `  - ${m}`).join('\n')}`
    ).join('\n\n');
    context += `\n--- END MODS ---`;
  }

  // Cores (filtered to shell + universal)
  if (coresRes.data?.length) {
    const universal = coresRes.data.filter(c => !c.required_runner);
    const shellSpecific = coresRes.data.filter(c => c.required_runner === shell);
    context += `\n\n--- SHELL CORES DATABASE ---`;
    if (shellSpecific.length) {
      context += `\n${shell}-Specific Cores:\n`;
      context += shellSpecific.map(c => `  - ${c.name} (${c.rarity}, ${c.ability_type || 'Unknown'}${c.meta_rating ? ', Meta: ' + c.meta_rating : ''}): ${c.effect_desc || 'TBD'}`).join('\n');
    }
    if (universal.length) {
      context += `\nUniversal Cores:\n`;
      context += universal.slice(0, 20).map(c => `  - ${c.name} (${c.rarity}, ${c.ability_type || 'Unknown'}): ${c.effect_desc || 'TBD'}`).join('\n');
    }
    context += `\n--- END CORES ---`;
  }

  // Implants
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
      bySlot[slot].push(`${imp.name} (${imp.rarity})${imp.description ? ' — ' + imp.description : ''}${stats.length ? ' [' + stats.join(', ') + ']' : ''}${imp.passive_name ? ' | Passive: ' + imp.passive_name : ''}`);
    }
    context += `\n\n--- IMPLANTS DATABASE (shell stat modifiers) ---\n`;
    context += Object.entries(bySlot).map(([slot, imps]) =>
      `${slot} Slot:\n${imps.map(i => `  - ${i}`).join('\n')}`
    ).join('\n\n');
    context += `\n--- END IMPLANTS ---`;
  }

  return context;
}

function buildAdvisorPrompt(shell, playstyle, rankTarget, weaponPreference, teamSize, context) {
  return `You are DEXTER, the build analysis editor for Cybernetic Punks.

A Runner has submitted their preferences for a personalized build recommendation. Analyze their inputs against the game database below and engineer the optimal loadout.

RUNNER INPUTS:
- Shell: ${shell}
- Playstyle: ${playstyle}
- Rank Target: ${rankTarget}
- Weapon Preference: ${weaponPreference || 'No preference — recommend best fit'}
- Team Size: ${teamSize}

${context}

WEAPONS AVAILABLE (use exact names):
M77 Assault Rifle, Overrun AR, Impact HAR, V75 Scar, BRRT SMG, Bully SMG, V22 Volt Thrower, WSTR Combat Shotgun, Copperhead RF, Hardline PR, Stryder M1T, Longshot, Outland, Retaliator LMG, Conquest LMG, Demolition HMG, Ares RG, V00 Zeus RG, Magnum MC, CE Tactical Sidearm, Misriah 2442, Knife, V11 Punch

BUILD REQUIREMENTS:
- Select a primary and secondary weapon that synergize with the shell's abilities and the player's stated playstyle
- Choose up to 5 mods — use ONLY mod names from the WEAPON MODS DATABASE above
- Choose 1-3 cores — use ONLY core names from the SHELL CORES DATABASE above, preferring ${shell}-specific cores when available
- Choose up to 3 implants (one per slot: Head, Torso, Legs) — use ONLY implant names from the IMPLANTS DATABASE above
- Be specific about ranked viability if rank target is not Casual

Return ONLY valid JSON:
{
  "build_name": "catchy 2-4 word name that fits the playstyle",
  "loadout_grade": "S|A|B|C|D",
  "shell": "${shell}",
  "playstyle_summary": "2 sentences max — this build's identity and how to play it",
  "primary_weapon": { "name": "exact weapon name", "reason": "1 sentence — why this weapon" },
  "secondary_weapon": { "name": "exact weapon name", "reason": "1 sentence — backup role" },
  "mods": [
    { "slot": "slot type", "name": "exact mod name", "reason": "impact on this build" }
  ],
  "cores": [
    { "name": "exact core name", "ability_type": "Prime|Tactical|Passive|etc", "reason": "1 sentence synergy" }
  ],
  "implants": [
    { "slot": "Head|Torso|Legs", "name": "exact implant name", "stat_change": "e.g. Hardware: -10, Prime Recovery: +30%", "reason": "1 sentence" }
  ],
  "ranked_viable": true,
  "holotag_tier": "Bronze|Silver|Gold|Platinum|Diamond|null",
  "ranked_note": "1 sentence ranked observation",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "weaknesses": ["weakness 1", "weakness 2"],
  "dexter_analysis": "150-200 words in DEXTER voice — technical, opinionated, builder-minded. Explain why this combination works, what makes it dangerous, and how to execute it correctly. Name specific items and explain their interactions.",
  "tags": ["shell-slug", "other-tags"]
}`;
}

export async function POST(req) {
  try {
    const { shell, playstyle, rankTarget, weaponPreference, teamSize } = await req.json();

    if (!shell || !SHELLS.includes(shell)) {
      return Response.json({ error: 'Invalid shell' }, { status: 400 });
    }

    const context = await fetchAdvisorContext(shell);
    const prompt = buildAdvisorPrompt(shell, playstyle, rankTarget, weaponPreference, teamSize, context);

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: `You are DEXTER, the build analysis editor for Cybernetic Punks. You are technical, opinionated, and builder-minded. You only reference items that exist in the databases provided to you. Output valid JSON only — no markdown, no explanation.`,
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
