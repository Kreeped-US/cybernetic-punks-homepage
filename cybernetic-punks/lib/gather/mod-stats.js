// lib/gather/mod-stats.js
// NOTE: All external mod sources (Clutchbase, TauCeti, MarathonDB) block
// server-side requests. mod_stats table is manually seeded via SQL.
// This file is kept as a no-op to avoid import errors if referenced elsewhere.

export async function gatherModStats() {
  console.log('[mod-stats] Skipping — table manually seeded, no scrape sources available.');
}
