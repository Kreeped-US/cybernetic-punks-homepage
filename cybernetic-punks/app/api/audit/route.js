import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
}

function letterGrade(score) {
  if (score >= 90) return 'S';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  return 'D';
}

function slotUtilization(snap) {
  const slots = [
    snap.mod_slot_1, snap.mod_slot_2, snap.mod_slot_3,
    snap.core_slot_1, snap.core_slot_2,
    snap.implant_1, snap.implant_2, snap.implant_3,
  ];
  const populated = slots.filter(s => s && s !== 'Not sure').length;
  return Math.round((populated / 8) * 100);
}

async function callClaude(systemPrompt, userContent) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }],
    }),
  });
  if (!res.ok) throw new Error(`Claude API error: ${res.status}`);
  const data = await res.json();
  return data.content?.[0]?.text || '';
}

function parseJSON(raw) {
  try {
    const clean = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch {
    return null;
  }
}

export async function POST() {
  try {
    const cookieStore = await cookies();
    const playerId = cookieStore.get('cp_player_id')?.value;

    if (!playerId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const supabase = getSupabase();

    const { data: snap, error: snapErr } = await supabase
      .from('loadout_snapshots')
      .select('*')
      .eq('player_id', playerId)
      .order('snapped_at', { ascending: false })
      .limit(1)
      .single();

    if (snapErr || !snap) {
      return NextResponse.json({ error: 'No loadout found' }, { status: 404 });
    }

    const { data: player } = await supabase
      .from('player_profiles')
      .select('bungie_display_name, platform')
      .eq('id', playerId)
      .single();

    const { data: shellData } = await supabase
      .from('shell_stats')
      .select('*')
      .ilike('name', snap.shell || '')
      .limit(1)
      .maybeSingle();

    const { data: metaTier } = await supabase
      .from('meta_tiers')
      .select('tier, tier_trend')
      .ilike('name', snap.shell || '')
      .limit(1)
      .maybeSingle();

    const weaponNames = [snap.primary_weapon, snap.secondary_weapon].filter(Boolean);
    const { data: weaponData } = await supabase
      .from('weapon_stats')
      .select('*')
      .in('name', weaponNames.length > 0 ? weaponNames : ['__none__']);

    const loadoutSummary = `
RUNNER: ${player?.bungie_display_name || 'Unknown'} | Platform: ${player?.platform || 'PC'}

SHELL: ${snap.shell || 'Not specified'}
Current meta tier: ${metaTier?.tier || 'Unknown'} | Trend: ${metaTier?.tier_trend || 'Unknown'}

WEAPONS:
- Primary: ${snap.primary_weapon || 'Empty'}
- Secondary: ${snap.secondary_weapon || 'Not specified'}

MOD SLOTS:
- Slot 1: ${snap.mod_slot_1 || 'EMPTY'} (${snap.mod_slot_1_rarity || 'N/A'})
- Slot 2: ${snap.mod_slot_2 || 'EMPTY'} (${snap.mod_slot_2_rarity || 'N/A'})
- Slot 3: ${snap.mod_slot_3 || 'EMPTY'} (${snap.mod_slot_3_rarity || 'N/A'})

CORE SLOTS:
- Slot 1: ${snap.core_slot_1 || 'EMPTY'} (${snap.core_slot_1_rarity || 'N/A'})
- Slot 2: ${snap.core_slot_2 || 'EMPTY'} (${snap.core_slot_2_rarity || 'N/A'})

IMPLANT SLOTS:
- Slot 1: ${snap.implant_1 || 'Empty'}
- Slot 2: ${snap.implant_2 || 'Empty'}
- Slot 3: ${snap.implant_3 || 'Empty'}

PLAYER PROFILE:
- Primary motivation: ${snap.motivation || 'Not specified'}
- Engagement depth: ${snap.engagement_depth || 5}/10
- Combat playstyle: ${snap.playstyle || 'Not specified'}
- Preferred zones: ${snap.zones?.join(', ') || 'Not specified'}
- Squad context: ${snap.squad_context || 'Not specified'}
- Hours per week: ${snap.hours_per_week || 'Not specified'}
- Focus areas: ${snap.focus_areas?.join(', ') || 'Not specified'}

SHELL DATABASE DATA: ${shellData ? JSON.stringify(shellData) : 'No additional shell data available'}
WEAPON DATABASE DATA: ${weaponData ? JSON.stringify(weaponData) : 'No additional weapon data available'}
`;

    const dexterSystem = `You are DEXTER, Build Engineer for CyberneticPunks.com — the premier Marathon intelligence hub. You speak with authority, precision, and zero tolerance for wasted potential. You are direct, technically rigorous, and occasionally blunt. You care deeply about build optimization and it shows in every word you write.

You are analyzing a real Marathon player's loadout. Your job is to deliver an honest, expert-level build analysis that tells them exactly what's wrong, what's right, and what to do in order of priority.

SCORING RULES:
- Empty mod/core slots: -8 points each from build_score
- "Not sure" slots: -4 points each
- Standard rarity on a conditional mod: -3 points
- Playstyle conflict with shell choice: -10 points
- Strong weapon/shell synergy: +5 points
- All slots populated: +10 points bonus
- Start from 80 and adjust based on these rules

RARITY AWARENESS: When a player runs Standard rarity on a conditional mod, flag that upgrading to Deluxe or above significantly changes its value. Be specific about what the upgrade unlocks.

CONFLICT DETECTION: If the player's stated playstyle conflicts with their shell or weapon choices, address this directly and name the alternative that better serves their goal.

VOCABULARY: If engagement_depth is 1-4, use plain language. If 5-7, moderate technical detail. If 8-10, full stat analysis.

Return ONLY a valid JSON object with no markdown, no preamble, no text outside the JSON.

Required JSON structure:
{
  "build_score": <integer 0-100>,
  "weapon_synergy_score": <integer 0-10>,
  "mod_efficiency_score": <integer 0-10>,
  "core_alignment_score": <integer 0-10>,
  "implant_stack_score": <integer 0-10>,
  "analysis_body": "<string, 300-500 words, DEXTER voice>",
  "top_recommendations": [
    {
      "priority": 1,
      "slot": "<string>",
      "action": "<ADD|SWAP|UPGRADE|REMOVE>",
      "current_item": "<string or null>",
      "recommended_item": "<string>",
      "reason": "<string, 2-3 sentences>"
    }
  ]
}`;

    const nexusSystem = `You are NEXUS, Meta Strategist for CyberneticPunks.com. You speak with confidence, are analytical and forward-looking. You track meta patterns and anticipate shifts.

Assess this player's meta positioning based on their shell and weapons.

SCORING RULES:
- S-tier shell: start at 90, A-tier: 80, B-tier: 65, C-tier: 50, D-tier: 35
- Adjust +/-10 based on weapon meta alignment
- Adjust +/-5 based on zone preference matching current meta

Return ONLY a valid JSON object with no markdown, no preamble, no text outside the JSON.

Required JSON structure:
{
  "meta_score": <integer 0-100>,
  "shell_tier": "<S|A|B|C|D>",
  "shell_trend": "<RISING|STABLE|FALLING|UNKNOWN>",
  "weeks_at_tier": <integer>,
  "analysis_body": "<string, 200-350 words, NEXUS voice>",
  "watch_items": ["<string>", "<string>"]
}`;

    const mirandaSystem = `You are MIRANDA, Field Guide for CyberneticPunks.com. You are thoughtful, insightful, and connect the dots between playstyle, motivation, and build choices. You write with warmth but maintain authority.

Build a runner profile — a psychological and tactical portrait based on this player's questionnaire answers.

ARCHETYPES: THE EXTRACTOR, THE TECHNICIAN, THE CLIMBER, THE EXPLORER, THE GHOST, THE ENFORCER

Return ONLY a valid JSON object with no markdown, no preamble, no text outside the JSON.

Required JSON structure:
{
  "runner_archetype": "<string>",
  "archetype_description": "<string, 150-200 words, MIRANDA voice>",
  "cross_editor_note": "<string, 2-3 sentences in DEXTER or NEXUS voice>"
}`;

    const [dexterRaw, nexusRaw, mirandaRaw] = await Promise.all([
      callClaude(dexterSystem, `Analyze this Marathon loadout:\n${loadoutSummary}`),
      callClaude(nexusSystem, `Assess the meta positioning for this runner:\n${loadoutSummary}`),
      callClaude(mirandaSystem, `Build a runner profile for this player:\n${loadoutSummary}`),
    ]);

    let dexterResult = parseJSON(dexterRaw);
    let nexusResult = parseJSON(nexusRaw);
    let mirandaResult = parseJSON(mirandaRaw);

    if (!dexterResult) dexterResult = { build_score: 60, weapon_synergy_score: 6, mod_efficiency_score: 5, core_alignment_score: 6, implant_stack_score: 5, analysis_body: 'Build analysis temporarily unavailable. Please re-run your audit.', top_recommendations: [] };
    if (!nexusResult) nexusResult = { meta_score: 70, shell_tier: 'B', shell_trend: 'STABLE', weeks_at_tier: 1, analysis_body: 'Meta analysis temporarily unavailable.', watch_items: [] };
    if (!mirandaResult) mirandaResult = { runner_archetype: 'THE RUNNER', archetype_description: 'Profile compilation temporarily unavailable.', cross_editor_note: '' };

    const slotScore = slotUtilization(snap);
    const compositeScore = Math.min(100, Math.max(0, Math.round(
      (dexterResult.build_score * 0.55) +
      (nexusResult.meta_score * 0.25) +
      (slotScore * 0.20)
    )));

    const grade = letterGrade(compositeScore);

    const { error: auditError } = await supabase
      .from('player_audits')
      .insert({
        player_id: playerId,
        loadout_snapshot_id: snap.id,
        dexter_analysis: dexterResult,
        nexus_analysis: nexusResult,
        miranda_analysis: mirandaResult,
        composite_score: compositeScore,
        letter_grade: grade,
        top_recommendations: dexterResult.top_recommendations || [],
      });

    if (auditError) {
      console.error('Audit save error:', auditError);
      return NextResponse.json({ error: 'Failed to save audit', detail: auditError.message }, { status: 500 });
    }

    // Increment audit count safely
    try {
      await supabase.rpc('increment_audit_count', { player_id_input: playerId });
    } catch (rpcErr) {
      console.warn('RPC increment failed (non-fatal):', rpcErr);
    }

    return NextResponse.json({
      success: true,
      composite_score: compositeScore,
      letter_grade: grade,
    });

  } catch (err) {
    console.error('Audit route error:', err);
    return NextResponse.json({ error: 'Server error', detail: err.message }, { status: 500 });
  }
}