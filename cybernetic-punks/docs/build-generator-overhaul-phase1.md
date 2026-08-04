# Build-Generator Overhaul — Phase 1 Design (Fable-reviewed)

Status: DESIGN, reviewed by Fable. Ready to build on approval. Do not build ahead of the operator's go.

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

### A1. URL structure — two tiers; rank/experience are NOT segments

```
/tools/build/[shell]/[goal]                 CANONICAL spine
/tools/build/[shell]/[goal]/[weapon]        weapon long-tail (demand-gated, see A2)
```

- `goal` slug = friendly label over the `priority` enum: `aggressive` (combat) /
  `extraction` / `survival` / `mobility` (speed). Internal slug<->enum map.
- **`rankTarget` (7) and `experienceLevel` (4) are refinements, NOT URL segments.** They
  ride as query params (`?rank=gold&exp=veteran`) that trigger a live regen and
  `rel=canonical` back to the base page. Without this, the space is 8x4x7x4 = 896
  near-duplicate pages — the article-over-production mistake. With it, rank/experience
  never mint indexable URLs.

### A2. Combination bounds — DEMAND-BOUNDED, not possibility-bounded (Fable sharpening 1)

A build page exists **only where there is plausible search intent for that specific
combination** — the indexable set is tied to real query demand, not mechanical validity.
Possibility-bounding (ranked_viable + fit matrix + top-K) would still mint ~110-130
pages, most with no searcher; that is thin-content dilution wearing a quality mask.

The valid set is therefore:

1. **DEMAND SPINE (always indexable): the 8 `[shell]` build canonicals.** Every shell has
   plausible "marathon [shell] build" intent; low risk, full coverage. These anchor the
   engine even before GSC data accrues. Their `goal` defaults to the shell's meta-primary
   goal; other goals are variants (below), not separate spine pages. In the built schema a
   spine row is a `build_pages` row with `is_indexable = true` and `weapon_slug = NULL`
   (NULL weapon = canonical; the tool picks the best weapon). [The per-shell primary-goal
   VALUES are an OPEN decision -- see "OPEN: canonical goal mapping -- for Fable" at the end.]

2. **DEMAND-CONFIRMED VARIANTS (goal- and weapon-qualified): only where a real query maps
   to the combination.** Determined by a `build_demand` derivation:
   - **Primary signal — existing GSC query data.** Read `gsc_query_metrics`, filter
     build-intent queries (the `/\bbuild|loadout\b/` family already surfaced: "marathon
     vandal build", "marathon sentinel build", "rook loadout", "vandal cradle build",
     ...). Parse each into a `(shell, goal?, weapon?)` tuple: reuse `deriveTuple` + vocab
     for the shell entity + `build` facet, add weapon-name matching against `weapon_stats`
     for the weapon token, and map any goal words to the enum. A combo with >=1 matching
     query = demand-confirmed -> indexable.
   - **Bounded expansion (because frozen-Marathon GSC demand is tiny).** Pure GSC would
     yield only a handful today. Expand CONSERVATIVELY and mechanically: a
     goal/weapon variant is also admitted if it is meta-prominent in the store (weapon is
     `ranked_viable` AND S/A-tier in `meta_tiers`, or the goal is the shell's
     ranked-primary) AND it passes the fit filter below. This is a small, store-grounded
     halo around confirmed demand — never the full permutation space.
   - **Quality filter (applies on top of demand, never instead of it).** A demand-
     confirmed or expansion combo must ALSO be mechanically sane: `weapon.ranked_viable =
     true`; the weapon fits the goal's range/ammo profile (aggressive -> close-mid
     high-DPS; survival -> mid-long; mobility -> compact fast-handling; extraction ->
     balanced mid); not contradictory with the shell kit. Demand gates; fit prunes.
   - **Thin guard.** Never pad. If a (shell, goal) has no confirmed/expansion weapon, it
     ships as the canonical page only, with no weapon spokes.

3. **Everything else 404s** (or 301s to the canonical `/tools/build/[shell]/[goal]`). A
   combination not in the pre-computed demand set does not exist as a page — same
   discipline as the DUPLICATE-SUPPRESSED audit.

**Self-expanding by construction.** The `build_demand` derivation re-runs on a schedule
(cron): as GSC accrues new build queries, the demand set grows and new pages generate;
combinations that never attract intent never get a page. Today's Marathon set is small
(8 canonicals + roughly a dozen-to-few-dozen demand-confirmed variants) and grows only
with proven intent.

**DMZ note.** DMZ has no pre-launch GSC history, so seed `build_demand` from the Mangools
demand map (the recipes/loadout demand analysis) plus launch-week GSC — same mechanism,
different seed.

Hub-and-spoke: each canonical links to its demand-confirmed weapon spokes (internal-link
density + crawl paths); variants are self-canonical, cross-linked to siblings + parent.

### A3. SEO per build page (templated from combo + persisted build)

- **Title (A2, <=60):** `"[Shell] [Goal] Build — Marathon"` (e.g. "Assassin Aggressive
  Build — Marathon", 36 chars). Variant: `"[Shell] [Weapon] Build — Marathon"`; if the
  weapon name pushes over 60, drop the goal word (the weapon is the higher-intent token).
  Length-guarded template.
- **Description (~150):** filled from the persisted build — "The best Marathon [Shell]
  [goal] loadout: [primary weapon], top mods and cores, a Cradle stat plan, and ranked
  notes — built on verified in-game stats."
- **H1:** `"[Shell] [Goal] Build"` + weapon subtitle.
- **Body = the persisted build, server-rendered** (weapons / mods / cores / implants /
  cradle / `dexter_analysis`) — real crawlable content matching the query.
- **A1:** no FAQPage schema. **A5:** surface the verified-source chain the build carries
  ("verified in-game" provenance). JSON-LD: BreadcrumbList + WebPage only.

### A4. State -> URL

- **Selecting inputs navigates** — picking shell+goal(+weapon) router-pushes to the
  permalink. Using the tool lands you on a real, shareable, indexable URL.
- **Landing on a permalink hydrates** — server SSRs the persisted build (crawlable); the
  client hydrates `AdvisorClient` to that build's state.
- **Refinements** (rank/experience/free-text) -> query params -> live regen (authed
  layer), `rel=canonical` to the base page. Base = static/indexable; refinements =
  dynamic/non-indexed.
- Fixes the Step 0 bug: "copy link" copies the per-build permalink, not generic `/advisor`.

### A5. Rendering + freshness — static WITH a store-keyed regeneration hook (Fable sharpening 2, moat-critical)

Static generation for crawlability is correct ONLY WITH a regeneration hook keyed to the
store's `updated_at`. Serving stale verified stats is a moat violation — the build pages'
whole value is that they carry verified in-game data.

Mechanism:

- **Statically generated (ISR)** for crawlability + speed.
- **Store-change snapshot.** Each persisted build row carries `source_updated_at` = the
  MAX(`updated_at`) of the `shell_stats` / `weapon_stats` / (and mods/cores/implants/
  cradle rows) it was built from. This is the same MAX-recency pattern as the
  corroboration R2 seniority work.
- **On-demand revalidation triggered by store change.** A store-change detector (a
  Supabase DB webhook on the entity tables, or a step in the existing cron) finds entity
  rows whose `updated_at` moved since the last build refresh. For each affected combo it
  (a) re-runs the pre-generation (re-calls the advisor engine -> fresh `build_json`,
  new `source_updated_at`), then (b) calls Next.js on-demand revalidation
  (`revalidatePath('/tools/build/...')` / `revalidateTag`) so the static page rebuilds
  with fresh data. The updated_at trigger shipped this session is exactly the signal this
  hook consumes.
- **ISR fallback.** A moderate `revalidate` (e.g. daily) so a missed webhook can never
  leave a page more than a day stale. Belt-and-suspenders.
- **Staleness query.** The refresh job selects builds where any source entity's
  `updated_at` > `build.source_updated_at` -> that build is stale -> regen. Derive-don't-
  store: a store fix propagates to its dependent build pages on the next refresh pass.

For frozen Marathon this is moot (the store is not changing), but the mechanism must be
built correctly now because it is what makes DMZ's live-data build pages correct once DMZ
generation and in-game verification are live. Do not skip it.

### A6. Sitemap

- Persist the valid set in `build_pages` (built + verified): `slug, shell, goal,
  weapon_slug (NULLABLE -- NULL = canonical page), build_json, source_updated_at,
  is_indexable, updated_at`. The demand/publish gate is the **`is_indexable` boolean**,
  chosen over a `status` / `demand_basis` enum per the poi_type lesson (no CHECK'd enum on
  still-evolving values). There is NO `status` enum, NO `demand_basis` enum, and NO
  `published_needs_build` CHECK -- the serving condition below carries publish state
  instead. (`goal` keeps a CHECK: its 4 values are a closed, code-defined enum.)
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
- **Advanced tuning / live custom regenerate** (rank/experience knobs, free-text) — the
  paid Claude call; depth + compute.
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

## PART C — scope

In-place EVOLUTION, not a rebuild. The engine (`/api/advisor` — verified-store context,
prompt, JSON schema) is reused as-is, also called in BATCH to pre-generate the demand
set; `AdvisorClient` is reused for hydrate + live-regen.

New pieces (additive):

1. `build_pages` table + RLS (public-read / service-write) — DDL, operator-run.
2. `build_demand` derivation (GSC query parse + bounded store expansion) — pure, testable.
3. Validity/fit-filter module (ranked_viable + goal-fit) — pure, testable, over store data.
4. Pre-generation script/cron — iterate the demand set -> existing engine -> persist
   `build_json` + `source_updated_at`; refresh on store change (A5) and on new demand.
5. Store-change -> on-demand-revalidation hook (A5).
6. Dynamic route `/tools/build/[shell]/[goal]/[[...weapon]]/page.js` — SSR/ISR from
   `build_pages`, templated metadata, 404 for out-of-set combos, hydrate the client.
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
- **Phase A internally in two steps:** A1 = the 8 shell canonicals + their demand-
  confirmed spine (highest value, simplest); A2 = the goal/weapon long-tail via the full
  `build_demand` derivation. Ship A1, confirm it indexes and the freshness hook works,
  then A2.

Honest caveat to size against: Marathon build demand is tiny (45 impr / 5 months). Phase
1 on Marathon is a cheap proving ground for the pattern (demand-bounding + store-keyed
freshness + free discovery layer), NOT a traffic windfall. Build it lean and portable so
DMZ reuses `build_pages` + `build_demand` + the SSR/ISR-with-revalidation route at launch.

---

## OPEN: canonical goal mapping -- for Fable

FRAMING ONLY -- this states the decision, it does not make it. Raised while seeding A1's 8
shell canonicals (`build_pages` built + verified, empty; the seed is blocked here on
purpose rather than baking in an invented mapping).

THE QUESTION. Should the 8 shell canonicals be:
- GOAL-PINNED -- one page per shell at its meta-primary goal: `(shell, primary-goal,
  weapon_slug=NULL)`, URL `/tools/build/[shell]/[primary-goal]` (the current doc A2.1
  design); OR
- GOAL-NEUTRAL -- the shell's build HUB, goal chosen by the user in-tool, URL
  `/tools/build/[shell]` (needs a schema/route tweak: a nullable `goal` or a `default`/`hub`
  goal value, plus a bare-`[shell]` route).

WHY IT CAME UP (the evidence). The doc specifies the CONCEPT ("meta-primary goal") but not
the per-shell VALUES, and the store does not encode them cleanly: `role` and
`recommended_playstyle` are FREE TEXT that do not map 1:1 to the 4-goal enum
(aggressive / extraction / survival / mobility). Only 2 of 8 are unambiguous. Recon (Intel,
"information gathering") fits NO goal cleanly. Vandal (the mobility shell, but its playstyle
reads "aggressive entry") SPLITS mobility/aggressive. Forcing the map yields a lopsided
survival x4 cluster -- the signature of a content decision, not a mechanical derivation.

IF PINNED -- proposed starting mapping (from the seed Step 0; confidence noted, NOT decided):

| shell | store signal | proposed goal | confidence |
|---|---|---|---|
| destroyer | Combat, "front-line aggression" | aggressive | HIGH |
| thief | Stealth, "hit-and-run extraction" | extraction | HIGH |
| sentinel | Combat, "anchor / hold ground / defend exfils" | survival | HIGH |
| triage | Support, "enable squad survival" | survival | MED |
| assassin | Stealth, "high-value target elimination" | aggressive | MED (or extraction) |
| rook | Scavenger, "farm not fight" (not ranked-selectable) | survival | MED (or extraction) |
| recon | Intel, "information gathering" | survival | LOW -- fits no goal cleanly |
| vandal | Combat, "aggressive entry + vertical movement" | mobility | LOW -- splits with aggressive |

WHY IT MATTERS. These slugs become PERMANENT public URLs (`recon-survival`,
`vandal-mobility`, ...). A wrong seed = wrong canonical URLs, and a canonical URL is
expensive to change once it indexes and accrues links. Get the mapping (or the
goal-neutral decision) right BEFORE the seed.

DECISION OWNER: Fable pass next session -> decision -> then the grounded 8-row seed, then
the SSR/ISR route + `build_json` generation + the regeneration hook.
