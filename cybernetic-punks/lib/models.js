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

// PER-GAME ARTICLE MODEL (2026-10-05). A game may opt into a different article model via
// config.editorial.articleModel (lib/games/<slug>.js); a game that omits it uses ARTICLE_MODEL.
// Today only Wardogs opts in (model comparison, 2026-10-05: tells 8.2 -> 1.0 per 1,000 words at
// the same cost per article). Model strings still live ONLY in this file.
export const ARTICLE_MODEL_SONNET_5_5 = 'claude-sonnet-5-5';

export function articleModelFor(config) {
  var m = config && config.editorial && config.editorial.articleModel;
  return (typeof m === 'string' && m) ? m : ARTICLE_MODEL;
}

// Claude 5.x models need a different request shape (see lib/content/articleRequest.js): they
// reject tool_choice {type:'tool'}, think by default (thinking tokens count against max_tokens)
// and tokenize ~38% longer. Matches claude-<family>-5 and claude-<family>-5-<minor>.
export function isClaude5Model(model) {
  return /^claude-[a-z]+-5(?:-\d+)?(?:-\d{8})?$/.test(String(model || ''));
}

// PRICE TABLE -- the ONE place per-token prices live. USD per million tokens, base rates (no
// caching / batch), from the Anthropic pricing page (platform.claude.com/docs/en/about-claude/
// pricing) read 2026-10-05. Thinking tokens are billed as output tokens. Unknown model -> null cost.
export const MODEL_PRICES_PER_MTOK = {
  'claude-sonnet-4-6': { input: 3, output: 15 },
  'claude-sonnet-5-5': { input: 2, output: 10 },
  'claude-opus-5-5': { input: 4, output: 20 },
  'claude-haiku-4-5-20251001': { input: 1, output: 5 },
};

export function estimateCostUsd(model, usage) {
  var p = MODEL_PRICES_PER_MTOK[model];
  if (!p || !usage) return null;
  var cost = ((usage.input_tokens || 0) * p.input + (usage.output_tokens || 0) * p.output) / 1e6;
  return Math.round(cost * 1e6) / 1e6;
}
