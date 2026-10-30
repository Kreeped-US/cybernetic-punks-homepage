// lib/content/pipelineMarkers.js
// PUBLISH-GATE CHECK for literal pipeline markers in an article body (Brief 246). lib/verification.js
// verificationTag(row) appends " [SOURCE-LISTED]" or " [UNVERIFIED]" to stat lines in the model's
// reference data; the prompts tell writers to say it in words ("unconfirmed", "sources list it as")
// and never to repeat the marker. Nothing stopped a model from copying one: 19 reached 9 published
// Marathon articles. PURE, zero-I/O, game-agnostic.
//
// The tokens come from VERIFICATION_MARKERS (lib/verification.js), so the gate follows the generator.
// Matched bracketed exactly as shown, case-insensitively. Bare words ("unverified", "source-listed")
// and other bracket text ([Chip], stat brackets) are NOT matched.

import { VERIFICATION_MARKERS } from '../verification.js';

export const PIPELINE_MARKER_TOKENS = Object.freeze(Object.values(VERIFICATION_MARKERS));

var escapeRe = function (s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); };
var MARKER_RE = new RegExp(PIPELINE_MARKER_TOKENS.map(escapeRe).join('|'), 'gi');

// A 60-character window centred on the hit (token included), whitespace collapsed.
var CONTEXT_CHARS = 60;
function context(body, start, end) {
  var pad = Math.max(0, Math.floor((CONTEXT_CHARS - (end - start)) / 2));
  return body.slice(Math.max(0, start - pad), end + pad).replace(/\s+/g, ' ').trim();
}

// findPipelineMarkers(body) -> [{ token, matched, index, context }], one per occurrence.
//   token: the canonical marker; matched: as written in the body.
export function findPipelineMarkers(body) {
  var s = body == null ? '' : String(body);
  var out = [];
  var m;
  MARKER_RE.lastIndex = 0;
  while ((m = MARKER_RE.exec(s)) !== null) {
    var upper = m[0].toUpperCase();
    var token = PIPELINE_MARKER_TOKENS.find(function (t) { return t.toUpperCase() === upper; });
    out.push({ token: token, matched: m[0], index: m.index, context: context(s, m.index, m.index + m[0].length) });
  }
  return out;
}

// One plain message per finding, for logs and the approve error.
export function describePipelineMarker(f) {
  return 'The body contains the literal pipeline marker ' + f.token + "; say it in words, for example 'unconfirmed' or 'sources list it as'.";
}
