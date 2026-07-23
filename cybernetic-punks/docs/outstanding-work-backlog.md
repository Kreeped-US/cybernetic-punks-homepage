# Outstanding Work — Consolidated Backlog
_As of end of session 2026-07-22/23. Written because several items existed
only in chat and would have been lost._

> ## ⚠️ STATUS — committed 2026-07-23; SEVERAL ITEMS BELOW ARE NOW DONE
> This backlog was written **early 2026-07-23, before that day's work.** It is preserved as the
> planning snapshot, but **do not read it as current** — the items below were completed that day
> (see `HANDOFF.md` for details/hashes):
>
> - ✅ **/intel prune Phase 1 (12 pages) AND Phase 2 (141 pages)** — both APPLIED, **153 total
>   noindexed**, full reverse operations recorded in HANDOFF. (§2 below is largely done; Phase 3
>   remains — see STILL OPEN.)
> - ✅ **Multi-game readiness audit** — run and committed (`3bf880c`, corrected `22072c6`).
> - ✅ **Games registry unification** — complete (`2e7b2d3`+`5b60c9d`, `b5db2bf`, `d1efd61`,
>   `b5c8bdf`): one throwing `getGameConfig`, unified `displayName`, `status`/`launch_date` fields.
> - ✅ **HANDOFF currency** — now a standing convention at the top of HANDOFF (`f876a62`).
> - ✅ **game_slug default removal, Phase 1 code** (`7e7be2e`, `8532c51`) — 4 tables fully hardened,
>   6 `SET NOT NULL`, **12 `DROP DEFAULT`s pending the cron verification** (in HANDOFF).
> - ✅ The §0 durability gaps (commit the prune-candidates doc; save the GSC plan) — done; note the
>   GSC plan is now **v5** (`docs/gsc-integration-build-plan-v5.md`), superseding the v4 this file
>   names.
>
> **STILL OPEN (as written below):** the 65→60 gate alignment · eyeball the first `applied` rows for
> drift · **prune Phase 3** (299 judgment + 82 hold) · the Vercel runtime figure · the deferred
> keyword items.

## HOW TO USE THIS
Items are grouped by arc. Each is marked:
- **[DURABLE]** — already recorded in a committed repo doc
- **[CHAT-ONLY]** — existed only in conversation before this file; MUST be
  moved into HANDOFF or a design doc to survive
- **[SANDBOX]** — exists as a file outside the repo; must be saved/committed

**FIRST ACTION: make this file durable.** Commit it (or fold it into HANDOFF)
before anything else, or the backlog itself is the thing that gets lost.

---

## 0. DURABILITY GAPS — fix these first

- [ ] **Commit `docs/intel-prune-candidates.md` if untracked.** Verify with
      `git status`. This holds the entire Phase 2 candidate list (532 edge
      cases, the duplicate clusters, the protect-list). If untracked it is one
      `git clean` from gone. **[CHAT-ONLY risk — highest priority]**
- [ ] **Save the GSC plan v4** into the repo (`docs/GSC_INTEGRATION_PLAN.md`).
      Currently only in the planning-chat sandbox. v1-v3 are superseded and can
      be discarded; v4 is the build document. **[SANDBOX]**
- [ ] **Save the session summary** into the repo or fold into HANDOFF.
      **[SANDBOX]**
- [ ] **Record the Phase 1 reverse-operation SQL in HANDOFF** — the 12 noindexed
      page UUIDs and the `UPDATE feed_items SET noindex=false WHERE id IN (...)`
      statement. Currently only in Claude Code's output and chat. Without it,
      undoing Phase 1 means re-deriving which 12 were cut. **[CHAT-ONLY]**

---

## 1. KEYWORD SYSTEM — shipped and seeded; open items

### Watch-list (time-sensitive, do these first)
- [ ] **Next cron cycle: confirm heartbeat shows `active=1`** (was `active=0`
      before the seed). Confirms the matcher sees the seeded keyword.
- [ ] **Watch for the first `applied` outcome** — fires when DEXTER next
      publishes an Assassin build article. Until then `active=1` + `no_match`
      is armed-and-waiting, NOT broken. `store=UNREACHABLE` would mean broken.
- [ ] **EYEBALL THE FIRST FEW `applied` ROWS FOR DRIFT.** **[CHAT-ONLY]**
      Option 4 removed the re-classification guard, which means what replaced
      the guarantee is **audit, not prevention** — both headlines land in
      `keyword_match_log`, so drift is *detectable* but not *prevented*.
      Manually check the first few rewrites: does the rewritten headline still
      describe what the article is actually about? Once trusted, stop checking.
- [ ] **Eyeball the admin add-row scroll fix** (`ebcaf9f`). Verified
      structurally (ref wiring, timing, `block:'nearest'`) but NOT by a live
      click, since that needs the running panel behind its password. Click
      + ADD ROW from a scrolled-down position and confirm the form scrolls
      into view rather than jumping to page top.

### Deferred build items
- [ ] **ALIGN `HEADLINE_RULES` AND THE LENGTH GATE TO 60 — TOGETHER, ONE
      COMMIT.** **[CHAT-ONLY — real gap]** Current state: the code gate is 65,
      matching `HEADLINE_RULES`' stated ceiling ("never exceed 65"). That is
      internally consistent — a gate stricter than the prompt would reject
      obedience. BUT the Operating Doctrine's Gate 4 sets titles at <=60 for
      SERP truncation, and headline drives title. So a framed headline at
      61-65 chars passes the gate and STILL TRUNCATES in Google — the exact
      CTR loss the doctrine targets. The fix is not the gate alone; it is
      moving the prompt ceiling and the code ceiling to 60 **as a pair**, so
      neither is stricter than the other. Note: the GSC read path's FIX line
      (sub-1% CTR at decent impressions) is the detector that confirms this
      worked.
- [ ] `applied_deduped` outcome — needs a CHECK constraint ALTER. Removes the
      `feed_item_id IS NULL` / failed-backfill ambiguity for framed-but-
      unpublished articles. **[DURABLE]**
- [ ] Exact `unlogged=` — thread a `framed` flag through `processEditor`'s
      return (~4 lines) so the field can name a genuine error count rather
      than a gap. **[DURABLE]**
- [ ] **(g) stale-only admin filter** — the `staleOnly` toggle on the
      keyword_targets list, following the existing `filterFaction`/
      `filterRunner` pattern (~10 lines). The shared threshold constant
      (`KEYWORD_STALE_DAYS = 90` in `lib/keywordStaleness.js`) already exists
      and both the heartbeat and the filter must read it. **[DURABLE]**
- [ ] Apostrophe slug transform — decide whether apostrophes strip or hyphenate
      (`Ravene's Call` -> `ravenes-call` vs `ravene-s-call`). Affects ZERO
      current weapons, so it is free to decide now and applies automatically to
      any future apostrophe name. Needs a redirect only if a live URL changes.
      **[DURABLE]**
- [ ] `loadVocabulary` `isMarathon` seam — non-Marathon games get an empty
      shell/mod vocabulary, so `deriveTuple` cannot classify those topics for
      them. Pre-existing coverage-module limitation, flagged not fixed.
      Degrades to no-match (safe default). Matters when DMZ needs shell-like
      entity classification. **[DURABLE]**
- [ ] `HEADLINE_RULES` game-name parameterization — the constant hardcodes
      "Marathon". Deferred; note the doc has a **label collision** (two things
      called `(b2)`: the doc's "parameterise the game name" vs the shipped leaf
      relocation `78639b9`). Worth renaming in the doc. **[DURABLE]**
- [ ] Page-gap report (Consumer B of the keyword store) — the entity-LESS
      keywords are its input; designed at a high level, not built. **[DURABLE]**
- [ ] Feed-item editors — long-form only for now; adding short-form is an
      expansion, not a redesign. **[DURABLE]**

### Seeding
- [ ] **Seed more keywords once the first `applied` fires and reads well.**
      One row is live (`marathon assassin` -> shell/assassin/build). Rotation
      caps at `match_count < 1`, so one row frames ONE article then caps —
      framing across facets needs multiple rows (build/tier/guide/counter),
      each seeded separately with its own phrasing.

---

## 2. /INTEL PRUNE — Phase 1 done; Phase 2 next

- [x] **Phase 1 COMPLETE.** 12 pages noindexed (indexed + <=1 impression +
      duplicate + not protected + not a cluster winner). Verified: 668 -> 680
      noindexed, delta exactly +12, all cluster winners still indexed, all 12
      still published with bodies intact. Fully reversible.

- [ ] **PHASE 2 — the 532 indexed unique low-reach pages.** This is a JUDGMENT
      call, not arithmetic. Revised approach **[CHAT-ONLY — the summary has the
      older age-only version]**:
      - **Bucket by article SHAPE first, then apply age within each bucket.**
        A *news-shaped* article from spring had its window and missed — cut it.
        An *evergreen-shaped* one (guide, build reference) at 3-4 months has NOT
        had a fair chance: at DA 23 ranking routinely takes 4-6 months. **Same
        publish date, opposite verdict.** An age-only cutoff would wrongly cut
        evergreen guides that just haven't ranked yet.
      - Read `docs/intel-prune-candidates.md` §4 (sorted newest-first with
        dates) to find where each bucket's fair-chance window ends.
      - Exclude protected (registry-referenced) pages regardless.
      - Same gated flow: report list -> confirm count -> approve exact number
        -> apply with a recompute-and-refuse guard.
- [ ] **PHASE 3 — hold recent low-reach uniques.** Published within the fair-
      chance window for their shape. Re-check later; if still <=1 impression
      after their window, they join the cut then.
- [ ] **MEASURE after Phase 1+2.** Watch whether surviving pages' impressions
      rise. **[CHAT-ONLY correction]** **3-4 weeks is the FLOOR, not the
      measurement window** — noindex takes Google weeks to process across
      recrawls, so reading the result earlier means concluding "nothing moved"
      when Google simply hasn't recrawled yet. Wait at least that long, THEN
      start watching. If nothing moves after a fair window, article-count was
      not the constraint — stop cutting and redirect effort to entity/tool
      pages.
      **Note:** once GSC Consumer C is running, this becomes verifiable rather
      than inferred — inspection watches the pages actually leave the index.

---

## 3. GSC INTEGRATION — approved, build-ready

Full plan: **GSC Integration Build Plan v4** (save into the repo — see §0).

- [ ] **Console check 1: property type** — Domain
      (`sc-domain:cyberneticpunks.com`) vs URL-prefix
      (`https://cyberneticpunks.com/`). Determines `siteUrl`. The wrong form
      throws a permissions error that LOOKS LIKE auth failure — the most
      likely time-waster in the whole build.
- [ ] **Console check 2:** create the service account in Google Cloud, enable
      the Search Console API, add the SA email as a **Restricted** user on the
      property (Search Console -> Settings -> Users and permissions).
- [ ] **Console check 3:** confirm current URL Inspection API quota
      (~2,000/day expected). Sizes the tiered inspection loop.
- [ ] Phase (1) DDL — `gsc_page_metrics` (**WITH the unique constraint on
      `(date, page_url)`** — without it the trailing-window upsert inserts
      duplicates instead of updating), `gsc_pull_log`, `gsc_url_inspection`.
      RLS enabled, no policies, all three. Pacific-timezone comment on the
      date column.
- [ ] Phases (2)-(7) per the v4 plan: auth+fetch (use `google-auth-library` +
      `fetch`, **NOT** the `googleapis` meta-package), storage+backfill from
      2026-02-01, daily cadence fail-open, **Consumer C action-driven tier
      BEFORE the read path** (index state is not backfillable; the 12
      noindexed pages are leaving the index now and that history is otherwise
      lost), decisions-due read path, rolling sweep of the ~898 INDEXED pages.
- [ ] **THE KILL-LINE TWO-CLOCK RULE — the one place this can silently violate
      the doctrine.** The kill query is NOT a single window: a 90-day *review*
      trigger and a ~6-month *kill* line while authority is low, and **for
      pre-launch pages the clock starts at GAME LAUNCH, not at publish.** A DMZ
      canonical built in August must NOT appear on a kill list in November for
      having had zero impressions before October 23. Requires a per-game
      `launch_date` and both thresholds as named constants.

---

## 4. STRATEGIC / NOT YET TASKS

- **The GSC finding worth carrying:** tools and entity pages rank
  (`/leaderboard`, `/uniques/misery-disciple`, `/stats`), articles mostly do
  not. Queries are entity- and tool-shaped. This empirically confirms the
  page-gap thesis and suggests content effort should favor entity/reference
  pages over article volume. Whole-site traffic is small (~140 clicks /
  ~7,900 impressions per quarter) — pre-authority, so impressions rather than
  clicks are the meaningful discriminator.
- **DMZ launch (Oct 23):** no DMZ keyword rows at launch (head terms closed,
  KD 41-45; thin pre-launch demand; entity-page indexing is the launch
  instrument). `ENTITY_TYPES` does not yet cover DMZ's prize entities (keys,
  POIs, factions) — that enum grows when DMZ entity pages are built.

---

## 5. METHOD NOTE (preserve — it is the most transferable thing here)

This session corrected ~12 planning-layer premises before they shipped: a slug
divergence that did not exist, a `deriveTuple` import cycle that did not exist,
a <=60 gate that should have been 65, a source-title classification that was
not there, an admin tab claimed missing that existed, a "10 pages" noindex
count that was arithmetic error (correct was 12), and others. **Every one was
caught by reading the actual source/tree/DB before acting** — not by the
planning layer being more careful.

The rule: **a plan drawn ahead of the code must be verified at the source per
premise, not carried on confidence.** Same family as documented-not-enforced
and asserted-not-verified. It applies hardest to live-site changes (the
noindex counts) and to anything asserting a metric exists (the "views" that
did not).
