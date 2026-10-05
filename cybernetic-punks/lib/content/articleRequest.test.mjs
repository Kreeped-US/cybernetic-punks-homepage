// lib/content/articleRequest.test.mjs
// Request shaping per model, the completeness guard, the per-game model default and the price table.
// Run: node --test lib/content/articleRequest.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shapeArticleRequest, checkGenerationComplete, generationMeta, CLAUDE5_MAX_TOKENS, RETRYABLE_INCOMPLETE } from './articleRequest.js';
import { ARTICLE_MODEL, ARTICLE_MODEL_SONNET_5_5, articleModelFor, isClaude5Model, estimateCostUsd, MODEL_PRICES_PER_MTOK } from '../models.js';

const TOOL = { name: 'publish_x', description: 'd', input_schema: { type: 'object' } };
const MSGS = [{ role: 'user', content: 'u' }];

test('current model: the request is EXACTLY the pre-change shape (keys, order, values)', () => {
  const p = shapeArticleRequest({ model: ARTICLE_MODEL, maxTokens: 4096, system: 'S', tool: TOOL, messages: MSGS });
  assert.deepEqual(Object.keys(p), ['model', 'max_tokens', 'system', 'tools', 'tool_choice', 'messages']);
  assert.equal(JSON.stringify(p), JSON.stringify({ model: ARTICLE_MODEL, max_tokens: 4096, system: 'S', tools: [TOOL], tool_choice: { type: 'tool', name: 'publish_x' }, messages: MSGS }));
});

test('5.x model: tool_choice auto, max_tokens 8192, explicit adaptive thinking; system/tools/messages untouched', () => {
  const p = shapeArticleRequest({ model: ARTICLE_MODEL_SONNET_5_5, maxTokens: 3072, system: 'S', tool: TOOL, messages: MSGS });
  assert.equal(p.model, 'claude-sonnet-5-5');
  assert.equal(p.max_tokens, CLAUDE5_MAX_TOKENS);
  assert.equal(CLAUDE5_MAX_TOKENS, 8192);
  assert.deepEqual(p.tool_choice, { type: 'auto' });
  assert.deepEqual(p.thinking, { type: 'adaptive' });
  assert.equal(p.system, 'S');
  assert.deepEqual(p.tools, [TOOL]);
  assert.deepEqual(p.messages, MSGS);
});

test('isClaude5Model matches 5.x families only', () => {
  for (const m of ['claude-sonnet-5-5', 'claude-opus-5-5', 'claude-sonnet-5', 'claude-fable-5-1']) assert.equal(isClaude5Model(m), true, m);
  for (const m of ['claude-sonnet-4-6', 'claude-haiku-4-5-20251001', 'claude-opus-4-8', '', null, undefined]) assert.equal(isClaude5Model(m), false, String(m));
});

test('articleModelFor: defaults to ARTICLE_MODEL when a game omits editorial.articleModel', () => {
  assert.equal(articleModelFor(undefined), ARTICLE_MODEL);
  assert.equal(articleModelFor({}), ARTICLE_MODEL);
  assert.equal(articleModelFor({ editorial: {} }), ARTICLE_MODEL);
  assert.equal(articleModelFor({ editorial: { articleModel: '' } }), ARTICLE_MODEL);
  assert.equal(articleModelFor({ editorial: { articleModel: 'claude-sonnet-5-5' } }), 'claude-sonnet-5-5');
});

const msg = (over) => ({ stop_reason: 'tool_use', content: [{ type: 'tool_use', name: 'publish_x', input: { headline: 'H', body: 'A real body.' } }], usage: { input_tokens: 1000, output_tokens: 500 }, ...over });

test('guard: a complete tool_use response passes', () => {
  const c = checkGenerationComplete(msg(), 'publish_x');
  assert.equal(c.complete, true);
  assert.equal(c.toolInput.headline, 'H');
});

test('guard: stop_reason max_tokens is incomplete even when a (truncated) tool_use block exists', () => {
  const c = checkGenerationComplete(msg({ stop_reason: 'max_tokens' }), 'publish_x');
  assert.equal(c.complete, false);
  assert.equal(c.reason, 'max_tokens');
  assert.ok(!RETRYABLE_INCOMPLETE.includes('max_tokens'), 'max_tokens is not retried');
});

test('guard: no tool_use block (text only) is incomplete and retryable', () => {
  const c = checkGenerationComplete(msg({ stop_reason: 'end_turn', content: [{ type: 'text', text: 'I will write...' }] }), 'publish_x');
  assert.equal(c.reason, 'no_tool_use');
  assert.ok(RETRYABLE_INCOMPLETE.includes('no_tool_use'));
});

test('guard: a tool_use block with an empty or missing body is incomplete', () => {
  assert.equal(checkGenerationComplete(msg({ content: [{ type: 'tool_use', name: 'publish_x', input: { headline: 'H', body: '   ' } }] }), 'publish_x').reason, 'empty_body');
  assert.equal(checkGenerationComplete(msg({ content: [{ type: 'tool_use', name: 'publish_x', input: { headline: 'H' } }] }), 'publish_x').reason, 'empty_body');
  assert.equal(checkGenerationComplete(null, 'publish_x').reason, 'no_response');
});

test('generationMeta + price table: cost computed from the ONE price table', () => {
  const m = generationMeta('claude-sonnet-5-5', msg({ usage: { input_tokens: 20000, output_tokens: 4000, output_tokens_details: { thinking_tokens: 1200 } } }));
  assert.equal(m.model, 'claude-sonnet-5-5');
  assert.equal(m.thinking_tokens, 1200);
  assert.equal(m.stop_reason, 'tool_use');
  assert.equal(m.est_cost_usd, 0.08);   // 20000*2/1e6 + 4000*10/1e6
  assert.equal(estimateCostUsd('claude-sonnet-4-6', { input_tokens: 1e6, output_tokens: 1e6 }), 18);
  assert.equal(estimateCostUsd('unknown-model', { input_tokens: 5 }), null);
  assert.ok(MODEL_PRICES_PER_MTOK[ARTICLE_MODEL] && MODEL_PRICES_PER_MTOK[ARTICLE_MODEL_SONNET_5_5], 'both article models priced');
});
