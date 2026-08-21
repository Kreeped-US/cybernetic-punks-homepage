// lib/content/candidateAssignment.js
// Queue-driven assignment (content pipeline step 2). Turns a queued
// content_candidate into a directive-shaped assignment the editor can consume, and
// selects the top-priority queued candidate for a game.
//
// INCREMENT 2-OBSERVE = LOG-ONLY: these are used ONLY to BUILD + LOG the assignment
// a candidate WOULD produce. Nothing here generates, publishes, or writes to
// content_candidate. See docs/CONTENT_PIPELINE_ARCHITECTURE.md step 2 (Option A:
// queue-preferred, self-select fallback).

// PURE: format (entity, facet, target_phrase) into a directive-shaped ASSIGNMENT
// block. Deliberately mirrors the language + shape of buildDirectiveBlock in
// app/api/cron/route.js (which is not exported) so a queued candidate rides in on
// the SAME seam a human directive does: "this overrides your normal content
// selection; ASSIGNMENT: ...". The candidate supplies the SUBJECT (entity+facet)
// and, optionally, the FRAMING (target_phrase = the winnable angle/phrasing).
export function buildCandidateDirective(candidate) {
  var entity = candidate && candidate.entity ? candidate.entity : '';
  var facet = candidate && candidate.facet ? candidate.facet : '';
  var subject = [entity, facet].filter(Boolean).join(' ');

  var block = '\n\n--- EDITOR DIRECTIVE -- THIS IS YOUR ASSIGNED TOPIC THIS CYCLE ---\n';
  block += 'You have been given a specific article assignment. This overrides your normal content selection.\n\n';
  block += 'ASSIGNMENT: Write about the ' + subject + '.\n';
  if (candidate && candidate.target_phrase) {
    block += 'FRAMING: ' + candidate.target_phrase + '\n';
    block += 'Shape the piece toward that angle/phrasing where it fits naturally -- do not force it.\n';
  }
  block += '\nWrite your article specifically about this topic. Do not default to generic meta analysis or build content -- cover this assignment directly and thoroughly.\n---';
  return block;
}

// OBJECT-shaped directive a candidate rides for MIRANDA, whose prompt seam is `_directive`
// (an OBJECT the prompt builder consumes) -- NOT the string block above. It mirrors the shape
// of a human directive ROW, so the EXISTING application (prompts.MIRANDA._directive =
// directiveMap['MIRANDA']) and buildMirandaPrompt (which reads _directive.instruction / .url on
// the non-spotlight branch) consume it with ZERO change. `_candidateId` is an internal tag that
// couples the post-generation write-back to THIS candidate (marked done only once the editor
// actually generates). directive_type='standard' takes buildMirandaPrompt's plain-directive path.
export function buildCandidateDirectiveObject(candidate) {
  var subject = [candidate && candidate.entity, candidate && candidate.facet].filter(Boolean).join(' ');
  return {
    directive_type: 'standard',
    instruction: 'Write a field guide about the ' + subject +
      (candidate && candidate.target_phrase ? '. Angle: ' + candidate.target_phrase : ''),
    url: null,
    _candidateId: candidate ? candidate.id : null,
  };
}

// Read-only: the top-priority status='queued' candidate for a game, or null.
// Guarded (a lookup error returns null -- the observe pass is non-fatal).
export async function selectQueuedCandidate(supabase, gameSlug) {
  try {
    var { data, error } = await supabase
      .from('content_candidate')
      .select('id, game_slug, entity, facet, target_phrase, priority')
      .eq('game_slug', gameSlug)
      .eq('status', 'queued')
      .order('priority', { ascending: false })
      .limit(1);
    if (error || !data || !data.length) return null;
    return data[0];
  } catch (err) {
    return null;
  }
}
