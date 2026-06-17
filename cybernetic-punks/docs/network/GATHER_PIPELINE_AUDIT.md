# Gather / Ingest Pipeline — Audit (read-only findings)

## Status
Read-only audit (2026-06-17) of how information flows TO the editors before each
publish. No code changed. Informs two prioritized items: the patch-note ingest-quality
fix (Gap 1) and the DMZ per-game editorial expansion (Gap 2). Files:
`app/api/cron/route.js`, `lib/gather/*`, `lib/editorCore.js` (`callEditor`,
`fetchGameContext`).

---

## 1. Orchestration (cron -> publish, per cycle)
`app/api/cron/route.js` GET runs one pipeline:
1. **`gatherAll()`** (`lib/gather/index.js`) — fires all sources in parallel
   (`Promise.all`: YouTube, Reddit, Twitch, Miranda guides, Steam players/reviews,
   Bungie news), runs an off-topic relevance filter, then assembles a per-editor
   `userPrompt` for CIPHER/NEXUS/DEXTER/GHOST/MIRANDA plus a `_rawData` bundle. Also
   kicks the DEXTER stat-extraction sub-pipeline (`dexter-stats.js`).
2. **Cron appends per-editor blocks:** no-repeat recent headlines (read from
   `feed_items`, filtered `game_slug='marathon'`), patch-priority block (if a patch is
   detected), tier-state (NEXUS), directives (`editor_directives`).
3. **`processEditor` -> `callEditor`** prepends `fetchGameContext()` (read-only DB:
   weapons/mods/cores/implants/shells/factions/cradle/armory/maps/zones/bosses —
   Marathon-only) + an SEO keyword, calls the article model (Sonnet) tool-forced,
   normalizes, **inserts `feed_items` (`game_slug:'marathon'`)**.
4. **`generateArticleComments`** (other editors react, Haiku) -> Discord notify -> the
   end-of-run failure alert (lib/alertEmail.js) -> JSON response.

## 2. Per-editor sources (confirmed)
- **CIPHER** — internal synthesis (no external API): reads recent NEXUS/DEXTER/GHOST
  `feed_items` + Bungie news + game DB; archetype-driven; a detected patch overrides
  its weekly schedule.
- **NEXUS** — YouTube (filtered) primary + Bungie-news context.
- **DEXTER** — YouTube (filtered) primary + Bungie news; also drives `dexter-stats`
  (scrapes marathon.wiki.gg / marathon.gg + YouTube transcripts + Reddit + Steam
  reviews -> upserts the stat tables).
- **GHOST** — Reddit (r/MarathonTheGame) + Steam reviews + Twitch clip signal
  (titles/view-counts only, never clip contents) + Bungie news.
- **MIRANDA** — YouTube guide queries + Bungie devNews + stat tables (shell context).

**Failure handling — good for the EMPTY case:** every editor has a fallback prompt
("no external data this cycle -> write evergreen from the verified DB, do NOT fabricate
patches/shifts/quotes"). Sub-gathers are try/caught and degrade to `[]`. Off-topic
YouTube is filtered. A dead/empty source degrades HONESTLY, not into hallucination.

---

## 3. Per-game verdict: DESIGNED-ONLY for gather — Marathon-hardcoded end to end
Storage (`game_slug`) and display (roster + per-game config) are game-aware. **Gather
is not.** Every external source hardcodes Marathon:

| source file | hardcoded Marathon dependency |
|---|---|
| `lib/gather/steam.js` | `STEAM_APP_ID = '3065800'` (Marathon) -> players, reviews, AND Bungie news |
| `lib/gather/bungie.js` | Steam feed `app/3065800` |
| `lib/gather/reddit.js` | subreddit `'MarathonTheGame'` |
| `lib/gather/youtube.js` | `SEARCH_QUERIES` (Marathon terms) |
| `lib/gather/twitch.js` | `getMarathonGameId()` |
| `lib/gather/miranda.js` | hardcoded "Marathon ... guide" YouTube queries |
| `lib/gather/dexter-stats.js` | marathon.wiki.gg / marathon.gg URLs + "Marathon stats" prompts + r/MarathonTheGame |
| `lib/gather/index.js` | `isMarathonGameContent()` relevance filter |
| `lib/editorCore.js fetchGameContext` | Marathon stat tables |

**Correction to an earlier note:** the "~5 parameterization-pending 'marathon' sites"
(the `PRODUCING_GAME_SLUG` consts in cron/cipher/miranda + the cron writer literal + the
C2 `get_related_articles` caller) are **storage-scoping / dedup flips ONLY** — they do
NOT touch the source layer above. DMZ editorial needs a whole **per-game gather config +
real DMZ sources** (different subreddit, Steam appid, YouTube queries, wiki, relevance
filter), not a 5-line flip. There is **no per-game gather config today** (unlike the
per-game display config that does exist).

---

## 4. Input-quality gap (the 1.1.0.2 failure mode) — systemic, HIGH risk
**Root cause: patch notes are truncated at INGEST and the full article body is never
fetched.**
- `lib/gather/steam.js:27` — Steam news API called with **`&maxlength=600`**.
- `lib/gather/bungie.js:39` — RSS `<description>` **`.slice(0, 400)`**.
- `formatBungieNewsForEditor` feeds editors `a.contents` (<=400) for the 6 most-recent
  items.

So **every editor only ever sees a <=400-600 char blurb of any patch.** 1.1.0.2's full
notes (C.A.R.R.I. + Cradle XP rebalance + Folding Stocks fix + loot tuning) -> only the
C.A.R.R.I. lead fit in the blurb -> NEXUS confidently published "C.A.R.R.I.-only, no
stat changes."

**No completeness gate.** The pipeline gates empty-vs-present (and handles empty well),
but **partial/truncated is silently treated as complete** — a 400-char blurb is
"present," so no fallback fires and the editor writes with full confidence. The prompts'
THIN-SOURCE-HONESTY / `[UNVERIFIED]` rules only catch VISIBLE thinness; they cannot flag
content cut before ingest (you can't hedge what you never received). Not a one-off —
**recurs on every patch**, on the exact content users trust most. The 1.1.0.2 article
even hedged the one truncation it could see (the commendation bonus) — proof the editor
behaves well on visible gaps but is blind to pre-ingest truncation. **The fix lives in
gather (fetch/parse the full notes + a completeness signal), not in the editor prompts.**

---

## 5. Honest overall assessment + ranked gaps
As a single-game (Marathon) pipeline it is **better-orchestrated than feared** — clean
parallel gather -> per-editor prompt -> tool-forced generate -> publish, with real
defenses: per-editor empty-source fallbacks, off-topic filtering, patch detection
(version-regex + 48h freshness + fail-closed dedup), no-repeat dedup, no-bleed game
scoping, and `[UNVERIFIED]`/thin-source honesty rules. The empty-input path is honest.

**Gaps, ranked by risk:**
1. **HIGH — patch-note ingest truncation** (steam maxlength=600 + bungie slice(0,400),
   no full-body fetch, no completeness gate). Systemic confident-garbage-out on patches;
   the 1.1.0.2 failure; it WILL recur. Fix is in the GATHER layer.
2. **HIGH (for DMZ) — gather is Marathon-hardcoded end to end; per-game gather is
   designed-only.** The bigger DMZ blocker (storage/display are ready; inputs are not).
   Needs a real per-game source/config layer, not the 5 flagged flips.
3. **MEDIUM — no general sufficiency/completeness/staleness gate** (only empty-vs-present;
   partial = treated as complete). Gap 1 is the acute instance.
4. **LOW / known (parked) — verification debt feeds `fetchGameContext`** (~half the stat
   data unverified). Tracked separately in MARATHON_VERIFICATION_DEBT.md.

**Bottom line:** solid skeleton, honestly defended on the empty/off-topic/dedup axes —
but Marathon-shaped at the source level (DMZ needs a real per-game gather build) and
fragile on input completeness for patches specifically (truncated-at-ingest ->
confident-wrong, systemic). Both are gather-layer problems; editors + storage + display
are in better shape than the ingest layer.
