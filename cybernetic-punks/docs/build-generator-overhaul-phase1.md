# Build-Generator Overhaul — Phase 1 Design (Fable-reviewed)

Status: DESIGN, reviewed by Fable. Ready to build on approval. Do not build ahead of the operator's go.

**Updated 2026-08-04:** incorporates Fable's goal-neutral canonical ruling and the recreated
10-column `build_pages` schema (see A1 / A2 / A6 and the RESOLVED section at the end). A1's 8
goal-neutral shell hubs are seeded; canonical `build_json` generation + the SSR/ISR route are next.

## Why (Step 0 findings, condensed)

The `/advisor` build generator is store-wired and high quality (verified `shell_stats` /
`weapon_stats` / `mod_stats` / `core_stats` / `implant_stats` / `cradle_nodes` context,
3-state confidence tags, injection-hardened LLM call) BUT it is pure client-state: every
build is LLM-generated, `no-store`, auth-gated, and has **no stable URL**. It is in the
sitemap, nav, and linked from 16 files, yet earns ~16 impressions in 5 months and ranks
for zero real build queries — because it has **no indexable build content**. Meanwhile
23 build-type queries (45 impr) flow to articles/entity pages instead.

The fix: give each build a stable, indexable URL, turning one dead page into a build-page
engine that ranks for the long tail of "[shell] [weapon] [playstyle] build" queries —
without repeating the article-over-production mistake. This is a Marathon proving ground
for a pattern we port to DMZ at launch (where build demand will be fresh and growing).

The generation ENGINE (`/api/advisor` + `fetchAdvisorContext` + prompt + JSON schema) is
reused as-is. This is an in-place evolution, not a rebuild.

---

## PART A — per-build permalinks

### A1. URL structure — goal-neutral canonical; goal/rank/experience are NOT segments

**Goal-neutral ruling (Fable, 2026-08-04): goal is NOT a page dimension.** 20/20 Marathon
build queries are bare "[shell] build" — ZERO carry a goal qualifier — so goal joins
rank/experience as an in-tool refinement, never a URL.

```
/tools/build/[shell]                        CANONICAL — goal-neutral shell hub
/tools/build/[shell]/[weapon]               weapon long-tail (demand-promoted, see A2)
```

- The canonical is the shell's build HUB: one page per shell, `(shell, goal=NULL,
  weapon_slug=NULL)`, `slug = '[shell]'`. Its build is GENERATED from the shell's
  `recommended_playstyle` free-text — no forced 4-goal mapping (so Recon's fits-no-goal
  and Vandal's mobility/aggressive split dissolve).
- **The ONE variant page-axis is WEAPON** (`/tools/build/[shell]/[weapon]`), promoted to
  its own indexable page only on GSC demand evidence (A2).
- **`goal` (4), `rankTarget` (7) and `experienceLevel` (4) are in-tool refinements, NOT
  URL segments.** They ride as query params (`?goal=aggressive&rank=gold&exp=veteran`)
  that trigger a live regen and `rel=canonical` back to the base page. Without this the
  space is 8x4x7x4 = 896 near-duplicate pages — the article-over-production mistake. With
  it, none of the three ever mint indexable URLs.
- **Register `/tools/build/` in `gameSlugForUrl`** — the unknown-prefix-fails-loudly rule:
  a new URL prefix must be registered or resolution errors rather than silently
  mis-attributing the game.
- **Uniform goal ordering in the hub UI** — the in-tool goal selector shows the same goal
  order for every shell (no per-shell "primary"), so the primary-goal fiction is not
  reintroduced through presentation.

### A2. Combination bounds — DEMAND-BOUNDED, not possibility-bounded (Fable sharpening 1)

A build page exists **only where there is plausible search intent for that specific
combination** — the indexable set is tied to real query demand, not mechanical validity.
Possibility-bounding (ranked_viable + fit matrix + top-K) would still mint ~110-130
pages, most with no searcher; that is thin-content dilution wearing a quality mask.

The valid set is therefore:

1. **DEMAND SPINE (always indexable): the 8 goal-neutral `[shell]` build canonicals.**
   Every shell has plausible "marathon [shell] build" intent; low risk, full coverage.
   These anchor the engine even before GSC data accrues. A spine row is a `build_pages`
   row with `slug = '[shell]'`, `goal = NULL`, `weapon_slug = NULL` (NULL goal = the hub,
   goal chosen in-tool; NULL weapon = canonical, the tool picks the best weapon) and
   `is_indexable = true`. **Seeded 2026-08-04: all 8 rows present** (assassin, destroyer,
   recon, rook, sentinel, thief, triage, vandal); `build_json` / `source_updated_at` are
   NULL pending the canonical generation slice.

2. **DEMAND-CONFIRMED VARIANTS (WEAPON-qualified): only where a real query maps to the
   (shell, weapon) combination.** Goal is no longer a page axis — the one variant axis is
   weapon. Determined by a `build_demand` derivation:
   - **Primary signal — existing GSC query data.** Read `gsc_query_metrics`, filter
     build-intent queries (the `/\bbuild|loadout\b/` family already surfaced: "marathon
     vandal build", "marathon sentinel build", "rook loadout", "vandal cradle build",
     ...). Parse each into a `(shell, weapon?)` tuple: reuse `deriveTuple` + vocab for the
     shell entity + `build` facet, add weapon-name matching against `weapon_stats` for the
     weapon token. (Any goal words map to the in-tool refinement, never a page.) A query
     naming a shell + weapon = demand-confirmed -> that weapon promotes to its own
     indexable page.
   - **Bounded expansion (because frozen-Marathon GSC demand is tiny).** Pure GSC would
     yield only a handful today. Expand CONSERVATIVELY and mechanically: a weapon variant
     is also admitted if the weapon is meta-prominent in the store (`ranked_viable` AND
     S/A-tier in `meta_tiers`) AND it passes the fit filter below. This is a small,
     store-grounded halo around confirmed demand — never the full permutation space.
   - **Quality filter (applies on top of demand, never instead of it).** A demand-
     confirmed or expansion weapon must ALSO be mechanically sane for the shell:
     `weapon.ranked_viable = true`; the weapon fits the shell's `recommended_playstyle`
     profile (range / ammo / handling); not contradictory with the shell kit. Demand
     gates; fit prunes.
   - **Thin guard.** Never pad. A shell hub with no confirmed/expansion weapon ships as the
     goal-neutral canonical page only, with no weapon spokes.

3. **Everything else 404s** (or 301s to the goal-neutral canonical `/tools/build/[shell]`).
   A combination not in the pre-computed demand set does not exist as a page — same
   discipline as the DUPLICATE-SUPPRESSED audit.

**Self-expanding by construction.** The `build_demand` derivation re-runs on a schedule
(cron): as GSC accrues new build queries, the demand set grows and new weapon-variant pages
generate; combinations that never attract intent never get a page. Today's Marathon set is
small (8 goal-neutral canonicals + a handful of demand-confirmed weapon variants) and grows
only with proven intent.

**DMZ note.** DMZ has no pre-launch GSC history, so seed `build_demand` from the Mangools
demand map (the recipes/loadout demand analysis) plus launch-week GSC — same mechanism,
different seed.

Hub-and-spoke: each canonical links to its demand-confirmed weapon spokes (internal-link
density + crawl paths); variants are self-canonical, cross-linked to siblings + parent.

### A3. SEO per build page (templated from combo + persisted build)

- **Title (A2, <=60):** canonical `"[Shell] Build — Marathon"` (e.g. "Assassin Build —
  Marathon", 25 chars). Variant: `"[Shell] [Weapon] Build — Marathon"`. Length-guarded
  template. No goal word — goal is not a page dimension.
- **Description (~150):** filled from the persisted build — "The best Marathon [Shell]
  loadout: [primary weapon], top mods and cores, a Cradle stat plan, and ranked notes —
  built on verified in-game stats."
- **H1:** `"[Shell] Build"` + weapon subtitle on variant pages.
- **Body = the persisted build, server-rendered** (weapons / mods / cores / implants /
  cradle / `dexter_analysis`) — real crawlable content matching the query.
- **A1:** no FAQPage schema. **A5:** surface the verified-source chain the build carries
  ("verified in-game" provenance). JSON-LD: BreadcrumbList + WebPage only.

### A4. State -> URL, and RENDER vs GENERATE separation (Fable route ruling, 2026-08-05)

**RENDER/GENERATE SEPARATION (structural — moat- and cost-critical).** Rendering a stored
build and generating a new one are SEPARATE paths that must never be conflated:
- **A static build-view component SSRs the stored `build_json`.** Crawlers and first-paint
  read persisted data and fire ZERO paid advisor calls. The SSR path *structurally cannot*
  reach the paid API — it has no code path to it — so a bot crawl or a cold visit costs
  nothing.
- **`AdvisorClient` is refactored to accept `initialBuild` and NOT auto-generate on mount.**
  Seeded with the stored build, it renders the result view immediately (server-side, then
  hydrates). It calls the live advisor engine ONLY on a user-initiated refinement (below).
- **Forward-compatible:** the same static-view + `initialBuild` structure serves the A2
  weapon-variant pages and any future premium surface with no rework.

State -> URL:
- **Selecting inputs navigates** — picking a shell (and, on demand-promoted combos, a
  weapon) router-pushes to the permalink. Using the tool lands you on a real, shareable,
  indexable URL.
- **Landing on a permalink hydrates** — the server SSRs the persisted build (crawlable) via
  the static view; the client hydrates `AdvisorClient` to that build's state WITHOUT
  regenerating.
- **REFINEMENT BOUNDARY (goal-neutral — Fable route ruling).** goal/rank/experience
  refinements stay **client-only and mint NO new URLs** — only demand-promoted WEAPON
  variants get their own URL (A2). A refinement re-runs the live advisor (the authed, paid
  call) and updates the view in place; it may reflect in query params for shareability, but
  every such variant `rel=canonical`s to the bare `/tools/build/[shell]`. Base =
  static/indexable/free; refinement = dynamic/non-indexed/paid. (This boundary is also the
  free/premium seam — see B2.)
- Fixes the Step 0 bug: "copy link" copies the per-build permalink, not generic `/advisor`.

### A5. Rendering + freshness — static WITH a store-keyed regeneration POLLER (Fable sharpening 2 + A5 ruling 2026-08-05, moat-critical)

Static generation for crawlability is correct ONLY WITH a regeneration hook keyed to the
store's `updated_at`. Serving stale verified stats is a moat violation — the build pages'
whole value is that they carry verified in-game data.

Mechanism:

- **Statically generated + ON-DEMAND revalidated — NOT time-based ISR (Fable route ruling,
  2026-08-05).** Static pre-rendering gives crawlability + speed, but revalidation must be
  keyed to the STORE, not a clock. Time-based ISR is wrong on two counts: (1) a fixed
  `revalidate` window serves stale VERIFIED stats after a patch until the timer expires — a
  moat violation, since the pages' whole value is carrying current verified data; and (2)
  it WASTES paid advisor calls regenerating builds whose store inputs never changed.
- **Store-change snapshot.** Each build row carries `source_updated_at` = MAX(`updated_at`)
  over the FIVE timestamped context tables it was built from: `shell_stats`, `weapon_stats`,
  `mod_stats`, `core_stats`, `implant_stats`. (`cradle_nodes` has no `updated_at` column ->
  excluded; `meta_tiers` is NOT a context table -- `generateBuild` never reads it, so tier
  changes never make a build stale.) Same MAX-recency pattern as the corroboration R2
  seniority work.
- **POLLER, not a write-hook (Fable A5 ruling, 2026-08-05).** Store writes come from TWO
  sources: the app (the DEXTER gather pipeline, `lib/gather/dexter-stats.js`, updates
  shell/weapon/core/implant rows) AND operator-run SQL (e.g. the 1.1.5.2 `weapon_stats`
  writes). Operator-SQL has NO app code path, so a write-triggered hook CANNOT catch it --
  a poller is the only UNIVERSAL mechanism. A cron re-runs `fetchAdvisorContext(shell)`
  (which already returns the current `sourceUpdatedAt` = MAX over that shell's actually
  -loaded rows), compares it to the stored `source_updated_at`, and for each stale build:
  re-runs `generateBuild` (the shared core) -> writes fresh `build_json` +
  `source_updated_at` + `used_sources` (below) -> calls `revalidatePath('/tools/build/[shell]')`
  so Next serves the fresh static page. This is the FIRST `revalidatePath` use in the
  codebase; on-demand revalidation busts the `revalidate:false` static cache regardless of
  the revalidate setting. The cron mirrors the fail-safe `CRON_SECRET` Bearer guard the
  other crons use (`app/api/cron/stats/route.js`).
- **REGENERATE-ALL stale, not precise-per-row (Fable A5 ruling).** `source_updated_at` is
  MAX over the WHOLE loaded context, so any store change marks every build sharing that
  context stale -> regenerate all stale builds. Deliberately SIMPLE over precise:
  simple-and-EXERCISED beats precise-and-DORMANT. Marathon is frozen, so a precise
  "which build cites which row" regen path would be untested-BY-CONSTRUCTION -- its bugs
  would first surface at DMZ launch under load. 8 cheap regen calls on a rare Marathon patch
  keeps the running pattern exercised. (Precise per-row staleness is the DMZ-scale follow-on;
  the `used_sources` capture below is exactly the data it will consume.)
- **CAPTURE USED-SOURCES AT GENERATION -- the origin rule, MANDATORY now (Fable A5 ruling,
  2026-08-05; SHIPPED fd73ea6).** Derivation facts are recordable ONLY at derivation: a
  build's provenance -- which verified store rows it was derived from -- is captured while
  generating or lost (recoverable only by a paid regeneration; the 159-null origin-loss trap
  in tool form, 3rd appearance of the rule: capture-at-origin or lose it forever).
  `build_pages.used_sources` = a jsonb array of CLOSED-SHAPE `{type, name}` tuples, the shape
  documented in a COLUMN COMMENT (the `notable_features` contract pattern).
  - SHIPPED SHAPE (settled during the build, reconciled from the earlier `{entity_type,
    slug}` sketch): `type` is a closed vocabulary of the entity KIND -- `shell | weapon | mod
    | core | implant` (NOT the table name); `name` is the canonical store `name`.
  - CITED, not loaded. The set is the rows `build_json` ACTUALLY references (shell,
    primary/secondary weapon, slotted mods/cores/implants) intersected against the loaded
    context -- NOT the ~225-row loaded candidate pool. All three consumers below need the
    rows the build USES: the loaded pool is near-identical across builds and flags every
    build on any change (useless for blast-radius / precise-staleness). ~13-15 tuples/build.
  - NORMALIZED. A `build_json` rarity suffix ("Cloudborn (Standard)") is stripped to match
    the store `name` ("Cloudborn") -- a cross-check caught a 7-of-16 silent under-capture
    (all mods + implants dropped) without it.
- **Three consumers of `used_sources` (two immediate, one eventual).** (1) ON-PAGE
  VERIFICATION STAMPS -- "derived from N verified rows, current as of patch X": the moat
  rendered AS UI. (2) BLAST-RADIUS QUERIES -- a corrected store row -> which builds cite it
  (corroboration-fix propagation, now answerable). (3) DMZ PRECISE STALENESS -- mark stale
  only builds citing a changed row, the cost control regenerate-all trades away at Marathon
  scale. jsonb NOW; promotion to a join table is a mechanical migration when DMZ makes it
  query-load-bearing -- and the data already exists, because it was captured at origin.
- **Baseline `revalidate: false`** — freshness comes from the store hook, not a clock. A
  deliberately LONG fallback window is acceptable only as a dead-hook backstop, never as
  the freshness mechanism (a short window would reintroduce both failure modes above). The
  route ships its revalidate strategy shaped for on-demand FROM DAY ONE, even though the A5
  store-`updated_at` hook itself lands as a follow-on slice.
- **Cost-gated + relaxed cadence.** Regeneration is a paid Claude call per build, so the
  poller regenerates ONLY builds where `source_updated_at < current MAX` -- the check itself
  is cheap DB reads (ZERO Claude calls when nothing changed), so it runs often at near-zero
  idle cost and pays only on real staleness. Cadence is tunable and relaxed (frozen Marathon
  rarely fires it): a daily step in the existing cron, a dedicated few-hourly cron, or tied
  to the cron's patch-detection so builds refresh right after a patch lands. Derive-don't-
  store: a store fix propagates to its dependent build pages on the next poll.

For frozen Marathon this is moot (the store is not changing), but the mechanism must be
built correctly now because it is what makes DMZ's live-data build pages correct once DMZ
generation and in-game verification are live. Do not skip it.

### A6. Sitemap

- Persist the valid set in `build_pages` (recreated + catalog-verified 2026-08-04) — the
  actual 10 columns: `id, game_slug, slug (NON-NULL identity), shell, goal (NULLABLE),
  weapon_slug (NULLABLE), build_json, source_updated_at, is_indexable, updated_at`, with
  **`UNIQUE(game_slug, slug)`** (slug non-null -> no NULL-uniqueness trap; preferred over
  `NULLS NOT DISTINCT`, works on any PG version). `goal = NULL` = goal-neutral canonical;
  `weapon_slug = NULL` = the tool picks the best weapon. The demand/publish gate is the
  **`is_indexable` boolean**, chosen over a `status` / `demand_basis` enum per the poi_type
  lesson (no CHECK'd enum on still-evolving values). There is NO `status` enum, NO
  `demand_basis` enum, and NO `published_needs_build` CHECK — the serving condition below
  carries publish state instead. (`goal` keeps a CHECK, but it **passes NULL** plus the 4
  closed enum values, so the goal-neutral hub is representable.)
- New sitemap child `/sitemap-marathon-builds.xml` (extend `computeEligible` /
  `partitionEligible`) emits ONLY rows where **`is_indexable = true AND build_json IS NOT
  NULL`** (the serving query -- "in the demand set AND generated"), `lastmod = updated_at`
  — the DB-driven eligible-set pattern the entity sitemap already uses. The raw permutation
  space never enters the sitemap; a 404'd combo cannot leak in.

---

## PART B — gating-aware, gate nothing now

### B1. FREE-FOREVER layer (crawlable SEO engine + discovery drivers — never gates)

The base build page (`/tools/build/...`): SSR build display, intro prose, breadcrumbs,
internal links; viewing any persisted/shared build by URL; navigating the pre-computed
set. This layer NEVER calls `checkFeatureAccess` — public, ISR-cacheable, crawlable.

**Discovery drivers are FREE — they are acquisition, not conversion (Fable sharpening 3).**
Anything that creates inbound links or social discovery stays free:

- **Share links / share-card image / share-to-X** — social discovery + inbound links.
- **Export / build-codes** — a build-code posted to Reddit/Discord links back = inbound
  discovery. (Moved here from the gate-able layer per the sharpening.)
- **The per-build permalink + its OG image** — they ARE the discovery mechanism.
- **Public "trending builds" PAGE**, if built — a crawlable discovery surface, so the page
  is free like any build page (only the personalized analytics behind it is gate-able,
  see B2).

### B2. GATE-ABLE layer (depth / personalization / data — no discovery value)

Only depth, personalization, and per-user data — none of which creates inbound links or
crawlable discovery — is gate-able later:

- **Save / track builds to an account** (a "my builds" library) — personalization.
- **Live refinement / advanced tuning** (goal/rank/experience knobs, free-text) — the paid
  Claude call; depth + compute. **This is the render/generate boundary from A4, and it IS
  the free/premium seam (Fable route ruling, 2026-08-05):** free = the stored canonical SSR
  pages (unlimited, crawlable, zero paid calls); premium-later = unlimited live refinement.
  The seam is structural — already present in the render/generate split — so future gating
  is a data flip on the live-refine endpoint, never a rebuild.
- **Multi-build comparison** (side-by-side) — depth.
- **Popularity DATA / personalized analytics** behind the public trending page —
  per-user/compute data (the public page itself is free, B1).
- **Personalized recommendations** (from profile) — personalization.

### B3. Structure — seams present, enforcement inert

- Each gate-able enhancement is its own endpoint/action and calls
  `checkFeatureAccess(supabase, playerId, '<feature>')` at entry (`'advisor_generate'`
  exists; future `'build_save'`, `'build_compare'`, ...).
- **Inert today:** monetization off + `override_all_free` + no `feature_gates` row ->
  ALLOW (fail-safe). Everything ships free/open.
- **Future gating = pure data:** add a `feature_gates` row + flip monetization/override.
  No rebuild. (Metered enhancements register their persistence table in
  `FEATURE_USAGE_SOURCE` for a daily cap.)
- **The base page + all discovery drivers structurally never gate**, so they are
  free-forever by construction even after any future gating — gating only ever reaches
  the depth/personalization endpoints.
- Confirmed: nothing gated now; base page + share/export free-forever-for-SEO; future
  gating is data-only on the enhancement endpoints.

---

## DMZ Premium Tier — Candidate Features (evaluate from usage; do NOT build yet)

STATUS: Everything is FREE now (`override_all_free=true`). This section banks candidate
premium features to EVALUATE from real usage data later (Phase 5-6, alongside the
popularity system) — NOT a committed spec, NOT to build now. The free tool must prove
itself first.

GUARDRAILS (non-negotiable, protect the moat):
- **Free stays GENUINELY EXCELLENT.** Premium adds depth/personalization that is real
  ADDITIONAL value — never basics artificially withheld from free. Crippling free to sell
  premium would tank SEO (the base pages must rank), trust ("no hype, just intel"), and
  the acquisition flywheel.
- **The base build pages (the SEO engine) stay free-forever-crawlable regardless.**
- **Premium ranks/uses VERIFIED builds; it never bypasses verification** (popularity !=
  correctness).
- **Design premium FROM usage data** (what people actually use/want), not speculation.

CANDIDATE features (to evaluate, not commit):
- **Personalization/persistence:** save/track builds (loadout library), build
  history/evolution, personalized recommendations from saved builds + playstyle.
- **Depth/interactivity:** advanced tuning (fine-grained mod optimization beyond the
  canonical), multi-build comparison (side-by-side), live regeneration with the user's
  constraints (the existing `advisor_generate` paid call).
- **Data/intelligence (the DMZ-specific moat premium):** popularity/meta intelligence
  ("X% at your rank run this", trends), and the STANDOUT — **PATCH-IMPACT-ON-YOUR-BUILDS**
  ("the latest patch changed these weapons in your saved builds"). This last one uses the
  verified store + patch-tracking (`patch_verified`, e.g. today's 1.1.5.2 work) + the
  user's saved builds — three things the mass-AI content flood fundamentally cannot
  replicate. Strong defensible premium candidate.

WHY LATER: premature gating kills the free flywheel; the premium spec should crystallize
from real usage + the popularity system (Phase 5-6), not be guessed now. "Improve the DMZ
free version" and "build toward premium" are the SAME work now — premium is "more of the
good thing," so making the free tool genuinely excellent IS the path to a compelling
premium tier.

---

## PART C — scope

In-place EVOLUTION, not a rebuild. The engine (`/api/advisor` — verified-store context,
prompt, JSON schema) is reused as-is, also called in BATCH to pre-generate the demand
set; `AdvisorClient` is reused for hydrate + live-regen.

New pieces (additive):

1. `build_pages` table + RLS (public-read / service-write) — DDL, operator-run.
2. `build_demand` derivation (GSC query parse + bounded store expansion) — pure, testable.
3. Validity/fit-filter module (ranked_viable + playstyle-fit against `recommended_playstyle`)
   — pure, testable, over store data.
4. Pre-generation script/cron — iterate the demand set -> existing engine -> persist
   `build_json` + `source_updated_at`; refresh on store change (A5) and on new demand.
5. Store-change -> on-demand-revalidation hook (A5).
6. Dynamic route `/tools/build/[shell]/[[...weapon]]/page.js` — goal-neutral base
   (`/tools/build/[shell]`) + optional demand-promoted weapon segment; SSR/ISR from
   `build_pages`, templated metadata, 404 for out-of-set combos, hydrate the client. Also
   register `/tools/build/` in `gameSlugForUrl` (unknown-prefix-fails-loudly).
7. Builds sitemap child.
8. Internal-link fixes — link the shell canonicals from the winner pages that currently
   do NOT (`/uniques/*`, `/leaderboard`, `/stats`) + shells/weapons/hub.
9. State->URL wiring in `AdvisorClient` + the per-build copy-link fix + free export/share.

What changes/breaks: minimal, mostly additive. `/advisor` stays as the "custom generate"
entry (or redirects into `/tools/build`); the share copy-link bug is fixed; live
`no-store` gen stays for custom builds; pre-gen persists the demand set.

Effort: medium; Part A is ~all of it. Part B adds almost no code now (the only current
gate-able path, `advisor_generate`, is already wrapped; the rest is the convention "page
+ discovery drivers never gate, future depth features wrap `checkFeatureAccess`").

Ship together or separately:

- **A and B ship together** — B is a design constraint + the existing seam, near-zero
  incremental code; honoring it during A costs nothing and avoids a retrofit.
- **Phase A internally in two steps:** A1 = the 8 goal-neutral shell canonicals (highest
  value, simplest; seeded 2026-08-04, canonical generation + route next); A2 = the
  WEAPON-variant long-tail via the full `build_demand` derivation. Ship A1, confirm it
  indexes and the freshness hook works, then A2.

Honest caveat to size against: Marathon build demand is tiny (45 impr / 5 months). Phase
1 on Marathon is a cheap proving ground for the pattern (demand-bounding + store-keyed
freshness + free discovery layer), NOT a traffic windfall. Build it lean and portable so
DMZ reuses `build_pages` + `build_demand` + the SSR/ISR-with-revalidation route at launch.

---

## RESOLVED: canonical goal mapping -> goal-neutral (Fable, 2026-08-04)

DECIDED. The question below (goal-PINNED vs goal-NEUTRAL shell canonicals) is CLOSED:
**goal-neutral.** goal is NOT a page dimension — it is an in-tool refinement (with
rank/experience), never a URL. The canonical is the goal-neutral shell hub `(shell,
goal=NULL, weapon_slug=NULL)`, URL `/tools/build/[shell]`, `slug='[shell]'`; the one variant
page-axis is WEAPON (demand-promoted per GSC evidence). The canonical build is generated
from the shell's `recommended_playstyle` free-text — no forced 4-goal mapping. This design
is reflected in A1 / A2 / A3 / A4 / A6 above; the 8 goal-neutral hubs were seeded 2026-08-04.

WHY (the evidence that decided it):
- **20/20 Marathon build queries are bare "[shell] build"** — ZERO carry a goal qualifier.
  Goal has no page-level search demand; pinning it would mint URLs no one searches.
- **The store does not encode a per-shell primary goal cleanly.** `role` /
  `recommended_playstyle` are FREE TEXT that do not map 1:1 to the 4-goal enum. Only 2 of 8
  were unambiguous; **Recon fit NO goal cleanly** and **Vandal split mobility/aggressive**.
  Forcing the map produced a lopsided survival x4 cluster — the signature of a content
  decision, not a mechanical derivation. Goal-neutral dissolves the whole problem.
- **Presentation guard:** the hub UI uses **uniform goal ordering** (no per-shell
  "primary"), so the primary-goal fiction is not reintroduced through the interface.

REJECTED ALTERNATIVE (kept for the record): goal-PINNED canonicals at
`/tools/build/[shell]/[primary-goal]`, which would have needed a per-shell goal mapping. The
starting mapping considered was exactly the lopsided, low-confidence table that argued FOR
goal-neutral:

| shell | store signal | would-be goal | confidence |
|---|---|---|---|
| destroyer | Combat, "front-line aggression" | aggressive | HIGH |
| thief | Stealth, "hit-and-run extraction" | extraction | HIGH |
| sentinel | Combat, "anchor / hold ground / defend exfils" | survival | HIGH |
| triage | Support, "enable squad survival" | survival | MED |
| assassin | Stealth, "high-value target elimination" | aggressive | MED (or extraction) |
| rook | Scavenger, "farm not fight" (not ranked-selectable) | survival | MED (or extraction) |
| recon | Intel, "information gathering" | survival | LOW -- fits no goal cleanly |
| vandal | Combat, "aggressive entry + vertical movement" | mobility | LOW -- splits with aggressive |

These slugs would have become PERMANENT public URLs (`recon-survival`, `vandal-mobility`) —
expensive to change once indexed — which is why the decision was made BEFORE the seed.
