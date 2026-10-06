// lib/content/tierSnapshots.js
// Builds the append-only meta_tier_snapshots rows written after each NEXUS tier regrade
// (app/api/cron/route.js, right after the meta_tiers upsert). Pure + node-testable.
//
// WHY THIS EXISTS (2026-10-06): meta_tier_snapshots.tier is NOT NULL, and since 1e23955
// (2026-07-20) a shell with no ranked basis gets tier null in meta_tiers (Rook, Sentinel).
// The cron inserted every regrade row in ONE batch, so a single null row failed the whole
// insert; the error was caught as non-fatal and no snapshot has landed since 2026-07-19.
// Rows without a tier are now SKIPPED (never given a placeholder letter): a snapshot records
// a real grade or nothing. The skipped names are returned so the cron can log them.
//
// Game-agnostic: the game slug and regrade id come from the caller. Today only games with a
// NEXUS tier model (marathon: nexusTierRegrade) reach the caller.

function hasTier(tier) {
  return typeof tier === 'string' && tier.trim() !== '';
}

// metaRows: the rows just upserted into meta_tiers ({ name, type, tier, ... }).
// Returns { rows, skipped } -- rows ready to insert, skipped = names of rows with no tier.
export function buildTierSnapshotRows(metaRows, gameSlug, regradeId) {
  var rows = [];
  var skipped = [];
  (metaRows || []).forEach(function (r) {
    if (!r) return;
    if (!hasTier(r.tier)) {
      skipped.push(r.name);
      return;
    }
    rows.push({ game_slug: gameSlug, entity: r.name, entity_type: r.type, tier: r.tier, regrade_id: regradeId });
  });
  return { rows: rows, skipped: skipped };
}
