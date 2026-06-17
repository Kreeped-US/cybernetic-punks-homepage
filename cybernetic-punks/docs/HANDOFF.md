# Handoff / Session Notes

Running log of cross-session decisions, shipped changes, and parked work.
Newest entries on top.

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
