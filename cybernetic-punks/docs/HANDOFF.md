# Handoff / Session Notes

Running log of cross-session decisions, shipped changes, and parked work.
Newest entries on top.

---

## HANDOFF CURRENCY — standing convention

HANDOFF drifted twice on 2026-07-23 and needed retroactive catch-up both times. The cause is
**structural, not carelessness**:
- **DDL the operator runs leaves NO git trail** — Phase 0's four `DROP DEFAULT`s and the `SET NOT
  NULL` batch existed only in Supabase until a follow-up commit rescued them.
- **Long arcs invite "record it when the arc finishes"** — a reasonable instinct that fails at six
  steps.
- **Decisions made in planning never touch code, so nothing prompts a write** — the 65→60 gate
  alignment and the prune's shape-then-age refinement both existed only in conversation until
  explicitly rescued.

**THE RULE:**
1. **A HANDOFF entry RIDES IN THE SAME COMMIT as the work it describes** — not a follow-up commit.
   This makes it structurally impossible to land work without its record. Precedent: `8532c51`
   carried both the admin change and the arc entry.
2. **OPERATOR-RUN DDL has no commit to ride in**, so it is recorded in the NEXT commit that touches
   the repo, explicitly flagged as *"DDL, operator-run, no git trail."*
3. **A DECISION that changes a deferred item, a threshold, or an approach is recorded when made** —
   not when built. If it only exists in a planning conversation, it does not exist.
4. **When an arc spans several commits, each commit carries its own entry or extends the arc's
   entry.** The arc does not wait for completion.

**⚠️ OUTSTANDING DDL WITH NO GIT TRAIL (record per rule 2 in whatever commit follows it):** the
**twelve remaining `DROP DEFAULT`s** on `game_slug`, gated on the game_slug-arc verification —
**Phase 2:** `game_maps`, `game_zones`, `game_bosses`, `game_events`, `game_modes`, `meta_tiers`;
**Phase 3:** `core_stats`, `implant_stats`, `mod_stats`, `shell_stats`, `weapon_stats`,
`site_events`. When run, they MUST be recorded in the next repo-touching commit.

---

## 2026-07-23 — maps-family game-collision: migration PLAN (read-only investigation; not yet built)

Recorded per HANDOFF-currency rule 3 — a decision written when made, not when built. The plan is
approved-shape; nothing is applied.

### The audit's finding was OVERSTATED — corrected: the collision is THEORETICAL, not live
The multi-game audit called the maps collision a live hazard. Verified against the schema: it is
**latent**. Marathon's DETAIL layer holds **one** map (`cryo-archive` — the `maps` table's single
row); DMZ's maps would be `al-mazrah`/`hajin` (no slug overlap with Marathon's
perimeter/outpost/dire-marsh/night-marsh/cryo-archive), and there are **zero DMZ detail rows**.
**Nothing to collide with today.**

### The ENTITY / DETAIL split (audit hypothesis CONFIRMED)
`game_maps` (5 rows, `game_slug NOT NULL`) is the **game-aware entity/SEO layer**; `maps` + `map_*`
is the **game-blind detail layer**. Only the detail layer collides. `game_maps` is already N-ready
(from the game_slug arc). Asymmetry: `game_maps` has all 5 Marathon maps, the detail layer only
`cryo-archive` — the others are "game_maps-only for now" (`app/maps/[slug]/page.js:20`).

### NO CODE WRITE PATHS — the decisive difference from the game_slug arc
**Zero inserts/upserts/updates to any of the six** (literal or generic), and **none are in the
admin allowlist** — they are populated **entirely via the Supabase dashboard / manual SQL**. So
this migration needs **no write-path sweep** (the arc's hard part). Only the operator inserts, by
hand, and would supply `game_slug`.

### The LIVE collision surface is FOUR tables, not six
Read by the `/maps` routes: **`maps`, `map_attribution`, `map_reference`, `map_vaults`**.
- **`map_markers` (7 rows) has ZERO readers**; **`map_zones` (0 rows) is empty with zero readers.**
  **FLAG both as ORPHANED — dead data or an abandoned feature?** Their own question, not this
  migration's. (They get `game_slug` for family uniformity if we migrate all six, but nothing reads
  them.)

### THE SIX TABLES (schema facts driving the plan)
All six have a **surrogate `id` PK** (map_slug is NOT the PK), so adding `game_slug` is additive to
the PK. The 5 children carry `map_slug` with a real **FK → `maps.slug`** (they join by SLUG, not
id), so `maps.slug` is the unique natural key that changes.

### THE PLAN
1. **DDL — operator, NO GIT TRAIL.** `ADD COLUMN game_slug text` to the six, **nullable, NO
   DEFAULT** (do NOT repeat the `DEFAULT 'marathon'` hazard just removed). Backfill
   `game_slug='marathon'` on existing rows (all current detail data is Marathon). Then `SET NOT
   NULL`.
2. **Code — ONE commit, provable no-op.** Add `.eq('game_slug','marathon')` to the 5 game-blind
   reads: `app/maps/page.js:70` (the `maps` query) and `app/maps/[slug]/page.js:83-86` (maps /
   attribution / reference / vaults) + `:181`. No-op because every current row is Marathon — the
   filter changes nothing; assert by diffing fetched rows with/without the filter.
3. **DDL — operator, NO GIT TRAIL.** Unique constraint `maps(slug)` → **`maps(game_slug, slug)`**;
   the 5 child FKs `map_slug → maps.slug` become composite **`(game_slug, map_slug) → maps(game_slug,
   slug)`**.

### SEQUENCING NOTE — do steps 1 and 2 IN THE SAME SESSION
The read filter is the ONLY protection against the collision. Leaving a gap where the column exists
(step 1) but the filter does not (step 2) is exactly the window where a seeded DMZ map would leak
into a Marathon page. Run step 1's DDL and land step 2's commit together.

### TRIGGER, not a date
This must land **BEFORE any DMZ map detail row is seeded** — not "by end of August." The trigger is
**seeding DMZ map detail, whenever that happens**. Until then, urgency is low (no overlap, no DMZ
detail rows).

### Steps 1 and 3 are operator DDL with NO GIT TRAIL — record per rule 2 in whatever commit follows.

---

## 2026-07-23 — games registry UNIFIED (single throwing getGameConfig; +status/launch_date)

Closed the multi-game audit's two-registries finding. Three commits (B → A → C).

### The audit's "opposite contracts will break callers" was LATENT, not live — CORRECTION
The audit flagged **two `getGameConfig` with opposite miss-contracts** (`index.js` throws,
`registry.js` returns null) as a caller-breaking conflict. Verified at the source: **it was not a
live conflict.** All **14** external callers used `index.js`'s throwing version; `registry.js`'s
null-returning `getGameConfig` had **ZERO external importers** (it was a private helper for
`getGameSection`), and `GAME_REGISTRY` was imported by nobody (one stale comment). So unification
was **pure deletion with a provable no-op** — **no behaviour-change commit was needed**, because
nobody consumed the null contract. The risk was a future mis-import, not a current dependency.

### B — single registry (`2e7b2d3` + `5b60c9d`)
Deleted `lib/games/registry.js`; moved `getGameSection` into `lib/games/index.js` with a membership
guard (`!g || !g.sections` — `marathon.js` has no `sections`, so `!g` alone would have thrown on
`.find`). Repointed the 2 dmz route imports; fixed a stale `rootGames.js` comment. No-op proven: all
7 dmz sections identical old-vs-new, `getGameSection('marathon', …)` → null (not throw), unknown
game → null.
- **STAGING INCIDENT (recorded honestly):** the commit's `git add` listed `registry.js`, already
  `git rm`'d — git **aborted the whole `add` on the bad pathspec and staged nothing else**, so
  `2e7b2d3` pushed with **only the deletion** (routes importing from the deleted file, `index.js`
  without the export → main broken). Caught from the **wrong file count** ("1 file changed" for a
  4-file change); repaired in `5b60c9d`. Vercel's keep-last-good-deploy meant **production was never
  at risk** (a failed build is discarded, not deployed).
- **CONVENTION IT PRODUCED:** **assert the staged file count matches the intended change BEFORE
  push, not after.** Stage only files that exist (never a `git rm`'d path in the same `add`). Used
  on A and C — both asserted 2/2 pre-push.

### A — unify the display-name field (`b5db2bf`)
`dmz.js` top-level `label` → `displayName` (value identical, `'DMZ'`); the single reader
(`rootGames.js:87`) repointed. The **collision argument dominated** the reader-count tiebreaker
(`displayName` 0 readers vs `label` 1): `dmz.js` already uses `label` for its per-section entries,
so a top-level `label` would overload one word for two concepts in one file. No-op proven.

### C — status + launch_date, additive (`d1efd61`)
`status` (`'pre-launch' | 'live' | 'maintenance'`) + `launch_date` on both configs. **marathon:
`live` / `null`** (no Marathon launch date is recorded in the repo; the kill clock uses launch_date
only for pre-launch games, so a live game needs none — null over an invented value). **dmz:
`pre-launch` / `'2026-10-23'`** (promoting the prose comment to a field). A **three-concepts** note
extends dmz.js's do-not-re-merge reasoning: status (lifecycle) ≠ indexable (SEO) ≠ launched
(live-player features) — a game can be indexable while pre-launch (DMZ is now), and 'maintenance' is
a live-but-winding-down state neither boolean expresses. Zero readers (grep) → zero behaviour
change.

### STILL OPEN — consumers unwired by design
The GSC kill line, the launch countdown, and generation/effort gating that will **read**
`status`/`launch_date` are **separate later commits** (per the plan's constraint — no consumer
wiring in this arc). `marathon.status='live'` is the data that fixes the current
`config.launched === undefined` falsy-for-a-live-game bug **at the point a consumer reads it**.
**`marathon` moves to `'maintenance'` ~Sept 2026 — change the field then.** Also still open from the
multi-game audit: the sixteen-table hazard was Phase 0/1'd (game_slug arc); ENTITY_TYPES extension,
DMZ vocab seeding, HEADLINE_RULES/persona parameterization, dmz.sources, and VANTAGE attribution
remain (see `docs/MULTI_GAME_READINESS_AUDIT.md` §3).

---

## 2026-07-23 — /intel prune Phase 2 APPLIED: 141 news-shaped dead pages noindexed

Phase 2 of the /intel de-index prune. The **532 indexed unique low-reach** pages (the §4 edge
pile) were bucketed by ARTICLE SHAPE, then shape-specific age windows applied. Candidate doc:
**`docs/intel-prune-phase2-candidates.md` (committed `c1e6ea0`)**.

### APPLIED — 141 pages set `noindex=true`, one guarded batch
**129 STRICT** (all 3 shape signals agree NEWS, or facet-absent + editor + headline agree) **+ 12
LEAN** (editor+headline NEWS despite an absent/unreliable facet), all: indexed, ≤1 impression,
unique (not in any cluster), news-shaped, **>60 days old**, NOT protected.
- Recompute-and-refuse guard: re-derived the set at write time, matched the approved 141 exactly,
  then wrote. Total noindexed **680 → 821** (delta **+141**, no over-reach). All 141 still
  `is_published=true` with bodies intact — **noindex, NOT delete**. Cluster-winner overlap 0
  (structurally impossible — unique set — asserted anyway); protected overlap 0.

### REVERSE OPERATION — the only practical undo (141 UUIDs; you cannot eyeball these)
```sql
UPDATE feed_items SET noindex = false WHERE id IN (
  'f7b8c852-98c2-4acb-9682-c6bd17b7a8e1','bfc480f6-f9ea-4fe9-aabb-750edac6a469','abb9fc6f-42ec-40e9-93c5-258fd6104587',
  'eeb38f23-382e-4fb4-9738-ecf050919c24','0f19ad87-4170-4e5b-bb50-4ac6b6b43891','5b9d3c7e-acc4-40de-8799-2fdbeaeea9b3',
  '6ae60de6-7284-45cc-b966-02e5d3301358','e4ed6d2d-5269-4639-8d7d-d20e38ba2993','f9da152e-e5e6-46f4-9c4b-0e1882e9f488',
  '1eaba451-fd8c-403a-a1a9-658b6a2e268d','0b947a35-c71a-448d-add4-6c2c8d07c867','7259b673-8ee7-4b8c-a00b-c4fee1129977',
  'f81b204f-d84c-41b0-86dc-c72bf75ab0cb','603b6e93-f16f-4b2e-ad03-f59f68723ef3','0c8d6864-11e2-45bb-a25b-15b5c4e99596',
  '6e591a0e-306d-4f34-8272-193fb23a8bae','64021f5d-d823-40e5-8fa2-065e5f8b7551','1336cc98-c919-4a91-aaee-d3a07c0257dd',
  '9d506553-b83f-4689-8677-7eec5c4f7e4a','3f3926b0-f9d0-4ae1-9f8d-58616d2eebf3','fe5e7a1c-83e5-4bfe-836d-dc6cb20747aa',
  'c635c12a-7d8e-4f92-a3f6-8fa84dcede9b','8cbe6904-a3c8-4cbd-8ab1-ccce3a73f55f','4773b552-e31a-4a97-b58b-dc684c039b82',
  '13490730-3830-4bc8-92bf-e2405d50f9a0','bd43b555-d391-4a6b-89d6-06b2fc2eb909','5c564f27-6dc1-41fa-ba95-3ef46d93b5e5',
  '914fa3e1-be15-48e1-a376-a466d82028ba','988e3600-a128-44f9-adeb-9b39e70bbc52','03b2c326-d52e-4609-9094-8471052ae581',
  'a5a89925-c4d8-48bd-8ee8-5350f00181db','a94717e7-5e52-4bf9-b4a7-facd0cec0982','971f3cd4-955f-42ab-8fb3-e473e6b260f0',
  '98235292-4c40-4335-a71f-560f59ddaf7b','c7aae8f8-e1ed-48d8-9e34-2d617602f832','5516965b-4047-4940-8c00-3c649599fb23',
  '2be53ee9-cbe0-4eb0-809d-a285c82fe573','c269a581-ff82-4f3a-80a4-6f3c368859a4','1ba55769-3527-4de5-8561-fd4440c82bbe',
  '1069258a-c9b8-4818-aa5b-7af70cac1299','8f1192ac-0285-458d-9272-2fc593f3ed5e','604c921b-2f5e-4861-8f92-96ea1ab41dc1',
  '368f0adc-c391-44c1-b224-52b694c38714','06bbf9d1-42ab-4c52-80e8-00b2c2a85b63','3446c973-02ac-4420-9230-cdaddcf71ed0',
  '2eccc8bf-1a76-4532-bc63-f68168f22df8','30b30549-4611-47ea-b78e-9000e40c436b','59679d11-7758-43aa-9298-79b120b6853c',
  '778bf41b-28e8-4599-b517-dfc92850a30b','aefba375-fa12-4e43-a824-d4a48661ed5d','c22dd92b-a149-426e-80ce-3076eb626f5f',
  'a0a08705-316d-4f62-9b76-1f26ba1ba8ff','54e7a0a4-9b3b-485e-9db1-21a03b22416a','f22067c9-1477-451f-b868-db650317be8f',
  '4111e079-f165-411d-8cdb-2f5fee6c91a3','8c29ed4c-c496-4905-8a41-476f488b1444','9b2531a7-204f-4fbe-9299-a35954d5edc1',
  'bd818125-39a5-429c-8852-c99bb821eab1','a206a163-613f-40ec-8a06-6d45c39469c1','9a48f11e-23f3-4f52-9f1b-fcbd85502343',
  '11911720-aef9-432f-9184-7771ff3c7e59','ea86f725-e231-468c-9490-5eab092a2224','69ca3f13-f4e6-4a9d-a031-f92d04587085',
  'f69e50fc-2d71-41bf-8bd8-4c99c6abf0a7','4abf8266-e176-48c4-bbd6-a300cfbf3cc7','9f258e87-d5a4-4dd7-a937-aadac10371a5',
  '9f0eb30c-cd72-4714-9a75-d17ecd584696','25d2063f-71d3-40d2-b9e0-4f83c04d20cb','09a4a36c-51f1-4dd3-8785-dd43708a0e7d',
  '679bdd5d-79d0-43be-bd53-0932d08b3b74','e647a0da-8d63-41c7-bc91-bffb42477649','3221b0d8-e7d2-4015-a5d0-0598dcd9aede',
  'bc9a3ebb-137a-48f1-921d-a18f6c31490b','5f694a3e-15f8-437f-8f24-6f603b11cf3f','2ad1f149-9479-4d44-9a9d-46121a252e3d',
  '21103670-d00f-4dfc-8331-3a9d0470414a','16707547-eaeb-4108-a76b-0c4bc7caa184','fd78f62f-2428-42a5-b4f4-d7ca564848a5',
  '12cc966a-e23c-4b4f-9586-2256d0475950','629cf6fc-a20d-42ca-8f45-b92d4d56e132','01f28e68-dc88-49a7-9826-5b8260011c14',
  'bb870595-fab2-464f-b538-b06d2592e8f7','71582ae6-f76c-4dba-ae78-dcbcc192b910','599c50ec-7e92-4ad1-b250-1b858276c843',
  'a3aa6478-4243-469f-b02a-e57d06461935','9cfc04fd-6471-418b-b243-562ac3e35a06','8bd00efe-4252-4a3d-a4fb-80b69746adaf',
  '3166527d-2897-472d-b734-e299d42cda9c','c0794686-6929-42dc-96e4-51cad27c083c','02530e0a-b65c-4020-b571-594ca67b45ab',
  'f37c6153-f5ed-41f6-b7cb-4f69a07dae78','696b8f8e-df8b-441e-b340-0705e6a2043b','f78f9c22-4f1e-4450-9f98-ed29374d7df7',
  'e4dc01be-c6e8-42a0-8d34-6c2bd1a1a177','84f27e83-37f6-4294-8625-44c2b526ec86','f7a3bacd-a938-4612-b069-29cd48741645',
  '41915991-9642-4871-97f9-78296417261a','118587fa-4d0d-4d3c-842e-dda8644c16b5','be6cb39c-df42-45bd-b3ff-f60ff8e1f12d',
  '0ef2bad8-2400-407f-a00f-25eba7f9e326','cefe9963-f316-4a31-8c44-236838a28b94','c83c71cd-5a8a-4a24-9809-5c967b3bfcef',
  'ecaa1bf8-02fc-47e1-8eaf-12fd70f6f6c7','2393e94d-1a47-490e-96cf-21b53dbf4322','8f0bb796-e112-4eb9-b9b6-5fda6c4f58c5',
  'cd49aa79-2963-49eb-bbe1-44ff07fbe717','340b0887-5bfc-46b8-8426-66401c340026','b9a475af-58de-4d9f-855e-5da277a3444a',
  '474553fa-b4d9-4653-a7d8-ae6e24d5d0d0','7183584e-f417-420c-a66d-79b5e91d5549','ddf7d122-06c3-4aca-8c44-509f645b85ad',
  '28d0ecb4-c526-4f8b-8cab-c4c15a1a0de5','fe437f28-ceff-4eb7-8615-c29bea77f7cd','e6ecb163-8199-4751-9c0a-5a604da83ec4',
  '90761e7b-ab43-4bc5-9d96-8c29e21eb59d','3ad69f1f-d7c0-4244-a35a-84698a926ba3','4b756c53-ea99-49d7-a75d-efa404e5b2a3',
  '04173f62-7779-449e-aa6a-f886b37b89be','e59eb450-2049-45ba-814a-e7969b259f82','d91a3e5a-fa6b-48b1-a638-72436322d4f4',
  'e4b55b59-c11d-4a28-b9f2-2926222d13f0','3d78e445-2965-4d80-889a-5e3f42fb255a','63eaa5cb-bb38-4810-b719-a008e776d34b',
  'd2fb8847-a249-4b4b-888d-a4a43ba543f8','759df7f9-15bc-4e78-9ef5-d5dbeebd9354','cb9a4377-fe05-47a2-8c62-e4ae93682b41',
  'd2d87cd6-4a05-4ec3-a2a5-1568a2744c9c','1df0c8ad-9b1b-4d58-8174-f1267843d3dc','16006f73-f596-44b9-93f0-1ea03b953167',
  '1c33174f-779a-4b27-be3c-bd3cc5607b19','5cb9d31e-ded2-4828-8095-dc70748147db','5e3130b1-c9ab-4371-b608-a248f379bb4f',
  '2a534c46-e931-42c2-b395-d89d21da1fbe','ebdc3a25-daff-4348-8827-ddab309b0ad8','85f052e2-5270-4647-8587-b4fe690cad2a',
  '8d89075f-3e7a-4134-92f0-fc42337b6a71','d1bdc7ad-3c0a-4c5c-9847-96ee1bfe358f','3cd2b985-ef93-4820-8c35-f6c3624676c3',
  '824ff58c-b9d0-43ca-ba0c-7fa3e1c2c188','d4edd9e0-be39-4851-86b3-89246ad8f979','8551e4ce-299a-4047-a149-f9b443f48907'
);
```
For a single page, use just its id in the `IN (…)`. Fully reversible; noindex, not delete.

### FINDING 1 — the 4.6-month hypothesis CONFIRMED; Phase 2 is entirely news-shaped
Oldest edge page is **138d**; **nothing exceeds the ~5-month evergreen window**, so **CUT —
evergreen = 0**. No reference/guide content was cut because **none has had its fair ranking chance
yet at DA ~23** (evergreen ranking routinely takes 4–6 months). Phase 2 is news-shaped by
construction — time-bound articles that had their days-to-weeks window and missed.

### FINDING 2 — the shape signals disagree for the majority (317/532), STRUCTURALLY not a bug
- **73% of the edge set is UNCLASSIFIED** (387/532) — `deriveTuple` returns no facet, so the
  strongest signal is ABSENT for most pages.
- **The facet→shape mapping BREAKS for `tier`/`build`** — patch news is routinely framed as a tier
  or build piece (*"Update 1.1.5: Patch Impact on Rook, Sentinel"* → facet `tier`, but it's news).
- **Editor + headline are the reliable pair; facet alone cannot drive this.** Hence the two-tier
  cut (STRICT 3-signal, LEAN editor+headline).

### THE 334-vs-299 RECONCILIATION (an unexplained count is not acted past)
The judgment breakdown `42 (facet-vs-headline) + 93 (CIPHER-unclassified) + 199 (unclassified +
indeterminate) = 334` vs the JUDGMENT bucket **299**: the three categories **overlap** (17
double-counted → 317 distinct non-confident rows), then **12** were pulled into LEAN_NEWS and **6**
are protected. `317 − 12 − 6 = 299`. Fully closed; does not touch the cut (129 + 12 computed
independently).

### STILL OPEN
- **JUDGMENT (299) and HOLD (82) untouched — Phase 3.** JUDGMENT needs human eyes (concentrated in
  the >60d rows; the ≤60d ones are parked in-window regardless). HOLD is recent, inside its
  fair-chance window.
- **MEASUREMENT CLOCK: 3–4 weeks MINIMUM** before the impressions-rise test means anything — Google
  processes noindex across recrawls over weeks, not instantly. Do not read the curve before then.
  (Same caveat as Phase 1; and per the GSC strategic finding, the growth lever is entity/tool
  pages, not pruning low-reach articles — this is housekeeping.)

---

## 2026-07-23 — game_slug DEFAULT removal, Phases 0–1 (the arc had no git trail; recorded now)

Running since `22072c6` with nothing recorded, and the DDL steps leave **no git trail at
all** (operator-run in Supabase). Captured here.

### 1. THE HAZARD
Sixteen tables carried `DEFAULT 'marathon'` on `game_slug` — an omitted `game_slug` on insert
**silently became Marathon**. Two shapes: **ten NOT NULL + default** (dropping the default is a
clean silent→loud conversion: omission then ERRORS) and **six NULLABLE + default** (dropping the
default alone yields NULL — still silently wrong; needs backfill → SET NOT NULL → DROP DEFAULT).
Full list + the direct `information_schema` read that found it: `docs/MULTI_GAME_READINESS_AUDIT.md`
§B (corrected `22072c6`).

### 2. PHASE 0 — DDL, operator-run, NO GIT TRAIL
Dropped the default on **`cradle_nodes`, `faction_armory`, `faction_upgrades`, `unique_weapons`**.
Safe immediately: the write-path audit found **NO code write path** for any of the four
(dashboard/SQL only). All already NOT NULL, so an omitted `game_slug` now ERRORS.

### 3. SET NOT NULL — DDL, operator-run, NO GIT TRAIL
Applied to **`core_stats`, `implant_stats`, `mod_stats`, `shell_stats`, `weapon_stats`,
`site_events`** (the six nullable).
**WHY THE ORDERING MATTERED:** `required` in the admin form is **COSMETIC** (established in d2 —
37 uses, one consumer, appends `' *'`, does **NOT** block submit). So a blank `game_slug` select
becomes an **explicit NULL** via `formDataToRow`, and Postgres does **not** apply a DEFAULT when a
column is explicitly null — the five nullable stat tables would have inserted NULL, a **NEW**
silent-wrong worse than the default. `SET NOT NULL` closed that window **BEFORE Commit B opened
it**. Zero-risk at the time: 0 NULLs (verified), default still fills omissions, only explicit nulls
rejected. *(This corrected a wrong claim in the Phase-1 plan that "required forces the pick" — it
does not.)*

### 4. THE WRITE-PATH AUDIT — four paths, no fifth, and the GREP-LIES hazard
Only **four** code write paths touch the 16: the admin generic insert, the cron `meta_tiers`
upsert, the two cron `site_events` inserts, and the wiki gather upsert. Independent re-verify found
no fifth.
**METHOD NOTE — the vacuous-pass hazard in a new form:** a naive single-line grep reports **zero
inserts for 15 of the 16 tables**, because `meta_tiers` chains `.from()`/`.upsert()` across lines,
wiki writes through a generic `upsert(table, records)` helper, and admin uses a **variable** table
name. **Verification must read the CONSTRUCTION SITES, not pattern-match call sites.** Same family
as the keyword build's "0 disagree with 0 functions extracted" — a grep that finds nothing is not
proof of nothing.

### 5. COMMIT A — `7e7be2e` — three automated fixes
`metaRows` (cron `meta_tiers`), both `site_events` cron inserts, and the wiki upsert helper now set
`game_slug` explicitly.
**The wiki decision:** literal `'marathon'`, **NOT `config.slug`** — `WIKI_URLS` is hardcoded to
the Marathon fandom, so everything the module scrapes is Marathon by construction; `config.slug`
would be correct only by coincidence and would **mislabel** a non-Marathon gather. Becomes
`config.slug` when `WIKI_URLS` goes per-game. Reason named at the point of temptation (same pattern
as the `game_maps.slug`-unused comment). **Flagged in the multi-game audit (§A) as a DELIBERATE
hardcoded reference with a recorded reason**, so a future audit does not re-flag it as drift.

### 6. COMMIT B — this commit — admin `game_slug` select on 10 schemas + sticky
Added an explicit `game_slug` select (`options:['marathon']`) to the 10 admin-editable defaulted
schemas (`weapon_stats`, `shell_stats`, `mod_stats`, `core_stats`, `implant_stats`, `game_maps`,
`game_zones`, `game_bosses`, `game_events`, `game_modes`) + `game_slug` in `STICKY_FIELDS` for each.
**Why (a)+sticky over (b) or (c):** **(c)** a server-side per-table default map recreates the same
silent-wrong, relocated from DB to API; **(b)** an ambient game switcher means a forgotten switcher
state misattributes every subsequent row — the hazard reappearing at the UI layer; **(a)** makes
the game **explicit at the point of entry** — the `verified_source` principle (the fact and its
attribution are one UI act). Sticky precedent: `editor_directives.editor` is already a sticky
select. `options:['marathon']` is minimal-and-correct; it extends (registry-driven) when DMZ entity
rows are seeded. No `buildFormDefaults` default — that would relocate the silent default into the
UI, the exact hazard being removed.

### 7. STILL PENDING — GATED on A + B deployed and verified (one clean cron cycle)
- **Phase 2** — DROP DEFAULT on the ten NOT NULL: `game_maps`, `game_zones`, `game_bosses`,
  `game_events`, `game_modes`, `meta_tiers` (the other four dropped in Phase 0).
- **Phase 3** — DROP DEFAULT on the six now-NOT-NULL tables (backfill was a no-op; SET NOT NULL
  done in step 3, so this is just the DROP DEFAULT).
- **Out of scope, tracked separately:** `x_sources` positional attribution — `SET NOT NULL` would
  lock in "must have *a* game" without fixing "the *right* game" (that is the VANTAGE §I design
  fix, not a default-drop); and `email_signups`' dormant `'dmz'` default (both writers explicit
  today, nothing relies on it).

---

## 2026-07-23 — MULTI-GAME READINESS AUDIT (read-only) → `docs/MULTI_GAME_READINESS_AUDIT.md`

Exhaustive read-only audit of what breaks when the network serves a second game (DMZ, Oct 23)
and beyond — **design for N games, not 2**. Verified every hypothesis at file:line or with
DMZ-shaped data (ran `loadVocabulary('dmz')`, `entitySlugFor` on DMZ names, `deriveTuple` on DMZ
headlines, a PostgREST OpenAPI schema dump of all 80 tables). Full seam inventory (classified by
degradation mode / track / due bucket / depends-on / fix size / generic-for-N), dependency graph,
dated readiness list, positive findings, doctrine-vs-code conflicts, and a separate
Decisions-Required list live in the doc.

### §E URL answer (the GSC-blocking one)
**A URL determines its game by prefix: `startsWith('/dmz/') ? 'dmz' : 'marathon'`.** Ready to
build the GSC schema on now. **The GSC schema MUST compute and STORE `game_slug`** from that rule
— tool/entity pages (`/leaderboard`, `/stats`, `/shells`) never join `feed_items`, so a join
cannot attribute them. The "else → marathon" clause bakes in root-namespace asymmetry that forces
a decision at game three (decisions list, not a blocker).

### Three SILENTLY WRONG findings (the hazards)
1. **`DEFAULT 'marathon'`** on the stat tables (`weapon_stats`/`shell_stats`/`mod_stats`/
   `core_stats`/`implant_stats`), `site_events`, AND the `get_related_articles` DB function — a
   forgotten `game_slug` on insert silently becomes Marathon. Dropping it (batch B2) turns SW→ERR.
2. **The six maps tables collide on `map_slug` with no game filter** — `/maps/[slug]/page.js:83-86`
   queries `maps`/`map_attribution`/`map_reference`/`map_vaults` by slug only; a DMZ map sharing a
   slug returns Marathon's zones/vaults. (Entity layer `game_maps`/`game_zones`/`game_bosses` IS
   game-filtered; the detail layer is not.)
3. **VANTAGE X attribution is POSITIONAL, not content-derived** — `c.game_slug = slugs[g]` from the
   loop, guarded only by relevance tokens Marathon and DMZ SHARE (exfil/extraction/loadout/meta).
   Sharpest silent-misattribution point; **fix before the X pipeline goes to production** (it is
   dry-run-only today).

### Registry finding (worse than hypothesized)
**TWO `getGameConfig` functions with OPPOSITE contracts:** `lib/games/index.js` throws on miss and
has both games; `lib/games/registry.js` returns null on miss and has DMZ only. Same name, opposite
failure mode and game set. **No `status` enum and no machine-readable `launch_date` anywhere** —
the doctrine's kill-clock cannot be driven from config; the launch date lives in a comment
(`dmz.js:31`).

### TWO PREMISE CORRECTIONS (same discipline as the keyword build's ~8)
- **(a) `loadVocabulary` is NOT broken.** It is correctly game-parameterized (queries by
  `game_slug`); `loadVocabulary('dmz')` returns empty ONLY because no DMZ entity rows are seeded
  (verified live). The blocker is **ENTITY_TYPES extension + seeding DMZ data**, not a code fix —
  and DMZ classification fails **graceful** (fail-open → unclassified → publish pass 1), not loud.
- **(b) The KD cap does NOT exist in code.** `findKeywordTarget` never selects `difficulty`
  (`keywordFraming.js:91-101`); KD is human decision-support only. It cannot fork per-game because
  there is nothing to fork — it is operator discipline, not an enforced constant. (Corrects the
  "per-game thresholds must not fork the KD cap" premise: no cap to fork.)

### Size — honest
~12 pre-Oct items, **6 of them real builds** (registry unify + status/launch_date; maps
`game_slug` migration; ENTITY_TYPES extension + DMZ entity seed; HEADLINE_RULES + EDITOR_PROMPTS
persona parameterization; `dmz.sources` + a `cod-blog` patch adapter; VANTAGE content-attribution).
They interlock and land into the **Sep-22 Season-3 / ~Sept Marathon→maintenance squeeze** — §3 of
the doc sequences them around it.

### Positive findings worth carrying
Keyword system holds (all game_slug NOT NULL no-default, matcher per-game, `entitySlugFor`
portable); `get_related_articles` is game-scoped (internal linking can't cross games); network-root
JSON-LD is correctly game-neutral; VANTAGE self-skip is a real, consistently enforced precedent.
*(The earlier "`game_maps`/`game_modes`/`game_events` confirmed generic, `weapon_stats` REFUTED"
line was WRONG — see the CORRECTION block below; all four carry `DEFAULT 'marathon'` and the
"generic" verdict is now UNRESOLVED.)*

### ⚠️ CORRECTION 2026-07-23 (post-`3bf880c`) — the direct information_schema read landed
The operator ran the DB-side `information_schema.columns` query the audit had marked
OPERATOR-SUPPLIED. It **broadened and contradicted** the OpenAPI-derived findings. The audit doc
(`docs/MULTI_GAME_READINESS_AUDIT.md`) is corrected in place; recorded here too:

- **`DEFAULT 'marathon'` is on SIXTEEN tables, not the ~7 code comments implied:** `core_stats`,
  `cradle_nodes`, `faction_armory`, `faction_upgrades`, `game_bosses`, `game_events`, `game_maps`,
  `game_modes`, `game_zones`, `implant_stats`, `meta_tiers`, `mod_stats`, `shell_stats`,
  `site_events`, `unique_weapons`, `weapon_stats`. **Two hazard shapes, different fixes:**
  - **TEN NOT NULL + default** (cradle_nodes, faction_armory, faction_upgrades, game_bosses,
    game_events, game_maps, game_modes, game_zones, meta_tiers, unique_weapons) → `DROP DEFAULT`
    makes omission ERROR. Clean one-step silent→loud.
  - **SIX nullable + default** (core_stats, implant_stats, mod_stats, shell_stats, weapon_stats,
    site_events) → dropping the default alone yields NULL, still SW. Needs **backfill → SET NOT
    NULL → DROP DEFAULT**.
- **Positive-finding contradiction, recorded UNRESOLVED:** the first pass called
  `game_maps`/`game_modes`/`game_events` "generic (NOT NULL no-default)" from the OpenAPI
  `required[]`; the direct read shows they carry `DEFAULT 'marathon'` (they're in the NOT-NULL ten).
  The two methods disagree; the OpenAPI `required[]` is not a reliable default-detector. "Generic"
  may have measured *read*-side parameterization (`loadVocabulary` filters by game_slug — real and
  separate) but the flat "safe" verdict is withdrawn. Direct read wins on the default question.
- **Two findings the first pass MISSED:** `x_sources.game_slug` is **NULLABLE with NO default** — X
  sources can carry no game attribution at all, compounding the VANTAGE positional-attribution
  finding. `email_signups.game_slug` **DEFAULTS `'dmz'`** — the mirror hazard: a Marathon signup
  omitting game_slug is silently tagged dmz.
- **The NINE tables doing it RIGHT (NOT NULL, no default — direct-read ground truth):** `build`,
  `coverage_registry`, `feed_items`, `game_profile`, `historical_context`, `keyword_match_log`,
  `keyword_targets`, `meta_tier_snapshots`, `quality_metrics`. This is the `keyword_targets`
  pattern — proof it works when applied, and the template for the 16-table remediation.

### OPERATOR-SUPPLIED gaps — status
- **DB-side `information_schema` read: ✅ CLOSED** (see the correction above; the real read
  broadened the finding beyond what code comments suggested).
- **Vercel cron runtime — STILL OUTSTANDING.** No `maxDuration` set anywhere in code or
  `vercel.json`; actual wall-clock / whether a two-game parallel batch fits the function limit lives
  in Vercel logs, unreadable here.

---

## 2026-07-23 — keyword system SEEDED (no longer inert); admin discoverability; /intel prune Phase 1 LIVE

Follows the 2026-07-22 keyword build entry below — **does not repeat it**. Post-`6e92fc0`
material only: the first live keyword, the admin fixes that made it enterable/visible, and
the /intel de-index prune (Phase 1 applied and verified end-to-end; Phase 2 parked).

### 1. THE FEATURE IS SEEDED — the first keyword is live

The operator seeded **one** `keyword_targets` row, so the framing pipeline is **no longer
inert**: the next published article that classifies to this tuple will be reframed.

- **`marathon assassin` → `shell / assassin / build`**, game `marathon`, volume 590, KD 30,
  intent informational, `studied_at` 2026-07-22, `is_active=true`, `match_count=0`.
- **The facet was chosen from real article tuples, not guessed.** Read-only pass over 90
  published "assassin" headlines: 78 classify to `shell/assassin/*`, facet distribution
  **build 42 (54%)** · tier 14 · guide 11 · counter 10 · news 1. `build` is the plurality,
  so a `build`-facet keyword matches the most Assassin content.
- **A facet-less keyword cannot match** — `deriveTuple` always emits a facet, and the matcher
  requires exact equality on all three tuple columns; a NULL-facet row is a page-gap input,
  never a matcher input. Recorded so future seeds carry a facet.
- **`entitySlugFor('shell','Assassin') = 'assassin'`** (trim+lowercase) — the form validates
  against `assassin`/`destroyer`/`recon`/`rook`/`sentinel`/`thief`/`triage`/`vandal`.

### 2. ADMIN DISCOVERABILITY — three small fixes so the tab is findable and rows read right

The `keyword_targets` admin surface shipped in (d2) but was unusable in practice:

| commit | fix |
|---|---|
| `f6ca49b` | **surface the tab** — it existed (added by d2) but was labelled `KEYWORDS` and sat 13th of 21 in an `overflowX:auto` strip, clipped off-screen. Relabelled **`KEYWORD TARGETS`** and moved to position 2 (after DIRECTIVES). One existing array element moved — asserted still exactly one entry, not a duplicate. |
| `16c0755` | **row label** — the generic list renderer was `row.name || (row.shell_name + ' -- ' + row.stat_name) || …`; for a table without those columns the concat coerced two `undefined`s to the truthy string `"undefined -- undefined"`, short-circuiting the fallback. Added `row.keyword` and guarded the concat (`shell_name && stat_name ? … : null`). General fix — stat tables byte-identical, asserted. |
| `ebcaf9f` | **add-row scroll** — `startAdd`/`startEdit` called `window.scrollTo({top:0})`, yanking to page top. Replaced with `scrollIntoView` from a `useEffect` keyed on the form-open state (inline would no-op — the form isn't in the DOM until React commits). |

*The (d2)-was-complete premise was wrong twice here — the tab existed (not missing) and the
save path was fine (the "undefined" was display-only). Both surfaced read-only before acting.*

### 3. /intel DE-INDEX PRUNE — Phase 1 applied and verified LIVE; Phase 2 parked

**Zero-view is not a property this DB stores.** `feed_items` has **no** views/impressions
column and there is no analytics table; the only traffic numbers in the repo are hand-typed
GSC notes in comments. So "prune zero-view" cannot run from the DB — it needs the external GSC
export. **79% of shell articles were already `noindex`** (the March–June cleanup), so the
reversible instrument was already largely applied.

**The analysis** (`docs/intel-prune-candidates.md`, committed `53274fd` — durable, so the GSC
join need not re-run). Three signals, GSC-joined over 692 /intel rows:
- **Signal 1 low-reach** — GSC impressions; absent-from-GSC = 0 (never surfaced). Buckets
  ≤1 / 2–4 / 5+.
- **Signal 2 duplicates** — **headline** token Jaccard ≥ 0.50. **Body Jaccard was calibrated
  and REJECTED** as a signal: cross-topic baseline 0.113, within-tuple max ~0.38 — the
  anti-dup guards work; duplication lives in headlines/queries, not bodies. (Reporting "0 body
  dupes" at the first threshold was caught as a vacuous result and recalibrated, not forced.)
- **Signal 3 date — CONTEXT ONLY** (revised framing): a column for judging edge cases, selects
  nothing. Pre-gates cutoff established at **2026-04-25** (the `DATA_INTEGRITY_RULES` /
  anti-hallucination guards) but not used as a cut.

**Phase 1 — applied to the DB and verified live.** The actionable confident cut = indexed ∩
impressions ≤1 ∩ duplicate ∩ **not protected** ∩ **not the cluster's highest-impression
winner**. Raw 23 → **12** after removing 5 protected + 7 winners (1 overlap). **Expected count
was reconciled with the operator: their "10 (23−13 protected)" was wrong; the verified set is
12**, and applied only after that mismatch was surfaced rather than guessed.
- **12 rows set `noindex=true`, one guarded batch** (recompute-and-refuse guard; total
  noindexed 668 → **680**, delta exactly +12, no over-reach). Every affected cluster keeps its
  indexed winner (asserted). **noindex, NOT delete** — rows + bodies intact.
- **Verified end-to-end on production (read-only GET):** the 12 serve
  `<meta robots="noindex, follow">` **now** (the page is SSR-per-request —
  `intel/[slug]` has no `generateStaticParams`, no prerendered HTML — so `generateMetadata`
  reads live DB every request); the **live sitemap already excludes the 12** (static,
  `revalidate:false` — refreshed by the deploy the `53274fd` push triggered); the kept rook
  winner still serves no noindex. DB → page-meta → sitemap all consistent.
- **Reverse (full statement — no re-derivation needed):**
  ```sql
  UPDATE feed_items SET noindex = false WHERE id IN (
    'b79642d5-0f75-465a-928d-c2298b99af10','60f7eb14-58fe-4006-b20a-0e8ff4fe6c58',
    '181b7d0d-899c-415e-8922-f89d1c6c9799','79f47ec0-475f-4e4d-ae54-3f70551e170d',
    'fe1b7414-df7b-4819-b3ba-7d0d5f595d67','c0596575-404e-4251-ad41-a959ec82c409',
    '12d4b6ae-5848-409f-a2c9-ac03782ff27a','baa6cda2-b7aa-4588-bba3-3d17ab6ec1f0',
    'fc9e0daa-629e-4e20-8f75-ee6ae650c6b6','b0a4faeb-76a3-437b-8664-4aedea22e407',
    '9e80504b-a1d7-4a6f-8730-ef5c7a789677','271ade05-2ab4-48e0-8fa4-2c37481fb165'
  );
  ```
  For a single page, use just its id in the `IN (…)`. Fully reversible; noindex, not delete.

**Phase 2 — PARKED (operator decides).** The **532 indexed, unique, ≤1-impression** /intel
pages (Signal 1 ∩ not-duplicate) are the edge-case tail — untouched. `docs/intel-prune-
candidates.md` §4 lists them with `publish_date` as the judgment aid (recent = fair chance,
old = likely dead), not pre-decided.

### STILL OPEN / NEXT

- **Phase 2 /intel edge cases** (532) — operator judgment, tomorrow.
- **Eyeball the first few `applied` rows for DRIFT.** Option 4 removed the re-classification
  guard, so the "frame, don't change the subject" guarantee is now **audit, not prevention**:
  a rewrite that shifted the topic is *detectable* in `keyword_match_log`
  (`original_headline` vs `final_headline`, and the frozen tuple) but is **not blocked** at
  write time. When the first Assassin/build article fires, read the actual rows — confirm the
  heartbeat logs `applied`, `match_count` increments to 1 (then the keyword caps), AND the
  rewritten headline still answers the same tuple. If drift shows up, that is the signal to
  reconsider adding a lightweight guard — the audit trail is the only thing watching for it.
- **Align `HEADLINE_RULES` AND the length gate DOWN to 60 together** *(deferred, real)*. The
  gate is 65 = the `HEADLINE_RULES` ceiling — internally consistent, and 65 was correct
  *relative to the prompt* (a gate stricter than the prompt rejects obedience). BUT the
  Operating Doctrine's **Gate 4 wants ≤60 for SERP-title truncation**, and the headline drives
  the `<title>`, so a rewrite of **61–65 chars passes the gate and still truncates in Google**.
  The fix is NOT to lower the code gate alone (that re-creates the reject-obedience bug the 65
  decision fixed) — it is to move the **prompt ceiling AND the code ceiling to 60 in lockstep**
  (`lib/headlineRules.js` text + `HEADLINE_MAX_CHARS` in `lib/keywordFraming.js`, which already
  carries an `ALTER TOGETHER` note). One coordinated change; not yet made.
- **MEASUREMENT CAVEAT for the impressions-rise test.** The Phase-1 noindex will not show up in
  GSC for **3–4 weeks minimum** — Google processes noindex across recrawls, not instantly — so
  that is the FLOOR before "did de-indexing the duplicates lift the winners" means anything.
  Do not read the curve before then. **Strategic finding from the GSC export (3-month window):**
  the whole site earns **~141 clicks / ~8,566 impressions**, and the click leaders are
  **entity/tool pages, not articles** — `/leaderboard` (24), `/uniques/misery-disciple` (15),
  `/stats` (10), `/uniques` (6), the `/intel` hub (5); only 6 of the top-20-by-clicks are
  individual /intel articles. Queries are **entity/tool-shaped**. This is the case for the
  keyword-framing bet (frame articles toward the entity/tool terms that actually rank) and a
  caution that pruning low-reach *articles* is housekeeping, not a growth lever — the growth is
  in the entity/tool surfaces.
- Keyword deferred items unchanged (see the build entry): `applied_deduped`, exact `unlogged=`,
  the (g) stale-list filter, the apostrophe transform.

---

## 2026-07-22 — *** KEYWORD-FRAMING BUILD COMPLETE. LIVE, INERT, OBSERVABLE. ***

**A system where editors frame article HEADLINES toward studied Mangools/KWFinder
keywords when the topic already fits — keyword as LENS, not gate.** Shipped as eight
commits; live in code, inert against the empty table, observable via a heartbeat.
Seeding `keyword_targets` is the operator's next act and is the only remaining gate.

### THE COMMIT CHAIN

| | commit | what it did |
|---|---|---|
| **(a)** | `5c221e7` | delete the dead `seo_keywords` code path (provable no-op) |
| **(b)** | `e60cabd` | extract `HEADLINE_RULES` from five byte-identical inline copies to one constant |
| **(d1)** | `623a8a5` | unify seven slug derivations onto `entitySlugFor` (no-op) |
| **(d2)** | `c48f4b4` | `keyword_targets` entry form + server-validated `entity_slug` |
| **(b2)** | `78639b9` | relocate `HEADLINE_RULES` to a leaf module so the rewrite pass can import it without pulling in 107 KB of editor machinery |
| **(e)** | `d087e62` | the matcher + two-pass rewrite |
| **(f)** | `dd6f8ec` | the observability heartbeat |
| — | `2df49b9` | set `KEYWORD_STALE_DAYS` 180→90 (operator sign-off) |

DDL for `keyword_targets` / `keyword_match_log` was run by Justin in Supabase between
(d2) and (e); the CHECK sets are mirrors of `lib/coverage.js` enums (`-- ALTER TOGETHER`).

### THE DESIGN

- **Lens, not gate.** A keyword never decides WHAT gets written, only how
  already-warranted content is presented. The boundary is **structural, not advisory**:
  pass 1 (`callEditor`) generates headline AND body with **no keyword in context**; a
  second pass may rewrite the **headline only**. The keyword does not exist yet when the
  article is written — the discipline is enforced by construction, not by instruction.
- **Option 4 — classify once, freeze, never re-classify.** The matcher classifies the
  **GENERATED** headline (not the RSS source title), freezes the tuple, and does **not**
  re-derive it from the rewrite. Grading a rewrite with a classifier that reads the
  rewrite's own output is circular; Option 4 designs the circularity **out**. So the
  schema's `rejected_reclassify` outcome is **permanently unreachable** — kept in the
  CHECK because the DDL shipped with it, documented as such, and surfaced as `UNKNOWN`
  by the heartbeat if it ever appears (a drift alarm).
- **Exact-match-or-nothing.** An article fits a keyword only when `deriveTuple` returns a
  classified tuple AND a row matches on `(game_slug, entity_type, entity_slug, facet)`
  with `is_active` and `match_count < 1`. No fuzzy match, no scoring — a near-match would
  frame an article toward a term it does not answer. Most articles will NOT match, by
  design.
- **Length gate = 65, equal to the `HEADLINE_RULES` ceiling.** The plan said `≤60`; that
  was drift from a superseded 60/70 rule. A code gate **stricter than the prompt** rejects
  a headline that OBEYED the instruction it was given, logging obedience as
  `rejected_rules` and poisoning the one signal that outcome carries. **The code ceiling
  MUST equal the prompt ceiling.**
- **Fail-open throughout.** Every failure — unreachable vocab, unreachable store, model
  error, malformed output, over-length rewrite, failed log write — keeps the original
  headline and publishes. Publication is never blocked.

### THE THREE UNIFICATIONS — each a prerequisite, not housekeeping

The design assumed three shared primitives that turned out to be inline or duplicated.
**The feature could not bind honestly until each was one:**

1. **`entitySlugFor` (7 → 1)** — `weaponSlug` had seven derivation sites (five named +
   three inline). If entry-time validation and match-time derivation used different
   slug transforms, a keyword would validate on save and silently never match. (d1).
2. **`deriveTuple` (already 1 — a FALSE premise, recorded)** — the plan proposed an
   "(e0)" commit to extract `deriveTuple`, believing the matcher would duplicate the
   registry's classification. Reading the tree showed there was only ever **one**
   `deriveTuple` (the definition + `coverageShadow.js` + the new matcher). The two calls
   that remain are **correct by design**, not duplication: the matcher classifies the
   ORIGINAL generated headline (drives the match); `coverageShadow` classifies the FINAL
   headline (records the corpus). They agree on unrewritten articles and differ correctly
   only when a rewrite fired. **(e0) was designed away.**
3. **`HEADLINE_RULES` (5 copies → leaf)** — the rewrite pass must hold a rewritten
   headline to the same rules the original was written under. The constant was
   module-private in a 107 KB file importing the Anthropic SDK; (b2) moved it to
   `lib/headlineRules.js`, a leaf that imports nothing, proven byte-identical across all
   five editor prompts.

### STATE — live, inert, observable

- **Live in code.** The hook is in `processEditor` (`app/api/cron/route.js:512`), after
  `callEditor` returns and after `resolveMediaInfo` (so a keyword containing "clip"
  can't flip media selection — thumbnail/source_url are frozen), before the dedup gates
  and the insert. `gatherAll` does no classification and is untouched; `callEditor` stays
  pure (the dev sampler depends on it being write-free and keyword-free).
- **Inert in effect.** `keyword_targets` is empty, so every article takes the
  `no_match_no_term` path: headline byte-identical to pass 1, **zero rewrite-model
  calls**, one cheap local `deriveTuple` per article.
- **Observable.** The (f) heartbeat emits every run: `store=reachable(N)` /
  `store=UNREACHABLE`, `active`/`stale`/`orphaned` counts, and an outcome summary. It is
  a **seeding gate**: (e)'s error paths write **no** `keyword_match_log` row (the closed
  7-value set can't express "store unreachable" without asserting a false no-match), so
  `store=UNREACHABLE` is the **only** channel that separates a BROKEN store from a QUIET
  one. Verified live, read-only, against the real empty table.

### DETAILS WORTH KEEPING

- **`unlogged=`, not `errors=`.** The heartbeat's article-vs-logged gap was going to be
  called `errors=`. But `articles` counts every editor *attempted*, and an editor whose
  `callEditor` fails early-returns **before** the framing hook — writing no log row
  because it never ran the matcher. `errors=` under a `[keyword]` prefix would blame this
  feature for a Sonnet outage. Renamed to `unlogged=`: it names the gap and claims
  nothing about the cause. (An exact per-article error count needs a `framed` flag
  threaded through `processEditor` — deferred.)
- **`orphaned=N` is DERIVED, never a stored flag** (§6.6). One `loadVocabulary` per run,
  build the valid-slug set with the shared `entitySlugFor`, then N in-memory hash lookups
  — not N queries. Catches slug-drift-after-save AND enum-CHECK drift (a value valid per
  the DB CHECK but gone from code). Vocab unreachable → reports `?`, never `0`.
- **§10.1 shared threshold.** `KEYWORD_STALE_DAYS = 90` is declared **once** in
  `lib/keywordStaleness.js` (a leaf that imports nothing, safe for the `'use client'`
  admin bundle) and consumed via `staleCutoff`. The heartbeat imports the **function**,
  never the number, so the reader cannot drift from the source. 90 days ≈ one
  season/patch cycle.

### DEFERRED — not blockers

- **`applied_deduped` outcome** — would remove the `applied` + `feed_item_id IS NULL`
  vs failed-backfill ambiguity in (e), but needs a CHECK-constraint `ALTER`.
- **Exact `unlogged=`** — thread a `framed` flag through `processEditor`'s return so the
  gap becomes a true error count.
- **(g)** — the `stale only` admin filter (§4.5 Option 1). Optional; the shared constant
  it needs already exists.
- **Apostrophe transform** — strip vs hyphenate in the slug; affects zero current
  weapons.

### METHOD RULE — verify each premise at the source before shipping

This build corrected **~8 premises** introduced during planning, every one caught by
reading the real code/tree before writing anything:

| premise, as planned | what the code actually said |
|---|---|
| the five slug sites might diverge on apostrophes | measured: zero divergence on current vocabulary |
| the matcher duplicates `deriveTuple` → extract it as (e0) | only one `deriveTuple` existed; (e0) designed away |
| length gate `≤60` | the prompt ceiling is 65; `≤60` rejects obedience |
| `gatherAll` classifies the source title, reuse/avoid it | `gatherAll` does no classification at all |
| hook in `gatherAll` | the caller with dedup + insert is `processEditor` |
| shadow-log must MOVE for the final headline | it already sits after the hook; nothing moves |
| the `errors=` gap is an error count | it also counts pre-hook generation failures |
| `deriveTuple` reuse would collapse to one call | text/tokens need the final headline; only the tuple is shared |

> **RULE: a plan drawn ahead of the code must be verified at the source, per premise,
> before it is built on — not carried on confidence.** Same family as
> *documented-is-not-enforced* and *asserted-is-not-verified*: a design written down is
> not a design confirmed against the tree. Every one of the eight was surfaced as a
> read-only finding and reported rather than built past.

**Docs:** `docs/KEYWORD_SYSTEM_CONSOLIDATED.md` is the source of truth (corrected this
commit to shipped state — Option 4, `≤65`, `processEditor` hook, `stale=90`). The two
earlier drafts (`KEYWORD_FRAMING_DESIGN.md`, `KEYWORD_FRAMING_BUILD.md`) carry SUPERSEDED
banners; their bodies are kept as design history, not reconciled.

---

## 2026-07-21 - *** THE INVARIANT IS ENFORCED. ARC CLOSED. *** (`c852b9a` + `b848d23`)

**`verificationState()` now requires a non-blank `verified_source` for `CONFIRMED`.**
The `verified === true` short-circuit on the first line - **the last open mechanism,
the one that let unsourced rows reach editors as fact** - is gone.

**Three commits:**

| | | |
|---|---|---|
| **`c852b9a`** | selects | 14 selects gained `verified_source`. **Proven a NO-OP** - distribution byte-identical, CONFIRMED 365 unchanged. |
| **`b848d23`** | **the predicate** | three-way on `verified_source`. **61 rows move.** |
| *commit 3* | `qualityMetrics` flags | **PENDING** - three stale `hasVerifiedSource` rows. |

**Split deliberately:** if something had downgraded, the diff had to implicate the
predicate unambiguously, not a missing select.

### 1. THE PREDICATE

```js
export function verificationState(row, site) {
  if (row && row.verified === true) {
    if (!('verified_source' in row)) {
      console.error('[verification] BROKEN CALLER' + (site ? ' at ' + site : '') + ': ...');
    } else if (String(row.verified_source || '').trim()) {
      return 'CONFIRMED';
    }
  }
  const pv = (row && row.patch_verified) || '';
  if (pv && !/^s1\b/i.test(pv)) return 'SOURCE_AGREED';
  return 'UNCHECKED';
}
```

**Hedge-and-shout, NOT throw** - a throw would take down an entire cron generation
run over a marker-formatting concern.

### 2. THE EFFECT - predicate attached, measured against a prediction recorded first

**Predicate: share of rows across the 9 STAT_TABLES where `verificationState(row)`
returns `CONFIRMED`, i.e. `verified === true` AND a non-blank `verified_source`.**

- **CONFIRMED 365 -> 304.**
- **61 rows move `CONFIRMED -> UNCHECKED`** - `core_stats` **23**, `implant_stats`
  **38**. **Every one has a blank `verified_source`.**
- **319 sourced rows: ZERO moved.**
- **0 rows reach `SOURCE_AGREED`** - neither table has `patch_verified`, so the
  fall-through lands `UNCHECKED`.
- Seven other tables **unchanged**.

**The 61 are exactly the June-5 batch** that has been the standing re-verification
target since `49dc7e6`. **They were never a new discovery; they are the known
population finally being treated as what it is.**

> *** THIS IS A LIVE CONTENT CHANGE. The next cron cycle HEDGES these 61 rows
> instead of stating their numbers as fact. *** Editors will describe those cores
> and implants qualitatively and say the exact values are unconfirmed.

### 3. *** THE ARC, NAMED AND CLOSED ***

One unsupported flag in `mod_stats` opened this. The through-line, in one place:

| # | finding | closed by |
|---|---|---|
| 1 | **An unsupported flag** - 86 `mod_stats` rows `verified=true` with nothing behind them | owner SQL, 2026-07-21 |
| 2 | **The invariant `lib/verification.js` DOCUMENTED but no phase ENFORCED** | **`b848d23`** |
| 3 | **The mechanism that manufactured it** - admin form defaulted `verified` to `true`, guarded by table-name prefix instead of field name | **`3d9d928`** |
| 4 | **Two tables that COULD NOT record provenance** - no `verified_source` column | **`49dc7e6`** (DDL + 143 attributed) |
| 5 | **No way to COLLECT it** - form exposed `verified` but not `verified_source` | **`25ab594`** |
| 6 | **The auditor covered 363 of 657 rows** | **`ef9a4d4`** |
| 7 | **The predicate ENFORCES it at read time** | **`c852b9a` + `b848d23`** |

> **The comment that read *"enforced by later phases, NOT here"* now reads
> *"NOW ENFORCED HERE."* That single line is the arc in miniature: the discipline
> was always written down, and writing it down was mistaken for enforcing it.**

**The gap is closed at every layer: DATA, MECHANISM, SCHEMA, COLLECTION, AUDIT, and
ENFORCEMENT.** Also examined and exonerated along the way: the **2026-06-15 tag
recalibration**, which removed the hedge from this very population 36 days before
anyone found the problem - correct as a change, resting on a premise that was false,
and needing no revert because the population it exposed is now empty.

### 4. WHAT THE 61 NOW ARE

**Still `verified = true`. No longer `CONFIRMED` to any reader**, because the
predicate requires a source they do not have.

> **Re-verifying them in-game - KEYED ON `id` - is what restores them to CONFIRMED,
> and it is now the ONLY path back.**
> *** THE FLAG ALONE CAN NO LONGER ASSERT CONFIRMATION. *** That is the entire
> point. Before today, someone could restore CONFIRMED by ticking a box. Now the
> only way through is to actually look at the item and record where you looked.

### 5. THE GUARDRAIL PROPERTY - why this does not recur

**A broken caller can no longer silently pass rows as CONFIRMED.** If a future
select drops `verified_source`, the key is absent, and the predicate **logs loudly
and hedges** rather than quietly promoting unsourced rows.

> **A select regression now FAILS SAFE AND VISIBLY, instead of recreating the exact
> gap this arc closed.**

**Blank and absent are disjoint by COUNT, not by inspection:**

- **blank source (legitimate data) -> hedges QUIETLY.** The 61 log nothing.
- **absent key (a bug) -> SHOUTS.**

**Verified: across three synthetic rows - broken, blank, sourced - exactly ONE log
line was emitted.** Had the two shared a branch, the 61 legitimate rows would log an
error every run and the alarm would be worthless within a week - **the dexter
summary-line failure in a new costume.** They are separated on purpose.

### 6. VERIFICATION

**Before-state guard reproduced the defect first:** on HEAD all three synthetic rows
returned `CONFIRMED`, **including one with no `verified_source` key at all.**

**Prediction recorded BEFORE the run, matched cell for cell:** CONFIRMED 365 -> 304,
`core_stats` 85 -> 62, `implant_stats` 119 -> 81, exactly 61 rows moving, all
`CONFIRMED -> UNCHECKED`, 0 to `SOURCE_AGREED`.

**Row-level diff over all 657 rows.** The assertion that mattered most:
**`of 319 sourced rows, 0 changed state`** - had `c852b9a` missed a select, that
number would have been catastrophic rather than zero.

**The predicate is imported real, never reimplemented.** Existing suite 8/8, ESLint
clean, no row written.

### 7. STILL OPEN - genuinely short now

- **Commit 3 (queued):** `qualityMetrics.js` `hasVerifiedSource` - **three rows
  stale** (`implant_stats`, `core_stats` since yesterday's DDL; `shell_stat_values`
  for longer). **CORRECT, do not delete** - it has **three live consumers** in
  `lib/qualityMetricsCore.mjs` (`:41`, `:57`, `:59`) and deleting it would silently
  zero `confirmed_with_source`. The schema-derived question - whether the flag
  should be computed rather than hardcoded - is **parked for that commit**.
- **In-game re-verification of the 61. KEY ON `id`.**
- **Elective, all edge:** `Survivor Kit V2` (distinct item or typo'd duplicate -
  do NOT rename blind, it would make the dexter resolver ambiguous);
  `shield_compatible` existence question (dead column, zero readers);
  the `requiredWhen` form-validation follow-up (needs a NEW opt-in property -
  **never repurpose `required`**, which is inert on 37 fields across 20 tables).

---

## 2026-07-21 - core_stats natural key, and the editor line made self-identifying

**No data writes, no DDL, no dedup.** One line changed in `lib/editorCore.js`.

### 1. *** THE NATURAL KEY IS `(name, rarity, required_runner)` ***

**`(name, rarity)` is NOT a natural key on `core_stats`** - measured **85 rows / 83
distinct pairs / 2 collisions**. With `required_runner` added: **85 distinct of 85,
0 collisions.**

**`core_stats` is the ONLY shell-scoped stat table**, and the collision exists
**nowhere else.** Checked across all seven:

| table | key checked | collisions |
|---|---|---|
| **core_stats** | (name, rarity) | **2** |
| implant_stats | (name, rarity) | 0 (120/120) |
| mod_stats | (name, rarity) | 0 (203/203) |
| weapon_stats / shell_stats / unique_weapons | (name) | 0 |
| shell_stat_values | (shell_name, stat_name) | 0 |

`implant_stats` also has `required_runner`, but its 11 duplicate names separate by
**rarity tier** - the expected shape. `core_stats` duplicates share a rarity and
differ by **shell**, which is why it is the one table where rarity does not suffice.

> **THIS DOES NOT INVALIDATE THE `extraId: 'id'` DECISION** in
> `scripts/provenance-check.mjs` (`ef9a4d4`). A findings label still has to identify
> ONE row, and `id` does that unconditionally. The natural key is the right *concept*
> and the uuid is the right *label*; they are answering different questions.

### 2. THE FOUR ROWS ARE DISTINCT ITEMS - **no dedup was done and none is needed**

| id | name | rarity | shell | effect |
|---|---|---|---|---|
| `a2ccd7de` | Predator | Deluxe | **Recon** | Tracker Drone: sprint speed + heat cooldown, longer overheat |
| `e5be8e41` | Predator | Deluxe | **Assassin** | damage from behind grants bonus damage |
| `12d497ca` | Hunter/Killer | Deluxe | **Recon** | Echo Pulse pings grant stacking equip/reload/stability |
| `d1cecc89` | Hunter/Killer | Deluxe | **Thief** | melee/knife after grapple **Hacks** the target |

**Entirely unrelated effects, each keyed to its own shell's kit.** All four
`is_shell_exclusive = true`. **Shell-exclusive cores reuse names across shells** -
that is the game's design, not a data defect.

> **THE DEFECT WAS THE ASSUMPTION, NOT THE DATA.** `(name, rarity)` was treated as
> a key because it happens to be one everywhere else.

### 3. THE TWO UNSOURCED TWINS ARE PART OF THE EXISTING 61 - not a new population

`e5be8e41` (Predator/Assassin) and `d1cecc89` (Hunter/Killer/Thief) both carry
`created_at = 2026-06-05T20:25:58.006796` - **the same batch signature** as the rest
of the June-5 population. Their Recon counterparts are March rows and were
backfilled.

**They are covered by the existing re-verification item. Do NOT track them
separately.**

### 4. THE BY-NAME PROVENANCE TRAP - recorded, not fixed

> **A provenance query keyed on bare `name` returns a MISLEADING answer on this
> table.** `SELECT verified_source FROM core_stats WHERE name = 'Predator'` returns
> **two rows, one attested and one null** - and any check that takes the first, or
> asks "does Predator have a source?", gets **yes** when half of what carries that
> name does not.

**No remediation. Every internal check keys on `id`** - `provenance-check.mjs`,
the dexter resolver (`50cd7ac`), the flip and backfill SQL. **This is a hazard for a
future MANUAL query only**, recorded so nobody trusts a by-name provenance check
here.

### 5. THE RENDER FIX - and *** TWO PREMISE CORRECTIONS, both load-bearing ***

**Changed** (`lib/editorCore.js:708`, one line): when a core is exclusive **and**
has a runner, the line now names the shell.

```
BEFORE  Predator (Deluxe, Shell-Exclusive, Ability: Passive): Gain increased sprint speed...
AFTER   Predator (Deluxe, Recon-only, Ability: Passive):      Gain increased sprint speed...
BEFORE  Predator (Deluxe, Shell-Exclusive):                   Dealing damage from behind...
AFTER   Predator (Deluxe, Assassin-only):                     Dealing damage from behind...
```

`-only` keeps the exclusivity fact the old label carried. **Universal cores render
byte-identically.** Fallback: exclusive with no runner still renders
`, Shell-Exclusive` - **0 such rows exist**, but the form can still produce one.

> *** CORRECTION 1 (caught before writing): THE GROUP HEADER ALREADY SEPARATED
> THEM. *** The block emits `${runner} Cores:` headers, so the twins appear under
> **`Recon Cores:`** and **`Assassin Cores:`**. Context was **never** ambiguous.
>
> *** CORRECTION 2 (caught by the harness, correcting the plan): THE LINES WERE
> NEVER IDENTICALLY LABELLED. *** The plan claimed they were. They already differed
> - Predator by `, Ability: Passive`, Hunter/Killer by `Meta: B` and
> `Ability: Prime`. The before-state assertion **FAILED and exposed this**; it was
> rewritten to test the real property rather than weakened to pass.
>
> **BOTH CORRECTIONS MOVED THE SAME WAY: the defect was SMALLER than described,
> twice.**

**THE REAL DEFECT, once both are subtracted: no line NAMED a shell.** Measured -
**0 of 4 twin labels contained a shell name before; 4 of 4 after.** A reader could
tell the two entries apart and still not know which shell either belonged to.

**WHY IT WAS STILL WORTH DOING:** the line is the **quotable unit**. The prompt says
*"use exact names only"*, the exact name collides, and a group header **28-42 lines
up** does not travel with a name the model repeats in an article.

> *** STATE IT PLAINLY: THIS IS HARDENING, NOT REPAIR. Declining would have been
> defensible. *** No wrong content was established as reaching output. A future
> reader must not record this as closing an open content hole.

**Scope:** editor context only - the generation input. **Advisor and
`/shells/[slug]` already filter on `required_runner` and separate cleanly**;
`/builds` and `/join/intake` show both twins but are **browse surfaces, not
generation input**, and were deliberately left alone.

### 6. VERIFICATION - no row written

The harness **extracts the actual template literal from `editorCore.js` and
evaluates it**, so before and after both exercise the **shipped** template rather
than a copy that could agree with itself.

**85 lines compared: 75 changed, 10 identical, 0 malformed.** Every changed line
carries a `<Shell>-only` label; **no universal line changed**; both twin pairs now
name their shells.

**SYNTHETIC FALLBACK EXERCISED - required, because it is unreachable from live
data.** An in-memory row (**never inserted**) with `required_runner` as `null`, `''`
and `undefined` all render `, Shell-Exclusive` with no `, )` or `, null`.
**Zero live rows hit that branch, so it would otherwise have shipped untested and
fired for the first time on a future bad row.**

`Shell-Exclusive` confirmed to appear in **exactly one place in the repo**, so no
other consumer reads this string. ESLint clean.

---

## 2026-07-21 - *** THE 2026-06-15 RECALIBRATION: EXAMINED AND EXONERATED. NO REVERT. ***

Read-only investigation. **No writes, no code change, no predicate change, no
revert.** This was the last item that could have been wrong *at the root*.

**VERDICT: `d15a06a` was a correct change reasoning from a false premise, and it
needs no revert - because the population it exposed no longer exists.** The
reasoning matters more than the verdict; both are below.

### 1. WHAT IT WAS

**`d15a06a` (2026-06-15) - "Calibrate [UNVERIFIED] tag to verified=false and harden
citation enforcement".** One file, +22/-20.

**`lib/verification.js` DID NOT EXIST YET.** It was created **2026-06-18**
(`b8a2d25`), three days later. The tagging logic lived in **`lib/editorCore.js`** as
a local function.

**BEFORE** (`d15a06a^`, `editorCore.js:658-665`):
```js
function unverifiedTag(row, usePatch) {
  var bad = row.verified === false;
  if (usePatch) {
    var pv = row.patch_verified;
    if (!pv || /^s1\b/i.test(pv)) bad = true;
  }
  return bad ? ' [UNVERIFIED]' : '';
}
```
`usePatch=true` for **mods, weapons, shells**; `usePatch=false` for **cores,
implants**.

**AFTER:**
```js
function unverifiedTag(row) {
  var pv = row.patch_verified || '';
  return (row.verified === false || /^s1\b/i.test(pv)) ? ' [UNVERIFIED]' : '';
}
```

**THE SINGLE SEMANTIC CHANGE: the `!pv` clause was dropped.** `usePatch` was removed
and all five call sites unified.

### 2. THE ENTRY'S CLAIM VS THE DIFF - accurate mechanically, wrong in one word

**The 6/15 entry's mechanical description is ACCURATE.** Checked line by line against
the diff: it did drop `pv=null`, it did remove `usePatch`, it did unify five call
sites, and the tag rate did move **92% -> 51% on mods**. **No gap between claim and
code.**

**The gap is ONE WORD.** The entry describes the dropped rows as:

> *"The 81 dropped were `verified=true & pv=null` **hand-verified** mods"*

**"Hand-verified" is an assertion about PROVENANCE, offered as the JUSTIFICATION for
untagging them.** Yesterday established that population had **no `verified_source`
at all**, and that its `verified=true` came from **hand-written SQL**, not from
anyone confirming anything.

> **THE COUNT WAS REAL. THE CHARACTERISATION WAS NOT.**
> **Same shape as the ~81 misattribution one layer up** - a correctly-executed
> measurement wearing a label it did not earn. The number `81` was measured; the
> word "hand-verified" was assumed, and it was the word that carried the decision.

*(The 81 vs 86 arithmetic gap is untouched by this investigation and remains
UNRESOLVED.)*

### 3. *** THE PIVOT - what the change actually did ***

Established **from the two predicates**, not from the entry. For the three
`usePatch=true` tables (mods, weapons, shells):

| row state | OLD | NEW |
|---|---|---|
| **`verified=true`, `pv=null`** | **`[UNVERIFIED]`** | **untagged (CONFIRMED)** |
| `verified=true`, `pv='1.1.0'` | untagged | untagged |
| `verified=true`, `pv='s1'` | `[UNVERIFIED]` | `[UNVERIFIED]` |
| `verified=false` | `[UNVERIFIED]` | `[UNVERIFIED]` |

The 86 unsourced `mod_stats` rows were established yesterday to be **perfectly
co-extensive with `pv=null`** - every one had a null `patch_verified`.

> *** SO `d15a06a` REMOVED THE HEDGE FROM PRECISELY THE POPULATION LATER FOUND TO BE
> UNSOURCED. ***
> **Before 2026-06-15** those rows reached editors carrying `[UNVERIFIED]`, under an
> instruction not to state their numbers. **After it** they reached editors **bare,
> readable as confirmed fact** - and stayed that way until the 2026-07-21 flip.
> **THE HEDGE THAT WOULD HAVE CONTAINED THE PROBLEM WAS REMOVED 36 DAYS BEFORE THE
> PROBLEM WAS FOUND - BY A CHANGE WHOSE STATED REASON WAS THAT THE ROWS WERE
> TRUSTWORTHY.**

For **cores and implants the change was a NO-OP** - already `usePatch=false`, and
they have no `patch_verified` column.

### 4. *** THE CONDITIONAL - the core finding ***

> **THE RECALIBRATION IS SOUND IF AND ONLY IF `verified = true` IS TRUSTWORTHY.
> That premise is EXACTLY what failed.**

**BOTH HALVES WERE TRUE AT ONCE, and that is the whole difficulty:**

- **The over-tagging was REAL.** 92% of mods tagged **desensitizes the marker** -
  and the desensitization was independently observed in the same session's
  diagnostic (**4 UNVERIFIED-CITED** rows: M77, Bully SMG, Thermal Surge Battery,
  Sonar Shot; **0 fabrication** - editors quoted unverified rows rather than
  inventing). A marker applied to almost everything stops being read.
- **The trustworthiness was NOT real.** So untagging inherited that unreliability
  and **converted an over-cautious hedge into a FALSE ASSURANCE.**

**The change fixed a real problem by leaning on a premise that did not hold.**

> *** IT WAS STRUCTURALLY UNCATCHABLE AT THE TIME. `verified_source` did not exist
> on ANY of these tables until 2026-07-21. The question "are these rows actually
> confirmed?" COULD NOT BE ASKED in June - there was no column in which the answer
> could live. ***
>
> **THIS IS THE ARGUMENT FOR WHY YESTERDAY'S COLUMNS MATTER.** They do not just
> record provenance; **they make the premise CHECKABLE.** A future recalibration
> resting on "these are trustworthy" can now be tested instead of asserted. The DDL
> converted an unanswerable question into an answerable one - which is the actual
> return on `49dc7e6`, larger than the 143 rows it attributed.

### 5. WHY NO REVERT

**The population `d15a06a` exposed is now EMPTY.** Measured read-only across all
seven covered tables: **`verified=true AND patch_verified IS NULL` is 0 on every
table that has the column.**

- The `mod_stats` **86 were flipped** to `verified=false`.
- The **17 survivors carry BOTH a `verified_source` AND a patch stamp.**

> **Reverting would re-tag NOTHING and would re-desensitize a marker that was
> correctly un-desensitized.** The over-tagging problem `d15a06a` solved was real
> and remains solved. **Its own exposure is fully closed.**

**A revert would be cargo-culting the verdict "the premise was false" into an action
that addresses nothing.**

### 6. THE RESIDUAL 61 ARE A DIFFERENT MECHANISM - do not attribute them here

**23 `core_stats` + 38 `implant_stats` still reach editors as `CONFIRMED` with no
source.** They do **NOT** come from `d15a06a`:

- **`d15a06a` never touched those two tables** - `usePatch=false` before *and*
  after, and they have no `patch_verified` column for the dropped clause to have
  applied to.
- They reach `CONFIRMED` via the **`verified === true` short-circuit on the FIRST
  LINE of `verificationState()`** - older, separate, and already parked.

**These are the C4 / source-requiring-predicate item. The predicate change is what
addresses them; no change to the tag would.**

### 7. *** OPEN FLAG RESOLVED - CLOSED ***

The 2026-06-15 recalibration was carried for two days as **"still unexamined - the
last thing that could be wrong at the root."**

> **IT IS NOW EXAMINED AND EXONERATED. MARK IT CLOSED.**

> *** THE ROOT-LEVEL ARC IS COMPLETE. No remaining open item can be wrong at the
> root - only at the edges. ***
> The cause of the flag population is established (three mechanisms: hand-written
> SQL, the pre-ticked form default, and an unidentified June-5 batch writer). The
> predicate that consumed it is understood. The tag change that removed its hedge is
> examined and needs no action. What remains - the 61 unsourced rows, the
> source-requiring predicate, the dexter write gate, form validation, the
> `core_stats` duplicate pairs - are all **bounded, located, and downstream.**

---

## 2026-07-21 - provenance-check now covers all 657 rows (`ef9a4d4`)

Closes the coverage gap flagged in `49dc7e6`. **No data writes, no DDL, no CI
wiring.**

### 1. WHAT SHIPPED

**`core_stats` and `implant_stats` added to the `TABLES` list.** Two config
entries; `label()` and the format classifier **untouched**.

- **Coverage: 363 -> 657 rows** - **the full population `verificationState()`
  serves.** No stat table it reads is now outside the auditor.
- **Total findings: 23 -> 84.** Exit code still **1**.
- New per-table rows: `core_stats 85 / noSrc 23 / patchCite 0`,
  `implant_stats 120 / noSrc 38 / patchCite 0`.

The table comment now states the **RULE** ("every table carrying
`verified_source`") **rather than a count** - a count in a comment goes stale
silently while continuing to look correct, which is how *"the five populated
tables"* survived being wrong. It also records that both tables were
**STRUCTURALLY UNCHECKABLE before `49dc7e6`, not overlooked**: check 1 keys on a
column that did not exist on them.

### 2. THE UNSOURCED POPULATION IS INCLUDED **UNSUPPRESSED** - argued, not assumed

The June-5 rows are deliberately unsourced and documented. **Including them as
check-1 findings was a real decision with a real case against it**, and it was
argued out rather than defaulted:

**The case against:** a permanent findings floor is an alarm that fires every run,
which trains the reader to stop reading it - **the same failure as the dexter
summary line, in a different costume.**

**Why they are included anyway:**

1. **Check 1's semantic is exactly their state.** It asks *"is anything flagged
   verified with nothing behind it?"* They are. Suppressing them would make the
   check report something other than its own name - **the label-vs-substance
   failure, introduced deliberately this time.**
2. **`49dc7e6` made visibility the entire point** - *"a VISIBLE state rather than
   an invisible one"*. Extending the auditor and then hiding them from it would
   undo what the DDL was for.
3. **An allowlist is itself an unaudited claim.** It would need maintaining, would
   keep suppressing a row after someone sourced it, and would be a second place
   where *"this is fine"* is asserted without evidence. **We spent the day removing
   exactly that construct.**
4. **It does not convert a green gate to red - the script already failed** (23,
   exit 1) and is deliberately not in CI. It is a **report with an exit code**, not
   a pass/fail gate.

### 3. *** THE PERMANENT FLOOR - the operational consequence ***

**Check 1 now has a standing floor** from a documented population that will not
shrink until those rows are re-verified in-game.

> *** A FUTURE CI WIRING MUST NOT GATE ON THE RAW TOTAL. *** It would fire forever
> on a known state, and an alarm that is always on is an alarm nobody reads.
> **The useful signal is GROWTH against a recorded baseline** - a check-1 count
> ABOVE the baseline means **new** source-less verified rows appeared, which is the
> thing worth interrupting someone for.
> **Flagged in the script beside the exit-code comment. NOT BUILT.**

### 4. THE `extraId` DIVERGENCE - both measurements recorded

**`label()` renders `${id}/${extraId}`, and a finding has to identify ONE row.**
The two tables needed **different** answers, and the measurement is recorded in the
script so nobody copies one config to the other:

| table | rows | distinct `(name, rarity)` | collisions | config |
|---|---|---|---|---|
| **`core_stats`** | 85 | 83 | **2** - `Predator\|Deluxe` x2, `Hunter/Killer\|Deluxe` x2 | **`extraId: 'id'`** |
| **`implant_stats`** | 120 | **120** | **0** | **`extraId: 'rarity'`** |

**`(name, rarity)` uniqueness had been measured on `mod_stats` earlier today and was
initially carried across to these two. That was wrong** - it holds on
`implant_stats` and fails on `core_stats`. Measured before wiring, per the standing
rule.

> **WHY `rarity` + A CAVEAT COMMENT WAS REJECTED for `core_stats`:** the caveat
> would live **in the script** while the misleading label lives **in the output
> someone reads at 2am.** A label that is adequate 83 times out of 85 - **failing
> precisely on the rows someone needs to act on** - is worse than one that looks
> ambiguous, because it *looks* precise. `Predator/Deluxe` would read as an
> identification and would not be one.

### 5. THE DEXTER HAZARD DOES NOT APPLY HERE - established by READING, not by analogy

The obvious worry: neither new table has `patch_verified`, and **requesting a
missing column is exactly what broke `dexter-stats` for 33 days.** Checked rather
than reasoned from similarity:

- **Check 2 reads `verified_source`, NOT `patch_verified`:**
  `PATCH_CITE_RE.exec(r.verified_source || '')`. It regexes the citation text for
  `Update X.Y`; it never touches the column.
- **The script fetches with `select('*')`** - it never names columns, so **there is
  no missing-column request to error on.**
- Confirmed in the output: `patch_verified` appears nowhere in the two new
  sections, and both report **check 2 = 0** (the backfilled strings say "March
  2026", not a dotted version).
- **Check 3 is already guarded** by `'countered_by' in rows[0] || 'counter_items' in
  rows[0]` and prints nothing for either table.

> **THE CONTRAST THAT MATTERS: `dexter-stats` ENUMERATED `patch_verified` in an
> UPDATE payload. This script enumerates nothing.** Same missing column, opposite
> outcome - **because of how the query was written, not because of what the schema
> lacked.** Similar-looking hazards are not the same hazard; the difference was only
> visible by reading both.

### 6. VERIFICATION - prediction recorded BEFORE the run

**Before-state guard:** both tables **absent** from coverage, **23 findings, exit
1**. The gap was demonstrated before it was closed.

**Prediction, recorded before running, so this was a test:** **84 findings, exit 1**,
with `core_stats 85/23/0/0` and `implant_stats 120/38/0/0`.

**It held cell for cell.** No deviation to report.

**Also asserted:** all five pre-existing **summary rows AND section bodies
byte-identical**; **three DMZ skip lines intact**; **check 3 prints nothing** for the
new tables; exit code **read directly, not through a pipe**. ESLint clean.

*Two false alarms in the comparison harness were mine, not the script's:* a node PID
embedded in a warning line, and an `awk` range that made `unique_weapons` look
changed because it is the last section in the before-file and now has a separator
after it. **Both were extractor artifacts; the section bodies compare clean.**

### 7. NEW OPEN ITEM - `core_stats` duplicate pairs, NOT investigated

**`Predator|Deluxe` and `Hunter/Killer|Deluxe` each appear TWICE at identical name
AND rarity:**

| name | rarity | ids |
|---|---|---|
| Predator | Deluxe | `e5be8e41-8ce3-4e79-a249-8e37730f1dd3`, `a2ccd7de-7b54-40bf-9619-15cf301a2df1` |
| Hunter/Killer | Deluxe | `d1cecc89-68fb-4f61-a0e4-dbac7ab654a6`, `12d497ca-9617-4dcd-b617-005f63c51696` |

**`implant_stats`' 11 duplicate names ALL separate cleanly by rarity tier**
(Standard/Enhanced/Deluxe/Prestige) - **that is the expected shape** for a
tiered-item table. **`core_stats` does not match that pattern.**

**CANDIDATE DATA DEFECT: possibly genuine duplicate rows rather than distinct
items. NOT INVESTIGATED.**

> **THE IMPLICATION WORTH CHECKING FIRST: if they ARE duplicates, one of each pair
> may sit OUTSIDE the March capture** - meaning **an unverified twin of a sourced
> row**, carrying the same name and rarity but no provenance. That would make the
> `verified_source` backfill look complete for an item while half of it is
> unattributed.

---

## 2026-07-21 - verified_source exposed in the admin form (`25ab594`)

Closes the gap flagged as the next code task in `49dc7e6`: the DDL created the
capacity, this creates the practice. **No DDL, no data writes.**

### 1. WHAT SHIPPED

`verified_source` exposed for **`core_stats`** and **`implant_stats`** as
**`type: 'text'`** - *not* a select - positioned **immediately after `verified`**
in both schemas, with a placeholder carrying the canonical string form:

```js
{ key: 'verified_source', label: 'Verified Source', type: 'text',
  placeholder: 'e.g. owner in-game entry, March 2026 (attested 2026-07-21)' },
```

Adjacency is the point: the source field has to be in the **eye-line of the click
that ticks the box**. That is the whole mechanism `weapon_stats` relies on.

### 2. *** WHY TEXT, NOT SELECT - the load-bearing decision ***

**The mechanical reason - a select would have been DESTRUCTIVE here.** The renderer
sets the control's value from `formData`:

```js
<select value={formData[field.key] ?? ''} ...>
  {!field.nullableSelect && <option value="">-- Select --</option>}
  {(field.options || []).map(o => <option key={o} value={o}>{o}</option>)}
```

A value matching **no option renders BLANK while the underlying string survives in
`formData`.** So editing any of the 143 backfilled rows would have shown an **empty
control** over live attested prose, and **one stray interaction would silently
replace it with a three-word token.**

> **Destructive editing on the one field whose entire purpose is to be
> trustworthy.** A provenance column that can be blanked by a mis-click is worse
> than none, because it is believed.

**The substantive reason.** `weapon_stats`' closed option set
(`in-game` / `tauceti.gg` / `both`) is **genuine for `weapon_stats`** - its
provenance really is two external references and their union. **Core/implant
provenance is attestation-based and open-ended:** *who* attested, *when*, and *with
what caveat* - as the two backfilled strings already show, one of which carries
`; batch-inserted, write mechanism unidentified`. **That is not enumerable**, and a
fixed list would force every future entry to lie by rounding.

**THE COST, recorded honestly: free text drifts.** The compensating control is
**extending `provenance-check.mjs` to these two tables** - already flagged open in
`49dc7e6`, and now more valuable than it was, because this change guarantees the
column will start accumulating hand-written strings. The placeholder carries the
convention; **nothing enforces it.**

### 3. *** THE CAVEAT - THIS MAKES A MISSING SOURCE VISIBLE, NOT IMPOSSIBLE ***

> **`required` is COSMETIC. 37 uses across the schemas, ONE consumer
> (`app/admin/page.js:741`), which appends `' *'` to the label. Nothing reads it at
> submit time.**
> **`saveEdit` (`:558`) and `saveNew` (`:573`) run NO CHECKS.** Each builds the row
> and fires the request unconditionally.

**Ticking `verified` and leaving `verified_source` blank is still silently possible
- on `weapon_stats` too.**

> **`weapon_stats`' zero unsourced verified rows are OWNER DISCIPLINE MADE EASY BY
> ADJACENCY, not a guarantee the form provides.** Do not read this commit as
> enforcing the pairing. It puts the field where the omission is obvious; a
> determined or hurried save still omits it.

### 4. BEHAVIOUR

**New rows:** a blank source becomes **SQL `NULL`**, via `formDataToRow`'s
`if (row[field.key] === '') row[field.key] = null;`. That matches the DDL intent
recorded in `49dc7e6` - nullable, no default, **absence means unsourced** - so
**there is no `''` / `NULL` split** in the column.

**Edit path:** the **143 backfilled rows now DISPLAY their prose** in a text input
where the column was previously invisible in the UI. **`type: 'text'` round-trips
losslessly and NO STORED VALUE CHANGES.** This is a rendering change until someone
types.

### 5. STILL OPEN - THE VALIDATION FOLLOW-UP, scoped but not built

**Conditional requirement (`verified === true` implies non-blank `verified_source`)
CANNOT be expressed in the existing field-config shape.** `required` is a **flat
boolean consumed only for label decoration** and has **no notion of a predicate over
sibling fields**.

**It would need:**

- a **NEW property** - a `requiredWhen` predicate over `formData`, or a per-table
  validator function;
- a **blocked-submit path** in both save handlers, which today submit
  unconditionally;
- an **error-surfacing mechanism** - only `showToast` exists;
- **field-level error styling**, which does not exist at all.

> *** THE TRAP - RECORD IT AND DO NOT FALL INTO IT: because `required` is currently
> INERT EVERYWHERE, giving it teeth would RETROACTIVELY BLOCK SAVES on all 20
> tables' 37 existing `required: true` fields. *** The safe scoping is a **separate
> opt-in property**. **NEVER repurpose `required`.**

**Affected immediately:** `weapon_stats`, `core_stats`, `implant_stats` - the three
that expose `verified`. **The five `game_*` and three `dmz_*` tables also expose
`verified` but have NO `verified_source` column**, so the rule **cannot apply there
without DDL**.

### 6. VERIFICATION - no row written

A scratchpad harness (**not committed**) evaluates the **real extracted `SCHEMAS`
and `buildFormDefaults`** with the real local constants - no stubs, no
reimplementation.

**Before-state guard:** confirmed `verified_source` **ABSENT** from both
`core_stats` and `implant_stats` while **PRESENT** on `weapon_stats`. **The gap was
demonstrated before it was closed** - had the before-run not shown it, the harness
would have been wrong rather than the finding.

**After: 16 assertions passed**, including the ones that could have caught a wrong
implementation - **`type: 'text'` not select**, **placeholder present**, **position
immediately after `verified`** (core 10 -> 11, implant 19 -> 20),
**`weapon_stats.verified_source` UNCHANGED as a select with its three options**, and
**`verified` still defaults `false`** on all three.

**Diff: 20 tables, 209 field slots and 209 default keys compared. Exactly 2 default
keys changed** - `core_stats.verified_source` and `implant_stats.verified_source`,
both `undefined -> ""`. **Field-list movement confined to the two intended tables**
(the two insertions plus the trailing shift they cause). **No other table changed in
any respect.** Four lint issues **confirmed pre-existing at HEAD** by comparison, not
assumed - identical set, shifted by the +13 lines.

---

## 2026-07-21 - *** C1 RESOLVED: verified_source added, 143 rows attributed ***

**Owner ran the DDL and backfill directly in the Supabase SQL editor.** Documentation
only here; every figure below is a read-only confirmation.

- **`verified_source` text column added to `core_stats` and `implant_stats`** -
  **nullable, NO DEFAULT.** Absence means *unsourced*; it asserts nothing.
- **143 March rows backfilled** with an attributed source string.
- **61 June-5 rows deliberately left unsourced.**
- **One rename:** `core_stats` **Botique -> Boutique**.
- **Read-back confirmed:** `core_stats` **85 total / 85 verified / 62 sourced / 23
  unsourced**; `implant_stats` **120 / 119 / 81 / 38**.

### 1. *** THE DECISION - AND WHY IT WAS NOT A FLIP ***

C1 was framed for weeks as *"do we flip the 204 to `verified = false`?"* **It
resolved differently.** The owner attested that the core and implant data was
**entered by hand from in-game item cards and is correct.**

> **THE FLAG WAS NEVER WRONG ABOUT THE DATA. IT WAS UNINFORMATIVE.** A pre-ticked
> checkbox set `verified = true` **identically whether anyone verified or not**, so
> the flag carried no signal - not a false signal.

**Therefore the remedy is to RECORD the provenance, not to destroy the claim.**

> **RECORD THIS DISTINCTION: an UNSUPPORTED claim and a FALSE claim need DIFFERENT
> remedies.** The `mod_stats` 86 were flipped because nothing supported them and
> nobody could say otherwise. These 143 were **attributed** because someone could.
> Flipping them would have destroyed correct data to satisfy a process rule -
> **the audit would have "improved" the metric by discarding true facts.**

Contrast with the seven `is_shell_exclusive` rows corrected earlier today: those were
**demonstrably self-contradictory** and needed correcting. **Three categories, three
remedies: false -> correct it; unsupported -> flip or attribute; unrecorded-but-true
-> attribute.**

### 2. THE SCOPING, AND WHAT IT DELIBERATELY EXCLUDES

**The backfill keys on `created_at < 2026-06-01`.**

**The 61 rows from the 2026-06-05 batch (23 core + 38 implant) are NOT covered by the
attestation.** They came from an **unidentified batch writer**, not the form, so
**no claim is made about them.** They remain `verified = true` with **no source**.

> **That is now a VISIBLE state rather than an invisible one.** Before the column
> existed, "verified with no evidence" was indistinguishable from "verified with
> evidence". Now `provenance-check.mjs`-style checks can surface it.
> **THE 61 ARE THE CONCRETE RE-VERIFICATION TARGET.** Key on `id`.

### 3. THE FOUR-ROW EXCEPTION INSIDE THE MARCH WINDOW

**Thick Skull V2** and **Augmented Capacitors V1 / V2 / V3** share
`created_at = 2026-03-16T20:39:55.970314+00`. The admin route inserts **one row per
call** and **cannot** produce a microsecond-identical cluster - so their own
timestamps contradict form entry.

| id | name |
|---|---|
| e8351b53-b495-438d-ab6c-426d256b9125 | Thick Skull V2 |
| 19e2beff-524b-4ea2-8655-d9afdcea1515 | Augmented Capacitors V1 |
| 64b151d4-bac9-4821-851f-62793aab33fc | Augmented Capacitors V2 |
| 868e3532-dea7-4924-a5c9-5d60b3161c3c | Augmented Capacitors V3 |

**They received a different string recording BOTH facts** - the owner attestation
**and** that the write mechanism is unidentified.

> **THE REASONING: writing "owner in-game entry" on rows whose own timestamps
> contradict form entry would have put a FALSE PROVENANCE CLAIM into the column
> built to hold true ones.** The column would have been corrupted by its own first
> backfill. **A provenance field that records a convenient story is worse than no
> field**, because it is trusted.

**A FIFTH ROW SHARES THAT TIMESTAMP AND WAS CORRECTLY NOT INCLUDED:** **Ping+ V2**
(`69388a6f-c511-43a7-a048-63b434b9da2b`) is the **single `verified = false` implant
row** (the 119/120), so it was never in the backfill population. **The exception is
four because the fifth was never verified**, not because it was missed.

**This is the ONLY microsecond-identical cluster in the entire March window across
both tables** - confirmed read-only. The rest of the March population is
individually timestamped, which is what makes the form attribution credible for it.

### 4. THE SOURCE STRINGS - verbatim, both

**Standard (62 core + 77 implant = 139 rows):**

> `owner in-game entry, March 2026 (attested 2026-07-21)`

**Exception (4 implant rows, section 3):**

> `owner in-game entry, March 2026 (attested 2026-07-21); batch-inserted, write mechanism unidentified`

> **THE TWO DATES ARE SEPARATED DELIBERATELY. Entry happened in March 2026;
> ATTESTATION happened 2026-07-21.** A future reader must not mistake this for
> provenance recorded at the time. **It is a memory written down four months later**,
> and the string says so on its face rather than in a document the reader may never
> open.

### 5. THE ATTESTATION AND ITS LIMITS

**Owner recollection** - the same class as the Q-Tap and `is_shell_exclusive`
resolutions. **It is now RECORDED provenance rather than unrecorded, which is the
improvement. It is attestation, NOT capture.** No screenshot, no card image, no
timestamped artifact.

**COUNTERVAILING EVIDENCE, recorded honestly:** **the same 2026-03-16 session
produced the six `is_shell_exclusive` contradictions corrected earlier today**
(exclusivity ticked, runner field left empty, six times in ~29 minutes).

> **So "the March entry was careful" is supported FOR THE STAT VALUES and
> demonstrably NOT UNIVERSAL across every field in that sitting.** The same hands
> that read the numbers off the cards also left a boolean in a state that
> contradicted its own neighbouring column. **Attesting the stat values is not
> attesting the whole row.**

### 6. THE CAPTURES - the two backfilled populations

**PROVENANCE OF THESE TABLES, stated plainly:** **no pre-DDL capture was supplied to
this session.** These lists were **derived read-only AFTER the backfill** by
selecting rows with a non-blank `verified_source`.

**Why that is materially less fragile than the 86-row `mod_stats` case:** there, the
flip erased the only thing distinguishing the population, so the list had to be
reconstructed by name-matching. **Here the source string ITSELF identifies the
population** - the rows are self-marking, and the list can be regenerated at any time
by the same query. **The recording below is a convenience, not the only record.**

**The residual risk is narrow and worth naming:** `created_at` is the **only** thing
separating the March population from the June-5 one. Nothing enforces or protects it,
and if it were ever bulk-touched the boundary this backfill relied on would be
unrecoverable.

**`core_stats` - 62 sourced rows**

| # | id | name | created_at |
|---|---|---|---|
| 1 | ab0a841e-debd-4507-96a9-f5891ea3fcda | Cluster Payload | 2026-03-12T13:24:25.429107+00:00 |
| 2 | ba2936b1-871f-42d7-8361-54130e904a61 | Break and Enter | 2026-03-13T23:31:02.224514+00:00 |
| 3 | 9fc59999-0df8-427d-bf24-51b2971ceb54 | Keen Eye | 2026-03-16T17:52:38.3029+00:00 |
| 4 | a48f1537-4952-4e7f-9b82-6101bba312e8 | Adrenal Core | 2026-03-16T17:53:53.629471+00:00 |
| 5 | 62c2afac-56e9-4b71-b64f-43afade2dc15 | Ankle Breaker | 2026-03-16T17:55:35.966703+00:00 |
| 6 | a8a3d454-2db0-4a5c-9468-de98d4455fcc | Bad Cop | 2026-03-16T17:56:30.882448+00:00 |
| 7 | 4683a30a-a9ed-4b5e-9199-430fdb5e018e | Blast Off | 2026-03-16T17:57:34.58734+00:00 |
| 8 | fdfc87c4-e921-4b6c-8cc8-bc4cc87162a5 | Microjet Efficiency Package | 2026-03-16T17:58:47.082296+00:00 |
| 9 | 4c2d96d7-fb4f-4a77-8bf3-e4429e529785 | Intuition | 2026-03-16T18:02:15.377884+00:00 |
| 10 | a2ccd7de-7b54-40bf-9619-15cf301a2df1 | Predator | 2026-03-16T18:03:32.343804+00:00 |
| 11 | 1c52b0ee-d3ae-4100-8d87-ef6c8c9b230d | Fresh Install | 2026-03-16T18:04:41.188118+00:00 |
| 12 | 01a5aa02-fcaf-48da-8fd6-8de32241534c | Intake Vents | 2026-03-16T18:05:54.375781+00:00 |
| 13 | 051b2a1c-a6c1-4d71-a10e-c4ca9646db0b | Heavy Ordnance | 2026-03-16T18:07:03.704509+00:00 |
| 14 | 73232352-45f2-4d31-a9bd-4e74e1a015c7 | Hypocritic Oath | 2026-03-16T18:08:01.144161+00:00 |
| 15 | f299b2d7-ada1-472a-b2ad-cbf8bc2903c8 | Mechanized Holsters | 2026-03-16T18:09:36.847727+00:00 |
| 16 | 71e61e00-0761-4033-b428-e6e4588e1417 | Crime Spree | 2026-03-16T18:10:32.513233+00:00 |
| 17 | 69403c5c-0e42-4c12-836c-15391baa5f7b | Greed is Good | 2026-03-16T18:11:15.297355+00:00 |
| 18 | 8838a6e2-9b47-4b4f-9e55-cf6b5a88219b | Patience | 2026-03-16T18:12:11.30933+00:00 |
| 19 | 6c2dd6e5-7f21-4dae-8b06-85ba4a06774c | Ghost Protocol | 2026-03-16T18:13:31.312133+00:00 |
| 20 | 2c040c84-4ef5-45ad-97a3-d195187a8c0c | Premium Package | 2026-03-16T18:14:43.344447+00:00 |
| 21 | 16229a0f-ee5e-4e51-8ca8-8dec3f812435 | Ounce of Prevention | 2026-03-16T18:15:45.941336+00:00 |
| 22 | 822c6cb3-04ee-4c9d-9f6b-1ac4089d206d | No Good Deed | 2026-03-16T18:17:40.165363+00:00 |
| 23 | 9ebda572-1222-4058-bf52-10676320f0e5 | Out of Dodge | 2026-03-16T18:18:26.544416+00:00 |
| 24 | 40aa9024-c6bc-4d35-b41e-f919119adb2a | Glass Cannon | 2026-03-16T18:57:27.965699+00:00 |
| 25 | 97e39028-9b04-4895-a93d-d72c9c9a666c | Bombardier | 2026-03-16T18:58:49.496782+00:00 |
| 26 | 66fee488-7d94-4775-ab28-87dd0f895ec2 | Minus Sights | 2026-03-16T19:00:27.227205+00:00 |
| 27 | 4bf046eb-6cf7-4123-8aed-d09cc3b07b4e | Partner in Crime | 2026-03-16T19:01:36.0833+00:00 |
| 28 | 9ed8b06a-ef5d-4ad9-8657-a7f57fdc9a99 | Hot Pursuit | 2026-03-16T19:14:42.637805+00:00 |
| 29 | 3b196228-bcdf-405b-811b-f7908976fe4c | High-Octane Propellant | 2026-03-16T19:15:37.693602+00:00 |
| 30 | ee3a030b-f376-4eba-ac3a-adf2597e24a1 | Breathing Space | 2026-03-16T19:16:26.813147+00:00 |
| 31 | cce0012e-1b85-456b-92a6-37bba67f9778 | Friendly Face | 2026-03-16T19:17:16.488757+00:00 |
| 32 | 00bb608b-8829-4665-8bbb-73167ee9e669 | Lock 'N Load | 2026-03-16T19:18:12.860113+00:00 |
| 33 | c31c027e-d28c-4a9c-9c6e-211a3da368ec | Cash Flow | 2026-03-16T19:19:06.812604+00:00 |
| 34 | 3a1fb19d-5b52-4e67-966a-585c7ec7d0bd | Hit and Run | 2026-03-16T19:20:14.166571+00:00 |
| 35 | 65f98afd-53e7-49f2-ac9d-d3a7704d2e5e | Static Casket | 2026-03-16T19:21:40.854901+00:00 |
| 36 | f104ee78-e054-48e9-ae07-06a22a437806 | Like for Like | 2026-03-16T19:23:18.453039+00:00 |
| 37 | 99afce49-25e6-4dc8-b498-852eab222e68 | The Big Score | 2026-03-16T19:24:04.887096+00:00 |
| 38 | 86abe0d6-b4d5-4cef-a840-51b2f91ed855 | Bullrush | 2026-03-16T19:25:01.266547+00:00 |
| 39 | 5ab1714f-a687-4373-aa25-27c39335fc86 | Flight Response | 2026-03-16T19:26:52.163548+00:00 |
| 40 | f2a3e757-b5bc-46b8-9f38-2395cc789ed9 | High Voltage | 2026-03-16T19:28:01.57177+00:00 |
| 41 | 3500c0d3-26ff-4f61-b245-8bf59bcdd3c5 | Tag! | 2026-03-16T19:28:37.726026+00:00 |
| 42 | 053f91aa-aa9e-4fd9-aaf2-e96db9af9c14 | Flexweave casing | 2026-03-16T19:29:29.106653+00:00 |
| 43 | 0d52fe0a-c3b9-496e-ad92-f03a77a7b396 | Myrmidon | 2026-03-16T19:30:07.572238+00:00 |
| 44 | 478dfec6-5594-44b2-b70a-ebd8fac67738 | On the Trail | 2026-03-16T19:31:19.987744+00:00 |
| 45 | 31b6d275-702b-4467-a5d7-bc13a9e111fd | Cut to the Chase | 2026-03-16T19:31:59.948884+00:00 |
| 46 | caa93766-d4e2-40e7-ac68-b4ba6ae92916 | Bombing Run | 2026-03-16T19:33:32.028153+00:00 |
| 47 | 39e0228d-cc7b-4bf2-bad9-f940d36b8371 | Calling Card | 2026-03-16T19:34:27.716735+00:00 |
| 48 | 7ed6e54e-936b-41a3-9035-0b0378de9df7 | Eye in the Sky | 2026-03-16T19:35:17.68419+00:00 |
| 49 | 8ac57a83-6fae-4d9a-bf19-25c746cb9edd | Case the Joint | 2026-03-16T19:36:00.172622+00:00 |
| 50 | aee87e14-0382-4f69-87d3-28ab9904ce10 | Guerrilla | 2026-03-16T19:37:11.151423+00:00 |
| 51 | 12d497ca-9617-4dcd-b617-005f63c51696 | Hunter/Killer | 2026-03-16T19:45:11.47769+00:00 |
| 52 | b9187862-c416-4927-a288-a6cdf169a720 | Electron Recapture Sinks | 2026-03-16T19:46:00.477831+00:00 |
| 53 | 20daa2ae-0e23-4145-b897-49f4cac47752 | Safe Landings | 2026-03-16T19:46:40.743042+00:00 |
| 54 | 9daa5013-7cf8-4464-a73b-1fcbaaed8246 | Impact Siphons | 2026-03-16T19:47:21.447089+00:00 |
| 55 | ac2b5add-41db-43af-a557-62e68c164ed8 | Shadow Strike | 2026-03-16T19:48:03.4945+00:00 |
| 56 | 1084a9cf-fed6-4d6d-8db4-84e3ee8f66ed | Early Warning System | 2026-03-16T19:48:52.417516+00:00 |
| 57 | a0102552-43b2-4a88-9d0a-1b5981b34794 | Echo Chamber | 2026-03-16T19:49:59.19972+00:00 |
| 58 | 4c4a69fa-31fe-4c3a-83e7-41418bd081a4 | Low Profile | 2026-03-16T19:50:57.308061+00:00 |
| 59 | 500e8076-23c5-4b74-b5cb-62ecace8f62a | Boutique | 2026-03-16T19:51:38.700124+00:00 |
| 60 | 18ed91c0-86a5-446e-ba8a-921a9885e10d | Samaritan | 2026-03-16T19:52:29.04482+00:00 |
| 61 | c75e2459-b4d6-401d-b565-fe03750ff7ab | Counter Attack | 2026-03-16T19:52:59.611605+00:00 |
| 62 | 7bb49ba4-09b5-4b04-ad68-ad70d4ad0c5b | Hideout | 2026-03-16T19:53:45.064151+00:00 |

**`implant_stats` - 81 sourced rows**

| # | id | name | created_at |
|---|---|---|---|
| 1 | e8351b53-b495-438d-ab6c-426d256b9125 | Thick Skull V2 | 2026-03-16T20:39:55.970314+00:00 |
| 2 | 19e2beff-524b-4ea2-8655-d9afdcea1515 | Augmented Capacitors V1 | 2026-03-16T20:39:55.970314+00:00 |
| 3 | 64b151d4-bac9-4821-851f-62793aab33fc | Augmented Capacitors V2 | 2026-03-16T20:39:55.970314+00:00 |
| 4 | 868e3532-dea7-4924-a5c9-5d60b3161c3c | Augmented Capacitors V3 | 2026-03-16T20:39:55.970314+00:00 |
| 5 | 41dfd1d9-7d3e-46f8-8f46-60703d512c7a | Augmented Capacitors V4 | 2026-03-16T20:42:06.172281+00:00 |
| 6 | 94c70d9b-90ce-48d3-b95d-182c52f65dc8 | Energy Harvesting V5 | 2026-03-16T20:42:52.479197+00:00 |
| 7 | 31294f1b-6950-4a4e-a30c-16cb3fc44030 | Ping+ V3 | 2026-03-16T20:45:06.00456+00:00 |
| 8 | 8ee7d47b-6368-479f-88ea-f9bca0828e31 | Energy Harvesting V3 | 2026-03-16T20:46:18.230549+00:00 |
| 9 | 834eff3e-9364-45fd-8388-16622d4763bb | Ping+ V1 | 2026-03-16T20:48:20.42141+00:00 |
| 10 | be0acf2a-e916-4e49-9865-edd382f9d89c | Sprint Kit V1 | 2026-03-16T20:49:14.233253+00:00 |
| 11 | 36dd2ce9-23d0-49bb-9f94-d484d6ba760c | Energy Harvesting V1 | 2026-03-16T20:50:28.483429+00:00 |
| 12 | 5cc21348-e0a6-4102-a51f-f38fca4ce2a4 | Energy Harvesting V2 | 2026-03-16T20:51:31.769484+00:00 |
| 13 | ba838b8b-d0ff-44fc-b59b-7784d1a95cc8 | Sprint Kit V2 | 2026-03-16T20:52:50.762196+00:00 |
| 14 | 4a153599-a715-4714-88a1-9bddb510d9e8 | Sprint Kit V4 | 2026-03-16T20:53:57.163+00:00 |
| 15 | 2be767a9-4f63-4b34-83fd-4fc078c99899 | Ping+ V4 | 2026-03-16T20:55:19.391735+00:00 |
| 16 | 1006353d-27c4-4fba-a556-911a6e4a55bd | Regen V4 | 2026-03-16T20:57:00.413078+00:00 |
| 17 | 1c4ad858-b9b3-42c5-934b-f05a2f1e50b4 | Sprint Kit V3 | 2026-03-16T20:57:43.279752+00:00 |
| 18 | b4b031f3-5c79-44b6-bd9f-0261dc295fa3 | Sprint Kit V5 | 2026-03-16T20:58:16.146245+00:00 |
| 19 | 8ca0f0e5-da69-41d1-a29e-ec01a43a7581 | Regen V1 | 2026-03-16T20:59:12.064452+00:00 |
| 20 | c0052dff-c1ab-4b62-9c54-96776d0e805b | Ping+ V5 | 2026-03-16T20:59:50.137451+00:00 |
| 21 | 7056a6d5-c0fe-4bc2-bc56-b9251978c136 | Regen V2 | 2026-03-16T21:01:02.703327+00:00 |
| 22 | 6c68c052-1bd2-4eab-9dc3-fdb73ff2d6ac | Regen V5 | 2026-03-16T21:01:34.958819+00:00 |
| 23 | fad8382c-0318-48bd-b5a3-829ba1d6d65d | Augmented Capacitors V5 | 2026-03-16T21:02:41.698163+00:00 |
| 24 | 3e6caa4c-e27f-41ff-90fe-247a951fd013 | Regen V3 | 2026-03-16T21:04:52.707838+00:00 |
| 25 | 07b21e7b-5ab0-43ec-b56a-8f0bf776b347 | Energy Harvesting V4 | 2026-03-16T21:06:04.562694+00:00 |
| 26 | 37375574-cb17-48dd-a0d8-23539e328934 | Distance Runner V3 | 2026-03-16T21:07:11.279042+00:00 |
| 27 | 34ae3334-02c2-40d8-8b19-17e8d10ebe8c | Graceful Landings V2 | 2026-03-16T21:08:00.890779+00:00 |
| 28 | 093f3b1e-b3a1-49cb-93de-12f1babd72df | Solid Stance V4 | 2026-03-16T21:08:59.687468+00:00 |
| 29 | 925c5a0f-5d70-49e4-a526-772cac4f4195 | Solid Stance V2 | 2026-03-16T21:10:17.775264+00:00 |
| 30 | cc40a1b6-de84-4738-a92d-f78c7e0b2c05 | Strike Kit V5 | 2026-03-16T21:12:06.493606+00:00 |
| 31 | 2c038663-8483-4586-b48e-c32dae6a610c | Strike Kit V2 | 2026-03-16T21:13:57.551203+00:00 |
| 32 | 84cc9aa2-e7f4-4672-90c7-250f98461418 | Solid Stance V5 | 2026-03-16T21:16:09.961808+00:00 |
| 33 | 711179b0-ba9b-47c7-bcd8-85ae5dc0f748 | Bionic Leg Upgrades V4 | 2026-03-16T21:17:11.731262+00:00 |
| 34 | a8c9251d-35a6-4b1a-82a3-34465207e410 | Distance Runner V5 | 2026-03-16T21:18:05.7822+00:00 |
| 35 | 07b0786f-8ac2-4c02-b543-a2715c3c9e6f | Graceful Landings V1 | 2026-03-16T21:18:32.565114+00:00 |
| 36 | def1b6de-784e-4530-8d8e-51f097a1fbad | Bionic Leg Upgrades V5 | 2026-03-16T21:20:50.810437+00:00 |
| 37 | 1d25b722-bd59-493d-a732-1eefb4aeba3e | Bionic Leg Upgrades V1 | 2026-03-16T21:21:39.080157+00:00 |
| 38 | 3fae0812-8242-4109-a610-d8f8e4920d91 | Solid Stance V1 | 2026-03-16T21:22:17.368013+00:00 |
| 39 | ed75449b-b81a-443a-9f18-1b717534d342 | Distance Runner V2 | 2026-03-16T21:23:55.897587+00:00 |
| 40 | 1528e0c5-a231-4e43-93ca-843e171ad387 | Strike Kit V4 | 2026-03-16T21:24:35.077334+00:00 |
| 41 | ba917766-c177-4a01-b853-f01b0d70a1b2 | Strike Kit V1 | 2026-03-16T21:25:14.547757+00:00 |
| 42 | 3101a3c7-46aa-479f-b244-e2f1e9c838c1 | Graceful Landings V3 | 2026-03-16T21:26:39.524834+00:00 |
| 43 | afb988e1-43c9-45cc-a95e-502b5f644ef7 | Graceful Landings V4 | 2026-03-16T22:06:24.552458+00:00 |
| 44 | 443b3f50-54db-45a9-99dc-dbe4329ea27b | Distance Runner V4 | 2026-03-16T22:07:27.316204+00:00 |
| 45 | 833356af-8274-49ad-a3fb-2a6cb94e65b7 | Distance Runner V1 | 2026-03-16T22:08:44.590343+00:00 |
| 46 | c0f432ee-f444-41e1-b8df-74ab320dd2a3 | Solid Stance V3 | 2026-03-16T22:10:29.087197+00:00 |
| 47 | 220c8a19-cce5-426b-80d5-2ff145eef963 | Graceful Landings V5 | 2026-03-16T22:11:08.45481+00:00 |
| 48 | b300a734-e6a4-4b89-8deb-4e8bf79e658d | Strike Kit V3 | 2026-03-16T22:11:54.62624+00:00 |
| 49 | 5d1b52af-9247-46cc-bf07-aa631d234bf5 | Protector V2 | 2026-03-16T22:14:13.220471+00:00 |
| 50 | 1e820986-a39f-4f46-a16d-1feee2359164 | Spectre Armor | 2026-03-16T22:15:35.669115+00:00 |
| 51 | 26d23367-5014-46c0-9f2f-1442a6f00f37 | Kinetic Resistance V2 | 2026-03-16T22:16:31.730116+00:00 |
| 52 | 83a82086-ca51-499a-a6d4-373ea08f8754 | Volt Resistance V2 | 2026-03-16T22:17:14.687159+00:00 |
| 53 | e143fc61-7ca8-443f-b61b-b4a0226a4289 | Protector V1 | 2026-03-16T22:19:27.129502+00:00 |
| 54 | 78bcc501-cd0f-462a-afa8-30e5c4dacb2f | Reinforced Shields V1 | 2026-03-16T22:20:20.670781+00:00 |
| 55 | 34fead21-3bf0-41e1-a767-379f020f40a8 | Protector V3 | 2026-03-16T22:21:13.169153+00:00 |
| 56 | 40d861e6-0eb2-4678-8b02-d2910453e605 | Volt Resistance V1 | 2026-03-16T22:22:07.73755+00:00 |
| 57 | 320d8e93-d681-4323-ba5a-224f870ab112 | Reinforced Shields V2 | 2026-03-16T22:23:35.378839+00:00 |
| 58 | 0c509126-2158-4531-a2cc-0d73f1d27c82 | Helping Hands V1 | 2026-03-16T22:25:11.517574+00:00 |
| 59 | 24cc97fd-6830-4bb8-8719-547397567545 | Nimble Fingers V5 | 2026-03-16T22:26:22.826042+00:00 |
| 60 | cb23db6a-b20d-4911-ba02-df4cc90ee4a9 | Helping Hands V4 | 2026-03-16T22:27:25.678985+00:00 |
| 61 | 530ef4e7-a061-4ac8-b295-7923f18a0341 | Helping Hands V2 | 2026-03-19T14:46:32.796206+00:00 |
| 62 | 11dc1a7e-0c42-4032-8360-5b16410a1a2e | Survival Kit V2 | 2026-03-19T14:48:23.212434+00:00 |
| 63 | 0b2b04de-e5b5-4c50-850b-1e211f16795f | Hurting Hands V2 | 2026-03-19T14:56:27.485367+00:00 |
| 64 | 943c412d-6a94-4b96-b2ff-e61b849f558c | Survival Kit V3 | 2026-03-19T14:58:31.875516+00:00 |
| 65 | 490da9a1-729b-43ed-8a57-13662389696a | Helping Hands V3 | 2026-03-19T15:00:27.110302+00:00 |
| 66 | 75a25188-baa4-4b3b-832e-6f6df7b24978 | Survival Kit V5 | 2026-03-19T15:09:20.863531+00:00 |
| 67 | 15e89781-0ddb-4dd2-996a-e4b6586e966a | Knife Fight V2 | 2026-03-19T15:10:59.373524+00:00 |
| 68 | 69c004db-1cdf-4a87-8608-86e6c857503d | Knife Fight V3 | 2026-03-19T15:22:49.391668+00:00 |
| 69 | 570d4209-a6a5-4a04-8b66-10082e670755 | Knife Fight V4 | 2026-03-19T15:25:39.86686+00:00 |
| 70 | 823eb3e3-f47e-4428-a828-904ca252b775 | Survival Kit V4 | 2026-03-19T15:28:28.513546+00:00 |
| 71 | a345a39c-e565-401e-b382-9a729dc75801 | Nimble Fingers V1 | 2026-03-19T15:30:02.05257+00:00 |
| 72 | befcee47-2107-4929-ad40-896f17ff5183 | Survival Kit V1 | 2026-03-19T15:31:17.417407+00:00 |
| 73 | edae8848-b842-44d0-b369-393e1e6f8ece | Knife Fight V5 | 2026-03-19T15:32:22.392815+00:00 |
| 74 | 4e77fff4-e184-4d81-b2fd-e41db3b8e963 | Nimble Fingers V2 | 2026-03-19T15:33:47.992272+00:00 |
| 75 | 03e9b563-eea2-47fa-984b-708235809698 | Knife Fight V1 | 2026-03-19T15:35:27.816161+00:00 |
| 76 | 49b11728-e517-438f-acfa-542ea882f452 | Helping Hands V5 | 2026-03-19T15:36:17.690822+00:00 |
| 77 | dc5045ba-3177-4915-875c-ab8e259c381b | Hurting Hands V4 | 2026-03-19T15:38:03.377704+00:00 |
| 78 | 343bdef1-a799-480e-b90e-9491e243a5e9 | Hurting Hands V1 | 2026-03-19T15:39:35.754582+00:00 |
| 79 | 17b6bcb0-a9b1-44a0-9e32-bdd370160d86 | Hurting Hands V3 | 2026-03-19T15:40:54.699716+00:00 |
| 80 | a3921919-b4be-4a40-91af-3ec4b2d16a3e | Hurting Hands V5 | 2026-03-19T15:41:52.889272+00:00 |
| 81 | 6221ddad-a832-4416-9781-2f474ab70209 | Survivor Kit V2 | 2026-03-19T15:43:40.139485+00:00 |

### 7. WHAT THIS UNBLOCKS

- **`verificationState()` can now require a source without a 204-row cliff.** The
  predicate question moves **from BLOCKED to DECIDABLE** - it is now a judgement
  about the 61, not a 204-row downgrade.
- **The dexter write gate's remaining blocker is now a DECISION, not a missing
  capability.** `CORE_IMPLANT_WRITES_ENABLED` waits on a choice, not on schema.
- **Corrections like today's `is_shell_exclusive` fix now have somewhere to live
  besides HANDOFF.** The ceiling recorded in that entry - *"there is nowhere in the
  row to record why this was corrected"* - **no longer applies to these two tables.**

### 8. *** WHAT IS STILL MISSING - the gap that makes the columns inert ***

**The admin form does NOT expose `verified_source` for `core_stats` or
`implant_stats`.** It **does** expose `verified` as a boolean for both.

> **So a future tick still has no source field beside it, and the new column will
> stay EMPTY on every new row.** The DDL created the **capacity**; it did not create
> the **practice**.

**THE `weapon_stats` PRINCIPLE, restated because it is the whole lesson:**

> **A truth flag and its justification must be a SINGLE UI ACT. Split them and the
> flag drifts free of the claim.**

`weapon_stats` has zero unsourced verified rows **not through discipline** but
because the click that ticks its box demands a source in the same act.

> *** THIS IS THE NEXT CODE TASK. Until the form change lands, this DDL is a
> container nobody fills. ***

### 9. STILL OPEN

- **`Survivor Kit V2`** (`implant_stats` `6221ddad-a832-4416-9781-2f474ab70209`).
  **Survival Kit V1-V5 all exist**, including a **V2 at
  `11dc1a7e-0c42-4032-8360-5b16410a1a2e`**. Whether `Survivor Kit V2` is a **distinct
  item or a typo'd duplicate is UNRESOLVED and needs an in-game check.**
  **DO NOT RENAME BLIND:** doing so would create **two rows named `Survival Kit V2`**
  and make the dexter resolver report **`ambiguous`** - converting a resolvable row
  into an unresolvable one. **The fix would cause the bug.**
- **Two renames landed:** `core_stats` **Botique -> Boutique**; `implant_stats`
  **Graceful Landing V4 -> Graceful Landings V4** (now consistent with V1-V3, V5).
  **These matter OPERATIONALLY, not cosmetically:** the dexter resolver keys on the
  **exact raw name with no normalisation** (`50cd7ac`), so **a typo'd row can never
  resolve and lands in the `absent` counter permanently.** A misspelling is a
  permanent write failure, not a display blemish.
- **`provenance-check.mjs` still does not cover `core_stats` or `implant_stats`.**
  Now that both carry `verified_source`, **adding them is possible** and would put
  **the 61 unsourced rows under the same watch as everything else.** Its coverage is
  still **363 of 657 rows**. **Not done - flagged.**

---

## 2026-07-21 - is_shell_exclusive: 7 self-contradicting rows corrected, and NULL IS NOT UNKNOWN

**Owner ran the SQL directly in the Supabase SQL editor.** Documentation only here.

- **6 rows** flipped `is_shell_exclusive` **true -> false**. Predicate:
  `is_shell_exclusive = true AND required_runner blank`.
- **1 row (Cluster Payload)** flipped **false -> true**, keeping `required_runner = Recon`.
- **Read-back confirmed: still_exclusive 75, exclusive_no_runner 0,
  universal_with_runner 0, universal 10, total 85.**
- **No other column altered. Row count unchanged.**

### 1. THE CONTRADICTION AUDIT - established from the data alone

**7 of 85 rows were internally inconsistent.** A row cannot be both:

- **6 claimed exclusivity while naming no shell** (`is_shell_exclusive = true`,
  `required_runner` null) - exclusive to a shell they do not identify.
- **1 claimed universal while naming a shell** (Cluster Payload:
  `is_shell_exclusive = false`, `required_runner = Recon`).

**NO GAME KNOWLEDGE WAS NEEDED TO FIND THESE.** The contradiction is visible in the
two columns alone, which is what made it the cheapest available check on whether
batch-set values are even self-consistent. **They were not.**

### 2. THE FLIPPED SIX - the only record of which rows moved

**PROVENANCE OF THIS TABLE - RECONSTRUCTED POST-FLIP, NOT YET DIFFED AGAINST THE
CAPTURE THAT EXISTS.**

*How it was built:* these ids were resolved **after** the flip by name. Soundness:
**all six names are unique in `core_stats`** (the table has exactly two duplicate
names, Predator and Hunter/Killer, neither of them here), so the join is
deterministic; `created_at` was not touched by the UPDATE. **Post-flip these six are
otherwise indistinguishable from the four rows that were already universal.**

*Its verification status:* ~~No id list was captured before the UPDATE.~~
**CORRECTED 2026-07-21 - that sentence was FALSE.** A **pre-flip capture DOES
exist**: the query output including ids was run in the Supabase SQL editor and
**recorded in the planning chat transcript before the UPDATE ran.** It was **not
supplied** to the session that wrote this entry, so **the reconstruction has NOT
been diffed against it.**

> **STATUS: UNVERIFIED-BUT-VERIFIABLE.** That is a third state, and it is not the
> same as either of the two it sits between. **Not verified** - no comparison has
> been performed, and nothing here may be read as one. **Not unverifiable** - the
> authoritative record exists and the check remains available to any later session
> that is handed it. The original sentence collapsed this into "unverifiable",
> which understated what is recoverable and would have discouraged a check that can
> still be done.

**Contrast with the 86-row `mod_stats` list**, which was reconstructed the same way
and *was* diffed against its capture (0 differences on all 86 ids). **Same method,
different verification status. Do not read one as evidence for the other.**

| # | id | name | rarity | required_runner | created_at |
|---|---|---|---|---|---|
| 1 | 40aa9024-c6bc-4d35-b41e-f919119adb2a | Glass Cannon | Standard | NULL | 2026-03-16T18:57:27.965699+00:00 |
| 2 | c31c027e-d28c-4a9c-9c6e-211a3da368ec | Cash Flow | Standard | NULL | 2026-03-16T19:19:06.812604+00:00 |
| 3 | 65f98afd-53e7-49f2-ac9d-d3a7704d2e5e | Static Casket | Standard | NULL | 2026-03-16T19:21:40.854901+00:00 |
| 4 | f104ee78-e054-48e9-ae07-06a22a437806 | Like for Like | Standard | NULL | 2026-03-16T19:23:18.453039+00:00 |
| 5 | 99afce49-25e6-4dc8-b498-852eab222e68 | The Big Score | Standard | NULL | 2026-03-16T19:24:04.887096+00:00 |
| 6 | 5ab1714f-a687-4373-aa25-27c39335fc86 | Flight Response | Standard | NULL | 2026-03-16T19:26:52.163548+00:00 |

**Cluster Payload** (the 1 flipped the other way) is older still: created
**2026-03-12T13:24:25.429107+00:00**, `required_runner = Recon`, now
`is_shell_exclusive = true`.

### 3. MECHANISM - *** DIFFERENT FROM THE 204 ***

The six `created_at` values run **2026-03-16 18:57:27 -> 19:26:52**, each **distinct
to the microsecond**: roughly **29 minutes of individual inserts**, one at a time.

**THIS IS NOT THE JUNE 5 CLUSTERED WRITER.** No microsecond collisions, no batch
signature. It reads as **one sitting at the admin form** where the exclusivity box
was ticked six times and the runner field left empty each time. **Cluster Payload
(2026-03-12) also predates the June 5 batch.**

So `is_shell_exclusive` carries values from **at least two distinct origins** - this
March form session, and the June 5 batch that set 23 of the other rows. **The 204
arc and this one share a column and not a cause.**

### 4. RESOLUTION SOURCE, AND ITS CEILING

**Correctness was settled by OWNER GAME KNOWLEDGE, 2026-07-21:** cores are
ability/trait modifiers, two slots per shell; **the six appear in the shared pool any
shell can equip**, and **Cluster Payload is a Recon Superior core**.

**RECORDED AS RECOLLECTION, NOT CAPTURED PROVENANCE** - the same class as the Q-Tap
resolution, and it does not become evidence by being correct.

> *** THE CEILING, stated plainly: `core_stats` HAS NO `verified_source` COLUMN.
> There is NOWHERE IN THE ROW to record why this was corrected. This HANDOFF entry
> is the only record that these seven rows were touched, by whom, or on what basis.
> ***

**This is a concrete, shipped instance of exactly what the C1 DDL question is
blocking.** Not hypothetical debt: a correction was made today whose justification
has no home in the database.

### 5. WHAT WAS LIVE - *** CONFIRMED WRONG, not merely unproven ***

Before the fix, reaching generation every run:

- **`lib/editorCore.js:708`** rendered the six as **", Shell-Exclusive"** into editor
  context for **all five editors**.
- **`app/join/intake/IntakeClient.js:194`** **withheld them from shells they belong
  on** - the filter routes an exclusive core only to its named runner, and with a
  null runner they reached fewer shells than they should.
- **Cluster Payload rendered ", Universal"** while carrying `Recon`.

> **CATEGORY DISTINCTION, and it matters: these were CONFIRMED WRONG FACTS reaching
> generation. The 204 parked rows are UNPROVEN - unsupported flags that may well be
> right. These seven were demonstrably self-contradictory.** Different severity,
> different urgency, and the reason this one was fixed today while the 204 stay
> parked.

### 6. *** NULL IS NOT UNKNOWN - the finding that forecloses the obvious fix ***

`is_shell_exclusive` is **nullable** with **DEFAULT false**, so **the schema can
represent unknown.** The consumers cannot.

**All three read sites test FALSINESS, and `null` is falsy in JS:**

| site | expression | `true` | `false` | **`null`** |
|---|---|---|---|---|
| `editorCore.js:708` | `core.is_shell_exclusive ? ', Shell-Exclusive' : ', Universal'` | Shell-Exclusive | Universal | **Universal** |
| `IntakeClient.js:194` | `if (!c.is_shell_exclusive) return true;` | runner check | offered to all | **offered to all** |
| `IntakeClient.js:221` | `c.is_shell_exclusive && c.required_runner ? ...` | tag shown | tag suppressed | **tag suppressed** |

**Verified: `null` and `false` produce byte-identical behaviour at all three sites.
Nothing throws, nothing renders oddly.**

> **CONSEQUENCE - RECORD THIS AS A SEQUENCING RULE.**
> **`null` cannot mean "unknown" to any current reader.** A null core would be
> rendered **"Universal"** to editors and **offered on every shell** - it would MAKE
> THE CLAIM, not abstain from it.
> **THEREFORE THE CONSUMER CHANGE IS THE PREREQUISITE, NOT THE FOLLOW-UP.** Any
> future migration of uncertain rows to `null` must teach all three sites to
> distinguish THREE states **FIRST**. Do it in the other order and the intermediate
> state publishes wrong facts - migrating to null would look like hedging while
> actually asserting.

**The generalisation:** a nullable column only expresses uncertainty if something
reads it that way. Schema capability is not semantics.

### 7. `shield_compatible` - DEAD COLUMN, no action taken

**`weapon_stats.shield_compatible` has ZERO readers** in `app/`, `lib/`,
`components/` or `scripts/`. Its **only** appearance in the repo is the admin field
config (`app/admin/page.js:49`). Nothing selects it, renders it, filters on it or
gates by it; **the scraper does not write it.**

Distribution: **32 rows, 2 true, 30 false, 0 null.** So the form default of `true` is
the **MINORITY** value (~94% of weapons are false) - **but with no consumer, the
claim is made to no audience.**

> **The open question is whether the column should EXIST, not what its default
> should be.** Justin's call, needs DDL. **Not touched in `3d9d928`, not touched
> here.**

### 8. THE `3d9d928` FRAMING WAS WRONG - corrected

Both columns were excluded from `3d9d928` as *"the same shape as `verified`, one
field over."* **That framing is incorrect and must not be carried forward.**

- **`verified = false` means NO CLAIM MADE.** Removing a `true` default removes an
  unearned assertion.
- **`is_shell_exclusive = false` and `shield_compatible = false` are POSITIVE CLAIMS
  about game facts.** Changing their default would **INVERT an unchecked assertion
  rather than remove one.**

And the arithmetic would have made it worse: **`is_shell_exclusive` is 80 of 85
true**, so flipping its default to `false` **would have been wrong far more often
than right** - and the wrongness would surface as a **confident "Universal"** in
editor context rather than as a visible gap.

> **METHOD RULE: before copying a fix to a neighbouring field, establish what that
> field's `false` value ASSERTS. A safe default exists only where one value means
> "no claim." Where both values are claims, there is no honest default and the fix
> belongs somewhere other than the default.**

This is the same label-vs-substance family as the rest of the arc, inverted: here the
*fix* nearly inherited a meaning it did not have.

### 9. STILL OPEN - each flagged NOT resolved

- **The admin form still defaults `is_shell_exclusive` and `shield_compatible` to
  `true`** and **cannot express unset** - every save necessarily writes true or
  false. **Deliberately not changed**, because the right change depends on 6 and 7.
- **The remaining 75 exclusive rows are now internally COHERENT but UNVERIFIED.**
  **Coherence is not correctness** - the same distinction the Rook arc produced. All
  75 now agree with themselves; nothing establishes they agree with the game.
- **`shield_compatible` existence question** - needs Justin and DDL.
- **C1 unchanged, and now blocking a THIRD column.** `mod_stats` had
  `verified_source` and could be remediated; `core_stats` and `implant_stats` cannot
  record provenance at all; and today a correction was made to `core_stats` with
  nowhere to write down why.

---

## 2026-07-21 - dexter-stats writers repaired: 33 days of silent total failure

Two commits shipping as one unit: **`72650fb`** (payload repair + write gate +
summary line) and **`50cd7ac`** (key on `id`, refuse ambiguous/absent names).
**No data writes, no DDL, gate still off.**

### 1. THE DEFECT AND ITS AGE

`updateCore` and `updateImplant` set `update.patch_verified = ACTIVE_PATCH`.
**Neither `core_stats` nor `implant_stats` has that column.** PostgREST rejects an
unknown column in an update payload, so **every core and implant write failed on
every call for ~33 days** (2026-06-18 -> 2026-07-21).

Established from **schema + code, never tested** - testing it requires a write.

**THE SHARP PART:** the breaking commit is **`2d6cb9c` (2026-06-18),
`feat(verification): dexter-stats stamps unverified-by-default (phase 5)`** - the
commit that **introduced the honesty stamp**. It added `verified = false` and
`patch_verified = ACTIVE_PATCH` to all four writers **simultaneously**, and because
the two lines were added **as a pair**, the rejection took both down together.

**So the unverified-by-default stamp has never once landed on the two tables that
most needed it.** `core_stats` (85/85 `verified = true`) and `implant_stats`
(119/120) are exactly the tables where honest hedging mattered, and the fix for
that exempted them by accident. **The honesty fix broke the honesty it was adding.**

Before `2d6cb9c` both writers had neither line and **wrote successfully** - so this
is *worked, then broke*, not *never worked*.

### 2. *** WHY IT WAS INVISIBLE - the error handling was present, correct, and unread ***

```js
if (error) {
  console.error('[dexter-stats] Core update failed: ' + row.name + ' -- ' + error.message);
  return false;   // <- caller loop just continues
}
```

Logged, did not throw. The caller's `if (await updateCore(row)) coresUpdated++;`
simply did not increment and moved to the next row. The outer `try/catch` in
`lib/gather/index.js:184` never fired because nothing threw. The run completed
normally and re-armed its 24h throttle.

**What a reader saw:**

```
[dexter-stats] Pipeline complete -- 0 shells, 3 weapons, 0 cores, 0 implants updated
```

**`0 cores, 0 implants` is EXACTLY what a legitimate no-op prints.** This pipeline
only targets rows with NULL fields, so "nothing needed updating" is a normal,
expected outcome. **The summary line did not merely fail to report the failure - it
actively asserted the innocent reading of it.**

**THE PATTERN, and it is the strongest instance yet:** *a check that runs, works,
and is never read is not a check.* `console.error` in a cron-invoked gather module
goes to a platform function log with no alerting and nothing that reads it. The
defect was fully instrumented and completely invisible for 33 days.

### 3. WHAT SHIPPED IN `72650fb`

- **Payload repaired** - `patch_verified` removed from those two writers only.
  `updateWeapon` / `updateShell` keep it; their tables have the column.
- **`CORE_IMPLANT_WRITES_ENABLED`, hardcoded `false`.** Repairing the payload
  **re-arms** writers that set `verified = false` against the 204 parked rows.
  Hardcoded constant, not an env var: an unset env var **fails dangerous** and is
  invisible in review; a default-`false` constant means **doing nothing writes
  nothing.**
- **Summary line rebuilt.** Writers now return a **status string**
  (`written` / `failed` / `skipped` / `dry`) instead of a boolean - the old boolean
  collapsed *"nothing to write"* and *"the write was rejected"* into the same
  `false`, **which is precisely what hid this.** Per-writer
  attempted/written/failed/skipped/dry, with the failure and gate lines appearing
  **only when non-zero**.
  *This changed the return contract of all four writers, including the two working
  ones - leaving those on booleans would have let the weapon line lie in exactly
  the way being fixed.*
- **Header amended** to state the **partial stamp** plainly: on these two tables the
  scraper can write `verified = false` **and nothing else**. No `patch_verified`,
  therefore **no per-patch freshness marker and no Phase-4 stale-row cadence hook
  without DDL.** A future "re-verify rows stamped with an older patch" pass can find
  stale weapon and shell rows and **cannot** find stale core or implant rows. **Not
  parity with `weapon_stats`, and the comment now says so.**

### 4. WHAT SHIPPED IN `50cd7ac` - keying on `id`

All four writers keyed their UPDATE on `.eq('name', row.name)`. **Name is not
unique.** Measured:

| table | rows | distinct | duplicate names | rows behind one |
|---|---|---|---|---|
| `shell_stats` | 8 | 8 | 0 | 0 |
| `weapon_stats` | 32 | 32 | 0 | 0 |
| `core_stats` | 85 | 83 | **2** - Predator, Hunter/Killer | 4 |
| `implant_stats` | 120 | 106 | **11**, THREE at x3 - **Pinata, Edge//Runner, Petty Theft** | **25** |

**`72650fb`'s gate comment named only Pinata and undercounted the hazard it exists
to warn about. `50cd7ac` corrects it** - a comment that understates its own warning
is the artifact a future session reads before deciding whether to flip the gate.

**SCOPE - all four, not just the two dirty ones.** `shell_stats` and `weapon_stats`
are unique **BY DATA, not by design**: nothing enforces name uniqueness anywhere,
and the duplicates in the other two arose **exactly as a new variant would**. **Same
principle as the `game_slug` no-op already recorded: a no-op by data is not a no-op
by design.** Hardening two writers and leaving two keyed on a field the codebase has
now twice discovered is not unique would be an asymmetry with no defence.

**RESOLUTION RUNS BEFORE THE GATE**, deliberately. A gated run therefore reports the
**id** it would have written and **still surfaces ambiguity and absence**. That makes
the dry path **a real audit rather than a projection** - fan-out exposure becomes
measurable without enabling a single write.

**THREE REFUSAL STATUSES, deliberately separate:**

- **`ambiguous`** - name matched 2+ rows. *The table cannot tell which row was
  meant.* `console.error`, names the row and every id.
- **`absent`** - name matched 0 rows. *The scraper produced a name that is not in
  the table* - an **extraction-quality** signal (hallucination, rename, stale
  targets list, whitespace/case drift). Quieter line.
- **`lookup_failed`** - the index could not be built. *We do not know.* **Distinct
  from `failed` because no update was attempted**, and `failed` means "attempted and
  rejected".

Merging any two of these would fold different problems into one number - the same
mistake as the boolean that started this.

### 5. *** THE SEMANTICS REQUIREMENT - the subtle half ***

Replacing a server-side `.eq('name', X)` with a JS `Map` lookup **silently changes
what "matches" means** unless the index is keyed on the raw string. Postgres `=` on
text is exact, case-sensitive and whitespace-significant.

**The index keys on the raw name exactly as Postgres returns it - no `trim`, no case
fold, no `normalize`.**

**WHY THIS MATTERS MORE THAN IT LOOKS:** an index that normalised would make rows
that used to match **stop matching**, and they would surface in the new `absent`
counter - **reported as a finding about the data when it was actually a side effect
of the fix.** The change would arrive wearing the costume of improved visibility, and
the new instrumentation would be the thing manufacturing the false signal.

**Verified three ways, all selects:**

1. **Empirical equivalence: 47/47 names, 0 mismatches** - index id-set vs
   server-side `.eq('name', X)`, across all four tables. Sample loaded onto the hard
   cases: every duplicate name, then any name failing `!== n.trim()`, then a spread
   of singles.
2. **Run BEFORE and after the change**, so the equivalence claim is independent of
   the implementation being tested.
3. **Static assertion against the shipped source** - `nameIndex()` must contain no
   normalising call, so a future edit that adds one **fails the check** rather than
   quietly re-introducing this.

**A name that legitimately fails to match on whitespace or case drift is a REAL
finding and belongs in `absent`. The index must not paper over it** - which is the
same reason it must not normalise.

### 6. WHAT REMAINS - the gate is still off

**Keying by `id` removes the fan-out. It does NOT make the writer safe to enable.**

- **The 204 parked rows are untouched.** The writer still sets `verified = false` on
  whatever single row it resolves - **performing part of the unmade C1 decision
  precisely rather than broadly.** Precision is not consent.
- **`CORE_IMPLANT_WRITES_ENABLED` stays `false`.** `50cd7ac` cleared the *keying*
  prerequisite named in `72650fb`; the remaining blocker is **the C1 policy decision
  alone**, and the gate comment now says exactly that.
- **Nothing here validates that the LLM matched the RIGHT row.** A confidently
  resolved, genuinely unique name can still be the wrong item. Uniqueness is not
  correctness.
- **No `patch_verified` on those two tables** - needs DDL, out of scope.

### 7. METHOD RULES (inline convention)

> **A guard that refuses to report a clean result is worth more than one that
> passes.** The payload harness exited **2**, not 0, when the writer signature became
> `(row, ctx)` and its extraction regex stopped matching. **It had found zero
> writers, not zero problems** - and without the guard it would have printed "0
> invalid columns" and meant nothing. Build the refusal in first; a harness that
> cannot fail cannot verify.

> **Sample output in a commit message or comment is documentation, and drifts from
> behaviour like any other label.** `72650fb`'s illustrative summary showed 12 dry
> alongside 12 failures - **a state the code cannot produce**, since the dry return
> precedes the network call. It appeared **in the very commit that fixed a lying
> summary line.** If an example is worth printing, it is worth deriving from the
> code path rather than imagined.

---

## 2026-07-21 - SCOPE CORRECTIONS, and the THIRD flag mechanism (form default)

Corrects four statements in the `127275d` entry and records the arc that postdates
it. **Documentation + one code fix (`3d9d928`). No data writes, no DDL.**

### B1. FORWARD MEASUREMENT CONFIRMED THE REMEDIATION

`scripts/provenance-check.mjs` re-run at `0fb0339`. **Five predictions recorded
BEFORE the run, so this was a test rather than an observation. All five held:**

| | predicted | actual |
|---|---|---|
| check 1 (verified, no source) | 86 -> **0** | 0, on all five tables |
| check 2 (patch-note citations) | **23**, unchanged | 23 (13 + 1 + 9) |
| check 3 (matchup marker) | **0**, unchanged | 0 of 7 with data |
| TOTAL | 109 -> **23** | 23 |
| exit code | still **1** | 1 (read directly, not through a pipe) |

**This is what the pre-backfill gate was replaced with, and it worked as designed:**
a deterministic re-run against a recorded baseline settled the question in one
command - no archaeology, and no dependence on the timestamp column that does not
exist.

**WHAT DID *NOT* MOVE - the honest half.** `mod_stats` check 4 still reads **17
bare / 186 none**, unchanged. The remediation flipped **`verified`**, not
**`verified_source`**. The 86 became **honestly unverified; they did not acquire
sources.** The citation-format picture is identical because nothing about it was
fixed.

### B2. *** THE MEASUREMENT WAS SCOPED TOO NARROWLY - the error that drove this arc ***

A follow-up measurement reported **"requiring a source would move zero rows
today"**. It was taken across **five** tables, because an earlier brief named those
five. **`verificationState()` serves nine.**

**The figure was true of what it measured and false of what it was used to claim.**
The real number is **204**.

**SAME FAMILY as the ~81 misattribution and as A4 below:** a correctly-executed
count, carried out of the scope it was valid in and used to answer a wider
question. The count was never wrong. The sentence around it was.

**THE RULE THIS EARNS:** *when a measurement is scoped by a brief rather than by
the thing being measured, the scope must travel with the number.* "Zero rows would
move" should have been written "zero rows would move **in the five tables carrying
`verified_source`**" - at which point the gap is visible on the page.

### B3. THE FOUR OUT-OF-SCOPE TABLES, as audited (read-only)

| table | rows | `verified=true` | has `verified_source`? | would move |
|---|---|---|---|---|
| `core_stats` | 85 | **85** | **no column** | **85** |
| `implant_stats` | 120 | **119** | **no column** | **119** |
| `cradle_nodes` | 84 | 0 | no column | **0** |
| `ammo_stats` | 5 | 0 | no column | **0** |

**This is a TWO-table question, not a four-table one.** `cradle_nodes` and
`ammo_stats` carry zero migration cost - and note **they are not empty** (84 and 5
rows); the earlier expectation that they were was wrong on row count and right only
on effect.

- `core_stats` and `implant_stats` have **no `verified_source`, no
  `patch_verified`, no `source_url`.**
- `notes` is **0/85 and 0/119 non-blank** on verified rows. The column exists and
  is entirely empty exactly where provenance would live.
- `implant_stats.description` is **73/119 populated but 0 provenance hits** -
  gameplay prose, not sourcing.

**THE ONE REGEX HIT, AND WHY IT WAS REJECTED:** the free-text scan returned a
single match in `core_stats.effect_desc` - *Restorative Overflow, "Using a **patch
kit** briefly increases your hardware…"*. That matched on `/patch/` inside **"patch
kit", the in-game healing item.** Effect text, not a citation. **Recorded as a
false positive rather than counted**, because one unexamined hit is how a zero
becomes a one.

**NO `SOURCE_AGREED` LANDING ZONE.** Under a source-requiring predicate all 204 go
**`CONFIRMED -> UNCHECKED` directly** - the hardest hedge, whose instruction is
*"You MUST NOT state its precise numbers as fact."* Not a soft downgrade: neither
table has the `patch_verified` column the middle branch reads.

### B4. CAUSE OF THE 204 - A THIRD MECHANISM, and it is NOT uniform

**`app/admin/page.js` defaulted every boolean to `true`**, with a `false` exception
for `verified` scoped by **TABLE-NAME PREFIX** (`game_` / `dmz_`) rather than by
field name. `core_stats`, `implant_stats` and `weapon_stats` match neither prefix
and expose `verified` as an editable boolean, so **it arrived at the create form
pre-ticked** and was POSTed explicitly by the generic writer. The DB default
(**`false`, confirmed on all nine tables**) never got a chance to apply.

**So the flag recorded "a human saved this row through the form", NOT "a human
confirmed it in-game."** That is a third mechanism - weaker than a verification
pass, different in kind from a bulk SQL set, and it must not be rounded toward
either.

**NOT UNIFORM - the form explains the majority, not the whole:**

- **~143 March rows are individually timestamped** (63 and 81 distinct values) -
  one insert at a time, the shape a form produces. **These match the mechanism.**
- **61 rows on 2026-06-05 sit in FOUR microsecond-identical clusters** (23, 22, 10,
  6). **The admin route inserts one row per call** (`.insert(row).select().single()`)
  and **cannot** produce those. Something batched wrote them. **It is not
  identified.**

**2026-06-05 is the same date as the `mod_stats` cluster** (81 of 86, 22 sharing a
microsecond). **The coincidence is RECORDED, NOT RESOLVED.** The archaeology on
that session already dead-ended once - the statement is unrecoverable and the
author does not recall it. Recording the date as a lead, not as a finding.

### B5. *** THE DESIGN PRINCIPLE - the transferable half ***

`weapon_stats` sat on the **same** side of the prefix guard and was **equally**
pre-ticked - yet it has **zero** unsourced verified rows. The difference is not
discipline. **It exposes `verified_source` alongside `verified`, so the click that
ticks the box demands a source in the same act.**

> **RULE: a truth flag and its justification must be a single UI act.**
> **Split them and the flag drifts free of the claim.**

`core_stats` and `implant_stats` got the pre-ticked box with **no source field to
fill**, because the column does not exist. Same guard, same default, opposite
outcome - and the variable is whether the interface made the claim and its basis
inseparable.

### B6. THE FIX SHIPPED - `3d9d928`

Boolean default **scoped by field name, not table prefix**: `verified` now defaults
`false` on **every** table.

```js
- if (f.type === 'boolean') defaults[f.key] = (activeTab && (activeTab.indexOf('game_') === 0 || activeTab.indexOf('dmz_') === 0) && f.key === 'verified') ? false : true;
+ if (f.type === 'boolean') defaults[f.key] = f.key === 'verified' ? false : true;
```

**Verified WITHOUT writing a row.** A scratchpad harness (**not committed**)
extracts and evaluates the **real** source text of `SCHEMAS` and
`buildFormDefaults` with the real local constants - **no reimplementation, no
stubs**, because a paraphrase that agrees with itself proves nothing. Before/after:
**207 keys across 20 tables compared, exactly 3 differ** - `weapon_stats.verified`,
`core_stats.verified`, `implant_stats.verified`, each `true -> false`. No other
boolean default moved.

**Five guard assertions passed, including one that reproduced the bug on HEAD
before measuring the fix** - if the before-state had not shown the three pre-ticked
`true`s, the harness would have been wrong, not the finding. Four lint issues
**confirmed pre-existing at HEAD** (same 2 errors + 2 warnings, line numbers shifted
by the +6 comment lines) rather than assumed pre-existing.

**STATED PLAINLY: THIS FIXES THE FAUCET, NOT THE BUCKET. No stored value changed.
The 204 existing rows are untouched and still read `CONFIRMED` to the editors.**

### B7. EXPOSURE, as established

Both tables are in **`editorCore.js:654-655`** and the **advisor's**
(`app/api/advisor/route.js:63, :71`) select sets, **both with `verified`
selected**.

**All 204 currently reach the five editors and the advisor as `CONFIRMED`, with an
empty tag, under a `VERIFICATION_NOTE` instructing the model *"No marker -
confirmed in-game. State the number as fact, no hedge."***

**No public route renders a verified badge from either table.** Every public select
(`/builds`, `/shells/[slug]`, `/join/intake`, `/guides/shells/[name]`,
`/intel/[slug]`) omits `verified` entirely.

### B8. COVERAGE GAP IN THE AUDIT TOOL

`provenance-check.mjs` iterates **eight** tables: the five carrying
`verified_source` plus the three DMZ tables. **`core_stats`, `implant_stats`,
`cradle_nodes` and `ammo_stats` are outside its coverage.**

**The script's own comment is accurate as written** - it scopes itself to *"the
five populated tables carrying `verified_source`"*, and check 1 keys on a column
these four do not have. **The gap is in framing, not in code.**

**CONSEQUENCE: it audits provenance for 363 of the 657 rows `verificationState()`
serves - and the 204 that would move are in the 294 it never looks at.** A green
run on this tool is not a statement about the corpus.

### B9. THE METRIC, forward-looking, predicate attached

**Predicate: `confirmed_data_share` = share of rows across the 9 STAT_TABLES where
`verificationState(row)` returns `CONFIRMED`, i.e. `verified === true` alone,
unscoped by source.**

- **NOW: 365/657 = 55.6%.**
- **Exactly 204 of that 365 are the `core_stats` + `implant_stats` rows.**
- **If they were flipped: 161/657 = 24.5%** - and **161 is precisely the sourced
  population of the five tables** (16 + 8 + 104 + 17 + 16).

**Recorded now so the movement is not a surprise later. NOTHING IS BEING FLIPPED.**
The arithmetic closing exactly on 161 is the point: it means the remaining
confirmed population would be **entirely** rows that carry a source.

### C. OPEN - each flagged NOT resolved

- **C1. The 204 rows.** Cause established as far as code can establish it **for the
  March majority**; the **June 5 clustered minority is unexplained**. No
  remediation decided. **Unlike `mod_stats`, there is nowhere to record provenance
  without DDL** - the remediation shape used on the 86 does not exist here.
- **C2. `lib/gather/dexter-stats.js` - REAL DEFECT, separate pass.** `updateCore`
  and `updateImplant` write **`patch_verified`** to two tables that **lack the
  column**, so every such call fails at PostgREST. **`app/api/advisor/route.js:60`
  carries a comment naming this exact hazard** (*"Requesting the missing column
  would error the query"*) and was fixed; **the gather script was not.**
  **Consequence: the scraper's own `verified=false` honesty stamping has never
  landed on those two tables.** Established from **schema + code, not tested** -
  testing it requires a write.
- **C3. `shield_compatible` and `is_shell_exclusive`** still default `true` and
  both assert **game facts nobody checked** - the same shape as the `verified`
  default, one field over. **Named and deliberately excluded from `3d9d928`**; they
  get their own pass, not a ride-along.
- **C4. Whether `verificationState()` should require a source. PARKED.** The "zero
  migration cost" basis is **void per B2**; the real cost is **204 rows**, and the
  policy for the columnless tables has **no measured basis yet**.
- **C5. Carried forward, unchanged:** ~~the **2026-06-15 tag recalibration** remains
  **unexamined**~~ - **CLOSED 2026-07-21: examined and EXONERATED, no revert. See the
  2026-07-21 recalibration entry.** The **~81 vs 86 delta** remains **UNRESOLVED**;
  **in-game re-verification of the 86, KEYED ON `id`**, remains outstanding.

---

## 2026-07-21 - mod_stats provenance REMEDIATED: 86 flags cleared

**Owner ran the remediation SQL directly in the Supabase SQL editor.** 86 rows
flipped `verified = true` -> `verified = false`.
Predicate: `verified = true AND (verified_source IS NULL OR btrim(verified_source) = '')`.
Read-back confirmed: **still_true 17, unsourced_true 0, total 203.**

**No data was deleted or altered beyond the flag.** All `effect_desc`,
`credit_value`, `stat_changes` and `notes` remain intact.

### 1. CAUSE - established read-only, now CLOSED

- **`verified` DEFAULT false on all five tables** (positive PostgREST read; the
  spec exposes real DDL defaults on 275 properties, so this is a read, not an
  absence). The flag is NOT a default.
- **No insert / update / upsert against `mod_stats` anywhere** in `app/`, `lib/`
  or `scripts/`. `lib/gather/mod-stats.js` states the table is manually seeded
  via SQL because all external mod sources block server-side requests.
- **The admin form exposes 8 fields** (name, slot_type, rarity, effect_desc,
  faction_source, credit_value, ranked_viable, image_filename) and does **NOT**
  expose `verified`, `verified_source` or `patch_verified`, so a form-created row
  takes the default `false`.
- **Therefore the 86 flags were set by hand-written SQL**, most plausibly a bulk
  statement during a 2026-06-05 seeding session (81 of 86 carried `updated_at` on
  that date; 22 shared an identical microsecond timestamp). The statement is not
  recoverable and the author does not recall the reasoning. **Shape observation,
  not an established sequence.**

> **STILL CORRECT FOR `mod_stats`, BUT INCOMPLETE AS A GENERAL ACCOUNT - added
> 2026-07-21 (A3).** The conclusion above holds for `mod_stats`: its admin form
> genuinely does not expose `verified`, so a form-created row genuinely does take
> the default. **But a THIRD mechanism existed and was not in view when this was
> written.** `app/admin/page.js` defaulted every boolean to `true` with a `false`
> exception scoped by **table-name prefix** (`game_` / `dmz_`) rather than by field
> name. `core_stats`, `implant_stats` and `weapon_stats` match neither prefix and
> **do** expose `verified`, so the box arrived **pre-ticked** and was POSTed
> explicitly - the DB default never applied.
> **Read this section as "how it happened HERE", not "how a flag can be wrongly
> set".** Three mechanisms are now known: hand-written SQL (this entry), a
> pre-ticked form default (`3d9d928`), and - for the 61 clustered June rows - a
> batched writer still unidentified. See the 2026-07-21 scope-corrections entry.

> **SCOPE NOTE added 2026-07-21 (A2).** The brief for this correction quoted a
> sentence - *"mod_stats is an outlier in outcome, not in mechanism"* - as
> appearing in this entry. **It does not appear here, or anywhere in HANDOFF.md.**
> Searched for the exact phrase and for "in outcome" / "in mechanism": no match.
> **No wording was changed on its account**, because inventing an original to
> correct would be worse than the error it was meant to fix.
> **The substance is recorded anyway, because it is true and it matters:** with all
> **nine** tables `verificationState()` serves in view, `mod_stats` is **not** the
> worst case. `core_stats` and `implant_stats` are strictly worse off - they have
> **no `verified_source` column at all**, so the remediation applied here (flip the
> unsourced flags, keep the sourced ones) has no equivalent there. `mod_stats` was
> at least *able* to record provenance.

### 2. *** THE INVARIANT THAT WAS NEVER ENFORCED - the core finding ***

`lib/verification.js` documents that `verified = true` means a trusted human
confirmed it in-game, and states the discipline is **"enforced by later phases,
NOT here."** **No later phase ever enforced it.**

The predicate short-circuits on `verified === true` as its first line and
**never reads `verified_source`.** The column is not referenced in the module and
is not even selected into editor context (`editorCore.js:653` selects `verified`
and `patch_verified` only), **so the tagger could not have keyed on it.**

All **17 consumers** (editorCore x9, advisor x7, qualityMetrics x1) route through
the same two exported functions. **One predicate, no divergence.**

> **CORRECTED 2026-07-21 (A1).** This originally read **"All 13 consumers"** beside
> the identical parenthetical - which sums to **17**. The sentence contradicted
> itself within its own line and was committed that way.
> Recount, read-only: **16 literal `verificationTag(...)` call sites** (editorCore
> x9, advisor x7) plus **`lib/qualityMetrics.js:55`**, which passes
> `verificationState` by reference as `classify` rather than calling it inline =
> **17 consumers**. The parenthetical was right all along; the total was never
> measured. It was carried into the entry, and the three numbers sitting next to it
> were never added up.
> **The standing rule generalises: a bare integer is not a measurement - including
> when its own supporting breakdown is printed beside it.**

**Consequence before the fix:** all 86 reached the five editors and the advisor
as `CONFIRMED`, with an empty tag, under a `VERIFICATION_NOTE` instructing the
model *"No marker - confirmed in-game. State the number as fact, no hedge."*

**THE PATTERN:** the same label-vs-substance failure as `verified=true` carrying
field-level meaning in the Rook arc, and as the meta_tiers echo loop. **Here the
flag carried ANY meaning it never had** - not a wrong scope, an absent basis.

### 3. BLAST RADIUS

- **No public page renders a verified badge from the column.** `/mods` and
  `/mods/[slot]` select `verified` but never reference it in render.
- **The advisor DOES consume it:** `modLine += verificationTag(mod)`.
- **quality_metrics:** `confirmed` increments on `verificationState()` returning
  `CONFIRMED`, i.e. `verified === true` alone. `confirmed_with_source` is tracked
  separately and **does not gate the headline share**. `hasVerifiedSource: true`
  means only *"this table has the column."*

### 4. THE METRIC MOVEMENT - both values WITH their predicate attached

Per the standing rule that a bare integer is not a measurement:

**Predicate: `confirmed_data_share` = share of stat rows where
`verificationState(row)` returns `CONFIRMED`, i.e. `verified === true` alone,
across the 9 STAT_TABLES, unscoped by source.**

- **BEFORE:** 451/657 = **68.6%** (stored snapshot `computed_at
  2026-07-20T19:00:47Z`; live recompute today identical, so not a stale figure).
  mod_stats component 103/203 = 50.7%.
- **AFTER:** 365/657 = **55.6%**. mod_stats component 17/203 = **8.4%**.
- **Delta 13.1 percentage points.**

**RECORD THIS AS A CORRECTION, NOT A REGRESSION. 55.6% is the first reading of
this metric that is not inflated by unsupported flags.** The number went down
because it was wrong before, not because anything got worse.

### 5. THE FLIPPED POPULATION - the only record of which rows moved

Post-flip these are **indistinguishable** from the 100 rows already `false`
(`updated_at` was NOT bumped by the UPDATE - the whole-table distribution still
shows no 2026-07-21 rows).

**PROVENANCE OF THIS LIST - RECONSTRUCTED, THEN INDEPENDENTLY VERIFIED.**

*How it was built:* ids were **RECONSTRUCTED after the flip** by matching the
name+rarity pairs captured during the pre-flip characterization run against the
live table. `(name, rarity)` is unique across all 203 rows (0 collisions), so the
join is deterministic. Soundness checks at the time: all 86 resolved, all now read
`verified=false`, all have no `verified_source`, and 86 + 17 sourced = 103,
exactly the pre-flip `verified=true` count.

*How it was confirmed:* **VERIFIED 2026-07-21 against the authoritative captured
query output** - the actual pre-flip step-1 result exported from the Supabase SQL
editor (`Supabase Snippet Untitled query.csv`, 5,800 bytes, header +
86 data rows, 86 unique ids, 0 malformed). Diffed on `id`:

- **0** ids in the capture but not in this table
- **0** ids in this table but not in the capture
- **86** ids present in both
- **0** field mismatches on `name`, `rarity` or `slot_type`

**Reconstruction and capture agree on all 86 ids.** The reconstruction method is
kept described above rather than deleted, because the list was built that way and
the record should say so - the verification upgrades the confidence, it does not
change the history. **The capture cannot be regenerated** (the predicate no longer
selects these rows), so this table plus that CSV are the only records of which
rows moved.

| # | id | name | rarity | slot_type |
|---|---|---|---|---|
| 1 | 425f327a-534e-4417-8828-1e397e6e7fee | Adrenal Feedback | Prestige | Magazine |
| 2 | 16b22268-76a4-4f1f-9c03-733627c5f947 | Alternating Current | Deluxe | Chip |
| 3 | 5b8b9ead-b005-4617-97d7-aa391c39d67a | Balanced Mag | Enhanced | Magazine |
| 4 | 8dbd678e-12f6-4b2f-9f2a-d0a2d8c24c86 | Balanced Shield | Enhanced | Shield |
| 5 | a015c96a-ebe4-4aea-adf6-8ba326affce8 | Battle Runner | Enhanced | Chip |
| 6 | dfc24347-b183-4353-850f-7f0f31368001 | Bits Per Second | Enhanced | Chip |
| 7 | 1c3c75cb-cbf3-46ee-8937-6cdde782db25 | Blue Blood | Superior | Chip |
| 8 | 37e928ef-5c80-4119-b89c-dd5759804266 | Bounty Hunter | Enhanced | Chip |
| 9 | ff6a75f1-f73f-491e-9b47-f7cc3f120257 | Bounty Hunter | Standard | Chip |
| 10 | 4ff60052-df10-4564-9fbe-533bc6182b46 | Chaos Theory | Standard | Chip |
| 11 | ad8ec082-a792-4a89-9bdc-183fdef13312 | Circuit Shield | Prestige | Shield |
| 12 | d351b41f-5e0e-45d8-aba3-d23e66149769 | Circuit Tracers | Superior | Chip |
| 13 | 0c6f0273-f29c-4222-801d-de0a96a175d2 | Combat Grip | Deluxe | Grip |
| 14 | 5c5d990b-c10a-4f2f-9ae3-47e4ce932ef9 | Combat Mag | Superior | Magazine |
| 15 | 9f03fc6b-98f3-492c-888a-54c7a0433e36 | Combat Mag | Standard | Magazine |
| 16 | fe1719fa-60db-4adb-b291-2928aaaa927b | Control Shield | Enhanced | Shield |
| 17 | bfb7a3cb-c38c-4d5f-98fa-21d2f1e4c270 | Drum Magazine | Deluxe | Magazine |
| 18 | 0b27d20f-7e01-47f4-806d-7b70f657600d | Far Reach Optic | Superior | Optic |
| 19 | 51d9be83-464d-44be-8a2d-f5b3ea306d01 | Farshot Barrel | Superior | Barrel |
| 20 | a04be5db-fc2b-4232-ad6d-86cca38e2a9a | Feather Mag | Deluxe | Magazine |
| 21 | 1b73a90f-0749-426e-86fd-c36b7f46ee0e | Five Finger Discount | Enhanced | Chip |
| 22 | 474f399c-94d3-4774-8379-40c0f496c504 | Full-Auto Selector | Prestige | Grip |
| 23 | 078d7d7b-682a-4306-a26d-2d7108658273 | Guarded Grip | Deluxe | Grip |
| 24 | ab234ca5-79d4-433d-a1ae-e1d1c2857b23 | Heatsink | Standard | Chip |
| 25 | 3c2ddc31-4492-4017-a0c6-0be2ad19741c | Hi-Cap Mag | Superior | Magazine |
| 26 | 0fda2404-c13e-4e41-984b-7af4e7e2b44d | Hi-Speed Mag | Superior | Magazine |
| 27 | 34537372-f6b8-4ec0-87cc-6a987813c5fa | Hi-Zoom Optic | Superior | Optic |
| 28 | 7613fbfe-367a-4ed1-a2ac-ca2d66683eb2 | Hollow-Case Rounds | Deluxe | Magazine |
| 29 | d52bafb0-3ab1-4d02-90a6-44256561d088 | Impact Shockwave | Prestige | Magazine |
| 30 | 7f5540e7-81a5-4595-a4a0-448e96724182 | Infinity Belt | Prestige | Magazine |
| 31 | f104bdda-ff5b-48ca-974f-1b5efb9996ab | Insomniac | Enhanced | Chip |
| 32 | 0a03a151-6882-4221-89f4-8921bb672550 | Insomniac | Superior | Chip |
| 33 | 53c3d0b4-6f4c-4607-91da-a0efbf70be29 | Insomniac | Deluxe | Chip |
| 34 | c69fe164-6e96-4952-b426-4c143dad2a5c | Insurance Plan | Deluxe | Chip |
| 35 | 4dd28b6c-acbc-49c1-9a53-5c42c5fb59fe | Insurance Plan | Standard | Chip |
| 36 | d2c66f2d-e898-4a1f-9bee-edb0f98e683d | Insurrection | Superior | Chip |
| 37 | 76a26f97-0d84-4bdf-9da6-61a575874d6e | Insurrection | Standard | Chip |
| 38 | abc1cc67-66e9-4402-9e50-1e0c70d8de03 | Interval Mag | Prestige | Magazine |
| 39 | ea05429d-810c-45a9-bc85-3e4045c8b260 | Ironhold Barrel | Superior | Barrel |
| 40 | e1e78d9f-dff5-4fe4-bc13-b4dd74c17f3d | Keyboard Warrior | Enhanced | Chip |
| 41 | cc328cff-92b1-4d74-843a-fdf07c4eca34 | Last Resort | Superior | Chip |
| 42 | ddd53b1f-a78e-4c89-9c06-27a81ef82592 | Lockout Muzzle Brake | Prestige | Barrel |
| 43 | 9cdf7747-bb29-45e0-95ed-a596ff338605 | Long-Range Barrel | Deluxe | Barrel |
| 44 | 0058afc8-9d4d-4d34-a942-e40e108971ed | Midsight Optic | Deluxe | Optic |
| 45 | aae1ba93-d77a-4f86-b0fb-bd5cac309ae8 | MIPS Slug Converter | Prestige | Barrel |
| 46 | b960b671-03f1-4bb5-866c-32d70fb07b42 | Opportunist | Standard | Chip |
| 47 | e7fbc152-1956-43de-83c6-6a79cd3d6292 | Optimal Prime | Enhanced | Chip |
| 48 | d3d906dc-33fd-4d1c-a805-6889d5414c70 | Optimal Prime | Standard | Chip |
| 49 | aa61d10b-ecaa-4e6d-8ffb-c528168dfce1 | Ornithologist | Enhanced | Chip |
| 50 | cf590bfa-46d1-4dbb-8cb7-a2ff9e371438 | Ornithologist | Standard | Chip |
| 51 | 5d85e43a-ed0f-4d0a-90ec-ca96bf1c59f7 | Outland Suppressor | Prestige | Barrel |
| 52 | db93d71e-d0fe-495e-94d2-8395c1b4eab1 | Overclocked Shield | Prestige | Shield |
| 53 | 3999a95b-d38c-4f21-afd8-8738d1978613 | Precision Barrel | Enhanced | Barrel |
| 54 | 56ae0d16-c73b-48ce-a247-f74ee83222b2 | Punishment | Superior | Chip |
| 55 | 4f476266-9b14-4423-89d7-022926d2348a | Q-Tap Regen Optic | Prestige | Optic |
| 56 | b5c14e6e-ed24-4b57-baf7-ea081ac29315 | Rangefinder Lens | Enhanced | Optic |
| 57 | 63ef5671-07e9-430d-b428-b206cd972b48 | Rangefinder Optic | Superior | Optic |
| 58 | a66de4c4-75f4-42a0-8237-5cc4cc0287e7 | Reloader Mag | Deluxe | Magazine |
| 59 | 0b9bddeb-6b65-4ba3-831f-1adc77baf406 | Reverse Card | Superior | Chip |
| 60 | a6d1419a-f207-47a4-a014-b10df26678dd | Rocket Start | Standard | Chip |
| 61 | ff9c2c90-cec8-4061-81b0-fd51be2bbfa6 | Rodeo Mag | Prestige | Magazine |
| 62 | 4862a3c8-b892-48e4-8600-094eb8b47cdf | See Ya | Superior | Chip |
| 63 | 05d9796a-a596-4539-aa4b-77cd53cb1aef | Slip Protocol | Superior | Chip |
| 64 | c2772ed5-58ec-488e-9cbe-0f15abf881bf | Snapshot Grip | Deluxe | Grip |
| 65 | 9542193d-dc20-499c-864c-dadbac106c63 | Sonar Shot | Prestige | Barrel |
| 66 | eb93373d-5bb1-429d-b554-cb4727a99bc0 | SP Scope II | Deluxe | Optic |
| 67 | c3d3ed67-37b3-4713-b4ef-fc2207a48ce2 | Speed Scout Grip | Deluxe | Grip |
| 68 | 4775289d-42c6-40cf-bd8a-6b169aca847c | Stack Overflow | Superior | Chip |
| 69 | 65c6cb22-db8d-4797-a75e-adc29369e95a | Stack Overflow | Standard | Chip |
| 70 | ba46c855-f4ee-4d9a-b46f-ede4713d1823 | Stack Overflow | Deluxe | Chip |
| 71 | 68e48d2c-b64f-40a7-afe7-7861b7aebede | Steady Barrel | Deluxe | Barrel |
| 72 | cc370152-4d12-4552-8de0-af13f393069e | Stopping Mag | Prestige | Magazine |
| 73 | 49bb93ce-47c2-48f3-8191-3b04fbae33fd | Sturdy Brace Grip | Enhanced | Grip |
| 74 | d2bb9cbb-f857-47b8-b759-5d562f43e0cb | Sucker Punch | Enhanced | Chip |
| 75 | a6f294dd-2843-49e8-a0f0-a18f81e32a90 | Sucker Punch | Standard | Chip |
| 76 | 735f97b8-560e-4566-971f-27d06ee23425 | Swarm Directive | Deluxe | Chip |
| 77 | 122114a7-f3cf-43ec-9480-f9ab100bfc1a | Swarm Directive | Superior | Chip |
| 78 | 520f4c82-3d5f-43d1-8f0c-492c27baa41b | Testament | Superior | Chip |
| 79 | 6d7f509c-c276-4102-9802-1cdff2c743c9 | Thermal Surge Battery | Prestige | Magazine |
| 80 | 7a485a61-7bcd-4e4a-be83-b3c7a93c1517 | Torch Bug | Deluxe | Chip |
| 81 | 74561c7f-a733-426c-9000-1ead4e94d8b3 | Torch Bug | Superior | Chip |
| 82 | 038c5b79-3dd7-475f-86f9-3c04baadfc8f | Torch Bug | Standard | Chip |
| 83 | ec372177-3a70-4745-a517-d4c7a16bb93a | Trigger Discipline | Enhanced | Chip |
| 84 | 3f00a712-eaf7-456d-a30c-8d1358277197 | Trigger Discipline | Standard | Chip |
| 85 | 49a550a9-a383-4f42-b89d-083d611aface | Triple Barrel | Prestige | Barrel |
| 86 | 1610a9f0-e79d-46be-a093-902b3bb7a929 | Vigilant Lens | Superior | Optic |

### 6. *** METHOD RULE: mod_stats.name is NOT unique - key on id ***

**Bounty Hunter, Combat Mag, Insomniac, Insurance Plan, Insurrection, Optimal
Prime, Ornithologist, Stack Overflow, Sucker Punch, Swarm Directive, Torch Bug
and Trigger Discipline all appear at multiple rarities.**

**Any re-verification or backfill MUST key on `id`. A confirm keyed on name would
silently land on up to three rows.** (`(name, rarity)` is unique and was safe for
the reconstruction above, but `id` is the only stable key.)

### 7. OVERLAP WITH THE 2026-06-15 POPULATION - bounded, does NOT resolve the delta

The 06-15 entry named four exemplars of "the 81 dropped": **Thermal Surge
Battery, Sonar Shot, Hi-Cap Mag Superior, Steady Barrel Deluxe.** All four appear
in today's 86 at those exact rarities.

**The two populations demonstrably intersect**, which strengthens the
misattribution finding. **It does NOT distinguish "the gap grew by five" from "81
was approximate." The ~81 vs 86 delta stays UNRESOLVED as already recorded.**

### 8. Q-TAP REGEN OPTIC - content resolved, provenance not

Row `4f476266-9b14-4423-89d7-022926d2348a` was flagged during investigation as
possible wrong data: an `effect_desc` describing a Twin Tap HBR burst mod on a
row typed `Optic`.

**RESOLVED as NOT wrong.** Q-Tap is **Quad Tap** - a weapon-integrated mod for the
Twin Tap HBR taking the burst from 2 to 4 rounds. The Prestige trait occupies the
Optic slot: at very low health, landing all rounds of a full burst triggers health
regeneration. The original stub's open question (pure optic vs weapon-integrated)
is answered: **weapon-integrated.**

**Source of that resolution: OWNER RECOLLECTION, 2026-07-21. Recorded as
recollection, NOT captured provenance. It does not restore `verified = true`.**
Row remains `false` pending in-game card capture, same as the other 85.

**The mismatch reading was an incorrect inference from internal coherence,
corrected by owner game knowledge - the same shape as the Rook correction.**

**The owner DID update the notes.** New value, verbatim:

> "Weapon-integrated mod for the Twin Tap HBR (burst 2 -> 4 rounds, hence Quad
> Tap). Prestige trait occupies the Optic slot: at very low health, landing all
> rounds of a full burst triggers health regeneration (comparable to a depleted
> Patch Kit). Slot/effect question from the original June 2 stub entry is RESOLVED
> by owner knowledge 2026-07-21 - this is recollection, NOT captured provenance.
> Row remains verified=false pending in-game card capture."

### 9. RANGEFINDER LENS - no action taken

Partial entry, **honest about being partial**, null `effect_desc` already excludes
it from editor context. Flipped with the other 85. Pending in-game capture.

### 10. STILL OPEN - flagged NOT resolved, each needs its own pass

- **Whether `verificationState()` should require a source** rather than trust
  `verified` alone. ~~**The cost is low:** `shell_stat_values` is 104/104 sourced
  and `weapon_stats` 31/32, so **only mod_stats would move.**~~
  > **CORRECTED 2026-07-21 (A4) - THIS WAS THE SWEEP HIT. Struck, not deleted.**
  > **Two independent errors in one sentence:**
  > **(a) Scope.** "Only mod_stats would move" was measured across the **five**
  > tables carrying `verified_source` and stated as a claim about the predicate,
  > which serves **nine**. Measured across all nine: **204 more rows move** -
  > `core_stats` 85 and `implant_stats` 119, every one `CONFIRMED -> UNCHECKED`.
  > The cost is not low and it is not confined to `mod_stats`.
  > **(b) Wrong denominator.** "`weapon_stats` 31/32" counts **rows carrying any
  > `verified_source`**, but the migration cost depends only on **`verified=true`
  > rows lacking one**. The right figure is **16 verified, 16 sourced, 0 would
  > move**. It reached the correct conclusion for that table by the wrong measure -
  > the same family as the ~81 misattribution: a real count, relabelled as an
  > answer to a question it was not counting.
  > **Status: PARKED, basis void.** See C4 in the scope-corrections entry.
- **The 2026-06-15 tag recalibration.** The current predicate has no `pv=null`
  condition for `verified=true` rows, consistent with that recalibration. ~~Whether
  it was correct is **unexamined**~~, and it was made on a population measured on
  the column now marked misattributed.
  > **CLOSED 2026-07-21 - EXAMINED AND EXONERATED, NO REVERT.** The suspicion here
  > was well-founded and the answer was not the expected one: `d15a06a` was
  > mechanically accurate and did rest on a false premise (it called the dropped
  > rows "hand-verified"), **but the population it exposed is now empty**, so a
  > revert would re-tag nothing and re-desensitize a marker that was correctly
  > un-desensitized. **It was also structurally uncatchable in June** -
  > `verified_source` did not exist on any of these tables until 2026-07-21. See
  > the 2026-07-21 recalibration entry for the full reasoning.
- **Re-verification of the 86 in-game. KEY ON ID.** The underlying data looks
  genuinely measured (80 distinct `effect_desc`, no zeros in `credit_value`, no
  cross-row duplicate fingerprints), so this is **confirmation work, not data
  reconstruction.**

---

## 2026-07-21 - mod_stats delta reconciliation: UNRESOLVED, and MISATTRIBUTED

Investigated read-only 2026-07-21 at 012b70e. No writes, no DDL, no script edits.

### VERDICT: UNRESOLVED, AND UNRECONCILABLE IN PRINCIPLE

**The discriminating fact was never recorded and cannot be recovered.**

Two causes remain live and undistinguished. **Do not pick one:**
- the gap grew by 5 rows since 2026-06-15, or
- the original 81 was already approximate

The source entry's own arithmetic supports the second being at least partly true:
**92% -> 51% of 202 rows is a drop of ~82**, not 81. The figure was approximate
at the moment it was written.

### *** PRIMARY FINDING: MISATTRIBUTION, NOT DRIFT ***

**The 81 was NEVER a source-path count.** It counted
`verified = true AND patch_verified IS NULL`, recorded **2026-06-15** while
recalibrating the [UNVERIFIED] editor tag (HANDOFF line 6186):

> "Tag rate verified live: weapons 16/32 unchanged; mods 92% -> 51% (104/202).
> The 81 dropped were verified=true & pv=null hand-verified mods"

It was then **relabelled as a source-backfill figure** in a later backlog entry
(line 5068: "mod_stats source-backfill 81 [maybe self-serve]").

**THE VALUE SURVIVED; THE MEANING DID NOT.**

**Mark the ~81 MISATTRIBUTED, not superseded.** It cannot be compared to any
`verified_source` measurement. **Any backfill scoped from it would have been
scoped from the wrong column.**

### *** METHOD RULE: A MEASUREMENT CARRIED BETWEEN ENTRIES MUST CARRY ITS PREDICATE ***

**A bare integer in the backlog is not a measurement - it is a number that can
change meaning without changing value.**

This is the same label-vs-substance failure as `verified=true` carrying
field-level meaning it never had, and as the meta_tiers echo loop. **Third
instance.** The difference, and the reason it matters more than the other two:
**this one occurred in HANDOFF itself - the instrument used to watch the data,
and the one artifact never audited.**

### THE NEW BASELINE - PREDICATE IN THE NAME, NOT IN A FOOTNOTE

Record it so the predicate **cannot be separated from the number by a later
copy**. The backlog line reads as the measurement itself:

**mod_stats verified-no-verified_source (unscoped) = 86 as of 2026-07-21, 012b70e**

NOT "mod_stats backfill 86" with the definition sitting nearby - that is exactly
the shape that produced this entry.

Full predicate:
- `verified === true` (strict; null/false excluded)
- `verified_source` blank **after trim** - null, empty string and whitespace-only
  all collapse into the same bucket
- **`source_url` NOT consulted** - only `verified_source` counts as a source path
- **no `game_slug` scope.** All 203 rows are currently `marathon`, so scope is a
  **NO-OP BY DATA, NOT BY DESIGN.** DMZ rows will change this, and when they land
  the unscoped count will silently start meaning something else.

### THE REPLACED GATE - REPLACED, NOT WAIVED

Growth is answered **FORWARD, not backward**: `scripts/provenance-check.mjs` is
deterministic, read-only and cheap, so **a second run at a recorded later date
against the 86 baseline settles the growth question in one command** - no
archaeology, and no dependence on a timestamp column that does not exist.

**Backfill is UNBLOCKED from here. It proceeds against 86, not 81.**

### WHAT WAS RULED OUT

**All three pre-registered predicates return 86.** No variant diverges:

| predicate | result |
|---|---|
| Marathon-scoped (`game_slug`) | 86 - every row is marathon, scope is a no-op |
| `source_url` counted as a source path | 86 - none of the 86 has a source_url either |
| null / empty-string / whitespace split | null=86, empty=0, whitespace=0 |

**The documented 2026-06-15 predicate (`verified=true AND patch_verified IS
NULL`) also returns 86 today** - so the definitional gap does not produce the
arithmetic gap. The same definition moved 81 -> 86.

**No verification timestamp exists.** `mod_stats` has `updated_at` only - **no
`verified_at`.** No audit table records mod_stats field changes: `editor_logs`
holds 4 rows, all `feed_item` entities from 2026-02-27; the other audit-shaped
tables (`site_events`, `quality_audit_runs`, `player_audits`, `player_qa_history`)
are domain tables, not schema history.

**`updated_at` shows 1 of 86 modified after 2026-06-15.** Recorded for
completeness and **EXPLICITLY NOT A DISCRIMINATOR** - it moves on ANY edit and
cannot date when `verified` was set. **Do not let a later reader promote it into
evidence.**

---

## 2026-07-21 - Provenance check script (109 findings, exit-code gated)

### The tool

**scripts/provenance-check.mjs** - READ ONLY at runtime. Only .select() is ever
called; no DDL, no writes. Audits verified / verified_source / patch_verified
across the five populated tables that carry them (weapon_stats, shell_stats,
shell_stat_values, mod_stats, unique_weapons), plus the three empty DMZ tables so
a future run picks them up automatically.

**Exits 1 on findings, 0 on clean. READY FOR CI BUT DELIBERATELY NOT WIRED IN** -
this run establishes scale; gating comes after the backlog is worked.

### Design note - PRESERVE THIS PATTERN

**Check 3 imports isMatchupVerified from lib/matchups.js instead of copying the
regex.** A copied regex would drift, and the check would start validating a rule
the site no longer applies. Any future check should import the predicate it is
validating rather than restating it.

### Findings: 109 total

| check | result |
|---|---|
| 1. verified=true with no source | **86, ALL in mod_stats.** Every other table clean at zero. |
| 2. patch-note citations needing manual document review | **23** - 20 citing 1.1.0 (the original audit population), 3 citing 1.1.5 (field-scoped, would survive review) |
| 3. matchup marker missing where matchup data exists | **0 failures** - all 7 shells with data carry it |
| 4. format distribution | **field-scoped exists on 3 of 363 rows, all written today** |

**Check 4 is the headline: the citation convention is ASPIRATIONAL, NOT
ESTABLISHED.** 3 field-scoped, 8 compound (all shell_stats), 165 bare, 187 none.

Check 2 deliberately does NOT fetch the patch documents - the Steam feed window
reaches back only ~16 patches, so an older citation would false-positive as
"missing" when it is merely out of window. It flags for manual review and names
the patch.

### *** DISCREPANCY - UNEXPLAINED, DO NOT GUESS ***

An earlier backlog entry recorded **mod_stats as ~81 rows** confirmed without a
source path. **The classifier reports 86.** Both numbers are recorded here and
the delta is **UNEXPLAINED**. It is either rows added without sources since the
earlier tally, or a counting-method difference - **this has not been
investigated and should not be assumed either way.**

**A future session should resolve it READ-ONLY before any backfill work begins.**
Backfilling against the wrong count would either miss rows or touch rows that
were never in scope.

### *** LESSON: THE AUDIT TOOL NEEDED AUDITING ***

Two bugs caught before shipping, **both checks that LOOKED LIKE THEY PASSED**:

1. **The classifier matched any parenthetical as field-scoped**, counting
   "Confirmed in-game S2 (Justin)" and "In-game weapon inspect S2 (base, no
   mods)" as scoped citations - **over-reporting 13 where the true number was 3.**
   Fixed by validating the bracketed text against the table's REAL column list: a
   citation is only field-scoped if the thing in brackets is a column someone
   could actually check. The original miscount is preserved in a code comment so
   nobody reverts to the looser regex.
2. **The exit-code test read grep's status through a pipe instead of node's**,
   reporting 0 when the script correctly exits 1.

A provenance auditor shipped with a false-positive classifier would have been
quietly self-undermining - it would have reported the convention as more
established than it is, which is the exact error class it exists to catch.

### CONVENTIONS

**After a pipeline, $? reports the last command in the pipe, not the script -
test exit codes directly.** This bit twice in one day (once here, once verifying
the sitemap deploy where a broken grep reported a live deploy as missing).

**Backticks inside double quotes are executed by the shell, not matched.** This
blanks the word in a grep pattern exactly as it does in a commit message - same
substitution, different position. Use single quotes for patterns containing
backticks, and verify the pattern reached the tool. (Recorded as a sibling to the
existing `git -m` backtick rule in the git-hygiene bullets.)

**grep is LINE-ORIENTED. Wrapped prose splits phrases across lines**, so a
contiguous-string check can fail on text that is present. Verify prose documents
whitespace-insensitively, or confirm against the file before concluding an
element is missing.

**RATIONALE FOR BOTH: a false negative is the MORE DANGEROUS direction - it
invites editing something already correct.** Confirm against the file before
acting on a failed check; never re-edit on the strength of one.

**Content containing apostrophes goes through the Write tool, NOT a shell
heredoc.** Heredoc quoting has now failed THREE times in one day on prose
containing apostrophes. Third member of the same family as the two backtick
rules above: shell quoting silently eating content that looked correct when it
was written. The Write and Edit tools take the string verbatim with no shell in
the path, so they are the correct instrument for any prose destined for a file.

**The operationally useful half: heredoc quoting failures ABORT AT PARSE TIME,
before anything is written.** The file is UNTOUCHED, not half-written. **Check
state rather than assuming a partial write** - all three failures today left a
clean tree, so re-running after a fix is safe. Trying to repair an imagined
partial write is how a failed edit becomes a real one.

### Forward pointer - no action now

**Check 4 plus the mod_stats 86 constitute the enumerated backfill worklist the
contributor program targets.** Nothing to do yet; the discrepancy above is the
first thing to settle.

---

## 2026-07-21 - Internal-link sweep: noindex filtering on reader surfaces

**71 cut-article instances across 16 reader-facing surfaces, reduced to 22.**
Surfaces that already filtered (`/intel`, `/sitrep`, `/guides/[category]`,
`/intel/[slug]` related) were clean at zero. Scope was all **668** noindexed
articles, not just today's 181 - a reader cannot tell which pass cut a link.

### THE HEADLINE, FIXED

**7 of 8 shell pages had DEXTER build blocks that were 100% de-indexed.** Every
"recommended build" linked to an article we had cut. **Not a broken link - a
quality claim the site had already voted against.** Consistent with DEXTER being
the most-cut editor (199 on 07-18, 35 today).

All 8 now recommend only live articles, and the blocks refill **3 of 3**
everywhere except Triage (3->2, non-empty). `/guides` 12->0, `/builds` 9->0.

### STOPPED on two surfaces, deliberately

- **`/weapons/[slug]`** - filters were APPLIED, MEASURED, then **REVERTED**.
- **`/guides/shells/[name]`** - not applied.

The blocks do not refill:

```
Misriah 2442   DEXTER 3->1   articles 6->2
Twin Tap HBR   DEXTER 0->0   articles 3->2
assassin       MIRANDA 10->4
rook           MIRANDA 10->4
triage         MIRANDA 10->7, DEXTER 6->3
```

**Shipping those would have traded a quality contradiction for a materially
thinner page.**

### *** WHY THE DIFFERENCE: THE REFILL IS A PROPERTY OF THE POOL, NOT OF FILTERING ***

Shell HUB queries are **tag-scoped across all editors with small limits (6/2/3)**,
so there is depth behind them. Weapons and shell-GUIDE queries are **narrow
per-entity slices with larger limits (6/10) against a thinner corpus** - there is
simply no live article to promote into the gap.

This is worth remembering before assuming any future filter is free: it was free
for shell hubs and expensive two routes away, for reasons that have nothing to do
with the filter itself.

Options if revisited: raise the limits, widen the per-entity scoping, or accept
the thinner page as the honest state.

### `/api/homepage-data:90` is NOT a link surface

It is the **EditorsStrip counter** - `select('editor, created_at')` over the last
24h - and renders no links. **Filtering it would understate what editors actually
produced**, since a noindexed article was still written. Left alone deliberately.
The other three homepage queries already filter.

### lib/ and gather/ reads deliberately UNFILTERED

An editor reading its own noindexed back-catalogue is **correct behaviour**, and
the dedup logic needs the full corpus - filtering there would hide from the
detector exactly the articles it exists to compare against. Applies to
`cipher.js`, `miranda.js`, `historicalContext.js`, `qualityAudit.js`.

### The mentioned-items pipeline was NOT the exposure

It maps **entity tables** (uniques/shells/weapons/mods/implants/factions), not
`feed_items`, so no cut article can feed it. **The exposure ran the other way:
entity pages listing articles.**

### Reader experience: acceptable as-is

Cut articles remain fully reachable - HTTP 200, `noindex, follow`, ~1,290 words,
**no reader-facing notice**. That is fine: they were cut for **duplication, not
inaccuracy**, so a reader gets redundant but valid content and equity still flows.
**The problem was never the article, it was recommending it.**

### METHOD - ninth check-needing-checking today

A de-index-notice check false-positived because the regex `archiv` matched **"Cryo
Archive"** in a headline. The page has no notice. Caught only by printing the
actual regex hits instead of trusting the boolean.

---

## 2026-07-21 - Four dateModified chains fixed, and two briefed premises corrected

### Two premises in the brief were WRONG, and both corrections came from here

**1. sitrep does NOT fall back to `new Date()`** - it terminates in `null`. The
earlier report grepped `new Date()` COUNTS per file and **reported a count as a
location**; sitrep's single occurrence is line 95, `var now = new Date()`, an
unrelated display helper. **Seventh instance today of a check needing checking.**

sitrep still had a real defect, just a different one: `null` was assigned straight
into the schema, emitting `dateModified: null` - an INVALID value rather than an
absent one. Now omitted.

**2. "Omit is correct everywhere" was wrong.** `/shells/[slug]` had better real
data unreached, and `builds`/`sitrep` needed their FIRST link fixed before the
fallback mattered. Fixing only the fallbacks would have left two variables whose
names asserted something the code did not compute.

### *** builds:299 `lastMetaUpdate` was not the last meta update ***

The `meta_tiers` query is **`.order('tier')`** - tier LETTER, not recency - so
`metaTiers[0]` is whichever row sorts first alphabetically (A before S), **not the
newest**. Right today only by coincidence: the cron writes every row in one pass,
so all timestamps matched. Edit one row alone and it silently diverges.

**RENDERED TO USERS** at builds:463 as `"UPDATED n days ago"`. Not just a schema
value - a visible claim read from an arbitrary row.

**Quiet-failure family: ordering by a non-recency column and then treating
position zero as newest.** Same shape as a paginated `.range()` with no sort.

### shells/[slug]: the entity data was fetched and never consulted

The chain reached for `meta_tiers.updated_at` first, then articles. **`shell` is
the `shell_stats` row, fetched with `select('*')` at line 102 and already in
scope.** So a SHELL ENTITY page was dated by NEXUS's derived tier grading, and
failing that by the publish date of ARTICLES ABOUT the shell - a different claim
entirely.

Correct precedence now: the entity's own row, then the editorial grading of it.
Both article links **dropped** - an article about a shell is not a modification of
the shell page. **Same precedence error the pipeline loop fix corrected**
(shell_stats is source of truth, meta_tiers is derived), still live in a
dateModified chain months later.

**`/shells/recon` now reports 2026-03-19 instead of a NEXUS grading date - four
months older and CORRECT.** The page is about the shell; the shell has not changed
since March. **Everything making it look fresher was measuring something else.**

### meta:121's comment stated the bug's rationale outright

The old comment read `// Latest tier update timestamp -- gives Google fresh-content
signal`. **The fallback existed TO guarantee a freshness signal.** That is exactly
why it was dishonest: with `metaTiers` empty - an outage, or a failed cron - EVERY
meta page would have claimed modification at crawl time. **An empty result is what
an outage looks like, so these fail loudest precisely when the site is least
trustworthy.**

### ORDERING AUDIT (builds + sitrep)

**Two instances of the defect, both fixed:**
- `builds:299` `metaTiers[0]` under `.order('tier')`
- `sitrep:206` `allTiers[0]` under `.order('tier')`

**Four other `[0]` reads cleared:**
- `builds:335` and `sitrep:206` `allArticles[0]` - both under
  `.order('created_at', desc)`, so `[0]` genuinely IS newest. Honest links, kept.
- `sitrep:338/349` `sTierWeapons[0]` / `sTierShells[0]` - read `[0]` from
  tier-filtered lists to show a REPRESENTATIVE S-tier name. Arbitrary selection,
  not a recency claim. Which name shows depends on tier-sort order, but no page
  asserts it is newest or best. Not the same bug.

### Verified - and the limit, stated plainly

**Verified by execution:** every page emits a real date; **no page emits today's
timestamp** (0 of 5); the corrected first links match an independently computed
max (`/builds`, `/meta`, `/sitrep` all resolve to 2026-07-19T19:02:07.458, the
true `max(updated_at)`).

**THE OMISSION PATH IS VERIFIED BY INSPECTION ONLY, NOT EXECUTION.** These are
`force-dynamic` pages against a populated live DB, and an empty-query state could
not be forced without writing to production or mocking the client. That
`if (x) schema.dateModified = x` omits the key when `x` is null is a code-reading
claim, not a tested one.

### Note
Pre-existing `react/no-unescaped-entities` errors in builds (3) and sitrep (3),
verified unchanged against HEAD. Left alone rather than folding unrelated fixes in.

---

## 2026-07-21 - Shell guide dateModified: per-shell, co-located

### The original false-freshness bug, still live in JSON-LD

`app/guides/shells/[name]/page.js` emitted `dateModified: new Date().toISOString()`,
so all 7 shell guides claimed modification **at whatever second the crawler
arrived**. This is the same bug already fixed in `app/weapons/[slug]/page.js` and
**warned against in comments in TWO other files** (`app/matchups/[shell]/page.js`
and `app/modes/vault-breaker/page.js`, both of which say "never new Date()").

**The discipline was written down twice and applied everywhere except the file
the comments were about.** Worse than the sitemap cases fixed earlier the same
day, because JSON-LD `dateModified` is a direct assertion rather than a hint.

### datePublished '2026-03-05' was FABRICATED, not stale

`git log --follow` dates the content to **2026-04-24** (`32a288f`, "feat(guides):
Phase 2 SEO - dynamic category + shell guide routes", plus three same-day moves
producing the current path). **The guides claimed publication SEVEN WEEKS BEFORE
THEY EXISTED.**

Now `GUIDES_PUBLISHED = '2026-04-24'`, with the commit named in the comment and an
explicit **DO NOT RESTORE THE OLDER-LOOKING DATE** - an earlier datePublished
looks like a stronger signal and someone will be tempted.

### Per-shell dates, co-located inside SHELL_GUIDES

`git log -L` per shell block:

| shells | last prose change |
|---|---|
| assassin, destroyer, rook, thief, vandal | 2026-07-20 |
| **recon, triage** | **2026-04-24 - never touched since creation** |

**A single file-level date would have claimed a three-month-old page changed
yesterday** for recon and triage. Smaller than "right now", but the same kind of
claim.

The `updated` field sits INSIDE each shell's object, as the last field under the
prose it dates. **That answers the maintenance objection to per-shell dates** -
an editor rewriting the copy sees the date on the same screen, where a separate
file-level constant is the version people forget.

**FAIL CLOSED:** `if (shell.updated) articleSchema.dateModified = shell.updated;`
- no `||` fallback on that line, deliberately. A shell without `updated` emits no
`dateModified` at all. Same rule as the sitemap entity hubs.

Verified by rendering all 7: datePublished 2026-04-24 everywhere, recon/triage
2026-04-24, the other five 2026-07-20, no page emitting a crawl-time value.

### FOUR DB-DERIVED dateModified FALLBACKS FOUND, NOT FIXED

```
app/builds/page.js:336        lastMetaUpdate || dexterArticles[0].created_at || new Date()
app/meta/page.js:121          metaTiers.length > 0 ? max(updated_at) : new Date()
app/sitrep/page.js            same shape
app/shells/[slug]/page.js:239 metaTier.updated_at || nexusTake || articles || new Date()
```

All four are **dormant while data is populated and silently assert "modified now"
the moment a query returns empty.** An empty result is exactly what an outage
looks like - **so these fail loudest precisely when the site is least
trustworthy.** `/meta` is the most exposed: an empty `metaTiers` makes every meta
page claim crawl-time freshness.

All four should OMIT rather than fall back. Separate pass.

### Note
The 3 `react/no-unescaped-entities` eslint errors in this file are PRE-EXISTING
(verified by linting the committed version at HEAD). Left alone rather than
folding unrelated fixes into this diff.

---

## 2026-07-21 - Entity hub lastmod: max(updated_at) of their children

### The bug

`/shells`, `/weapons`, `/mods`, `/uniques` and `/maps` were built in the static
array **~100 lines BEFORE the queries that date them**, so they carried a build
timestamp while their content was weeks old:

| hub | real max(updated_at) | staleness of the claim |
|---|---|---|
| `/weapons` | 2026-06-02 | **49 days** |
| `/uniques` | 2026-06-02 | **49 days** |
| `/maps` | 2026-06-08 | 43 days |
| `/mods` | 2026-07-16 | 5 days |
| `/shells` | 2026-07-20 | 1 day |

Largest remaining false-freshness signal on the site, bigger than the one fixed
earlier the same day. `/uniques` is the best-converting content we have (16 pages,
21 clicks - more than the entire 896-article corpus).

### The fix

The five hubs move OUT of `staticPages` and are emitted as `hubPages` AFTER the DB
reads, dated from the rows they index. **Every hub query already selected
`updated_at`** for the detail URLs, so the max costs no extra round trip.

**THE MAX IS TAKEN FROM THE RAW QUERY ROWS, NOT THE BUILT DETAIL ARRAYS.** Those
arrays carry per-row `(u ? new Date(u) : new Date())` fallbacks, so **a single
null `updated_at` would have made the hub max the build time again -
reintroducing the bug inside the fix**. Measured 0 nulls across all four entity
tables today, so this is future-proofing rather than a live correction. It is the
kind of thing that would have been invisible until one insert omitted a column.

**A FAILED QUERY OMITS `lastModified` RATHER THAN FALLING BACK TO BUILD TIME.**
A freshness claim must fail CLOSED. `next/sitemap`'s truthiness guard then emits
no element at all. Falling back is precisely the bug being removed - a failed
query is not fresh content.

### A hub sharing a timestamp with its child is CORRECT, not the bug

`/uniques` shares its lastmod with all 16 of its children, because **all 16
`unique_weapons` rows were bulk-inserted in one instant** (verified: 1 distinct
lastmod across 16 detail URLs). That is genuine shared data. **The meaningful
test is that no hub shares the BUILD timestamp**, not that its value is unique.
The first verification pass flagged this as "(shared - check)", which was a
misleading label on a correct outcome.

### DMZ entity hubs - fixed, but DORMANT

Same one-line pattern, same helper, dated from the VERIFIED rows (the set the
detail URLs are built from). **Every DMZ entity table is empty pre-launch**, so
the loop `continue`s and no hub is emitted today. Fixed anyway, beside the fix
that established the pattern, so the bug is not left waiting to appear when DMZ
fills on 2026-10-23.

### STILL CARRYING BUILD TIMESTAMPS - 24 URLs

- **16 x `/guides/[category]`** - needs a per-category `max(created_at)` grouping
  over `feed_items`. Real work; **HELD for a separate decision** on what it costs.
- **`/dmz` + 7 x `/dmz/[section]`** - NOT fixed in this pass. Their children are
  article pages dated via `toISOWithPTOffset(created_at)`, not `updated_at` rows,
  so `maxUpdatedAt` does not apply, and the sections need the same per-section
  grouping as `/guides`. Same shape, same held decision.

### Verified
5/5 hubs carry their children's max on the deployed sitemap, 896 article URLs
untouched, 1034 URLs total unchanged.

---

## 2026-07-21 - Update 1.1.5 applied (6 fields), and the verified_source audit

### What was written

Six guarded updates, each on `id` AND current value, so a concurrent edit would
return `rows=0` rather than silently overwrite. All 6 returned `rows=1`,
read-back 10/10.

| weapon | field | old | new |
|---|---|---|---|
| Misriah 2442 | precision_multiplier | 1.2 | 1.0 |
| Misriah 2442 | fire_rate | 72 | 58 |
| Twin Tap HBR | damage | 22 | 24 |
| Twin Tap HBR | precision_multiplier | 1.3 | 1.4 |
| KKV-9SD | damage | 8 | 9 |
| KKV-9SD | precision_multiplier | 1.45 | 1.29 |

`patch_verified` set to `1.1.5` on **ONLY those 3 rows**. The 143 rows carrying
`1.1.0` were left alone deliberately - most of those values were not changed by
this patch, and relabelling them would assert a verification that never happened.

**UNTOUCHED as instructed:** all shotgun damage (Misriah 11, WSTR 15, V85 20) and
every range column.

### The field-scoped citation deviation

`verified_source` is a ROW-level field, but only SOME fields on each row come
from 1.1.5. Writing a bare "Bungie Update 1.1.5 patch notes" would have asserted
the whole row came from that document - including Misriah's `damage=11`, which it
demonstrably does not. **That would have manufactured a TENTH UNSUPPORTED row
while auditing the other nine.** Field-scoped citations were written instead, of
the form "Bungie Update 1.1.5 patch notes (precision_multiplier, fire_rate);
damage unverified - see docs/HANDOFF.md shotgun scale".

### The audit: 3 SUPPORTED, 9 UNSUPPORTED, 18 UNVERIFIABLE, 1 uncited

**BEFORE THIS TURN, ZERO OF 32 ROWS HAD A VERIFIABLE CITATION.** All 3 SUPPORTED
are the ones written today.

**The 9 UNSUPPORTED:** BRRT SMG and Overrun AR cite Update 1.1.0, a document that
never mentions them. BR33 Volley Rifle, CE Tactical Sidearm, Copperhead RF,
Impact HAR, V66 Lookout, V75 Scar and Magnum MC cite 1.1.0 for values it does not
state.

**The 18 UNVERIFIABLE are HONEST** - 16 cite tauceti.gg (third-party, verifiable
in principle, not fetched here), 2 cite in-game inspection. They name a real
origin that cannot be checked against a patch document. No action needed beyond
knowing which they are.

### *** THE ROOT CAUSE: PATCH NOTES ARE CHANGELOGS ***

**They state DELTAS, not current state.** A weapon whose damage did not change in
1.1.0 has no damage figure in the 1.1.0 notes. So citing a changelog as
provenance for a full stat row is a **CATEGORY ERROR, not sloppiness** - it can
only ever support the handful of fields that patch actually touched.

**Magnum MC is the proof:** right about damage, rpm and precision because 1.1.0
changed those; silently wrong about `mag=12` because that patch never touched it.
One citation, correct on three fields and wrong on the fourth, with nothing in
the schema recording the difference.

`verified_source` was being used to mean "where this weapon was last written
about" while it READS as "where these numbers came from."

**ROW-LEVEL verified_source CANNOT DESCRIBE FIELD-LEVEL ORIGINS.** Recommend
either a `verified_fields` column, or self-scoping citations as written today.
Without one of those, every future patch-day update recreates the same
over-claim.

### What the audit did NOT establish

**It did not show the 9 rows are wrong.** It showed that nothing on the site says
whether they are right. The values may be accurate from an origin that went
unrecorded. **`Knife`, which has NO citation at all, is in better shape than the
nine that have one** - a blank field prompts a check; a wrong citation terminates
inquiry.

### Tool correction - FIFTH INSTANCE TODAY OF A CHECK NEEDING CHECKING

The audit initially scored **D54 Battle Pistol as SUPPORTED**. False: every
probed field on that row is `null`, so there was nothing to check and it passed
vacuously. Prior four: the orphaned `next start` serving a stale build, the
"expected -1" annotation on a +1 change, the broken sitemap grep reporting
`<none>` against a live deploy, and the non-global regex that made every article
report exactly 1 body mention. **A negative or passing result deserves the same
scrutiny as a positive one.**

### THE DAMAGE-SCALE QUESTION - RESOLVED

**`weapon_stats.damage` is per-projectile throughout.** Single-projectile weapons
match the patch-note figures exactly (Twin Tap 22, KKV 8, both confirmed against
1.1.0 which says "Damage per bullet increased from 17 to 22"). Shotguns do not,
because the notes quote **full-pellet totals**. 1.1.0 mentions "pellet" ONLY
under the Shotguns heading, and states no damage value for Misriah at all - which
is why its `damage=11` never came from the document it cited.

**The conversion is NOT DERIVABLE in either direction:** 140/11 = 12.7 and
85/15 = 5.67, neither an integer, and there is **no `pellet_count` column**.
1.1.5 never uses the word "pellet".

**NEEDS AN IN-GAME READING:** pellets per shot and displayed damage for
**Misriah 2442, WSTR Combat Shotgun and V85 Circuit Breaker**. Two numbers per
shotgun settles it. Until then the shotgun rows and the patch notes cannot be
used to validate each other.

### range_meters is a SHAPE mismatch, not a scale one

The notes quote **two** figures per weapon - falloff start and falloff end
("Bully's maximum range before suffering falloff reduced from 40 meters to 32
meters and maximum damage falloff range reduced from 70 meters to 62 meters").
There is **one** `range_meters` column. `effective_range_m` EXISTS and is **null
on all 32 rows** - plausibly the intended second field, never populated. Bully's
18 corresponds to neither 40 nor 32.

### The render surface exposes the units gap

`app/weapons/[slug]/WeaponDetailClient.js:69` renders a bare label **"Damage"**
with no unit, directly beside "Fire Rate ... RPM" which does carry one. A reader
comparing Twin Tap **24** against Misriah **11** would conclude the shotgun hits
half as hard, when it hits several times harder per shot. Also emitted as a
schema.org `PropertyValue name: 'Damage'` (`app/weapons/[slug]/page.js:239`), so
the ambiguity reaches structured data.

Damage is NOT rendered on the `/weapons` index, so there is no side-by-side grid -
a reader must open two detail pages to hit this.

---

## 2026-07-21 - Sitemap lastmod: honest dates, and a FOURTH label-vs-substance case

### The bug

`app/sitemap.js` used `new Date()` for **28 hardcoded static routes**, so lastmod
tracked the DEPLOY rather than the content. Measured on the live sitemap: **29
URLs shared the millisecond `2026-07-21T15:50:41.939Z`** - the push time.

`/modes/vault-breaker` was the clearest case: an honest `FACTS_UPDATED` in its
JSON-LD and a build timestamp in the sitemap. **Two freshness stories for one
page**, agreeing only by coincidence on the day both read 2026-07-21. This is the
same false-freshness bug the page comment records as fixed in
`app/weapons/[slug]/page.js` - **the discipline reached the JSON-LD and never
reached the sitemap.**

### What shipped

**`FACTS_UPDATED` moved to `lib/vaultBreaker.js`**, imported by both the page and
the sitemap. Matches the `MATCHUP_VERIFIED_DATE` precedent. One definition, two
consumers, cannot drift. `/matchups` now uses `MATCHUP_VERIFIED_DATE`, which
already drove its own children's JSON-LD - the hub had been disagreeing with the
detail pages it indexes.

**(b) DB-driven routes now OMIT lastmod entirely.** `next/sitemap` uses a
truthiness guard (`if (item.lastModified)`), verified at source in
`node_modules/next/dist/.../resolve-route-data.js` AND empirically in the
generated XML - omitting the key emits no element rather than defaulting to
`now()`. A page refreshing every 15 minutes cannot honour any lastmod; a build
timestamp is wrong IMMEDIATELY, not eventually. **The decisive argument: stamping
18 routes with deploy time degrades trust in the 896 article URLs that carry real
per-article dates.**

**Next passes `lastModified` STRINGS verbatim**, so `'2026-07-21'` was used rather
than `new Date('2026-07-21')` - the latter emits `T00:00:00.000Z` and invents a
midnight precision these dates do not have.

**(c) static routes** carry literal constants from `git log`, each verified as a
substantive commit: `/editors` 2026-07-09, `/stats` 2026-07-20, `/leaderboard`
2026-07-20, `/join` 2026-07-20.

### *** FOURTH INSTANCE TODAY OF A LABEL STANDING IN FOR SUBSTANCE ***

**`/stats` and `/leaderboard` were categorised GENUINELY DYNAMIC from their names
and their `changefreq`.** Both have **ZERO supabase refs, zero fetch, zero
await** - static placeholders, the same ones stripped of false capability claims
on 2026-07-20. They were claiming daily/weekly `changefreq` on content that never
changes by itself. `/marathon` and `/ranked` moved the other way (10 and 7
supabase refs). **Four routes moved.**

**RULE, now in the code comment: check the MODULE for data sources, not the route
name.**

Prior three instances today:
1. `meta_tiers` reading as corroboration for `shell_stats`
2. our own articles reading as citation
3. a headline reading as content (the dpmg keep decision)

Four different surfaces, one shape: **a label was trusted in place of the thing it
named.** Every one was caught only by opening the thing itself.

### LARGEST REMAINING FALSE-FRESHNESS SIGNAL - not fixed

The **hub-index pages** claim build-time lastmod while their content is weeks old:

| hub | max(updated_at) | staleness |
|---|---|---|
| `/weapons` | 2026-06-02 | **49 days** |
| `/uniques` | 2026-06-02 | **49 days** |
| `/maps` | 2026-06-08 | 43 days |
| `/shells` | 2026-07-20 | 1 day |

**Bigger than the bug just fixed.** Fixing needs the hub entries moved AFTER their
DB reads - they are currently built in the static array before any query runs, so
they cannot see the results. A constant would be wrong for them: an index over
changing children should report `max(updated_at)`, not a frozen date.

### The /weapons build-time fallback is DORMANT

`w.updated_at ? new Date(w.updated_at) : new Date()`. Measured: **0 of 32
weapon_stats, 0 of 8 shell_stats, 0 of 16 unique_weapons, 0 of 5 game_maps have
NULL updated_at.** Latent, not active. Would silently stamp build time if a future
insert omits `updated_at`.

### STILL OPEN - the original bug, still live

`app/guides/shells/[name]/page.js:286` has `datePublished: '2026-03-05'` beside
`dateModified: new Date().toISOString()`. **Every shell guide claims modification
at crawl time.** Worse than the sitemap case, because JSON-LD `dateModified` is a
direct assertion rather than a hint.

---

## 2026-07-21 - Tiered Compiler section, and: OUR OWN COVERAGE IS NOT A SOURCE

### What shipped

A three-tier Compiler section on `/modes/vault-breaker`: **Bungie-stated**,
**known Cryo Archive encounter**, and **expected-not-verified**. Nobody has
fought the Vault Breaker version, us included, and the page says so above all
three tiers. That honesty is the differentiator: every competing page will
assert this fight confidently within days on no better information.

**Five redundant tier signals** (eyebrow label, accent colour, border, grammar,
bullet prefix) so no reader has to decode a key and no single cue carries the
meaning. **Tier 3 uses a dashed border** - it reads as provisional even in a
screenshot with the text too small to read, which is how this content travels.

**Tier 3 excluded from ALL structured data, verified by rendering** (six probe
strings, all absent from the JSON-LD). Structured data carries only what is
sourced or observed. An inference asserted as a Question/Answer pair is an
inference asserted as fact to a crawler.

**S'Phticide reward claim NOT PUBLISHED.** Searched 100 Steam posts / 335,660
chars for any variant of "phticide" and for any sentence linking the Compiler to
a reward: ZERO matches. True-but-uncitable does not belong on a page whose whole
value is sourcing. The section comment records the search numbers and warns
against adding it from memory.

### *** OUR OWN COVERAGE IS NOT A SOURCE - third instance of this shape today ***

The **dpmg guide was kept in the 179-article cut specifically as "the site's
instructional Compiler coverage"**. Checked before writing this section: it is
**339 words, YouTube-sourced, and contains NO mechanics** - two passing mentions
("avoiding the Compiler threat", "Vaults 5-7 introduce the Compiler boss
encounter") and nothing else.

**The keep decision inferred content from a headline.** The headline said
"Compiler Boss"; the body did not deliver one. The article that actually
describes the fight is **2urw**, which carries **no source_url at all**.

Worse, corpus-wide:
- **ZERO live articles mentioning the Compiler cite bungie.net.** Every one is
  YouTube-sourced or unsourced.
- **"green shield bubble", the three-matching-icons detail, and the damage-phase
  description appear in NO article.** They came from Justin having played the
  base-game encounter.

**The site's Compiler coverage was headline-deep; the knowledge was in the
owner's head.** That gap was invisible until someone read the bodies.

This is the same shape as `meta_tiers` appearing to corroborate `shell_stats`,
and as the `/modes/vault-breaker` SOURCE block citing one post while drawing on
two. Three instances in one day: **a thing that looks like corroboration,
isn't.**

The Tier 2 attribution line therefore names **first-hand play** as the anchor and
states plainly that our own article is "offered as further reading and not as
corroboration".

### *** METHOD: A HEADLINE IS NOT EVIDENCE OF CONTENT ***

**Check the body before citing an article as coverage of anything - including
when deciding what to KEEP in a prune.** The prune's cut criteria were applied to
bodies; the keep rationale for dpmg was applied to a headline. The asymmetry is
the bug. A keep decision needs the same evidence standard as a cut decision, and
arguably more, because a wrong cut is reversible by flipping `noindex` while a
wrong keep silently certifies content nobody has read.

### Build note

First insertion attempt failed: a **Python heredoc silently ate the `'` escapes**
and produced a broken JS string (`'Yes. Bungie's Vault Breaker...'`). Caught by
lint, fixed with the Edit tool. Same family as the documented `
`-in-heredoc
trap. **Use Edit, not a shell heredoc, for content containing apostrophes.**

---

## 2026-07-21 — PROCESS: record DDL as DONE at the moment it is confirmed

**Second time in one day a completed DDL was carried forward as pending.**

1. `meta_tiers.holotag_tier` DROP — recorded as open in TWO places after it ran.
2. `coverage_shadow` `dup_unigram_tokens` / `dup_bigram_tokens` — recorded as
   "DDL PENDING (owner runs)" after it ran.

Both were corrected only when someone noticed and asked. Neither caused damage,
but the failure mode is real: **a stale "pending" entry is indistinguishable from
a genuine one**, so the next session either redoes finished work or, worse,
treats the whole open list as untrustworthy and stops reading it. An index that
lies about state is worse than no index.

**THE RULE: when a DDL is confirmed run, edit the HANDOFF entry in the SAME turn
that confirms it.** Do not leave it in the open list "until the next update".
The entry that announces the DDL is the entry that must be edited — not a new
one appended, since the open list is what future sessions read first.

### *** A CORRECTION IS NOT DONE WHEN IT IS COMMITTED — IT IS DONE WHEN IT IS ON MAIN ***

**Both stale-DDL incidents today were live on `main` while a fix existed
elsewhere** — the first as an uncorrected entry, the second as a correction
sitting on an unpushed branch. **From the reader's side the failure mode is
identical, and the reader is the point.** A fix nobody can see is not a fix.

The second one is the sharper lesson because the work was actually done: the
entry was rewritten, verified against the database, and committed — and the open
list that anyone actually reads still said `DDL PENDING (owner runs)`. It took a
second report of the same staleness to surface it.

**WORKING AGREEMENT (2026-07-21, standing for the session):** HANDOFF-only
commits do not need a separate push instruction — write, commit, merge, push in
one go, then report what landed. The gated-diff requirement stays for CODE
changes, because that gate exists so a diff can be reviewed; it should not apply
to documentation of decisions already made. Gating docs behind a second
round-trip is exactly what stranded this correction.

**And VERIFY before recording DONE.** Both corrections today were verified
against the database rather than taken on report (`42703` on the dropped column
plus a control select; the OpenAPI schema plus a live select for the new ones).
Recording a false DONE is strictly worse than a stale PENDING — pending work gets
re-checked, "done" work does not.

Corollary worth keeping: **state the ordering constraint when the DDL is
proposed, not after.** `holotag_tier` needed code deployed BEFORE the DROP (the
cron write would error on a missing column); the `coverage_shadow` adds were the
reverse — code could ship first because the insert fails open. Same shape of
task, opposite orderings, and getting it backwards breaks production in one
direction only.

---

## 2026-07-21 — Article #5 "all modes" corrected + THE METHOD RULE REFINED

One-word body fix to the last confirmed live accuracy error, and a **third
category** of wrongness that the morning's method rule does not cover.

### The fix

`marathon-cryo-archive-learning-the-map-before-vault-breaker-lands-6nf8`
(NEXUS, 2026-07-06, live and indexed):

> "Vault Data extracted from Vault Breaker converts into gear usable
> ~~across all~~ **in standard** modes."

Headline **deliberately left** as "Learning the Map Before Vault Breaker Lands".
The piece is a pre-launch preparation argument in every paragraph ("Players
running Cryo blind on July 21...", "You have until mid-season..."). A
present-tense headline over a future-tense body reads worse than a consistently
dated piece, and changing it fixes no staleness because the body is pre-launch
throughout.

### *** A THIRD CATEGORY: INTERNAL INCONSISTENCY ***

This claim was **NOT superseded** and **NOT wrong-against-later-information.**
The same article states it CORRECTLY at [1] and overreaches at [2], ~300 words
apart:

> **[1]** "...rewards Vault Data you can convert into gear usable in **standard
>   modes**."  <- CORRECT
> **[2]** "Vault Data extracted from Vault Breaker converts into gear usable
>   **across all modes**."  <- the error

And the **06-23 key-dates post — available when the article was written —**
already drew the boundary correctly: *"gear that can be used in **other
modes**"*. The 07-16 preview introduced NO new fact here. It only sharpened
language the article already had access to and had already used correctly once.

**"All modes" is wrong REGARDLESS OF DATE**, because it includes Vault Breaker
itself, where gear bought with Vault Data explicitly does not apply ("Only Kit
Upgrades will alter your loadout in Vault Breaker"). "Other modes" (06-23) and
"standard activities" (07-16) both exclude it; "all modes" does not.

### *** METHOD RULE REFINED — date-checking is step ONE, not the whole test ***

The rule protects a claim from information that **did not exist yet**. It does
NOT protect a claim that contradicts a source that WAS available, nor one that
contradicts a correct sentence elsewhere in the same article.

**The three checks, in order:**
1. **Did the information exist yet?** (the original rule — publish date vs source date)
2. **Does it contradict what WAS available at the time?**
3. **Does it contradict ITSELF?**

Applying only step 1 here would have wrongly cleared this claim as
"pre-announcement, therefore fair" — the same over-correction risk as the
morning's under-correction. Both failures come from stopping after one check.

This matters for the corpus audit, where the instinct after the #2/#3 withdrawals
is to date-check and move on. Date-checking clears a claim of ANACHRONISM, not of
being wrong.

### Verified
DB re-read: corrected sentence present, old gone, **zero** remaining instances of
"all modes" in the body, sentence [1] untouched, `noindex=false` preserved.
Rendered: correction renders, [1] intact, headline unchanged, page still
indexable (no robots meta).

---

## 2026-07-21 — Dup detector: bigram signal + ratio-based rarity bar (shadow, LOG ONLY)

### CORRECTION to this morning's claim — one blind spot today, not two

**The GHOST 07-16 / NEXUS 07-17 roundups were NOT a detector miss.** They share
`"limit"` (df=2, idf 6.26) and their token sets are **byte-identical** — the
detector WOULD have fired. The earlier claim conflated *"did not block"* with
*"did not detect"*: the probe is log-only and was never going to block anything.
Only the Vault Breaker Mode pair was a genuine blind spot (verified: zero shared
tokens at the bar).

### *** THE CEILING — the more important finding ***

**The Vault Breaker cluster spanned 06-25 to 07-17. A 48h window sees only
ADJACENT pairs, never a cluster. NO window-based detector would have caught it.**

Same-week duplication and slow-accretion duplication are **different problems,
and only the first has a detector.** The corpus audit found **29 clusters of the
second kind**. Do not read a quiet dup log as evidence the corpus is not
duplicating — it is evidence about one of the two problems only.

### What shipped

**(c) BIGRAM SIGNAL.** Fires on a shared adjacent token pair at the same rarity
bar as unigrams. The inversion it fixes: prior coverage drove `"vault"` (df 24,
idf 4.15) and `"breaker"` (df 12, idf 4.80) below the bar, so the detector lost
the subject *because* the site had covered it — exactly when clustering is most
likely. `"vault_breaker"` is df 7 / idf 5.28 and clears the same bar. A phrase
stays rare after its words go common.

`topicTokens` returns an unordered set, so adjacency had to be recovered.
**Chosen approach: extracted the existing loop body into a new exported
`topicTokenSeq()` (ordered), and rebuilt `topicTokens` on top of it** — rather
than adding a second copy of the transform, which is the drift the module warns
against. `topicBigrams()` uses the same primitive. **`topicTokens`' own output is
byte-identical, verified against the original implementation over all 1,564
published headlines: ZERO differences.** Its two production callers
(findDuplicateEvergreen, the shadow probe) are unaffected.

**(d) RATIO-BASED RARITY BAR.** `DUP_MIN_IDF = 5.0` -> `DUP_MAX_DF_RATIO = 0.006`
via `rarityCutoff(n, ratio)`. **Exact no-op at adoption, measured**: both admit
an identical 1,448 tokens, symmetric difference ZERO. It only bites as N grows,
stopping the cutoff drifting — this file already warned an absolute idf is only
meaningful near its calibration size.

**Per-signal logging.** `dup_unigram_tokens` / `dup_bigram_tokens` added;
`dup_rare_tokens` and `dup_shared_count` keep their old meaning (the UNION) so
existing rows stay comparable.

### Backtest

| | fires | % of articles |
|---|---|---|
| current unigram-only | 212 | 13.6% |
| **new combined** | **352** | **22.5%** |
| documented original | 55/515 | 10.7% |

**+10.7 points of fire rate. SURVIVABLE ONLY BECAUSE THIS IS LOG-ONLY** — stated
explicitly, not assumed. Nothing blocks; the cost is more rows and noisier
analysis. It must STAY log-only until real data justifies a threshold.

Confirmed on the actual miss: `[marathon_vault, vault_breaker, breaker_mode]` ->
FIRES where the unigram signal found nothing.

**FP rate is NOT measured.** The ~60% figure came from manual review of the
original backtest; those labels do not exist here. Sampled bigram-only fires look
better than the unigram baseline (`launch_spark`, `vandal_wstr`, `recon_intel`
are real pairs; `weekend_meta` is a generic-phrase FP) — but that is an eyeball
on 10 samples, a HYPOTHESIS for the shadow log to test, not a measurement.

### FP SHAPE HYPOTHESIS — for the shadow data to test

The apparent false positives among the 10 bigram-only fires share a shape:
**GENERIC MODIFIER + COMMON NOUN** (`weekend_meta`, `knife_build`). The phrase is
corpus-rare but **names no subject**. The apparent true positives mostly contain
a proper noun or name a specific event (`vault_breaker`, `recon_intel`,
`perfect_game`, `launch_spark`, `weekend_only`, `vandal_wstr`).

**HYPOTHESIS: bigram precision correlates with whether either token is a proper
noun.** If it holds, a proper-noun filter would cut FPs without touching recall.

**This is a hypothesis from 10 eyeballed samples, NOT a measured rate.** The
original ~60% figure came from manual labels that do not exist here. Test it
against logged rows before acting on it.

THE DISCRIMINATING CASE, worth keeping: **`launch_weekend` was read as an FP by
its FORM and a TP by its REFERENT** — generic-modifier + common-noun in shape,
but it named one real event (the Cryo Archive launch weekend) that two editors
genuinely both covered. A purely lexical proper-noun test would drop it. That
single bigram is the sharpest available test of whether the rule is about SHAPE
or about REFERENCE, and the two answers diverge on it.

### Two limits that remain, both measured

1. **PHRASE SATURATION.** Once a bigram goes common the blind spot returns one
   level up — `"cryo_archive"` is already df 184 / idf 2.25 and invisible.
   This DELAYS the failure mode, it does not remove it.
2. **The window ceiling above.** Nothing here addresses slow accretion.

### Prerequisites / state

**`coverage_shadow` has THREE rows** (probe shipped 2026-07-20). Unit 5
enforcement cannot be tuned from production data yet — it needs weeks starting
now, not weeks already banked.

**The IDF corpus reads all 1,564 PUBLISHED headlines, not the 896 live** (no
noindex filter, deliberately — a noindexed article is still a real duplicate
target). So the 179-article cut did not move the calibration at all.

**DDL DONE — run by Justin 2026-07-21 and VERIFIED the same day.** Both columns
exist as `text[]`, matching `dup_rare_tokens`. Nothing outstanding here.
```sql
ALTER TABLE coverage_shadow ADD COLUMN dup_unigram_tokens text[];  -- DONE 2026-07-21
ALTER TABLE coverage_shadow ADD COLUMN dup_bigram_tokens  text[];  -- DONE 2026-07-21
```
Verified two independent ways, not assumed: the PostgREST OpenAPI schema reports
both as `type=array format=text[]`, and a live `select` on both succeeds while a
control select on a known column also succeeds (so the pass is not a false
positive from an unreachable table). Full `dup_*` set is now
`dup_rare_tokens, dup_unigram_tokens, dup_bigram_tokens, dup_shared_count,
dup_matched_id, dup_matched_editor, dup_match_count`.

The fail-open path this replaced (kept for the record): before the DDL the insert
failed and the probe logged `persist failed (non-fatal)`, leaving generation
unaffected. That is why the code could ship first — the reverse of the
`holotag_tier` ordering constraint, where the DROP had to follow the deploy.

### NOT built, deliberately
- **(b) entity+facet tuple collision.** Verified useless for this failure: all
  four VB articles, both roundups AND the Ziegler control classify
  **UNCLASSIFIED** (Vault Breaker has no `game_modes` row). It can only help the
  classified 45% and is blind by construction to new subjects — which is exactly
  when clustering happens. 2 of 3 live shadow rows are unclassified.
- **Lowering the unigram bar.** Catching `"vault"` (4.15) needs >=4.0, which
  fires on 40% of articles and admits more of the common-English words that are
  the documented FP mechanism.

---

## 2026-07-21 — Corpus duplication audit: 179 noindexed (1075 -> 896)

### The shape of the corpus

**1,075 live, 579 (54%) with ZERO impressions, and only 32 articles earning a
single click.** Whole corpus: 3,282 impressions, 37 clicks.

### *** THE STRATEGIC NUMBER ***

**16 `/uniques/` pages earn 21 clicks. 1,075 articles earn 37.**

Sixteen entity pages nearly match a corpus 67x their size. This is the strongest
evidence yet for canonical-first. Articles are 45% of site impressions but only
32% of site clicks — the entity routes convert and the article corpus does not.

### METHOD: IDF-weighted similarity is the WRONG instrument here

It **down-weights common tokens**, so 29 articles about "thief shell" score LOW
similarity to each other *precisely because* "thief" and "shell" are common. The
measure is weakest exactly where duplication is worst — the same blind spot that
missed vault/breaker this morning. Connected-components also chained badly below
0.35 (one 366-article blob at 0.25).

**Used `lib/coverage.js` `deriveTuple` (entity+facet) as the PRIMARY instrument**
instead: immune to the frequency problem, and it carries canonical collision
natively. 45% classified (489); unweighted Jaccard as a secondary pass on the
586 unclassified, which turned out to be genuinely heterogeneous — only 44 sat in
clusters of 4+. **The duplication is concentrated in the entity-classified half.**

### MINIMAL TERM-LEVEL CANNIBALIZATION

**"thief" queries total 2 impressions site-wide against 58 thief-cluster
articles.** These articles are largely NOT ranking for their apparent subject.
The 146-vs-38 lesson at corpus scale.

**Caveat on the caveat:** the GSC query dimension covers only ~24% of page
impressions (1,764 vs 7,247) due to privacy thresholding, so **absence of a query
is NOT proof of no demand.** Direction is clear; magnitude is not provable.

### *** THIS CUT IS HYGIENE, NOT A GROWTH PLAY ***

**20 of 29 clusters have NO canonical to consolidate into** — `shell/X+tier` and
`shell/X+build` have no route BY DESIGN (`CANONICAL_PAIRS` excludes them because
`/shells/[slug]` is a stat reference, not a tier list). Cutting them removes
competition but banks nothing. Only the **76 articles shadowing real canonicals**
(`/maps/cryo-archive`, `/shells/assassin`, `/shells/rook`, `/matchups/thief`) get
the Misery Disciple effect. **DO NOT EXPECT A TRAFFIC BUMP.**

### What was cut — 179 (noindex, NOT deleted; renders `noindex, follow`)

From a 195 candidate list (clusters >=5, evergreen facets only — all `news` and
`community` excluded per coverage.js policy that community "must never be
blocked"), with three owner adjustments:
- **HELD 15** published within 30 days — indexing lag is real (0-30d cohort is
  25% zero-impression vs 90% at 120d+). Revisit at 60 days.
- **KEPT** the strongest Compiler guide (`...compiler-boss-dpmg`, 7 imp); cut the
  other two near-identical takes.
- **CUT 8 patch-specific articles. REASON IS "SUPERSEDED", NOT "INACCURATE"** —
  they were accurate to the patch they analysed (post-1.0.6.2/1.0.6.3, patch
  1.0.5). Applying the morning's method rule.
- **CUT 32 MIRANDA articles.** Her aggregate stats are the corpus's best (11
  clicks, lowest zero-imp rate at 48%) but **her value is concentrated in her
  weapon-mod and guide earners, which are NOT in this list.** Seven near-identical
  "Complete Rook Shell Guide" variants earning 5 impressions and 0 clicks between
  them is the corpus's densest duplication. The higher bar applies per-article.

Cost: **87 impressions (2.7% of corpus), ZERO clicks.** By editor: NEXUS 64,
CIPHER 47, DEXTER 35, MIRANDA 32, GHOST 1. No cluster reduced to zero.

Benchmark: 76% of the >=5 pool cut for 15% of its impressions, vs the build
prune's 75% -> 29%. Cheaper because this pool was already deader (198 of 344 at
zero impressions before the cut).

### COMPILER RESOLVED

**Pre-existing Cryo Archive endgame boss, reused in Vault Breaker
(owner-confirmed 2026-07-21).** The pre-launch MIRANDA guides describe a REAL
encounter players could fight — not fabricated, not superseded. One kept as the
site's instructional Compiler coverage and as a reference for filling the
`/modes/vault-breaker` Compiler gap after play. 13 live articles mention it in
the headline; 9 survive.

### Verified after the cut
live corpus 1075 -> **896** (exactly -179) · all 179 `noindex=true` and still
`is_published=true` (archive preserved) · all 179 gone from the sitemap (1,034
`<loc>` remaining) · sampled pages render `content="noindex, follow"` · **zero
articles with >=1 click were cut** · kept Compiler guide still indexed and in the
sitemap · all 15 held articles still live · canonical routes all HTTP 200.

---

## 2026-07-21 — Vault Breaker cluster audit: 2 cut, 2 accuracy charges WITHDRAWN

Audited the article cluster competing with `/modes/vault-breaker` on launch day.
Proposed 4 cuts, **cut 2** — two of my own accuracy charges did not survive a
re-read. The withdrawals are the more useful record here than the cuts.

### The numbers

7 headline articles + the canonical: **146 impressions, ZERO clicks.** The
canonical holds the **BEST position (6.81) while carrying the FEWEST impressions
(32)** — the profile of a page held down by its own siblings.

**ARITHMETIC CAVEAT (Justin's catch, and it reframes the case).** Total VB *query*
impressions site-wide are only **38**, while the cluster *pages* total **146**. So
most of these articles' impressions come from NON-VB queries. Cannibalization on
VB terms specifically is much smaller than the raw page totals suggest, and the
canonical likely already wins most VB query traffic. **The cuts are justified on
honesty grounds, not SEO.** Do not cite the 146 as a cannibalization figure.

Also unprovable from the data we had: `Pages.csv` and `Queries.csv` are separate
GSC dimension exports with **no page-query join**, so "which page earns which
query" could not be answered — only inferred from position gaps. Pull the joined
view before cutting anything on ranking grounds.

### CUT (noindex=true, reversible; NOT deleted)

- **#1 GHOST 06-25 "Big Week, But the Lobby Has Notes"** — VB headline, **zero VB
  mechanics** in 661 words. Verified absent: Vault Data, Sponsored Kit, Armory,
  exfil, Cryo Archive, PvE. Two passing mentions. A dev-week roundup wearing a
  Vault Breaker headline. Headline/content mismatch is its own honesty problem.
- **#7 NEXUS 07-17 "Mid-Season 2 Update"** — near-duplicate of #6 one day later,
  same three subjects in the same order. Both accurate; **#6 cites bungie.net,
  #7 cites a YouTube video.** Source attribution is the tiebreak.

`noindex` renders as `noindex, follow`, so the archive and link graph survive.

### *** TWO ACCURACY CHARGES WITHDRAWN ON RE-READ — BOTH MINE ***

- **#3 "It's prestige progression"** refers to the **CRADLE EVOLUTION SYSTEM**,
  which the preceding sentence names as *"the other mid-season story"* — NOT to
  Vault Breaker. And the claim is correct: Cradle Evolution resets a *maxed*
  Cradle, so "for players approaching the Cradle ceiling" describes it accurately.
  The article **never mentions Runner Level at all**, so it cannot contradict
  *"regardless of your Runner Level"*. **A pronoun was read as pointing at the
  wrong antecedent.**
- **#2 was published 2026-06-25, THREE WEEKS BEFORE the 07-16 preview it was
  judged against.** The Tier 1/Tier 2 split and the "designated rewards" language
  did not exist publicly yet. Its "loadout advantage" claim also refers to
  **standard modes**, which the preview grants — the footnote only restricts
  loadouts INSIDE Vault Breaker.

### *** METHOD RULE: do not judge pre-announcement content against a later announcement. ***

Check **publish date against source date** before calling a claim wrong. This is
a live risk for the corpus audit, where much of what gets reviewed is dated
speculation that was accurate to what was knowable when written. Judging it by a
document published later manufactures errors that were never made.

Companion rule, from the #3 miss: **when a claim hinges on a pronoun, resolve the
antecedent from the surrounding sentences before ruling on it.** Quoting a
sentence in isolation is how the wrong subject gets convicted.

### Remaining live accuracy error — exactly ONE

**#5 "Vault Data converts into gear usable across all modes"** contradicts the
preview's footnote (Armory purchases apply to standard activities only; only Kit
Upgrades alter your VB loadout). **#5 is KEEP-and-FIX**, corrected after play.
Kept because its subject is the Cryo Archive map, a distinct intent.

**#4 kept despite being the highest-impression VB page**: 76 impressions exceeds
the entire 38-impression VB query pool, so it ranks primarily for BUILD queries.
It is a build article that mentions VB, not a VB competitor.

### The detector blind spot, predicted then observed

**#6 and #7 are a cross-editor near-duplicate one day apart** — exactly the
failure the rare-token detector cannot see, since `vault` (idf 4.15) and `breaker`
(idf 4.80) both sit under the 5.0 threshold. **The detector goes blind to a
subject once prior coverage has made its tokens common — which is precisely when
clustering is most likely.** Predicted in the morning's launch-protection report,
then found in the data the same day.

---

## 2026-07-21 — Vault Breaker launch day: cron skipped, canonical corrected

Marathon's first PvE mode went live today. Two shipped changes, both defensive.

### 1. One-day cron skip (`chore(cron): skip one run on 2026-07-21`)

Editors cannot play the game, so everything they could write today would be
announcement-sourced — which `/modes/vault-breaker` already covers in one place,
with citations. Generating 2+ articles to compete with our own canonical on
launch day is the BR33 pattern with a known outcome.

**Mechanism: a literal single-date guard** in `app/api/cron/route.js`, after the
auth check and before any paid work. **REMOVE THE BLOCK** (it is inert from
2026-07-22, so a forgotten cleanup costs nothing).

Chosen over the alternatives on the FORGOTTEN-CLEANUP failure mode, which is the
one that actually matters:
- remove the `vercel.json` cron entry → forgotten = generation off indefinitely, silently
- env-var kill switch → forgotten = same, plus a permanent kill switch in the code
- **dated literal → forgotten = a dead `if`.** Fails SAFE; the others fail DANGEROUS.

MEASURED WHILE SCOPING THIS — worth keeping: **both active editors (CIPHER,
NEXUS) are already in `editorsRequiringPatch`**, so the cycle generates NOTHING
unless the patch gate opens. The skip was insurance against Bungie posting a
version-titled launch patch before 19:00 UTC, not a certainty. Also measured: the
07-20 "Vault Breaker Overview" does NOT open the gate (no version string, none of
the four keywords) — the documented KNOWN GAP behaving as designed.

**The rare-token dup detector is structurally blind to Vault Breaker.** Measured
over all 1564 published Marathon headlines: `vault` df=24 idf=4.15, `breaker`
df=12 idf=4.80 — BOTH under the 5.0 threshold. Two editors both writing "Marathon
Vault Breaker ..." share only sub-threshold tokens, so it would not fire or even
log. It is blind precisely BECAUSE 29 prior articles made those tokens common —
the exact inverse of the Ziegler case it was built for (df=4, idf 5.75, fired).
The detector protects novel subjects; Vault Breaker stopped being novel a month
ago. Nothing else would have stopped a cluster: `findDuplicateEvergreen` is
MIRANDA-only and per-editor, and the coverage registry cannot see the page at all
(no `mode` pair in CANONICAL_PAIRS, and no `game_modes` row so it is not even in
the vocabulary). Registering it needs the `/modes/[slug]` route first — parked.

### 2. Canonical corrected (`fix(vault-breaker): multi-source citation, loadout caveat, codex rewards`)

- **The SOURCE block was false BEFORE the overview existed.** The September 22
  Season 3 date comes from the 06-23 key-dates post, not the cited preview. The
  page's header comment ADMITTED the dual sourcing while the rendered sentence
  denied it — an internal note that was honest while the user-facing claim was
  not. That asymmetry is the thing to watch for elsewhere.
- Restructured to a **`SOURCES` array feeding all FOUR citation sites** (hero,
  footer, `eventSchema.citation`, `webPageSchema.citation`). schema.org
  `citation` accepts an array. Same single-definition discipline as `FAQ_ITEMS`,
  so visible text and JSON-LD cannot drift.
- **bungie.net cannot be used to verify a URL.** It is a SPA that returns HTTP
  200 with a byte-identical empty shell for ANY `/News/Article/<slug>`, including
  invented ones (measured: a slug I made up and the real one were identical).
  Cited Bungie's Steam cross-posts instead, each verified by fetching it and
  confirming the page echoes that article's title. A comment warns against
  "tidying" them into bungie.net slugs — the obvious-looking mistake.
- **Loadout caveat added** — the preview's "Only Kit Upgrades will alter your
  loadout in Vault Breaker" was absent while the page described Armory purchases
  and weekly limits, so a reader could spend Vault Data expecting an in-mode
  benefit. Highest-value single addition available from the source.
- **Four Codex rewards named**, with Bungie's `USEC Control` typo preserved as
  written (every other entry reads UESC) plus a visible note, so nobody silently
  "corrects" it and makes our text stop matching what players see in game.
- **Solo/Duo/Trio is now PLAY-VERIFIED** (Justin, 2026-07-21), not source-
  verified. The header comment's old rationale — that "crew, duo, or solo" was
  OUR phrasing and not Bungie's — was falsified by the 07-20 overview using that
  exact construction. **The conclusion stayed correct while its reasoning
  rotted**; a future reader trusting the stale rationale would have "fixed"
  correct text. Rationales need re-checking, not just conclusions.
- `FACTS_UPDATED` → 2026-07-21 on a real verification pass (full preview text
  pulled, every high-risk claim checked word for word, overview compared against
  the whole page). It had become impossible as written: the footer claimed a
  07-16 check while citing a 07-20 source. Footer now says what actually
  happened — checked against all three sources, **not yet verified in game**.

### STILL PENDING PLAY
All HIGH-risk numbers (Vault Data T1/T2 mechanics, kit contents, Armory stock and
rotation, the 3x/5x/1x weekly limits, the four-Codex count) — every one is
accurate to the preview but preview-accurate is not live-accurate. Plus **the
Compiler**, named in the 07-20 overview ("and even the Compiler") and undescribed
anywhere on the page. Plus the `verified: true` split into `source_verified_at` /
`play_verified_at` — the 7b.10 problem in a third place after shell_stats and
meta_tiers, currently LATENT because nothing renders the flag, but the field is
shaped like a `game_modes` column so a future DB read would silently inherit the
wrong meaning.

---

## 2026-07-20 — meta_tiers.holotag_tier REMOVED from code (item 2; DDL DONE 2026-07-21)

Cleared every `meta_tiers.holotag_tier` code reference so the column can be
dropped. 0 of 40 rows ever set — dead from inception, same failure shape as the
three dead weapon queries in the loop fix. Commit `chore(meta): remove
holotag_tier, never populated since inception`. Build green; `/meta` + `/ranked`
render HTTP 200 with no gap (the removed badges were always-null, so nothing
ever displayed there to lose).

**Removed** (7 files): cron WRITE (`cron:637`), prompt schema field
(`editorCore:223`), 4 selects (`meta/page:63`, `ranked/page:67`, `cipher:155`,
`cipher:481`), the `cipher:482` `.not('holotag_tier','is',null)` FILTER + its
entire dead **HOLOTAG-FLAGGED** prompt section in `buildHolotagPrompt`
(`_rankedMap4` went with it — used only there; DEXTER-builds section preserved).

**Per-site delete-vs-repoint calls** (the open judgment the task asked for):
- **`cipher:182` shell-build prompt → REPOINTED** to
  `shell.holotag_tier_recommendation`. `shell` (shell_stats `select('*')`) was
  already in scope with the real data — one-line swap turns a dead prompt line
  into a real benchmark. Clear better fix, so repointed not deleted.
- **`MetaClient:947` ◈ badge → DELETED.** Repoint would need
  `holotag_tier_recommendation` added to the `/meta` overlay (not fetched there)
  and the semantics differ (a *range* recommendation vs a single assigned tier).
  Surfacing it on `/meta` is a deliberate display decision, not a cleanup side
  effect — flagged as optional follow-up, not done.
- **`RankedClient:404` HOLOTAG badge → DELETED.** The movers strip has no
  shell_stats overlay and is weapon-dominated (weapons have no holotag rec).
  Not worth building an overlay for a badge that repoints to nothing on weapons.
- The real holotag data already has a user-facing home: **`/shells/[slug]`
  already renders `shell.holotag_tier_recommendation`** (ShellDetailClient:318).
  So deleting the two dead badges loses no information a user could ever see.

**DDL DONE — `ALTER TABLE meta_tiers DROP COLUMN holotag_tier;` was run by
Justin on 2026-07-21 and VERIFIED gone the same day.** Verification, not
assumption: selecting the column returns Postgres `42703 column
meta_tiers.holotag_tier does not exist`, a control select on the same table
succeeds (so the error is the column, not an unreachable table), and `select *`
returns `game_slug, id, name, note, ranked_note, ranked_tier_solo,
ranked_tier_squad, tier, trend, type, updated_at` — no `holotag_tier`. Nothing
further is owed on this item.

The ordering constraint it was held for (kept for the record, now satisfied): the
code removal had to land BEFORE the DROP, because a DROP against still-deployed
code that writes the column errors the next cron insert. Code merged and deployed
first, then the DROP. That sequence is the reusable part.

NOTE the mirror columns `ranked_tier_solo` / `ranked_tier_squad` / `ranked_note`
are STILL in the table (visible in the column list above). They were NULLED, not
dropped — a separate open item, and not to be confused with this one.

---

## 2026-07-20 — /shells QUIZ: difficulty scoring was entirely dead, Rook now reachable

### The scoring was DEAD, not merely wrong
The quiz matched `Easy` / `Medium` / `Hard` / `Expert` against a DB holding **only High /
Medium / Low**. `Easy`, `Hard` and `Expert` matched **NOTHING**: **three of four answers awarded
ZERO difficulty points** and results were driven almost entirely by q1.

| Answer | tokens | matched (before -> after) |
|---|---|---|
| new | `Easy` -> **`Low`** | **0 -> 4** |
| some | `Easy/Medium` -> **`Low/Medium`** | 3 -> 7 |
| ranked | `Medium/Hard` -> **`Medium/High`** | 3 -> 4 |
| veteran | `Hard/Expert` -> **`High`** | **0 -> 1** |

**No dead rung remains.** Distribution: High 1 (Assassin), Medium 3 (Recon/Thief/Triage),
Low 4 (Destroyer/Rook/Sentinel/Vandal), zero nulls.

### Rook is reachable, and honestly described
- Hardcoded **`-1` replaced with a conditional**: excluded **only** when the player answers
  "Playing ranked", where it genuinely cannot be selected. **Deliberately NOT extended to
  "veteran"** -- that answer describes **experience, not mode**, and inferring ranked intent
  from it would be an unsupported leap.
- **Exclusion keyed on `isRankedExcluded()`, NOT on null ranked tiers.** Sentinel is **also
  null/null** but is **pending placement, not excluded** -- same data shape, opposite meaning.
- **New q1 option** *"Avoid fights. Farm gear, learn the map."*, biased to **Rook only**. Stem
  reworded *"How do you want to win a fight?"* -> *"What is your plan when you drop in?"* so the
  option is coherent; all four original labels read correctly under the new stem.
- **Result copy**: the `/advisor?shell=rook` CTA is swapped when the winner is ranked-excluded
  -- **Rook uses a FREE LOADOUT, so "build a loadout" was a dead end on the very next click**.
  Now "LEARN THE MAPS", plus a disclosure line: *free loadout, not selectable in ranked*.

### Two scoring fixes, both replacing arbitrary behaviour with traceable rules
1. **Bias weight 3 -> 4.** At 3 a q1 match tied exactly with difficulty (+2) + tier (+1), and
   ties fell to **alphabetical array order**, producing **veteran + farm -> Assassin** for a
   player who said "avoid fights, farm gear". **Intent must outrank experience.**
2. **Tiebreak on DIFFICULTY, not array order.** Equal scores now break along the existing
   `Low < Medium < High` ladder: `new`/`some` prefer **lower**, `ranked`/`veteran` prefer
   **higher**. Shells with no difficulty sort last within a tie rather than winning by accident.
   **Alphabetical order was the thing with no justification.**

**Tiebreak effect measured across all 20 paths: exactly ONE changed.**
`evasive + new`: **Assassin (High) -> Thief (Medium)** -- they tied at 4, and a new player was
being handed the hardest shell in the game because "A" precedes "T". Confirmed in the live quiz,
not just the harness.

### lore_tagline was dead everywhere
**NULL for all 8 shells**, so it rendered for **nobody** -- in the quiz result panel AND on the
shell cards. Both replaced with **`best_for`**, which is populated for every shell.

### NOTED, not fixed
`base_health` / `base_shield` / `base_speed` are **NULL for all 8 shells**, still selected in
`app/shells/page.js`, and feed nothing. **Candidate for removal.**

---

## 2026-07-20 — GUIDES pass 1: deleted shell claims citing stats that do not exist

### Four HP/shield claims DELETED, not reworded
**There is no true version to write.** `base_health`, `base_shield` and `base_speed` are **NULL
for all 8 shells**, and `shell_stat_values` contains **no health/shield/speed stat at all** (the
13 stats are Agility, Fall Resistance, Finisher Siphon, Firewall, Hardware, Heat Capacity, Loot
Speed, Melee Damage, Ping Duration, Prime Recovery, Revive Speed, Self-Repair Speed, Tactical
Recovery). **All four fed FAQPage structured data.**

| Shell | Deleted |
|---|---|
| Assassin | `"Lowest shield pool"` |
| Destroyer | `"Top-tier HP + shield pool"` |
| Thief | `"Low HP + shield"` |
| Vandal | `"Medium HP/shield"` |

### Three data-refuted fixes
- **Thief** `"best-in-class extraction speed"` -> **`"highest loot speed of any ranked-eligible
  shell"`**. Loot Speed: **Thief 25 vs Rook 55** -- but Rook is not ranked-eligible, so the new
  wording is **precise and still strong**.
- **Assassin** melee claim **deleted** (strengths item + intro clause). **Melee Damage 10 =
  rank 3** behind Destroyer and Rook at 15.
- **Vandal** `"Jump Jets"` -> **`"Microjets"`**, the actual DB trait.

### FOUR RESIDUALS FOUND AFTER THE FIRST PASS
- **Destroyer `playstyle`: "lean on your shield pool"** -- same nonexistent stat, and
  `playstyle` **also feeds FAQPage schema**.
- **Vandal `title`, `description`, `keywords`** all carried "Jump Jet". These were **MORE
  load-bearing than the body prose originally listed** -- title and meta description are what
  SERPs render.

### *** METHOD RULE -- SIX INSTANCES TODAY: ENUMERATE EVERY SURFACE BEFORE CHANGING ONE ***
1. `availableOnMap` -- two consumers, one fixed
2. `FALLBACK_SHELL_SLUGS` -- dormant twin of the guides-roster bug
3. `isBanned` rename -- five missed references, produced a 500
4. `meta_tiers` Rook -- `/meta` and `/ranked` each had **two** query paths
5. `/builds` `metaShellsList` -- second tier surface on an already-fixed page
6. **This one** -- scanned `strengths`/`weaknesses` arrays but not `playstyle`, `title`,
   `description`, `keywords`

**Not six unrelated slips -- ONE HABIT. Grep the claim string across ALL fields and files
first, then fix.**

### AUDIT FINDING that reframes the /guides/shells fold
**"DB wins because it is owner-verified" does NOT survive.** **Vandal is the counter-example:**
the DB says *"Versatile"*, *"No specialist edge"*, *"Outclassed by specialists"*, while
`shell_stat_values` shows **Agility 30 -- 50% above the next shell**. The guide's **"Movement
Specialist"** framing is **right** and the DB is **wrong**.

**The fold must be adjudicated FIELD BY FIELD** against `shell_stat_values` and the ability
fields -- **not a mechanical overwrite in either direction.**

### *** verified=true IS A ROW FLAG CARRYING FIELD-LEVEL MEANING IT NEVER HAD ***
All seven shells share **one** `verified_source` string claiming matchup data was owner-verified
**2026-07-17** -- but the rows have not been touched since **March/April**:

| Shell | updated_at |
|---|---|
| Rook | 2026-07-20 (corrected) |
| Thief / Triage / Destroyer | 2026-04-09 / 04-07 / 04-03 |
| Vandal / Recon / Assassin | 2026-03-20 / 03-19 / **03-07** |

**The flag attests to the MATCHUP fields. `role` / `strengths` / `weaknesses` inherited an
authority nobody granted them.** That is how Rook's role and tiers drifted for four months
without the flag ever being questioned.

### HELD for pass 2 (needs in-game or a judgment call)
Firewall/shields mapping · Vandal's role and DB strengths/weaknesses · Thief's role (Stealth vs
Extraction) · Recon vs Triage duelling "best support" superlative.

---

## 2026-07-20 — SHELL TIER is now a code fact, not a model output (Option A)

`cron/route.js` now DERIVES shell `tier` from `shell_stats` at write time instead of taking the
model's `item.tier`. **Shell tier = `max(ranked_tier_solo, ranked_tier_squad)`**, computed by
`deriveShellTier()`, with an **explicit NULL when both inputs are null** -- no `'B'` default.

### Why
The prompt rule "tier = the HIGHER of solo and squad" was a mechanical `max()` the model kept
performing, and TWICE defaulted to a confident `A` when both inputs were null (Rook, Sentinel --
a rule with no null case, and a model that defaults rather than declines). Those inputs live only
in `shell_stats` now. **Shell tier is a deterministic code fact; a Rook/Sentinel-class phantom
tier is now structurally impossible, not just prompt-discouraged.**

### Weapons deliberately UNCHANGED -- different case
Weapon tier is **genuine model judgment** (32 weapons across S/A/B/C/D, each with a defensible
note; `ranked_tier_solo`/`squad` do NOT exist for weapons -- 0 of 32). There is nothing to derive
it from, so a blanket derivation would wipe all 32. The write branches on `item.type`: shells
derive, weapons keep `item.tier || 'B'`.

### The read surface was DELIBERATELY NOT touched
~15 files read `meta_tiers.tier` for shells (renders + prompt builders + api). **None changed.**
The derivation lives at the single WRITE point, so `meta_tiers.tier` still holds a value --
code-derived for shells, model-authored for weapons. Spreading `max()` across 15 read sites would
have been the wrong fix; the step-5 lesson (a column's surface spans render/filter/prompt) says
*enumerate* that surface, and here enumerating it showed the fix belongs at the one write, not
across the fifteen reads. Readers already handle null tier safely (verified step 4, zero 500s),
so ungraded shells render untiered rather than defaulting.

### Verified by exercising (functions run against live shell_stats)
Derived tier matches current `meta_tiers` on **all 8 shells, 0 mismatches**: 6 graded shells keep
their tier, **Rook and Sentinel derive NULL**. The `deriveShellTier` source printed from the file
matches the tested copy.

### The three reported sub-questions
- **No shell_stats row for a shell?** Cannot reach the derivation: the existing `validShells`
  gate rejects any meta_update shell absent from `shell_stats` (returns null, filtered out) BEFORE
  the row builder. Defensively, `shellRankedByName.get()` missing -> `{}` -> both inputs undefined
  -> null tier. Fail-safe either way.
- **'BAN' / non-SABCD values?** Do NOT appear in shell ranked tiers. Distinct values across all 8:
  **S, A, B, D, null** -- no `C`, no `BAN`. Rook's ban is expressed as null tiers + a
  `ranked_notes` sentence, not a `'BAN'` literal. `deriveShellTier` drops anything not in
  `TIER_ORDINAL`, so a stray `'BAN'` would resolve to null (correct: a banned shell is off the
  ladder).
- **Trend with null tier:** `computeTrend(null, oldTier)` would return `'stable'` (via `!oldTier`
  or ordinal 0), which would resurrect a `stable` badge on Rook/Sentinel each cron run. Guarded:
  `newTier == null ? null : computeTrend(...)`, so a null-tier shell gets a null trend, staying
  consistent with the manual Rook/Sentinel nulls across runs.

### Prompt left unchanged -- recommendation
The prompt still asks the model for shell tier; cron now discards it. **Recommend leaving it**:
(a) the same instruction block still teaches the model how tier relates to solo/squad and still
governs WEAPON grading, so editing it risks weapon behaviour; (b) the model emitting a
now-discarded shell tier costs only a few tokens and no correctness (it is overwritten). A
token-only optimization (tell the model "shell tier is derived server-side, do not emit it") is a
possible later tidy, NOT bundled -- it touches the shared prompt and could perturb weapons.

### FLAGGED, not fixed (separate pass)
`meta_tiers.holotag_tier` is **DEAD -- 0 of 40 rows set.** The real holotag data lives in
`shell_stats.holotag_tier_recommendation` (Thief: "Silver-Platinum"). The column is emitted-but-
never-populated, a latent version of the same column-nobody-fills trap. Its own pass.

---

## 2026-07-20 — meta_tiers loop fix STEP 5: CIPHER prompt reads shell_stats

Step 4 nulled the mirrored columns; CIPHER's prompt lines that read them from `meta_tiers` went
blank. Repointed to `shell_stats` (source of truth). Verified by replicating the exact render
logic against live data:

```
BEFORE: - Thief [?-solo, ?-squad, stable]
AFTER : - Thief [S-solo, B-squad, stable] -- S-tier solo ranked -- built for hitting Holotag targets and extracting
```

Annotations match `shell_stats.ranked_notes` exactly (0 mismatches), **0 null/undefined
artifacts** ("Thief S null" cannot occur).

### SCOPE EXPANDED BEYOND ranked_note -- flagged
The task scoped step 5 to `ranked_note`, but the same 5 sites also read
`ranked_tier_solo` / `ranked_tier_squad`, which step 4 nulled too. Fixing only `ranked_note`
would have left `?-tier ranked solo` garbage. Repointed **all three** ranked fields at every
site -- the honest complete fix, not the literal instruction.

### The 5 sites
- **179 (single shell), 313 (counter-meta):** `shell` (shell_stats `select('*')`) already in
  scope -> read `shell.ranked_tier_solo` / `_squad` / `ranked_notes` directly.
- **397 (top shells), 567 (current meta):** shell-only lists -> overlay from a shared
  `shellRankedMap()` helper (name -> shell_stats ranked values).
- **481 (holotag, MIXED shell+weapon):** overlay shells; **weapon annotation DROPPED** --
  `weapon_stats` has no `ranked_notes` column at all, same treatment as the dead weapon queries
  in step 1. Comment records why.

`tier`, `trend`, `holotag_tier`, `note` still come from `meta_tiers` (genuine editorial, never
mirrored). Column-name trap handled: `shell_stats.ranked_notes` (**PLURAL**).

### Cosmetic residue, NOT fixed
The 5 `meta_tiers` selects still request the now-null `ranked_tier_solo` / `_squad` /
`ranked_note` columns. Harmless (values unused), left to avoid unrelated churn. Candidate for a
later tidy.

### *** THE ENUMERATION LESSON, EIGHTH INSTANCE -- and the sharpest ***
A column's read surface is **renders PLUS gather/prompt builders PLUS filters.** Step 3 was
scoped to "render sites" and **missed the prompt layer entirely.** The gap only surfaced because
step 4's verification happened to check CIPHER's *filters* -- a lucky adjacency, not a designed
check. When retiring a column, grep every reader of it across ALL layers (`grep -rn 'columnname'`
over app/ AND lib/), not just the pages that render it. The render/filter/prompt split is
exactly where "I checked the obvious surface" fails.

---

## 2026-07-20 — meta_tiers loop fix STEP 4: mirrored columns nulled

The loop is now fully broken. `ranked_tier_solo`, `ranked_tier_squad`, `ranked_note` set to NULL
on every `meta_tiers` row that held them. **7 shell rows** (0 weapon rows -- weapons never had
these populated). Guarded per-row by id, **7/7 rows-affected=1**, read-back confirms **0 rows
with any non-null remain**.

### Renders verified IDENTICAL (before vs after the null)
All ranked values now come from `shell_stats`, so nulling `meta_tiers` was invisible:
- `/shells/thief` FAQ -- byte-identical string.
- `/shells/rook` + `/shells/sentinel` FAQ -- still absent; Sentinel pending note intact.
- `/meta` SOLO badges -- A×4 B×4 D×2 S×2, unchanged.
- `/sitrep` per-shell RANKED badges -- value-level comparison to the pre-null browser snapshot:
  **zero differences** (Thief S, Destroyer B, Recon B, Assassin A, Triage D, Vandal A).
- `/ranked`, `/builds`, `/guides/shells/thief`, `/weapons/*` -- all 200, no 500 on the nulls.

### *** A GATHER-LAYER READ SURFACE WAS MISSED -- CIPHER now reads null (step 5) ***
CIPHER's *filters* were repointed in step 1 (they read `shell_stats`, verified: same 3 shells --
Assassin, Thief, Vandal). But CIPHER's *data* reads stayed on `meta_tiers` and append
`ranked_note` to prompt lines at **5 sites** (`lib/gather/cipher.js:179, 313, 397, 480, 554`).
Those now yield **null**, so CIPHER's daily prompt lost the ranked-note annotation on its
shell/weapon list lines.

**This is NOT a page regression** -- no rendered page changed, which was the stop condition.
CIPHER is a cron-time prompt builder, a read surface that **step 3 did not cover (it was scoped
to render sites)**. My own step-1 note said the data reads keep "tier, trend and note" -- I
overlooked that `ranked_note` in the same selects is a MIRROR, not editorial. The null is
correct; CIPHER is the reader that needs updating.

**STEP 5 (follow-up, NOT done here):** repoint CIPHER's 5 `ranked_note` reads to
`shell_stats.ranked_notes`, matching the render-site pattern. Line 179's target shell already
has `shell` (shell_stats) in scope -- a one-line fix; the list contexts (313/397/480/554) need
the same `shell_stats` join the render sites got. Left as its own gated change rather than
rushed onto step 4. Until then CIPHER's supplementary ranked context is thinner (the target
shell's `note` and abilities still come through; only the per-list ranked_note annotations are
gone).

### Method note
Step 4's own instruction -- "any page change means a read site was missed" -- caught the render
sites cleanly (none changed). It did NOT catch CIPHER because CIPHER is not a page. The full
read surface of a column is renders PLUS gather/prompt builders PLUS filters; enumerating only
one class misses the others. This is the same enumerate-every-surface lesson, applied to a
column's readers rather than a value's render sites.

---

## 2026-07-20 — meta_tiers.Sentinel.tier nulled — SECOND default-with-no-basis tier

`/shells/sentinel` was rendering *"A-Tier in ranked. Tier placement pending June 2 launch"* --
self-contradictory. `meta_tiers.Sentinel` had `ranked_tier_solo` null and `ranked_tier_squad`
null, so per the prompt's own rule (`tier = higher of solo and squad`) there was **no basis for
a tier**. The model emitted **A** anyway. `shell_stats.Sentinel` holds the honest state:
`ranked_tier` null, note *"Tier placement pending June 2 launch"*.

**Guarded write (id + tier='A'), rows-affected=1:** `tier` -> null AND `trend` -> null. `trend`
was `'stable'` -- "held its tier since last regrade", but there is no tier to hold, the same
no-basis default. `note` kept (genuine editorial: Defender System / grenade-cap mechanics,
asserts no tier). **Now identical to how Rook was handled.**

Verified: `/shells/sentinel` no longer renders the ranked FAQ (null tier -> `hasRankedTier`
false), pending note intact; `/meta` shows no A badge for Sentinel (drops off the tier ladder
correctly, still present as a shell); Sentinel still renders as a `/shells` card (tier-independent,
shell_stats-driven); `/sitrep`, `/ranked`, `/builds` all 200; no 500 on the null.

### *** SECOND default-with-no-basis tier (after Rook) -- a PROMPT defect, not data ***
The prompt rule *"tier = the higher of ranked_tier_solo and ranked_tier_squad"* has **NO defined
behaviour when both are null**, and the model fills the gap with a **plausible value (A) rather
than declining**. Rook and Sentinel are two instances of the same failure: a default wearing the
appearance of a grade, which then reads as editorial judgment downstream. Both were nulled by
hand. **The fix belongs in the prompt / tier architecture, not in repeated manual nulls** --
flagged for the tier architecture question, NOT fixed here. Any future shell that launches
before NEXUS grades it will hit this again.

---

## 2026-07-20 — DEAD-COLUMN TIDIES: removed reads of never-populated columns (items 1 + 3; item 2 held for DDL)

### Item 1 -- dead meta_tiers mirror selects: TEN, not five
`ranked_tier_solo` / `ranked_tier_squad` / `ranked_note` were nulled in step 4; every consumer
reads shell_stats now. **Ten selects still requested them** -- 5 in `app/` render sites + **5 in
`cipher.js`** (the step-5 gather residue flagged as "candidate for a later tidy"). All removed.
Downstream-read check (the step-5 lesson -- checked gather AND prompt builders, not just renders):
- `sitrep-data`, `meta`, `sitrep` OVERWRITE these fields from shell_stats (overlay) -> select
  values discarded.
- `shells/[slug]` reads `shell.ranked_notes`, never `metaTier.ranked_note`.
- `/ranked` movers reads `mover.ranked_tier_solo` + `mover.ranked_note` -- both NULL now and
  `&&`-guarded, so null->undefined is behaviour-neutral. (The movers strip's solo/note display
  is already dead; a later render tidy, not this one.)
- `cipher.js` (5 selects) read only `shell.*` / `_r.*` (shell_stats sources) post step 5.
Verified after: /meta SOLO badges unchanged (A×4 B×4 D×2 S×2 -- overlay still supplies them),
/shells/thief FAQ unchanged, all pages 200.

### Item 3 -- base_health / base_shield / base_speed: NOT dead-by-design -> KEEP + trim
**Corrected the premise.** These are not dead columns: `lib/gather/wiki.js:135` INGESTS
`base_health` from the wiki, `admin/page.js:59-61` edits them, and ~10 render sites display them
(all null-guarded) plus editor prompts. Null now only because the source has not populated them,
and Justin's in-game batch will answer whether they exist. **Kept the columns; trimmed only
fetch-but-unused selects:**
- `/shells` hub + `homepage-data` -- fetched base_* and rendered NONE -> removed all.
- `meta` / `builds` / `intel/[slug]` -- render health+shield but NOT `base_speed` (verified:
  base_speed renders only in ShellDetailClient via `select('*')` + advisor) -> removed base_speed
  only. base_health/base_shield kept where used.

### Item 2 -- holotag_tier: DDL DONE 2026-07-21 (was HELD)
`meta_tiers.holotag_tier` is 0 of 40 rows, ever. Real data is
`shell_stats.holotag_tier_recommendation`. **Full surface**: cron WRITES it (`cron:637`), prompt
schema ALLOWS it (`editorCore:223`), read by `MetaClient:947` / `RankedClient:404` /
`cipher:182,502`, and `cipher:482` FILTERS `.not('holotag_tier','is',null)` -> that
HOLOTAG-FLAGGED prompt section returns ZERO rows always (dead, like the old weapon queries).
`advisor/route.js:295` is a DIFFERENT holotag_tier (build-advisor output) -- MUST NOT touch.

**DDL — RUN AND VERIFIED 2026-07-21. Nothing outstanding here:**
```sql
ALTER TABLE meta_tiers DROP COLUMN holotag_tier;   -- DONE 2026-07-21
```
**Coupled code changes to apply WITH the drop (so the cron write does not error):** remove
`holotag_tier` from the cron write (`cron:637`), the prompt schema (`editorCore:223`), the selects
(`meta`, `ranked`, `cipher:155`, `cipher:481`), the `cipher:482` filter + its `HOLOTAG-FLAGGED`
prompt section, and the render reads (`MetaClient:947`, `RankedClient:404`, `cipher:182,502`).
Safe order: land the code removals first (harmless while the column still exists), then DROP.

---

## 2026-07-20 — ALT-TEXT audit: live number is ~ZERO, not 1,154; Gate 4 hardened

### The finding
The Ahrefs 2026-07-17 "1,154 missing alt" is **stale/misread**. Measured the LIVE site by
**rendering 45 pages across every type** (articles, entity details, hubs, editor lanes, DMZ,
tools) and parsing the actual `<img>` tags: **ZERO missing alt.** Every image has a real alt or
a deliberate `alt=""` (correct decorative usage per WCAG -- info already in adjacent text).

### Why it is already solved
Alt is **DERIVED AT RENDER** from the entity name or the article headline (`alt={shell.name}`,
`alt={article.headline}`, `alt={item.name}`, `alt={displayName + ' map'}`, editor `alt={edTag(
...)}`), **never stored**. So there is no write-time path that can attach an image without an
alt, and **no alt column exists or is needed** (deriving from name is correct and free -- the
doctrine's hypothesised fix, already implemented everywhere). No `next/image` is used, so
Ahrefs sees the SSR HTML directly; no hydration gap.

### WHY THE AUDIT SAID 1,154 (hypothesis, not asserted -- can't inspect the export)
Ahrefs' "Crawled" column counts **URLs affected, not images**: 1,154 of 1,606 crawled URLs.
That fits "nearly every page renders at least one `alt=""` decorative image" IF the tool counts
empty alt as missing. The same reading applies to "Title too long: 1,343" (also a URL count).
**No alt-related commit exists between the audit and now**, which rules out "it was broken and
got fixed" -- it was never broken on the indexable site.

### NO BACKFILL
The doctrine's "enforce at generation, then backfill" is already satisfied by render-time
derivation plus the lint gate. Writing alt text would be the treadmill the doctrine warns
against, for a solved problem.

### GATE HARDENED (this commit)
`jsx-a11y/alt-text` **warn -> error** in `eslint.config.mjs`. It shipped as a WARNING via
`eslint-config-next/core-web-vitals` (a missing-alt `<img>` could merge past it). Now hard-fails.
**Proven the gate bites, not just configured:** a deliberately alt-less `<img>` produces a
`jsx-a11y/alt-text` ERROR and exit 1 at the new severity, versus only a WARNING at the old
`warn` severity. Linting the real codebase shows **zero** alt-text violations (the 40 lint
errors present are pre-existing `react/no-unescaped-entities`, unrelated). `npm run build`
(Turbopack) is unaffected -- it does not run eslint, so this gate is for `next lint`/CI.

---

## 2026-07-20 — DMZ registered in the gather pipeline (option A); Phase-D checklist

Two low-risk changes so the DMZ config is pipeline-*ready*. This does NOT make the cron produce
DMZ (see the STILL-OPEN gaps). The cron file was NOT touched.

### FIXED
- **DMZ absent from `lib/games/index.js` GAMES** -> `getGameConfig('dmz')` threw
  `Unknown game slug: dmz`. **FIXED** -- registered. `getGameConfig()` with no argument still
  resolves to **marathon** (default unchanged), verified; Marathon's path is byte-identical.
- **`dmz.js` lacked `editorial`** -> the cron roster gate reads `config.editorial.editors`, so
  its absence would have crashed on undefined if DMZ were ever selected. **FIXED (`['NEXUS']`
  only).** No `editorsRequiringPatch`.

### THE FOUR-GAP PHASE-D CHECKLIST (launch-time, so it is a checklist not a rediscovery)
1. **[FIXED]** DMZ not in `index.js` GAMES -> `getGameConfig('dmz')` threw.
2. **[FIXED]** `dmz.js` lacked `editorial` -> roster gate would crash on undefined.
3. **[STILL OPEN, launch-time]** The cron uses **`getGameConfig()` with no argument**
   (`cron/route.js:20`), so `PRODUCING_GAME` is **always marathon**. There is **no game-param
   selection**. Registering DMZ does NOT make the cron produce it -- that is Phase D (a game
   param on the trigger + a DMZ `vercel.json` cron entry).
4. **[STILL OPEN, launch-time]** `dmz.js` `sources` has only `x` -- no `steamAppId`, no
   `reddit`. **`gatherAll()` hard-crashes at `lib/gather/index.js:149`** on
   `config.sources.reddit.subreddits` (undefined). These sources are **meaningless pre-launch
   anyway** (no Steam page data, no subreddit traffic), so filling them is launch work BY
   NATURE, not deferred work.

### DELIBERATE non-actions
- **DMZ stays OFF the auto-cron until launch.** Pre-launch official-announcement volume is near
  zero, so a daily NEXUS run would manufacture thin rehashes -- the exact content the step-1
  noindex gate was built to suppress. **`scripts/gen-dmz-news.mjs` stays** as the manual,
  owner-reviewed trigger until launch, then retires.
- **No `detection` block.** A pre-launch game has no patch feed, so a patch gate would key on an
  event that cannot occur. The cron's `editorsRequiringPatch || []` no-ops the gate anyway.
- **CIPHER / DEXTER excluded from the DMZ roster.** CIPHER needs ranked/play data that does not
  exist yet (launch-time addition); DEXTER is killed by the research (DMZ loadout guides
  1,300/mo behind a KD wall vs 12,100/mo for keys) -- porting it would manufacture the same
  model-generated build content just paused for Marathon.

### Coverage / shadow / dup -- confirmed game-parameterised (not a Phase-D gap)
Verified against the call path, not the config: `findDuplicateEvergreen(..., PRODUCING_GAME_SLUG,
...)` and `logCoverageShadow` (its `getIdf`/`findCrossEditorDuplicate` take `gameSlug`) all pass
game_slug explicitly. These work for DMZ the moment it produces rows.

---

## 2026-07-20 — meta_tiers loop fix STEPS 2+3: stop writing mirrors, repoint renders

**Columns NOT nulled yet -- that is step 4, after a render-verification window.** Existing
column values persist, so renders keep working on stale-but-correct data in the interim.

### Step 2 -- the write (cron/route.js)
Removed `ranked_note`, `ranked_tier_solo`, `ranked_tier_squad` from the `meta_tiers` row object.
`tier`, `trend`, `note`, `holotag_tier` untouched (genuine editorial output). The loop is broken:
NEXUS no longer writes back copies of `shell_stats`.

### Step 3 -- render repoints
**JOIN shell_stats (source of truth):**
- `/meta` -- shell_stats ranked fields overlaid onto shell-type meta rows before the client sees
  them; MetaClient unchanged. Added `ranked_notes` to the shell_stats select.
- `/sitrep` (page) + `/api/sitrep-data` -- same overlay. **UNFILTERED overlay source on
  purpose:** Sentinel is A-tier with a NULL solo tier, so a `.not('ranked_tier_solo','is',null)`
  source would have silently missed it (the existing filtered fetch stays, for the S/A schedule
  list).
- `/shells/[slug]` FAQ -- ranked note now reads `shell.ranked_notes`, tier still from meta_tiers.
  The solo/squad badges were ALREADY on shell_stats. Client "Meta AI Analysis" block dropped its
  `metaTier.ranked_note` fallback (`metaTier.note` is populated for every shell -> no visible
  change).

**DROP the display (mirrored value selected but not meaningfully rendered):**
- `/builds` and `/guides/shells/[name]` -- `ranked_note` was in the meta_tiers select and never
  rendered; removed from the select. Their visible ranked badges read shell_stats already.
- `/weapons/[slug]` -- dropped the `metaTier.note || metaTier.ranked_note` fallback and the
  select column. Weapon meta rows have 0/32 ranked fields anyway.

### *** ITEM 8 WAS BASED ON A WRONG PREMISE -- admin left UNCHANGED ***
The instruction was to remove `ranked_tier_solo` / `ranked_tier_squad` from the admin edit form
at `admin/page.js:70-71` because "cron no longer writes them". **But those fields are in the
`shell_stats` config block (starts line 55), NOT meta_tiers.** `meta_tiers` is **not in
`ALLOWED_TABLES`** -- there is no admin form for it at all. Those fields edit the **source of
truth** that every render now reads. **Removing them would delete the owner's only way to edit
the authoritative ranked tiers.** Left untouched and flagged rather than executed. (My own step-3
report cited the line number without checking the table -- the same class of miss the method
rule is meant to catch.)

### TWO GENUINE DATA DIVERGENCES surfaced by the repoint (NOT wrong joins)
solo/squad agree across all 8 shells; two `ranked_note`s did not, so repointing to shell_stats
changed two rendered notes -- both toward the source of truth, both confirmed in visible text
AND FAQPage schema:
- **Assassin**: `"High risk/reward solo -- Holotag theft specialist; B squad"` (model-elaborated
  in meta_tiers) -> `"High risk/reward -- Holotag theft specialist"` (shell_stats). The dropped
  "B squad" is already shown as a separate SQUAD badge.
- **Sentinel**: `null` (meta_tiers) -> `"Tier placement pending June 2 launch..."` (shell_stats).
  The repoint ADDS an honest pending note. **Side effect worth noting:** Sentinel now renders
  "A-Tier in ranked. Tier placement pending" -- mildly self-contradictory, because
  `meta_tiers.Sentinel.tier = A` is the **default-with-no-basis** case (null solo/squad, model
  emitted A). That is the tier-is-not-judgment problem from step 1, unfixed here.

### COLUMN-NAME TRAP handled
`shell_stats.ranked_notes` (**PLURAL**) vs `meta_tiers.ranked_note` (**SINGULAR**). Every
repoint maps plural->singular explicitly; a typo would have produced a silent null.

### Verified by rendering (browser + curl)
`/sitrep` per-shell RANKED badges exact (Thief S, Triage D, Destroyer B, Vandal A, Assassin A,
Recon B, Sentinel none). `/meta` SOLO/SQUAD badge set complete (A,B,D,S / A,B,S). `/shells/thief`
FAQ unchanged, `/shells/rook` FAQ absent, the two flagged notes changed as predicted in text and
schema. All target pages 200.

### STILL TO DO (step 4)
Null the now-unread `ranked_tier_solo` / `ranked_tier_squad` / `ranked_note` columns on
`meta_tiers` in one guarded sweep, after this render change is observed clean.

---

## 2026-07-20 — meta_tiers loop fix STEP 1: repoint the FILTERS before any nulling

**No write-path change in this commit.** This step makes every filter that keys on the mirrored
`meta_tiers` columns immune to the nulling that Step 2 (stop writing them) will do -- so nulling
later cannot make them return zero rows silently.

### Why filters first
`ranked_tier_solo` / `ranked_tier_squad` / `ranked_note` on `meta_tiers` are COPIES of
`shell_stats`, written back through the NEXUS prompt. Several reads FILTER on them
(`.in('ranked_tier_solo', ['S','A'])`, `.not('ranked_note','is',null)`). Null the columns and
those filters return **zero rows with no error** -- CIPHER's ranked context and the `/ranked`
movers strip would just go quiet. **Seventh instance of the quiet-failure family this session.**

### What changed
- **3 CIPHER shell filters** (`lib/gather/cipher.js`): filter source split out to a shared
  `rankedShellNames()` helper that reads **`shell_stats`**; the DATA still comes from
  `meta_tiers` (which supplies `tier`/`trend`/`note`, fields `shell_stats` does not have).
  Verified exact: BEFORE and AFTER both return the same **3 shells** (Thief S, Assassin A,
  Vandal A). Rook correctly absent from both (its `shell_stats` ranked tiers are null).
- **3 CIPHER weapon filters DROPPED.** They filtered `meta_tiers` weapons on
  `ranked_tier_solo` and have returned **ZERO rows for their entire existence**: `weapon_stats`
  has no such column (only the boolean `ranked_viable`), and **0 of 32** `meta_tiers` weapon
  rows have it populated. **EIGHTH quiet-failure instance -- pre-existing, unrelated to the
  loop.** A comment at each removal site records the reason.
  - **NOT re-sourced from `meta_tiers.tier`**: those tiers are NEXUS-authored, so feeding them
    back to CIPHER would create **editor-to-editor circularity** -- the same disease in a
    different organ.
  - **OPEN DESIGN QUESTION:** CIPHER was intended to have top-ranked-weapon context and has
    never had it. Re-sourcing needs a REAL quality signal, not model output.
- **`/ranked` movers**: filter switched from `.not('ranked_note','is',null)` to
  **`.in('trend', ['up','down'])`**. A strip called "meta movers" filtering on "has ranked
  prose" was showing non-movers as movers. `trend` is computed in code by `computeTrend()`,
  never model-echoed, so it survives the loop fix. **Honest empty state added** (SectionEmpty /
  DmzEmptyState pattern) for when nothing has moved. Today it renders **one genuine mover**
  (Misriah 2442, weapon, trend down) instead of the old **6** prose-havers -- a real
  improvement, not just a refactor.

### *** CORRECTING AN EARLIER PREMISE: tier IS NOT INDEPENDENT JUDGMENT ***
The prompt instructs *"set `tier` to the HIGHER of `ranked_tier_solo` and `ranked_tier_squad`"*
(`editorCore.js:429`), and **`tier == max(solo, squad)` on 6 of 6 shells that have a basis**.
The earlier "`tier` diverges on 6 of 8" compared against **`shell_stats.ranked_tier`** -- the
WRONG column. So Option B removes the false second witness for solo/squad/note, but **`tier`
remains downstream of `shell_stats`**. **Sentinel is the tell:** no basis (null/null), model
emitted **A** anyway -- a default wearing the appearance of a grade.

### ARCHITECTURAL QUESTION FOR ITS OWN SESSION
If `tier = max(solo, squad)` and those live in `shell_stats`, **`tier` could be computed in code
and NEXUS need not grade tiers at all.** What would remain of `meta_tiers` is `note` (genuine
model prose) and `trend` (code-computed).

### PROVENANCE COLUMN (Option C) DROPPED FROM THE PLAN
After the full fix, everything in `meta_tiers` is either model-authored (`note`) or
code-computed (`trend`, and `tier` derived) -- so a `source` column would read one value
forever. **A column with one value is decoration, not provenance.**

### STILL TO DO (Steps 2+)
Remove the 3 mirrored columns from the `cron/route.js` write (3 lines); repoint or drop the ~6
RENDER sites; null the now-unread columns in one guarded sweep.

---

## 2026-07-20 — meta_tiers.tier NOT NULL dropped, Rook.tier nulled

`meta_tiers.tier` NOT NULL constraint dropped (Justin ran the DDL) and **`meta_tiers.Rook.tier`
nulled** in one guarded write (rows-affected=1): **the data now matches what the code was
masking**, so the code-level suppressions are belt-and-braces rather than load-bearing and are
deliberately KEPT -- a future consumer would otherwise re-render it. Verified: 11 pages, zero
Rook tier displays, no 500s on the null tier. **The other seven shells' tier values are genuine
NEXUS editorial judgment and are untouched.**

---

## 2026-07-20 — meta_tiers.Rook was LIVE-WRONG on three pages, including FAQPage schema

### Live-wrong, not dormant
`meta_tiers.Rook` still held **`tier: "A"`, `ranked_tier_solo: "B"`** and the pre-correction
`ranked_note`, timestamped 2026-07-19. It surfaced on **three** pages:

1. **`/shells/rook` -- FAQPage STRUCTURED DATA.** `app/shells/[slug]/page.js:206` composed
   **"Is Rook good in Marathon ranked?" -> "Rook is currently A-Tier in ranked. Learn ranked
   here before moving to specialist shells"** into BOTH the visible FAQ and the schema.
   Machine-readable, about a shell that **cannot be selected in ranked at all**. Same class as
   the `/stats` unbuilt-capability claims removed the same morning.
2. **`/meta`** -- `SOLO B` badge + the stale note, from a SECOND query path
   (`app/meta/page.js:62`), separate from the builder pool already filtered.
3. **`/ranked`** -- the movers strip (`app/ranked/page.js:66`), which qualifies rows via
   `.not('ranked_note','is',null)`, so Rook qualified purely by HAVING a note.

### tier set to NULL rather than deleting the row -- BLOCKED BY A NOT-NULL CONSTRAINT
Deletion was rejected on purpose: **NEXUS would treat Rook as new on its next regrade and
re-insert a tier.** But `meta_tiers.tier` is **NOT NULL**, so the intended `tier: null` failed
(`null value in column "tier" violates not-null constraint`) and the whole UPDATE rolled back.

Applied instead: `ranked_tier_solo`, `ranked_tier_squad`, `trend` -> null; `ranked_note` and
`note` replaced. **`tier` remains `"A"` in the DB** and is now suppressed in CODE at every
render surface. **OPEN: a one-line DDL (`ALTER TABLE meta_tiers ALTER COLUMN tier DROP NOT
NULL;`) is Justin's to run if the data itself should be corrected rather than masked.**

`shell_stats.Rook.updated_at` set to 2026-07-20 -- the corrected row previously read
**2026-04-04** and so looked staler than the wrong row it supersedes.

### *** METHOD RULE: enumerate every consumer BEFORE changing one ***
Both `/meta` and `/ranked` had **TWO query paths each**, and the earlier exclusions had covered
**one each**. Enumerating all 14 `meta_tiers` read sites up front found a **FOURTH** surface the
approved list did not include: `app/builds/page.js:293` `metaShellsList`, a separate derivation
from the same rows, still rendering an **A** badge next to Rook after the shell-card
`displayTier` fix. Fixed in this pass and flagged as beyond the approved three.

**Fifth instance today of a fix landing on a SUBSET of surfaces**, after:
- `availableOnMap` (two consumers, one fixed)
- `FALLBACK_SHELL_SLUGS` (dormant twin of the guides-roster bug)
- the `isBanned` rename (five missed references -> a 500)
- `/meta` + `/ranked` (one path each)

**Grep for all consumers first, then fix.** Verified after: a full sweep of 11 pages shows
**zero** Rook-with-a-tier renders anywhere.

### The mirrored fields are model round-trips for EVERY shell
The seven other shells' `ranked_tier_solo` / `_squad` / `ranked_note` in `meta_tiers` are also
NEXUS round-trips of `shell_stats`; they simply **happen to be correct**. **The loop fix does
not repair existing rows** -- it only stops new ones being minted.

---

## 2026-07-20 — ROOK: the VERIFIED row was WRONG and the hand-written copy was RIGHT

### *** THE EPISTEMIC LESSON -- this is the transferable part ***
Justin verified in-game: **Rook cannot be selected in ranked of any kind** -- solo, duo or trio.

`shell_stats.Rook` carried **`ranked_tier: C`, `ranked_tier_solo: B`**, and a
**"Rook is for SOLO play only"** playstyle. It was marked **`verified=true`, owner-verified**.
Against it stood **twelve independent hardcoded locations** all saying "banned from Ranked".

The assistant argued **for the DB**, on the grounds that the row was **internally consistent**
(a banned shell would not carry ranked tiers). **THAT REASONING WAS BACKWARDS.** The tiers were
**part of the same error**, not evidence against it.

> **COHERENCE IS NOT CORROBORATION.** A wrong row can be perfectly internally consistent.

And the **`verified` flag made it worse, not better**: it terminated inquiry and outweighed
twelve independent authors. **Only going and looking settled it.** Justin's instinct -- "twelve
hand-written instances is a lot of smoke" -- was the stronger signal and was under-weighted.

### What Rook actually is
**Not a weak competitive shell. A SCAVENGER / free-loadout farming option** (Justin: *"similar
to Scavs in Escape from Tarkov"*). Drop in with **minimal personal risk** to farm gear, credits
and map knowledge.

### INDEPENDENT CORROBORATION -- from data that never went through the NEXUS loop
`shell_stat_values` **Loot Speed**: **Rook 55**, Thief 25, Assassin 15, floor 5.
**2.2x the next shell, 11x the lowest.** Meanwhile Self-Repair 5 (joint-bottom), Agility 12 (5th).
**The stats were right the whole time; the prose fields were wrong.** This table is not fed to
the editors, so it is the one witness the pipeline could not have contaminated.

### The meta_tiers loop -- PROVEN, not hypothetical
`meta_tiers.Rook` inherited the error through the NEXUS prompt and carried a **NEWER timestamp**
(**2026-07-19** vs `shell_stats` **2026-04-04**), so it read as **fresh independent
confirmation** -- and **was cited as corroboration during the audit**.

**PROVEN: any error in `shell_stats` acquires a false second witness in `meta_tiers`.**
**Correcting `shell_stats` does NOT fix the stale `meta_tiers` row.** Scoped separately, **not
fixed in this pass**.

### What changed
**DB (`shell_stats.Rook`, guarded, rows-affected=1 each):** role `Flex` -> **`Scavenger`**;
`ranked_tier` / `_solo` / `_squad` -> **all null**; `holotag_tier_recommendation` -> null;
`ranked_notes`, `recommended_playstyle`, `best_for`, `strengths`, `weaknesses` rewritten around
the free-loadout farming purpose. **`verified` stays TRUE** with a correction note in
`verified_source` -- `false` means "unconfirmed", and this is **confirmed, previously confirmed
wrong**. Flipping it would hide the row from editor context and cause a different error.

**Code:** `isBanned` -> `isRankedExcluded` (Rook-scoped only); badge -> **`NOT IN RANKED`**;
four role strings -> Scavenger; explicit Rook exclusions at `/ranked` (the DB tier had been
**overriding the correct BAN fallback on the live page**), `/meta` shell pool, `/builds`.
`/guides/shells/rook` prose rewritten off the corrected row.

**FALSE SHIELD-POOL CLAIMS REMOVED (3).** Rook has **no `base_shield` value at all**, yet three
places called it a "high shield pool" beginner pick -- one of them **inside FAQPage schema**
(same class as the `/stats` unbuilt-capability claims removed the same morning). Replaced with
what is actually true and equally useful: free loadout, highest loot speed.

**Greyscale/dimming on `/shells` KEPT.** It asserts "not selectable in ranked", which is **true**.
The assistant had proposed removing it and **was wrong**.

**The 12 "banned from Ranked" claims are CORRECT and were NOT edited.**

### QUIZ BUG FOUND, NOT FIXED
The `/shells` quiz matches `difficulty` **Easy / Medium / Hard / Expert**, but
`shell_stats.difficulty` only ever contains **High / Low / Medium**. **`Easy`, `Hard` and
`Expert` match NOTHING**, so both the "new" and "veteran" answers score **zero** difficulty
points and results are driven almost entirely by question 1. **Silent vocabulary mismatch, same
family as `available_on` slugs vs display names.** Predates this work.

The quiz also **scores Rook -1 and filters it out, treating it as BAD rather than DIFFERENT**.
No quiz option means "farm and learn the map with nothing at risk", which is Rook's actual
purpose. **Needs scoping alongside the difficulty repair.**

### METHOD NOTE -- the comfortable explanation was wrong
A rename left **five** `isBanned` references behind. `/shells/rook` returned **500**
(`ReferenceError: isBanned is not defined`), and the verification showed **"badge: 0"** --
which was **nearly written off as stale build artifacts**, having just run a stash/rebuild cycle.

**Stale servers are a real phenomenon AND a tempting explanation for a real break.**
**Check the HTTP status and the server log before accepting the comfortable reading.**

(Also re-encountered: `weaknesses` is Postgres **`text[]`, not jsonb** -- a JSON-literal guard
fails with "malformed array literal". Documented trap, caught by the fallback guard.)

---

## 2026-07-20 — NAV made crawlable: ~10 routes had no nav link in HTML at all

### The defect
`components/Nav.js` dropdowns rendered behind **`{open && (...)}`**, so a closed dropdown
emitted **NO HTML**. Every link inside was invisible to crawlers: **~10 routes had no nav link
site-wide, and `/builds` + `/join` had none at all.**

### The fix
Panel is now **always rendered** and hidden with **`visibility: hidden`** (+ `opacity: 0`,
`pointer-events: none`), which keeps the anchors in the document for crawlers while removing
them from **both the tab order and the accessibility tree**. `aria-hidden` mirrors the state;
**`aria-haspopup` / `aria-expanded` added** (previously absent).

**Verified by attempting REAL focus, not by `offsetParent`.** `offsetParent !== null` tests for
`display:none`, NOT `visibility:hidden` -- it reported all 14 links as focusable and **would
have looked like a genuine a11y failure**. The correct test (call `.focus()`, check
`document.activeElement`) returned **false for every link when closed, true when open**.

### Inbound counts, before -> after
| Route | Before | After |
|---|---|---|
| `/join` | **0** | **240** |
| `/builds` | 12 | **241** |
| `/cradle` | 3 | **240** |
| `/status` | 142 | **241** |
| `/guides`, `/advisor`, `/sitrep`, `/editors` | 141-183 | **240** |
| 5 editor lanes (`/intel/<editor>`) | 142-148 | **240** |

### Mobile menu deliberately left client-gated
`Nav.js` mobile menu is still `{mobileOpen && (...)}`. The desktop dropdowns now supply **every
one of those links** in HTML, so rendering them twice would duplicate ~14 links per page for
**zero crawl benefit**.

### MAP -> MODE: the premise was wrong
Map pages render mode/event **NAMES**, but **none of them have pages** -- there is no
`/modes/[slug]` route and no event route at all. And **Vault Breaker is not a `game_modes`
row** (its facts are a static const), so a map page **could never discover it from the data it
already reads**. That is why `/modes/vault-breaker` had **0 inbound links site-wide**.

Built **`lib/modePages.js`**: a registry of modes that HAVE canonical pages, matched through the
**same `availableOnMap()` predicate on the same slug contract**. **Deliberately NOT a hardcoded
`slug === 'cryo-archive'` check** -- that is the exact shape that produced the `availableOnMap`
bug and the guides-shells roster bug. Verified: cryo-archive links it, the other 4 maps do not.

### Reciprocal guide links (3)
`/weapons` -> `/guides/weapons`, `/mods` -> `/guides/mods`, `/maps` -> `/guides/maps`. Entity
hubs previously linked guides in **neither** direction; guides linked out to entities but never
received a link back.

**`/shells` -> `/guides/shells` deliberately NOT added** -- that pair is the pending
fold-then-redirect decision, and the link would be churn.

### *** THIRD INSTANCE TODAY: rendered HTML contradicted a source read ***
1. The **double-suffix defect** (7 routes printing the site name twice)
2. The **`/uniques` hub links** (nearly reported as absent; they are in the client component)
3. The **`/guides` hub links** (reported as "only 1 of 16"; **all 16 are linked**)

**RULE: measure rendered output.** A grep for **static** `href="..."` strings misses any href
built by **concatenation** (`'/guides/' + slug`), which is how most of this codebase builds
links. Every claim in this entry comes from a 253-page crawl of served HTML.

### Verification caveat
Visual checking was **computed-style and layout-geometry based, NOT a pixel diff** -- the
screenshot tool timed out twice. Nav height **unchanged at 48px in both states**; panels are
`position: absolute`, so nothing shifts.

### OPEN -- homepage entity links (item 2, NOT built)
`/` still has **0** links to `/shells`, `/matchups`, `/uniques`, `/factions`, `/ranked`.
Two blockers found: **`components/Footer.js` does not render on `/` at all**
(`app/page.js:28` -- the neutral root renders its own minimal footer), so server-rendering that
footer's link row would place **zero** links on the homepage; and `/` is a **game-neutral
network root** whose header comment forbids Marathon vocabulary in neutral chrome.
**Proposed instead:** an optional `keyRoutes` array per game in `lib/network/rootGames.js`,
rendered inside `GameRoutingTile` / `GamePulseColumn` -- which the same comment explicitly
sanctions ("a game's own content inside its segmented column are correct"), stays game-agnostic,
and gives DMZ the same mechanism at launch. **Awaiting Justin's call.**

---

## 2026-07-20 — 4xx INVENTORY CLOSED + the cannibalization pattern gets a second instance

**Sitemap non-200: 1 -> 0. Internally-linked 4xx: 2 -> 0.** Derived from first principles (no
Ahrefs URL list) by building, serving, and status-checking **all 1,421 sitemap URLs** plus a
40-page crawl yielding 484 unique link targets.

### The one sitemap 4xx: /guides/shells/sentinel
`app/sitemap.js` emitted `/guides/shells/<name>` for **every** `shell_stats` row (8), while the
route resolved against a **hardcoded 7-shell object**. Sentinel is in the table and has no
guide, so the sitemap advertised a URL the route `notFound()`s.

**Fixed by deriving the list from ONE place** -- new **`lib/shellGuides.js`**
(`SHELL_GUIDE_SLUGS` + `hasShellGuide()`), matching the `SLOT_PAGES` (`/mods/[slot]`) and
matchups `SHELLS` (`/matchups/[shell]`) pattern the sitemap's own comments already praised. The
route checks the shared list FIRST; both directions fail safe.

**BOTH emission paths were unfiltered** -- the live DB path AND `FALLBACK_SHELL_SLUGS`. The
fallback was dormant only because it happens to hold the same 7 slugs today; it would have
produced the identical bug the moment anyone added Sentinel to it. **Same duplicated-logic root
cause as the `availableOnMap` bug in the entry below** -- second occurrence in one day.

### Missing images: 9 rows, NOT 7
**Filenames != rows.** `ballistic-turbine.webp` and `unstable-biomass.webp` each appear under
**two factions**, so 7 missing files map to **9 rows**: 7 `faction_materials` + 2
`implant_stats`. All 7 files confirmed absent from `public/` before writing. `image_filename`
set to NULL so renderers fall back; **guarded on id + exact current value, 9/9
`rows-affected=1`**, read-back confirms **0** remaining references to missing files.

### VANTAGE portrait
`lib/editors/roster.js` exposes `editorHasPortrait()` precisely because server components have
no `<img onError>` -- and **both** `/intel` portrait sites bypassed it, hardcoding
`/images/editors/<name>.jpg`. VANTAGE has no file, so `/intel` served a 404 on every render.
`EditorAvatar` extracted, falling back to an initial badge. `vantage.jpg` and `broker.jpg` refs
now **0**; the five live portraits still render. **Fixed the guard, not the asset.**

### /modes index deliberately NOT built
It would be **one real canonical (Vault Breaker) + two DB rows that link nowhere** (no
`/modes/[slug]` route exists) **+ two `verified=false` rows that should not ship**. Revisit when
the unverified rows are confirmed or a `/modes/[slug]` route exists. **Nothing links to
`/modes`, so leaving it 404 costs nothing.**

### *** CANNIBALIZATION PATTERN -- SECOND INSTANCE ***
**An entity with ONE page outperforms the same entity split across two.**

| Entity | Shape | Impressions | Clicks | Position |
|---|---|---|---|---|
| **Misery Disciple** | 1 page | 128 | **10** | 5.5 |
| **BR33 Victory Lap** | 7 pages | 108 | **0** | 8.5 |
| **Sentinel** | `/shells` only | 31 | **1** | best shell page on the site |
| **Rook** | `/shells` + `/guides` | 26 + 26 | 0 | **9.3 and 12.7, split** |

**Sentinel is the ONLY shell without a `/guides` twin and the best performer.** This is
precisely why **no Sentinel guide was written** -- completing the set would have split the one
shell page that currently works. The reasoning is recorded **in `lib/shellGuides.js` itself**
so nobody "completes the set" later without reading it.

### CONSOLIDATION CANDIDATE -- not decided
**`/guides/shells/*` is 7 pages earning 53 impressions and 1 click**, competing with
`/shells/*` (**100 im, 3 clicks**) for the **same 8 entities**. The data points toward folding
the guides into `/shells` and redirecting. **Not decided.**

---

## 2026-07-20 — availableOnMap FIXED: duplicated logic was the root cause, not the display-name bug

**`game_modes` rendered ZERO rows on all 5 map pages; `game_events` rendered on only 2 of 5.**
Modes now 0 -> 9 rendered rows across the five pages, events 3 -> 7.

### ROOT CAUSE: the predicate was written correctly ONCE, then copied and the copy rotted
`lib/editorCore.js:893` had the **correct** implementation all along -- slug-based, `'all'`
sentinel handled. `app/maps/[slug]/page.js` carried a **second, divergent copy** that compared
`available_on` against **`gameMap.name`, the DISPLAY NAME**, and had **no `'all'` branch**.

The data was never wrong. The contract is documented in the admin form itself
(`app/admin/page.js`, placeholder **`map slug(s) or "all"`**) and every row obeys it.

Two independent defects in the copy, either alone sufficient:
1. **`'all'` never handled.** Substring-matching a map name against the literal string `"all"`
   cannot succeed -- this alone hid **Standard Extraction** (the one verified core mode) on
   **every** map.
2. **Slug vs display name.** `toLowerCase()` handles case but not the hyphen:
   `"night-marsh".indexOf("night marsh") === -1`.

### WHY IT SURVIVED TWO AUDITS: it worked BY ACCIDENT on 2 of 5 maps
**Outpost** and **Perimeter** are single-word maps whose **slug equals the lowercased name**, so
their events matched and the section looked functional. The multi-word maps (`dire-marsh` vs
"Dire Marsh", `night-marsh`, `cryo-archive`) silently returned `[]`, and the render was gated on
`length > 0` -- **so a broken filter looked identical to a section that was never built.**
Partial success is what made this invisible.

### THE FIX
**`lib/availability.js` (new)** -- single source of truth, exporting `availableOnMap(availableOn,
mapSlug)`. **Both** `editorCore` and the map page import it; **neither keeps a local copy.**
Call sites now pass `slug`, not `gameMap.name`.

**Extraction was the point.** Fixing only the display-name comparison would have left two copies
of the same rule, which is the thing that failed.

### HONEST EMPTY STATE -- replaces the `length > 0` gate
EVENTS and GAME MODES now **always render**: rows, or an explicit *"No verified game modes are
recorded for <Map> yet."* (Rook / DmzEmptyState pattern). It hides nothing today post-fix --
**the point is that it would hide the next one.** Silent omission is what let this survive.

### CONTRACT VIOLATION fixed in app/modes/vault-breaker/page.js
`available_on` was **`'Cryo Archive'`** -- a display name -- inside a const commented *"shaped
like a game_modes row so a future DB read drops straight in."* **It would not have.** The value
fails the corrected slug match and would render on no map. Now `'cryo-archive'`, and the
overclaiming comment carries a correction note. Not displayed anywhere, so no visible change --
this was purely disarming a trap.

### TWO THINGS FLAGGED, NOT FIXED
1. **`game_events` has no `.order()` on the map page**, so event render order is **unspecified**.
   Night Marsh came back as `Anomaly, Upper Complex Encounter` rather than the expected reverse
   -- **same set, no missing rows**, but worth an `.order()` for deterministic output.
2. **The substring-match assumption is documented in `lib/availability.js`**: a slug that is a
   **substring of another slug** would false-match (`marsh` would match `dire-marsh`). **No
   current pair does.** Splitting on commas was **rejected as brittle** against whitespace
   variants in values like `'dire-marsh, night-marsh'`. If such a slug pair is ever added, the
   file says to switch to exact list matching.

### PROVENANCE GAP
**`game_modes` has no `verified_source` column**, unlike `unique_weapons` / `weapon_stats`.
Provenance is a **bare boolean** -- we know a row is claimed verified, not what verified it.

### HONEST CEILING -- what this fix does NOT do
**4 of 5 maps gain exactly ONE mode** (Standard Extraction); only night-marsh gains two. The
events gain is larger. **This will not move pages sitting at position 12.6 / 19.4 on its own.**
The rows with real substance are **`Ranked`** and **`Cryo Archive Runs`**, both **`verified=false`
pending in-game confirmation (Justin's task)** -- verifying them would roughly double what these
pages show and is separable from this code fix.

---

## 2026-07-20 — BR33 VICTORY LAP consolidated: 9 cut, 5 kept, uniques now linked from articles

**Corpus 1086 -> 1077.** 7 accuracy cuts + 2 duplication cuts. The only cannibalized unique on
the site.

### ACCURACY BASIS -- 7 articles, mutually exclusive fabricated acquisition
All seven contradict the verified row (`acquisition_source` **"Showcase encounter"**,
`acquisition_detail` **"Perimeter / Dire Marsh"**, `verified_source` **"In-game Showcase
data"**) **and each other**. Two invented exact prices:

- `62733c1d` -- *"To unlock the BR33 Victory Lap, you need Traxus Rank 15 and 3,500 credits
  plus 12 Anomalous Wire and 8 Plastic Filament."*
- `1bb28ac1` -- *"available through direct purchase from the Armory ... early reports suggest
  5,000+ credits"*
- `ed45d544` -- *"Bungie hasn't revealed the exact unlock requirements"* (then guesses anyway)
- `062d26d8` -- *"progress through the new Victory Lap challenges"*
- `9d949e0e` -- *"unlocked through mid-season challenges and limited-time events"*
- `1fd2e2e5` -- *"reward pass unique rather than faction-locked"*
- `567adc52` -- *"available through the mid-season event rotation"*

**Each quote was re-verified present in the LIVE body immediately before its own write**; a
missing quote aborts that row. Duplication cuts: `21bba419`, `5ce7e319`. All guarded,
`rows-affected=1` each.

### CORPUS DEFINITION MADE EXPLICIT -- resolves a count disagreement
The live-corpus figure is **`noindex=false` AND `is_published=true` AND
`game_slug='marathon'`**. Bare `noindex=false` returns **1091** because it counts **3 live DMZ
rows** and **2 unpublished Marathon rows** (`82bee9b7`, `899b3bbd`, both 2026-03-21) that never
render. **Use the full filter for any corpus quote.** Justin's 1083 was correct; the 1091 in
the preceding scope report was the loose filter and is wrong.

### STEP 1 CORRECTION -- recorded because it contradicts how the change was argued
Adding `unique_weapons` to the mentioned-items pipeline installs a site-wide **MECHANISM**, but
**only BR33 Victory Lap had mentions to convert -- 40 articles. The other 15 uniques are named
in ZERO of 1,086 articles.** It was argued as a site-wide fix worth more than one entity; the
forward value is real (future mentions link automatically) but the immediate impact was **one
entity**. This also **explains WHY BR33 is the only cannibalized unique**: nothing else has
article competition because nothing else gets written about.

Canonical inbound links **2 -> 33** (31 surviving articles + hub + base-weapon page).

### The link mechanism
`InlineStatCard` previously rendered a `<span>` for every entity type, so **no article produced
a crawlable link to anything**. Article bodies are plain text -- **0 of 1,569 contain HTML**,
and `parseBody` supports only `**bold**`, pull-quotes and paragraphs, so inserting markdown
links into bodies would render as literal bracket text. The card is now a real `<Link>` **for
uniques only**, guarded on slug presence.

**Uniques match BEFORE weapons so the longer name wins** ("BR33 Victory Lap", not its base
"BR33 Volley Rifle"). **Weapon/shell/mod/implant/faction cards deliberately NOT converted** --
larger crawl-graph change, over-linking risk, separate decision.

### NATURAL EXPERIMENT worth keeping (Justin's GSC)
| Entity | Shape | Impressions | Clicks | Position |
|---|---|---|---|---|
| **Misery Disciple** | 1 page, no competitors | 128 | **10** | 5.5 |
| **BR33 Victory Lap** | canonical + 6 articles | 108 | **0** | 8.5 |

**Matched demand, opposite outcome.** This is the cannibalization case made on two entities
rather than on aggregate ratios -- worth reusing as the argument.

### 349ffe3b KEPT -- the proposed gate did NOT fire
The claim that **"+20 Equip Speed / +10 Aim Assist appear in no other article"** came from a
**truncated scan printing only the first 4 stat matches per article**. Actual: Equip Speed in
**6** articles, Aim Assist in **3**. Not an outlier, no fabrication established, stays live.

### What was deliberately NOT stretched into a contradiction
The `weapon_stats` note (*"S2 1.1.0: corrected stats on the 'Victory Lap' Deluxe-unique variant
only (under-the-hood cleanup, no gameplay bonus/penalty change)"*) is about the **1.1.0
correction**, not about whether the variant has bonuses over base. **It does not disprove the
+30 Range claims and was not used as if it did.** The articles' **base weapon stats are
CORRECT** (damage 14, fire_rate 900, magazine_size 27, all matching the verified row). **Only
acquisition was fabricated.**

### QUIET-FAILURE TRAP -- third of a family
**`.ilike()` on a `uuid` column matches nothing and returns 0 rows WITHOUT erroring.** Caught by
a `cand.length !== 1` guard that aborted **all 9 writes**; corpus stayed 1086 until the rerun
with client-side prefix resolution.

The family, all of which fail **silently**:
1. `head:true` + count swallows a table-missing error and returns null (false EXISTS).
2. Paginated `.range()` without an explicit sort order drifts counts between pages.
3. `.ilike()` on `uuid` matches nothing, no error.

**Guards and controls catch these. The operation itself never will.**

### OPEN -- locked_mods, with a circularity guard
`locked_mods` is **NULL** on the Victory Lap row while the page title promises **"Stats, Mods &
How to Get It"**. 13 articles name the same four mods (**Trigger Discipline chip, Hi-Zoom Optic,
Tru-Shot Barrel, Feather Mag**) and 11 carry the same stat block.

**That is NOT corroboration.** They share one editor pipeline and one upstream source, so it is
**one unverified claim repeated 13 times** -- and the same pipeline produced four mutually
contradictory acquisition stories. **Justin to verify in-game before anything is written.**

**CIRCULARITY GUARD: never populate a verified table from the site's own pipeline output.**

---

## 2026-07-20 — TITLE-SUFFIX SWEEP: 9 detail routes freed, double-suffix defect found, /uniques template shortened

### Suffix dropped on 9 entity-detail routes
`61c9095` had only covered `/intel/[slug]`, `/dmz` and `/dmz/[section]/[slug]`. Everything else
still inherited `template: '%s | CyberneticPunks'` (18 chars) from `app/layout.js`.
`title: { absolute: ... }` now applied to: **`/uniques/[slug]`, `/weapons/[slug]`,
`/shells/[slug]`, `/mods/[slot]`, `/matchups/[shell]`, `/maps/[slug]`, `/modes/vault-breaker`,
`/guides/shells/[name]`, `/guides/[category]`.**

### DOUBLE-SUFFIX DEFECT -- found during the audit, not in scope going in
**Seven routes appended `" | CyberneticPunks"` MANUALLY *and* inherited the layout template,
rendering the site name TWICE.** Found by diffing rendered `<title>` against source, not by
reading source -- the source line looks correct in isolation.

| Route | Rendered before |
|---|---|
| `/creators` | **105** chars |
| `/guides/shells/[name]` | **100** (`... & Strategy \| CyberneticPunks \| CyberneticPunks`) |
| `/guides/shells` (category) | **99** |
| `/sitrep` | **90** |
| `/maps` (hub) | **89** |
| `/me`, `/join`, `/join/intake`, `/join/setup` | 46-50 |

The manual duplicate was removed everywhere. The two `/guides/*` routes are detail routes and
took `absolute` instead. **Hubs and utility pages keep the SINGLE templated suffix** -- they
just stop printing it twice.

### /uniques template shortened
`Marathon <Name> - <base_weapon> <rarity> Unique: Stats, Mods & How to Get It`
-> **`Marathon <Name>: Stats, Mods & How to Get It`**

**Max 54, min 45, all 16 under 60. Worst case was 107.** `base_weapon` and `rarity` dropped
**from the title only** -- both remain in the description and on the page. Pushing them into
the title cost us the searched term, which is the item name.

**"Locked Mods" deliberately NOT targeted.** Justin's call, on GSC: demand sits on weapon
NAMES, not attribute terms. (A `Marathon <Name>: Stats, Locked Mods & Drop Source` variant fits
the budget at max 59 and was rejected on that basis, not on length.) Note the originally
suggested `... Stats, Locked Mods & How to Get It` **maxed at 61** and would have missed the
under-60 target on 5 of 16.

### False comments corrected
`/uniques/[slug]` and `/modes/vault-breaker` both carried a comment saying **"No site-name
suffix (layout title.template appends it)"**. That read as a claim the rendered title had none;
it did have one. Both now state that `absolute` is what makes it true.

### STILL OVER 60 -- their own templates, not the suffix (SEPARATE JOB)
`/weapons/[slug]` worst **65**, `/guides/shells/[name]` **64**, `/shells/[slug]` **63**.

### OPEN -- deliberately not changed, scoped to detail routes
**`/shells` hub (87)** and **`/matchups` hub (84)** still carry the suffix and are arguably
keyword-competitive on "marathon shells" / "marathon matchups".

### Method note
Every length in this entry was measured from **rendered `<title>` on a built server**, not
computed from source. That is what surfaced the double-suffix defect, which source-reading
had missed on two prior passes over these same files.

---

## 2026-07-20 — HONESTY PASS: unbuilt-capability claims removed from /stats, invented leaderboard values blanked

### /stats: no fake numbers, but a claimed product that does not exist
The page invented **no data**. What it did was describe an **unbuilt feature in the PRESENT
TENSE**, in indexed copy **AND in FAQPage structured data** -- on the site's highest-demand tool
query (**marathon stat tracker, 42 impressions, position 10.3**). Structured data made it worse
than loose marketing copy: it told Google in a machine-readable format that we operate a stats
tracker. There is no public Marathon stats API, so player lookup is not degraded or partial --
it is **absent**.

**Five claims removed.** Four came from the audit; the fifth (**FAQ 4**, `CyberneticPunks pairs
your stats with live meta context ... you also see where it ranks`) was **found during the edit**
and cut under the same rule rather than left as the one survivor.

| Location | OLD (present tense) |
|---|---|
| meta description | `Track your Marathon stats ... Look up any player on Steam, PlayStation, or Xbox` |
| hero body | `Look up any Marathon player across Steam, PlayStation, and Xbox` |
| FAQ 1 | `Our infrastructure is built and ready to connect` |
| FAQ 4 | `pairs your stats with live meta context ... you also see where it ranks` |
| FAQ 6 | `Numbers refresh in real time after each match` |

Title, og and twitter descriptions reframed to future tense. **Title still targets "Marathon
Stats Tracker"** -- the demand is real and the page will eventually serve it.

**WebApplication JSON-LD node DROPPED ENTIRELY, not reworded.** The node asserts an application
exists at this URL. **No description wording makes a nonexistent app exist**; softening it would
have left the same false structured claim, just vaguer. FAQPage and BreadcrumbList stay -- both
describe things that genuinely exist. Re-add WebApplication when the tracker is real; the
in-code note says so.

**Schema/visible-text parity holds by construction**: both the visible FAQ section and
`FAQPage.mainEntity` map the same `FAQS` array, so a claim removed from the page is removed
from structured data automatically. No forked copy exists. Same discipline as `/dmz`.

An **in-code note** at the top of `app/stats/page.js` records why the copy is future-tense,
quotes the removed claims verbatim, and sets five rules -- so a future editor does not "improve"
weaker-but-true copy back into confident-and-false copy. Same pattern as the DMZ
no-sequel-claim note.

### /leaderboard: NOT fabricated standings -- the premise was corrected before acting
Names are `████████` redactions, score/kd/extractions are `— —`, rows render at **0.35 opacity**,
and a `● AWAITING RANKED API DATA` banner sits above the H1. The page **already followed the
honest-skeleton pattern**. The only genuine invented claims were **platform and shell** --
asserting rank 1 is a Destroyer player on Steam came from nowhere, and `SHELL_COLORS`
colour-coding made those invented values look **data-driven**. Both columns blanked to `———`;
the colour lookup removed; `SHELL_COLORS` **deleted** (dead, and a live palette next to blanked
placeholders invites repopulating them).

An **honest empty state** was added **above** the skeleton table, so the disclosure is read
before the shape. It routes to the real data we do have: **`/player-count` (1,010 tracked
snapshots since March 2026)** and **`/meta`** (current shell and weapon tiers). Follows the
Rook / DmzEmptyState pattern.

### /api/bungie-stats has ZERO consumers
`grep` across `app/`, `lib/`, `components/`, `scripts/` returns no reference outside the route
file itself. It is an **unreached stub returning placeholder-shaped JSON, and it is publicly
reachable**. Deleting or 404ing it is an **OPEN DECISION -- not done**.

### PRINCIPLE (applies site-wide)
**Keep targeting a keyword you can eventually serve; never describe an unbuilt feature in the
present tense.** Ranking for a query is fine. Claiming a shipped feature to win it is not. An
honest limitation beats a promise that fails on first use: a visitor who arrives, reads "look up
any player", and finds nothing **bounces** -- a worse signal than an accurate empty state. A
skeleton may convey **structure**, never **content**.

---

## 2026-07-20 — PATCH GATE precision fix: 42% -> 30% fire rate, 7/7 recall, 0 press FPs

### The state it replaced (measured, 60-day backtest)
The old gate **fired on 25 of 60 days (42%) to cover 7 real patches**. Press false-positives:
**4** -- including the one that started this: **Rock Paper Shotgun's "A month after mass layoffs
at Bungie, Marathon game director Joe Ziegler is leaving"**, which matched the bare keyword
**`patch` in its BODY** and opened the gate for all three editors on 07-18 and 07-19.

### TWO STRUCTURAL DEFECTS
1. **Keywords matched TITLE + FULL BODY.** One occurrence of `patch` anywhere in any article's
   text qualified it. `versionRe` already tested title only; keywords did not.
2. **NO source restriction.** Steam's per-appid feed **mixes official announcements with
   third-party PRESS** -- **51 of 100 Marathon items** were Gamemag.ru (25), PCGamesN (18),
   Rock Paper Shotgun (8). Press coverage of a game is not a patch.

### TWO RELIABLE SIGNALS FOUND
1. **`feedname` separates official from press** -- verified 1:1 over 100 items: all 49 official
   posts carry `steam_community_announcements`; all 51 press items carry their outlet name.
   **Chosen over `feedlabel`** ("Community Announcements") because feedlabel is **DROPPED by
   `lib/gather/steam.js`'s normalisation** while feedname is already plumbed through, and a
   machine id is stabler than a display string. (There is **no** Steam `patchnotes` tag -- the
   `tags` array holds only moderation artifacts.)
2. **Bungie uses a rigid title convention: `"Marathon Update X.Y.Z"`.** Every one of the 7 real
   patches matches `versionRe` on the title; no non-patch does.

### The fix
- **`officialFeedName` is CONFIG-DRIVEN** in `marathon.js` detection, read by `engine.js` --
  **never hardcoded**, because the engine is shared and DMZ's source will use a different id.
  **ABSENT on a game -> NO source restriction**, preserving prior behaviour for any game that
  has not set one. **A MISSING `feedname` on an item -> treated as OFFICIAL**: the RSS half of
  the adapter carries no feedname, and that feed is the official community-announcements
  endpoint (verified 10/10 Bungie posts, zero press). Dropping it would lose official
  announcements that RSS has and the `count=8` JSON window does not.
- **Title-only keyword matching.**
- **Keywords: `hotfix, patch notes, update preview, combat tuning`.** Removed the body-noise
  words that were doing the leaking: `patch`, `nerf`, `buff`, `balance pass`, `weapon tuning`.

### TWO IMPLEMENTATION DEVIATIONS (both deliberate, both verified)
1. **`officialFeedName` (machine id) NOT `officialFeedLabel` (display string).** The Steam
   adapter (`lib/gather/steam.js`) **passes `feedname` and DROPS `feedlabel`**, so keying on
   feedlabel would have needed new plumbing through the adapter. A machine id is also stabler
   than a human-readable label. **Verified 1:1 across 100 items** (49 official ->
   `steam_community_announcements`; 51 press -> outlet names).
2. **A MISSING `feedname` counts as OFFICIAL.** The adapter merges Steam **JSON (has
   feedname)** with Steam **RSS (has none)**. A strict equality check **would have silently
   dropped every RSS item.** RSS verified **official-only (10/10 Bungie posts, zero press)**,
   and it carries announcements the **`count=8` JSON window misses**. Without this allowance
   the gate would lose real patch coverage -- **the failure mode explicitly ruled worse than
   leaking.**

**Absent `officialFeedName` in a game's config = NO source restriction**, preserving current
behaviour for DMZ and future games until they set their own.

### THE DELIBERATE TRADEOFF
**Previews are INCLUDED BY NAME** (`update preview`, `combat tuning`) because they are
**official, dated, title-matchable, high-value events** -- caught deliberately rather than
accidentally on a body keyword. The 07-16 Mid-Season 2 Update Preview still fires.

### KNOWN INTENTIONAL GAP (not a bug -- do not "fix" by loosening the gate)
**Three official Game-Director posts no longer fire** -- e.g. *"BALANCE SHAKE UP!" A note from
Marathon's Game Director, Joe Ziegler* (2026-04-02), plus two more Ziegler notes (04-13,
04-17). They are **official but carry no version or keyword in the title**.

**Also intentionally OUT:** Season open/close ("Welcome to Season 2", "Season 1 Comes To A
Close"), **Dev Team Updates**, and **economy notes**.

**All of the above is DIRECTIVE TERRITORY -- cover via `editor_directives` if wanted.** That
mechanism exists precisely so the automatic gate can stay narrow.

### Backtest of the SHIPPED implementation (imports the real engine + real config)
| | old | new |
|---|---|---|
| days fired / 60 | **25 (42%)** | **18 (30%)** |
| real patches caught | 7/7 | **7/7 -- no misses** |
| press false-positives | 4 | **0** |

**Every one of the 18 fires traces to a real official event** -- 16 days across the 7 versioned
patches (48h window = two runs each) plus the two previews. **Ziegler verified: `OLD
is_patch_note=true -> NEW false`.**

---

## 2026-07-20 — DEXTER PAUSED from daily generation (+ the patch gate is leaking)

### The pause
**`'DEXTER'` removed from `editorial.editors`** in `lib/games/marathon.js`. One line.

**Basis:** **71% of its 295 lifetime articles are `shell/build`** (93% of the last 30); build
articles earn **0.13 clicks/page** (GSC 3mo); **199 of 266 were cut 2026-07-18**; and the
recommendations are **100% MODEL-GENERATED** -- no table records which core+weapon+mod
combination is actually good. **175 of DEXTER's 295 (59%) are already noindexed.**

This was a **DIRECTIVE decision, not an enforcement one.** Unit 5 blocking would have been the
wrong instrument: it suppresses content with nowhere to route readers, because `shell/*/build`
has no canonical.

### REVERSAL
**Re-add `'DEXTER'` to `editors`.** `editorsRequiringPatch` was left UNTOUCHED so the reversal
is symmetric -- one token, nothing else. Do this **when the loadouts are game-verified**
(~8-16 rows, same shape as the matchup matrix fill) and `/builds/[shell]` becomes buildable.

### NOT redirected to another beat
DEXTER's secondary beats (`weapon/build` 8%, `shell/tier` 4%, `weapon/tier` 2%) carry the
**SAME verification problem** -- no table records which weapon+mod combination is good either.
**No evidence-backed target exists; inventing one was declined.**

### DEXTER remains fully alive as an interactive persona
`/advisor` (the Build Advisor tool), `/api/ask-editor`, `/api/audit` are **independent of the
cron and unaffected**. Only daily article generation stops. `/builds` keeps serving the **120
live DEXTER articles**; it just stops growing.

**COSMETIC:** `/about` still lists DEXTER's byline and beat -- same for GHOST/MIRANDA since
07-16. Worth a consistency pass for all three, not a blocker.

### *** THE BIGGER FINDING -- THE PATCH GATE IS LEAKING ***
**All three patch-gated editors (CIPHER, NEXUS, DEXTER) published on 3 of 4 days since the
07-16 freeze.** On **07-19 the trigger was Joe Ziegler's departure, NOT a patch.**

`hasPatch` = `bungieNews` filtered by `is_patch_note` = **(version regex OR keywords) AND
fresh <=48h** -- so it fires on **PATCH-NOTE-SHAPED NEWS, not patches**. The freeze is running
at roughly **75% pass-through** (4-day sample -- indicative, not precise).

**Consequence: "patch-gate only" is a FALSE pause.** DEXTER wrote another Assassin build on
07-19 *while already patch-gated*. Do not rely on this gate alone to stop an editor.

**SCOPED AS A FOLLOW-UP TASK: fix `hasPatch` precision -- affects CIPHER and NEXUS too.** If
the gate detected real patches, gated editors would publish 2-4x/month, which is the behaviour
the freeze was designed for.

---

## 2026-07-20 — CROSS-EDITOR RARE-TOKEN duplicate detection (shadow only)

### The blind spot it closes
**46% of content is UNCLASSIFIED** (no vocabulary entity in the headline), so the coverage
registry **could not see** the 2026-07-19 NEXUS/CIPHER duplicate on Joe Ziegler's exit. Both
logged UNCLASSIFIED; **Jaccard was ~0.25, far under the 0.7** evergreen threshold. News/event
duplication was structurally invisible to Gate 2.

**The signal:** a RARE token shared by two DIFFERENT editors in a short window is a
near-certain same-event duplicate. `ziegler` df=4/1564 (idf 5.75); `marathon` df=561
(idf 1.33). **Needs no vocabulary maintenance** -- works on any proper noun (dev names,
tournaments, outages, weapon codenames).

### Config
**48h window, cross-editor only, idf >= 5.0, LOGS AT min-1** with `dup_shared_count` recorded
so **Unit 5 picks the enforcement threshold from production data**, not a one-time read.
Backtest (60d / 515 articles): **min-1 = 55 fires (~60% FP)**, **min-2 = 14 fires (~20% FP)**.
**min-2 is the likely enforcement threshold.**

### *** PATCH DAY IS NOT THE FALSE-POSITIVE DRIVER *** (contradicted the expectation)
Only **~9% of fires** were patch-day multi-editor coverage. And **patch VERSION tokens cannot
fire at all** -- `topicTokens` drops sub-3-char tokens, so `"1.1.0.3" -> nothing`
(verified: `"Update 1.1.0.3"` -> `[update]`). **No exclusion and no patch-driven exemption is
needed.** Measuring resolved an ambiguity that reasoning would not have.

### THE ACTUAL FP DRIVER + the limit of the technique
Ordinary English words that happen to be rare in THIS corpus: `right`(9), `reality`(8),
`exposed`(7), `wall`(5), `anchor`(8), `boss`(9). e.g. *"Best Ranked Loadout Right Now"* vs
*"Build the Right Three-Runner Team"* fired 4 times.
**LIMIT: df alone cannot separate a proper noun from a common word.** `ziegler`(4) and
`right`(9) are both "rare"; only one is an entity. This is why the 2-token rule works so much
better -- a coincidental pair shares ONE odd word, a genuine same-event pair shares the entity
AND its context (`joe`+`ziegler`, `d54`+`sidearm`, `2442`+`misriah`, `disaster`+`meltdown`).

### Shared tokeniser
`topicTokens` / `buildIdfMap` **extracted to `lib/topicTokens.js`** so
`findDuplicateEvergreen` and the dup checker use ONE implementation and cannot drift.
**Tokeniser equivalence verified IDENTICAL on 5 test headlines** -- the 0.7 Jaccard threshold
stays calibrated. **IDF is corpus-size sensitive**, so the 5.0 cutoff is only meaningful near
N=1564 (noted in-module).

### Design calls
- **`would_block` still reflects COVERAGE only.** The dup signal lives in its own columns so
  **previously-logged rows stay comparable** and Unit 5's analysis is not retroactively
  changed.
- **Multiple matches -> BEST match** (shared-count > summed IDF > recency) in
  `dup_matched_id`; **`dup_match_count`** records how many prior articles matched so a
  multi-editor pile-up (the C.A.R.R.I. cluster was 4 editors on one item) stays visible.
- **Wired INSIDE `logCoverageShadow`** -> all four write paths inherit it with **zero call-site
  changes**; one row per article carries both signals.
- **Independently fail-open**: a dup-check failure still writes the coverage record with null
  `dup_*` fields rather than losing the row.

### SHADOW MODE IS LIVE (first production data)
The **2026-07-19 cron wrote its first 3 `coverage_shadow` rows** -- and they contain the exact
miss this build fixes:
```
19:01:16 CIPHER dup=0  Marathon Ranked Outlook: What Joe Ziegler's Exit Means
19:02:07 NEXUS  dup=0  Marathon Director Joe Ziegler Out: What It Means for the Meta
```
Both `dup=0` because the check did not exist yet. Also the **first production
`would_block=true`** (DEXTER, Assassin build -> canonical collision).
**Note the ordering:** editors publish ~20-50s apart within one run, so the LATER editor sees
the earlier article. The check catches the **second** article of a pair -- inherent and
correct, you cannot detect a duplicate of something not yet written.

### Verified end-to-end
Row read back FROM `coverage_shadow` (not the insert call): `dup_rare_tokens=["joe","ziegler"]`,
`dup_shared_count=2`, `dup_matched_editor="NEXUS"`, `dup_matched_id` resolves to the real NEXUS
article, `dup_match_count=1`. All assertions PASS. Test row deleted.

---

## 2026-07-18 — shell/*/build PRUNED: 266 -> 67 keepers, 199 cut (corpus 1282 -> 1083)

### THE DECISION: prune, do NOT build a /builds/[shell] canonical
**Basis:** the 266 articles produced **19 clicks / 707 impressions in 3 months** (GSC, last
3mo), and the build recommendations are **100% MODEL-GENERATED** -- no table records which
core+weapon+mod combination is actually good (the `builds` table is 6 stale rows naming
shells that do not exist: Scout, Striker, Wraith). **A canonical built on unverified model
output is exactly what the doctrine forbids.**

**REVISIT only if the loadouts get game-verified** (~8-16 rows, same shape as the matchup
matrix fill). The architecture answer was already clear -- `/builds` exists and its per-shell
links are `#anchors`, and *an anchor cannot be a canonical* -- so the blocker is verification,
not routing.

### METHOD
- **Population from the `coverage_registry` shell/*/build tuple, NOT a URL grep.** A grep
  wrongly includes weapon-mods / signal-jammer / squad-composition / unique-weapon pieces --
  which **cost a diagnostic cycle** when Justin's tier counts came from one and disagreed with
  the registry join by 15 articles. The registry population was correct.
- **Archetypes keyed on `core_stats`** (85 verified rows) + a **`weapon_stats` sub-key**;
  ~56 archetypes across 8 shells.
- **Keeper rule:** 1 per archetype; **2** where the archetype has >=8 articles AND >=2
  performers at >=5 impressions. Within archetype: **impressions > recency > length**.

### FAIR CLOCK (Justin's rule, applied)
Zero-impression archetype keepers **published within 60 days (cutoff 2026-05-19) SURVIVE**.
At DA 23 evergreen pages take 4-6 months to rank, so **zero impressions at 3 weeks is an
unfinished bet, not a failed one**. Older than 60 days with zero impressions = failed bet.
**24 survived on this rule, 7 cut as failed bets** -- and it **cost nothing measurable**
(all zero-impression by definition).

### THE RESULT IN ONE LINE
**Retained 500/707 impressions (71%) and 8/12 clicks while cutting 75% of the articles.**
That is the cannibalization case stated numerically: three quarters of the corpus was
splitting demand, not adding it.

### WEAKEST SPLIT: ROOK -- flagged for a human eye
Rook's identity is **shell abilities (Adaptive Frame / Overclock), not cores**, so
`core_stats` under-resolves it: **14 archetypes across 34 articles**, several split by
**reading judgment rather than data** (marked `[judgment]` in the proposal). If Rook build
coverage is ever revisited, re-do that split by hand.

### SAFETY
- **FIXTURE SAFE:** the cut set is a **strict subset** of the 266, which have **zero overlap**
  with the 20-article coverage regression fixture (+2 weapon-led). **Guaranteed by set logic**,
  not just observed.
- **Executed as 8 gated batches by shell**, pre-flight per batch, **guarded UPDATE per row
  asserting rows-affected=1** (199/199), `is_published` preserved on all 199.
- **Verified after:** 199 cut, **67 keepers still `noindex=false`** (the prune did not touch
  them), corpus **1083** confirmed by exact server-side count read 3x.
- **Fully reversible:** each cut is a single `noindex=false` flip.

### GOTCHA WORTH KEEPING
Mid-run corpus counts wobbled (rook showed -22 for 21 cuts). Cause: **paginated `.range()`
reads WITHOUT an explicit sort order** -- PostgREST can return overlapping/missing rows across
page boundaries. **The writes were never wrong; the counting method was.** Use an exact
server-side `{count:'exact', head:true}` query for corpus totals, not paginated reads.

---

## 2026-07-18 — TITLE BUDGET: suffix dropped on articles + headline rules recalibrated

### *** A CORRECTION FIRST -- my earlier finding was WRONG ***
The scope report claimed **"no prompt constrains headline length / 100% failure across all
five editors."** **That was wrong**, derived from corpus-wide stats **without segmenting by
date**.

**Headline rules HAVE existed since `d0ea153` (2026-06-12)** -- in both the tool schemas and
all five system prompts, under a heading literally titled "HEADLINE RULES - NON-NEGOTIABLE",
with BAD/GOOD examples. **And they WORK:**

| metric (headline only) | BEFORE rules (n=1057) | AFTER rules (n=225) |
|---|---|---|
| avg length | 77 | **62** |
| >60 chars | 88% | **47%** |
| >70 chars | 49% | **10%** |
| ALL-CAPS words | 22% | **4%** |

**The 1,282 "100% over" figure is dominated by 1,057 PRE-RULE articles.**

### ACTUAL root cause
**The rules measure the HEADLINE; Google sees HEADLINE + the 18-char " | CyberneticPunks"
suffix.** A perfectly compliant 70-char headline rendered at **88**. The rules were not being
ignored -- **they were aimed at a budget that did not exist.**

### Also corrected
- **NEXUS is no longer the worst offender** -- **GHOST is** (76% >60, avg 66); NEXUS is 43%.
- **The colon template is PRESCRIBED by the prompt**, not a defect ("Persona voice and the
  specific hook go AFTER the separator"), which is why it rose to 99%. Do not "fix" it.

### *** LESSON ***
**A corpus-wide stat spanning a policy change measures the PRE-CHANGE population. Segment by
date before concluding a rule is being ignored.** (Same error class as the "counter=32 is
implausibly low" premise and the `head:true` false positive -- a number that looked damning
until it was cut the right way.)

### What shipped
1. **Title suffix dropped on keyword-competitive routes** via `title: { absolute: ... }`
   (bypasses the root `'%s | CyberneticPunks'` template in `app/layout.js:19`):
   - `/intel/[slug]` (Marathon articles) -- **rendered length now equals the headline exactly**
     (verified: 74 and 59 chars, previously 92 and 77)
   - `/dmz` hub -- **71 -> 53 chars**
   - `/dmz/[section]/[slug]` (DMZ articles) -- included by the same principle
   **KEPT** on the homepage, `/marathon`, `/shells`, all other Marathon hubs, `/dmz/[section]`
   sections, and the `/intel/<editor>` hub pages.
2. **Prompt rule recalibrated x5:** "Target 55 characters or fewer; never exceed 65", and the
   now-false clause *"The site name is appended automatically"* replaced with the truth (no
   suffix is appended; still forbids the model writing one itself).
3. **Tool schemas x5** matched: "55 characters or fewer preferred, 65 maximum".

### HELD (deliberately)
**Change 4 (post-generation retry validation) NOT built** -- it touches `app/api/cron/route.js`
and tonight is the **first shadow measurement run**; that cron carries only already-verified
changes.

**Bulk title rewrite still deferred**; GSC-impression prioritisation is the filter.
**NOTE: any future bulk headline write invalidates the 20/20 coverage fixture** (it is keyed
on current headlines) **and may shift `deriveTuple` results -- re-run the fixture after.**

---

## 2026-07-18 — /dmz copy targets live pre-launch demand (READ BEFORE EDITING THIS COPY)

**WHY THE COPY IS SHAPED THIS WAY.** `/dmz` now targets the live pre-launch query set found in
the **2026-07-18 keyword research** (Mangools): **~1,600/mo of winnable demand**. The head
terms (KD 41-45) are **closed to us**; these are not:
`dmz 2 release date` **630/mo** · `what is dmz in cod` 500 · `is dmz coming back` 250 ·
`dmz 2026` / `dmz update 2026` 170 · `when is the new dmz coming out` 70.

**Title/meta now lead with release date + 2026 + MW4, NOT brand positioning.** The old title
("DMZ - Extraction Intelligence Hub") had **zero search volume** and omitted the date, the
year, and the game. Title 53 chars / meta 145 chars (Gate 4: <=60 / <=155). og + twitter
mirror them exactly, so the search result and the social card carry one message.

### "DMZ 2" is PLAYER PHRASING, used deliberately for search
It is **NOT an official name**. It is the **highest-volume live term (630/mo)**, so it appears
in **the FAQ question and one body line** -- and in **both places it is used and corrected in
the same breath** ("Many players search for it as 'DMZ 2', but the official name is simply
DMZ"). **Do NOT promote it into the title.** A title asserts; putting a non-official name
there would state it as fact.

### *** NO SOURCE CONFIRMS ANY RELATIONSHIP TO THE 2022 MODERN WARFARE II DMZ ***
The queries **"is dmz coming back"** and **"dmz 2"** both **presuppose that link**. The FAQ
answers **yes to what IS confirmed** (MW4 includes a mode called DMZ, dated **Oct 23 2026**,
detailed in the official Deep Dive) and **explicitly marks the relationship -- progression,
factions, any carry-over -- as UNCONFIRMED.**

**Do NOT "tighten" this into a sequel or revival claim.** An in-code note sits on
`FAQ_BACK_A` saying exactly that. This is the same discipline that refused the anachronistic
facts on the 26 VB articles and the "only the June Deep Dive is a confirmed source" rule.

### FAQ 4 -> 5 items
Added "Is DMZ coming back?"; re-phrased the launch and mode questions to searcher wording
("What is the DMZ 2 release date?", "What is DMZ in Call of Duty?"). All questions and answers
remain **single-source constants** feeding BOTH the visible block and the `FAQPage` schema, so
**visible text and schema cannot drift** (verified at render: parity 5/5).

---

## 2026-07-18 — COVERAGE REGISTRY populated + shadow reads it (backfill session)

### What landed
`coverage_registry` populated: **59 canonical** (idempotent, 404-verified, `game_maps.slug`
used as the source of truth rather than deriving from `name`) **+ 316 article rows**
(`counter` 18, `build` 298). **Table total 375.**

**Article rows have NO DB-level uniqueness** -- the unique index is **canonical-only** -- so
they rely on an **application-side `feed_item_id` + full-tuple guard**. Re-run verified as a
clean **0-insert no-op**. Anyone adding article rows later must reuse that guard; the DB will
not catch duplicates.

### Restricted scope, deliberately
**`counter` + `build` only.** Excluded: **tier/news** (ordering unsettled -- `tier` is tested
BEFORE `news`, so balance-driven meta pieces file as `tier`); **guide** (74 rows want another
eyeball before becoming registry truth); community/economy/lore.

### *** THE FINDING ***
**`shell/*/build` is 266 articles across 8 shells with NO canonical anywhere** -- the largest
duplication concentration on the site, **~7x the counter cluster**. Every shell has **34-40
competing build guides**.

**This is a BUILD-THE-CANONICAL problem, not enforcement.** Unit 5 would block nothing here --
correctly, because blocking build content with nowhere to route readers is worse than the
status quo. **The 298 build rows are MEASUREMENT-ONLY and must not be read as enforcement
material** (verified programmatically: build tuples with a canonical = 0).

### CONSOLIDATION QUEUE REORDERS
1. **`shell/*/build`, 266 articles -- needs a canonical.** Same shape as the matchup problem,
   and **the `/matchups` build is the template.**
2. **cryo/holotag -- smaller than believed** (11 guides + dated coverage, not 89).
3. The 11-article intra-cluster matchup dedup.

### Shadow now reads the registry (this commit)
`coverageShadow.js` previously called `isCovered(tuple, [])` -- canonical collisions only.
It now does one **indexed, tuple-scoped** lookup (`game_slug + entity_type + entity_slug +
facet`), never the whole table, so **article-vs-article collisions register too**.

**`would_block` now carries TWO different signals, and Unit 5 needs DIFFERENT POLICIES for
them** -- `coverage_kind` on each record is what distinguishes them:
- **`canonical`** -- a real reference page answers this topic. **True enforcement signal:**
  block and route the reader there.
- **`article`** -- only other articles cover it; **no page to route to.** A duplication
  signal. Blocking on this alone suppresses content with nowhere to send anyone.

`isCovered` **prefers `canonical`** whenever both exist for a tuple. `canonical_route` is set
**only** for canonical matches -- an article ref is an `/intel/<slug>` URL, and storing that in
a column named `canonical_route` would be a lie in the data.

**Registry read is fail-open**: a failure degrades to canonical-only and never stops
publishing. Verified by smoke test (10/10 assertions): article-only collision
(`shell/vandal/build`) -> `coverage_kind='article'`, `canonical_route=null`; canonical+articles
(`shell/thief/counter`) -> `coverage_kind='canonical'`, `canonical_route='/matchups/thief'`.

---

## 2026-07-18 — CRON now HARD-FAILS without SUPABASE_SERVICE_KEY (operational)

**Read this before a deploy.** The cron **hard-fails without `SUPABASE_SERVICE_KEY`**: logs to
stderr, returns **HTTP 500**, and does nothing else. The guard sits **after** the `CRON_SECRET`
auth check but **before** `gatherAll()`, so a misconfigured deploy costs **zero model spend**.

Previously it silently fell back to the anon key
(`SUPABASE_SERVICE_KEY || NEXT_PUBLIC_SUPABASE_ANON_KEY`), which -- with RLS enabled and no
policies -- meant **writes were rejected while the fail-open shadow probe logged
"persist failed (non-fatal)" and the cycle looked healthy. A config error became invisible
data loss.**

Chose **HTTP 500 over `sendCronFailureAlert` deliberately**: an alerter sitting in the
config-guard path could fail for the same misconfiguration it is meant to report.

Audit note: `route.js` has exactly ONE `createClient` and had exactly ONE anon reference (the
fallback itself). Every write in the route (`editor_directives`, `feed_items`, `meta_tiers`,
`meta_tier_snapshots`, `coverage_shadow`) needs the service role -- nothing legitimately used
anon, so nothing broke. Behaviour when the key IS set is unchanged.

---

## 2026-07-18 — COVERAGE facet rules tightened: 141 FALSE collisions removed

### THE HEADLINE
**Canonical collisions: 30 tuples / 230 articles -> 22 tuples / 89 articles.** The `guide`
fallback was manufacturing **141 FALSE would-blocks (61%)**. At Unit 5 those would have been
**real suppressions of legitimate dated content**. This is the untested **over-block risk**
-- found and fixed **BEFORE** enforcement, which is the entire reason shadow-first exists.

### CRYO CORRECTION (changes a pending decision)
The 65-article `map/cryo-archive/guide` cluster **was never 65 competing guides**. It splits:
`tier=24, community=22, news=22, guide=11, build=3` -- **only 11 are guide-shaped**; the rest
is launch-stream / event coverage the fallback laundered into `guide`. **The largest apparent
cluster on the site was substantially a classifier artifact.** Relevant to the pending
cryo-archive canonical-or-prune decision in the deliberate-decision queue: it is an
**11-guide problem plus dated coverage, not an 89-article crisis.**

### `community` ADDED as a facet, deliberately separate from `news`
Policy reasoning: **news** (patch/balance/incident) may one day route to a patch-notes
canonical and is **plausibly blockable**; **community** (stream/creator/Reddit/Steam-review)
is dated ephemera **no canonical will ever own** and **must NEVER be blocked**. Merged, they
would share one policy that is wrong for one of them.

### `guide` is NO LONGER A FALLBACK
Requires a positive signal (`guide, how to, explained, breakdown, complete, basics, tips,
walkthrough, mastery, learn, beginner, first steps`); otherwise **UNCLASSIFIED** with reason
`"entity matched but no confident facet"`. **A wrong `guide` is worse than no classification
BECAUSE `shell+guide` and `map+guide` HAVE canonicals** -- so a mislabel becomes a false
block.

### Facet order is BEHAVIOURAL
`counter > build > tier > news-strong > community > news-soft > economy > lore > guide`.
news-strong above community so "Patch 1.0.6.3: Community Reacts" is **news**; community above
news-soft so "Launch Stream on Twitch" is **community**.
**Bare `\bplayers?\b` deliberately EXCLUDED** from community -- it appears in legitimate
counter/guide headlines ("Most Players Miss") and would swamp the facet.

### Numbers
- **Regression fixture STILL 20/20** -- no counter regression.
- Classified **58.4% -> 53.7%** (unclassified **41.6% -> 46.3%**); `guide` **221->74**,
  `news` **30->86**, `community` **0->32**. The **+61 unclassified are the dated content
  that was being laundered**, not a loss.

### KNOWN LIMITATION (flagged, NOT fixed)
**Entity-priority can pick the wrong subject when two entity types appear**: "Cryo Archive
Returns: ... Thief Holotag" resolves to `shell/thief` when the subject is arguably the map.
This is an **entity-priority issue, separate from facets** -- do not mistake it for a facet
bug.

### DDL CONSEQUENCE (still free -- neither table exists yet)
`FACETS` now includes `community`, so the proposed `coverage_registry` CHECK must be:
`check (facet in ('counter','build','tier','guide','news','community','economy','lore'))`.
Running the earlier DDL as-written would **reject every community row**.

---

## 2026-07-18 — COVERAGE REGISTRY unit 4b: ALL FOUR write paths now observed

**All four `feed_items` write paths are observed**, each tagged with a `source` field for
segmentation. Still **LOG-ONLY, fail-open everywhere.**

| path | source | game_slug |
|---|---|---|
| `app/api/cron/route.js:741` | `cron` | marathon |
| `scripts/gen-vantage-discourse-auto.mjs:234` | `vantage-auto` | marathon |
| `scripts/gen-vantage-discourse.mjs:230` | `vantage-manual` | (gameSlug var) |
| `scripts/persist-dmz-news.mjs:252` | `dmz-news` | **dmz** |

### APPROACH: (a) shared helper, NOT a choke point
`lib/coverageShadow.js`. The four paths have **three different select shapes** and **four
different failure semantics** (return an error object / `continue` a loop / `process.exit(1)`
/ log-and-continue), plus cron-only post-insert side effects. A shared insert wrapper would
mean **rewriting production write logic to serve a logging probe** -- risk with no
proportionate gain. The helper keeps **derivation and record shape identical**; only call
placement is per-site. `route.js` net **-43 lines** (local probe replaced, not duplicated).

**ANY FUTURE FIFTH WRITE PATH MUST CALL IT** -- noted in-module. Enforcement (Unit 5)
inherits exactly the coverage this probe has.

### BUG FOUND AND FIXED (on the strategically important path)
`loadVocabulary` defaulted to the **Marathon** `SHELLS`/`SLOT_PAGES` allowlists **regardless
of `gameSlug`** -- and `buildVocabulary`'s length-based fallback meant even an explicit `[]`
fell through to Marathon. **DMZ articles would have derived nonsense tuples against Marathon
shell names -- on the exact path Gate 2 exists to protect.** Fixed with an `== null` check
that distinguishes "not provided" from "explicitly empty". **Same class as the
`countered_by` empty-vs-null guard discipline** (a length/truthiness test silently
collapsing two different states). Verified: marathon=8 shells, dmz=0, DMZ headline ->
UNCLASSIFIED (correct).

### Verified non-fatal (proven, not asserted)
Build green; `node --check` passes on all three scripts; `lib/coverageShadow.js` imports
cleanly under bare-node ESM (explicit `.js` extensions) AND under the Next `@/lib` alias;
calling the probe with a `null` client returns `null` and **does not throw**. No caller
branches on the return value -- every insert runs unconditionally.

### *** UNIT 4b PREREQUISITE FOR UNIT 5 IS NOW SATISFIED *** (all paths observed)

### Remaining undercount (unchanged by 4b)
Registry rows are still unconsulted (`isCovered(tuple, [])`): this measures **CANONICAL
collisions only, not article-vs-article**. The registry backfill is a separate gated step and
is required before the would-block rate reflects true duplication.

**DDL note:** the record now carries `source`. If `coverage_shadow` was already created:
`alter table public.coverage_shadow add column if not exists source text not null default 'unknown';`

---

## 2026-07-18 — COVERAGE REGISTRY unit 4: SHADOW MODE wired (log only, no blocking)

Wired at **`app/api/cron/route.js:770`**, **ALL editors**, immediately before the
`feed_items` insert. **Zero behaviour change** -- it does not block, skip, or alter a single
publish.

**FAIL-OPEN BY DESIGN, defended in-code -- do NOT "fix" it.** If the check throws, we log and
keep publishing. An observability probe that can stop generation is worse than no probe.
fail-CLOSED is the deliberate policy for **Unit 5 enforcement**, a separate change.

**Placed AFTER** the existing body-length / exact-title / MIRANDA near-duplicate guards, so it
measures the **incremental** effect of coverage enforcement on articles that currently DO
publish, rather than double-counting pieces another guard already stopped.

### *** SCOPE LIMIT -- THIS OBSERVES THE CRON PATH ONLY ***
**Four `feed_items` insert paths exist; ONE is wired:**

| path | status |
|---|---|
| `app/api/cron/route.js:698` (cron) | **WIRED** |
| `scripts/gen-vantage-discourse-auto.mjs:229` | **BYPASSED** |
| `scripts/gen-vantage-discourse.mjs:226` | **BYPASSED** |
| `scripts/persist-dmz-news.mjs:244` | **BYPASSED** |

**VANTAGE bypasses entirely** -- the same structural gap already recorded at HANDOFF:1074
(it also skips `findDuplicateEvergreen`). **`persist-dmz-news.mjs` is a DMZ write path, and
preventing uncontrolled DMZ generation is the whole purpose of Gate 2.**

### CONSEQUENCE -- do NOT read shadow results as complete coverage
- The **would-block rate is an UNDERCOUNT** (cron only). **VANTAGE and DMZ content is
  invisible to the measurement.**
- **Also an undercount** because registry rows are unconsulted (`isCovered(tuple, [])`):
  this measures **CANONICAL collisions only**, not article-vs-article. The registry backfill
  is a separate gated step.

### What it records
One structured row per generated article to `coverage_shadow`: timestamp, editor, game_slug,
headline, derived tuple (entity_type / entity_slug / facet) or UNCLASSIFIED + reason,
`covered`, `coverage_kind`, `canonical_route`, `would_block`. Also emitted as a
`[COVERAGE:SHADOW]` console line. Vocabulary is memoized per invocation.

**Requires the `coverage_shadow` DDL (Justin, Supabase).** Until it is run: the console record
still emits, the insert no-ops non-fatally, and **publishing is unaffected**.

### MEASURING (intent, restated in-code)
1. **WOULD_BLOCK RATE** -- how often would enforcement have fired?
2. **THE OVER-BLOCK RISK** -- of those, how many are genuinely novel angles that SHOULD have
   published? **The question the 20/20 fixture could not answer, and the only reason shadow
   mode exists.**
3. **UNCLASSIFIED rate on NEW content** vs the 41.6% corpus baseline.

### *** UNIT 4b IS NOW A PREREQUISITE FOR UNIT 5 ***
Extract the check into a **shared helper (or a single choke point) that all four insert paths
call**. **Enforcing a gate that three of four write paths bypass is security theatre.**
**Unit 5 does not proceed until 4b lands.**

---

## 2026-07-18 — COVERAGE REGISTRY unit 2b: extraction fixed, regression set 20/20 PASSES

**2b PASSES the regression set banked in the previous entry: 20/20** (was 11/20).
- **12/12** cuts -> correct shell + flagged COVERED
- **7/7** Thief articles (**was 0/7** -- the largest cluster, previously a total failure)
- **8/8** valid-shell

Still **UNWIRED**. Nothing touches `app/api/cron/route.js`.

### The three fixes -- LEGIBLE RULES, not tuned scores
1. **Role-aware positional extraction.** Resolution order: **TARGET-1** markers (entity
   FOLLOWS `how to beat` / `beat` / `counter to` / `counters` / `counter` / `versus` / `vs` /
   `against` / `deal with`) > **TARGET-2** (entity immediately PRECEDES "counter", **first
   clause only** -- before the first `:` or em dash) > best non-recommendation mention >
   **UNCLASSIFIED**. Entities following `with` / `using` / `run` / `runs` are
   **RECOMMENDATIONS and never targets**. The first-clause constraint is what stops
   "Best Rook Build: The Destroyer Counter Meta" filing under Destroyer -- a subtitle
   mention is not the subject. (The bare verb `counter` was added beyond the original spec:
   honest verification caught "How to Counter Assassin's One-Shot Meta" filing as `tier`.)
2. **Entity-type priority** `shell > weapon > mod_slot > map > mode > event`; **name length
   breaks ties only WITHIN a type** (previously "Ranked" at 6 chars outranked "Thief" at 5).
3. **Generic terms GATED, not dropped** -- `ranked, outpost, perimeter, intercept, lockdown,
   anomaly, heatwave` require an adjacent context word (`mode/queue/playlist/ladder/map/
   event/zone/run`). Dropping would lose genuine coverage of the real Ranked mode.
4. **Facet order:** `counter` tested BEFORE `build`, but `counter` **requires a resolved
   target role** -- counter words alone no longer make a build article a counter piece.

### Bug-2 confirmed by the broad sample
`mode` **162 -> 22**, `map` **192 -> 118**, `shell` **313 -> 472**. Classified %
**DROPPED 66.1 -> 58.4 and that is the fix working** -- phantom entities are gone, so the
corpus is more *honestly* unclassified than before.

### counter facet 32 -> 18: investigated, NOT a regression
Of 29 counter-signalling live headlines, 16 classify `counter` and **13 of the 13
non-classifications are correct** (build pieces that merely contain counter words; "How to
Counter Cheaters" has no entity). **The original "32 is implausibly low" premise was WRONG** --
the old 32 was inflated by counter-words on build articles. **18 is the honest number.**

### TWO STANDING CAVEATS -- do NOT treat the registry as complete coverage
1. **41.6% (533 live articles) UNCLASSIFIED**, all for one reason: no vocabulary entity in the
   headline (news/community/patch). Arguably correct -- nothing to collide with -- but **the
   gate is blind to two-fifths of the corpus.** A real limit on how much Gate 2 can protect.
2. **OVER-BLOCK RISK IS UNTESTED.** The fixture proves we catch *known duplicates*; it proves
   **nothing** about false blocks on a genuinely novel angle covering an existing entity.
   **Only shadow mode measures this. Log-only before enforcement regardless of the 20/20.**

### NEXT
**Unit 4 shadow mode:** wire at `app/api/cron/route.js:688`, **all editors, LOG ONLY, no
blocking**. Measure the would-block rate for ~1 week before **Unit 5 enforcement
(fail-CLOSED)**. No DMZ gated generation until units 4-6 are green.

---

## 2026-07-18 — COVERAGE REGISTRY units 1-3: module built, accuracy report FAILS

**Gate 2 enforcement groundwork.** `lib/coverage.js` is **BUILT but UNWIRED and NOT
gate-ready** — entity extraction scores **~55% correct entity** on the 20-article counter set,
including **0/7 on Thief, the largest cluster**. Nothing is wired into `app/api/cron/route.js`;
no `feed_items` writes.

**What IS sound:** the canonical map, the DDL shape, and the module scaffolding. Only the
entity-extraction heuristic fails. The module imports `lib/matchups.js` (`SHELLS`) and
`lib/mods.js` (`SLOT_PAGES`) — the same sources `app/sitemap.js` reads — so no route list is
duplicated.

### UNIT 1 — proposed DDL (Justin runs in Supabase; NOT executed)
```sql
create table if not exists public.coverage_registry (
  id uuid primary key default gen_random_uuid(),
  game_slug text not null,
  entity_type text not null check (entity_type in ('shell','weapon','mod_slot','map','mode','event')),
  entity_slug text not null,
  facet text not null check (facet in ('counter','build','tier','guide','news','economy','lore')),
  coverage_kind text not null check (coverage_kind in ('canonical','article')),
  ref_url text,
  feed_item_id uuid references public.feed_items(id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index if not exists coverage_registry_canonical_key
  on public.coverage_registry (game_slug, entity_type, entity_slug, facet)
  where coverage_kind = 'canonical';
create index if not exists coverage_registry_tuple_idx
  on public.coverage_registry (game_slug, entity_type, entity_slug, facet);
```
CHECK over Postgres enums on purpose: the facet vocabulary will change; a CHECK is a one-line
ALTER, an enum is a migration.

### Canonical (entity_type, facet) -> route map
`shell+counter -> /matchups/<slug>` · `shell+guide -> /shells/<slug>` ·
`mod_slot+guide -> /mods/<slug>` · `weapon+guide -> /weapons/<slug>` · `map+guide -> /maps/<slug>`.
**Deliberately absent (no canonical -> must NOT block):** `shell+build`, `shell+tier`, and all
`news`/`economy`/`lore`.

### THE REGRESSION SET (the durable artifact)
The 20 known counter articles are now the **fixed test fixture**. Any extractor iteration must
score against these **before** wiring:
- **12 cuts:** `fef3e56a`, `b543db86`, `33420c0c`, `8d382d19`, `c048793e`, `8ab3eae9`,
  `9494c13e`, `8d681f26`, `b52cbace`, `5c6bab92`, `a3a27ec6`, `6561828f`
- **8 valid-shell:** `2ec2a58c`, `22419223`, `ceb0cec1`, `cf06499c`, `0e6dd2b4`, `d53e6765`,
  `c596f288`, `4c86abf8`

### THE THREE DIAGNOSED BUGS
1. **No target-vs-recommendation role awareness** — "beat X with Y" files under **Y**
   (`b543db86` "Beat Assassin: The Destroyer Counter" -> `shell/destroyer`, should be assassin).
2. **Name length beats entity-type priority** — "Ranked" (6, a `game_modes` row) outranks
   "Thief" (5), so every Thief article resolves to `mode/ranked`.
3. **Facet test order absorbs counter into build** — `build` is tested before `counter`
   (only 32 `counter` classifications across 1,282 live articles, implausibly low).

### FRAMING CORRECTION (worth recording)
Flagging valid counter articles as COVERED is **NOT a false positive**. The registry is a
**COVERAGE gate, not an accuracy gate** — `/matchups/<shell>` genuinely covers that topic
regardless of whether a given article is accurate. It cannot distinguish the 8 accurate counter
guides from the 12 wrong ones; that was a separate evidence-based judgment. **The real
over-block risk — a genuinely novel angle on a covered topic — is UNTESTED and needs its own
test.**

### Corpus coverage
**33.9% of live articles (435/1282) classify as UNCLASSIFIED**, mostly news/community pieces
with no entity in the headline. Arguably correct (no canonical to collide with), but it means
**a third of content is invisible to the gate**. Classified 66.1%; canonical-COVERED 16.5%.
`map=192`/`mode=162` counts are inflated by the same generic-term over-matching as bug 2.

### DECISIONS BANKED
- **fail-CLOSED at enforcement** (Unit 5, not before — today's headline guard is fail-open).
- **Facet enum starts:** counter, build, tier, guide, news, economy, lore.
- **Ship (a) pre-persist block first, (c) topic-slate input filtering after.**

### NEXT
**Unit 2b** = fix the three bugs, re-score against the regression set. **Unit 4 shadow mode
only after it passes.** **No DMZ gated generation until units 4-6 are green** (doctrine
prerequisite). Also flagged: `weaponSlug()` in `lib/coverage.js` is a **third** copy of a rule
already duplicated in `app/sitemap.js` + `app/weapons/[slug]/page.js` — extract to one shared
helper in its own unit. And `seo_keywords` (read by `lib/editorCore.js:1136 getTargetKeyword`)
**does not exist in the DB** — that pre-generation topic path is inert dead code, and it has no
`game_slug` filter if resurrected.

---

## 2026-07-17 — MATCHUP CLUSTER: reconciled accuracy-pass state (DB-verified)

**DB is the source of truth over any running tally.** DONE THIS ARC: matchup matrix
game-verified + `/matchups` hub built & live (`91c3690`) + accuracy adjudication of the
27-article cluster against the matrix.

### CUT (3, verified in DB)
- `88f957e5` — contradiction (Destroyer/Vandal beat Assassin; matrix `[Recon,Triage]`).
- `badf02a3` — MIXED, load-bearing false anti-Destroyer stance (rewrite, not fix).
- `28326aa9` — pre-session noindex.

### FIXED & LIVE (1)
- `8480f407` (Assassin) — false "Vandal is a secondary counter" + "Avoid Triage" lines
  replaced with accurate *"Triage is the other shell the game-verified matchup data lists as
  an Assassin counter"* per matrix. Body edit, coherence-confirmed, guarded on full body.

> **UPDATE 2026-07-18 — PENDING CUT SET CLOSED: all 13 executed** (guarded, rows=1 each,
> `is_published` unchanged; live corpus 1295 -> 1282 as projected). Reversible via `noindex=false`.

### PENDING ACCURACY CUTS (13, adjudicated + quoted-evidence-backed, NOT yet written)
The running tally wrongly assumed these ran; **DB confirms they're LIVE.**
- **12 contradictions:** `fef3e56a`, `b543db86` (Assassin/Destroyer-wrong); `33420c0c`,
  `8d382d19` (Thief/Recon-wrong); `c048793e`, `8ab3eae9`, `9494c13e`, `8d681f26`, `b52cbace`
  (Vandal/Recon-wrong); `5c6bab92` (Recon/Vandal-wrong); `a3a27ec6`, `6561828f` (Rook — name a
  shell counter vs `Rook=[]`).
- **+ `9ec5d332`** (Vandal MIXED, load-bearing Recon-primary).
- Each has a quoted false shell-counter claim the matrix disproves (receipts in-thread).
  Guarded noindex, one row each, projected **1295 -> 1282**. **NEXT-SESSION CLEAN BATCH.**

### CORRECTLY LEFT LIVE (valid)
8 VALID-SHELL (`2ec2a58c`, `22419223`, `ceb0cec1`, `cf06499c`, `0e6dd2b4`, `d53e6765`,
`c596f288`, `4c86abf8`), 1 VALID-TACTICAL (`c2aff172`), 2 weapon-led (`14092c2b`, `d1acb0eb`).
These 11 + `8480f407` are the **INTRA-CLUSTER QUALITY-DEDUP pool** (valid but
self-cannibalizing; quality-keeper selection, NOT accuracy — separate future step).

### LESSON
Reconcile cut-state against the **DB**, not a running tally — this arc reported cuts that were
held-not-written; only the DB is truth. **Cuts are noindex flips (they don't move the git
tip)**, so "what's cut" must be queried, never assumed.

---

## 2026-07-17 — /matchups CANONICAL SHIPPED (commit db6dead)

Hub + 8 per-shell counter pages, **live and nav-linked**. Built entirely on the
game-verified `shell_stats` matchup matrix (this session) — **the first canonical built on
data that didn't exist as trustworthy until owner in-game verification filled it.**

### WHAT SHIPPED
`/matchups` (hub, 8 shell cards) + `/matchups/[shell]` (per-shell), mirrors the `/mods`
pattern: `force-dynamic`, `game_slug='marathon'`, `lib/matchups.js` shared list,
BreadcrumbList + FAQPage JSON-LD, sitemap emits 9 (hub + 8), fixed `dateModified`. **MATCHUPS**
added to the Marathon nav after SHELLS (`startsWith` highlight on hub + all 8). All
live-verified 200 + content-checked.

### HONEST-DESIGN DECISIONS (the moat details)
- **BOTH DIRECTIONS per page:** "how to beat X" (`shell.countered_by`) + "X is strong against"
  (**COMPUTED inverse** — shells whose `countered_by` contains X). Essential: `countered_by`-only
  made Recon's page MISLEADING (would've shown "only beaten by mirror", hiding that Recon beats
  3 shells). Both trace to the verified matrix.
- **ROOK EMPTY-STATE:** `countered_by=[]` renders as CONTENT ("no hard counter — low-stakes solo
  scavenger any geared squad outguns"), keyed on the `verified_source` matchup marker, DISTINCT
  from a genuinely-unfilled shell ("analysis pending"). **Verified-empty != unfilled.**
- **WEAKNESSES** rendered under a separate "General notes" section, explicitly labelled NOT
  game-verified (pre-existing shell-profile data), visually set apart from the game-verified
  counters — kept but de-provenanced, never shown as fact alongside the matchup data. (Honest
  provenance-labelling, not omission — preserves the info while marking its lower trust level.)

### STILL AHEAD (separate next step)
The **27-article self-cannibalizing counter-guide cluster** (10 "beat Thief", 7 "beat Assassin",
7 "beat Vandal", all live) still competes until consolidated INTO `/matchups`. Adjudicate each
against the verified matrix (keeper per shell + cut the wrong ones), point them at the canonical.
**`88f957e5` is ALREADY a confirmed cut** (game-verified wrong: claims Destroyer/Vandal beat
Assassin; matrix says `[Recon,Triage]`). The matrix is the adjudicator: article is right if it
matches `countered_by`, wrong if not.

### CLUSTER COUNT — CORRECTED from quoted article evidence (not assumption)
Re-derivation **reading the article bodies** found, of the 26 remaining matchup articles:
- **14 CONTRADICT** the matrix by naming a SHELL counter it disproves. Verbatim examples:
  `33420c0c` *"Recon is the direct counter shell"* for Thief (counters = Destroyer, Vandal);
  `b543db86` *"Destroyer Hard-Counters Assassin"* (counters = Recon, Triage); `6561828f`
  *"Destroyer beats Rook"* (Rook = no counter).
- **3 MIXED** (correct + incorrect shell claims in the same article).
- **8 VALID-SHELL** (name a correct counter matching `countered_by`).
- **1 VALID-TACTICAL** (weapon-only, no shell claim — `c2aff172`).

**Both earlier framings were imprecise:** NOT "all wrong" (the "12+2" lumped some valid ones)
and NOT "only 1 wrong" (that undercounted by ignoring explicit false shell-counter claims — a
wrong conclusion reasoned from a clean narrative, corrected by reading the quotes). The **Rook
articles DO contradict**: they name shells (Vandal / Destroyer) as Rook hard-counters when
Rook = `[]` — false-premise confirmed, not "valid player-tactics."

**LESSON (reinforced hard):** cut ONLY on a QUOTED shell-counter claim the matrix disproves,
verified per-article from the body — never on a bucket label OR a plausible-sounding summary.
A tidy narrative ("it's all just tactical advice") nearly enshrined the wrong count.

---

## 2026-07-17 — SHELL MATCHUP MATRIX: game-verified, written to shell_stats

**Foundation for the `/matchups` hub build.** New column `counter_items jsonb` added (Justin's
DDL). 14 guarded writes to `shell_stats`, all OWNER-GAME-VERIFIED by Justin.

### countered_by (shells that beat it — `text[]`)
- **Filled 3:** Recon=`[Recon]` (mirror), Vandal=`[Thief,Destroyer]`,
  Sentinel=`[Vandal,Thief,Assassin]`.
- **Rook=`[]` — game-verified NO specific counter** (low-stakes solo scavenger; any geared
  squad outguns it). The page must render this as **CONTENT, not an empty gap**.
- **4 populated CONFIRMED correct as-is:** Assassin=`[Recon,Triage]`, Destroyer=`[Assassin,
  Recon]`, Thief=`[Destroyer,Vandal]`, Triage=`[Assassin]`. **Assassin<->Triage mutual is REAL.**

### counter_items (items/tactics that beat it — new `jsonb` field, names-only)
Recon=`[Signal Jammers]`, Vandal=`[Heat Grenades]`, Sentinel=`[Signal Jammers]`. Others `[]`.

### verified_source — honesty fix
Appended (**not overwritten**) on all 8 to record matchup verification distinct from the old
stat-screen provenance: `…; matchup data owner-verified in-game (S2, 2026-07-17)`. The existing
`verified=true` was earned for the STAT SCREEN, not the matrix — appending keeps the flag from
silently over-claiming (the mod_stats lesson, applied proactively).

### ACCURACY RESOLUTION — the matrix is now the ADJUDICATOR
Article `88f957e5` claims **Destroyer/Vandal beat Assassin — game-verified WRONG**
(Assassin=`[Recon,Triage]`). So `88f957e5` is a **CUT, not a keeper**, when the 27-article
matchup cluster is adjudicated. **The verified matrix now adjudicates all 27 counter-guides:**
right if it matches `countered_by`, wrong if not.

### GUARD note
`countered_by` is `text[]` (empty guard `{}` / null via `is null`); `counter_items` is `jsonb`
(empty guard `[]`). First attempt halted cleanly on the type mismatch (0 rows written),
introspected types read-only, corrected guards, re-ran. Reversible: fills back to `{}`/`null`/
`[]`; verified_source strip the appended suffix.

---

## 2026-07-17 — GSC CLEAN-CUT CONSOLIDATION: COMPLETE (26 verified cuts, 3 batches)

**Corpus 1323 -> 1297, all reversible.**

### BATCHES
double-flag (4) + shell (**10 of 19**) + weapon (**10 of 12**) + mod-guide (**2 of 4 live**,
3 already-cut). Batch 3 final: `b0b4c3d0` + `f02e8fcb` cut; `5630c9a6` + `3e965414` (heat
guides) pulled.

### THE DURABLE LESSON (capstone of the arc)
**ALL THREE batches were over-broad — the GSC keyword buckets systematically mislabel.**
Genuine-dup rates: shell **10/19**, weapon **4/12** (6 were shell-builds mislabeled as
weapons), mod-guide **~2/4**. Bulk-cutting the worklist's "38 clean cuts" would have
**orphaned ~12 articles AND missed build opportunities**. The verify-then-cut step caught
mislabeling **every time**. And **READING THE PULLS** (instead of cutting them) surfaced **2
build opportunities + 2 content gaps**. This is the **standing rule for cryo/holotag and all
future GSC work**: the worklist is a candidate-finder, **never a verdict**; read each body;
the true canonical often isn't the bucket's name.

Also: **3 detector false-flags this session** (P4 tier regex, Shield ladder detector,
SO-WRONG regex on `216c1597`) — all caught by reading prose. **Read the prose, don't trust
the keyword.**

### DELIBERATE-DECISION QUEUE (no more fast batches — all need judgment)
- **CANONICAL BUILDS** (opportunities found in the prune list):
  - **MATCHUP HUB** — the 4 counter-guides (`2ec2a58c`, `5c6bab92`, `cf06499c`, `88f957e5`),
    cross-shell "how to beat X", no canonical. Build like `/mods`.
  - **ENERGY-CATEGORY HUB** — `1f0ddcca` (energy weapons as a class), no single canonical.
- **CONTENT-CREATION FOLLOW-UPS** (gaps opened by correct cuts): chip-strategy guide +
  mod-strategy guide — **COMBINABLE** into one honest "how to build your loadout" piece,
  written against corrected `mod_stats`.
- **PRUNE-OR-KEEP CALLS:** cryo-archive (42) + holotag (7) — need a canonical-or-prune
  decision (cryo is a dated/evergreen **MIX**, needs a split pass). 2 heat guides
  (`5630c9a6`, `3e965414` — thin dated near-dups of each other). `349ffe3b` (dated BR33 ->
  `/uniques`). 1 tactic + 2 dated playbooks + 2 Night Marsh map-meta (from the shell holds).

### CONSOLIDATION PROJECT TOTAL (across recent sessions)
26 GSC cuts (2026-07-17) + 73 shell tier/meta (07-15) + 13 mod-guide + 53 dedup + 7 headline
fixes = the 139-article project + 26 GSC. **Only the 26 GSC cuts, 13 mod-guide, and 7
headline fixes are strictly this session.** The freeze (implemented, confirmed working)
means none of this is racing new generation anymore.

---

## 2026-07-17 — GSC CLEAN-CUT batch 2 (weapon cluster): 10 cut, even-more-over-broad, energy-hub found

DB-only writes (noindex flips); all reversible.

### EVEN MORE OVER-BROAD than the shell batch
Of the 12 "weapon-specific" candidates: only **4 were true weapon-dups**; **6 were
shell-builds mislabeled as weapon** (the title names a gun, but the article is a shell
loadout → dups `/shells/<slug>`, not `/weapons`); **2 pulled**. Two batches in, the pattern
is firm: **the GSC keyword buckets systematically mislabel — every batch needs read-then-cut,
and the canonical an article duplicates is often NOT the one the bucket name implies.**

### CUT (10, guarded, reversible — corpus 1309 -> 1299)
- **weapon-dups → `/weapons`:** `8044bfb3` (M77), `7780f82c` (D54, stale vs nerf), `67ea29f4`
  (Misriah), `216c1597` (D54).
- **shell-builds → `/shells` (mislabeled):** `af30f3a9` (Assassin+KKV), `b92ff87f` (Rook+Twin
  Tap — twin of shell-batch cut `1abd15f4`), `00d3b984` (Rook+M77), `53952dff` (Triage+volt),
  `dd97b617` (Vandal), `dd98f7b5` (Vandal+WSTR).

### PULL (2, NOT cut)
- `1f0ddcca` — energy-weapons CATEGORY guide (no single canonical).
- `349ffe3b` — dated BR33 commentary; "Victory Lap" is a UNIQUE variant → `/uniques`, not
  `/weapons/br33`.

### 🎯 ENERGY-CATEGORY HUB — a 2nd canonical opportunity (after the matchup hub)
`1f0ddcca` covers the V75 Scar / V22 / V85 energy-weapon tier hierarchy — a category no
single `/weapons/<slug>` owns. Like the matchup hub, a BUILD-not-prune. **Both canonical
opportunities were found by READING pulled articles instead of cutting them** — the
strongest argument yet for the verify step.

### 216c1597 re-confirmed citing Stack Overflow CORRECTLY
The SO-WRONG regex false-flagged it AGAIN — the **3rd detector false-flag this session** (P4
tier regex, Shield ladder detector, this). Rule holds: **read the prose, don't trust the
keyword match.**

### RUNNING TOTAL
double-flag (4) + shell (10) + weapon (10) = **24 GSC-verified cuts**, corpus **1323 ->
1299**. Remaining CLEAN-CUT: weapon-mods/build (7) — the last fast batch (expect over-broad).
Deliberate queue: 9 held shell + 2 weapon pulls + cryo/holotag (49) + **two canonical builds
(matchup hub, energy-category hub)**.

---

## 2026-07-17 — GSC CLEAN-CUT batch 1 (shell cluster): 10 cut, worklist corrected, matchup-hub found

DB-only writes (noindex flips); all reversible.

### VERIFICATION CORRECTED THE WORKLIST (key lesson)
The "19 shell tier/meta/build" CLEAN-CUT bucket was **over-broad** (keyword clustering, not a
verdict). Reading the bodies: only **10 were genuine single-shell duplicates** of a
`/shells/<slug>` canonical; **9 were mis-bucketed**. **The worklist is a CANDIDATE-finder —
every CLEAN-CUT batch needs read-then-cut verification before writing.** The remaining
**weapon (12) + mod-guide (7)** batches will likely be over-broad too — **do not bulk-cut
them.**

### CUT (10, guarded, reversible — corpus 1319 -> 1309)
`2d6231b8`, `a1735d1a`, `2687feaa`, `1abd15f4`, `351398ff`, `d02421d1`, `98dfd937`,
`1cc43328`, `d2adfe2e`, `2cac6341` — single-shell guides with a real `/shells` canonical.

### HELD 9 (mis-bucketed, NOT cut)
- **4 COUNTER-GUIDES:** `2ec2a58c`, `5c6bab92`, `cf06499c`, `88f957e5`.
- **1 tactic how-to:** `48aa0f9d` (Recon drone depth).
- **2 dated playbooks:** `d359fac9`, `da7d3713` (age naturally, likely keep).
- **2 Night Marsh map-meta:** `3e99742e`, `a6c095b9` (map-specific).

### 🎯 MATCHUP HUB — a canonical OPPORTUNITY (not a prune)
The **4 counter-guides** are a coherent cross-shell **MATCHUP cluster with NO canonical**.
"How to beat X" is genuinely distinct from single-shell reference pages. **Build a
`/matchups` (or similar) canonical hub** like `/mods` was — gives them a home AND fills a
real competitive-intel niche that's hard to replicate. **This is a BUILD, not a cut.
High-value find.**

### d2adfe2e cited Stack Overflow CORRECTLY (magazine-overflow)
Another editor that sourced it right pre-fix. **Reinforces: P1 = inconsistent sourcing;
read Stack Overflow mentions individually, don't blanket-flag the keyword.**

### SESSION CONSOLIDATION TOTAL
double-flag batch (4) + shell batch (10) = **14 GSC-verified cuts**, corpus **1323 -> 1309**.
Remaining CLEAN-CUT: **weapon-specific (12), weapon-mods (7)** — each needs the same
verify-first pass. The **9 held + cryo/holotag (49) + the matchup-hub build** are the
deliberate-decision queue.

---

## 2026-07-17 — GSC INDEXING ANALYSIS + consolidation worklist + first double-flag cut batch (4 cut)

**DB-only writes** (noindex flips); this entry is the record. All reversible.

### THE INPUT: 200 GSC "discovered — not indexed" slugs (Google's cannibalization verdict)
Justin pasted the GSC export (the API is still not wired — this was a one-time paste; a
future GSC cross-reference needs the export re-pasted). These are URLs Google **discovered
and declined to crawl** — the highest-signal cut source we have. All 200 matched a
`feed_items` row.

### THE SPLIT
- **19 already `noindex=true`** — Google reporting our prior cuts. NO ACTION. (Includes 7 of
  the mod-mechanic-backlog family already cut.)
- **181 live** (`noindex=false`) — the real cut/keep pool.

### CLUSTER BUCKETS (live pool, heuristic tagging — candidates, not decisions)
| bucket | count | note |
|---|---|---|
| **LEGIT-DATED KEEP** | 74 | news/patch/community (45) + creator/stream spotlight (24) + tournament (5). Dated coverage; ages naturally; lowest cut priority. |
| **NEEDS CANONICAL FIRST** | 49 | cryo-archive (42) + holotag (7). **NO canonical exists** — can't consolidate until one is built (like `/mods` was), or prune outright. cryo is a **mix** of dated stream coverage + evergreen "cryo meta build" dupes; needs a split-pass, not a blanket call. |
| **CLEAN CUT** | 38 | evergreen duplicates WITH a canonical: shell tier/meta/build (19 → `/shells/<slug>`), weapon-specific (12 → `/weapons/<slug>`), weapon-mods/build (7 → `/mods`). The fast-action batch. |
| **NEEDS-JUDGMENT** | 20 | ranked/shell generic guide (15) + systems/misc (4) + other (1). |

### THE METHOD THAT FOUND THE FIRST BATCH — GSC-declined ∩ factually-wrong
The **intersection of "Google declined it" AND "cites a game-verified-wrong mod mechanic"**
is the highest-confidence cut signal: redundancy verdict + factual error agree. **4 live
articles** sat in that intersection.

### CUT: the 4-article double-flag batch (all 4, guarded, reversible)
| id | headline | wrong mechanic | load-bearing? |
|---|---|---|---|
| `8f323bf1` | Combat Flow Guide | Stack Overflow consecutive-hit damage | stray line |
| `c15551e1` | Loadout Crafting Guide | Stack Overflow consecutive-hit scaling | stray line |
| `0cb48f34` | Weapon Heat System | Insomniac sustained-fire damage | stray line |
| `247a0adb` | Chip Priority Guide | Stack Overflow damage-stack + Insomniac sustained-fire | **PREMISE** (the recommendation itself) |

Cut rationale: each is **GSC-declined (redundant) AND factually wrong**. Fixing the wrong
line would NOT earn indexation (Google declined for cannibalization, not the error), so
noindex is correct. Verified per-article before cutting: live, false claim in body
(paragraph-read), `/mods/chip` covers both cited chips (no topic orphaned). `247a0adb` was
briefly HELD for a coverage-gap decision (see below), then cut on Justin's approval.
**Corpus: live 1323 -> 1319** (−4). All rows `is_published=true` (intact); reversible by
flipping `noindex`.

### FOLLOW-UP: chip STRATEGY coverage is now an HONEST GAP
`/mods/chip` covers chip **DATA** (what exists / effects / rarity ladders) — intact and
accurate. But **no live chip build-STRATEGY guide remains**: `2c4f7b42`, `debecdfb`,
`247a0adb` all cut; `51dd48dd` is a held cut-candidate (its own 4 false claims), not a real
keeper. This is the correct outcome (every one was built on now-corrected false mechanics —
misleading strategy is worse than a gap), but it leaves a real content hole. **"Build an
honest chip strategy guide" is a CONTENT-CREATION follow-up** — new prose written against
the corrected `mod_stats`, linking `/mods/chip` as its data source. Not a consolidation task.

### STILL ON THE WORKLIST (for a fresh session)
- **CLEAN-CUT 38** (shell/weapon/mods dupes with canonicals) — the next fast batch; verify
  keepers absent first (shell-consolidation discipline).
- **cryo-archive (42) + holotag (7)** — NEEDS CANONICAL FIRST; decide build-canonical vs prune.
- **WSTR/D54 stale flags** — 6 live articles touch the now-confirmed buff/nerf, but they
  SPLIT: weapon-build guides (cut-toward-`/weapons`) vs dated patch news (legit-keep). Do
  NOT blanket-cut on the WSTR keyword.

---

## 2026-07-16 — DMZ RELOCATIONS UPDATE: Hajin done, Printer held, pattern nuance corrected

**Supersedes the "just repeat the pattern" framing in the DMZ entry below.**

### DONE: Hajin relocated `field-intel -> /dmz/regions` (commit `ea85776`)
Old URL **308-redirects**, `/dmz/regions` is a live editor hub, canonical correct, slug
unchanged, **zero DB**. A **genuine URL upgrade** (regions = the geographically-correct slug
+ the #1 pre-launch asset).

### CANONICAL STATE NOW
- `/dmz/fob` <- FOB (done)
- `/dmz/regions` <- Hajin (done)
- `/dmz/loadouts` <- 3D Printer (**INTENTIONALLY KEPT** — see below)
- `/dmz/printer`, `/dmz/meta`, `/dmz/field-intel`, `/dmz/discourse` — **empty** (printer is
  **RESERVED for the launch recipe data-tool**; the others are catch-alls awaiting content)

### PATTERN CORRECTION (the prior entry oversold "just repeat it")
The **retag + flip + redirect** pattern applies **CLEANLY only when the source section
RETAINS other content** (as `field-intel` did for FOB — it kept Hajin). **When the source
has only the one article, the move EMPTIES it — a SWAP, not a net improvement** in the
empty-shell count. So **each remaining relocation is a JUDGMENT CALL, not a mechanical
repeat:**
- **Hajin was worth the swap:** `regions` is higher-value than the emptied `field-intel` (a
  generic catch-all that refills with any future intel article). **ACCEPTED tradeoff:**
  `field-intel` now renders `DmzEmptyState` (intentionally empty-pending-content, **NOT a
  bug**).
- **Printer was NOT worth it (Option A, left in Loadouts):** (1) its Loadouts placement is a
  **DELIBERATE prior decision** (the mapping comment: *craftable gear -> Loadouts*);
  (2) `/dmz/printer` is **RESERVED for the launch-day recipe data-tool** — moving the article
  there would squat the tool's slot; (3) it would **empty Loadouts** (a real content section)
  for a **LATERAL move** (`loadouts -> printer` isn't a clearer URL). **DO NOT re-litigate
  this — Printer stays in Loadouts.**

### RULE for future DMZ relocations
Only relocate when **(a)** the target slug is genuinely more correct/valuable than the source
**AND (b)** either the source retains content **or** the source's emptiness is low-risk (a
catch-all). **Otherwise leave it.**

**`field-intel` is now INTENTIONALLY EMPTY** (renders `DmzEmptyState`) — not a bug to
investigate.

---

## 2026-07-16 — DMZ VERTICAL: PRE-LAUNCH CANONICAL WORK + FOB relocation

**STRATEGIC CONTEXT:** DMZ (MW4 extraction mode, confirmed official, launches **Oct 23
2026**) pre-launch play = **claim canonical URLs on CONFIRMED facts NOW** so they age into
authority before the launch search wave. The Marathon strategy repeated with **~3 months
runway**.

### VERTICAL IS HEALTHIER THAN ASSUMED (scoping findings)
- **Official spec confirmed:** the CoD **"Deep Dive"** blog (stored June URL,
  `source=DEEP DIVE`) is the full official source — Hajin + 5 named POIs (Fallout reactor,
  Prison, Hajin City, Military Base, casino/vault, Hunt Towers, eastern fallout zone), the
  FOB + all named stations, 3D Printer (10 categories), Trait System, operation types,
  threat system / Lieutenants, MIA / Tourniquet, PvP / bounty, weather. **Justin confirmed
  the pasted spec IS that June post** (not a newer one).
- **Provenance already CLEAN:** all 3 DMZ articles cite the official CoD blog (unlike the
  Marathon VB cluster, which was accurate-but-unsourced). **The DMZ vertical had the source
  discipline built in.**
- **Architecture is RIGHT:** `/dmz` is the launch-info canonical (FAQ single-array =
  visible + FAQPage schema, no drift — same pattern as `/modes/vault-breaker`, and it
  predates it). The 3 entities with real confirmed depth (**Hajin, FOB, 3D Printer**)
  already own stable claimed slugs (`/dmz/regions`, `/dmz/fob`, `/dmz/printer`). **The gap
  is CONTENT DEPTH, not structure/routing.**
- Only **3 articles / 1,578 words** exist for the whole vertical; several sections are
  **empty-but-indexed "coming soon" shells** (a thin-content liability).

### FOB RELOCATED (commit `99cf04c`) — the first DMZ canonical done properly
- The FOB article (`dmz-forward-operating-base-every-hub-system-detailed`, **~85% complete
  already**) was at `/dmz/field-intel/<slug>`; `/dmz/fob` was an **empty indexed shell**.
- **Option A executed:** re-tagged article `field-intel -> fob` (`DMZ_ARTICLE_SECTION`),
  flipped the fob section descriptor `source: 'data' -> 'editor'` (+ `contentFilter` +
  factual description, since *"launches with the zone"* became false on a live hub), added
  a **308 redirect** (`next.config.mjs`, house pattern) old -> new URL.
- **RESULT:** `/dmz/fob` is now a real editor-fed hub at the correct URL; old URL
  **308-redirects** (authority transfers); **slug unchanged**; **zero DB writes**;
  **relocation-only (NO new facts)**.
- **301/308 math:** a 16-day-old pre-launch page on a near-zero-authority vertical = the
  **cheapest possible moment to move it**. Every day toward Oct 23 raises the cost.

### PROVEN PATTERN for the remaining entities
**RETAG** (`DMZ_ARTICLE_SECTION`) + **FLIP** section descriptor (`data -> editor`,
`+contentFilter`, `+honest description`) + **308 REDIRECT** (`next.config.mjs`).
**Config-only, zero DB.**

### NEXT DMZ MOVE (proven, high-value): HAJIN -> `/dmz/regions`
Identical shape: `/dmz/regions` is the claimed slug, currently an empty data shell; the
Hajin article sits under `field-intel`. Same **retag + flip + redirect**. Highest-value
because **regions/POIs = the #1-ranked pre-launch asset** (the map/POI space). The Deep
Dive **names the geography** = real fillable content.

### RECURRING DISCIPLINE (held 3x this arc)
**Only the June Deep Dive is a confirmed source.** Do NOT add facts absent from it (e.g.
*"3 named Trait trees"*, *"Stash upgrade tiers"* — the FOB article's own **"Still
unconfirmed"** section says these AREN'T in the Deep Dive). Adding them under the June
citation would be the **same anachronism refused on the 26 VB articles**. A newer CoD post
= needs its **own permalink** before its facts can be cited.

### CAVEAT for the future FOB data-tool
`/dmz/fob` is now an editor hub (was `source: 'data'`, the original intent = a launch-day
progression optimizer). That tool must now **CO-EXIST on `/dmz/fob`** (tool above the
article list, or the section carries both) — a design note for whoever builds it, so the
repurposing isn't a surprise.

---

## 2026-07-16 — VAULT BREAKER CANONICAL + 29-ARTICLE CLUSTER RECONCILIATION

### SHIPPED: `/modes/vault-breaker` (commit `c471ef8`)
**The only page on the site citing Bungie for VB facts**, live **5 days pre-launch**. New
`/modes` route type, Marathon root-implicit.

Facts live in a `VAULT_BREAKER` const **shaped like a `game_modes` row** (`mode_name` /
`summary` / `available_on` / `is_limited_time` / `details` / `verified` / `updated_at`) —
swapping to a DB read is a **fetch + destructure**; the file comments that the future query
**MUST carry `.eq('game_slug','marathon')`**.

**JSON-LD:** BreadcrumbList (**2-item, Home > Vault Breaker — NO Modes crumb**, because
`/modes` has no index route and a middle crumb would **404**, per the `/mods` lesson; add it
when a `/modes` index exists) + **Event** (`startDate 2026-07-21`, `endDate 2026-08-04`) +
FAQPage + WebPage + VirtualLocation. **`dateModified` fixed at 2026-07-16**, never
`new Date()`. Bungie URL cited **visibly in the body twice** + in JSON-LD. **Leads with the
UESC Commander gap.** **Nav/homepage correctly SKIPPED** (one page, not a section).

### TWO OFFICIAL BUNGIE SOURCES (not one, as the earlier HANDOFF implied)
- **June 23** dev update / key-dates / mid-season roadmap → source for the **26 EARLIER**
  articles. Revealed: the mode, Cryo Archive, July 21, no-loot-out, Vault Data,
  Season 3 = Sept 22.
- **July 16** Mid-Season 2 Preview
  (`https://www.bungie.net/7/en/News/Article/mid_season_2_preview`) → source for **3 recent**
  articles. Added: **Aug 4 end**, **Update 1.1.5**, **T2 mechanics**, **Armory contents**,
  **no-level-gate**, **the UESC Commander T1 source**.

### 29-ARTICLE RECONCILIATION — the corpus is ACCURATE but was UNSOURCED
**The inverse of `mod_stats`:** there, articles inherited a wrong DB and published
falsehoods. **Here, editors read official posts, got it RIGHT, and the pipeline recorded the
wrong provenance.**

- **ZERO contradictions across all 29.** No wrong dates / mechanics / currency / exfil claims.
- **`source_url` was universally wrong: 0/29 cited bungie.net.** Several **actively
  misleading** — `6c0a37c1`'s URL is a video **its own body calls "Subway Surfers content"**;
  **4 articles share one unrelated URL** (`ZKRcJ_CJA_M`).
- **PROVENANCE SORT: only 3 of 29 post-date the July-16 post; 26 predate it.** A blanket stamp
  would have **back-dated a citation onto 90% of the corpus — fabricated provenance.**
- **FIXED:** `source=BUNGIE` + the July-16 URL on **`89392498`** (GHOST, names the preview,
  12/12 facts) and **`96312d50`** (NEXUS, cites 1.1.5 + Aug 4 — facts unique to July-16; its
  old YouTube URL was a **PHANTOM** citation, body references no video). **`70608353` held**
  (ranked piece, VB secondary). `source=BUNGIE` is a **new 9th source-vocab value** — verified
  all consumers handle it (generic fallback), no CHECK constraint fired,
  `DEEP DIVE -> callofduty.com` is precedent.
- **HELD: the 26 pre-dating articles.** Their true source is the **June 23 post — URL NOT YET
  AVAILABLE. Get it, then fix all 26.** **Do NOT stamp the July-16 URL on them
  (anachronistic).**

### CONTENT GAPS (opportunities — our corpus omits these)
- **UESC Commander T1 Vault Data source** (post-run, **exfil or not**) — the canonical now
  covers it; **all 29 articles omit it**.
- **The BALANCE/SANDBOX half of the July-16 post is UNCOVERED:** WSTR buff (dmg **85 -> 100**,
  range-limited, precision multiplier **removed from ballistic shotguns**), D54 nerf (now **3
  bursts** to down a grey shield), **grenade infil limit** (max **2** throwables combined),
  **Cradle Evolution** (reset-at-max for **+1 Energy** + cosmetic shells), implant iconography.
  **`058b6349`** (WSTR build guide — also on the mod-mechanic fix-list) is now **STALE against
  the confirmed WSTR buff**. Content opportunity **+ a stale-guide fix**.

### BUGS / FINDINGS uncovered (each its own task — do NOT fix as launch side-effects)
- **`availableOnMap` BUG (the biggest find):** `game_modes` renders **ZERO rows on all 5 map
  pages**. Rows store `available_on='cryo-archive'` (the **slug**); the matcher compares
  against the map **NAME** `"Cryo Archive"` — **never matches**. `game_events` renders on
  **only 2 of 5** maps; **Cryo Archive / Dire Marsh / Night Marsh show none**, including
  **Anomaly + Upper Complex Encounter** which belong there. **A whole SEO section that has
  never displayed anything.** Independent of VB.
- **PHANTOM-MEDIA pipeline:** NEXUS **auto-attaches `media.thumbnail` / `media.source`** from
  its YouTube pool **even when the article does not use the video** — the mechanism behind
  `96312d50`'s phantom `source_url` **AND its still-wrong YouTube hero thumbnail**. **Likely
  corpus-wide, not one row.**

### VB PAGE FOLLOW-UPS
The page is **ORPHANED** — only the sitemap links it (Nav/homepage correctly skipped).
**Cheap win: link it from `/maps/cryo-archive`** (topically exact) **+ the `/intel` feed**.

**POST-LAUNCH:** ~4 VB fact-writeups (`89392498`, `6c0a37c1`, `59e893d7`, `6b7062a4`) become
**dated news the canonical outranks** after July 21; **all 29 go stale Aug 4** —
consolidation pass **then, not now**.

### TWO LOOSE ITEMS from earlier this session
- **`2c4f7b42` CUT** (`noindex=true`) — the Chip keeper with **4 game-verified false
  mechanics**. **Chip now has NO live strategy guide.** `debecdfb` re-audit is the restore
  path **but may fail the same bar** (it also cites Stack Overflow damage-stacking + Torch Bug
  fire-patch) → **Chip may need new content.**
- **CRON STILL RUNNING:** the corpus grew **~4 mid-session**. **The adopted-strategy article
  FREEZE was DECIDED but NEVER IMPLEMENTED.** The machine is live and generating — correctly
  for VB (it ingested the July-16 post **same-day**) — but **the freeze decision is
  unenforced.**

---

## 2026-07-16 — mod_stats IN-GAME VERIFICATION PASS (5 mods corrected against the game)

Justin verified 5 flagged mods **against the actual game** and corrected the DB. This is
**GROUND TRUTH (in-game checked)**, not field-reconciliation. All writes reversible.

### ROWS FIXED (all game-verified)
1. **Flash Draw Chip** [Chip/Superior, `4397cb6b`] — `effect_desc` was a **copy-paste of
   Alternating Current** ("EMP heal"); corrected to **"Greatly increases ready and swap
   speed."** `verified` **left false** (reconciled fields *before* the in-game pass).
2. **Stack Overflow** [Chip] — Deluxe was "damage stacking"; corrected to the
   **magazine-overflow ladder small/moderate/massive**. Deluxe `verified` -> true.
3. **Swarm Directive** [Chip] — Deluxe was "fire rate"; **BOTH** tiers corrected to
   **"flechette seekers that heal you when damaging hostiles"** (moderate/large). Superior
   was `verified=true` but said **"heal ALLIES"** — wrong, corrected.
4. **Torch Bug** [Chip] — **3 unrelated mechanics**; ALL corrected to the
   **explosion-on-elimination ladder small/moderate/massive**. Superior was `verified=true`
   but said **"reload time"** — wrong.
5. **Insomniac** [Chip] — Enhanced said "sustained fire" but it is **Energy Amp
   duration-extension**; corrected to small/moderate/massive, **AND the Deluxe tier was
   MISSING — INSERTED** (id `53c3d0b4-6f4c-4607-91da-a0efbf70be29`, **reversible by
   delete**, `slug` NULL, credit 207). Prices game-verified **69 / 207 / 621**. All 3
   `verified=true`.

### CRITICAL — `verified=true` is NOT a truth signal
**3 `verified=true` June rows were game-verified WRONG** (Swarm Directive Superior, Torch
Bug Superior, Flash Draw Chip). **`verified` means "reviewed", not "correct".**
**The "June/verified = trustworthy" prior is WEAK.** Only in-game checks are ground truth.
**Future sessions must not trust the flag.**

### CRITICAL — the pipeline was still leaking
`1f62da92` (**DEXTER, 2026-07-08**) carried bad-DB data into **FRESH content last week**.
And for Insomniac, **NOT ONE of 7 live articles mentions "Energy Amp"** — the correct
mechanic was **never written**; 100% inherited the wrong DB row. **Fixing rows is the
upstream leak-stop.**

Some editors got mods **RIGHT** (`216c1597`, `6d1cb08c`) — so **P1 is inconsistent SOURCING**
(good row vs bad row), **not a uniform prompt failure**. **Fixing rows may be most of the P1
fix.**

### METHOD — paragraph, not grep
False claims sit in the sentence **AFTER** the mod mention (`2c4f7b42`'s Swarm Directive line
**did not contain "Swarm Directive"**). **Sweeps must read paragraphs, not grep names.**

### ARTICLE FOLLOW-UP LIST (~14 distinct LIVE, game-verified WRONG — content-fix backlog)
| mod | live articles |
|---|---|
| **Insomniac (7)** | `247a0adb`, `0cb48f34`, `058b6349`, `21ad614f`, `4f98f5dc`, `51dd48dd`, `2c4f7b42` |
| **Stack Overflow (8)** | `058b6349`, `4474dd9c`, `888cc74f`, `c15551e1`, `8f323bf1`, `c75af28c`, `247a0adb`, `2c4f7b42` |
| **Swarm Directive (2)** | `1f62da92`, `2c4f7b42` |
| **Torch Bug (2)** | `b84ef4fc`, `2c4f7b42` |

(~10 more **noindexed** carry the same claims — **no action**, already out of the index.)

### 2c4f7b42 KEEPER IS DEAD
The Increment-5 **Chip keeper** (preserved *and* headline-rewritten this session) carries
**FOUR game-verified false mechanics** (Stack Overflow, Swarm Directive, Torch Bug,
Insomniac) across **~10 sentences** — **the worst article in the corpus by verified error
count**. `ad828fbf` was **CUT for 3**; this has **4**.

**Recommendation: CUT it**, and **re-audit `debecdfb`** (the cut alternative) as the
replacement Chip keeper — **the Shield-reversal pattern**.

### STILL OPEN in mod_stats
- **2 Combat Mag placeholders** (render filler as an effect; need the real effect from
  Justin in-game).
- **No-scaling ladders (4)**, **opaque-name Chips (~15, uncheckable without the game)**,
  **bad-summary-not-rendered rows** (Ornithologist, Insurrection).

**CORRECTION to the integrity-audit entry below: `slug` HAS a UNIQUE constraint**
(`mod_stats_slug_key`; one slug-owner per mod name — 58 populated / 58 distinct). That entry
wrongly implied it was non-unique. The failed INSERT proved it.

---

## 2026-07-16 — mod_stats DATA-INTEGRITY AUDIT + Flash Draw Chip fix

**All 202 rows READ, not pattern-matched.** This was the **GATE** before article-accuracy
work — and it **proved necessary**: any accuracy pass run before these rows are resolved
would generate **FALSE accusations against articles that are actually right**.

### THE MECHANISM
`mod_stats` has **TWO effect fields** — `effect_desc` and `effect_summary`. On **5 rows they
describe DIFFERENT mechanics**, so one is **provably wrong with no game knowledge needed**.

`/mods/[slot]` renders **`effect_desc || effect_summary`** (prefers `effect_desc`). So:
- a bad **`effect_desc`** → **publishes false data**
- a bad **`effect_summary`** → **latent** (nothing renders it)

### FIXED THIS SESSION
**Flash Draw Chip** [Chip / Superior / 540cr, id `4397cb6b`] — `effect_desc` was *"Restore
health/shields vs EMP-affected target"*, a **copy-paste of Alternating Current** (the
adjacent, verified row). Corrected to the row's **own `effect_summary`**: **"Greatly
increases ready and swap speed."** — agrees with the **name**, with article `51dd48dd`, and
with Superior-tier house convention (20/47 Superior rows lead with "Greatly").

`verified` **LEFT false** — fields were reconciled, **not game-verified**; the row stays
flagged for an in-game check.

Corroborating: the row was `updated_at` **2026-03-10**, the **oldest in the table**, never
touched by the June refresh — while Alternating Current is `verified: true`, updated 06-05.
Contamination direction confirmed. **Reversible.**

### TWO PRIORS THIS OVERTURNS (important)
- **`51dd48dd` did NOT fabricate the Flash Draw Chip claim — the DB did. The article was
  RIGHT.** We flagged it for an effect-mismatch **it did not commit**. **Re-weigh its
  disposition:** it had 4 flagged claims, but **at least 1 was the DB's error**, not the
  article's.
- **Chip keeper `2c4f7b42`** cites Stack Overflow's **Deluxe** (damage-stacking) version — if
  Deluxe is the bad row (**suspected**), **that article is RIGHT too**.

**PATTERN: some "article errors" are articles being CORRECT against a WRONG database. The
content-accuracy problem is partly a DATA problem.**

### STILL OPEN (~18 rows — needs **Justin's game knowledge**; candidate list, NOT a fix list)
- **LADDER INCOHERENCE** (4 mods · HIGH confidence something is wrong · **live-render
  risk**): **Torch Bug** (Superior outlier), **Stack Overflow** (Deluxe outlier), **Swarm
  Directive** (Deluxe vs Superior conflict), **Insomniac** (Enhanced vs Superior conflict).
  Each has one tier that reads **pasted from another mod**. The **outlier tier is
  identifiable; WHICH text is correct needs the game.**
- **COMBAT MAG PLACEHOLDERS** (2 · **render filler-as-effect**): a **621cr Superior** mod
  whose `effect_desc` is *"Standard combat magazine for ballistic weapons"* while its
  **Enhanced** tier has real text. The junk guard **misses it** (not "N/A"). Needs the real
  effect.
- **BAD `effect_summary`, NOT rendered** (latent · fix for cleanliness): **Ornithologist**,
  **Insurrection** (their other tiers prove the summary is the outlier).
- **NO-SCALING LADDERS** (4 · medium · may be genuine): Background Process, Cloudborn,
  Optimal Prime, Insurance Plan — identical text across tiers.
- **8 junk/null `effect_desc`** — render "Effect not documented yet." (**fail safe**;
  completeness gap).
- **~15 UNCHECKABLE opaque-name Chips** (Rorschach Test, Chaos Theory, etc.) — the name
  implies no mechanic; **only in-game play can verify**.
- **SLOT/EFFECT mismatches: NONE found** — every effect matches its slot domain.

### REVISED SEQUENCE (the mod_stats gate is now **partially cleared**)
1. **mod_stats ladder-incoherence + Combat Mag rows** — needs **Justin's in-game
   verification**. *Highest remaining value: live-render risk.*
2. **THEN P1 generation-side root cause** — why editors quote Superior text as baseline.
   **Now investigable.**
3. **Source-of-truth split** — `shell_stats.ranked_tier` vs `meta_tiers.tier`.
4. **`51dd48dd` re-weigh** — 1 claim was a DB error.
5. **P4 rebuild.**
6. **Generator data refresh.**

---

## 2026-07-16 — ACCURACY AUDIT FOLLOW-UP: new error class + mod_stats data-integrity finding

Came out of proposing headline fixes for the 2 remaining multi-slot "Complete" articles.
`44d2c9e1` was **confirmed clean** (headline was its only defect — fixed). `51dd48dd` was
not, and reading it turned up **two findings bigger than the headline work**.

### NEW ERROR CLASS — EFFECT-MISMATCH (**the P1 audit was structurally blind to this**)
Found in `51dd48dd`. **Not** tier-blind (= wrong magnitude of the *right* effect). This is a
**WRONG EFFECT ENTIRELY** — the described mechanic is not the mod's effect **at any tier**.

| mod | article says | `mod_stats` says |
|---|---|---|
| **Flash Draw Chip** | "ready/swap speed" | "restore health/shields when damaging an **EMP-affected** target" |
| **Background Process** | "shield buffer" after not taking damage | "**auto-reloads when stowed**" |
| **Eyes on Fire** | "ADS damage below half health" | "**ability energy on kill** after deactivating a tactical/trait" |

**P1 only tested magnitude-vs-ladder, so it CANNOT see this class.** It is **unmeasured
across all 1,317 live articles.**

### mod_stats MAY HAVE WRONG ROWS (**affects the /mods canonical shipped this session**)
**It is not always the article that is wrong.**
- **Flash Draw Chip** — the name means *quick-draw*; the **article** fits the name, the **DB**
  (EMP heal) does not → **DB row likely MIS-ENTERED**.
- **Background Process** — the name fits the **DB** (a process running while stowed →
  auto-reload); the **article** is wrong.

Connects to the **Stack Overflow / Torch Bug** bad rows flagged in /mods **Increment 0**.

**IMPACT: `/mods/[slot]` publishes the `mod_stats` version NOW** — wrong rows mean the
**canonical is publishing false data**. Needs **a human who knows the game, not a detector**.

**RECOMMEND: a `mod_stats` data-integrity audit** (name-vs-effect across all **202 rows**).
It **gates** both trusting the `/mods` canonical **and** any article-accuracy work — there is
no point checking articles against a source that may itself be wrong.

### 51dd48dd — CUT CANDIDATE, not a headline fix (**HELD**)
**4 false claims** (1 tier-blind Control Shield + 3 effect-mismatch) **+ a false "Complete"
headline**. `ad828fbf` was **cut for 3**. Fixing its headline would make it **read as vetted
while 4 false claims remain**. Defer to a future accuracy pass.

### P3 STATUS
False-"Complete" **resolved except `51dd48dd`**: 6 keepers + `44d2c9e1` fixed = **7 of 8**.
(`44d2c9e1` -> "Marathon Generator and Grip Mods: Energy Builds and Recoil Control";
guarded single-field `headline` UPDATE, slug unchanged, same recorded decision.)

---

## 2026-07-16 — CONTENT-ACCURACY AUDIT + keeper headline fixes

Read-only scan of **1,317 live indexed** Marathon articles for claims contradicting ground
truth (`mod_stats` / `meta_tiers` / `shell_stats`). Came out of Increment 5, where the
Shield keeper `ad828fbf` was found to carry **3 error types** — discovered only by reading
prose against data. **~40 defensible candidates across ~33 articles.**

### PATTERN 1 — TIER-BLIND EFFECT CLAIMS (HIGH confidence · **THE systemic finding** · OPEN)
**24 candidates / 20 articles, across MIRANDA + DEXTER + CIPHER** = **template-repeated,
not isolated.** Articles state a mod's **SUPERIOR-tier** effect as its baseline/only effect:

> "Weighted Barrel **greatly increases aim assist and accuracy while moving**"

That is the **Superior** text verbatim; `Enhanced = "Slightly increases aim assist."`

**Checkable surface is only 7 mods** (those with `slightly -> greatly` ladders), so **24
hits is a HIGH strike rate** — the true count is likely higher on ladders this test cannot
see.

**NOW READER-VISIBLE:** `/mods/[slot]` publishes the full ladder next to these articles.

Affected mods: **Weighted Barrel** (most frequent), **Vigilant Lens**, **Rangefinder
Optic**, **Control Shield**, **Air-Cooled Chamber**. Example articles: `ea3d4c7f` (3 hits),
`b92ff87f`, `5a621cf2`.

**LIKELY FIX IS GENERATION-SIDE** — the editor prompt that quotes effects grabs the
Superior text. Fixing 20 articles by hand leaves the editor still generating it.
**Investigate the prompt root cause before/alongside article fixes.**

### PATTERN 2 — FALSE COUNT CLAIMS (3 real · HIGH)
- `ab1dfdea` — "**Only four Generator mods exist**" — DB: **5** (omits Turbo Generator).
  **This is a Generator ORPHAN we are holding.**
- `2bba5719` — enumerates "**all seven shells**" — DB: **8** (omits Sentinel).

Small, but **includes held articles**.

### PATTERN 3 — FALSE "COMPLETE"/"EVERY" (13 · HIGH · **MOSTLY FIXED**)
**All 6 Increment-5 keepers** claimed "Complete" while covering a fraction of their slot.

**FIXED 2026-07-16** — headlines rewritten to honest descriptions (e.g. Shield `d7772873`
-> **"Marathon Shield Mod Guide: Fortress vs Control"**). Single-field
`feed_items.headline` UPDATE, guarded on the exact current value, **slugs UNCHANGED** —
URL stability over removing a buried word, a **recorded decision**: `complete-` stays in
the slug. The claim that mattered was in title / `<h1>` / SERP, all cleared, since
`headline` is the **single render source** (title, OG, Twitter, JSON-LD, breadcrumb, h1,
OG image, share text).

**STILL TO FIX** — two multi-slot pieces with the same false "Complete":
`44d2c9e1` (Generator+Grip) and `51dd48dd` (Shield+Chip).

**BODY-LINK FOLLOW-UP:** the 6 fixed keepers should link to their `/mods/[slot]` canonical
("full list see /mods/x") to make the honest division of labor **real** — none currently
link it.

### PATTERN 4 — TIER CLAIMS vs meta_tiers (**UNUSABLE — do NOT act**)
Naive scan gave **234**, but a hand-check showed **~33% precision**: the regex assigns
solo/squad scope from a **+/-50-char window**, so it flags **CORRECT** articles (one saying
"S-tier overall, S-tier squad, B-tier solo" got its *overall* claim checked against the
*solo* column).

**Same failure mode as the Shield ladder detector, caught the same way — reading prose.**

**Needs a REBUILD:** sentence-scoped parsing + **TIER HISTORY** (`meta_tiers` was regraded
**07-15**, so we cannot distinguish "false when published" from "true then, stale now").
2 hand-verified real hits (`08c6c8d8` Recon solo-A vs canonical solo-B; `6cdd485e`
Assassin) — **both predate the regrade, so even those need history**.

### TWO STRUCTURAL FINDINGS (both worth their own follow-up)
1. **SOURCE-OF-TRUTH SPLIT:** `shell_stats.ranked_tier` and `meta_tiers.tier` **DISAGREE**
   (Rook **C vs A**; Destroyer **A vs S**). If code reads `shell_stats` while editors read
   `meta_tiers`, that is an upstream split — **possibly the ROOT of tier-claim errors**.
   Investigate which is authoritative and reconcile.
2. **`shell_stats.base_health` / `base_shield` are NULL for all 8 shells** — every
   HP/shield number in the corpus is **UNVERIFIABLE** (not false — uncheckable). Two Shield
   guides cite **different Destroyer values**, so **>=1 is wrong**. Fill from a verified
   source before HP-claim accuracy checks are possible.

### METHOD NOTE
This audit is **error-prone by nature** (reading claims vs ladders). Detectors
**false-flagged twice** (the P4 regex; the earlier Shield ladder detector) — **both caught
by reading actual sentences against the DB**. **Every future accuracy flag must cite
article text AND DB ground truth, as a CANDIDATE with a confidence level — never a
confident verdict list.**

---

## 2026-07-16 — INCREMENT 5: MOD-GUIDE CONSOLIDATION (EXECUTED: 13/13 cuts landed)

DB-only writes; **no git artifact for the cuts** (this entry is the record). All reversible
(`noindex`, never delete); every row stays `is_published=true`.

### THE REFRAME (important — the original framing was wrong)
The task framing was "consolidate mod-guide articles **ONTO** the `/mods/[slot]` canonicals."
That **FAILED on contact with data**: the canonical is a **DATA TABLE** (name / ladder /
effect / credit, **100% roster**, zero strategy); the guides are **STRATEGY PROSE**
(**13–44% roster**, real recommendations). The canonical does **NOT** subsume the guides —
noindexing a guide "onto" it would destroy strategy content existing nowhere else.

So the real duplication is **ARTICLE-vs-ARTICLE** (seven "Magazine Mod Guide" articles
competing for one query), **NOT** article-vs-canonical. The canonical owns "what mods
exist"; that frees the guides to be judged as strategy, where each slot needs **ONE**, not
seven.

**Rationale: completeness + single canonical + intra-cluster cannibalization.**
**NOT accuracy-vs-rot** — mods have no live tiers. **Do not reuse the shell-consolidation
framing here.**

### CONFIDENCE CAVEAT (recorded)
Body-level Jaccard was **0.20–0.36** — these are **TOPICAL/SERP duplicates, NOT text
re-mints**. Each guide names a partly-different mod subset. Cutting discards some unique
prose — judged acceptable (discarded = generic slot theory; facts all on the canonical) but
it is a **JUDGMENT CALL, not a measurement**.

### CUTS (13; each a guarded per-cluster UPDATE, rows-affected verified, reversible)
| Slot | Cut | Keeper |
|---|---|---|
| Magazine | 6 | `135323dc` |
| Barrel | 3 | `c1c3af82` |
| Optic | 2 | `b6935b84` |
| Chip | 1 | `2c4f7b42` |
| Shield | 1 | `d7772873` |

Keeper criterion: **depth** for the clean clusters (the canonical owns breadth, so keep the
deepest strategy) — but **ACCURACY** for Shield.

### SHIELD — keeper reversed on accuracy (the important sub-story)
Originally picked `ad828fbf` on **word count** (631w). Reading it against `mod_stats` ground
truth found **THREE false claims**:
1. **"the two shield mods"** — there are **8**.
2. **"Control Shield greatly increases stability"** — states the **Superior-tier** effect as
   the mod's, ignoring Enhanced = *"slightly"*.
3. Headline **"for Every Shell"** — covers **7/8**; **Sentinel absent**.

The rival `d7772873` (494w, thinner) is **tier-aware** and has **ZERO false claims**. Kept
the **ACCURATE** one, cut the flawed one.

**Lesson: word count is a bad keeper heuristic; ground-truth accuracy is the right one, and
it only surfaces by READING prose, not measuring it.** (A detector false-positive nearly
kept the wrong article too — caught by reading the actual sentences.)

### HELD BACK (do NOT cut)
- **Generator orphans** (`ab1dfdea`, `44d2c9e1`) — no canonical (`/mods/generator` withheld),
  **80% roster coverage**, the only generator-mod docs on the site. **Blocked on the
  Generator data refresh.**
- **Shield merge-up** `7d5fe46a` (shell-pairing meta) — unique content, no canonical home.
- **Multi-slot (2) + general/hub-level guides (5)** — a separate **hub-level** pass, not
  slot-level.

### PROJECT CONSOLIDATION TOTAL
**139 noindexed** = 53 mod-builds + 73 shell tier/meta + 13 mod-guides. All reversible, all
`is_published=true`.

### NEW FINDINGS from this pass (both worth their own follow-up)
1. **CONTENT-ACCURACY AUDIT needed.** `ad828fbf` had **3 error TYPES** in a live indexed
   article: false mod count; **tier-blind effect claims** (stating a Superior-tier effect as
   the mod's only effect); false "complete/every" headlines. The **tier-blind error
   especially is likely REPEATED** across template-driven editor output. A dedicated
   accuracy pass (check live articles' effect claims against `mod_stats` / `meta_tiers`
   ladders) is **arguably higher-value than more consolidation** — it is about whether
   **SURVIVING** content is honest.
2. **`shell_stats.base_health` / `base_shield` are NULL for all 8 shells.** Every article
   citing HP/shield numbers is **unverifiable**, and the two Shield guides cite **DIFFERENT
   Destroyer values** (at least one wrong). **Fill before more accuracy passes.**

---

## 2026-07-16 — MULTI-GAME REFERENCE-ROUTING: state + open items (found during /mods Increment 1)

Architecture findings surfaced by the `/mods` build. Docs-only record; the only code change
that came out of it is the `game_slug` filter shipped inside `/mods`' own first commit.

### DATABASE is fully game-scoped
Every entity table carries `game_slug`: `shell_stats`, `weapon_stats`, `mod_stats` (202 rows),
`unique_weapons`, `game_maps`, plus `cores` / `implants` / `cradle` / `meta_tiers`. All are
`marathon:*` today. `feed_items` already has `dmz:3` rows. `factions` is the lone table
**without** `game_slug`.

### ROUTES are not yet game-scoped
Marathon is **root-implicit** (`/weapons`, `/shells`, `/mods` — `marathon.js` has no
`basePath`); DMZ is **namespaced** (`/dmz/[section]` — `dmz.js` sets `basePath: '/dmz'`,
sections config-driven). There is **no `[game]` URL segment and no game-aware href builder**;
`basePath` is consumed in exactly one place (`rootGames.js:69`).

### ROUTE-LEVEL `game_slug` FILTERING IS INCONSISTENT (latent bug)
- **Filter correctly:** `/maps`, `/factions`, the sitemap DMZ block, and now `/mods`
  (fixed in its first commit).
- **Missing the filter:** `/weapons`, `/shells`, `/uniques`, and the sitemap's dynamic
  shell/weapon blocks.

Harmless today (all entity rows are marathon), but the day DMZ entity rows land in
`weapon_stats` / `shell_stats` these routes **silently render Marathon + DMZ mixed**.
Fix as **one focused change BEFORE DMZ entity data arrives**. `/maps` is the correct precedent.

### OPEN DECISION (before Oct 23): DMZ reference-data routing shape
The trajectory implied by `dmz.js` config is `/dmz/[section]` (printer / fob / regions as
`source: 'data'`, "launches with the zone") — **not** `/dmz/mods` mirroring `/mods`. That
would give the two games **different reference-routing shapes**.

This is **inferred from config, not decided.** Decide deliberately pre-launch, per the
"infrastructure game-agnostic, config per-game" principle. It affects whether the eventual
game-scoping refactor **unifies** the reference sections or **keeps them split**.

---

## 2026-07-15 — SHELL TIER/META CONSOLIDATION, Pass 1 (EXECUTED: 73 noindexed across 6 shells)

Part of the topic-cannibalization cleanup. DB-only writes; **no git artifact for the cuts**
(this entry is the record). All reversible (`noindex`, never delete).

### How we got the number
The **D1 topic-cluster audit** (`docs/topic-cluster-audit.md`, content-based rather than
headline-substring based) found ~158 shell `tier/meta` articles cannibalizing the 8
DB-backed `/shells/<slug>` canonical pages. A **corrected classifier** then cut the true
tier/meta count to **76**, moving ~120 articles into out-of-scope buckets. Three fixes:
1. **Word-boundary matcher ported from the x-gate fix (`55f9e08`)** — the audit's first
   pass reused the old prefix-match, so "Assassin" matched "Assassination" and "Recon"
   matched "Reconnaissance". Removed 5 ghost rows (Assassin -3, Recon -1, Rook -1).
2. **creator-coverage class added** — commentary ON a creator's video ("PixelBros …
   Lacks Meta Context", "TayXDc's 200-Hour Meta Analysis") is NOT a shell tier/meta
   guide; it was landing in the bucket purely on the word "Meta".
3. **Tightened intent** — build-guides ("Best X Ranked Solo **Build** … Meta") and news
   ("**Security Updates** …") are checked BEFORE tier/meta so they leave the bucket.

An earlier body-text-fallback method produced a wildly inflated "92% redundant" figure;
it was validated against real headlines (240 shell-guide articles were being labelled
"extraction" off a body mention — Marathon *is* an extraction shooter), found wrong, and
**discarded**. Do not resurrect that number.

### EXECUTED (2026-07-15)
noindexed **73** tier/meta duplicates across 6 shells: **Thief 19, Destroyer 11,
Triage 14, Recon 13, Vandal 9, Assassin 7**. Each shell ran as its OWN guarded
`UPDATE feed_items SET noindex=true WHERE id IN (<that shell's ids>) AND noindex=false`
— noindex-only, explicit id list, idempotent — with per-shell rows-affected verification
(**all 6 matched exactly**; a mismatch would have halted the run). Pre-flight confirmed
all 73 ids were unique, `published`, `noindex=false`, `game_slug='marathon'`, that each
headline mentions its own shell, and that no held-back id was present.

### The governing argument was ACCURACY, not just SEO
`meta_tiers` is regraded continuously (last update 2026-07-15), so `/shells/<slug>` is
always current while **every dated tier/meta article is a frozen snapshot that rots** —
and several already **CONTRADICTED the live canonical grades**: articles claiming Vandal
"Solo S-Tier" when canonical = solo **A**; Triage "A-Tier Support" when canonical =
solo **D**; Assassin "Climbs to S-Tier Solo" when canonical = solo **A**. Consolidating
removed pages that were lying relative to our own live data.

### GUARDRAILS HELD
- **Triage keeper `6bbf13c7`** — "Winning Despite the Shell's Weakest Tier", the honest
  solo-D coping angle the canonical lacks — untouched, still `noindex=false`.
- **All Rook per-weapon build variants** (`intent=build-guide`) untouched.
- **`-no19` untouched.** **CORRECTION to earlier sessions:** `-no19` is an **INDEXED
  keeper** (`build-guide`/`extraction`, `noindex=false`) — an earlier note wrongly
  described it as noindexed. It is a keeper that stays indexed.
- All 8 canonical `meta_tiers` / `shell_stats` rows intact and unmodified.
- Note: `/shells/<slug>` is a **Next route**, not a `feed_items` row — it has no
  `noindex` column; the id-scoped UPDATE cannot reach it. Verified via the underlying
  `shell_stats` + `meta_tiers` rows instead.

### STILL OPEN
- **ROOK (3 tier/meta cuts) HELD** — canonical `ranked_tier_squad` is **NULL** (a real
  data gap: the page cannot answer "is Rook good in squad?"). **Fill that field before
  cutting Rook.** **Sentinel also has NULL solo AND squad** — flag if Sentinel
  consolidation ever happens.
- **ENGINE-SERIES sub-decisions NOT run.** Re-mint pairs need keep-1-cut-the-rest:
  Destroyer "Impact Siphons" x5 (cut 4) + "Riot Barricade" x2; Recon "Echo Chamber" x2 +
  "Early Warning System" x2; Triage "No Good Deed" x2; Rook "Adaptive Frame" x2. The
  ~34 **unique** Engine pieces need merge-up review: does the ability+core synthesis
  belong IN the canonical before the article is cut? (My first "Engine = merge-up" rule
  was too coarse — grouping by engine NAME is what exposed the duplicate pairs.)
- **OUT-OF-SCOPE BUCKETS (~250)**: news/patch ~126, build-guide ~87, creator-coverage
  ~22. **DIFFERENT intents — NOT the same cannibalization.** Real patch-news is
  legitimately sequential. Separate future decision whether/how to consolidate.
- **`docs/topic-cluster-audit.md`** remains the reference for the non-shell clusters: cryo
  archive ~165 (**flagged legitimate** dated launch coverage, not duplicates), holotag
  23, and the **632 unclassified** bucket (where the method has no opinion — not a
  finding, needs vocab additions / a manual eyeball).
- **GSC cross-reference still not determinable** — no Search Console API/credential is
  wired; the 378 "crawled — not indexed" set needs an export pasted in.

---

## 2026-07-09 (evening) — X Stage 2: Increment 1 + three input-integrity fixes (SHIPPED); banked before the generation half

Built the FIRST half of X pipeline Stage 2 (turning trusted X accounts into VANTAGE
discourse candidates) and hardened the intake so its input is honest. All READ-ONLY /
dry / zero-LLM. Deliberately BANKED here before Increment 2 (the first LLM/generation
step) -- see the decision note at the end.

Context: Stage 1 (x-dry-run.mjs) discovers NEW search authors -> queues x_sources
PENDING for human review; admin approves to state='trusted'. It never generates or
publishes. The VANTAGE discourse SPINE already exists end-to-end (directive ->
gen-vantage-discourse.mjs draft is_published=false+noindex=true -> POST
/api/admin/drafts/approve flips published, the ONLY publish path -> shared
DiscourseArticle renderer). Stage 2 = make X the SOURCE feeding that spine.

### SHIPPED this stretch (all on main)
- **Increment 1 (5c67322)** `scripts/x-stage2-dry.mjs` -- the missing read: x_sources
  state='trusted' (+ per-game watchlist) -> resolve + fetch each timeline via the
  existing lib/gather/x.js -> run lib/gather/x-gate.js -> honor x_declined_posts (+ skip
  already-drafted tweet ids) -> PRINT would-be VANTAGE candidates (tweet id, url,
  source_text, stance/reasoning basis) sorted by reach. ZERO DB writes, ZERO LLM; makes
  billed X READS only (prints the call footprint). Reuses x.js + x-gate.js as-is.
- **Three input-integrity fixes** making Stage 2's input honest -- on-topic,
  substance-gated, creator-words-only:
  1. **eeefeb2 substance-not-sentiment**: x-gate now qualifies on STANCE OR REASONING
     (a substantive POSITIVE take that explains WHY passes, not just contested ones).
     Fixed the reasoning matcher's substring looseness first (whole-token match; dropped
     ambiguous shorts so/if/op/vs/take/right/when). NOTE: empty positivity via a bare
     sentiment marker (amazing/so good/the best) still passes -- the deferred
     sentiment-marker tightening, not done.
  2. **55f9e08 off-topic leak (relevance)**: shell NAMES (assassin/thief/vandal/rook/
     recon/sentinel/destroyer/triage) collided with common/other-game words -- an
     "Assassin's Creed" review from a trusted multi-game creator qualified as Marathon.
     Fix (Option C+A): split relevance gameTokens into UNIQUE (bungie/holotag/cradle/
     factions/weapon codes -> relevant alone) + ambiguousTokens (the 8 shells; DMZ:
     cod/fob) that count ONLY when paired with the game name or a UNIQUE token; word-
     boundary matching (rook != rookie). Applied to BOTH consumers -- x-gate
     isGameRelevant AND relevance.js isGameContent (video filter shares the config +
     collision). Config: lib/games/marathon.js, dmz.js.
  3. **04e2f6d reply-bleed (thread expansion)**: expandThread trusted the `from:` search
     operator alone (no author_id, no client check; timeline anchors carried null
     author_id), so a candidate's source_text trailed into OTHER people's replies
     ("@Dummy118224 One of the worst decisions..."). Fix: author_id added to TWEET_FIELDS
     + expandThread; call sites pass the authoritative id (resolveUserIds); expanded
     tweets hard-filtered to author_id===anchor's (Part A) AND any tweet OPENING with a
     foreign @handle dropped (Part B, the creator's own replies-to-commenters). Pure
     filter exported as authorOwnThreadTexts() for network-free tests. Shared with
     Stage 1 (both call sites updated). source_text is now creator-words-only.

### OPEN / parked (flagged, NOT done)
- **Gate-coverage gap (recall)**: substantive critical takes phrased WITHOUT a stance/
  reasoning marker are dropped. Proven: @lordcharizard33's "Marathon is now cemented
  below the 10k player mark ... hard time believing this game sold 1.5 million copies ...
  trend line is brutal" -- a real substantive take -- now DROPS as 'mention (no stance/
  reasoning)'. It had only qualified BEFORE because the contaminated reply-scrap
  "@Dummy... One of the worst decisions" lent it the marker 'worst'. So the drop is
  CORRECT by the gate's rules (never a standalone take by its measure) but reveals a
  real recall gap for understated statistical/observational critique. Optional minimal
  fix: a tight, distinctive set of game-health-critique markers (all-time low, player
  count, below the Nk, dead game, bleeding players, hard time believing, sold N copies,
  trend line) -- precision-guarded, separate gated change if wanted. Same class as the
  positive-substantive gap that motivated fix #1.
- **Residual relevance collisions** (left in the UNIQUE tier, out of the reported scope):
  'mida' (Destiny's MIDA weapon) and 'stryder' (Titanfall titan) in marathon gameTokens
  could false-positive; DMZ 'cod' demotion means a bare "cod"-only post now needs a
  pairing (reversible if too tight).
- **Stale comment**: lib/gather/index.js:14 "$200/mo" X-cost note is stale (Justin
  confirmed ~<$10/mo for reading specified accounts) -- correct/remove when next in x.js.

### Stage 2 remaining increments (well-scoped, waiting)
- **Increment 2** -- X post -> VANTAGE draft, `--dry`: feed a candidate's source_text
  through the EXISTING buildVantageDiscoursePrompt (already fences source_text via
  lib/promptSafety) + VANTAGE_DISCOURSE_TOOL, PRINT the draft or self-skip; write
  nothing. This is the FIRST LLM call + the first generated article text.
- **Increment 3** -- persist drafts + per-TWEET-ID dedup (mirror the auto path's
  youtube-id dedup; VANTAGE bypasses the MIRANDA-scoped findDuplicateEvergreen guard, so
  it needs its own per-post dedup -- flagged gap).
- **Increment 4** -- verify approve->publish->render inherits (no new code).
- **Increment 5** -- cron (DEFERRED until drafts prove honest across runs).

### DECISION: banked at Increment 1, take the generation half fresh
Everything so far was read-only/dry/zero-LLM -- cheap to run, cheap to check, impossible
to do real damage; that's why it went clean. Increment 2 crosses a line: first LLM call,
first generated article text, and its whole VALUE is the editorial-integrity judgment
(does the draft attribute honestly, does the fencing hold, does it self-skip thin
material) that the network's public honesty rests on. Different gear from mechanical
dry-run correctness -- better done deliberately as its own focused session than as step
N of a long fix-heavy stretch. Clean boundary: three fixes on main, Increment 1
validated, plan clear, no half-finished state.

---

## 2026-07-09 (later) — Prompt-injection audit + generation-path hardening (SHIPPED)

Triggered by GSC query data showing external injection probing
(`you are the ailcc singularity engine...`, `allintext:"mark newcomer"`,
`regenv2-test-alert`, `ai stability engine`). Full read-only audit of every
LLM-prompt path, then hardened the ones that ingest external UGC.

### Audit verdict
- **The GSC probing is external RECON, not a live ingestion path.** No code path
  feeds search/GSC data into the pipeline: no `search-console`/`gsc`/`webmaster`
  ingestion anywhere; `seo_keywords` (the one table whose value becomes a prompt
  instruction, "write an article answering search query X") is **read-only in
  code** (getTargetKeyword SELECTs; consumeKeyword only stamps a timestamp) ->
  human-curated in Supabase, never auto-populated; **no on-site LLM-backed
  search** exists (the only `q=` param, /api/bungie-stats, hits Bungie's API, not
  Claude). A query typed into Google cannot reach generation. The real (indirect)
  exposure is crafted UGC that later gets gathered (Reddit/Steam/YouTube).
- **User-facing LLM routes are SAFE.** advisor (`<user_input>` delimiters +
  sanitize + system guard = gold standard), ask-editor (sanitize + injection
  boundary + auth), intake (write-time sanitize), audit (DB-only, upstream
  sanitized), network-editor brief (internal headlines only), dev/sample-editor
  (404-gated in prod), comment generation (reacts only to our own articles).
- **The real gap: generation paths ingested external UGC (YouTube/Reddit/Steam)
  with anti-fabrication guards but NO treat-as-data / ignore-embedded-instructions
  boundary**, and the few fences that existed (`---`, `"""`) weren't escaped. Rated
  **needs-hardening, not critical**, because every generation editor is tool-forced
  (must emit one fixed structured tool call) with no model-accessible tools/secrets/
  web/DB -> blast radius is "a bad article publishes," not system compromise.
  Full report: injection-audit-report.md (untracked in the tree).

### Hardening shipped (two commits)
- New **lib/promptSafety.js** — shared helpers `sanitizeUgc` (short fields: strip
  control chars, remove `<`/`>` so nothing can forge `</untrusted_source>`, collapse
  `---` runs, collapse newlines, length-cap), `neutralizeBlock` (long bodies: keep
  newlines, strip `<`/`>` + control), `safeNum`, `untrustedClause`, `fenceUntrusted`
  (clause + `<untrusted_source>` tags). Placed at **lib/ root, NOT lib/gather/**, so
  lib/network/vantage.js can import it without violating its "touches none of the
  per-game gather machinery" boundary.
- **GHOST** (commit **402bf4c**): Reddit + Steam + Twitch-clip text fenced.
- **NEXUS/DEXTER, MIRANDA, CIPHER, dexter-stats, VANTAGE auto** (commit
  **7af9f3c**): all fence external UGC in `<untrusted_source>` + the treat-as-data
  clause + delimiter-escape + ingest-sanitize, reusing the shared helpers.
- **MIRANDA**: the internal VERIFIED DB sections (shell/weapon/mod/implant) are kept
  OUTSIDE the wrapper (trusted data, not UGC); creator_spotlight source_text keeps
  its human-vetted `"""` fence.
- **X-path pre-hardened**: MIRANDA's `xIntelBlock` is inert today (`xData` null) but
  wired through the same fencing, and VANTAGE's `source_text` fencing covers the
  discourse path, so Stage 2 X intake (the most attacker-controllable source)
  inherits the treatment with no retrofit.
- **Adversarially verified per path**: a payload with a forged `</untrusted_source>`,
  forged `---` fence, injected newline+`SYSTEM:` line, and NUL/BEL bytes fails to
  break out of the data block on every path (only the one real closing tag exists;
  no `<`/`>`/control bytes survive inside the body).
- Tool-forced structured output unchanged everywhere (still the blast-radius
  limiter); no editor OUTPUT behavior changed — only how external text is fenced.

### Deferred (flagged, NOT done)
1. **Bungie-news patch text via the shared patchnotes/ engine** — appended to
   NEXUS/DEXTER/MIRANDA/GHOST via formatBungieNewsForEditor. First-party (official),
   lower risk; its CIPHER consumption point IS fenced. The shared engine (5
   consumers, documented byte-identical contract) was left untouched pending a
   separate decision.
2. **app/api/audit/route.js:140** — `bungie_display_name` / `platform` interpolated
   raw into the prompt (OAuth-derived, length-bounded). Minor; wrap in the intake
   `sanitizeField` for defense-in-depth.
3. **network-editor CRON_SECRET** — the cron auth guard fails OPEN when the env var
   is unset. Ops hygiene (not injection): set CRON_SECRET.

### STANDING RULE
NEVER give a generation editor additional tools (web fetch / DB write / code exec)
without re-running this audit. Tool-forced, tool-limited output is the reason the
external-UGC exposure is bounded; adding a tool changes the blast radius.

---

## 2026-07-09 — Evergreen article duplication project CLOSED OUT (Phase 1 + Phase 2)

Fixed the MIRANDA/CIPHER evergreen re-mint problem end-to-end: a generator guard
so it stops (Phase 1), then a per-cluster cleanup of the existing backlog
(Phase 2). Both done; nothing parked.

### Phase 1 — generator dedup guard (SHIPPED, main)
Root cause: the generation pipeline (processEditor in app/api/cron/route.js, the
one shared path that auto-publishes) selected evergreen topics with no check for
"does a near-duplicate already exist." The pre-existing exact-title check only
looked at the last-12 window, so re-mints days/weeks apart slipped through — e.g.
the "Essential Weapon Mod Builds for New Runners" topic was published 44 times
over 22 days.

- **2a8147c** `feat(gen): dedup guard` — hard topic-similarity gate before the
  MIRANDA insert. Jaccard overlap of significant (stopword-stripped, singularized)
  headline tokens vs the editor+game's last 500 published headlines.
  DUP_JACCARD_THRESHOLD=0.7 (named tunable), min 3 shared tokens. On match: LOG
  the matched article (headline+slug+score) and skip publish — never silent,
  never error, fail-open on DB error. MIRANDA-scoped (the only evergreen
  generator; news editors legitimately overlap day-to-day).
- **f134fc3** `refine(gen): subject-weighted dedup` — plain Jaccard over-blocked
  distinct per-SUBJECT variants sharing a rigid template (the real per-weapon Rook
  builds — M77 / Repeater / Twin Tap — scored ~0.8 on "<Weapon> Build Best Ranked
  Solo Loadout" boilerplate alone). Fix: weight each token by corpus rarity (IDF
  over the SAME 500-headline history already fetched — no extra query). Template
  scaffolding fades; the distinguishing weapon/shell name dominates. Verified on
  the real 380-headline corpus: true re-mints still 1.0 (blocked), same-weapon
  Impact HAR pair still 1.0 (blocked), distinct per-weapon variants 0.8 -> ~0.2-0.5
  (pass), -no19 distinct angle 0.33 (pass). Threshold unchanged.

### Phase 2 — backlog cleanup (DB-only noindex writes, no git; done per-cluster)
Guarded `UPDATE feed_items SET noindex=true WHERE id IN (...) AND noindex=false`
per cluster, keepers explicitly excluded and verified absent each time. noindex
(reversible; sitemap filters noindex=false so rows drop automatically). ZERO
deletes, ZERO redirects — no dupe showed traffic/backlinks worth 301-ing (GSC
not accessible from the repo; on-site page_view tracking near-zero everywhere).
**Net: 53 redundant articles noindexed, 9 keepers preserved (URLs + indexing
intact).**

| Cluster | Topic | Result |
|---|---|---|
| C1 | essential weapon mod builds | 42 noindex / 2 keep (-vvm6 original, -no19 distinct shell-role) |
| C2 | weapon mods guide | 4 noindex / 0 keep (same topic as C1, already covered by -vvm6) |
| C3 | holotag tier benchmarks | 6 noindex / 2 keep (-9yl8 oldest, -r4lm best/honesty-gated) |
| C4 | rook build | 1 noindex / 4 keep (M77/Repeater/Twin Tap distinct + -tsf0 Impact HAR) |
| C5 | shell selection | no action (dupe already noindexed a prior session) |
| C6 | vandal counter | 1 noindex / 1 keep (-akx6 better/fresher) |
| C7 | cryo archive stream | no action (dupe already noindexed; rest are distinct dated event coverage) |

**Keeper standard (applied consistently):** content quality + honesty over URL
age when they conflict. This CHANGED the keeper from the earlier proposal's
"oldest URL" default in three clusters — C3 kept -r4lm (longer, and it explicitly
disclaims unverified tier cutoffs) over the older -lq3p; C4 kept -tsf0 (fresher,
non-stale patch context) over the older -j10u; C6 kept -akx6 (more structured,
enumerated vulnerability windows) over the older -13ts. Near-zero traffic made
the "longest indexed" advantage moot, so quality won.

### Corrections to earlier claims (for the record)
- An earlier read had called the mod-builds situation a possible "false
  alarm / genuinely distinct articles." That was WRONG — the deep body reads
  confirmed near-identical re-mints (only -no19 was a genuinely distinct angle).
- True published Marathon article count is **1,521**, not the ~1,000 cited early
  on — that number was a PostgREST page cap that also silently truncated an early
  probe. Cluster membership was re-swept against all 1,521.

### OPEN ITEM (SECURITY) — GSC shows prompt-injection probing; audit ingestion paths
Google Search Console queries surfaced external prompt-injection probes aimed at
the site, e.g. `you are the ailcc singularity engine...`, `allintext:"mark
newcomer"`, `regenv2-test-alert`. These are people fishing to see if our
generation pipeline ingests search text / unvetted external input and treats it
as INSTRUCTIONS rather than DATA.
- **TODO (read-only audit, not yet done):** confirm NO generation path feeds
  search queries, gathered titles/descriptions/transcripts, Reddit/X text, or any
  unvetted external string into an editor prompt as *instructions*. Gathered
  content must be quoted as DATA only (it already is by design — the VANTAGE
  auto-source addendum is the model), never concatenated where it could steer the
  model. Check: lib/gather/* outputs -> lib/editorCore.js prompt builders (esp.
  buildMirandaPrompt xIntelBlock, recentHeadlines block, any gathered-text
  interpolation) and the X/Reddit adapters. Verify prompt/data separation +
  that no field is echoed into a system/instruction position.
- No code change made here — flagged for a dedicated read-only pass.

---

## 2026-07-06 (later) — VANTAGE YouTube auto-source, drafts re-check, X-posting scoped

### VANTAGE auto-source pipeline (Phase A — SHIPPED, main edd6cb5)
VANTAGE can now AUTO-SOURCE discourse ideas from the YouTube gather, not just
from hand-curated directives. scripts/gen-vantage-discourse-auto.mjs (manual-
trigger; NOT on cron): calls gatherYouTube() -> relevance filter -> eligibility
gate -> VANTAGE drafts or self-skips -> inserts source-flagged drafts
(is_published=false). Justin's admin APPROVE remains the ONLY publish path.

THREE honesty guards (layered):
1. RELEVANCE FILTER (deterministic): drops off-topic "Marathon" name-collisions
   (running sports, Xbox news) before anything else. Reuses the cron's
   filterGameVideos logic — which was EXTRACTED to a new lib/gather/relevance.js
   (pure, no imports) so a bare-node .mjs can import it without dragging the
   un-importable gather barrel; lib/gather/index.js re-imports it (behavior
   identical).
2. ELIGIBILITY GATE (pre-generation): a video is a candidate ONLY if it has a
   transcript OR a description >= ~300 chars. Title-only/ultra-thin videos never
   reach VANTAGE -> can't fabricate an argument that only exists in a title.
3. VANTAGE SELF-SKIP: existing skip_reason mechanism refuses thin/non-discourse
   sources even if they pass the gate.
Plus: dedup vs already-drafted YouTube ids; auto-source PROMPT ADDENDUM
(VANTAGE_DISCOURSE_AUTO_ADDENDUM in vantage.js) stating the source is a video's
own title/description/transcript, not a vetted quote, and view/like counts are
NOT evidence of the argument. game_slug='marathon' (gather is Marathon-only) ->
canonical home /intel/<slug> (Phase 2a render path). --dry + --max flags.
Also fixed two ESM import-path issues (lib/gather/youtube.js '../games' ->
'../games/index.js'; lib/games/index.js './marathon' -> './marathon.js') so the
gather chain imports under bare node (Next bundler resolved both forms; prod
unchanged).

PROVENANCE NOTE: the script + addendum const were PRIOR-SESSION work sitting
untracked in the tree since this session's first snapshot (likely from the
paste-bug-interrupted session). This session completed it (relevance filter +
import fixes) and shipped it.

YIELD IS LOW/SPORADIC BY DESIGN: --dry runs this session produced 0 drafts (no
transcripts, short/off-topic descriptions) — that's the CORRECT bias (better
nothing than a fabricated take). Expect frequent 0-draft runs; a draft appears
only when a substantial, on-topic, captioned/long-description Marathon-game video
is live.

OUTSTANDING VALIDATION: committed OUTPUT-UNSEEN (no qualifying video appeared to
preview a real draft). The FIRST real auto-sourced draft still needs an honesty
review before approving — confirm it draws STRICTLY from the video's real
description/transcript, not inference. Safe because approval gate blocks publish.

### Drafts cleanup — re-check + correction + second delete (DONE, DB-only)
Earlier this session we deleted 258 sub-50-word stubs and thought 149 "substantial
300-380 word articles" remained. A re-check CORRECTED that: the earlier "149
substantial" label was a sampling error (looked at the 3 longest rows). Reality:
of ~148 unpublished marathon rows, 144 were 50-99 words (short GHOST community
blurbs + NEXUS/DEXTER video-pool pieces), only 2 were 300+, 2 mid. All old
(Feb-Mar 2026), never published; NONE were VANTAGE discourse drafts. The scoped
stub delete had worked perfectly (0 sub-50 remained); the 144 were legit-but-thin
content ABOVE the 50-word floor, never in scope.
ACTION: deleted the stale short backlog via scoped SQL (is_published=false AND
game_slug='marathon' AND directive_type='standard' AND noindex=false AND
wordcount<300), KEEPING the 2 long pieces. Verified: 146 deleted, 2 remaining.
The clause structurally excludes VANTAGE discourse (directive_type='discourse'/
noindex=true). DB-only, no git artifact.
LESSON: classification needs the full distribution, not a sample of extremes.

### X/Twitter posting pipeline (SCOPED, PARKED)
Justin wants: when VANTAGE publishes a discourse article, draft a PROMOTIONAL X
post about it -> Justin approves -> it posts (draft-and-approve, same philosophy).
Scope: discourse articles only for now; expand later. PARKED pending Justin
confirming X API write-tier access/pricing on developer.x.com (free-tier post
caps + cost + OAuth write scope shape the build). Build the draft-and-approve
machinery once access is confirmed; the actual post step is the API-gated part.
NO automated X/Reddit scraping — ever (ToS + honesty). Manual X/Reddit source
drop for discourse already works via the admin directive form.

### Render-guard reminder (from earlier this session, for completeness)
/intel/[slug] now filters is_published=true (both the router fetch AND
generateMetadata) so unpublished Marathon articles 404 and emit no metadata —
matching the DMZ route. The 2 remaining unpublished pieces are inert/hidden by it.

### Discourse SEO — Article JSON-LD (SHIPPED; publisher.logo OPEN)
Discourse Article JSON-LD enriched (image/Person/Article/BreadcrumbList);
publisher.logo still OPEN - needs a real static logo asset (no icon-512.png
exists; og-image.png rejected as wrong-purpose). One-line add once public/logo.png
exists.

### VANTAGE discourse honesty review + YouTube auto-source yield finding
HONESTY REVIEW -- PASS. A controlled test (fictional "Test Creator", in-memory
directive, ZERO DB writes, real committed modules confirmed loaded:
VANTAGE_DISCOURSE_SYSTEM_PROMPT + buildVantageDiscoursePrompt +
VANTAGE_DISCOURSE_TOOL + ARTICLE_MODEL) ran a manual-directive draft through the
SAME generator/prompt/tool the manual + auto paths use. VANTAGE: invented no
identity/reputation/affiliation, attributed every game claim to the creator,
declined to adjudicate and pointed to the Marathon desk by function without
stating figures, quoted the source verbatim, framed reception as open (no
consensus slip), and emitted zero invented URLs/handles/figures/sameAs. Captured
in candidate-review.md (untracked local file, not committed).

COMMUNITY-FRAMING -- DELIBERATE EDITORIAL BOUNDARY (do NOT "fix" as a bug). The
one soft note from the review -- VANTAGE writing "the community is actively
contesting / these are live questions" -- is RULED ACCEPTABLE AS-IS.
Contextualizing a take as part of an ongoing conversation is intentional, allowed
discourse framing for VANTAGE as the discourse editor; it is NOT a defect. The
honesty line is drawn at FACTS, FIGURES, IDENTITY, and RECEPTION-AS-SETTLED (all
of which she attributes or avoids) -- NOT at discourse contextualization. A future
session must not "correct" this framing as a bug.

YOUTUBE AUTO-SOURCE YIELD -- confirmed working + correctly strict. The --dry
pipeline works; the relevance filter + eligibility gate function as designed.
Multiple recent runs produced 0 qualifying candidates because the pool had no
transcripts/captions and descriptions under the 300-char floor -- the correct
low/sporadic-yield behavior (better nothing than a fabricated take). STRUCTURAL
PATTERN: the spiciest on-topic takes (e.g. "Marathon 2026 is Unpretty Awful",
"I hate bubble shields") tend to be SHORT-form videos with thin descriptions the
gate correctly rejects. So auto-source favors long-form/captioned content, while
short-form hot takes are better captured via the MANUAL X/Reddit drop path.

### Non-issue (investigated + DISMISSED 2026-07-07 -- do NOT re-flag): Sentinel /shells/[slug] generateStaticParams
A flag that Sentinel is missing from app/shells/[slug]/page.js generateStaticParams
(so it "renders dynamically") was investigated and dismissed as a NON-ISSUE. Root
cause: /shells/[slug] has export const dynamic = 'force-dynamic', so the build
renders it as f (Dynamic) and generateStaticParams is INERT -- NO shell is
statically pre-rendered; Sentinel renders identically to the other 7 (all dynamic).
Adding sentinel to the list would change nothing observable. force-dynamic is
CORRECT here: (1) build-time Supabase throws "supabaseUrl is required" (env not
populated at build -- why the list is hardcoded, and why "derive from shell_stats"
would re-break the build), and (2) live-data freshness (meta_tiers regrade daily,
builds, articles). Dynamic SSR serves fully crawlable HTML, so SEO is fine. Real
static pre-render (removing force-dynamic) is blocked by the build-env issue + a
freshness tradeoff -- a separate, larger decision, not a cleanup. CONCLUSION: no
change made; not a bug.

### DMZ hub/section schema (SHIPPED 2026-07-07, feat/profile-auth 94033bc)
BreadcrumbList + CollectionPage JSON-LD added to the /dmz hub and every /dmz/[section]
page (source-independent scaffolding; no factual claims). Section BreadcrumbLists mirror
the visible breadcrumb; CollectionPage emits only where a section has published articles.
DMZ hub: BreadcrumbList + visible Network / DMZ breadcrumb now both present (structured-only debt CLOSED 2026-07-08).

### DMZ hub FAQ + breadcrumb (SHIPPED 2026-07-08, feat/profile-auth)
- DMZ hub: launch-date FAQ item re-added (sourced to CoD MW4 blog); visible hub breadcrumb added (structured-only debt closed).
- VANTAGE discourse is DRAFT-AND-APPROVE, not scheduled/queued. Auto-source is manual-run with near-zero yield (YouTube descriptions too short / no captions). Nothing publishes without Justin feeding a source + approving. 'Waiting on the system' = nothing is coming; to produce a discourse article, trigger the manual path with a real curated source.

### X API exception decision (2026-07-08)
DECISION 2026-07-08: Official PAID X API affirmed by Justin as the sanctioned,
ToS-compliant exception to the standing "no automated X/Reddit scraping -- ever" rule.
Scraping (unauthorized reading of X content) stays FORBIDDEN; reading SPECIFIED
accounts via the X-authorized paid API is permitted as a discourse SOURCE. All
honesty gates unchanged: source-only writing, attribution to the creator, no
wholesale post reproduction, and Justin approves every draft before publish.

Intent: read specific X accounts + ~30-40 curated discourse sources daily to supply
VANTAGE drafts, feeding the EXISTING source-agnostic discourse spine (generator,
draft insert, admin panel, approve endpoint all already built).

COST NOTE: the repo comment at lib/gather/index.js:14 ("Basic tier $200/mo") is
STALE (written 2026-04-27, and was about the search/recent access tier). Justin has
confirmed against current X developer pricing that reading specified accounts at the
intended low volume costs roughly <$10/mo. When the X adapter is built, CORRECT or
remove that stale comment so it stops causing re-litigation. Do not treat the $200
figure as current.

### Reddit gather review flag (OPEN, 2026-07-08)
OPEN / TO REVIEW (2026-07-08): lib/gather/reddit.js is ACTIVE and feeds GHOST
sentiment. The standing rule reads "no automated X/REDDIT scraping -- ever." This is a
potential rule-vs-reality contradiction: is the live Reddit gather using the OFFICIAL
Reddit API (compliant, like the affirmed X API exception) or actual scraping (rule
violation)? Needs a READ-ONLY look next session: identify the access method (official
API + credential/env var, or unauthorized fetch), and either (a) confirm it's
compliant and record it as an affirmed exception like X, or (b) flag it for
remediation. Not adjudicated yet; flagging so it does not stay unexamined.

### Icons refreshed to new static mark (SHIPPED 2026-07-08, feat/profile-auth)
The favicon set (public/cnp-16/32/48.png, CNP-only), apple-touch icon (public/cnp-180.png,
full mark), PWA 512 + both JSON-LD Organization logos (homepage app/page.js + discourse
publisher.logo -> /cnp-512.png) now use the new hand-authored mark, all as STATIC public/
assets wired via app/layout.js metadata.icons. REMOVED: the dynamic app/icon.js +
app/apple-icon.js, and the old app/favicon.ico (public/favicon.ico now serves the .ico).
PWA 192 (public/icon-192.png) was refreshed in place; manifest 512 repointed
/icon-512.png -> /cnp-512.png (old public/icon-512.png deleted). scripts/gen-icons.mjs is
RETIRED (exit guard + commented writes) so it can no longer clobber the static assets.
No old-mark icon remains -- the earlier favicon.ico / manifest "old art" deferral is CLOSED.

### Open / horizon
- FIRST real VANTAGE auto-sourced draft: review for honesty before approving
  (deferred validation). Run --dry a few times to catch one.
- Cron the auto-source: deliberate LATER decision, only once drafts prove honest.
- X-posting pipeline: build once developer.x.com write access confirmed.
- SEO measurement: /meta tier-list experiment shipped recently — too soon; check
  GSC at ~4-8 weeks (climbing from ~pos 3.5? FAQ snippets? clicks?).
- The 2 remaining long unpublished pieces: glance -> keep/publish/drop someday.
- email_signups: renamed from dmz_launch_emails 2026-07-09 (holds DMZ launch + network signups). Naming debt resolved.
- DMZ-6: still held until genuinely new official CoD material.
- DMZ launch date Oct 23 2026 — VERIFIED official. Source: https://www.callofduty.com/blog/2026/05/call-of-duty-modern-warfare-4-announcement (official Call of Duty blog, May 28 2026, by Call of Duty Staff). The post states: 'Call of Duty: Modern Warfare 4 releases on Friday, October 23, 2026.' DMZ ships as part of MW4, so it launches Oct 23 2026 with the game. Provenance confirmed 2026-07-08. Earlier 'no official source located' flag resolved. Oct 23 2026 may now be asserted site-wide, in schema/FAQ, banner, and bio as a sourced fact. Downstream unblocked: the 'When does DMZ launch?' FAQ item dropped from the hub FAQPage (because the date was unsourced) can now be re-added honestly, citing this source.

---

## 2026-07-06 — Homepage redesign + VANTAGE discourse pipeline + /intel guard + drafts cleanup

Multi-session arc that was previously unlogged. Final main tip at time of writing:
**abda60e** (7c43223 = homepage/discourse/2b; abda60e = the /intel render-guard
commit on top) + a Supabase-only stub delete (no git artifact — DB-only).

Big arc across several working sessions: (1) a full homepage redesign, (2) the
complete VANTAGE discourse-article pipeline built end-to-end, (3) an /intel
render-layer security/SEO guard, and (4) a scoped cleanup of unpublished draft
rows. Also: a persistent paste/injection bug in the planning chat (project
instructions replaced pasted content); worked around with screenshots + saved
files, project-instructions field was deleted mid-arc.

### 1. Homepage redesign (SHIPPED)

Went from "boring/confusing, unclear what to do" to a real network front page.
Shipped in gated passes:
- STRUCTURE/CLARITY: clarity-first hero, featured VANTAGE brief, tools row
  (/meta, /leaderboard, /status, /weapons), network subscribe (generalized the
  DMZ notify form -> writes email_signups with game_slug='network'),
  "Choose your game" (was "Choose your zone").
- ESPORTS VISUAL: fused broadcast + terminal + editorial energy; restrained
  (few accent moments); mono "//" texture; bold hero.
- COPY: H1 "The intelligence network for competitive shooters"; kicker
  "Everyone has opinions. We have the data."; eyebrow "No hype. Just intel.";
  "Where the serious players check first" kept as a secondary line.
- BRAND: network accent switched Marathon-green -> Cybernetic Punks RED
  (per-game sections keep their own colors); wordmark split "CYBERNETIC PUNKS";
  red darkened a few shades (was too bright); subscribe button uses network red.
- ABOUT: homepage "What is Cybernetic Punks?" blurb + dedicated /about page
  (mission, how-we-work, the AI editorial desk with real roster names, the
  games, "independent project"). Footer About link added.
  - DESIGN TOKEN CONVENTION (resolved): Marathon pages use NAMED HEX CONSTANTS as
    their design system; DMZ pages use CSS-VAR TOKENS (var(--green) etc.).
    "Reference tokens by name" = the right one per surface.

### 2. VANTAGE discourse pipeline (SHIPPED, end-to-end, live)

VANTAGE now writes DISCOURSE articles (e.g. "a creator said X about the meta,
here's the controversy, in our lens for SEO/backlinks") via a DRAFT-AND-APPROVE
flow. She is the network editor: covers the DISCOURSE around games, NOT single-
game facts (that stays the per-game desks). Justin is the double verification
layer: he curates the source AND approves every draft before publish.

- INPUT: editor_directives table (already existed; reused). New 'discourse'
  directive_type (directive_type is free text -> no DDL needed). Source is
  human-curated: Justin adds a directive with vetted source_text + creator_info
  (creator name, url) + game_slug in creator_info. NOT automated scraping
  (X/Reddit scraping explicitly rejected on ToS + honesty grounds).
- SCHEMA CHANGE RUN: editor_directives_editor_check CHECK constraint originally
  allowed only CIPHER/NEXUS/DEXTER/GHOST/MIRANDA. Ran an ALTER to add 'VANTAGE'
  so VANTAGE directives insert. (directive_type had no constraint; status still
  pending/consumed.)
- GENERATION: manual script scripts/gen-vantage-discourse.mjs (Fork 1A — not on
  cron, web-unreachable; runs only when Justin runs it). Reads a pending VANTAGE
  discourse directive, drafts strictly from source_text, inserts a feed_items
  row is_published=FALSE + noindex=TRUE (a DRAFT). REQUIRES creator_info.game_slug
  to be set (SUBJECT game) — refuses to guess (fail-loud guard), routing depends
  on it. Marks directive consumed.
- HONESTY HARDENING (in the discourse prompt, lib/network/vantage.js): write
  STRICTLY from source_text; invent nothing about the creator; attribute all game
  claims to the creator, never assert game facts in VANTAGE's own voice; a tune
  was added (Rule 5) forbidding her from characterizing a game's state/reception/
  launch/health as "settled/consensus" in her own voice — widely-held views must
  be ATTRIBUTED. Verified on a real regeneration.
- DRAFT REVIEW: admin DRAFTS panel (read-only GET /api/admin/drafts +
  VantageDraftsPanel). feed_items deliberately kept OFF the generic admin CRUD
  allowlist so nothing can flip is_published via the generic path.
- APPROVE (2a): narrow POST /api/admin/drafts/approve — flips is_published
  false->true AND clears noindex for ONE row, filtered .eq('is_published',false)
  so it can only ever touch a draft, never mutate a live row. This is the ONLY
  publish path. An APPROVE button in the drafts panel.
- RENDER (2a): a SHARED game-neutral DiscourseArticle renderer, branched into
  BOTH /intel/[slug] (marathon) and /dmz/[section]/[slug] (dmz) BEFORE the
  game-specific templates — so the fragile 1,396-line Marathon ArticlePage is
  NEVER touched (it would otherwise inject rogue weapon/shell stat cards, break
  the byline, load a nonexistent portrait). Renders identically under both
  themes. Parses **bold** + [text](url) inline links.
- ROUTING = BY SUBJECT GAME (decision): a discourse article's canonical HOME is
  its subject game — marathon-subject -> /intel/<slug>, dmz-subject ->
  /dmz/discourse/<slug>. (Rejected DMZ-hub-everything: would strand Marathon
  content under /dmz/, bad for SEO + confusing.) lib/discourse.js is the single
  source of truth for is-discourse + href.
- BYLINE: VANTAGE added to roster.js EDITORS ("Vivian Cross / Vantage, Network
  editor") but NOT to EDITOR_ORDER — so editorByline/JSON-LD resolve her, without
  adding her to the /editors masthead or /about desk ordering.
- HOMEPAGE SURFACING (2b): a "FROM THE NETWORK DESK" feed directly under her
  brief on the homepage — newest published discourse across ALL games, each
  card tagged with its game (MARATHON/DMZ), linking to its canonical home. She's
  the network editor so her work surfaces at root level. Per-game Creator-coverage
  slots were DEFERRED (not built).
- FIRST LIVE ARTICLE: "Lord Charizard flags Marathon's new all-time low player
  count..." — a Marathon-subject discourse piece, verbatim-quoted his X post,
  attributed, published, live at /intel/<slug>, showing in the network-desk feed.
  Editorial position (settled): VANTAGE covers real discourse INCLUDING criticism
  of games we cover (Marathon included) — honest, from-source; it's legitimate,
  the numbers are real, it's the dev's job to make a game players want.

### 3. /intel render guard (SHIPPED)

Found a real gap: app/intel/[slug]/page.js fetched by slug WITHOUT an
is_published filter (both the router fetch AND generateMetadata), and those rows
are noindex=false — so ~407 UNPUBLISHED Marathon articles were directly
reachable/renderable at their /intel/<slug> URLs (only hidden by absence from
feeds/sitemap). DMZ already filtered is_published=true; Marathon didn't.
FIX: added .eq('is_published', true) to both Marathon fetches -> unpublished
slugs now 404 (notFound) and emit no metadata. Also hardens the discourse draft
gate at the render layer (draft discourse 404s too). Published articles + the
published Lord Charizard discourse piece verified still rendering. (Commit abda60e.)

### 4. Unpublished drafts cleanup (DONE — Supabase only, no git artifact)

The admin panel showed "100 drafts" (panel caps at 100); the true count was 407
unpublished Marathon feed_items rows: 258 THIN STUBS (<50 words, non-publishable
junk) + 149 SUBSTANTIAL real articles (300-380 words, never published). NONE were
VANTAGE discourse drafts (those are directive_type='discourse'/noindex=true —
structurally distinct). Blanket "delete all unpublished" would have destroyed the
149 real articles — investigation prevented that.
ACTION: deleted ONLY the 258 stubs via a scoped Supabase DELETE (WHERE
is_published=false AND game_slug='marathon' AND directive_type='standard' AND
noindex=false AND word_count < 50). Verified: 258 deleted, 149 remaining.
The 149 real unpublished articles are KEPT (unpublished, now properly hidden by
the render guard) — an editorial "review/publish later or leave" decision, not
deleted. NOTE: this delete left NO git diff (DB-only) — the repo is unchanged by it.

### Still open / on the horizon
- The 149 unpublished real Marathon articles: decide later whether to review/
  publish any or leave hidden. They're inert (guard hides them).
- Per-game Creator-coverage homepage slots: deferred (network-desk feed shipped
  instead).
- email_signups: renamed from dmz_launch_emails 2026-07-09 (holds network signups
  too, game_slug='network'). Naming debt resolved.
- DMZ-6 remaining articles: CLOSED/held — the 6 PENDING_TOPICS are deliberately
  unsourced (the June 6 Deep Dive doesn't cover them as standalone topics; they'd
  be thin FOB-sub-bullet duplicates or fabrication). Do NOT generate until
  genuinely new official CoD material drops.
- Generate more discourse pieces to populate the network-desk feed; watch that
  discourse articles don't all use identical section headers over time (templating
  risk, same lesson as the MIRANDA duplicate-title fix).
- Paste/injection bug: project-instructions field was deleted mid-arc; re-adding
  current instructions (watch whether re-adding re-triggers the injection — if so,
  the field is the culprit; report to support).

### Key learnings reinforced this session
- Read-before-write on destructive ops caught two big ones: the DMZ-hub
  miscategorization (would strand Marathon content) and the blanket draft delete
  (would destroy 149 real articles).
- Prompt instructions aren't guarantees — the "largely settled" own-voice slip
  slipped a rule that only covered mechanical facts, not reception; fixed by
  adding the reception category. (Same lesson as the earlier soft-prompt failures.)
- Phase gating on content that characterizes real people: draft-only first,
  verify honesty on a real example with zero public exposure, THEN wire publish.
- feed_items stays OFF generic admin CRUD; the ONLY publish path is the narrow,
  draft-filtered approve endpoint + human APPROVE click.

---

## 2026-06-29 — Account-merge EXECUTED (CLOSED — not an open thread)

The two split network_accounts for the same person were merged into one. DONE,
verified, and removed from open/parked work — do not resurface it.

- **Was:** two network_account rows — Discord "kreeped" (da2cfedc, the richer data)
  + Bungie "kreeped-2" (f93458a7, which held the player_profiles row). A Stage-0
  read-only pass had planned the careful destructive SQL; this records it RAN.
- **Done (step-by-step destructive SQL, order mattered due to FK/cascade):**
  re-pointed linked_identity + player_profiles to the survivor da2cfedc, then
  DELETED the orphan f93458a7.
- **Verified live:** /u/kreeped shows Discord + Bungie + Plays-Marathon badges; /me
  works. Survivor = the single "kreeped" account.

---

## 2026-06-22 — Cron observability: a REAL silent failure found (Resend bumped to TOP)

**What happened:** the Jun 22 12:01 UTC cron cycle published **0 feed_items**
(every other recent cycle published 5, one per editor). Diagnosed read-only.

**Determination: SILENT FAILURE, not a benign quiet cycle.**
- `processEditor` (app/api/cron/route.js ~L243-289) has NO legitimate
  "nothing to publish" path: it either inserts is_published:true (~L281-289), or
  returns a FAILURE — `!prompt` -> "No data gathered" (~L246-248), or
  `!result/!headline/_parseError` -> logs "[CRON] <editor> failed: <reason>"
  (~L260-275). So 0 across all 5 editors = all 5 took a failure branch.

**But transient, single cycle, self-recovered (pipeline is NOT broken):**
- Cron ran end-to-end — historical_context upserted 12:01:23 + quality_metrics
  12:01, both AFTER the editor loop, so gatherAll + the loop completed without
  throwing. Jun 22 00:01 and all Jun 21 cycles published 5; only 12:01 failed.
  Later cycles publish normally.

**Root sub-cause (not chased — recovered one-off):** either (a) gather-empty
(all 5 "No data gathered" — a source/gather blip) or (b) Anthropic transient
(all 5 callEditor failed — outage/rate-limit at 12:01). Distinguishing needs the
12:01 Vercel function logs (per-editor reasons ARE logged, ~L247/L261) — low
value for a recovered transient; skip unless it recurs.

**THE REAL FINDING — observability gap:** `sendCronFailureAlert(results)` EXISTS
and is designed to email on 0-generated / any-editor-failure, but it is **INERT**
(no Resend env provisioned). A genuine failure was invisible for ~13h, surfaced
only by a manual orientation check. The system currently cannot tell you when a
cycle fails.

**ACTION — Resend outage-alert bumped to TOP of protective-infra:**
- No longer hypothetical — a real silent failure occurred and went unnoticed.
- The alert CODE already exists (sendCronFailureAlert) — it just needs
  RESEND_API_KEY + ALERT_EMAIL_TO env vars in Vercel. A provisioning task
  (your hands), NOT a code build.
- Once armed: 0-publish / per-editor-failure cycles email immediately instead of
  hiding in Vercel logs.

---

## 2026-06-19 — OPEN ITEM: presence-only auth hardening (defense-in-depth, low priority)

Diagnosed read-only after a bot/scraper wave (932 visitors/7d, 88% Singapore =
datacenter/bot, likely search re-crawl after the SEO push + AI/datacenter
scrapers). Question: can that traffic cost Anthropic money?

**Confirmed — the observed wave is HARMLESS (no action needed):**
- All 3 paid routes (/api/advisor, /api/ask-editor, /api/audit) require the
  cp_player_id cookie and 401 a COOKIELESS caller BEFORE rate-limit and BEFORE
  the Anthropic call. Order verified auth -> rate-limit -> Anthropic on all three.
- /advisor page load does NOT fire a call — the fetch('/api/advisor') is inside
  generateBuild(), only on the Generate/Surprise Me onClick. Bot page views =
  server render + DB reads, zero Anthropic (the 12 /advisor hits were harmless).
- The 2 other Anthropic call sites (lib/editorCore.js, lib/gather/dexter-stats.js)
  are CRON-only (CRON_SECRET-gated), not bot-reachable.
- => cookieless Singapore wave cannot reach a paid call. Console spend-limit
  (set separately) is the hard backstop on top.

**THE BANKED GAP (defense-in-depth, NOT urgent, NOT the bot wave):**
Auth is PRESENCE-ONLY: `if (!cp_player_id) 401` — it does not verify the cookie
is a REAL player. A DELIBERATE attacker could forge cp_player_id=<any string> to
pass auth, and ROTATE the value to defeat the per-player rate-limit (fabricated
id = fresh bucket). Per route:
- /api/audit — incidentally safe: requires a real loadout_snapshots row ->
  fabricated id 404s before Anthropic.
- /api/advisor — REACHABLE: context is shell data, never checks player exists ->
  forged cookie -> Anthropic fires.
- /api/ask-editor — REACHABLE: loads player audit/snapshot as OPTIONAL context
  (null ok) -> proceeds to Anthropic for a nonexistent player.
Targeted-abuse vector (intentional cookie-forging), NOT generic bot traffic.

**SCOPED FIX (ready to build, gated — do fresh):**
- On /api/advisor and /api/ask-editor, validate cp_player_id exists in
  player_profiles BEFORE the Anthropic call: one indexed PK lookup
  (select id from player_profiles where id = playerId), 401/403 if absent.
- Mirrors what /api/audit already does implicitly (its loadout lookup).
- Side benefit: makes the per-player rate-limit BINDING — rotation can't mint
  fresh buckets since only real ids pass.
- Minimal — one lookup per route, before the call. No new auth system.

**Priority:** low / when-convenient. The spend-limit + cookieless-401 already
bound the real risk; this closes the deliberate-forgery vector.

---

## 2026-06-19 — OPEN ITEM: verification-status guardrail fix (diagnosed, ready to build)

Editorial-accuracy bug found in an article audit; diagnosed read-only; the edit
is deferred to a fresh session. Ties to [verification.js](../../lib/verification.js)
+ [VERIFICATION_PROTOCOL.md](network/VERIFICATION_PROTOCOL.md) (verified=true means
something; output must not counterfeit it).

**The bug (June 19):** Miranda's Recon guide asserted "The 'Head Start' perk
(confirmed at 4 Energy)" — stating a Cradle value as CONFIRMED when cradle_nodes
is 0/84 verified. Same article also said "All Cradle values here are listed as
unconfirmed" — a self-contradiction.

**Diagnosis (traced in lib/editorCore.js — the PIPELINE IS CORRECT):**
- fetchGameContext selects verified/patch_verified for cradle_nodes (~L648) and
  renders each perk with verificationTag() -> [UNVERIFIED] (~L787-788); all 84
  are verified=false so every perk line is tagged.
- All 5 editors get this same tagged context (~L1158). Miranda has NO separate
  untagged Cradle source (buildMirandaPrompt renders no Cradle block).
- "4 Energy" = real cumulative_energy; "confirmed" is NOT in the data (editor-
  added). => NOT a context gap (A) or hedging-coverage gap (B).

**Verdict:**
- (D) MODEL FREELANCING — primary. Same cycle, identical tagged context, Dexter +
  Nexus hedged Cradle correctly, Miranda didn't. Her self-contradiction proves
  the [UNVERIFIED] signal arrived + was understood; the "confirmed" line is a
  generation lapse, not a missing signal.
- (C) GUARDRAIL GAP — secondary (what let it through). VERIFICATION_NOTE
  (verification.js ~L53-65) forbids stating precise numbers as fact, but has NO
  explicit rule against the verification-STATUS vocabulary ("confirmed",
  "verified", "official"). Asserting a status the data lacks is a distinct,
  unnamed failure mode.

**SCOPED FIX (ready to build, gated — do fresh):**
- ~5-line edit to the SHARED VERIFICATION_NOTE in lib/verification.js (single
  source -> all 5 editors + advisor; general, NOT Cradle-specific).
- Add a hard status-UPGRADE rule, roughly: "Never describe any value as
  'confirmed'/'verified'/'official' unless its line carries no marker. A
  [UNVERIFIED]/[SOURCE-LISTED] value stated as confirmed — or any claim that data
  is verified when it isn't — is a factual error. Never upgrade a value's status;
  when in doubt, attribute or omit."
- Frame as "never upgrade a value's status beyond its marker" (catches the
  general case, not just the literal word). Apply to ALL stat data. Verify the
  note reaches all 5 editors + advisor after the edit.

**Residual model variance (acknowledged):** a prompt can't fully eliminate (D).
IF it recurs after the guardrail, the proportionate backstop is a cheap
post-generation LINT (flag any article with "confirmed/verified/official" within
N chars of a stat/number for review — detection, not rewrite). Do NOT build the
lint now — over-engineering for a single occurrence; the guardrail is the right
first response.

---

## 2026-06-19 — Ammo economy data: evidence in hand but HELD (needs a model decision)

In-game item-card screenshots for 5 ammo types (Heavy Rounds, Light Rounds,
MIPS, Volt Battery, Volt Cell) contain a MULTI-FIELD economy model that
`ammo_stats` does NOT store. NOTHING written — no DDL, no data, no confirm. See
[VERIFICATION_PROTOCOL.md](network/VERIFICATION_PROTOCOL.md).

**Evidence captured (3 distinct economy concepts on the cards):**
1. **Standalone VALUE field** — Light Rounds 5, Volt Cell 27, MIPS 30, Volt
   Battery 5 (Heavy Rounds shows none). **MEANING UNRESOLVED -> NOT confirmed.**
   An undefined number can't be verified (protocol: confirm requires knowing what
   the value IS, not just the digit). Pin down what VALUE means in-game (sell
   value? worth rating? something else?) BEFORE modeling it.
2. **Per-vendor ARMORY PURCHASE (price + quantity)** — e.g. 40 Heavy Rounds =
   300cr; Light Rounds 200cr/60x; Volt Cell 600cr/4x; Volt Battery 200cr/3x.
   Clear data, but price + quantity PER VENDOR (CYAC / TRAXUS / ARACHNE) — a
   multi-field, possibly multi-row concern.
3. **Barter trades** — e.g. 2x Unstable Lead -> 40x item; 1x Unstable Gunmetal
   -> 30x item. A separate acquisition model.

**Why HELD (not written):**
- `ammo_stats` has NO value/economy column and NO `verified_source` column.
- Adding storage is a DATA-MODEL decision, not a quick column add: single
  `value`/`sell_value` column vs. a vendor-keyed prices table (price + qty +
  vendor) vs. a broader items/economy model (the VALUE/credit_value concept also
  appears on mod_stats/implant_stats/core_stats — consider consistency).
- The standalone VALUE meaning is unresolved — can't name/confirm it yet.
- Fresh-head modeling decision; deferred deliberately. Nothing lost by waiting.

**Separate, also open:** `ammo_stats.damage_modifier_pct` is placeholder 0s
across all 5 rows (the original 0/5 backlog) — "needs real data first," distinct
from the economy-value question. These screenshots do NOT address it.

**Next time:** (1) determine what the standalone VALUE field means in-game;
(2) decide the ammo economy data model (column vs vendor-keyed table vs shared
items/economy model); (3) then gated DDL (+ verified_source) and the confirm
write. Evidence (screenshots) is captured.

---

## 2026-06-19 — Cradle verification: track-level facts confirmed, 84 nodes HELD

Two in-game S2 Cradle screenshots were track-level evidence; the table is
node-level (84 rows). Track evidence can't honestly stamp node flags, so NO
cradle_nodes write was made (would overstate what was checked). See
[VERIFICATION_PROTOCOL.md](network/VERIFICATION_PROTOCOL.md).

**Confirmed (track-level, from the screenshots):**
- The 6 tracks exist as named, matching `cradle_nodes.stat_track`: Strength,
  Recharge, Dexterity, Endurance, Support, Resistance.
- **Dexterity track -> Agility + Loot Speed** (Image 2 detail panel; exact match
  to the stored `stat_improved` for that track).
- Track cumulative-stat display observed (Strength +45, Recharge +40, Dexterity
  +20 / maxed +55, Endurance +35, Support +15, Resistance +30) — reflects energy
  invested; CONTEXT ONLY, not a per-node confirmation.

**NOT confirmed — the 84 nodes remain UNCHECKED (0/84):**
- `cradle_nodes` = 84 node-level rows (6 tracks x 14 = 11 passive + 3 perk each).
  The screenshots show the TRACK view (cumulative stats + perk icons), NOT
  per-node detail (each node's exact name/effect/cost).
- Track-level evidence cannot verify node-level rows -> all 84 stay
  verified=false until a PER-NODE source is confirmed to exist (the in-game
  node-selection screen showing one node's exact name, effect, energy cost).
  OPEN: does the game expose that per-node detail? If yes, capture + verify; if
  not, these nodes may not be cleanly confirmable.

**Before any future cradle_nodes confirm write:**
- `cradle_nodes` is MISSING a `verified_source` column (same as shell_stat_values
  was). Add via gated DDL (`alter table public.cradle_nodes add column if not
  exists verified_source text;` + reload + verify) BEFORE confirming — no
  untraceable confirmations.

**Open structural questions (HOLD if unclear when verifying nodes):**
- **Branching:** `branch_group` is null for all 84 -> the table models each track
  as a LINEAR 14-node chain. Verify whether tracks branch (choices) or are
  linear; if they branch, the data shape is wrong -> fix data, don't confirm a
  linear shape.
- **energy_cost uniform = 1:** verify it's the real design (cumulative steps
  1->14), don't assume.

**Protocol observation (ties to VERIFICATION_PROTOCOL.md):** this session saw
repeated drift from exact screenshots to qualitative descriptions / "approximate"
values when exact per-item data wasn't viewable (Rook x2; the Endurance-track
writeup). Descriptions, relative rankings, and "approximate" figures are NOT
confirmation-grade -> they get HELD, not confirmed. A recurring (and expected,
esp. under fatigue) pattern the protocol is designed to catch.

---

## 2026-06-19 — Session operational lessons + verification protocol

The data-confirmation discipline got its own doc:
**[VERIFICATION_PROTOCOL.md](network/VERIFICATION_PROTOCOL.md)** — how verified=true
is earned honestly (uniformity test for placeholder data, correct-then-confirm,
exact-measured-values-only, HOLD on contradiction, read-back-before-write,
verified_source from the start). Read it before any confirmation write.

**Operational gotchas hit repeatedly this session (bank these):**
- **PostgREST/Supabase DDL:** after any CREATE/ALTER, VERIFY the object exists via
  information_schema (require it to RETURN A ROW) before proceeding — a CREATE
  silently not landing was misdiagnosed as cache lag for ~an hour. Don't trust
  head-count selects; use a real select / the OpenAPI spec as ground truth.
- **"Success. No rows returned" is NORMAL for DDL** (not an error). The same
  message on a verify-SELECT means the object is ABSENT (a found object returns a
  row). Know which statement you ran.
- **PostgREST hard-caps a single response at 1000 rows** even with .limit(50000)
  — RANGE-PAGINATE (.range) to get more. Bit the sitemap.
- **Schema-cache reload:** `NOTIFY pgrst, 'reload schema'` first; if the write
  path is still stale, the Dashboard Data API config-save (toggle a setting +
  Save) reliably clears it (no dedicated reload button).
- **ESM/unit-test pattern:** project .js modules are Next-resolved, NOT bare-node
  importable. For testable logic: pure dependency-free `.mjs` core (bare-node +
  node:test) + thin `.js` I/O wrapper that calls it. Used for computePatterns,
  entitlementsDecision, qualityMetricsCore — repeat for any logic worth testing.
- **git hygiene:** NO backticks in `git -m` (bash substitution blanks the word).
  DB writes are a different safety category than git — the rollback net is the
  captured before-SELECT, not a commit.
- **grep patterns, same substitution (2026-07-21):** backticks inside DOUBLE
  quotes are EXECUTED by the shell, not matched — this blanks the word in a grep
  pattern exactly as it does in a commit message. Same substitution, different
  position. Use SINGLE quotes for patterns containing backticks, and verify the
  pattern reached the tool. See the CONVENTIONS block in the 2026-07-21
  provenance-check entry for the companion rule and the shared rationale.
- **heredoc apostrophes, same family (2026-07-21):** prose containing APOSTROPHES
  must go through the Write/Edit tools, NOT a shell heredoc — heredoc quoting
  failed three times in one day on it. These failures ABORT AT PARSE TIME, so the
  file is UNTOUCHED, not half-written: check state, do not repair an imagined
  partial write. Same CONVENTIONS block for the full rule.

**Session state (where things stand):**
- **Data verification:** `confirmed_data_share` 52.1% -> **64.9%** (426/656).
  `shell_stat_values` 0/91 -> **91/104** (6 shells corrected+confirmed, Sentinel
  13 inserted+confirmed, all S2-screenshot-sourced). **Rook's 13 stay UNCHECKED**
  (contradictory evidence). `shell_stats` (SEPARATE 8-shell top-line table) still
  **1/8** — 7-shell confirm checklist ready from the earlier pull (verify
  HP/shield/speed + the ability-schema question: prime/tactical set looks live,
  active_ability_* may be stale).
- **Shipped today (all pushed):** historical-context moat (3 stages); full
  codeable SEO pass (audit, /weapons hub, noindex prune, sitemap uncap, /intel
  pagination) — engineering side DONE, growth now off-code; monetization
  enforcement Stages 1-2 (lib/entitlements engine wired into 3 routes, INERT
  under override_all_free); quality measurement layer (quality_metrics precompute
  + admin dashboard); contributor-program + verification-protocol docs.
- **Open / next:** contributor recruitment (off-code, the real growth lever;
  backlog targets: cradle 0/84, ammo 0/5 [placeholder — needs real data first,
  like Rook], mod_stats source-backfill 81 [maybe self-serve], shell_stat_values
  Rook 13); shell_stats 7-shell confirm (checklist ready); admin-auth
  single-source TODO (migrate /api/admin + /api/admin/stats to lib/adminAuth.js);
  Cluster B cleanup (drop dead network_account/subscription); monetization Stage 3
  (rollout — needs Stripe + tier redesign); deferred metrics (hedging-input
  logging, correction-rate snapshots).

---

## 2026-06-19 — Contributor-program design doc (creator strategy stage 1 detail)

[docs/network/CONTRIBUTOR_PROGRAM.md](network/CONTRIBUTOR_PROGRAM.md) (new,
docs-only) — the detailed Stage 1 of CREATOR_STRATEGY.md. It operationalizes the
verification CONFIRMED mechanism: contributors are the SUPPLY CHAIN for the
moat's core input (no authoritative Marathon stats source exists -> verified=true
only grows via a trusted human confirming in-game).
- DECIDED — the OFFER (give: in-game confirmation of specific backlog stat values
  + evidence; get: public attribution, status badge, influence, free premium at
  rollout — recognition-as-reward, cash-free pre-revenue) and the TRUST MODEL
  (graduated, moat-defending: submission != confirmation/human-in-the-loop;
  evidence raises trust; track record earns standing; disagreement stays
  unconfirmed; attribution = credit AND accountability; START small/high-trust,
  2-5 vetted players, NOT an open form).
- Target backlog = the quality_metrics 0%/low tables (cradle_nodes 0/84,
  shell_stat_values 0/91, ammo 0/5, shells 1/8, mod source-attribution 17.3%).
- OPEN — submission->approval->verified=true mechanics (light code, later),
  recruitment (who + what to verify first), productization timing (premium grant
  waits on monetization rollout; relationship + manual confirm-flow start now).
- Lowest-friction first move (no code): recruit 2-3 known contributors, run the
  confirm-flow manually against the 0% tables.

---

## 2026-06-19 — Technical SEO arc COMPLETE (codeable side done -> next move is off-code)

Audit found ~1,092 discovered-not-indexed. Worked the codeable levers to
exhaustion across 5 commits:
1. Org/WebSite schema + article breadcrumbs + dead public/robots.txt removed.
2. f896a09 - /weapons index hub (weapon detail pages were orphans, no crawlable
   parent unlike /shells etc.).
3. 7b9ca43 - feed_items.noindex flag drives robots:{index:false,follow:true} +
   sitemap/listing exclusion; 97 weak/stale/duplicate oldest articles de-indexed
   (data flag-set, reversible, rows NOT deleted -> historical-context intact).
4. bb1a3a3 - sitemap: removed the arbitrary limit(1000) cap (paginated fetch),
   surfaces all 172 KEEP early articles; quality gate kept.
5. 55f2a20 - /intel archive paginated (?page=N) so every quality article has a
   crawlable internal link path, not just a sitemap entry (the long-tail win).

ONE COHERENT RULE now governs visibility everywhere -- sitemap, all internal
listings (intel index + pagination, editor lanes, homepage, sitrep, guides,
related), and the robots meta: "published + indexable (non-noindex)". Add/flip
the noindex flag and a page consistently leaves/returns across all surfaces.

Cross-cutting lesson banked: PostgREST hard-caps a single response at 1000 rows
(a high .limit() does NOT override server max-rows); fetch all via .range()
pagination. Applies to sitemap + any full-corpus read.

CONCLUSION: the engineering side of SEO is DONE. Do NOT manufacture more on-page
work. The bottleneck is authority/distribution (off-code).
NEXT MOVE (off-code, Justin):
- Watch GSC over the next 2-4 weeks: does "discovered - currently not indexed"
  fall as the de-index + new internal links take effect? Do the 172 KEEP get
  indexed? Impressions trend? That data says whether indexation was the blocker
  or it is purely authority.
- Then authority/distribution: backlinks, Reddit/Discord, the creator strategy
  (contributor pipeline) -- the real needle-mover at this stage.
- RECONFIRM the GSC property is apex (cyberneticpunks.com) or a Domain property:
  the site is apex-canonical (www 301s to apex), so a www-only property would
  look empty. (Old notes said "www" -- the code + live redirects are apex.)

---

## 2026-06-19 — SEO prune: 97 oldest articles noindexed (reversible, rows intact)

Internal-linking audit found ~1,092 discovered-not-indexed; the oldest 379 (the
pre-mature-pipeline cohort, Mar 7 - Apr 5 2026) were quality-classified
KEEP 172 / HOLD 110 / PRUNE 97. The 97 PRUNE (empty / <150w thin / stale
"launching soon" pre-launch language / duplicate-cluster extras) are now
de-indexed so they can't drag site-level quality.

Mechanism (NOT deletion -- rows must stay or the historical-context coverage
patterns corrupt; the precompute counts feed_items by game_slug and ignores
publish/noindex state, verified):
- DDL: feed_items.noindex boolean not null default false (run in Supabase).
- DATA FLAG-SET (this is a DB update, not code): noindex=true on the exact 97
  PRUNE ids, regenerated from the deterministic classifier so they match the
  reviewed set exactly. Verified count(noindex=true)=97. REVERSIBLE: flip the
  flag to restore. To re-derive/extend: the classifier lives in the chat history
  (word-count + headline-Jaccard>=0.55 clustering + stale-keyword scan).
- CODE (committed): generateMetadata emits robots:{index:false,follow:true} when
  item.noindex; sitemap + every article-linking listing (intel index, editor
  lanes, homepage recent, sitrep, guide categories, related fallback + a
  post-filter on the get_related_articles RPC) exclude noindex=true.

Verified: a flagged article returns 200 + noindex meta (NOT 404); unflagged
unchanged/indexable; flagged slug absent from sitemap + /intel; historical blob
recomputes identical (corpus still 1786, 4 lines). Build green.

Follow-ups (separate, not done): #4 selective sitemap-cap raise to surface the
172 KEEP; #1 paginated /intel archive linking only the quality (non-noindex) set.

---

## 2026-06-19 — Historical-context layer SHIPPED (AI-quality roadmap #2/#3, Stages 1-3)

The "verified-data moat" first build — compressed coverage patterns from our OWN
DB that free AI can't replicate. Three staged, gated commits:
- **Stage 1 (56be1cb)** — precompute pass: `lib/gather/historicalContext.js`
  computes a small pattern blob from `feed_items` (pure SQL/code, NO LLM) and
  UPSERTs it to a dedicated `historical_context` table each cron cycle. Patterns:
  recent-top-topic, rising-topic (recent share >> all-time), shell coverage-skew
  (most/least-covered), recent-shell-focus — each threshold-gated (thin data →
  emit nothing). **Streak patterns intentionally dropped** (every shell covered
  nearly every week → "N cycles" trivially true = low signal). Storage = its own
  table (chose over `live_stats` after a reader-collision finding).
- **Stage 2 (16668fa)** — wire the blob into editor prompts (`fetchHistoricalContext`
  + `formatHistoricalContextBlock`), appended at the cron per-editor block layer to
  **NEXUS/DEXTER/CIPHER only** (GHOST/MIRANDA skipped). `fetchGameContext` stays
  byte-identical. Framing is the craft: **background awareness, NOT a topic
  assignment** — may reference a pattern as texture, must NOT drive topic selection
  (circularity guard: patterns derive from our own articles, so writing-about-them
  would self-reinforce). Verified: wired-editor sample stayed on the current topic,
  no hijack/shoehorn.
- **Stage 3 seed (this commit)** — `meta_tier_snapshots` (new append-only table):
  append a tier snapshot ALONGSIDE the current-only `meta_tiers` upsert each NEXUS
  regrade (cron `processEditor` success branch). Additive + non-fatal (snapshot
  failure can never break the live regrade; `meta_tiers` + display byte-identical).
  Starts the clock so tier history accrues — every regrade without it was history
  we could never recover.

**FUTURE ENRICHMENT (not forgotten):** once enough `meta_tier_snapshots` accrue,
add tier-streak/churn patterns to the Stage-1 precompute (e.g. "Conquest LMG held
S-tier 8 cycles", "Sentinel churned A→B→A") — the marquee "N cycles" patterns that
are currently unbacked. Capture-only this stage; computation is the later add.

DDL lesson banked: verify a new table via `information_schema` + OpenAPI/real
select (NOT a head-count) before assuming it exists — the Stage-1 "cache saga" was
a CREATE that never landed, masked as cache lag.

---

## 2026-06-19 — Strategy docs landed (creator + AI-quality roadmap + tier-quality fold)

Docs-only housekeeping of the strategy thread. Three pieces:
- **[AI_QUALITY_ROADMAP.md](network/AI_QUALITY_ROADMAP.md) (new)** — the substance
  behind the "verified-data moat." Core reframe (can't fine-tune Claude → context
  IS the moat); the 6 context layers sorted by the **3-state trust axis**; #2/#3
  historical-context layer = BUILD FIRST (compressed patterns from our own DB,
  precompute + code-over-LLM, additive/game-agnostic) with a ready-to-execute
  read-only scoping pass; the measurement layer (instrument-first / prove-second,
  brand-safe); cost profile (single-digit $/mo done right) + Supabase-plan/spend-
  hygiene notes.
- **[CREATOR_STRATEGY.md](network/CREATOR_STRATEGY.md) (new)** — 4 size-gated
  stages (trusted-contributor package NOW → creator tools → traded promotion →
  paid ads). Stage 1 = the verification CONFIRMED-mechanism + AI-moat layer #6,
  productized; relationship-first, light build waits on monetization enforcement.
- **[MONETIZATION_STRATEGY.md](network/MONETIZATION_STRATEGY.md) §3.6 (fold)** —
  AI tier-quality principle: better quality for higher tiers, **accuracy/honesty
  universal** (free = good+true baseline, paid = richer on top; build-up not
  strip-down); dimensions + tunable per-tier sketch.

Three threads now interlock in docs: **verification** (3-state) → **AI-quality
roadmap** (#2/#3 historical first) → **monetization** (the moat = the paid depth)
→ **creator strategy** (contributors = the CONFIRMED mechanism). Next concrete
build candidate: the #2/#3 historical-context layer scoping pass (read-only,
buildable now, no payment/launch gate). All open items unchanged.

---

## 2026-06-18 — Monetization + AI-moat strategy locked (readiness audit → strategy doc)

Read-only monetization-readiness audit + the strategy worked out from it:
[docs/network/MONETIZATION_STRATEGY.md](network/MONETIZATION_STRATEGY.md). No code.

**As-is (audit):** a real populated foundation exists — `subscription_tiers` (5
priced tiers), `feature_gates` (19 feature×tier×daily_limit rows = a free/paid
matrix already designed in data), `player_profiles.subscription_tier` anchor,
`user_subscriptions` (Stripe-shaped, empty), `total_audits_run` counter,
`override_all_free=true` beta switch, `monetization.js` env flag. **Missing:**
enforcement (no route reads tier/gates — matrix unwired) + payments (Stripe
greenfield; only anticipatory columns). **Clean anchor:** `cp_player_id` →
`player_profiles.id` on every paid route. **Two-cluster problem:** Cluster A
(player_profiles+subscription_tiers+user_subscriptions+feature_gates, populated)
vs Cluster B (network_account+subscription, empty stub) — tier in 3 places.

**DECIDED:** network-level sub (spans both games); core paid tier FUSES the draw
(cross-game verified-data Coach career = retention) + the mechanic (unlimited AI =
conversion); generous free tier as the acquisition engine (pre-traction: users >
money); tiers are tunable data; ~5 tiers (tunable); names must go network-neutral
(current scout/runner/etc. are Marathon-flavored). **AI moat ranking:** DURABLE =
current + 3-state-hedged verified data we control, both games, already built (the
verification work IS the monetization foundation); FRAGILE BONUS = personal
CoD/DMZ match stats via the unofficial papi-client endpoint — position as
fail-safe "when available," architect graceful-degrade, launch-window experiment;
Marathon is asymmetric (no stats API → trusted-contributor model).

**OPEN (decide later):** cluster reconciliation (gates enforcement), final tier
count + feature→tier mapping, network-neutral names, pricing pressure-test, then
the enforcement build (payment-INDEPENDENT — wire feature_gates+tier+metering now
against override_all_free), then Stripe (greenfield, last, gated).

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

### /api/track allowlist drift — investigated + resolved
The client fired two events missing from `ALLOWED_EVENTS` (both 400'd/dropped):
- **`signup_intent`** (/welcome intent cards: build|meta|intel|skip) — accidental
  drift: the flow was built to emit it (the welcome/complete route comment even
  names site_events as the analytics home), just never allowlisted. **ADDED**
  (`feat(analytics): record signup_intent events`), so the intent/bounce funnel
  records as a time series. (The latest per-user value also lives in
  `player_profiles.signup_intent`.) Protected by the #7 rate-limit + size-cap
  like every allowed event.
- **`advisor_surprise`** — redundant: every surprise build already records as
  `advisor_generate` with `surprise:true` (allowlisted). **LEFT OUT** (only
  unique signal would be surprise-click-without-completion; marginal).

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
- The 6 DMZ decisions are now **RESOLVED** (2026-06-18; see
  [GATHER_GAP2_DMZ_SCOPING.md](network/GATHER_GAP2_DMZ_SCOPING.md) "Decisions —
  RESOLVED"): config = `lib/games/dmz.js`; **separate DMZ stat tables** (LOCKED);
  patch-notes = try `steam-news` first, `cod-blog` only if needed; editor count =
  3 + cadence = 24h (defaults, hold loosely); Broker = conditional on economy
  data being dataminable post-launch. Phase C implication: `fetchGameContext`
  becomes a per-slug DISPATCHER (`buildMarathonContext` extracted unchanged +
  `buildDMZContext` new). Phase C prereq still open: key the dexter-stats 24h
  throttle per `game_slug`.
- Parked (separate): **Marathon cron stays 12h** — 24h cost-optimization
  considered but held (no urgency at ~$43–45/mo); revisit as a cost/traffic call.
  Do NOT touch vercel.json until then.

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
