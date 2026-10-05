// lib/editorCore.articleModel.test.mjs
// PER-GAME ARTICLE MODEL through the REAL callEditor, with a stubbed fetch (Supabase REST -> [],
// Anthropic -> scripted responses). Proves: Marathon sends the exact current-model request and keeps
// its old result handling; Wardogs sends the 5.x request; the completeness guard turns a truncated or
// tool-less response into generation_incomplete (never an article); one retry for no_tool_use only.
// Run: node --import ./scripts/ext-resolve.register.mjs --test lib/editorCore.articleModel.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://stub.supabase.local';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'stub-anon';
process.env.SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'stub-service';
process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || 'stub-anthropic';

let requests = [];
let script = [];   // queue of Anthropic response bodies to return, in order
const toolMsg = (name, input, stop) => ({ id: 'm', type: 'message', role: 'assistant', model: 'x', stop_reason: stop || 'tool_use', content: [{ type: 'tool_use', id: 't', name, input }], usage: { input_tokens: 1000, output_tokens: 800, output_tokens_details: { thinking_tokens: 300 } } });
const textMsg = () => ({ id: 'm', type: 'message', role: 'assistant', model: 'x', stop_reason: 'end_turn', content: [{ type: 'text', text: 'Here is the article...' }], usage: { input_tokens: 1000, output_tokens: 200 } });
globalThis.fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : input.url;
  if (/api\.anthropic\.com\/v1\/messages/.test(url)) {
    requests.push(JSON.parse(init.body));
    const body = script.shift();
    return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
  }
  return new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } });
};

const { callEditor } = await import('./editorCore.js');
const { getGameConfig } = await import('./games/index.js');
const { ARTICLE_MODEL } = await import('./models.js');

const reset = (...bodies) => { requests = []; script = bodies; };

test('flag: only Wardogs sets editorial.articleModel; every other game keeps the current model', () => {
  assert.equal(getGameConfig('wardogs').editorial.articleModel, 'claude-sonnet-5-5');
  for (const g of ['marathon', 'dmz', 'pubg-dednet', 'bodycam']) assert.equal(getGameConfig(g).editorial.articleModel, undefined, g);
});

test('Marathon: exact current-model request; result handling unchanged (+ _meta only)', async () => {
  reset(toolMsg('publish_meta_intel', { headline: 'H', body: 'B', tags: [] }));
  const out = await callEditor('NEXUS', 'u', null, getGameConfig('marathon'));
  assert.equal(requests.length, 1);
  const r = requests[0];
  assert.deepEqual(Object.keys(r), ['model', 'max_tokens', 'system', 'tools', 'tool_choice', 'messages']);
  assert.equal(r.model, ARTICLE_MODEL);
  assert.equal(r.max_tokens, 4096);
  assert.deepEqual(r.tool_choice, { type: 'tool', name: 'publish_meta_intel' });
  assert.equal(r.thinking, undefined);
  assert.equal(out.headline, 'H');
  assert.equal(out._meta.model, ARTICLE_MODEL);
});

test('Marathon: a truncated response is NOT newly guarded (current-model behavior unchanged)', async () => {
  reset(toolMsg('publish_meta_intel', { headline: 'H', body: 'B' }, 'max_tokens'));
  const out = await callEditor('NEXUS', 'u', null, getGameConfig('marathon'));
  assert.equal(out.headline, 'H', 'returned as before -- the 5.x guard does not apply to the current model');
  assert.equal(out._error, undefined);
});

test('Wardogs: 5.x request (auto tool_choice, 8192, adaptive thinking) and a complete article', async () => {
  reset(toolMsg('publish_field_guide', { headline: 'W', body: 'Real body.', tags: [] }));
  const out = await callEditor('MIRANDA', 'u', null, getGameConfig('wardogs'));
  const r = requests[0];
  assert.equal(r.model, 'claude-sonnet-5-5');
  assert.equal(r.max_tokens, 8192);
  assert.deepEqual(r.tool_choice, { type: 'auto' });
  assert.deepEqual(r.thinking, { type: 'adaptive' });
  assert.equal(out.headline, 'W');
  assert.equal(out._meta.model, 'claude-sonnet-5-5');
  assert.equal(out._meta.thinking_tokens, 300);
  assert.equal(out._meta.attempts, 1);
});

test('Wardogs guard: stop_reason max_tokens -> generation_incomplete, NO retry', async () => {
  reset(toolMsg('publish_meta_intel', { headline: 'W', body: 'Cut off mid-sent' }, 'max_tokens'));
  const out = await callEditor('NEXUS', 'u', null, getGameConfig('wardogs'));
  assert.equal(requests.length, 1, 'max_tokens is not retried');
  assert.equal(out._error, 'generation_incomplete');
  assert.equal(out._reason, 'max_tokens');
  assert.equal(out._stop_reason, 'max_tokens');
  assert.equal(out.headline, undefined, 'never returned as an article');
});

test('Wardogs guard: no tool_use -> ONE retry; still none -> generation_incomplete', async () => {
  reset(textMsg(), textMsg());
  const out = await callEditor('NEXUS', 'u', null, getGameConfig('wardogs'));
  assert.equal(requests.length, 2, 'exactly one retry');
  assert.equal(out._error, 'generation_incomplete');
  assert.equal(out._reason, 'no_tool_use');
  assert.equal(out._meta.attempts, 2);
});

test('Wardogs guard: no tool_use then a complete retry -> the article (attempts 2)', async () => {
  reset(textMsg(), toolMsg('publish_meta_intel', { headline: 'W2', body: 'Second try.' }));
  const out = await callEditor('NEXUS', 'u', null, getGameConfig('wardogs'));
  assert.equal(requests.length, 2);
  assert.equal(out.headline, 'W2');
  assert.equal(out._meta.attempts, 2);
});

test('Tag vocabulary end to end: Wardogs strips extraction/ranked and records them; Marathon keeps both', async () => {
  reset(toolMsg('publish_meta_intel', { headline: 'W', body: 'Real body.', tags: ['weapons', 'extraction', 'ranked', 'pvp'] }));
  const w = await callEditor('NEXUS', 'u', null, getGameConfig('wardogs'));
  assert.deepEqual(w.tags, ['weapons', 'pvp']);
  assert.deepEqual(w._meta.stripped_tags, ['extraction', 'ranked']);
  const wTagDesc = requests[0].tools[0].input_schema.properties.tags.description;
  assert.ok(!/\bextraction\b|\branked\b/.test(wTagDesc), 'Wardogs tool no longer suggests them');

  reset(toolMsg('publish_meta_intel', { headline: 'M', body: 'B', tags: ['shells', 'extraction', 'ranked'] }));
  const m = await callEditor('NEXUS', 'u', null, getGameConfig('marathon'));
  assert.deepEqual(m.tags, ['shells', 'extraction', 'ranked']);
  assert.deepEqual(m._meta.stripped_tags, []);
  assert.ok(/cradle, extraction, ranked, beginner/.test(requests[0].tools[0].input_schema.properties.tags.description), 'Marathon tool unchanged');
});

test('Tag vocabulary: odd tags from the model never fail the generation', async () => {
  reset(toolMsg('publish_meta_intel', { headline: 'W', body: 'Real body.', tags: 'extraction' }));
  const w = await callEditor('NEXUS', 'u', null, getGameConfig('wardogs'));
  assert.equal(w.headline, 'W');
  assert.equal(w.tags, 'extraction', 'non-array left as-is (normalizeEditorOutput only defaults a missing value)');
  assert.deepEqual(w._meta.stripped_tags, []);
});

test('Wardogs guard: empty body -> retried once, then generation_incomplete', async () => {
  reset(toolMsg('publish_meta_intel', { headline: 'W', body: '' }), toolMsg('publish_meta_intel', { headline: 'W', body: ' ' }));
  const out = await callEditor('NEXUS', 'u', null, getGameConfig('wardogs'));
  assert.equal(requests.length, 2);
  assert.equal(out._error, 'generation_incomplete');
  assert.equal(out._reason, 'empty_body');
});
