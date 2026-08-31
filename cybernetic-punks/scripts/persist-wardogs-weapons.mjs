// scripts/persist-wardogs-weapons.mjs
// ============================================================
// Insert the ~33 pre-launch Wardogs weapons into the game-shared weapon_stats table,
// marked PRE-LAUNCH / UNVERIFIED so nothing treats them as fact and the tier model
// SKIPS them. This is the STRUCTURED companion to the armory article.
//
// HARD HONESTY RULES (the whole point):
//   - game_slug = 'wardogs'          -> isolated from Marathon (the 4 weapon_stats
//                                       queries were scoped .eq('game_slug','marathon')
//                                       first; that leak fix MUST be deployed before this runs).
//   - verified = false + verified_source = the attribution (playtest, or the official
//     reveal for the 3 starters). NOTHING here is verified in-game yet.
//   - COMBAT STATS ALL NULL (damage/fire_rate/etc. omitted) -> the tier model returns
//     unrankable/tier:null for every row (proven: it needs damage+fire_rate). So these
//     never get a tier, and NO meta_tiers rows are written here. Wardogs stays "tier
//     list coming at launch".
//   - caliber (ammo_type) = NULL: it was NOT in the playtest capture, so it is left
//     null, never invented.
//   - NO price is written (weapon_stats has no price column; buy-per-life prices stay
//     in the article's prose, flagged, never as a structured "the price").
//   - Verba MANPADS is OMITTED (inconsistently seen; the article flags it in prose).
//   - starters (A-91, Bushmaster M17S, KH-2002) are flagged via notes ('STARTER: <camo>').
//
// DRY-RUN BY DEFAULT: prints the plan and writes NOTHING unless you pass --commit.
// IDEMPOTENT: skips any (name, game_slug='wardogs') already present.
// SERVICE KEY required for --commit.
//
//   node scripts/persist-wardogs-weapons.mjs           (DRY: print the 33-row plan)
//   node scripts/persist-wardogs-weapons.mjs --commit  (insert the 33 rows)

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

function loadEnvLocal() {
  if (process.env.SUPABASE_SERVICE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL) return;
  let raw;
  try { raw = readFileSync(new URL('../.env.local', import.meta.url), 'utf8'); } catch (e) { return; }
  for (const line0 of raw.split('\n')) {
    const line = line0.trim();
    if (!line || line.charAt(0) === '#') continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (val.length >= 2 && (val.charAt(0) === '"' || val.charAt(0) === "'")) val = val.slice(1, -1);
    if (!process.env[key]) process.env[key] = val;
  }
}

// The playtest roster (33 guns, Verba OMITTED). Categories are the display grouping.
// starter: the faction camo (flags the 3 official starters). Calibers NOT captured -> null.
const ROSTER = [
  { category: 'Assault Rifle', guns: [
    { name: 'Bushmaster M17S', starter: 'Lonestar' },
    { name: 'A-91', starter: 'Valkyra' },
    { name: 'KH-2002', starter: 'Manticore' },
    { name: 'T-21' }, { name: 'AK74' }, { name: 'Galil' }, { name: 'M4' }, { name: 'FAL' },
  ] },
  { category: 'Submachine Gun', guns: [
    { name: 'AMP-9' }, { name: 'PP-19 Vityaz' }, { name: 'MP5' }, { name: 'Super-45' },
  ] },
  { category: 'Shotgun', guns: [{ name: 'MP43' }, { name: 'M500' }] },
  { category: 'Light Machine Gun', guns: [{ name: 'M249 SAW' }, { name: 'PKM' }] },
  { category: 'Marksman Rifle', guns: [{ name: 'SKS' }, { name: 'SVD' }, { name: 'BMR-308' }] },
  { category: 'Sniper Rifle', guns: [
    { name: 'Scout Rifle TD' }, { name: 'Mosin Nagant' }, { name: 'SV98' }, { name: 'MK22' }, { name: 'AMR 50' },
  ] },
  { category: 'Bow', guns: [{ name: 'Compound Bow' }] },
  { category: 'Sidearm', guns: [
    { name: 'GGX 17' }, { name: 'GGX 18' }, { name: 'Judge' }, { name: 'M1911' }, { name: 'Deagle' },
  ] },
  { category: 'Launcher', guns: [{ name: 'RPG-7' }, { name: 'MAAWS' }, { name: 'MGL-40' }] },
];

const PLAYTEST_SRC = 'Closed Alpha/Beta playtest capture (attributed, unconfirmed; not verified in-game)';
const STARTER_SRC = 'Official Bulkhead reveal (starter rifle, pre-launch; not verified in-game)';

function buildRows() {
  const rows = [];
  for (const group of ROSTER) {
    for (const g of group.guns) {
      rows.push({
        name: g.name,
        category: group.category,
        weapon_type: group.category, // grouping only; combat stats are null so the tier model skips it
        ammo_type: null,             // caliber NOT captured -> null, never invented
        game_slug: 'wardogs',
        verified: false,             // nothing verified in-game pre-launch
        verified_source: g.starter ? STARTER_SRC : PLAYTEST_SRC,
        notes: g.starter ? ('STARTER: ' + g.starter + ' camo') : null,
        // COMBAT STATS INTENTIONALLY OMITTED (null): damage, fire_rate, magazine_size,
        // firepower_score, accuracy_score, range_meters, recoil, ... -> tier model unrankable.
      });
    }
  }
  return rows;
}

async function main() {
  loadEnvLocal();
  const commit = process.argv.indexOf('--commit') !== -1;
  const rows = buildRows();

  console.log('Wardogs weapons -> weapon_stats' + (commit ? ' (COMMIT)' : ' (DRY -- no write)') + '. ' + rows.length + ' rows, game_slug=wardogs, verified=false, combat stats NULL.\n');
  for (const r of rows) {
    console.log('  ' + r.name.padEnd(18) + ' | ' + r.category.padEnd(18) + ' | verified=' + r.verified + ' | ' + (r.notes ? r.notes : r.verified_source.slice(0, 26) + '...'));
  }
  console.log('\nAll rows: ammo_type=null (no captured caliber), combat stats=null (tier-model-skip), NO meta_tiers, NO price. Verba omitted.');

  if (!commit) {
    console.log('\nDRY -- nothing written. Re-run with --commit to insert (idempotent; skips existing wardogs weapons).');
    console.log('PREREQUISITE: the weapon_stats game_slug=marathon leak fix MUST be deployed first.');
    return;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    console.error('ERROR: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY must be set (env or .env.local).');
    process.exit(1);
  }
  const supabase = createClient(url, key);
  let ok = 0, skip = 0, fail = 0;
  for (const row of rows) {
    const existing = await supabase.from('weapon_stats').select('id').eq('name', row.name).eq('game_slug', 'wardogs').maybeSingle();
    if (existing.data) { console.log('SKIP (exists): ' + row.name); skip++; continue; }
    const ins = await supabase.from('weapon_stats').insert(row).select('id, name').maybeSingle();
    if (ins.error) { console.error('FAIL: ' + row.name + ' -> ' + ins.error.message); fail++; continue; }
    console.log('INSERTED: ' + row.name + '  id=' + ins.data.id);
    ok++;
  }
  console.log('\nDone. inserted=' + ok + ' skipped=' + skip + ' failed=' + fail + '. All verified=false, unrankable (no combat stats), no meta_tiers.');
}

main().catch((e) => { console.error(e); process.exit(1); });
