import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import MeClient from './MeClient';

export const metadata = {
  title: 'Runner Profile | CyberneticPunks',
};

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
}

export default async function MePage() {
  const cookieStore = await cookies();
  const playerId = cookieStore.get('cp_player_id')?.value;

  if (!playerId) redirect('/join');

  const supabase = getSupabase();

  const { data: player, error: playerError } = await supabase
    .from('player_profiles')
    .select('*')
    .eq('id', playerId)
    .single();

  if (playerError || !player) redirect('/join');

  if (!player.onboarding_complete) redirect('/join/intake');

  const { data: audit } = await supabase
    .from('player_audits')
    .select('*')
    .eq('player_id', playerId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: snapshot } = audit?.loadout_snapshot_id
    ? await supabase
        .from('loadout_snapshots')
        .select('*')
        .eq('id', audit.loadout_snapshot_id)
        .single()
    : { data: null };

  const { data: auditHistory } = await supabase
    .from('player_audits')
    .select('id, composite_score, letter_grade, created_at')
    .eq('player_id', playerId)
    .order('created_at', { ascending: false })
    .limit(10);

  return (
    <MeClient
      player={player}
      audit={audit}
      snapshot={snapshot}
      auditHistory={auditHistory || []}
    />
  );
}