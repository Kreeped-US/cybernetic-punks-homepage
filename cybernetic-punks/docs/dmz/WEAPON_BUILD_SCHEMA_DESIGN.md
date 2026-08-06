# DMZ Weapon-Build Schema -- Design (Step 0)

STATUS: LIVE -- operator-run 2026-08-06, verified. Written 2026-08-06 against the known MW4 DMZ
Gunsmith structure; Fable ruling folded in 2026-08-06 (edit-in-place, A9); DDL run + verified
2026-08-06. The ruling collapsed Apex into one attachments table, made is_indexable DERIVED,
added cost columns + slug-integrity riders + three scar-checks, sharpened the 5+1-vs-8 and the
5 open questions, and added the SEO plan. Section 8 records the resolved rulings.

PRE-FLIGHT CORRECTIONS APPLIED AT RUN TIME (read-before-write caught 3):
- game_slug is `text NOT NULL` with NO default -- the Gen-2 convention (recipes/ingredients/
  lieutenants), per the game_slug-default-removal doctrine (forgotten value ERRORS, never
  silently becomes the wrong game). NOT the older `dmz_pois` `DEFAULT 'dmz'`.
- Triggers REUSE the two EXISTING functions `dmz_guard_game_slug()` (confirmed body, the
  immutability guard) and `set_updated_at()` (confirmed body, NEW.updated_at = now()). NO new
  functions were created -- an earlier draft's `dmz_touch_updated_at` would have been redundant.
- Trigger names follow the recipe convention: `[table]_guard_game_slug` + `[table]_set_updated_at`.
- SLOT-SEED HONESTY (Lean A): the 9 slots seeded `verified = false` (not true) with an honest
  evidence label -- there is no clean official 9-slot enumeration yet (creator-UI-backed, not
  officially citable), so the honesty gate noindexes them until an official source or launch.

DATA + generateBuild logic remain LAUNCH-GATED (Oct 23 2026). Next: the route/render layer.

The DMZ weapon-build tool is the build-generator groundwork for DMZ: the render-from-verified-
row analog of Marathon's `/tools/build/[shell]`, keyed on WEAPON. This doc designs the schema
so it is ready to ingest real data at the Oct 23 2026 launch. It follows the proven Marathon
build-schema pattern where it maps, and improves ONLY where a specific Marathon scar justifies
it (evidence-based, not speculative redesign).

---

## 0. Current state (verified at source, 2026-08-06)

The weapon-build schema is GREENFIELD. Confirmed via the live PostgREST schema + explicit
selects: `dmz_weapons`, `dmz_weapon_classes`, `dmz_attachments`, `dmz_attachment_slots`,
`dmz_apex_attachments`, `dmz_weapon_builds` ALL return PGRST205 (table not found). None exist.
(An earlier count-head probe reported `dmz_weapons rows=null`; that was a false positive -- the
explicit select surfaces the real "table not found". Lesson logged: use select+error, not
count-head, for existence checks.)

What DOES exist (unrelated verticals, for context): `dmz_pois` (9 rows), `dmz_keys`,
`dmz_missions`, `dmz_items`, `dmz_recipes`, `dmz_ingredients`, `dmz_recipe_ingredients`,
`dmz_lieutenants`, `dmz_lieutenant_seasons` (all empty). The weapon-build schema is a NEW,
clean design -- no migration of existing tables. (Those 6 names were the original probe;
the post-Fable design is 5 tables -- `dmz_apex_attachments` was folded into `dmz_attachments`,
section 3.)

---

## 1. The MW4 DMZ Gunsmith structure (the facts this schema models)

- A weapon build = weapon + up to 5 STANDARD attachments + up to 1 APEX attachment.
- STANDARD attachments: from a FIXED slot taxonomy (optic, barrel, muzzle, underbarrel,
  magazine, ammunition, rear grip, stock, laser -- 9 slot types, 5 equipped max). Attachments
  are CLASS-SHARED: an attachment belongs to a weapon CLASS; weapons belong to a class;
  attachment availability is derived THROUGH the class (not weapon-specific).
- APEX attachments: WEAPON-SPECIFIC (not class-shared), unlocked at max weapon level, do NOT
  count toward the 5 (the +1), and BEHAVIOR-CHANGING (conversion kits, new firing modes --
  qualitatively different from standard stat-tuning attachments). Every weapon has >=1 Apex.
- No weapon tuning (that system is gone). No attachment-slot weapon-perks.
- DMZ-specific: Gunsmith is cash-driven at the FOB; the standard build is 5+1, but deployment-
  FOUND weapons can carry up to 8 attachments.

---

## 2. The Marathon blueprint (verified at source) + the 3 scars

Marathon models a build across 5 STORE tables (`shell_stats`, `weapon_stats`, `mod_stats`,
`core_stats`, `implant_stats`) + a `build_pages` ARTIFACT table:
- Store tables carry `verified` + `verified_source` + `patch_verified` + `game_slug`
  (verification was designed into the STORE from early on -- keep this).
- `build_pages` (10 cols): `id, game_slug, slug, shell, goal, weapon_slug, build_json,
  source_updated_at, is_indexable, updated_at`. The build is a generated jsonb artifact;
  `is_indexable` is the honesty/demand gate; `source_updated_at` drives the A5 poller.
- `build_json` (denormalized): `{ build_name, loadout_grade, primary_weapon:{name,reason},
  secondary_weapon, mods:[{name,slot,reason}], cores, implants, cradle, strengths,
  weaknesses, ... }`.
- `used_sources`: `[{name, type}]` -- cited-set provenance, BOLTED ON later (A5).

THREE SCARS this exposes (each drives a DMZ improvement in section 6):
1. `weapon_stats` has NO `slug` column -- builds reference weapons BY NAME only.
2. `build_json` refs are NAMES WITH RARITY SUFFIXES -- the live data shows literally
   `"Cloudborn (Standard)"`, the exact string that mismatched `"Cloudborn"` in the store
   (the rarity-suffix bug class).
3. `mod_stats` has THREE overlapping compatibility columns (`compatible_categories`,
   `compatible_weapons`, `weapon_class`) -- redundant, and nothing enforces they agree.

---

## 3. Proposed schema -- 5 tables (DDL SKETCH, not run) [Fable-ruled]

All follow the established dmz_* conventions: bigint `GENERATED ALWAYS AS IDENTITY` PK,
`game_slug` immutable via a `dmz_guard_game_slug`-style trigger, RLS enabled + public-read,
`verified` + `verified_source` + `updated_at`. Composite FKs on `(game_slug, slug)` with
`ON UPDATE CASCADE / ON DELETE RESTRICT` (matching the recipe schema).

THREE SCAR-CHECKS baked into every table (Fable):
- IDENTITY UNIQUE: `UNIQUE(game_slug, slug)` -- and where an identity unique includes a
  NULLABLE column, it MUST be declared `NULLS NOT DISTINCT` (the build_pages hub-duplicate
  trap: Postgres treats NULLs as distinct by default, so two "null-weapon" hubs could both
  insert). Here slug is non-null so the base unique is safe; the rule applies to any future
  nullable-column identity unique.
- INTEGRITY: `game_slug` immutability trigger + REAL composite FKs (the recipe-join precedent),
  never name-string references.
- FRESHNESS: an `updated_at` BEFORE-UPDATE trigger DESIGNED IN on every table (not retrofitted
  -- the feed_items lesson, where updated_at was backfilled late and sitemaps under-signalled).

```
dmz_weapon_classes    -- taxonomy: assault-rifle, smg, lmg, sniper, marksman, ...
  id, game_slug, slug, name, description,
  verified, verified_source, updated_at
  UNIQUE(game_slug, slug)

dmz_weapons           -- HAS A SLUG (Marathon's weapon_stats did NOT -- scar 1)
  id, game_slug, slug, name, description,
  class_slug  -> FK (game_slug, class_slug) -> dmz_weapon_classes(game_slug, slug),
  <stat cols: damage, fire_rate, magazine, range, handling, ... -- verified at launch>,
  verified, verified_source, updated_at
  UNIQUE(game_slug, slug)

dmz_attachment_slots  -- the FIXED 9-slot vocab, a REFERENCE table (NOT a CHECK enum)
  id, game_slug, slug, name, display_order,
  verified, verified_source, updated_at
  -- seedable now: optic, barrel, muzzle, underbarrel, magazine, ammunition,
  --               rear-grip, stock, laser
  UNIQUE(game_slug, slug)

dmz_attachments       -- ONE table: standard (class-shared) AND apex (weapon-specific),
                      -- discriminated by is_apex [Fable: collapsed from a separate apex table]
  id, game_slug, slug, name, description,
  is_apex boolean NOT NULL default false,
  class_slug  -> FK -> dmz_weapon_classes,    -- STANDARD: set (shared across the class)
  slot_slug   -> FK -> dmz_attachment_slots,  -- STANDARD: which of the 9 slots
  weapon_slug -> FK -> dmz_weapons,           -- APEX: set (weapon-specific); STANDARD: NULL
  unlock_condition text,                      -- APEX: the max-weapon-level unlock; STANDARD: NULL
  stat_changes jsonb, effect_summary, behavior,  -- behavior = apex conversion/firing-mode change
  cost integer, cost_tier text,               -- the cash Gunsmith cost (nullable; populated at launch)
  verified, verified_source, updated_at
  UNIQUE(game_slug, slug)
  CHECK (
    (is_apex = false AND weapon_slug IS NULL AND class_slug IS NOT NULL AND slot_slug IS NOT NULL)
    OR
    (is_apex = true  AND weapon_slug IS NOT NULL)     -- apex pairs to a weapon; not slotted in the 9
  )
  -- STANDARD availability: weapon.class_slug = attachment.class_slug  (ONE join)
  -- APEX availability:     attachment.weapon_slug = weapon.slug        (direct)

dmz_weapon_builds     -- the build_pages analog (the GENERATED artifact)
  id, game_slug, slug,
  weapon_slug   -> FK -> dmz_weapons,        -- THE AXIS (only page dimension)
  build_context text NOT NULL,               -- CHECK'd vocab: 'fob' (5+1) | 'deployment' (<=8)
  build_json    jsonb,                       -- SLUG-based composition (section 4)
  used_sources  jsonb,                       -- SLUG-based provenance, designed in
  source_updated_at timestamptz,             -- A5 poller freshness key
  updated_at    timestamptz
  UNIQUE(game_slug, slug)
  CHECK (jsonb_array_length(build_json->'standard_attachments') <= 8)  -- physical ceiling only
  -- NO is_indexable COLUMN: is_indexable is DERIVED (section 3a), never stored.
  -- The FOB 5+1 split is TOOL-validated (patch-mutable), NOT DB-CHECK'd (section 5).
```

Note on the two patterns: the CURATED entity graph (which attachments belong to which class /
slot, and which apex to which weapon) uses proper RELATIONAL tables with FKs. The GENERATED
build uses a denormalized `build_json` (like Marathon). A build is a generated artifact
regenerated by the poller, not curated data, so denormalized jsonb is correct -- the same split
the recipe schema makes (curated `dmz_recipe_ingredients` join vs a generated artifact).

### 3a. is_indexable is DERIVED, never stored [Fable]

`dmz_weapon_builds` has NO `is_indexable` column. Indexability is COMPUTED where the sitemap and
route read it:

  is_indexable(build) = (every slug in used_sources resolves to a row with verified = true)
                        AND (depth/content floor met: weapon + >=1 standard attachment present)

Rationale (Fable): a stored `is_indexable` is the STORED-DERIVED-STATE trap -- it needs a manual
launch-morning column sweep and forgettable paired flips (verify a row, then remember to flip
the builds that cite it). DERIVED means launch morning is ZERO flips: as each verification row
lands, the builds that cite it satisfy the predicate and become indexable automatically, one by
one. The derived predicate IS the honesty gate (noindex-until-real, index-day-one, automatic).

---

## 4. The build_json + used_sources shape (SLUG-based -- the headline improvement)

Every entity reference carries a `slug` (the stable join key) AND a `name` (display only).
This kills the name-matching / rarity-suffix bug class by design (scar 1 + 2).

```json
{
  "build_name": "...",
  "loadout_grade": "S|A|B|C|D",
  "weapon": { "slug": "kastov-762", "name": "Kastov 762", "class_slug": "assault-rifle", "reason": "..." },
  "build_context": "fob",
  "standard_attachments": [
    { "slot_slug": "optic",  "attachment_slug": "cronen-optic-7", "name": "...", "reason": "..." },
    { "slot_slug": "muzzle", "attachment_slug": "...",            "name": "...", "reason": "..." }
  ],
  "apex_attachment": { "attachment_slug": "...", "name": "...", "reason": "..." },
  "strengths": ["..."], "weaknesses": ["..."], "summary": "...", "tags": ["..."]
}
```

- `standard_attachments` is an ARRAY, one entry per slot, `slot_slug` unique within it.
- `apex_attachment` is 0..1 (object or null); its `attachment_slug` resolves to a
  `dmz_attachments` row with `is_apex = true` (same table as standard -- Fable's collapse).
- `used_sources`: `[{ "type": "weapon", "slug": "kastov-762" }, { "type": "attachment",
  "slug": "..." }, { "type": "attachment", "slug": "..." }]` -- SLUG-based, designed in from
  row one (Marathon's was name-based and bolted on in A5). Both standard and apex refs use
  `type: "attachment"` since they are one table; the row's `is_apex` distinguishes them.

The `name` fields are for rendering only; the tool NEVER joins on them. Every join between a
build and the store is `slug` -> `slug`. This slug-set IS what the derived is_indexable
predicate (section 3a) checks for verified-ness, and what the poller's orphan assertion
(section 5a) resolves.

---

## 5. Modeling decisions -- resolved

- WEAPONS + CLASSES: `dmz_weapon_classes` table; `dmz_weapons.class_slug` composite FK.
- CLASS-SHARED STANDARD ATTACHMENTS: `dmz_attachments(class_slug, slot_slug)`; availability =
  weapon -> class_slug -> attachments WHERE class_slug matches. ONE clean derivation (vs
  Marathon's three overlapping compat columns).
- SLOT TAXONOMY: a REFERENCE table (`dmz_attachment_slots`), NOT a CHECK enum. The 9 slots are
  known now from the Gunsmith reveal, so the table is seedable pre-launch; a table (not an
  enum) keeps it joinable/extensible and respects the `poi_type` "no premature CHECK enum on
  evolving values" lesson.
- APEX -- COLLAPSED INTO `dmz_attachments` [Fable REVERSAL of the original proposal]: ONE
  attachments table discriminated by `is_apex` boolean + a nullable `weapon_slug` + a pairing
  CHECK (`is_apex = true -> weapon_slug NOT NULL`) + an `unlock_condition` field (the max-level
  unlock). Standard: `is_apex = false`, `weapon_slug` NULL, `class_slug`/`slot_slug` set. Apex:
  `is_apex = true`, `weapon_slug` set. Rationale (Fable): a separate `dmz_apex_attachments`
  table is the `mod_stats` OVER-SPLIT recurring -- every availability join, every renderer, and
  the build_json resolver would `UNION` the two tables FOREVER. One table with a discriminator
  is the cheaper truth; the CHECK enforces the shape the two subtypes actually have.
- THE 5+1 vs UP-TO-8 QUESTION [Fable SHARPENED -- stable-in-DB, mutable-in-tool]: the DB CHECKs
  ONLY the PHYSICAL CEILING that never changes -- `jsonb_array_length(standard_attachments) <=
  8`. The patch-MUTABLE split (5 at FOB, one-per-slot, the FOB-vs-deployment rule) is validated
  by the TOOL, not the DB, because a balance patch could move it and a DB CHECK would then need
  a migration. The CANONICAL, indexable build is the FOB 5+1 (reproducible, everyone-can-build);
  `build_context` ('fob' | 'deployment', NOT NULL, CHECK'd vocab) records the regime on the row.
- COST (cash Gunsmith) [Fable ADDITION]: `dmz_attachments.cost` + `cost_tier` (both nullable,
  populated at launch). The escalating-cost economy is MOAT content -- structured, verifiable,
  tool-shaped data we rank on. The escalation RULE is an explainer; the VALUES are store data.
- CLASS-JOIN EXCLUSION SEAM (noted, NOT built) [Fable]: if the game turns out to have per-weapon
  attachment EXCLUSIONS (a class attachment that a specific weapon cannot take), that extends
  ADDITIVELY via an exclusion table (`dmz_attachment_exclusions(weapon_slug, attachment_slug)`)
  filtered into the class-join -- built only on evidence at launch, never on speculation now.

### 5a. Slug-integrity riders -- jsonb refs do not cascade [Fable]

The composite FKs protect the CURATED tables, but `build_json` / `used_sources` are jsonb: their
slug references are NOT FK-enforced and do NOT cascade when a store slug changes. Two riders
close that gap:
- REGENERATION IS THE CASCADE. A build whose cited slug changed is STALE under A5 (its
  `source_updated_at` is older than the changed row's `updated_at`), so the poller regenerates it
  -- and regeneration REWRITES the refs to the current slugs. The A5 staleness mechanism already
  in place for Marathon IS the jsonb cascade; no extra machinery, just point the DMZ poller at
  the same context tables.
- ORPHAN ASSERTION (loud). The heartbeat/poller gains a periodic assertion: EVERY slug in every
  build's `used_sources` (and `build_json` refs) MUST resolve against its table. An unresolved
  slug is an orphan -- logged LOUDLY (never silently tolerated), the same fail-loud posture as
  Finding-1. This catches a ref that regeneration missed or a slug deleted out from under a build.

---

## 6. KEEP vs IMPROVE (each improvement traced to its real Marathon scar)

COPY (proven -- do NOT speculatively redesign):

| Pattern | Evidence it works |
| --- | --- |
| `verified`/`verified_source` on every store table + honesty gate (noindex until verified) | Proven across all Marathon store tables + dmz_pois/recipes |
| `build_pages` pattern: slug identity, `is_indexable` gate, `source_updated_at` + A5 poller, `build_json` jsonb, static SSR + on-demand revalidation | Proven this cycle (WS1b, Slice B, A5) |
| `UNIQUE(game_slug, slug)` + game_slug immutability trigger + RLS public-read | The established dmz_* convention |
| Separate table per distinct ENTITY (weapon vs attachment) | Mirrors shells/weapons/mods -- but NOT apex: Fable ruled apex is a discriminated SUBTYPE of attachment (`is_apex`), not its own table (see IMPROVE 8) |
| Denormalized `build_json` for the generated build (vs a normalized join for curated graphs) | Two patterns for two things; both proven |

IMPROVE (evidence-based; each traces to a real Marathon issue we hit):

| # | Improvement | The real Marathon scar it fixes |
| --- | --- | --- |
| 1 | SLUG-based refs in `build_json` + `used_sources` (weapon_slug / attachment_slug / slot_slug); name is display-only | `weapon_stats` has NO slug; build_json refs by name; the `"Cloudborn (Standard)"` rarity-suffix mismatch -- a whole bug class killed by design |
| 2 | PROVENANCE designed-in (`used_sources` slug-based, on the build table from creation) | Marathon's `used_sources` was BOLTED ON in A5, name-based |
| 3 | SINGLE-derivation compatibility (attachment -> class_slug + slot_slug; one join) | `mod_stats`' THREE overlapping compat columns -- redundant, no agreement enforcement |
| 4 | WEAPON is the only axis -- NO `goal` column | Marathon added `goal`, then Fable ruled builds goal-NEUTRAL -> an always-NULL column. Refinements stay in-tool (Slice B), never schema |
| 5 | ERROR-vs-EMPTY read discipline baked into the read paths from the start | Finding-1 this cycle -- silent `catch -> []` shipped a 0-page build |
| 6 | RUNTIME-render route pattern (`dynamicParams:true`) for the eventual build route | The "supabaseUrl is required" build-env incident -- Marathon build routes were the lone build-time-DB-dependent, `dynamicParams:false` outliers |
| 7 | `is_indexable` DERIVED, never stored (computed from verified-slug predicate + depth floor) | Marathon's stored `is_indexable` = the stored-derived-state trap: a manual launch-day column sweep + forgettable paired flips (verify a row, then remember to flip the builds citing it). Derived = zero launch-morning flips, automatic index-day-one (section 3a) |
| 8 | APEX as a discriminated subtype (`is_apex` in `dmz_attachments`), NOT its own table | The `mod_stats` OVER-SPLIT recurring: a separate apex table would force a `UNION` in every availability join, renderer, and resolver forever (section 5) |

(#5 and #6 are ROUTE-CODE lessons, not schema. #7 and #8 are Fable's ruling folded in -- both
are schema. All flagged here so they are not forgotten when the DMZ build route + tables are built.)

---

## 7. Buildable-now vs launch-gated

BUILDABLE NOW (this design + the DDL once approved):
- The entire SCHEMA STRUCTURE (all 5 tables) -- the buildable-now deliverable.
- One real pre-launch DATA win: `dmz_attachment_slots` can be SEEDED now -- the 9-slot
  taxonomy is verifiable from the Gunsmith reveal (`verified_source` = that source). It is the
  ONE verified reference set that exists pre-launch. Everything else is names/stats that do
  not exist until the game ships.
- The route pattern + the DERIVED is_indexable predicate + the poller orphan assertion.

LAUNCH-GATED (Oct 23 2026 / real data):
- The DATA: actual weapons, the weapon-class roster, per-class attachments, apex attachments,
  and all stats/costs. No real names until the game ships -- seeding them now would be fabrication.
- The `generateBuild` LOGIC: what "optimal" means needs real stats + launch meta.
- The build table sits empty behind the DERIVED honesty gate until verified rows land -- then,
  per section 3a, builds become indexable automatically one-by-one with ZERO launch-morning flips.

### 7a. SEO plan [Fable additions]

- OWN SITEMAP CHILD: DMZ builds get their own sitemap child (e.g. `sitemap-dmz-builds.xml`).
  "Is the DMZ build engine indexing?" IS the launch question -- a dedicated child makes that
  measurable in isolation, not buried in the entities child.
- CONSUMER C ENROLLMENT AT THE FLIP (A10): a build enters the Consumer C indexation watch when
  its derived is_indexable flips true (a verified-slug set completes) -- so the 30-day
  indexation check starts exactly when the page becomes real, per weapon, automatically.
- THE DERIVED is_indexable IS THE HONESTY GATE: noindex-until-real, index-day-one, automatic
  (section 3a). No stored flag, no manual sweep -- the same gate posture as the entity verticals,
  now computed rather than stored.

---

## 8. The 5 open questions -- RESOLVED [Fable rulings]

1. WEAPON-CLASS: a TABLE (`dmz_weapon_classes`), not a bare `class_slug` text column. It is a
   LOAD-BEARING FK referent -- attachments and weapons both FK to it, and it carries
   verified/verified_source. Ruled: table.
2. `stat_changes`: JSONB now, WITH A SHAPE-CONTRACT COMMENT documenting the expected keys;
   migrate to TYPED columns POST-LAUNCH once first-party data fixes the shape. Same posture as
   recipe `prints_type` -- loose-but-documented until the data lands, not loose forever.
3. BUILD-LEVEL VERIFICATION: DERIVED, never stored. There is no `verified` column on
   `dmz_weapon_builds`; a build's verified-ness is a QUERY over its used slugs' verified states
   (the same predicate as derived is_indexable, section 3a). Ruled: derived.
4. `build_context`: on the ARTIFACT ROW (`dmz_weapon_builds`), NOT NULL, CHECK'd vocabulary
   ('fob' | 'deployment') -- so the FOB-5+1 canonical vs deployment-8 variant is queryable
   without parsing jsonb. Ruled: on the row, NOT NULL, CHECK'd.
5. SLOT COMPLETENESS: a LAUNCH-VERIFICATION task. Seed the 9 known slots now; at launch, intake
   is LOUD-ON-UNKNOWN -- an unrecognized slot in incoming data is REJECTED + FLAGGED, never
   silently added (the fail-loud / no-silent-swallow discipline applied to reference data).

STATUS: DDL-READY. All rulings folded in. The schema, the derived is_indexable, the
slug-integrity riders, the scar-checks, and the SEO plan are settled; DDL can be authored from
this doc. Remaining pre-DDL confirmation: the exact 9 slot slugs (question 5, the only
pre-launch seed).
