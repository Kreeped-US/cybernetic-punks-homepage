// lib/editors/nexusTierList.js
// NEXUS TIER-LIST GATE (2026-10-05). Only a game that sets nexusTierRegrade (lib/games/<slug>.js; Marathon
// today) has a NEXUS-maintained tier table: the cron injects a CURRENT TIER STATE block and stores NEXUS's
// meta_update ONLY for those games (app/api/cron/route.js). For any other game the tier instructions made
// NEXUS claim tier actions that never happen ("we are seeding the list as a baseline"). This module holds
// the tier section VERBATIM (moved here from lib/editorCore.js, so a tier game's prompt is byte-identical)
// plus the replacement section and tool shape for a game without a tier table. PURE, zero I/O.

export function nexusMaintainsTierList(config) {
  return !!(config && config.nexusTierRegrade);
}

// The NEXUS system-prompt tier section, verbatim. Rendered into EDITOR_PROMPTS.NEXUS by lib/editorCore.js.
export const NEXUS_TIER_SECTION = `META TIER OUTPUT - GATED BY REGRADE WINDOW:

SPLIT-TIER ITEMS - HOW TO ASSIGN THE UNIFIED tier FIELD:
Some items have different viability in solo vs squad play (an item can be S-tier squad utility but D-tier solo). For these items:
- ALWAYS set ranked_tier_solo and ranked_tier_squad to the correct mode-specific tier
- Set the unified "tier" field to the HIGHER of the two mode-specific tiers
- Example: an item with ranked_tier_solo=D and ranked_tier_squad=S should have tier=S (not D)
{{kit:cta.metaTierBullet}}
- Reasoning: a visitor scanning tiers should see such an item in the S-tier section (where it dominates squad) with a "SOLO D" badge clarifying the trade-off, not buried in D-tier (where it sits if you collapse to the lower value)

You will see a CURRENT TIER STATE block injected into your user prompt below. That block tells you the current tier of every {{kit:metaEntitiesSingular}} as you last graded them, AND whether you are regrading today.

When you ARE regrading today (the block will say "You are GRADING TODAY"):
- Return a complete meta_update array covering ALL {{kit:metaEntitiesAll}} from the database
- Most items should remain at their current tier from the CURRENT TIER STATE block - only move tiers when patch context, community signal, or stat changes from your sources justify the move
- The cron computes the trend field algorithmically by comparing your new tier to the prior tier - you do not need to think about trend, just submit tier values you can defend

When you are NOT regrading today (the block will say "You are NOT regrading today"):
- Return an empty meta_update array, OR omit meta_update entirely
- Write your article as meta analysis using the CURRENT TIER STATE block as context
- Do NOT propose new tier assignments - the tier table only updates once per 24 hours or on patch detection

If no CURRENT TIER STATE block appears, assume you are seeding the tier table for the first time and grade all items with reasonable defaults (B for items you have no signal on).

Grade ONLY the entities present in your provided database / CURRENT TIER STATE for this game -- never a roster recalled from memory or from another game.`;

// Replacement for a game WITHOUT a NEXUS tier table.
export const NEXUS_NO_TIER_SECTION = `TIER LIST - NOT MAINTAINED BY THIS DESK FOR THIS GAME:
This desk does not grade, seed, update or publish a tier list for this game, and nothing you write is stored as tier placements. In the headline, body and promo_tweet, never say or imply that we graded, seeded, updated, published or set a baseline for a tier list or tier placements, and never describe a tier move as our action. Do not return a meta_update array.
You may report what a source says about tiers (for example, that a creator published a tier-list video), attributed to that source.`;

// System prompt for a game without a tier table: the tier section swapped for NEXUS_NO_TIER_SECTION.
// A tier game (or a prompt without the section) is returned unchanged -- the same string.
export function applyNexusTierGate(systemPrompt, config) {
  if (nexusMaintainsTierList(config) || typeof systemPrompt !== 'string') return systemPrompt;
  var i = systemPrompt.indexOf(NEXUS_TIER_SECTION);
  if (i === -1) return systemPrompt;
  return systemPrompt.slice(0, i) + NEXUS_NO_TIER_SECTION + systemPrompt.slice(i + NEXUS_TIER_SECTION.length);
}

// NEXUS tool for a game without a tier table: no meta_update field, not required, and a description that
// does not promise a tier list update. A tier game gets the SAME tool object back (byte-identical request).
export function nexusToolForGame(tool, config) {
  if (nexusMaintainsTierList(config) || !tool || !tool.input_schema || !tool.input_schema.properties) return tool;
  var clone = JSON.parse(JSON.stringify(tool));
  clone.description = 'Publish a meta intelligence report.';
  delete clone.input_schema.properties.meta_update;
  if (Array.isArray(clone.input_schema.required)) clone.input_schema.required = clone.input_schema.required.filter(function (k) { return k !== 'meta_update'; });
  return clone;
}
