import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const ALLOWED_TABLES = ['weapon_stats', 'shell_stats', 'mod_stats', 'implant_stats', 'ammo_stats', 'shell_stat_values'];

function checkAuth(req) {
  var auth = req.headers.get('x-admin-password');
  return auth === process.env.ADMIN_PASSWORD;
}

export async function GET(req) {
  if (!checkAuth(req)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  var url = new URL(req.url);
  var table = url.searchParams.get('table');
  if (!ALLOWED_TABLES.includes(table)) return Response.json({ error: 'Invalid table' }, { status: 400 });
  var { data, error } = await supabase.from(table).select('*').order('updated_at', { ascending: false }).limit(200);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ data });
}

export async function POST(req) {
  if (!checkAuth(req)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  var { table, row } = await req.json();
  if (!ALLOWED_TABLES.includes(table)) return Response.json({ error: 'Invalid table' }, { status: 400 });
  var { data, error } = await supabase.from(table).insert(row).select().single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ data });
}

export async function PATCH(req) {
  if (!checkAuth(req)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  var { table, id, updates } = await req.json();
  if (!ALLOWED_TABLES.includes(table)) return Response.json({ error: 'Invalid table' }, { status: 400 });
  var { data, error } = await supabase.from(table).update(updates).eq('id', id).select().single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ data });
}

export async function DELETE(req) {
  if (!checkAuth(req)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  var url = new URL(req.url);
  var table = url.searchParams.get('table');
  var id = url.searchParams.get('id');
  if (!ALLOWED_TABLES.includes(table)) return Response.json({ error: 'Invalid table' }, { status: 400 });
  var { error } = await supabase.from(table).delete().eq('id', id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true });
}
