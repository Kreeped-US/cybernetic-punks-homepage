# DMZ Refactor — Table Inventory & Game-Scope Decision Doc

**Status:** DECISION DRAFT (read-only inventory). Due June 17; migration is July.
**Date:** 2026-06-15 (updated — player_* cluster now LOCKED; DMZ model confirmed divergent).
**Method:** Enumerated all 58 API-exposed tables via the PostgREST OpenAPI spec
(read-only); columns from the spec; row counts via `count` head queries. **No schema
changes, no migration SQL, no route changes were made.**

## Purpose
Categorize every table as **GAME-SCOPED** (belongs to one game; DMZ needs its own
equivalent) vs **NETWORK-LEVEL** (shared across all games in the hub) vs **DEFAULTED**
(recommended default applied, non-blocking) vs **UNCERTAIN** (needs a decision). This
feeds the July migration SQL, the URL-map decision, and the network-level Runner Shell
progression build.

## Guiding principle (locked)
**Share what is structurally universal; split what is structurally game-specific.** Two
worked examples that point opposite ways and are BOTH correct:
- **Articles (`feed_items`) → SHARED + `game_slug`.** An editorial article is the same
  shape regardless of game; one table tagged by game.
- **Player build/loadout data → PER-GAME tables.** The games' build models barely
  overlap, so one shared table would be half-null per row. Split.

## DMZ model finding (2026-06-15) — why player_* is now decided
Received DMZ context confirms its player/progression model is **structurally different**
from Marathon's (reliable enough to lock architecture; field-level schema confirmed
closer to DMZ's **Oct 23 2026** launch):
- **Loadouts:** CoD Gunsmith (weapon platform + attachments + perks) + insured-weapon
  slots + contraband + stash — NOT Marathon's shell/weapon/mod/core/implant model.
  Minimal column overlap.
- **Progression:** a separate DMZ XP/rank system — Active Duty slots, FOB upgrades,
  3D-Printer crafting, reputation/Tier-1 path — extraction-economy shaped, not
  Marathon's ranked-ladder shape.
- **Persistence:** insured weapons, stash, match-to-match inventory carry, contraband —
  extraction-economy semantics.
- **Identity:** Battle.net / Steam / Xbox / Switch2 / Activision — confirms
  `player_profiles.bungie_*` identity MUST be generalized (Decision 2).

Conclusion: forcing both games into one `player_loadouts + game_slug` table would be the
exact "entangle game data that should be separate" failure this inventory exists to
prevent. **Decision A is therefore unparked and LOCKED (below).**

## Game discriminator today
**14 tables already carry `game_slug`** (partial migration already done):
`core_stats, cradle_nodes, faction_armory, faction_upgrades, implant_stats, mod_stats,
shell_stats, weapon_stats, unique_weapons, game_maps, game_zones, game_bosses,
game_events, game_modes`. Every other game-scoped table has **no game discriminator
yet** — flagged below as a July migration consideration (add `game_slug` for shared
tables, or build a per-game table — do NOT change today).

---

## Full inventory (58 tables)

| Table | Purpose (inferred) | Category | Game discriminator? | Coupling / notes |
|---|---|---|---|---|
| ammo_stats | Ammo types + damage modifiers (5) | GAME-SCOPED | none | weapon system / advisor |
| article_comments | AI-editor comments on feed_items (2637) | GAME-SCOPED | via `article_id`→feed_items | comment generation, /intel render |
| builds | Curated build presets (6) | GAME-SCOPED | none | /builds |
| core_stats | Shell core upgrades (85) | GAME-SCOPED | **game_slug** | fetchGameContext, /builds, advisor |
| cradle_nodes | Cradle progression nodes/perks (84) | GAME-SCOPED | **game_slug** | fetchGameContext, /cradle |
| creators | Featured content creators (5) | DEFAULTED → network registry w/ per-game tag | none (platform) | see Decisions D |
| cred_ledger | Per-user credit ledger (0) | NETWORK-LEVEL | `user_id` | `editor` col couples to game pipeline |
| editor_directives | Editorial assignments to AI editors (22) | GAME-SCOPED | none (`editor`) | cron orchestration |
| editor_logs | Editor action log (4) | GAME-SCOPED | none | cron/editors |
| faction_armory | Faction Armory stock (44) | GAME-SCOPED | **game_slug** | fetchGameContext |
| faction_materials | Faction crafting materials (49) | GAME-SCOPED | none | /factions |
| faction_stat_bonuses | **DEAD** S1 faction stat grind (7) | GAME-SCOPED (retire) | none | not fed to editors; retire candidate |
| faction_unlocks | **DEAD** S1 .EXE unlock catalog (56) | GAME-SCOPED (retire) | none | disabled; retire candidate |
| faction_upgrades | Faction rank-gating nodes (6) | GAME-SCOPED | **game_slug** | fetchGameContext |
| factions | The 6 factions (6) | GAME-SCOPED | none | fetchGameContext, /factions; **lacks game_slug while its children have it** |
| feature_gates | Feature access by tier (19) | NETWORK-LEVEL | n/a | site-wide gating |
| feed_items | Editorial article feed (1756) | GAME-SCOPED (→ shared + game_slug) | none | **MAJOR**: cron, /intel, /rising, homepage, comments. Biggest migration item |
| game_bosses | World bosses (5) | GAME-SCOPED | **game_slug** | fetchGameContext, maps |
| game_events | World events (6) | GAME-SCOPED | **game_slug** | fetchGameContext |
| game_maps | Maps (verified world data) (5) | GAME-SCOPED | **game_slug** | fetchGameContext, /maps |
| game_modes | Game modes (4) | GAME-SCOPED | **game_slug** | fetchGameContext |
| game_zones | Map zones (32) | GAME-SCOPED | **game_slug** | fetchGameContext |
| implant_stats | Implants (120) | GAME-SCOPED | **game_slug** | fetchGameContext, /builds |
| leaderboard | Ranked leaderboard (0) | GAME-SCOPED (per-game) | `membership_id`+season | **Decision A**: per-game ranked, FK to network identity |
| live_stats | Generic live-stat KV cache (2) | DEFAULTED → network infra | `source` key | tag by game where needed |
| loadout_snapshots | Saved player loadouts (2) | GAME-SCOPED (per-game) | `player_id` | **Decision A**: DMZ has Gunsmith/stash shape, not this |
| map_attribution | Map credit info (2) | GAME-SCOPED | `map_slug` | /maps |
| map_markers | Map POI markers (7) | GAME-SCOPED | `map_slug` | /maps |
| map_reference | Map reference text (15) | GAME-SCOPED | `map_slug` | /maps |
| map_vaults | Map vault/loot data (7) | GAME-SCOPED | `map_slug` | /maps |
| map_zones | Legacy map zones (0) | GAME-SCOPED (retire) | `map_slug` | empty; superseded by game_zones |
| maps | Map registry + base images (1) | GAME-SCOPED | none (slug, season) | /maps |
| meta_tiers | Weapon/shell tier list (40) | GAME-SCOPED | none | **coupling**: NEXUS regrade, /meta, CIPHER |
| mod_stats | Mods/mags/optics/chips (202) | GAME-SCOPED | **game_slug** | fetchGameContext, /builds |
| player_audits | Advisor analysis results (1) | GAME-SCOPED (per-game) | `player_id` | **Decision A** |
| player_profiles | User accounts/identity (1) | NETWORK-LEVEL (identity rework) | `bungie_membership_id` | **Decision 2 LOCKED-rework**: generalize off bungie_* (DMZ = Battle.net/Steam/Xbox/Activision) |
| player_qa_history | Ask-editor Q&A (0) | GAME-SCOPED (per-game) | `player_id` | **Decision A** |
| player_shell_stats | Per-player shell stats (0) | GAME-SCOPED (per-game) | `membership_id` | **Decision A** |
| player_stats | Per-player game stats (0) | GAME-SCOPED (per-game) | `membership_id` | **Decision A** |
| player_weapon_stats | Per-player weapon stats (0) | GAME-SCOPED (per-game) | `membership_id` | **Decision A** |
| player_weekly_digests | Weekly digest per player (0) | GAME-SCOPED (per-game) | `player_id` | **Decision A** |
| plays | Play-of-the-day clips (5) | GAME-SCOPED | none | homepage/plays |
| population_snapshots | Weekly audit aggregates (0) | GAME-SCOPED (per-game) | none | **Decision A**: `shell_distribution` is game-specific |
| post_queue | Social post queue for articles (26) | GAME-SCOPED | none | social posting infra |
| server_incidents | Server incident log (0) | DEFAULTED → per-game | `platform` | see Decisions C (lean per-game) |
| server_status | Game server status (3) | DEFAULTED → per-game | `platform` | see Decisions C (lean per-game) |
| shell_stat_values | Per-shell stat values (91) | GAME-SCOPED | none (`shell_name`) | shell system |
| shell_stats | Runner Shells (8) | GAME-SCOPED | **game_slug** | fetchGameContext, /shells |
| site_events | Generic event/dedup log (269) | DEFAULTED → network infra | `event_name` | patch_regrade/patch_discord dedup markers |
| steam_snapshots | Steam player-count history (408) | GAME-SCOPED | none | per-game Steam app; DMZ has its own |
| subscription_tiers | Billing tier definitions (5) | NETWORK-LEVEL | n/a | site-wide billing |
| tasks | Generic task/job queue (4) | DEFAULTED → network infra | none (`editor`) | tag by game where needed |
| tracked_sources | Monitored content sources (0) | DEFAULTED → network registry | none | tag by game where needed |
| unique_weapons | Unique weapons (16) | GAME-SCOPED | **game_slug** | /uniques, fetchGameContext |
| user_subscriptions | Per-user Stripe subscriptions (0) | NETWORK-LEVEL | `player_id` | billing |
| weapon_stats | Weapons (32) | GAME-SCOPED | **game_slug** | fetchGameContext, /builds, /weapons |
| weekly_reset | Weekly reset info (0) | GAME-SCOPED | none | site |
| wiki_meta | Wiki-fetch bookkeeping per table (4) | DEFAULTED → network infra | `table_name` | fetch infra (scraper disabled) |

## Summary counts
- **GAME-SCOPED: 45** — incl. the **9 per-game player tables** (Decision A); 14 already
  have `game_slug`; 3 are retire candidates (`faction_stat_bonuses`, `faction_unlocks`,
  `map_zones`).
- **NETWORK-LEVEL: 5** — `player_profiles` (identity rework), `user_subscriptions`,
  `subscription_tiers`, `feature_gates`, `cred_ledger`.
- **DEFAULTED (non-blocking): 8** — `creators`, `live_stats`, `server_status`,
  `server_incidents`, `site_events`, `tasks`, `tracked_sources`, `wiki_meta`.
- **UNCERTAIN / blocking: 0.**

---

## Decisions — status

### A. Player build / loadout / ranked / stash data — **LOCKED (two-tier model)**
**Player build/loadout/ranked/stash data lives in PER-GAME tables, linked to a
NETWORK-LEVEL identity + progression spine.**
- **Network spine (shared):** `player_profiles` (one human account across all games,
  identity generalized off `bungie_*`) + the Runner Shell cross-game progression layer.
- **Per-game data (game-shaped):** the actual loadout/build/ranked/stash data lives in
  game-specific tables matching each game's real shape — e.g. `marathon_*` player data
  (shell/mod/core/implant) vs `dmz_*` player data (Gunsmith/insured/stash/Active-Duty) —
  each FK-linked to the one network profile.
- **Rationale:** the games' build models barely overlap; a single
  `player_loadouts + game_slug` table would be half-null per row. Per-game tables keep
  each game's data clean; the network identity + Runner-Shell spine satisfies the
  already-locked "Runner Shell is network-level" decision. **One identity, many
  game-shaped data sets linked to it.**
- Covers (today's Marathon tables, which become the `marathon_*` set): `player_stats`,
  `player_shell_stats`, `player_weapon_stats`, `player_audits`, `player_qa_history`,
  `player_weekly_digests`, `loadout_snapshots`, `population_snapshots`, `leaderboard`.

### B. `player_profiles` identity — **LOCKED (rework required)**
Stays NETWORK-LEVEL (one hub-wide account), **but** the identity columns
(`bungie_membership_id` / `bungie_display_name` / `bungie_avatar_url`) must be
generalized to a provider-agnostic account + per-provider identity. Marathon/Destiny are
Bungie; DMZ is Battle.net/Steam/Xbox/Switch2/Activision — confirmed non-Bungie. Rework
before DMZ launch; not a today-change. **Priority bump:** per
[NETWORK_PRINCIPLES.md](NETWORK_PRINCIPLES.md) Principle 1, this is also the foundation for
monetization (network identity + billing readiness), so it is now monetization-critical,
not just DMZ-auth-critical.

### C. Server status/incidents — **DEFAULTED → per-game**
`server_status`, `server_incidents`: defaulted to per-game (each game's servers differ).
Revisit only if the hub shows one combined status board. Non-blocking.

### D. Content-source & infra logs — **DEFAULTED → shared network infra**
`creators`, `tracked_sources`, `live_stats`, `site_events`, `tasks`, `wiki_meta`: kept as
shared network infra, tagged by game where a row is game-specific. (`creators` becomes a
network registry with per-game tagging — a creator may cover multiple hub games.)
Non-blocking; each is a small independent call that can be finalized during migration.

### Consistency check (record explicitly)
Decision A (player build → **per-game**) does **not** conflict with `feed_items`
(**shared + `game_slug`**). Different data, different answers, each matching its real
shape: **articles are structurally universal across games (share); player build data is
structurally game-specific (split).** This is the guiding principle applied, not an
inconsistency.

---

## July / pre-launch implications
- **`feed_items`** (+ `article_comments`, `meta_tiers`, `post_queue`, editorial tables):
  add `game_slug`; thread game-scoping through the cron and all `/intel` `/rising` `/meta`
  routes (largest coupling surface).
- **Per-game player data tables + network identity spine:** build `dmz_*` player tables to
  DMZ's Gunsmith / stash / Active-Duty shape (schema specifics confirmed closer to the
  Oct 23 2026 launch); keep Marathon's player tables as the `marathon_*` set; both FK to
  the one generalized `player_profiles` + Runner Shell progression spine.
- **Identity generalization** of `player_profiles` off `bungie_*` before DMZ auth.
- **Add `game_slug`** to the 22 game-scoped tables that lack it (or build per-game where
  Decision A applies); **retire** the 3 dead tables.
- **Factions:** add `game_slug` to `factions` to match its already-scoped children.

## NOT DECIDED / OUT OF SCOPE TODAY
- This is **inventory + categorization only.** No schema changes, no `game_slug`
  additions, no table splits, no migration SQL — that is the **July migration**.
- **URL map and theming are DECIDED** — see the companion doc
  [URL_AND_THEMING.md](URL_AND_THEMING.md) (Marathon unprefixed / DMZ `/dmz`-prefixed,
  per-game hubs, `dmzpunks.com` -> 308 -> `/dmz`; per-game CSS design-token themes on a
  shared design system; **root homepage = neutral network hub from day one** (revised from
  the earlier flagship-default); DMZ visual direction = cyberpunk house style with an amber
  / cold-grey Hajin palette). The **June-17 architecture lock is FULLY COMPLETE — no
  remaining open architectural decisions.** Only build-time hex tuning and the July
  refactor execution remain.
- **Network-level principles & roadmap** — see [NETWORK_PRINCIPLES.md](NETWORK_PRINCIPLES.md)
  (monetization-readiness seams, template-after-DMZ, AI Q&A/advisor surface): non-blocking
  constraints the July refactor must honor. The monetization-readiness principle **raises
  the priority** of the `player_profiles` identity generalization (Decision B) and builds
  on the existing `subscription_tiers` / `feature_gates` / `cred_ledger` network tables.
- DMZ shapes recorded here are **reliable for architecture** (per-game-vs-shared is
  decided); **field-level schema specifics are confirmed closer to the Oct 23 2026
  launch.**
