# Verification Protocol — how `verified=true` is earned honestly

> The moat's core discipline: the rules for moving stat data to CONFIRMED
> (`verified=true`). The brand is "verified, honest" — so a wrong confirmation is
> worse than an unconfirmed gap. Read this before any confirmation write.
>
> Related: [lib/verification.js](../../lib/verification.js) (the 3-state model),
> [CONTRIBUTOR_PROGRAM.md](CONTRIBUTOR_PROGRAM.md) (the trust model for external
> confirmations), [MARATHON_VERIFICATION_DEBT.md](../MARATHON_VERIFICATION_DEBT.md)
> (the gaps), and the `quality_metrics` measurement layer (which scores
> `confirmed_data_share` and surfaces the backlog).

## The rule
`verified=true` means **a human checked an EXACT MEASURED VALUE against a single,
consistent first-party source.** Nothing else qualifies. `confirmed_data_share`
is trustworthy *because* of the rows held back, not despite them.

## `verified_source` from the START (traceability)
Add the `verified_source` column BEFORE confirming any rows, and write it on
every confirmation. A confirmation must carry its source — **no untraceable
`verified=true` rows.**
- **Anti-example:** `mod_stats` was confirmed without a source path → only
  **17.3%** of its confirmations are traceable (the traceability gap).
- This session, `shell_stat_values` needed the column added pre-write for exactly
  this reason. Don't repeat the mod_stats gap.

## The protocol (when moving data to `verified=true`)

1. **Uniformity test for placeholder data.** Don't just test null/zero — test for
   UNIFORMITY. Byte-identical values across all entities = seed/placeholder, NOT
   measured data.
   - *This session:* all 7 shells held the identical 13-stat vector → placeholder.
     This corrected an earlier "all 91 real" call that only checked null/zero.

2. **Correct-then-confirm, not rubber-stamp.** If stored data is placeholder, the
   task is data-ENTRY (enter the real values) THEN confirm — never flip the flag
   on fabricated values.

3. **Exact measured values, single consistent source only.** Acceptable:
   in-game stat-screen screenshots (or equivalent first-party measurement).
   **NOT acceptable as confirmation:** relative/qualitative descriptions
   ("Highest", "Top tier", "Lower"), informed estimates, or AI-generated
   lore/descriptions. These *feel* right and are exactly what `verified=true`
   must be immune to.

4. **HOLD on contradictory evidence.** If sources conflict, the stat stays
   UNCHECKED — do not confirm. (The trust model's "disagreement keeps a stat
   unconfirmed" rule, applied to first-party data too.)
   - *This session:* Rook had a Server-Slam all-0 screenshot, then a scavenger
     description, then "reset before allocation", then specific numbers — 3+
     conflicting accounts → correctly left **UNCHECKED** (its 13 rows stay
     `verified=false` until a clean single-source S2 screen exists).

5. **Read values back before writing.** Read each value back (screenshot →
   stated number) before the write — this caught a wrong-tab all-zeros screenshot
   this session.

## Write discipline (correct-then-confirm writes)
- Double-gate: SELECT the before-state (rollback reference) → show the planned
  UPDATE/INSERT → approve → execute → verify (counts + spot-checks).
- DB writes are a different safety category than git: the safety net is the
  captured before-SELECT, not a commit.
- Stamp every confirmed row: `verified=true` + `patch_verified` (the patch/season
  stamp, e.g. `s2`) + `verified_source` (where the value came from).

## Worked example (this session)
`shell_stat_values`: stored data was uniform placeholder (every shell identical) →
**corrected** to owner-verified S2 stat-screen values → **confirmed** (6 shells
UPDATEd, Sentinel 13 INSERTed) with `patch_verified='s2'` + `verified_source`.
**Rook held UNCHECKED** (contradictory evidence). Result: `shell_stat_values`
0/91 → 91/104 confirmed; overall `confirmed_data_share` 52.1% → 64.9%. Honest:
placeholders corrected (not rubber-stamped), every confirmation sourced,
contradictions held back.
