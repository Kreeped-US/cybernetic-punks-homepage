# GSC → Editors: Feeding Search Data Into Generation (v8 — CANONICAL)

**Status:** BUILD DOCUMENT — canonical. Direct amendment of v7 in the canonical
lineage (NOT a regeneration from another draft). Supersedes v7 and both v6s.

**v7 → v8 delta: execution amendments only (E1–E3 + build step 0). Design
review remains CLOSED — nothing here reopens C1–C4 or any settled decision.**

**This file goes to Claude Code directly and lives at `docs/` in the repo
(step 0). The planning chat reviews it as a READER — it does not regenerate
it.** Provenance note, recorded so the failure mode cannot recur unnamed:
versions 3–6 were each regenerated from the planning chat's own previous
draft, so external corrections survived only if consciously transcribed; four
confirmed corrections were dropped three times this way, and one ("no doctrine
position exists") was laundered into a review ledger as a settled finding. The
base of this document is the external reviewer's v6; the planning chat's v6
contributed two improvements, credited below. **Operator confirmed all four
corrections on 2026-07-24.**

**Scope: the stamping trigger + pairing CHECK, then Consumer B.** Everything
else is recorded so it is not re-derived, not because it is being built.

**Multi-game requirement (operator-stated):** this feature must work for every
game the network pulls in — Marathon and DMZ today, others later. §"Multi-game
readiness" records how each piece travels.

---

## THE SHORT VERSION

| capability | status | reason |
|---|---|---|
| **Commit THIS file to `docs/`** | **STEP 0** | a canonical doc that exists only in chat sandboxes is the untracked-decision failure that forked v6 |
| **Stamping trigger + CHECK (gap a)** | **BUILD FIRST** | Consumer B's noindex join is **inverted** for unstamped rows — it blocks |
| **Consumer B — query-level GSC** | **BUILD SECOND** | First-party demand loop; feeds the keyword store and the entity-page review surface |
| Ownership awareness (link-toward only) | REDUCED, DEFERRED | Fires only when editors run; Marathon is entering maintenance mode |
| Performance learning | **CUT** | "Shape not topic" does not hold; Dexter's rubric loop already provides safe craft feedback |

---

## CORRECTIONS LEDGER (operator-confirmed; not re-openable without new evidence)

Carried from v1–v4, unchanged:

- **Self-reference trap.** *Don't-cannibalize* is dropped from prompts
  permanently — the exact-tuple form is already structurally enforced by the
  dedup guard and coverage registry; a prompt instruction is redundant at the
  narrow level and self-starving at any broader one. *Link-toward* survives.
- **Capability C cut.** `shell/*/build` is a topic class in shape's clothing.
  Dexter's rubric loop is content-derived and safe; performance judgments live
  in the operator's decision layer (fix/reinforce lines, page level). Anyone
  revisiting carries the burden of showing why a parallel path is safer.
- **The freeze is the sequencing fact.** Ownership awareness fires at DMZ
  launch. Consumer B touches no prompts, which is why it is buildable today.
- **Gap (a) blocks.** The `noindexed_at IS NULL` join reads unstamped cohorts
  as un-pruned — inverted, silent, wrong in the dangerous direction. The 153
  are stamped only by manual backfill. The trigger lands first.

The four dispositions, confirmed 2026-07-24:

### C1. Lane 2's premise was impossible to observe

**GSC Search Analytics only returns queries where this site's URLs appeared in
results** — impressions imply appearance. "Queries with demand and NO page at
all" produce zero GSC rows under any dimension set. True page-gap discovery is
structurally invisible to GSC and **already has an owner**: the Mangools-fed,
entity-less `keyword_targets` rows (keyword-system FINDING 1).

What GSC *can* show is **"we appear, but weakly"** — queries whose best
position is beyond a threshold. That is **derivable from lane 1's `page+query`
rows by aggregation**. Lane 2 is therefore a **VIEW over lane 1**, not a second
dimension pull. No query-only rows exist.

**Accepted cost, recorded:** GSC's privacy filtering drops more rows as
dimensions are added, so a `query`-alone pull would recover some anonymized
long-tail that `page+query` loses. Accepted at current volume; revisit only if
the post-DMZ re-measure shows the recovered tail would materially change the
list. If ever built, it is a separate, honestly-named "anonymization recovery"
pull — never "page-gap."

### C2. The COALESCE index would have broken the upsert

`UNIQUE (date, COALESCE(page_url,''), query)` is an **expression index**.
PostgREST's `on_conflict` — what supabase-js `.upsert()` emits — arbitrates
against a **column-list** unique constraint and cannot infer an expression
index. The trailing-window re-fetch would have failed on first run with
*"no unique or exclusion constraint matching the ON CONFLICT specification."*

With C1 adopted, the problem dissolves: one row shape, `page_url` **NOT NULL**,
plain `UNIQUE (date, page_url, query)`. (For the record: had query-only rows
survived, the working options were `UNIQUE NULLS NOT DISTINCT` on Postgres 15+
or an explicit `''` written by the app — never the expression index.)

### C3. The doctrine DOES have a first-party position

**Doctrine v3's measurement cadence: GSC realized results feed back to
recalibrate Gate 1 demand estimates.** Consumer B is that clause's first
mechanism. Its two operational consequences, both load-bearing here:

1. **The ~100–200/mo volume floor is a Mangools-projection rule and does NOT
   apply to GSC candidates.** A query already sending this site impressions
   has proven relevance at any measured volume. The review list's threshold is
   denominated in **first-party impressions** (starting value: ≥10 over the
   trailing 90 days; a named constant, tunable).
2. **Recurring first-party query shapes that no Layer A template anticipated
   feed back into the template library.** The review workflow should note
   shape-novelty when it appears.

The prior "no doctrine position exists" ledger entry is **retracted**.

### C4. The prefix rule was a silently-wrong two-game literal

`url.startsWith('/dmz/') ? 'dmz' : 'marathon'` makes Marathon the **else
branch** — game three's URLs would be silently attributed to Marathon: the
SILENTLY WRONG degradation mode the multi-game audit exists to hunt.

**The fix:** `gameSlugForUrl(url)` resolves against a **route-prefix lookup**
(a named constant map today — `/dmz/` → `dmz`, Marathon's paths enumerated
explicitly; the games registry the multi-game audit specs is its eventual
home). **An unknown prefix returns null and logs loudly, with the pull flagged
in `gsc_pull_log` — never attributed to a default game.** Same principle as
`game_slug` carrying no column default, applied to the function that computes
it.

Credited from the planning chat's v6, adopted:

- **One trigger function, `BEFORE INSERT OR UPDATE`, branching on `TG_OP`** —
  the four cases are one invariant; two triggers would be two functions that
  must agree.
- **Rejection-memory lives in `keyword_targets`, not a new table** (see
  Part 2) — a declined candidate is a studied-and-declined keyword, which the
  table already models. Supersedes the reviewer v6's anti-join-only approach;
  the anti-join survives inside it as the list's exclusion rule.

Execution amendments, v8 (2026-07-24 morning; review NOT reopened):

### E1. Row-magnitude gets a threshold, not just a measurement

v7 said "measure on first run." v8 gives the measurement teeth: **step 4's
verification reports rows per pull, and flags for cadence review if the number
exceeds ~100k rows/pull OR pull duration threatens the cron's function
budget.** Below both, daily cadence stands without discussion. (Context:
`gsc_page_metrics` holds 8,215 rows for five months; query-level could be an
order of magnitude higher.)

### E2. The lane label in the UI must say "weak-position"

C1 renamed the lane in the design; E2 pins it in the product: **the review
list's lane column reads `weak-position`, never `page-gap`.** A reader seeing
"page-gap" would expect unserved demand, which this lane structurally cannot
show — unserved demand is the Mangools entity-less `keyword_targets` feed. If
the review surface ever shows both feeds side by side, the labels are what
keep them honest.

### E3. Step 0 — the file itself must be committed before any build step

The canonical document existed only in two chat sandboxes. Per the standing
convention — decisions that live only in a chat don't exist — **committing
this file to `docs/` is build step 0, before any DDL.** This is the same
untracked-document failure that has bitten three times this week; the
regeneration problem was solved by declaring one canonical file, and a
canonical file outside the repo is only half a solution.

---

## PART 1 — THE STAMPING TRIGGER + PAIRING CHECK (build first)

Database-level enforcement of the `noindex` / `noindexed_at` pairing, so it
holds for every writer — app, cron, scripts, and raw SQL alike.

**Why a trigger rather than per-caller code:** seven write sites, no shared
chokepoint, and bulk SQL bypasses the application entirely. Server-side
enforcement in the admin route was investigated and **rejected** — `feed_items`
is not in `ALLOWED_TABLES`, so that path 400s before any write; enforcement
there would be unreachable code advertising coverage that does not exist.

### Shape: ONE trigger, `BEFORE INSERT OR UPDATE`, branching on `TG_OP`

| op | condition | action |
|---|---|---|
| UPDATE | `noindex` → TRUE | stamp `now()` **if not already set** — a re-prune must not move an existing cohort date |
| UPDATE | `noindex` → FALSE | clear to `null` |
| UPDATE | `noindex` untouched | **leave the stamp alone** — transition detection, not state assertion. A headline edit on a pruned row must not reset its date |
| INSERT | any | enforce the pairing **at birth, both directions**: `noindex=true` with no stamp → stamp; `noindex=false` with a stamp → clear |

**The INSERT case is not optional** — a row born contradictory is invisible to
every UPDATE-only guard, and `drafts/approve` inserts published rows.

### The declarative belt: a pairing CHECK

```sql
ALTER TABLE feed_items ADD CONSTRAINT feed_items_noindex_pairing_chk
  CHECK ((noindex AND noindexed_at IS NOT NULL)
      OR (NOT noindex AND noindexed_at IS NULL));
```

**The trigger MAINTAINS the pairing; the CHECK makes the broken state
UNREPRESENTABLE** — including against the one edge the trigger cannot see: a
manual null of `noindexed_at` on a still-pruned row. The 153 are stamped, so
the constraint adds clean. Trigger maintains, CHECK enforces.

### Verification

1. All four trigger cases, exercised individually, including **both INSERT
   shapes**.
2. The CHECK rejects both contradictory states directly (attempted with the
   trigger disabled in a transaction, rolled back).
3. Pre-add assertion: zero existing rows violate the CHECK.
4. A headline-only UPDATE on a pruned row leaves `noindexed_at` byte-identical.

---

## PART 2 — CONSUMER B (build second)

Pull `page+query` from GSC: **first-party demand** — what people actually search
to reach this site — rather than KWFinder's third-party estimates.

**It feeds the keyword store and the review surface, not the editor.** A human
decides which candidates become targets. The lens-not-gate architecture applies
unchanged: keywords reframe headlines, never bodies. **Nothing here enters a
prompt.**

### Two lanes, ONE dimension set, ONE pull, ONE row shape

**LANE 1 — FRAMING CANDIDATES** (rows where the page ranks at position 11–30)

- **Position 11–30 IS the difficulty filter.** A page ranking there has already
  demonstrated the site can compete — a stronger signal than a modeled KD
  score. The doctrine's ~30–35 KD ceiling is **satisfied by construction**.
- **EXCLUDE NOINDEXED PAGES** via `feed_items.noindexed_at IS NULL`. Depends on
  Part 1.

**LANE 2 — WEAK-POSITION** (per C1; a VIEW over lane 1's rows; labeled
`weak-position` in the UI per E2)

- `GROUP BY query` with `MIN(position) > 30` (threshold a named constant):
  queries where the site appears but nothing qualifies. These are
  **entity-page candidates**, joining the Mangools-fed entity-less
  `keyword_targets` rows as **two feeds into the same review surface** — GSC
  shows where we already surface weakly; Mangools shows demand we never touch.
  Neither replaces the other.
- **No difficulty data available** for these — the KD check is a **manual
  KWFinder step noted on the review list**, correctly so.

### Storage — `gsc_query_metrics`

- One row shape: `date, page_url NOT NULL, query, clicks, impressions, ctr,
  position, game_slug, fetched_at`.
- `game_slug` **NOT NULL, no default**, computed at write time via
  `gameSlugForUrl()` (C4) — lookup, loud on unknown, never a default game.
- **`UNIQUE (date, page_url, query)`** — a plain column-list constraint the
  PostgREST upsert can arbiter (C2).
- RLS enabled, no policies.
- Trailing-window upsert and one `gsc_pull_log` row per run, same as
  `gsc_page_metrics`.

### Cadence

**Same daily pull, no separate schedule.** Step 4 reports measured rows per
pull; **cadence is revisited only if the E1 thresholds trip** (~100k rows/pull
or function-budget pressure). Otherwise daily stands.

### Output — ONE ranked review list (live view, per-game, a WORKFLOW)

The lanes differ in what they **produce** (framing target vs page target), not
in how they are **worked** — the operator's question is identical: is this
worth pursuing.

- **Live-computed view, no persisted list state.** Always current, nothing to
  drift.
- Columns: lane/type (`framing` / `weak-position` — per E2, never `page-gap`),
  `game_slug` (the operator reviews per game), query, best page + position
  (lane 1), impressions, clicks.
- **Threshold: first-party impressions ≥ the named constant (C3), never
  external volume.**
- **Rank by impressions, then position. Display default 25; the full set stays
  ranked and reachable** — a hard cap that hides a candidate is data loss.
- **Reviewing a candidate produces a `keyword_targets` row either way**:
  - **Accepted** → a normal target row.
  - **Declined** → `is_active = false` plus `notes` recording why.
  A declined candidate is a studied-and-declined keyword, which the table
  already models. `is_active = false` keeps declined rows out of the matcher
  by its existing eligibility rule and out of the heartbeat's `stale=N` count.
- **The list excludes any candidate already present in `keyword_targets`
  (accepted or declined), matched on keyword text, game-scoped.** Self-
  clearing; one store recording all judgments; no second table to drift.
- **Never automatic.** Automatic seeding of `keyword_targets` would let GSC
  data become an editorial trigger by the back door.

---

## PART 3 — DOCUMENT THE CONSUMERS (required, not optional)

**A table whose readers are unknown cannot be safely changed.** Record in
**both** places — different jobs, neither substitutes:

- **TABLE COMMENTS** — the durable contract; what someone reads when altering
  the table.
- **HANDOFF** — the narrative; what a session reads first.

### `gsc_query_metrics`

- **WHO READS IT:** the ranked review list (both lanes; lane 2 is a view over
  these rows). Nothing else.
- **WHAT MUST NEVER READ IT:** editor generation context. **Reason:** automatic
  seeding or prompt injection would let GSC data become an editorial trigger by
  the back door — the lens-not-gate boundary the keyword architecture rests on.
- **JOIN DEPENDENCY:** the framing lane depends on `feed_items.noindexed_at`
  being maintained. **Name the Part 1 trigger + CHECK as its guarantors**, so a
  future reader knows why they exist and what breaks if removed.

### `gsc_page_metrics` — same treatment, while in the file

Existing undocumented consumers: the /intel prune analysis; the
impressions-rise test (153-page cohort, ~2026-08-20); the deferred
kill/fix/reinforce decision lines; the backfill baseline (data begins
2026-03-05).

---

## DOCTRINE POSITION (per C3)

The doctrine's position on first-party query data is the **Gate 1
recalibration clause**: realized GSC results feed back to recalibrate demand
estimates. Consumer B is that clause's first mechanism. Its two operational
consequences — the first-party impressions threshold (no Mangools volume floor
on GSC candidates) and query-shape feedback into the Layer A template library —
are folded into Part 2's list spec and the review workflow respectively.

---

## MULTI-GAME READINESS (operator requirement: every game, not just these two)

| piece | how it travels |
|---|---|
| `game_slug` on every row | computed by `gameSlugForUrl()` lookup — **unknown prefix fails loudly, never defaults** (C4); the lookup's eventual home is the games registry from the multi-game audit |
| Position-11–30 winnability | domain-level by nature — authority is shared across the network, so the logic needs no per-game fork (same reason the KD ceiling is network-level) |
| The review list | carries `game_slug`; the operator filters per game; thresholds are named constants, network-level unless the doctrine says otherwise |
| Rejection-memory | `keyword_targets` is already game-scoped (`game_slug` NOT NULL, no default) — declined rows inherit it |
| The noindex trigger + CHECK | table-level on `feed_items`, which is already game-attributed — nothing to fork |
| Onboarding game three | add its route prefix to the lookup (or registry row); zero schema change, zero code change elsewhere. Until its URLs exist, its rows simply don't — the safe default |
| Ownership awareness (deferred) | already specified game-scoped via `game_slug` filter |

---

## RISKS

- **Row magnitude unknown** — bounded by E1: measured at step 4, cadence
  revisited only past ~100k rows/pull or function-budget pressure.
- **The noindex join is load-bearing** and depends on Part 1 shipping first.
- **The anonymization undercount (C1)** means the weak-position lane sees less
  long-tail than exists. Accepted; Mangools covers the invisible remainder.
- **Trigger drift is gradual.** Worth a periodic re-read of published output
  asking: is this still led by verified intel, or has it started chasing what
  performs?

---

## BUILD ORDER

0. **Commit THIS file to `docs/`** (E3) — before any DDL. The canonical
   document enters the repo; chat copies become references, not sources.
1. **Stamping trigger + pairing CHECK DDL** (operator-run — no git trail,
   record per HANDOFF rule 2). Verify all four cases, both INSERT shapes, the
   CHECK's two rejections, and the zero-violations pre-add assertion.
2. **`gsc_query_metrics` DDL** (operator-run, same): plain unique constraint,
   RLS, table comment.
3. **`gameSlugForUrl()`** — lookup with loud unknown-prefix failure; unit-cased
   for Marathon paths, `/dmz/`, and an unknown prefix.
4. **The pull**, wired into the existing daily path; `gsc_pull_log` row per
   run. **Report rows/pull and pull duration against the E1 thresholds.**
5. **The lane 2 view + the one ranked review list** (live, per-game, threshold
   constant, `keyword_targets` exclusion, display default 25, lane labels per
   E2).
6. **Consumer documentation** on both tables, in both places.

---

## DEFERRED, WITH OWNERS (so nothing silently disappears again)

- **Ownership awareness (link-toward only)** — DMZ launch. Game-scoped digest,
  top ~20 positions, token cost reported, degrade visibly.
- **Demand-led canonical generation** — the consumer of these review lists and
  the operator's stated traction goal (doctrine Gate 5: generation into
  demand-validated canonical slots). **Needs its own design document before DMZ
  launch.** This plan produces the lists; that one produces the pages.
- **Anonymization-recovery pull** — only if the post-DMZ re-measure shows the
  invisible tail matters; honestly named if built (C1).

---

## REVIEW STATUS — CLOSED, CANONICALLY

Five review passes, one merge, one execution amendment (v8: E1–E3). The four
dispositions (C1–C4) are operator-confirmed; the two planning-chat improvements
are adopted and credited; the CHECK constraint and the demand-led-generation
deferral stand. **This file is the single canonical document, committed at
step 0. Future changes are edits to THIS file with their reasoning appended to
the ledger — never a regeneration from another draft.**
