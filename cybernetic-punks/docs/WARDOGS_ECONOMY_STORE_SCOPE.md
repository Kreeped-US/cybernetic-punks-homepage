# Wardogs Economy Store + Ammo-Cost Advisor -- SCOPE (design, for operator review)

**Status:** SCOPE ONLY. No tables created, no data loaded, no code changed. Design + load plan +
held decisions. Load/DDL runs only after the decisions in section 8.

**Doctrine:** the internal store feeds **EDITORS + the advisor** (internal fuel, not public reference).
So the full economy dataset (vehicles/armor/ammo/equipment/mechanics/gold) is **editor-fuel** -- the
Economy editor writes economy content from it -- even where the advisor doesn't consume it. The advisor
consumes what it can (ammo cost). Captured honestly-tiered.

**Tier posture (operator-confirmed):** community-attributed / Season-1-observed (verified=false) EXCEPT
the handful of Bulkhead-official S1 moves (FOB $7,500; Artillery Career 90; Heavy Tank Driver 35; Deagle
Career 85 [loaded]; XP curves; the loop mechanics). Bulkhead-official > community-attributed >
honest-null. "No official all-items price book -- treat dollar figures as Season 1 observed."

---

## 1. Current store (read-only, verified 2026-09-11)

- `weapon_stats` (wardogs, 33): weapon `credit_cost` + `unlock_class`/`unlock_class_level` LOADED
  (community-attributed); Deagle `unlock_career_level=85` (Bulkhead-official). `ammo_type` holds the
  **caliber** (15 distinct -- the ammo join key, section 4).
- `wardogs_ballistics` (3600) + `wardogs_ttk` (450): body_part x **ammo_type (FMJ/HP/AP)** x armor_tier.
  The viz already shows TTK by ammo class -- the ammo COST is the missing other half.
- **Economy tables do NOT exist** (`wardogs_ammo` / `wardogs_vehicles` / `wardogs_equipment` /
  `wardogs_economy_facts` all "not found"). This pass creates them (DDL, section 6).

## 2. How the store feeds the Economy editor (the doctrine mechanism)

- Editors run through `lib/editorCore.js` -> `fetchGameContext(slug)` builds cached game context + a
  **storeRegistry**, with **store-row citation** (`makeStoreMinter`, `toolWithStoreCites`,
  `renderRelationLine`): store rows become bracketed context blocks the editor CITES by id.
- The Economy editor persona exists: **Vera Sloan -- "Economy & Market" ($)** (`lib/editors/roster.js`),
  currently tied to DMZ. Wiring the new wardogs economy tables into `fetchGameContext`'s store registry
  makes their rows citable -> Vera writes Wardogs economy guides/meta ("what to save for", "is HP worth
  it", vehicle-cost breakdowns, the money loop) **citing store rows with their tier**. Attributed rows
  render attributed; Bulkhead-official rows (FOB, gates) render official. That is the doctrine realized.

## 3. Dataset structure (operator-provided; to be tiered on load)

| section | content | home (proposed) |
| --- | --- | --- |
| 1 weapons | per-life price + class-unlock | `weapon_stats` -- **LOADED** |
| 2 vehicles (~20) | spawn $ + unlock gates | `wardogs_vehicles` (new) |
| 3 ammo | per-caliber $/rd, FMJ/HP/AP multiplier, ammo-type career gates | `wardogs_ammo` (new) -- **advisor + editor** |
| 4 medical / build / armor / helmets / equipment | cost + gates + effect | `wardogs_equipment` (new) |
| 5 gold / mechanics / the loop / unlock totals | economy facts | `wardogs_economy_facts` (new) |

---

## 4. Ammo-cost advisor integration (the advisor-fuel piece)

**Goal:** the budget-solve currently costs only the GUN. Real per-life cost = gun price + **ammo cost**,
and HP/AP are a big multiplier -> accurate budget AND "best TTK per dollar" reasoning (the viz already has
the TTK-by-ammo half).

**The join:** `weapon_stats.ammo_type` (15 calibers: `.308 Win`, `5.56x45mm`, `9x19mm`, `7.62x54mm`,
`.50 Cal`, `12 Gauge`, `40mm grenade`, `84mm anti-tank`, `93mm rocket`, `Standard Arrows`, ...) =
`wardogs_ammo.caliber`. **Flag:** the join needs EXACT caliber-string match -- load `wardogs_ammo.caliber`
with the identical strings (normalize once, verify no orphan caliber). Single-type ordnance
(grenade/rocket/anti-tank/arrows) has no FMJ/HP/AP split -> model as `ammo_class='Standard'`.

**Cost model (decision needed -- section 8.1):** ammo cost per life = `cost_per_round x rounds_per_life`,
where `rounds_per_life` is a modeled constant. Proposed: `magazine_size x N` (N=3 mags) with a flat
fallback (e.g. 90) when magazine_size is null. This is an explicit modeling assumption, surfaced as such.

**Solver changes (pure, Phase E1):**
- `loadLoadoutContext` also loads `wardogs_ammo`; passes it to `assembleLoadout` -> solver.
- `rankByEffectiveness` builds each candidate's cost as `{ gunCost, ammoCost, cost: gunCost+ammoCost }`,
  where `ammoCost = ammoCostFor(caliber, profile.ammo, rounds_per_life)` -- so the SAME gun costs more to
  run with HP/AP (aggressive/tactical profiles) than FMJ. `budgetSolve` already sums `candidate.cost`; it
  just gets the accurate number. UI can show the gun/ammo breakdown.
- **Ammo-type career GATE** (e.g. 5.56 AP Career 83): if the profile's ammo class for a weapon's caliber
  has `unlock_career_level > player.careerLevel`, the weapon can't run that ammo. **Behavior decision
  (8.2):** recommend DOWNGRADE to the best available class <= player level + FLAG ("AP locked at your
  level -- costed/scored on FMJ"), not silent drop. Honest + keeps the pick usable.
- **TTK-per-dollar:** value = effectiveness score vs total cost; the DATA (ammo cost) enables it; the
  number is SURFACED in a later output pass (THE READ / card), same as the budget surface pass.
- Provenance: ammo cost is community-attributed -> stays within the attributed floor (the section-2a
  no-launder fix already governs prices; ammo inherits the same posture).

---

## 5. Honest-null gaps (do NOT fake)

- The 4 unrecorded guns (e.g. 9K333 Verba) -- not in the 33, no price/ballistics -> honest-null.
- Any caliber with no community $/rd -> ammo cost honest-null (that weapon costs gun-only, flagged).
- Exact on-death cash refund %, the live gold->cash rate, unrecorded vehicle/equipment costs -> honest-null.
- Ammo career gates only where community-observed; unknown gates -> not gated (honest-null, "assumed
  available"), same pattern as the class-level gates.

---

## 6. DDL (all new; additive; per-row tiering)

All tables: `id` (pk), `game_slug` text, `tier` text ('attributed' | 'official'), `verified` bool default
false, `verified_source` text, `notes` text, `updated_at`. Plus:

```sql
-- ammo (advisor + editor)
CREATE TABLE wardogs_ammo (
  id bigint generated always as identity primary key,
  game_slug text NOT NULL,
  caliber text NOT NULL,            -- EXACT match to weapon_stats.ammo_type
  ammo_class text NOT NULL,         -- 'FMJ' | 'HP' | 'AP' | 'Standard'
  cost_per_round numeric,           -- null = honest-null
  unlock_career_level int,          -- ammo-type gate (e.g. 5.56 AP = 83); null = no gate
  tier text, verified boolean DEFAULT false, verified_source text, notes text,
  updated_at timestamptz DEFAULT now()
);
-- vehicles (editor-fuel)
CREATE TABLE wardogs_vehicles (
  id bigint generated always as identity primary key,
  game_slug text NOT NULL, name text NOT NULL,
  category text,                    -- Light/Heavy/Armor/Air/Logistics
  spawn_cost numeric, unlock_class text, unlock_class_level int, unlock_career_level int,
  tier text, verified boolean DEFAULT false, verified_source text, notes text,
  updated_at timestamptz DEFAULT now()
);
-- equipment: armor/helmets/medical/build/utility/packs (editor-fuel)
CREATE TABLE wardogs_equipment (
  id bigint generated always as identity primary key,
  game_slug text NOT NULL, name text NOT NULL,
  category text,                    -- Armor/Helmet/Medical/Build/Utility/Pack
  cost numeric, unlock_class text, unlock_class_level int, unlock_career_level int,
  effect text,                      -- honest text (protection, heal, etc.)
  tier text, verified boolean DEFAULT false, verified_source text, notes text,
  updated_at timestamptz DEFAULT now()
);
-- economy facts: mechanics/loop/gold/unlock totals (editor-fuel, key/value)
CREATE TABLE wardogs_economy_facts (
  id bigint generated always as identity primary key,
  game_slug text NOT NULL, fact_key text NOT NULL, label text, value text,
  tier text, verified boolean DEFAULT false, verified_source text, notes text,
  updated_at timestamptz DEFAULT now()
);
```

RLS: match the existing wardogs tables (service-key read; the advisor + editor already use the service
key). Confirm the project's standard grant/policy for the new tables at load.

## 7. Load plan (phased)

- **Phase E1 -- NOW (advisor accuracy):** DDL + load `wardogs_ammo`; solver integration (ammo cost in
  candidate.cost, ammo-type gate, `loadLoadoutContext` load); a follow-on surface pass shows gun+ammo
  cost + TTK-per-dollar. This is the advisor upgrade. Held migration + code, gated.
- **Phase E2 -- editor-fuel (with the Economy editor):** DDL + load `wardogs_vehicles`,
  `wardogs_equipment`, `wardogs_economy_facts`; wire into `fetchGameContext` store registry so Vera Sloan
  cites them. Ships when the Wardogs Economy editor is activated.
- Bulkhead-official rows carried at load: FOB $7,500 (`wardogs_equipment`, Build, official -- supersedes
  community $2,500); Artillery `unlock_career_level=90` + Heavy Tank `unlock_class='Driver'
  unlock_class_level=35` (`wardogs_vehicles`, official); XP curves + loop facts
  (`wardogs_economy_facts`, official). Everything else attributed.
- Class-level gating wiring (pass `classLevels` through `assembleLoadout`) is a SEPARATE small follow-up
  already flagged in the economy-load verification -- independent of this scope.

## 8. Decisions needed before load

1. **Ammo cost model:** `rounds_per_life = magazine_size x N` (propose N=3) with flat fallback -- confirm
   N + fallback, or give a preferred combat-load number.
2. **Ammo-gate behavior:** downgrade-to-available + flag (recommended) vs drop the weapon.
3. **Phasing:** E1 now (ammo -> advisor) then E2 with the editor (recommended), or load all economy
   tables together now.
4. **Table granularity:** the 4 typed tables above (recommended -- ammo needs clean join columns; typed
   columns help editor citation) vs a single general `wardogs_economy_items` (type + jsonb attrs).
5. **Confirm the Bulkhead-official set** to tier `official` (FOB 7,500; Artillery 90; Heavy Tank Driver
   35; XP curves; loop facts); everything else `attributed`.
6. **Provide the dataset values** (vehicles list + gates; ammo $/rd + multipliers + gates; equipment;
   facts) to fill the held load SQL.

On decisions, this becomes: the DDL migration + `wardogs_ammo` load + the solver ammo-integration (E1,
gated, held for operator run + read-only verify), then E2 with the editor wiring. Do NOT load until then.
