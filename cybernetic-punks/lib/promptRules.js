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
