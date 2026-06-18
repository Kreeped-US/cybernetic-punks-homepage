# Marathon Verification Debt — Audit, Plumbing, and the Pending Decision

## Status (2026-06-18)
Phase 0 audit **done**. Verification **plumbing shipped** (Phases 2, 1c, 5 below) so
unverified stats are honestly hedged everywhere and stay honestly tracked. **No
`verified` flag has been flipped and no stat VALUE has been corrected** — that is
gated on the Phase-1 source-of-truth DECISION (still pending; see end). A false
`verified=true` is worse than an honest `verified=false`, so nothing is flipped
until the decision is made.

---

## Q1 — What the flags assert
Two flags on the stat tables, both **set manually** (admin PATCH / SQL). The
`dexter-stats` scraper historically wrote VALUES but never touched the flags
(fixed in Phase 5).
- **`verified`** (boolean) — "this value has been confirmed" (vs seeded/guessed).
- **`patch_verified`** (text: `"1.1.0"`, `"S2"`, `"S1"`, null) — "confirmed *as of*
  this patch/season" — the staleness axis.

**Hedging rule** (now centralized in `lib/verification.js`): a row is tagged
`[UNVERIFIED]` when **`verified === false` OR `patch_verified` starts with `s1`**
(pre-S2 = stale). A `verified=true` row with null `patch_verified` is NOT tagged
(confirmed, just unstamped). The editor prompt then forbids stating precise
numbers for `[UNVERIFIED]` rows.

**Inconsistency to resolve in Phase 1:** the flag's meaning isn't uniform. Some
tables are wholesale `true` (`core_stats` 85/85, `implant_stats` 119/120,
`faction_armory` 44/44, `game_maps/zones/bosses`) — either genuinely confirmed or
**seeded true**. If seeded, the debt is *understated*: honestly-`false` rows hedge
safely; falsely-`true` rows are the dangerous confident-wrong ones. **Auditing
whether the wholesale-true tables are real vs seeded is a Phase-1/3 task — not
done here (needs the decision first).**

---

## Q2 — Current debt (live counts, 2026-06-18)
| Table | Rows | verified=false | Notes |
|---|---|---|---|
| **shell_stats** | 8 | **7 (88%)** | worst %; the Miranda HP/Shield risk |
| **mod_stats** | 202 | **104 (51%)** | pv: 185 null, 17 "1.1.0" |
| **weapon_stats** | 32 | **16 (50%)** | pv: 16 null, 13 "1.1.0", 3 "S2" |
| implant_stats | 120 | 1 | mostly true (verify real vs seeded) |
| core_stats | 85 | 0 | all true (verify real vs seeded) |
| unique_weapons | 16 | 0 | but 15/16 `patch_verified="S1"` → stale-tagged (only /uniques) |
| faction_armory / upgrades | 44 / 6 | 0 | gated verified=true in context |
| **cradle_nodes** | 84 | **84 (after Phase 1c)** | flag added Phase 1c; all hedge until verified |
| **shell_stat_values** | 91 | 91 (after Phase 1c) | flag added; display-only today |
| **ammo_stats** | 5 | 5 (after Phase 1c) | flag added; display-only today |

Worst + most editor-facing: `shell_stats`, `mod_stats`, `weapon_stats`, and (now
flagged) `cradle_nodes`.

---

## Q3 — Source of truth (the crux) — HONEST VERDICT: there is no clean one
- **Bungie publishes change-notes, not base values.** Marathon has **no stats API /
  manifest** (unlike Destiny). Patch notes give deltas, not authoritative base numbers.
- **What feeds the data:** `dexter-stats` scrapes the community wiki
  (`marathon.wiki.gg` / `marathon.gg`) + YouTube transcripts + Reddit + Steam and
  uses Claude to *extract* numbers — a reasonable *ingest*, **not** a source of truth
  (hence it now stamps everything `verified=false`).
- **Precedent that worked:** `game_maps/zones/bosses` are `verified=true` because
  trusted community contributors (LordTT, neodeye — credited on Maps) confirmed
  them in-game. That **trusted-contributor in-game confirmation** is the only
  verification mechanism that has actually worked here.
- **Verdict:** "verified" **cannot** mean "matches the official source" — none
  exists for base stats. It must mean the softer **"confirmed in-game by a trusted
  contributor as of `patch_verified`."** This makes verification a
  **community-verification effort**, not a scrape-and-flip.

---

## Q4 — Risk path (how unverified stats reached articles) — CLOSED by Phase 2/1c
The `[UNVERIFIED]` hedging existed only on the cron `fetchGameContext` path; two
specialized context builders re-injected the same stats **untagged**:
1. **Miranda guide** — `miranda.js` built its own shell/weapon/mod context without
   the flags → untagged → guides stated unverified stats as fact (the "Vandal
   150 HP / 35 Shield" artifact).
2. **`/api/advisor`** — `fetchAdvisorContext` selected stats without the flags →
   advisor never hedged.

Both now select the flags and apply the shared tag (Phase 2). `cradle_nodes` is
wired on both paths (Phase 1c).

---

## Phase plan
- **Phase 0 — audit.** ✅ Done (this doc).
- **Phase 1 — DECISION (pending; gates all data correction).** See below.
- **Phase 2 — close the hedging bypass.** ✅ Shipped.
- **Phase 1c — add flags to the 3 unflagged tables + wire reads.** ✅ Shipped
  (schema ALTER run in Supabase; cradle reads wired).
- **Phase 5 — make `dexter-stats` verification-aware.** ✅ Shipped.
- **Phase 3 — backfill in gated batches** against the chosen mechanism,
  baseline-before-write, never flip-to-look-better. *Pending Phase 1.*
- **Phase 4 — repeatable per-patch cadence** so `patch_verified` keeps debt from
  silently regrowing. Hook in place: `ACTIVE_PATCH` in `dexter-stats.js` (bump per
  patch). *Full cadence pending Phase 1.*

---

## What THIS task shipped (plumbing only — no flags flipped, no values changed)
- **`lib/verification.js` (new)** — single source of truth: `isUnverified`,
  `unverifiedTag`, `UNVERIFIED_NOTE`. **Game-agnostic** (no season/game hardcoded)
  so every path — and DMZ — inherits one identical hedging rule that can't drift.
- **Phase 2** — `fetchGameContext` uses the shared helper (removed its private
  copy); `miranda.js` + `buildMirandaPrompt` and `/api/advisor` now select
  `verified`/`patch_verified` and tag shell/weapon/mod (+core/implant on advisor)
  lines, with the note injected. Misleading "VERIFIED … DATA" headers in the
  Miranda prompt corrected to "… DATA".
- **Phase 1c** — additive `ALTER TABLE … ADD COLUMN verified boolean NOT NULL
  DEFAULT false, ADD COLUMN patch_verified text` on `shell_stat_values`,
  `cradle_nodes`, `ammo_stats` (run in Supabase). `cradle_nodes` reads wired on
  both the cron and advisor Cradle blocks → **all 84 cradle perks now hedge
  `[UNVERIFIED]`** until verified (intended honesty). `shell_stat_values` and
  `ammo_stats` got the columns but feed only display pages (`/builds`,
  `/guides/shells`, admin) — no LLM read to wire today.
- **Phase 5** — `dexter-stats` stamps `verified=false` + `patch_verified=ACTIVE_PATCH`
  on every value it writes (shell/weapon/core/implant). Never sets `true`; never
  bulk-touches rows it isn't writing. Fresh ingest is honestly unverified-by-default.

**Verified live:** 7/8 shells, 50% of weapons/mods, and 84/84 cradle perks now
render `[UNVERIFIED]` on the editor/advisor paths; `next build` green.

### Known interaction to resolve in Phase 1
`dexter-stats` primarily fills rows with NULL fields, but if it writes a field on a
row a human later verified, it will demote that row to `verified=false`. Phase 1
must decide precedence (e.g. scraper skips `verified=true` rows, or only writes
when the value differs). Honest-but-pessimistic for now; flagged, not yet handled.

---

## PENDING — the Phase-1 DECISION (gates all data correction)
**What should `verified` assert, and what is the source of truth?** Recommendation:
- `verified` = **"confirmed in-game by a trusted contributor as of `patch_verified`."**
- Source of truth = formalize the **LordTT / neodeye in-game-confirmation** process
  (the Maps precedent), with wiki/datamine as corroboration, since no official
  source exists.
- Resolve the wholesale-`true` tables (audit real vs seeded) as part of this.

Until this is locked, **no row is flipped and no value corrected.** Everything
downstream (Phase 3 backfill, Phase 4 cadence) depends on it.

## Design intent — game-agnostic
The hedging *logic* lives in shared `lib/verification.js`; each game's gather layer
owns its own current-patch constant (`ACTIVE_PATCH`). So DMZ inherits
honest-by-default hedging for free — its stat tables hedge until a trusted
contributor verifies them, exactly like Marathon.

## Scope discipline (unchanged)
- Data correction = its OWN gated effort on a fresh branch, after Phase 1.
- Do NOT flip `verified=false → true` to improve the number.
- Do NOT create new tables (Phase 1c added only the two flag columns to 3 tables).
