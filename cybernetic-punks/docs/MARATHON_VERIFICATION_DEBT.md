# Marathon Verification Debt — Audit, Plumbing, and the Pending Decision

## Status (2026-06-18)
Phase 0 audit **done**. **Phase-1 decision LOCKED** (the 3-state model, below).
Verification **plumbing shipped** (Phases 2, 1c, 5) and **Phase 2.5** upgraded the
hedging from binary to the locked **3 states** (unchecked / source-agreed /
confirmed). **No `verified` flag has been flipped and no stat VALUE has been
corrected** — that is gated on the source-of-truth *mechanisms* (who confirms,
what "sources agree" requires), still pending; see end. A false `verified=true`
is worse than an honest `verified=false`, so nothing is flipped yet.

## Phase-1 DECISION — LOCKED: the 3-state model
Verification is a **3-state model** read from the two existing flags (`verified`
boolean + `patch_verified` text). Editors hedge at three honest registers:
1. **UNCHECKED** — `verified=false` AND (`patch_verified` null or `s1`/pre-S2).
   Raw, unchecked ingest. → **Hard hedge:** do NOT state the number; talk
   strategy, not figures. Marker: `[UNVERIFIED]`.
2. **SOURCE_AGREED** — `verified=false` AND `patch_verified` = a current/recent
   patch (set, not `s1`). Sources concur & current, but no human confirmed
   in-game. → **Soft hedge (the middle register):** ATTRIBUTE the number
   ("reported as ~150 HP", "sources list 450 RPM") — use it, but signal it is
   source-derived. Marker: `[SOURCE-LISTED]`.
3. **CONFIRMED** — `verified=true`. A trusted human confirmed it in-game. →
   **State as fact**, no marker.

**Discipline rule (enforced by later phases):** `verified=true` is only ever set
by trusted-human-in-game confirmation (the LordTT/neodeye Maps precedent). Phase
2.5 only READS the flags.

---

## Q1 — What the flags assert
Two flags on the stat tables, both **set manually** (admin PATCH / SQL). The
`dexter-stats` scraper historically wrote VALUES but never touched the flags
(fixed in Phase 5).
- **`verified`** (boolean) — "this value has been confirmed" (vs seeded/guessed).
- **`patch_verified`** (text: `"1.1.0"`, `"S2"`, `"S1"`, null) — "confirmed *as of*
  this patch/season" — the staleness axis.

**Hedging rule** (now centralized in `lib/verification.js` as the 3-state
classifier `verificationState()` + `verificationTag()`): see the locked 3-state
model above. CONFIRMED → no marker (fact); SOURCE_AGREED → `[SOURCE-LISTED]`
(attribute); UNCHECKED → `[UNVERIFIED]` (hard hedge). The shared
`VERIFICATION_NOTE` explains all three registers (incl. the attribution phrasing)
to the model.

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
- **Phase 1 — DECISION: the 3-state model.** ✅ LOCKED (above).
- **Phase 2 — close the hedging bypass.** ✅ Shipped.
- **Phase 1c — add flags to the 3 unflagged tables + wire reads.** ✅ Shipped.
- **Phase 5 — make `dexter-stats` verification-aware.** ✅ Shipped.
- **Phase 2.5 — 3-state hedging (unchecked/source-agreed/confirmed).** ✅ Shipped
  (replaced the binary tag with the 3-state classifier + renderer + note).
- **Phase 3 — backfill in gated batches** against the chosen mechanism,
  baseline-before-write, never flip-to-look-better. *Pending the mechanisms.*
- **Phase 4 — repeatable per-patch cadence** so `patch_verified` keeps debt from
  silently regrowing. Hook in place: `ACTIVE_PATCH` in `dexter-stats.js` (bump per
  patch). *Full cadence pending the mechanisms.*

---

## What the plumbing shipped (plumbing only — no flags flipped, no values changed)
- **`lib/verification.js`** — single source of truth. Phase 2.5 made it the
  **3-state** classifier: `verificationState()` → UNCHECKED | SOURCE_AGREED |
  CONFIRMED, `verificationTag()` → the per-state marker, and `VERIFICATION_NOTE`
  (the 3-register prompt note). **Game-agnostic** (no season/game hardcoded) so
  every path — and DMZ — inherits one identical model that can't drift. (Replaced
  the earlier binary `isUnverified`/`unverifiedTag`/`UNVERIFIED_NOTE`; all callers
  updated — no stale binary path.)
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
- **Phase 2.5** — replaced the binary tag with the 3-state classifier/renderer/note
  across all paths (`fetchGameContext`, `miranda.js`+`buildMirandaPrompt`,
  `/api/advisor`, cradle wiring). Also **fixed a latent Phase-2 regression**: the
  advisor `core_stats`/`implant_stats` selects requested `patch_verified`, which
  those two tables don't have → the queries errored and the advisor silently
  dropped cores/implants. Now they select only `verified` (the classifier treats
  absent `patch_verified` as null).

**Verified live (3-state sim):** UNCHECKED renders `[UNVERIFIED]` (hard hedge),
SOURCE_AGREED renders `[SOURCE-LISTED]` (attribute), CONFIRMED renders no marker
(fact) — three visibly distinct treatments; `next build` green.

### Live finding — SOURCE_AGREED is currently dormant
**No live row is `verified=false` + current `patch_verified` today** — every
existing `verified=false` row has null `patch_verified`, so the live distribution
is CONFIRMED or UNCHECKED only (0 SOURCE_AGREED). The soft register is correctly
wired but unexercised until data populates it. **`dexter-stats` (Phase 5) will be
the first producer:** it writes `verified=false` + `patch_verified=ACTIVE_PATCH`
(current), which classifies as **SOURCE_AGREED** → scraped wiki stats will be
*attributed* ("sources list it at X"), not hard-hedged. That composition is
consistent with the model (a scrape IS source-derived, not human-confirmed) —
flagged so it's a conscious choice, not a surprise.

### Known interaction to resolve (mechanism phase)
`dexter-stats` primarily fills rows with NULL fields, but if it writes a field on a
row a human later verified, it will demote that row to `verified=false`. The
mechanism phase must decide precedence (e.g. scraper skips `verified=true` rows, or
only writes when the value differs). Honest-but-pessimistic for now; flagged, not
yet handled.

---

## PENDING — the source-of-truth MECHANISMS (gate all data correction)
The Phase-1 *model* is decided (3 states above) and the output now honors it. What
remains before any flag is flipped or value corrected:
- **CONFIRMED mechanism** — *who* confirms in-game and *how* it's submitted
  (the trusted-contributor process; LordTT/neodeye Maps precedent). This is the
  only path that may set `verified=true`.
- **SOURCE_AGREED mechanism** — what "sources agree" requires to set
  `patch_verified` on a `verified=false` row (how many sources, which, how
  recorded). Until defined, the only producer is `dexter-stats` (see dormant-state
  finding above).
- **Wholesale-`true` audit** — are `core_stats`/`implant_stats`/`faction_*` trues
  genuinely confirmed or seeded-true? Resolve before trusting them as CONFIRMED.
- **Scraper-vs-human precedence** (the known interaction above).

Until these are defined, **no row is flipped and no value corrected.** Phase 3
(backfill) and Phase 4 (cadence) depend on them.

## Design intent — game-agnostic
The hedging *logic* lives in shared `lib/verification.js`; each game's gather layer
owns its own current-patch constant (`ACTIVE_PATCH`). So DMZ inherits
honest-by-default hedging for free — its stat tables hedge until a trusted
contributor verifies them, exactly like Marathon.

## Scope discipline (unchanged)
- Data correction = its OWN gated effort on a fresh branch, after the mechanisms.
- Do NOT flip `verified=false → true` to improve the number.
- Do NOT create new tables (Phase 1c added only the two flag columns to 3 tables).
