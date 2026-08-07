// lib/sitemap/eligible.js
// The ONE eligible-set computation, shared by all three child sitemaps. Returns a
// flat array of { url, game, type, lastmod?, changeFrequency, priority }. Each child
// route is eligibleSet.filter(partition) (see lib/sitemap/partition.js) -- the
// children are FILTERS over this one set, never separate queries, so they cannot drift.
//
// This is a faithful port of the eligibility + priority/changefreq logic from the
// former app/sitemap.js, with two deliberate changes carried from the upgrade spec:
//   (1) LASTMOD DISCIPLINE, applied UNIVERSALLY: a lastmod is the content's real
//       updated_at (via toISOWithPTOffset) or it is OMITTED. NEVER new Date(). The
//       old file kept this rule for hubs (maxUpdatedAt -> null -> omit) but still had
//       `updated_at ? ... : new Date()` fallbacks on detail rows and `new Date()` on
//       guide categories -- latent false-freshness. Those fallbacks are dropped here;
//       a row with no updated_at omits its lastmod (changefreq still carries the signal).
//   (2) ARTICLE lastmod = updated_at, NOT created_at (Gap 3): an edited article now
//       signals recrawl. A lastmod that ignores edits is as dishonest as a faked one.
//
// game tags: 'marathon' | 'dmz'. type tags: 'static' | 'hub' | 'shell' | 'weapon' |
// 'unique' | 'map' | 'modslot' | 'matchup' | 'guide' | 'intel' | 'dmz-article' |
// 'dmz-section' | 'dmz-entity'. The partition keys on (game, type==='intel').

import { assertPartition } from '@/lib/sitemap/partition';
import { supabase } from '@/lib/supabase';
import { toISOWithPTOffset } from '@/lib/formatDate';
import { entitySlugFor } from '@/lib/coverage';
import { dmz, dmzSectionForArticle } from '@/lib/games/dmz';
import { DMZ_ENTITIES, DMZ_ENTITY_KEYS, fetchDmzSlugs } from '@/lib/dmz/entities';
import { fetchIndexableBuildEntries } from '@/lib/dmz/weaponBuilds';
import { sectionHasContent } from '@/lib/dmz/sections';
import { hasSlotPage, newestUpdatedAt, normalizeModRows, slotToSlug } from '@/lib/mods';
import { SHELLS as MATCHUP_SHELLS, shellToSlug as matchupSlug, MATCHUP_VERIFIED_DATE } from '@/lib/matchups';
import { hasShellGuide } from '@/lib/shellGuides';
import { FACTS_UPDATED } from '@/lib/vaultBreaker';

const BASE = 'https://cyberneticpunks.com';
const M = 'marathon', D = 'dmz';

const ALL_GUIDE_CATEGORIES = [
  'shells', 'weapons', 'mods', 'extraction', 'ranked',
  'beginner', 'progression', 'maps', 'stealth', 'squad',
  'solo', 'holotag', 'endgame', 'pvp', 'support', 'cryo-archive',
];
const FALLBACK_SHELL_SLUGS = ['assassin', 'destroyer', 'recon', 'rook', 'thief', 'triage', 'vandal'];

// A real content date -> ISO string, or undefined (OMIT). Never new Date().
function lm(u) { return u ? toISOWithPTOffset(u) : undefined; }
// Newest updated_at across rows, or null (-> the hub omits its lastmod).
function maxUpdatedAt(rows) {
  let best = null;
  for (const r of rows || []) { const u = r && r.updated_at; if (!u) continue; if (best === null || u > best) best = u; }
  return best;
}

export async function computeEligible() {
  const out = [];
  const add = (url, game, type, lastmod, changeFrequency, priority) =>
    out.push({ url, game, type, lastmod, changeFrequency, priority });

  // ── STATIC (Marathon/network; game='marathon', type='static') ──────────────
  // (b) DB-driven -> no lastmod; (a/c) fact-dated -> a literal 'YYYY-MM-DD' string.
  const EDITORS_UPDATED = '2026-07-09', STATS_UPDATED = '2026-07-20',
        LEADERBOARD_UPDATED = '2026-07-20', JOIN_UPDATED = '2026-07-20';
  const mvd = typeof MATCHUP_VERIFIED_DATE === 'string' ? MATCHUP_VERIFIED_DATE : lm(MATCHUP_VERIFIED_DATE);
  const facts = typeof FACTS_UPDATED === 'string' ? FACTS_UPDATED : lm(FACTS_UPDATED);
  const staticPages = [
    [BASE, undefined, 'daily', 1.0],
    [BASE + '/marathon', undefined, 'daily', 0.95],
    [BASE + '/meta', undefined, 'hourly', 0.95],
    [BASE + '/sitrep', undefined, 'hourly', 0.95],
    [BASE + '/factions', undefined, 'daily', 0.9],
    [BASE + '/ranked', undefined, 'daily', 0.9],
    [BASE + '/advisor', undefined, 'daily', 0.9],
    [BASE + '/cradle', undefined, 'daily', 0.9],
    [BASE + '/intel', undefined, 'hourly', 0.9],
    [BASE + '/matchups', mvd, 'weekly', 0.85],
    [BASE + '/modes/vault-breaker', facts, 'daily', 0.9],
    [BASE + '/rising', undefined, 'daily', 0.8],
    [BASE + '/stats', STATS_UPDATED, 'weekly', 0.75],
    [BASE + '/leaderboard', LEADERBOARD_UPDATED, 'daily', 0.75],
    [BASE + '/status', undefined, 'hourly', 0.7],
    [BASE + '/player-count', undefined, 'hourly', 0.8],
    [BASE + '/editors', EDITORS_UPDATED, 'weekly', 0.7],
    [BASE + '/intel/cipher', undefined, 'daily', 0.7],
    [BASE + '/intel/nexus', undefined, 'daily', 0.7],
    [BASE + '/intel/dexter', undefined, 'daily', 0.7],
    [BASE + '/intel/ghost', undefined, 'daily', 0.7],
    [BASE + '/intel/miranda', undefined, 'daily', 0.7],
    [BASE + '/guides', undefined, 'weekly', 0.65],
    [BASE + '/join', JOIN_UPDATED, 'monthly', 0.5],
  ];
  staticPages.forEach(([url, lastmod, cf, pr]) => add(url, M, 'static', lastmod, cf, pr));

  // hub lastmods, collected from the SAME rows the detail URLs are built from.
  const hubLastMod = { shells: null, weapons: null, uniques: null, maps: null, mods: null };
  let shellQueryOk = false;

  // ── SHELLS + guides/shells (type='shell') ──────────────────────────────────
  try {
    const { data: shells } = await supabase.from('shell_stats').select('name, updated_at').order('name');
    hubLastMod.shells = maxUpdatedAt(shells);
    if (shells && shells.length > 0) {
      shellQueryOk = true;
      shells.forEach((s) => {
        const slug = s.name.toLowerCase();
        add(BASE + '/shells/' + slug, M, 'shell', lm(s.updated_at), 'weekly', 0.75);
        if (hasShellGuide(slug)) add(BASE + '/guides/shells/' + slug, M, 'shell', lm(s.updated_at), 'weekly', 0.7);
      });
    }
  } catch (err) { console.error('[sitemap] shell fetch threw:', err); }
  // Fallback shells ONLY if the DB read yielded nothing (build-time resilience).
  if (!shellQueryOk) {
    FALLBACK_SHELL_SLUGS.forEach((slug) => {
      add(BASE + '/shells/' + slug, M, 'shell', undefined, 'weekly', 0.75);
      if (hasShellGuide(slug)) add(BASE + '/guides/shells/' + slug, M, 'shell', undefined, 'weekly', 0.7);
    });
  }

  // ── WEAPONS (type='weapon') ────────────────────────────────────────────────
  try {
    const { data: weapons } = await supabase.from('weapon_stats').select('name, updated_at').order('name');
    hubLastMod.weapons = maxUpdatedAt(weapons);
    (weapons || []).forEach((w) => add(BASE + '/weapons/' + entitySlugFor('weapon', w.name), M, 'weapon', lm(w.updated_at), 'weekly', 0.75));
  } catch (err) { console.error('[sitemap] weapon fetch threw:', err); }

  // ── UNIQUES (type='unique') ────────────────────────────────────────────────
  try {
    const { data: uniques } = await supabase.from('unique_weapons').select('slug, updated_at').order('slug');
    hubLastMod.uniques = maxUpdatedAt(uniques);
    (uniques || []).filter((u) => u.slug).forEach((u) => add(BASE + '/uniques/' + u.slug, M, 'unique', lm(u.updated_at), 'weekly', 0.75));
  } catch (err) { console.error('[sitemap] unique fetch threw:', err); }

  // ── BUILD PAGES (goal-neutral canonicals; type='build') ─────────────────────
  // The /tools/build/[shell] canonical build pages (route slice A1). Only INDEXABLE +
  // GENERATED rows (is_indexable=true AND build_json present) -- the same serving predicate
  // the route 404s on. type='build' is marathon non-intel, so it lands in the entities
  // child automatically (partition keys on intel-vs-not; no partition change needed).
  // lastmod = updated_at -- the freshness stamp the A5 regeneration hook bumps on regen.
  // Read FAILED (error set, or a network reject) -> THROW. A silent build-URL truncation is
  // SEO damage: a deployed sitemap missing indexable pages. Throwing fails the sitemap at
  // BUILD-time (loud, so a broken sitemap never ships); at REQUEST-time revalidation
  // (revalidate:3600) Next serves the last-good cached sitemap -- the exact posture the
  // assertPartition throw below already relies on. A GENUINE empty result (error null, data
  // []) simply emits no build URLs, which is fine. error-vs-empty, NOT zero-vs-nonzero.
  const { data: builds, error: buildsErr } = await supabase.from('build_pages')
    .select('slug, shell, weapon_slug, updated_at').eq('game_slug', M).is('goal', null)
    .eq('is_indexable', true).not('build_json', 'is', null).order('slug');
  if (buildsErr) throw new Error('[sitemap] build_pages read failed: ' + buildsErr.message);
  // Canonical hub -> /tools/build/[shell]; weapon variant (A2) -> /tools/build/[shell]/[weapon].
  (builds || []).forEach((b) => {
    const url = b.weapon_slug ? BASE + '/tools/build/' + b.shell + '/' + b.weapon_slug : BASE + '/tools/build/' + b.shell;
    add(url, M, 'build', lm(b.updated_at), 'weekly', 0.8);
  });

  // ── MAPS (verified marathon only; type='map') ──────────────────────────────
  try {
    const { data: maps } = await supabase.from('game_maps').select('slug, updated_at').eq('game_slug', M).eq('verified', true).order('slug');
    hubLastMod.maps = maxUpdatedAt(maps);
    (maps || []).forEach((m) => add(BASE + '/maps/' + m.slug, M, 'map', lm(m.updated_at), 'weekly', 0.8));
  } catch (err) { console.error('[sitemap] map fetch threw:', err); }

  // ── MOD SLOT pages (type='modslot') ────────────────────────────────────────
  try {
    const { data: modRows } = await supabase.from('mod_stats').select('name, slot_type, updated_at').eq('game_slug', M);
    hubLastMod.mods = maxUpdatedAt(modRows);
    if (modRows && modRows.length > 0) {
      const bySlot = {};
      for (const m of normalizeModRows(modRows)) { if (!hasSlotPage(m.slot_type)) continue; (bySlot[m.slot_type] = bySlot[m.slot_type] || []).push(m); }
      Object.keys(bySlot).forEach((slot) => add(BASE + '/mods/' + slotToSlug(slot), M, 'modslot', lm(newestUpdatedAt(bySlot[slot])), 'weekly', 0.8));
    }
  } catch (err) { console.error('[sitemap] mod slot fetch threw:', err); }

  // ── MATCHUP per-shell pages (allowlist = lib/matchups SHELLS; type='matchup') ─
  try {
    const { data: matchupRows } = await supabase.from('shell_stats').select('name, updated_at').eq('game_slug', M);
    const updatedByName = {};
    (matchupRows || []).forEach((r) => { updatedByName[r.name] = r.updated_at; });
    MATCHUP_SHELLS.forEach((name) => add(BASE + '/matchups/' + matchupSlug(name), M, 'matchup', lm(updatedByName[name]), 'weekly', 0.8));
  } catch (err) { console.error('[sitemap] matchup fetch threw:', err); }

  // ── INTEL articles (the maintenance health meter; type='intel') + guide cats ─
  // Rule (unchanged): published, indexable (noindex=false), marathon. Paginated.
  // lastmod = updated_at (Gap 3, now live): feed_items.updated_at is maintained by a
  // BEFORE-UPDATE content-column trigger (headline/body/thumbnail/tags), so an EDITED
  // article now signals recrawl. created_at is the fallback (updated_at is backfilled +
  // column-defaulted, so it should never be null).
  try {
    let rows = [], from = 0;
    for (;;) {
      const { data: batch, error } = await supabase.from('feed_items')
        .select('slug, created_at, updated_at, tags')
        .eq('is_published', true).eq('game_slug', M).eq('noindex', false)
        .order('created_at', { ascending: false }).range(from, from + 999);
      if (error) { console.error('[sitemap] feed_items batch error:', error.message); break; }
      rows = rows.concat(batch || []);
      if (!batch || batch.length < 1000) break;
      from += 1000;
    }
    rows.forEach((r) => add(BASE + '/intel/' + r.slug, M, 'intel', lm(r.updated_at || r.created_at), 'monthly', 0.6));
    // guide categories with >=1 tagged article (type='guide'; lastmod OMITTED --
    // a category page's content changes when articles are (re)tagged, no honest date).
    const withContent = new Set();
    rows.forEach((r) => (r.tags || []).forEach((t) => { if (ALL_GUIDE_CATEGORIES.includes(t)) withContent.add(t); }));
    ALL_GUIDE_CATEGORIES.filter((s) => withContent.has(s)).forEach((slug) =>
      add(BASE + '/guides/' + slug, M, 'guide', undefined, 'weekly', 0.65));
  } catch (err) { console.error('[sitemap] feed_items fetch threw:', err); }

  // ── ENTITY HUBS (dated from their rows via hubLastMod; type='hub') ──────────
  [['/shells', hubLastMod.shells, 'daily', 0.85], ['/weapons', hubLastMod.weapons, 'daily', 0.85],
   ['/mods', hubLastMod.mods, 'weekly', 0.85], ['/uniques', hubLastMod.uniques, 'weekly', 0.85],
   ['/maps', hubLastMod.maps, 'weekly', 0.85]].forEach(([route, max, cf, pr]) =>
    add(BASE + route, M, 'hub', lm(max), cf, pr));

  // ── DMZ (game='dmz'), gated on dmz.indexable, all content-gated ────────────
  if (dmz.indexable) {
    // DMZ articles (type='dmz-article'; lastmod = updated_at, created_at fallback --
    // same Gap-3 recrawl signal as the intel articles above, now that the column is live).
    try {
      const { data: dmzRows } = await supabase.from('feed_items')
        .select('slug, created_at, updated_at, tags').eq('game_slug', D).eq('is_published', true)
        .order('created_at', { ascending: false });
      (dmzRows || []).map((r) => ({ r, section: dmzSectionForArticle(r) })).filter((x) => x.section)
        .forEach((x) => add(BASE + '/dmz/' + x.section + '/' + x.r.slug, D, 'dmz-article', lm(x.r.updated_at || x.r.created_at), 'monthly', 0.6));
    } catch (err) { console.error('[sitemap] dmz feed fetch threw:', err); }

    // DMZ entity hubs + verified detail pages (type='dmz-entity'), row-count gated.
    try {
      for (const key of DMZ_ENTITY_KEYS) {
        const entity = DMZ_ENTITIES[key];
        const rows = await fetchDmzSlugs(entity);
        if (!rows || rows.length === 0) continue; // no rows -> no hub, no details
        add(BASE + entity.routeBase, D, 'dmz-entity', lm(maxUpdatedAt(rows.filter((r) => r.verified === true))), 'daily', 0.85);
        rows.filter((r) => r.verified === true).forEach((r) =>
          add(BASE + entity.routeBase + '/' + r.slug, D, 'dmz-entity', lm(r.updated_at), 'weekly', 0.7));
      }
    } catch (err) { console.error('[sitemap] dmz entity fetch threw:', err); }

    // DMZ section hubs (type='dmz-section'), gated on the SHARED sectionHasContent
    // predicate (the same one the /dmz/[section] noindex tag uses) -- no drift.
    try {
      for (const sec of dmz.sections) {
        if (!(await sectionHasContent(sec))) continue; // noindexed shell -> excluded
        add(BASE + '/dmz/' + sec.slug, D, 'dmz-section', undefined, 'weekly', 0.8);
      }
    } catch (err) { console.error('[sitemap] dmz section gate threw:', err); }

    // The /dmz hub itself (indexable while dmz.indexable; DB-driven -> no lastmod).
    add(BASE + '/dmz', D, 'dmz-section', undefined, 'daily', 0.9);

    // DMZ WEAPON BUILDS (type='dmz-build'; its OWN sitemap child sitemap-dmz-builds.xml, so
    // "is the DMZ build engine indexing?" is a measurable signal in isolation -- Fable SEO
    // ruling). Emits /dmz/builds/[weapon] ONLY for builds whose DERIVED is_indexable is true:
    // fetchIndexableBuildEntries reuses the SAME isBuildIndexable the route uses (one gate,
    // two callers). ERROR-VS-EMPTY (the build_pages posture, NOT the entity catch-continue):
    // a read error THROWS and propagates out of computeEligible (Next serves the last-good
    // cached sitemap); a legitimate empty yields 0 URLs. Deliberately NOT wrapped in try/catch.
    const buildEntries = await fetchIndexableBuildEntries();
    // The HUB itself (/dmz/builds), row-count gated like the entity hubs: emitted ONLY when >= 1
    // indexable build exists (0 -> the hub is noindexed + absent here, consistent). type='dmz-build'
    // so the type-field partition drops it in sitemap-dmz-builds.xml (no matcher change). lastmod =
    // the newest build's updatedAt.
    if (buildEntries.length > 0) {
      add(BASE + '/dmz/builds', D, 'dmz-build', lm(maxUpdatedAt(buildEntries.map((b) => ({ updated_at: b.updatedAt })))), 'weekly', 0.8);
    }
    buildEntries.forEach((b) => add(BASE + '/dmz/builds/' + b.weaponSlug, D, 'dmz-build', lm(b.updatedAt), 'weekly', 0.7));
  }

  // RUNTIME PARTITION INVARIANT (Change 1): assert union==eligible-set AND pairwise
  // disjoint here, at compute time, so EVERY consumer (all three child routes) is
  // guaranteed a valid partition every regeneration -- not only when a route happens
  // to call partitionEligible. Throws on violation -> Next serves last-good cached ISR.
  assertPartition(out);
  return out;
}
