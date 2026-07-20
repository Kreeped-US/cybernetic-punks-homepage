# Handoff / Session Notes

Running log of cross-session decisions, shipped changes, and parked work.
Newest entries on top.

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
