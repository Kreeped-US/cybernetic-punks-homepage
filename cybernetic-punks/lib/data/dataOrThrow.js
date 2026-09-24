// lib/data/dataOrThrow.js
// The error-vs-empty split for Supabase reads (Finding-1 class), shared across every game.
//
// A Supabase read RESOLVES to { data, error } (or { count, error } for a head/count query) -- it does
// NOT throw on a DB/PostgREST error. The old pattern `return res.data || []` collapses a genuine READ
// ERROR (error set, data null) into the SAME empty result as a legitimately empty table, so a transient
// DB failure silently 404s the page, drops it from the sitemap, or serves an empty-but-indexable 200 --
// indistinguishable from "no data yet". These helpers split on the ERROR OBJECT, never on row count:
// a real error THROWS (there is NO error.js boundary anywhere in app/, so a thrown Server-Component
// error becomes Next's default HTTP 500 -- the correct, crawler-retryable signal), while a legitimate
// empty (no error) returns the fallback / 0 so the pre-existing notFound / empty-state / noindex
// behavior on genuinely-zero rows is UNCHANGED.
//
// `label` is caller-supplied (no game prefix) so the thrown message names the exact read.

// dataOrThrow(res, label, fallback) -> res.data (on success) | fallback (genuine empty) ; THROWS on error.
export function dataOrThrow(res, label, fallback) {
  if (res && res.error) throw new Error(label + ' read failed: ' + res.error.message);
  return (res && res.data) || fallback;
}

// countOrThrow(res, label) -> res.count (a { count, head:true } read) | 0 (genuine empty) ; THROWS on error.
// Separate from dataOrThrow because a head/count query returns res.count, not res.data.
export function countOrThrow(res, label) {
  if (res && res.error) throw new Error(label + ' count failed: ' + res.error.message);
  return (res && res.count) ?? 0;
}
