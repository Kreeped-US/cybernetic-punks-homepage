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

// Like pageAll but THROWS on a read error (error-vs-empty, the build_pages/sitemap posture, NOT
// the swallow). loadDMZStore uses this so a DMZ store read error PROPAGATES -> the fail-closed
// gate holds (a partial/failed store never silently passes). Marathon (log-only/fail-open) keeps
// pageAll (swallow-to-partial) -- a Marathon store error just means fewer entities, still publishes.
async function pageAllStrict(client, table, sel, filter) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    let q = client.from(table).select(sel);
    if (filter) q = filter(q);
    const { data, error } = await q.range(from, from + 999);
    if (error) throw new Error('[storeLoader] ' + table + ' read failed: ' + error.message);
    if (!data || !data.length) break;
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out;
}

// Load the DMZ entity STORE as classifyCorroboration's { entities } shape (Phase 3a). Mirrors
// loadMarathonStore over the checkable DMZ tables. DMZ tables have NO patch_verified (no patch
// calendar pre-launch) -> patch_verified: null (seniority degrades to indeterminate, handled).
// NOT loaded: dmz_weapon_builds (a generated artifact, not a verified fact) or dmz_pois (a
// location, no hard stat). ERROR-VS-EMPTY: throws on a read error (pageAllStrict); [] on empty.
export async function loadDMZStore(client, gameSlug) {
  const game = gameSlug || 'dmz';
  const [recipes, ingredients, lieutenants, weapons, attachments, recipeIngredients] = await Promise.all([
    pageAllStrict(client, 'dmz_recipes', '*', (q) => q.eq('game_slug', game)),
    pageAllStrict(client, 'dmz_ingredients', '*', (q) => q.eq('game_slug', game)),
    pageAllStrict(client, 'dmz_lieutenants', '*', (q) => q.eq('game_slug', game)),
    pageAllStrict(client, 'dmz_weapons', '*', (q) => q.eq('game_slug', game)),
    pageAllStrict(client, 'dmz_attachments', '*', (q) => q.eq('game_slug', game)),
    pageAllStrict(client, 'dmz_recipe_ingredients', '*', (q) => q.eq('game_slug', game)),
  ]);
  // Recipe -> ingredient NAMES (via the M:N join) -> a locked_mods-style checkable list, attached
  // to the recipe entity's fields for a Phase-3b list extractor (loaded now; no exemplar uses it yet).
  const ingBySlug = {};
  ingredients.forEach((r) => { if (r.slug) ingBySlug[r.slug] = r.name; });
  const ingredientsFor = (recipeSlug) => recipeIngredients
    .filter((ri) => ri.recipe_slug === recipeSlug)
    .map((ri) => ingBySlug[ri.ingredient_slug] || ri.ingredient_slug)
    .filter(Boolean);

  const ent = (type, rows, mapFields) => rows.map((r) => ({
    type, name: r.name, aliases: [],
    fields: mapFields ? mapFields(r) : r,
    verified: r.verified, verified_source: r.verified_source, patch_verified: null,
  }));
  const entities = []
    .concat(ent('dmz-recipe', recipes, (r) => ({ ...r, ingredients: ingredientsFor(r.slug) })))
    .concat(ent('dmz-ingredient', ingredients))
    .concat(ent('dmz-lieutenant', lieutenants))
    .concat(ent('dmz-weapon', weapons))
    .concat(ent('dmz-attachment', attachments))
    .filter((e) => e.name);
  return { entities, counts: { recipe: recipes.length, ingredient: ingredients.length, lieutenant: lieutenants.length, weapon: weapons.length, attachment: attachments.length } };
}

// Per-game gate store dispatch (the cron gate calls this). Marathon -> loadMarathonStore
// (fail-open, swallow); DMZ -> loadDMZStore (fail-closed, throw-on-error); other -> empty store.
export async function loadGateStore(client, gameSlug) {
  // game_slug stamped on the returned store so runGate can assert the store belongs to the
  // draft's game (the game_slug boundary at the gate) -- a caller can no longer hand the
  // wrong game's store to a draft without runGate refusing it (fail-closed).
  if (gameSlug === 'marathon') return { ...(await loadMarathonStore(client, gameSlug)), game_slug: gameSlug };
  if (gameSlug === 'dmz') return { ...(await loadDMZStore(client, gameSlug)), game_slug: gameSlug };
  return { entities: [], counts: {}, game_slug: gameSlug };
}
