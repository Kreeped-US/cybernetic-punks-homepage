// lib/games/sectionArticles.js
// SHARED, game-agnostic section membership for the network games (wardogs, dmz, pubg-dednet, bodycam).
// Every surface that groups, COUNTS, FILTERS or LISTS articles by section -- hub counts, section-page
// lists, the sectionHasContent indexability predicate, the sitemap section-hub gate -- goes through here,
// and therefore through the SAME resolver the detail route and the sitemap article emitter use
// (sectionForArticle(gameSlug, row) -> resolveArticleSection). Before 2026-10-02 these surfaces grouped by
// the static *_ARTICLE_SECTION map directly, so an article routed by the section FALLBACK (unmapped slug ->
// editorial.defaultArticleSection) had a live URL + sitemap entry but was invisible to its section's list
// and count -- and a section whose only articles arrived via the fallback would noindex itself.
//
// ELIGIBILITY (one rule, everywhere): is_published = true AND noindex = false AND rejected IS NOT TRUE,
// scoped to ONE game_slug (the cross-game guard -- a foreign row is never fetched, so never counted).
//
// SHAPE: a light per-game INDEX (slug + tags + created_at, newest first) is resolved in JS; a section list
// then fetches full columns only for that section's newest `limit` slugs. Read errors THROW (dataOrThrow:
// the loud-failure pattern the section pages already use); callers that historically fail-soft (hubs)
// wrap the call themselves. `client` is a TEST SEAM; production passes nothing and gets the real proxy.

import { supabase } from '../supabase.js';
import { dataOrThrow } from '../data/dataOrThrow.js';
import { sectionForArticle } from './articleSection.js';

// Upper bound on the per-game index read (PostgREST max-rows is commonly 1000). Today's largest game has
// ~15 eligible rows; hitting the cap logs a warning so a silent truncation can never hide.
export var INDEX_CAP = 1000;

// Pure eligibility re-check (defense in depth; the query already filters these).
export function isEligibleArticle(r) {
  return !!(r && r.slug && r.is_published === true && r.noindex !== true && r.rejected !== true);
}

// PURE: the eligible slugs that resolve to `sectionSlug`, in the input order (newest first from the index).
export function slugsInSection(gameSlug, sectionSlug, rows) {
  return (Array.isArray(rows) ? rows : [])
    .filter(function (r) { return isEligibleArticle(r) && sectionForArticle(gameSlug, r) === sectionSlug; })
    .map(function (r) { return r.slug; });
}

// PURE: { sectionSlug: count } over the eligible rows (rows resolving to null are not counted).
export function countsBySection(gameSlug, rows) {
  var out = {};
  (Array.isArray(rows) ? rows : []).forEach(function (r) {
    if (!isEligibleArticle(r)) return;
    var s = sectionForArticle(gameSlug, r);
    if (s) out[s] = (out[s] || 0) + 1;
  });
  return out;
}

function eligibleQuery(db, gameSlug, columns) {
  return db.from('feed_items').select(columns)
    .eq('game_slug', gameSlug).eq('is_published', true).eq('noindex', false)
    .not('rejected', 'is', true);
}

// IO: the game's eligible article index, newest first. THROWS on a read error.
export async function fetchArticleIndex(gameSlug, client) {
  var db = client || supabase;
  var res = await eligibleQuery(db, gameSlug, 'slug, tags, created_at, is_published, noindex, rejected')
    .order('created_at', { ascending: false })
    .range(0, INDEX_CAP - 1);
  var rows = dataOrThrow(res, gameSlug + ' article index', []);
  if (rows.length >= INDEX_CAP) console.warn('[sectionArticles] ' + gameSlug + ' index hit INDEX_CAP=' + INDEX_CAP + ' -- counts may be truncated');
  return rows;
}

// IO: { sectionSlug: count } for the game (hub coverage counts). THROWS on a read error.
export async function sectionCounts(gameSlug, client) {
  return countsBySection(gameSlug, await fetchArticleIndex(gameSlug, client));
}

// IO: the generic indexability predicate. A 'data' section is a coming-soon shell (false, no DB read);
// an 'editor' section has content iff >= 1 eligible article RESOLVES to it. THROWS on a read error.
export async function sectionHasArticles(gameSlug, section, client) {
  if (!section || section.source !== 'editor') return false;
  var rows = await fetchArticleIndex(gameSlug, client);
  return slugsInSection(gameSlug, section.slug, rows).length > 0;
}

// IO: the section's article list -- full `columns` for its newest `limit` resolved slugs, newest first.
// THROWS on a read error; a genuine zero returns [] (caller renders its empty state).
export async function loadSectionArticles(gameSlug, sectionSlug, opts) {
  var o = opts || {};
  var db = o.client || supabase;
  var limit = Number.isFinite(o.limit) ? o.limit : 30;
  var columns = o.columns || 'id, headline, slug, editor, tags, body, source_url, created_at';
  var slugs = slugsInSection(gameSlug, sectionSlug, await fetchArticleIndex(gameSlug, db)).slice(0, limit);
  if (slugs.length === 0) return [];
  var res = await eligibleQuery(db, gameSlug, columns)
    .in('slug', slugs)
    .order('created_at', { ascending: false })
    .limit(limit);
  return dataOrThrow(res, gameSlug + ' section ' + sectionSlug, []);
}
