// app/api/cron/inspect/route.js
// DEDICATED Consumer C URL Inspection cron -- SEPARATE from the generation cron
// (/api/cron) so its chunked fire fits the DEFAULT 60s function ceiling. The
// generation cron's ~50-min inspection pull was a NO-OP (killed at 60s, wrote
// nothing); this route runs a small chunk every 15 minutes instead. vercel.json
// schedules it. Own service-key client, same fail-safe guards as the generation cron.
import { createClient } from '@supabase/supabase-js';
import { runInspectionChunk } from '@/lib/gsc/inspectionRun';

export const dynamic = 'force-dynamic';
// DEFAULT ceiling -- the chunk (lib/gsc/inspectionRun.js) is sized to fit INSIDE 60s,
// not to raise it. Do not increase this without resizing CHUNK.
export const maxDuration = 60;

export async function GET(req) {
  // FAIL-SAFE cron auth guard, mirrored from /api/cron: inert until CRON_SECRET is set
  // (so deploying before the env var does not lock out Vercel's scheduled job), then
  // requires the Bearer header Vercel Cron sends automatically.
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.warn('[inspect] CRON_SECRET not set -- route is UNGUARDED. Set CRON_SECRET in Vercel env to arm the guard.');
  } else {
    const auth = req && req.headers ? req.headers.get('authorization') : null;
    if (auth !== 'Bearer ' + cronSecret) {
      console.warn('[inspect] Rejected request: missing/invalid Authorization Bearer.');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  // SERVICE KEY REQUIRED -- NO ANON FALLBACK. inspection_runs + gsc_url_inspection are
  // RLS-enabled with no policies, so an anon client would have its writes silently rejected.
  if (!process.env.SUPABASE_SERVICE_KEY) {
    console.error('[inspect] ABORT: SUPABASE_SERVICE_KEY is not set. Refusing to run on the anon key -- ' +
      'RLS-protected writes would be silently rejected. Set SUPABASE_SERVICE_KEY in the Vercel env.');
    return Response.json({ error: 'SUPABASE_SERVICE_KEY not configured' }, { status: 500 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  // The fire never throws into the route (fail-open), but wrap the dispatch too.
  let res = null;
  try {
    res = await runInspectionChunk(supabase);
  } catch (err) {
    console.error('[inspect] dispatch error (contained, non-fatal): ' + (err && err.message));
  }

  // HEARTBEAT: backlog + this fire's outcome, surfaced in the response body (Vercel shows
  // it in the cron invocation detail) -- "inspection: backlog=N" without log spelunking.
  return Response.json({
    success: true,
    timestamp: new Date().toISOString(),
    inspection: res
      ? ('backlog=' + res.backlog + ' status=' + res.status + ' attempted=' + res.attempted +
         ' written=' + res.written + ' mean_ms=' + res.meanLatencyMs +
         ' indexation_flags_open=' + res.openFlags)
      : 'dispatch-error',
  });
}
