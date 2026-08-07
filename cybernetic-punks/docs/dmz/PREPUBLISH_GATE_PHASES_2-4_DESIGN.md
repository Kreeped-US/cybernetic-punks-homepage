# DMZ Pre-Publish Gate -- Phases 2-4 Build Spec (Fable-ruled)

STATUS: BUILT + LIVE -- the gate MECHANISM is COMPLETE (hold -> auto-release). Phases 2a/2b/3a/4
are all SHIPPED; only 3b (full extractor set) + the ARMING commit remain (launch-week, spec-only
below). This was written as a build spec (safety-ruled by Fable) and now records what shipped.
Written 2026-08-06; Phase 2b ARMING ruling + Phase 4 AUTO-RELEASE ruling folded in 2026-08-06
(edit-in-place, A9 -- the "PHASE 2b/4 BUILD SPEC" sections below). 3a VERIFIED-ONLY amendment
SHIPPED 2026-08-06 and its spec correction folded in (edit-in-place, A9): the verified-only bar is
classifyCorroboration's `verifiedOnly` opt (recognition-preserving demotion), NOT a store-loader
row-filter (which blinds the gate) -- see P4 Ruling 1 + the 3a AMENDMENT note. LAUNCH-CRITICAL: the
gate is built + placeholder-tested; 3b + arming must land BEFORE the DMZ launch (Oct 23 2026) -- a
fail-open window is a moat breach at peak traffic. DMZ is NOT armed yet (holding real but broad --
safe-by-default).

SHIPPED: Phase 1 (Marathon log-only probe) ae5ada4. Phase 2a (hold plumbing + DMZ fall-through
sever) ad0bdd8. Phase 2b (two-stage detector) 60fde58. Phase 3a (DMZ store loader + extractor
framework) da654fa; the 3a verified-only amendment (classifier opt) 1ad48cb. Phase 4 (auto-release
cron -- runGate shared/mode-derived, recognition-preserving release, atomic, fail-closed, release
certificate) 4310636. REMAINING (spec-only below): Phase 3b (full DMZ extractor set + real jsonb
keys) + the ARMING commit (flip DMZ fail-closed on a measured-low gap). This spec covers Phases
2-4: arming the gate for DMZ (fail-closed holding), the two-stage blindness detector (Phase 2b),
the DMZ claim grammar, and auto-release (Phase 4, SHIPPED). Step-0 mechanics reports informed this;
the rulings are the
safety contract.

---

## FRAMING: two verifiers, one moat

The site's "nothing false ships" moat has TWO gates, both fed by the SAME verification facts,
with ZERO manual flip-days:
- HONESTY GATE (data pages): an entity/build row is noindex-until-`verified` (the build engine
  already does this -- the DERIVED is_indexable gate).
- ARTICLE GATE (prose claims): an LLM article is hold-until-corroborated against the verified
  store (this spec).
They INTERSECT at launch: the play -> verify loop fills the store, which SIMULTANEOUSLY flips
data pages indexable AND releases held articles. One verification event unblocks both surfaces;
nobody flips a flag by hand.

CORE PRINCIPLE (applied to the gate itself): **"absence of findings is never evidence."** Zero
findings from an instrument that cannot parse the claim class is SILENCE, not cleanliness --
proven by Phase 1's patch-article miss (0 findings was blindness to patch-delta phrasing, not
agreement). The gate must therefore measure its own eyesight (Ruling 2) before anyone relies on
it. A fail-closed label on a blind extractor is security theater.

---

## RULING 1: FAIL-CLOSED CONDITION -- hold on BOTH CONTRADICTED and UNCORROBORATED-hard-stat

For DMZ, a HOLD fires on a hold-class finding = **CONTRADICTED OR UNCORROBORATED-hard-stat**
(not CONTRADICTED-only). The sparse launch store is the argument FOR this, not against:
- Editors generate from store-containing context; an article about an unverified entity mostly
  should not generate in the first place. Claim-LIGHT coverage (no hard-stat triples) passes
  UNTOUCHED -- the gate only bites articles that assert checkable hard stats.
- A held article is not waste: it is QUEUED WORK + a verification task. The held queue IS the
  demand-weighted verification worklist; auto-release (Phase 4) is delivery.

Riders (build these in):
- (a) PRODUCTIVE HOLDS: an UNCORROBORATED hold's verification task carries the article's CLAIMED
  VALUE as the candidate to verify -- the reviewer confirms/corrects a proposed value, not a
  blank. The article that raised the claim seeds the store work it is blocked on.
- (b) LAUNCH HEALTH METRIC = MEDIAN HOLD-DURATION. If holds AGE, the fix is THROUGHPUT
  (verify faster / more), NEVER loosening the condition. The condition is not the pressure
  valve; verification capacity is.

---

## RULING 2: BLINDNESS-LOUD via a TWO-STAGE detector (the key safety mechanism)

The gate must make its own blindness LOUD, because an unparsed claim silently passes (extractor
blindness != hold, unlike infra failure). Two stages:
- STAGE 1 -- HIGH-RECALL, over-broad HARD-STAT-SENTENCE detector: flags any sentence that looks
  like it asserts a hard stat -- entity/alias mention + a number, a delta ("from X to Y"), a
  percent, or tier/velocity/store-field vocabulary. Deliberately over-broad; recall over
  precision.
- STAGE 2 -- HIGH-PRECISION claim grammar: the existing triple parser (entity x store-field x
  parseable value), run on the Stage-1 sentences.

THE RULE: any Stage-1 sentence that Stage 2 CANNOT parse into a triple is an **UNPARSEABLE
finding = a hold-class finding for DMZ** (unverifiable-by-instrument is treated as
uncorroborated epistemically -- the gate will not pass a hard-stat sentence it could not
check). Each UNPARSEABLE finding is ALSO an extractor to-do: the dismiss-tightens-grammar loop
(a reviewer dispositioning an unparseable either verifies it by hand or files the grammar gap).

ARMING DISCIPLINE (fail-closed is TRUSTED only on MEASURED coverage):
- (a) GOLDEN CORPUS TEST: a fixture of hard-stat sentences the grammar must parse. **Test case
  #1 = the Phase-1 patch miss** (deltas / decimals / tiers). EVERY blindness incident extends
  the corpus -- the grammar's coverage is a growing, versioned test, not a claim.
- (b) LIVE BLINDNESS METRIC = the Stage-1/Stage-2 GAP RATE on Marathon's log-only probe (how
  often Stage 1 flags a sentence Stage 2 cannot parse). DMZ fail-closed ARMS ONLY WHEN THE GAP
  IS MEASURED-LOW. "The gate measures its own eyesight before anyone relies on it."

This is where the real safety lives (build sub-slice 2b). A fail-closed gate with an unmeasured
extractor is the security-theater failure mode the framing principle names.

---

## RULING 3: AUTO-RELEASE (Phase 4) -- STRICT full re-pass, never "the row changed"

A held draft auto-releases ONLY on a FULL GATE RE-PASS: zero hold-class findings, INCLUDING
zero UNPARSEABLE. Specifically:
- NEVER release on "the referenced store row changed" alone -- re-run the full two-stage
  detector against the current store and require a clean pass.
- CANNOT release against a `verified=false` store row: an unverified anchor holds nothing (the
  honesty gate and the article gate share the same verified-truth; a build/entity row must be
  verified=true to satisfy an article's claim about it).
- LOG each release with the STORE ROWS that satisfied it -- every publish is auditable back to
  the specific verification that freed it (the freeing fact is on the record).

---

## RULING 4: ASYMMETRY -- Marathon log-only/fail-open, DMZ fail-closed

- MARATHON: log-only / fail-open (frozen game, retrofit gate, Season-3 store-lag tolerated).
  Unchanged by this spec -- it keeps validating the classifier's judgment and the live blindness
  metric.
- DMZ: FAIL-CLOSED. A hold-class finding holds; and a GATE-INFRA failure (loader/classifier
  throws) also HOLDS + ALERTS -- it does NOT fall through to publish.

BUILD FACT (explicit): Phase 2 must SEVER Phase 1's fall-through FOR DMZ. Phase 1's DMZ path is
"skip the gate, publish" (fail-open); the DMZ gate must instead route a loader/classifier throw
to HOLD-LOUDLY. Per-game mode lives in the per-game config (Marathon: log-only/fail-open; DMZ:
fail-closed/hold-on-infra-down). This is a DELIBERATE divergence from the house fail-open posture
-- for DMZ, the gate IS the moat enforcement, so gate-down = hold + alert, not publish.

---

## RULING 5: NO GLOBAL BYPASS -- ever

- The hold CONDITIONS and the arming THRESHOLDS live in CODE CONSTANTS, changed only by a
  REVIEWED COMMIT. There is NO env off-switch, no runtime flag, no "launch-week bypass." The
  ramp is THROUGHPUT, not permeability.
- The ONE legitimate release lever is a PER-ARTICLE operator release in admin, LOGGED: a human
  corroborates the specific article and takes responsibility ON RECORD. Per-article + loud is
  the only override that exists. A global one must NOT exist -- a single switch that can flood
  fabrication at peak traffic is the exact failure this gate prevents.

---

## SEQUENCING + SCOPE (from Step 0)

Order (all 3 built + PLACEHOLDER-TESTED before Oct 23):

**PHASE 2 -- arm the machinery (Marathon stays log-only). Two sub-slices:**
- 2a: `feed_items.gate_status` column (operator-run DDL) + the hold/publish gate FUNCTION +
  SEVER the DMZ fall-through (route DMZ loader/classifier throw to hold-loudly, per-game config).
  `gate_status` is a DISTINCT state from VANTAGE's `is_published=false` review queue.
- 2b: the TWO-STAGE detector (Stage-1 hard-stat-sentence detector + the UNPARSEABLE=hold-class
  rule) + the GOLDEN CORPUS (test case #1 = the patch miss) + the live Stage1/Stage2 gap METRIC.
  **2b is where the real safety is** -- it deserves its own focus + a Fable pass on the corpus
  and the arming threshold.

**PHASE 3 -- make DMZ holding real:** `loadDMZStore` (mirror `loadMarathonStore` over the DMZ
tables: recipes/ingredients/lieutenants + the weapon-build tables) + DMZ EXTRACTORS (one per
checkable DMZ store field; "schema IS the grammar"). Depends on the DMZ schema (BUILT). Until
Phase 3 lands, DMZ holding is inert (no DMZ extractors -> nothing to find).

**PHASE 4 -- auto-release:** cron that re-runs the full two-stage detector on held drafts when a
referenced store row updates (`updated_at` trigger = the efficiency signal) and publishes ONLY on
a full clean re-pass (Ruling 3). Depends on Phase 2 held-state + Phase 3 DMZ store.

DEPENDENCY REALITY: Phase 3 does not need Phase 2's column, but DMZ HOLDING (Phase 2) is INERT
until Phase 3 exists. Effective order: Phase 2 infra + validate the holding LOGIC + the blindness
metric on Marathon logs -> Phase 3 DMZ extractors (holding becomes real) -> Phase 4 auto-release
-> ARM DMZ fail-closed (only once the gap metric is measured-low, Ruling 2).

BUILDABLE NOW vs LAUNCH-GATED:
- Phase 2 (2a + 2b): buildable NOW -- no DMZ data needed; Marathon log-only keeps feeding the
  golden corpus + the gap metric.
- Phase 3: buildable NOW (extractors are code keyed to the built DMZ columns); VALIDATING them
  needs sample DMZ drafts (placeholder / hand-crafted), like the build engine's placeholders.
- Phase 4: buildable NOW; test against a placeholder held draft + a placeholder store-row flip.
All launch-critical: a fail-open window at launch = published fabrication = moat breach.

---

## PHASE 2b BUILD SPEC -- the two-stage detector + arming (Fable-ruled 2026-08-06)

2b is where the real safety lives: making the gate's BLINDNESS loud (Ruling 2), and refusing to
trust fail-closed until the blindness is MEASURED-low. 2a shipped the hold plumbing; 2b extends
2a's HOLD_CLASSES + feeds decideGate more finding classes -- the hold plumbing (decideGate, the
cron sever, gate_status/gate_findings) is UNCHANGED. The decideGate change is one line: the
HOLD_CLASSES constant grows to CONTRADICTED + UNCORROBORATED + UNPARSEABLE.

### BLINDNESS IS 3 MODES (the taxonomy -- the two instruments are NON-REDUNDANT)

- MODE 1 -- MISSES (delta phrasing "damage increased from 23 to 28"; the field word precedes the
  number so the integer regex never binds). Caught by UNPARSEABLE (Stage-1 hits, Stage-2 does not
  parse) -> the GAP METRIC.
- MODE 2 -- NO-EXTRACTOR categories (tier / velocity / precision: the checked store has no column,
  so no extractor triggers). Also caught by UNPARSEABLE -> the GAP METRIC.
- MODE 3 -- MIS-PARSES (decimals: "12.6 damage" -> the integer regex skips "12.6" and matches
  "6 damage" -> extracts 6). Stage 2 PARSED it (wrongly), so UNPARSEABLE does NOT fire. ONLY the
  golden corpus's VALUE-assertions catch mode 3 (assert "12.6 damage" -> {damage: 12.6}, which
  fails today).
- SO: gap metric = modes 1-2; corpus value-assertions = mode 3. Neither instrument substitutes
  for the other. A gate with only the gap metric is blind to mis-parses; a corpus without value
  assertions is blind to mis-parses too. Both, always.

### RULING 1 (2b): STAGE-1 VOCAB -- err BROAD (decisive)

Too-broad costs BOUNDED triage-work, paid pre-arming, on Marathon log-only (breadth over-holds
NOTHING there -- it only inflates the gap, which is triage). Too-narrow costs SIGHT: a
never-flagged stat sentence is silent-blind with no badge -- the exact failure the framing
principle names ("absence of findings is never evidence"). So when in doubt, FLAG. Signal set:
known entity/alias + ANY of:
- a bare NUMBER, or DELTA language ("from X to Y", buffed/nerfed/increased/decreased/raised/
  reduced/bumped, up/down to), or a PERCENT, or STAT-FIELD vocab (damage, fire rate, rpm, mag/
  magazine, health, range, handling, recoil, velocity, precision, tier), PLUS
- UNIT tokens (ms, m/s, seconds, zoom multipliers like "1.5x"), AND
- COMPARATIVE / SUPERLATIVE stat language ("higher velocity than", "fastest ADS", "hits harder
  than") -- these assert a checkable relation even with no number, and are pure mode-1/2 blindness
  if unflagged.

### RULING 2 (2b): ARMING = 3 conditions, ALL required, certified by a REVIEWED COMMIT

DMZ fail-closed HOLDING on UNPARSEABLE is trusted ONLY when:
- (a) the golden corpus is 100% GREEN -- including the DMZ section AND the expected-UNPARSEABLE
  fixtures (the loud-path wiring itself under test);
- (b) the GAP RATE <= ~10% over >= 20 Stage-1-bearing articles OR 4 weeks, whichever is LATER
  (both a volume floor and a time floor -- a quiet week cannot certify);
- (c) EVERY gap sentence is TRIAGED (fixed / turned into a fixture / classified a false-positive).
  An untriaged gap is measured-and-IGNORED, which is NOT measured-low.
MECHANISM: arming is a REVIEWED COMMIT that flips the per-game gate-mode constant to trust
UNPARSEABLE-holding, with the gap report + the corpus run pasted in the PR body = the arming
CERTIFICATE. Arming is NOT a runtime/dashboard toggle -- and neither is DISARMING (both are
evidence-bearing commits, symmetric). No env flip can arm or disarm the moat.

### RULING 3 (2b): GOLDEN CORPUS SEED (~25-35 fixtures, VALUES asserted)

Each fixture: { sentence, real-or-synthetic label, expected Stage-1 verdict, expected-triples-
WITH-VALUES OR expected-UNPARSEABLE }. Seed set:
- The Phase-1 patch sentences VERBATIM (#1-5).
- DECIMALS-with-values ("12.6 damage" -> {damage: 12.6}) -- the mode-3 exhibit.
- ABSOLUTES ("180 health"), PERCENTAGES, RANGES ("40-60 falloff"), NEGATIONS ("no longer
  one-shots", "removed from the loot pool"), COMPARATIVES, a MULTI-CLAIM sentence (2 triples on
  one line), UNIT-bearing values, an ALIAS-form entity reference.
- EXPECTED-UNPARSEABLE fixtures: tier / velocity / precision asserted to produce UNPARSEABLE
  findings, NOT silence -- the loud path is under test, not assumed.
- NEGATIVE cases (must NOT flag): "Season 3 begins September 22", "$70", "top 5 loadouts",
  "patch 1.1.5.1", "9 POIs" -- the entity-count borderline that FORCES the false-positive policy
  decision now (does "9 POIs" flag? the corpus pins the answer).
- A DMZ-labeled section: interview + old-DMZ phrasing (printer costs, star levels) so the DMZ
  grammar has fixtures before DMZ data exists.
GROWTH RULE: every future blindness incident adds its sentence to the corpus SAME-DAY.

### RULING 4 (2b): FIX the decimal regexes IN 2b (not optional)

The corpus cannot be green with the "12.6" fixture failing, and arming (a) requires green -- so
the mode-3 catch AND the fix land in the SAME commit (the decimal-aware regex + its regression
fixture together). Make the integer numeric extractors decimal-aware.

### RULING 5 (2b): PER-REASON hold metrics (not blended)

UNPARSEABLE mostly RELABELS holds: a sparse-store hard-stat claim holds either way -- UNCORROB if
parsed, UNPARSEABLE if not -- so it does not add much hold VOLUME. But the two reasons resolve
through DIFFERENT pipelines, so their durations must be split:
- UNCORROBORATED resolves via VERIFICATION THROUGHPUT (store-filling; play -> verify -> store).
- UNPARSEABLE resolves via GRAMMAR WORK (fix + fixture).
Build median-hold-duration PER REASON, never blended. UNCORROB trending down = the launch plan is
executing; UNPARSEABLE spiking = extractor debt announcing itself. A blended metric hides which
pipeline is lagging.

### 2b SCOPE (files)

- lib/gsc/corroboration.js -- refactor the per-sentence extractor loop into an exported
  extractTriples() (behavior-identical Stage 2) + make the numeric regexes DECIMAL-AWARE (Ruling 4).
- lib/gsc/hardStatDetector.js (NEW) -- Stage 1 isHardStatSentence (the broad vocab, Ruling 1) +
  the combiner that emits UNPARSEABLE (Stage-1 hit AND extractTriples()==[]) + the gap counts.
- lib/gsc/prePublishGate.js -- HOLD_CLASSES += 'UNCORROBORATED', 'UNPARSEABLE' (the ONLY
  decideGate change; plumbing untouched). NOTE: UNPARSEABLE-holding is trusted only post-arming
  (Ruling 2) -- the constant grows now; the per-game arming commit certifies reliance.
- app/api/cron/route.js -- run the combiner (both modes), feed its findings to decideGate, LOG the
  gap metric (stage1_hits / stage2_parsed / gap + the verbatim unparseable sentences).
- lib/gsc/corroboration.golden.test.mjs (NEW) -- the golden corpus + runner (values asserted).
- lib/gsc/hardStatDetector.test.mjs (NEW) -- Stage-1 recall + UNPARSEABLE unit tests.
Effort: medium -- the wiring is small; the real work is Stage-1 recall tuning + the corpus
(Ruling 3) + the decimal fix (Ruling 4). Marathon stays log-only throughout (the gap accrues
safely, holding nothing) until the arming commit.

---

## PHASE 4 BUILD SPEC -- the auto-release cron (Fable-ruled 2026-08-06)

Phase 4 closes the loop: a held draft AUTO-RELEASES when its blocking claim now corroborates
against the verified store -- re-run the FULL gate, publish ONLY on a clean re-pass. Auto-release
wrongly = publishing fabrication, so it is as safety-critical as holding. The launch loop then
closes: play -> verify store -> entity pages index AND held articles release together, one
verification event, zero manual flip-days.

### RULING 1 (P4): VERIFIED-ONLY EVERYWHERE -- not just the release re-pass

An article claim "corroborated" by a verified=FALSE store row is ECHO (two unverified assertions
agreeing), NOT corroboration. One-gate-one-bar therefore requires the INITIAL gate (3a) to apply
the VERIFIED-ONLY bar too -- not only the release re-pass. Otherwise the SAME article publishes via
the insert gate but holds via the release gate: one bar, two answers.

MECHANISM (corrected -- see the 3a AMENDMENT note at the end, which SHIPPED this): the verified-only
bar is a CLASSIFIER opt (classifyCorroboration's `verifiedOnly`), NOT a store-loader row-filter. The
opt DEMOTES an unverified row to a non-authority -- it can neither corroborate (echo) nor contradict
(no verified value) -> UNCORROBORATED-held -- while the entity STAYS in the store (RECOGNIZED). A
store-loader row-filter was the original wording and is WRONG: dropping verified=false rows makes a
provisional-only entity VANISH -> unrecognized -> the claim silent-publishes (contradictions too),
which INVERTS the ruling (absence-is-not-evidence). Both the insert gate and the release re-pass
pass the SAME classifier opt -- that is where one-gate-one-bar actually lives.

Provisional-data nuance, routed correctly: a pre-launch provisional row (verified=false,
interview-sourced) means an article ASSERTING it HOLDS -- which is CORRECT. The escape for
officially-announced facts is the CITATION LANE (official-fact content citation-gated against
official source blocks), NEVER a looser store filter. Citations-as-a-second-corroborator is a
future DESIGNED extension with its own review -- never a verified=false pass-through.

### RULING 2 (P4): RE-CHECK-ALL each run -- not updated_at-gated

The re-pass is PURE (zero-I/O, the article body is in hand, one store load per run); the held
queue is dozens-to-hundreds at milliseconds each. So RE-CHECK ALL held rows every run:
- updated_at-gating STRANDS grammar-change releases: an UNPARSEABLE hold freed by a NEW EXTRACTOR
  (a deploy) has NO store update -> updated_at-gating never re-checks it -> it never releases.
- a stored version-stamp patch (re-check on store-change OR grammar-version-change) is
  stored-derived-state with a HUMAN dependency: forget to bump the version -> releases silently
  stop. The exact stored-derived-state trap the gate avoids elsewhere.
Re-check-all = current article vs current store vs current grammar, no cache to distrust. A
version-stamp is a recorded LATER optimization IF the queue ever hits thousands (YAGNI now).

### RULING 3 (P4): runGate + THREE fabrication-path additions

EXTRACT `runGate(store, draft)` -- the shared gate (classifier + two-stage detector + decideGate),
called by BOTH the insert path and the release cron (one gate, held-by = freed-by). A
behavior-identical refactor, PROVEN by a deep-equal no-op proof (same inputs pre/post-refactor ->
byte-identical decisions), the same discipline as the extractTriples extraction.

Three fabrication-path hardenings (each closes a way a wrong release could ship):
- (a) MODE IS NOT A PARAMETER (the footgun). runGate DERIVES the mode from `draft.game_slug` via
  the per-game config -- it is NOT passed in. Passing mode means ONE wrong call site (the release
  cron passing 'log-only' for a DMZ draft) silently releases EVERYTHING held. Deriving it makes
  that misconfiguration class UNREPRESENTABLE.
- (b) the verified-store load PAGINATES regardless (pageAllStrict, no silent cap). A silent
  row-cap can only under-release (safe) BUT it MISCLASSIFIES a CONTRADICTED claim as UNCORROBORATED
  (the capped store row is absent -> null store value -> UNCORROBORATED), corrupting the
  verification-task stream. So: paginate fully, never cap.
- (c) held -> released is ATOMIC: `UPDATE ... SET is_published=true, gate_status='released' WHERE
  id=... AND gate_status='held'` so two overlapping cron runs cannot double-release the same row
  (one WHERE clause closes the race).

FAIL-CLOSED (confirmed): a store-load throw -> ABORT the run (0 releases -- a broken store frees
nothing); a per-draft re-pass throw -> runGate threw -> decideGate holds -> not released. A broken
re-pass NEVER releases. The clean-pass bar = the initial-publish bar (decideGate reuse), NEVER
"the row changed".

### RULING 4 (P4): RELEASE LOGGING -- the certificate carries gate identity

On release, LOG the freeing store rows ({entity, field, verified value, verified_source}) +
set gate_status='released' (DISTINCT from 'clear', so published-after-hold stays queryable --
releases/day is the verification-throughput instrument, Ruling 1b). AND record the GATE
VERSION / COMMIT alongside the freeing rows: the release certificate parallels the arming
certificate. An audited release then shows WHAT freed it (the verified rows) AND WHICH GATE
agreed (the grammar version) -- so wrong-release forensics never depend on reconstructing which
grammar was deployed at release time.

### P4 SCOPE (files)

- lib/gsc/prePublishGate.js (or a gateRunner module) -- EXTRACT `runGate(store, draft)` (mode
  DERIVED from draft.game_slug); deep-equal no-op proof.
- app/api/cron/route.js -- the insert path calls runGate (behavior-identical).
- lib/gsc/corroboration.js -- classifyCorroboration's `verifiedOnly` opt (SHIPPED in the 3a
  amendment): demotes unverified rows to non-corroborating AND non-contradicting -> UNCORROBORATED,
  entity stays recognized. runGate passes it for BOTH the initial gate and the release re-pass.
  (The store loads FULL -- verified + unverified -- for recognition; the bar is in the classifier,
  NOT a store-loader row-filter, which would blind the gate. See the 3a AMENDMENT note.)
- app/api/cron/gate-release/route.js (NEW) -- auth guard + service key; load the FULL store
  (recognition); scan gate_status='held'; re-pass each via runGate (verifiedOnly:true); ATOMIC
  release of the clean ones (is_published=true, gate_status='released', gate_findings cleared) with
  the freeing-rows + gate-version log; per-reason release counts. Re-check-all (Ruling 2).
- vercel.json -- a cron entry (hourly; the re-pass is cheap).
Effort: medium -- runGate extraction (careful, deep-equal-proven) is the structural core; the
cron mirrors build-refresh + loadGateStore. The verified-only bar itself already shipped (3a amend).

### 3a AMENDMENT (SHIPPED -- and the mechanism correction it forced)

Phase 3a shipped with a FULL-store initial gate that corroborated against verified + unverified
rows alike (the echo). The verified-only amendment landed as a standalone commit. The build SUPERSEDED
this ruling's original mechanism -- worth recording WHY, because the wrong mechanism inverts the
ruling:

ORIGINAL WORDING (wrong): "fix loadGateStore to verified-only" -- i.e. a store-loader ROW-FILTER
that drops verified=false rows before the classifier sees them.

WHY IT IS WRONG: the classifier and the two-stage detector are ENTITY-GATED -- a sentence with no
RECOGNIZED store entity is skipped (no finding). UNCORROBORATED fires only when the entity IS in the
store but the value is absent. So dropping the rows of a provisional-ONLY entity makes it VANISH ->
unrecognized -> its claims are INVISIBLE -> the draft PUBLISHES. Worse, a CONTRADICTING claim that
the full-store gate HELD (CONTRADICTED) also goes silent -> publishes. Pre-launch the DMZ store is
largely verified=false (placeholders), so a verified-only ROW-FILTER would leave the fail-closed DMZ
gate recognizing almost nothing -> publish-everything. Row-exclusion INVERTS the ruling it was meant
to enforce (absence-of-findings is not evidence -- the gate's own core principle).

SHIPPED MECHANISM (right): the verified-only bar is classifyCorroboration's `verifiedOnly` opt. The
store still loads FULL (every entity RECOGNIZED); the opt DEMOTES an unverified row to a non-authority
-- it can neither corroborate (echo) nor contradict (no verified value to contradict against), so
BOTH match and mismatch collapse to UNCORROBORATED-held (hold-class for DMZ, routed to a verification
task / the citation lane). Recognition-preserving demotion delivers the verified-only INTENT (no echo)
AND preserves fail-closed (an all-provisional store still recognizes every entity and HOLDS every
claim). The opt is off by default -> the batch/other callers are byte-identical.

ONE-GATE-ONE-BAR: the insert gate passes `verifiedOnly:true` today; Phase 4's release re-pass passes
the SAME opt through runGate. One classifier, one bar -- held-by = freed-by, measured identically.

### P4 TEST (mirrors the earlier phases -- unit + placeholder)

- RELEASES: a held placeholder draft (gate_status='held', body contradicts a store row) + flip the
  blocking store row verified=true WITH the matching value -> re-pass -> RELEASES (is_published
  =true, gate_status='released', freeing rows + gate version logged).
- STAYS HELD (wrong value): flip to a still-contradicting value -> CONTRADICTED -> held.
- STAYS HELD (verified=false anchor, Ruling 1): the correct value but verified=false -> verified-only
  store excludes it -> UNCORROBORATED -> held (never releases on echo).
- STAYS HELD (error, fail-closed): re-pass/store-load throws -> held (run aborts / draft skipped).
- runGate deep-equal no-op proof (insert-path decisions byte-identical pre/post-extraction);
  runGate mode-derivation unit test (a DMZ draft derives fail-closed, never log-only).

---

## THE FABLE-WORTHY SAFETY CALLS (recorded, ruled)

1. Fail-closed condition = CONTRADICTED + UNCORROBORATED-hard-stat (Ruling 1) -- sparse store is
   the argument FOR; median-hold-duration is the health metric, throughput is the valve.
2. Extractor COVERAGE is the real safety -- the two-stage detector makes blindness LOUD
   (UNPARSEABLE=hold), armed only on a MEASURED gap (Ruling 2). This is the sleeper risk the
   framing principle names.
3. Auto-release = full clean re-pass, never store-changed-alone, never against verified=false
   (Ruling 3).
4. DMZ fail-closed incl. gate-infra-down = hold+alert; Phase 2 severs the DMZ fall-through
   (Ruling 4).
5. No global bypass; per-article logged operator release only (Ruling 5).

END -- Phase 2-4 build spec, safety-ruled. Build next session, Phase 2 first (2a then 2b).
