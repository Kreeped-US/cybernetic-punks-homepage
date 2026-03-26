import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
}

const EDITOR_PERSONAS = {
  DEXTER: `You are DEXTER, Build Engineer for CyberneticPunks.com. You are direct, technically rigorous, and occasionally blunt. You have zero tolerance for wasted potential in a build. You speak with authority and always give specific, actionable answers. Never hedge. If something is wrong, say so plainly. If something is right, say why. Keep answers focused and under 200 words.`,
  NEXUS: `You are NEXUS, Meta Strategist for CyberneticPunks.com. You are analytical, forward-looking, and speak with the confidence of someone who tracks every meta shift since Marathon launched. You think in patterns and probabilities. You anticipate what changes before they happen. Keep answers focused and under 200 words.`,
  CIPHER: `You are CIPHER, Play Analyst for CyberneticPunks.com. You analyze how players actually engage in combat — timing, positioning, decision patterns. You identify behavioral tendencies that cause underperformance and give precise corrections. You are clinical but not cold. Keep answers focused and under 200 words.`,
  MIRANDA: `You are MIRANDA, Field Guide for CyberneticPunks.com. You see the player as a whole — their playstyle identity, their motivations, how their build choices reflect who they are as a runner. You are thoughtful, insightful, and occasionally poetic. You connect dots others miss. Keep answers focused and under 200 words.`,
  GHOST: `You are GHOST, Community Pulse editor for CyberneticPunks.com. You track what the Marathon community is saying, doing, and discovering. You know what's trending, what's being debated, and what the meta conversation is this week. You are plugged in and conversational. Keep answers focused and under 200 words.`,
};

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const playerId = cookieStore.get('cp_player_id')?.value;

    if (!playerId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { editor, question } = await request.json();

    if (!editor || !question?.trim()) {
      return NextResponse.json({ error: 'Missing editor or question' }, { status: 400 });
    }

    const supabase = getSupabase();

    // Fetch latest audit and snapshot for context
    const { data: audit } = await supabase
      .from('player_audits')
      .select('dexter_analysis, nexus_analysis, miranda_analysis, composite_score, letter_grade')
      .eq('player_id', playerId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: snapshot } = await supabase
      .from('loadout_snapshots')
      .select('*')
      .eq('player_id', playerId)
      .order('snapped_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const context = snapshot ? `
PLAYER'S CURRENT LOADOUT:
- Shell: ${snapshot.shell || 'Unknown'}
- Primary: ${snapshot.primary_weapon || 'Unknown'}
- Secondary: ${snapshot.secondary_weapon || 'Unknown'}
- Mod Slot 1: ${snapshot.mod_slot_1 || 'Empty'} (${snapshot.mod_slot_1_rarity || 'N/A'})
- Mod Slot 2: ${snapshot.mod_slot_2 || 'Empty'} (${snapshot.mod_slot_2_rarity || 'N/A'})
- Mod Slot 3: ${snapshot.mod_slot_3 || 'Empty'} (${snapshot.mod_slot_3_rarity || 'N/A'})
- Core Slot 1: ${snapshot.core_slot_1 || 'Empty'} (${snapshot.core_slot_1_rarity || 'N/A'})
- Core Slot 2: ${snapshot.core_slot_2 || 'Empty'} (${snapshot.core_slot_2_rarity || 'N/A'})
- Implant 1: ${snapshot.implant_1 || 'Empty'}
- Implant 2: ${snapshot.implant_2 || 'Empty'}
- Implant 3: ${snapshot.implant_3 || 'Empty'}
- Playstyle: ${snapshot.playstyle || 'Unknown'}
- Squad context: ${snapshot.squad_context || 'Unknown'}
- Zones: ${snapshot.zones?.join(', ') || 'Unknown'}
- Hours/week: ${snapshot.hours_per_week || 'Unknown'}
- Motivation: ${snapshot.motivation || 'Unknown'}

THEIR AUDIT RESULTS:
- Runner Rating: ${audit?.composite_score || 'N/A'} (${audit?.letter_grade || 'N/A'})
- DEXTER build score: ${audit?.dexter_analysis?.build_score || 'N/A'}
- NEXUS meta score: ${audit?.nexus_analysis?.meta_score || 'N/A'}
- Runner archetype: ${audit?.miranda_analysis?.runner_archetype || 'N/A'}
` : 'No loadout data available for this player yet.';

    const systemPrompt = `${EDITOR_PERSONAS[editor] || EDITOR_PERSONAS.DEXTER}

You have access to this player's loadout and audit data. Use it to give a specific, personalized answer. Never give generic advice when you have their actual data to reference.

${context}`;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: question.trim() }],
      }),
    });

    if (!res.ok) {
      console.error('Claude API error:', res.status);
      return NextResponse.json({ error: 'Editor unavailable' }, { status: 500 });
    }

    const data = await res.json();
    const answer = data.content?.[0]?.text || 'No response generated.';

    // Save to Q&A history
    await supabase.from('player_qa_history').insert({
      player_id: playerId,
      editor,
      question: question.trim(),
      answer,
    });

    return NextResponse.json({ success: true, answer });

  } catch (err) {
    console.error('Ask editor error:', err);
    return NextResponse.json({ error: 'Server error', detail: err.message }, { status: 500 });
  }
}
