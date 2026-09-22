// lib/gsc/crossGameEntities.js
// CROSS-GAME ENTITY contamination detector (game-aware gate, 2026-09-22). PURE, zero-I/O --
// same posture as corroboration.js / hardStatDetector.js: the caller does the DB read (the
// vocabulary build in storeLoader.loadCrossGameVocab) and the logging; this decides.
//
// THE PROBLEM IT CLOSES. A Wardogs draft that names a MARATHON entity ("Vandal shell",
// "BR33 Volley Rifle", "the Cradle") is model-habit bleed: the specific entity is in NEITHER
// the game-scoped context NOR the prompt, so the model fills thin Wardogs data from training
// knowledge of Marathon. The corroboration classifier never caught it (Wardogs has no registered
// entity store -> empty store -> nothing to contradict), so all 7 rejected drafts cleared with
// gate_findings=null. This detector gives the gate a NAME LIST of the OTHER games' entities and
// holds a fail-closed draft that names one.
//
// PRECISION IS THE WHOLE GAME (a false CROSS_GAME_ENTITY holds a legit article). The rules below
// were tuned against the golden corpus (docs/HANDOFF.md, 2026-09-22 entry):
//   * MULTI-WORD names from any OTHER game (BR33 Volley Rifle, BRRT SMG, Bully SMG, V22 Volt
//     Thrower ...) -> vocabulary, matched case-INSENSITIVELY. Distinctive enough not to collide.
//   * SINGLE-WORD names: ONLY shell names (kind==='shell') qualify, matched case-SENSITIVELY
//     (require the capitalized proper noun). Marathon shells (Destroyer/Triage/Thief/Assassin/
//     Vandal/Sentinel/Rook) are the contamination signal. Single-word WEAPON names are DROPPED --
//     the real-gun games (wardogs/dmz/pubg/bodycam) share bare tokens like M4/AK74/Knife/Longshot,
//     so a bare single-word weapon hit would false-positive on same-genre content.
//   * A name that ALSO exists in the DRAFT's OWN game roster is subtracted (a shared real gun is
//     legitimate, not bleed).
//   * AMBIGUOUS_EXCLUDE: curated generic/role words that are ALSO an other-game entity name are
//     never a bare hit (Recon is a Wardogs XP role AND a Marathon shell -> do NOT hold Wardogs on
//     it; Knife/Longshot/Outland are common words; shell/shells/ranked are generic/ordnance -- the
//     brief forbids adding shell or ranked as hard terms).
//   * MARATHON_SYSTEM_NOUNS: distinctive Marathon system proper nouns with NO store row (so the
//     auto-vocab cannot carry them), added for non-Marathon drafts only, matched case-SENSITIVELY.
//
// The finding shape mirrors hardStatDetector's UNPARSEABLE finding (class/entity/verbatim/slug) so
// decideGate's HOLD_CLASSES filter (prePublishGate.js, keys on f.class) treats it uniformly.

import { sentencesOf } from './corroboration.js';

// Curated Marathon system proper nouns -- distinctive, no store row, unmistakable bleed when they
// appear in another game's draft. Matched CASE-SENSITIVELY (require the capitalized proper noun so
// "runner"/"runners" as common words never trigger).
export const MARATHON_SYSTEM_NOUNS = ['Cradle', 'Runner', 'Runners', 'Holotag', 'Vault Breaker', 'Cryo Archive'];

// Curated AMBIGUOUS / GENERIC lowercase words: an other-game entity name that is ALSO a common word
// or a role/term shared by the real-gun games. Never a bare cross-game hit -- excluded from the
// auto-vocab entirely. (These are the "curated ambiguous flag" from the brief: full-name / exact-
// entity match only, never a bare common-word hit.)
export const AMBIGUOUS_EXCLUDE = new Set([
  'recon', 'knife', 'longshot', 'outland',          // Wardogs role / common words
  'shell', 'shells', 'ranked',                       // generic / ordnance -- brief forbids as hard terms
  'support', 'medic', 'assault', 'pilot', 'driver',  // Wardogs XP roles (defensive -- not Marathon entity names today)
]);

// WHOLE-WORD boundary match, case toggle. Same boundary shape as
// franchiseMarkers.containsWholeWord / coverage.js, but keeps case when caseSensitive so a
// capitalized proper noun is required for the ambiguity-prone single words.
export function matchesWholeWord(needle, haystack, caseSensitive) {
  if (!needle || !haystack) return false;
  const n = String(needle).trim();
  if (!n) return false;
  const esc = n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp('(^|[^A-Za-z0-9])' + esc + '([^A-Za-z0-9]|$)', caseSensitive ? '' : 'i');
  return re.test(String(haystack));
}

// buildCrossGameVocab(ownGame, rows) -> [{ term, sourceGame, caseSensitive }]
//   rows: [{ name, game_slug, kind }] from the shared roster tables across ALL games, where
//         kind is 'weapon' | 'shell' | 'unique'. PURE -- the caller (storeLoader) fetches rows.
// The vocabulary is every OTHER game's entity a draft in `ownGame` must not name, per the rules
// documented at the top of this file.
export function buildCrossGameVocab(ownGame, rows) {
  const list = Array.isArray(rows) ? rows : [];

  // Names owned by the draft's own game (case-insensitive) -- a shared name is legitimate, not bleed.
  const ownNames = new Set();
  for (const r of list) {
    if (r && r.game_slug === ownGame && r.name) ownNames.add(String(r.name).toLowerCase());
  }

  const seen = new Set();
  const vocab = [];
  const add = (term, sourceGame, caseSensitive) => {
    const key = String(term).toLowerCase() + '|' + (caseSensitive ? '1' : '0');
    if (seen.has(key)) return;
    seen.add(key);
    vocab.push({ term, sourceGame, caseSensitive });
  };

  for (const r of list) {
    if (!r || !r.name) continue;
    const name = String(r.name).trim();
    if (!name) continue;
    if (r.game_slug === ownGame) continue;              // same game -> not cross-game
    const low = name.toLowerCase();
    if (ownNames.has(low)) continue;                    // shared with own roster -> legitimate
    if (AMBIGUOUS_EXCLUDE.has(low)) continue;           // curated ambiguous / generic
    const multiWord = /\s/.test(name);
    if (multiWord) {
      add(name, r.game_slug, false);                    // distinctive multi-word -> case-insensitive
    } else if (r.kind === 'shell') {
      add(name, r.game_slug, true);                     // distinctive single-word (shell) -> case-sensitive
    }
    // single-word weapon/unique names are intentionally DROPPED (real-gun token overlap).
  }

  // Curated Marathon system nouns (no store row) -- only for non-Marathon drafts.
  if (ownGame !== 'marathon') {
    for (const n of MARATHON_SYSTEM_NOUNS) add(n, 'marathon', true);
  }

  return vocab;
}

// detectCrossGameEntities(articles, crossGameVocab) -> { findings }
//   articles: [{ slug, headline?, body }]; crossGameVocab: buildCrossGameVocab output.
// A finding per (sentence, vocab term) hit. An absent/empty vocab -> no findings (byte-identical
// for any caller that does not load the vocabulary -- backward compatible). PURE.
export function detectCrossGameEntities(articles, crossGameVocab) {
  const vocab = Array.isArray(crossGameVocab) ? crossGameVocab : [];
  const findings = [];
  if (vocab.length === 0) return { findings };

  for (const art of (articles || [])) {
    if (!art) continue;
    // Scan the headline as its own unit + each body sentence (contamination shows in both).
    const units = [];
    if (art.headline) units.push(String(art.headline));
    for (const s of sentencesOf(art.body)) units.push(s);

    for (const unit of units) {
      for (const v of vocab) {
        if (matchesWholeWord(v.term, unit, v.caseSensitive)) {
          findings.push({
            class: 'CROSS_GAME_ENTITY',
            entity: v.term,
            entity_type: 'cross-game',
            source_game: v.sourceGame,
            field: null,
            claimed_value: null,
            signal: 'cross-game-entity',
            verbatim: unit,
            slug: art.slug,
          });
        }
      }
    }
  }
  return { findings };
}
