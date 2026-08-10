# Verified-Grounded Reasoning - the editor content model

**Status:** Fable ruling (2026-08-10). This is the FOUNDATIONAL content model for what an editor may
assert and how the gate judges it. It supersedes the parked "editorial opinion lane" note (see
Supersession) and REPRIORITIZES store-row citation from a non-launch-critical residual to a
content-model PRECONDITION. Read before any editorial-quality, gate, or store-schema decision.

## The principle: the premise-cited claim

An editor may assert any JUDGMENT it can build a verified factual STAIRCASE to. Gate the PREMISES
(every load-bearing fact cites a verified block); release the JUDGMENT (the inference/recommendation
is the editor's, marked as reasoned).

- ANALYSIS = a recommendation whose factual links are ALL cited. The conclusion is the editor's; each
  fact it rests on resolves to a verified block.
- HYPE = a claim with NO verified staircase. If the staircase cannot be built, the claim cannot
  publish.

"Opinion is not a lane; it is a privilege the verified data grants." An editor earns the right to a
judgment by citing the facts underneath it - not by being given a labeled space to speculate. This is
why this ruling SUPERSEDES the opinion-lane idea: the answer to "how do editors add voice without
diluting the verified moat" is not a separate opinion lane, it is verified-grounded reasoning - voice
IS the reasoned conclusion on top of a fully cited factual staircase.

## Three claim types

Every sentence an editor writes is one of three things, and the gate treats each differently:

1. VERIFIED FACTS - a claim about the game world (a stat, an ability, an interaction the store
   records). Must CITE a verified block. Gated: no citation -> not publishable as fact.
2. REASONED JUDGMENTS - an inference or recommendation that RESTS on cited facts (e.g. "this shell is
   underplaced for squad ranked"). The JUDGMENT itself publishes (marked as reasoned); the FACTS it
   stands on are each gated. The gate's job for a judgment is NOT "is this true" - it is "does every
   factual premise under it resolve to a cited block."
3. CONNECTIVE PROSE - framing, transitions, voice. No citation required (it asserts no game-world
   fact).

The discipline: a judgment is legitimate exactly when its factual premises are all cited. Strip the
citations and the judgment is hype; supply them and the same sentence is analysis.

## Store-row citation = PRECONDITION (promoted from residual)

Per-store-row citation (store rows are typed but not yet in the cited_blocks id scheme) was previously
logged as a real-but-non-launch-critical FUTURE upgrade. It is PROMOTED here to a content-model
PRECONDITION: without it, the reasoned-recommendation model is IMPOSSIBLE.

Why: a build recommendation IS a claim about how verified rows interact. If the rows are not citable,
the editor has exactly two options, both bad:
- OMIT the specificity - write general, hedged prose with null verified_source (the Sentinel dry-run
  profile below), or
- ASSERT it uncited - manufacture the specific claim with no staircase (hype).

A reasoned recommendation needs its premise rows to be CITABLE blocks. So store-row citation is
build-order step 1, not a residual. Build FIRST.

## Store adjacency / the "queryable neighborhood"

Citing one row is not enough. A recommendation reasons ACROSS rows - a weapon PLUS its compatible
cores PLUS their stats PLUS the interactions between them. The editor needs the entity's row AND its
verified NEIGHBORHOOD as addressable, citable blocks, so it can build a staircase that spans them.

"Unmodeled adjacency is the boundary of legitimate reasoning." The editor can only reason about
interactions the store actually MODELS. If the store does not record that core X modifies weapon Y,
the editor cannot legitimately reason about that interaction - it would be building a staircase step
that has no verified block under it. The store's relational richness therefore BOUNDS the reasoning:
richer, more connected store -> more (and deeper) legitimate reasoned recommendations. This makes
store adjacency/richness build-order step 2 - the citation scheme (step 1) makes rows citable; the
adjacency modeling makes the neighborhood reasonable-about.

## Gate extension: validate the staircase, release the conclusion

The pre-publish gate extends from "does this claim match a verified value" to "does every factual
PREMISE of this reasoned judgment resolve to a cited block." Gate the staircase; release the
conclusion. A judgment whose premises all cite passes (the recommendation ships, marked reasoned); a
judgment resting on an uncited factual claim fails at that premise (the staircase has a missing step).
This is build-order step 3 - it presupposes citable rows (step 1) and a modeled neighborhood (step 2).

## Sequencing: build-capability-before-publish

The reasoning capability is LAUNCH-CRITICAL, not a fast-follow. The reason is the moat:

"Decent, general, hedged content is the exact profile of the AI filler the moat exists to defeat."

The Sentinel dry-run produced precisely that - a competent, well-voiced, but general and hedged
article with a null verified_source. Shipping that at DMZ-launch would TRAIN the freshly-acquired
launch audience that the site is undifferentiated AI content - the single worst first impression for a
product whose entire thesis is "verified intel, no hype." The differentiator IS the product; it must
EXIST before the product is shown to the launch audience. Publishing decent-general content in the
meantime actively spends the launch's one-time acquisition on the wrong impression.

So the order is not "publish now, improve later." It is BUILD THE CAPABILITY, THEN PUBLISH.

## Build order

1. STORE-ROW CITATION - make verified store rows first-class citable blocks (extend the cited_blocks
   id scheme to per-row store citations). The precondition; without it, steps 3-4 are impossible.
2. STORE ADJACENCY / RICHNESS - model the entity's verified neighborhood (entity + compatible
   cores/mods + their stats + the interactions) as addressable citable blocks, so the editor can
   reason across them within the boundary of what the store models.
3. GATE EXTENSION (premise-validation) - the gate validates that each factual premise of a reasoned
   judgment resolves to a cited block; the conclusion is released as the editor's reasoned judgment.
4. THEN PUBLISH - only once the reasoning capability exists does candidate-driven generation publish
   to the launch audience.

## Implementation note: the held-for-review mechanism for step 4 (designed + proven, 2026-08-10)

Step 4 requires candidate-generated articles to land UNPUBLISHED for human review before going live.
Recording the DESIGN here so the knowledge survives the deletion of the feat/queue-assign-2arm branch
(deleted 2026-08-10 as premature per build-capability-before-publish).

ACCURACY CORRECTION (a claim that kept resurfacing, resolved by code): held-for-review does NOT
"already exist" on main, and there is NO insertGeneratedItem function and NO isPublished parameter.
On main, the feed_items insert is INLINE in processEditor (app/api/cron/route.js) and is_published
comes from the pre-publish gate: `is_published: gateDecision.is_published` (gate-driven; true on
Marathon log-only). There is no held override on main.

What was BUILT + TESTED on the (now-deleted) 2-arm branch, and what step 4 rebuilds:
- THE OVERRIDE: processEditor took a `heldCandidate` param; when set it forced
  `insertData.is_published = false` at the inline insert, and suppressed comment-generation + Discord
  notify. Small wiring on the inline insert -- NOT a separate insertGeneratedItem(article,{isPublished}).
- THE STATE (the load-bearing part): held = is_published=false + gate_status='clear'. That is the
  VANTAGE-discourse DRAFT state -- it appears in GET /api/admin/drafts (which lists is_published=false
  AND gate_status != 'held') and is published ONLY by a human via POST /api/admin/drafts/approve.
- DELIBERATELY NOT gate_status='held': 'held' is the corroboration worklist that AUTO-RELEASES via
  /api/cron/gate-release (lib/gsc/releaseHeld.js flips is_published=true on a clean gate re-pass) AND
  is hidden from the admin drafts list -- using it would auto-publish the draft and hide it from
  review. A custom gate_status='candidate_held' was REJECTED by the DB CHECK constraint
  feed_items_gate_status_check (verified by probe). So the correct reuse is is_published=false +
  gate_status='clear'.
- SO step 4 does not need to INVENT a held mechanism -- the design is proven and recorded here -- but
  it DOES need to REBUILD the small wiring (the is_published=false override at the insert + hooking the
  queue-driven path to a review/publish surface, reusing the admin-drafts approve path), because the
  branch code is deleted.

## The concrete evidence (the Sentinel dry-run, 2026-08-10)

A faithful dry-run generated NEXUS's real article for a thin-substance candidate (Sentinel, one
verified shell entity, no gathered sources). Result: DECENT, GENERAL, HEDGED prose with
verified_source = NULL, and it reached for uncitable specifics (e.g. inventing tier standing the
prompt did not supply). That is the diagnostic: the store rows were not citable, so the editor could
only produce general hedged content or reach for uncited claims. It proves store-rows-not-citable is
the LEVER - fixing it (steps 1-2) is what turns "decent general hedged" into "specific reasoned and
cited." See the dry-run capture + the faithful-dry-run HANDOFF entry.

## Supersession

This SUPERSEDES the parked "editorial opinion lane" backlog note (2026-08-10). That note asked how to
add editorial opinion without diluting the verified-fact moat, and proposed a labeled opinion lane.
The answer is NOT a lane: it is verified-grounded reasoning. Opinion is not a separate space granted
by a label; it is the reasoned conclusion a fully cited factual staircase EARNS. Voice and volume come
from reasoned recommendations on cited premises, not from a fenced-off speculation zone.

## The through-line

The moat is not "we only state bare facts" (that is a database, not a publication). The moat is
"every judgment we publish stands on a verified, cited factual staircase." Gate the premises, release
the reasoning. Build the citable store + its modeled neighborhood + the premise-validating gate FIRST,
then let the editors reason - and only then publish to the audience the launch brings.
