// lib/models.js
// SINGLE SOURCE OF TRUTH for the Anthropic model strings used across the app.
//
// WHY: the June 2026 outage was a retired Sonnet snapshot 404ing, and the fix
// had to touch FIVE hardcoded copies of the string. Centralizing here makes the
// next model change (or retired-snapshot fix) a ONE-LINE edit that can't
// partially-break. Everything imports from here; no other file should hold a
// literal `claude-*` model string.
//
// Pure constants - no dependencies - so this imports cleanly in every context
// (the cron, API routes, gather modules, the dev route).
//
// NOTE: this does NOT detect deprecation. The cron failure alert
// (lib/alertEmail.js) catches a retired model at RUNTIME; this module makes the
// FIX one line. The two together = the next deprecation surfaces fast and fixes
// fast.

// Articles + analysis (CIPHER/NEXUS/DEXTER/GHOST/MIRANDA generation, dexter
// stat extraction, ask-editor, audit, advisor) -- all Sonnet.
export const ARTICLE_MODEL = 'claude-sonnet-4-6';

// Editor reaction comments -- Haiku (smaller/faster; the cranked comment voices
// were verified to land on it).
export const COMMENT_MODEL = 'claude-haiku-4-5-20251001';

// Keyword-framing pass 2 (lib/keywordFraming.js): rewrite ONE headline toward a
// studied keyword. A constrained, mechanical transformation -- it does not need a
// frontier model, and it runs per matched article, so the cost profile matters.
//
// DATED SNAPSHOT, NOT AN ALIAS -- deliberately, and for a different reason than
// ARTICLE_MODEL's alias. An alias re-pointing underneath a SCHEDULED cron is a
// reproducibility hole: headline framing would silently change character with no
// diff, no deploy and no signal. Pass 2 follows COMMENT_MODEL's pattern.
//
// SEPARATE from COMMENT_MODEL even though the string matches today. They are two
// independent decisions -- comment voice was tuned on Haiku, headline rewriting was
// chosen for cost. Sharing one constant would silently couple them, so that
// re-tuning one would move the other. The duplicated string is the cheaper mistake.
export const HEADLINE_REWRITE_MODEL = 'claude-haiku-4-5-20251001';
