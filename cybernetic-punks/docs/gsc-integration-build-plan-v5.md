# GSC Integration — Build Plan v5 (BUILD DOCUMENT)

Supersedes v1 (projection), v2, v3, v4. v5 is written against **facts that now
exist in code** rather than assumptions: the games registry was unified
(`b5c8bdf` arc) so `status` and `launch_date` are real fields, and the
multi-game audit answered the URL-attribution question (`3bf880c`/`22072c6`).

v4's schema had **no `game_slug` anywhere** — drafted through four versions and
three reviews without it, because GSC "felt infrastructural." That is corrected
here: game attribution is load-bearing from the first table.

Repo: Kreeped-US/cybernetic-punks-homepage. Next.js / React, Supabase (prod
ref vgtupaioekklyjupnpmp), Vercel, daily cron 19:00 UTC (noon PDT). Workflow:
planning chat writes briefs -> Claude Code executes gated diffs -> FF-merge to
main only; operator runs DDL in Supabase.

**HANDOFF currency applies:** every commit below carries its own HANDOFF entry
(rule 1); the DDL steps have no git trail and must be recorded in the next
repo-touching commit (rule 2).

---

## WHY

The site's strategy is search authority, and the app has no impression, click,
or index-state tracking. GSC data has only ever arrived as a manual export —
the /intel prune ran on a hand-downloaded Pages.csv, and that single export
produced the strategic finding that tools and entity pages rank while articles
mostly do not. This converts the measurement cadence from manual ritual into
standing infrastructure.

**Cost: effectively $0, structurally.** Both APIs are free and quota-limited
rather than billed (no billing account attaches). Zero Anthropic model calls.
A few HTTP requests on a cron already running. Storage in the low megabytes.
It REPLACES a cost: first-party rank tracking is a chunk of what SaaS charges
monthly for.

**Dependency note:** do NOT install the `googleapis` meta-package — enormous
for one endpoint. Use `google-auth-library` (small, handles the SA JWT flow)
plus plain `fetch` against the REST endpoints.

---

## THE CONCEPTUAL CORRECTION (recorded, not silently fixed)

v1 claimed this gives "watching indexing happen." **WRONG.**

**Search Analytics only shows a page once it is earning impressions — that is
RANKING, downstream of indexing.** A page can be indexed and drawing zero
impressions, and Search Analytics shows nothing, indistinguishable from
not-indexed-at-all.

- URL Inspection -> **are we INDEXED** (coverage state per URL)
- Search Analytics -> **are we RANKING** (impressions/clicks/position/CTR)

Two APIs, two questions. This is why Consumer C exists and why it comes early.

---

## THE SEQUENCING ASYMMETRY (why C precedes the read path)

**Search Analytics history is BACKFILLABLE** — skip a month of building the
read path and the data is still in Google's API (~16 months available).

**Index state is NOT.** URL Inspection reports only the present. Every week
without it running is transition history permanently gone.

**153 pages were noindexed on 2026-07-23** (12 duplicates in Phase 1, 141
news-shaped in Phase 2) and they are leaving Google's index RIGHT NOW. Watching
that happen is time-sensitive; the kill/fix/reinforce lists read backfilled
data and lose nothing by waiting two weeks.

---

## WHAT CHANGED IN v5 (the two facts that now exist)

### 1. Game attribution is SOLVED — the prefix rule

The multi-game audit established: **a URL determines its game by prefix.**

```
game_slug = url.startsWith('/dmz/') ? 'dmz' : 'marathon'
```

**It must be COMPUTED AND STORED at write time, not derived at read time.**
Reason: tool and entity pages (`/leaderboard`, `/stats`, `/uniques`,
`/uniques/misery-disciple`) never join `feed_items`, so a join cannot attribute
them — and **those are the pages that actually rank.** Dropping them from
attribution would lose exactly the wrong rows.

**FLAGGED TO THE DECISIONS LIST, not a blocker:** the `else -> marathon` clause
bakes in the root-namespace asymmetry (Marathon at root, DMZ namespaced). Fine
at two games; at game three it forces either a namespaced newcomer while
Marathon keeps privileged root paths, or a Marathon migration with redirects on
the most-indexed URLs. Cheaper to decide at two games than at four.

### 2. The kill line can now be written honestly

The registry unification (`d1efd61`) added real fields:

```js
getGameConfig('marathon') -> { status: 'live',       launch_date: null }
getGameConfig('dmz')      -> { status: 'pre-launch', launch_date: '2026-10-23' }
```

**The two-clock rule, now implementable:**
- A **90-day REVIEW** trigger and a **~6-month KILL** line while authority is
  low.
- **For pre-launch games the clock starts at `launch_date`, not at publish.**
  A DMZ canonical built in August must NOT appear on a kill list in November
  for having had zero impressions before October 23.
- **`marathon.launch_date` is `null` — and null means "live game, clock runs
  from publish," NOT "missing value."** The query must handle it as a
  legitimate state, not a data gap. This is the single most likely place to
  introduce a false-kill bug.
- `status` also gates behaviour: a `maintenance` game (Marathon, ~Sept 2026)
  has different expectations than a `live` or `pre-launch` one.

---

## THREE CONSUMERS

- **Consumer A — PAGE-LEVEL search analytics.** Impressions/clicks/CTR/position
  per URL. Powers the prune's impressions-rise test and the decision layer.
- **Consumer C — URL INSPECTION (index coverage).** Per-URL index state.
  Immediate job: verifying the 153-page prune. Permanent job: the doctrine's
  30-day indexation check. **Comes before the read path.**
- **Consumer B — QUERY-LEVEL (keyword sourcing).** First-party demand data
  alongside KWFinder for seeding `keyword_targets`. DEFERRED — the doctrine's
  Gate 1 loop. When built, pull `page+query` as the dimension PAIR.

---

## RESOLVED FACTS (from prior review passes)

**Auth — service accounts work. The trap is property TYPE.**
- Create the SA in Google Cloud, enable the Search Console API, add the SA's
  email as a user in Search Console -> Settings -> Users and permissions.
  "Restricted" suffices. No OAuth consent flow.
- **THE TRAP:** `siteUrl` must match the property form EXACTLY. Domain property
  = `sc-domain:cyberneticpunks.com`; URL-prefix = `https://cyberneticpunks.com/`.
  The wrong form returns a permissions error that LOOKS LIKE auth failure.
  **[CONFIRM] property type before writing the fetch.**
- **Vercel credentials:** store `client_email` and `private_key` as TWO
  SEPARATE env vars; normalize `\n` at read time. Do NOT base64-stuff the JSON.

**Quota — a non-issue.** 25,000 rows max per request (default 1,000),
paginated via `startRow`; 50K rows/day per search type. Google's own
recommended pattern is a daily query for one day of data. **DECISION: daily,
on the existing cron, fail-open.**

**Freshness.** `dataState=final` carries the ~2-3 day lag. `dataState=all`
includes the most recent 1-2 days marked fresh. **Hourly data exists** (HOUR
dimension, `dataState=HOURLY_ALL`, up to 10 days, hours-late). **Parameterize
`dataState`** — `final` steady-state, `all`/hourly for the launch window.

---

## STORAGE

**gsc_page_metrics** (time-series, naturally sparse):
- `date`, `page_url`, **`game_slug` (NOT NULL, NO DEFAULT)**, `slug`
  (nullable), `clicks`, `impressions`, `ctr`, `position`, `data_state`,
  `fetched_at`.
- **`game_slug` NOT NULL with NO DEFAULT** — this is the whole lesson of the
  16-table default-removal arc landed today. A default would silently
  attribute DMZ rows to Marathon. Computed at write time via the prefix rule.
- **UNIQUE CONSTRAINT ON (date, page_url) — REQUIRED.** The trailing-window
  upsert resolves conflicts against a unique index; without it the re-fetch
  INSERTS DUPLICATES instead of updating.
- **[SCHEMA NOTE] GSC dates are property-timezone (Pacific) days.** Comment
  this on the date column before someone joins it against UTC timestamps.
- Join to `feed_items` BY SLUG where possible (~99% for articles: the manual
  join hit 688/692). **Record ALL URLs; leave tool/entity pages un-joined but
  STILL STORED with their computed `game_slug`.**
- RLS enabled, no policies (cron is service-role).

**gsc_pull_log** (load-bearing):
- One row per run: window requested, rows fetched, `newest_date_returned`,
  `data_state`, status, `started_at`/`finished_at`, error.
- **WHY:** the metrics table is sparse, so a page missing on a date means zero
  impressions ONLY IF THE PULL RAN. Without the log, absence and zero are
  indistinguishable. Same discipline as `store=UNREACHABLE` vs `no_match`.
- **STALL DETECTOR:** log loudly when `newest_date_returned` stops advancing
  for >4 days (a 2025 incident stuck the `final` pointer for days).

**gsc_url_inspection** (Consumer C):
- `url`, **`game_slug` (NOT NULL, NO DEFAULT)**, `coverage_state`,
  `indexing_state`, `verdict`, `last_crawl_time`, `inspected_at`.
- **APPEND A ROW PER INSPECTION — do not overwrite-latest.** "When did Google
  process the noindex" is a question about TRANSITIONS.

---

## PHASING

- **(0) CONSOLE CHECKS — no code, ~5 minutes.**
  1. [CONFIRM] property type (Domain vs URL-prefix) -> determines `siteUrl`.
  2. Create the SA, enable the Search Console API, add as a Restricted user.
  3. [CONFIRM] current URL Inspection quota (~2,000/day expected).

- **(1) DDL (operator-run — NO GIT TRAIL, record per HANDOFF rule 2):**
  `gsc_page_metrics` (with the unique constraint, `game_slug` NOT NULL no
  default, and the Pacific-timezone comment), `gsc_pull_log`,
  `gsc_url_inspection`. RLS enabled, no policies, all three.

- **(2) Auth + fetch module:** authenticate via SA (`google-auth-library` +
  `fetch`); call `searchanalytics.query` with dimension=page; `dataState`
  PARAMETERIZED; paginate via `startRow`. **Verified by a dry-run fetch that
  logs row counts WITHOUT writing.**

- **(3) Storage wire + BACKFILL.**
  - **BACKFILL FIRST:** request from **2026-02-01** (domain from late February,
    first articles 2026-03-07 — GSC's 16-month window exceeds the site's age,
    so "full history" and "since launch" are the same pull). Dimensions
    `date,page`, `dataState=final`, paginated. Delivers the ENTIRE pre-prune
    baseline on day one — **including the period before the 153 pages were
    noindexed on 2026-07-23**, which is exactly the baseline the
    impressions-rise test needs.
  - Ongoing: upsert on a **trailing ~5-day window** keyed on
    `(date, page_url)`; **compute `game_slug` via the prefix rule at write
    time**; slug-join to `feed_items` where matched; write a `gsc_pull_log`
    row per run.
  - **MONTHLY RECONCILIATION:** a ~35-day trailing pull once a month.
  - Verified: row counts match the fetch, join hit-rate reported, **every row
    has a non-null `game_slug`**, NO `feed_items` rows mutated.

- **(4) Cadence:** daily on the existing cron. **Fail-open** — a failed GSC
  pull logs loudly and must NOT break the generation cron.

- **(5) Consumer C — ACTION-DRIVEN TIER (before the read path).**
  - **Action-driven, always:** newly published pages until confirmed indexed;
    **newly noindexed pages until confirmed removed — the 153 from
    2026-07-23 are the first cohort.**
  - Append a row per inspection so transitions are visible.

- **(6) Consumer A read path — DECISIONS-DUE LISTS, not a dashboard.**
  Three standing queries, **all game-scoped** (a mixed-corpus list is noise —
  a two-week-old DMZ page and a five-month-old Marathon page have different
  fair expectations):
  - **KILL line — TWO CLOCKS, from the registry.** 90-day review trigger,
    ~6-month kill while authority is low. Clock starts at
    `getGameConfig(game_slug).launch_date` for `status='pre-launch'` games;
    **`launch_date: null` on a `live` game means clock-runs-from-publish, NOT
    a missing value.** Thresholds as NAMED CONSTANTS.
  - **FIX line:** impressions with sub-1% CTR. **Also the truncated-title
    detector** — instruments the 65-vs-60 headline ceiling tension directly.
  - **REINFORCE line:** position 5-15.
  - `status` gates expectations: `maintenance` (Marathon ~Sept) differs from
    `live` and `pre-launch`.

- **(7) Consumer C — ROLLING SWEEP.** Sweep the **INDEXED** set, not the
  corpus. Post-prune that is ~745 pages (898 minus the 153 noindexed) plus
  tool/entity pages. ~100/day cycles it in ~8 days. **Rate as a named config
  constant** — tunable, not architectural.

- **(LAUNCH) DMZ canonicals daily + hourly `dataState`**, on a Consumer C
  proven for two months.

- **(LATER) Consumer B:** `page+query` dimension pair + the
  queries-driving-impressions-where-we-rank-poorly report.

---

## REMAINING RISKS

1. **[CONFIRM] property type** — the most likely time-waster.
2. **[CONFIRM] URL Inspection quota** — sizes the tiered loop.
3. **Private-key newline handling** — separate env vars + `\n` normalization.
4. **Missing unique constraint** would silently duplicate rows on every
   trailing re-fetch.
5. **Sparsity/absence ambiguity** — every consumer MUST read `gsc_pull_log`
   alongside the metrics or it will misread a missing pull as zero traffic.
6. **Pacific-timezone dates** — a real join hazard against UTC timestamps.
7. **KILL-LINE CLOCKS — the one place this can silently violate the doctrine.**
   If `launch_date` and the two thresholds are not encoded as parameters, the
   query false-kills pre-launch pages. **And `null` must be handled as
   live-game-clock-from-publish, not as a data gap.**
8. **`game_slug` computed at write time** — if a future route pattern breaks
   the prefix rule (a shared path serving both games), attribution silently
   degrades. The rule is correct today; it is not eternal.
9. **Scope discipline:** a targeted pull of search-performance and index-
   coverage data. Does NOT replace GSC's UI or rebuild Google Analytics.

---

## WHAT THIS UNLOCKS

- **The prune becomes verifiable rather than inferred** — Consumer C watches
  the 153 pages actually leave Google's index and captures the transition
  history that is otherwise lost forever.
- The impressions-rise test runs against a backfilled baseline that exists on
  day one, rather than waiting weeks to accumulate.
- The doctrine's decision layer becomes running code: indexation check, review
  trigger, fix line, reinforce line, and a kill line with FAIR CLOCKS driven
  by real registry fields rather than a date in a comment.
- **DMZ launch is properly instrumented** — URL Inspection answers "are we
  indexed," hourly Search Analytics answers "are we ranking," both within
  hours, using tools proven for two months.

---

## STATUS

Build-ready. Remaining before code:
1. Console: property type (Domain vs URL-prefix).
2. Console: create SA, enable API, add as Restricted user.
3. Console: confirm URL Inspection quota.

Then phase (1) DDL, then gated briefs per phase.

**Decisions-required (product-owner calls, not code seams):**
- The root-namespace asymmetry (`else -> marathon`) at game three.
- Sitemap segmentation (per-game sitemaps make per-game indexing observable —
  relevant to Consumer C at DMZ launch).
- Whether the rolling sweep covers tool/entity pages at the same rate as
  articles.
