# Wardogs Build Advisor -- Architecture (DESIGN PROPOSAL, for review)

**Status:** DESIGN ONLY -- proposal for Justin's review. NOTHING is built. No DB writes.
**Date:** 2026-09-10. **Companion:** docs/bodycam/ATTACHMENT_BUILDER_ARCHITECTURE.md (the crawlable-
builder precedent), docs/network/internal-data-store-doctrine.md (why the stores are internal fuel),
docs/wardogs/WARDOGS_LAUNCH_REFERENCE.md (the economy/progression facts).

## The wedge (why this exists)

wardogshub is the entrenched REFERENCE (weapons, prices, calculators) and refuses the ADVICE layer.
Our differentiator is the Build Advisor: honest, cost-aware "here is the loadout, and here is why."
Per the internal-data-store doctrine, we do NOT rebuild their reference tables; we capture the data
INTERNALLY and point it at synthesis. We now have real fuel: Swoleguy's attributed ballistics matrix
(combat) + the Bulkhead Season 1 changelog economy/progression (cost/unlock). The advisor reasons
over BOTH and CITES its sources (attributed vs official) -- the moat lives IN the synthesis.

---

## READ-FIRST findings (grounding)

### The Marathon advisor -- what transfers
- `lib/advisor/generateBuild.js` -- the SHARED core: `loadContext()` (fetches shell/mod/core/implant/
  weapon/cradle rows) -> builds a TEXT `context` -> `buildAdvisorPrompt(...)` -> Anthropic LLM (DEXTER
  persona, "cross-reference real stats, never invent") -> JSON build -> `citedSources(loaded, build)`
  narrows loaded rows to those the build actually references -> persist. Freshness via `maxUpdatedAt`
  over the context tables.
- `app/api/advisor/route.js` -- the POST wrapper (auth, rate-limit, entitlement, input sanitization --
  the untrusted-input boundary; the core does none of that).
- `scripts/gen-build-canonicals.mjs` + `lib/advisor/regenerateCanonical.js` -- BATCH pre-generation
  and single-row freshness regen into the `build_pages` table (canonical + per-weapon variants).
- Render: `app/marathon/tools/build/[shell]/page.js` (SSR canonical) + `[shell]/[weapon]/page.js`
  (per-weapon crawlable) + `BuildRefiner.js` (client refiner) + `BuildView.js`.
- TRANSFERS to Wardogs almost wholesale: the core FLOW (context -> prompt -> LLM -> JSON ->
  citedSources -> persist), the POST-wrapper boundary, the batch/freshness scripts, `build_pages`
  storage, the SSR-canonical + client-refiner + per-entity-crawlable render, and the cited-sources
  provenance mechanism. MARATHON-SPECIFIC (does NOT transfer): the shell/cradle/core/implant domain
  model, the SHELLS list, and the four EFFECTIVENESS-only priority buckets (combat/extraction/
  survival/speed).

### The cost/progression gap (the net-new wedge)
Marathon's engine reasons about EFFECTIVENESS only -- priority buckets over stats. It has ONE cost
atom (`mod_stats.credit_value`) but NO budget optimization and NO unlock-gating. `weapon_stats` has
no cost or unlock column at all. Wardogs needs the opposite of Marathon's "best regardless of cost":
"the best loadout you can AFFORD (cash budget) AND have UNLOCKED (career/class level)." That
budget + unlock-gating reasoning is the net-new layer with no Marathon precedent.

### The crawlable-builder precedent (bodycam)
`app/bodycam/builder/page.js` (SSR frame) + `BodycamBuilderClient.js` (widget) + `app/bodycam/
weapons/[slug]/page.js` (crawlable per-weapon) + `lib/bodycam/mountability.js` (a PURE, unit-tested
resolver that owns all the logic, the widget owns only UI). This is the pattern for the Wardogs
cost/progression engine: a pure, tested lib module the widget and the SSR pages both call.

### Wardogs today
Greenfield -- no advisor/build routes exist. `weapon_stats` (wardogs) has roster/caliber and now
`fire_rate` (Swoleguy attributed, verified=false). The economy/unlock facts live in
WARDOGS_LAUNCH_REFERENCE.md (a doc, not a store). Swoleguy's full ballistics matrix is a spreadsheet
(not yet in the DB).

---

## Reuse vs net-new

| Piece | Reuse from Marathon | Net-new for Wardogs |
| --- | --- | --- |
| Core flow (context->prompt->LLM->JSON->citedSources->persist) | YES (generalize generateBuild) | -- |
| POST wrapper (auth/rate-limit/sanitize boundary) | YES (mirror route.js) | -- |
| Batch pre-gen + freshness (build_pages) | YES (mirror the scripts) | -- |
| SSR-canonical + client-refiner + crawlable-per-entity render | YES (mirror the [shell] routes + BuildRefiner) | -- |
| Cited-sources provenance | YES (citedSources) | + per-fact TIER (attributed vs official) in output |
| Domain model | -- | Wardogs: faction, class/career level, budget (NOT shells/cradle) |
| Effectiveness reasoning | Pattern reused | Driven by the ballistics store (TTK/STK), not Marathon stats |
| COST + UNLOCK reasoning | -- (only mod credit_value exists) | THE WEDGE -- pure cost/progression engine |
| Data stores | -- | Combat (ballistics) store + cost/progression store |

---

## The two data stores (internal fuel -- granularity preserved, doctrine)

### 1. Combat store -- the Swoleguy ballistics matrix
Preserve the full granularity (doctrine: do NOT flatten -- fire_rate was the only flat extract).
PROPOSE a normalized table `wardogs_ballistics` (or game-agnostic `weapon_ballistics` if we want it
reusable):
  - key: (game_slug, weapon_name, ammo_type, range_bucket, body_part)
  - values: damage, and the derived TTK / STK / armor-break where Swoleguy provides them
  - provenance per row: verified=false, verified_source = the Swoleguy attributed string (same as fire_rate)
The full matrix stays INTERNAL (never a public reference table). A small PRE-COMPUTE derives per-weapon
effectiveness SUMMARIES (e.g. TTK at the expected engagement range per playstyle) that feed the
advisor's context -- the advisor does not get the whole matrix in-prompt, it gets the summary + cites
the store. (Same posture as Marathon feeding compact stat lines, not raw tables, into the prompt.)

### 2. Cost / progression store
PROPOSE (mirrors the Marathon `mod_stats.credit_value` precedent): add per-weapon columns to
`weapon_stats` -- `credit_cost`, `unlock_career_level`, `unlock_class_level` (+ which class, e.g.
Driver) -- sourced to the Bulkhead Season 1 changelog (Tier 1). Game-level XP curve (level -> total
XP) is not per-weapon -> a small `wardogs_progression` config/store (or a constant derived from the
reference). All prep is operator-run SQL (executor writes none).

---

## The cost/progression engine (THE NOVEL PIECE -- flag)

A PURE, unit-tested lib module (`lib/wardogs/loadoutSolver.js`) -- the bodycam-mountability pattern:
the widget/SSR own UI, the module owns all logic. No Marathon precedent; this is the wedge.

Inputs: player career level + class level(s), cash budget, faction, playstyle.
Logic sketch:
1. UNLOCK-GATE: filter the roster to items whose `unlock_career_level`/`unlock_class_level` <= the
   player's levels (and faction-allowed). You cannot recommend what they cannot field.
2. BUDGET SOLVE: over the unlocked candidates, choose a loadout (primary + secondary + ammo + ...)
   whose total `credit_cost` <= budget, MAXIMIZING playstyle-weighted effectiveness (TTK/role fit
   from the ballistics summaries). A small constrained pick (knapsack-shaped over a handful of slots),
   deterministic and testable.
3. HAND-OFF: the pre-filtered, pre-ranked candidate set + the budget/unlock constraints go into the
   LLM context. The LLM (a Wardogs DEXTER persona) writes the RECOMMENDATION + reasoning and cites
   sources -- it never invents stats or picks a locked/unaffordable item (the pre-filter guarantees it).
The deterministic pre-filter is the net-new engine; the LLM synthesis/explanation is the reused pattern.

---

## The advisor architecture

- Route: `/wardogs/advisor` (interactive widget) + crawlable canonical build pages (see below).
- Engine: `lib/advisor/generateWardogsBuild.js` -- either a Wardogs analog of generateBuild.js or
  generateBuild generalized with a `game` param. Reuses the core flow; swaps in the Wardogs domain
  model, the cost/progression pre-filter (loadoutSolver), and a Wardogs DEXTER prompt.
- POST wrapper: mirror `app/api/advisor/route.js` (auth/rate-limit/sanitize) -> the Wardogs core.
- Persistence: generalize `build_pages` with `game_slug` (or a parallel table) so canonical Wardogs
  loadouts pre-generate + refresh like Marathon's.
- Flow: input (level/budget/faction/playstyle) -> loadoutSolver (unlock+budget filter, effectiveness
  rank) -> LLM synthesis over the filtered candidates + ballistics summaries + prices -> JSON build
  with reasoning + cited/tiered sources -> render.

## Honest-tiering output (the moat in the synthesis)

The build_json carries PER-FACT provenance + tier, and the render surfaces it (reuse the
confidenceTiers / ProvenanceBadge visual language):
  - combat numbers (TTK/damage): "community-tested ballistics (Swoleguy), attributed" -- amber/attributed
  - prices + unlock levels: "official Bulkhead Season 1 changelog" -- verified/official
  - anything not sourced: honest-null, never invented
A recommendation header states the basis plainly: "based on community-tested ballistics + official
Season 1 economy." When Bulkhead publishes official combat stats, the combat tier flips
attributed -> official (a re-tier, not a rebuild).

## Crawlable content (SEO asset) + interactive widget -- BOTH

- SSR-canonical build pages (parallel to Marathon build_pages + bodycam per-weapon pages): pre-
  generated loadout pages (e.g. per faction x playstyle, and/or per weapon) -- crawlable, cited,
  the internal-linking + SEO asset. These are SYNTHESIS pages ("the best budget SMG loadout at
  Driver 20"), NOT reference tables -- the wedge, not wardogshub's turf.
- Interactive widget (client refiner, parallel to BuildRefiner / BodycamBuilderClient): the player
  enters level/budget/faction/playstyle and gets a live recommendation.

---

## Buildable NOW vs gated (honest)

BUILDABLE NOW -- the whole architecture, including the cost/progression engine and honest-tiered
output, against the fuel we already have:
  - COMBAT: Swoleguy attributed ballistics (fire_rate is loaded; the full matrix is loadable to the
    combat store now).
  - COST/PROGRESSION: Bulkhead Season 1 economy/unlock (Tier 1, in the reference; loadable now).
Ship with VISIBLE tiering ("recommendations based on community-tested ballistics + official Season 1
economy"). The design and the bulk of the build do NOT wait.

GATED (upgrade, not blocker): official Bulkhead COMBAT stat tables, when published -> flip the combat
provenance attributed -> official and re-tier. Only that tier-upgrade waits; the advisor ships before it.

VERDICT: buildable now, honestly tiered. Not genuinely gated.

---

## Phasing / proposed build order

1. DATA STORES (operator-run SQL, prepped for review): the combat `wardogs_ballistics` store (from
   Swoleguy, granularity preserved, attributed) + cost/unlock columns on `weapon_stats` + the XP-curve
   config. [each gated diff + operator run, as usual]
2. THE COST/PROGRESSION ENGINE: `lib/wardogs/loadoutSolver.js` -- pure, unit-tested (bodycam-
   mountability pattern). The novel wedge; buildable + testable in isolation before any LLM wiring.
3. THE ADVISOR CORE: `generateWardogsBuild` -- reuse the generateBuild flow, wire the solver + Wardogs
   prompt + per-fact tiering; the POST wrapper mirrors the Marathon route.
4. RENDER: SSR canonical pages + crawlable per-loadout/per-weapon pages + the interactive widget +
   the provenance/tiering surface.
5. BATCH + FRESHNESS: mirror gen-build-canonicals + regenerateCanonical against `build_pages`
   (game_slug generalized).

## Novel pieces flagged (no Marathon precedent)

- THE COST/PROGRESSION ENGINE (loadoutSolver) -- budget knapsack + unlock/faction gating. The wedge.
- THE BALLISTICS STORE shape (granular matrix + effectiveness pre-compute) -- Marathon has flat stats,
  not a per-range/per-bodypart matrix.
- THE DOMAIN INPUT MODEL -- faction + career/class level + cash budget (vs Marathon shells + cradle).
- PER-FACT tiering in the output (attributed vs official) -- Marathon cites sources but does not
  grade attributed-vs-official within one build.

Marathon's `mod_stats.credit_value` is the only partial cost precedent; everything else in the wedge
is new.
