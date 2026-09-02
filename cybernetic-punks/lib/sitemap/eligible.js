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
import { wardogs, wardogsSectionForArticle } from '@/lib/games/wardogs';
import { pubgDednet, dednetSectionForArticle } from '@/lib/games/pubg-dednet';
import { bodycam, bodycamSectionForArticle, bodycamArticleSlugsForSection } from '@/lib/games/bodycam';
import { getIndexableGames } from '@/lib/games';
import { DMZ_ENTITIES, DMZ_ENTITY_KEYS, fetchDmzSlugs } from '@/lib/dmz/entities';
import { fetchIndexableBuildEntries } from '@/lib/dmz/weaponBuilds';
import { sectionHasContent } from '@/lib/dmz/sections';
import { sectionHasContent as wardogsSectionHasContent } from '@/lib/wardogs/sections';
import { sectionHasContent as dednetSectionHasContent } from '@/lib/pubg-dednet/sections';
import { sectionHasContent as bodycamSectionHasContent } from '@/components/game/GameSectionPage';
import { hasSlotPage, newestUpdatedAt, normalizeModRows, slotToSlug } from '@/lib/mods';
import { SHELLS as MATCHUP_SHELLS, shellToSlug as matchupSlug, MATCHUP_VERIFIED_DATE } from '@/lib/matchups';
import { hasShellGuide } from '@/lib/shellGuides';
import { FACTS_UPDATED } from '@/lib/vaultBreaker';

const BASE = 'https://cyberneticpunks.com';
const M = 'marathon', D = 'dmz', W = 'wardogs', PD = 'pubg-dednet', BC = 'bodycam';

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
    [BASE + '/marathon/meta', undefined, 'hourly', 0.95],
    [BASE + '/marathon/sitrep', undefined, 'hourly', 0.95],
    [BASE + '/marathon/factions', undefined, 'daily', 0.9],
    [BASE + '/marathon/ranked', undefined, 'daily', 0.9],
    [BASE + '/marathon/advisor', undefined, 'daily', 0.9],
    [BASE + '/marathon/cradle', undefined, 'daily', 0.9],
    [BASE + '/marathon/intel', undefined, 'hourly', 0.9],
    [BASE + '/marathon/matchups', mvd, 'weekly', 0.85],
    [BASE + '/marathon/modes/vault-breaker', facts, 'daily', 0.9],
    [BASE + '/marathon/rising', undefined, 'daily', 0.8],
    [BASE + '/marathon/creators', undefined, 'weekly', 0.7],
    [BASE + '/marathon/stats', STATS_UPDATED, 'weekly', 0.75],
    [BASE + '/marathon/leaderboard', LEADERBOARD_UPDATED, 'daily', 0.75],
    [BASE + '/marathon/status', undefined, 'hourly', 0.7],
    [BASE + '/marathon/player-count', undefined, 'hourly', 0.8],
    [BASE + '/editors', EDITORS_UPDATED, 'weekly', 0.7],
    [BASE + '/about', undefined, 'monthly', 0.6],
    [BASE + '/marathon/intel/cipher', undefined, 'daily', 0.7],
    [BASE + '/marathon/intel/nexus', undefined, 'daily', 0.7],
    [BASE + '/marathon/intel/dexter', undefined, 'daily', 0.7],
    [BASE + '/marathon/intel/ghost', undefined, 'daily', 0.7],
    [BASE + '/marathon/intel/miranda', undefined, 'daily', 0.7],
    [BASE + '/marathon/guides', undefined, 'weekly', 0.65],
    [BASE + '/join', JOIN_UPDATED, 'monthly', 0.5],
  ];
  staticPages.forEach(([url, lastmod, cf, pr]) => add(url, M, 'static', lastmod, cf, pr));

  // hub lastmods, collected from the SAME rows the detail URLs are built from.
  const hubLastMod = { shells: null, weapons: null, uniques: null, maps: null, mods: null };
  let shellQueryOk = false;

  // ── SHELLS + guides/shells (type='shell') ──────────────────────────────────
  try {
    const { data: shells } = await supabase.from('shell_stats').select('name, updated_at').eq('game_slug', M).order('name');
    hubLastMod.shells = maxUpdatedAt(shells);
    if (shells && shells.length > 0) {
      shellQueryOk = true;
      shells.forEach((s) => {
        const slug = s.name.toLowerCase();
        add(BASE + '/marathon/shells/' + slug, M, 'shell', lm(s.updated_at), 'weekly', 0.75);
        if (hasShellGuide(slug)) add(BASE + '/marathon/guides/shells/' + slug, M, 'shell', lm(s.updated_at), 'weekly', 0.7);
      });
    }
  } catch (err) { console.error('[sitemap] shell fetch threw:', err); }
  // Fallback shells ONLY if the DB read yielded nothing (build-time resilience).
  if (!shellQueryOk) {
    FALLBACK_SHELL_SLUGS.forEach((slug) => {
      add(BASE + '/marathon/shells/' + slug, M, 'shell', undefined, 'weekly', 0.75);
      if (hasShellGuide(slug)) add(BASE + '/marathon/guides/shells/' + slug, M, 'shell', undefined, 'weekly', 0.7);
    });
  }

  // ── WEAPONS (type='weapon') ────────────────────────────────────────────────
  try {
    const { data: weapons } = await supabase.from('weapon_stats').select('name, updated_at').eq('game_slug', M).order('name');
    hubLastMod.weapons = maxUpdatedAt(weapons);
    (weapons || []).forEach((w) => add(BASE + '/marathon/weapons/' + entitySlugFor('weapon', w.name), M, 'weapon', lm(w.updated_at), 'weekly', 0.75));
  } catch (err) { console.error('[sitemap] weapon fetch threw:', err); }

  // ── UNIQUES (type='unique') ────────────────────────────────────────────────
  try {
    const { data: uniques } = await supabase.from('unique_weapons').select('slug, updated_at').eq('game_slug', M).order('slug');
    hubLastMod.uniques = maxUpdatedAt(uniques);
    (uniques || []).filter((u) => u.slug).forEach((u) => add(BASE + '/marathon/uniques/' + u.slug, M, 'unique', lm(u.updated_at), 'weekly', 0.75));
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
    const url = b.weapon_slug ? BASE + '/marathon/tools/build/' + b.shell + '/' + b.weapon_slug : BASE + '/marathon/tools/build/' + b.shell;
    add(url, M, 'build', lm(b.updated_at), 'weekly', 0.8);
  });

  // ── MAPS (verified marathon only; type='map') ──────────────────────────────
  try {
    const { data: maps } = await supabase.from('game_maps').select('slug, updated_at').eq('game_slug', M).eq('verified', true).order('slug');
    hubLastMod.maps = maxUpdatedAt(maps);
    (maps || []).forEach((m) => add(BASE + '/marathon/maps/' + m.slug, M, 'map', lm(m.updated_at), 'weekly', 0.8));
  } catch (err) { console.error('[sitemap] map fetch threw:', err); }

  // ── MOD SLOT pages (type='modslot') ────────────────────────────────────────
  try {
    const { data: modRows } = await supabase.from('mod_stats').select('name, slot_type, updated_at').eq('game_slug', M);
    hubLastMod.mods = maxUpdatedAt(modRows);
    if (modRows && modRows.length > 0) {
      const bySlot = {};
      for (const m of normalizeModRows(modRows)) { if (!hasSlotPage(m.slot_type)) continue; (bySlot[m.slot_type] = bySlot[m.slot_type] || []).push(m); }
      Object.keys(bySlot).forEach((slot) => add(BASE + '/marathon/mods/' + slotToSlug(slot), M, 'modslot', lm(newestUpdatedAt(bySlot[slot])), 'weekly', 0.8));
    }
  } catch (err) { console.error('[sitemap] mod slot fetch threw:', err); }

  // ── MATCHUP per-shell pages (allowlist = lib/matchups SHELLS; type='matchup') ─
  try {
    const { data: matchupRows } = await supabase.from('shell_stats').select('name, updated_at').eq('game_slug', M);
    const updatedByName = {};
    (matchupRows || []).forEach((r) => { updatedByName[r.name] = r.updated_at; });
    MATCHUP_SHELLS.forEach((name) => add(BASE + '/marathon/matchups/' + matchupSlug(name), M, 'matchup', lm(updatedByName[name]), 'weekly', 0.8));
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
    rows.forEach((r) => add(BASE + '/marathon/intel/' + r.slug, M, 'intel', lm(r.updated_at || r.created_at), 'monthly', 0.6));
    // guide categories with >=1 tagged article (type='guide'; lastmod OMITTED --
    // a category page's content changes when articles are (re)tagged, no honest date).
    const withContent = new Set();
    rows.forEach((r) => (r.tags || []).forEach((t) => { if (ALL_GUIDE_CATEGORIES.includes(t)) withContent.add(t); }));
    ALL_GUIDE_CATEGORIES.filter((s) => withContent.has(s)).forEach((slug) =>
      add(BASE + '/marathon/guides/' + slug, M, 'guide', undefined, 'weekly', 0.65));
  } catch (err) { console.error('[sitemap] feed_items fetch threw:', err); }

  // ── ENTITY HUBS (dated from their rows via hubLastMod; type='hub') ──────────
  [['/marathon/shells', hubLastMod.shells, 'daily', 0.85], ['/marathon/weapons', hubLastMod.weapons, 'daily', 0.85],
   ['/marathon/mods', hubLastMod.mods, 'weekly', 0.85], ['/marathon/uniques', hubLastMod.uniques, 'weekly', 0.85],
   ['/marathon/maps', hubLastMod.maps, 'weekly', 0.85]].forEach(([route, max, cf, pr]) =>
    add(BASE + route, M, 'hub', lm(max), cf, pr));

  // ── DMZ (game='dmz'), gated on the INDEXABILITY axis, all content-gated ─────
  // Membership tracks indexability, NOT generation (Stage 3): getIndexableGames() is the
  // dedicated indexability enumerator. getIndexableGames().includes('dmz') is exactly
  // dmz.indexable !== false today (true), so this is byte-identical -- the point is that
  // sitemap membership reads the indexability axis, never the generation switch.
  if (getIndexableGames().includes(D)) {
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

  // ── WARDOGS (game='wardogs'), gated on the INDEXABILITY axis (Stage 6 Track 2). INERT
  // while wardogs.indexable is false: getIndexableGames() excludes it -> this emits NOTHING ->
  // the partition wardogs bucket stays empty -> the sitemap is byte-identical. Articles only
  // (no entity/build verticals yet); section derived per-row via wardogsSectionForArticle
  // (unmapped -> dropped), same shape as the DMZ article emitter above. lastmod = updated_at,
  // created_at fallback. A read error is caught + logged (non-fatal; the block yields 0 URLs).
  if (getIndexableGames().includes('wardogs')) {
    try {
      const { data: wdRows } = await supabase.from('feed_items')
        .select('slug, created_at, updated_at, tags').eq('game_slug', W).eq('is_published', true)
        .order('created_at', { ascending: false });
      (wdRows || []).map((r) => ({ r, section: wardogsSectionForArticle(r) })).filter((x) => x.section)
        .forEach((x) => add(BASE + '/wardogs/' + x.section + '/' + x.r.slug, W, 'wardogs-article', lm(x.r.updated_at || x.r.created_at), 'monthly', 0.6));
    } catch (err) { console.error('[sitemap] wardogs feed fetch threw:', err); }

    // Section hubs (type='wardogs-section'), gated on the SHARED sectionHasContent predicate -- the
    // same one the /wardogs/[section] noindex tag uses, so the sitemap and the page never drift.
    // Mirrors the DMZ section-hub emitter above.
    try {
      for (const sec of wardogs.sections) {
        if (!(await wardogsSectionHasContent(sec))) continue; // noindexed empty section -> excluded
        add(BASE + '/wardogs/' + sec.slug, W, 'wardogs-section', undefined, 'weekly', 0.8);
      }
    } catch (err) { console.error('[sitemap] wardogs section gate threw:', err); }

    // The /wardogs landing itself (indexable while wardogs.indexable; DB-driven -> no lastmod).
    add(BASE + '/wardogs', W, 'wardogs-section', undefined, 'daily', 0.9);
  }

  // ── PUBG: DED.NET (game='pubg-dednet'), gated on the INDEXABILITY axis (Phase 1). INERT while
  // pubg-dednet.indexable is false: getIndexableGames() excludes it -> this emits NOTHING -> the
  // partition pubgDednet bucket stays empty -> the sitemap is byte-identical. Articles only;
  // section derived per-row via dednetSectionForArticle (unmapped -> dropped), same shape as the
  // Wardogs/DMZ emitters above. lastmod = updated_at, created_at fallback. Read error caught.
  if (getIndexableGames().includes('pubg-dednet')) {
    try {
      const { data: pdRows } = await supabase.from('feed_items')
        .select('slug, created_at, updated_at, tags').eq('game_slug', PD).eq('is_published', true)
        .order('created_at', { ascending: false });
      (pdRows || []).map((r) => ({ r, section: dednetSectionForArticle(r) })).filter((x) => x.section)
        .forEach((x) => add(BASE + '/pubg-dednet/' + x.section + '/' + x.r.slug, PD, 'pubg-dednet-article', lm(x.r.updated_at || x.r.created_at), 'monthly', 0.6));
    } catch (err) { console.error('[sitemap] pubg-dednet feed fetch threw:', err); }

    // Section hubs + landing, SAME shape as the Wardogs/DMZ emitters. This whole block is gated on
    // pubg-dednet.indexable (false today), so it stays EMPTY until the flip -- then it emits the
    // landing + every content-bearing section, pre-empting the articles-only gap.
    try {
      for (const sec of pubgDednet.sections) {
        if (!(await dednetSectionHasContent(sec))) continue; // noindexed empty section -> excluded
        add(BASE + '/pubg-dednet/' + sec.slug, PD, 'pubg-dednet-section', undefined, 'weekly', 0.8);
      }
    } catch (err) { console.error('[sitemap] pubg-dednet section gate threw:', err); }

    // The /pubg-dednet landing itself (indexable while pubg-dednet.indexable; DB-driven -> no lastmod).
    add(BASE + '/pubg-dednet', PD, 'pubg-dednet-section', undefined, 'daily', 0.9);
  }

  // ── BODYCAM (game='bodycam'), gated on the INDEXABILITY axis. INERT while bodycam.indexable is
  // false: getIndexableGames() excludes it -> this whole block emits NOTHING -> the partition
  // bodycam bucket stays empty -> the sitemap index is byte-identical. On the flip it emits the
  // landing, the builder, content-bearing sections, published+noindex=false articles, and the
  // per-weapon pages -- so the flip is a one-line config change with a correct sitemap, not an
  // articles-only gap. Per-part pages (/bodycam/attachments/<slug>) are DEFERRED: bodycam_attachments
  // is empty (no slugs to emit); add when parts are seeded. All reads game_slug='bodycam'-scoped
  // (shared tables). Errors caught + logged (non-fatal; the block yields 0 URLs on error).
  if (getIndexableGames().includes(BC)) {
    // Articles: published AND noindex=false -- same honesty gate as the marathon emitter, so a
    // live-but-noindex row (e.g. the classes explainer) stays OUT of the sitemap until its own
    // noindex clears. Section derived per-row via bodycamSectionForArticle (unmapped -> dropped).
    try {
      const { data: bcRows } = await supabase.from('feed_items')
        .select('slug, created_at, updated_at, tags').eq('game_slug', BC).eq('is_published', true).eq('noindex', false)
        .order('created_at', { ascending: false });
      (bcRows || []).map((r) => ({ r, section: bodycamSectionForArticle(r) })).filter((x) => x.section)
        .forEach((x) => add(BASE + '/bodycam/' + x.section + '/' + x.r.slug, BC, 'bodycam-article', lm(x.r.updated_at || x.r.created_at), 'monthly', 0.6));
    } catch (err) { console.error('[sitemap] bodycam feed fetch threw:', err); }

    // Section hubs, gated on the SHARED sectionHasContent predicate -- the SAME one the
    // /bodycam/[section] noindex tag uses (components/game/GameSectionPage), so the sitemap and the
    // page never drift. Data sections (arsenal/maps) return false (source!=='editor') and are excluded.
    try {
      for (const sec of bodycam.sections) {
        if (!(await bodycamSectionHasContent(bodycam, sec, bodycamArticleSlugsForSection))) continue;
        add(BASE + '/bodycam/' + sec.slug, BC, 'bodycam-section', undefined, 'weekly', 0.8);
      }
    } catch (err) { console.error('[sitemap] bodycam section gate threw:', err); }

    // Per-weapon pages (/bodycam/weapons/<slug>) -- the real weapon_stats roster, game_slug-scoped
    // (shared table). Slug via entitySlugFor('weapon', name), matching the arsenal links + the
    // per-weapon route resolver. lastmod = updated_at.
    try {
      const { data: bcWeapons } = await supabase.from('weapon_stats').select('name, updated_at').eq('game_slug', BC).order('name');
      (bcWeapons || []).forEach((w) => add(BASE + '/bodycam/weapons/' + entitySlugFor('weapon', w.name), BC, 'bodycam-weapon', lm(w.updated_at), 'weekly', 0.7));
    } catch (err) { console.error('[sitemap] bodycam weapons fetch threw:', err); }

    // The builder tool + the landing (DB-driven -> no lastmod).
    add(BASE + '/bodycam/builder', BC, 'bodycam-section', undefined, 'weekly', 0.8);
    add(BASE + '/bodycam', BC, 'bodycam-section', undefined, 'daily', 0.9);
  }

  // RUNTIME PARTITION INVARIANT (Change 1): assert union==eligible-set AND pairwise
  // disjoint here, at compute time, so EVERY consumer (all three child routes) is
  // guaranteed a valid partition every regeneration -- not only when a route happens
  // to call partitionEligible. Throws on violation -> Next serves last-good cached ISR.
  assertPartition(out);
  return out;
}
