# feed_items Consumer/Writer Audit + Approved Migration Plan (Content-Home Slice)

**Status:** Step 1 (read-only audit) COMPLETE. Reference doc for Steps 2-3. Plan APPROVED
(batched Step 3). **No code/schema changes yet.**
**Date:** 2026-06-15.
**Companions:** [TABLE_INVENTORY.md](TABLE_INVENTORY.md), [URL_AND_THEMING.md](URL_AND_THEMING.md),
[NETWORK_PRINCIPLES.md](NETWORK_PRINCIPLES.md).

## Purpose
Map EXACTLY how every piece of code reads/writes `feed_items`, so the DMZ content-home
slice (add `game_slug`, make consumers game-aware, add a `/dmz` route group) can ship
without changing Marathon's behavior.

## TRUE SCOPE (the key finding)
`feed_items` is touched in **~21 files / ~50+ call-sites — NOT the 5 originally assumed.**
This is why Step 1 was read-only first. The full map below is the authoritative scope for
Steps 2-3.

## Governing invariant (the safety test for every step)
**Marathon's behavior must not visibly change at any step.** `game_slug` is an added
dimension, always `'marathon'` until DMZ content exists. After each step, verify the live
Marathon site (/intel, /rising, homepage, comments, cron) behaves EXACTLY as before. Every
read filter **defaults to `'marathon'`** so even a missed filter fails toward
Marathon-as-usual, not breakage.

## SAFETY-TIMING NOTE (why the ordering is safe)
Between Step 2 (column added, all rows `'marathon'`) and the first DMZ article, **no
consumer behavior changes** — unfiltered queries still return only marathon rows because
no `dmz` rows exist. **Filters become load-bearing only once a `game_slug='dmz'` row
exists.** Therefore: **ALL consumer filtering (Step 3, Groups A/B/C) must land BEFORE any
`game_slug='dmz'` insert.** Step 4 publishes zero DMZ rows, so the order holds.

---

## WRITERS (3)
| Site | What | Action |
|---|---|---|
| `app/api/cron/route.js:405` (insert) | Editorial pipeline writing produced articles | **Must write `game_slug`** ('marathon' now; 'dmz' when directed) |
| `app/api/cron/route.js:702` (update) | Thumbnail dedup, by `id` | No change (id-scoped) |
| Manual/catch-up insert (one-off scripts, e.g. the NEXUS recap) | Manual article inserts | **Procedure:** set `game_slug` on any manual insert |

## READERS

### Group A — site content pages (Marathon-facing; filter, default `'marathon'`) — 18 files
| File | call-sites | reads |
|---|---|---|
| `app/page.js` | 2 | homepage latest-timestamp + creator spotlights |
| `app/api/homepage-data/route.js` | 4 | latest-25, GHOST latest, featured, editor activity |
| `app/intel/page.js` | 1 | intel hub (latest 100) |
| `app/intel/[slug]/page.js` | 4 | by-slug x2 (242, 1265), editor-lane (1258), related-fallback (1308) |
| `app/rising/page.js` | 1 | creator_spotlight list |
| `app/sitrep/page.js` | 3 | sitrep feeds |
| `app/api/sitrep-data/route.js` | 1 | sitrep data |
| `app/meta/page.js` | 1 | NEXUS/CIPHER recent |
| `app/ranked/page.js` | 1 | `ranked`-tagged |
| `app/factions/page.js` | 1 | faction-tagged |
| `app/builds/page.js` | 1 | DEXTER recent |
| `app/guides/page.js` | 4 | MIRANDA/DEXTER/NEXUS + tag-overlap |
| `app/guides/[category]/page.js` | 4 | tag-filtered guides |
| `app/guides/shells/[name]/page.js` | 2 | shell-tagged |
| `app/weapons/[slug]/page.js` | 2 | weapon-tagged |
| `app/shells/[slug]/page.js` | 3 | shell-tagged |
| `app/editors/page.js` | 6 | per-editor counts/lists/stats |
| `app/HomeEditorReactions.js` | 1 | reads by `article_id` (game inherited via the article — lowest risk) |

### Group B — editorial INPUT reads (cron/editors; filter to the game being produced) — 3 files
| File | call-sites | reads |
|---|---|---|
| `app/api/cron/route.js:484-487` | 4 | no-repeat recent headlines per editor |
| `lib/gather/cipher.js` | 5 | CIPHER synthesis reads recent CIPHER/NEXUS/DEXTER/GHOST articles |
| `lib/gather/miranda.js:236` | 1 | recent MIRANDA headlines (no-repeat) |

**Group B correctness note:** DMZ editors must read **DMZ's** prior articles, not
Marathon's — otherwise cross-game no-repeat/synthesis **bleeds** (a DMZ editor would
"avoid repeating" Marathon topics, or synthesize from Marathon meta). Filter to the
game being produced this cycle.

### Group C — SEO — 1 file
| File | call-sites | reads |
|---|---|---|
| `app/sitemap.js:191` | 1 | emits `/intel/<slug>` URLs |

**Sitemap requirement:** must filter to `'marathon'` for the unprefixed `/intel/<slug>`
URLs; emit `/dmz/...` URLs separately (later). **SEO-critical** — do NOT list `dmz` slugs
at unprefixed Marathon paths.

---

## Answered open questions
1. **`article_comments` game_slug?** **Deferred — not needed this slice.** Comments reach
   the game only via `article_id` -> `feed_items.game_slug` (e.g. `HomeEditorReactions`
   fetches `feed_items` by id). They inherit scoping through their article.
2. **sitemap / title.template / meta-description?** **sitemap = YES** (see Group C).
   **title.template** (`layout.js`, static `%s | CyberneticPunks`) = **no change**
   (game-agnostic). **`buildMetaDescription`** = **no change** (operates on the
   already-fetched row, no separate query).
3. **Theming for /dmz?** **/dmz launches on Marathon's theme initially** (DMZ visual
   tokens deferred per the locked plan). No theming rides with Step 4.

---

## Plan — APPROVED (with adjustments)
- **APPROVED** with the governing invariant above (Marathon-unchanged, default-to-marathon).
- **Step 3 is BATCHED** into three independently-tested, Marathon-verified groups —
  shipped/verified separately, **not** one big-bang change:
  - **Batch A** — site content pages (the 18 files in Group A).
  - **Batch B** — editorial-input reads (cron no-repeat + CIPHER synthesis + MIRANDA),
    honoring the Group B correctness note.
  - **Batch C** — sitemap (the SEO requirement).
- **Confirmed deferrals:** `article_comments` game-scoping (inherits via `article_id`);
  `title.template` + `buildMetaDescription` unchanged; `/dmz` launches on Marathon theme.

## Step status
- **Step 1 (read-only audit):** DONE (this doc).
- **Step 2 (add `game_slug` column + backfill 1756 rows to 'marathon'):** NEXT — the first
  production write; starts fresh next session (gated: backup-first, verify all rows
  'marathon' / 0 null, Marathon unchanged).
- **Step 3 (game-aware consumers + cron writes game_slug):** batched A/B/C, each gated.
- **Step 4 (`/dmz` route group, renders `game_slug='dmz'`, empty until content):** additive.

IN scope for this slice: `feed_items.game_slug` + the consumers above + `/dmz` route.
DEFERRED (later, deliberate): neutral root hub, full DMZ theming tokens, identity/billing
rework, per-game player tables, build advisor, deeper `article_comments` scoping.
