# Handoff / Session Notes

Running log of cross-session decisions, shipped changes, and parked work.
Newest entries on top.

---

## 2026-06-18 — Security audit item #7 closed — ALL 8 ITEMS NOW RESOLVED

`fix(security): rate-limit + size-cap /api/track (closes audit item #7)`. The
last open audit item. `/api/track` stays UNAUTHENTICATED (anonymous analytics)
but is now flood/blob protected:
- **Per-IP rate limit** via `lib/rateLimit.js` `checkRateLimit('track:'+ip, 60,
  60_000)` -> 429 + Retry-After over 60 events/60s/IP. Generous for active users
  + NAT; stops floods.
- **event_data size cap** 2048 chars -> 400 (reject, not truncate). Legit
  payloads ~hundreds of bytes.
- **Generic error + server log:** catch now `console.error`s and returns the
  existing non-leaky `{ok:false}`.
- Allowlist unchanged (byte-identical for legit traffic). Verified via a unit
  (legit passes; 61st/IP blocked; other IP unaffected; window slides; 3 KB blob
  rejected; null/empty data pass); build green.

### Security audit — FINAL ledger (all 8 resolved)
- **#1** cron auth guard (fail-safe; CRON_SECRET armed) — CLOSED
- **#2** advisor auth + rate-limit — CLOSED
- **#3** RLS hardening (identity + player-stats tables, server-only) — CLOSED
- **#4** admin lockout + constant-time compare — CLOSED
- **#5** welcome IDOR (cookie-derived id) — CLOSED
- **#6** audit/ask-editor rate limits — CLOSED
- **#7** /api/track rate-limit + size-cap — CLOSED (this)
- **#8** generic error responses — CLOSED
**No open security-audit items remain.** Separate future task (not an audit
finding): admin OAuth migration. Standing reminders: keep `CRON_SECRET` /
`ADMIN_PASSWORD` set; RLS verified live.

### Flagged (separate from the security fix) — /api/track allowlist drift
The client fires `advisor_surprise` (AdvisorClient) and `signup_intent`
(WelcomeClient) but neither is in `ALLOWED_EVENTS`, so the route 400s and drops
them today. Left unchanged in #7 (byte-identical). Under read-only investigation
to decide whether they're accidental drift vs deliberate drops before touching
the allowlist.

---

## 2026-06-18 — fetchGameContext cache made per-game (Phase C prerequisite)

`editorCore.js` `fetchGameContext`'s context cache was game-blind (single global
slot) — a latent cross-game bug (DMZ editor could be served Marathon's cached
context). Fixed: scalar (`_gameContextCache`/`_gameContextTime`) → a slug-keyed
Map (`Map<slug, {context,time}>`), keyed on `config.slug`; same 5-min time-based
TTL; `output` computation untouched. Byte-identical for Marathon (Map-of-one ≡
the old scalar). Verified via a cache-logic unit (5 assertions): miss-when-empty,
hit-within-TTL, miss-after-TTL, **two slugs independent (the fix)**, and
single-slug hit/miss sequence identical to the old scalar. Build green.

**Phase C prerequisite still OPEN — dexter-stats throttle is game-blind:**
`dexter-stats.js` `needsRefresh`/`logRefresh` use a `wiki_meta` row keyed by a
pipeline/table name, NOT by game. When DMZ's stat-extraction runs, it could
collide with Marathon's 24h throttle row (one game's run suppresses the other's,
or they share a refresh timestamp). It's DB-based (not a module cache), so it was
out of scope for the context-cache fix — but it MUST be made per-game (key the
throttle row on game_slug) before DMZ stat extraction is wired in Phase C.

---

## 2026-06-18 — Gap 2 Phase A LANDED: Marathon gather generalized to per-game config

Scoping: [docs/network/GATHER_GAP2_DMZ_SCOPING.md](network/GATHER_GAP2_DMZ_SCOPING.md).
The gather/generation path no longer hardcodes Marathon literals — it reads a
**per-game config** (`lib/games/marathon.js` + `lib/games/index.js` registry,
`getGameConfig(slug)`). Additive refactor, **Marathon output byte-identical**
(verified). Shared code, per-game config — the pattern is proven on the working
game before DMZ exists.

Shipped in 5 gated stages (commits `ffdf9c1` → `2bcb96b` → `47abcec` → `aee5164`
→ this):
- **Config module + registry** (every Marathon literal lifted verbatim).
- **steam/reddit/youtube/twitch** read source IDs from config (default
  `getGameConfig()` = marathon).
- **gatherAll(config)** + the relevance filter (`isGameContent(v, relevance)`,
  tokens from `config.relevance`) + the GHOST subreddit label (derived from
  config; byte-identical).
- **fetchGameContext(config)** (8 `game_slug` filters → `config.slug`) +
  **callEditor(...config)** + cron `PRODUCING_GAME`/editor-list/insert-slug from
  config. **Gated by a real before/after via a temp write-free context probe:**
  assembled context BYTE-IDENTICAL (sha `25439b99…`, len 63317, all 7 sections),
  same 5 editors, same slug; probe removed after.
- **bungie/miranda/dexter-stats** threaded (bungie kept as Marathon's patch-notes
  adapter, behavior unchanged). Every source literal now lives ONLY in
  `lib/games/marathon.js`.

**Cost lever baked in:** per-game `editorial.{cadenceCron, editors}` — a game can
launch with fewer editors / slower cadence (the cron reads `config.editorial.editors`).

**Pending (Phase B+ / open decisions — unchanged):**
- Phase B: `lib/games/dmz.js` (MW4 sources), the generic per-game patch-notes
  adapter (cod-blog), DMZ relevance tokens. Phase C: DMZ stat storage + tables +
  per-game keying of the fetchGameContext cache (currently game-blind, safe while
  Marathon-only). Phase D: DMZ cron entry (reduced cadence) + go-live. Phase E:
  Broker (DMZ economy confirmed sourceable).
- Remaining Marathon-isms (byte-identical now, Phase B): editor prompt PROSE
  ("Marathon"/"Season 2"), miranda `DEV_AUTHORS` official-poster allowlist.
- 6 open decisions (stat storage, editor count, cadence, patch-notes source,
  Broker debut, config location) still to be made — see the scoping doc.

---

## 2026-06-18 — Verification Phase-1 LOCKED + Phase 2.5 (3-state hedging) shipped

Full detail: [docs/MARATHON_VERIFICATION_DEBT.md](MARATHON_VERIFICATION_DEBT.md).
Phase-1 decision LOCKED: verification is a **3-state model** read from the existing
`verified` + `patch_verified` flags. Phase 2.5 upgraded the plumbing from binary to
the 3 states. No flag flipped, no value changed (classification + rendering only).

- **States:** UNCHECKED (`verified=false` + null/`s1` pv) → hard hedge `[UNVERIFIED]`;
  SOURCE_AGREED (`verified=false` + current pv) → soft, attribute the number
  `[SOURCE-LISTED]` ("reported as ~150 HP"); CONFIRMED (`verified=true`) → fact,
  no marker. Discipline: `verified=true` only ever set by trusted-human in-game.
- **`lib/verification.js`** now the 3-state source of truth: `verificationState()`,
  `verificationTag()`, `VERIFICATION_NOTE` (replaced binary `isUnverified`/
  `unverifiedTag`/`UNVERIFIED_NOTE`; all callers updated). Game-agnostic; DMZ inherits.
- **Wired:** `fetchGameContext`, `miranda.js`+`buildMirandaPrompt`, `/api/advisor`,
  cradle. Three visibly distinct treatments confirmed via live sim; build green.
- **Fixed a latent Phase-2 regression:** the advisor `core_stats`/`implant_stats`
  selects requested `patch_verified` (which those tables lack) → queries errored →
  advisor silently dropped cores/implants. Now select only `verified`. (Was live
  since `b8a2d25`.)
- **Live finding:** SOURCE_AGREED matches **0 rows today** (all `verified=false`
  rows have null pv). `dexter-stats` (Phase 5) will be the first producer — it
  writes `verified=false` + `patch_verified=1.1.0.2` → SOURCE_AGREED, so scraped
  wiki stats get *attributed*, not hard-hedged. Consistent with the model; flagged.
- **Still pending (mechanisms, gate data correction):** who confirms in-game (set
  `verified=true`); what "sources agree" requires (set `patch_verified`); audit
  wholesale-`true` tables (real vs seeded); scraper-vs-human precedence.

---

## 2026-06-18 — Verification-debt PLUMBING shipped (Phases 2/1c/5); Phase-1 decision pending

Full audit + plan: [docs/MARATHON_VERIFICATION_DEBT.md](MARATHON_VERIFICATION_DEBT.md).
Built all the plumbing so unverified stats hedge everywhere and stay honestly
tracked. **No `verified` flag flipped, no stat value corrected** — that is gated on
the Phase-1 source-of-truth decision (no authoritative source exists for Marathon
base stats; verification will be a trusted-contributor process).

- **`lib/verification.js` (new)** — single, game-agnostic source of truth for
  hedging (`isUnverified` / `unverifiedTag` / `UNVERIFIED_NOTE`). DMZ inherits it.
- **Phase 2** (`b8a2d25`) — the `[UNVERIFIED]` mechanism existed only on the cron
  path; the Miranda guide builder + `/api/advisor` re-injected stats UNTAGGED (the
  "Vandal 150 HP / 35 Shield" artifact). Both now select `verified`/`patch_verified`
  and apply the shared tag. `fetchGameContext` uses the shared helper (no more
  private copy).
- **Phase 1c** (`b8a2d25` + Supabase ALTER, run by Justin) — added `verified`
  (DEFAULT false) + `patch_verified` to `shell_stat_values`, `cradle_nodes`,
  `ammo_stats`. `cradle_nodes` wired on cron + advisor → all 84 perks now hedge
  `[UNVERIFIED]` until verified. The other two feed display pages only (no LLM read
  to wire). NOTE: PostgREST schema cache needed a reload (`NOTIFY pgrst`) after the
  ALTER before the columns were REST-visible — verify-before-commit caught this.
- **Phase 5** — `dexter-stats` now stamps `verified=false` + `patch_verified=
  ACTIVE_PATCH` on every value it writes (never `true`). `ACTIVE_PATCH='1.1.0.2'`
  is the per-patch cadence hook (bump each patch).

**PENDING — Phase-1 DECISION (gates all data correction):** what `verified` asserts
+ the source-of-truth mechanism (recommend: trusted-contributor in-game
confirmation, the LordTT/neodeye Maps precedent). Then Phase 3 backfill + Phase 4
cadence. Also pending: audit whether wholesale-`true` tables (core/implant/faction)
are genuinely verified vs seeded-true; decide scraper-vs-human verify precedence.

---

## 2026-06-18 — Editorial guardrail: anonymize individuals in security/safety situations only

`fix(editors): anonymize individuals in security/safety situations only`. Added a
single bullet to the `COMMUNITY & SENTIMENT` block of `DATA_INTEGRITY_RULES`
([lib/editorCore.js](../lib/editorCore.js)) -- the shared constant appended to all
5 editor prompts (CIPHER/NEXUS/DEXTER/GHOST/MIRANDA). Editors KEEP naming real
users for ordinary public content (bug reports, LFG, build/strategy talk, plugs --
it grounds them in the community), but MUST NOT attach a real handle to an
individual's SECURITY/SAFETY situation (account hack, doxxing, stalking/harassment,
personal-safety incident) -- report the phenomenon without the name ("a player
reported a name-change account hack -- secure your accounts"). Narrow by
construction (NOT a blanket no-usernames rule); no voice prompts touched; future
generations only. Prompted by a GHOST article that named a real Reddit hack victim.
The existing live GHOST row was separately scrubbed via a body-only DB UPDATE
(not git).

---

## 2026-06-18 — Build-article self-correction artifact: diagnosed + seam closed

Read-only survey of the last 400 published Marathon articles found the visible
mid-text self-correction tic is **2/400 (~0.5%) — a one-off, NOT a pattern**
(CIPHER 06-18 "Twin Tap" build + MIRANDA 05-25 mod guide; DEXTER, the build
editor, was clean 0/77; the broad-regex 93 "hits" were ~91 false positives --
"actually" as emphasis, "rethink" as reader advice). Root cause of the prompting
article's specific tell was the cron's no-repeat block leaking into prose ("the
previous Recon BR33 article already covered..."). Fix (`fix(cron): mark no-repeat
block internal-only...`): added an internal-only guardrail to `buildNoRepeatBlock`
([app/api/cron/route.js](../app/api/cron/route.js)) -- the no-repeat list must
never be mentioned/narrated in the article. Existing dedup function unchanged; no
voice prompts touched; shared across all 5 editors so the seam closes network-wide.
Future generations only.

---

## 2026-06-17 — Security batch #4/#6/#8 shipped (code)

`fix(security): admin lockout + constant-time compare, rate limits on
audit/ask-editor, generic error responses (#4/#6/#8)`. Lower-priority code-side
hardening from the audit. No secrets/env/RLS touched; no regressions to existing
auth/injection/cron guards.

- **#4 `/api/admin` hardening** (password kept; OAuth migration is a separate
  future task). Constant-time compare (`safeEqual`: both sides SHA-256'd to a
  fixed 32-byte digest then `crypto.timingSafeEqual` -- kills the per-char AND
  length timing leaks; fail-closed if `ADMIN_PASSWORD` unset). Plus a
  **windowed, self-clearing, PER-IP lockout** (5 fails / 15 min) via new helpers
  in `lib/rateLimit.js` (`checkLockout`/`recordFailure`/`clearFailures`). All 4
  handlers go through one `authorize()` gate. **Cannot permanently lock out the
  admin:** keyed per-IP (a brute-forcer locks only their own IP; admin's own
  connection has a separate counter), auto-clears after the window, and a
  correct password in the normal state resets the counter. Self-lockout (admin
  mistypes 5x from own IP) lifts in <=15 min or via a different connection.
  (Foundation: `ADMIN_PASSWORD` already upgraded to a long random value.)
- **#6 rate limits** on the two cookie-gated paid routes, reusing
  `checkRateLimit`: `/api/audit` **5 / 5 min** (tighter -- ~3 Sonnet calls/req),
  `/api/ask-editor` **30 / 5 min** (chatty, 1 call/req). 429 + `Retry-After`,
  mirroring advisor. Cookie auth + injection hardening intact.
- **#8 generic error responses** in `advisor` (catch), `audit` (catch + the
  `auditError` save path), `ask-editor` (catch): real error `console.error`'d
  server-side, client gets `{ error: 'Something went wrong' }` -- no more
  `err.message`/`detail` leakage. (ask-editor's `'Editor unavailable'` was
  already generic.)

### Security audit status (running)
- **CLOSED:** #1 cron guard (armed: `CRON_SECRET` set, 401 confirmed); #2
  advisor auth/rate-limit; #3 RLS; #4 admin lockout + constant-time; #5 welcome
  IDOR; #6 audit/ask-editor rate limits; #8 generic errors.
- **OPEN:** **#7 `/api/track`** -- unauthenticated service-key insert to
  `site_events` (spam/bloat; low). Only remaining audit item.
- **Separate future task (not an audit finding):** admin OAuth migration (fold
  admin behind the Bungie-OAuth allowlist instead of a shared password).
- **CONFIRMED FINE (no action):** Anthropic key + Supabase service key
  server-only; no hardcoded secrets; dev-sample route gated; Bungie OAuth CSRF +
  allowlist; `cp_player_id` cookie solid.

---

## 2026-06-17 — RLS hardening applied (Supabase SQL editor — verified) + audit state

SQL-only work, run in Supabase by Justin and verified successful. **No repo code
changed for the RLS fix itself** (the read-path audit found nothing to reroute),
so this is a docs-only record.

**Fix A — 6 identity tables locked server-only.** Enabled RLS + added
`service_role`-only policies (`service_all_*`, matching the
`player_profiles` / `service_all_profiles` convention) on the 6 previously
RLS-OFF identity tables: `network_account`, `linked_identity`, `game_profile`,
`build`, `build_grade`, `subscription`. Safe — all empty/inert, no readers.

**Fix B — 3 player-stats tables locked server-only.** `player_stats`,
`player_shell_stats`, `player_weapon_stats`. Read-path audit found **ZERO code
readers/writers and 0 rows**. Discovery query revealed the existing `"Public
read"` **and** `"Service insert/update"` policies were all scoped to `PUBLIC`
(`{-}`) — i.e. the "Service" *write* policies were **secretly public-writable**.
Dropped all three public-scoped policies per table, replaced with a single
`service_role`-only policy each. Now server-only, matching `player_profiles`.
Public stats display (when later built) will go through a server API by
construction (only access is the service key).

**Verification:** the `rls_enabled = false` audit query now returns **zero
rows** — no public table has RLS off.

### Security audit status (running)
- **CLOSED:** #1 cron auth guard (code `69bc200` + `CRON_SECRET` set in Vercel,
  401 confirmed); #2 advisor auth/rate-limit; #3 RLS (this fix); #5 welcome IDOR.
- **OPEN (lower-priority later batch):** #4 admin lockout / constant-time compare
  + confirm `ADMIN_PASSWORD` strength; #6 rate limits on `/api/audit` +
  `/api/ask-editor` (can adopt `lib/rateLimit.js` as-is); #7 `/api/track` auth;
  #8 generic error responses (stop returning `err.message`/`detail` to client).
- **CONFIRMED FINE (no action):** Anthropic key + Supabase service key
  server-only; no hardcoded secrets; dev-sample route gated; Bungie OAuth CSRF +
  allowlist; `cp_player_id` cookie solid.

---

## 2026-06-17 — Security audit + first fix pass (findings #1/#2/#5 closed)

Read-only security audit ranked the real risk surface (leaked keys, openly-
triggerable paid routes, DB access). Honest top-line: **keys are clean** —
Anthropic + Supabase SERVICE keys are server-only (Server Components / API
routes), never `NEXT_PUBLIC`, never client, never logged/returned; `.env*`
gitignored; no hardcoded secrets; no anon-key writes anywhere; `cp_player_id`
is a proper `httpOnly`/`secure`/UUID session cookie; OAuth is closed-beta
(allowlist = Justin only). The holes were openly-triggerable cost routes + an
IDOR + the unknown RLS state.

**Fixed this pass** (`fix(security): cron auth guard (fail-safe) + advisor
auth/ratelimit + welcome IDOR fix`):
- **#1 CRITICAL — `/api/cron` was fully open** (`GET()` took no req, no auth) →
  anyone could force a PAID generation cycle. Now `GET(req)` with a **FAIL-SAFE**
  guard: `CRON_SECRET` unset → ALLOW + warn (so deploying before the env var is
  set does NOT lock out Vercel's scheduled job — avoids re-creating the
  generation outage); `CRON_SECRET` set → require `Authorization: Bearer
  <CRON_SECRET>` else 401. Vercel Cron sends that header automatically. **The
  guard is INERT until Justin sets `CRON_SECRET` in Vercel — setting it ARMS it.**
- **#2 HIGH — `/api/advisor`** had no auth + no rate limit (open paid Claude
  call; the page gated it but the route didn't). Now gated on `cp_player_id`
  (same pattern as audit/ask-editor) + per-player rate limit (10/60s) via new
  `lib/rateLimit.js`. Injection hardening untouched.
- **#5 MEDIUM — `/api/welcome/complete` IDOR**: trusted body `player_id` →
  could update any profile. Now derives id from the `cp_player_id` cookie (body
  value ignored); mirrors `/api/profile`.
- **`lib/rateLimit.js` (new):** in-memory sliding-window limiter, zero deps / no
  DDL. Documented as per-instance defense-in-depth (durable protection = the
  auth gate + closed beta); `checkRateLimit()` is the seam to swap a shared
  store (Upstash/DB) later. **#6 (audit/ask-editor) can adopt it as-is.**

**Still open (NOT in this pass):**
- **#3 HIGH — Supabase RLS state: IN PROGRESS separately (Justin, dashboard).**
  Cannot be verified from code. If RLS is OFF, the browser-shipped anon key =
  full read/write of all tables incl. `player_*` PII. Highest remaining item.
- **#4 MEDIUM — `/api/admin`** full CRUD behind a single static `ADMIN_PASSWORD`
  header, no lockout / non-constant-time compare. (Env value = Justin's;
  code-side lockout = later batch.)
- **#6 MEDIUM — `/api/audit` + `/api/ask-editor`** no per-user rate limit (low
  now: UUID-cookie-gated + closed beta; audit fires 3 Sonnet calls/req). Adopt
  `lib/rateLimit.js` before opening the beta.
- **#7 LOW-MED — `/api/track`** unauthenticated service-key insert (spam/bloat).
- **#8 LOW — error responses** return `err.message`/`detail` to client (info
  disclosure, no secrets).
- **Gated/dashboard (Justin):** set `CRON_SECRET` (arms #1), verify RLS (#3),
  `ADMIN_PASSWORD` strength (#4).

---

## 2026-06-17 — Gap 1 FIXED: full patch notes ingested + completeness signal

`fix(gather): ingest full patch notes + completeness signal (gap 1)`. The
patch-note ingest truncation (the 1.1.0.2 "C.A.R.R.I.-only" failure) is closed.

- **Root cause overturned a locked assumption (verify-first win):** the Step-1
  fetch probe found the truncation was **100% self-inflicted**, not a Bungie.net
  access problem. The Steam news API called **uncapped (`maxlength=0`) already
  returns the full official Bungie notes** (1.1.0.2 = 6,362 raw chars; the
  `steam_community_announcements` feed IS Bungie's posts cross-posted). So we
  **did NOT build a Bungie.net scraper** (the originally-locked source) — no new
  fragile external dependency; we just stopped truncating what we already get.
- **Changes (3 files):** `steam.js` — `maxlength=600`→`0`, dropped `.slice(0,500)`,
  added `bbcodeToText()` (Steam posts are BBCode, not HTML) + `source` +
  `notes_complete`. `bungie.js` — dropped RSS `.slice(0,400)`, RSS marked
  `notes_complete:false` (secondary/summary source), merge now **prefers the
  fuller version** (was first-seen), completeness label threaded into
  `formatBungieNewsForEditor`. `cipher.js` — dropped `.slice(0,800)` in
  `buildPatchImpactPrompt`, full notes + completeness label to CIPHER.
- **Completeness signal:** each Bungie-news item carries `notes_complete`; editor
  prompts now state `COMPLETENESS: FULL …` vs `COMPLETENESS: PARTIAL — only a
  short blurb … do not state specific values as confirmed`. Closes the
  partial-treated-as-complete gap for patches (the editor voices' thin-source
  honesty can only act on thinness they can SEE — this makes it visible).
- **Verified (live API):** 1.1.0.2 cleaned body = 5,451 chars, all cut changes
  survive (Cradle/Folding Stock/Bluenique/Prestige/Folio), zero BBCode tags
  remain, merge collapses Steam+RSS dup to the complete one order-independently,
  both completeness labels correct, fetch-failure resilience intact (`[]` fallback).
- **Scope:** Marathon-only (appid unchanged), **no distiller** (raw notes), only
  the patch-note path touched. Token cost ~1.4k input × ~5 editors **only on a
  patch cycle** — negligible. Per-decision: authoritative source effectively
  remains Bungie's official notes (via the Steam cross-post), just untruncated.
- **Still open:** Gap 2 (per-game gather for DMZ) unchanged below; general
  sufficiency/staleness gate beyond patches (MEDIUM) not addressed.

---

## 2026-06-17 — Gather/ingest pipeline AUDIT done (read-only) — 2 gaps flagged

Full map + assessment: [docs/network/GATHER_PIPELINE_AUDIT.md](network/GATHER_PIPELINE_AUDIT.md).
No code changed. Headline findings:

- **Gap 1 (HIGH, fix next):** patch notes are **truncated at ingest** —
  `steam.js:27` `&maxlength=600` + `bungie.js:39` `.slice(0, 400)`, and the full
  patch-note body is never fetched. Editors only ever see a <=400-600 char blurb of
  any patch -> the 1.1.0.2 "C.A.R.R.I.-only / no changes" failure. **Systemic, recurs
  every patch.** No completeness gate (empty is handled; partial silently treated as
  complete). Fix lives in the GATHER layer, not the editor prompts. **FIXED
  2026-06-17 — see the Gap-1-closure entry above.**
- **Gap 2 (HIGH for DMZ):** the gather pipeline is **Marathon-hardcoded end to end**
  (Steam appid 3065800, r/MarathonTheGame, YouTube queries, Twitch game id, wiki URLs,
  relevance filter, stat tables). Per-game gather is **designed-only**. The "~5
  parameterization-pending 'marathon' sites" are **storage-scoping/dedup flips only**,
  NOT the source layer — DMZ editorial needs a real per-game gather config + sources,
  not a 5-line flip. (Storage + display are game-aware; inputs are not.)
- Verdict: well-orchestrated skeleton (good empty-source fallbacks, off-topic filter,
  patch detection w/ freshness + fail-closed dedup, no-bleed scoping, honesty rules) —
  but Marathon-shaped at the source level and fragile on patch-input completeness.

---

## 2026-06-17 — Note: `feed_items.editor_note` is a DEAD (unrendered) field

`feed_items.editor_note` has **zero references in any template** (confirmed: no use in `app/intel/[slug]/page.js` or other render sites) — it is not displayed anywhere. Flagged so it is not assumed live: it is NOT a corrections/edited-at home (the 1.1.0.2 addendum, if applied, goes in `body`).

---

## 2026-06-17 — Marathon verification debt PARKED (own future session)

The 1.1.0.2 baseline scan surfaced the real data-quality exposure. Scoped as its own
future session: [docs/MARATHON_VERIFICATION_DEBT.md](MARATHON_VERIFICATION_DEBT.md).

- **Debt (baseline):** `weapon_stats` 16/32 + `mod_stats` 104/202 `verified=false` —
  ~half the stat data underpinning builds/tiers/articles is unconfirmed. The real
  "We don't agree, and we don't guess" credibility risk.
- **Hard rule:** do NOT flip `verified=false -> true` to improve the number — a flag
  with nothing behind it is worse than honest unverified data. No flips until a
  defined source of truth exists per stat.
- **Blocking question (Phase 1):** define what `verified` vs `patch_verified` each
  assert (the latter likely the per-patch anti-regrowth mechanism) + pick a
  designated source (official / in-game / datamine / community contributors —
  LordTT + neodeye already credited on Maps).
- **Plan:** Phase 0 read-only audit (category breakdown + patch_verified
  distribution) -> Phase 1 definitions+sourcing decision -> Phase 2+ gated backfill
  batches + per-patch cadence. Own branch from main; read-only until Phase 1; no new
  tables/columns.
- **NOT started** (this was scoping only; no data touched). Separate flagged thread:
  the pipeline can publish off truncated patch notes (source-ingest quality), distinct
  from stat-verification debt — its own future look.

---

## 2026-06-17 — Editor rework Step 6 (Broker) PAUSED — scoping done, deferred to DMZ launch

Scoped the 6th editor, **Broker / Vera Sloan** (economy & market lane). **Verdict:
PAUSE activation.** Full write-up: [docs/network/BROKER_STEP6_SCOPING.md](network/BROKER_STEP6_SCOPING.md).

- **Why paused (the gate):** Marathon has no RENEWING economy/market data to
  sustain a dedicated per-cron editor. There is no player marketplace/auction/
  pricing system (the "market" half); the only economy data is `faction_armory`
  (44 static verified rows of credit/material costs) + `faction_upgrades` (6),
  which already feed `fetchGameContext` and whose beat overlaps DEXTER (build
  cost/accessibility) and GHOST. Every other editor has a renewing source;
  Broker would have none — and that input is the hardest requirement. (Context:
  Marathon reportedly underperformed commercially — poor ROI to add a thin lane.)
- **DMZ-launch trigger (when to revisit):** Broker's genuinely rich beat is
  **DMZ's launch economy (Oct 23, 2026)** — 3D Printer recipes + material costs,
  FOB progression costs, the cash-tied Gunsmith, loot/extraction value. Editors
  are network-level, so debut Broker WITH DMZ. Alt trigger: Marathon adds a real
  market/trading system. Until one is true, hold.
- **Status today:** Broker exists in the display map (`lib/editors/roster.js`:
  Vera Sloan, `$`, slate, `status:'incoming'`) and renders as "incoming" on
  `/editors`; `/intel/broker` 404s; it does NOT publish. The map-driven layer
  (Footer/Nav/editors page) auto-surfaces it when `status` flips to `'live'`.
- **The full activation plan lives in the scoping doc** (Part 3): data source
  FIRST (the gate) -> persona+voice via the harness -> wire the ~10 hardcoded-5
  sites + kill the silent-CIPHER fallback -> enable the lane -> flip
  `status:'live'` and add to the cron LAST (hard ordering rule: all wiring
  before any Broker publish, or an unconfigured Broker article renders AS CIPHER).
- **Editor rework status:** Steps 0-5 COMPLETE (all 5 active editors voiced).
  Step 6 (Broker) is the only remaining step, now PARKED pending the trigger.

---

## 2026-06-16 — DMZ gated go-live VERIFIED end-to-end (probe inserted, all filters held, probe removed)

The load-bearing test. Inserted the **first `game_slug='dmz'` row** as a single controlled
containment probe, verified every filter from Steps 2-3 is now load-bearing and holding,
then removed it. **The DMZ content-home slice is COMPLETE and VERIFIED end-to-end** — the
filters are proven to contain DMZ. No code change (pure DB + verification).

- **Probe:** one `feed_items` row, `game_slug='dmz'`, editor `NEXUS`, tags
  `['season-2','meta']` (deliberately overlapping Marathon so any leak would surface),
  greppable title marker. Insert shape matched the cron writer (explicit `game_slug` — B2
  dropped the default, so a missing one would fail-loud `23502`).
- **Backup first:** full `feed_items` snapshot (1756 rows) →
  `C:/Users/justi/feed_items_backup_golive_20260616.json` (retained). Baselines recorded
  before insert (marathon 1756 / published 1349 / dmz 0).
- **NEGATIVE space (containment) — all held:** probe absent from every Marathon surface —
  homepage `/`, `/intel`, `/sitrep`, `/meta`, `/ranked`, `/factions`, `/builds`, `/guides`,
  `/editors` (rendered title count 0 on each); sitemap **Marathon-only** (probe slug absent;
  1092 `<url>` entries); cron **no-repeat NEXUS** read clean (no-bleed held even though the
  probe was itself a NEXUS article); `get_related_articles` within-game **both directions**
  (Marathon article's relateds excluded the probe; the probe's relateds returned 0 Marathon
  rows). Count invariants: marathon total/published unchanged (1756/1349).
- **POSITIVE space:** probe visible on its DMZ editor-fed sections (`/dmz/field-intel`,
  `/dmz/meta`, `/dmz/loadouts` — appears on all three because the section page currently
  filters only `game_slug='dmz'`; per-section tag/editor refinement is future, by design).
- **Measurement caveat:** the one script "FAIL" was a PostgREST 1000-row-cap artifact on a
  `.limit(2000)` fetch (measured 1000 vs 1349), NOT a leak — re-proven clean via a direct
  membership query (probe in 0 marathon rows, 1 dmz row).
- **Rollback executed:** `DELETE FROM feed_items WHERE id='f72a83d7-...'` → back to **1756
  marathon / 0 dmz / total 1756**, all filters inert again; `/dmz` sections confirmed
  rendering empty (empty-state restored, probe title gone).
- **NEXT:** pre-launch DMZ content campaign (Track 2); flip the **5 parameterization-pending
  `'marathon'` sites** to the per-game target when DMZ editorial starts (`PRODUCING_GAME_SLUG`
  in cron / cipher / miranda, the B1 cron writer literal, the C2 caller `p_game_slug`);
  sitemap `/dmz`-emit once real DMZ pages exist; rough DMZ tokens → final tuning at
  launch-polish.

---

## 2026-06-15 — DMZ Step 4 DONE: /dmz live (empty) — content-home slice COMPLETE through Step 4

Built `/dmz` as the EMPTY first instance of the network game-section template
([GAME_TEMPLATE.md](dmz/GAME_TEMPLATE.md), decisions D1-D4). Commit `7f6f6a3`, direct to
main, pushed. **The content-home slice (Steps 2-4) is COMPLETE.** `/dmz` renders but holds
zero content — no `game_slug='dmz'` row was inserted (that's the separate gated go-live).

- **Template first instance built (config-driven):**
  - **D1** — `lib/games/dmz.js` (config module: slug + thin section descriptors
    `{ slug, label, source, contentFilter }` + rough theme tokens) and
    `lib/games/registry.js` (network registry `game_slug -> config`). A future game = a
    config module + a registry entry.
  - **D2** — DMZ fuller skeleton, two source kinds: EDITOR-FED (Field Intel / Meta /
    Loadouts → read `feed_items WHERE game_slug='dmz'`, empty now → empty-state) +
    DATA-FED (3D Printer / FOB / Hajin Regions → "coming soon" shells, own entity tables
    later). DMZ vocabulary throughout.
  - **D3** — theme-swap wired: `.dmz-theme` token block in `globals.css` redefines the
    design tokens; the `/dmz` layout wraps its subtree in it. Confirmed: amber `#e89a2c` /
    base `#0b0e11` ship in the compiled CSS bundle; Marathon (`:root`) untouched. **Tokens
    are ROUGH — need final tuning at the launch-polish pass.**
  - **D4** — shell built FOR DMZ (`app/dmz/`: `layout`, `DmzNav` renders nav from config,
    `page` landing renders grid from config, `[section]/page` one config-driven route for
    all sections + force-dynamic + lazy `supabase`, `DmzEmptyState`, `DmzComingSoon`). NOT
    extracted to a shared layer yet (extract when Marathon migrates).
  - Marathon's global `Nav` + `LivePulseStrip` suppressed on `/dmz` (additive guards in
    `components/Nav.js` + `components/LivePulseGate.js`, placed after all hooks); Marathon
    routes unaffected.
- **Verified:** `/dmz` + all 6 sections render 200 (editor-fed = empty-state, data-fed =
  coming-soon); unknown section → 404 (config-validated); nav + landing render from config;
  theme-swap ships; **Marathon unchanged** (`/intel` + `/` still 200, no `dmz-theme` leak,
  Marathon nav intact). Build green.
- **NEXT — gated go-live (separate step):** insert the first `game_slug='dmz'` row(s), then
  verify all the inert filters from Steps 2-3 now hold (Marathon reads still exclude DMZ;
  DMZ section now shows content; sitemap still emits only Marathon at `/intel`; related-
  articles stay within-game). This is the action that makes every filter load-bearing. Pair
  with the pre-launch DMZ content campaign.
- **Still pending (carried):**
  - **Rough DMZ tokens need final tuning** at launch-polish (kept in sync between
    `globals.css` `.dmz-theme` and the `theme` block in `lib/games/dmz.js`).
  - **5 parameterization-pending `'marathon'` sites** still hardcoded (flip to per-game
    target when DMZ editorial starts): `PRODUCING_GAME_SLUG` in cron / cipher / miranda, the
    B1 cron writer literal, the C2 caller `p_game_slug`. (DMZ's own section page uses a
    separate `DMZ_GAME_SLUG='dmz'` constant — correct as-is.)
  - **Sitemap `/dmz`-emit** — build `/dmz/...` URL emission at/after go-live (route group +
    content now exist; emit once there are real DMZ pages to point at).

---

## 2026-06-15 — Network game-section template DESIGNED + Step 4 fully specified

Design doc: [docs/dmz/GAME_TEMPLATE.md](dmz/GAME_TEMPLATE.md). The reusable pattern for how
ANY game attaches to the network: **universal in STRUCTURE, agnostic about CONTENT.**
Generalize the plug-in *mechanism* (game_slug + per-game sections-config + shared shell), NOT
the section *taxonomy* (a universal section set generalizes from one example and breaks at
game #3). **DMZ is the FIRST INSTANCE of this template, not a bespoke build; Marathon migrates
onto it later (deliberately, not now).**

- **The template = 3 parts:** (1) `game_slug` as the organizing dimension (already proven by
  the feed_items migration, Steps 2-3); (2) per-game **sections-config** — each game declares
  its sections as thin descriptors and the routes/nav/landing render FROM the config, not
  hardcoded pages; (3) the **shared shell** (header/nav/route-group wrapper/empty-state/theme
  token-swap/landing), theme-swapped per game.
- **Anti-premature-abstraction line:** no universal section set, no universal content
  taxonomy, no runtime "engine"/dynamic-route-generator meta-system now (config-driven copy
  is enough; build the generator only if game #3/#4 proves it needed), no Marathon migration
  now.
- **4 decisions LOCKED:**
  - **D1 — config location + descriptor shape:** per-game config MODULE (folder + exported
    sections) + a lightweight network-level REGISTRY (`game_slug -> config`); THIN descriptor
    = `{ slug, label, contentFilter }`, add fields only when a real section needs one.
  - **D2 — DMZ initial sections = FULLER SKELETON**, in two descriptor-flagged kinds (they
    read different sources): EDITOR-FED (`feed_items WHERE game_slug='dmz'`) = **Field Intel,
    Meta, Loadouts**; DATA-FED (own entity tables later; "coming soon" shells now) = **3D
    Printer, FOB, Hajin Regions**. DMZ vocabulary throughout (Field Intel / Loadouts / OPS,
    not Intel Feed / Builds).
  - **D3 — theme-swap wired in Step 4** at the route-group level with ROUGH DMZ tokens (amber
    primary / cold grey-blue base / irradiated-red hazard) — proves the mechanism + gives DMZ
    visual distinction. Tokens explicitly rough; final palette at launch-polish.
  - **D4 — build the shell for DMZ CLEANLY but do NOT extract to a shared-component layer
    yet** — extract when Marathon migrates onto the template (DMZ-first-then-template, one
    level down).
- **NEXT — Step 4 (fully specified, build the EMPTY first instance):** `/dmz` route group +
  shared shell + DMZ sections-config (full skeleton: editor-fed reading `game_slug='dmz'`
  empty, data-fed "coming soon" shells) + rough DMZ theme tokens (swap wired). Marathon
  untouched. Verify renders-empty + Marathon-unchanged + build green.
- **The first `game_slug='dmz'` INSERT remains a SEPARATE gated go-live step** (after Step 4
  builds the empty instance; this is when the inert filters from Steps 2-3 become
  load-bearing and the 5 parameterization-pending `'marathon'` sites get wired to the target
  game).

---

## 2026-06-15 — DMZ Step 3 COMPLETE: all feed_items consumers + writer game-aware

Batch C done (commits `2d6347d` C1, `46f5249` C2), closing Step 3. **Every `feed_items`
reader, the writer, and the related-articles DB function are now game-aware.** Marathon
behavior is unchanged at every step (all rows are `'marathon'`; filters inert until DMZ rows
exist). Step 3 = Batch A (42 site reads) + Batch B (writer + default-dropped + 11 no-bleed
editorial reads) + Batch C (sitemap + RPC).

- **C1 — sitemap marathon filter** (`app/sitemap.js`, commit `2d6347d`): the feed_items read
  that emits `/intel/<slug>` URLs now filters `game_slug='marathon'`, so the sitemap won't
  advertise DMZ slugs at unprefixed Marathon paths. Output identical today. (The pre-existing
  `game_slug` filter at ~168 is on `game_maps`, untouched.)
- **C2 — game-aware `get_related_articles` RPC** (commit `46f5249`): the only DB-function
  change in the migration. Added `p_game_slug text DEFAULT 'marathon'` (last param, Option A)
  + an `AND f.game_slug = p_game_slug` predicate; body otherwise verbatim. Caller
  (`app/intel/[slug]/page.js:1304`) now passes `p_game_slug: 'marathon'` explicitly. Full
  verbatim function body + both DDLs recorded in [MIGRATIONS.md](dmz/MIGRATIONS.md).
  - **Gotcha (resolved):** `CREATE OR REPLACE` with a new param created a *second* overload
    rather than replacing — the stale 3-arg function caused a PostgREST "could not choose the
    best candidate" ambiguity that briefly degraded prod related-articles. Fixed with
    `DROP FUNCTION IF EXISTS public.get_related_articles(uuid, text[], integer);`. Verified:
    exactly one definition, 3-arg + 4-arg both work + identical, baseline reproduced, prod
    restored. **Lesson for future RPC param adds: a CREATE OR REPLACE that changes arity
    needs a DROP of the old signature.**

### Deferred / pending after Step 3
- **⚠ PARAMETERIZATION-PENDING — now 5 sites** hardcode `'marathon'` and must all flip
  together to the cron's per-game target when DMZ editorial starts: (1) `PRODUCING_GAME_SLUG`
  in `app/api/cron/route.js`, (2) `PRODUCING_GAME_SLUG` in `lib/gather/cipher.js`,
  (3) `PRODUCING_GAME_SLUG` in `lib/gather/miranda.js`, (4) the B1 cron **writer literal**
  `game_slug: 'marathon'`, and (5) the **C2 caller** `p_game_slug: 'marathon'` in
  `app/intel/[slug]/page.js:1304`. All inert today.
- **Sitemap `/dmz`-emit (Step-4-adjacent):** build `/dmz/...` URL emission once the `/dmz`
  route group + real DMZ content exist (emitting them now would 404 to Google). The C1 filter
  only prevents leakage; it does not yet emit DMZ URLs.
- **NEXT — Step 4: the `/dmz` route group** rendering `feed_items WHERE game_slug='dmz'`
  (publishes the first non-marathon rows; at that point the inert filters become load-bearing
  and the 5 parameterization sites get wired to the target game).

---

## 2026-06-15 — DMZ Step 3 Batch B COMPLETE: writer + default-dropped + no-bleed reads

The delicate batch (write-path change + gated DDL with an ordering hazard + no-bleed reads).
Done in strict order B1 → B2 → B3. Commits `cfedc66` (B1), `62ae5ea` (B2 / MIGRATIONS.md),
`b5e8bee` (B3), all direct to main, pushed.

- **B1 — cron writer sets `game_slug`** (`app/api/cron/route.js:411`): the sole code insert
  path into `feed_items` now writes `game_slug: 'marathon'` explicitly. Re-grepped the whole
  tree to be sure: the only feed_items insert is cron; the thumbnail UPDATE (≈708) is
  id-scoped (no change); the admin generic insert can't touch feed_items (`feed_items` not in
  `ALLOWED_TABLES`); manual/catch-up is a procedure (set game_slug on any one-off insert).
- **B2 — dropped the column DEFAULT, kept NOT NULL** (DDL applied in Supabase SQL editor,
  recorded in [MIGRATIONS.md](dmz/MIGRATIONS.md)): `ALTER TABLE feed_items ALTER COLUMN
  game_slug DROP DEFAULT;`. **Verified fail-loud:** a deliberate insert omitting game_slug
  is now REJECTED with Postgres `23502` (not-null violation) — proves default gone AND NOT
  NULL intact; no row created. Data unchanged (1756/1756 marathon, 0 null). **The Step-2
  open item ("drop default once cron writes game_slug") is now CLOSED.** Empirical B1+B2
  consistency proof is the next real cron insert succeeding with no default present.
- **B3 — 11 editorial-input reads no-bleed-filtered**: cron no-repeat ×4, `lib/gather/
  cipher.js` ×6 (audit said 5 — re-grep found a 6th: the patch-dedup read), `lib/gather/
  miranda.js` ×1. Each module gets ONE named constant `PRODUCING_GAME_SLUG = 'marathon'`
  (the single per-game knob), and every editorial-input read filters by it — so a future DMZ
  run dedups/synthesizes against DMZ's own prior articles, not Marathon's. Verified identical
  output today (11/11 filtered==unfiltered counts). Build green.
- **⚠ PARAMETERIZATION-PENDING (do when DMZ editorial starts):** there are **4 sites** that
  currently hardcode `'marathon'` and must become the cron's **per-game target parameter**:
  (1) `PRODUCING_GAME_SLUG` in `app/api/cron/route.js`, (2) `PRODUCING_GAME_SLUG` in
  `lib/gather/cipher.js`, (3) `PRODUCING_GAME_SLUG` in `lib/gather/miranda.js`, and (4) the
  B1 **writer literal** `game_slug: 'marathon'` in the cron `insertData`. All inert today
  (everything is marathon); all 4 flip together to the target game when DMZ content is
  produced.
- **NEXT — Step 3 Batch C (the last Step-3 batch):** sitemap (filter marathon for unprefixed
  `/intel/<slug>`; emit `/dmz/...` later) + the `get_related_articles` **RPC** (server-side
  SQL, not a table read — flagged in Batch A; needs game-awareness so related articles don't
  mix games once DMZ rows exist).

---

## 2026-06-15 — DMZ Step 3 Batch A COMPLETE: all Group A reads game-scoped

Site-content `feed_items` reads now filter `game_slug='marathon'`. Done in two sub-batches:
A1 (commit `0e33322`) + A2 (commit `6ecc113`), both direct to main, pushed.

- **All 42 Group A `feed_items` reads game-scoped** — 8 (A1) + 34 (A2) across ~18 files.
  Filter added **after `is_published`** (or after `.eq('slug', …)` for by-slug reads),
  **alongside** existing tag/`or`/`contains`/`in`/editor logic — never replacing.
- **Output verified identical** (filtered vs unfiltered, real params, every query shape:
  ranked/factions/guides/editors/weapons/shells/meta/sitrep/HomeEditorReactions/intel
  by-slug — all counts matched). **Build green.** Filters inert until a `dmz` row exists.
- **Group B (editorial-input) and Group C (sitemap) still remain in Step 3** — NOT touched.
  B = cron no-repeat lines + `lib/gather/cipher.js` (×5) + `lib/gather/miranda.js` (×1),
  plus the cron WRITER (insert must write `game_slug='marathon'`), honoring the no-bleed
  note (DMZ editors read DMZ's prior articles). C = sitemap (filter marathon for unprefixed
  `/intel/<slug>`; emit `/dmz/...` later).
- **RPC flag (recorded for a later pass):** `app/intel/[slug]/page.js` calls the
  `get_related_articles` **RPC** (server-side SQL, not a table read) — out of Batch-A scope.
  Its feed_items **fallback** read IS filtered, but the RPC itself can mix games once DMZ
  rows exist; needs game-awareness in Batch B/C or a dedicated RPC pass.

---

## 2026-06-15 — DMZ Step 2 DONE: feed_items.game_slug added + backfilled

First production write of the migration. Applied directly in the Supabase SQL editor (no
migrations framework in-repo); recorded in [docs/dmz/MIGRATIONS.md](dmz/MIGRATIONS.md).

- **`game_slug` added** to `feed_items`: type `text`, **DEFAULT `'marathon'`**, **NOT
  NULL**, index **`idx_feed_items_game_slug`** confirmed present.
- **Backfill: 1756/1756 rows = `'marathon'`, 0 null** (verified), 0 non-marathon.
- **Marathon unchanged** (verified): `/intel` latest 100 + homepage latest 25 return the
  same rows, all `'marathon'`; total `is_published` = 1349. Column is **inert** — nothing
  reads `game_slug` yet, no DMZ rows exist.
- **Pre-write backup:** `C:/Users/justi/feed_items_backup_step2_20260615.json` (1756 rows,
  count-verified).
- **Step-3 open item (recorded, do NOT do yet):** once the cron writes `game_slug`
  explicitly, **drop the `DEFAULT 'marathon'`** (keep NOT NULL) so a future DMZ insert that
  omits `game_slug` errors instead of being silently mis-tagged.
- **NEXT — Step 3 (batched A/B/C game-aware consumers):** A = site content pages (18
  files), B = editorial-input reads (cron no-repeat + CIPHER synthesis + MIRANDA, honoring
  the Group-B no-bleed note), C = sitemap. Each batch independently tested + Marathon-
  verified; all filtering must land before any `game_slug='dmz'` insert.

---

## 2026-06-15 — DMZ content-home slice: feed_items audit (Step 1) DONE, plan APPROVED

Full audit + approved plan in [docs/dmz/FEED_ITEMS_AUDIT.md](dmz/FEED_ITEMS_AUDIT.md).

- **Step 1 (read-only consumer/writer audit) DONE.** Key finding: `feed_items` is touched
  in **~21 files / ~50+ call-sites — NOT the 5 originally assumed.** 3 writers (cron
  insert must write `game_slug`; cron thumbnail-update is id-scoped; manual inserts set it),
  readers in Group A (18 site-page files), B (editorial input: cron no-repeat + CIPHER +
  MIRANDA), C (sitemap).
- **Plan APPROVED** with the governing invariant (Marathon-unchanged; every read filter
  defaults to `'marathon'`). **Step 3 BATCHED** into A (site pages) / B (editorial input) /
  C (sitemap), each independently tested + Marathon-verified — not one big-bang change.
- **Safety-timing:** filters become load-bearing only once a `game_slug='dmz'` row exists,
  so ALL consumer filtering must land BEFORE any `dmz` insert. (Step 4 publishes zero dmz
  rows.)
- **Group B correctness:** DMZ editors must read DMZ's prior articles, not Marathon's, or
  cross-game no-repeat/synthesis bleeds.
- **Sitemap:** filter marathon for unprefixed `/intel/<slug>`; emit `/dmz/...` separately
  (SEO-critical).
- **Confirmed deferrals:** `article_comments` game-scoping (inherits via `article_id`);
  `title.template` + `buildMetaDescription` unchanged; `/dmz` launches on Marathon theme.
- **NEXT (fresh next session):** Step 2 — add `game_slug` + backfill 1756 rows to
  'marathon'. This is the first production write; NOT started this session. Gated:
  backup-first, verify all rows 'marathon' / 0 null, Marathon unchanged.

---

## 2026-06-15 — DMZ network-vision refinements; architecture lock COMPLETE

Docs: [TABLE_INVENTORY.md](dmz/TABLE_INVENTORY.md), [URL_AND_THEMING.md](dmz/URL_AND_THEMING.md),
new [NETWORK_PRINCIPLES.md](dmz/NETWORK_PRINCIPLES.md) (all cross-linked).

- **Root homepage REVISED:** flagship-default -> **neutral network hub from day one**
  (cross-game pulse + routing, not a bare picker; revision trail preserved). SEO
  rationale: authority lives in deep `/intel` pages, not the bare root, so a neutral hub
  costs ~nothing.
- **DMZ visual direction LOCKED as direction** (not pixel-final): cyberpunk house style,
  amber primary (~`#e89a2c`, matches the game's own accent), cold grey-blue base (Hajin
  atmosphere ~`#0b0e11`/`#11151a`/`#2b3640`), irradiated red-orange hazard accent
  (~`#e0563a`), exclusion-zone/FOB motif + DMZ vocabulary (FIELD INTEL / OPS RATING /
  LOADOUT PLANNER); exact hex = build-time; theme **informed-by, not copied-from** CoD
  assets.
- **New `docs/dmz/NETWORK_PRINCIPLES.md`:** (1) **Monetization-readiness** — leave seams
  for subscription/feature-gating/ads/affiliate, build none; subscriptions = lead model;
  network identity + billing-readiness = foundation; build ON existing
  `subscription_tiers`/`feature_gates`/`cred_ledger`. (2) **DMZ-first then template** —
  breadcrumb hardcoded-vs-parameterized during the DMZ build, template game-onboarding
  after. (3) **Roadmap:** AI Q&A/advisor surface flagged (premium-tier candidate, not
  built, distinct from the content editors).
- **Identity generalization is now monetization-critical**, not just DMZ-auth-critical.
- **ARCHITECTURE LOCK FULLY COMPLETE** — remaining DMZ work is build-time hex tuning +
  the July refactor execution (now building toward monetization-readiness + templating,
  not just a Marathon -> DMZ port).

---

## 2026-06-15 — DMZ URL map + theming LOCKED; architecture lock COMPLETE

Decisions in [docs/dmz/URL_AND_THEMING.md](dmz/URL_AND_THEMING.md), cross-linked from
[TABLE_INVENTORY.md](dmz/TABLE_INVENTORY.md).

- **URL:** Marathon stays **UNPREFIXED** (existing URLs unchanged, no 301s — protects the
  thin ~28-clicks/qtr SEO authority); DMZ prefixed `/dmz/...`. Asymmetry accepted as a
  cheap, invisible wart, framed correct-for-now (revisit symmetric + 301 when the network
  grows and there's authority to absorb a redirect migration).
- **Per-game hubs:** `/dmz` is DMZ-only — a DMZ visitor never sees Marathon content (route
  groups enforce; Justin's core requirement).
- **Vanity:** `dmzpunks.com` -> 308 -> `/dmz`.
- **Theming:** per-game CSS design-token swap at the route-group level on the shared
  cyberpunk identity; DMZ gets a colder/militarized Hajin palette; Marathon tokens
  unchanged.
- **OPEN (flagged, non-blocking):** root-homepage content (game-picker vs
  flagship-default), and the exact DMZ visual spec (creative pass near build).

**The June-17 "lock architecture" deliverable is COMPLETE** — table architecture,
identity-rework requirement, URL structure, per-game hubs, and theming mechanism are all
decided. **July refactor = mechanical execution of locked decisions.**

---

## 2026-06-15 — MIRANDA wire-in + DMZ groundwork

### `redditSummaries` wired in (commit `24f599b`)

Closed the dead-code follow-up: MIRANDA now renders real Reddit community posts under a
correctly-labeled `COMMUNITY REDDIT POSTS` section (topic-signal caveat, const-pattern
thin-cycle fallback), distinct from the no-repeat block. MIRANDA prompt-quality thread
fully resolved: working no-repeat guard + live community input.

### DMZ refactor groundwork — table inventory + first architecture decisions DONE

Decision doc at [docs/dmz/TABLE_INVENTORY.md](dmz/TABLE_INVENTORY.md). The "lock
architectural decisions by June 17" deliverable, landed early. Read-only audit of all
**58** API-exposed tables (14 already carry `game_slug`). Categorized GAME-SCOPED (45,
incl. the 9 per-game player tables) / NETWORK-LEVEL (5) / DEFAULTED (8); UNCERTAIN
down to **0 blocking** (~5 real decisions, resolved below).

- **LOCKED — `feed_items` -> network-level + `game_slug`, single shared pipeline.** Fits
  the one-hub thesis; escape hatch if DMZ's content model can't share schema.
  `article_comments` / `meta_tiers` follow it. The `feed_items` `game_slug` migration
  (1756 rows + 5 consumers: cron, /intel, /rising, homepage, comments) = single biggest
  July line item.
- **LOCKED — `player_profiles` identity REQUIRES REWORK before DMZ.** Identity is
  `bungie_*`, but DMZ is Call of Duty (Battle.net/Steam/Xbox/Switch2/Activision auth -
  confirmed not Bungie). Auth/identity generalization = pre-DMZ-launch requirement, not
  optional.
- **LOCKED — `player_*` cluster -> PER-GAME build tables + network-level identity /
  Runner Shell spine** (two-tier). DMZ context confirmed its player/progression model is
  fundamentally different from Marathon's (CoD Gunsmith + insured weapons + stash +
  separate DMZ XP/Active-Duty progression vs Marathon's shell/mod/ranked shape). A shared
  `player_loadouts + game_slug` table would be half-null per row, so build data goes
  per-game; identity + Runner Shell progression stay network-level, with per-game data
  FK-linked to the one profile. **Principle established: SHARE what's structurally
  universal (articles), SPLIT what's structurally game-specific (build data).** DMZ shape
  reliable for architecture; field-level schema confirmed closer to the Oct 23 launch.
- **DEFAULTED — remaining uncertain** (`server_status`, infra/logs cluster) -> network +
  game tag unless a reason to fork.
- **Dead / retire candidates:** `faction_stat_bonuses`, `faction_unlocks`, `map_zones`
  (confirm-then-retire, separate cleanup).
- **STILL OPEN (only remaining architecture decisions):** URL map, theming approach.
  Migration SQL = July.

---

## 2026-06-15 (Mon AM, cont'd) — render + prompt fixes (entity injection, NEXUS doom-loop, MIRANDA no-repeat)

### Entity-injection false positives fixed (commit `3d0594e`)

The InlineStatCard matcher used case-insensitive **substring** matching with **no
word boundaries** (`app/intel/[slug]/page.js`, in BOTH the candidate filter and the
inline injection). "Second Wind" matched inside "second **window**" -> mangled cards
mid-sentence. **Whole-name boundary fix** (adjacent chars must be non-alphanumeric;
string edges count; internal punctuation like `KKV-9SD` handled) in both layers via a
shared helper. Kills the entire substring-glue class (every `* Mag` in "magazine",
`Impact HAR` in "impact harm", `Blue Blood` in "blue blooded", plurals, etc.), not
just the reported case. **12/12** before/after tests pass. Render-path fix -> applies
to **ALL existing + future articles on next render, no backfill**.
**WATCH:** single-common-word names (`Knife`, `Rook`, `Recon`) still card on whole-word
matches by design - `Knife` flagged in a code comment; if "knife" proves spammy, the
follow-up is a single-common-word policy (multi-token / exact-case requirement).

### NEXUS doom-loop + MIRANDA no-repeat fixed (commit `dfe2c4e`)

Diagnosis found editor repetition was mostly **SOURCE-DRIVEN** (NEXUS+DEXTER share a
YouTube pool; on thin cycles they co-cover the same video - 4 articles traced to one
video id), **NOT a topic groove** - entity spread across 20 articles is actually broad.
So **NO generic "be diverse" instruction** (would fight correct behavior). Two genuine
defects fixed instead:
1. **NEXUS doom extrapolation** - turned thin source cycles into "community
   collapse / meta crisis / drought" theses (5 of 8 articles). Added a NEXUS-only
   "THIN INPUT IS NOT A CRISIS" guard right after the thin-source-honesty line (both
   coexist) + softened `youtube.js:295` so video volume isn't read as community health.
2. **MIRANDA mis-wired** - its own past headlines were fed under a "REDDIT COMMUNITY
   TIPS" header (i.e. as topics TO cover) with no dedup -> caused 4x near-identical
   "Weapon Mods Guide". Replaced with a proper "DO NOT REPEAT THESE ANGLES" block,
   window 12.
Both prompt-side -> next cron cycle onward, no backfill. **WATCH next cycles:** NEXUS
calm on thin weeks (no crisis framing), MIRANDA diversifies.

### NEW follow-up flagged: `redditSummaries` dead-code

`buildMirandaPrompt` computes real Reddit community posts (`editorCore.js:942`) but
**never renders them** - they were what the old mislabeled header should have shown. So
MIRANDA currently gets **NO real Reddit input**. Small separable task: wire
`redditSummaries` into the prompt (recommended - MIRANDA is the field-guide editor,
community tips are useful to it) OR delete the dead variable.

### Topic/source-dedup -> July source-assignment refactor

One-video-to-one-persona assignment + topic-level dedup. Can't do topic-dedup
standalone - it would starve an editor on thin cycles, so it must ship with the
source-dedup work.

---

## 2026-06-15 (Mon AM) — [UNVERIFIED] system completed, verification debt quantified, KKV-9SD filled

### [UNVERIFIED] system completed (commit `d15a06a`)

The stat-hedging diagnostic found Fix-2 was live and tagging correctly, but editors
cited precise numbers from tagged rows anyway — AND the tag was **over-applied**
(`usePatch=true` tagged `verified=false` OR `patch_verified=null` → **92% of mods
tagged** → desensitized). Fixed both, **in order**:
1. **Recalibrated** `unverifiedTag` to tag on `verified=false` OR an explicit pre-S2
   stamp only — dropped the `pv=null` condition, removed the `usePatch` param, uniform
   across all 5 call sites.
2. **Hardened** the preamble to "MUST NOT state precise numbers for [UNVERIFIED] items"
   + a reinforcing line in CIPHER/NEXUS/DEXTER/MIRANDA (GHOST excluded — doesn't cite
   stats). HEADLINE RULES + thin-source blocks untouched.

Tag rate verified live: **weapons 16/32 unchanged; mods 92% -> 51% (104/202)**. The 81
dropped were `verified=true & pv=null` hand-verified mods (Thermal Surge Battery, Sonar
Shot, Hi-Cap Mag Superior, Steady Barrel Deluxe).

Diagnostic detail: **4 UNVERIFIED-CITED** (M77, Bully SMG, Thermal Surge Battery, Sonar
Shot), **3 VERIFIED-MATCH** (CE Tactical Sidearm, V66 Lookout, Impact HAR), **0
fabrication** (every cited number matched the DB — editors quoted unverified rows, did
not invent).

**WATCH the next cron cycle:** editors should now hedge on tagged rows and cite
confidently on verified ones. Weekend articles citing unverified numbers are left as-is
(accurate quotes; they age out naturally — fix the rows, not the articles).

### Verification debt quantified

**16 weapons + 104 mods are genuinely `verified=false`** — the concrete reconciliation
backlog target. The 16 unverified weapons (incl. **M77, Bully SMG**, tauceti.gg-sourced)
are highest-value since weapons anchor build articles.

### KKV-9SD row filled (verified write)

Was a stub (only `fire_rate`). Wrote **17 columns** from in-game-verified S2 values;
backup at `C:/Users/justi/weapon_stats_backup_kkv_20260615.json`. Conventions mirrored
from Bully/BRRT: `range_meters` (not `effective_range_m`), `reload_speed` as a string,
`recoil` as a scalar. Flagged `verified=true`, `verified_source='in-game, S2'`,
`patch_verified='1.1.0'`. `range_rating` left null (no confirmed bucket). Also fixed a
pre-existing flag inconsistency (the row was `verified=true` while empty). Revert:
restore from the JSON snapshot or null the fields.

### July schema — `ads_spread` gap

`ads_spread` (KKV had 0.67) is the **2nd** confirmed weapon attribute with no column
(alongside the Bucket B curve fields). Bundle into the schema pass.

---

## 2026-06-13 — Catch-up recap PUBLISHED; S2 patch coverage complete

Consolidated **NEXUS** article covering **Update 1.1.0 + 1.1.0.1**, written from the
**real patch notes** (not DB stats, not summaries), framed as a deliberate two-week
catch-up.
- **id** `781db503-8771-4a3f-b734-72a6e8c184a0`
- **slug** `marathon-update-110-recap-the-s2-changes-you-missed-u8mo`
- **Revert:** `DELETE FROM feed_items WHERE id='781db503-8771-4a3f-b734-72a6e8c184a0'`

Content guardrails honored: numbers cited **only** from the patch notes; mag/optic
changes kept **theme-level** (DB unreconciled); 1.1.0.1 Prestige drop-rate cuts kept
**qualitative** (Bungie published no figures). **Discord + comments OFF** (no backfill
for stale patches — a bare `feed_items` insert fires neither). Source set to `NEXUS`
(no video), thumbnail = NEXUS portrait, ce_score 0.

**Taxonomy updated** (commit `21fcc64`): added `sentinel` shell sub-tag (doc predated
the 8th shell) + `implants` topic-context tag — so all 6 article tags are now valid.

**Catch-up coverage is now COMPLETE.** Confirmed **no third patch exists** (no 1.1.0.2
as of June 13). The earlier "still need Progression Update notes" item is closed — the
Progression Update was folded into the 1.1.0 recap at theme level (economy/progression
section); no separate article needed.

**Near-term:** Ranked returns **June 14** with eased progression — a real content
moment, and patch detection is now fixed (version-pattern + 48h) to catch the
reopening patch automatically.

---

## 2026-06-13 — Reconciliation Batch 2a (chip text) DONE; mags/optics blocked on numbers

### Batch 2a — chip text reconciliation DONE

Fixed effect text on **8 `mod_stats` rows** (6 text writes + 2 flag-only). Backup:
`C:/Users/justi/mod_stats_backup_b2a_20260613.json` (202 rows, count-verified before
write). Rows:
- **Patch redesigns:** Cloudborn Enhanced + Standard, Rorschach Test Superior.
- **Pre-existing corruptions fixed:** Background Process Enhanced (was "N/A"), Eyes on
  Fire Enhanced (held wrong chip's text), Chaos Theory Enhanced ("item" -> "ammo").
- **Confirmed-correct, flagged only (text untouched):** Background Process Standard,
  Eyes on Fire Standard.

All 8 set `verified=true`, `verified_source='in-game (Justin), S2'`,
`patch_verified='1.1.0'`. **CAVEAT:** `patch_verified` here = **TEXT-reconciled only**;
numeric magnitudes (reload / equip-speed / duration / credits) still await July
structured chip-stat fields.

### Key structural finding

Chip rows store **PROSE ONLY** (`effect_summary` + `effect_desc`) — no numeric fields.
The original 2a value-update plan was impossible; numeric chip values join **Bucket B**
as a July schema item. Both prose fields render (`effect_desc` -> builds / articles /
most editors; `effect_summary` -> MIRANDA context + advisor fallback), so writes use
**full-text in `effect_desc` + faithful condensation in `effect_summary`**.

### Still open in Batch 2

Mags (~29 existing rows) and optics (~18) — **names resolved** but **VALUES blocked**
pending the detailed per-rarity numeric tables from the patch (Justin to paste next
session). The 8 renames to apply at write time: Maga Drive/Mega Drive, Drum Mag/Drum
Magazine, Slick Mag/Slick Mag 1, Tapered Heat Sink/Tapered Heatsink, Neuro-Optic
Lens/Neuro Optic Lens, Optic 1.4x/Optic 1.4XI, MidSight/Midsight (+ SP Scope handled).
**Optic ambiguities resolved:** "Long Scope" is the real name (no "Long Eye Scope");
"Rangefinder Optic 1.3x" is a **distinct** item from "Rangefinder Optic" (-> insert).

### Bucket C insert task (separate; needs full row data)

Mini Jammer x3 rarities, Bounty Hunter Superior, Chaos Theory Deluxe+Superior,
Insurance Plan Enhanced+Superior, 12 NOT-FOUND mags, 4 NOT-FOUND optics + Rangefinder
Optic 1.3x.

### July schema items (growing list)

Structured chip-stat fields (duration / magnitude / credits-per-kill); Bucket B curve
data; equipment table (Frost Mine / Vector Grenade / Signal Flares); status/removed
flag for rotations (Stack Overflow, Optimal Prime).

### Data-quality note

The chip corruptions fixed in 2a were **pre-existing, unrelated to 1.1.0** — worth a
broader effect-text audit against the game client at some point (same pile as the
spelling anomalies: Botique, Pinata, Maga Drive, etc.).

---

## 2026-06-13 — Patch detection fix, Discord diagnosis, stat-reconciliation scoping, reconciliation Batch 1

### 1. Shipped (commits)

| Change | Commit | Summary |
|---|---|---|
| Duplicate-thumbnail dedup | `e01be4a` | Post-settle dedup of identical article thumbnails; first editor (declared order) keeps the image, later duplicates fall back to persona portrait. |
| Patch-detection fix | `e7575c9` | Version-pattern detection (`/update\s+\d+(\.\d+)+/i`) + keywords, 48h freshness, fail-closed dedup. |

### 2. Patch detection — root cause & fix

The June 5 keyword tightening removed the bare `'update'` keyword, but Bungie
titles patches **"Marathon Update X.X.X"** — so versioned patch posts matched NO
keyword and detection **silently failed for 8 days** (no PATCH alerts, no article
coverage, no patch-triggered NEXUS regrade). Fixed **forward** via version-pattern
detection + 48h freshness + fail-closed dedup (`e7575c9`). Already-missed June
patches are NOT auto-covered (forward-only) — see catch-up task below.

**Latent issues logged for refactor (not fixed):**
- The `'patch'` keyword can still match editorial article *bodies* (e.g. a PCGamesN
  piece), a minor false-positive surface; bounded by freshness + dedup.
- `patch_key` is **title-based, not build-id-based** (the unique `Build NNNNNNN`
  exists in notes but isn't a structured feed field) — weaker key than ideal.

### 3. Discord webhooks — diagnosed, NOT a bug

Delivery works (RANKED + INTEL fired at 5 AM). META is **quiet by design** (no tier
movers since June 10 → `notifyMetaUpdate` intentionally silent). PATCH was silent
**because detection was broken** (now fixed). **No webhook action needed.**

### 4. Stat reconciliation vs Update 1.1.0 — scoped (read-only)

Schema map done: `weapon_stats` 47 cols; mags/optics/chips all live in `mod_stats`
keyed by `slot_type` (no separate tables). Buckets:
- **A** (~165 (name,rarity) updates) — dominated by ~90 mags + ~50 optics.
- **B** (~30) — curve/scaling changes with no schema home (recoil H/V, falloff
  distances, per-stat scaling, charge times, grenade/combatant tuning) → July.
- **C** (~19 inserts) — 7 new implants + ~12 mags + ~6 optics; implant inserts
  **blocked** (detailed per-implant stat packages not in the provided notes).

Weapons + Sentinel were **already reconciled** (`verified=true`, `patch_verified=1.1.0`)
→ 0 writes needed. **Zero stale-trusted rows.** **8 name-match conflicts** to resolve
before mag/optic writes: Maga Drive/Mega Drive, Drum Mag/Drum Magazine, Slick
Mag/Slick Mag 1, Tapered Heat Sink/Tapered Heatsink, Neuro-Optic Lens/Neuro Optic
Lens, Optic 1.4x/Optic 1.4XI, SP Scope, MidSight/Midsight. Estimate: **4–6 gated
write-sessions, batched by table**.

### 5. Reconciliation Batch 1 — DONE

Deleted core **"Close and Personal"** (migrated to the Cradle in S2). Backup:
`C:/Users/justi/core_stats_backup_b1_20260613.json` (full 86-row snapshot, verified
before delete; count 86 → 85). Pattern proven: read-before-write → backup-first →
delete-by-id → re-verify.

**S2 removal tally corrected:** 1 true deletion (done); **2 deferred chip rotations**
(Stack Overflow, Optimal Prime → July status-flag work, NOT deleted); **1 phantom**
(sniper thermal optic — never existed in DB; `SP Scope II` is a valid zoom optic, not
the removed one, left untouched). **V75 reload deferred** (% delta, no absolute; row
already verified 1.1.0).

### 6. Still open / parked

- **Catch-up coverage of missed patches:** have 1.1.0 + 1.1.0.1 notes; still need the
  Progression Update notes + coverage-shape + write-mechanism decisions. Must write
  from real notes only — no inference.
- **"One story" companion-coverage feature** → July refactor (build it game-aware).
- **July schema items:** a status/removed flag for all rotations; Bucket B curve
  columns; an equipment table (Frost Mine / Vector Grenade / Signal Flares).
- **Mag/optic name-anomaly cleanup** (the 8 conflicts above, plus the older
  `"Balanced Shield "`/Botique/Pinata/Hypocritic Oath set).
- **Reconciliation batches 2–5** (chips, mags, optics; implants blocked on detail).

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
