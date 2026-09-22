// lib/headlineRules.js
// ============================================================
// HEADLINE RULES -- the one copy, shared by both passes.
// ============================================================
// Commit (b2) of the keyword-framing build. See docs/KEYWORD_SYSTEM_CONSOLIDATED.md
// Part 8 (b2).
//
// WHY A SEPARATE MODULE. Commit (b) extracted this constant from five byte-identical
// inline copies in lib/editorCore.js. Commit (e) needs the SAME text for the
// headline-rewrite pass, so that a rewritten headline is held to the rules the
// original was written under. It could not import it: the constant was
// module-private, and exporting it from editorCore.js would have made the rewrite
// path depend on a 107 KB module that pulls in the Anthropic SDK, models,
// verification, availability, games and promptSafety -- for one string.
//
// This module imports NOTHING. That is the point: a leaf cannot participate in an
// import cycle, and both passes can depend on it freely.
//
// *** DE-MARATHONED (2026-09-22, fix/headline-rules-de-marathon). ***
// Was moved verbatim from lib/editorCore.js:321-334 (sha256 426fc9c6b18d7ae8) with the game
// name and all three headline EXAMPLES hardcoded to Marathon. Those Marathon specifics were the
// last prompt-priming leak into other games' generation (root cause #2 of the Marathon->Wardogs
// contamination trace): an example headline is a claim the model imitates, so "Marathon Assassin
// Build" / "New Runners" primed non-Marathon editors toward Marathon vocabulary. They are now
// behind the SAME token/config pattern Stage 2b used:
//   - {{cnp:game}}              -> the game name (config.displayName). Marathon -> "Marathon".
//   - {{kit:headlineLoreExample}} -> the "not lore jargon" example. Marathon -> "Runners".
//   - {{kit:headlineExamples}}    -> the whole BAD/GOOD example block. Marathon carries its
//                                    CURRENT text VERBATIM (config.editorial.promptKit.vocab);
//                                    a game without it gets game-NEUTRAL bracket-placeholder
//                                    examples (resolveKit default -- NO invented game facts).
// BYTE-IDENTICAL for Marathon: resolving this string with Marathon's config (applyKit then
// applyVocab) reproduces the old constant exactly. TWO consumers resolve it: editorCore's five
// editors at the applyKit/applyVocab chokepoint, AND lib/keywordFraming.js's rewrite pass (which
// resolves it itself before the model call -- it does NOT go through the chokepoint). If you edit
// it, you are editing what all five long-form editors AND the rewrite pass are told.

// THE ONE HEADLINE CEILING. Defined here and consumed everywhere -- the prose below
// interpolates it, lib/keywordFraming.js imports it as the code gate, and the five
// lib/editorCore.js tool-field descriptions interpolate it too. One number, one
// source: the prompt ceiling, the tool-schema ceiling, and the code gate can never
// disagree again. (They drifted before: the prose/gate sat at 65 while the render
// path -- app/intel/[slug]:190, maps/[slug]:200, matchups/[shell]:81 -- already
// treats 60 as the <title> budget, so a 61-65 headline shipped and then TRUNCATED in
// Google. 60 closes that live contradiction; it is Gate 4, not a preference.)
export const HEADLINE_MAX_CHARS = 60;

export const HEADLINE_RULES = `HEADLINE RULES - NON-NEGOTIABLE:
- Put the game name ("{{cnp:game}}") and the primary searchable term - the season, weapon, build, map, mode, or topic name - in the first 5-6 words of the headline.
- Target 55 characters or fewer; never exceed ${HEADLINE_MAX_CHARS}. This is the WHOLE title Google shows - no site name is appended, so never write "| CyberneticPunks" or any other suffix yourself.
- Persona voice and the specific hook go AFTER the separator (a colon or a dash), never before it.
- Use normal sentence casing or title casing only. Never write any word in all-caps - all-caps headlines read as spam in Google results.
- Use the audience's search vocabulary, not in-universe jargon: write "beginner", "new players", or "streamers", not "{{kit:headlineLoreExample}}" or other lore terms. Lore vocabulary belongs in the article body, not the headline.
- The headline is one string that must also read naturally as the on-page article heading.
Headline examples - BAD then GOOD:
{{kit:headlineExamples}}`;
