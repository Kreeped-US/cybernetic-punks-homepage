// lib/marathon/rankedPipeline.test.mjs
// Ranked state in the CONTENT PIPELINE (2026-10-16). The editor prompts and the ticker fallback must
// not assert a mode state: the shared GHOST line is a game-agnostic "do not state a mode is live/
// open/scheduled/returning unless the source says so" rule; Marathon's Ranked prompt text is BUILT
// from lib/marathon/rankedStatus.js (the same static source the site renders), with no dates; the
// /api/bungie-news fallback carries no Ranked claim.
// Run with the resolve hook:
//   node --import ./scripts/ext-resolve.register.mjs --test lib/marathon/rankedPipeline.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// editorCore creates its clients at import: stub env + fetch first (same pattern as
// lib/editorCore.perGameInputs.test.mjs). No network is touched.
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://stub.supabase.local';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'stub-anon';
process.env.SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'stub-service';
process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || 'stub-anthropic';
globalThis.fetch = async () => new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } });

const { EDITOR_PROMPTS } = await import('../editorCore.js');
const { resolveKit, applyKit, resolveVocab, applyVocab } = await import('../editors/promptVocab.js');
const { getGameConfig } = await import('../games/index.js');
const { RANKED_STATUS } = await import('./rankedStatus.js');

const read = (p) => readFileSync(new URL('../../' + p, import.meta.url), 'utf8');
const GAMES = ['marathon', 'wardogs', 'dmz', 'pubg-dednet', 'bodycam'];
const EDITORS = ['CIPHER', 'NEXUS', 'DEXTER', 'GHOST', 'MIRANDA'];
const render = (ed, slug) => { const c = getGameConfig(slug); return applyVocab(applyKit(EDITOR_PROMPTS[ed], resolveKit(c)), resolveVocab(c)); };
const STATE = 'Ranked status: ' + RANKED_STATUS.state + '. ' + RANKED_STATUS.noReturnDate;

test('"RANKED MODE IS LIVE" is gone from every editor prompt, raw and rendered for every game', () => {
  for (const ed of EDITORS) {
    assert.ok(!EDITOR_PROMPTS[ed].includes('RANKED MODE IS LIVE'), ed + ' raw');
    for (const g of GAMES) {
      const r = render(ed, g);
      assert.ok(!r.includes('RANKED MODE IS LIVE'), ed + '/' + g);
      assert.ok(!/June 14|RANKED RETURNS/.test(r), ed + '/' + g + ' carries a Ranked date');
    }
  }
  for (const p of ['lib/editorCore.js', 'lib/games/marathon.js']) assert.ok(!read(p).includes('RANKED MODE IS LIVE'), p);
});

test('shared GHOST line is the game-agnostic mode-status rule', () => {
  const rule = 'MODE STATUS RULE: Do not state that any game mode is live, open, scheduled or returning unless the supplied source says so. Attribute X-only claims to the account and date.';
  assert.ok(EDITOR_PROMPTS.GHOST.includes(rule + '{{kit:seasonContext.rankedNote.ghost}}'));
  // A game without Marathon's seasonContext renders the rule clean (no Marathon Ranked text leaks).
  for (const g of ['wardogs', 'dmz', 'pubg-dednet', 'bodycam']) {
    const r = render('GHOST', g);
    assert.ok(r.includes(rule + '\n'), g + ' renders the bare rule');
    assert.ok(!r.includes('Ranked status:'), g + ' gets no Marathon Ranked state');
  }
});

test('Marathon prompt Ranked text is built from rankedStatus.js, with no dates', () => {
  const src = read('lib/games/marathon.js');
  assert.ok(src.includes("import { RANKED_STATUS } from '../marathon/rankedStatus.js';"));
  assert.ok(src.includes("const RANKED_PROMPT_STATE = 'Ranked status: ' + RANKED_STATUS.state + '. ' + RANKED_STATUS.noReturnDate;"));
  const sc = getGameConfig('marathon').editorial.promptKit.seasonContext;
  assert.equal(sc.rankedNote.cipher, ' (' + STATE + ' Treat ranked content as reference for when it runs, never as a live queue, and give no Ranked date.)');
  assert.equal(sc.rankedNote.ghost, ' (' + STATE + ' Do not describe Ranked as live, and give no Ranked date.)');
  assert.ok(sc.ghostLandscape.includes('- RANKED: ' + STATE + ' Do not describe Ranked as live, open, scheduled or returning, and do not give any Ranked date.'));
  const DATE = /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.? \d{1,2}\b/;
  for (const v of [sc.rankedNote.cipher, sc.rankedNote.ghost, STATE]) assert.ok(!DATE.test(v), 'no date: ' + v);
  assert.ok(STATE.includes('OFFLINE'));
  // The rendered Marathon prompts carry the state (GHOST + CIPHER read the kit placeholders).
  assert.ok(render('GHOST', 'marathon').includes(STATE));
  assert.ok(render('CIPHER', 'marathon').includes(STATE));
});

test('bungie-news fallback ticker carries no Ranked claim', () => {
  const src = read('app/api/bungie-news/route.js');
  const block = src.slice(src.indexOf('const FALLBACK_HEADLINES = ['), src.indexOf('];', src.indexOf('const FALLBACK_HEADLINES = [')));
  const strings = block.split(/\r?\n/).filter((l) => /^\s*'/.test(l));
  assert.equal(strings.length, 8, 'still 8 fallback headlines');
  for (const s of strings) assert.ok(!/ranked/i.test(s), 'Ranked claim in fallback: ' + s);
  assert.ok(block.includes("'SYMBIOSIS ARRIVES DECEMBER 8 - MARATHON\\'S FIRST PERMANENT PVE EXPERIENCE',"));
});
