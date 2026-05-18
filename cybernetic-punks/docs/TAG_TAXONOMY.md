# Tag Taxonomy — CyberneticPunks.com

**Status:** Canonical reference. Last updated 2026-05-15.
**Owner:** All editorial code paths must conform to this document.

---

## Why this document exists

The editorial pipeline (CIPHER, NEXUS, DEXTER, GHOST, MIRANDA) tags articles
on publish. Over time tags drift — different editors invent slight variants
of the same idea (`stealth` vs `stealthy` vs `stealth-play`). This breaks
SEO, breaks `/guides/[category]` routing, and pollutes the data layer.

This document is the **single source of truth** for valid category tags.

---

## Canonical category tags

These tags drive `/guides/[category]` pages and the sitemap. Every article
should include at least one of these. **Use the exact strings listed — no
variants.**

| Canonical tag   | Category page                            | Description                            |
| --------------- | ---------------------------------------- | -------------------------------------- |
| `shells`        | `/guides/shells`                         | Runner Shell guides                    |
| `weapons`       | `/guides/weapons`                        | Weapon analysis and tier breakdowns    |
| `mods`          | `/guides/mods`                           | Mod combinations and slot analysis     |
| `extraction`    | `/guides/extraction`                     | Exfil routes, timing, loot strategy    |
| `ranked`        | `/guides/ranked`                         | Ranked queue strategy and climbing     |
| `beginner`      | `/guides/beginner`                       | New player tutorials and basics        |
| `progression`   | `/guides/progression`                    | Faction ranks, leveling, farming       |
| `maps`          | `/guides/maps`                           | Map intel, POIs, zone breakdowns       |
| `stealth`       | `/guides/stealth`                        | Silent plays, cloaking, ghosting       |
| `squad`         | `/guides/squad`                          | 3-player team tactics                  |
| `solo`          | `/guides/solo`                           | Solo queue play and 1v3 survival       |
| `holotag`       | `/guides/holotag`                        | Holotag strategy and targeting         |
| `endgame`       | `/guides/endgame`                        | High-rank content and Prestige         |
| `pvp`           | `/guides/pvp`                            | Runner-vs-Runner combat tactics        |
| `support`       | `/guides/support`                        | Triage anchoring, revives, utility     |
| `cryo-archive`  | `/guides/cryo-archive`                   | The Cryo Archive endgame raid map      |

### Convention rules

1. **All lowercase.** No `Stealth`, no `SHELLS`.
2. **Single word where possible.** `stealth` not `stealth-guide`. `cryo-archive` is the only hyphenated exception because `cryoarchive` reads poorly.
3. **No `-guide` suffix.** The category page implies "guide" already.
4. **No plurals of canonical tags.** Use `holotag` not `holotags`.
5. **No underscores or special characters.** Hyphens only when necessary.

---

## Sub-tags

Use in **addition** to canonical category tags. These provide context but
don't drive category pages.

### Shell sub-tags

`assassin`, `destroyer`, `recon`, `rook`, `thief`, `triage`, `vandal`

### Weapon sub-tags

Lowercase, hyphenated. Examples: `wstr-combat-shotgun`, `m77-assault-rifle`,
`stryder-m1t`, `biotoxic-disinjector`. Full list in `weapon_stats` table.

### Faction sub-tags

`cyberacme`, `nucaloric`, `traxus`, `mida`, `arachne`, `sekiguchi`

### Topic context tags

These describe the article's broader context. Not exhaustive; editors can add
new ones as long as they follow the lowercase-hyphen convention.

`meta-shift`, `meta-analysis`, `tier-list`, `balance`, `patch`, `dev-update`,
`season-1`, `season-2`, `launch`, `community`, `community-event`, `lfg`,
`performance`, `crashes`, `technical-issues`, `steam-reviews`, `economy`,
`retention`, `matchmaking`, `intel`, `guide`, `builds`, `positioning`,
`extraction-tactics`

---

## Deprecated tags

These existed in the data before normalization. They have been backfilled
to canonical equivalents via `tag_normalization.sql` and should never be
used by editors going forward.

| Deprecated tag  | Replaced by    |
| --------------- | -------------- |
| `shell-guide`   | `shells`       |
| `weapon-guide`  | `weapons`      |
| `mod-guide`     | `mods`         |
| `map-guide`     | `maps`         |
| `CRYO_ARCHIVE`  | `cryo-archive` |
| `holotags`      | `holotag`      |

---

## Tag application examples

**Example 1** — MIRANDA article about Assassin's stealth playstyle in solo Ranked:
```json
"tags": ["shells", "assassin", "stealth", "solo", "ranked"]
```

**Example 2** — DEXTER build guide for M77 Assault Rifle in squad play:
```json
"tags": ["weapons", "m77-assault-rifle", "builds", "squad"]
```

**Example 3** — NEXUS guide about the Cryo Archive Compiler boss:
```json
"tags": ["cryo-archive", "endgame", "squad", "guide"]
```

**Example 4** — GHOST community pulse on extraction frustration:
```json
"tags": ["extraction", "community", "steam-reviews"]
```

**Example 5** — CIPHER play analysis of a Vandal solo extraction clutch:
```json
"tags": ["shells", "vandal", "solo", "extraction", "ranked"]
```

---

## Tag count guidance

- **Minimum:** 3 tags per article
- **Maximum:** 7 tags per article (more than this dilutes signal)
- **Always include at least 1 canonical category tag** so the article surfaces
  on the appropriate `/guides/[category]` page

---

## When to add a new canonical category

Adding a new canonical category is a deliberate act, not casual tagging.
Requirements:

1. There are 20+ articles already tagged with that concept (or a clear plan
   to produce them via editor directive).
2. The category has unique SEO value (distinct keyword cluster).
3. The category doesn't cannibalize an existing site section (e.g., don't
   build `/guides/meta` if `/meta` already exists as a hub).

To add a new canonical category:

1. Add the entry to `CATEGORIES` in `app/guides/[category]/page.js` with
   complete metadata (tag, label, color, title, description, keywords, h1,
   subhead, related[3], faqs[3]).
2. Add the slug to `ALL_GUIDE_CATEGORIES` in `app/sitemap.js`.
3. Add an entry to the canonical tags table in this document.
4. Update the editor directive `canonical_tag_standard` to include the new
   tag.
5. If existing articles should be backfilled with the new tag, add a Phase to
   `sql/tag_normalization.sql` and run it.

---

## When to retire a category

If a category accumulates fewer than 10 active articles after 90 days, it's
a candidate for retirement. Retire by:

1. Removing from `CATEGORIES` in `app/guides/[category]/page.js`.
2. Removing from `ALL_GUIDE_CATEGORIES` in `app/sitemap.js`.
3. Documenting the retirement in this file's history section.
4. Optionally adding a 301 redirect from `/guides/[old-slug]` to a related
   active category.

---

## History

- **2026-05-15** — Canonical taxonomy established. Migrated from inconsistent
  `*-guide` suffixes to single-word canonical tags. Added 8 new categories:
  `stealth`, `squad`, `solo`, `holotag`, `endgame`, `pvp`, `support`,
  `cryo-archive`. Total: 16 canonical category tags.
