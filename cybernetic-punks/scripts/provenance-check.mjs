// scripts/provenance-check.mjs
// ============================================================
// PROVENANCE CHECK -- READ ONLY. REPORTS, NEVER WRITES.
// ============================================================
// Audits `verified` / `verified_source` / `patch_verified` across the populated
// tables that carry them -- see the TABLES list below for the rule and its
// history. Establishes SCALE; it fixes nothing.
//
// WHY THIS EXISTS (2026-07-21). An audit of 32 weapon_stats rows found NINE
// UNSUPPORTED citations -- the cited document does not contain the values it
// supposedly backs, and two cite a document that never mentions the weapon at
// all. Root cause: PATCH NOTES ARE CHANGELOGS. They state deltas, not state, so
// a weapon whose damage did not change in a patch has no damage figure in those
// notes. Citing a changelog as provenance for a whole stat row is a CATEGORY
// ERROR, not sloppiness.
//
// `verified_source` is ROW-level while origins are FIELD-level. The codebase
// already worked around this twice, independently: lib/matchups.js scopes with
// the marker "matchup data owner-verified", and the 2026-07-21 weapon fixes
// scope with "SOURCE (field, field); qualifier". Two independent inventions of
// the same shape is decent evidence it is the natural one -- but it is a
// convention held in PROSE, enforced by nothing. That is what this checks.
//
// EXIT CODE: non-zero if any check fails, so it can become a CI gate later.
// DELIBERATELY NOT WIRED INTO CI in the commit that adds it -- see HANDOFF.
//
// IF IT EVER DOES BECOME A GATE, the check-1 count is the wrong trigger: it has a
// permanent floor (the documented unsourced population below), so a gate on
// "findings > 0" would be red forever and get ignored. The signal worth gating on
// is GROWTH -- a check-1 count ABOVE a recorded baseline means new source-less
// verified rows appeared. Baseline tracking is NOT built here; flagged so whoever
// wires the gate does not reach for the raw total.
//
// WHAT IT DOES NOT DO: check 2 flags patch-note citations for MANUAL review and
// does NOT fetch or parse the patch documents. Doing so would make a provenance
// audit network-dependent and fragile against Steam feed pagination -- the
// document window only reaches back ~16 patches, so a citation of an older patch
// would false-positive as "missing" when it is merely out of the window.
//
// RUN:  node scripts/provenance-check.mjs
//       node scripts/provenance-check.mjs --table weapon_stats
// Needs NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_KEY (auto-loaded from
// .env.local if not already in env). Read-only: only .select() is ever called.

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
// The SAME regex the app uses, imported rather than copied. A second copy here
// would drift from lib/matchups.js and the check would start validating a rule
// the site no longer applies.
import { isMatchupVerified } from '../lib/matchups.js';

function loadEnvLocal() {
  let raw;
  try { raw = readFileSync(new URL('../.env.local', import.meta.url), 'utf8'); } catch (e) { return; }
  for (const line of raw.split(/\r?\n/)) {
    if (!line.includes('=') || line.startsWith('#')) continue;
    const i = line.indexOf('=');
    const k = line.slice(0, i).trim();
    if (!process.env[k]) process.env[k] = line.slice(i + 1).trim();
  }
}
loadEnvLocal();

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_KEY;
if (!URL_ || !KEY) {
  console.error('ABORT: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY required.');
  process.exit(2);
}
const supabase = createClient(URL_, KEY);

// EVERY table carrying `verified_source` -- that is the rule, deliberately not a
// count, because a count in a comment goes stale silently while looking correct.
//
// `core_stats` and `implant_stats` gained the column on 2026-07-21 (49dc7e6) and
// are covered from that date. Before it they were STRUCTURALLY UNCHECKABLE, not
// overlooked: check 1 keys on a column that did not exist on them, so no version
// of this script could have audited them.
//
// Those two also carry a DELIBERATELY UNSOURCED population, recorded in
// docs/HANDOFF.md 2026-07-21 (49dc7e6). Those rows are KNOWN OUTSTANDING WORK,
// not newly discovered rot -- check 1 surfaces them every run, on purpose and
// unsuppressed. There is no allowlist: an allowlist is itself an unaudited claim,
// it goes stale the moment a row is sourced, and suppressing a state the column
// was added to make VISIBLE would undo the reason it exists.
//
// The three DMZ tables (dmz_items / dmz_keys / dmz_missions) have the columns but
// ZERO rows pre-launch; they are listed so a future run picks them up
// automatically.
//
// *** extraId DIFFERS BETWEEN THE TWO NEW TABLES. DO NOT COPY ONE TO THE OTHER. ***
// `label()` renders `${id}/${extraId}`, and a finding has to identify ONE row.
//   core_stats    -- (name, rarity) is NOT unique: measured 2026-07-21, 85 rows /
//                    83 distinct pairs, 2 collisions -- Predator|Deluxe x2 and
//                    Hunter/Killer|Deluxe x2. Rarity CANNOT disambiguate here, so
//                    the label carries the uuid, which is the only stable key.
//   implant_stats -- (name, rarity) IS unique: measured 2026-07-21, 120 rows /
//                    120 distinct pairs, 0 collisions. Its 11 duplicate names all
//                    separate by rarity tier, so rarity suffices and reads better.
const TABLES = [
  { name: 'weapon_stats',      id: 'name' },
  { name: 'shell_stats',       id: 'name' },
  { name: 'shell_stat_values', id: 'shell_name', extraId: 'stat_name' },
  { name: 'mod_stats',         id: 'name' },
  { name: 'unique_weapons',    id: 'name' },
  { name: 'core_stats',        id: 'name', extraId: 'id' },
  { name: 'implant_stats',     id: 'name', extraId: 'rarity' },
  { name: 'dmz_items',         id: 'name' },
  { name: 'dmz_keys',          id: 'name' },
  { name: 'dmz_missions',      id: 'name' },
];

// A citation naming a Bungie patch document. These can only ever support the
// fields THAT patch changed, so each one needs a human to confirm the document
// actually contains the values on the row.
const PATCH_CITE_RE = /update\s+(\d+(?:\.\d+)+)|patch\s+(\d+(?:\.\d+)+)/i;

// FORMAT CLASSIFICATION.
//   field-scoped : the parenthetical names REAL COLUMNS of this table
//   compound     : multiple clauses joined by ';' but no column names
//   bare         : a plain source name, no scoping at all
//
// VALIDATED AGAINST THE ACTUAL COLUMN LIST, not a shape regex. The first version
// of this matched any parenthetical, which counted "Confirmed in-game S2
// (Justin)" and "In-game weapon inspect S2 (base, no mods)" as field-scoped --
// over-reporting 13 where the true number was 3. A citation is only field-scoped
// if the thing in brackets is a column someone could actually check.
function classify(src, columns) {
  if (!src) return 'none';
  const parens = src.match(/\(([^)]*)\)/g) || [];
  for (const p of parens) {
    const inner = p.slice(1, -1);
    const named = inner.split(/[,;]/).map((x) => x.trim().toLowerCase()).filter(Boolean);
    if (named.length && named.every((n) => columns.includes(n))) return 'field-scoped';
  }
  if (src.includes(';')) return 'compound';
  return 'bare';
}

const only = process.argv.includes('--table')
  ? process.argv[process.argv.indexOf('--table') + 1]
  : null;

let failures = 0;
const summary = [];

console.log('='.repeat(72));
console.log('PROVENANCE CHECK -- read-only. Reports scale; fixes nothing.');
console.log('='.repeat(72));

for (const t of TABLES) {
  if (only && t.name !== only) continue;

  const { data, error } = await supabase.from(t.name).select('*');
  if (error) { console.log(`\n### ${t.name}: READ ERROR -- ${error.message}`); continue; }
  const rows = data || [];
  if (rows.length === 0) { console.log(`\n### ${t.name}: 0 rows (skipped)`); continue; }

  const label = (r) => t.extraId ? `${r[t.id]}/${r[t.extraId]}` : r[t.id];

  console.log(`\n${'-'.repeat(72)}\n### ${t.name} -- ${rows.length} rows\n`);

  // ── CHECK 1: verified=true with no source ────────────────────────────────
  const c1 = rows.filter((r) => r.verified === true && !String(r.verified_source || '').trim());
  console.log(`  [1] verified=true with NO verified_source : ${c1.length}`);
  if (c1.length) {
    failures += c1.length;
    c1.slice(0, 12).forEach((r) => console.log(`        - ${label(r)}`));
    if (c1.length > 12) console.log(`        ... +${c1.length - 12} more`);
  }

  // ── CHECK 2: patch-note citations needing a manual document check ────────
  const c2 = rows
    .map((r) => ({ r, m: PATCH_CITE_RE.exec(r.verified_source || '') }))
    .filter((x) => x.m);
  console.log(`  [2] cites a patch document (MANUAL CHECK REQUIRED) : ${c2.length}`);
  if (c2.length) {
    failures += c2.length;
    const byPatch = {};
    c2.forEach(({ r, m }) => {
      const p = m[1] || m[2];
      (byPatch[p] = byPatch[p] || []).push(label(r));
    });
    Object.entries(byPatch).sort().forEach(([p, names]) => {
      console.log(`        Update ${p}: ${names.length} row(s) -- ${names.slice(0, 6).join(', ')}${names.length > 6 ? ` +${names.length - 6}` : ''}`);
    });
    console.log('        (a changelog only supports the fields THAT patch changed)');
  }

  // ── CHECK 3: matchup marker missing where matchup data exists ────────────
  if (rows[0] && ('countered_by' in rows[0] || 'counter_items' in rows[0])) {
    const withData = rows.filter((r) => (r.countered_by || []).length > 0 || (r.counter_items || []).length > 0);
    const c3 = withData.filter((r) => !isMatchupVerified(r.verified_source));
    console.log(`  [3] matchup data present but marker MISSING : ${c3.length} (of ${withData.length} with data)`);
    if (c3.length) {
      failures += c3.length;
      c3.forEach((r) => console.log(`        - ${label(r)}`));
      console.log('        (isMatchupVerified gates /matchups display state -- see lib/matchups.js)');
    }
  }

  // ── CHECK 4: format distribution (reported, not a failure) ───────────────
  const columns = Object.keys(rows[0] || {}).map((c) => c.toLowerCase());
  const dist = {};
  rows.forEach((r) => { const k = classify(r.verified_source, columns); dist[k] = (dist[k] || 0) + 1; });
  const order = ['field-scoped', 'compound', 'bare', 'none'];
  console.log(`  [4] format distribution:`);
  order.filter((k) => dist[k]).forEach((k) => console.log(`        ${String(dist[k]).padStart(4)}  ${k}`));

  summary.push({ table: t.name, rows: rows.length, c1: c1.length, c2: c2.length, dist });
}

console.log(`\n${'='.repeat(72)}\nSUMMARY`);
console.log('  table                rows  noSrc  patchCite  field-scoped');
summary.forEach((s) => console.log(
  `  ${s.table.padEnd(20)} ${String(s.rows).padStart(4)}  ${String(s.c1).padStart(5)}  ${String(s.c2).padStart(9)}  ${String(s.dist['field-scoped'] || 0).padStart(12)}`
));
console.log(`\n  TOTAL FINDINGS: ${failures}`);
console.log(failures ? '  RESULT: FAIL (exit 1)' : '  RESULT: PASS (exit 0)');
console.log('='.repeat(72));

process.exit(failures ? 1 : 0);
