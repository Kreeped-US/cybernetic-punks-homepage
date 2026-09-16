// lib/opsDigest.js
// The daily "N drafts ready for review" DIGEST + the "days since last durable draft"
// HEARTBEAT (Phase 1, Brief 2). Runs at the end of every cron run and sends via the
// shared fail-safe ops layer (lib/opsNotify sendOpsAlert -> email + Discord ops), so the
// operator gets a daily login trigger + proof-of-life, and a silent-but-not-crashing
// pipeline (cron succeeds yet produces nothing over days) escalates to an ALARM.
//
// READ-ONLY. Counts held-for-review drafts (feed_items.is_published=false, network-wide,
// grouped by game -- matches the admin drafts panel's "what's waiting for you") and the
// age of the producing game's last DURABLE draft. No schema change, no writes.
//
// "DURABLE draft": produced by a roster editor that is NOT patch-gated -- i.e. a
// daily/evergreen producer (for marathon: MIRANDA). Derived from config, NOT hardcoded.
// This is deliberate: measuring ANY roster editor would let NEXUS's patch-day drafts
// mask MIRANDA's silence -- exactly the death that went unnoticed for two weeks.
//
// *** NEVER THROWS. *** Fully wrapped -- a digest/heartbeat failure logs and continues,
// it can never block or crash the cron (same discipline as the foundation + keyword HB).

import { sendOpsAlert } from './opsNotify';

// The producing game's durable producer should ship ~daily. A couple of quiet days is
// normal (queue dedup / no fresh gap), so the alarm threshold sits above that: past this
// many days with NO durable draft, the digest escalates to an ALARM. Named constant so
// it is tunable in one place.
export const DURABLE_DRAFT_STALE_DAYS = 4;

function dayCount(ms) { return ms / 86400000; }

function displayAge(days) {
  if (days == null) return 'never';
  if (days < 1) return '<1d';
  return Math.floor(days) + 'd';
}

// opts: { producingGameSlug, durableEditors: string[], run: { kind, succeeded, attempted, published } }
export async function emitDraftsDigest(supabase, opts) {
  try {
    var o = opts || {};
    var game = o.producingGameSlug || 'unknown';
    var durableEditors = Array.isArray(o.durableEditors) ? o.durableEditors : [];
    var run = o.run || {};

    // 1. Held drafts (is_published=false) network-wide, grouped by game. Bounded set
    //    (the review queue is cleared as drafts are approved/declined); cap defensively.
    var heldByGame = {};
    var totalHeld = 0;
    try {
      var heldRes = await supabase.from('feed_items').select('game_slug').eq('is_published', false).limit(2000);
      if (heldRes && !heldRes.error) {
        (heldRes.data || []).forEach(function (r) {
          var g = r.game_slug || 'unknown';
          heldByGame[g] = (heldByGame[g] || 0) + 1;
          totalHeld++;
        });
      } else if (heldRes && heldRes.error) {
        console.log('[ops-digest] held-count query error (non-fatal): ' + heldRes.error.message);
      }
    } catch (e) {
      console.log('[ops-digest] held-count threw (non-fatal): ' + (e && e.message));
    }

    // 2. Heartbeat: days since the producing game's last DURABLE draft.
    var daysSince = null;
    if (durableEditors.length) {
      try {
        var lastRes = await supabase.from('feed_items')
          .select('created_at')
          .eq('game_slug', game)
          .in('editor', durableEditors)
          .order('created_at', { ascending: false })
          .limit(1);
        if (lastRes && !lastRes.error && lastRes.data && lastRes.data.length) {
          daysSince = dayCount(Date.now() - new Date(lastRes.data[0].created_at).getTime());
        }
      } catch (e) {
        console.log('[ops-digest] heartbeat query threw (non-fatal): ' + (e && e.message));
      }
    }
    // stale when we have durable producers configured AND (never produced OR past threshold).
    var stale = durableEditors.length > 0 && (daysSince == null || daysSince > DURABLE_DRAFT_STALE_DAYS);
    var ageStr = displayAge(daysSince);

    // 3. Body pieces.
    var perGame = Object.keys(heldByGame).sort().map(function (g) { return '  ' + g + ': ' + heldByGame[g]; }).join('\n');
    if (!perGame) perGame = '  (none pending)';
    var runLine = 'This run (' + game + '): ' + (run.kind || 'unknown') + ', '
      + (run.succeeded == null ? '?' : run.succeeded) + '/' + (run.attempted == null ? '?' : run.attempted)
      + ' editors produced, ' + (run.published == null ? '?' : run.published) + ' published.';
    var hbLine = 'Last durable draft (' + game + ', ' + (durableEditors.join(', ') || 'none configured')
      + '): ' + ageStr + ' ago (threshold ' + DURABLE_DRAFT_STALE_DAYS + 'd).';

    var subject, body;
    if (stale) {
      subject = 'CNP ALERT: no durable draft in ' + ageStr + ' (' + game + ')';
      body = 'ALARM: the durable producer for ' + game + ' (' + (durableEditors.join(', ') || 'none configured')
        + ') has not produced a draft in ' + ageStr + ' (threshold ' + DURABLE_DRAFT_STALE_DAYS + 'd). '
        + 'The cron ran, so this is a SILENT failure, not a crash -- check cron_runs.failure_reasons '
        + 'and the latest run.\n\n'
        + totalHeld + ' draft(s) held for review across the network.\n'
        + 'By game:\n' + perGame + '\n\n'
        + runLine + '\n\n'
        + 'Review + approve/decline in the drafts panel.';
    } else {
      subject = 'CNP drafts: ' + totalHeld + ' ready for review';
      body = totalHeld + ' draft(s) held for review across the network.\n\n'
        + 'By game:\n' + perGame + '\n\n'
        + hbLine + ' Pipeline healthy.\n'
        + runLine + '\n\n'
        + 'Review + approve/decline in the drafts panel.';
    }

    var res = await sendOpsAlert({ subject: subject, body: body });
    console.log('[ops-digest] sent: held=' + totalHeld + ' stale=' + stale + ' age=' + ageStr
      + ' email=' + (res && res.emailSent) + ' discord=' + (res && res.discordSent));
    return { sent: !!(res && (res.emailSent || res.discordSent)), totalHeld: totalHeld, stale: stale };
  } catch (err) {
    console.log('[ops-digest] emitDraftsDigest failed (non-fatal): ' + (err && err.message));
    return { sent: false, totalHeld: null, stale: null };
  }
}
