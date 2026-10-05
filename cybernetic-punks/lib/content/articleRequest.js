// lib/content/articleRequest.js
// PER-MODEL ARTICLE REQUEST SHAPING + COMPLETENESS GUARD (2026-10-05). PURE, zero-I/O.
//
// WHY. The per-game article model (config.editorial.articleModel, lib/models.js articleModelFor)
// lets a game run on a Claude 5.x model. Measured on 2026-10-05 (claude-sonnet-5-5, 8 replays):
//   - 5.x REJECTS tool_choice {type:'tool'} ("not supported for this model") -> use {type:'auto'};
//   - 5.x THINKS BY DEFAULT (adaptive; ~900-1,500 thinking tokens per article, billed as output and
//     counted against max_tokens) and tokenizes ~38% longer -> at the old caps 6 of 8 articles were
//     cut off -> max_tokens 8192;
//   - a token BUDGET for thinking is not supported on 5.x ("thinking.type.enabled is not supported...
//     use thinking.type.adaptive and output_config.effort"). We send thinking {type:'adaptive'}
//     EXPLICITLY at the default effort -- the exact configuration that was measured -- and bound the
//     total with max_tokens plus the completeness guard below.
// For any non-5.x model the request is built EXACTLY as before (same keys, same order, same values),
// so the current-model request body is byte-identical.
//
// COMPLETENESS (5.x only, applied by the callers): a response that stopped on max_tokens, carries no
// tool_use block, or whose tool output has an empty body is NOT an article -- never inserted.

import { isClaude5Model, estimateCostUsd } from '../models.js';

export const CLAUDE5_MAX_TOKENS = 8192;
// One retry, for the failure modes a fresh sample can plausibly fix. max_tokens is NOT retried: at an
// 8192 cap a truncation means the model over-wrote, and a second call usually repeats it at full cost.
export const RETRYABLE_INCOMPLETE = ['no_tool_use', 'empty_body'];

// shapeArticleRequest({ model, maxTokens, system, tool, messages }) -> params for messages.create.
export function shapeArticleRequest(o) {
  if (!isClaude5Model(o.model)) {
    return {
      model: o.model,
      max_tokens: o.maxTokens,
      system: o.system,
      tools: [o.tool],
      tool_choice: { type: 'tool', name: o.tool.name },
      messages: o.messages,
    };
  }
  return {
    model: o.model,
    max_tokens: CLAUDE5_MAX_TOKENS,
    system: o.system,
    tools: [o.tool],
    tool_choice: { type: 'auto' },
    thinking: { type: 'adaptive' },
    messages: o.messages,
  };
}

// checkGenerationComplete(message, toolName) -> { complete, reason, toolInput, stopReason }
//   reason: null | 'no_response' | 'max_tokens' | 'no_tool_use' | 'empty_body'
export function checkGenerationComplete(message, toolName) {
  if (!message) return { complete: false, reason: 'no_response', toolInput: null, stopReason: null };
  var stopReason = message.stop_reason || null;
  var block = Array.isArray(message.content)
    ? message.content.find(function (b) { return b && b.type === 'tool_use' && b.name === toolName; })
    : null;
  var toolInput = block ? block.input : null;
  if (stopReason === 'max_tokens') return { complete: false, reason: 'max_tokens', toolInput: toolInput, stopReason: stopReason };
  if (!block) return { complete: false, reason: 'no_tool_use', toolInput: null, stopReason: stopReason };
  var body = toolInput && typeof toolInput.body === 'string' ? toolInput.body.trim() : '';
  if (!body) return { complete: false, reason: 'empty_body', toolInput: toolInput, stopReason: stopReason };
  return { complete: true, reason: null, toolInput: toolInput, stopReason: stopReason };
}

// generationMeta(model, message) -> the per-generation token/cost record (site_events payload core).
export function generationMeta(model, message) {
  var u = (message && message.usage) || {};
  var details = u.output_tokens_details || {};
  return {
    model: model,
    input_tokens: u.input_tokens != null ? u.input_tokens : null,
    output_tokens: u.output_tokens != null ? u.output_tokens : null,
    thinking_tokens: details.thinking_tokens != null ? details.thinking_tokens : null,
    stop_reason: (message && message.stop_reason) || null,
    est_cost_usd: estimateCostUsd(model, u),
  };
}
