// lib/network/vantage.test.mjs
// STAGE 4: VANTAGE storelessness ENFORCED (Fable ruling 4). VANTAGE synthesizes across
// games and is forbidden single-game facts; the guarantee is made STRUCTURAL here -- her
// context builders emit ZERO store-row (stat/entity) blocks, so she cannot cite a verified
// stat because none is present. This test LOCKS that: a future change that wired store
// blocks into her context (an import of the per-game machinery, or a builder rendering an
// injected stat field) fails the build. VANTAGE behavior is unchanged; this only guards it.
// Run: node --test lib/network/vantage.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildVantageUserPrompt, buildVantageDiscoursePrompt } from './vantage.js';

// A sentinel injected via rogue (non-whitelisted) input fields. The builders read only a
// fixed set of network/discourse fields, so the sentinel must never reach the output.
const SENTINEL = 'ZZZ_STORE_ROW_SENTINEL_ZZZ';

// The distinctive block delimiters + store-row citation markers that fetchGameContext (the
// per-game stat machinery) emits. NONE may ever appear in a VANTAGE prompt.
const STORE_MARKERS = [
  '--- WEAPON MODS DATABASE', '--- SHELL CORES DATABASE', '--- IMPLANTS DATABASE',
  '--- WEAPON STATS DATABASE', '--- SHELL ABILITIES DATABASE', '--- CRADLE PROGRESSION DATABASE',
  '--- FACTION SYSTEM DATABASE', '--- GAME WORLD', '[WS#', '[SH#', '[CS#', '[MS#', '[IS#',
];
function assertNoStoreBlocks(out, label) {
  assert.ok(!out.includes(SENTINEL), label + ': injected store data must not reach the output');
  for (const m of STORE_MARKERS) {
    assert.ok(!out.includes(m), label + ': store-block marker must be absent -> ' + m);
  }
}

// ── (1) STRUCTURAL: the module imports none of the per-game store machinery ──────────────
test('vantage.js imports no store/per-game machinery (storeless by construction)', () => {
  const src = readFileSync(new URL('./vantage.js', import.meta.url), 'utf8');
  // Check IMPORT lines only -- the header comment legitimately NAMES editorCore/gather to say
  // it does NOT touch them, so a raw substring scan would false-positive on the prose.
  const importLines = src.split('\n').filter((l) => /^\s*import\b/.test(l)).join('\n');
  const FORBIDDEN = [
    'fetchGameContext', 'editorCore', 'gather/', 'blockId', 'grounding',
    'shell_stats', 'weapon_stats', 'loadGateStore', 'fetchVerifiedStatBlock',
  ];
  for (const f of FORBIDDEN) {
    assert.ok(!importLines.includes(f), 'vantage.js must not import per-game store machinery: ' + f);
  }
});

// ── (2) buildVantageUserPrompt (homepage brief) ignores injected store/stat data ─────────
test('buildVantageUserPrompt renders only network signals -- zero store blocks', () => {
  const out = buildVantageUserPrompt({
    games: [{ label: 'Marathon', live: true, note: null, shell_stats: SENTINEL, statBlock: SENTINEL }],
    recent: [{ game: 'marathon', editor: 'editor', headline: 'Season 2 economy is the story', when: '1h ago', statRow: SENTINEL }],
    // rogue store-shaped fields the builder must ignore entirely:
    storeBlocks: SENTINEL,
    statContext: '--- WEAPON STATS DATABASE ---\n' + SENTINEL,
    fetchGameContext: SENTINEL,
    verifiedStats: [{ name: 'Vandal', hp: 120, tier: 'S', note: SENTINEL }],
  });
  assertNoStoreBlocks(out, 'buildVantageUserPrompt');
  // legitimate network framing material still present:
  assert.ok(out.includes('Marathon'), 'game label present');
  assert.ok(out.includes('Season 2 economy is the story'), 'headline framing material present');
});

// ── (3) buildVantageDiscoursePrompt ignores injected store/stat data ─────────────────────
test('buildVantageDiscoursePrompt renders only discourse material -- zero store blocks', () => {
  const out = buildVantageDiscoursePrompt({
    instruction: 'Frame the debate; attribute the take.',
    url: 'https://x.com/creator/status/1',
    source_text: 'The creator argues the Season 2 economy hurts new players.',
    creator_info: { name: 'Vivi Cross', x: 'https://x.com/vivicross', game_slug: 'marathon', shell_stats: SENTINEL, statBlock: SENTINEL },
    // rogue store-shaped fields the builder must ignore entirely:
    storeBlocks: SENTINEL,
    statContext: '--- SHELL ABILITIES DATABASE ---\n' + SENTINEL,
    fetchGameContext: SENTINEL,
    verifiedStats: SENTINEL,
  });
  assertNoStoreBlocks(out, 'buildVantageDiscoursePrompt');
  // legitimate discourse material still present (attribution + source travel through):
  assert.ok(out.includes('Vivi Cross'), 'creator attribution present');
  assert.ok(out.includes('x.com/vivicross'), 'source profile present');
});
