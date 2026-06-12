# Handoff / Session Notes

Running log of cross-session decisions, shipped changes, and parked work.
Newest entries on top.

---

## 2026-06-12 — Data-quality fixes (entity names, stat verification surfacing, thin-source honesty)

### 0. Key finding — prior audit inference OVERTURNED

The input-pipeline audit inferred that corrupted entity names (e.g.
"V22 Volt ThrowerSMG", "M77 Assault RifleAR") were stored in
`weapon_stats.name`. A gated, read-only check of production proved this
FALSE: every name in `weapon_stats` (32), `shell_stats` (8), `core_stats`
(86), `implant_stats` (120), `mod_stats` (202), and `meta_tiers` (40) is
clean. The "corruption" was a render artifact in `InlineStatCard`
([app/intel/[slug]/page.js](../app/intel/[slug]/page.js)): adjacent flex
spans (icon / name / type / rarity) with only CSS gap flatten to glued
text for crawlers/copy-paste/screen readers. No DB write was needed; the
gated read-before-write is what prevented a bad production UPDATE.

### 1. Shipped changes

| Change | Commit | Summary |
|---|---|---|
| StatCard text separators | `2a08b83` | Visually-hidden separators + decorative `alt=""` + `aria-hidden` glyph so flattened card text reads "Name - Type - Rarity" not "M77 Assault RifleAR". Pixel-identical visual. |
| Verification-aware context | `852e9a3` | `fetchGameContext` now selects `verified`/`patch_verified`, tags `[UNVERIFIED]` rows (annotate, never exclude), and adds one shared preamble rule telling editors not to cite exact stats for tagged rows. |
| Thin-source honesty rule | `4669dac` | One rule added to NEXUS/DEXTER/GHOST/MIRANDA source instructions: a single/thin-source cycle must be framed honestly ("one video this cycle"), not as a broad trend. CIPHER (internal synthesis) untouched. |

All three merged to `main` via fast-forward and pushed. Branches deleted.

### 2. Stat-verification worklist (the real follow-up project)

`patch_verified` exists on `weapon_stats`/`shell_stats`/`mod_stats` (NOT
on `core_stats`/`implant_stats`). It was never selected by editors until
Fix 2. Live `[UNVERIFIED]` counts (rows with `verified=false`, or null/
pre-S2 `patch_verified` where that column exists):

- **shell_stats: 7 of 8** tagged (only 1 shell `verified=true`). Shells
  have real S2 ability data but most are unconfirmed against in-game
  inspect.
- **weapon_stats: 16 of 32** tagged — clean split. The unverified set is
  tauceti.gg-sourced, includes **Ares RG** and **Bully SMG** (both
  `verified=false`, `patch_verified=null`, last touched 2026-03-07).
- **mod_stats: 193 of 202** tagged. Plan: **spot-check ~10 mods against
  the game client first; if clean, bulk flag-flip** the verified ones
  rather than one-by-one.
- core_stats: 0 tagged. implant_stats: 1 tagged (Ping+ V2).

Verification = confirm values in-game, then flip `verified`/set
`patch_verified`. No numeric values were changed in this task.

### 3. Parked items (not touched, by scope)

- **Incidental name anomalies — pending in-game check** before any edit
  (game client is ground truth for spelling): trailing space in
  `"Balanced Shield "`; spellings `Botique`, `Pinata`, `Maga Drive`,
  `Hypocritic Oath`; and V1–V5 singular/plural splits (`Graceful
  Landing` vs `Landings`, `Survivor Kit` vs `Survival Kit`). Own small
  task.
- **`seo_keywords` table does not exist** — `getTargetKeyword`
  ([lib/editorCore.js](../lib/editorCore.js)) silently no-ops. Parked; do
  not create the table without a decision.
- **Season/version schema** work deferred to July migration planning.
- **Entity-name token leakage** is now fully resolved by `2a08b83` (was
  flagged open in the prior session note — render fix, not a DB fix).

---

## 2026-06-12 — SEO metadata pass (/rising + /intel articles)

### 1. Shipped changes

| Change | Commit | Summary |
|---|---|---|
| `/rising` metadata | `461234a` | Game-scoped the page title + description to disambiguate Marathon-the-game from running/fitness intent. Was earning impressions on "running for streamers" with 0 clicks. Static `metadata` export in `app/rising/page.js`; `force-dynamic` preserved. |
| Article meta description helper | `1e09e9e` | `buildMetaDescription()` in `app/intel/[slug]/page.js` replaces the raw `body.slice(0,155)`. Strips `**bold**`/markdown markers (keeps inner text), preserves quotation marks, flattens whitespace, truncates at a word boundary <= 155 chars, appends `…` only when truncated, falls back to headline. Runs at render time, so it improves OLD articles automatically (no backfill). |
| Five-persona headline rules | `d0ea153` | Added an identical `HEADLINE RULES` block to all five editor prompts (CIPHER, NEXUS, DEXTER, GHOST, MIRANDA) in `lib/editorCore.js`, replaced CIPHER's old vague headline line (one source of truth), and set all five headline JSON-schema descriptions to the same text. Affects FUTURE articles only. No DB/schema change. |

All three merged to `main` via fast-forward and pushed. Feature branches deleted.

### 2. Approved headline pattern

`[Game + primary searchable term in the first 5-6 words] + separator (colon or dash) + [persona flavor / specific hook]`

Encoded rules: game name ("Marathon") + primary search term in first 5-6 words;
target <= 60 chars, never exceed 70; site suffix is auto-added (never write
"| CyberneticPunks"); persona voice goes AFTER the separator; no all-caps words;
use audience search vocabulary ("beginner" / "new players" / "streamers") not
lore terms ("Runners"); must still read naturally as the on-page heading.

Approved BAD/GOOD examples (also embedded as few-shot in each prompt):

- BAD:  CONTENT DROUGHT EXPOSES MARATHON'S TUTORIAL GAP: Single YouTube Creator Highlights Community's Learning Crisis
  GOOD: Marathon's Tutorial Gap: The Content Drought Signal

- BAD:  Assassin Shadow Strike Engine: The Season 2 Invisibility Meta That Turns Knife Combat Into Silent Elimination Mastery
  GOOD: Marathon Assassin Build: Shadow Strike Knife Guide (S2)

- BAD:  Essential Weapon Mod Builds for New Runners: Start Here Before You Specialize
  GOOD: Marathon Weapon Mods Guide: Essential Beginner Builds

### 3. Flagged open task — entity-name token leakage (article bodies)

Article bodies render concatenated entity-name tokens, e.g.
`V22 Volt ThrowerSMG SMG` and `M77 Assault RifleAR`. Confirmed pipeline-wide
(not a one-off row). NOT addressed in this pass. Candidate for a pre-refactor
fix — worth scoping before the July refactor since it degrades body readability
and any text derived from bodies (including the new meta descriptions).

### 4. Parked cosmetics (low priority)

- **Slug double-hyphen generation** — slugs can contain `--`; cosmetic, not
  breaking links. Revisit if/when slug logic is touched.
- **X share handle `@Cybernetic87250`** — auto-generated handle used in share
  intents and `twitter:site`. Cosmetic; replace if a vanity handle is secured.
