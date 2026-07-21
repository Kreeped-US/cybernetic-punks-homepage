// -- app/sitemap.js -----------------------------------------------
// Sitemap with dynamic category filtering. Only includes guide
// category pages that have at least 1 published article tagged
// with their canonical tag. Empty categories are excluded so Google
// doesn't see thin-content pages.
//
// CANONICAL TAG CONVENTION (must match CATEGORIES keys in
// app/guides/[category]/page.js exactly):
// shells, weapons, mods, extraction, ranked, beginner, progression,
// maps, stealth, squad, solo, holotag, endgame, pvp, support, cryo-archive
//
// JUNE 2, 2026: Added /uniques (static) + dynamic /weapons/[slug] pages.
// Weapon slugs use the full lowercase+hyphenate rule (NOT the simple
// shell .toLowerCase()) because weapon names contain spaces/symbols
// (e.g. "KKV-9SD", "Misriah 2442"); the rule must match how
// app/weapons/[slug]/page.js resolves incoming URLs or the sitemap
// would list URLs the pages can't match.
//
// JUNE 8, 2026: Added /maps (index, static) + dynamic /maps/[slug] pages
// from game_maps (verified, marathon). These are the SEO map reference
// pages built today. game_maps has a real `slug` column, so no
// name-deriving is needed (unlike weapons). New maps self-add to the
// sitemap once their game_maps row is verified=true.
//   NOTE: /maps/[slug] (the map pages) is DISTINCT from /guides/maps
//   (the "maps" guide category) - both can coexist; do not conflate.
//
// JULY 16, 2026: Added dynamic /mods/[slot] category pages from mod_stats
// (marathon). The slot list is NOT hardcoded here - it comes from
// lib/mods.js SLOT_PAGES, the same list app/mods/[slot]/page.js resolves
// against, so the sitemap cannot advertise a slot the route 404s (Generator
// is deliberately withheld; see lib/mods.js for why).
// -----------------------------------------------------------------

import { createClient } from '@supabase/supabase-js';
import { toISOWithPTOffset } from '@/lib/formatDate';
import { dmz, dmzSectionForArticle } from '@/lib/games/dmz';
import { DMZ_ENTITIES, DMZ_ENTITY_KEYS, fetchDmzSlugs } from '@/lib/dmz/entities';
import { hasSlotPage, newestUpdatedAt, normalizeModRows, slotToSlug } from '@/lib/mods';
import { SHELLS as MATCHUP_SHELLS, shellToSlug as matchupSlug, MATCHUP_VERIFIED_DATE } from '@/lib/matchups';
import { hasShellGuide } from '@/lib/shellGuides';
// FACT DATES read from lib/ so the sitemap and the pages' JSON-LD cannot tell
// different freshness stories. See the lastmod policy note in sitemap() below.
import { FACTS_UPDATED } from '@/lib/vaultBreaker';

const ALL_GUIDE_CATEGORIES = [
  'shells', 'weapons', 'mods', 'extraction', 'ranked',
  'beginner', 'progression', 'maps', 'stealth', 'squad',
  'solo', 'holotag', 'endgame', 'pvp', 'support', 'cryo-archive',
];

const FALLBACK_SHELL_SLUGS = ['assassin', 'destroyer', 'recon', 'rook', 'thief', 'triage', 'vandal'];

// Newest `updated_at` across a set of rows, or null when none has one.
//
// WHY (2026-07-21): the entity HUB pages (/shells, /weapons, /uniques, /maps,
// /mods) were built in the static array BEFORE any DB read, so they carried a
// build timestamp while their content was weeks old -- /weapons and /uniques were
// 49 days stale, /maps 43. That was the largest remaining false-freshness signal
// on the site, bigger than the one fixed earlier the same day.
//
// An index page's honest lastmod is the newest of the rows it indexes. Every hub
// query ALREADY selects `updated_at` for the detail URLs, so this costs no extra
// round trip.
//
// RETURNS NULL, NOT A DATE, when nothing qualifies. The caller must then OMIT
// lastmod rather than fall back to `new Date()` -- falling back is precisely the
// bug this removes, and a hub with no rows has no honest date to report.
function maxUpdatedAt(rows) {
  let best = null;
  for (const r of rows || []) {
    const u = r && r.updated_at;
    if (!u) continue;
    if (best === null || u > best) best = u;
  }
  return best;
}

// Weapon name -> URL slug. MUST match app/weapons/[slug]/page.js.
function weaponSlug(name) {
  return (name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default async function sitemap() {
  const baseUrl = 'https://cyberneticpunks.com';

  // ── lastmod POLICY (2026-07-21) ──────────────────────────────────────────
  // Every hardcoded static route used `lastModified: new Date()`, so lastmod
  // tracked the DEPLOY, not the content. Measured on the live sitemap before the
  // fix: 29 URLs shared the millisecond `2026-07-21T15:50:41.939Z`, which was
  // the push time. /modes/vault-breaker was the clearest case -- its JSON-LD
  // dateModified read the honest FACTS_UPDATED while its lastmod read the build
  // clock, so one page told crawlers two different freshness stories. They
  // agreed only by coincidence, on the one day both happened to be 2026-07-21.
  //
  // Routes now fall into three buckets, decided on EVIDENCE (supabase refs +
  // fetch/await in the page module), not on the route name:
  //
  //   (a) FACT-DATED   -> a real constant. Content changes when a human edits
  //                       it, and we know when that was.
  //   (b) DB-DRIVEN    -> NO lastmod at all. Content changes without a deploy,
  //                       so any lastmod is wrong the moment it is written. A
  //                       build timestamp is not "imprecise", it is wrong
  //                       IMMEDIATELY -- the data has already moved. changefreq
  //                       carries the signal, and Google ignores lastmod it
  //                       judges unreliable. Stamping 15 pages with deploy time
  //                       degrades trust in the ~900 ARTICLE URLs whose
  //                       per-article lastmod is genuinely honest. That trade is
  //                       the whole argument for omitting.
  //   (c) STATIC       -> a literal date from `git log`, the last SUBSTANTIVE
  //                       content commit. These pages have a real last-changed
  //                       date; declining to answer when we know it is worse
  //                       than answering.
  //
  // next/sitemap emits <lastmod> ONLY when the field is truthy (verified in
  // node_modules/next/dist/.../resolve-route-data.js: `if (item.lastModified)`),
  // so OMITTING the key emits no element. It does NOT default to now(). It also
  // passes a STRING through verbatim, which is why the constants below are
  // 'YYYY-MM-DD' strings and not `new Date(...)` -- the latter would emit
  // `T00:00:00.000Z` and invent a midnight precision these dates do not have.
  //
  // TWO ROUTES I INITIALLY MIS-CATEGORISED, kept as a warning: /stats and
  // /leaderboard look dynamic and carry changefreq daily/weekly, but both are
  // SEO PLACEHOLDERS -- zero supabase refs, zero fetch, zero await, both headed
  // "ready to wire to the Bungie API when available". Their content only changes
  // when someone edits the file, so they are (c), not (b). Check the module, not
  // the route name.
  //
  //   (d) ENTITY HUBS -> max(updated_at) of the rows they index. FIXED
  //                       2026-07-21 (see hubPages below). A constant would be
  //                       wrong for an index over changing children, and a build
  //                       timestamp was wrong by 49 days on /weapons and
  //                       /uniques. They are emitted AFTER the DB reads now, so
  //                       they are no longer in this static array.

  // (c) STATIC ROUTES -- last substantive content commit, from `git log`.
  // UPDATE THESE BY HAND when the page actually changes. A stale date here is a
  // small lie; `new Date()` was a daily one.
  const EDITORS_UPDATED = '2026-07-09';      // visible breadcrumbs + BreadcrumbList JSON-LD
  const STATS_UPDATED = '2026-07-20';        // fix(honesty): removed unbuilt-capability claims
  const LEADERBOARD_UPDATED = '2026-07-20';  // fix(honesty): blanked invented leaderboard data
  const JOIN_UPDATED = '2026-07-20';         // fix(seo): title suffix drop

  const staticPages = [
    // (b) DB-DRIVEN -- no lastmod. See the policy note above.
    { url: baseUrl,                  changeFrequency: 'daily',   priority: 1.0 },
    { url: baseUrl + '/marathon',    changeFrequency: 'daily',   priority: 0.95 },
    { url: baseUrl + '/meta',        changeFrequency: 'hourly',  priority: 0.95 },
    { url: baseUrl + '/sitrep',      changeFrequency: 'hourly',  priority: 0.95 },
    { url: baseUrl + '/factions',    changeFrequency: 'daily',   priority: 0.9 },
    { url: baseUrl + '/ranked',      changeFrequency: 'daily',   priority: 0.9 },
    { url: baseUrl + '/advisor',     changeFrequency: 'daily',   priority: 0.9 },
    { url: baseUrl + '/cradle',      changeFrequency: 'daily',   priority: 0.9 },
    { url: baseUrl + '/intel',       changeFrequency: 'hourly',  priority: 0.9 },
    // ENTITY HUBS (/shells, /weapons, /mods, /uniques, /maps) are NOT here --
    // they are emitted as `hubPages` after the DB reads, dated from the rows
    // they index. Adding one back to this array would silently restore the
    // build-timestamp bug.
    // (a) FACT-DATED. /matchups = the ENTITY REFERENCE hub for the game-verified
    // shell matchup matrix (app/matchups/page.js). Weekly, like /mods: the matrix
    // changes far less than the daily-regraded shells/weapons. The 8 per-shell
    // pages are emitted dynamically below (matchupPages), list from
    // lib/matchups.js SHELLS.
    //   MATCHUP_VERIFIED_DATE already drives the per-shell pages' JSON-LD
    //   dateModified, so before this the HUB disagreed with its own children.
    //   One constant now feeds both.
    { url: baseUrl + '/matchups',    lastModified: MATCHUP_VERIFIED_DATE, changeFrequency: 'weekly', priority: 0.85 },
    // (a) FACT-DATED. Vault Breaker: the official-sourced canonical for Marathon's
    // first PvE mode (July 21 - Aug 4, 2026). Priority 0.9 + daily while the event
    // runs -- it is a dated event page, not evergreen reference. NOTE: there is no
    // /modes index yet; this is currently the only page under /modes, so no parent
    // entry is emitted. Revisit priority/changeFrequency after Aug 4.
    //   FACTS_UPDATED is the SAME constant the page's JSON-LD dateModified reads
    //   (lib/vaultBreaker.js), so sitemap and structured data cannot disagree.
    { url: baseUrl + '/modes/vault-breaker', lastModified: FACTS_UPDATED, changeFrequency: 'daily', priority: 0.9 },
    { url: baseUrl + '/rising',      changeFrequency: 'daily',   priority: 0.8 },
    // (c) STATIC placeholders -- see the mis-categorisation warning above.
    { url: baseUrl + '/stats',       lastModified: STATS_UPDATED, changeFrequency: 'weekly',  priority: 0.75 },
    { url: baseUrl + '/leaderboard', lastModified: LEADERBOARD_UPDATED, changeFrequency: 'daily', priority: 0.75 },
    { url: baseUrl + '/status',      changeFrequency: 'hourly',  priority: 0.7 },
    { url: baseUrl + '/player-count',changeFrequency: 'hourly',  priority: 0.8 },
    // (c) STATIC -- roster comes from lib/editors/roster.js, no DB read.
    { url: baseUrl + '/editors',     lastModified: EDITORS_UPDATED, changeFrequency: 'weekly', priority: 0.7 },
    { url: baseUrl + '/intel/cipher',  changeFrequency: 'daily', priority: 0.7 },
    { url: baseUrl + '/intel/nexus',   changeFrequency: 'daily', priority: 0.7 },
    { url: baseUrl + '/intel/dexter',  changeFrequency: 'daily', priority: 0.7 },
    { url: baseUrl + '/intel/ghost',   changeFrequency: 'daily', priority: 0.7 },
    { url: baseUrl + '/intel/miranda', changeFrequency: 'daily', priority: 0.7 },
    { url: baseUrl + '/guides',        changeFrequency: 'weekly', priority: 0.65 },
    // (c) STATIC -- supabase here is an auth redirect, not page content.
    { url: baseUrl + '/join',          lastModified: JOIN_UPDATED, changeFrequency: 'monthly', priority: 0.5 },
  ];

  // Same guide filter as the DB path below: the fallback must not advertise a
  // guide route that does not exist either.
  const fallbackShellPages = FALLBACK_SHELL_SLUGS.flatMap((slug) => {
    const entries = [{
      url: baseUrl + '/shells/' + slug,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.75,
    }];
    if (hasShellGuide(slug)) {
      entries.push({
        url: baseUrl + '/guides/shells/' + slug,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    }
    return entries;
  });

  let dbShellPages = [];
  let weaponPages = [];
  let uniquePages = [];
  let mapPages = [];
  let modSlotPages = [];
  let matchupPages = [];
  let dynamicPages = [];
  let dmzArticlePages = [];
  let dmzEntityPages = [];
  let activeGuideCategories = [];
  // Newest updated_at per entity HUB, collected from the SAME rows the detail
  // URLs are built from (see maxUpdatedAt). Stays null for any hub whose query
  // failed or returned nothing, and a null means the hub emits NO lastmod.
  const hubLastMod = { shells: null, weapons: null, uniques: null, maps: null, mods: null };

  console.log('[sitemap] starting generation, env vars present:',
    !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    // Shell pages from DB
    try {
      const { data: shells, error: shellsErr } = await supabase
        .from('shell_stats')
        .select('name, updated_at')
        .order('name');

      console.log('[sitemap] shell_stats:',
        shells ? shells.length + ' rows' : 'null',
        shellsErr ? 'error: ' + shellsErr.message : '');

      hubLastMod.shells = maxUpdatedAt(shells);
      if (shells && shells.length > 0) {
        // /shells/<slug> is emitted for EVERY shell_stats row -- that route reads
        // the table directly, so every row has a page.
        //
        // /guides/shells/<slug> is emitted ONLY for slugs in
        // lib/shellGuides.js SHELL_GUIDE_SLUGS, the SAME list the resolver in
        // app/guides/shells/[name]/page.js matches against -- same discipline as
        // SLOT_PAGES for /mods/[slot] and matchups SHELLS for /matchups/[shell].
        // Before this, the emission was unfiltered and advertised
        // /guides/shells/sentinel, which the route 404s (Sentinel is in
        // shell_stats but deliberately has no guide -- see lib/shellGuides.js).
        dbShellPages = shells.flatMap((s) => {
          const shellSlug = s.name.toLowerCase();
          const entries = [{
            url: baseUrl + '/shells/' + shellSlug,
            lastModified: s.updated_at ? new Date(s.updated_at) : new Date(),
            changeFrequency: 'weekly',
            priority: 0.75,
          }];
          if (hasShellGuide(shellSlug)) {
            entries.push({
              url: baseUrl + '/guides/shells/' + shellSlug,
              lastModified: s.updated_at ? new Date(s.updated_at) : new Date(),
              changeFrequency: 'weekly',
              priority: 0.7,
            });
          }
          return entries;
        });
      }
    } catch (err) {
      console.error('[sitemap] shell fetch threw:', err);
    }

    // Weapon detail pages from DB. Slug uses the full hyphenate rule to
    // match app/weapons/[slug]/page.js (weapon names have spaces/symbols).
    try {
      const { data: weapons, error: weaponsErr } = await supabase
        .from('weapon_stats')
        .select('name, updated_at')
        .order('name');

      console.log('[sitemap] weapon_stats:',
        weapons ? weapons.length + ' rows' : 'null',
        weaponsErr ? 'error: ' + weaponsErr.message : '');

      hubLastMod.weapons = maxUpdatedAt(weapons);
      if (weapons && weapons.length > 0) {
        weaponPages = weapons.map((w) => ({
          url: baseUrl + '/weapons/' + weaponSlug(w.name),
          lastModified: w.updated_at ? new Date(w.updated_at) : new Date(),
          changeFrequency: 'weekly',
          priority: 0.75,
        }));
      }
    } catch (err) {
      console.error('[sitemap] weapon fetch threw:', err);
    }

    // Unique-weapon detail pages from DB. unique_weapons has a real `slug`
    // column, so this is direct (no name-deriving, unlike weapons). Mirrors the
    // weapon-page pattern; the /uniques/[slug] route renders each row.
    try {
      const { data: uniques, error: uniquesErr } = await supabase
        .from('unique_weapons')
        .select('slug, updated_at')
        .order('slug');

      console.log('[sitemap] unique_weapons:',
        uniques ? uniques.length + ' rows' : 'null',
        uniquesErr ? 'error: ' + uniquesErr.message : '');

      hubLastMod.uniques = maxUpdatedAt(uniques);
      if (uniques && uniques.length > 0) {
        uniquePages = uniques
          .filter((u) => u.slug)
          .map((u) => ({
            url: baseUrl + '/uniques/' + u.slug,
            lastModified: u.updated_at ? new Date(u.updated_at) : new Date(),
            changeFrequency: 'weekly',
            priority: 0.75,
          }));
      }
    } catch (err) {
      console.error('[sitemap] unique fetch threw:', err);
    }

    // Map detail pages from DB (game_maps SEO layer, added June 8, 2026).
    // game_maps has a real `slug` column - direct, no name-deriving. Only
    // verified marathon maps get a public page, so the sitemap mirrors that.
    try {
      const { data: maps, error: mapsErr } = await supabase
        .from('game_maps')
        .select('slug, updated_at')
        .eq('game_slug', 'marathon')
        .eq('verified', true)
        .order('slug');

      console.log('[sitemap] game_maps:',
        maps ? maps.length + ' rows' : 'null',
        mapsErr ? 'error: ' + mapsErr.message : '');

      hubLastMod.maps = maxUpdatedAt(maps);
      if (maps && maps.length > 0) {
        mapPages = maps.map((m) => ({
          url: baseUrl + '/maps/' + m.slug,
          lastModified: m.updated_at ? new Date(m.updated_at) : new Date(),
          changeFrequency: 'weekly',
          priority: 0.8,
        }));
      }
    } catch (err) {
      console.error('[sitemap] map fetch threw:', err);
    }

    // Mod category pages (/mods/[slot], added July 16 2026). The slot list comes
    // from lib/mods.js SLOT_PAGES via hasSlotPage() - the SAME list the resolver
    // in app/mods/[slot]/page.js matches against - so this can never advertise a
    // URL the route 404s. That matters here: Generator is deliberately withheld
    // (thin + stale data, see lib/mods.js), and a hardcoded list here would
    // happily publish /mods/generator.
    //   NOTE: /mods/[slot] (entity reference) is DISTINCT from /guides/mods (the
    //   "mods" guide category) - same split as /maps vs /guides/maps.
    try {
      const { data: modRows, error: modsErr } = await supabase
        .from('mod_stats')
        .select('name, slot_type, updated_at')
        .eq('game_slug', 'marathon');

      console.log('[sitemap] mod_stats:',
        modRows ? modRows.length + ' rows' : 'null',
        modsErr ? 'error: ' + modsErr.message : '');

      hubLastMod.mods = maxUpdatedAt(modRows);
      if (modRows && modRows.length > 0) {
        const bySlot = {};
        for (const m of normalizeModRows(modRows)) {
          if (!hasSlotPage(m.slot_type)) continue;
          (bySlot[m.slot_type] = bySlot[m.slot_type] || []).push(m);
        }
        modSlotPages = Object.keys(bySlot).map((slot) => {
          const newest = newestUpdatedAt(bySlot[slot]);
          return {
            url: baseUrl + '/mods/' + slotToSlug(slot),
            lastModified: newest ? new Date(newest) : new Date(),
            changeFrequency: 'weekly',
            priority: 0.8,
          };
        });
      }
    } catch (err) {
      console.error('[sitemap] mod slot fetch threw:', err);
    }

    // Matchup per-shell pages (/matchups/[shell], added July 17 2026). The shell
    // list comes from lib/matchups.js SHELLS -- the SAME allowlist the resolver
    // in app/matchups/[shell]/page.js matches against -- so this can never
    // advertise a URL the route 404s. lastModified from shell_stats.updated_at
    // (game_slug='marathon', matching the pages' own filter), falling back to now
    // only when a row is missing.
    try {
      const { data: matchupRows, error: matchupErr } = await supabase
        .from('shell_stats')
        .select('name, updated_at')
        .eq('game_slug', 'marathon');

      console.log('[sitemap] matchups shell_stats:',
        matchupRows ? matchupRows.length + ' rows' : 'null',
        matchupErr ? 'error: ' + matchupErr.message : '');

      const updatedByName = {};
      (matchupRows || []).forEach((r) => { updatedByName[r.name] = r.updated_at; });

      matchupPages = MATCHUP_SHELLS.map((name) => {
        const u = updatedByName[name];
        return {
          url: baseUrl + '/matchups/' + matchupSlug(name),
          lastModified: u ? new Date(u) : new Date(),
          changeFrequency: 'weekly',
          priority: 0.8,
        };
      });
    } catch (err) {
      console.error('[sitemap] matchup fetch threw:', err);
    }

    // Article URLs from feed_items
    try {
      // No row cap: the sitemap = ALL published, indexable (non-noindex)
      // articles, defined by a rule, not a magic count. PostgREST caps a single
      // response at 1000 rows (a high .limit() does NOT override the server
      // max-rows), so we PAGE through every row. Sitemap protocol allows 50k
      // URLs/file; the corpus is ~1.3k -> well within limits.
      let data = [];
      let feedErr = null;
      let pageFrom = 0;
      while (true) {
        const { data: batch, error: batchErr } = await supabase
          .from('feed_items')
          .select('slug, created_at, tags')
          .eq('is_published', true)
          // DMZ migration (step 3, batch C1): emit ONLY Marathon slugs at the
          // unprefixed /intel/<slug> paths. Without this, once DMZ rows exist the
          // sitemap would advertise DMZ slugs at Marathon URLs -- wrong hierarchy
          // for the single-domain SEO strategy. DMZ URL emission (/dmz/...) is a
          // Step-4 item: build it when the /dmz route group + DMZ content exist.
          .eq('game_slug', 'marathon')
          // SEO prune: keep de-indexed articles out of the sitemap (no mixed
          // signal). The rows stay; only their search visibility is removed.
          .eq('noindex', false)
          .order('created_at', { ascending: false })
          .range(pageFrom, pageFrom + 999);
        if (batchErr) { feedErr = batchErr; break; }
        data = data.concat(batch || []);
        if (!batch || batch.length < 1000) break;
        pageFrom += 1000;
      }

      console.log('[sitemap] feed_items:',
        data ? data.length + ' rows' : 'null',
        feedErr ? 'error: ' + feedErr.message : '');

      if (data) {
        dynamicPages = data.map((item) => ({
          url: baseUrl + '/intel/' + item.slug,
          lastModified: toISOWithPTOffset(item.created_at),
          changeFrequency: 'monthly',
          priority: 0.6,
        }));

        // Determine which guide categories have at least 1 article
        const categoriesWithContent = new Set();
        for (const item of data) {
          if (!item.tags) continue;
          for (const tag of item.tags) {
            if (ALL_GUIDE_CATEGORIES.includes(tag)) {
              categoriesWithContent.add(tag);
            }
          }
        }
        activeGuideCategories = ALL_GUIDE_CATEGORIES.filter((slug) =>
          categoriesWithContent.has(slug)
        );

        console.log('[sitemap] active guide categories:',
          activeGuideCategories.length + ' of ' + ALL_GUIDE_CATEGORIES.length,
          '(' + activeGuideCategories.join(', ') + ')');
      }
    } catch (err) {
      console.error('[sitemap] feed_items fetch threw:', err);
    }

    // DMZ article URLs (decoupled indexable emission). Only fetched/emitted when
    // dmz.indexable. Mirrors the DMZ homepage/section filter (game_slug='dmz',
    // is_published=true). Each row resolves its section via DMZ_ARTICLE_SECTION;
    // a slug NOT in that map is SKIPPED (fail-safe: unmapped = never a 404 URL in
    // the sitemap). Only ~3 DMZ rows today; PostgREST caps a response at 1000 rows
    // -- add pagination (see the feed_items loop above) if DMZ ever exceeds that.
    if (dmz.indexable) {
      try {
        const { data: dmzRows, error: dmzErr } = await supabase
          .from('feed_items')
          .select('slug, created_at, tags')
          .eq('game_slug', 'dmz')
          .eq('is_published', true)
          .order('created_at', { ascending: false });

        console.log('[sitemap] dmz feed_items:',
          dmzRows ? dmzRows.length + ' rows' : 'null',
          dmzErr ? 'error: ' + dmzErr.message : '');

        if (dmzRows) {
          // Resolve each row's section: curated news maps by slug, VANTAGE
          // discourse maps by the 'discourse' tag (dmzSectionForArticle). Rows that
          // resolve to no section are SKIPPED (fail-safe: never a 404 URL).
          dmzArticlePages = dmzRows
            .map((r) => ({ r: r, section: dmzSectionForArticle(r) }))
            .filter((x) => x.section)
            .map((x) => ({
              url: baseUrl + '/dmz/' + x.section + '/' + x.r.slug,
              lastModified: toISOWithPTOffset(x.r.created_at),
              changeFrequency: 'monthly',
              priority: 0.6,
            }));
        }
      } catch (err) {
        console.error('[sitemap] dmz feed fetch threw:', err);
      }

      // DMZ ENTITY VERTICALS (keys / missions / items). Shared list from
      // lib/dmz/entities.js so the sitemap cannot advertise a vertical route that
      // does not exist (the lib/shellGuides.js precedent). A HUB is emitted only
      // when it has >=1 row -- matching its row-count noindex gate and the
      // sitemap's own doctrine (exclude empty/thin pages; see the file header).
      // DETAIL URLs come straight from the tables. Empty tables emit nothing,
      // which is correct pre-launch.
      try {
        for (const entityKey of DMZ_ENTITY_KEYS) {
          const entity = DMZ_ENTITIES[entityKey];
          const rows = await fetchDmzSlugs(entity);
          if (!rows || rows.length === 0) continue; // no rows -> no hub, no details
          // HUB: emitted when >=1 row exists (matches its row-count index gate).
          // Dated from the VERIFIED rows -- the same set the detail URLs below are
          // built from, so the hub reports the newest child it actually advertises.
          // No max -> no lastmod, never a build timestamp.
          //
          // DORMANT TODAY (2026-07-21): every DMZ entity table is empty pre-launch,
          // so this loop `continue`s above and no hub is emitted. Fixed now anyway,
          // beside the entity-hub fix that established the pattern, so the
          // build-timestamp bug is not left waiting to appear when DMZ fills.
          const dmzHubMax = maxUpdatedAt(rows.filter((r) => r.verified === true));
          const dmzHubEntry = { url: baseUrl + entity.routeBase, changeFrequency: 'daily', priority: 0.85 };
          if (dmzHubMax) dmzHubEntry.lastModified = new Date(dmzHubMax);
          dmzEntityPages.push(dmzHubEntry);
          // DETAIL: VERIFIED rows only. An unverified row's page is noindex, and a
          // sitemap must not advertise a noindex URL (the same reason empty hubs and
          // empty guide categories are excluded -- see the file header).
          rows.filter((r) => r.verified === true).forEach((r) => {
            dmzEntityPages.push({
              url: baseUrl + entity.routeBase + '/' + r.slug,
              lastModified: r.updated_at ? new Date(r.updated_at) : new Date(),
              changeFrequency: 'weekly',
              priority: 0.7,
            });
          });
        }
        console.log('[sitemap] dmz entity pages:', dmzEntityPages.length);
      } catch (err) {
        console.error('[sitemap] dmz entity fetch threw:', err);
      }
    }
  } catch (err) {
    console.error('[sitemap] Supabase init failed at build time, using static fallback:', err);
  }

  // Only include guide category pages with confirmed content.
  // If we couldn't query (build time), include nothing here.
  const guideCategoryPages = activeGuideCategories.map((slug) => ({
    url: baseUrl + '/guides/' + slug,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.65,
  }));

  // ── (d) ENTITY HUBS -- dated from the rows they index ────────────────────
  // Emitted HERE, after the DB reads, because a hub's honest lastmod is the
  // newest of its children and that is not known until the queries return.
  //
  // NO BUILD-TIME FALLBACK, deliberately: when a hub has no max (query failed or
  // zero rows) the entry OMITS lastmod entirely. next/sitemap's truthiness guard
  // then emits no <lastmod> element. Falling back to `new Date()` is the exact
  // bug being removed -- a failed query must not be reported as fresh content.
  //
  // priority/changeFrequency preserved verbatim from the static array they left.
  // /mods is the ENTITY REFERENCE hub (app/mods/page.js), DISTINCT from the
  // /guides/mods CATEGORY -- same split as /maps vs /guides/maps; do not conflate.
  const HUBS = [
    ['/shells',  hubLastMod.shells,  'daily',  0.85],
    ['/weapons', hubLastMod.weapons, 'daily',  0.85],
    ['/mods',    hubLastMod.mods,    'weekly', 0.85],
    ['/uniques', hubLastMod.uniques, 'weekly', 0.85],
    ['/maps',    hubLastMod.maps,    'weekly', 0.85],
  ];
  const hubPages = HUBS.map(([route, max, cf, pr]) => {
    const entry = { url: baseUrl + route, changeFrequency: cf, priority: pr };
    if (max) entry.lastModified = new Date(max);
    return entry;
  });
  console.log('[sitemap] hub lastmod:', JSON.stringify(hubLastMod));

  const shellPages = dbShellPages.length > 0 ? dbShellPages : fallbackShellPages;

  // DMZ network section, gated on dmz.indexable (SEO exposure) -- NOT dmz.launched.
  // While indexable is false, emit NOTHING (pre-launch thin content, noindex via
  // app/dmz/layout.js) so the sitemap never advertises thin URLs. When indexable is
  // true, emit the /dmz hub, the section pages, AND the article URLs (fetched above,
  // each mapped to its section via DMZ_ARTICLE_SECTION -- the /dmz/[section]/[slug]
  // detail route exists now), in lock-step with robots becoming indexable.
  const dmzPages = dmz.indexable
    ? [
        { url: baseUrl + '/dmz', lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
        ...dmz.sections.map((sec) => ({
          url: baseUrl + '/dmz/' + sec.slug,
          lastModified: new Date(),
          changeFrequency: 'weekly',
          priority: 0.8,
        })),
        ...dmzArticlePages,
        ...dmzEntityPages,
      ]
    : [];

  console.log('[sitemap] final counts:',
    'static=' + staticPages.length,
    'guides=' + guideCategoryPages.length,
    'shells=' + shellPages.length,
    'weapons=' + weaponPages.length,
    'maps=' + mapPages.length,
    'modSlots=' + modSlotPages.length,
    'matchups=' + matchupPages.length,
    'dmz=' + dmzPages.length,
    'dynamic=' + dynamicPages.length);

  return [...staticPages, ...hubPages, ...guideCategoryPages, ...shellPages, ...weaponPages, ...uniquePages, ...mapPages, ...modSlotPages, ...matchupPages, ...dmzPages, ...dynamicPages];
}