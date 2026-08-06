// lib/gsc/hardStatDetector.js
// STAGE 1 of the two-stage detector (Phase 2b) -- the gate's EYESIGHT. PURE, zero-I/O.
//
// Stage 1 is a deliberately HIGH-RECALL (over-broad) hard-stat-sentence detector: it flags any
// sentence that LOOKS like it asserts a checkable hard stat about a known entity. The combiner
// then runs Stage 2 (the precise claim grammar, extractTriples); a Stage-1 hit that Stage 2
// CANNOT parse is an UNPARSEABLE finding -- the loud path (blindness is never silence).
//
// ERR BROAD (Ruling 1): too-broad costs BOUNDED triage-work paid pre-arming (on Marathon
// log-only, breadth over-holds NOTHING -- it only inflates the gap, which is triage). Too-narrow
// costs SIGHT: a never-flagged stat sentence is silent-blind with no badge. So when in doubt, FLAG.
//
// THE FALSE-POSITIVE POLICY (the "9 POIs" borderline, decided here): a hit requires a known
// entity AND a STAT CONTEXT. A bare number with NO stat context (a date, a price, a count -- "9
// POIs", "$70", "top 5 loadouts") is NOT a hard-stat sentence. Stat context = delta language, a
// percent, a unit-bearing value, a comparative/superlative stat relation, a no-extractor category
// (tier/velocity/precision -- mention alone), OR a stat-field word co-present with a number.

import { containsWholeWord } from './franchiseMarkers.js';
import { extractTriples, sentencesOf } from './corroboration.js';

// Stat-field vocab that has an extractor (needs a co-present NUMBER to be a stat claim).
const STAT_FIELD_VOCAB = /\b(damage|fire ?rate|rpm|rounds per minute|magazine|mag|health|range|handling|recoil|falloff|ads|reload|accuracy|mobility|stability|cost|credits?|cash)\b/i;
// NO-EXTRACTOR categories: the store has no column, so Stage 2 can NEVER parse these -> a mention
// with an entity is a hard-stat claim on its own (mode 2 blindness). Flag on vocab alone.
const NO_EXTRACTOR_VOCAB = /\b(tier|velocity|precision)\b/i;
// Delta language (mode 1 blindness -- "damage increased from 23 to 28").
const DELTA_LANG = /\b(from\s+[\d.]+\s+to\s+[\d.]+|buffed|nerfed|increased|decreased|reduced|raised|lowered|bumped|up to|down to)\b/i;
// Unit-bearing values: 250ms, 45 m/s, 1.5x zoom, 0.3 seconds.
const UNIT_TOKENS = /\b\d+(?:\.\d+)?\s?(?:ms|m\/s|meters?|metres?|seconds?|secs?)\b|\b\d+(?:\.\d+)?x\b/i;
// Comparative / superlative stat relations ("higher velocity than", "fastest ADS") -- assert a
// checkable relation even with no number; pure mode-1/2 blindness if unflagged.
const COMPARATIVE = /\b(higher|lower|faster|slower|stronger|weaker|more|less|better|worse|fastest|slowest|highest|lowest|strongest|weakest)\b[^.]{0,40}\b(than|damage|velocity|fire ?rate|rpm|health|range|recoil|handling|ads|reload|accuracy|mobility|tier)\b/i;
const PERCENT = /\d+(?:\.\d+)?\s?%/;
// Stat NEGATIONS ("no longer one-shots", "can no longer two-tap") -- a claim the grammar cannot
// check; err broad and flag it (a false-positive like "no longer the meta pick" is bounded triage).
const NEGATION = /\b(no longer|can no longer)\b/i;

// isHardStatSentence(sentence, presentEntities) -> { hit, signal }. presentEntities = the store
// entities named in the sentence (the caller computes whole-word presence). No entity -> no hit.
export function isHardStatSentence(sentence, presentEntities) {
  if (!presentEntities || presentEntities.length === 0) return { hit: false, signal: null };
  const s = String(sentence || '');
  if (DELTA_LANG.test(s)) return { hit: true, signal: 'delta' };
  if (PERCENT.test(s)) return { hit: true, signal: 'percent' };
  if (UNIT_TOKENS.test(s)) return { hit: true, signal: 'unit' };
  if (COMPARATIVE.test(s)) return { hit: true, signal: 'comparative' };
  if (NEGATION.test(s)) return { hit: true, signal: 'negation' };
  if (NO_EXTRACTOR_VOCAB.test(s)) return { hit: true, signal: 'no-extractor-category' };
  if (STAT_FIELD_VOCAB.test(s) && /\d/.test(s)) return { hit: true, signal: 'stat-field+number' };
  return { hit: false, signal: null };
}

// THE COMBINER. Runs Stage 1 + Stage 2 over articles; emits UNPARSEABLE findings (Stage-1 hit AND
// Stage 2 parsed nothing) + the gap counts. Same articles/store shape as classifyCorroboration.
// Returns { unparseable, gap: { stage1_hits, stage2_parsed, gap } }.
export function detectUnparseable(articles, store) {
  const entities = (store && store.entities) || [];
  const withTerms = entities.map((e) => ({ e, terms: [e.name].concat(e.aliases || []).filter(Boolean) }));
  const unparseable = [];
  let stage1_hits = 0;
  let stage2_parsed = 0;

  for (const art of (articles || [])) {
    for (const sentence of sentencesOf(art.body)) {
      const present = withTerms.filter((wt) => wt.terms.some((t) => containsWholeWord(t, sentence))).map((wt) => wt.e);
      if (present.length === 0) continue;
      const s1 = isHardStatSentence(sentence, present);
      if (!s1.hit) continue;
      stage1_hits++;
      const { triples } = extractTriples(sentence, present);
      if (triples.length > 0) { stage2_parsed++; continue; } // Stage 2 parsed it -> handled by the classifier
      // Stage-1 hit, Stage-2 EMPTY -> UNPARSEABLE (unverifiable-by-instrument = hold-class for DMZ).
      unparseable.push({
        class: 'UNPARSEABLE',
        entity: present[0].name,
        entity_type: present[0].type,
        field: null,
        claimed_value: null,
        signal: s1.signal,
        verbatim: sentence,
        slug: art.slug,
      });
    }
  }
  return { unparseable, gap: { stage1_hits, stage2_parsed, gap: stage1_hits - stage2_parsed } };
}
