# Wardogs Channel B -- Crawlable Synthesis Hubs (SCOPE / design proposal)

**Status:** DESIGN PROPOSAL. No build. No DB writes. HOLD for review.
**Recorded:** 2026-09-11.
**Depends on / must not contradict:** `docs/wardogs/WARDOGS_ADVISOR_SEO_STRATEGY.md` (the
Fable-hardened Channel A/B doctrine -- esp. Section 4 URL design, Section 5 domain-silhouette
guard), `docs/wardogs/WARDOGS_ADVISOR_ARCHITECTURE.md` (the engine), and the shipped foundations
(loadouts tool, `lib/wardogs/assembleLoadout.js`, `lib/wardogs/loadoutSolver.js`,
`components/wardogs/LoadoutResult.js`, `components/wardogs/WeaponImage.js`,
`wardogs_loadout_pages`).
**This doc is:** the IMPLEMENTABLE refinement of the strategy's Channel B -- what to build first,
grounded in what the data actually supports today, and how the ramp/mesh/sitemap wire up.

---

## 0. TL;DR (the one decision that shapes everything)

The strategy (Section 4.1) designs Channel B around a `[class] x [budget] x [level]` grid
(assault/medic/recon/support/driver/pilot x budget/standard/kitted/max x level bands). **A live
data audit shows those three axes have NO data in the store yet:**

| Axis (strategy) | Backing column | Populated (of 33 wardogs weapons) |
|---|---|---|
| class / role | `weapon_stats.unlock_class` | **0 / 33 (all null)** |
| budget / cost | `weapon_stats.credit_cost` | **0 / 33 (all null)** |
| level / unlock | `weapon_stats.unlock_career_level` | **1 / 33** |
| (class level) | `weapon_stats.unlock_class_level` | **0 / 33** |
| weapon type | `weapon_stats.weapon_type` | **33 / 33 (complete)** |
| combat / TTK | `wardogs_ttk` | **450 rows (complete)** |

So the role/budget/level grid **cannot be built truthfully today** -- populating those hubs would
require fabricating class/cost/unlock assignments, which the honest-null / no-fabrication doctrine
forbids (SEO strategy Gate 3; ARCHITECTURE "honest-tiering").

**Proposal:** split Channel B into two phases along the data line.

- **Phase B1 (buildable NOW, on real data):** the root hub (shipped) + **weapon-TYPE hubs**
  (`best assault rifle / sniper / SMG loadout`) + **per-weapon synthesis pages**. All ranked by
  measured TTK, all carrying receipts. `weapon_type` + `wardogs_ttk` fully back these.
- **Phase B2 (gated on the economy/progression data pass -- deferred):** the strategy's full
  `[class] x [budget] x [level]` grid. Activates the moment `unlock_class` / `credit_cost` /
  `unlock_career_level` are populated (the already-roadmapped "economy-data pass"). No new SEO
  design needed then -- same mechanics, more axes.

This keeps us honest, ships genuine ranking pages now, respects the DA-gated evidence-ramp, and
lets the richest axes switch on automatically when their data lands.

---

## 1. What Channel B is (recap, so the scope is self-contained)

Crawlable synthesis pages: the second surface on the SAME engine that powers the interactive
tool (Channel A). A hub answers a real "best X loadout" query with the solved answer + the WHY +
receipts, rather than a spec dump. Per doctrine:
- The generator (the form) does not rank; the CONTENT (these hubs) is the ranking play.
- Hubs are indexable and shipped first (a small substantive set); deep leaves are NOINDEX and
  promoted to indexable one cohort at a time on GSC-demonstrated demand (`is_indexable` = the ramp
  switch). We GROW pages on evidence; we never SPROUT a grid (SEO strategy 5.1a).
- Honest-null = NOINDEX/non-render, never a published "no build" page (Gate 3).

---

## 2. Phase B1 -- the data-backed hub set (buildable now)

### 2.1 Routes

```
/wardogs/loadouts                         Root hub -- SHIPPED (indexable, in sitemap)
/wardogs/loadouts/best/[weapon-type]      Weapon-TYPE hub  ("best assault rifle loadout wardogs")
/wardogs/loadouts/weapons/[slug]          Per-weapon synthesis page (33 weapons)
```

- `[weapon-type]` slugs derive from the populated `weapon_type` values (kebab-cased):
  `assault-rifle | sniper-rifle | smg | marksman-rifle | lmg | shotgun | sidearm | launcher | bow`.
  Ship ONLY the types with enough ranked members to be substantive (proposed floor: >= 3 weapons
  with TTK -> AR 8, Sniper 5, SMG 4, Sidearm 5, Marksman 3 qualify; Shotgun 2, LMG 2, Launcher 3,
  Bow 1 are held until they have the members or the demand). Honest-null: a thin type is NOT
  published as a near-empty hub.
- `[slug]` = `entitySlugFor('weapon', name)` (same resolver marathon/bodycam weapon pages use), so
  the per-weapon URL matches the arsenal's future links -- one slug convention across surfaces.
- The `best/` segment keeps the type-hubs from colliding with the future `[class]` hubs
  (`/wardogs/loadouts/assault`) that Phase B2 will add at the first path position. (Alternative:
  no `best/` segment and reserve the class slugs -- decision flagged in Section 6.)

### 2.2 Why these two page kinds are the honest maximum today
- **Weapon-type hub:** `weapon_type` is complete and `wardogs_ttk` ranks the members -- a real,
  data-backed "best <type>" answer with receipts. "Best AR / best sniper" is genuine query demand
  (the strategy's Axis A is role, but weapon-type "best X" queries are a well-known sibling). This
  is the honest stand-in for the role-class hub until `unlock_class` lands.
- **Per-weapon synthesis page:** each of the 33 weapons has attributed ballistics + TTK + a
  committed image (`WeaponImage`). This is the strategy's own reuse leaf (4.1
  `/wardogs/loadouts/weapons/[slug]`), and the richest data-backed page available now. It doubles
  as the receipts endpoint the hubs and (future) arsenal link into.

### 2.3 Render (reuse -- ~zero net-new synthesis code)
- Both page kinds are **SSR, computed-from-store** (not user-generated like Channel A artifacts),
  so they do NOT need persisted rows to render -- they compute deterministically from
  `weapon_stats` + `wardogs_ttk` via the existing `assembleLoadout` / `loadoutSolver`.
- Type hub = run the solver filtered to that `weapon_type`, render the ranked board + a THE READ
  synthesis + per-weapon `WeaponImage` cards, reusing `components/wardogs/LoadoutResult.js`
  building blocks (RankTable, MiniBars, provenance).
- Per-weapon page = that weapon's ballistics/TTK profile + where it ranks + the loadout it anchors
  + `WeaponImage` + receipts.
- Provenance INHERITED (SEO strategy 6.1): every number carries its tier (combat -> attributed to
  Swoleguy's testing; economy -> pending until the data pass); page confidence = floor of inputs.

### 2.4 THE READ, front-loaded (the recorded SEO refinement)
Each hub's synthesis LEADS with the answer in natural, search-aligned terms -- e.g. "The best
assault-rifle loadout in Wardogs right now is the FAL, on measured time-to-kill." Natural + useful
+ the search phrase present because the content is genuinely about it. **NOT keyword-stuffed**
(helpful-content/spam risk; SEO strategy + the HANDOFF "THE READ SEO refinement" entry). SEO lives
in the page STRUCTURE (title tag, H1, meta, query-shaped URL), not in stuffed prose.

---

## 3. The indexability ramp (`is_indexable` = the switch)

Mirrors the shipped loadouts-tool posture and DMZ/marathon `sectionHasContent` gating:

| Page kind | Ship state | Rationale |
|---|---|---|
| Root hub `/wardogs/loadouts` | **indexable** (shipped) | substantive, the spine |
| Weapon-type hubs | **indexable at ship** (the small substantive set) | hubs ship first (strategy 5.1a); each passes the substantive floor (2.1) |
| Per-weapon pages | **indexable at ship** IF substantive; else noindex until enriched | 33 real profiles clear the floor; a data-thin weapon stays noindex |
| Deep leaves (class/budget/level -- Phase B2) | **NOINDEX -> promote on GSC evidence** | grow, never sprout (5.1a); one cohort at a time on real impressions |

- The switch: a per-page `is_indexable` (the flag `wardogs_loadout_pages` already defines; a
  computed-page registry mirrors it -- Section 5). `is_indexable=false` -> `robots noindex,follow`
  AND excluded from the sitemap. One gate, both consumers, no drift (the marathon/DMZ pattern).
- Domain-silhouette guard (strategy 5.1): hubs are a SMALL set; the Wardogs vertical already
  carries a substantive non-programmatic corpus (editorial sections + arsenal) so the programmatic
  pages stay a MINORITY; leaves ramp on evidence. Monitor the corpus ratio before any B2 cohort.

---

## 4. Internal mesh (topical cluster; strategy 4.4)

Only among PUBLISHED (indexable) pages -- never pre-wire links to unpromoted variants.

```
root hub  ->  every weapon-type hub  +  the interactive tool
type hub  ->  its ranked weapons (each -> per-weapon page)  +  sibling type hubs  +  root hub
weapon pg ->  the type hub it belongs to  +  the tool (prefilled)  +  root hub
tool      ->  root hub (already linked from nav/footer/hub tile)
(future arsenal detail pages -> the matching per-weapon synthesis page: the shared WeaponImage +
 slug convention already lines these up -- receipts both directions)
```
Every anchor is a real loadout query; the cluster is coherent, not a link farm.

---

## 5. Sitemap + persistence wiring

- **Sitemap:** extend the existing `lib/sitemap/eligible.js` wardogs block (the one that already
  emits `/wardogs`, the section hubs, and `/wardogs/loadouts`). Emit each INDEXABLE type-hub +
  per-weapon page. Reuse `type='wardogs-section'` (or a new `wardogs-loadouts` type) -- partition
  stays wardogs-bucketed (the partition keys on game + intel-vs-not; a new non-intel wardogs type
  is safe, matching how the loadouts landing was added). No lastmod unless a real `updated_at`
  exists (the omit-when-null discipline).
- **Persistence decision (flagged):** Channel B hubs are deterministic-from-store, so they do NOT
  need a stored row to render (unlike Channel A artifacts, which capture a user's inputs+prose).
  Two options for the sitemap/`generateStaticParams` source of "which hubs exist + their ramp
  state":
  - **(a) Registry-light (recommended):** derive the type-hub + per-weapon lists from the store at
    build/request time (weapon_type distribution + weapon rows); keep the `is_indexable` ramp for
    LEAVES only in `wardogs_loadout_pages` (page_kind='leaf'). Hubs/weapon-pages are code-gated by
    the substantive floor (2.1), not per-row DB flags. Least new state.
  - **(b) Full registry:** persist a row per hub/leaf in `wardogs_loadout_pages`
    (page_kind='hub'|'weapon'|'leaf') with `is_indexable`, and drive both render and sitemap from
    it. More uniform with Channel A, more write surface.
  Recommendation: **(a)** for B1 (hubs are computed; only evidence-ramped LEAVES need per-row
  flags), revisit (b) if/when B2's leaf grid grows enough to want a single registry.

---

## 6. Open decisions for review (before any build)

1. **URL shape for type-hubs:** `/wardogs/loadouts/best/[weapon-type]` (proposed -- reserves the
   bare first segment for Phase B2 class hubs) vs `/wardogs/loadouts/[weapon-type]` (flatter, but
   then `assault-rifle` and the future `assault` class hub share the segment namespace). Pick one
   now so URLs are stable (URL changes later cost authority).
2. **Type-hub inclusion floor:** proposed >= 3 TTK-ranked members (AR/Sniper/SMG/Sidearm/Marksman
   ship; Shotgun/LMG/Launcher/Bow held). Confirm the floor.
3. **Per-weapon pages at ship:** all 33 indexable now, or ramp them too (hubs first, weapon pages
   as the first evidence cohort)? Leaning all-33-indexable (each is a real profile), but this is a
   silhouette-ratio judgment.
4. **Persistence:** registry-light (a) vs full registry (b) -- Section 5.
5. **Deliverable after greenlight:** build B1 as ONE hub end-to-end first (proof: one type-hub +
   its weapon pages + mesh + sitemap), HOLD, then fan out; or build the full B1 set in one pass.

---

## 7. Explicitly OUT of scope here

- The `[class] x [budget] x [level]` grid (Phase B2) -- gated on the economy/progression data pass
  (`unlock_class` / `credit_cost` / `unlock_career_level` population). No fabrication.
- Any DB writes (this is a design proposal).
- Channel A changes (save/share + OG card are shipped and untouched).
- The arsenal revamp (its own scope doc; it will CONSUME the per-weapon pages via the shared
  WeaponImage + slug convention).

---

## 8. Summary for review

- Channel B's designed grid axes (class/budget/level) are **data-pending** (audit in Section 0);
  building them now = fabrication, vetoed.
- **Phase B1 (now, honest):** root hub (shipped) + weapon-TYPE hubs + per-weapon synthesis pages,
  ranked by measured TTK with inherited provenance, rendered by reusing assembleLoadout / solver /
  LoadoutResult / WeaponImage (~zero net-new synthesis code).
- **Phase B2 (deferred):** the full grid, auto-activated by the economy-data pass.
- Ramp: hubs indexable first (small set), leaves NOINDEX -> promote on GSC evidence
  (`is_indexable`), honest-null = noindex; the domain-silhouette guard holds (hubs are a minority
  of a substantive corpus).
- Mesh + sitemap reuse the shipped wardogs patterns; THE READ front-loads the answer without
  keyword-stuffing.

**No build. No DB writes. HOLD for review.** On greenlight, pick the Section 6 decisions and I
build B1 (one hub end-to-end first, or the full set) as a gated branch.
