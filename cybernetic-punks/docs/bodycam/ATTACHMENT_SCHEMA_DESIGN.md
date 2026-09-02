# Bodycam Attachment Schema -- Design (LARGE attachment arc, phase 1)

STATUS: DESIGN + DDL-PREP. Not run. Awaiting Justin's review before any DDL executes or any
render/builder is built. Written 2026-09-02 against the operator-verified Reissad "Locked &
Loaded" (Sept 2 2026) attachment system and the existing entity-table conventions.

This phase designs the BESPOKE model the feasibility read concluded was required: `mod_stats` is
flat / single-slot with no part-requires-part structure, so it cannot express Bodycam's
hierarchical MOUNTING DEPENDENCIES (the DAG). This doc finalizes the two-table core, the DDL for
the operator to run, and the builder-query shape that proves the schema is traversable.

Scope guard: STRUCTURE is confirmed; VALUES are honest-null (no published per-part numbers
exist). Every row lands `verified = false` with `verified_source` naming the source; no invented
numbers. Same posture as the Bodycam weapon roster.

---

## 0. What the model must express (confirmed system)

- MULTI-AXIS EFFECTS (8 axes, honest-null): `ads_speed`, `switch_speed`, `reload_speed`,
  `recoil_h`, `recoil_v`, `spread`, `kick`, `ammo_capacity`. No published numbers -> jsonb,
  all null, shape documented (not asserted).
- HIERARCHICAL MOUNTING DEPENDENCIES (the DAG the flat model cannot hold): parts gate other
  parts. A rail/mount/upper-barrel/side-rail PROVIDES a slot; an optic/laser REQUIRES that slot.
  Modeled slot-level: `provides_slots` / `requires_slots` (confirmed sufficient -- see section 6).
- SLOT TAXONOMY: Barrel (Short/Long), Muzzle (Suppressor/Flash Hider/Compensator), Upper Barrel,
  Side Rail, Optic Mount, Optic (Iron/Close/Mid/Long + Reticle + Canted-toggle), Magazine,
  Trigger, Grip, Stock (Light/Heavy), Ammo Types, Stickers (cosmetic). Modeled as
  `slot_type` + `slot_subtype` free-text vocabulary (NOT a CHECK enum -- the poi_type lesson).
- PER-WEAPON COMPATIBILITY: an attachment mounts on a SUBSET of weapons; compatible vs tested;
  suppressors carry per-weapon audio. Modeled by the join table `bodycam_attachment_weapon`.
- PROGRESSION / PRESENTATION: `rp_cost` (RP unlock), `rarity`, `is_cosmetic`, `toggle_group`
  (the canted-optic mutual toggle).

---

## 1. Convention baseline (read-first, grounded 2026-09-02)

The design follows the Gen-2 entity-table convention (the `dmz_*` recipe/weapon-build tables,
`docs/dmz/WEAPON_BUILD_SCHEMA_DESIGN.md`, and HANDOFF:7800/7010), NOT the older `dmz_pois`
convention. Verified facts it inherits:

| Convention | Source of truth | Applied here |
| --- | --- | --- |
| PK `bigint GENERATED ALWAYS AS IDENTITY` | dmz Gen-2 tables (HANDOFF:7800) | both tables |
| `game_slug text NOT NULL`, NO default | game_slug-default-removal doctrine (a forgotten value ERRORS, never silently becomes the wrong game -- NOT `dmz_pois DEFAULT 'dmz'`) | both tables, immutability trigger |
| `UNIQUE(game_slug, slug)` identity | established dmz_* convention | `bodycam_attachments` |
| `verified` + `verified_source`; NO `patch_verified` | patch_verified retired this session (cheap-half); patch folds into `verified_source` per A11/A4 | both tables |
| jsonb loose-but-documented (shape-contract comment) | dmz schema question 2; `mod_stats.stat_changes` is a flat `{axis:value}` map (generateBuild.js:194) | `effects`, `effect_overrides` |
| slot vocabulary = free text / reference, NOT a CHECK enum | the poi_type lesson (no premature CHECK on evolving values) | `slot_type`, `slot_subtype`, `rarity` |
| `updated_at timestamptz` + BEFORE-UPDATE `set_updated_at()` trigger (REUSE the shared fn) | dmz convention (HANDOFF:7010, "REUSE set_updated_at not a new fn") | both tables |
| `game_slug` immutability trigger (mirror `dmz_guard_game_slug()`) | dmz convention (confirmed body: raise if OLD.game_slug <> NEW.game_slug) | both tables (`bodycam_guard_game_slug()`) |
| RLS enabled + public-read (SELECT to anon) | the app reads entity tables via the anon `supabase` client (GameSectionPage.js:143 reads weapon_stats anon); writes via service key | both tables |

Weapon-reference note (resolves DMZ "scar 1"): `weapon_stats` has NO slug (uuid `id` + `name`),
BUT the operator added `weapon_stats_game_slug_name_key UNIQUE(game_slug, name)` this session
(HANDOFF entry, Bodycam roster). That makes a REAL composite FK `(game_slug, name)` enforceable
-- see section 3 / the flagged question.

---

## 2. Table 1 -- `bodycam_attachments` (the entities + the DAG)

One row per attachment part. Carries the DAG columns the flat `mod_stats` lacks.

| Column | Type | Null | Purpose |
| --- | --- | --- | --- |
| `id` | bigint GENERATED ALWAYS AS IDENTITY | no | surrogate PK (Gen-2 convention) |
| `game_slug` | text | no | `'bodycam'`; NO default (forgotten value errors); immutable (trigger) |
| `slug` | text | no | stable join key (e.g. `suppressor-tactical`); refs use this, never the display name |
| `name` | text | no | display name (e.g. "Tactical Suppressor") |
| `slot_type` | text | no | the slot this part OCCUPIES (Barrel, Muzzle, Upper Barrel, Side Rail, Optic Mount, Optic, Magazine, Trigger, Grip, Stock, Ammo, Sticker). Free-text vocabulary, loud-on-unknown at intake -- NOT a CHECK enum (poi_type lesson) |
| `slot_subtype` | text | yes | Short/Long, Suppressor/Flash Hider/Compensator, Iron/Close/Mid/Long, Light/Heavy. NULL when the slot has no subtype |
| `requires_slots` | text[] | no (DEFAULT `'{}'`) | THE DAG (in-edges): slot-types that must already be PROVIDED for this part to mount. e.g. an Optic requires `{optic-mount}`. Empty `{}` = mounts on the bare weapon (a base slot) |
| `provides_slots` | text[] | no (DEFAULT `'{}'`) | THE DAG (out-edges): slot-types this part EXPOSES once mounted. e.g. an Optic Mount / rail provides `{optic-mount}`; an Upper Barrel provides `{upper-rail}`. Empty `{}` = a leaf part |
| `effects` | jsonb | yes | the 8 axes, honest-null. Shape-contract: `{ads_speed,switch_speed,reload_speed,recoil_h,recoil_v,spread,kick,ammo_capacity}`, each a number or null. All null until published/verified. Mirrors `mod_stats.stat_changes` (flat `{axis:value}`) |
| `is_cosmetic` | boolean | no (DEFAULT false) | stickers/skins -- no ballistic effect; excluded from the effect roll-up |
| `toggle_group` | text | yes | mutual-toggle grouping (the canted-optic toggle: a primary optic + a canted optic share a group and toggle). NULL = not toggled |
| `rp_cost` | integer | yes | RP progression unlock cost. Honest-null until sourced |
| `rarity` | text | yes | rarity tier. Free text, no CHECK (poi_type). Honest-null until sourced |
| `notes` | text | yes | aliases / caveats (matches `weapon_stats.notes` usage) |
| `verified` | boolean | no (DEFAULT false) | honest-null provenance gate. false until confirmed in-game |
| `verified_source` | text | yes | names the source; patch folded in (NO patch_verified) |
| `updated_at` | timestamptz | no (DEFAULT now()) | freshness; BEFORE-UPDATE `set_updated_at()` |

Constraints/indexes: `UNIQUE(game_slug, slug)`; btree `(game_slug, slot_type)`; GIN
`(requires_slots)` and GIN `(provides_slots)` for the DAG `<@` / `&&` traversal (section 5).

## 3. Table 2 -- `bodycam_attachment_weapon` (per-weapon compatibility, many-to-many)

One row per (attachment, weapon) pair that has a compatibility fact to record.

| Column | Type | Null | Purpose |
| --- | --- | --- | --- |
| `id` | bigint GENERATED ALWAYS AS IDENTITY | no | surrogate PK |
| `game_slug` | text | no | `'bodycam'`; NO default; immutable |
| `attachment_slug` | text | no | -> composite FK `(game_slug, attachment_slug)` -> `bodycam_attachments(game_slug, slug)`; ON UPDATE CASCADE, ON DELETE CASCADE (a compat row is meaningless without its attachment) |
| `weapon_name` | text | no | -> composite FK `(game_slug, weapon_name)` -> `weapon_stats(game_slug, name)`; ON UPDATE CASCADE (renames), ON DELETE RESTRICT (never silently drop a compat fact). Enabled by this session's `UNIQUE(game_slug, name)` |
| `compatible` | boolean | no (DEFAULT false) | the attachment mounts on this weapon (a subset gate; blocked = false) |
| `tested` | boolean | no (DEFAULT false) | the compatibility was VERIFIED in-game (vs inferred). Distinct from `verified` (row provenance): `tested` is the empirical mount check |
| `audio_note` | text | yes | per-weapon suppressor audio note (the confirmed "suppressors carry per-weapon audio") |
| `effect_overrides` | jsonb | yes | per-weapon effect deltas, same 8-axis shape as `effects`, honest-null. NULL = use the base `effects` |
| `verified` | boolean | no (DEFAULT false) | honest-null provenance |
| `verified_source` | text | yes | names the source; NO patch_verified |
| `updated_at` | timestamptz | no (DEFAULT now()) | freshness trigger |

Constraints/indexes: `UNIQUE(game_slug, attachment_slug, weapon_name)`; btree
`(game_slug, weapon_name)` (the builder's primary lookup); btree `(game_slug, attachment_slug)`.

---

## 4. RLS / exposure

The app reads entity tables through the ANON `supabase` client (e.g. GameSectionPage.js:143
selects `weapon_stats` anon), so both new tables need RLS ENABLED with a PUBLIC-READ (SELECT)
policy for `anon` + `authenticated`; writes flow through the service-role key, which bypasses
RLS. This matches `weapon_stats` / `mod_stats`. The DDL includes the enable + a `..._public_read`
SELECT policy; the operator confirms it matches the exact policy shape already on weapon_stats
(name/roles) and adjusts if the house policy differs.

---

## 5. Builder-query sketch -- proving the DAG is traversable

The builder resolves, for weapon `W` and a currently-mounted set `M`, which attachments are
mountable. The schema supports this in indexed steps:

1. COMPATIBLE POOL (one indexed join on `(game_slug, weapon_name)`):
   ```sql
   select a.*
   from bodycam_attachments a
   join bodycam_attachment_weapon aw
     on aw.game_slug = a.game_slug and aw.attachment_slug = a.slug
   where a.game_slug = 'bodycam' and aw.weapon_name = $W and aw.compatible = true;
   ```
2. AVAILABLE PROVIDED-SLOTS set `S` = base_slots(W) UNION (union of `provides_slots` over M).
3. MOUNTABLE now = pool rows whose `requires_slots` are all satisfied by `S`, whose `slot_type`
   is not already occupied in M (unless same `toggle_group`):
   ```sql
   -- requires_slots subset of S  ->  Postgres array contained-by, GIN-indexed:
   where a.requires_slots <@ $S_array
   ```
4. EXPAND: mounting a chosen part adds its `provides_slots` to `S`, unlocking deeper parts
   (rail -> optic-mount -> optic). Iterate until no new mountable rows -- a standard DAG BFS.

The `<@` (contained-by) and `&&` (overlap) array operators are served by the GIN indexes on
`requires_slots` / `provides_slots`, so each DAG step is index-backed, not a full scan. The
per-weapon compat lookup is a single btree seek. The schema is traversable at builder scale.

`base_slots(W)` (the DAG root) is the ONE open modeling question -- section 6.

---

## 6. Flagged design questions

### Q1 -- slot-level vs part-level dependency: SLOT-LEVEL IS SUFFICIENT (confirmed)
The confirmed spec gates at the slot level: a rail PROVIDES `optic-mount`; an optic REQUIRES
`optic-mount` -- ANY rail providing the slot satisfies it, never "optic X requires the specific
rail Y". So `requires_slots` / `provides_slots` (slot-type sets) fully express the DAG. No rule
needs part-to-specific-part edges.
SEAM (noted, NOT built): if a future part ever requires a SPECIFIC other part (not just a slot),
that extends ADDITIVELY via a `bodycam_attachment_dependency(attachment_slug, requires_attachment_slug)`
join filtered into the mountable check -- built only on evidence, never speculatively now (the
DMZ exclusion-seam discipline).

### Q2 -- weapon reference: by composite name vs by uuid id (RECOMMEND composite name)
`weapon_stats` keys on uuid `id` + `name` (no slug). Two options for `weapon_name` above:
- (A, RECOMMENDED) composite FK `(game_slug, weapon_name)` -> `weapon_stats(game_slug, name)`.
  Now enforceable via this session's `UNIQUE(game_slug, name)`. Ergonomic: the arsenal render
  and the builder already key on name; ON UPDATE CASCADE absorbs any rename. Real integrity, no
  new surrogate exposed.
- (B) FK to `weapon_stats.id` (uuid). Rename-proof surrogate, but forces a name->id lookup the
  arsenal doesn't otherwise need, and exposes weapon_stats's uuid (used nowhere else in bodycam).
Recommendation: (A). The DMZ "scar 1" (name refs with no integrity) was about DENORMALIZED jsonb
build artifacts; here it is a RELATIONAL join with a real composite FK + CASCADE, so name-keying
is safe and cleaner. Flagged for Justin: confirm (A), or choose (B) if you prefer surrogate refs.

### Q3 -- base_slots(W): the DAG root (RECOMMEND builder-constant now, extension table as seam)
The DAG needs a starting provided-slot set per weapon. weapon_stats is a SHARED, cross-game
table -- it must NOT gain bodycam-only columns. Options:
- (RECOMMENDED, phase 1) treat base slots as a BUILDER CONSTANT: the platform's standard base
  slots (Barrel, Muzzle, Magazine, Optic-Mount-or-Upper-Barrel, Side-Rail, Trigger, Grip, Stock,
  Ammo), with PER-WEAPON EXCEPTIONS expressed through the compat join (a weapon that cannot take
  a suppressor simply has `compatible=false` for those muzzle rows). No third table; honest for
  "structure known, values pending".
- (SEAM, build only on evidence) if base slots genuinely DIVERGE per weapon (e.g. one weapon has
  an integral optic mount, another needs a rail first), add a small `bodycam_weapon` extension
  table (`weapon_name` + `base_provides_slots text[]` + any bodycam-only weapon facts) -- the
  honest home, since weapon_stats can't hold it. NOT built now.
Flagged for Justin: accept the builder-constant for phase 1, or authorize the `bodycam_weapon`
extension table now if you already know base slots diverge.

---

## 7. What this phase does / does NOT do

DOES: finalize the two-table schema + the DDL (section: the .sql file), grounded in convention,
with the DAG columns, honest-null provenance, RLS, indexes, and the builder-query proof.

DOES NOT: run DDL (the operator runs it after review); seed any data (values are honest-null and
unsourced -- seeding now is fabrication); build the render or the dependency-gated builder (later
phases). No `patch_verified`. No change to `weapon_stats`, `mod_stats`, or any existing table.

NEXT (after schema approval): operator runs the DDL -> phase 2 seeds the honest-null attachment
roster (existence-sourced, values null, like the weapon roster) -> phase 3 builds the
DAG-resolving builder + the arsenal attachment render.
