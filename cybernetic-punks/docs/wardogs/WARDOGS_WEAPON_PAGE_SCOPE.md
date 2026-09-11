# Wardogs Weapon Page -- SCOPE (competitor-polish, OUR data, honest; body-part TTK viz as the hero)

**Status:** DESIGN PROPOSAL. No build. No DB writes. HOLD for review.
**Recorded:** 2026-09-11.
**Relationship to existing scope:** EXTENDS `docs/wardogs/WARDOGS_ARSENAL_REVAMP_SCOPE.md` -- that doc
covers the arsenal LIST + tiering + receipts + indexability at a high level; THIS doc specifies the
DETAIL page in full, with the net-new design work: the **body-part damage/TTK visualization** built from
our attributed ballistics matrix. Where the two overlap, this is the more specific authority for the
detail page. The list revamp (Section 8) is confirmed + refined here, not re-derived.
**Grounds in (live-audited):** `wardogs_ballistics` (3600 rows), `wardogs_ttk` (450), `weapon_stats`
(wardogs, 33), the shared `components/wardogs/WeaponImage.js`, `components/network/confidenceTiers.js`,
and the shipped loadout primitives (`SlotCard`/`RankTable`/`MiniBars` in `LoadoutResult.js`).

---

## 0. The frame (one sentence)

Build a weapon page as substantive as the competitor reference, but decisively BETTER on the one thing
our data supports and theirs doesn't -- a body-part diagram that is **ammo- and armor-aware** (theirs is
a single static hit-multiplier) -- rich on what we HAVE (ballistics/TTK), honestly silent on what we
DON'T (velocity/MOA/handling/falloff/slots). Do NOT copy their numbers; out-build them from ours.

**This page is three things at once:** the arsenal DETAIL page, the Channel B per-weapon LEAF, and the
advisor's RECEIPTS target. One page, one component set, three roles.

---

## 1. Data audit -- the honesty boundary (what the page may and may not show)

| Field | Source | Coverage | On the page |
|---|---|---|---|
| name, weapon_type, ammo_type (caliber), rarity, shield_compatible | weapon_stats | 33/33 | show |
| image_filename | weapon_stats -> WeaponImage | 33/33 | show (hero image) |
| fire_rate | weapon_stats (Swoleguy) | 30/33 (3 launchers null) | show, **attributed** badge |
| **damage / shots_to_kill / armor_break_shots per body_part x ammo x armor_tier** | **wardogs_ballistics** | **30/33, DENSE (120 rows each: 8 zones x 3 ammo x 5 tiers, zero gaps)** | **the body-part viz (the hero)** |
| ttk_ms per ammo x armor_tier | wardogs_ttk | 30/33 | TTK summary + curves (reuse MiniBars) |
| flat damage, magazine, reload, ADS/equip/handling, recoil, accuracy, range_meters/falloff, mod slots | weapon_stats | **0/33 (all null)** | **OMIT** (never fabricate/copy) |
| muzzle velocity, MOA, zeroing, attachment slots | (no column) | absent | **OMIT** |
| credit_cost, unlock_class/level | weapon_stats | ~0/33 | honest-null ("price TBD"), unlock shown only where known |

- **8-zone anatomy** (HEAD, CHEST, U STOMACH, L STOMACH, GROIN, UPPER LIMB, LOWER LIMB, EXTREMITY) --
  finer than the competitor's typical 3-zone (head/body/limb) multiplier. A genuine data win, not a
  reskin.
- **Coverage honesty:** the viz renders for the **30** weapons with ballistics; the **3** without
  (launchers -- no ballistics, no TTK) get the honest-null detail page (image + caliber + type + "no
  ballistics data yet"), no fabricated diagram.
- Every ballistics row carries `confidence_tier='attributed'` + `verified_source` (Swoleguy) -- the
  provenance chain is already in the data.

---

## 2. THE BODY-PART VIZ (the hero -- the win over the competitor)

A body diagram (front silhouette, 8 selectable zones) showing, per zone, the kill data from
`wardogs_ballistics` for the currently-selected **ammo** and **armor tier**.

### 2.1 What each zone shows (DECISION)
- **Primary label = shots-to-kill (STK)** -- the actionable number a player wants ("1 to the head, 3 to
  the chest"), and it is what the ammo/armor dimension actually moves. **Recommended primary.**
- **Secondary = damage per shot** -- the underlying number, shown on the zone (smaller) or on
  hover/tap. Keeps the raw value visible without burying the actionable one.
- **Zone color = STK heat** (fewer shots = hotter/accent, more = muted) so the lethal zones read at a
  glance. This is the "hit multiplier chart" reimagined as an outcome, not a coefficient.
- Where `armor_break_shots` is present, surface it on the relevant tiers ("+2 shots to break armor
  first") -- a mechanic the competitor's static chart cannot express.
- DECISION FLAGGED: STK-primary (recommended) vs damage-primary vs a toggle between the two. Lean
  STK-primary with damage secondary; a view-toggle is a cheap add if wanted.

### 2.2 The interaction -- ammo + armor aware (what theirs can't do)
- **Ammo toggle: FMJ / HP / AP.** Reorders the whole diagram (HP melts soft targets, AP holds vs armor)
  -- the dimension a static multiplier chart omits.
- **Armor-tier toggle: 0-4.** The same shot count changes as the enemy armors up -- the other axis
  they can't show.
- **Default profile: FMJ, armor tier 0** (the neutral unarmored baseline -- the most comparable across
  weapons). The advisor reuse (Section 7) instead defaults the toggles to the *playstyle's* profile
  (aggressive -> HP/low tiers, tactical -> AP/high tiers), so the same component gives a personalized
  kill map in the recommendation.
- All 15 ammo x tier states are already in the matrix (dense), so every toggle state is real data --
  no interpolation, no gaps.

### 2.3 Why this beats the reference
Their body chart is one static coefficient per zone. Ours answers "how many shots, with THIS ammo,
against THIS armor, to THIS body part" -- from measured data, honestly attributed. Same screen real
estate, strictly more information, and it is the substrate the advisor reasons on (Section 7).

---

## 3. The stats we HAVE (polished cards -- learn the competitor's layout, use our fields)

A compact stat-card header (image-led), learning the competitor's clean card grid but only our real
fields: **caliber** (ammo_type), **weapon type/class**, **fire rate** (rpm, attributed badge; omitted
for the 3 fire_rate-null launchers), **rarity**, **shield-compatible** (yes/no), and a **TTK summary**
(best-case / balanced TTK headline from wardogs_ttk) with the TTK-vs-armor + TTK-by-ammo MiniBars
(reuse the existing `MiniBars` from LoadoutResult). Hero image via `WeaponImage` (hero size).

---

## 4. Honest omission (DECISION: omit, don't placeholder)

The fields we lack (Section 1: velocity, MOA, handling, mag/reload, recoil, accuracy, range/falloff,
attachment slots) -- **OMIT those sections entirely.** A clean page of what we know beats a wall of
"pending" rows, and it avoids implying we will fill them. ONE honest one-liner near the foot explains
the boundary ("We publish measured ballistics + TTK from community testing; handling, velocity, and
attachment data aren't published yet, so we don't show guesses.") rather than per-field placeholders.
- Contrast with the `pending` tier (confidenceTiers), which is for a KNOWN field whose number is blank
  -- appropriate for `credit_cost`/unlock (honest-null inline), NOT for whole absent sections.
- DECISION FLAGGED: omit (recommended) vs a single collapsed "not yet published" list. Recommend omit +
  the one-liner.

---

## 5. Provenance (the moat, visible)

Every number carries its tier via `confidenceTiers` (TierIcon + label): ballistics + fire_rate =
**attributed** (Swoleguy, bronze ring), calibers/type/rarity = confirmed. The receipts line names the
source artifact. Inherited-provenance discipline: the page never launders attributed data into a
confident claim. Consistent with the loadout hubs + the advisor.

---

## 6. The synthesis funnel (why ours isn't a dead reference table)

The weapon page is the reference SUBSTRATE that FEEDS synthesis, not a dead end. It links UP into the
advisor/hubs:
- "See the FAL in the **best assault-rifle loadout** ->" -> the Channel B type hub (/wardogs/loadouts/
  best/assault-rifle) where this weapon is ranked.
- "**Build a loadout around the FAL** ->" -> the loadouts tool (prefilled where practical).
- Reciprocal mesh: the hubs' board rows + the advisor's recommendation link DOWN to this page as the
  receipts ("TTK from Swoleguy ballistics ->"). Reference <-> synthesis, both directions.

---

## 7. Advisor reuse of the viz (one component, actionable advice)

Extract the body-part viz as ONE shared component -- `components/wardogs/BodyPartViz.js` (client;
props: `weaponName`, `ammo`, `armorTier`, or a resolved ballistics slice) -- used by:
1. the weapon page (interactive: the reader drives the ammo/armor toggles), and
2. the **advisor recommendation** (the recommended weapon's kill-shot diagram, defaulted to the chosen
   playstyle's ammo/armor profile) -- "here's your loadout AND exactly where to aim it with this ammo
   against the armor you'll face." A reference site never gives that; it is synthesis the matrix makes
   possible.
This mirrors the WeaponImage / SlotCard / MiniBars reuse pattern: the ballistics viz is the next shared
Wardogs primitive, feeding the weapon page AND the advisor from one implementation.

---

## 8. Three roles, one page + the arsenal LIST (images already populated)

### 8.1 The detail page = arsenal detail = Channel B leaf = advisor receipts
One route renders all three roles. Proposed: `/wardogs/arsenal/[slug]` (the natural arsenal detail
home; `entitySlugFor('weapon', name)` slug, matching the loadout board + hub links so cross-links line
up). It is the Channel B per-weapon LEAF referenced in the Channel B scope.

### 8.2 INDEXABILITY (reconciles both scopes): NOINDEX at ship, ramp on evidence
Per the arsenal-revamp scope Section 6 AND the Channel B leaf ramp: the per-weapon pages ship
**NOINDEX** (data is attributed / verified=false) and are promoted to indexable in cohorts on
GSC-demonstrated demand + verification -- the same evidence-ramp the Channel B leaves follow. The
type HUBS stay indexable; the LEAVES ramp. No sprout.

### 8.3 The arsenal LIST / roster revamp (where the images land)
`/wardogs/arsenal` today is a thin name+caliber list (a `data` section shell/roster). Revamp to an
image-led roster: every weapon via `WeaponImage` (image_filename is ALREADY populated 33/33 -- no data
task, just surface it), plus tiered summary (caliber, class, fire_rate [attributed], a TTK/ballistics
headline number), Wardogs theme, grouped by weapon_type. Each card LINKS to its detail page (roster ->
receipts). The 3 ballistics-less launchers show image + caliber + type honestly (no fake summary).
- Both surfaces reuse `WeaponImage`; the path convention is already proven live on the loadouts tool +
  the type hubs, so images "just appear" from the populated field. Confirm list + detail both render
  them (expected: yes).

---

## 9. Decisions for review + build order

**Decisions flagged:**
1. Viz primary metric: **STK (recommended)** + damage secondary vs damage-primary vs view-toggle (2.1).
2. Viz default profile: **FMJ / tier 0 (recommended)** on the standalone page; playstyle-profile in the
   advisor (2.2).
3. Missing stats: **omit + one honest one-liner (recommended)** vs a collapsed "not published" list (4).
4. Detail URL: **/wardogs/arsenal/[slug] (recommended)** vs under /wardogs/loadouts/ -- arsenal is the
   natural home; the loadout hubs link into it (8.1).
5. Body diagram rendering: inline SVG silhouette (recommended -- theme-able, crisp, no asset) vs an
   image asset. SVG lets zones color by STK from data.

**Build order (each its own gated task):**
1. `BodyPartViz` shared component (SVG silhouette + ammo/armor toggles) against the real matrix -- the
   net-new piece, buildable + reviewable in isolation.
2. The detail page (/wardogs/arsenal/[slug]) = arsenal detail + Channel B leaf: hero image + stat cards
   + BodyPartViz + TTK curves + provenance + synthesis funnel; NOINDEX.
3. The arsenal LIST revamp (image-led roster -> detail links).
4. Advisor reuse: drop BodyPartViz into the recommendation render (playstyle-defaulted).
5. (Ramp, later) promote per-weapon leaves to indexable on GSC evidence.

**Out of scope here:** any DB writes; copying competitor numbers; the B2 class x budget x level grid
(economy-data pass); fabricating the absent handling/velocity/MOA fields.

---

## 10. Summary for review

- The wedge is the **body-part viz**: 8-zone, **ammo + armor aware** (FMJ/HP/AP x tiers 0-4), STK-primary
  with damage + armor-break, from our dense 30-weapon attributed matrix -- strictly more than the
  competitor's static multiplier, from data we own.
- Rich on what we HAVE (ballistics/TTK/caliber/fire-rate/image), **omit** what we don't
  (velocity/MOA/handling/falloff/slots) with one honest note -- never fabricated or copied.
- ONE page = arsenal detail = Channel B leaf = advisor receipts; NOINDEX at ship, ramp on evidence.
- ONE shared `BodyPartViz` component -> the weapon page AND the advisor (a personalized kill map = advice
  a reference table can't give). The arsenal LIST revamp surfaces the already-populated images via
  WeaponImage and links to the detail (receipts).

**No build. No DB writes. HOLD for review.**
