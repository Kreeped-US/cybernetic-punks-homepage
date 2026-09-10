# Wardogs /arsenal Revamp -- SCOPE (design proposal)

**Status:** DESIGN PROPOSAL for review. NOTHING built. No DB writes. HOLD.
**Recorded:** 2026-09-10. **Route confirmed:** `/wardogs/arsenal` -> `app/wardogs/[section]/page.js`
(slug='arsenal', source='data') -> `components/wardogs/WardogsArsenal.js`.
**Grounds in:** the image convention (loadouts `WeaponImage`), `components/network/confidenceTiers.js`
(the tier badges), the loaded data (weapon_stats + wardogs_ballistics + wardogs_ttk), and the
internal-data-store doctrine (reference = the SUBSTRATE synthesis runs on -- the advisor's receipts).

---

## 0. Current state (what's there / what's stale)

`/wardogs/arsenal` today renders a THIN, now-STALE roster:
- The route fetches only `name, category, weapon_type, ammo_type, verified, verified_source, notes`
  -- NOT fire_rate, image_filename, unlock, cost, and NO ballistics/ttk.
- `WardogsArsenal.js` (server component) shows per weapon ONLY: name, a "Starter"/"Playtest" marker,
  the starter camo, and the caliber. Grouped by category. A LIST, not a tier list.
- It uses the DMZ "unconfirmed" amber `#ffb400` -- NOT the Wardogs theme accent (`var(--accent)`
  #e0a13a). Theme-inconsistent with the revamped loadouts page.
- The banner copy is OUTDATED: it says "combat stats are not in yet" and "calibers ... stay
  unconfirmed" -- but we have since loaded fire_rate (Swoleguy, attributed) + the full ballistics
  matrix (attributed) + calibers. The page predates those loads.
- No weapon images, no fire_rate, no ballistics, no confidence-tier badges.
- The section is NOINDEX (data sources return sectionHasContent=false while verified=false).

So the revamp: surface the rich data we now have (honestly tiered), add image slots, re-theme to the
vertical, and shape the arsenal as the advisor's receipts substrate.

---

## 1. IMAGE SLOTS (reuse the loadouts convention)

Same convention as the loadouts page: `weapon_stats.image_filename -> /images/weapons/<file>`, honest
"IMAGE PENDING" empty state, `onError` fallback. Because it is the SAME `image_filename` column and
path, **adding a Wardogs weapon image populates BOTH the arsenal AND the loadouts tool at once.**

BUILD NOTE: the `WeaponImage` component currently lives inside `LoadoutsClient.js` (a `'use client'`
component; it needs `useState` for the onError fallback). `WardogsArsenal.js` is a SERVER component.
-> **Extract `WeaponImage` to a shared client component** (e.g. `components/wardogs/WeaponImage.js`,
`'use client'`) and import it in both the loadouts client and the arsenal. One source, two consumers.

PLACEMENT: a weapon-image area on each arsenal card (the card becomes image-led -- image on top / left,
then name + data). On the per-weapon detail page (Section 3), a larger hero image.

---

## 2. SURFACE THE DATA (honestly tiered)

### 2.1 Expand the route fetch
Add to the arsenal select: `fire_rate, image_filename, unlock_career_level, unlock_class,
unlock_class_level, credit_cost` (all exist on weapon_stats). For the ballistics summary, read a
compact per-weapon slice of `wardogs_ttk` (450 rows total -- cheap) and/or `wardogs_ballistics` (for
the detail view; ~120 rows per weapon).

### 2.2 What each weapon shows on the LIST (summary)
- Name + **weapon image** (Section 1).
- **Caliber** (ammo_type) + **class** (category) -- roster facts.
- **Fire rate** (rpm) -- ATTRIBUTED (Swoleguy) -> the attributed tier badge (Section 4).
- A **ballistics summary**: a representative headline number (e.g. best-case TTK, or base damage at a
  reference tier/ammo) -- NOT the whole matrix on the list. With the attributed badge.
- **Prices / unlocks: honest-null** ("price TBD"; unlock shown only where known -- Deagle 85).

### 2.3 The full matrix lives on the DETAIL view (not the list)
The 3600-row damage/STK/armor-break matrix + the TTK curves are too much for the list -- they belong on
a per-weapon DETAIL surface (Section 3), where the arsenal becomes the authoritative reference.

---

## 3. THE SUBSTRATE / RECEIPTS ANGLE (the load-bearing design choice)

Per the corrected SEO thesis, reference is the SUBSTRATE synthesis runs on: a loadout page's authority
is the receipts chain down to the weapon's real numbers. **The arsenal entry is what a loadout page's
recommendation cites.** So the arsenal must expose an authoritative, linkable per-weapon reference.

PROPOSE **per-weapon DETAIL PAGES: `/wardogs/arsenal/[slug]`** (recommended over expandable rows):
- A stable, linkable URL is the receipts TARGET -- loadout pages (Channel B) and shareable artifacts
  (Channel A) link "TTK from Swoleguy ballistics ->" to the weapon's arsenal detail page.
- Shows the FULL honest picture: hero image, caliber/class/fire-rate, and the **full ballistics detail**
  -- damage / STK / armor-break by body_part x ammo(FMJ/HP/AP) x armor_tier, plus the TTK curves
  (reuse the loadouts page's TTK bar viz + the "TTK vs ARMOR" / "TTK by AMMO" mini-bars for
  cross-vertical consistency).
- Every number carries its provenance/tier (attributed Swoleguy); honest-null where absent.
The arsenal LIST (Section 2.2) is the browse/index; each card links to its detail page (the receipts).

DECISION FLAGGED: per-weapon detail pages (recommended, receipts target) vs expandable rows (lighter,
but not a linkable receipts URL). Recommend detail pages.

---

## 4. HONEST TIERING + PROVENANCE (the moat, visible)

- Replace the ad-hoc DMZ amber marker with the shared **`confidenceTiers` language**: attributed data
  (fire_rate, ballistics -- Swoleguy) shows the **attributed** tier badge (bronze hollow ring); the
  `verified_source` string is the citation. Consistent with the loadouts page + /methodology legend.
- **Honest-null**: prices + most unlocks are null -> shown as "TBD"/absent, never guessed (only Deagle
  unlock 85 is Bulkhead-confirmed).
- **REFRAME the stale banner**: from "combat stats are not in yet" to the true state -- "combat
  ballistics are community-tested (Swoleguy), attributed, not owner-verified; calibers + fire rates
  loaded; prices/unlocks not published." Honest + current.
- **"Fastest TTK, not best overall"**: any TTK shown is scoped as time-to-kill (ignores reload/range/
  recoil), never "best gun."

---

## 5. VISUAL REVAMP (Wardogs-native, information-rich, image-ready)

- Re-theme to the Wardogs vertical tokens (`var(--accent)` amber #e0a13a, `--bg-card`, `--border`,
  `--text-*`) -- drop the hardcoded `#ffb400`. Matches the revamped loadouts page.
- Image-led cards (image + name + caliber/class/fire-rate + ballistics summary + attributed badge),
  grouped by category, responsive grid (mobile-safe).
- Reuse the loadouts design patterns (tier badges, TTK bar viz on the detail page, card styling) so the
  arsenal and the loadouts tool feel like one vertical.

---

## 6. INDEXABILITY (keep honest -- flag)

The arsenal is ATTRIBUTED reference (verified=false), and the doctrine is: don't build a public
reference table to out-compete wardogshub on their strength; the SYNTHESIS (loadout) pages are the
indexable SEO play, the reference is the maintained SUBSTRATE/receipts. So:
- **Keep the arsenal + detail pages NOINDEX while the data is attributed/verified=false** -- they serve
  as the internal-consistency receipts + a UX reference, not an indexable wardogshub-competitor.
- Flip to indexable when the data is owner-verified / first-party (a re-tier, not a rebuild).
This keeps the revamp consistent with both the doctrine and the corrected thesis (reference maintained
as the moat's foundation, synthesis is what ranks).

---

## 7. Build order (each its own gated task)

1. **Extract `WeaponImage`** to a shared client component (used by loadouts + arsenal). Small refactor,
   no behavior change to loadouts.
2. **Expand the route fetch** (fire_rate/image_filename/unlock/cost + the ttk summary) + **revamp
   `WardogsArsenal.js`** (theme, image cards, honest-tiered data, attributed badges, reframed banner).
3. **Per-weapon detail pages** `/wardogs/arsenal/[slug]` (the receipts substrate: full ballistics
   matrix + TTK curves, provenance, hero image). Wire the list cards -> detail.
4. (Later, cross-links) When Phase 1d Channel B lands, wire loadout pages' "receipts ->" links to the
   arsenal detail pages.

---

## 8. Operator decisions to flag

1. **Detail pages vs expandable rows** -- recommend per-weapon detail pages `/wardogs/arsenal/[slug]`
   (linkable receipts target).
2. **How much ballistics on the list** -- recommend a single summary number on the list, the full
   matrix on the detail page.
3. **Shared `WeaponImage` extraction** -- recommend extracting to `components/wardogs/WeaponImage.js`
   (one source for arsenal + loadouts).
4. **Indexability** -- recommend keeping arsenal/detail NOINDEX until owner-verified (reference
   substrate, not the indexable synthesis).
5. **Theme fix** -- replace `#ffb400` with `var(--accent)` (#e0a13a). (Recommend yes.)
6. **Ballistics summary metric** -- which single number headlines a weapon on the list (best-case TTK?
   base chest damage? fire rate only?). Flag for the build.

---

## 9. Summary

Revamp `/wardogs/arsenal` into the Wardogs-native, image-ready, honestly-tiered reference that the
loadouts advisor cites: reuse the image convention (shared `WeaponImage`), surface the attributed
fire-rate + ballistics (summary on the list, full matrix on per-weapon detail pages = the receipts
target), theme it to the vertical, badge everything by confidence tier, keep prices/unlocks honest-null
and the pages noindex while attributed. Build order: extract WeaponImage -> revamp the list -> detail
pages -> (later) cross-link from the synthesis pages. **No build in this task** -- plan for review.
