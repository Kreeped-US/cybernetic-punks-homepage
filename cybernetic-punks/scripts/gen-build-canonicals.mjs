// scripts/gen-build-canonicals.mjs
// A1 GENERATION SLICE -- fill build_json for the 8 goal-neutral shell-hub rows in
// build_pages. Runs the SHARED advisor core (lib/advisor/generateBuild.js) in BATCH -- the
// same reuse posture as scripts/gsc-corroboration.mjs calling classifyCorroboration.
//
// GOAL-NEUTRAL (Fable's ruling): each canonical is generated from the shell's
// recommended_playstyle free-text with priority='balanced' (NO pinned goal bucket) and
// neutral rank/experience defaults. goal/rank/experience are in-tool refinements, never
// baked into the canonical.
//
// source_updated_at = MAX(updated_at) over the five timestamped context tables
// (shell/mod/core/implant/weapon); cradle_nodes is excluded (no updated_at column).
//
// READ-ONLY until the final per-row write. Idempotent (re-run overwrites build_json).
// RUN (only after operator review):
//   node scripts/gen-build-canonicals.mjs --dry   # generate + print, NO writes (review plan)
//   node scripts/gen-build-canonicals.mjs         # generate + write build_json per row

import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { generateBuild, SHELLS } from '../lib/advisor/generateBuild.js';

// Load .env.local BEFORE any generateBuild call. The Anthropic client in generateBuild.js
// is a lazy singleton (built on first use), so setting env here in the module body -- which
// runs after the static imports -- is in time for the first generation.
function loadEnvLocal() {
  let raw;
  try { raw = readFileSync(new URL('../.env.local', import.meta.url), 'utf8'); } catch (e) { return; }
  raw.split('\n').forEach((line) => {
    line = line.trim(); if (!line || line.charAt(0) === '#') return;
    const eq = line.indexOf('='); if (eq === -1) return;
    const k = line.slice(0, eq).trim(); let v = line.slice(eq + 1).trim();
    if (v.length >= 2) { const f = v[0], l = v[v.length - 1]; if ((f === '"' || f === "'") && f === l) v = v.slice(1, -1); }
    if (!process.env[k]) process.env[k] = v;
  });
}
loadEnvLocal();

const supa = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const GAME = 'marathon';
const DRY = process.argv.includes('--dry');

// TRUSTED-store-text sanitize: strip control chars ONLY (code < 32 or DEL 127) and collapse
// whitespace. NOT the 60-char untrusted cap -- recommended_playstyle is trusted store text,
// and Sentinel/Rook exceed 60; capping would truncate them mid-sentence.
function stripControl(value) {
  const s = String(value == null ? '' : value);
  let out = '';
  for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); out += (c < 32 || c === 127) ? ' ' : s.charAt(i); }
  return out.replace(/\s+/g, ' ').trim();
}

// map a build_pages slug ('assassin') -> the engine's Shell name ('Assassin')
function shellNameForSlug(slug) { return SHELLS.find((s) => s.toLowerCase() === slug) || null; }

// The 8 goal-neutral hub rows: goal NULL, weapon_slug NULL (the canonicals seeded 2026-08-04).
const { data: rows, error: rErr } = await supa.from('build_pages')
  .select('slug, shell, goal, weapon_slug, build_json')
  .eq('game_slug', GAME).is('goal', null).is('weapon_slug', null)
  .order('slug');
if (rErr) { console.error('build_pages read err: ' + rErr.message); process.exit(1); }

// recommended_playstyle per shell (the canonical generation source, Fable's ruling).
const { data: shells, error: sErr } = await supa.from('shell_stats')
  .select('name, recommended_playstyle').eq('game_slug', GAME);
if (sErr) { console.error('shell_stats read err: ' + sErr.message); process.exit(1); }
const playstyleByName = new Map(shells.map((s) => [s.name, s.recommended_playstyle]));

console.log('gen-build-canonicals  ' + new Date().toISOString().slice(0, 10)
  + '  canonical hub rows=' + rows.length + (DRY ? '  [DRY RUN -- no writes]' : '  [LIVE -- will write build_json]'));

let ok = 0, failed = 0;
for (const row of rows) {
  const shellName = shellNameForSlug(row.slug);
  if (!shellName) { console.log('  SKIP ' + row.slug + ': no matching Shell name in SHELLS'); failed++; continue; }
  const playstyle = stripControl(playstyleByName.get(shellName));
  if (!playstyle) { console.log('  SKIP ' + shellName + ': shell_stats.recommended_playstyle is empty'); failed++; continue; }

  try {
    const { build, sourceUpdatedAt, usedSources } = await generateBuild({
      shell: shellName,
      playstyle,                 // FULL trusted store text, control-char-stripped, no length cap
      priority: 'balanced',      // GOAL-NEUTRAL -- no pinned goal bucket (Fable's ruling)
      rankTarget: 'unranked',
      experienceLevel: 'experienced',
      weaponPreference: '',
      teamSize: 'Solo',
    });

    const prim = build && build.primary_weapon ? build.primary_weapon.name : '?';
    console.log('\n  [' + shellName + '] "' + (build.build_name || '?') + '"  grade=' + (build.loadout_grade || '?')
      + '  primary=' + prim + '  source_updated_at=' + sourceUpdatedAt
      + '  used_sources=' + (Array.isArray(usedSources) ? usedSources.length : 'null'));

    if (DRY) {
      // Verbose review dump (--dry only): full picks so the operator can vet each build
      // BEFORE any write. Generation + write logic below is unchanged.
      const sec = build.secondary_weapon ? build.secondary_weapon.name : '?';
      const mods = (build.mods || []).map((m) => (m.slot ? m.slot + ':' : '') + m.name).join(', ') || '(none)';
      const cores = (build.cores || []).map((c) => c.name + (c.ability_type ? ' (' + c.ability_type + ')' : '')).join(', ') || '(none)';
      const imps = (build.implants || []).map((i) => (i.slot ? i.slot + ':' : '') + i.name).join(', ') || '(none)';
      const tracks = (build.cradle && build.cradle.tracks || []).map((t) => t.track + (t.perk ? '/' + t.perk : '')).join(', ') || '(none)';
      console.log('      secondary : ' + sec);
      console.log('      mods      : ' + mods);
      console.log('      cores     : ' + cores);
      console.log('      implants  : ' + imps);
      console.log('      cradle    : ' + tracks);
      console.log('      summary   : ' + (build.playstyle_summary || ''));
      console.log('      dexter    : ' + (build.dexter_analysis || ''));
      ok++;
      continue;
    }

    const { error: wErr } = await supa.from('build_pages')
      .update({ build_json: build, source_updated_at: sourceUpdatedAt, used_sources: usedSources })   // jsonb -> pass objects, no stringify
      .eq('game_slug', GAME).eq('slug', row.slug);
    if (wErr) { console.log('    WRITE FAIL ' + row.slug + ': ' + wErr.message); failed++; }
    else { console.log('    WROTE ' + row.slug); ok++; }
  } catch (e) {
    console.log('  GEN FAIL ' + shellName + ': ' + (e && (e.code || e.message)));
    failed++;
  }
}

console.log('\n=== done: ' + ok + ' ok, ' + failed + ' failed' + (DRY ? '  (DRY -- nothing written)' : '') + ' ===');
process.exit(failed ? 1 : 0);
