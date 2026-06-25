import { createClient } from '@supabase/supabase-js';
import { resolveSession } from '@/lib/auth/resolveSession';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
}

export async function PATCH(request) {
  var session = await resolveSession();
  if (!session) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 });
  }
  var playerId = session.playerProfileId;

  var body = await request.json();
  var allowed = ['favorite_shell', 'preferred_playstyle', 'onboarding_complete'];
  var updates = {};
  allowed.forEach(function(k) {
    if (body[k] !== undefined) updates[k] = body[k];
  });

  if (Object.keys(updates).length === 0) {
    return Response.json({ error: 'No valid fields provided' }, { status: 400 });
  }

  var supabase = getSupabase();
  var { data, error } = await supabase
    .from('player_profiles')
    .update(updates)
    .eq('id', playerId)
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ data });
}
