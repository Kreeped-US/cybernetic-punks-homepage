import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const playerId = cookieStore.get('cp_player_id')?.value;

    if (!playerId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const answers = await request.json();

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    const { data: snapshot, error: snapshotError } = await supabase
      .from('loadout_snapshots')
      .insert({
        player_id: playerId,
        shell: answers.shell || null,
        primary_weapon: answers.primary_weapon || null,
        secondary_weapon: answers.secondary_weapon || null,
        mod_slot_1: answers.mod_slot_1 || null,
        mod_slot_1_rarity: answers.mod_slot_1_rarity || null,
        mod_slot_2: answers.mod_slot_2 || null,
        mod_slot_2_rarity: answers.mod_slot_2_rarity || null,
        mod_slot_3: answers.mod_slot_3 || null,
        mod_slot_3_rarity: answers.mod_slot_3_rarity || null,
        core_slot_1: answers.core_slot_1 || null,
        core_slot_1_rarity: answers.core_slot_1_rarity || null,
        core_slot_2: answers.core_slot_2 || null,
        core_slot_2_rarity: answers.core_slot_2_rarity || null,
        implant_1: answers.implant_1 || null,
        implant_2: answers.implant_2 || null,
        implant_3: answers.implant_3 || null,
        motivation: answers.motivation || null,
        engagement_depth: answers.engagement_depth || 5,
        playstyle: answers.playstyle || null,
        zones: answers.zones || [],
        squad_context: answers.squad_context || null,
        hours_per_week: answers.hours_per_week || null,
        focus_areas: answers.focus_areas || [],
      })
      .select('id')
      .single();

    if (snapshotError) {
      console.error('Snapshot error:', snapshotError);
      return NextResponse.json({ error: 'Failed to save loadout', detail: snapshotError.message }, { status: 500 });
    }

    const { error: profileError } = await supabase
      .from('player_profiles')
      .update({
        onboarding_complete: true,
        last_seen_at: new Date().toISOString(),
      })
      .eq('id', playerId);

    if (profileError) {
      console.error('Profile error:', profileError);
      return NextResponse.json({ error: 'Failed to update profile', detail: profileError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, snapshot_id: snapshot.id });

  } catch (err) {
    console.error('Intake route error:', err);
    return NextResponse.json({ error: 'Server error', detail: err.message }, { status: 500 });
  }
}