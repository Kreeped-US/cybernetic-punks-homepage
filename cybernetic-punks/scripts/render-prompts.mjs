// scripts/render-prompts.mjs
// BYTE-IDENTICAL PROMPT-RENDER HARNESS (Stage 1 scaffolding, 2026-09-21; reused as the Stage 2
// gate). Renders the FULL assembled system prompt for all six editors (CIPHER/NEXUS/DEXTER/GHOST/
// MIRANDA + buildMirandaPrompt) through the REAL chokepoint --
//   applyVocab(applyKit(PROMPT, resolveKit(cfg)), resolveVocab(cfg))
// -- for a given game, and writes each to <outDir>/prompt-<game>-<EDITOR>.txt. DATA_INTEGRITY_RULES
// is already interpolated into each prompt string, so the snapshot is the complete prompt text.
// The runtime fetchGameContext DB append is deliberately NOT included (it needs a live DB and is not
// where any {{kit}}/{{cnp}} token lives). buildMirandaPrompt is rendered with a fixed empty stub so
// its output is deterministic across before/after runs.
//
// USAGE: node scripts/render-prompts.mjs <game> <outDir>
//   e.g. node scripts/render-prompts.mjs marathon /tmp/prompts-after
//
// STAGE 2 GATE: render marathon to two dirs (main = before, branch = after) and `diff -u` each of
// the six pairs -- MUST be zero bytes to prove Marathon prompts are byte-for-byte unchanged.

import fs from 'node:fs';
import path from 'node:path';
import { EDITOR_PROMPTS, buildMirandaPrompt } from '../lib/editorCore.js';
import { resolveKit, applyKit, resolveVocab, applyVocab } from '../lib/editors/promptVocab.js';
import { getGameConfig } from '../lib/games/index.js';

var game = process.argv[2] || 'marathon';
var outDir = process.argv[3] || path.join(process.cwd(), 'prompt-snapshots-' + game);

// Fixed, empty stub for buildMirandaPrompt -- deterministic + identical every run, so the harness
// isolates the TEMPLATE (which Stage 2 touches) from any live data.
var MIRANDA_STUB = {
  videos: [], redditPosts: [], devNews: [], devRedditPosts: [],
  shellContext: [], weaponContext: [], modContext: [], implantContext: [],
  recentHeadlines: [], xData: null, _directive: null,
};

function renderThroughChokepoint(promptText, cfg) {
  var kit = resolveKit(cfg);
  var vocab = resolveVocab(cfg);
  return applyVocab(applyKit(promptText, kit), vocab);
}

function main() {
  var cfg = getGameConfig(game);
  fs.mkdirSync(outDir, { recursive: true });

  var editors = ['CIPHER', 'NEXUS', 'DEXTER', 'GHOST', 'MIRANDA'];
  var written = [];
  editors.forEach(function (ed) {
    var raw = EDITOR_PROMPTS[ed];
    if (raw == null) { console.error('MISSING EDITOR_PROMPTS[' + ed + ']'); return; }
    var out = renderThroughChokepoint(raw, cfg);
    var f = path.join(outDir, 'prompt-' + game + '-' + ed + '.txt');
    fs.writeFileSync(f, out, 'utf8');
    written.push(f + '  (' + out.length + ' chars)');
  });

  // buildMirandaPrompt (the default MIRANDA guide prompt, a function)
  try {
    var mp = buildMirandaPrompt(MIRANDA_STUB);
    var outM = renderThroughChokepoint(mp, cfg);
    var fM = path.join(outDir, 'prompt-' + game + '-buildMirandaPrompt.txt');
    fs.writeFileSync(fM, outM, 'utf8');
    written.push(fM + '  (' + outM.length + ' chars)');
  } catch (e) {
    console.error('buildMirandaPrompt(stub) threw: ' + (e && e.message));
  }

  console.log('game=' + game + ' outDir=' + outDir);
  written.forEach(function (w) { console.log('  wrote ' + w); });
}

main();
