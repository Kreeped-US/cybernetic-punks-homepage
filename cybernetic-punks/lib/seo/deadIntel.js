// lib/seo/deadIntel.js
// Shared SEO constant for the dead-intel 410 mechanism (proxy.js, Fix #1).
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
