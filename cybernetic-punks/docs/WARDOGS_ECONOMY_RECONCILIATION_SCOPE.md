# Wardogs Economy-Data Pass -- Reconciliation + Load Plan (SCOPE, for operator review)

**Status:** SCOPE ONLY. No data loaded. Nothing written. This is the plan + the held SQL template
for review. Load runs only AFTER the decisions below (competitor-attribution + the solver fix) are made.

**Discipline (non-negotiable):** the economy dataset is **ATTRIBUTED / community-aggregated,
verified=false** -- same tier as the Swoleguy ballistics. Operator caveat: "community-recorded from
Closed Alpha/Beta, on fan databases as of EA launch; official vendors can still change numbers; always
check in-game." Tier hierarchy: **Bulkhead-official > community-attributed > honest-null.** Where they
conflict, **Bulkhead wins.** Never launder attributed as verified.

---

## 1. Current store state (read-only, verified 2026-09-11)

`weapon_stats` (game_slug='wardogs'), 33 weapons. The 4 economy columns already exist (Phase 1a DDL):

| column | current state | tier |
| --- | --- | --- |
| `credit_cost` | **NULL for all 33** | honest-null (Bulkhead published no per-weapon price list) |
| `unlock_career_level` | **Deagle = 85 only**; rest NULL | Bulkhead-official (S1 changelog) -- AUTHORITATIVE |
| `unlock_class` | NULL for all | honest-null |
| `unlock_class_level` | NULL for all | honest-null |
| `verified` | false for all | attributed posture |
| `verified_source` | set for all 33 | attributed (Swoleguy ballistics provenance) |

33 weapons by type: Assault Rifle (8), SMG (4), Sniper (5), Sidearm (5), Marksman (3), LMG (2),
Shotgun (2), Launcher (3), Bow (1).

---

## 2. What the solver already does (confirmed in `lib/wardogs/loadoutSolver.js`)

- **budget-solve** reads `w.credit_cost` (candidate `.cost`, line ~215). Today NULL -> degrades honestly
  ("Budget filtering unavailable -- no prices published yet"). **Loading `credit_cost` ACTIVATES it, no
  code change to the solve itself.**
- **unlock-gate** reads `unlock_career_level`, `unlock_class_level`, `unlock_class` (lines ~177-182).
  Loading the class-unlock ladders enables class-level progression gating.
- No re-architecture needed to activate cost + progression awareness -- only data (plus the fix in
  section 3).

### 2a. BLOCKER -- a laundering bug that MUST be fixed before/with the load

`inheritProvenance()` (lines ~320-329) hardcodes: **any non-null `credit_cost` -> tier `'official'`**,
and appends **"+ official Season 1 prices"** to the human-readable basis when budget is applied. The
code comment even says "prices, when used, are Bulkhead-official." **That assumption is false for this
pass** -- we are loading community-attributed prices (Bulkhead has published NO per-weapon price list).

- Tier math is safe (`floorTier` keeps the floor at attributed from the ttk rows), BUT the **basis string
  would falsely claim "official Season 1 prices"** -> laundering. Not acceptable.
- **Fix (required, small, PURE):** the price tier must reflect the data, not be assumed official. Two
  options:
  - **(A) Interim relabel (recommended for NOW):** since 100% of loadable *weapon* prices are attributed
    (no Bulkhead weapon price list exists), change the hardcoded `'official'` -> `'attributed'` and the
    basis to "+ community-attributed prices". Correct for this entire dataset. Re-tier later if Bulkhead
    ever publishes.
  - **(B) Future-proof per-value tier:** add a price-tier signal (e.g. `credit_cost_tier` column) and
    have `inheritProvenance` read the actual tier per weapon. More work + DDL; only needed once official
    and attributed weapon prices must coexist. Not required now.

  Recommendation: ship **(A)** with this pass (keeps it honest + lean); keep **(B)** as the documented
  re-tier path for when Bulkhead publishes.

---

## 3. Reconciliation table (dataset value -> store column -> tier -> conflict)

### Loads NOW into `weapon_stats` (activates the advisor)

| dataset value | -> store column | tier | conflict / rule |
| --- | --- | --- | --- |
| Weapon base prices (free starters $0; ARs $600-$6500; SMGs; shotguns; LMGs; marksman; snipers to $8800; sidearms; launchers) | `credit_cost` | **community-attributed** | none (no Bulkhead weapon price list exists -- honest-null -> add attributed tier below confirmed). Load full (post-discount) prices; the sub-Wardog-L9 50% discount is a display/mechanics note, NOT stored per weapon. |
| Class-unlock ladders (e.g. AK74 @ Assault 3, M4 @ Assault 20, MP5 @ Medic 15) | `unlock_class` + `unlock_class_level` | **community-attributed** | Was deliberately DEFERRED in Phase 1a; this pass loads it explicitly-attributed. Do NOT contradict a Bulkhead career gate (see Deagle). |
| Deagle career gate | `unlock_career_level` = **85** | **Bulkhead-official** | ALREADY LOADED. **Do NOT overwrite.** If the community dataset lists a different/again value, Bulkhead's 85 WINS. A community *class* gate for Deagle may coexist only if it does not undercut L85. |

### CONFLICTS flagged (Bulkhead supersedes)

| value | community (attributed) | Bulkhead-official (wins) | resolution |
| --- | --- | --- | --- |
| **FOB** (forward base, structure) | **$2,500** | **$7,500** (S1 changelog) | Bulkhead $7,500 supersedes. **Not a `weapon_stats` value** -- FOB is a structure -> DEFERRED table, load at $7,500 (official) there, not now. |
| Deagle unlock | community class-gate (if any) | **Career L85** (S1) | keep L85 (official); do not let a community value overwrite. |
| Artillery unlock | community | **Career L90** (S1) | vehicle/structure -> DEFERRED table; load official. |
| Heavy Tank (Driver) | community | **Driver L35** (S1) | vehicle -> DEFERRED table; load official. |

### DEFERRED (NOT this pass -- out of scope for the advisor activation)

| dataset section | proposed home | why deferred |
| --- | --- | --- |
| Vehicles, armor/helmets, equipment/packs, ammo (by caliber/load) | **new tables** (see DDL, section 6) | the advisor's budget-solve is weapon-slot; vehicles/armor/equipment are a later solver dimension. Load once the tables + a consuming surface exist. |
| Cash-unlock ladders (total ~$9.86M; Career $3.19M, Recon $1.94M, Support/Medic/Infantry/Pilot/Driver...) | **progression/economy reference** (content or a `wardogs_progression` table) | these are account-progression cash gates, not per-weapon; they inform a progression page, not `credit_cost`. |
| Economy mechanics (persistent cash, 90% round refund, Hot Zone double-pay, Gold Bars, money loops, sub-L9 50% discount) | **content / reference** (the cash-economy article already scoped) | narrative/reference, not structured solver inputs. |

---

## 4. Capability unlocked (per column loaded NOW)

- `credit_cost` (attributed) -> **budget-solve ACTIVATES**: "best loadout for $X", best-TTK-per-dollar,
  budget-conscious recs. The dormant capability switches on the moment prices land (+ the section-2a fix
  so it is labeled attributed, not official).
- `unlock_class` + `unlock_class_level` (attributed) -> **class progression gating**: "at YOUR class
  level, here's what you can field." Feeds the unlock-gate pre-filter (locked items never reach the LLM).
- Together: **unblocks the B2 grid** (class x budget x level) -- it auto-activates once these columns are
  populated (per the fan-out HANDOFF note).
- Output tier: inherits the **attributed floor** (value/cost reasoning from attributed prices is itself
  attributed). Bulkhead prices, if ever published, SUPERSEDE (a re-tier, not a rebuild).

---

## 5. Competitor-attribution decision (operator)

Much of the price data traces to **wardogshub.gg (a DIRECT competitor)** + wardogs.zone / wardogshq.gg.
Our provenance UI shows sources; naming them sends users to a competitor.

- **Option A -- attribute to specific fan DBs** ("wardogshub.gg, wardogs.zone"). Most granular/honest,
  but advertises a direct competitor in our own provenance line.
- **Option B -- source as "community-aggregated (multiple fan databases), attributed" (RECOMMENDED).**
  Honest (it genuinely IS aggregated from multiple fan sources), still clearly attributed/verified=false,
  and does not hand a referral to a direct competitor. Consistent with how we phrase the attributed tier.

Recommendation: **B.** Set `verified_source` on the price rows to a general community-aggregated string.
(Decision needed before load -- it sets the exact `verified_source` text.)

---

## 6. DDL

- **NOW:** none. The 4 `weapon_stats` columns already exist (Phase 1a). Section-2a fix (A) is a code
  change, not DDL.
- **If (B) future-proof price tiering is chosen:** `ALTER TABLE weapon_stats ADD COLUMN credit_cost_tier
  text;` (additive, null for every game). Not required for this pass.
- **DEFERRED tables (later pass, proposed, not now):** `wardogs_vehicles`, `wardogs_armor`,
  `wardogs_equipment`, `wardogs_ammo`, `wardogs_progression` (cash/level ladders). Each with its own
  tier/verified_source columns. Design when a consuming surface is scoped.

---

## 7. Held load SQL (TEMPLATE -- do NOT run; exact values from the operator dataset at load)

Per-weapon UPDATEs, scoped `game_slug='wardogs' AND name=...` (cross-game-safe), semicolon-safe (no
semicolons inside strings -- the Supabase-splitter lesson), re-runnable. Exact prices/levels are filled
from the operator's dataset once section-5 attribution + section-2a fix are decided. Deagle
`unlock_career_level` is NOT touched (Bulkhead L85 stands).

```sql
-- WARDOGS ECONOMY PASS (attributed) -- HELD. Fill <PRICE>/<CLASS>/<LVL> from the operator dataset.
-- Prices are COMMUNITY-ATTRIBUTED (verified stays false). Bulkhead-confirmed values are NOT overwritten.
-- <SRC> = the section-5 decision, e.g. 'Community-aggregated fan databases (attributed, beta/EA-recorded)'

-- free starters (community-attributed $0)
UPDATE weapon_stats SET credit_cost = 0, verified_source = '<SRC>'
  WHERE game_slug = 'wardogs' AND name = 'M4';        -- example starter; confirm which are $0

-- priced weapons (one row each; <PRICE> from dataset)
UPDATE weapon_stats SET credit_cost = <PRICE>, verified_source = '<SRC>'
  WHERE game_slug = 'wardogs' AND name = 'FAL';
-- ... one UPDATE per priced weapon (33 total, minus starters) ...

-- class-unlock ladders (community-attributed) -- do NOT set for weapons whose gate is Bulkhead-career
UPDATE weapon_stats SET unlock_class = '<CLASS>', unlock_class_level = <LVL>
  WHERE game_slug = 'wardogs' AND name = 'AK74';      -- e.g. Assault, 3
-- ... one per weapon with a known class gate ...

-- Deagle: DO NOT TOUCH unlock_career_level (Bulkhead L85 authoritative).
```

Plus the **section-2a code fix** to `lib/wardogs/loadoutSolver.js` (`inheritProvenance`): `'official'` ->
`'attributed'`, basis "+ community-attributed prices". Ships in the same gated branch as the load.

---

## 8. Decisions needed before load

1. **Competitor attribution** (section 5): A (name fan DBs) or B (community-aggregated, recommended)?
2. **Solver fix** (section 2a): confirm (A) interim relabel now (recommended) vs (B) per-value tier column.
3. **Dataset values**: provide the exact per-weapon prices + class-unlock ladders to fill the template.
4. **Deferred scope**: confirm vehicles/armor/equipment/ammo/cash-ladders/mechanics stay OUT of this pass.

On decisions, this becomes a single gated migration (`docs/migrations/2026-..-wardogs-economy.sql`) +
the solver fix, verified read-only (cross-game-safe, semicolon-safe), for operator run per rule 2.
