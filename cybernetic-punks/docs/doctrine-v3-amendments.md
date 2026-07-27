# Content Operating Doctrine - Amendment Set A1-A10 (the v3 ledger)

**Date authored:** 2026-07-24. **Applied:** 2026-07-27.

**Version-correction note (recorded per A9).** This set was authored against a remembered "committed doctrine v3" that, on inspection, had never been committed to the repo - no doctrine file existed at any path. The only complete doctrine was v2, first committed on 2026-07-27 at 2fc753b. Applied to that v2 base, this set produces v3, NOT v4 as the original header claimed. The version claims are corrected here; the ten amendment bodies (A1-A10) are unchanged from authoring. This correction is itself an A9 act - the drift is recorded, not silently fixed.

**Format note:** this is an amendment set, not a regenerated doctrine. Regenerating a governing document from a draft that isn't the canonical file is the failure mode A9 names. Each amendment was applied to v2's text at a confirmed anchor; the result is v3. Every amendment cites the event that earned it - all paid for the week of 2026-07-24.

---

## A1 - Gate 4: structured data must be VALID and SOURCED; FAQPage is banned

**Applied as:** three bullets appended to Gate 4's hard-constraints list.

- JSON-LD valid at creation, verified - not merely present. A page whose structured data fails Google's validator does not publish until fixed.
- No FAQPage markup, on any page, any game. Google restricted FAQ rich results to authoritative government/health sites (Aug 2023); the markup earns nothing here even when valid. Visible FAQ content is fine; the schema block is not.
- Structured data carries only sourced or game-verified claims. Markup asserting model-generated prose as structured fact violates Gate 3 even when it validates. Schema inherits the provenance bar, not a lower one.

**Earned by:** the 2026-07-24 audit - entity pages failing schema validation (weapons and uniques) whose FAQPage blocks carried model-generated answers and were rich-result-ineligible the entire time.

## A2 - Gate 4: one title ceiling, prompts and gates must equal it

**Applied as:** one bullet appended to Gate 4's hard-constraints list.

- The title <= 60 ceiling is THE number, and every prompt rule and code gate touching headlines must state the same number. A prompt allowing 65 with a gate at 60 rejects obedience; a gate at 65 ships SERP truncation. When the ceiling changes, prompt and gate change in ONE commit.

**Earned by:** the HEADLINE_RULES 65 vs doctrine 60 tension - framed headlines passing the code gate and still truncating in results.

## A3 - Phase 1: provisional is not noindex (the index gate keys to DEPTH)

**Applied as:** a bullet added to Section 8 Phase 1. This CODIFIES v2's existing Phase-1 intent (provisional canonicals must be indexed to age into authority) and CORRECTS the 2026-07 POI build, which coupled provisional to noindex - a coupling v2 never stated.

- Provisional and incomplete are different states; only one noindexes. A page noindexes because it is INCOMPLETE (a stub), and indexes the day it is depth-complete and spec-compliant - while still provisional, with the visible sourcing line doing the honesty work. The index gate must never key to game-verification: verification is only possible at launch, so keying to it would hold every pre-launch canonical out of the index until launch day and nullify Phase 1's aging strategy.

**Earned by:** the canary POI's verification list reading "correctly noindex (provisional)" - caught one word before it became policy.

## A4 - Gate 3: provenance mechanics (one mechanism, explicit values)

**Applied as:** a REWRITE of Gate 3's "Verification decays ... patch_verified" bullet. This REMOVES the separate patch_verified field; the patch version now lives inside verified_source as game-verified@X.Y. A companion edit to the Section 10 Monday-list item aligns it to the same mechanism. This is the one amendment that deletes a v2 mechanism rather than adding to it.

- Verification decays; live games patch and "verified" rots. Mechanics: the verified + verified_source column pair IS the provenance mechanism on every entity table - never a parallel column recording the same fact (two columns answering "how verified?" is drift with a start date). Provenance values are written explicitly on every insert, never as column DEFAULTs. Promotion is per-row as entities get play-verified, with the patch version carried inside verified_source as game-verified@X.Y, never a bulk flip. A fact is verified as of its patch, not forever.

**Earned by:** the source_state column proposal - the mechanism already existed on the table; the near-miss was building it twice.

## A5 - Gate 3: the primary-source chain rule

**Applied as:** a bullet appended to Gate 3.

- Claims verify against the PRIMARY source - never against this site's own prior articles. Pre-doctrine corpus content is not a source; confirming a claim against it re-imports the risk the provenance system exists to kill. The chain terminates at official material or in-game observation. Entity names and slugs come verbatim from the source's own naming - a "natural sounding" name the source never uses is invented data wearing a URL.

**Earned by:** the Hajin City canary - "south-korea" (source says "Korean peninsula"; tri-point-with-Russia geography contradicts "south") and a description drafted from the site's own pre-doctrine article, both held at the seed step by this rule operating informally. Now formal.

## A6 - the two-lane rule

**Applied as:** a new subsection (### The two-lane rule) inserted after the Gate 5 block. Left plain (no bold-led siblings to match).

Two content lanes, two keyword rules, both correct, never interchangeable:
- Canonical/reference pages are demand-gated (Gates 1-5): keywords legitimately DECIDE what gets built.
- Feed articles are event-triggered (verified intel worth publishing): keywords are a LENS that may reframe a finished headline and never reach the body or the trigger.
A document governing one lane must state which lane it governs. Any text finding these two rules in contradiction has lost track of the lane it is in.

**Earned by:** the GSC-to-editors arc, where the missing scope statement cost seven document versions.

## A7 - first-party data seniority

**Applied as:** three bullets appended to Section 6 after "Close the loop back to Gate 1."

- GSC-sourced candidates are thresholded in the site's own impressions; the Mangools volume floor never applies to them. A query already sending impressions has proven relevance at any measured volume.
- A page ranking position 11-30 is winnability evidence stronger than any modeled KD score - the site is empirically competing.
- Third-party traffic estimates are decision-grade nowhere at this scale (Ahrefs showed 0 on a page GSC shows earning clicks at position 5.5). Prioritization reads GSC, always.

**Earned by:** Consumer B's design and the Ahrefs traffic column being flatly wrong about the site's best page.

## A8 - the enforcement principle

**Applied as:** a new principle (13) appended to Section 11.

- Documented is not enforced - prefer structural enforcement at the layer that cannot be bypassed. Paired-state invariants get a trigger AND a CHECK. Closed value sets get DB CHECKs mirrored to code constants. Attribution columns are NOT NULL with no default. Mapping functions fail loudly on unknown input, never defaulting to an existing value. A rule living only in prose has not shipped.

**Earned by:** the noindex/noindexed_at pairing, the poi_type CHECK that hadn't shipped, the image_alt pairing, and the prefix-rule literal - one week, the same lesson at four sites.

## A9 - governing documents are edited, never regenerated

**Applied as:** a new top-level section (## 12. How this doctrine changes).

This doctrine and every governing design document live committed in docs/ and change by EDIT with the reasoning ledgered - never by regeneration from a draft. A session that rebuilds a document from its own prior copy silently drops every correction it didn't transcribe. Corollary: this doctrine is required reading for any session making content-policy decisions.

**Earned by:** the v6 fork and the "no doctrine position exists" episode - and, this week, the phantom-v3 confusion that this very ledger's header corrects.

## A10 - the indexation check runs as code

**Applied as:** appended to Section 6's "~30 days - indexation check" bullet.

Implemented by the URL Inspection loop (Consumer C): every published page enrolls the day its URL becomes indexable - per URL, at publish, never batched. A page held at noindex for incompleteness (A3) enrolls when it flips.

**Earned by:** the enrollment-timing question on the canary POI, and the sitemap auto-emitting pages the watch wasn't covering.

---

## Applying this set (record)

1. v2 (committed 2fc753b) was edited in place at seven confirmed anchors; the result is v3. The doctrine title line now reads v3.
2. Both files - the amended doctrine and this ledger - commit together; this file is the ledger entry for every line added.
3. The doctrine is added to HANDOFF's required-reading list (A9's corollary).

Nothing in v2 is removed except the standalone patch_verified field (A4, which folds the patch version into verified_source). Every other amendment adds a rule paid for the week of 2026-07-24. The core inversion, the five gates, the calendar, and the authority strategy stand unchanged.
