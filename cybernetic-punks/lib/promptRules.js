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
