# Patch-notes generalization (Gap 2 Phase B) — engine/adapter design

## Status
Locked design (2026-06-18). Read-only mapping of the `bungie.js` seam → a shared
patch-notes **engine** + per-game source **adapters**. Builds on
[GATHER_GAP2_DMZ_SCOPING.md](GATHER_GAP2_DMZ_SCOPING.md) (Phase A landed; the one
structurally game-specific module left is `bungie.js`, Marathon's patch-notes
path). No MW4 re-research here — this is the CODE seam.

## SHARED vs SPECIFIC inventory of `bungie.js`
| Piece | Classification |
|---|---|
| `fetchBungieNetNews(appId)` — RSS fetch + XML parse + **HTML-clean** → `{…, source:'steam-rss', notes_complete:false}` | **SPECIFIC** (steam-news adapter) |
| `fetchSteamNews(appId)` (in `steam.js`) — JSON fetch + **BBCode-clean** (`bbcodeToText`) → `{…, source:'steam-news', notes_complete:true}` | **SPECIFIC** (steam-news adapter) — but lives in `steam.js`, shared with miranda |
| **Merge** (prefer-fuller dedup by title, `isFuller`) | **SHARED engine** |
| **Sort** by date desc | **SHARED engine** |
| **Detection** (`patchVersionRe`, `patchKeywords`, 48h freshness → `is_patch_note`) | **SHARED engine** + **per-game RULES** (the regex/keywords are naming-shaped → config) |
| `formatBungieNewsForEditor` / `formatBungieNewsForTicker` | **SHARED logic, SPECIFIC label** ("OFFICIAL BUNGIE NEWS", 📡/🔧) |
| `author:'Bungie'` literal, `[bungie.js]` logs | **SPECIFIC framing** |
| Return shape `{title,url,date,contents,author,source,notes_complete,is_patch_note}` | **SHARED contract** (5 consumers) |

### Key correction
**Cleaning is PER-SOURCE, not shared.** Each source has its own markup — Steam
JSON = BBCode (cleaned by `bbcodeToText` in `steam.js`); RSS `<description>` =
HTML (cleaned in `bungie.js`). So cleaning belongs in the **adapter**, not the
engine. The shared engine is **merge + detect + format** only.

## The seam
```
lib/gather/patchnotes/
  engine.js              SHARED: mergeAndDetect(articles, rules, now=Date.now())
                         + formatForEditor(articles, label) + formatForTicker(articles, label)
  adapters/
    steam-news.js        PER-SOURCE: fetchSteamNewsSource({ appId }) -> normalized articles
                         (COMPOSES steam.js fetchSteamNews [JSON+BBCode] + the RSS fetch
                          [HTML clean]; does NOT move fetchSteamNews -- miranda shares it)
  index.js               registry { 'steam-news': steamNewsAdapter } +
                         gatherPatchNotes(config): select adapter by
                         config.sources.patchNotes.type -> run -> mergeAndDetect
```
- **Adapter contract:** `(params) -> [{title,url,date,contents,author,source,notes_complete}]` (NO `is_patch_note`).
- **Engine:** adapter output → merge(prefer-fuller) → sort → detect(rules)→`is_patch_note` → tagged array; plus the two label-parameterized formatters.
- **Config selection:** `config.sources.patchNotes = { type:'steam-news', appId, detection:{ versionRe, keywords, freshnessMs }, label }`. Registry maps `type`→adapter. Marathon's values = today's literals → identical.

## Byte-identical gate
The deterministic artifact = the returned tagged array (JSON) for a fixed input.
Two non-determinism sources exist **today**: `Date.now()` in the freshness gate
(→ `is_patch_note` is time-dependent) and the live Steam content. So:
- **Rigorous:** feed a **fixed captured fixture** (one real Steam JSON+RSS
  response) to both old (`gatherBungieNews`) and new (`gatherPatchNotes`)
  pipelines **with an injected fixed `now`**, hash the output arrays → identical.
  Hence the engine takes an optional `now` param (default `Date.now()`).
- **Integration:** a temporary write-free probe returning
  `JSON.stringify(gatherBungieNews(marathonConfig))` + sha, run **before/after
  back-to-back** (same Steam content, ~same clock). Removed after (Stage‑4 style).

## Adapter-count: steam-news ONLY now
The entire current source path is Steam (JSON + RSS). The steam-news adapter IS
the existing logic; nothing requires two adapters. `cod-blog` would be net-new
speculative code against a non-existent MW4 format. Per the scoping doc (MW4
likely cross-posts to Steam → DMZ may just need `{type:'steam-news', appId:<MW4>}`),
build **steam-news**, leave **cod-blog as a documented registry seam** for launch.

## Findings / risks (from the real code)
1. **Cleaning is per-source** (above) — adapter owns it, not the engine.
2. **`fetchSteamNews` is shared with miranda's dev-news** — the adapter must
   COMPOSE it (import), never relocate it, or miranda breaks.
3. **Detection regex is naming-shaped** (`/update\s+\d+(\.\d+)+/i` = "Update
   1.1.0.2") — fine for Marathon; DMZ rules differ → must be config, not
   hardcoded in the engine. (Don't design DMZ's rules now — just make
   `detection` a config field.)
4. **Bungie framing leaks into consumers** — `discord.js notifyPatchNotes`
   hardcodes `'New Bungie Update'` / `'https://www.bungie.net'` fallbacks;
   formatters say "BUNGIE". Route through config in **B3** (byte-identical for
   Marathon).
5. **`is_patch_note` feeds the cron patch-cycle** (`patch_key` dedup, regrade
   trigger) — detection semantics must stay identical for Marathon or the
   patch-cycle behavior shifts. The fixture gate covers this.
6. **5 consumers pin the contract** — `index.js`, `cron` (+`notifyPatchNotes`),
   `cipher.js` (`gatherCipher`), `discord.js`, and the public
   `app/api/bungie-news/route.js`. Keeping `gatherBungieNews` /
   `formatBungieNewsForTicker` / `formatBungieNewsForEditor` names + the article
   shape in B2 = zero consumer churn; renaming (B3) touches all 5.

## Stage plan
- **B1 — pure addition.** Create `engine.js` + `adapters/steam-news.js` +
  `index.js` (faithful extraction, NOTHING wired) + extend marathon.js
  `patchNotes` config (verbatim literals). Zero importers → zero behavior change.
- **B2 — repoint Marathon.** `gatherBungieNews(config)` becomes a thin shim to
  `gatherPatchNotes(config)`; KEEP the 3 export names + return shape (zero
  consumer churn). Verify byte-identical (fixture + fixed-now engine hash + live
  back-to-back probe). Remove the old inline logic once proven.
- **B3 (optional).** Route Bungie framing (labels, discord fallbacks, author)
  through config; optionally rename exports generically (touches all 5
  consumers). Byte-identical for Marathon.
- **DMZ adapter:** `adapters/cod-blog.js` registered under `type:'cod-blog'` —
  filled at launch, zero engine changes.
