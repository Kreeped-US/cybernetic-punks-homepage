# Keyword Framing — Build Sequence

> ## ⚠️ SUPERSEDED — historical draft, do NOT build from this.
> The source of truth is **`docs/KEYWORD_SYSTEM_CONSOLIDATED.md`**, built and shipped to
> `main` on 2026-07-22. This brief is kept for the build history only. What actually
> shipped differs from it — the commit letters, the hook placement, the length gate, and
> the presence of a re-classification guard all changed. The real commit chain is
> **(a)** `5c221e7` · **(b)** `e60cabd` · **(d1)** `623a8a5` · **(d2)** `c48f4b4` ·
> **(b2)** `78639b9` · **(e)** `d087e62` · **(f)** `dd6f8ec` · stale-days `2df49b9`.
> Read the CONSOLIDATED doc's "Shipped state" banner. Nothing below is reconciled.

**Status:** SUPERSEDED DRAFT (was: BUILD BRIEF). Superseded by the CONSOLIDATED doc.
**Date:** 2026-07-22
**Derived from:** `docs/KEYWORD_FRAMING_DESIGN.md` *(itself now superseded)*. Section
references below (§n) point at that draft. This brief does not restate the design; it
specified how it would get built — see the CONSOLIDATED doc for how it actually did.

**Baseline:** `main` at `5caa908`. Both design and build docs are untracked.

---

## 0. Finding — surfaced by writing the build, NOT silently adjusted

> ### ⚠️ The `HEADLINE_RULES` block contains a hardcoded game literal.

Design §5 states *"No Marathon literal anywhere in the mechanism."* Commit **(b)**
extracts the 14-line `HEADLINE RULES` block into one shared constant. **Line 2 of that
block reads:**

```
- Put the game name ("Marathon") and the primary searchable term - the season, weapon,
  build, map, mode, or topic name - in the first 5-6 words of the headline.
```

**Three things a reviewer should weigh:**

1. **This is pre-existing.** The literal is already in all five copies today. Extracting
   it does not introduce it.
2. **It is in the PROMPT, not the mechanism.** Design §5's claim is about the matching /
   rewrite machinery — the table, the lookup, the scoping — none of which will contain a
   game literal. That claim survives intact.
3. **But extraction changes its shape.** Today it is five duplicated strings that a
   future DMZ editorial path would each have to fork. As one constant it becomes a
   single shared string that is **wrong for every non-Marathon game**, and pass 2 (§3.2)
   will inject that same constant.

**This brief does NOT resolve it.** Options a reviewer might pick between: extract
verbatim now and parameterise when DMZ editorial starts (smallest diff, defers the
problem); or extract as a function of `config.displayName` in commit (b) (larger diff,
makes (b) no longer a pure-string no-op and therefore harder to verify).

**Recommendation deferred to review.** Commit (b) as specified below assumes
**verbatim extraction**, because that is the version with a provable byte-identical
no-op. If the reviewer prefers parameterisation, **(b)'s verification changes** and this
brief needs revising before build.

---

## 1. Prerequisites — design decisions this build assumes settled

The reviewer should confirm none of these drifted between design and build. All are
from `KEYWORD_FRAMING_DESIGN.md` §9 unless noted.

| # | assumed settled | design ref |
|---|---|---|
| 1 | Table is `keyword_targets`; the dead `seo_keywords` is deleted, not revived | §9.1, §7(a) |
| 2 | `intent` NOT NULL, closed set of four, CHECK-enforced | §9.2 |
| 3 | Pass 2 sees the frozen body; re-classification guard is the second belt | §9.3, §3.3 |
| 4 | Rotation is a **cap at `match_count = 1`**, not a cooldown | §9.4, §2.3 |
| 5 | `keyword_match_log` is a table, not log-only | §9.5, §1.1 |
| 6 | `volume` / `difficulty` gate **nothing** automatically | §9.6 |
| 7 | `entity_type`, `entity_slug`, `facet` all NOT NULL | §9.7 |
| 8 | Long-form editors only | §9.8 |
| 9 | No DMZ rows at launch — demand-led, not a structural bar | §9.9, §5.2 |
| 10 | Stale terms flagged, never auto-stopped; `stale=N` in the heartbeat | §9.10, §6.3 |
| 11 | **Structural boundary**: body generated with no keyword present; pass 2 touches headline only | §0 |
| 12 | **Exact-match-or-nothing**; no-match is the common, safe default | §2.2, §3.7 |
| 13 | **Fail-open always**; a framing failure never blocks publication | §3.5 |
| 14 | **Error-vs-empty separation is FORBIDDEN to collapse**; lands in (d), not (e) | §6.1, §7 |
| 15 | `logCoverageShadow` **moves to after the rewrite** (it stores headline TEXT) | §3.1 |
| 16 | Post-insert row update — cap burned only after a successful insert | §3.6 |

**Unresolved fact carried forward:** whether `gen_random_uuid()` is available in this
Postgres (design §8). **Commit (c) is the first thing that would fail if not** — see
(c) failure handling.

---

## 2. Commit (a) — delete the dead `seo_keywords` code

**Who:** Claude Code.
**Dependency:** none. Can land immediately, independent of everything else.

### Exact scope

**`lib/editorCore.js`** — four deletions:

| lines | what |
|---|---|
| **1151–1174** | The `SEO KEYWORD TARGETING` banner comment (`1151-1154`) and the entire `getTargetKeyword` function (`1156-1174`), up to but **not** including the `CALL EDITOR` banner at `1176` |
| **1214–1225** | The `kwData` declaration and the whole injection block inside `callEditor` — `var kwData = null;` through the closing `}` of `if (supabaseClient) { … }` |
| **1263–1265** | `if (kwData) { parsed._seo_keyword_id = kwData.id; }` |
| **1270–1281** | The entire exported `consumeKeyword` function, up to but **not** including the `COMMENT VOICES` banner at `1283` |

**`app/api/cron/route.js`** — two deletions:

| lines | what |
|---|---|
| **1** | Remove `consumeKeyword` from the import list. The other three imports (`callEditor`, `buildMirandaPrompt`, `generateArticleComments`) stay |
| **758–764** | The `if (result._seo_keyword_id) { … }` block including its `.catch()` and the trailing `console.log` |

**Nothing else changes.** No select, no prompt, no schema.

### Verification

1. **Zero-reference assertion.** `grep -rn "seo_keywords\|getTargetKeyword\|consumeKeyword\|_seo_keyword_id"` across `lib/`, `app/`, `scripts/`, `components/` returns **0 matches**.
2. **No-op proof, same shape as `c852b9a`.** Assemble the full system prompt for all
   five long-form editors (`DEXTER, NEXUS, CIPHER, GHOST, MIRANDA`) **before and after**,
   and assert **byte-identical**.
   *This is provable rather than argued: the deleted code is inert — `seo_keywords` does
   not exist, so `getTargetKeyword` returns `null` on every call via its bare catch, so
   the injection block never executed. Removing a branch that never ran cannot change
   output.*
3. **Before-state guard:** confirm on HEAD that `getTargetKeyword` returns `null` for at
   least one editor against the live DB — i.e. **demonstrate the code is dead before
   deleting it**. If it returns data, the premise is wrong and the deletion must stop.
4. ESLint clean on both files.

### Failure handling

- **Guard 3 returns data** → `seo_keywords` exists after all; **STOP**, report, do not
  delete. The whole design premise (§9.1) needs revisiting.
- **Prompt not byte-identical** → something in the removed range was load-bearing;
  **STOP**, report the diff, do not commit.

---

## 3. Commit (b) — extract `HEADLINE_RULES` to one constant

**Who:** Claude Code.
**Dependency:** none for itself. **Prerequisite for (d)** — pass 2 must inject the same
rules pass 1 used (§4). Best landed after (a) purely to keep diffs small.

### Exact scope

**`lib/editorCore.js` only.**

- Add one module-scope constant, `HEADLINE_RULES`, holding the **14 lines verbatim**
  (`:340-353` in the current file).
- Replace the five inline copies at **`:340, :406, :476, :542, :590`** with an
  interpolation of that constant.

**Confirmed read-only:** all five blocks are **14 lines, sha256 `426fc9c6b18d7ae8`,
byte-identical** — verified before this brief was written. **There is no divergence to
resolve.**

**Assumes verbatim extraction** — see the §0 finding. The Marathon literal travels into
the constant unchanged.

### Verification

1. **Byte-identical prompt proof.** Assemble the full system prompt for all five
   editors before and after; assert **byte-identical**. This is the whole verification —
   a pure refactor with a provable no-op.
2. **Copy-count assertion.** The literal string `HEADLINE RULES - NON-NEGOTIABLE:`
   appears **exactly once** in the file after the change (inside the constant).
3. **Constant-content assertion.** The extracted constant's sha256 equals
   `426fc9c6b18d7ae8` — i.e. it is the block that was there, not a retyped
   approximation.
4. ESLint clean.

### Failure handling

- **Prompt differs** → almost certainly whitespace or interpolation-boundary drift.
  **STOP**, diff the two prompt strings, do not commit. Do not "fix" by adjusting the
  expected value.
- **sha256 mismatch on the constant** → the block was retyped rather than moved. **STOP.**

---

## 4. Commit (c) — DDL `keyword_targets`

**Who: Justin, in the Supabase SQL editor.** Claude Code does not run DDL.
**Dependency:** none technically, but (d) cannot start until this exists.

### The statement, as the reviewer would see it

```sql
CREATE TABLE public.keyword_targets (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- game-standard from row one; NO default, a forgotten value must error
  game_slug       text        NOT NULL,

  keyword         text        NOT NULL,

  -- human decision-support only; nothing automated reads these (design §9.6)
  volume          integer,
  difficulty      integer,

  intent          text        NOT NULL,
  source          text        NOT NULL DEFAULT 'kwfinder',
  studied_at      date        NOT NULL,

  -- the matching key: exactly deriveTuple()'s shape. All NOT NULL by design §9.7 --
  -- a row that cannot match is research, and research lives in the Mangools CSVs.
  entity_type     text        NOT NULL,
  entity_slug     text        NOT NULL,
  facet           text        NOT NULL,

  priority        integer     NOT NULL DEFAULT 100,

  -- rotation is a CAP, not a cooldown (design §2.3)
  match_count     integer     NOT NULL DEFAULT 0,
  last_matched_at timestamptz,              -- audit only, not an eligibility input

  is_active       boolean     NOT NULL DEFAULT true,
  notes           text,

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT keyword_targets_intent_chk
    CHECK (intent IN ('informational','comparison','transactional','navigational')),
  CONSTRAINT keyword_targets_entity_type_chk
    CHECK (entity_type IN ('shell','weapon','mod_slot','map','mode','event')),
  CONSTRAINT keyword_targets_facet_chk
    CHECK (facet IN ('counter','build','tier','guide','news','community','economy','lore'))
);

CREATE INDEX keyword_targets_match_idx
  ON public.keyword_targets (game_slug, entity_type, entity_slug, facet);

CREATE INDEX keyword_targets_eligible_idx
  ON public.keyword_targets (game_slug, is_active, match_count);
```

**Note for review — the two enum CHECKs are a build-time addition, not in design §1.**
Design §1 specifies the columns as *"one of `ENTITY_TYPES`"* / *"one of `FACETS`"* but
does not say whether that is enforced in the DB or only by convention. **Adding CHECKs
makes the DB the enforcer.** The cost: `ENTITY_TYPES` will grow when DMZ entity pages
are built (§5.2), and a CHECK must then be altered. **Flagged for the reviewer to
accept or drop** — it is the same "enforce vs document" question the verification arc
answered in favour of enforcement, but it has a real maintenance cost here.

### Verification (read-back, read-only, run by Claude Code after Justin runs it)

1. Every column present with the **exact type, nullability and default** in §1.
2. All three CHECK constraints present and rejecting an out-of-set value.
3. Both indexes present.
4. `SELECT count(*)` returns **0** — the table is created empty; seeding is separate.

### Failure handling

- **`gen_random_uuid()` unavailable** (the one unresolved fact, §1 prereq 11) → use
  `uuid_generate_v4()` or enable `pgcrypto`. **Justin's call**; report and stop rather
  than guessing.
- **A CHECK is rejected or unwanted** → drop the CHECKs, keep the columns, and record
  in the design doc that the enum is convention-enforced. **Do not silently proceed with
  a different shape than §1.**

---

## 5. Commit (c2) — DDL `keyword_match_log`

**Who: Justin, in the Supabase SQL editor.**
**Dependency:** none on (c) technically; both must exist before (d) ships. Can be run in
the same session.

```sql
CREATE TABLE public.keyword_match_log (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at        timestamptz NOT NULL DEFAULT now(),

  game_slug         text        NOT NULL,

  feed_item_id      uuid,        -- set post-insert; NULL if the article never published
  keyword_id        uuid,        -- NULL on a no-match record

  entity_type       text,        -- the derived tuple; NULL when unclassified
  entity_slug       text,
  facet             text,

  outcome           text        NOT NULL,

  original_headline text        NOT NULL,
  final_headline    text        NOT NULL,

  CONSTRAINT keyword_match_log_outcome_chk
    CHECK (outcome IN (
      'applied',
      'no_match_unclassified',
      'no_match_no_term',
      'no_match_capped',
      'rejected_reclassify',
      'rewrite_failed'
    ))
);

CREATE INDEX keyword_match_log_recent_idx
  ON public.keyword_match_log (game_slug, created_at DESC);
```

**No FK on `feed_item_id` / `keyword_id`** — deliberate. A log row must survive its
article being deleted (the noindex/prune workflows delete rows), and a FK would either
block that or cascade the audit record away. **Flagged for review**: if the reviewer
prefers referential integrity over log durability, that is a real trade to make
explicitly.

### Verification

Same read-back shape as (c): columns, types, nullability, the `outcome` CHECK rejecting
an out-of-set value, index present, `count(*) = 0`.

### Failure handling

Same as (c). **If `outcome`'s closed set needs to change, that is a design change
(§1.1) and goes back to the design doc first** — the set is what makes "nothing
matched" and "the feature is broken" distinguishable (§6.1), so it must not be widened
casually.

---

## 6. Commit (d) — matching + rewrite pass

**Who:** Claude Code.
**Dependency:** **(b)** must have landed (pass 2 injects `HEADLINE_RULES`).
**(c)** and **(c2)** must exist. **(a)** should have landed to avoid confusing diffs.

### Exact scope

**`lib/editorCore.js`** — add one exported function, no changes to `callEditor` itself:

- `rewriteHeadlineForKeyword({ originalHeadline, body, keyword, config })` → `string`.
  One model call, output schema is a single `headline` string. Injects the shared
  `HEADLINE_RULES` constant from (b).

**New module `lib/keywordFraming.js`** — the matcher, kept out of `editorCore.js` so the
generation path stays readable:

- `loadEligibleKeyword(supabase, tuple)` → row or `null`, implementing §2.2's rule
  (exact equality on all three matching columns + `game_slug`, `is_active`,
  `match_count = 0`, ordered `priority` ASC, `volume` DESC NULLS LAST, `LIMIT 1`).
- `applyKeywordFraming(supabase, { headline, body, gameSlug, editor, config })` → the
  orchestrator returning `{ finalHeadline, outcome, keywordId, tuple, originalHeadline }`.
  **Never throws.**

**`app/api/cron/route.js`** — reorder the existing seam per design §3.1:

| step | change |
|---|---|
| after generation | **NEW:** call `applyKeywordFraming(...)`; use its `finalHeadline` from here on |
| **`:745`** | **MOVE** the existing `logCoverageShadow(...)` call to **after** the framing step, and pass the **final** headline |
| `insertData.slug` | now derives from the **final** headline (no code change if the framing step reassigns `result.headline` before `insertData` is built — **verify the ordering explicitly**) |
| after a successful insert | **NEW:** post-insert update (§3.6) — `match_count++`, `last_matched_at`, and the `keyword_match_log` row carrying the real `feed_item_id` |

### Verification — all eight required, none deferred

1. **Before-state guard:** with the tables empty, **zero rewrites occur** and every
   article's headline is unchanged. Proves the feature is inert before it is seeded, and
   that no-match is genuinely the default (§3.7).
2. **Synthetic matched / unmatched / error cases**, in memory where possible: a tuple
   with a seeded matching row; a tuple with none; a store that errors.
3. **Unmatched articles byte-identical end-to-end** vs pre-(d) behaviour — headline,
   slug, and the `coverage_shadow` record.
4. **Frozen-fields assertion (§3.2):** across a rewrite, `body`, `tags`, `ce_score` /
   `grid_pulse` / `mood_score`, `editor`, `source`, `thumbnail`, `source_url`,
   `game_slug` are **all unchanged**. Asserted field by field, not eyeballed.
5. **Re-classification guard (§3.3):** a synthetic rewrite that returns a headline
   deriving a *different* tuple is **REJECTED**, the original headline is kept, and the
   outcome is `rejected_reclassify`.
6. **Post-insert ordering (§3.6):** a simulated insert failure **after** a match leaves
   `match_count` **unchanged** — the cap is not burned on an article that never
   published.
7. **Shadow-log ordering (§3.1):** after a rewrite, `coverage_shadow.headline` equals
   the **final published** headline, not the pre-rewrite one. *This is the assertion
   that protects the dedup token columns from being computed on phantom text.*
8. **Error-vs-empty separation (§6.1):** an unreachable store logs an **ERROR** and
   returns "no match"; a genuine no-match logs **no error**. Asserted **by count** —
   exactly one error line in the broken case, exactly zero in the empty case — the same
   discipline that proved `verificationState`'s two branches disjoint.

**Item 8 stays in (d), not (e).** It is not observability polish; it is the guardrail
that stops (d) shipping as another silent no-op — the exact failure that hid the dead
`seo_keywords` code for months.

### Failure handling

- **Any of 1–8 fails** → **STOP and report.** Do not adjust the assertion to pass. If a
  design decision proves unimplementable as written, **flag it as a finding** and return
  to the design doc.
- **In production, at runtime:** every failure path is fail-open (§3.5) — keep the
  original headline, record the outcome, publish. Publication is never blocked.

---

## 7. Commit (e) — observability

**Who:** Claude Code.
**Dependency:** (d) must have landed.

### Exact scope

- **Per-run heartbeat (§6.3)** emitted once per cron cycle, **even when nothing
  matches**:
  ```
  [keyword] game=marathon articles=5 classified=3 matched=1 rewritten=1
            rejected=0 failed=0 store=reachable(42 active, 7 stale)
  ```
- **`stale=N`** counts `is_active` terms with `studied_at` older than ~6 months.
  **Flag only — never auto-stop** (§9.10).
- **`store=reachable(N …)` vs `store=UNREACHABLE`** is the liveness signal that
  distinguishes *"nothing fit today"* from *"the feature is dead again."*

### Verification

1. **The heartbeat emits on a zero-match run** — the whole point; a heartbeat that only
   fires on success is not a heartbeat.
2. **An unreachable store logs `store=UNREACHABLE` and does NOT throw** — fail-open
   preserved.
3. **`stale=N` counts correctly** against a synthetic set with known `studied_at` values
   either side of the threshold.
4. **`keyword_match_log` receives a row for every outcome type** exercised in (d)'s
   synthetic cases.

### Failure handling

Non-blocking by nature. If the heartbeat itself errors it must be caught and swallowed —
**observability must never take down generation** — but that catch logs, and it is the
one place in this system where a swallow is correct, because the swallowed thing *is*
the logging.

---

## 8. Risk — two known seams this build does NOT address

### 8.1 The `isMarathon` vocabulary limitation (design §5.1)

`lib/coverage.js:161` `loadVocabulary` branches on `gameSlug === 'marathon'`, giving
non-Marathon games an **empty shell/mod vocabulary**. `deriveTuple` therefore cannot
classify shell- or mod-topic articles for any other game.

**Not fixed here. Acceptable because:** it is a pre-existing limitation of the coverage
module, not introduced by this feature; the feature degrades to "no match" for affected
articles, which is the safe default (§3.7); and no non-Marathon game is being populated
at launch (§5.2), so nothing is currently harmed. **Fixing it belongs to the coverage
module.**

### 8.2 Corpus influence — the honesty footnote (design §0.2)

The structural boundary holds for **generation**: the body exists before the keyword
appears, so the keyword cannot shape prose. **But the rewritten headline enters the
corpus** — stored on `feed_items`, tokenised into `coverage_shadow`'s
`dup_unigram_tokens` / `dup_bigram_tokens` — so future duplicate-detection and coverage
decisions see keyword-derived phrasing.

**Not addressed here. Acceptable because** the claim being made is precisely *"the
keyword cannot reach the BODY,"* which is narrower than *"the keyword cannot influence
the system"* — and **the narrower claim is the true one, and it is the one the design
states.** The risk of leaving it is that someone later reads the structural boundary as
total isolation. **The mitigation is documentary, and it is already in place.**

---

## 9. Explicitly NOT in scope for this build

1. **Feed-item editors.** Long-form only (§9.8). The rewrite pass is not wired to any
   short-form path.
2. **DMZ population.** No `keyword_targets` rows for DMZ at launch (§5.2, §9.9). The
   mechanism is game-agnostic and will serve DMZ when demand and the entity vocabulary
   justify it; this build does not seed it.
3. **The coverage-module `isMarathon` fix** (§8.1 above).
4. **Growing `ENTITY_TYPES`** for DMZ entities (keys, POIs, factions). That is entity-page
   work, independent of this feature.
5. **Seeding `keyword_targets` with the Mangools research.** The tables are created
   empty; populating them is a separate, human-driven step, and until it happens the
   feature is correctly inert.
6. **Any change to pass 1.** Generation is untouched by every commit here except (b)'s
   pure refactor.
7. **Wiring anything into CI.**

---

## 10. Summary table

| commit | who | dependency | core proof |
|---|---|---|---|
| **(a)** delete dead code | Claude Code | none | prompt byte-identical + zero references + dead-before-deletion guard |
| **(b)** extract `HEADLINE_RULES` | Claude Code | none (prereq for d) | prompt byte-identical + constant sha256 `426fc9c6b18d7ae8` |
| **(c)** DDL `keyword_targets` | **Justin** | none | read-back: types, nullability, defaults, CHECKs, indexes, `count = 0` |
| **(c2)** DDL `keyword_match_log` | **Justin** | none | read-back + `outcome` CHECK rejects out-of-set |
| **(d)** matching + rewrite | Claude Code | (b), (c), (c2) | **eight assertions**, incl. re-classification guard, frozen fields, post-insert ordering, shadow ordering, error-vs-empty |
| **(e)** observability | Claude Code | (d) | heartbeat fires on a **zero-match** run; unreachable store does not throw |

**Two items need a reviewer decision before build starts:** the §0 `HEADLINE_RULES`
game-literal finding, and whether the (c)/(c2) enum CHECKs are wanted.
