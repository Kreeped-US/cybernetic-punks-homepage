# DMZ Pre-Publish Gate -- Phases 2-4 Build Spec (Fable-ruled)

STATUS: DESIGN -- SAFETY-RULED, build spec. Written 2026-08-06 (Fable ruling folded in).
Doc-only; NO code. LAUNCH-CRITICAL: all of Phase 2-4 must be live + placeholder-tested BEFORE
the DMZ launch (Oct 23 2026) -- a fail-open window is a moat breach at peak traffic.

Phase 1 (Marathon log-only probe) shipped ae5ada4. This spec covers Phases 2-4: arming the
gate for DMZ (fail-closed holding), the DMZ claim grammar, and auto-release. Step-0 mechanics
report informed this; the 5 rulings below are the safety contract.

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
