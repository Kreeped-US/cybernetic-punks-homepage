// lib/seo/deadIntel.js
// Shared SEO constants for the dead-article 410 mechanism (proxy.js, Fix #1 + the
// all-games extension).
//
// ARTICLE_SECTIONS maps each game to the set of its EDITOR (feed_items-backed) section
// slugs -- the ONLY sections under which a /<game>/<section>/<slug> URL is an article,
// so the ONLY sections where a not-a-live-article slug should 410. This deliberately
// EXCLUDES: data sections (dmz 'printer', wardogs/pubg 'arsenal' -- source!=='editor',
// structured data not in feed_items), entity routes that share the /<game>/x/y shape
// (dmz builds/items/keys/missions/pois), and tool routes (wardogs loadouts/tier-list/
// economy-hub subtree). Because proxy.js only 410s when parts[1] is in this set AND the
// slug is confirmed not-live, none of those live non-article pages can ever be 410'd.
//
// SINGLE SOURCE OF TRUTH: these MUST equal `sections.filter(s => s.source === 'editor')`
// for each game config (lib/games/*). lib/seo/deadIntel.test.mjs imports the real configs
// and asserts the match, so adding/removing an editor section without updating this map
// fails the test loudly. (marathon has no lib/games config with a `sections` array; its
// one article section is 'intel', asserted against app/marathon/intel/[slug] existing.)
export const ARTICLE_SECTIONS = {
  marathon: new Set(['intel']),
  dmz: new Set(['field-intel', 'meta', 'loadouts', 'fob', 'regions', 'discourse']),
  wardogs: new Set(['field-intel', 'economy', 'systems']),
  'pubg-dednet': new Set(['field-intel', 'systems', 'world']),
};
//
// MARATHON_INTEL_KEEPER_SOURCES is the set of /marathon/intel/<slug> paths that are
// REDIRECT SOURCES in next.config.mjs -- retired articles that 301 to a keeper
// (entity page or surviving article). proxy.js MUST NOT 410 these: they carry a
// deliberate 301 that transfers their authority to the keeper. Whichever way the
// next.config-redirect vs proxy evaluation order falls, this skip set guarantees a
// keeper source is never 410'd -- it is either 301'd by next.config or skipped here
// and left to fall through to that 301. (Verified: a keeper source resolves 301 to its
// keeper, not 410 -- see the branch test report.)
//
// SINGLE SOURCE OF TRUTH: these MUST stay in sync with the `source: '/marathon/intel/...'`
// redirect rules in next.config.mjs. lib/seo/deadIntel.test.mjs parses next.config.mjs
// and asserts this set is exactly its /marathon/intel redirect sources -- so adding a
// consolidation redirect without updating this list fails the test loudly (which would
// otherwise let proxy.js 410 a slug next.config means to 301 to a keeper).
export const MARATHON_INTEL_KEEPER_SOURCES = new Set([
  'marathon-destroyer-shell-guide-squad-ranked-dominance-e338',
  'marathon-season-2-weapon-mod-priority-what-new-runners-should-chase-fi-ujjt',
  'marathon-assassin-counter-guide-how-to-beat-it-in-ranked-solo-mvdf',
  'marathon-triage-shell-guide-keep-your-squad-alive-in-s2-ydjg',
  'marathon-recon-shell-guide-map-control-and-squad-intel-rd86',
  'marathon-sentinel-shell-the-underrated-pick-rising-in-s2-3q4a',
  'marathon-sentinel-shell-the-underrated-squad-pick-rising-e5a4',
  'marathon-update-1051-thief-exploit-fix-cryo-archive-improvements-mfp1',
  'marathon-update-1051-fixed-thief-exploits-and-cryo-archive-improvement-nx0w',
  'budget-destroyer-low-cost-builds-that-still-force-holotag-kills-xycn',
  'vandal-vs-destroyer-which-shell-wins-more-ranked-games-5y1t',
  'sentinel-hype-fractures-community-season-2-bubble-shell-speculation-dr-9odj',
  'ares-rg-anti-one-shot-build-post-1062-railgun-counter-theory-zzln',
]);

// Editor lane slugs -- static, no DB row, never dead. Consumed by proxy.js
// (kept here so the doctrine + tests reference one canonical list).
export const MARATHON_INTEL_EDITOR_LANES = new Set([
  'cipher', 'nexus', 'dexter', 'ghost', 'miranda',
]);

// RESERVED literal routes that live UNDER an editor section but are NOT articles -- real pages
// (their own app/ folders), so proxy.js must NEVER 410 them. game -> section -> first slug segment.
// The 'economy' section is overloaded: it is an editor section (its articles render at
// /wardogs/economy/<slug>) AND a literal route tree (/wardogs/economy hub, /economy/mine tool,
// /economy/stat/<key> share carrier). Without this, /wardogs/economy/mine (3 segments, section=
// economy, slug=mine, not a live article) would be wrongly 410'd as a dead economy article.
export const RESERVED_SECTION_SLUGS = {
  wardogs: { economy: new Set(['mine', 'stat', 'launch-stats']) },
};
