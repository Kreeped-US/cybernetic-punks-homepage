// app/api/admin/email-signups/route.js
// READ-ONLY operator view of the owned launch-email list (email_signups). GET ONLY --
// there is intentionally NO POST/PATCH/DELETE handler here, so this surface can never
// mutate the capture list. (The generic /api/admin CRUD route deliberately does NOT
// allowlist email_signups, so no write path reaches this table anywhere.) Gated by the
// SHARED admin gate (lib/adminAuth.authorizeAdmin): per-IP lockout + constant-time
// password compare + fail-closed -- the same helper /api/admin + metrics + quality-alerts use.
//
// GET (JSON, default): { total, byGame:{dmz,marathon,other}, last7,
//   buckets:[{day,count}] (dense 30-day series), rows:[...] newest-first,
//   paginated (limit default 100, cap 500; offset), limit, offset }.
// GET ?format=csv: text/csv attachment, columns email,source,game_slug,created_at
//   (NO user_agent -- PII minimization in the export), ALL rows, newest-first.

import { createClient } from '@supabase/supabase-js';
import { authorizeAdmin } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

const TABLE = 'email_signups';
const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;
const PAGE = 1000;               // PostgREST hard cap per request
const SCAN_CAP = 100000;         // safety ceiling on full-table scans (CSV / buckets)

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
}

function dayKey(iso) {
  return String(iso).slice(0, 10); // YYYY-MM-DD (created_at is stored UTC ISO)
}

// RFC-4180 cell: quote if it contains comma, quote, CR or LF; double interior quotes.
function csvCell(v) {
  var s = v == null ? '' : String(v);
  if (/[",\r\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

async function countWhere(supabase, build) {
  var q = supabase.from(TABLE).select('*', { count: 'exact', head: true });
  q = build ? build(q) : q;
  var { count, error } = await q;
  if (error) throw error;
  return count || 0;
}

// Paginate past the 1000-row cap, newest-first, capped. `columns` is the select list.
async function fetchAll(supabase, columns, build) {
  var out = [];
  var from = 0;
  while (out.length < SCAN_CAP) {
    var q = supabase.from(TABLE).select(columns).order('created_at', { ascending: false }).range(from, from + PAGE - 1);
    q = build ? build(q) : q;
    var { data, error } = await q;
    if (error) throw error;
    if (!data || data.length === 0) break;
    out.push.apply(out, data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return out;
}

export async function GET(req) {
  var auth = authorizeAdmin(req);
  if (!auth.ok) return auth.response;

  var supabase = getSupabase();
  var url = new URL(req.url);
  var format = url.searchParams.get('format');

  try {
    // ── CSV export: ALL rows, newest-first, PII-minimized (no user_agent) ──
    if (format === 'csv') {
      var rows = await fetchAll(supabase, 'email, source, game_slug, created_at');
      var header = 'email,source,game_slug,created_at';
      var lines = rows.map(function (r) {
        return [csvCell(r.email), csvCell(r.source), csvCell(r.game_slug), csvCell(r.created_at)].join(',');
      });
      var csv = header + '\r\n' + (lines.length ? lines.join('\r\n') + '\r\n' : '');
      return new Response(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="email-signups.csv"',
          'Cache-Control': 'no-store',
        },
      });
    }

    // ── JSON summary + paginated list ──
    var limit = parseInt(url.searchParams.get('limit') || '', 10);
    if (!Number.isFinite(limit) || limit < 1) limit = DEFAULT_LIMIT;
    if (limit > MAX_LIMIT) limit = MAX_LIMIT;
    var offset = parseInt(url.searchParams.get('offset') || '', 10);
    if (!Number.isFinite(offset) || offset < 0) offset = 0;

    var now = new Date();
    var d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    var d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    var total = await countWhere(supabase);
    var dmz = await countWhere(supabase, function (q) { return q.eq('game_slug', 'dmz'); });
    var marathon = await countWhere(supabase, function (q) { return q.eq('game_slug', 'marathon'); });
    var other = total - dmz - marathon;
    if (other < 0) other = 0;
    var last7 = await countWhere(supabase, function (q) { return q.gte('created_at', d7); });

    // 30-day daily buckets: fetch created_at for the window, bucket in JS, zero-fill.
    var recent = await fetchAll(supabase, 'created_at', function (q) { return q.gte('created_at', d30); });
    var bucketMap = {};
    recent.forEach(function (r) { var k = dayKey(r.created_at); bucketMap[k] = (bucketMap[k] || 0) + 1; });
    var buckets = [];
    for (var i = 29; i >= 0; i--) {
      var day = new Date(now.getTime() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      buckets.push({ day: day, count: bucketMap[day] || 0 });
    }

    var listRes = await supabase.from(TABLE)
      .select('id, email, source, game_slug, created_at')
      .order('created_at', { ascending: false }).range(offset, offset + limit - 1);
    if (listRes.error) throw listRes.error;

    return Response.json({
      total: total,
      byGame: { dmz: dmz, marathon: marathon, other: other },
      last7: last7,
      buckets: buckets,
      rows: listRes.data || [],
      limit: limit,
      offset: offset,
    });
  } catch (err) {
    console.error('[admin/email-signups] error:', err && err.message);
    return Response.json({ error: 'Failed to load signups.' }, { status: 500 });
  }
}
