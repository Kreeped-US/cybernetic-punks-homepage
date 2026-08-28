// scripts/weapon-tier-dryrun.mjs
// ============================================================
// WEAPON TIER MODEL -- DRY-RUN VALIDATION HARNESS. READ-ONLY.
// ============================================================
// Thin runner over the SHARED model (lib/weapons/tierModel.js) -- the same pure function the
// cron uses to write derived weapon tiers into meta_tiers. This script only reads weapon_stats
// (anon key, visitor-equivalent) and PRINTS the computed table for review. It does NOT write.
//
// RUN: node scripts/weapon-tier-dryrun.mjs

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { computeWeaponTiers, BAND_ORDER, AXIS_WEIGHTS, TIER_BANDS } from '../lib/weapons/tierModel.js';

function loadEnv() {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return;
  let raw; try { raw = readFileSync(new URL('../.env.local', import.meta.url), 'utf8'); } catch { return; }
  for (const line of raw.split('\n')) { const l = line.trim(); if (!l || l[0] === '#') continue; const eq = l.indexOf('='); if (eq === -1) continue; const k = l.slice(0, eq).trim(); let v = l.slice(eq + 1).trim(); if (v.length >= 2 && (v[0] === '"' || v[0] === "'")) v = v.slice(1, -1); if (!process.env[k]) process.env[k] = v; }
}
loadEnv();
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const { data, error } = await sb.from('weapon_stats').select('*').eq('game_slug', 'marathon').order('name');
if (error) { console.error('weapon_stats error:', error.message); process.exit(1); }

const results = computeWeaponTiers(data);
const fmt = v => v == null ? '  - ' : String(Math.round(v)).padStart(3) + ' ';
const wl = Object.entries(AXIS_WEIGHTS).map(([k, v]) => k.slice(0, 3) + ' ' + v).join(' / ');
console.log('WEAPON TIER MODEL -- DRY-RUN (within-band). Weights: ' + wl + '.  S>=' + TIER_BANDS[0][1] + '\n');

for (const b of BAND_ORDER) {
  const br = results.filter(r => r.band === b).sort((x, y) => (y.total ?? -1) - (x.total ?? -1));
  if (!br.length) continue;
  console.log('==================== ' + b.toUpperCase() + ' BAND (' + br.length + ') ====================');
  console.log('TIER  ' + 'WEAPON'.padEnd(22) + 'TYPE'.padEnd(16) + ' FP  ACC HND RNG  TOTAL   N/A');
  for (const r of br) {
    console.log(
      (' ' + (r.tier || '?') + '   ').padEnd(6) + r.name.padEnd(22) + (r.weapon_type || '').padEnd(16) +
      fmt(r.axes.firepower) + fmt(r.axes.accuracy) + fmt(r.axes.handling) + fmt(r.axes.range) +
      ' ' + (r.total == null ? '  -  ' : String(Math.round(r.total)).padStart(3) + '  ') +
      '  ' + (r.naAxes.length ? r.naAxes.join(',') : ''));
  }
  console.log('');
}
const sTier = results.filter(r => r.tier === 'S').map(r => r.name + '(' + r.total + ')');
console.log('S-TIER this run: ' + sTier.join(', '));
console.log('composite-firepower (pellet): ' + results.filter(r => r.compositeFirepower).map(r => r.name).join(', '));
console.log('imputed-accuracy: ' + results.filter(r => r.imputed.length).map(r => r.name + '[' + r.imputed.join(',') + ']').join(', '));
console.log('unrankable: ' + results.filter(r => r.unrankable && !r.excluded).map(r => r.name).join(', '));
console.log('excluded: ' + results.filter(r => r.excluded).map(r => r.name).join(', '));
