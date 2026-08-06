# DMZ Weapon-Build Schema -- Design (Step 0)

STATUS: DESIGN -- awaiting Fable review pass (like the recipe schema got). Doc-only; NO DDL
run. Written 2026-08-06 against the known MW4 DMZ Gunsmith structure.

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
clean design -- no migration of existing tables.

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

## 3. Proposed schema -- 6 tables (DDL SKETCH, not run)

All follow the established dmz_* conventions: bigint `GENERATED ALWAYS AS IDENTITY` PK,
`game_slug` immutable via a `dmz_guard_game_slug`-style trigger, RLS enabled + public-read,
`UNIQUE(game_slug, slug)`, `verified` + `verified_source` + `updated_at`. Composite FKs on
`(game_slug, slug)` with `ON UPDATE CASCADE / ON DELETE RESTRICT` (matching the recipe schema).

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

dmz_attachments       -- CLASS-SHARED standard attachments
  id, game_slug, slug, name, description,
  class_slug -> FK -> dmz_weapon_classes,    -- shared across the class
  slot_slug  -> FK -> dmz_attachment_slots,  -- which of the 9 slots
  stat_changes jsonb, effect_summary,
  verified, verified_source, updated_at
  UNIQUE(game_slug, slug)
  -- availability derivation: weapon.class_slug = attachment.class_slug  (ONE join)

dmz_apex_attachments  -- WEAPON-SPECIFIC, behavior-changing, the "+1" (its OWN table)
  id, game_slug, slug, name, description,
  weapon_slug -> FK -> dmz_weapons,          -- weapon-specific, NOT class
  behavior, effect,                          -- conversion kit / new firing mode
  verified, verified_source, updated_at
  UNIQUE(game_slug, slug)

dmz_weapon_builds     -- the build_pages analog (the GENERATED artifact)
  id, game_slug, slug,
  weapon_slug   -> FK -> dmz_weapons,        -- THE AXIS (only page dimension)
  build_context text default 'fob',          -- 'fob' (5+1) | 'deployment' (up to 8)
  build_json    jsonb,                       -- SLUG-based composition (section 4)
  used_sources  jsonb,                       -- SLUG-based provenance, designed in
  source_updated_at timestamptz,             -- A5 poller freshness key
  is_indexable  boolean,                     -- honesty / demand gate
  updated_at    timestamptz
  UNIQUE(game_slug, slug)
```

Note on the two patterns: the CURATED entity graph (which attachments belong to which class /
slot) uses proper RELATIONAL tables with FKs. The GENERATED build uses a denormalized
`build_json` (like Marathon). A build is a generated artifact regenerated by the poller, not
curated data, so denormalized jsonb is correct -- the same split the recipe schema makes
(curated `dmz_recipe_ingredients` join vs a generated artifact).

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
- `apex_attachment` is 0..1 (object or null).
- `used_sources`: `[{ "type": "weapon", "slug": "kastov-762" }, { "type": "attachment",
  "slug": "..." }, { "type": "apex", "slug": "..." }]` -- SLUG-based, designed in from row one
  (Marathon's was name-based and bolted on in A5).

The `name` fields are for rendering only; the tool NEVER joins on them. Every join between a
build and the store is `slug` -> `slug`.

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
- APEX -- MODELED SEPARATELY: its own table `dmz_apex_attachments`, `weapon_slug`-scoped
  (weapon-specific, not class-shared), with a `behavior` field (it is behavior-changing,
  qualitatively unlike stat-tuning). Distinct entity -> distinct table, mirroring how Marathon
  keeps mods / cores / implants as separate tables.
- THE 5+1 vs UP-TO-8 QUESTION: model the composition as an ARRAY + a `build_context` flag. The
  schema supports up to 8 (the array); the "max 5 (FOB) / max 8 (deployment) / one-per-slot"
  rule is a GENERATION/VALIDATION constraint in the tool, NOT a store-table constraint. The
  CANONICAL, indexable build is the FOB 5+1 (the reproducible, everyone-can-build version);
  deployment-8 is a representable variant, not the lead. No schema change to support either.

---

## 6. KEEP vs IMPROVE (each improvement traced to its real Marathon scar)

COPY (proven -- do NOT speculatively redesign):

| Pattern | Evidence it works |
| --- | --- |
| `verified`/`verified_source` on every store table + honesty gate (noindex until verified) | Proven across all Marathon store tables + dmz_pois/recipes |
| `build_pages` pattern: slug identity, `is_indexable` gate, `source_updated_at` + A5 poller, `build_json` jsonb, static SSR + on-demand revalidation | Proven this cycle (WS1b, Slice B, A5) |
| `UNIQUE(game_slug, slug)` + game_slug immutability trigger + RLS public-read | The established dmz_* convention |
| Separate table per distinct entity type (weapon / attachment / apex) | Mirrors shells/weapons/mods/cores/implants |
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

(#5 and #6 are ROUTE-CODE lessons, not schema -- flagged here so they are not forgotten when
the DMZ build route is built.)

---

## 7. Buildable-now vs launch-gated

BUILDABLE NOW (this design + the DDL once approved):
- The entire SCHEMA STRUCTURE (all 6 tables) -- the buildable-now deliverable.
- One real pre-launch DATA win: `dmz_attachment_slots` can be SEEDED now -- the 9-slot
  taxonomy is verifiable from the Gunsmith reveal (`verified_source` = that source). It is the
  ONE verified reference set that exists pre-launch. Everything else is names/stats that do
  not exist until the game ships.
- The route pattern + honesty-gate wiring.

LAUNCH-GATED (Oct 23 2026 / real data):
- The DATA: actual weapons, the weapon-class roster, per-class attachments, apex attachments,
  and all stats. No real names until the game ships -- seeding them now would be fabrication.
- The `generateBuild` LOGIC: what "optimal" means needs real stats + launch meta.
- The build table sits empty behind the honesty gate (noindexed) until verified rows land.

---

## 8. Open questions for the Fable pass

1. Store the weapon-class taxonomy as its own table (proposed) vs a `class_slug` text column on
   `dmz_weapons` with no parent table? (Proposed: parent table, so classes carry
   verified/verified_source and attachments can FK to a real row.)
2. `stat_changes` on `dmz_attachments`: jsonb (proposed, flexible pre-data) vs typed columns?
   Same tension as recipe `prints_type` -- provisional/loose until first-party data lands.
3. Should `dmz_weapon_builds` carry `verified`/`verified_source`, or is provenance fully
   captured by `used_sources` (slug refs into verified store rows)? (Proposed: `used_sources`
   is the provenance; the build inherits verification from the rows it cites, like Marathon.)
4. `build_context` on the row vs only in `build_json`? (Proposed: on the row, so the FOB-5+1
   canonical vs deployment-8 variant is queryable without parsing jsonb.)
5. Confirm the 9-slot taxonomy is complete + the exact slugs before seeding
   `dmz_attachment_slots` (the only pre-launch seed).

END -- ready for the Fable review pass.
