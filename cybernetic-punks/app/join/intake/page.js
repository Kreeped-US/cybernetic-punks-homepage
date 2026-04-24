import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import IntakeClient from './IntakeClient';

export const metadata = {
  title: 'Runner Intake | CyberneticPunks',
};

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
}

export default async function IntakePage() {
  const cookieStore = await cookies();
  const playerId = cookieStore.get('cp_player_id')?.value;

  if (!playerId) redirect('/join');

  const supabase = getSupabase();

  const { data: player } = await supabase
    .from('player_profiles')
    .select('id, bungie_display_name, onboarding_complete')
    .eq('id', playerId)
    .single();

  if (!player) redirect('/join');
  if (player.onboarding_complete) redirect('/me');

  const [weaponsRes, metaRes, modsRes, coresRes, implantsRes] = await Promise.all([
    supabase
      .from('weapon_stats')
      .select('name, category, weapon_type, mod_slot_types, image_filename')
      .order('category')
      .order('name'),
    supabase
      .from('meta_tiers')
      .select('name, tier')
      .order('name'),
    supabase
      .from('mod_stats')
      .select('name, slot_type, compatible_categories, rarity, effect_desc, effect_summary')
      .order('slot_type')
      .order('name'),
    supabase
      .from('core_stats')
      .select('name, rarity, required_runner, is_shell_exclusive, effect_desc, ability_type')
      .order('name'),
    supabase
      .from('implant_stats')
      .select('name, slot_type, rarity, passive_desc, stat_1_label, stat_1_value')
      .order('slot_type')
      .order('name'),
  ]);
// Redirect to simple setup while Personal Coach is pre-launch
// Remove this line when coaching goes live for paid users
redirect('/join/setup');
  return (
    <IntakeClient
      playerName={player.bungie_display_name}
      weapons={weaponsRes.data || []}
      metaTiers={metaRes.data || []}
      mods={modsRes.data || []}
      cores={coresRes.data || []}
      implants={implantsRes.data || []}
    />
  );
}