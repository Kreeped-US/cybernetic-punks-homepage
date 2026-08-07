// lib/dmz/dataOrThrow.js
// The DMZ entity-read error-vs-empty split (Finding-1 class), factored out of lib/dmz/entities.js
// so it is unit-testable without importing the supabase singleton (the entity module imports the
// lazy client; a pure helper does not, mirroring how storeLoader/corroboration stay test-isolated).
//
// A Supabase read returns { data, error }. The OLD entity helpers did `return res.data || []`, which
// collapses a genuine READ ERROR (error set, data null) into the SAME empty result as a legitimately
// empty table -- so a transient DB failure silently 404s the page (or drops it from the sitemap),
// looking exactly like "no data yet". THIS splits on the ERROR OBJECT, never on row count: a real
// error THROWS (loud 500 / logged sitemap-degrade); a legitimate empty (no error, no rows) returns
// the fallback ([]/null) so the pre-launch sparse tables still render notFound/empty as before.
export function dataOrThrow(res, label, fallback) {
  if (res && res.error) throw new Error('[dmz] ' + label + ' read failed: ' + res.error.message);
  return (res && res.data) || fallback;
}
