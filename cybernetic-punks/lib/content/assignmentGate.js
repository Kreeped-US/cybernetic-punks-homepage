// lib/content/assignmentGate.js
// The pre-generation ASSIGNMENT GATE -- runs the checks on a structured candidate
// (game_slug, entity, facet) and returns what it WOULD decide. See
// docs/CONTENT_PIPELINE_ARCHITECTURE.md "the structural anti-glut gate".
//
// INCREMENT 1 = LOG-ONLY, ALONGSIDE the untouched self-select path:
//   - Checks: (a) substance floor + (b) novelty. (c) CANNIBALIZATION IS STUBBED
//     (returns ran:false) -- deferred to a later increment.
//   - The gate COMPUTES + RETURNS a decision; the CALLER does not act on it.
//     Generation is never blocked or altered this increment.
//   - REINFORCE is a MARKER: a novelty dup returns decision 'reinforce' + the
//     owning slug, LOGGED only -- no reinforce-writer exists yet.

import { substanceFloor } from './substanceFloor.js';
import { checkNovelty, candidateTopicString } from './novelty.js';

// (c) cannibalization: deferred. Explicit stub so the return shape is stable for
// the increment that wires it (query-ownership against canonicals, same routing).
export function cannibalizationStub() {
  return { ran: false, reason: 'deferred-increment-1' };
}

// candidate = { game_slug, entity, facet }
// Decision precedence:
//   reinforce -- an existing page owns the topic (novelty dup). Takes priority: you
//                are NOT writing new, so the substance floor does not gate it.
//   gap       -- novel, but not enough verified substance -> the GAP LEDGER (demand/
//                verify awaiting substance; structurally cannot trigger generation).
//   pass      -- novel AND grounded -> a warranted new article.
export async function runAssignmentGate(candidate, supabase, config) {
  var substance = await substanceFloor(supabase, candidate.game_slug, candidate.entity, candidate.facet, config);
  var topic = candidateTopicString(candidate.entity, candidate.facet);
  var novelty = await checkNovelty(supabase, candidate.game_slug, topic);
  var cannibalization = cannibalizationStub();

  var decision;
  if (novelty.isDup) decision = 'reinforce';
  else if (!substance.passes) decision = 'gap';
  else decision = 'pass';

  return {
    decision: decision,
    substance: substance,
    novelty: novelty,
    cannibalization: cannibalization,
    logged: true,
  };
}
