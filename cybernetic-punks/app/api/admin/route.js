import crypto from 'crypto';
import { ENTRY_VALIDATORS } from '@/lib/keywordEntry';
import { createClient } from '@supabase/supabase-js';
import { checkLockout, recordFailure, clearFailures } from '@/lib/rateLimit';

// FIX (May 15, 2026): createClient() moved into getSupabase() helper.
// Previously at module scope, which caused Vercel build to fail with
// "supabaseUrl is required" because Next.js 16's stricter pre-rendering
// evaluates module-scope code at build time before env vars are
// available. force-dynamic prevents Next.js from attempting static
// analysis on this route.

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
}

const ALLOWED_TABLES = [
  'weapon_stats',
  'shell_stats',
  'mod_stats',
  'implant_stats',
  'ammo_stats',
  'shell_stat_values',
  'core_stats',
  'editor_directives',
  'factions',
  'faction_stat_bonuses',
  'faction_unlocks',
  'faction_materials',
  'game_maps',
  'game_zones',
  'game_bosses',
  'game_events',
  'game_modes',
  // DMZ launch-day entity tables (public-read, service-key write via this route).
  'dmz_keys',
  'dmz_missions',
  'dmz_items',
  // Keyword-framing store (commit d). Writes are validated by ENTRY_VALIDATORS
  // below -- entity_slug must resolve against the real entities for its type.
  'keyword_targets',
];

// ORDER COLUMN per table, as an EXPLICIT MAP.
//
// This replaced a bare `var orderCol = 'name'` plus a chain of per-table if-
// overrides (2026-07-23). That shape failed OPEN in the worst way: any table
// WITHOUT a name column returned a 500 from its own admin GET and read as an
// empty/erroring table in the UI. keyword_targets did exactly that -- "column
// keyword_targets.name does not exist", live from July 22 -- so the keyword
// store could not be listed at all, on the very table whose first keyword had
// just gone active. An audit of all 21 allowlisted tables against the live
// schema found keyword_targets was the ONLY instance; every other table
// (including dmz_keys/dmz_missions/dmz_items, which do have `name`) was fine.
//
// The fallback is 'id', verified present on all 21 allowlisted tables and the
// Supabase PK convention. That is the CLASS fix rather than the instance fix: a
// table added to ALLOWED_TABLES but forgotten here now sorts by id -- unhelpful
// ordering, but a WORKING list -- instead of 500ing. Add an entry here to get a
// sensible order; forgetting can no longer break the table outright.
const ORDER_BY = {
  weapon_stats:         'name',
  shell_stats:          'name',
  mod_stats:            'name',
  implant_stats:        'created_at',
  ammo_stats:           'name',
  shell_stat_values:    'updated_at',
  core_stats:           'created_at',
  editor_directives:    'created_at',
  factions:             'name',
  faction_stat_bonuses: 'faction_name',
  faction_unlocks:      'faction_name',
  faction_materials:    'faction_name',
  game_maps:            'name',
  game_zones:           'map_slug',
  game_bosses:          'map_slug',
  game_events:          'event_name',
  game_modes:           'mode_name',
  dmz_keys:             'name',
  dmz_missions:         'name',
  dmz_items:            'name',
  // keyword_targets has NO name column. 'keyword' is the natural display order:
  // it is the same field the row label renders (fixed render-side in 16c0755),
  // so the list reads in the order of the thing you actually see, which is what
  // "is this keyword already tracked?" scanning needs.
  keyword_targets:      'keyword',
};
const ORDER_BY_FALLBACK = 'id';

// SECURITY (audit #4): admin hardening. Keeps the password mechanism (OAuth
// migration is a separate future task) but removes the timing side-channel and
// adds a windowed, self-clearing, per-IP lockout.
const ADMIN_MAX_FAILS = 5;                       // failures allowed per window
const ADMIN_LOCK_WINDOW_MS = 15 * 60 * 1000;     // 15 min, then auto-clears

// Constant-time compare. Both sides are SHA-256'd to a fixed 32-byte digest
// first, so timingSafeEqual never sees unequal lengths -- this removes BOTH the
// per-character timing leak AND the password-length leak.
function safeEqual(provided, expected) {
  if (!expected) return false; // no password configured -> fail closed
  const a = crypto.createHash('sha256').update(String(provided)).digest();
  const b = crypto.createHash('sha256').update(String(expected)).digest();
  return crypto.timingSafeEqual(a, b);
}

// Client IP for keying the lockout. Vercel always sets x-forwarded-for; the
// fallbacks keep local dev working. Per-IP keying is what guarantees a
// brute-forcer cannot lock out the admin (different connection, own counter).
function clientIp(req) {
  const xff = req.headers.get('x-forwarded-for') || '';
  return xff.split(',')[0].trim() || req.headers.get('x-real-ip') || 'unknown';
}

function checkAuth(req) {
  return safeEqual(req.headers.get('x-admin-password'), process.env.ADMIN_PASSWORD);
}

// Combined gate: lockout check -> password check -> (record failure | clear).
// Returns { ok: true } or { ok: false, response } so each handler can early-return.
function authorize(req) {
  const key = 'admin-fail:' + clientIp(req);
  const lock = checkLockout(key, ADMIN_MAX_FAILS, ADMIN_LOCK_WINDOW_MS);
  if (lock.locked) {
    return {
      ok: false,
      response: Response.json(
        { error: 'Too many attempts. Try again later.' },
        { status: 429, headers: { 'Retry-After': String(lock.retryAfter) } }
      ),
    };
  }
  if (!checkAuth(req)) {
    recordFailure(key, ADMIN_LOCK_WINDOW_MS);
    return { ok: false, response: Response.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  clearFailures(key); // success resets this IP's failure counter
  return { ok: true };
}

export async function GET(req) {
  var auth = authorize(req);
  if (!auth.ok) return auth.response;
  var url = new URL(req.url);
  var table = url.searchParams.get('table');
  if (!ALLOWED_TABLES.includes(table)) return Response.json({ error: 'Invalid table' }, { status: 400 });

  var orderCol = ORDER_BY[table] || ORDER_BY_FALLBACK;

  var supabase = getSupabase();
  var { data, error } = await supabase.from(table).select('*').order(orderCol, { ascending: true }).limit(500);
  console.log('[ADMIN GET]', table, 'rows:', data?.length, 'error:', error?.message);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ data });
}

// Per-table entry validation. Runs BEFORE the write on BOTH create and edit -- a row
// could otherwise be created clean and edited into an invalid state. Tables without a
// registered validator are unaffected.
async function runEntryValidation(table, row, supabase) {
  var validate = ENTRY_VALIDATORS[table];
  if (!validate) return null;
  var res = await validate(supabase, row);
  if (res && res.ok) return null;
  return Response.json({ error: (res && res.reason) || 'validation failed' }, { status: 400 });
}

export async function POST(req) {
  var auth = authorize(req);
  if (!auth.ok) return auth.response;
  var { table, row } = await req.json();
  if (!ALLOWED_TABLES.includes(table)) return Response.json({ error: 'Invalid table' }, { status: 400 });
  var supabase = getSupabase();
  var invalid = await runEntryValidation(table, row, supabase);
  if (invalid) return invalid;
  var { data, error } = await supabase.from(table).insert(row).select().single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ data });
}

export async function PATCH(req) {
  var auth = authorize(req);
  if (!auth.ok) return auth.response;
  var { table, id, updates } = await req.json();
  if (!ALLOWED_TABLES.includes(table)) return Response.json({ error: 'Invalid table' }, { status: 400 });
  var supabase = getSupabase();
  var invalid = await runEntryValidation(table, updates, supabase);
  if (invalid) return invalid;
  var { data, error } = await supabase.from(table).update(updates).eq('id', id).select().single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ data });
}

export async function DELETE(req) {
  var auth = authorize(req);
  if (!auth.ok) return auth.response;
  var url = new URL(req.url);
  var table = url.searchParams.get('table');
  var id = url.searchParams.get('id');
  if (!ALLOWED_TABLES.includes(table)) return Response.json({ error: 'Invalid table' }, { status: 400 });
  var supabase = getSupabase();
  var { error } = await supabase.from(table).delete().eq('id', id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true });
}