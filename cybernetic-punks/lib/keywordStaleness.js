// lib/keywordStaleness.js
// ============================================================
// THE STALENESS THRESHOLD -- one literal, every reader imports it.
// ============================================================
// Commit (f) of the keyword-framing build. See docs/KEYWORD_SYSTEM_CONSOLIDATED.md
// §4.5 and §10.1.
//
// WHY ITS OWN MODULE, OWNED BY NEITHER CONSUMER.
// Two things need this threshold and they live on opposite sides of the runtime:
//   - the heartbeat (lib/keywordHeartbeat.js), server-side, in the cron;
//   - the `stale only` filter (§4.5 Option 1, commit (g)), inside
//     app/admin/page.js, which is a 'use client' component.
// If either DEFINED it, the other would either import across that boundary or
// duplicate the number. A duplicated threshold drifts silently and mislabels rows
// in one surface but not the other -- and nothing would fail, which is the worst
// shape of wrong.
//
// THIS MODULE IMPORTS NOTHING. That is deliberate and load-bearing: it must be
// safe to pull into a CLIENT bundle. It must NOT be merged into
// lib/keywordFraming.js, which imports @anthropic-ai/sdk -- doing so would drag the
// SDK into the browser, the exact defect commit (b2) removed.

// 90 days ~= one season / patch cycle. Keyword research that predates the current
// meta state should be re-pulled before it drives a match-priority decision, since
// volume and difficulty shift as the meta does. Changing this is a one-line edit
// HERE and both readers follow; it is wrong consistently or not at all, which is
// the property this module exists to guarantee.
export const KEYWORD_STALE_DAYS = 90;

// The cutoff DATE (YYYY-MM-DD), for comparison against keyword_targets.studied_at,
// which is a `date` column and not a timestamp. Returned as a plain string so both
// a PostgREST .lt() filter and a client-side row.studied_at < cutoff comparison use
// the SAME value with no timezone reinterpretation in between.
export function staleCutoff(now) {
  var base = now instanceof Date ? now : new Date(now || Date.now());
  var d = new Date(base.getTime() - KEYWORD_STALE_DAYS * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

// A row is stale when its research predates the cutoff. A row with NO studied_at is
// NOT stale: studied_at is NOT NULL in the schema, so a missing value means a row
// that did not come through the entry form, and guessing about it would be worse
// than declining to. Kept explicit rather than falling out of a string comparison.
export function isStale(studiedAt, now) {
  if (!studiedAt) return false;
  return String(studiedAt).slice(0, 10) < staleCutoff(now);
}
