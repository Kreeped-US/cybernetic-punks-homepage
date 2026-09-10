// lib/corrections/registry.js
// ============================================================
// CORRECTION REGISTRY -- the sweepable record of ratified corrections.
// ============================================================
// WHY THIS EXISTS (2026-09-08). A ratified correction fixes the DATA (a
// free-text note in verified_source, e.g. shell_stats Rook: "CORRECTED
// 2026-07-20 ... Rook cannot be selected in ranked of any kind"), but nothing
// swept the already-PUBLISHED CONTENT that had duplicated the old claim into
// prose. One un-swept correction left 14 false Rook-in-ranked articles live for
// months; remediating them took 7 manual query passes. This registry is what
// makes a free-text correction SWEEPABLE: the operator records the entity +
// game-appropriate keywords ONCE at correction time, and scripts/correction-sweep.mjs
// then surfaces every published article that co-occurs entity+topic in one run.
//
// This is a config module, NOT a table -- version-controlled, reviewable in a
// gated diff, no DDL, importable by the sweep now and the publish-guard later.
//
// ENTRY SHAPE:
//   id             string  -- stable slug for this correction (used by --id and the --json artifact name)
//   game_slug      string  -- the game whose published content to sweep; the sweep scopes to THIS value
//                             (never hardcoded), so a wardogs/bodycam correction sweeps wardogs/bodycam.
//   entity         string  -- the subject of the correction (e.g. "Rook"). Matched as body ILIKE %entity%.
//   topic_keywords string[]-- the now-false topic the entity must NOT be associated with. OPERATOR-AUTHORED
//                             at correction time with vocabulary appropriate to THAT game -- no terms are
//                             hardcoded in the sweep. A candidate is any published row where the body
//                             co-occurs the entity AND at least one keyword.
//   correction     string  -- the ratified statement, for the report header (what is now false).
//   source         string  -- where the correction is recorded (provenance for the registry entry itself).
//   date           string  -- ISO date the correction was ratified.
//   extra_columns  array   -- OPT-IN extra free-text surfaces to scan beyond feed_items.body, as
//                             [{ table, column }] (e.g. meta_tiers.note, shell_stats.holotag_tier_recommendation).
//                             Empty by default; name a column only when a stale claim could live in its prose.
//
// PRECISION NOTE (read this): the sweep is HIGH-RECALL, LOW-PRECISION by design.
// entity+keyword co-occurrence flags CANDIDATES for HUMAN REVIEW -- it is a review
// queue, NOT a removal list. Legitimate mentions and disclaimers ("Rook is not a
// ranked pick", "A-tier for learning fundamentals") WILL appear and are correct to
// appear. The operator adjudicates each at the sentence level: assert-vs-mention.
// NEVER auto-remove from a sweep hit.

export const CORRECTIONS = [
  {
    id: 'rook-not-ranked',
    game_slug: 'marathon',
    entity: 'Rook',
    topic_keywords: ['ranked', 'holotag', 'tier', 'climb', 'solo queue', 'elo', 'competitive', 'ascend'],
    correction: 'Rook cannot be selected in ranked of any kind (owner-verified 2026-07-20).',
    source: 'shell_stats Rook verified_source',
    date: '2026-07-20',
    extra_columns: [], // opt-in, e.g. [{ table: 'meta_tiers', column: 'note' }, { table: 'shell_stats', column: 'holotag_tier_recommendation' }]
  },
  {
    id: 'wardogs-s1-economy-supersedes-beta',
    game_slug: 'wardogs',
    entity: 'economy',
    // KEYWORD TUNING: the sweep is high-recall / low-precision, so keywords aim to CATCH any economy
    // article that cites a NOW-SUPERSEDED beta figure; the operator adjudicates each candidate. Mix of
    // (a) SMOKING-GUN old values -- an article containing "2,500" / "2500" (old FOB) or "838" (old
    // level-50 XP total) is almost certainly quoting a superseded number; and (b) CHANGED-ITEM terms
    // for recall -- FOB / supply crate / air vehicle / the tank career gates / Deagle / vendor -- so an
    // economy piece touching a changed system surfaces even if it paraphrases the number. entity
    // "economy" scopes to the economy articles (all contain the word); a candidate needs economy + a
    // keyword to co-occur (whole-word).
    topic_keywords: ['2,500', '2500', '838', 'FOB', 'supply crate', 'air vehicle', 'Career 55', 'Career 35', 'Deagle', 'vendor'],
    correction: 'Season 1 changelog (2026-09-09) superseded specific beta-observed economy figures: FOB vendor $2,500->$7,500; supply-crate-sell-under-$75 25XP->1XP; air-vehicle-kill 300->250XP; level 10-20 XP ~doubled; level 50 total 838k->1.0M; Artillery Tank Career 55->90; Heavy Tank Career 35->Driver 35; Deagle 90->85. Content citing the OLD beta figures as current is stale -- use the Season 1 official values (see WARDOGS_LAUNCH_REFERENCE.md, "Season 1 changelog" Tier 1).',
    source: 'Wardogs Season 1 changelog, Steam, 2026-09-09',
    date: '2026-09-09',
    extra_columns: [],
  },
];
