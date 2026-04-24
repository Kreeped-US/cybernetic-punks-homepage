import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import SetupClient from './SetupClient';

export const metadata = { title: 'Set Up Your Profile | CyberneticPunks' };

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
}

export default async function SetupPage() {
  var cookieStore = await cookies();
  var playerId = cookieStore.get('cp_player_id')?.value;
  if (!playerId) redirect('/join');

  var supabase = getSupabase();
  var { data: player } = await supabase
    .from('user_profiles')  // verify: may be player_profiles in your DB
    .select('id, bungie_display_name, onboarding_complete')
    .eq('id', playerId)
    .single();

  if (!player) redirect('/join');
  if (player.onboarding_complete) redirect('/me');

  var displayName = (player.bungie_display_name || '').replace(/#\d+/, '').trim();

  return <SetupClient displayName={displayName} />;
}
