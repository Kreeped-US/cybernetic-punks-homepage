# Keyword System — Consolidated Design & Build

**Status:** ✅ BUILT & SHIPPED to `main` (2026-07-22). This is the source of truth.
**Date:** 2026-07-22
**Supersedes:** `docs/KEYWORD_FRAMING_DESIGN.md` and `docs/KEYWORD_FRAMING_BUILD.md`
(both earlier drafts, now carrying SUPERSEDED banners).
This document is **self-contained** — a reader needs only this one.

> ### Shipped state — read this before the body
> The commit chain: **(a)** `5c221e7` · **(b)** `e60cabd` · **(d1)** `623a8a5` ·
> **(d2)** `c48f4b4` · **(b2)** `78639b9` · **(e)** `d087e62` · **(f)** `dd6f8ec` ·
> stale-days `2df49b9`.
>
> Where the body and the shipped code differ, **the code wins** and the divergence is
> flagged inline with a dated `CORRECTED` note. The four that matter:
> - **Option 4** — the matcher classifies the ORIGINAL *generated* headline (not the
>   source title), freezes the tuple, and does **NOT** re-classify. The
>   re-classification guard this doc's §6.5 originally described was **removed**;
>   `rejected_reclassify` is a permanently unreachable outcome (§5.2).
> - **Length gate = `≤ 65`**, equal to the `HEADLINE_RULES` ceiling — never 60. A gate
>   stricter than the prompt would reject a headline that obeyed its instruction (§6.5).
> - **Hook in `processEditor`** (`app/api/cron/route.js:512`), not `gatherAll`;
>   `gatherAll` does no classification and is untouched.
> - **`KEYWORD_STALE_DAYS = 90`**, one literal in `lib/keywordStaleness.js`, read by
>   both the heartbeat and (g) via `staleCutoff` (§4.5, §10.1).
>
> **Live in code, INERT in effect** (empty `keyword_targets` → every article logs
> `no_match_no_term`, zero rewrite-model calls), **OBSERVABLE** via the (f) heartbeat.
> **Seeding is the operator's next act** and is gated on (f) having landed.

---

## 0. CONFLICTS WITH THE PRIOR DOCS — flagged, not silently resolved

The two prior docs were written **before** the KWFinder data investigation and the
entry-mechanism survey. Five things changed. **None is resolved here by fiat; each is
presented with its options and a recommendation.**

### ⚠️ FINDING 1 — the load-bearing one: NOT NULL vs entity-less keywords

**Prior design (§9.7, and the schema table) made `entity_type`, `entity_slug` and
`facet` NOT NULL**, with the stated reasoning: *"a row that cannot match is research,
and research lives in the Mangools CSVs. This table holds only actionable targets."*

**Part 3 of this document requires the opposite.** Entity-less keywords ("player
count", "lfg", "updates") are **page-gap candidates** and must live in the same store —
that is the entire mechanism by which one ingest feeds two consumers.

> **These cannot both be true. NOT NULL on the matching columns makes the page-gap
> consumer impossible.**

**Options:**

| | approach | cost |
|---|---|---|
| **A** *(recommended)* | All three **nullable**; the matcher's `WHERE` already requires non-null on all three, so the framing guarantee is unchanged. Add a `CHECK` forbidding the incoherent state `entity_slug NOT NULL AND entity_type IS NULL`. | the "only actionable targets" property is lost — the table now holds both kinds |
| **B** | Two tables — `keyword_targets` (NOT NULL) and `keyword_research` (nullable) | duplicate ingest, and the operator must decide the destination at entry time, before tagging tells them which it is |
| **C** | One table + a `kind` discriminator (`framing` / `page_gap`) NOT NULL | explicit, but the discriminator is derivable from whether the columns are populated — a stored fact that can drift from the columns it describes |

**Recommendation: A.** The framing correctness guarantee lives in the matcher's query
(§6.2), not in the column constraints, so nullable columns cost nothing there. **B and
C both ask the operator to classify before tagging, which inverts Part 3's sorting
property.** The prior doc's reasoning was sound *for a single-consumer store*; it does
not survive the second consumer.

### FINDING 2 — `volume` is now two columns

Prior design had a single `volume`. Part 2 requires **`volume` (12-month, operative)**
and **`last_known_volume`** stored separately. **Schema change, folded into Part 5.**

### FINDING 3 — the `outcome` closed set grows from 6 to 7

`rejected_rules` is added, **distinct from `rewrite_failed`**. The prior doc's §1.1
CHECK listed six values. **Widening a closed set is exactly the thing that doc warned
must not be done casually** — flagged so the reviewer approves it explicitly. The
justification: a rewrite that returns a *valid but over-long* headline is a different
fact from one that errors, and collapsing them would hide a systematic prompt problem
as transient failure noise.

### FINDING 4 — commit letters shift

Prior build doc: (a) delete, (b) rules, (c)/(c2) DDL, **(d) matcher**, **(e)
observability**. This document inserts **entry** as (d), pushing matcher to **(e)** and
observability to **(f)**, and adds **(b2)**. **A reviewer holding the old doc will find
the same letters naming different work.** Part 8 is authoritative.

### FINDING 5 — the prior build doc's open finding is now decided

Build doc §0 flagged the `"Marathon"` literal inside `HEADLINE_RULES` and deferred the
choice. **Decided:** extract verbatim in **(b)** (preserving the byte-identical no-op
proof), then parameterise by `config.displayName` in **(b2)** as a specified follow-up.

### ⚠️ FINDING 6 — `intent` reversed from NOT NULL to nullable

**Prior build doc: `intent` NOT NULL with a CHECK-enforced closed set.** §5.1 of this
document makes it **nullable**.

**The reason is legitimate** — §2.4 decides we map KWFinder's taxonomy to ours rather
than trusting it, and **the mapping itself is unresolved until a full export is seen**
(§10.2). A NOT NULL column with no defined mapping would block every insert.

**But by this document's own conflict-flagging standard that is a named reversal, not a
schema comment.**

> ### THE END STATE IS NOT NULL.
> **Nullable is a TEMPORARY ACCOMMODATION, not the new design.** Once the mapping lands
> (§10.2): **backfill existing rows, then `ALTER TABLE … ALTER COLUMN intent SET NOT
> NULL`.** Recorded here so the temporary state cannot quietly become permanent — which
> is precisely how `hasVerifiedSource` drifted for months.

### FINDING 6b — the page-gap input definition was wrong in the first pass

**Caught in review, fixed in this revision.** §3.3 promised bare-entity rows (entity
resolves, facet NULL) to the page-gap consumer and called them *"the strongest page-gap
signal there is."* But Part 7 defined page-gap's input as **`entity_type IS NULL`**, and
`keyword_targets_pagegap_idx` used that same predicate.

> **Those rows have `entity_type` POPULATED. They satisfied the matcher's requirement
> (no — facet was null) and they satisfied page-gap's predicate (no — entity_type was
> not null). They were invisible to BOTH consumers.**

**Fixed in four places consistently: §3.2, §3.3, Part 7, and the §5.1 index predicate.**
The definition is now *"any row the matcher cannot use"* — phrased as the **inverse of
the matcher's requirement** rather than as a shape list, so the two cannot drift apart
again. **§3.2 states the partition property this creates.**

---

# PART 1 — PRINCIPLE AND SCOPE

## 1.1 Keyword as LENS, not gate

> The editorial trigger stays **"we have verified intel worth publishing."** When a
> finished piece maps to a term we have studied, we frame its **headline** toward that
> phrasing. **Keywords never decide what gets written — only how already-warranted
> content is presented.**

**The boundary is STRUCTURAL, not advisory.** The body is generated first, from
verified data, with **no keyword present anywhere in that context**. A second pass
rewrites only the headline. **The keyword cannot reach body prose because the body
already exists when the keyword first appears.**

This is the lesson of the verification arc closed on 2026-07-21: a discipline that is
merely written down is not enforced. `lib/verification.js` documented *"enforced by
later phases, NOT here"* for months while no phase enforced it. **This design does not
repeat that** — the prose rule is backed by an architecture in which breaking it is not
possible.

## 1.2 Reconciliation with the Operating Doctrine

Two documents say things that sound contradictory:

- **Canonical / reference pages are DEMAND-GATED** (Operating Doctrine).
- **Feed articles are EVENT-TRIGGERED** (coverage design): something happened, we have
  verified intel, we publish.
- **This system touches ONLY the second category, and only its PRESENTATION.**

So *"demand gates what gets written"* and *"keywords never decide what gets written"*
are statements about **different artifacts**. Nothing in the framing consumer creates,
suppresses, or retargets an article.

**The page-gap consumer (Part 7) sits on the doctrine side** — it informs which
*reference pages* to build, which **is** demand-gated. One store, two consumers,
each obeying its own side's rule.

## 1.3 Honesty footnote — the limit of the structural claim

**The structural boundary holds for GENERATION.** But **the rewritten headline enters
the corpus** — stored on `feed_items`, tokenised into `coverage_shadow`'s
`dup_unigram_tokens` / `dup_bigram_tokens` — so future duplicate-detection and coverage
decisions will see keyword-derived phrasing.

> **The precise claim is: "the keyword cannot reach the BODY." That is narrower than
> "the keyword cannot influence the system," and the narrower claim is the true one.**

Named and accepted, in the same discipline as recording that owner attestation is not
captured provenance.

## 1.4 One store, two consumers

| consumer | status | input |
|---|---|---|
| **(1) Headline framing** | fully designed, twice reviewed | keywords **with** an entity+facet tag |
| **(2) Page-gap report** | high-level only (Part 7) | keywords **without** an entity tag |

**The store is consumer-agnostic.** Both hang off the same ingest and the same tagging
step, so **consumer ORDER is deferrable** — shipping framing first costs the page-gap
consumer nothing, and vice versa.

---

# PART 2 — THE DATA REALITY

## 2.1 ⚠️ HARD REQUIREMENT: the research export, not the rank-tracking export

> **Mangools produces two exports that look similar. One is useless for this system.**

| export | carries |
|---|---|
| **KWFinder KEYWORD-RESEARCH view** ✅ | Keyword, four volume windows, CPC, **KD**, interest growth, Content Type, **Search Intent**, 47 months of history |
| **SERPWatcher RANK-TRACKING export** ❌ | **volume, KD and intent all BLANK — confirmed on a real sample** |

**Ingest must be from the research view.** A reviewer should treat "which export?" as
the first question asked of any CSV handed to this system. If bulk import is ever built
(Part 9), **detecting and rejecting the wrong export is a required feature**, not a
nicety.

## 2.2 Confirmed columns

`Keyword`, `Search volume (last known)`, `Search volume (12 months avg)`,
`Search volume (6 months avg)`, `Search volume (3 months avg)`, `CPC`, `KD`,
`Interest growth`, `Content Type`, `Search Intent`, + 47 monthly history columns.

## 2.3 DECISION — store the 12-month average as operative; keep last-known separate

**Reasoning, from the sample:** one row showed **530 last-known vs 360 12-month**, with
an **8,100 spike in August 2025**. Last-known reflects whatever the most recent window
caught — including a transient event — and **overstates steady-state demand**.

> **A single-number `volume` column would silently encode "which number did we happen to
> grab?" That is the bare-integer-is-not-a-measurement failure in a new dataset.**

**Both are stored. `volume` (12mo) is what any consumer reads by default;
`last_known_volume` is available for spike detection and is never the default input.**
The monthly history is **not** stored — 47 columns of per-row history is a warehousing
concern, and nothing in either consumer reads it.

## 2.4 DECISION — KWFinder's Search Intent is ITS taxonomy, not ours

**The ingest MAPS it to our closed enum** (`informational` / `comparison` /
`transactional` / `navigational`) **and flags or rejects anything unmapped. It never
stores the raw string.**

Rationale: an external vendor's vocabulary can change without notice, and an open
`intent` column would accumulate variants — the exact reason `FACETS` is a closed enum.
**The mapping table is ours and is reviewable; the vendor's string is an input, not a
fact.**

*Unresolved: the exact mapping. See Part 10.2 — it needs the real value set from a full
export, not a sample.*

---

# PART 3 — THE ENTITY / FACET TAGGING MODEL

## 3.1 The manual step, and why it cannot be automated

KWFinder gives **keyword + numbers**. It does **not** give *what on our site this
keyword targets.*

> **The operator tags each keyword with an ENTITY (`entity_type` + `entity_slug`) and a
> FACET. This is human judgment.**

**Inferring it in the pipeline is the banned fuzzy-guess.** The matcher is
exact-match-or-nothing (§6.2) precisely because a near-match frames an article toward a
term it does not answer. Auto-tagging would reintroduce that error one layer earlier and
harder to see.

## 3.2 ⭐ The sorting property — why one store feeds two consumers

> **FRAMING candidates: rows where ALL THREE matching columns are populated** —
> `entity_type` AND `entity_slug` AND `facet`. These are exactly the rows the matcher
> can use (§6.2).
> **PAGE-GAP candidates: every other row** — any row where **any** of the three is
> NULL. Feature/meta terms with no entity at all ("player count", "lfg", "updates"),
> **and** bare-entity terms that resolve an entity but no facet ("marathon vandal").

> ### ⚠️ THE PARTITION PROPERTY — state it, and keep it true
> **The two consumers PARTITION the store exactly. Every row is either
> matcher-usable or page-gap input. Never neither, never both.**
>
> The definition is deliberately phrased as **"any row the matcher cannot use"** rather
> than as a list of shapes, because a shape list is what let bare-entity rows fall
> through a gap in the first pass of this document (Part 0, FINDING 6b). **If the
> matcher's requirement ever changes, page-gap's input follows automatically.**

**The tagging step naturally sorts the two consumers' inputs.** The operator does not
decide "is this for framing or page-gap?"; they decide "what does this keyword point
at?", and how completely that resolves routes it. **This is why the store is one table
and not two** (and why FINDING 1 must resolve toward nullable columns).

## 3.3 The hard cases, stated honestly

| case | outcome |
|---|---|
| **Bare entity, no facet** — "marathon vandal" | Entity resolves, facet does not. **Does NOT satisfy the matcher's requirement** (all three columns) → **falls to page-gap under §3.2's "any row the matcher cannot use"**. Arguably the strongest page-gap signal there is: demand for an entity we may have no reference page for. *This row has `entity_type` POPULATED — which is why page-gap's input cannot be defined as `entity_type IS NULL`.* |
| **Lore / faction terms** | May reach `facet = lore`, or may have no entity in `ENTITY_TYPES` at all (factions are not an entity type) → page-gap. |
| **Feature/meta terms** — "player count", "lfg" | No entity by construction → page-gap. |

**None of these is a failure.** A keyword landing in page-gap rather than framing is the
sorting working.

---

# PART 4 — ENTRY MECHANISM

## 4.1 Confirmed by read-only survey

- **No dynamic dropdowns exist.** Every `options:` in the admin editor is a static
  literal array or one of three hardcoded constants. The select renderer consumes
  `field.options` as a plain synchronous array — **no function, async, or state
  support.** The page fetches only its own table's rows.
- **No upload/CSV infrastructure exists anywhere** in `app/` or `components/` — no
  `type="file"`, no `FileReader`, no CSV parser, no multipart.

## 4.2 DECISION — single-row entry via the EXISTING generic admin editor

**Not a new panel. Not CSV bulk import.** Right-sized to current volume, and **~90% of
the form is free.**

**Drops in as a field config, zero new capability:**

| field | type |
|---|---|
| `keyword`, `notes` | `text` / `textarea` |
| `volume`, `last_known_volume`, `difficulty`, `priority` | `number` |
| `intent` | `select`, hardcoded 4 values |
| `facet` | `select`, hardcoded 8 values |
| `entity_type` | `select`, hardcoded 6 values |
| `game_slug` | `text` (or select once >1 game) |
| `is_active` | `boolean` |

**Small additions:** a **`date` field type** for `studied_at` (the renderer has
`datetime-local`, not plain `date`); and the table added to the **allowlist in
`app/api/admin/route.js`**.

## 4.3 ⭐ The one real piece of new logic — `entity_slug` as VALIDATED TEXT

`entity_slug` is the only field that cannot be a hardcoded select: its valid values are
that game's **real entities**, which live in five different places.

> **DECISION: typed text, resolved and VALIDATED ON SAVE. Not a live dropdown.**

Mechanism: export `entitySlugFor` from `lib/coverage.js` (**currently module-private at
`:124`**), and have the save path resolve the typed `entity_slug` against the real
entities for that `entity_type` + `game_slug` via `loadVocabulary(supabase, gameSlug)`
— **rejecting the row with a named reason** if it does not resolve.

**The tradeoff, stated plainly:**

| | live dropdown | validation-on-save |
|---|---|---|
| a wrong entity is… | **un-PICKABLE** | **un-SAVEABLE** |
| correctness guarantee | **identical** | **identical** |
| cost | renderer rebuild: dynamic option source, endpoint, loading/error states, cache | one export + one resolve call |

**Only UX slickness differs.** This is the same principle as the `verified_source`
field pairing: **the guarantee is structural, at a cost far below the slicker option.**

**Why this matters more than convenience:** if a typo'd `entity_slug` could be saved,
the matcher would compare it against canonical slugs and **never match** — a keyword
that silently does nothing, forever. Validation-on-save makes that state
unrepresentable.

## 4.4 Entity sources for validation

| entity_type | source |
|---|---|
| `shell` | **code allowlist** — `SHELLS` in `lib/matchups.js` |
| `mod_slot` | **code allowlist** — `SLOT_PAGES` in `lib/mods.js` |
| `weapon` | DB — `weapon_stats.name` |
| `map` | DB — `game_maps.name` / `slug` |
| `mode` | DB — `game_modes.mode_name` |
| `event` | DB — `game_events.event_name` |

**`loadVocabulary(supabase, gameSlug)` already assembles all six, game-scoped, in one
call.** It is the reusable source. *(It is server-side; the admin page is a client
component, so validation happens in the API route, not the browser — which is the
correct place for a guarantee anyway.)*

## 4.5 Staleness surfacing — DECIDED: minimal, a filtered list

**The volume decides it.** At **10–25 keywords/week sustained — roughly 500–1,300 rows
per year** — the store passes what an operator can hold in memory within a few months.
A heartbeat integer alone would tell you *that* terms are stale without telling you
*which*.

> **DECISION: keep the §6.5 heartbeat `stale=N`, AND add ONE read-only list of rows
> whose `studied_at` is older than the threshold. NOT a panel — a filtered list.**

Two ways to have it. **Both are specified so the operator can pick without further
design work**; neither is a prerequisite for the other.

### Option 1 — a `stale only` filter on the existing list *(recommended)*

**There is already a precedent for exactly this shape.** The generic editor carries a
free-text `search` box plus **two table-specific filter dropdowns** — `filterFaction`
and `filterRunner` (`app/admin/page.js:523-525`, applied at `:664-671`, rendered at
`:1014` / `:1020`) — conditionally shown for the tables they apply to.

A `stale only` toggle for `keyword_targets` follows that **identical pattern**: one
piece of state, one clause in the existing `rows.filter(...)`, one conditionally
rendered control. **~10 lines, no new surface, no new endpoint, no renderer capability.**

The rows are already loaded client-side, so the filter is pure display logic:

```
matchStale = !staleOnly || (r.is_active && r.studied_at < staleCutoff(now))
```

> **SHIPPED (f):** the threshold is `KEYWORD_STALE_DAYS = 90` in the leaf module
> `lib/keywordStaleness.js`, consumed via `staleCutoff(now)`. **(g)'s `stale only`
> filter and the (f) heartbeat MUST import that same binding** — the heartbeat imports
> the function, never the number, so the two readers cannot drift (§10.1). Do not
> hardcode a date or an interval in either surface.

**Why this is the recommendation:** it is a filtered list *of the table the operator is
already looking at*, in the place they already go to add keywords. It cannot drift from
the data because it filters the live rows.

### Option 2 — a documented saved query

If the operator would rather not touch the admin UI, the equivalent is a saved SQL
snippet in Supabase, recorded in this document so it is not re-derived:

```sql
-- Stale keyword targets: active rows whose research predates the threshold.
-- Threshold is 90 days (KEYWORD_STALE_DAYS, §6.5 / lib/keywordStaleness.js).
-- If the constant changes, change this interval to match, or the saved query and
-- the heartbeat disagree about "stale".
SELECT game_slug, keyword, entity_type, entity_slug, facet,
       volume, difficulty, studied_at,
       (CURRENT_DATE - studied_at) AS days_old
FROM   public.keyword_targets
WHERE  is_active
  AND  studied_at < (CURRENT_DATE - INTERVAL '90 days')
ORDER  BY studied_at ASC, volume DESC NULLS LAST;
```

**Trade-off, stated plainly:** Option 1 is one place to look and cannot go stale;
Option 2 is zero code but lives outside the app and must be found again months later.
**The threshold constant must match §6.5's `stale=N` in either case** — if the heartbeat
counts a different window than the list shows, the two disagree about what "stale"
means, which is the label-vs-substance failure in miniature.

> **Explicitly NOT built either way: no auto-stop, no auto-archive, no re-research
> prompt.** Stale terms remain fully active and matchable (§9). **A stale term is still
> a real term — only its metrics have decayed.**

---

# PART 5 — THE SCHEMA

## 5.1 `keyword_targets`

```sql
CREATE TABLE public.keyword_targets (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- game-standard from row one; NO default -- a forgotten value must error,
  -- never silently become Marathon (mirrors feed_items.game_slug).
  game_slug          text        NOT NULL,

  keyword            text        NOT NULL,

  -- PART 2.3: 12-month average is operative; last-known kept for spike detection
  -- and never read as the default input.
  volume             integer,
  last_known_volume  integer,
  difficulty         integer,          -- KD 0-100

  -- PART 2.4: OUR enum, mapped from KWFinder's taxonomy at ingest. The vendor's
  -- raw string is an input, never stored.
  intent             text,

  source             text        NOT NULL DEFAULT 'kwfinder',
  studied_at         date        NOT NULL,

  -- MATCHING KEY -- exactly deriveTuple()'s shape.
  -- NULLABLE per FINDING 1: entity-less rows are the page-gap consumer's input.
  -- The framing guarantee lives in the matcher's WHERE clause, not here.
  -- entity_type: mirror of lib/coverage.js ENTITY_TYPES -- ALTER TOGETHER.
  -- facet:       mirror of lib/coverage.js FACETS       -- ALTER TOGETHER.
  entity_type        text,
  entity_slug        text,
  facet              text,

  priority           integer     NOT NULL DEFAULT 100,

  -- ROTATION IS A CAP, NOT A COOLDOWN (see 6.5). Eligibility is match_count = 0.
  match_count        integer     NOT NULL DEFAULT 0,
  last_matched_at    timestamptz,        -- AUDIT ONLY; not an eligibility input

  is_active          boolean     NOT NULL DEFAULT true,
  notes              text,

  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT keyword_targets_intent_chk CHECK (
    intent IS NULL OR intent IN
      ('informational','comparison','transactional','navigational')),

  -- mirror of lib/coverage.js ENTITY_TYPES -- ALTER TOGETHER
  CONSTRAINT keyword_targets_entity_type_chk CHECK (
    entity_type IS NULL OR entity_type IN
      ('shell','weapon','mod_slot','map','mode','event')),

  -- mirror of lib/coverage.js FACETS -- ALTER TOGETHER
  CONSTRAINT keyword_targets_facet_chk CHECK (
    facet IS NULL OR facet IN
      ('counter','build','tier','guide','news','community','economy','lore')),

  -- a slug without its type is incoherent (FINDING 1, option A)
  CONSTRAINT keyword_targets_slug_needs_type_chk CHECK (
    entity_slug IS NULL OR entity_type IS NOT NULL)
);

CREATE INDEX keyword_targets_match_idx
  ON public.keyword_targets (game_slug, entity_type, entity_slug, facet);
CREATE INDEX keyword_targets_eligible_idx
  ON public.keyword_targets (game_slug, is_active, match_count);
-- PAGE-GAP consumer: every row the MATCHER CANNOT USE, by demand (§3.2, Part 7).
-- Predicate MUST mirror the matcher's requirement inverted -- NOT `entity_type IS
-- NULL`, which would drop bare-entity rows (entity present, facet null) and leave
-- them invisible to BOTH consumers. ALTER TOGETHER with §6.2's four conditions.
CREATE INDEX keyword_targets_pagegap_idx
  ON public.keyword_targets (game_slug, volume DESC)
  WHERE entity_type IS NULL OR entity_slug IS NULL OR facet IS NULL;

ALTER TABLE public.keyword_targets ENABLE ROW LEVEL SECURITY;
-- NO POLICIES: service-role only, matching coverage_registry / coverage_shadow.
-- Anon writes are silently rejected by design; the cron uses SUPABASE_SERVICE_KEY.
```

**The `-- ALTER TOGETHER` comments are deliberate.** A CHECK that mirrors a code enum
is a duplicated source of truth; the comment is the only thing that will tell a future
editor of `ENTITY_TYPES` that a second place exists. **A reviewer may reasonably prefer
to drop the CHECKs** — the cost is that an invalid value becomes storable and fails
silently at match time instead of loudly at insert. **Recorded as a real trade.**

## 5.2 `keyword_match_log`

```sql
CREATE TABLE public.keyword_match_log (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at        timestamptz NOT NULL DEFAULT now(),

  game_slug         text        NOT NULL,

  -- NO FOREIGN KEYS -- deliberate. Audit rows must survive their article being
  -- pruned (the noindex/prune workflows delete feed_items). A FK would either
  -- block the prune or cascade the audit record away. Durability > referential
  -- integrity for a log.
  feed_item_id      uuid,
  keyword_id        uuid,

  entity_type       text,
  entity_slug       text,
  facet             text,

  outcome           text        NOT NULL,

  original_headline text        NOT NULL,
  final_headline    text        NOT NULL,

  -- was: the tuple a REJECTED re-classification produced. Option 4 removed the
  -- re-classification guard, so nothing writes this. Retained as a nullable column
  -- because the DDL shipped with it; harmless and always NULL.
  rejected_tuple    jsonb,

  CONSTRAINT keyword_match_log_outcome_chk CHECK (outcome IN (
    'applied',
    'no_match_unclassified',
    'no_match_no_term',
    'no_match_capped',
    'rejected_reclassify',   -- DELIBERATELY UNREACHABLE under Option 4 (no re-class
                             -- guard). Kept in the CHECK because the DDL shipped with
                             -- it; lib/keywordHeartbeat.js omits it from
                             -- REPORTED_OUTCOMES and would surface it as UNKNOWN if it
                             -- ever appeared -- i.e. as a drift alarm.
    'rejected_rules',        -- FINDING 3: distinct from rewrite_failed
    'rewrite_failed'
  ))
);

CREATE INDEX keyword_match_log_recent_idx
  ON public.keyword_match_log (game_slug, created_at DESC);

ALTER TABLE public.keyword_match_log ENABLE ROW LEVEL SECURITY;
-- NO POLICIES: service-role only.
```

**`outcome` is a closed set and it is the point of the table** — it makes *"nothing
matched today"* and *"the feature is broken"* different rows, not the same silence.

---

# PART 6 — THE MATCHER + REWRITE (framing consumer)

## 6.1 Pass 1 — unchanged

`callEditor()` generates `headline` + `body` in one tool call. **No keyword exists in
this context. Nothing in this design touches pass 1.**

## 6.2 Classify and match

Reuse **`deriveTuple(row, vocab)`** from `lib/coverage.js`, unchanged. Confirmed: it
reads `row.headline` only, returns a classified tuple or `{unclassified, reason}`, and
requires **both** a confident entity **and** a confident facet.

**An article fits a keyword when ALL FOUR hold:**

1. `deriveTuple` returns a **classified** tuple;
2. a row exists with **`game_slug` = the article's**;
3. that row's `entity_type`, `entity_slug` and `facet` **all equal** the tuple's;
4. `is_active = true` **and** `match_count = 0`.

**Exact equality on all three. No fuzzy matching, no scoring, no nearest-neighbour.**
A near-match would frame an article toward a term it does not answer — the failure mode
that makes keyword SEO dishonest. **Exact or nothing.**

Tie-break: `priority` ASC, `volume` DESC NULLS LAST, `LIMIT 1`.

> **Most articles will NOT match, by design.** The vocabulary spans 6 entity types × 8
> facets against a sparse store. **A system where most articles matched would mean the
> matcher is too loose.**

## 6.3 Ordering — and it moves an existing call

**CONFIRMED: `coverage_shadow` stores the headline TEXT** (`coverageShadow.js:271`) and
derives `dup_unigram_tokens` / `dup_bigram_tokens` / `dup_rare_tokens` from it.

> **`logCoverageShadow` MUST run AFTER the rewrite.** At its current position
> (`route.js:745`) it would persist a headline that never publishes and tokenise
> phantom text, **corrupting every future duplicate comparison against a string not on
> the site.**

```
1. pass 1      generate headline + body           (no keyword present)
2. classify    deriveTuple(GENERATED headline)    (frozen; Option 4)
3. look up     exact match on the 4 conditions
4. pass 2      [if match] rewrite the headline
5. length gate [if rewritten] <= 65 chars, else rejected_rules, keep original
6. shadow log  logCoverageShadow(FINAL headline)
7. slug        generateSlug(FINAL headline)
8. insert      feed_items
9. post-insert match_count++, last_matched_at, keyword_match_log row
```

> ### ⚠️ CORRECTED 2026-07-22 — the ordering above is as SHIPPED, and it differs
> from this section's original draft in two ways:
>
> **Step 5 is NOT a re-classification guard.** The original design re-ran
> `deriveTuple` on the rewritten headline and rejected a mismatch
> (`rejected_reclassify`). **Option 4 removed that.** Grading a rewrite with a
> classifier that reads the rewrite's own output is circular; Option 4 designs the
> circularity out by classifying the ORIGINAL generated headline ONCE and freezing
> the tuple, so there is nothing to re-check. `rejected_reclassify` survives in the
> schema CHECK (the DDL shipped with it) but is **deliberately unreachable** — see
> the annotation at §5.2 and the module header of `lib/keywordFraming.js`.
>
> **`logCoverageShadow` did not MOVE.** The "← MOVED" note was wrong: the shadow
> call already sat ~250 lines after the hook point. Mutating `result.headline` at
> the hook makes dedup, the shadow log and `generateSlug` all see the final string
> with zero call relocation. Verified against the shipped tree.
>
> Hook placement as shipped: `processEditor` (`app/api/cron/route.js:512`), after
> `callEditor` returns and after `resolveMediaInfo`, before the dedup gates and the
> insert. `gatherAll` performs no classification and is untouched.

## 6.4 Pass 2 — the rewrite

**Model: `claude-haiku-4-5-20251001` — the DATED SNAPSHOT, not the alias.**
`max_tokens` ≈ 100. Output is a single headline string. A rewrite is a constrained,
mechanical transformation — it does not need a frontier model, and the cost profile
matters because this runs per matched article.

> **Why the dated snapshot: an alias re-pointing underneath a scheduled cron is a
> reproducibility hole.** The headline rewrite would silently change character with no
> diff, no deploy, and no signal.
>
> **The constant belongs in `lib/models.js`, NOT as a literal in the framing module.**
> That file states the rule outright — *"no other file should hold a literal `claude-*`
> model string"* — and exists because **a June 2026 outage from a retired Sonnet
> snapshot required fixing FIVE hardcoded copies.** Adding a sixth would re-earn that
> incident.
>
> *Precision note on the brief: the dated-snapshot precedent is
> **`COMMENT_MODEL = 'claude-haiku-4-5-20251001'`**, not the Sonnet constant —
> `ARTICLE_MODEL` is pinned by alias (`'claude-sonnet-4-6'`). Pass 2 follows
> `COMMENT_MODEL`'s pattern, and may simply reuse that constant if the reviewer is
> content for comment-voice and headline-rewrite models to move together; a separate
> `HEADLINE_REWRITE_MODEL` decouples them at the cost of one more line. **Flagged, not
> decided.***

**MAY see:** the original headline, the keyword, the shared `HEADLINE_RULES` constant,
and **the finished body (read-only, for factual fidelity)** — safe because the body is
**immutable** at this point.

**MAY change:** `headline`. **FROZEN:** `body`, `tags`, all scores/grades, `editor`,
`source`, `thumbnail`, `source_url`, `game_slug`.

**`slug` re-derives** from the final headline (step 7). Because the article has not been
inserted yet, **no published URL ever changes** — no redirect problem.

## 6.5 Guardrails

**Re-classification guard — REMOVED by Option 4 (corrected 2026-07-22).** The original
design re-ran `deriveTuple` on the rewritten headline and rejected a mismatch. That is
circular: it grades a rewrite with a classifier reading the rewrite's own output.
**Option 4 classifies the ORIGINAL generated headline ONCE, freezes the tuple, and
never re-classifies** — the circularity is designed out rather than guarded against, so
`rejected_reclassify` is a permanently unreachable outcome (kept in the schema because
the DDL shipped with it; see §5.2). *"Frame, don't change the subject" is now enforced
structurally: the keyword never reaches pass 1, so the subject is fixed before any
keyword exists.*

**Rules ceiling — CODE-ENFORCED, not prompt-enforced.** A rewritten headline **> 65
characters is rejected in code**, outcome `rejected_rules`, original kept. **Distinct
from `rewrite_failed`** (FINDING 3): a systematically over-long rewrite is a prompt
problem to fix; a failed call is transient. Collapsing them would hide the first inside
the second.

> ### ⚠️ CORRECTED 2026-07-22 — the ceiling was `60`, and `60` was wrong.
>
> **The code ceiling MUST equal the prompt ceiling.** `HEADLINE_RULES` (now
> `lib/headlineRules.js`) tells the model *"Target 55 characters or fewer; never exceed
> 65."* A checker set at 60 rejects headlines in the **61–65 band that obey the rule they
> were given** — and logs them as `rejected_rules`, i.e. as disobedience. That band is not
> hypothetical: published headlines already sit in it, and the rewrite pass *inserts* a
> keyword phrase, which pushes length **up**, straight into it.
>
> **A checker stricter than the instruction converts obedience into failure and poisons
> the one signal `rejected_rules` exists to carry.** The figure `60` was never derived
> from anything; it diverged from the actual rule by drift.
>
> **If a tighter bar for rewrites is ever wanted, it goes in the PROMPT** — a
> rewrite-specific target the model is actually told — **never as a checker the model
> cannot see.** Judge a model against the instruction it was given, or the rejection
> count measures nothing.

**Fail-open, always.** Call failure, timeout, malformed output, guard rejection, rules
rejection → **keep the original headline and publish.** Publication is never blocked.

**Post-insert row update.** `match_count++`, `last_matched_at` **and `updated_at`** are
written **only after the `feed_items` insert succeeds.** If the insert fails after a
match, **no cap is burned on an article that never published.**

> **`updated_at` is MAINTAINED, not decorative.** It defaults `now()` at insert and must
> be set on **every** write — the post-insert update here, and the admin save path in
> (d). **A timestamp that defaults `now()` and is then never touched actively lies**: it
> reports the row as freshly updated forever. *Flagged in TWO separate reviews before it
> landed, which is why it is called out here rather than left to the writer.*

**Error-vs-empty separation.** **A bare `catch` returning a falsy "no result" is
FORBIDDEN in this system.** An unreachable store logs an **ERROR**; a genuine no-match
logs none. Same separation as `verificationState`'s BROKEN CALLER vs blank-source
branches — **asserted by count, not inspection.**

**Rotation is a CAP at `match_count = 1`, not a cooldown.** A repeat match is a second
page targeting the same query — **self-cannibalization, Gate 2's disease, recreated at
the headline layer.** At this domain authority the canonical for a query should be
**one reference page**, not a rolling series of framed articles. A term returns to
rotation **only** if its article is consolidated or killed by the measurement loop —
never on a timer. `last_matched_at` is audit only.

**Heartbeat**, emitted every cycle **even at zero matches**:
```
[keyword] game=marathon articles=5 classified=3 matched=1 rewritten=1
          rejected=0 failed=0 store=reachable(42 active, 7 stale, 2 orphaned)
```
`store=reachable(N)` is the liveness signal — `matched=0` with `reachable(42)` means
*"nothing fit today"*; `store=UNREACHABLE` means **the feature is dead again**, said out
loud every run rather than discovered months later.

### 6.6 ⭐ ORPHAN DETECTION — validation-on-save is a point-in-time guarantee

**§4.3 makes a typo'd `entity_slug` un-saveable. It does NOT keep a valid slug valid.**
An entity can be **renamed, re-slugged, or removed** after the keyword row is saved —
at which point the row is **fully tagged, passes every constraint, and silently never
matches again. Forever.**

> **That is the un-representable state reintroduced across TIME rather than across
> input.** Validation-on-save is a guarantee at one instant; nothing re-checks it.

**`orphaned=N` in the heartbeat closes it.** Same query shape as `stale=N`:

> **Count `is_active` rows that are FULLY TAGGED** (all three matching columns non-null
> — i.e. rows the matcher *should* be able to use) **whose `entity_slug` no longer
> resolves against the current vocabulary** from `loadVocabulary(supabase, gameSlug)`.

**A second thing it catches, for free:** an `entity_type` or `facet` value that is valid
per the DB CHECK but no longer valid in code — **enum-CHECK drift**. §10.4 accepts the
duplicated-source-of-truth risk on the strength of an `-- ALTER TOGETHER` comment;
**`orphaned=N` backstops that comment with a live runtime signal**, which is the
difference between a convention and a check.

**Deliberately a COUNT, not an action.** No auto-deactivation, no auto-retag — an
orphan may mean the entity was renamed (retag it) or genuinely removed (deactivate it),
and **only a human can tell which.**

---

# PART 7 — THE PAGE-GAP REPORT (second consumer, high level only)

**Not fully designed. Flagged as the next design increment after framing ships.**

**Input: every row the matcher cannot use** (§3.2) — i.e. any row where
**`entity_type` OR `entity_slug` OR `facet` IS NULL**. That is two populations in one
definition: keywords with **no entity at all** ("player count", "lfg"), **and
bare-entity keywords with no facet** ("marathon vandal"), which are often the *stronger*
gap signal — demand for an entity we may have no reference page for.

> **NOT `entity_type IS NULL`.** That narrower predicate would drop every bare-entity
> row, and those rows would then satisfy **neither** consumer — invisible to both.
> The partition property (§3.2) is what this definition exists to preserve.

**Combined with:** their `volume` / `difficulty`, and **the operator's own SERP-position
knowledge** (we have no rank data in-system; SERPWatcher's export is the one that drops
the metrics, per 2.1).

**Output:** a *"demand where we rank poorly or have no page"* report that drives **which
reference pages to build** — which is the demand-gated side of the Operating Doctrine
(§1.2).

**It shares the ingest entirely and needs no new store.** The `keyword_targets_pagegap_idx`
partial index (§5.1) exists to serve it. Its whole cost is a query and a view.

---

# PART 8 — COMMIT SEQUENCE

**Authoritative. Supersedes the prior build doc's lettering (FINDING 4).**

### (a) Delete the dead `seo_keywords` code — Claude Code

**Scope.** `lib/editorCore.js`: the `SEO KEYWORD TARGETING` banner + `getTargetKeyword`
(`:1151-1174`); the `kwData` injection block in `callEditor` (`:1214-1225`); the
`_seo_keyword_id` assignment (`:1263-1265`); the exported `consumeKeyword`
(`:1270-1281`). `app/api/cron/route.js`: the `consumeKeyword` import (line 1) and the
`if (result._seo_keyword_id)` block (`:758-764`).

**Dependency:** none.

**Verification.** (1) `grep` for `seo_keywords|getTargetKeyword|consumeKeyword|_seo_keyword_id`
returns **0** across `lib/ app/ scripts/ components/`. (2) **No-op proof:** assembled
system prompt for all five long-form editors **byte-identical** before/after — provable,
since the code is inert. (3) **Dead-before-deletion guard:** confirm against the live DB
that `getTargetKeyword` returns `null` — *demonstrate the code is dead before deleting
it.* (4) ESLint clean.

**Failure handling.** Guard 3 returns data → `seo_keywords` exists after all; **STOP**,
the premise is wrong. Prompt not byte-identical → something in range was load-bearing;
**STOP.**

### (b) Extract `HEADLINE_RULES` to one constant — Claude Code

**Scope.** `lib/editorCore.js` only. One module-scope constant holding the **14 lines
verbatim**; five inline copies at `:340, :406, :476, :542, :590` replaced.
**Confirmed: all five are 14 lines, sha256 `426fc9c6b18d7ae8`, byte-identical.**

**Dependency:** none for itself; **prerequisite for (e)** — pass 2 must inject the same
rules pass 1 used.

**Verification.** Byte-identical assembled prompt for all five editors; the literal
`HEADLINE RULES - NON-NEGOTIABLE:` appears **exactly once**; the constant's sha256
equals `426fc9c6b18d7ae8` (**proves moved, not retyped**); ESLint.

**Failure handling.** Any difference → **STOP** and diff. Do not adjust the expected
value to pass.

### (b2) Parameterise the game name — Claude Code, specified future commit

**Scope.** The constant's line 2 hardcodes `("Marathon")`. Replace with
`config.displayName`, threaded from the existing per-game config.

**Dependency:** (b). **Deliberately separate** so (b) keeps its byte-identical proof.

**Verification.** Marathon's assembled prompt **byte-identical to post-(b)**; a
synthetic second game's prompt contains its own name and **no "Marathon"**.

**Failure handling.** Marathon prompt differs → **STOP**; the parameterisation is not
substitution-equivalent.

### (c) DDL `keyword_targets` — **Justin, in Supabase**

**Scope.** §5.1 verbatim, including RLS-enabled-no-policies and the three enum CHECKs.

**Dependency:** none; blocks (d).

**Verification (read-back, by Claude Code).** Every column with exact type/nullability/
default; all four CHECKs present and rejecting out-of-set values; three indexes present;
**RLS enabled with zero policies**; `count(*) = 0`.

**Failure handling.** `gen_random_uuid()` unavailable → `uuid_generate_v4()` or enable
`pgcrypto` — **Justin's call, report and stop.** CHECKs unwanted → drop them and record
that the enums are convention-enforced; **do not proceed with a shape that differs from
§5.1 undocumented.**

### (c2) DDL `keyword_match_log` — **Justin, in Supabase**

**Scope.** §5.2 verbatim: no FKs, `rejected_tuple jsonb`, **7-value** `outcome` CHECK,
RLS enabled no policies.

**Verification.** Same read-back shape; `outcome` CHECK rejects an out-of-set value.

**Failure handling.** If the `outcome` set needs changing, that is a **design change** —
back to this document first. The set is what makes "no match" and "broken"
distinguishable.

### (d) ENTRY — admin field config + validated `entity_slug` — Claude Code

**Scope.**
- `app/admin/page.js`: a `keyword_targets` field config (§4.2) + a new **`date`** field
  type in the renderer.
- `app/api/admin/route.js`: add `keyword_targets` to the table allowlist; add the
  **validate-on-save** step.
- `lib/coverage.js`: **export `entitySlugFor`** (currently private at `:124`).

**Dependency:** (c).

**Also in scope (per §10.5 / §10.6, both now resolved):** `game_slug` is a **select**,
hardcoded `['marathon']` from day one — free text with one valid value is all downside,
and adding `'dmz'` later is a one-line diff. `studied_at` is **required, with NO
today-prefill**, labelled **"date the KWFinder data was pulled"** — a `today` default
would silently encode *entry-date* semantics, which is the exact drift §10.6 existed to
prevent.

**Verification.** (1) A row with a **valid** entity for its `entity_type` + `game_slug`
**saves**. (2) A row with an **invalid** `entity_slug` is **REJECTED with a named
reason** — synthetic test, both create and edit paths. (3) An **entity-less** row
(page-gap candidate) **saves** — proves FINDING 1's resolution works. (4) A
**bare-entity** row (entity_type + entity_slug populated, `facet` NULL) **saves** —
proves FINDING 6b's fix: it must be storable to reach page-gap. (5) Enum values
enforced: an out-of-set `facet`/`intent`/`entity_type` is rejected. (6) The `date` type
renders and round-trips `studied_at`, and **the field is blank on a new row, not
today-filled**. (7) **`updated_at` is written on every save** — assert it changes on an
edit, per §6.5. (8) **No other table's field config or defaults change** —
byte-identical config diff outside `keyword_targets`. (9) ESLint.

**Failure handling.** An invalid entity **saves** → the guarantee is absent; **STOP**,
do not ship. This is the commit's entire purpose.

### (e) MATCHER + REWRITE — Claude Code

**Scope.** New `lib/keywordFraming.js` (lookup + orchestrator, **never throws**); a
`rewriteHeadlineForKeyword(...)` function; `app/api/cron/route.js` reordered per §6.3
including **moving `logCoverageShadow` after the rewrite**, plus the post-insert update.

**Dependency:** (b), (c), (c2), (d).

**Verification — all nine, none deferred.**
1. **Before-state guard:** with the table empty, **zero rewrites**, every headline
   unchanged.
2. Synthetic **matched / unmatched / error** cases.
3. Unmatched articles **byte-identical end-to-end** (headline, slug, shadow record).
4. **Frozen-fields assertion** — field by field across a rewrite.
5. **No re-classification guard (Option 4)** — the frozen original tuple drives the
   match and is never re-derived from the rewritten headline; the shipped fixtures
   assert the rewrite path runs without a re-class step.
6. **Rules ceiling = 65** — a **66**-character rewrite is rejected as `rejected_rules`,
   a **65**-character rewrite is accepted, and both are **distinct** from
   `rewrite_failed`. (The draft said 61/`≤60`; that was drift from a superseded 60/70
   rule. The code ceiling MUST equal the `HEADLINE_RULES` ceiling — see §6.5.)
7. **Post-insert ordering** — a simulated insert failure after a match leaves
   `match_count` unchanged.
8. **Shadow-log ordering** — `coverage_shadow.headline` equals the **final published**
   headline.
9. **Error-vs-empty separation** — asserted **by count**: exactly one error line when
   the store is unreachable, exactly zero on a genuine no-match.

**Failure handling.** Any assertion fails → **STOP and report.** Do not adjust the
assertion. If a design decision proves unimplementable, **flag it as a finding** and
return to this document.

### (f) OBSERVABILITY — Claude Code

**Scope.** The §6.5 heartbeat — including `store=reachable(N active, S stale, O
orphaned)` — the **§6.6 orphan count**, and `keyword_match_log` writes for every
outcome. Exports the shared **staleness threshold constant** consumed by (g).

**Dependency:** (e).

**Verification.** (1) Heartbeat **emits on a zero-match run**. (2) Unreachable store
logs `store=UNREACHABLE` and **does not throw**. (3) `stale=N` counts correctly against
synthetic `studied_at` values either side of the threshold. (4) **`orphaned=N` (§6.6):
a synthetic fully-tagged row whose `entity_slug` does NOT resolve against
`loadVocabulary` is counted orphaned; a resolving row is NOT.** (5) **A partially-tagged
row is NOT counted orphaned** — orphan status applies only to rows the matcher should be
able to use, otherwise every page-gap row would register as an orphan. (6) A log row
exists for **every** outcome exercised in (e).

**Failure handling.** Non-blocking by nature. A heartbeat error is caught and swallowed
— **the one place a swallow is correct, because the swallowed thing IS the logging.**

### (g) STALENESS LIST — Claude Code, **only if Option 1 is chosen**

**Scope (§4.5, Option 1).** `app/admin/page.js`: one `staleOnly` state, one clause in the
existing `rows.filter(...)`, one conditionally rendered toggle shown for
`keyword_targets`. **Follows the existing `filterFaction` / `filterRunner` pattern
exactly** — no new surface, endpoint, or renderer capability.

> **The staleness threshold is EXPORTED from a shared lib module** — e.g.
> `lib/keywordFraming.js` — and **imported by both** the heartbeat (server/cron, landed
> in (f)) **and** this filter (client/admin). **It is defined in neither consumer.**
> Without that, verification 4 below is unsatisfiable: two literals cannot be asserted
> equal, they can only be observed to match today. *(The module must stay
> import-clean from a client component — pure constants, no server-only imports, the
> same discipline `lib/models.js` states for itself.)*

**Dependency:** (d) — the table must exist and be listed in the editor. **Independent of
(e) and (f)**; it is a display filter, not part of the framing pipeline, and can land
any time after (d).

**If Option 2 (saved query) is chosen instead, there is NO commit** — the SQL in §4.5 is
the deliverable and this step is skipped entirely.

**Verification.** (1) With the toggle **off**, the row list is **byte-identical** to
today's for every table — the filter must be inert when unused. (2) With it **on**, only
`is_active` rows older than the threshold appear, asserted against synthetic rows either
side of the boundary. (3) The toggle is **not rendered** for any other table. (4) The
threshold constant is **the same one (f) counts** — asserted by reading one shared
value, not two literals. (5) ESLint.

**Failure handling.** Verification 1 fails → the filter is not inert; **STOP**, it would
silently hide rows on unrelated tables. Verification 4 fails → **STOP**: a list and a
count that disagree about "stale" is worse than neither.

---

# PART 9 — DEFERRED / OUT OF SCOPE

| item | reason |
|---|---|
| **CSV bulk import** | No infrastructure exists anywhere (confirmed). Over-engineering at current volume. **Becomes a candidate IF the per-row form proves a grind** — and would then need wrong-export detection (§2.1) as a required feature. |
| **Dynamic entity dropdowns** | **Validation-on-save achieves the identical correctness guarantee** without a renderer rebuild (§4.3). Only UX slickness is deferred. |
| **The `isMarathon` vocabulary seam** | `loadVocabulary` gives non-Marathon games an empty shell/mod vocabulary, so `deriveTuple` cannot classify those topics for them. **Pre-existing coverage-module limitation, flagged not fixed.** Degrades to no-match — the safe default. |
| **DMZ keyword population** | Architecture is game-agnostic and will serve DMZ. **But no DMZ rows at launch:** head terms closed (KD 41-45), thin pre-launch demand (~1,600/mo), and **entity-page indexing is the launch instrument**, not article keywords. Also `ENTITY_TYPES` does not yet cover DMZ's prize entities (keys, POIs, factions). **Not a permanent bar** — that enum grows when DMZ entity pages are built. |
| **Page-gap report full design** | High-level only (Part 7). **Next design increment after framing ships.** |
| **Monthly volume history (47 columns)** | Warehousing concern; no consumer reads it (§2.3). |
| **Feed-item editors** | Long-form only. The rewrite pass is not wired to any short-form path. |
| **Seeding the table** | Ships empty; population is human-driven. **Until seeded, the feature is correctly inert.** ⚠️ **SEED ONLY AFTER (f) LANDS.** The sequence otherwise permits (e) to run live and unobserved: the matcher would rewrite headlines with **no heartbeat, no `orphaned=N`, and no `keyword_match_log` rows** — the feature working invisibly, which is the same condition as the feature being broken invisibly. **(f) is what makes the difference detectable, so it precedes the first seeded row.** |
| **CI wiring** | Not in scope. |

---

# PART 10 — OPEN DECISION POINTS

**Things the operator must settle. Not guessed here.**

### 10.1 Staleness surfacing — ✅ **RESOLVED 2026-07-22. See §4.5.**

**Decided: KEEP, minimal.** Heartbeat `stale=N` **plus** one read-only filtered list.
**Not a panel.** The deciding fact was volume: **10–25 keywords/week sustained ≈
500–1,300 rows/year**, which is past manual-memory tracking within months.

The one remaining sub-choice — **small admin surface vs documented saved query** — is
the operator's, and §4.5 specifies both so either can be taken without further design.

### 10.2 The KWFinder intent → our-enum mapping table — **STILL OPEN**

§2.4 decides that we map rather than trust. **The mapping itself is unresolved** — it
needs the **real value set from a full export**, not the sample. Until then the ingest
cannot be specified, so `intent` is nullable in §5.1 (see **FINDING 6** — that
nullability is temporary and ends in `SET NOT NULL`) and entry can leave it blank.

**Hypothesis to CONFIRM against the full export — recorded so the check is cheap, NOT
adopted:**

| KWFinder value *(hypothesised)* | our enum |
|---|---|
| `informational` | `informational` — pass through |
| `navigational` | `navigational` — pass through |
| `transactional` | `transactional` — pass through |
| `commercial` | **`comparison`** — the one real mapping |
| anything else | **FLAG, do not store** (§2.4) |

> **This remains a confirm-against-real-export item, not a resolved decision.** If the
> vendor's set differs, the table above is wrong and the mapping is whatever the export
> actually shows. **Do not build the ingest from this hypothesis.**

### 10.3 FINDING 1 — nullable matching columns (Part 0)

**Recommended option A**, but it reverses a stated decision in the prior design doc and
**needs explicit sign-off.**

### 10.4 Enum CHECKs vs code-only enforcement

§5.1 duplicates `ENTITY_TYPES` / `FACETS` into DB CHECKs with `-- ALTER TOGETHER`
comments. **A reviewer may prefer to drop them.** The trade: loud failure at insert
versus one less place to keep in sync.

### 10.5 `game_slug` entry type — ✅ **RESOLVED 2026-07-22**

**A `select` from day one, hardcoded `['marathon']`.** Adding `'dmz'` later is a
one-line diff.

**Free text with exactly one valid value is all downside:** it accepts every typo, and
a typo'd `game_slug` produces a row that is scoped to a game that does not exist —
matching nothing, appearing in no page-gap report, and looking entirely normal in the
list. **Specified in (d).**

### 10.6 `studied_at` semantics — ✅ **RESOLVED 2026-07-22**

**`studied_at` is the date the KWFinder data was PULLED. Required. NO today-prefill.**

Form field is **blank on a new row**, `required`, and labelled **"date the KWFinder data
was pulled"** so the semantics are on screen rather than in this document.

> **Why no `today` default: a today-prefill silently encodes ENTRY-date semantics** —
> exactly the drift this question existed to prevent. If research sits a fortnight
> before entry, a prefilled row claims freshness it does not have, and **§6.5's
> `stale=N` then counts the wrong thing** while looking correct. **A blank required
> field forces the real answer; a helpful default manufactures a plausible wrong one.**

**Specified in (d).**
