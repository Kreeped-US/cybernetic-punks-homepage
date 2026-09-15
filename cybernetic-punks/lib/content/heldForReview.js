// lib/content/heldForReview.js
// STEP 4 (content model, docs/VERIFIED_GROUNDED_REASONING.md): held-for-review.
//
// When the content model is ARMED (STORE_ROW_CITATION_ENABLED on), the reasoning
// editor's (NEXUS) articles land HELD-FOR-REVIEW instead of auto-publishing, so a
// human approves them before they go live. Held = is_published=false +
// gate_status='clear' -- the admin-drafts DRAFT state: shown in GET /api/admin/drafts
// (which lists is_published=false AND gate_status != 'held') and published ONLY by a
// human via POST /api/admin/drafts/approve. Deliberately NOT gate_status='held', which
// is the corroboration worklist that AUTO-RELEASES via /api/cron/gate-release
// (lib/gsc/releaseHeld.js) AND is hidden from the drafts list.
//
// FLAG OFF -> heldForReviewApplies is false -> no override -> byte-identical to today.
// Pure + node-testable; the cron applies it at the inline insert in processEditor.

// The editor(s) whose ARMED output is HELD-FOR-REVIEW before going live. Both active
// Marathon auto-editors are here: NEXUS (Meta & News, gated to durable-only in a reset
// window -- see lib/content/durabilityGate.js) and MIRANDA (evergreen, demand-gated queue
// consumer). MIRANDA added 2026-09-15: previously her guides AUTO-PUBLISHED (she was not in
// this list) -- the un-reviewed dup-mint risk. Now both land as a DRAFT (is_published=false,
// gate_status='clear') for operator approval. The durability gate's output backstop also holds
// any stale-fast headline independently, so even an editor NOT listed here cannot auto-publish
// reset-invalidated churn while the game is reset-restricted.
export const HELD_EDITORS = ['NEXUS', 'MIRANDA'];

// Does held-for-review apply to this article? True iff the flag is on AND the editor
// is a reasoning editor. (recommendations-only narrowing is a deliberate later step.)
export function heldForReviewApplies(editorName, flagOn) {
  return !!flagOn && HELD_EDITORS.indexOf(editorName) !== -1;
}

// The publish-state override for a held article: unpublished + the DRAFT status
// (NOT 'held', which would auto-release). Applied over the gate-driven insertData
// values; a human approve later flips is_published to true.
export function heldPublishState() {
  return { is_published: false, gate_status: 'clear' };
}
