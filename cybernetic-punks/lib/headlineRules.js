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
// *** THE TEXT IS UNCHANGED. ***
// Moved verbatim from lib/editorCore.js:321-334, sha256 426fc9c6b18d7ae8. If you edit
// it, you are editing what all five long-form editors AND the rewrite pass are told.
// The game name is still hardcoded ("Marathon"); parameterising it for DMZ is a
// separate, later change and deliberately not folded in here.

export const HEADLINE_RULES = `HEADLINE RULES - NON-NEGOTIABLE:
- Put the game name ("Marathon") and the primary searchable term - the season, weapon, build, map, mode, or topic name - in the first 5-6 words of the headline.
- Target 55 characters or fewer; never exceed 65. This is the WHOLE title Google shows - no site name is appended, so never write "| CyberneticPunks" or any other suffix yourself.
- Persona voice and the specific hook go AFTER the separator (a colon or a dash), never before it.
- Use normal sentence casing or title casing only. Never write any word in all-caps - all-caps headlines read as spam in Google results.
- Use the audience's search vocabulary, not in-universe jargon: write "beginner", "new players", or "streamers", not "Runners" or other lore terms. Lore vocabulary belongs in the article body, not the headline.
- The headline is one string that must also read naturally as the on-page article heading.
Headline examples - BAD then GOOD:
- BAD: CONTENT DROUGHT EXPOSES MARATHON'S TUTORIAL GAP: Single YouTube Creator Highlights Community's Learning Crisis
  GOOD: Marathon's Tutorial Gap: The Content Drought Signal
- BAD: Assassin Shadow Strike Engine: The Season 2 Invisibility Meta That Turns Knife Combat Into Silent Elimination Mastery
  GOOD: Marathon Assassin Build: Shadow Strike Knife Guide (S2)
- BAD: Essential Weapon Mod Builds for New Runners: Start Here Before You Specialize
  GOOD: Marathon Weapon Mods Guide: Essential Beginner Builds`;
