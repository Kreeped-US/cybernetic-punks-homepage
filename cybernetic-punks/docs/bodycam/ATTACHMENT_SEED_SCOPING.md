# Bodycam Attachment Seed -- Scoping + Proposal (LARGE arc, phase 2, step 1)

STATUS: SCOPING / PROPOSAL. Read-only. Nothing inserted. Ends in a HOLD for Justin's review.
Written 2026-09-02 against the created schema (docs/migrations/2026-09-02-bodycam-attachments-schema.sql)
and the operator-verified Reissad "Locked & Loaded" (Sept 2 2026) attachment spec + devlog.

RECOMMENDATION UP FRONT: **Option A -- seed NOTHING into `bodycam_attachments` yet.** No parts
list is published, and the table holds PARTS. The confirmed structure (slot taxonomy + the one
stated dependency edge + the size-vs-control design principle) is delivered HERE as a reference,
not as fabricated part rows. `bodycam_attachment_weapon` also stays EMPTY (no per-gun matrix is
published). This doc is the confirmed-structure reference the later steps seed FROM once a real
parts list exists.

---

## 0. The honest question, resolved

`bodycam_attachments` rows are INDIVIDUAL PARTS (name = the part's display name; slug = its stable
key). What we actually have confirmed is the SLOT TAXONOMY (categories) and ONE dependency RULE --
not a list of parts. So:

- **Option A (RECOMMENDED): seed nothing into `bodycam_attachments`.** Slot categories are
  VOCABULARY, not parts. Inserting "Optic Mount" or "Side Rail" as attachment ROWS would make a
  builder/render treat a slot-category term as a mountable part -- a category error that
  misrepresents confirmed vocabulary as fabricated parts. The table stays empty until a published
  parts list exists; the taxonomy + rules live in this doc.
- **Option B (REJECTED): seed a few structural "gating parts."** Even the most defensible
  candidates ("a side rail", "an optic mount") are CATEGORIES, not named parts -- there is no
  sourced individual part to name. Seeding them would either invent a name (fabrication) or store
  a category string in a `name` column that means "a specific part" (dishonest to the schema).
  The one thing Option B could add over Option A -- encoding the rail->optic dependency edge -- is
  captured honestly in section 3 as a documented RULE, and will attach to the real rail/optic
  parts when they are published. Nothing is lost by waiting.

Reasoning: the moat is "confirmed structure, never fabricated content." A parts table with zero
rows is HONEST; a parts table padded with category placeholders is not. Option A keeps the table
truthful and still captures every confirmed fact (here, in the doc) for the next step to use.

---

## 1. Schema shape the seed must match (for when parts land)

`bodycam_attachments`: id, game_slug, slug, name, **slot_type** (the part's category),
**slot_subtype** (nullable), **requires_slots text[]** (DAG in-edges -- slot-mounts that must be
provided first), **provides_slots text[]** (DAG out-edges -- slot-mounts this exposes),
effects jsonb (8 axes, null), is_cosmetic, toggle_group, rp_cost, rarity, notes, **verified**
(false), **verified_source** (the exact source), updated_at.

Note the two distinct vocabularies the columns use:
- `slot_type` / `slot_subtype` = WHAT THE PART IS (its category) -- section 2.
- `requires_slots` / `provides_slots` = the DAG MOUNTING POINTS a part needs / exposes -- section 3.

---

## 2. CONFIRMED slot taxonomy (the `slot_type` / `slot_subtype` vocabulary)

Confirmed as attachment-system STRUCTURE from the Sept 2 patch + operator spec. This is the
controlled vocabulary future part rows draw from (loud-on-unknown at intake -- an unrecognized
slot is rejected + flagged, never silently added). Proposed kebab-case slugs:

| slot_type (slug) | slot_subtype (slug) | Notes |
| --- | --- | --- |
| `barrel` | `short`, `long` | size-vs-control (section 4) |
| `muzzle` | `suppressor`, `flash-hider`, `compensator` | suppressor carries per-weapon audio (a per-part/per-weapon fact, unpublished) |
| `upper-barrel` | -- | a rail-providing part category |
| `side-rail` | -- | a rail-providing part category |
| `optic-mount` | -- | the part category that provides the optic mounting point |
| `optic` | `iron`, `close`, `mid`, `long` | also carries a reticle and a canted-toggle option (section 3) |
| `magazine` | -- | |
| `trigger` | -- | |
| `grip` | -- | |
| `stock` | `light`, `heavy` | size-vs-control (section 4) |
| `ammo` | -- | "Ammo Types" is a SLOT per the patch listing (see section 6 -- the caliber-swap ballistics claim is NOT encoded) |
| `sticker` | -- | cosmetic; `is_cosmetic = true` when real sticker parts land |

This taxonomy is CONFIRMED STRUCTURE. It is documented here (not seeded) because the schema has no
slot-reference table -- slot values live on the part rows, and there are no part rows yet. SEAM
(not built): if a dedicated slot-vocabulary table is ever wanted (the DMZ `dmz_attachment_slots`
precedent), this table IS the seed for it.

---

## 3. CONFIRMED mounting-dependency edge(s) (`requires_slots` / `provides_slots`)

Encode ONLY explicitly-stated edges. Exactly ONE is stated:

- **EDGE (confirmed): an optic REQUIRES an optic-mount; a rail/mount PROVIDES an optic-mount.**
  Source (devlog, operator-provided): "mount a rail before a sight." Slot-level gating -- ANY
  rail/mount providing the slot satisfies ANY optic (never part-to-specific-part).
  Encoding when the real parts land:
  - an `optic` part: `requires_slots = '{optic-mount}'`, `provides_slots = '{}'`
  - a `side-rail` / `upper-barrel` / `optic-mount` part: `provides_slots = '{optic-mount}'`,
    `requires_slots = '{}'` (mounts on the bare weapon)
  - a `canted` optic: shares a `toggle_group` with its primary optic; it ALSO requires an
    optic-mount. (The canted-toggle is a confirmed OPTION on optics; whether a canted optic needs
    its OWN separate mount is NOT stated -- held, section 5.)

No other dependency edge is stated in the sources. Everything in section 5 is INFERRED and NOT
encoded.

---

## 4. Size-vs-control design principle (NOTES only -- never numbers)

Stated DESIGN PRINCIPLE, not per-part values: Compact / Short / Light parts = faster handling,
less stable; Long / Heavy parts = slower handling, more stable. This is a `notes`-field sentence
on the relevant `barrel` / `stock` parts when they land (e.g. notes: "Short barrel: faster
handling, less stability per the stated size-vs-control rule; exact values unpublished"). The 8
effect axes stay NULL -- no numbers are published, so none are asserted.

---

## 5. INFERRED but NOT stated -- HELD, not seeded

Plausible from the taxonomy but NEVER explicitly stated, so NOT encoded (would be inference
dressed as fact):

- `muzzle` REQUIRES `barrel` (threading) -- inferred; not stated. HELD.
- `upper-barrel` PROVIDES a top rail distinct from `optic-mount` -- inferred; not stated. HELD.
- `optic` (canted) requires its OWN separate mount vs sharing the primary's -- unstated. HELD.
- any ordering among barrel / muzzle / magazine / trigger / grip / stock -- unstated. HELD
  (they are treated as base-weapon slots, `requires_slots = '{}'`, until a rule is published).
- which `optic` subtypes (iron/close/mid/long) gate on which mount tier -- unstated. HELD.

These re-open only when a source states them. Recorded here so step 2 does not silently adopt them.

---

## 6. UNPUBLISHED -- must NOT be seeded until sourced

- **The ~400 NAMED PARTS.** No published parts list. Do NOT invent part names/rows. (This is why
  Option A -- the table stays empty.)
- **All NUMERIC VALUES** (the 8 effect axes: ads_speed, switch_speed, reload_speed, recoil_h,
  recoil_v, spread, kick, ammo_capacity). Unpublished -> `effects` stays null.
- **The PER-GUN COMPATIBILITY MATRIX** (`bodycam_attachment_weapon` rows). Unpublished which parts
  mount on which guns -> section 7: seed NONE.
- **RP costs, per-part rarity, which specific parts are cosmetic.** Unpublished -> rp_cost,
  rarity, is_cosmetic left at defaults/null until sourced.
- **The caliber-swap ballistics claim** (devlog-only) is CONTRADICTED by the patch listing "Ammo
  Types" as a slot. Do NOT encode any caliber-swap slot behavior; `ammo` is a plain slot category
  (section 2), nothing more.

---

## 7. `bodycam_attachment_weapon` (compatibility): seed NONE -- confirmed

No per-gun compatibility matrix is published (which parts mount on which weapons, blocked vs
tested, per-weapon suppressor audio). Proposed compatibility seed: **NONE.** The table stays empty
until a sourced matrix exists. Confirmed: zero rows.

---

## 8. Proposed SQL

**None to run.** Per Option A, there is no honest INSERT for either table yet. For reference only,
the shape a SINGLE real part WOULD take once published is shown below -- ILLUSTRATIVE, NOT A SEED,
NOT TO RUN (the name is a placeholder for a real sourced part):

```
-- ILLUSTRATIVE ONLY -- do NOT run. Shows the honest encoding of ONE confirmed optic part when a
-- real, named, sourced part exists. No such part is published yet, so this is not inserted.
-- insert into bodycam_attachments
--   (game_slug, slug, name, slot_type, slot_subtype, requires_slots, provides_slots,
--    effects, is_cosmetic, verified, verified_source)
-- values
--   ('bodycam', '<real-part-slug>', '<Real Part Name>', 'optic', 'close',
--    '{optic-mount}', '{}', null, false,
--    false, 'Reissad Sept 2 2026 "Locked & Loaded" patch - part confirmed; stat values not published');
```

The deliverable of this step is THIS DOCUMENT (the confirmed-structure reference), not rows.

---

## What remains for later steps (gated)

- STEP 2 (seed) fires only when a PUBLISHED, sourced parts list exists: real named parts ->
  `bodycam_attachments` rows (verified=false, effects null, slot_type/subtype from section 2, the
  section-3 edge on optics/rails).
- The per-gun compatibility matrix and all numeric values wait on their own published sources.
- PHASE 3 (DAG builder + arsenal attachment render) is unchanged and still gated.
- bodycam.indexable stays false throughout.
