// lib/advisor/regenerateCanonical.js
// Regenerate ONE build_pages row (canonical OR weapon variant) and persist it -- the SHARED
// regen step used by BOTH the batch backfill (scripts/gen-build-canonicals.mjs) and the A5
// poller cron (app/api/cron/build-refresh). One instrument, so a cron-refresh and a manual
// backfill write byte-identical rows. Same reuse posture as lib/advisor/generateBuild.js.
//
// Given a build_pages slug it: READS the row (shell + weapon_slug), loads that shell's
// recommended_playstyle (the goal-neutral generation source, Fable's ruling), calls
// generateBuild with the neutral canonical params (priority='balanced', unranked/
// experienced) -- and, for a WEAPON VARIANT (weapon_slug set, A2), PINS that weapon via
// weaponPreference; a canonical (weapon_slug NULL) passes weaponPreference='' UNCHANGED, so
// the canonical regen is behavior-identical to before A2. UPDATEs the row with fresh
// build_json + source_updated_at + cited used_sources.
//
// NEVER THROWS for expected misses (unknown shell / empty playstyle / unresolvable weapon /
// gen error / write error) -- returns { ok:false, slug, reason } so the caller can log and
// continue (the cron's fail-safe: one bad build must not abort the others).
//
// `supabase` MUST be a service-key client (RLS writes). One generateBuild (a paid Claude
// call) + one UPDATE per invocation; the CALLER decides which slugs to regenerate.

import { generateBuild, SHELLS } from './generateBuild.js';
import { entitySlugFor } from '../coverage.js';

const GAME = 'marathon';

// Trusted store text: strip control chars ONLY (code < 32 or DEL 127) and collapse
// whitespace. NOT the untrusted 60-char cap -- recommended_playstyle is trusted store text
// and Sentinel/Rook exceed 60; capping would truncate them mid-sentence.
function stripControl(value) {
  const s = String(value == null ? '' : value);
  let out = '';
  for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); out += (c < 32 || c === 127) ? ' ' : s.charAt(i); }
  return out.replace(/\s+/g, ' ').trim();
}

// build_pages shell ('assassin') -> the engine's Shell name ('Assassin').
export function shellNameForSlug(slug) { return SHELLS.find((s) => s.toLowerCase() === slug) || null; }

// weapon_slug ('v85-circuit-breaker') -> the store weapon NAME ('V85 Circuit Breaker'), by
// matching the canonical slug function (entitySlugFor) against weapon_stats. Null if it
// resolves to no weapon. Used to pin the variant's weapon and to title the variant page.
export async function weaponNameForSlug(supabase, weaponSlug) {
  if (!weaponSlug) return null;
  const { data } = await supabase.from('weapon_stats').select('name').eq('game_slug', GAME);
  for (const w of (data || [])) {
    if (w.name && entitySlugFor('weapon', w.name) === weaponSlug) return w.name;
  }
  return null;
}

// Returns { ok:true, slug, shell, weaponSlug, build, sourceUpdatedAt, usedSources } on
// success, or { ok:false, slug, reason } on any expected failure.
export async function regenerateCanonical(supabase, slug) {
  // Read the row to learn the shell + whether it is a weapon variant. Works for both kinds.
  const { data: row, error: rErr } = await supabase
    .from('build_pages').select('slug, shell, weapon_slug')
    .eq('game_slug', GAME).eq('slug', slug).single();
  if (rErr) return { ok: false, slug, reason: 'build_pages read: ' + rErr.message };

  const shellName = shellNameForSlug(row.shell);
  if (!shellName) return { ok: false, slug, reason: 'no matching Shell for "' + row.shell + '"' };

  const { data: sh, error: shErr } = await supabase
    .from('shell_stats').select('recommended_playstyle')
    .eq('game_slug', GAME).eq('name', shellName).single();
  if (shErr) return { ok: false, slug, reason: 'shell_stats read: ' + shErr.message };
  const playstyle = stripControl(sh && sh.recommended_playstyle);
  if (!playstyle) return { ok: false, slug, reason: 'empty recommended_playstyle' };

  // WEAPON VARIANT: pin the weapon. CANONICAL (weapon_slug NULL): '' -- behavior-identical.
  let weaponPreference = '';
  if (row.weapon_slug) {
    weaponPreference = await weaponNameForSlug(supabase, row.weapon_slug);
    if (!weaponPreference) return { ok: false, slug, reason: 'weapon_slug not in weapon_stats: ' + row.weapon_slug };
  }

  let gen;
  try {
    gen = await generateBuild({
      shell: shellName,
      playstyle,                 // FULL trusted store text, control-char-stripped, no length cap
      priority: 'balanced',      // GOAL-NEUTRAL -- no pinned goal bucket (Fable's ruling)
      rankTarget: 'unranked',
      experienceLevel: 'experienced',
      weaponPreference,          // '' for canonical (unchanged); pinned weapon name for a variant
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

  return { ok: true, slug, shell: shellName, weaponSlug: row.weapon_slug || null, build, sourceUpdatedAt, usedSources };
}
