import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
}

export async function PATCH(request) {
  var cookieStore = await cookies();
  var playerId = cookieStore.get('cp_player_id')?.value;
  if (!playerId) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 });
  }

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
    .from('user_profiles')  // verify: may be player_profiles in your DB
    .update(updates)
    .eq('id', playerId)
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ data });
}
