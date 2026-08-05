// lib/advisor/regenerateCanonical.js
// Regenerate ONE goal-neutral canonical build and persist it -- the SHARED regen step used
// by BOTH the batch backfill (scripts/gen-build-canonicals.mjs) and the A5 poller cron
// (app/api/cron/build-refresh). One instrument, so a cron-refresh and a manual backfill
// write byte-identical rows (same generateBuild inputs, same write shape). Same reuse
// posture as lib/advisor/generateBuild.js itself.
//
// Given a build_pages slug it: maps slug -> Shell, loads that shell's recommended_playstyle
// (the goal-neutral generation source, Fable's ruling), calls generateBuild with the neutral
// canonical params (priority='balanced', unranked/experienced), and UPDATEs the row with
// fresh build_json + source_updated_at + cited used_sources.
//
// NEVER THROWS for expected misses (unknown shell / empty playstyle / gen error / write
// error) -- returns { ok:false, slug, reason } so the caller can log and continue to the
// next build (the cron's fail-safe: one bad build must not abort the others).
//
// `supabase` MUST be a service-key client (RLS writes). One generateBuild (a paid Claude
// call) + one UPDATE per invocation; the CALLER decides which slugs to regenerate -- the
// cron only passes STALE ones, so a no-op poll never reaches here.

import { generateBuild, SHELLS } from './generateBuild.js';

const GAME = 'marathon';

// Trusted store text: strip control chars ONLY (code < 32 or DEL 127) and collapse
// whitespace. NOT the untrusted 60-char cap -- recommended_playstyle is trusted store text
// and Sentinel/Rook exceed 60; capping would truncate them mid-sentence. (Mirrors the
// backfill script's stripControl -- kept local so this module is self-contained.)
function stripControl(value) {
  const s = String(value == null ? '' : value);
  let out = '';
  for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); out += (c < 32 || c === 127) ? ' ' : s.charAt(i); }
  return out.replace(/\s+/g, ' ').trim();
}

// build_pages slug ('assassin') -> the engine's Shell name ('Assassin').
export function shellNameForSlug(slug) { return SHELLS.find((s) => s.toLowerCase() === slug) || null; }

// Returns { ok:true, slug, shell, build, sourceUpdatedAt, usedSources } on success,
// or { ok:false, slug, reason } on any expected failure.
export async function regenerateCanonical(supabase, slug) {
  const shellName = shellNameForSlug(slug);
  if (!shellName) return { ok: false, slug, reason: 'no matching Shell name in SHELLS' };

  const { data: sh, error: shErr } = await supabase
    .from('shell_stats').select('recommended_playstyle')
    .eq('game_slug', GAME).eq('name', shellName).single();
  if (shErr) return { ok: false, slug, reason: 'shell_stats read: ' + shErr.message };
  const playstyle = stripControl(sh && sh.recommended_playstyle);
  if (!playstyle) return { ok: false, slug, reason: 'empty recommended_playstyle' };

  let gen;
  try {
    gen = await generateBuild({
      shell: shellName,
      playstyle,                 // FULL trusted store text, control-char-stripped, no length cap
      priority: 'balanced',      // GOAL-NEUTRAL -- no pinned goal bucket (Fable's ruling)
      rankTarget: 'unranked',
      experienceLevel: 'experienced',
      weaponPreference: '',
      teamSize: 'Solo',
    });
  } catch (e) {
    return { ok: false, slug, reason: 'generate: ' + (e && (e.code || e.message)) };
  }

  const { build, sourceUpdatedAt, usedSources } = gen;
  const { error: wErr } = await supabase.from('build_pages')
    .update({ build_json: build, source_updated_at: sourceUpdatedAt, used_sources: usedSources })   // jsonb -> pass objects, no stringify
    .eq('game_slug', GAME).eq('slug', slug);
  if (wErr) return { ok: false, slug, reason: 'write: ' + wErr.message };

  return { ok: true, slug, shell: shellName, build, sourceUpdatedAt, usedSources };
}
