import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import MeClient from './MeClient';

export const metadata = { title: 'My Profile | CyberneticPunks' };

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
}

export default async function MePage() {
  var cookieStore = await cookies();
  var playerId = cookieStore.get('cp_player_id')?.value;
  if (!playerId) redirect('/join');

  var supabase = getSupabase();
  var { data: player } = await supabase
    .from('player_profiles')
    .select('id, bungie_display_name, bungie_avatar_url, platform, favorite_shell, preferred_playstyle, created_at, subscription_tier, onboarding_complete')
    .eq('id', playerId)
    .single();

  if (!player) redirect('/join');
  if (!player.onboarding_complete) redirect('/join/setup');

  return <MeClient player={player} />;
}
