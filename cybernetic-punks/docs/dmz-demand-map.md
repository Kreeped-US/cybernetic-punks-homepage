# DMZ Demand Map (Workstream 1 output)

**Status:** DRAFT for review (2026-07-29). The ranked pre-launch canonical
build queue, reconciled against live routes before commit.
**Owner input:** the query set and demand figures are the operator's completed
Mangools/KWFinder research (six groups). Route/cannibalization verification is
Claude Code's (read-only, against `app/dmz/**`, `lib/dmz/entities.js`, the
`dmz_*` tables, and the `feed_items` DMZ sections).

---

## Doctrine anchor

- **Gate 1: no demand, no page.** Pre-launch, proxy demand (old-DMZ / MW2-2022
  terms) counts as the launch-demand forecast. Every row below traces to a real
  query.
- **Kill-clock exemption.** Pre-launch DMZ pages are exempt from the
  zero-impression kill line until Oct 23, 2026. Zero impressions before launch
  is correct, not failure.
- **Most DMZ demand is launch-gated.** Keys, missions, items, and loadout
  entities have no real names until the game ships (confirmed by the source
  audit: the June 6 2026 CoD Deep Dive enumerates no key/mission/item names).
  So a SMALL pre-launch buildable set is correct by design, not a shortfall.
  The large clusters (per-key, per-mission, per-item, per-loadout) are deferred
  with reasons, not skipped by omission.

## Provenance note on the numbers (read before trusting a cell)

The numeric columns are transcribed VERBATIM from the operator's Mangools /
KWFinder exports, saved as backing evidence under
`docs/research/dmz-demand-2026-07/` (six CSVs + README). The doc-to-CSV column
mapping is a direct copy, no inference:

- `2023_peak` = the CSV `peak_2023` (max monthly across 2020-2026, mostly the
  2023 live-DMZ spike - the launch-demand forecast).
- `current_vol` = the CSV `vol_known` (KWFinder's known recent search volume).
- `KD` = the CSV `kd`.

The fuller `vol_3mo`, `jun_2026`, and `growth_pct` series for each query live in
the CSVs. A BLANK cell means KWFinder returned no data, NOT zero; an explicit
`0` is a real zero read. A blank `KD` means difficulty was UNSCORED (thin SERP),
so `winnable` reads "check" and the SERP must be checked manually before
committing - never treated as "easy" or "0".

---

## The build queue (ranked, priority order)

Priority reflects pre-launch buildability x demand, not raw volume alone: keys
outrank everything on raw volume (12,100 peak) but are launch-gated to a system
hub, so the launch-info hub - the one head term fully answerable pre-launch,
with email capture already wired - leads.

| # | query | 2023_peak | current_vol | KD | winnable | target_canonical | build/extend/merge | launch-gated | status |
|---|---|---|---|---|---|---|---|---|---|
| 1 | mw4 dmz | 5400 | 630 | 48 | check (over cap; authority play) | /dmz | extend | no | live |
| 1 | modern warfare 4 dmz | 1600 | 220 |  | check (KD unscored) | /dmz | extend | no | live |
| 1 | is dmz coming back | 480 | 250 | 43 | check (over cap) | /dmz | extend | no | live |
| 1 | dmz 2026 | 260 | 130 |  | check (KD unscored) | /dmz | extend | no | live |
| 1 | mw4 dmz release date | 480 | 40 | 49 | check (over cap) | /dmz | extend | no | live |
| 1 | dmz mw4 release date | 0 |  |  | check (no volume) | /dmz | extend | no | live |
| 1 | dmz vs warzone (section) | 170 | 40 |  | check (KD unscored) | /dmz | extend | no | live |
| 2 | dmz key locations | 12100 | 20 | 30 | y | /dmz/keys | fork | yes | to-build (fork existing route) |
| 2 | dmz best keys | 720 | 10 | 34 | y | /dmz/keys | fork | yes | to-build (fork existing route) |
| 2 | dmz how to get keys | 70 |  | 37 | check (over cap) | /dmz/keys | fork | yes | to-build (fork existing route) |
| 3 | dmz korea map | 1600 | 1100 |  | check (KD unscored; uncontested) | /dmz/regions/dmz-hajin-exclusion-zone-what-the-deep-dive-reveals | extend | no | live |
| 3 | hajin map | 110 | 10 | 40 | check (over cap) | /dmz/regions/dmz-hajin-exclusion-zone-what-the-deep-dive-reveals | extend | no | live |
| 3 | mw4 hajin | 40 | 10 | 30 | y (SERPChecker-gated) | /dmz/regions/dmz-hajin-exclusion-zone-what-the-deep-dive-reveals | extend | no | live |
| 3 | hajin exclusion zone | 90 | 10 |  | check (KD unscored) | /dmz/regions/dmz-hajin-exclusion-zone-what-the-deep-dive-reveals | extend | no | live |
| 3 | dmz hajin | 50 | 10 | 38 | check (over cap) | /dmz/regions/dmz-hajin-exclusion-zone-what-the-deep-dive-reveals | extend | no | live |
| 3 | hajin dmz | 50 | 10 | 38 | check (over cap) | /dmz/regions/dmz-hajin-exclusion-zone-what-the-deep-dive-reveals | extend | no | live |
| 4 | dmz gunsmith | 260 | 10 | 20 | y | /dmz/loadouts (new article) | build-new | no (excerpt-gated) | to-build |

`winnable` legend: `y` = KD within the <= ~30-35 cap at DA 23; `check (over
cap)` = KD above the cap, pursued only as the launch-info authority play (item
1) or gated on a manual SERP look; `check (KD unscored)` = blank KD, SERPChecker
the SERP manually before committing (never treated as easy). A blank
`current_vol` or `KD` cell = KWFinder returned no data (not zero).

## Cross-workstream dependencies

- #1 /dmz extension is COUPLED to A1 Phase 2: /dmz still emits a FAQPage
  (app/dmz/page.js). Its removal must ride in the same edit as the /dmz
  extension, so the two land together and /dmz is not touched twice.

---

## Per-canonical detail and route reconciliation

### 1. Launch-info hub -> EXTEND `/dmz` (no new route)
`/dmz` already IS this canonical (title "DMZ Release Date: October 23, 2026
(Modern Warfare 4)", MW4 DMZ keywords, a source-backed FAQ, and email capture
via `DmzNotifyBlock`; `dmz.indexable = true`). A separate launch hub would split
the head-term authority `/dmz` is already accruing.
- **Extend:** elevate `mw4 dmz` (5400 peak) and `modern warfare 4 dmz` into the
  title/H1 (today they sit only in `keywords`/OG; the H1 leads with "DMZ Release
  Date"). Add a `dmz vs warzone` section.
- **A1 NOTE (record only, do NOT act here):** `/dmz` still emits a FAQPage
  JSON-LD block (`app/dmz/page.js`), which is an A1 Phase 2 removal target. When
  `/dmz` is extended, the FAQPage removal should ride IN THE SAME edit. Flagged
  here so the two land together; no action in the demand-map commit.

### 2. Keys system hub -> target `/dmz/keys` (FORK required)
`/dmz/keys` exists but is the shared `DmzEntityHub` entity index; `dmz_keys` = 0
rows -> noindexed (row-count gate). The demand (`dmz key locations` 12,100 peak,
KD 30) is real, but keys are launch-gated: pre-launch this can only be a SYSTEM
hub (how keys work, tiers, acquisition), never a per-key reference.
- **Implementation is SCOPED SEPARATELY** (this doc records what/why, not how):
  the shared `DmzEntityHub` renders only an H1 + one-line desc + entity grid /
  empty-state, and noindexes while empty. Converting `/dmz/keys` into a
  prose + indexable system page therefore means **forking keys off the shared
  template into a bespoke page**, so the shared template's
  empty-state-noindex honesty gate is preserved for missions, items, and all
  per-key detail pages. Do not weaken the shared gate to make keys indexable.

### 3. Hajin map/setting -> EXTEND the existing article (sharpest overlap)
THE canonical is the existing article
`/dmz/regions/dmz-hajin-exclusion-zone-what-the-deep-dive-reveals` (SEO title
"MW4 DMZ Hajin Exclusion Zone: Setting, Loop, and Map Overview"). Two other
surfaces touch Hajin and must cross-link into it, never compete:
- `/dmz/regions` (the "Hajin Regions" section hub) lists the article.
- `/dmz/pois` (hub H1 "Hajin Map & Locations") already, by design, does NOT
  chase "hajin map" - `lib/dmz/entities.js` cedes that lane to this article and
  owns per-POI names instead.
- **Extend:** fold `dmz korea map` (1100/mo, blank KD, uncontested) in as a
  SECONDARY term. Do NOT rewrite the H1 around "Korea map" - real-world-DMZ
  (demilitarized-zone / Korea) ambiguity makes it SERPChecker-gated; confirm the
  SERP is game-intent before leaning on it. `/dmz/regions` and `/dmz/pois`
  cross-link into this article.

### 4. Gunsmith system hub -> BUILD NEW at `/dmz/loadouts`
No gunsmith page exists; Gunsmith appears only as a station inside the FOB
article and as a not-yet-generated `PENDING_TOPIC` in
`scripts/gen-dmz-news.mjs`. `dmz gunsmith` (KD 20, 260 peak) is Deep-Dive-sourced
and winnable.
- **Gate:** needs a CONFIRMED Deep-Dive excerpt before generation
  (no-source-no-fabrication - the repo rule). Do not generate from memory.
- **Cross-link:** point the FOB article's Gunsmith mention at the new page so
  the two do not compete for the term.

### 5. Systems-explained fold-in hub -> CONSIDERED AND REJECTED
A single hub folding FOB + 3D Printer + stash + trait system + operators +
weather was proposed on a "each too thin for its own page" premise. That premise
is false against live routes:
- FOB already has a deep standalone canonical
  (`/dmz/fob/dmz-forward-operating-base-every-hub-system-detailed`, ~628 words,
  covering Stash, Wallet, Gunsmith, Boss Board, Trait System, Operators).
- The 3D Printer has its own
  (`/dmz/loadouts/dmz-3d-printer-crafting-system-every-category-detailed`).
- Weather and the secure-and-extract loop live in the Hajin article.
- The `/dmz` Coverage cards are the de-facto systems index already.

Building the fold-in hub would cannibalize three existing canonicals. **Rejected.**
At most, tighten cross-linking among FOB / 3D Printer / Hajin on the `/dmz` hub.
(Note: the `printer` DMZ section is a separate future structured tool shell,
distinct from the 3D-Printer article under `loadouts`; do not conflate them.)

---

## Deferred (recorded with reasons, not skipped by omission)

- **Per-POI detail pages** - DEFERRED from indexing. `/dmz/pois/[slug]` exists
  and `dmz_pois` holds 9 seeded rows, but every row is `verified=false`, so the
  detail pages are noindexed by the honesty gate, and per-POI search demand is
  near-zero (research Group D). The HUB `/dmz/pois` ("Hajin Map & Locations")
  STAYS indexable and seeded; only the per-POI detail pages wait. Reason:
  near-zero per-POI demand + unverified-pre-launch honesty gate. They flip to
  indexed per-POI as each is verified in-game at launch.
- **Per-key / per-mission / per-item pages** - DEFERRED. Routes exist
  (`/dmz/keys|missions|items` + `[slug]`), tables are 0 rows, hubs noindexed, no
  detail pages. Reason: launch-gated with NO real entities pre-launch - the June
  6 2026 Deep Dive enumerates no key/mission/item names (source audit). Nothing
  to transcribe; building them now would be fabrication. They populate at launch
  as entities become real and in-game verified.

---

## Backing evidence

Raw Mangools/KWFinder exports for the six research groups are saved under
`docs/research/dmz-demand-2026-07/` so the demand figures above are auditable,
not chat-only. Filed BY RESEARCH GROUP (not by canonical - re-sorting would
corrupt the audit trail); the README maps each group to its target canonical.

- `group-a-old-dmz-proxy.csv` - old-DMZ (MW2 2022) proxy terms (launch forecast)
- `group-b-launch-intent.csv` - launch / release intent (#1 `/dmz`)
- `group-c-hajin-map-setting.csv` - Hajin map / setting (#3 Hajin article)
- `group-d-pois.csv` - per-POI terms (deferred; near-zero demand evidence)
- `group-e-systems-mechanics.csv` - systems / mechanics (#4 gunsmith; #5 reject)
- `group-f-comparison-evergreen.csv` - comparison / evergreen (#1 dmz vs warzone)
- `README.md` - source, group->canonical map, column meanings, the blank-is-not-zero rule

Every numeric cell in the build-queue table above is transcribed from these
files (see the provenance note for the column mapping).
