// lib/relatedLinks.js
// Tag-driven "Related" links for the lib/dmz/articleContent article path -- wardogs / dmz /
// pubg-dednet ONLY. Marathon uses lib/articleBody (app/marathon/intel) and MUST NOT import this.
// PURE, no I/O.
//
// Maps an article's tags to LIVE tool/hub routes. Each game's config is in DETERMINISTIC render
// order; an entry is included when it is the game's `primary` tool OR any of its `tags` appears on
// the article (tags compared lowercased/trimmed). Deduped by href, capped at MAX. Unmapped tags are
// ignored. A game with no primary tool and no matched tags yields [] -> the caller renders NOTHING
// (never an empty block). Only routes verified live (200) are listed here.

const MAX = 4;

const GAME_RELATED = {
  wardogs: [
    { href: '/wardogs/loadouts', label: 'Loadout Finder', primary: true },
    { href: '/wardogs/tier-list', label: 'Weapon tier list', tags: ['weapons', 'weapon', 'armory'] },
    { href: '/wardogs/arsenal', label: 'Weapon arsenal', tags: ['weapons', 'weapon', 'armory'] },
    { href: '/wardogs/economy', label: 'Economy & unlocks', tags: ['economy', 'cash economy', 'monetization', 'gold market', 'gold exchange', 'black market', 'progression', 'cosmetics'] },
    { href: '/wardogs/economy/launch-stats', label: 'Launch stats', tags: ['sales', 'player-count', 'launch', 'season 1', 'season-1', 'steam'] },
  ],
  dmz: [
    { href: '/dmz/builds', label: 'Weapon builds', primary: true },
    { href: '/dmz/missions', label: 'Missions', tags: ['missions', 'story missions', 'side ops', 'dynamic operations'] },
    { href: '/dmz/pois', label: 'Points of interest', tags: ['hajin', 'exclusion zone', 'map'] },
    { href: '/dmz/items', label: 'Items', tags: ['crafting', '3d printer'] },
    { href: '/dmz/keys', label: 'Keys', tags: ['keys'] },
  ],
  // pubg-dednet has NO live tool/hub routes yet (only the game hub + section article-lists), so it
  // has no config -> pubg articles render no Related block today. Add a game here when it ships tools.
};

// relatedLinksFor(gameSlug, tags) -> [{ href, label }] (0..MAX, deduped, deterministic order).
export function relatedLinksFor(gameSlug, tags) {
  const cfg = GAME_RELATED[gameSlug];
  if (!cfg) return [];
  const set = new Set(
    (Array.isArray(tags) ? tags : [])
      .map((t) => String(t || '').toLowerCase().trim())
      .filter(Boolean)
  );
  const out = [];
  const seen = new Set();
  for (const e of cfg) {
    if (out.length >= MAX) break;
    const match = e.primary === true || (Array.isArray(e.tags) && e.tags.some((t) => set.has(t)));
    if (!match || seen.has(e.href)) continue;
    seen.add(e.href);
    out.push({ href: e.href, label: e.label });
  }
  return out;
}
