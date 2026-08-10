// lib/content/assignmentGate.js
// The pre-generation ASSIGNMENT GATE -- runs the checks on a structured candidate
// (game_slug, entity, facet) and returns what it WOULD decide. See
// docs/CONTENT_PIPELINE_ARCHITECTURE.md "the structural anti-glut gate".
//
// LOG-ONLY, ALONGSIDE the untouched self-select path:
//   - Checks: (a) substance floor + (b) novelty. (c) CANNIBALIZATION IS STUBBED
//     (returns ran:false) -- deferred to a later increment.
//   - The gate COMPUTES + RETURNS a decision; the CALLER does not act on it.
//     Generation is never blocked or altered.
//   - REINFORCE is a MARKER: it returns decision 'reinforce' + the owning slug,
//     LOGGED only -- no reinforce-writer exists yet.
//
// 1d-arm (the reinforce TRIGGER, empirically grounded): reinforce fires on PHRASE
// CONTAINMENT (novelty.nearPhrase===true -- the candidate bigram appears
// contiguously in an existing page). A 10-seed adversarial set proved phrase=yes
// separates true reinforces from cov=1.00 FALSE-POSITIVES 100%, where coverage AND
// Jaccard both failed (both false-positives read cov=1.00). The old isDup
// (Jaccard>=0.7) path is KEPT as ALSO reinforce (a real dup is still a dup), so
// reinforce = (isDup OR phrase). STILL LOG-ONLY OVERALL: 1d-arm only changes which
// decision is COMPUTED + LOGGED -- the reinforce-WRITER does not exist and is NOT
// built here; nothing reads this disposition to act.

import { substanceFloor } from './substanceFloor.js';
import { checkNovelty, candidateTopicString } from './novelty.js';

// (c) cannibalization: deferred. Explicit stub so the return shape is stable for
// the increment that wires it (query-ownership against canonicals, same routing).
export function cannibalizationStub() {
  return { ran: false, reason: 'deferred-increment-1' };
}

// candidate = { game_slug, entity, facet }
// Decision precedence:
//   reinforce -- an existing page owns the topic: phrase containment (nearPhrase)
//                OR a Jaccard>=0.7 dup (isDup). Takes PRIORITY: you are NOT writing
//                new, so the substance floor does NOT gate it (a phrase=yes candidate
//                reinforces regardless of substance).
//   gap       -- novel, but not enough verified substance -> the GAP LEDGER (demand/
//                verify awaiting substance; structurally cannot trigger generation).
//   pass      -- novel AND grounded -> a warranted new article.
export async function runAssignmentGate(candidate, supabase, config) {
  var substance = await substanceFloor(supabase, candidate.game_slug, candidate.entity, candidate.facet, config);
  var topic = candidateTopicString(candidate.entity, candidate.facet);
  var novelty = await checkNovelty(supabase, candidate.game_slug, topic);
  var cannibalization = cannibalizationStub();

  // reinforce = phrase containment (the empirically clean signal) OR a real
  // Jaccard>=0.7 dup. Substance does NOT gate reinforce (not writing new).
  var isReinforce = novelty.nearPhrase === true || novelty.isDup === true;
  // The owning page: a Jaccard dup exposes dupSlug; a phrase near-match exposes nearSlug.
  var reinforceTarget = isReinforce ? (novelty.dupSlug || novelty.nearSlug || null) : null;

  var decision;
  if (isReinforce) decision = 'reinforce';
  else if (!substance.passes) decision = 'gap';
  else decision = 'pass';

  return {
    decision: decision,
    reinforceTarget: reinforceTarget,
    substance: substance,
    novelty: novelty,
    cannibalization: cannibalization,
    logged: true,
  };
}
