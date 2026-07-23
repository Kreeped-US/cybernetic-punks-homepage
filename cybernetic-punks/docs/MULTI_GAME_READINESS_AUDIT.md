# Multi-Game Readiness Audit

**Date:** 2026-07-23 · **Method:** read-only. No code, no DDL, no commits.
**Scope:** design for **N games**, not two. Marathon live; DMZ targeting 2026-10-23; more after.
**Verification:** every hypothesis from the brief was checked at file:line or with DMZ-shaped data.
"Does not exist" is recorded as a finding. Executable tests (`loadVocabulary('dmz')`,
`entitySlugFor` on DMZ names, `deriveTuple` on DMZ headlines, the PostgREST OpenAPI schema dump)
were run against the live DB, read-only.

---

# 0. THE §E URL-STRUCTURE ANSWER — called out first (blocks the GSC schema)

**Question: can a URL alone determine its game?** **Answer: YES for two games, by a trivial
prefix rule — and that is exactly why it is a trap for three.**

- **DMZ is fully partitioned under `/dmz/*`** (`app/dmz/**`, all real routes — sections, items,
  keys, missions, discourse). Any `/dmz/...` path → `dmz`.
- **Marathon owns the UNPREFIXED root** by convention — `/shells`, `/weapons`, `/intel/…`,
  `/matchups`, `/leaderboard`, `/stats`. There is **no `/marathon/shells`**; the game is implicit.
  `lib/games/registry.js:9-17` states this outright: *"Marathon is intentionally NOT in the
  registry… runs on its own unprefixed routes. DMZ is the first instance."*

**So the GSC write-time rule is:** `url.startsWith('/dmz/') ? 'dmz' : 'marathon'`. **Trivial,
correct today, and safe to build the GSC schema on now** — provided the schema stores a computed
`game_slug` column (do NOT leave GSC page-metrics game-unattributed; tool/entity pages like
`/leaderboard` and `/stats` never join `feed_items`, so a `feed_items` join cannot supply their
game — the prefix rule must).

**The catch, for the decisions list (§6):** the rule's "else → marathon" clause **hardcodes the
root-namespace asymmetry**. At game three either (a) the new game is namespaced (`/cod/…`) while
Marathon keeps privileged root paths — then "else → marathon" still holds but Marathon is
permanently unmigratable without a redirect event on its most-indexed URLs; or (b) Marathon
migrates to `/marathon/*` — a redirect event now, cheap, on a smaller corpus. **Decide before
game three. The GSC schema is not blocked by this — the prefix rule works today — but the
decision is cheaper now.**

---

# 1. SEAM INVENTORY (classified)

Degradation legend: **ERR** = errors loud/safe · **SW** = SILENTLY WRONG (the hazard) ·
**NOP** = graceful no-op/safe. Track: **PLB** pre-launch build-out · **LWE** launch-week
editorial · **OPS** operations.

## §B — Schema / data-layer game attribution

| location | what breaks with a non-Marathon game | mode | due | generic? |
|---|---|---|---|---|
| **`maps`, `map_attribution`, `map_zones`, `map_markers`, `map_vaults`, `map_reference` — NO game column; keyed by `map_slug` only** | A DMZ map sharing a slug with a Marathon map **collides outright**. `/maps/[slug]/page.js:83-86,181` queries `maps`/`map_attribution`/`map_reference`/`map_vaults` by `slug`/`map_slug` **with no game filter** — a colliding DMZ map returns Marathon's zones/vaults/reference and vice-versa. (The *entity* layer — `game_maps`/`game_zones`/`game_bosses` — IS filtered `.eq('game_slug','marathon')` at `page.js:101,117`; the **detail** layer is not.) | **SW** | BY END OF AUG | add `game_slug` to all six + filter — closes for N at once |
| **`DEFAULT 'marathon'` on SIXTEEN tables — `game_slug` present but defaulted** *(CORRECTED 2026-07-23 — the direct `information_schema` read broadened this well beyond the "stat tables + site_events" the code comments suggested; see the full list + two hazard shapes immediately below)* | A row inserted without an explicit `game_slug` **silently becomes Marathon**. | **SW** | BY END OF AUG | see two shapes below |
| ↳ **TEN are `NOT NULL + DEFAULT 'marathon'`** — `cradle_nodes`, `faction_armory`, `faction_upgrades`, `game_bosses`, `game_events`, `game_maps`, `game_modes`, `game_zones`, `meta_tiers`, `unique_weapons` | Dropping the default makes an omitted `game_slug` **ERROR** — a clean one-step silent→loud conversion. | **SW** → ERR | BY END OF AUG | `DROP DEFAULT` (one step) |
| ↳ **SIX are `NULLABLE + DEFAULT 'marathon'`** — `core_stats`, `implant_stats`, `mod_stats`, `shell_stats`, `weapon_stats`, `site_events` | Dropping the default **alone** yields `NULL`, still silently wrong. Needs the three-step: **backfill → `SET NOT NULL` → `DROP DEFAULT`**. | **SW** | BY END OF AUG | 3-step (backfill first) |
| Corroborating code comments (subset of the above): `route.js:534-537`, `admin/page.js:282`, `api/admin/stats/route.js:4`, `get_related_articles` fn (`intel/[slug]/page.js:1410`) | These pointed at the hazard but under-counted it — 4 signposts, 16 actual tables. | — | — | — |
| **`x_sources.game_slug` is NULLABLE with NO default** *(MISSED by the first pass)* | X sources can carry **no game attribution at all** — compounds the VANTAGE positional-attribution finding (§I): the seed table has no game, and the pipeline assigns one by loop position. | **SW** | BY OCT 23 | add `NOT NULL` + attribution rule |
| **`email_signups.game_slug` DEFAULTS to `'dmz'`** *(MISSED; the mirror hazard)* | A **Marathon** signup path that omits `game_slug` is silently tagged **`dmz`** — the same default hazard pointed the other way. | **SW** | POST-LAUNCH OK | resolve default direction |
| **`editor_directives` — NO `game_slug`** | A directive is not game-partitioned; it applies to whichever game the cron runs. (Admin's `creator_game` free-text is the *creator's* context, not the directive's target.) | **SW** | BY OCT 23 | add `game_slug` |
| **`factions`, `faction_stat_bonuses`, `faction_unlocks`, `faction_materials` — NO game column** | Marathon-only faction data unattributed. (Newer `faction_armory`, `faction_upgrades` DO carry `game_slug NOT NULL`.) Ties to §C (factions absent from ENTITY_TYPES). | **SW** | POST-LAUNCH OK (Marathon-only concept today) | add `game_slug` if DMZ ever gets factions |
| **`article_comments` — NO game column** | Game derivable via the `feed_items` join, but not stored; any direct comment query is game-blind. | **NOP→SW** | POST-LAUNCH OK | add `game_slug` for direct scoping |
| **Player tables `player_stats`, `player_shell_stats`, `player_weapon_stats`, `player_profiles`, `player_audits`, … — NO game column** | Player stats are Marathon-shaped and unattributed; cross-game player data would merge. | **SW** | POST-LAUNCH OK (no DMZ player data yet) | design player schema for N before DMZ player features |
| `shell_stat_values`, `ammo_stats` — NO game column | Join to Marathon-only parents; low risk. | NOP | POST-LAUNCH OK | — |
| **NO `games` registry TABLE** (confirmed: not among the 80 exposed tables) | Per-game status/launch_date/config has no DB home; see §F. | SW | BY END OF AUG | one table serves N |
| **Positive:** `feed_items`, `keyword_targets`, `keyword_match_log`, `coverage_registry`, `game_maps`, `game_modes`, `game_events`, `game_zones`, `game_bosses`, `cradle_nodes`, `unique_weapons`, `meta_tiers`, `quality_metrics`, `historical_context`, `dmz_*` — **`game_slug NOT NULL, no default`** | Correct game attribution; a forgotten insert ERRORS (safe). | ✓ | — | already N-ready |

## §C — Vocabulary / classification portability

| location | finding | mode | due | generic? |
|---|---|---|---|---|
| **`loadVocabulary('dmz')` → returns ALL EMPTY** (shell 0, weapon 0, map 0, mode 0, event 0, mod_slot 0) — tested live | The function **is** game-parameterized (queries `weapon_stats`/`game_maps`/`game_modes`/`game_events` `WHERE game_slug=gameSlug`; `coverage.js:181`); it returns empty for DMZ only because **no DMZ entity rows are seeded**, and the `isMarathon` seam (`coverage.js:174,185`) zeroes shell/mod_slot for non-Marathon. Consequence: **every DMZ headline classifies `unclassified`** (confirmed — `deriveTuple` on 3 DMZ headlines all returned "no vocabulary entity matched"), so the keyword matcher and coverage registry are **inert for DMZ** until DMZ entity rows exist. | **NOP** (matcher fail-open) but feature-dead for DMZ | BY END OF AUG | seed DMZ `game_maps`/`weapon_stats` rows → populates for N |
| **`ENTITY_TYPES = [shell, weapon, mod_slot, map, mode, event]`** — confirmed | Too small for **two** designs: (i) **DMZ's prize entities** — keys, POIs, missions, factions — have **no home** (a DMZ key is not any of the six); (ii) **Marathon's OWN designed taxonomy** — `factions`, `uniques`, `cradle` — is **also absent**, yet those tables exist and carry `game_slug` (`unique_weapons`, `cradle_nodes`, `factions`). The enum is already behind Marathon's live design, independent of DMZ. | **SW** for coverage (real entities uncounted) | (Marathon half) NOW-ish; (DMZ half) BY END OF AUG | extend the enum once, for both |
| **`entitySlugFor` — PORTABLE (reconfirmed)** | DMZ names slugify cleanly: `M4A1→m4a1`, `RPK Light Machine Gun→rpk-light-machine-gun`, `Al Mazrah→al-mazrah`, `Barrel→barrel`. | ✓ | — | already N-ready |
| Apostrophe transform: `Vandal's Edge → vandal-s-edge` | The deferred strip-vs-hyphenate item. Zero current Marathon weapons affected; **a DMZ weapon with an apostrophe would get the awkward `-s-` slug.** | NOP (cosmetic) | POST-LAUNCH OK | decide the transform once |
| **`FACETS = [counter, build, tier, guide, news, community, economy, lore]` — game-agnostic** | No Marathon lore in facet names; portable. | ✓ | — | already N-ready |
| `deriveTuple` / `detectFacet` — classify by the passed vocab, no Marathon hardcode in logic | Portable; depend only on vocab being populated. | ✓ | — | already N-ready |

## §A / §D / §D2 — Hardcoded refs, prompts, editorial, intake

| location | what breaks | mode | due | generic? |
|---|---|---|---|---|
| **`HEADLINE_RULES` hardcodes "Marathon"** (`lib/headlineRules.js:25-38`) — CONFIRMED | Every long-form editor AND the keyword-rewrite pass tells DMZ headlines to lead with "Marathon." The file header already flags this as "a separate, later change." | **SW** | BY OCT 23 | parameterize game name via config → N |
| **`EDITOR_PROMPTS` (all 5 personas) hardcode "Marathon"** (`editorCore.js:324-563`) | DMZ articles written as Marathon coverage ("the autonomous Marathon intelligence hub"). `fetchGameContext(config)` IS parameterized for the DB data block, but the persona prose is not. | **SW** | BY OCT 23 | parameterize persona prose |
| **Intake sources: `gatherAll(getGameConfig('dmz'))` ERRORS today** | DMZ's `sources` block is `{ x: {...} }` only (`dmz.js:41-49`) — no `reddit`/`youtube`/`twitch`/`steamAppId`/`patchNotes`/`miranda`. `gatherReddit`/`YouTube`/`Twitch` throw on the missing destructure (`reddit.js:91`, `youtube.js:25`, `twitch.js:93`). The Bungie-news slot itself degrades to `[]` (`patchnotes/index.js:20-34`). The source *machinery* is fully game-parameterized (all Marathon literals live in `marathon.js:27-145`) — only DMZ's data is unpopulated. | **ERR** (safe, loud) | BY OCT 23 | populate `dmz.sources` + a new `'cod-blog'` patch adapter |
| **Bungie news is structurally Marathon-specific** (`marathon.js:111-144`, appId `3065800`) | Useless for a CoD game; replaced under the same `patchNotes` shape by a CoD adapter. Engine is game-agnostic. | ERR→NOP | BY OCT 23 | new adapter, engine unchanged |
| **~20 hardcoded `.eq('game_slug','marathon')` page queries** (cradle, builds, guides, weapons/[slug], factions, advisor, …) | Return empty for another game — but these are all on Marathon's root routes, so today they're correct-by-namespace. | **NOP** | POST-LAUNCH OK (per route, as DMZ analogues are built) | — |
| Default-to-marathon fallbacks: `useTrack.js:15`, `track/route.js:73` (`|| 'marathon'`) | A missing slug silently coerces to Marathon in analytics tracking. | **SW** | POST-LAUNCH OK | central default only where safe |
| `coverage.js:430` — `if (tuple.game_slug !== 'marathon') return null` | Canonical-coverage routing returns null for non-Marathon (explicit). | NOP | BY END OF AUG (extend for DMZ canonicals) | generalize the route map |
| `ARTICLE_MODEL` (`models.js:20`) — not game-gated | No per-game model gating; fine. | ✓ | — | — |
| **Broker / Vera Sloan editor — dormant, display-only** (`lib/editors/roster.js:88-98`, status `'incoming'`) | No `EDITOR_PROMPTS`/`EDITOR_TOOLS`/`COMMENT_VOICES` entry — NOT wired to generation. Surfaced in reader copy (`app/editors/page.js`, `Footer.js`, `about`). If a `BROKER` article ever published pre-wiring it renders **AS CIPHER** (the `EDITORS[…] || CIPHER` fallback). | NOP today | BY OCT 23 (if DMZ editorial wants Broker) | — |
| ✅ **DELIBERATE hardcoded reference — NOT drift:** `lib/gather/wiki.js:158` stamps `game_slug: 'marathon'` (literal) on weapon_stats/shell_stats records | Added in **`7e7be2e`** (game_slug default-removal Phase 1). Literal on purpose: `WIKI_URLS` is hardcoded to the Marathon fandom, so everything this module scrapes IS Marathon by construction; `config.slug` would be correct only by coincidence and would mislabel a non-Marathon gather. Reason named in-code at the point of temptation. **Becomes `config.slug` (+ a per-game skip) only when `WIKI_URLS` goes per-game.** Recorded here so a future audit does not re-flag it as a hardcoded-Marathon seam. | (intended) | — | tied to per-game `WIKI_URLS` |

## §D2 / §I — VANTAGE (the cross-game editor)

| location | finding | mode | due | generic? |
|---|---|---|---|---|
| **X-item subject-game attribution is POSITIONAL, not content-derived** | `x-stage2-dry.mjs:306-310` / `x-dry-run.mjs:173-174` tag `c.game_slug = slugs[g]` — "whichever game's loop we're in." The only content guard is that game's relevance pre-filter, and **Marathon & DMZ share tokens** (`exfil`, `extraction shooter`, `loadout`, `meta`, `shooter` — `marathon.js:157/172` vs `dmz.js:82-92`). A generically-worded extraction take can clear **both** gates and be emitted under both/whichever iterates first. **The sharpest silent-misattribution point in the network.** | **SW** | BY OCT 23 (before X goes to production) | derive game from content, not loop position |
| VANTAGE X pipeline is **dry-run only** (`x-dry-run.mjs`, `x-stage2-dry.mjs` — neither persists) | "VANTAGE on a rebuilt X pipeline" is pre-production; nothing writes discourse rows from X yet. | NOP today | — | — |
| VANTAGE games list: **homepage brief from `ROOT_GAMES` config** (scales) vs **X/auto scripts use LITERAL `['marathon','dmz']` / `'marathon'`** | Game three: homepage picks it up automatically; X/auto paths **silently skip it** until the literal is edited. | **NOP** | POST-LAUNCH OK | move the X games list to the registry |
| `discourseHref` = **LITERAL `if (game_slug === 'dmz'/'marathon')` branch** (`discourse.js:22-27`) | Game three → `null` → row dropped, unreachable URL (fail-safe). `discourseHome()` **defaults unknown → Marathon `/intel`** (SW for game three). | NOP / **SW** | POST-LAUNCH OK | table-driven route map for N |
| "No single-game facts" — **PROMPT-enforced on assertion; structural only on input** | No code inspects VANTAGE output for stat/tier claims; the boundary is prompt text (`vantage.js:22-43,145-155`). Structural guards are input-side: VANTAGE is never fed stat tables and is import-isolated (`network-editor/route.js:9-12`, `vantage.js:5-17`). | (by design) | — | — |
| **Positive: VANTAGE self-skip** — first-class `skip` boolean, honored at all 4 call sites | `vantage.js:82-83,188`; consumers write nothing on skip (`network-editor/route.js:109-118`, `gen-vantage-discourse.mjs:165-169`, `-auto.mjs:193-197`, `x-stage2-dry.mjs:357-362`). Plus a deterministic pre-VANTAGE gate (`x-gate.js`). **The network's only self-exclusion precedent.** | ✓ | — | reusable pattern |
| Auto-YouTube discourse hardcoded `GAME_SLUG = 'marathon'` (`gen-vantage-discourse-auto.mjs:43`) | Non-Marathon never produced on this path. | NOP | POST-LAUNCH OK | parameterize |
| Manual discourse **refuses to guess** game (`gen-vantage-discourse.mjs:177-182`, `exit(1)`) | Positive — no silent misattribution on the vetted path. | ✓ | — | — |

## §E / §E2 / §K — Routing, sitemap, SEO/structured data

| location | finding | mode | due | generic? |
|---|---|---|---|---|
| **Two-tier routing** — Marathon root (unprefixed), DMZ `/dmz/*` | See §0. All `/dmz/*` routes are real. Marathon deliberately not in the registry. | (design) | — | decision (§6) |
| **Marathon root routes with NO DMZ analogue** | `/matchups`, `/factions`, `/meta`, `/advisor`, `/cradle`, `/builds`, `/ranked`, `/sitrep`, `/shells`, `/weapons`, `/uniques`, `/mods`, `/maps`, `/guides` — each needs a DMZ equivalent or a template migration. DMZ covers article + `items/keys/missions` verticals only. | NOP | BY END OF AUG (Phase 1 canonicals age) | template-migrate root entity routes for N |
| **Sitemap: ONE flat file, game-aware** (`app/sitemap.js`) | Filters `game_slug`; DMZ block is separate and gated on `dmz.indexable` (`:504,624`). **No sitemap-index, no per-game file, no generic per-game loop** — a third game is silently absent until a bespoke block is added. Per-game indexing is therefore **not observable** from the sitemap (matters for GSC Consumer-C launch tracking). | **NOP** | BY OCT 23 | sitemap-index + per-game files = observable, for N |
| **SEO hardcodes "Marathon" in ~18 JSON-LD blocks + ~18 metadata exports + 20 OG-image routes** | `marathon/page.js:227`, `meta`, `shells`, `weapons`, `uniques`, `mods`, `maps/[slug]`, `advisor`, `cradle`, `builds`, `factions`, `intel`, `intel/[slug]` (`keywords:'Marathon, gaming'` `:1085`), `modes/vault-breaker`, etc.; OG via `marathonSectionCard` on 20 routes. **Network root `app/page.js:216-231` (Organization/WebSite) is correctly game-neutral.** DMZ has a **hand-authored parallel** set that says "DMZ". | **SW** *(only if a game shared these routes; today safe by namespace)* — real risk is **per-game authoring cost + drift** | LWE / POST-LAUNCH | build ONE game-parameterized SEO layer instead of N hand-authored sets |
| Leak: DMZ article author URL → `/intel/<editor>` (`dmz/[section]/[slug]/page.js:243`) | A Marathon path inside DMZ structured data. | SW (minor) | POST-LAUNCH OK | — |
| **Positive: `get_related_articles` is game-scoped** (`p_game_slug`, `intel/[slug]/page.js:1412`) | Related-article internal linking **cannot cross games** — no accidental cross-game link dilution. | ✓ | — | already N-ready |

## §F / §G / §H — Registry, admin, cron/ops

| location | finding | mode | due | generic? |
|---|---|---|---|---|
| **TWO registries, divergent contracts, same function name** | `lib/games/index.js` (`GAMES={marathon,dmz}`, `getGameConfig` **throws** on miss) vs `lib/games/registry.js` (`GAME_REGISTRY={dmz}` only, `getGameConfig` returns **null** on miss). A caller importing the wrong one gets the opposite failure mode and a different game set. | **SW** | BY END OF AUG | unify to one registry for N |
| **No `status` enum, no machine `launch_date`** | Doctrine needs pre-launch/live/maintenance + a kill-clock. DMZ approximates status with `indexable`+`launched` booleans (`dmz.js:33-34`); Marathon has neither (so `if(config.launched)` reads falsy for the LIVE game — SW). Launch date exists **only in a comment** (`dmz.js:31`). | **SW** | BY END OF AUG | one registry row: `status`, `launch_date` for N |
| Field-name drift: `displayName` (marathon) vs `label` (dmz) | Code reading `config.displayName` on DMZ gets `undefined`. | ERR/SW | BY END OF AUG | uniform schema |
| **No `maxDuration` anywhere; no `functions` config in `vercel.json`** | Cron runs at the Vercel plan default. **Actual runtime figures live in Vercel logs — UNREADABLE from here (OPERATOR-SUPPLIED).** Code exposes: single-game, editors run in **parallel** (`Promise.allSettled`, `route.js:1148-1150`), ≤5 `callEditor` at full Marathon roster (**1 today** = NEXUS). | (unreadable) | OPS | set an explicit `maxDuration` before two-game runs |
| **Cron single-game, Marathon-hardwired** (`route.js:22`, `getGameConfig()` no-arg) | DMZ cannot be produced by the cron today (by design — off-cron until launch). Both configs carry `cadenceCron: '0 19'` — a **future collision** if DMZ ever shares the slot. DMZ needs its own cron entry + a game-param route (deferred "Phase D"). | NOP today | BY OCT 23 | game-param route + per-game schedule |
| **KD cap does NOT exist in code** | `findKeywordTarget` selects `volume` but **not `difficulty`** (`keywordFraming.js:91-101`); KD is human decision-support only (`KEYWORD_FRAMING_DESIGN.md:504`). **It cannot fork per-game because there is nothing to fork.** Confirms doctrine. | ✓ | — | — |
| **`keyword_targets.game_slug` locked to `['marathon']`** (`admin/page.js:138`) | DMZ keyword rows un-creatable in the UI. Intentional today (no DMZ keywords at launch). | ERR/NOP | BY OCT 23 | make the select registry-driven |
| **No game switcher/filter in admin; all tabs visible to all** (`admin/page.js:353-375`) | A DMZ operator sees ~18 Marathon tabs; a Marathon operator sees 3 DMZ tabs. Single shared password, no per-game scoping. No data corruption (tables are separate) but operationally Marathon-shaped. | SW/confusing | POST-LAUNCH OK | game switcher, registry-driven |
| Admin Marathon enums hardcoded (`FACTION_NAMES`, `STAT_NAMES`, `SHELL_NAMES` `admin/page.js:9-11`; editor select `:183`) | Feed Marathon dropdowns; no DMZ equivalent. | NOP | POST-LAUNCH OK | — |

## §J — Found by searching (not on the brief's list)

- **`get_related_articles` DB function defaults `p_game_slug` to `'marathon'`** (`intel/[slug]/page.js:1410`) — a **DEFAULT living in a stored function**, not just columns. A caller that forgets the param gets Marathon relations. **SW.** Grep will not find function-body defaults — flagged for a DB-side review.
- **`x_sources` table** carries `game_slug` (nullable-or-default) and **`tracked_sources` carries NONE** — the VANTAGE trusted-timeline seed. If `tracked_sources` feeds attribution, it inherits the positional-attribution hazard above.
- **`build` table** has `game_slug NOT NULL` but **`builds` and `build_grade` do not** — a split-brain build schema; verify which the `/builds` route uses before DMZ builds.

---

# 2. DEPENDENCY GRAPH (confirmed / corrected)

```
games registry (status, launch_date, unify the two)  ──▶ kill-clock / countdown
                                                     └──▶ cron game-param route ──▶ DMZ on-cron schedule
ENTITY_TYPES extension ──┐
                         ├──▶ DMZ classification (deriveTuple non-empty)
DMZ entity rows seeded ──┘        │
   (game_maps/weapon_stats/…)     └──▶ keyword matcher fires for DMZ
                                  └──▶ coverage_registry records DMZ
HEADLINE_RULES parameterized ────▶ DMZ editorial headlines
EDITOR_PROMPTS parameterized  ────▶ DMZ editorial voice
dmz.sources populated + cod-blog adapter ──▶ DMZ gather run (today: ERRORS)
URL prefix rule (/dmz/ vs root) ──▶ GSC game attribution  [READY NOW]
root-namespace decision ──▶ (only) forces at game three, not before
```

**Corrections to the brief's suspected interlocks:**
- "registry → kill line" — **confirmed**, and it's worse than stated: there is no machine
  launch_date *or* status at all, and **two** registries to unify first.
- "ENTITY_TYPES + vocabulary seam → DMZ classification" — **confirmed, but the vocabulary seam is
  not broken code** — `loadVocabulary` is correctly game-parameterized; it needs *DMZ data seeded*,
  not a code fix. The blocking pair is **ENTITY_TYPES extension + DMZ entity rows**, not
  "fix loadVocabulary."
- "HEADLINE_RULES → DMZ editorial" — confirmed.
- "intake sources → DMZ editorial" — confirmed; today `gatherAll(dmz)` ERRORS (missing sources),
  which is the safe direction.

---

# 3. DATED READINESS LIST

Respecting **Sep 22 Season-3 collision** (don't schedule interlocked fixes there) and the
**~Sept Marathon→maintenance** shift (blocking seams must be resolved before it).

### NOW (this week) — unblocks the GSC build
1. **§0 URL answer: adopt the prefix rule** `startsWith('/dmz/') ? 'dmz' : 'marathon'` for GSC
   game attribution. **Ready — no code seam blocks it.** (The root-namespace *decision* is §6, not
   a blocker.)

### BY END OF AUGUST — everything blocking DMZ entity-page creation (must age into authority)
2. **Unify the two `getGameConfig` registries** into one, add `status` + `launch_date`. (SW; unblocks kill-clock, cron param.)
3. **The six maps tables: add `game_slug` + filter** — closes the outright collision. (SW.)
4. **Remediate the `DEFAULT 'marathon'` on 16 tables (batch B2)** — the **ten** NOT-NULL ones just
   `DROP DEFAULT` (→ omission ERRORS, clean); the **six** nullable ones need **backfill → SET NOT
   NULL → DROP DEFAULT** (drop alone leaves NULL, still SW). Also flip/fix `email_signups`
   (defaults `'dmz'`) and add attribution to `x_sources` (nullable, no default). See §B. (SW → ERR.)
5. **Extend `ENTITY_TYPES`** for both Marathon's own taxonomy (factions/uniques/cradle — a LIVE game) and DMZ's (keys/POIs/missions). (SW.)
6. **Seed DMZ entity rows** (`game_maps`, `weapon_stats`, …) so `loadVocabulary('dmz')` populates. (Feature-dead → live.)
7. **Sitemap segmentation** (index + per-game) so DMZ indexing is observable for launch tracking.

### BY OCT 23 — editorial generation
8. **Parameterize `HEADLINE_RULES`** and the **`EDITOR_PROMPTS` persona prose** off `config`. (SW.)
9. **Populate `dmz.sources`** + register a `'cod-blog'` patch adapter. (ERR today.)
10. **Fix VANTAGE X attribution** to be content-derived before the X pipeline goes to production. (SW — the sharpest.)
11. **Game-param cron route** + DMZ schedule (resolve the shared `'0 19'` cadence). (Phase D.)
12. `editor_directives.game_slug`; unlock `keyword_targets` game select; wire Broker if DMZ wants it.

### POST-LAUNCH OK
13. Admin game switcher; faction/comment/player-table attribution; SEO-layer parameterization;
    apostrophe transform; the auto-YouTube/discourse literals.

**Honest size:** this is **not small.** ~12 pre-Oct items, of which **6 are "real build," not
one-liners** (registry unify, maps `game_slug` migration + backfill, ENTITY_TYPES + DMZ seed,
HEADLINE_RULES/persona parameterization, dmz.sources + adapter, VANTAGE attribution). The
DEFAULT-drop and the URL rule are cheap; the classification and editorial parameterization are
weeks. The interlock (registry → cron → schedule; ENTITY_TYPES → seed → classification) means they
**come due together**, and they land into the Sep-22/Sept-maintenance squeeze.

---

# 4. POSITIVE FINDINGS — already game-standard

- **The keyword system holds.** `keyword_targets`/`keyword_match_log`/`coverage_registry` all
  `game_slug NOT NULL no-default`; the matcher is scoped per game; `entitySlugFor` verified
  portable on DMZ names; `deriveTuple`/`FACETS` game-agnostic. Confirmed by the direct read.
- **⚠️ CORRECTED 2026-07-23 — `game_maps` / `game_modes` / `game_events` "already generic" is
  UNRESOLVED, not confirmed.** The first pass classified them `NOT NULL no-default` from the
  PostgREST OpenAPI `required[]`; the direct `information_schema` read shows **all three (and
  `game_zones`, `game_bosses`) carry `DEFAULT 'marathon'`** — they are in the NOT-NULL+default ten
  above. The two methods **disagree**, and the disagreement is itself a finding: the OpenAPI
  `required[]` is not a reliable default-detector (it evidently omitted these defaults), so any
  "no-default / generic" verdict derived from it is untrustworthy. **What "generic" may have
  measured that the default does not affect:** these tables ARE game-parameterized on the *read*
  side (`loadVocabulary` filters `WHERE game_slug=…`) — that portability is real and separate from
  the *write*-side default hazard. But the flat "generic/safe" verdict is **withdrawn and marked
  UNRESOLVED** pending reconciliation; the authoritative `information_schema` read wins on the
  column-default question, and it says these have the hazard. (Same class of method-error the
  keyword build kept catching: a derived signal trusted over a direct read.)
- **The nine tables doing it RIGHT (`NOT NULL, no default` — confirmed by the direct read):**
  `build`, `coverage_registry`, `feed_items`, `game_profile`, `historical_context`,
  `keyword_match_log`, `keyword_targets`, `meta_tier_snapshots`, `quality_metrics`. **This is the
  `keyword_targets` pattern — proof it works when applied**, and the template for the 16-table
  remediation above. (Note: the first pass over-claimed this list from the OpenAPI; these nine are
  the direct-read ground truth.)
- **`get_related_articles` is game-scoped** — internal related-linking cannot cross games.
- **The network-root JSON-LD (`app/page.js`) is correctly game-neutral** (Organization = the
  network, not a game).
- **VANTAGE's self-skip** is a genuine, consistently-enforced precedent (all 4 call sites +
  a deterministic pre-gate) — reusable as the network's self-exclusion pattern.
- **The intake source *machinery* is fully game-parameterized** (all Marathon literals lifted to
  `marathon.js`); only DMZ's *data* is unpopulated.
- **Fail-open holds for DMZ classification**: empty DMZ vocab → `unclassified` → matcher no-ops
  and publishes pass 1. DMZ articles won't crash; the framing/coverage features are simply inert
  until seeded.

---

# 5. CONFLICTS BETWEEN DOCTRINE AND CODE (reported, not resolved)

- **Doctrine: "per-game STATUS is first-class."** **Code: no status field exists** — DMZ has
  `indexable`+`launched` booleans, Marathon has neither. A live-game status gate reads `undefined`.
- **Doctrine: "kill clock keys on launch date."** **Code: launch_date is a comment, not a value.**
- **Doctrine: "KD cap is network-level."** **Code: no KD cap exists at all** — KD is never read by
  automation. There is nothing to fork, but also nothing enforcing the cap; it is entirely operator
  judgment. (Not a conflict to fix — a caveat: the "cap" is doctrine + human discipline, not code.)
- **Doctrine: coverage taxonomy includes factions/uniques/cradle.** **Code: `ENTITY_TYPES` omits
  all three** — the enum is behind Marathon's own design already.

---

# 6. DECISIONS REQUIRED (separate artifact — product owner, not a code seam)

These have a different owner and resolution path than the seams above. Do not bury in a severity table.

1. **ROOT-NAMESPACE ASYMMETRY.** Marathon at root, DMZ at `/dmz/*`. Fine at two games. At game
   three: (a) namespace the newcomer and freeze Marathon's root privilege forever, or (b) migrate
   Marathon to `/marathon/*` (redirect event on its most-indexed URLs — cheaper now, on a smaller
   corpus). **Decide before game three; the GSC schema does not block on it but is cheapest to
   future-proof now.**
2. **CROSS-GAME QUERY CANNIBALIZATION.** One domain, shared authority. Game-qualified terms are
   safe ("marathon vandal build" vs "dmz key guide"); **unqualified canonicals are not** — if two
   games both build a "tier list" or "best builds" hub, they bid against each other for the generic
   query. **The keyword *framing* layer is safe by construction** (tuples carry `game_slug`); the
   risk is in **canonical/hub pages**. Nothing currently prevents two games' hubs targeting the
   same unqualified term. **Policy needed.**
3. **NETWORK vs GAME STRUCTURED DATA.** Keep `Organization`/`WebSite` at the network level (already
   correct on `app/page.js`); game identity belongs in granular types. Decide the boundary before
   the SEO layer is parameterized (cross-ref §E2).
4. **SITEMAP SEGMENTATION.** Flat today. Per-game sitemaps (via index) make per-game indexing
   observable — which GSC Consumer-C launch tracking needs. **Adopt segmentation?**
5. **CROSS-GAME INTERNAL LINKING POLICY.** Related-articles is already game-locked (safe). But
   VANTAGE is the *deliberate* cross-game surface — should Marathon and DMZ hub content ever link
   to each other, and where is the line between intended cross-linking and topical dilution?
6. **CRON SCHEDULING.** Both configs carry `'0 19'`. When DMZ goes on-cron: shared slot (one run,
   two games, inside the function limit — see §H, runtime unreadable) or separate slots/routes?
7. **BROKER (Vera Sloan) DEBUT.** Wire for DMZ launch, or keep dormant? (Currently renders as CIPHER
   if a BROKER article slips through unwired.)
8. **`maxDuration`.** Set an explicit ceiling before two-game runs; operator to supply observed
   per-run wall-clock (unreadable here) to size it.

---

## What this audit could NOT read (per §H)

- **Vercel runtime figures** — actual cron wall-clock, per-editor latency, whether a two-game
  parallel batch fits under the function limit. Logs/dashboard are unreachable from here. Code
  exposes only structure (single-game, parallel, ≤5 `callEditor`, no explicit `maxDuration`).
  **Marked OPERATOR-SUPPLIED.**
- **Exact column DEFAULT values — ✅ CLOSED 2026-07-23 (operator ran the DB-side read).** The
  first pass could only infer defaults from code comments + the PostgREST OpenAPI `required[]`; the
  operator ran the direct `information_schema.columns` query. **The real read broadened the finding
  well beyond what the comments suggested:** 16 tables carry `DEFAULT 'marathon'` (not the ~7 the
  comments implied), split 10 NOT-NULL / 6 nullable (see §B); it surfaced two the first pass missed
  (`x_sources` nullable-no-default, `email_signups` DEFAULT `'dmz'`); and it **contradicted** the
  OpenAPI-derived "no-default/generic" verdict on `game_maps`/`game_modes`/`game_events`/
  `game_zones`/`game_bosses` (now UNRESOLVED, §4). Lesson: the OpenAPI `required[]` is not a
  reliable default-detector — the direct read is authoritative and should have been the source.

---

_Read-only investigation. No code, DDL, or commits. Seams verified at file:line or with
DMZ-shaped data; unverifiable runtime figures marked operator-supplied; unmade product decisions
routed to §6._
