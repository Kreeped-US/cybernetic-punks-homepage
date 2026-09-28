// lib/promptRules.js
// SINGLE SOURCE OF TRUTH for cross-generator prompt rules that must read identically everywhere
// (2026-09-24). A rule defined here is imported by every generator that needs it, so it can never
// drift into per-file copies. First tenant: the NO-PIPELINE/META-TALK rule -- born in editorCore's
// DATA_INTEGRITY_RULES (bb34280), now hoisted here so the advisor build generator
// (lib/advisor/generateBuild.js) appends the SAME text instead of a second copy.
//
// The text is output-neutral ("in the article body" wording kept verbatim from its editorCore origin
// so the news-writer prompt renders byte-identical; the advisor's reader-facing build reasons are the
// same kind of reader-facing prose, so the rule applies cleanly there too). Includes its own leading
// "- " bullet so a caller drops it in as one line.

export const NO_META_TALK_RULE =
  '- NO PIPELINE / META TALK: never mention your reference data, "the database", your sources, your ' +
  "context, or a value's verification/confidence status in the article body. Those things describe " +
  'YOUR inputs - they are not article vocabulary. Write only reader-facing prose: state the facts you ' +
  'are allowed to state, and silently omit anything you are not.';

// OUR ASSESSMENT framing (2026-09-28). Editorial DB columns (tier ratings, ranked notes, meta ratings,
// strengths/weaknesses, best-for, recommended playstyle, holotag recommendation, free-text notes) are
// the SITE'S OWN JUDGEMENT, not game fact. They are grouped under an "OUR ASSESSMENT" heading in the
// context, separate from the verified fact block. Anything from there must be framed as our take
// ("our tier list rates...", "we consider...") and never stated as a property of the game itself.
export const OUR_ASSESSMENT_RULE =
  '- OUR ASSESSMENT vs GAME FACT: anything shown under an "OUR ASSESSMENT" heading is Cybernetic Punks\' ' +
  'own editorial rating or opinion (tier placements, meta ratings, ranked notes, strengths/weaknesses, ' +
  'best-for, recommended playstyle, free-text notes), NOT a fact about the game. When you use it, frame ' +
  'it as our view ("our tier list rates it S-tier", "we consider it ranked-viable") -- never assert it ' +
  'as game fact ("it is the top sniper", "it is an S-tier shell"). Verified game facts (the fact block, ' +
  'no marker) may be stated plainly; assessments must always be attributed to us.';

// MOD-WEAPON COMPATIBILITY (2026-09-28). Mod-to-weapon fit is only known when a mod row's verified
// compatibility lists the weapon (compatible_weapons) or its category (compatible_categories). Sharing
// a SLOT is NOT compatibility. When compatibility is not in the data, the model must not invent it.
export const MOD_COMPATIBILITY_RULE =
  '- MOD/WEAPON COMPATIBILITY: only claim a specific mod fits a specific weapon when the mod is shown as ' +
  'compatible with that weapon (by name) or its weapon category. A shared equipment SLOT does NOT mean a ' +
  'mod fits a weapon. If a mod\'s compatibility is marked unverified or is not shown, do NOT name it as ' +
  'fitting that weapon -- recommend mods by slot and effect in general terms instead, or omit them.';

// ENTITY-MECHANIC INVENTION (2026-09-28). The recurring "Assassin runs hot" failure: the model
// INFERRED a heat/overheat mechanic for a shell from its name/theme, with nothing in the data saying
// so. A mechanical behavior is a FACT about the game, not analysis -- it may only be stated when the
// reference data states it for that specific thing. Game-agnostic (no shell/core nouns), sibling to the
// rules above.
export const ENTITY_MECHANIC_RULE =
  '- ENTITY MECHANICS - NO INVENTED BEHAVIOR: attribute a mechanical property or behavior to a specific ' +
  'item, weapon, ability, or piece of kit (e.g. it "runs hot" / overheats, has a cooldown or ramp-up, ' +
  'stacks, decays, reloads on a kill, generates heat or energy, ramps damage over time) ONLY when that ' +
  'exact mechanic appears in the reference data for that thing. Do NOT infer a mechanic from its name, ' +
  'role, or theme, or from how a similar thing behaves elsewhere. If the data does not state a mechanic, ' +
  'describe the thing from the facts you were given and omit the mechanic -- an inferred mechanic is ' +
  'fabrication, not analysis.';

// SELF-SELECTED SUBJECT MUST BE CONFIRMED (2026-09-28). When the editor picks its own topic (no assigned
// directive), a stat/kit-driven guide must center on a subject whose details are CONFIRMED in context (a
// fact line with NO confidence marker). Anchoring a guide on an [UNVERIFIED] / [SOURCE-LISTED] / absent
// subject is the same false-anchor failure the grounding CONFIRMED-subject gate blocks on the directive
// path (grounding.js) -- this is its self-select counterpart, stated to the model. Game-agnostic.
export const SELF_SELECT_SUBJECT_RULE =
  '- ANCHOR ONLY ON CONFIRMED SUBJECTS: when you choose your own topic, build a stat- or kit-driven guide ' +
  'around a specific thing ONLY if its details are CONFIRMED in your reference data (a fact line carrying ' +
  'NO confidence marker). If the thing you have in mind appears only as [UNVERIFIED] or [SOURCE-LISTED], ' +
  'or is not in the data at all, do NOT anchor a guide on it as though its specifics were established -- ' +
  'choose a subject you can ground, or stay qualitative and do not assert its unconfirmed specifics. A ' +
  'guide whose central subject has no confirmed data is the invented-claims failure mode.';
