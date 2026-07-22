# Keyword Framing — Design Document

> ## ⚠️ SUPERSEDED — historical draft, do NOT build from this.
> The source of truth is **`docs/KEYWORD_SYSTEM_CONSOLIDATED.md`**, which was built and
> shipped to `main` on 2026-07-22. This document is kept for the design history only.
> Its body predates decisions that changed the design; at minimum it is wrong about:
> - the **re-classification guard** (§3.3 here) — **removed by Option 4**; the shipped
>   matcher classifies the original generated headline once and never re-classifies;
> - the **classification input** — the shipped matcher classifies the *generated*
>   headline, and the hook lives in `processEditor`, not `gatherAll`;
> - the **length gate** and **staleness threshold** — shipped as `≤65` and `90 days`.
>
> Read the CONSOLIDATED doc's "Shipped state" banner for the full list. Nothing below
> this line has been reconciled to what shipped.

**Status:** SUPERSEDED DRAFT (was: SETTLED DESIGN). Superseded by the CONSOLIDATED doc.
**Date:** 2026-07-21 (reviewed and settled 2026-07-22; superseded same day)
**Purpose:** *(historical)* this was the source of truth to build from before the
consolidated doc folded it in and the build corrected several of its premises.

---

## 0. The principle this exists to serve

> **Keyword as LENS, not gate.** The editorial trigger stays *"we have verified intel
> worth publishing."* When a finished piece maps to a term we have studied, we frame
> its **headline** toward that phrasing. Keywords never decide **what** gets written —
> only how already-warranted content is presented.

**The boundary is STRUCTURAL, not advisory.** The body is generated first, from
verified data, with no keyword present anywhere in the context. A second pass rewrites
only the headline. **The keyword cannot reach body prose because the body already
exists when the keyword first appears.**

That distinction is the lesson of the verification arc this repo just closed: a
discipline that is written down is not enforced. `lib/verification.js` documented
*"enforced by later phases, NOT here"* for months while no phase enforced it. **This
design does not repeat that.** The prose rule is backed by an architecture in which
breaking it is not possible.

### 0.1 How this sits with the Operating Doctrine

Two documents say things that sound contradictory. They are not, and a reader hitting
both should be able to reconcile them in one paragraph:

- **Canonical / reference pages are DEMAND-GATED** (Operating Doctrine). Whether a
  reference page exists at all is a demand question.
- **Feed articles are EVENT-TRIGGERED** (coverage design). Something happened; we have
  verified intel; we publish.
- **This system touches ONLY the second category, and only its PRESENTATION.**

So *"demand gates what gets written"* (doctrine, about canonical pages) and
*"keywords never decide what gets written"* (this doc, about feed articles) are
statements about **different artifacts**. Nothing here creates an article, suppresses
an article, or changes an article's subject. It changes wording on articles that were
already going to publish.

### 0.2 Honesty footnote — the limit of the structural claim

**The structural boundary holds for GENERATION.** The body exists before the keyword
appears, so the keyword cannot shape prose.

**But the rewritten headline enters the corpus.** It is stored on `feed_items`, it is
tokenised into `coverage_shadow`'s `dup_unigram_tokens` / `dup_bigram_tokens`, and
future duplicate-detection and coverage comparisons will therefore see keyword-derived
phrasing. Over time that phrasing participates in decisions about what counts as
already-covered.

> **The precise claim is: "the keyword cannot reach the BODY." That is narrower than
> "the keyword cannot influence the system," and the narrower claim is the true one.**

Named and accepted, in the same discipline as recording that owner attestation is not
captured provenance. A design that claimed total isolation would be making the
label-vs-substance error this codebase keeps finding.

---

## 1. The schema

**Table: `keyword_targets`.** Deliberately not `seo_keywords` — that name belongs to
the dead implementation being deleted, and reusing it invites resurrection of the
wrong model.

| column | type | null | default | why |
|---|---|---|---|---|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | PK. Every internal reference keys on `id`, per the standing method rule. |
| `game_slug` | `text` | **NOT NULL** | *(none)* | **Load-bearing from row one.** No default — a forgotten value must error, not silently become Marathon. Mirrors `feed_items.game_slug`, whose default was deliberately dropped for this reason. |
| `keyword` | `text` | NOT NULL | — | The studied phrase, verbatim as researched. |
| `volume` | `integer` | NULL | — | Monthly search volume. Nullable: a term can be worth targeting before it has reliable volume. **Gates nothing automatically** (§9.6). |
| `difficulty` | `integer` | NULL | — | KD 0–100. Same nullability, same non-gating role. |
| `intent` | `text` | **NOT NULL** | — | Closed set: `informational`, `comparison`, `transactional`, `navigational`. Enforced by CHECK. Closed for the same reason `FACETS` is closed — an open vocabulary gets invented variants. |
| `source` | `text` | NOT NULL | `'kwfinder'` | Provenance of the metrics. A number without a source is not a measurement. |
| `studied_at` | `date` | NOT NULL | *(none)* | When the research was done. Volume and KD decay. No default — the inserter must state it. |
| `entity_type` | `text` | **NOT NULL** | — | **Matching key.** One of `ENTITY_TYPES`. |
| `entity_slug` | `text` | **NOT NULL** | — | **Matching key.** Produced by the same `entitySlugFor` the coverage module uses. |
| `facet` | `text` | **NOT NULL** | — | **Matching key.** One of `FACETS`. |
| `priority` | `integer` | NOT NULL | `100` | Tie-break among eligible matches. Lower = sooner. |
| `match_count` | `integer` | NOT NULL | `0` | **Rotation control (§2.3), capped at 1.** Also the usage record. |
| `last_matched_at` | `timestamptz` | NULL | — | **Audit only.** No longer a cooldown input. |
| `is_active` | `boolean` | NOT NULL | `true` | Retire a term without deleting its research. |
| `notes` | `text` | NULL | — | Why this term was chosen. |
| `created_at` | `timestamptz` | NOT NULL | `now()` | |
| `updated_at` | `timestamptz` | NOT NULL | `now()` | |

**The three matching columns are the whole design.** `(game_slug, entity_type,
entity_slug, facet)` is *exactly* the shape `deriveTuple()` returns. Matching is a
lookup, not an inference.

**All three are NOT NULL by decision.** A row that cannot match is *research*, and
research lives in the Mangools CSVs. **This table holds only actionable targets.**
Simpler than a compound CHECK and the same guarantee.

**Indexes:** `(game_slug, entity_type, entity_slug, facet)` for the match;
`(game_slug, is_active, match_count)` for eligibility ordering.

### 1.1 Second table: `keyword_match_log`

An audit record that is queryable rather than log-only — logs alone repeat the
"logged where nobody reads" failure that hid the dexter defect for 33 days.

| column | type | null | why |
|---|---|---|---|
| `id` | `uuid` | NOT NULL | PK, `gen_random_uuid()` |
| `created_at` | `timestamptz` | NOT NULL | `now()` |
| `game_slug` | `text` | NOT NULL | game-standard, always |
| `feed_item_id` | `uuid` | NULL | set post-insert; NULL if the article never published |
| `keyword_id` | `uuid` | NULL | the matched term; NULL on a no-match record |
| `entity_type` / `entity_slug` / `facet` | `text` | NULL | the derived tuple; NULL when unclassified |
| `outcome` | `text` | NOT NULL | `applied` / `no_match_unclassified` / `no_match_no_term` / `no_match_capped` / `rejected_reclassify` / `rewrite_failed` |
| `original_headline` | `text` | NOT NULL | what pass 1 wrote |
| `final_headline` | `text` | NOT NULL | what published (equals original unless `applied`) |

**`outcome` is a closed set and it is the point of the table** — it makes "nothing
matched today" and "the feature is broken" different rows, not the same silence.

---

## 2. The topic-matching model

The old design matched keyword → editor. **That is backwards** and is why it is being
deleted rather than revived: it made a keyword an *assignment*, which is
keyword-as-gate by construction.

This design matches **ARTICLE TOPIC → keyword**, and it can, because classification
happens on the **finished** article.

### 2.1 How the topic is derived

Reuse `deriveTuple(row, vocab)` from `lib/coverage.js` **unchanged**. Confirmed
read-only:

- it reads **`row.headline` only** (its own comment explains why the slug is excluded);
- it returns either `{ unclassified: true, reason, … }` or
  `{ game_slug, entity_type, entity_slug, entity_name, facet, role }`;
- it requires **both** a confident entity **and** a confident facet — *"A confident
  entity with no confident facet is NOT a tuple"*;
- `loadVocabulary(supabase, gameSlug)` is already game-scoped.

**No new topic machinery.**

### 2.2 The matching rule — concrete, not a vibe

An article **fits** a keyword when **all four** hold:

1. `deriveTuple` returns a **classified** tuple;
2. a `keyword_targets` row exists with **`game_slug` = the article's game_slug**;
3. that row's `entity_type`, `entity_slug` and `facet` **all equal** the tuple's;
4. the row is `is_active = true` **and** `match_count = 0` (§2.3).

**Exact equality on all three matching columns. No fuzzy matching, no scoring, no
nearest-neighbour.** A near-match would frame an article toward a term it does not
answer, which is the failure mode that makes keyword SEO dishonest. **Exact or
nothing.**

Tie-break among qualifying rows: `priority` ASC, then `volume` DESC NULLS LAST,
`LIMIT 1`.

### 2.3 Rotation is a CAP, not a cooldown

> **`match_count` is capped at 1. A term that has framed one article is out of
> rotation permanently — not until a timer expires.**

**Why a cooldown was wrong.** A repeat match is a second page targeting the same query.
That is **self-cannibalization — the exact disease Gate 2 of the Operating Doctrine
kills — recreated at the headline layer.** At this domain authority the canonical for a
query should be **one reference page**, not a rolling series of framed articles.

**A term returns to rotation ONLY if its framed article is consolidated or killed by
the measurement loop.** That is a deliberate human/measurement action, never a timer.
Re-entry is performed by resetting `match_count` to 0 as part of that consolidation.

`last_matched_at` is retained **for audit only** and is no longer an eligibility input.

---

## 3. The two-pass flow

### Pass 1 — unchanged

`callEditor()` generates `headline` + `body` in one tool call. **No keyword exists in
this context. Nothing in this design touches pass 1.**

### 3.1 Ordering — settled, and it moves an existing call

**CONFIRMED READ-ONLY: `coverage_shadow` stores the headline TEXT**
(`lib/coverageShadow.js:271`, `headline: headline`) **and derives
`dup_unigram_tokens` / `dup_bigram_tokens` / `dup_rare_tokens` from it.** It is not
tuples-only.

> **DECISION: `logCoverageShadow` MUST run AFTER the rewrite, still before the insert.**
> At its current position (`route.js:745`) it would persist a headline that never
> publishes and tokenise phantom text, corrupting every future duplicate comparison
> against a string not on the site.

Final order inside the cron cycle, all before the insert:

```
1. pass 1            generate headline + body            (no keyword present)
2. classify          deriveTuple(original headline)
3. look up           match on (game_slug, entity_type, entity_slug, facet)
4. pass 2  [if match] rewrite the headline
5. guard   [if rewritten] deriveTuple(new headline) -> must equal step 2's tuple
6. shadow log        logCoverageShadow(FINAL headline)   <- moved from position 1.5
7. slug              generateSlug(FINAL headline)
8. insert            feed_items
9. post-insert       keyword_targets.match_count++ / last_matched_at; match-log row
```

Steps 2 and 5 both call `deriveTuple`, which is cheap and pure.

### 3.2 Pass 2 — the rewrite, ONLY on match

A second model call whose **entire output is one string: the new headline.**

**MAY see:** the original headline, the matched keyword, the shared `HEADLINE_RULES`
block, and **the finished body (read-only, for factual fidelity)**.

Showing the body is safe **because the body is immutable at this point** — the keyword
cannot influence prose that already exists. It is included so the rewritten headline
cannot claim something the article does not support.

**MAY change:** `headline` — nothing else.

**FROZEN:** `body`, `tags`, `ce_score` / `grid_pulse` / `mood_score` / all grades,
`editor`, `source`, `thumbnail`, `source_url`, `game_slug`.

**`slug` re-derives from the final headline** via the existing `generateSlug(...)`.
It is not frozen; it is *downstream*, and step 7 above fixes the ordering. Because the
article has not been inserted yet, **no published URL ever changes** — there is no
redirect problem.

### 3.3 The re-classification guard — mechanical enforcement of "frame, don't change the subject"

> **After the rewrite, re-run `deriveTuple` on the NEW headline. It MUST return the
> SAME tuple that was matched on. On any mismatch — different entity, different facet,
> or newly unclassified — DISCARD THE REWRITE, keep the original headline, and record
> `outcome = 'rejected_reclassify'`.**

This is the structural check that a "framing" rewrite has not silently retargeted the
article at a different subject. Without it, "frame, don't change the subject" would be
a prose instruction — precisely the kind this codebase has learned not to trust.

It is cheap (one pure function call) and it fails safe (keeps the original).

### 3.4 Cost

**Exactly one extra model call per article, and only when a keyword matches.** Under
the §2.3 cap, each term can trigger this at most once, so the cost is bounded by the
number of studied terms, not by the number of articles.

### 3.5 Failure mode — fail-open, always

> **If the rewrite call fails, times out, returns malformed output, returns a headline
> violating the length rules, or fails the §3.3 guard: KEEP THE ORIGINAL HEADLINE and
> publish.**

Publication is never blocked. The article was complete and publishable before pass 2
ran. **A keyword-framing failure must never cost an article** — but unlike the dead
code it replaces, it must never fail *silently* either (§6).

### 3.6 Post-insert row update — ordering matters

> **`match_count++` and `last_matched_at` are written AFTER the `feed_items` insert
> succeeds. Never at match time.**

If the insert fails after a match, **no cap is burned on an article that never
published** — the term stays eligible for the next cycle. The `keyword_match_log` row
is written in the same post-insert step, carrying the real `feed_item_id`.

### 3.7 No match is the default, and it is not a failure

> **On no match — for ANY reason — the headline is left EXACTLY as the editor wrote
> it, the article publishes unchanged, and nothing is logged as an error.**

Normal no-match reasons: the article is `unclassified`; no studied term for that tuple;
the only matching term is capped; the game has no keyword rows.

**Expected steady state is that most articles do not match.** The vocabulary spans
6 entity types × 8 facets and the keyword store is sparse by design. **A system in
which most articles matched would mean the matcher is too loose.**

---

## 4. HEADLINE RULES dedup — prerequisite

**Confirmed read-only.** Five blocks at `lib/editorCore.js:340, 406, 476, 542, 590`,
**14 lines each, all five sha256 `426fc9c6b18d7ae8` — BYTE-IDENTICAL.**

**No divergence to resolve.** Safe to collapse into one exported constant.

**This is a PREREQUISITE commit, before any keyword work touches the block**, because
pass 2 must inject the same rules pass 1 used. If the two passes enforced different
headline rules they would disagree about what a good headline is.

**Verification:** assert the assembled prompt strings for all five editors are
byte-identical before and after extraction. A pure refactor with a provable no-op —
same shape as `c852b9a`.

---

## 5. Game-agnostic enforcement

**Every layer is keyed on `game_slug`:**

| layer | how it stays standard |
|---|---|
| the table | `game_slug` **NOT NULL, no default** |
| vocabulary | `loadVocabulary(supabase, gameSlug)` — already game-scoped |
| classification | `deriveTuple` carries `game_slug` onto the tuple |
| the match | filtered on the **article's** `game_slug`, never a literal |
| the cron | `PRODUCING_GAME_SLUG` already threads to `insertData.game_slug` |
| the match log | `game_slug` NOT NULL |

**No Marathon literal anywhere in the mechanism.**

**Onboarding a new game:** insert `keyword_targets` rows with the new `game_slug`.
**Zero code change.** A game with no rows no-matches every article and publishes
unchanged — the safe default, not an error.

### 5.1 ⚠️ The seam that is NOT yet standard — flagged, not fixed

**`lib/coverage.js:161` `loadVocabulary` branches on
`var isMarathon = gameSlug === 'marathon'`**, passing `null` ("load defaults") for
shells and modSlots on Marathon and `[]` on every other game.

**A non-Marathon game therefore gets an empty shell/mod vocabulary**, and `deriveTuple`
cannot classify a shell- or mod-topic article for it. **Pre-existing limitation of the
coverage module, not introduced here** — but it means "insert rows and it works" holds
fully only for the DB-driven entity types (weapons, maps, modes, events).

Recorded as the one place the mechanism is not yet game-standard. Fixing it belongs to
the coverage module, not this feature.

### 5.2 DMZ — not the right instrument at launch

**DECISION: do NOT insert DMZ `keyword_targets` rows at launch.** Two independent
reasons, and the distinction between them matters:

1. **DEMAND (the primary reason).** Prior research found DMZ head terms closed
   (KD 41–45) and pre-launch demand thin (~1,600/mo). **The launch prize is
   entity-page indexing** — keys, POIs, missions, economy items — not article
   keywords. Effort spent framing DMZ articles is effort not spent on the thing that
   actually wins.
2. **CURRENT ENUM SHAPE (secondary, and temporary).** `ENTITY_TYPES` is presently
   `shell, weapon, mod_slot, map, mode, event`. DMZ's prize entities — keys, POIs,
   factions — mostly do not classify under it yet.

> **This is NOT a permanent structural bar. `ENTITY_TYPES` is a text set that will grow
> when DMZ entity pages are built, independently of this feature.** The honest framing
> is **"not the right instrument for DMZ at launch,"** not *"DMZ cannot classify."*
> The mechanism is game-agnostic and will serve DMZ the day the demand and the entity
> vocabulary justify it.

---

## 6. Guardrails and observability

**The dead code failed silently for months behind a bare
`catch (err) { return null; }`. That must not recur.**

### 6.1 Distinguish "no match" from "broken"

Two conditions that look identical from outside and must never share a code path:

- **NO MATCH** — normal, expected, common. Recorded in `keyword_match_log` with the
  specific `outcome` (`no_match_unclassified` / `no_match_no_term` /
  `no_match_capped`). Info level.
- **BROKEN** — the table is unreachable, the query errored, the vocabulary failed to
  load. **Logged as an ERROR naming the cause.** Never swallowed.

> **RULE, inherited directly from the verification arc: a bare `catch` that returns a
> falsy "no result" is FORBIDDEN in this system.** Errors and empty results are
> different facts and get different code paths — the same separation as
> `verificationState`'s BROKEN CALLER vs blank-source branches, which were verified
> disjoint by count rather than by inspection.

### 6.2 Rotation — the cap

Eligibility is `match_count = 0` (§2.3). Never a timer. `last_matched_at` is audit
only. Re-entry happens only through consolidation by the measurement loop.

### 6.3 Per-run heartbeat — the "is it alive" signal

**Every cron cycle emits one summary line even when nothing matches:**

```
[keyword] game=marathon articles=5 classified=3 matched=1 rewritten=1
          rejected=0 failed=0 store=reachable(42 active, 7 stale)
```

- **`store=reachable(N active, S stale)` is the liveness signal.** `matched=0` with
  `store=reachable(42 …)` means *"nothing fit today"* — healthy.
  **`store=UNREACHABLE` means the feature is dead again**, and it says so every run
  rather than waiting months for someone to notice.
- **`stale=S`** counts active terms whose `studied_at` is older than ~6 months
  (§9.10). Terms are **flagged, never auto-stopped** — a stale term is still a real
  term; only its metrics have decayed.

### 6.4 Auditability

Every match attempt writes a `keyword_match_log` row (§1.1) — article, tuple, keyword,
both headlines, and the closed-set `outcome`. Queryable, not log-only.

---

## 7. Commit sequence

Dependency order, each independently verifiable, each its own gated diff.

| # | commit | verification | who |
|---|---|---|---|
| **(a)** | **Delete the dead `seo_keywords` code** — `getTargetKeyword`, `consumeKeyword`, the injection at `:1214-1225`, `_seo_keyword_id` at `:1264`, cron wiring at `:758-762` | zero references to `seo_keywords` / `consumeKeyword` / `_seo_keyword_id` remain; generation output byte-identical before/after (the code is inert, so provably a no-op) | me |
| **(b)** | **Extract `HEADLINE_RULES` to one constant** | assembled prompt for all five editors byte-identical before/after (§4) | me |
| **(c)** | **DDL: `keyword_targets`** | read-back: columns, types, nullability, defaults, CHECK on `intent`, indexes match §1 | **you** |
| **(c2)** | **DDL: `keyword_match_log`** | read-back per §1.1; `outcome` CHECK matches the closed set | **you** |
| **(d)** | **Matching + rewrite pass + error/empty separation** | see below | me |
| **(e)** | **Observability** — heartbeat, stale count | heartbeat emits on a zero-match run; an unreachable store logs ERROR and does not throw | me |

**(d)'s verification list — all required:**

1. before-state guard: **no rewrites occur** (no table, or no matching rows);
2. synthetic **matched**, **unmatched**, and **error** cases;
3. unmatched articles **byte-identical end-to-end** vs today;
4. **frozen-fields assertion** — body, tags, all scores unchanged across a rewrite;
5. **re-classification guard** (§3.3) — a synthetic rewrite that changes the tuple is
   REJECTED and the original headline kept;
6. **post-insert ordering** (§3.6) — a simulated insert failure after a match leaves
   `match_count` unchanged;
7. **shadow-log ordering** (§3.1) — `coverage_shadow.headline` equals the FINAL
   published headline, not the pre-rewrite one;
8. **error-vs-empty separation** (§6.1) — an unreachable store logs ERROR; a genuine
   no-match does not.

**The error-vs-empty separation stays in (d), not (e).** It is not observability
polish — it is the guardrail that stops (d) shipping as another silent no-op. (e) adds
the heartbeat and stale count on top.

**(a) and (b) are independent of everything else** and can land immediately; (b) is a
prerequisite only for (d).

---

## 8. Facts confirmed read-only for this design

- **`seo_keywords` does not exist.** Not in the PostgREST spec; a direct select returns
  *"Could not find the table 'public.seo_keywords' in the schema cache."* The code path
  is fully built and has never once executed its intended branch.
- **Five `HEADLINE RULES` blocks, 14 lines each, all sha256 `426fc9c6b18d7ae8`** —
  byte-identical.
- **`deriveTuple`** reads `row.headline` only; returns a classified tuple or
  `{unclassified, reason}`; requires both entity and facet.
- **`FACETS`** = `counter, build, tier, guide, news, community, economy, lore`.
  **`ENTITY_TYPES`** = `shell, weapon, mod_slot, map, mode, event`.
- **`loadVocabulary(supabase, gameSlug)`** is game-scoped but branches on `isMarathon`
  for shells/modSlots (§5.1 seam).
- **`coverage_shadow` STORES THE HEADLINE TEXT** (`coverageShadow.js:271`) plus
  `dup_unigram_tokens`, `dup_bigram_tokens`, `dup_rare_tokens` derived from it —
  which is why §3.1 moves the call after the rewrite.
- **`coverage_registry`** columns: `id, game_slug, entity_type, entity_slug, facet,
  coverage_kind, ref_url, feed_item_id, created_at` — tuples only, no text.
- **The cron seam** exists at `route.js:745-752` — after generation, before insert.
- **`title`, `H1` and `slug` all derive from the single `headline` field**; the meta
  description derives from `body` via `buildMetaDescription`. So framing the headline
  reaches title, H1, OG, Twitter and slug — and **not** the meta description, which
  stays purely body-derived. Consistent with the lens boundary.

**Needs confirmation before build:** whether `gen_random_uuid()` is available in this
Postgres (other tables use `uuid` PKs, so almost certainly, but unverified for this
design).

---

## 9. Decisions log

What was chosen, and why. No open questions remain.

| # | decision | reasoning |
|---|---|---|
| 1 | **Table named `keyword_targets`** | not `seo_keywords` — that name belongs to the dead implementation and invites reviving the wrong model |
| 2 | **`intent` is a closed, enforced set** — `informational` / `comparison` / `transactional` / `navigational`, NOT NULL + CHECK | open vocabularies get invented variants (the reason `FACETS` is closed). **Noted: most game-intel content is `informational`, so this column may earn little** — it is cheap to carry and expensive to retrofit |
| 3 | **The rewrite pass SEES the body** (frozen), with the §3.3 re-classification guard as a second belt | factual fidelity; safe because the body is immutable by then. The guard is the mechanical backstop, not the prose instruction |
| 4 | **Rotation is a CAP at 1, not a cooldown** | a repeat match is self-cannibalization at the headline layer — Gate 2's disease. **Revisit with GSC data**, not on a timer |
| 5 | **`keyword_match_log` is a table**, same DDL step as (c) or its own (c2) | log-only repeats the unread-log failure that hid the dexter defect for 33 days |
| 6 | **`volume` / `difficulty` are human decision-support only** | they inform which rows a human inserts; **nothing automated reads them**. Automating a KD threshold would make the machine choose topics — keyword-as-gate by the back door |
| 7 | **The three matching columns are NOT NULL** | a row that cannot match is research, and research lives in the Mangools CSVs. This table holds only actionable targets. Simpler than a compound CHECK, same guarantee |
| 8 | **Long-form editors only** | all five share the assembly path, but a rewrite pass on short feed items is poor value for the extra call |
| 9 | **No DMZ rows at launch** | **demand** (closed head terms, thin pre-launch volume, entity-page indexing is the prize) **plus** current `ENTITY_TYPES` shape. **Not a permanent bar** — see §5.2 |
| 10 | **Stale terms are flagged, never auto-stopped**; `stale=N` joins the heartbeat | a stale term is still a real term; only its metrics decayed. Auto-stopping would silently shrink the store with no signal |
