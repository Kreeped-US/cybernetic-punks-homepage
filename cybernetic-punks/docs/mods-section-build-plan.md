# /mods Reference Section - Build Plan (PROPOSAL ONLY)

**READ-ONLY investigation.** SELECT-only DB reads; nothing built, nothing changed.
Generated against `main` @ `fc502b2`.

**The gap this closes:** `mod_stats` has **202 rows** and **no `/mods` route**, while ~60-80
published articles orbit the mod system with no canonical to consolidate toward. Every other
entity table has a reference section (`/shells/[slug]`, `/weapons/[slug]`, `/maps/[slug]`,
`/uniques/[slug]`); mods are the one populated table without one.

---

## 1. The model to copy (read end-to-end)

`app/weapons/[slug]/page.js` + `app/weapons/page.js` are the proven template:

| element | how /weapons does it |
|---|---|
| route | `app/weapons/page.js` (index) + `app/weapons/[slug]/page.js` (detail), `dynamic='force-dynamic'`, **no `generateStaticParams`** - new DB rows "just work" |
| slug | `weapon_stats` has no slug column -> `nameToSlug(name)` (lowercase, non-alnum runs -> `-`); resolved by fetching all names and finding the match |
| data | `weapon_stats.*` + `meta_tiers` (type='weapon') + `unique_weapons` + DEXTER builds + articles, all in one `Promise.all` |
| metadata | per-entity `title` (no `\| CyberneticPunks` - the root `title.template` appends it), spec-led `description`, `alternates.canonical`, OG + Twitter, per-entity OG image w/ `og-image.png` fallback |
| JSON-LD | **BreadcrumbList** (Home > Meta > Entity) + **WebPage** with `mainEntity: Thing` carrying stats as `additionalProperty` PropertyValue pairs + **FAQPage** |
| honesty | `dateModified` **omitted** when there is no real date (never `new Date()` - that would fake freshness); every stat emitted only when non-null |
| index | grouped by `weapon_type`, BreadcrumbList + **CollectionPage/ItemList** JSON-LD, visible breadcrumb |
| linking | `components/Nav.js` top row (`SHELLS / WEAPONS / UNIQUES / FACTIONS`) + homepage tools row (`app/page.js:424`) |
| sitemap | static entry (`priority 0.85`, `changeFrequency daily`) + dynamic per-entity URLs derived from the table with the **same** `nameToSlug` rule |

---

## 2. The data: what `mod_stats` can honestly support

**202 rows.** Completeness (non-null of 202):

| field | fill | usable? |
|---|---|---|
| `name`, `slot_type`, `rarity`, `verified`, `game_slug`, `updated_at` | **100%** | yes |
| `effect_desc` | **99%** (200) | **yes - the core field** |
| `credit_value` | 92% (186) | yes |
| `effect_summary` | 72% (146) | yes |
| `ranked_viable` | 28% (57) | partial |
| `stat_changes` | 20% (40) | partial |
| `notes` | 5% (11) | no |
| `patch_verified`, `verified_source` | 8% (17) | no |
| `rarity_available` | 4% (9) | no |
| `effect_detail`, `compatible_categories`, `ranked_impact`, `ranked_notes` | **1-2%** | **no** |
| `compatible_weapons`, `source_url`, `image_filename`, `faction_source` | **0%** | **no** |
| `slug` | **29%** (58) | **TRAP - see below** |

**Page viability is good on the core field:** 200/202 mods have effect text. Only **2** would be
near-empty (`Farshot Barrel`, `Rangefinder Lens`).

### Slot distribution (the natural grouping axis)
`Chip 69 · Magazine 43 · Barrel 33 · Optic 29 · Grip 13 · Shield 10 · Generator 5`

### Rarity
`Enhanced 67 · Superior 47 · Deluxe 42 · Prestige 27 · Standard 19`

### DATA GAPS that must be decided before building (the Rook-squad-tier equivalents)

1. **`compatible_weapons` = 0%, `compatible_categories` = 1%.** The page **cannot answer the #1 mod
   question: "which weapons can use this mod?"** This is the single biggest gap. A `/mods/[slug]`
   page without it is a name + effect sentence + rarity.
2. **Mods will NEVER have a tier.** `app/api/cron/route.js:576` filters the NEXUS regrade to
   `type === 'weapon' || type === 'shell'` - **`meta_tiers` structurally never receives mod rows**.
   So `/mods` pages cannot have the "Is X good in ranked?" FAQ or the live-tier freshness signal
   that makes `/shells` and `/weapons` strong. **This is the key asymmetry: /mods is structurally
   thinner than the template it copies.**
3. **`image_filename` = 0%** - no per-mod art; OG images fall back to `og-image.png` (weapons
   already handles this fallback).
4. **`slug` column exists but is only 29% populated.** A trap: a future dev may assume it is
   authoritative. **Recommend deriving from `name` (the weapons precedent) and ignoring the column**,
   or populating it as a data task - not half-and-half.

### BLOCKER: 51 duplicate mod names -> the /weapons slug pattern BREAKS

`nameToSlug` over 202 rows yields only **151 unique slugs**. Confirmed collisions include
`Weighted Barrel`, `Steady Barrel`, `Precision Barrel`, `Ironhold Barrel`, `Quickfire Barrel` -
each appearing **twice** (almost certainly the same mod at different `rarity` tiers, since `rarity`
is 100% populated and `rarity_available` is not).

The weapons resolver does `data.find(w => nameToSlug(w.name) === slug)` - with duplicates it
**silently returns the first match and hides the rest**. Copying the template verbatim would ship
a bug. **Forced deviation:** one page per **mod NAME**, aggregating its rarity variants and showing
the rarity ladder (~**151** pages). Flagging rather than silently copying.

### Article cross-link does NOT transfer
`/weapons/[slug]` pulls related articles via `.contains('tags', [nameToSlug(name)])`. Across all
published Marathon articles there is exactly **1** mod-name tag (`ballistic-shield`). Article tags
are category-level (`ranked` 559, `shells` 334, `weapons` 243, `builds` 128, `cradle` 123), not
mod-level. **The "articles about this mod" section would be empty on ~all 151 pages** - omit it, or
match on headline/body text instead (a different mechanism, needs its own design).

---

## 3. Proposed route structure

```
/mods                     index/hub  - all mods grouped by slot_type (Chip/Magazine/Barrel/...)
/mods/[slot]              category   - 7 pages (chip, magazine, barrel, optic, grip, shield, generator)
/mods/[slug]              detail     - ~151 pages, one per mod NAME (rarity ladder on-page)
```

**Why a `[slot]` tier the weapons template does not have:** the orbiting articles are
**slot-level**, not mod-level - "Complete Magazine Mod Guide", "Barrel Mod Guide", "Chip Priority
Guide", "Weapon Mod Priority Guide". Their canonical is a **magazine-mods page**, not a page about
one specific magazine mod. **Without `/mods/[slot]` the consolidation has no target** - index+detail
alone (the pure weapons shape) would not close the gap that motivated this work.

**Naming collision to respect:** `/mods` (reference) is **distinct from `/guides/mods`** (an existing
guide category in `GUIDE_CATEGORIES`, sitemap.js:33) - exactly the documented `/maps` vs
`/guides/maps` precedent (sitemap.js:24-25). Do not conflate; both coexist.

### What each page displays (honestly, from real data)

- **`/mods`** - 202 mods grouped by slot, each with name + rarity + `effect_summary`/`effect_desc`.
  BreadcrumbList + CollectionPage/ItemList JSON-LD, visible breadcrumb. **Fully supported today.**
- **`/mods/[slot]`** - all mods in that slot, sorted by rarity, with effects + `credit_value`; a
  short honest intro on what the slot does. BreadcrumbList + CollectionPage. **Fully supported.**
- **`/mods/[slug]`** - name, slot, **rarity ladder** (the variant rows), `effect_desc`,
  `credit_value`, `stat_changes` when present (20%), `ranked_viable` when present (28%), the
  `verificationTag` 3-state marker. **NO tier** (impossible - see gap 2), **NO weapon compatibility**
  (gap 1), **NO art** (gap 3), **NO related articles** (tag gap). Honest but modest.

---

## 4. Linking plan (unlinked reference pages don't get crawled)

- **`components/Nav.js`** - add `MODS` to the top row alongside `SHELLS / WEAPONS / UNIQUES /
  FACTIONS` (line 19-22).
- **`app/page.js:424`** - add to the homepage tools row next to Weapons
  (`{ href: '/mods', glyph: '...', label: 'Mods', sub: 'Every mod, every slot' }`).
- **`/weapons/[slug]`** - a "compatible mods" cross-link would be the strongest signal, but it is
  **blocked by the 0% `compatible_weapons` data gap**. Until that is filled, link
  `/weapons` -> `/mods` at the section level only. Do not fake per-weapon compatibility.
- **`/mods/[slug]` -> `/mods/[slot]` -> `/mods`** internal ladder + sibling mods in the same slot
  (mirrors weapons' "other weapons of this type" nav).

## 5. Sitemap + metadata plan (same tier as the other sections, not second-class)

- **Static**: add `/mods` to the static list at `app/sitemap.js:61-64` with `priority 0.85`,
  `changeFrequency 'weekly'` (mods change less than the daily-regraded shells/weapons).
- **Dynamic**: add a `mod_stats` block mirroring the `weapon_stats` block (sitemap.js:145-153) -
  derive slugs with the **same** `nameToSlug` rule, **deduped by name** (151 URLs, not 202), plus the
  7 `/mods/[slot]` URLs. New mods self-add once inserted.
- **Metadata**: per-mod `title` = `Marathon <Mod> - <Slot> Mod Effect & Rarity` (no
  `| CyberneticPunks` suffix - the root template appends it), effect-led description,
  `alternates.canonical`, OG/Twitter with `og-image.png` fallback.
- **JSON-LD**: BreadcrumbList (Home > Mods > [Slot] > Mod) + WebPage w/ `mainEntity: Thing` +
  `additionalProperty` PropertyValue pairs (Slot, Rarity, Credit Value, stat_changes) + FAQPage
  **only where a real answer exists** (skip "is it good" - no tier data).
- **Honesty**: `dateModified` from `mod_stats.updated_at` (100% populated) - never `new Date()`.

---

## 6. The consolidation unlock (rough mapping - NOT a cut list)

The live hidden mod stacks found in the 636-unclassified characterization, and where they'd point:

| orbiting stack | indexed | canonical target | covers it? |
|---|---|---|---|
| "Complete Magazine Mod Guide: Master Your Reload Speed..." x4 | 4 | `/mods/magazine` | **YES** - 43 magazine mods + effects is a superset |
| "Complete Marathon Magazine Mod Guide: Essential Reload..." x3 | 3 | `/mods/magazine` | **YES** (same target - the two stacks are the same topic) |
| "Complete Marathon Barrel Mod Guide: Essential Range/Accuracy..." x3 | 3 | `/mods/barrel` | **YES** - 33 barrel mods |
| "Season 2 Arsenal Builds: Essential Weapon Mod Setups" x3 | 3 | `/mods` hub | partial - "builds" framing is `build-guide` intent |
| "Marathon Weapon Mods Guide: Essential Beginner Builds" x1 (post-cleanup re-mint) | 1 | `/mods` hub | **YES** |
| "Marathon Chip Priority Guide", "Weapon Mod Priority Guide" (in the 219 uncategorized; `mod` x64, `chip` x4) | most | `/mods/chip`, `/mods` hub | **likely** - needs the same per-cluster review as the shells |
| "Precision Rifle guides" x5, "BR33 Victory Lap" x3 | 8 | **NOT mods** -> `/weapons/*` | out of scope here |

**Confirmed:** the slot-category pages would genuinely cover what the slot-level guides duplicate
(a `/mods/magazine` page listing all 43 magazine mods with effects is strictly more complete than
any "Complete Magazine Mod Guide" article). **Caveat:** unlike the shells case, there is **no live
tier data**, so the "canonical is always fresher" argument does **not** apply - the argument here is
completeness + a single canonical, not accuracy-vs-rot.

---

## 7. Proposed increments (smallest testable first, like the X pipeline)

- **Increment 0 (DATA, no code) - decide the gaps.** (a) Are the 51 duplicate names rarity variants?
  (b) Fill `compatible_weapons`/`compatible_categories`, or accept that /mods/[slug] cannot answer
  the top question. (c) Derive slugs from name vs populate the 29% `slug` column. **Increments 2-3
  are worth much less until (b) is answered.**
- **Increment 1 - `/mods` hub only.** One page, grouped by slot, mirroring `app/weapons/page.js`
  (metadata + BreadcrumbList + CollectionPage + visible breadcrumb) + sitemap static entry + Nav and
  homepage links. **Independently shippable and testable**: it renders 202 real mods and gives the
  orbiting guides a first canonical target. No new data needed.
- **Increment 2 - `/mods/[slot]` (7 pages).** The actual consolidation canonical. Sitemap + internal
  ladder. Still no new data needed.
- **Increment 3 - `/mods/[slug]` (~151).** Needs the Increment-0 name-collision decision; ship with
  the rarity ladder; accept the 2 thin pages or exclude them.
- **Increment 4 - cross-links.** `/weapons/[slug]` -> compatible mods (**only after** the
  compatibility data exists).
- **Increment 5 - consolidation.** Per-cluster noindex of the orbiting mod guides toward the new
  canonicals - the same gated, per-cluster approval flow as the shell tier/meta pass.

## Confidence / caveats

- Route + metadata + sitemap + JSON-LD plan is **high confidence** - read directly from the shipped
  `/weapons` implementation.
- Data completeness numbers are **exact** (computed over all 202 rows).
- The **duplicate-name diagnosis** ("same mod at different rarities") is **inferred** from rarity
  being 100% populated while `rarity_available` is 4% - **verify against 2-3 real rows before
  building Increment 3.**
- The consolidation mapping is **rough** - based on headline patterns from the 636-characterization,
  not a per-article body read. It is a target map, not a cut list.
