// lib/wardogs/combatSource.js
// Credit strings for the stored Wardogs combat data (wardogs_ballistics, wardogs_ttk, the fire_rate column),
// and the SOURCE REGISTRY that reads a row's own verified_source to say which data set it came from (Brief 319).
//
// COMBAT_SOURCE_LABEL / COMBAT_BASIS name the 2026-09-10 Swoleguy load only. Use them where the text genuinely
// means that load; for per-weapon numbers read the row's source through combatSourceOf / dataVintage instead,
// because after the Season 2 apply (docs/migrations/2026-11-07-wardogs-s2-apply-*.sql) some rows are Evo4Fun.
export const COMBAT_SOURCE_LABEL = 'Swoleguy in-game ballistics testing (attributed)';
export const COMBAT_BASIS = 'community-tested ballistics (Swoleguy), attributed';
// No named tester: used when a row's source matches no registry entry (or there are no rows).
export const GENERIC_BASIS = 'community-tested ballistics, attributed';

// One entry per stored data set. match is tested against the row's verified_source; a row that matches no
// entry is "unknown" and is never credited to any entry. sourceDate is when the data set was produced, compared
// with the ledger patch date by lib/wardogs/dataVintage.js. Order = display order when several are present.
// sourceName is the credit without its own "(attributed)", for running text that continues after it (Brief 320).
//   swoleguy-2026-09-10: "Swoleguy in-game shooting-range ballistics testing (YouTube), released for community
//     use, 2026-09-10, attributed, not owner-verified" (docs/migrations/2026-09-10-wardogs-ballistics-data.sql)
//   evo4fun-2026-10-30: the ballistics and TTK texts written by 2026-11-07-wardogs-s2-apply-1 and apply-2
//     (both start "Evo4Fun" and name the sheet date 30/10/2026)
export const COMBAT_SOURCES = [
  {
    key: 'swoleguy-2026-09-10',
    match: /^Swoleguy in-game shooting-range ballistics testing\b.*\b2026-09-10\b/,
    creditLabel: COMBAT_SOURCE_LABEL,
    sourceName: 'Swoleguy in-game ballistics testing',
    basis: COMBAT_BASIS,
    attributedTo: 'Swoleguy',
    sourceDate: '2026-09-10',
  },
  {
    key: 'evo4fun-2026-10-30',
    match: /^Evo4Fun\b.*\b30\/10\/2026\b/,
    creditLabel: 'Evo4Fun in-game testing workbook, sheet dated 30/10/2026 (attributed)',
    sourceName: 'Evo4Fun in-game testing workbook, sheet dated 30/10/2026',
    basis: 'community-tested ballistics (Evo4Fun workbook, sheet dated 30/10/2026), attributed',
    attributedTo: 'the Evo4Fun workbook, sheet dated 30/10/2026',
    sourceDate: '2026-10-30',
  },
];

// The registry entry a verified_source belongs to, or null (unknown source: make no claim).
export function combatSourceOf(verifiedSource) {
  if (typeof verifiedSource !== 'string' || !verifiedSource) return null;
  return COMBAT_SOURCES.find((e) => e.match.test(verifiedSource)) || null;
}

// The registry entries present in a set of rows, in registry order. unknown = at least one row matches no entry.
export function combatSourcesIn(rows) {
  const keys = new Set();
  let unknown = false;
  for (const r of Array.isArray(rows) ? rows : []) {
    if (!r) continue;
    const e = combatSourceOf(r.verified_source);
    if (e) keys.add(e.key); else unknown = true;
  }
  return { entries: COMBAT_SOURCES.filter((e) => keys.has(e.key)), unknown };
}

// The PUBLIC source credits for a set of rows (Brief 320): the registry creditLabels present, in registry order,
// de-duplicated, plus the generic credit when any row names no entry. The rows' raw verified_source text (which
// carries internal notes) never reaches a page or generated article text through this.
export const GENERIC_COMBAT_CREDIT = 'community testing (attributed)';
export function publicSourceCredits(rows) {
  const { entries, unknown } = combatSourcesIn(rows);
  const out = entries.map((e) => e.creditLabel);
  if (unknown) out.push(GENERIC_COMBAT_CREDIT);
  return out;
}
