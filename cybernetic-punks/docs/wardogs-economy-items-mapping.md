# Wardogs economy-items load -- mapping for operator review

Prepared, HELD for review before running. Data from the operator Season 1 economy dump.
Two SQL files (operator-run, rule 2): 2026-09-14-wardogs-economy-items-schema.sql (DDL, run
first) then 2026-09-14-wardogs-economy-items.sql (48-row load). Feeds the /wardogs/economy
category-breakdown ticker + the future Vera Sloan economy editor store.

## Table design (recommended: ONE general table)

wardogs_economy_items (name, category, subcategory, cost, cost_basis, unlock_track,
unlock_level, unlock_fee, tier, verified, verified_source, notes). Weapons stay in
weapon_stats; everything else (buy/spawn X for a cost, optionally gated) fits this shared
shape, so the category-breakdown is one GROUP BY and the editor edits one store.

## Tier reconciliation

- OFFICIAL (verified=true), 3: L2A6 unlock gate (Driver 35 / $500k), SPH-2 unlock gate
  (Wardog 90 / $500k), FOB buy cost ($7,500). For L2A6/SPH-2 the GATE is official, the spawn
  cost is attributed (verified_source says so).
- ATTRIBUTED (verified=false), 45: everything else (community economy dump, Season 1).

## Full mapping (48 loaded rows)

| Item | Category | Cost | Gate | Tier |
|---|---|---|---|---|
| Bobcat | vehicle (ground) | $500 spawn | no gate | attr |
| Kodiak | vehicle (ground) | $2,500 spawn | no gate | attr |
| Dune Buggy | vehicle (ground) | $1,500 spawn | Driver 8 / $25,000 | attr |
| Kodiak M249 | vehicle (ground) | $3,750 spawn | Driver 6 / $50,000 | attr |
| URAL | vehicle (ground) | $5,000 spawn | Driver 3 / $35,000 | attr |
| Kodiak Pickup | vehicle (ground) | $3,000 spawn | Driver 10 / $35,000 | attr |
| Humvee | vehicle (ground) | $3,000 spawn | Driver 15 / $25,000 | attr |
| URAL Defender | vehicle (ground) | $6,000 spawn | Driver 18 / $75,000 | attr |
| Humvee M249 | vehicle (ground) | $3,750 spawn | Driver 25 / $125,000 | attr |
| URAL Defender M249 | vehicle (ground) | $6,750 spawn | Driver 25 / $125,000 | attr |
| Humvee Minigun | vehicle (ground) | $4,500 spawn | Driver 30 / $150,000 | attr |
| L2A6 | vehicle (ground) | $14,000 spawn | Driver 35 / $500,000 | OFFICIAL |
| Gepard | vehicle (ground) | $8,000 spawn | Wardog 45 / fee TBD | attr |
| SPH-2 | vehicle (ground) | $8,000 spawn | Wardog 90 / $500,000 | OFFICIAL |
| MH-6 | vehicle (air) | $6,250 spawn | no gate | attr |
| AH-6M Miniguns | vehicle (air) | $7,000 spawn | Pilot 4 / $50,000 | attr |
| Z20 Lakota | vehicle (air) | $7,400 spawn | Pilot 10 / $35,000 | attr |
| AH-6R Rockets | vehicle (air) | $12,500 spawn | Pilot 20 / $200,000 | attr |
| Z20 Miniguns | vehicle (air) | $8,000 spawn | Pilot 25 / $75,000 | attr |
| Havoc | vehicle (air) | $18,000 spawn | Pilot 35 / $500,000 | attr |
| Level 1 Armor | armor (L1) | $400 buy | gate TBD | attr |
| Level 2 Armor | armor (L2) | $1,000 buy | gate TBD | attr |
| Level 3 Armor | armor (L3) | $2,000 buy | gate TBD | attr |
| Level 4 Armor | armor (L4) | $4,000 buy | gate TBD | attr |
| Ghillie Suit (Body) | armor (Ghillie) | $3,000 buy | gate TBD | attr |
| Level 1 Helmet | helmet (L1) | $200 buy | gate TBD | attr |
| Level 2 Helmet | helmet (L2) | $500 buy | gate TBD | attr |
| Level 3 Helmet | helmet (L3) | $1,500 buy | gate TBD | attr |
| Level 4 Helmet | helmet (L4) | $3,000 buy | gate TBD | attr |
| Ghillie Headwear | helmet (Ghillie) | $2,500 buy | gate TBD | attr |
| Bandage | medical | $200 buy | gate TBD | attr |
| Field Resuscitator | medical | $500 buy | Medic 2 / $10,000 | attr |
| IFAK | medical | $800 buy | Medic 9 / $25,000 | attr |
| Defibrillator | medical | $1,600 buy | Medic 11 / $50,000 | attr |
| Stim Pen | medical | $250 buy | Medic 14 / $25,000 | attr |
| Medical Bag | medical | $2,000 buy | Medic 24 / $25,000 | attr |
| FOB | utility (deployable) | $7,500 buy | gate TBD | OFFICIAL |
| C4 | utility (explosive) | $250 buy | Support 2 / fee TBD | attr |
| C4 Detonator | utility (explosive) | $550 buy | Support 2 / fee TBD | attr |
| Claymore | utility (explosive) | $900 buy | gate TBD | attr |
| Binoculars | utility (optic) | $75 buy | gate TBD | attr |
| Range Finder | utility (optic) | $400 buy | gate TBD | attr |
| M67 Frag | grenade | $200 buy | gate TBD | attr |
| Vest (Tier 1) | vest (T1) | $100 buy | gate TBD | attr |
| Vest (Tier 2) | vest (T2) | $250 buy | gate TBD | attr |
| Vest (Tier 3) | vest (T3) | $400 buy | gate TBD | attr |
| Scout Backpack | backpack | $350 buy | gate TBD | attr |
| Halftrack Backpack | backpack | $15,000 buy | gate TBD | attr |


## FLAGGED -- honest-null / needs operator confirmation before it is complete

| Flag | Detail | Handling |
|---|---|---|
| Armor/helmet gates | Dump gave a RANGE (W3-100, fees up to $150-200k), not per-item | Costs loaded; unlock_track/level/fee = NULL (TBD). Supply per-item to fill. |
| Backpack middle tiers | Only endpoints given (Scout $350, Halftrack $15,000) | Endpoints loaded; middle tiers NOT loaded (need full list). |
| Vest names | Dump gave prices only ($100/$250/$400) | Loaded as Vest (Tier 1/2/3) -- confirm exact in-game names. |
| Verba SAM | Unpriced in the dump | NOT loaded (honest-null). Add when priced. |
| -etc.- gear | Dump list is non-exhaustive | Only named items loaded. Supply the rest for a follow-up load. |
| Gepard / C4 / Detonator fees | Unlock fee not stated | unlock_fee = NULL (TBD). |

## Note on -cost- semantics

cost is a PER-USE price (vehicles: per spawn; gear: per buy) -- it is NOT a one-time unlock
fee (that is unlock_fee) and NOT a lifetime total. The category-breakdown ticker multiplies
these per-use costs by usage assumptions; do not sum -cost- into a headline total.
