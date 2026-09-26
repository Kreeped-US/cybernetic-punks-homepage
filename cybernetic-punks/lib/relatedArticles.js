// lib/relatedArticles.js
// "Related reading" sibling-article picks for the NON-MARATHON article templates (wardogs / dmz /
// pubg-dednet). Marathon uses its own article path (lib/articleBody, app/marathon/intel) and MUST
// NOT import this. Purpose: give evergreen articles reciprocal internal links (Ahrefs 2026-09-25:
// 14 non-Marathon articles had a single dofollow incoming link).
//
// Split: rankRelated() is PURE (no IO, node-testable); fetchRelatedArticles() is the thin Supabase
// wrapper. GAME-AGNOSTIC -- there is NO per-game branching here: the caller passes gameSlug (for the
// query) and, because an article's SECTION is DERIVED per game (not a column), the caller attaches
// each candidate's `section` (via that game's own *SectionForArticle) before ranking, so the pure
// ranker treats `section` as an ordinary field and the same-section fallback works for every game.

const DEFAULT_MAX = 5;
const MIN_RELEVANT = 3; // below this many tag-overlap matches, pad with recency-ordered fallbacks

// Lowercased/trimmed unique tag set (defensive against non-array / null / non-string tags).
function tagSet(tags) {
  const out = new Set();
  if (Array.isArray(tags)) {
    for (const t of tags) {
      const s = String(t == null ? '' : t).toLowerCase().trim();
      if (s) out.add(s);
    }
  }
  return out;
}

// How many of a candidate's (deduped, case-insensitive) tags appear in the current article's tag set.
function overlapCount(currentSet, tags) {
  let n = 0;
  const seen = new Set();
  if (Array.isArray(tags)) {
    for (const t of tags) {
      const s = String(t == null ? '' : t).toLowerCase().trim();
      if (s && !seen.has(s)) { seen.add(s); if (currentSet.has(s)) n++; }
    }
  }
  return n;
}

// A candidate is eligible only if it is a real, indexable, published, non-rejected OTHER article.
// Defense in depth: the query already filters published/noindex/rejected, but rankRelated re-checks
// so it is correct on any candidate list (tests, or a future caller that passes a looser set).
function isEligible(c, current) {
  if (!c || !c.slug) return false;
  if (c.is_published !== true) return false;
  if (c.noindex === true) return false;
  if (c.rejected === true) return false;
  if (current) {
    if (c.id != null && current.id != null && c.id === current.id) return false; // exclude self by id
    if (c.slug === current.slug) return false;                                    // ...and by slug
  }
  return true;
}

// created_at DESC (newest first); unparseable/absent dates sort last.
function recencyDesc(a, b) {
  const ta = Date.parse(a && a.created_at) || 0;
  const tb = Date.parse(b && b.created_at) || 0;
  return tb - ta;
}

// rankRelated(current, candidates, { max }) -> ranked article rows (no duplicates), PURE.
//   1. tag-overlap matches, overlap count DESC then created_at DESC;
//   2. if there are FEWER THAN 3 tag-overlap matches, pad by recency -- same-section siblings first,
//      then same-game any-section -- until `max` or the pool is exhausted;
//   3. cap at max (default 5); never return the current article or a duplicate.
export function rankRelated(current, candidates, opts) {
  const max = opts && Number.isFinite(opts.max) ? opts.max : DEFAULT_MAX;
  current = current || {};
  const pool = (Array.isArray(candidates) ? candidates : []).filter((c) => isEligible(c, current));
  const currentTags = tagSet(current.tags);

  const withOverlap = pool
    .map((c) => ({ c, ov: overlapCount(currentTags, c.tags) }))
    .filter((x) => x.ov > 0)
    .sort((a, b) => (b.ov - a.ov) || recencyDesc(a.c, b.c))
    .map((x) => x.c);

  const result = [];
  const seen = new Set(); // keyed by slug (stable across candidates missing an id)
  const take = (c) => {
    if (result.length >= max || seen.has(c.slug)) return;
    seen.add(c.slug);
    result.push(c);
  };

  for (const c of withOverlap) take(c);

  // Fallback ONLY when tag-overlap matches are sparse (< MIN_RELEVANT). Same-section requires the
  // caller to have attached `section`; when absent (== null) that tier is simply skipped -> same-game.
  if (withOverlap.length < MIN_RELEVANT && result.length < max) {
    if (current.section != null) {
      for (const c of pool.filter((c) => !seen.has(c.slug) && c.section === current.section).sort(recencyDesc)) take(c);
    }
    for (const c of pool.filter((c) => !seen.has(c.slug)).sort(recencyDesc)) take(c);
  }

  return result.slice(0, max);
}

// fetchRelatedArticles(supabase, gameSlug, current) -> bounded candidate pool (raw feed_items rows).
// Selects only what ranking + the caller's URL build needs (section is DERIVED by the caller, so it
// is not selected). NON-ESSENTIAL block: on any error we log a tagged line and return [] so the
// article page still renders -- a deliberate exception to the loud-failure read pattern.
export async function fetchRelatedArticles(supabase, gameSlug, current) {
  try {
    let q = supabase
      .from('feed_items')
      .select('id, slug, headline, tags, created_at, is_published, noindex, rejected')
      .eq('game_slug', gameSlug)
      .eq('is_published', true)
      .eq('noindex', false)
      .not('rejected', 'is', true)
      .order('created_at', { ascending: false })
      .limit(60);
    if (current && current.id != null) q = q.neq('id', current.id);
    const res = await q;
    if (res.error) {
      console.error('[relatedArticles] ' + gameSlug + ' query failed: ' + res.error.message);
      return [];
    }
    return Array.isArray(res.data) ? res.data : [];
  } catch (err) {
    console.error('[relatedArticles] ' + gameSlug + ' threw: ' + (err && err.message ? err.message : String(err)));
    return [];
  }
}
