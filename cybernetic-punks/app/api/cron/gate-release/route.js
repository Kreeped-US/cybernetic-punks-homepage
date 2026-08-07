// app/api/cron/gate-release/route.js
// PHASE 4 auto-release cron. Re-runs the FULL pre-publish gate against the current VERIFIED store
// over every gate_status='held' article, and RELEASES (is_published=true, gate_status='released')
// only the ones that now pass cleanly. Held-by = freed-by: the same runGate that held a draft frees
// it. The core logic lives in lib/gsc/releaseHeld.js (testable under node --test); this is the thin
// shell -- auth guard + service key + the deployed gate version, mirroring /api/cron/build-refresh.
//
// SAFETY: mode + verifiedOnly are DERIVED inside runGate (no call site can release-all); release is
// ATOMIC (WHERE gate_status='held', closes the double-release race); FAIL-CLOSED (a store-load throw
// aborts with 0 releases; a broken re-pass never releases). Hourly -- the re-pass is pure + cheap.

import { createClient } from '@supabase/supabase-js';
import { releaseHeldDrafts } from '@/lib/gsc/releaseHeld';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  // Fail-safe cron auth guard (mirrors /api/cron/build-refresh): inert until CRON_SECRET is set (so
  // deploying before the env var does not lock out Vercel's scheduled job), then requires the Bearer
  // header Vercel Cron sends automatically.
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.warn('[gate-release] CRON_SECRET not set -- route is UNGUARDED. Set CRON_SECRET to arm the guard.');
  } else {
    const auth = req && req.headers ? req.headers.get('authorization') : null;
    if (auth !== 'Bearer ' + cronSecret) {
      console.warn('[gate-release] Rejected request: missing/invalid Authorization Bearer.');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  // SERVICE KEY REQUIRED -- NO ANON FALLBACK. Releasing sets is_published; that write goes through
  // the service key. Fail LOUDLY (mirrors /api/cron/build-refresh) rather than silently no-op.
  if (!process.env.SUPABASE_SERVICE_KEY) {
    console.error('[gate-release] ABORT: SUPABASE_SERVICE_KEY is not set -- refusing to run on the anon key.');
    return Response.json({ error: 'SUPABASE_SERVICE_KEY not configured' }, { status: 500 });
  }
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

  // The gate version = the deployed commit (Vercel sets VERCEL_GIT_COMMIT_SHA). It stamps every
  // release as the grammar that agreed -- the release certificate's gate identity.
  const gateVersion = process.env.VERCEL_GIT_COMMIT_SHA || 'dev';
  const runDate = new Date().toISOString().slice(0, 10);

  const summary = await releaseHeldDrafts(supabase, { runDate, gateVersion });

  if (summary.aborted) {
    return Response.json({ error: summary.reason, released: 0, checked: summary.checked }, { status: 500 });
  }
  return Response.json({
    released: summary.released,
    stillHeld: summary.stillHeld,
    checked: summary.checked,
    releasedSlugs: summary.releasedSlugs,
    errors: summary.errors && summary.errors.length ? summary.errors : undefined,
    gateVersion,
  });
}
