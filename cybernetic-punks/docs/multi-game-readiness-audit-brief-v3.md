# Multi-Game Readiness Audit — Investigation Brief v3 (SEND)

**Status:** FINAL. Send to Claude Code as a read-only investigation.
Supersedes v1/v2. v3 adds concrete table seeds (§B), the VANTAGE X pipeline
(§D2), an access caveat (§H), and a new forward-looking category: **multi-game
SEO architecture (§K)**.

**No code changes, no DDL, no commits.** This produces a document.

---

## WHY THIS EXISTS

The network serves multiple games (Marathon live, DMZ targeting Oct 23 2026,
**and more after that — design for N games, not 2**). Multi-game support has
been applied **inconsistently**: it engaged where work obviously touched game
content (the keyword system is genuinely game-standard — `game_slug` NOT NULL
no default, matcher scoped per game, `entitySlugFor` *verified* portable by
running DMZ-shaped names through it), and vanished where something felt
infrastructural (the GSC integration plan went four drafts and three reviews
with no `game_slug` anywhere).

**The failure mode: assuming "infrastructure is game-neutral" when
infrastructure that records facts about game content needs game attribution as
much as the content does.**

Individually-deferred seams have accumulated, each with a defensible "zero
current impact, DMZ isn't live" rationale. In aggregate they interlock and come
due together. This audit converts that into a dated, dependency-ordered list.

**Operating assumption for every finding: two games now, more later.** A fix
that works for exactly two games is a deferred seam, not a fix. Where a seam
could be closed generically at the same cost as closing it for DMZ
specifically, say so.

---

## METHODOLOGY — READ FIRST

**Every seam listed below is a HYPOTHESIS from the planning chat's memory —
the same source that produced roughly twelve false premises in the previous
session** (a slug divergence that did not exist, an import cycle that did not
exist, a function "needing extraction" that was already extracted, an admin
tab "missing" that existed). Every one was caught by reading actual code.

1. **Verify each hypothesis at file:line. If one does not exist, say so** —
   that is a finding, not a failure.
2. **ENUMERATE EXHAUSTIVELY BY SEARCHING. Do not merely check this list.**
   The dangerous seams are the ones the planning chat forgot.
3. **Test with DMZ-shaped data where possible** rather than reasoning about
   behaviour. The `entitySlugFor` check is the model.
4. **Report and stop.** No fixes.

---

## DOCTRINE CONTEXT (verified accurate — audit against these as FACTS)

- **Per-game STATUS is first-class**: pre-launch / live / maintenance. Marathon
  goes to maintenance ~Sept 2026 (measure/fix/re-verify, little new content)
  while DMZ is build-mode. **Generation behaviour, effort allocation, and the
  kill clock all key on status.** Kill clock starts at *launch date* for
  pre-launch games.
- **A routing precedent exists**: VANTAGE routes marathon -> `/intel/`,
  dmz -> `/dmz/discourse/`. **Game-partitioned URLs for DMZ are DECIDED**, not
  an open decision. §E verifies how far it extends.
- **The KD cap (~30-35) is NETWORK-level** — one domain, shared authority.
  Per-game thresholds must NOT fork it.
- **The coverage-memory design's Marathon taxonomy includes factions, uniques,
  and cradle** — none in the implemented `ENTITY_TYPES`. **The enum is already
  too small for Marathon's OWN design, not just DMZ's.**

---

## THE REAL CALENDAR (Oct 23 is NOT the constraint)

| bucket | due | contains |
|---|---|---|
| **NOW** | immediately | the §E URL-structure answer — **the GSC integration is next to build and its schema is blocked on it today** |
| **BY ~END OF AUGUST** | weeks | everything blocking DMZ **entity-page creation**: games registry, ENTITY_TYPES, vocabulary seam, routing. Doctrine Phase 1 (claim DMZ canonicals so they AGE INTO AUTHORITY) runs now through October — pages must exist early to age |
| **BY OCT 23** | launch | editorial generation: HEADLINE_RULES parameterization, DMZ editor definitions, intake sources |
| **POST-LAUNCH OK** | after | admin polish, measurement config, cosmetics |

**Scheduling constraints:**
- **Marathon -> maintenance ~Sept 2026** — the resourcing shift assumes
  blocking seams are already resolved.
- **Season 3 lands Sep 22**, triggering Marathon patch re-verification load
  exactly when DMZ crunch peaks. **Do not schedule interlocked fixes there.**

---

## WHAT TO ENUMERATE

### A. Hardcoded game references
Any literal `'marathon'`, `"Marathon"`, `isMarathon`, or equivalent in code,
config, prompts, constants, or DB defaults. Report file:line, what it gates,
and behaviour when `game_slug` is something else.

### B. Schema / data-layer game attribution
Per table: `game_slug` present? NOT NULL? **DEFAULT?** (a default is a hazard —
it silently attributes rows to the wrong game). Report tables recording
game-related facts with NO game column.

**Seeded hypotheses — verify each:**
- **THE SIX MAPS TABLES — strongest pre-existing hypothesis of missing game
  attribution in the entire schema:** `maps`, `map_attribution`, `map_zones`,
  `map_markers`, `map_vaults`, `map_reference` are **all keyed by `map_slug`**.
  A DMZ map sharing a name with a Marathon map would **collide outright**.
  Report the collision risk concretely.
- The four faction tables.
- `article_comments`.
- **`editor_directives`** — per-game steering, or does a directive apply to
  whichever game the cron happens to run?
- `feed_items`, `keyword_targets`, `keyword_match_log`, `coverage_registry`,
  `coverage_shadow`, the stat tables, the `dmz_*` tables.
- **`weapon_stats` / `game_maps` / `game_modes` / `game_events`** — previously
  described as "DB-driven and already generic." **Seed these into the
  positive-findings section as hypotheses to CONFIRM**, same treatment as
  `entitySlugFor`.

### C. Vocabulary / classification portability
- `loadVocabulary`: **test with `'dmz'`** — report the returned vocabulary
  shape, which entity types populate, which come back empty, and why.
- `deriveTuple` / `detectFacet`: do they classify DMZ-shaped headlines, or
  depend on Marathon vocabulary being present?
- **`ENTITY_TYPES` — audit BOTH gaps separately:** (i) DMZ's prize entities
  (keys, POIs, factions, missions) have no home; (ii) **Marathon's own designed
  taxonomy (factions, uniques, cradle) is also absent.** They may have
  different urgencies — the Marathon half concerns a LIVE game.
- `FACETS`: game-agnostic or Marathon-shaped?
- `entitySlugFor`: reconfirm as a positive finding.

### D. Editorial pipeline
- `PRODUCING_GAME_SLUG`: single-game per run, or multi? What would DMZ
  editorial require?
- Editor directives/personas: which are Marathon-specific? The design records
  editor JOBS as per-game while infrastructure travels — **confirm in code**,
  and enumerate what a new game's editor set requires.
- `HEADLINE_RULES` and other prompt constants hardcoding game name or lore.
- The dormant DMZ editor (Broker / Vera Sloan): what exists, what is missing?

### D2. PER-GAME INTAKE SOURCES  **[likely the largest DMZ-editorial
### dependency after vocabulary]**
The five editors run on YouTube + Reddit + Bungie news + Twitch + the game DB.
**That list is Marathon-shaped down to the publisher — Bungie news is useless
for a CoD game.** Report:
- Where source feeds are configured (file/table); **per-game or global?**
- Whether **source -> game attribution is explicit** or assumed.
- What adding DMZ's sources requires; what happens today if a Marathon-specific
  source (Bungie news) is polled for a DMZ run.
- **VANTAGE'S X PIPELINE — the sharpest intake seam.** VANTAGE runs on a
  rebuilt X pipeline and is the one editor already handling both games:
  **which X accounts/queries feed it, are they per-game, and how does an
  X-sourced item get assigned to marathon vs dmz BEFORE routing?** Most likely
  place for silent misattribution.

### E. Routing / URL structure  **[BLOCKS THE GSC SCHEMA — ANSWER FIRST]**
Start from the known precedent: VANTAGE routes marathon -> `/intel/`,
dmz -> `/dmz/discourse/`.
- **How far does it extend?** VANTAGE-only, or is `/dmz/*` an established
  namespace with other routes built? (`dmz_items`, `dmz_keys`, `dmz_missions`
  tables exist.)
- **Can a URL alone determine its game?** Load-bearing: it decides whether GSC
  page metrics can be game-attributed at write time. If partitioned, trivial.
  If any content paths are shared, another rule is needed — **and tool/entity
  pages that do not join `feed_items` would have no game attribution at all.**
- Which Marathon routes are shell-shaped (`/shells/`, `/matchups/`) and would
  need DMZ equivalents (`/keys/`, `/missions/`)?
- Sitemap generation: game-aware?

### E2. SEO METADATA / STRUCTURED DATA  **[SILENTLY-WRONG-shaped]**
The sitemap is in §E; the structured-data layer is not. Report every place
game identity is baked into SEO output:
- **JSON-LD blocks** — WebSite / Organization / Breadcrumb schemas across
  `/factions`, `/advisor`, `/meta` and elsewhere.
- **OG / Twitter cards**, page titles, meta descriptions.
- How many hardcode "Marathon"? These fail SILENTLY WRONG for a second game —
  the page renders fine and the structured data lies to Google.

### F. Config / registry gap
- Does ANY games registry exist (slug, display name, launch date, status,
  per-game config)?
- If not, what holds per-game info today, and where is it scattered?
- **Spec the registry against DOCTRINE requirements, not just the GSC kill
  line:** needs `status` (pre-launch / live / maintenance) because generation
  behaviour, effort allocation, and kill-clock rules key on it — plus
  `launch_date`.
- **Confirm no per-game threshold would fork the network-level KD cap.**

### G. Admin surface
- `keyword_targets.game_slug` is a hardcoded `['marathon']` select — confirm,
  and find every other hardcoded game in admin.
- Which admin tabs/tables are game-specific vs agnostic? Would a DMZ operator
  see Marathon tables and vice versa?

### H. CRON CAPACITY / OPERATIONS  **[grep will not find this]**
§D asks whether the cron *can* run multi-game. This asks whether it *fits*:
- Does one 19:00 UTC run accommodate two games' editorial **inside Vercel
  function time limits**?
- Would DMZ need its own schedule/route, and what would that require?
- **ACCESS CAVEAT:** runtime numbers live in Vercel logs/dashboard, which this
  investigation may not be able to read. **Derive what code and config expose**
  — `maxDuration` settings, per-editor call counts, sequential vs parallel
  structure — and **mark actual runtime figures as OPERATOR-SUPPLIED if logs
  are unreachable.** Do not leave the section empty and do not guess. A
  read-only investigation should state what it could not read.

### I. VANTAGE (cross-game editor)  **[different species of seam]**
VANTAGE is *inherently* multi-game, so its failure modes are not "hardcoded
Marathon" but **"hardcoded to exactly two games."**
- **Where does it get its games list?** Config, query, or literal?
- **What happens at game three?**
- Is marathon->`/intel/`, dmz->`/dmz/discourse/` a **lookup or a literal
  branch**?
- Does forbidden-from-single-game-facts hold **structurally or only by prompt**?
- Its self-skip precedent is the network's only one — **evaluate for the
  positive-findings section.**

### K. MULTI-GAME SEO ARCHITECTURE  **[NEW — forward-looking, N games]**
The operator's constraint: **"SEO that works for everything without
interfering."** One domain, shared authority, N games. Report the current
state and the structural risks:

- **ROOT-NAMESPACE ASYMMETRY.** Marathon lives at the root (`/shells/`,
  `/weapons/`, `/matchups/`, `/intel/`); DMZ is namespaced (`/dmz/*`). Report
  whether that is the actual pattern. **This is fine at two games and awkward
  at four:** game three either joins the namespaced tier while Marathon keeps
  privileged root paths, or Marathon eventually migrates and eats a redirect
  event on its most-indexed URLs. **Flag to the decisions-required list** —
  cheaper to decide now at two games than later at four.
- **CROSS-GAME QUERY CANNIBALIZATION.** One domain means games can compete
  with each other. Game-qualified terms are safe ("marathon vandal build" vs
  "dmz key guide"); **unqualified ones are not** — if both games have a "tier
  list" or "best builds" canonical, they bid against each other for the
  generic query. Report: does anything currently prevent two games' canonical
  pages targeting the same unqualified term? (Note: the keyword system's
  tuples carry `game_slug`, so the *framing* layer is safe by construction —
  the risk is in canonical/hub pages, not articles.)
- **NETWORK-LEVEL vs GAME-LEVEL STRUCTURED DATA.** If Organization/WebSite
  JSON-LD names a game, every other game's pages lie. Report what the schemas
  currently assert and where the network/game boundary should fall
  (likely: Organization = Cybernetic Punks network; game identity in more
  granular types). Overlaps §E2 — cross-reference rather than duplicate.
- **SITEMAP SEGMENTATION.** One flat sitemap or per-game sitemaps (via a
  sitemap index)? **Per-game sitemaps make per-game indexing OBSERVABLE**,
  which is exactly what the GSC Consumer C launch tracking needs — "are DMZ
  pages getting indexed" is much harder to answer from one flat file. Report
  current shape and whether segmentation is feasible.
- **CROSS-GAME INTERNAL LINKING.** Is there a policy? Should Marathon articles
  link to DMZ content and vice versa (VANTAGE is the deliberate cross-game
  surface)? Report what currently happens and whether anything prevents
  accidental cross-game linking that dilutes topical focus.
- **SHARED-AUTHORITY IMPLICATIONS.** The KD cap is network-level. Report
  anything that would let a per-game config fork it, and anything where one
  game's SEO decisions could degrade another's.

### J. Anything else
Search beyond this list. Unanticipated categories are the most valuable
findings.

---

## CLASSIFY EACH SEAM

| field | meaning |
|---|---|
| **location** | file:line or table/column |
| **what breaks** | concrete behaviour with a non-Marathon game |
| **degradation mode** | **ERRORS** (loud, safe) / **SILENTLY WRONG** (dangerous) / **GRACEFUL NO-OP** (safe) |
| **track** | **PRE-LAUNCH BUILD-OUT** / **LAUNCH-WEEK EDITORIAL** / **OPERATIONS** |
| **due bucket** | NOW / BY END OF AUGUST / BY OCT 23 / POST-LAUNCH OK |
| **depends on** | seams that must be fixed first |
| **fix size** | one line / one commit / a real build |
| **generic-fix available?** | can this be closed for N games at the same cost as closing it for DMZ specifically? |

**Degradation mode is the most important column.** ERRORS is survivable.
**SILENTLY WRONG is the hazard** (a `game_slug` default quietly attributing DMZ
rows to Marathon; `loadVocabulary` returning empty so DMZ articles never
classify; JSON-LD announcing the wrong game; a DMZ map colliding with a
Marathon `map_slug`). This codebase's entire discipline exists to avoid
shipping those.

---

## PRODUCE

1. **The full seam inventory**, classified as above.
2. **The dependency graph** — suspected interlocks: registry -> kill line;
   ENTITY_TYPES + vocabulary seam -> DMZ classification; HEADLINE_RULES ->
   DMZ editorial; intake sources -> DMZ editorial. Confirm or correct.
3. **The dated readiness list** in the four buckets, dependency-ordered,
   respecting the Sep 22 Season-3 collision and the ~Sept maintenance
   transition. Be honest about total size.
4. **The positive findings** — what is ALREADY game-standard. Confirm the
   keyword system holds; confirm or refute the `weapon_stats` / `game_maps` /
   `game_modes` / `game_events` "already generic" hypothesis; include
   VANTAGE's self-skip precedent if it qualifies.
5. **The §E URL-structure answer, called out separately and FIRST** — the GSC
   schema is blocked on it today.
6. **THE DECISIONS-REQUIRED LIST** — a separate artifact. Product decisions
   (root-namespace asymmetry, per-game theming, cron scheduling, how far
   `/dmz/` routing extends, sitemap segmentation) have a **different owner and
   resolution path** than code seams; burying them in a severity table loses
   that.

Save to `docs/MULTI_GAME_READINESS_AUDIT.md` and present it.

---

## CONSTRAINTS

- **Read-only.** No code, no DDL, no commits, no fixes. Document and stop.
- **Verify the listed seams; do not inherit them.** Several may not exist.
- **Search exhaustively** — unlisted seams are the point.
- **Test with DMZ-shaped data** where possible.
- **State what you could not read** (see §H) rather than guessing or omitting.
- Flag unmade product decisions to the decisions-required list (§6) rather
  than guessing.
- Where the doctrine context conflicts with what the code does, **report the
  conflict** — do not assume either side is correct.
- **Design-for-N framing:** where a seam can be closed generically at the same
  cost as a DMZ-specific fix, note it. A two-game fix is a deferred seam.
