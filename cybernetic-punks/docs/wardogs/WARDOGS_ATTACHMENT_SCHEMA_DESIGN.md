# Wardogs Attachments -- Schema Design (Phase 1: load catalog, effects-ready)

STATUS: DESIGN + HELD DDL. Not run. Awaiting operator review + the ~207-row catalog before any DDL
executes or any data loads. Written 2026-09-15. DDL: `docs/migrations/2026-09-15-wardogs-attachments-schema.sql`.

The goal: a `wardogs_attachments` table that (a) LOADS the catalog NOW (name / slot / price / weight /
compat -- unlocks the attachment economy + a reference roster), and (b) has the per-attachment STAT
EFFECT columns READY-BUT-NULL so the effects (coming later, operator gathering) just POPULATE -- no
migration, no rebuild -- when they arrive. That later effect layer is what powers the competitor-style
build-scorer ("score a build against the possibility space").

---

## 1. Convention baseline -- mirror the WARDOGS store family (not the bodycam DAG tables)

The feasibility read (prior task) confirmed Wardogs has NO attachment layer today; this builds it. The
DDL follows the **wardogs** store convention (`wardogs_economy_items`, `wardogs_ammo`, weapon_stats-wardogs),
NOT the bodycam/dmz Gen-2 DAG tables -- so the table looks like its siblings:

| Convention | wardogs family (what we use) | (bodycam/dmz Gen-2 differs) |
| --- | --- | --- |
| game_slug | `text NOT NULL DEFAULT 'wardogs'` | no default (errors on omit) |
| RLS | ENABLED, **NO policy** -- service-key read; anon cannot read | public-read SELECT policy |
| identity | name-keyed `UNIQUE(game_slug, name)`; no slug column | `slug` + `UNIQUE(game_slug, slug)` |
| triggers | none (wardogs stores carry none) | guard + set_updated_at triggers |
| provenance | `tier` / `verified` / `verified_source` | `verified` / `verified_source` |
| re-run | `IF NOT EXISTS` | DROP-first |
| slot vocab | free text, NO CHECK enum (poi_type lesson) | same |

Borrowed from the bodycam design (`docs/bodycam/ATTACHMENT_SCHEMA_DESIGN.md`): the honest-null provenance
posture, the free-text slot vocabulary, and the compatibility thinking (adapted below).

---

## 2. Columns

**Identity (load now):** `name`, `slot_type` (muzzle/optic/grip/magazine/stock/barrel/handguard/bipod/
foregrip/... -- free text), `slot_subtype` (suppressor/compensator/flash-hider, red-dot/holo/scope,
angled/vertical -- nullable).

**Economy (load now, honest-null):** `price integer` (NULL for the "." rows), `weight numeric` (NULL for
the "." rows). NEVER guessed -- the barrels/stocks/grips section that shows "." for price/weight loads
name+slot only, price/weight NULL.

**Compatibility (load now):** `caliber`, `weapon_class`, `compatibility_kind` ('weapon-specific'|'generic'),
`compatible_weapons text[]`, `rarity`. See section 3.

**Image (the slot -- READY-BUT-NULL):** `image_filename text`. The visual asset (bare filename, like
`weapon_stats.image_filename`). Added 2026-09-15 (schema CREATE for fresh builds + a separate additive
ALTER for the already-provisioned DB: `2026-09-15-wardogs-attachments-image-column.sql`). NOT populated
by the load -- the 108 attachment `.webp` files in `public/images/wardogs/` do NOT cleanly auto-map to
attachment names, so the operator MATCHES names -> `image_filename` MANUALLY in a later pass
(auto-guessing = fabrication). Image DISPLAY stays DORMANT until this is populated AND a render is wired
(a future task) -- same ready-but-null discipline as the effect columns.

**Effect columns (Phase 2 -- READY-BUT-NULL now):** `recoil_v_mod, recoil_h_mod, ads_speed_mod,
handling_mod, accuracy_mod, hipfire_mod, reload_mod, moving_accuracy_mod, aim_assist_mod, range_mod,
equip_speed_mod, precision_mod, ergonomics_mod` (all `numeric`, nullable) + `mag_capacity_delta integer`
+ `effects_extra jsonb` (overflow). See section 4.

**Provenance (wardogs family):** `tier` (default 'attributed'), `verified` (false), `verified_source`,
`notes`, `updated_at`.

---

## 3. Compatibility approach (the key design question)

The catalog mixes **weapon-specific** attachments (named for their gun: "AK74 Barrel", "FAL Flash Hider",
"BMR-308 Suppressor") and **generic** ones (fit many guns: "Angled Foregrip", "Holographic Sight"). The
recommended model resolves both WITHOUT a join table in Phase 1:

- **Weapon-specific** -> `compatibility_kind='weapon-specific'`, `compatible_weapons = {ParsedWeapon}`.
  The load script parses the leading weapon token from the name and VALIDATES it against the live wardogs
  weapon roster (`weapon_stats WHERE game_slug='wardogs'`). A parsed name that does NOT match a real
  weapon is FLAGGED in the mapping (not loaded blind) for the operator to resolve (alias? typo? a weapon
  we don't have a row for yet?).
- **Generic** -> `compatibility_kind='generic'`, `compatible_weapons = NULL`. Fit is resolved at
  build-time by `slot_type` (+ `caliber` for mags/barrels, + `weapon_class` where the source narrows it).
  The eventual builder asks: "generic attachments whose slot the weapon has AND whose caliber/class
  matches" -- no per-pair row needed for the common case.
- **The GIN index on `compatible_weapons`** serves the Phase-3 build-space lookup ("which attachments fit
  weapon W" = `compatible_weapons @> ARRAY[W]` OR generic-by-slot).

**SEAM (NOT built now):** if Phase 3 needs per-weapon EFFECT OVERRIDES (an attachment behaves differently
on gun X) or explicit TESTED-compat facts, that is an ADDITIVE `wardogs_attachment_weapon` join table
(the bodycam pattern: `attachment_name` + `weapon_name` composite FKs + `effect_overrides jsonb` + `tested`).
It is deliberately deferred -- the array + slot/caliber fully covers the catalog + reference + Phase-2
generic scoring. Build it only on evidence (the DMZ/bodycam exclusion-seam discipline).

---

## 4. Effect columns: named + a jsonb overflow (why both)

The operator asked for NAMED effect columns "mirroring the weapon_stats stat fields so effects compose
cleanly." Done -- one nullable `numeric *_mod` per weapon_stats axis an attachment plausibly modifies, so
the Phase-3 scorer computes `final_axis = base_axis * attach_mod` (ratio axes) directly. Trade-off vs a
single `jsonb effects`: named columns are typed + queryable + self-documenting, but a genuinely NEW axis
would need a migration -- which would defeat "no Phase-2 migration". So the DDL ALSO carries
`effects_extra jsonb` as an overflow for any unanticipated axis -> Phase 2 NEVER needs a migration.

**Two conventions to CONFIRM when the effects arrive (flagged, not assumed):**
- Q-EFF-1: are the `*_mod` values MULTIPLIERS (0.90 = -10%) or signed DELTAS (-10)? The DDL comment
  assumes multipliers; confirm against the source format and I normalize the loader to it.
- Q-EFF-2: recoil split -- the source may give ONE recoil number, not V/H. If so, populate `recoil_v_mod`
  and leave `recoil_h_mod` null (or map both). Confirm at Phase 2.

---

## 5. The load + mapping pipeline (Phase 1 execution -- pending the catalog data)

I do NOT have the ~207-row catalog yet, so the per-row MAPPING TABLE cannot be generated in this pass
(producing 207 rows I cannot see would be fabrication). The pipeline is ready; it needs the data.

**Provide the catalog in ANY of these (whichever is least work):** a TSV/CSV or JSON with, per row:
`name` (required), `slot`/`category` (required -- the source's slot label, mapped to `slot_type`),
`price` (integer or "." for unpriced), `weight` (number or "." for unlisted), and OPTIONAL
`caliber`, `class`, `rarity`. Paste it in chat or drop a file at
`docs/wardogs/attachment-catalog-source.tsv` (or .json).

**Then (next gated task) the load script `scripts/load-wardogs-attachments.mjs` will:**
1. Parse the source; map each row -> `{name, slot_type, slot_subtype, price|null, weight|null,
   caliber, weapon_class, compatibility_kind, compatible_weapons}`.
2. Honest-null the "." price/weight rows (no guessing).
3. Derive slot_type from the source category (with a documented map; loud-flag any category it can't map).
4. Parse weapon-specific names -> `compatible_weapons`, VALIDATED against the wardogs weapon roster;
   FLAG unmatched.
5. Set `tier='attributed'`, `verified=false`, `verified_source='<the community source>, in-game tested (attributed)'`.
6. Print the full MAPPING TABLE (attachment -> slot/price/weight/compat + honest-null + ambiguity flags)
   for operator review -- dry-run by default.
7. On `--commit` (operator-run, rule 2, after review): idempotent upsert-by-(game_slug, name).

Mirrors the economy-items mapping+load pattern (`docs/wardogs-economy-items-mapping.md`,
`scripts/... --commit`). No blind bulk load.

---

## 6. What this phase does / does NOT do

DOES: finalize the `wardogs_attachments` DDL (held migration) with the effect columns ready-but-null, the
compatibility approach, honest-null economy, wardogs-family conventions, RLS, and indexes.

DOES NOT: run DDL (operator runs it after review); load any data (needs the catalog + a reviewed mapping);
build the attachment render, the economy integration, or the build-scorer (later phases); touch
weapon_stats / wardogs_economy_items / any existing table; create a join table (deferred seam).

NEXT: operator reviews this design -> runs the DDL -> provides the ~207-row catalog -> I generate the
mapping table for review -> operator runs the load `--commit`. Phase 2 = effects populate the ready
columns. Phase 3 = the build-scorer.

---

## 7. Flagged questions for review

- Q1 (compatibility) -- accept the `compatible_weapons text[]` + slot/caliber model for Phase 1, with the
  `wardogs_attachment_weapon` join table as the deferred Phase-3 seam? Or authorize the join table now if
  you already know Phase 3 needs per-weapon effect overrides.
- Q2 (effects) -- named `*_mod` columns + `effects_extra` overflow OK, or prefer a single `jsonb effects`
  (looser, matches mod_stats/bodycam)? (Recommend the named+overflow hybrid, as built.)
- Q3 (RLS) -- confirm service-key-read (NO policy), matching the wardogs stores -- i.e. the attachment
  reference render will read via the service key like every other wardogs page. (Recommend yes, for
  consistency.)
- Q4 (effect convention) -- Q-EFF-1 (multiplier vs delta) + Q-EFF-2 (recoil V/H split) -- confirm when the
  effects data is in hand; the loader normalizes to your answer then.
- Q5 (weight units) -- what unit is `weight` in the source (kg? arbitrary "encumbrance" points)? Recorded
  as-is (`numeric`); note the unit in `verified_source`/`notes` so the economy model reads it right.
