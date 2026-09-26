// lib/hubExplainers.js
// "All <Game> coverage" hub list (Change B): a direct hub -> article link for every published,
// indexable article in a game, so each evergreen article gets a depth-1 incoming link from its game
// hub. Complements the article-page Related reading (lib/relatedArticles.js). NON-MARATHON only --
// Marathon has its own hub/templates and MUST NOT import this.
//
// selectExplainers() is PURE (node-testable); fetchHubExplainers() is the thin, non-throwing IO
// wrapper. GAME-AGNOSTIC: no per-game branching. The caller (each hub) attaches the DERIVED section +
// built href (via the game's own *SectionForArticle, same mechanism as Change A), builds the neutral
// heading from the game config's displayName, and passes its FAQ hrefs as excludeHrefs. The lib never
// imports a game deriver and never hardcodes a game string.

const DEFAULT_CAP = 30;

// Linkable + indexable + not the current-excluded set. Requires a derived section + built href
// (caller drops null-section rows by leaving href null). Re-checks published/noindex/rejected as
// defense in depth even though the query filters them.
function isEligible(a) {
  if (!a || !a.slug || !a.href || !a.section) return false;
  if (a.is_published !== true) return false;
  if (a.noindex === true) return false;
  if (a.rejected === true) return false;
  return true;
}
function ascByCreated(a, b) { return (Date.parse(a && a.created_at) || 0) - (Date.parse(b && b.created_at) || 0); }

// selectExplainers(articles, { cap, excludeHrefs, gameSlug }) -> ordered rows, PURE.
//   - eligibility filter + dedupe by href; drop any href in excludeHrefs (hub passes its FAQ hrefs
//     so the same article is not linked twice on one page)
//   - cap (default 30): when the pool exceeds cap, keep the OLDEST `cap` and drop the newest, so
//     foundational evergreen pieces are never pushed off as news accumulates; console.warn once
//   - order: grouped by section (sections ordered by their OLDEST article asc), created_at ASC within
export function selectExplainers(articles, opts) {
  const cap = opts && Number.isFinite(opts.cap) ? opts.cap : DEFAULT_CAP;
  const exclude = new Set(opts && Array.isArray(opts.excludeHrefs) ? opts.excludeHrefs : []);
  const gameSlug = (opts && opts.gameSlug) || '';

  const seen = new Set();
  let pool = [];
  for (const a of Array.isArray(articles) ? articles : []) {
    if (!isEligible(a) || exclude.has(a.href) || seen.has(a.href)) continue;
    seen.add(a.href);
    pool.push(a);
  }

  if (pool.length > cap) {
    console.warn('[hubExplainers] ' + gameSlug + ' truncated ' + pool.length + ' -> ' + cap);
    pool = pool.slice().sort(ascByCreated).slice(0, cap); // keep the OLDEST cap, drop the newest
  }

  const bySection = new Map();
  for (const a of pool) {
    if (!bySection.has(a.section)) bySection.set(a.section, []);
    bySection.get(a.section).push(a);
  }
  const sectionsOldestFirst = [...bySection.keys()].sort((s1, s2) => {
    const oldest = (s) => bySection.get(s).reduce((m, x) => Math.min(m, Date.parse(x.created_at) || Infinity), Infinity);
    return oldest(s1) - oldest(s2);
  });

  const out = [];
  for (const s of sectionsOldestFirst) {
    for (const a of bySection.get(s).slice().sort(ascByCreated)) out.push(a);
  }
  return out;
}

// fetchHubExplainers(supabase, gameSlug) -> bounded raw feed_items rows. NON-ESSENTIAL: on any error
// it logs [hubExplainers] <game> <message> and returns [] so the hub still renders (deliberate
// exception to the loud-failure read pattern). The caller attaches section + href before ranking.
export async function fetchHubExplainers(supabase, gameSlug) {
  try {
    const res = await supabase
      .from('feed_items')
      .select('id, slug, headline, created_at, is_published, noindex, rejected')
      .eq('game_slug', gameSlug)
      .eq('is_published', true)
      .eq('noindex', false)
      .not('rejected', 'is', true)
      .order('created_at', { ascending: false })
      .limit(200);
    if (res.error) { console.error('[hubExplainers] ' + gameSlug + ' ' + res.error.message); return []; }
    return Array.isArray(res.data) ? res.data : [];
  } catch (err) {
    console.error('[hubExplainers] ' + gameSlug + ' ' + (err && err.message ? err.message : String(err)));
    return [];
  }
}
