// lib/gsc/storeLoader.js
// SHARED store loader for the game-DB corroboration classifier (lib/gsc/corroboration.js).
// Reads the three verified Marathon entity tables (unique_weapons / shell_stats / weapon_stats)
// and shapes their rows into the { entities } object classifyCorroboration expects. ONE loader,
// called by BOTH the headless batch runner (scripts/gsc-corroboration.mjs) and the pre-publish
// gate (app/api/cron/route.js) -- so the store the gate checks a DRAFT against is byte-identical
// to the store the batch audits PUBLISHED articles against. Read-only; never writes anything.
//
// aliases are CANONICAL-ONLY here (precision-first): the classifier matches full entity names, so
// a short-form mention is under-reported (silence), never a false finding. Alias curation is the
// recall lever, banked as a follow-on -- extracting the loader does not change that posture.

// Page through a table in 1000-row slices (PostgREST's hard cap), applying an optional filter.
// Returns what it has (and logs) on a read error -- it never throws, so a store read cannot crash
// its caller: the gate must fail-open, and the batch prefers a partial store to a hard stop.
async function pageAll(client, table, sel, filter) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    let q = client.from(table).select(sel);
    if (filter) q = filter(q);
    const { data, error } = await q.range(from, from + 999);
    if (error) { console.error('[storeLoader] ' + table + ' read err: ' + error.message); break; }
    if (!data || !data.length) break;
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out;
}

// Load the Marathon entity STORE as classifyCorroboration's { entities } shape. Returns
// { entities, counts } where counts = { unique, shell, weapon } (row totals, for logging).
export async function loadMarathonStore(client, gameSlug) {
  const game = gameSlug || 'marathon';
  const [uniques, shells, weapons] = await Promise.all([
    pageAll(client, 'unique_weapons', '*', (q) => q.eq('game_slug', game)),
    pageAll(client, 'shell_stats', '*', (q) => q.eq('game_slug', game)),
    pageAll(client, 'weapon_stats', '*', (q) => q.eq('game_slug', game)),
  ]);
  const entities = []
    .concat(uniques.map((r) => ({ type: 'unique', name: r.name, aliases: [], fields: r, verified: r.verified, verified_source: r.verified_source, patch_verified: r.patch_verified })))
    .concat(shells.map((r) => ({ type: 'shell', name: r.name, aliases: [], fields: r, verified: r.verified, verified_source: r.verified_source, patch_verified: r.patch_verified })))
    .concat(weapons.map((r) => ({ type: 'weapon', name: r.name, aliases: [], fields: r, verified: r.verified, verified_source: r.verified_source, patch_verified: r.patch_verified })))
    .filter((e) => e.name);
  return { entities, counts: { unique: uniques.length, shell: shells.length, weapon: weapons.length } };
}
