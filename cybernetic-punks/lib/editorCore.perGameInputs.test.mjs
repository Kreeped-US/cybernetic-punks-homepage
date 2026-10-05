// lib/editorCore.perGameInputs.test.mjs
// PER-GAME PROMPT INPUTS (2026-10-05). Two config flags, both default FALSE:
//   editorial.usesFactionLore -- fetchGameContext reads the unscoped `factions` table only when set.
//   editorial.hasRankedPlay   -- NEXUS gets the "ranked implications in every article" rule only when set.
// Proves: defaults are false; Marathon renders exactly the pre-change text; Wardogs gets neither the
// faction lore nor the ranked rule. The faction test runs the REAL callEditor end to end with a stubbed
// fetch (Supabase REST + the Anthropic call), so it exercises the actual fetchGameContext query gate.
// Run with the resolve hook:
//   node --import ./scripts/ext-resolve.register.mjs --test lib/editorCore.perGameInputs.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

// ── fetch stub, installed BEFORE editorCore loads (its clients are created at import) ──────────────
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://stub.supabase.local';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'stub-anon';
process.env.SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'stub-service';
process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || 'stub-anthropic';
const FACTION_ROW = { name: 'Arachne', leader: 'Charter', focus: null, description: 'MARATHON-ONLY FACTION LORE MARKER' };
let lastRequest = null;
let factionsQueried = 0;
globalThis.fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : input.url;
  if (/api\.anthropic\.com\/v1\/messages/.test(url)) {
    lastRequest = JSON.parse(init.body);
    return new Response(JSON.stringify({ type: 'error', error: { type: 'invalid_request_error', message: 'stub' } }), { status: 400, headers: { 'content-type': 'application/json' } });
  }
  if (/\/rest\/v1\/factions/.test(url)) {
    factionsQueried++;
    return new Response(JSON.stringify([FACTION_ROW]), { status: 200, headers: { 'content-type': 'application/json' } });
  }
  return new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } });
};

const { EDITOR_PROMPTS, callEditor, usesFactionLore } = await import('./editorCore.js');
const { resolveKit, applyKit, resolveVocab, applyVocab } = await import('./editors/promptVocab.js');
const { getGameConfig } = await import('./games/index.js');

const renderNexus = (slug) => { const c = getGameConfig(slug); return applyVocab(applyKit(EDITOR_PROMPTS.NEXUS, resolveKit(c)), resolveVocab(c)); };
const RANKED_RULE = '- Include ranked implications in every article.';
const RANKED_PHRASE = 'the stat/ability interaction, ranked implications - with forward-lean';
const REPLACEMENT_RULE = '- Include implications for how the game is played, only where the source supports them.';

async function systemFor(slug) {
  lastRequest = null;
  await callEditor('NEXUS', 'TEST USER PROMPT', null, getGameConfig(slug));
  assert.ok(lastRequest, 'callEditor reached the (stubbed) Anthropic call');
  return typeof lastRequest.system === 'string' ? lastRequest.system : lastRequest.system.map((b) => b.text).join('\n');
}

// ── flag defaults ────────────────────────────────────────────────────────────────────────────────
test('usesFactionLore defaults to FALSE (absent, null, non-true) and is TRUE only for Marathon', () => {
  assert.equal(usesFactionLore(undefined), false);
  assert.equal(usesFactionLore({}), false);
  assert.equal(usesFactionLore({ editorial: {} }), false);
  assert.equal(usesFactionLore({ editorial: { usesFactionLore: 'yes' } }), false);
  assert.equal(usesFactionLore(getGameConfig('marathon')), true);
  for (const g of ['wardogs', 'dmz', 'pubg-dednet', 'bodycam']) assert.equal(usesFactionLore(getGameConfig(g)), false, g);
});

test('hasRankedPlay defaults to FALSE: a config without it gets the source-bound replacement rule', () => {
  const kit = resolveKit({ editorial: {} });
  assert.equal(kit.rankedImplicationsRule, 'Include implications for how the game is played, only where the source supports them.');
  assert.equal(kit.rankedImplicationsPhrase, 'implications for how the game is played');
  const on = resolveKit({ editorial: { hasRankedPlay: true } });
  assert.equal(on.rankedImplicationsRule, 'Include ranked implications in every article.');
  assert.equal(on.rankedImplicationsPhrase, 'ranked implications');
  assert.equal(getGameConfig('marathon').editorial.hasRankedPlay, true);
  assert.equal(getGameConfig('bodycam').editorial.hasRankedPlay, true);
  for (const g of ['wardogs', 'dmz', 'pubg-dednet']) assert.notEqual(getGameConfig(g).editorial.hasRankedPlay, true, g);
});

// ── Marathon unchanged ───────────────────────────────────────────────────────────────────────────
test('Marathon NEXUS still renders the exact pre-change ranked text (no leftover tokens)', () => {
  const m = renderNexus('marathon');
  assert.ok(m.includes(RANKED_RULE), 'ranked rule present verbatim');
  assert.ok(m.includes(RANKED_PHRASE), 'ranked phrase in the INTENSITY line present verbatim');
  assert.ok(!m.includes(REPLACEMENT_RULE));
  assert.ok(!/\{\{kit:rankedImplications/.test(m), 'no unresolved token');
});

test('Marathon fetchGameContext still reads factions and renders the faction lore', async () => {
  const before = factionsQueried;
  const sys = await systemFor('marathon');
  assert.equal(factionsQueried, before + 1, 'factions table queried for Marathon');
  assert.ok(sys.includes('MARATHON-ONLY FACTION LORE MARKER'), 'faction lore present in the Marathon system prompt');
});

// ── Wardogs: no faction lore, no ranked rule ─────────────────────────────────────────────────────
test('Wardogs NEXUS has neither the ranked rule nor "ranked implications"; it gets the replacement rule', () => {
  const w = renderNexus('wardogs');
  assert.ok(!w.includes(RANKED_RULE));
  assert.ok(!/ranked implications/i.test(w), 'no "ranked implications" anywhere');
  assert.ok(w.includes(REPLACEMENT_RULE));
  assert.ok(!/\{\{kit:rankedImplications/.test(w));
});

test('Wardogs fetchGameContext does NOT query factions and its system prompt carries no faction lore', async () => {
  const before = factionsQueried;
  const sys = await systemFor('wardogs');
  assert.equal(factionsQueried, before, 'factions table NOT queried for Wardogs');
  assert.ok(!sys.includes('MARATHON-ONLY FACTION LORE MARKER'));
  assert.ok(!/FACTIONS \(names and focus\)/.test(sys));
  assert.ok(!/ranked implications/i.test(sys));
});
