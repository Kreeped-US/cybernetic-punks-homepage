# Gap 2 — Per-game gather layer for DMZ (MW4): scoping

## Status
Read-only scoping (2026-06-18). Builds on
[GATHER_PIPELINE_AUDIT.md](GATHER_PIPELINE_AUDIT.md) (which mapped the hardcoding)
and goes forward to the SOLUTION shape. No code in this doc. Informs the staged
Phase A–E build below. The gather pipeline is Marathon-hardcoded end to end;
storage (`game_slug`) and display are game-aware, gather is not. DMZ editorial
(MW4, ~Oct 23 2026) is blocked on building this per-game gather layer.

## Cost constraint (a design input)
A second game ~doubles generation cost; prompt-caching was rejected (parallel
editor calls + per-editor tools mean the cache never hits — see the cost audit).
The chosen lever is **cadence + editor-count**: DMZ launches at reduced cadence
(e.g. 24h, fewer than 5 editors) until it has an audience, scaling up later.
**Therefore per-game cadence and editor-count must be config, not hardcoded.**

---

## The target (confirmed research, 2026-06-18)
- **Call of Duty: Modern Warfare 4**, global launch **Oct 23 2026**, on
  **Steam/PC + PS5 + Xbox + Switch 2**. DMZ returns as its extraction mode, set
  in the **Hajin Exclusion Zone**, with match-to-match progression + persistent
  inventory.
- **The DMZ economy is real** (this unblocks Broker): a **3D Printer**
  (recipes + ingredients; recipes upgrade the printer), an **FOB** with a cash
  **Wallet**, and a **Gunsmith on an in-game cash economy where each attachment
  raises the cost of the next**. Missions/Ops pay cash. This is exactly the
  renewing-market data Marathon lacks — Broker's deferral to DMZ is validated.

Sources: callofduty.com MW4 DMZ deep dive; PlayStation Blog (Oct 23 launch);
Xbox Wire; Gamelevate / Pocket Tactics / vpesports (economy); callofduty.com/patchnotes.

---

## Architecture: shared code reads per-game config

The line: **one set of gather code, parameterized by a per-game config object.**
Today every module reads Marathon literals; the fix is to lift those literals
into config and pass them in.

### Config shape — a code module, not a DB table
`lib/games/<slug>.js` (e.g. `marathon.js`, `dmz.js`) + a `lib/games/index.js`
registry (`GAMES[slug]`). Code module over DB table because sources are static,
code-coupled (the relevance filter is logic, not just data), and want git
review/rollback; a DB table adds a runtime fetch + indirection for config that
ships with the code anyway.

```
{ slug, displayName,
  sources: {
    steamAppId,                  // players + reviews + news
    subreddits: [...],
    youtubeQueries: [...],
    twitch: { gameName | gameId },
    patchNotes: { type: 'steam-news' | 'cod-blog', appId | url },
    wiki: { urls, ... },         // dexter-stats source
  },
  relevance: { gameTokens: [...], contextTokens: [...] },  // isMarathonGameContent terms
  editorial: { cadenceCron, editors: [...] },              // the cost lever
}
```

### Per-module verdict
| Module | Verdict |
|---|---|
| `steam.js` (players/reviews/news) | **Parameterize by `steamAppId`** → fully reusable. DMZ reuses it directly (MW4 on Steam). The Gap-1 `maxlength=0` + BBCode + completeness logic carries over. |
| `reddit.js` | Parameterize subreddit(s) → reusable. |
| `youtube.js` | Parameterize search queries → reusable. |
| `twitch.js` | Parameterize game name/id → reusable. |
| `bungie.js` | **Structurally game-specific** (Bungie + version-regex + framing). Its CORE is the Gap-1 patch-notes engine (fetch → detect → BBCode-clean → completeness). Phase B refactors the *concept* into a generic patch-notes source with per-game adapters: Marathon = Steam-news adapter (built); DMZ = Steam-news (if MW4 cross-posts) or a `cod-blog` adapter over callofduty.com/patchnotes. Phase A: leave behavior unchanged. |
| `miranda.js` | Parameterize guide queries; shell/weapon/mod context is Marathon-shaped (ties to stat-storage decision). |
| `dexter-stats.js` | Parameterize wiki URLs + extraction prompts + subreddit + target tables. Extraction engine reusable; sources + target schema per-game. |
| `cipher.js` | Internal synthesis (reads own `feed_items` by `game_slug` + patch news) → mostly reusable; "bungie news" input becomes the per-game patch-notes source. |
| `index.js` `gatherAll` + `isMarathonGameContent` | `gatherAll(gameConfig)`; relevance filter reads `config.relevance` tokens (today `MARATHON_GAME_TOKENS` + `GAME_CONTEXT_TOKENS`, index.js:45–67). |
| `editorCore.js` `fetchGameContext` | `fetchGameContext(gameConfig)`; dispatches to the game's tables (ties to stat-storage decision). |

### Cadence + editor-count (the cost lever) — config-driven
- **Editor count:** the cron's hardcoded 5-editor array (cron/route.js:703) reads
  `config.editorial.editors`. DMZ launches with a subset.
- **Cadence:** `vercel.json` cron is global. Per-game frequency = **two cron
  entries** → `/api/cron?game=marathon` (`0 0,12`) + `/api/cron?game=dmz`
  (`0 0`, daily). Recommended over a single finest-cadence cron that self-gates.
  (Phase D — not Phase A.)

### Shared vs per-game line
- **SHARED (untouched behavior):** cron orchestration skeleton, `callEditor`,
  `verification.js` (already game-agnostic), the editor roster + voices
  (network-level personas, not game-specific), comments, the `[UNVERIFIED]`/
  3-state machinery, `alertEmail`, `formatDate`, the Gap-1 completeness/BBCode logic.
- **PER-GAME (config + a couple adapters):** source IDs, relevance tokens,
  `fetchGameContext` scoping, the patch-notes source adapter, dexter-stats wiki
  URLs + target tables, cadence + editor list.

---

## DMZ sources (knowable-now vs wait-for-launch)
| Source | Finding | Status |
|---|---|---|
| Steam | CoD ships on Steam; `steam.js` reuses as-is. Shared launcher app `1938090`, per-title appids (BO7 = `3606480`). MW4 appid unknown until ~launch. | Pattern known; **appid at launch** |
| Patch notes | callofduty.com/patchnotes + /blog (structured, fetchable) + Steam cross-post. Two adapters: Steam-news (reuse Gap-1) or `cod-blog` scraper. | Source known; **MW4 URLs at launch** |
| Reddit | **r/DMZ** (established MW2-era community) + r/ModernWarfare / r/CallofDuty. | r/DMZ known; **active volume at launch** |
| YouTube / Twitch | Standard query/game-id parameterization; exact terms tuned at launch. | Pattern known; **terms at launch** |
| Wiki / stats | CoD Wiki (fandom) + DMZ sites; community-sourced. | Sites known; **data post-launch** |
| Economy (Broker) | 3D-printer recipes/ingredients, FOB cash/upgrades, Gunsmith escalating-cost. **Values community-datamined post-launch.** | Systems confirmed; **values post-launch** |

**The architecture is 100% buildable now** — every unknown is a config *value*,
not a structural question (which is the point of the config pattern). Waits for
Oct 23: MW4 Steam appid, active subreddit + volume, YT/Twitch terms, relevance
tokens (Hajin places, MW4 weapon/operator names), economy/stat values.

---

## Phased plan
| Phase | What | Effort | Timing |
|---|---|---|---|
| **A — Generalize Marathon to config** | Lift every Marathon literal into `lib/games/marathon.js` + registry; refactor gather modules + `gatherAll` + relevance filter + `fetchGameContext` + cron editor-list to READ config, Marathon as the only game. **Hard gate: Marathon output byte-identical.** Additive, zero behavior change. | M–L | **Now** (long pole; no DMZ dependency) |
| **B — DMZ config + adapters** | `lib/games/dmz.js` (MW4 sources); generic per-game patch-notes adapter (`cod-blog` if not reusing Steam-news); DMZ relevance tokens. | S–M | Scaffold now; **fill values at launch** |
| **C — DMZ context/stats** | Decide storage (open decision); build DMZ-shaped stat tables; point `fetchGameContext` + dexter-stats at them. | M | Design now; **populate post-launch** |
| **D — Wire DMZ cron (reduced cadence)** | Per-game cron entry (daily) + DMZ editor subset; gated go-live. | S | At/after launch |
| **E — Broker debut (optional)** | DMZ economy gather feeds Broker; debut per the Broker scoping doc. | M | Post-launch (datamine) |

**Sequencing principle:** Phase A (refactor-to-config on the *working* game,
additive, no behavior change) BEFORE any DMZ — prove the generalization on
Marathon first (read-before-write / additive-first discipline).

---

## Open decisions (with leans)
1. **DMZ stat storage** — DMZ-specific tables vs shared-tables-+-`game_slug`.
   **Lean: DMZ-specific** (Gunsmith/3D-print/FOB ≠ shell/mod/core/Cradle;
   consistent with TABLE_INVENTORY Decision A).
2. **DMZ editor count at launch** — **Lean: 3** (e.g. NEXUS/DEXTER/GHOST),
   holding MIRANDA/CIPHER for scale-up.
3. **DMZ cadence** — **Lean: 24h/daily** at launch, scale to 12h with audience.
4. **DMZ patch-notes source** — **Lean: try Steam-news adapter first** (reuses
   Gap-1), fall back to a callofduty.com/patchnotes scraper.
5. **Broker debut at DMZ launch** — economy data confirmed; gatherability
   post-launch. Yes/no/when.
6. **Config location** — code module (recommended) vs DB table.

---

## Against the Oct 23 timeline
Phase A has months of runway and carries no DMZ dependency — start now; it's the
bulk of the work. B–D scaffold now, value-fill at launch (the config pattern
makes launch-day work "drop in the real appid/subreddit/tokens," not "build the
pipeline"). DMZ editorial goes live shortly after launch at reduced cadence,
scaling with audience. Broker follows once economy data is dataminable.
