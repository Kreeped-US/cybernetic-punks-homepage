// lib/corrections/match.js
// ============================================================
// SHARED CORRECTION MATCHER -- the SINGLE source of the entity+keyword
// co-occurrence logic. No drift.
// ============================================================
// Used by BOTH halves of the correction sweep:
//   - piece 1 (detect existing): scripts/correction-sweep.mjs -- read-only sweep
//     of published content per registry entry.
//   - piece 2 (prevent new): scripts/publish-drafts.mjs + app/api/admin/drafts/approve
//     -- an advisory guard that WARNS when a draft being published co-occurs a
//     recorded correction's entity+keywords.
// One matcher means detect-existing and prevent-new can never disagree.
//
// WHOLE-WORD, case-insensitive -- NOT a bare substring. `body ILIKE '%elo%'`
// matches "below"/"develop"; word-boundary keeps recall of the real term ("elo",
// "tier", "solo queue") and drops substring accidents.
//
// HIGH-RECALL, LOW-PRECISION by design. A match flags a CANDIDATE for human
// judgment -- the sweep surfaces it for review, the guard WARNS and asks for
// acknowledgment. Legitimate mentions and disclaimers ("Rook is not a ranked
// pick") co-occur and are correct to co-occur. Callers NEVER auto-remove or
// hard-block on a match.

import { CORRECTIONS } from './registry.js';

// Whole-word, case-insensitive regex for an arbitrary term (regex chars escaped).
export function wordRe(term) {
  return new RegExp('\\b' + String(term).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
}

// Split prose into sentences for snippet extraction (CRLF-normalized, blank-line-
// and .!?-split, markdown bold stripped).
export function sentences(body) {
  return String(body || '')
    .replace(/\r/g, '')
    .split(/\n+|(?<=[.!?])\s+/)
    .map((s) => s.replace(/\*\*/g, '').trim())
    .filter(Boolean);
}

// One body vs ONE correction's entity+keywords. Returns { keywordsFound, sentenceHits }
// when the body contains the entity AND at least one keyword (both whole words),
// else null. sentenceHits are sentences where entity and a keyword co-occur (the
// strongest review signal); an empty sentenceHits with non-empty keywordsFound is a
// document-level co-occurrence (entity and keyword in separate sentences).
export function analyze(text, entity, keywords) {
  const body = String(text || '');
  if (!wordRe(entity).test(body)) return null;
  const keywordsFound = keywords.filter((k) => wordRe(k).test(body));
  if (keywordsFound.length === 0) return null;
  const entityRe = wordRe(entity);
  const sentenceHits = sentences(body).filter(
    (s) => entityRe.test(s) && keywords.some((k) => wordRe(k).test(s))
  );
  return { keywordsFound, sentenceHits };
}

// One body vs ALL registry entries for a game_slug. This is what the publish-time
// guard calls: "does this draft assert any corrected-away claim for its game?"
// Returns [{ entry, keywordsFound, sentenceHits }] (empty array = clean).
// A falsy gameSlug matches across all games (do not rely on that for the guard --
// always pass the draft's game_slug so a correction never bleeds across games).
export function matchCorrectionsForBody(body, gameSlug, corrections = CORRECTIONS) {
  const out = [];
  for (const entry of corrections) {
    if (gameSlug && entry.game_slug !== gameSlug) continue;
    const a = analyze(body, entry.entity, entry.topic_keywords);
    if (a) out.push({ entry, keywordsFound: a.keywordsFound, sentenceHits: a.sentenceHits });
  }
  return out;
}
