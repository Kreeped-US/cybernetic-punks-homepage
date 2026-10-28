// app/dmz/page.js
// DMZ landing -- the per-game hub (Brief 192 redesign). Top to bottom: ticker + hero with the "On file today"
// counters, then numbered sections built from existing data and config only (lib/dmz/hubData.js): 01 the short
// version (dmz.confirmedFacts), 02 weapons by class, 03 Boss Board, 04 Hajin and keys, 05 printer and bounties,
// 06 latest DMZ News, then "Not covered yet" and "How the intel is made", then the kept blocks (Early Access
// note, naming line, vs Warzone, coming back, FAQ, Sources) with their text and links unchanged.
//
// No new facts and no hard-coded counts: every number comes from a read or from config. A failed read omits its
// counter or block (never a 0). Links to routes that can be empty go through gatedHref (lib/games/linkGate.js).
// The Boss Board reward figures are NOT shown here: one pointer sentence to /dmz/bosses, no figure.
//
// Server component + Supabase reads -> force-dynamic. Reads via the lazy anon Proxy (no module-scope createClient).
//
// ROBOTS: gated in app/dmz/layout.js on dmz.indexable (index vs noindex,follow).
// This page sets NO robots of its own -> inherits that gate. (Do not add robots.)

import Link from 'next/link';
import { Exo_2 } from 'next/font/google';
import { supabase } from '@/lib/supabase';
import { dmz, dmzSectionForArticle } from '@/lib/games/dmz';
import { countsBySection } from '@/lib/games/sectionArticles';
import { fetchDmzArticleIndex } from '@/lib/dmz/routeContentData';
import { getDmzEntity, fetchDmzSlugs, fetchDmzRows, visiblePoiRows, DMZ_ENTITIES } from '@/lib/dmz/entities';
import { fetchIndexableBuildEntries } from '@/lib/dmz/weaponBuilds';
import { fetchDmzWeapons, fetchDmzWeaponClassNames } from '@/lib/dmz/weaponsData';
import { WEAPONS_HUB } from '@/lib/dmz/weapons';
import { dmzRouteContent } from '@/lib/dmz/routeContent';
import { gatedHref } from '@/lib/games/linkGate';
import { launchDateLong } from '@/lib/network/gameStatus';
import { dmzHubCopy, DMZ_META_DESC, HUB_SOURCES, sourceSegments } from '@/lib/dmz/hubCopy';
import { buildHeroProps } from '@/lib/games/heroModel';
import { DOSSIERS, BOSS_IMAGE, LT_SEEN, DESC as BOSSES_DESC, bossImageSet, bossImageAlt } from '@/lib/dmz/bosses';
import { FACTS as BOUNTY_FACTS, BOSS_REWARDS_POINTER, counts as bountyCounts } from '@/lib/dmz/bounties';
import { hubCounters, verifiedWeaponCount, weaponClassTiles, poiPreview, keyRarityChips, latestArticles, notCoveredRoutes, coveredRoutes, factsById, lieutenantCard } from '@/lib/dmz/hubData';
import HubSection from '@/components/game/HubSection';
import CutCard from '@/components/game/CutCard';
import StatNumeral from '@/components/game/StatNumeral';
import { HUB_KIT_CSS } from '@/components/game/hubKitCss';
import { safeJsonLd } from '@/lib/security/safeJsonLd';
import { hubJsonLd } from '@/lib/seo/hubJsonLd';
import { fetchHubExplainers, selectExplainers } from '@/lib/hubExplainers';

const exo2 = Exo_2({ subsets: ['latin'], weight: ['400', '600', '700', '800'], variable: '--font-exo2', display: 'swap' });
var EXO = 'var(--font-exo2), system-ui, sans-serif';

export const dynamic = 'force-dynamic';

// openGraph/twitter/keywords are set HERE (not inherited) -- without them the hub
// falls back to the root layout's Marathon-branded og/twitter/keywords. Mirrors the
// article template's override. No openGraph.images: the file-based opengraph-image
// (app/dmz/opengraph-image) already supplies the DMZ og:image.
// TITLE/DESCRIPTION target the live pre-launch demand (keyword research 2026-07-18):
// "dmz 2 release date" 630/mo, "what is dmz in cod" 500/mo, "is dmz coming back"
// 250/mo, "dmz 2026" 170/mo. The old title sold "Extraction Intelligence Hub",
// which has no search volume and omitted the date, the year, and MW4.
//
// "DMZ 2" is deliberately NOT in the title: it is player phrasing, not an official
// name, and a title asserts. The FAQ is where the term is used AND corrected in the
// same breath (see FAQ_LAUNCH_A). Title 50 chars since Brief 185 / description 145 chars (Gate 4:
// <=60 / <=155).
export const metadata = {
  // `absolute` drops the root '%s | Cybernetic Punks' suffix (it would push the title past the SERP limit).
  // Brief 185 (Justin, from Search Console: the hub's queries are "mw4 dmz", "what is dmz", "dmz hajin", none
  // about the release date): the title names what the hub covers today, not the launch date.
  // (openGraph/twitter titles below are set explicitly, not templated -- kept in
  // sync with this metadata title.)
  title: { absolute: 'MW4 DMZ: Hajin Locations, Weapons, Keys & Bounties' },
  description: DMZ_META_DESC,
  keywords: ['DMZ', 'DMZ Modern Warfare 4', 'MW4 DMZ', 'Call of Duty DMZ', 'DMZ extraction zone', 'DMZ Hajin', 'DMZ FOB', 'DMZ crafting', 'DMZ loadouts', 'DMZ guide'],
  alternates: { canonical: 'https://cyberneticpunks.com/dmz' },
  // og/twitter mirror the meta title+description above. They previously carried the
  // old "Extraction Intelligence Hub" positioning, so a search result and the social card
  // carried different messages. Same string, one message.
  openGraph: {
    title: 'MW4 DMZ: Hajin Locations, Weapons, Keys & Bounties',
    description: DMZ_META_DESC,
    url: 'https://cyberneticpunks.com/dmz',
    siteName: 'Cybernetic Punks',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    site: '@Cybernetic87250',
    title: 'MW4 DMZ: Hajin Locations, Weapons, Keys & Bounties',
    description: DMZ_META_DESC,
  },
};

// The eligible DMZ articles (published, noindex=false, not rejected) -> drives REAL per-section
// counts via the shared resolver (lib/games/sectionArticles.js -> dmzSectionForArticle): the slug
// map, the 'discourse' TAG, and the editorial.defaultArticleSection fallback all count in the
// section the article actually renders under (2026-10-02; previously a static-map count plus a
// separate discourse tag count). Fail-soft (hub): a read error -> empty index -> zero counts. Brief 190: the
// read is the per-request cached one the layout's link map also uses (lib/dmz/routeContentData.js).
async function dmzArticleIndex() {
  try {
    return await fetchDmzArticleIndex();
  } catch (err) {
    console.error('[dmz hub] article index failed: ' + (err && err.message ? err.message : String(err)));
    return [];
  }
}

// Brief 192: the hub's reads, in parallel, each fail-soft to null (a block whose read failed is omitted; the
// link gate treats null as 0, so a route we could not count is never linked). Full rows for weapons, POIs and
// keys (the counters, class tiles, POI names and key rarities); slug reads for missions and items; the builds
// rule for builds.
async function dmzHubReads() {
  var readers = {
    weapons: function () { return fetchDmzWeapons(); },
    classNames: function () { return fetchDmzWeaponClassNames(); },
    pois: function () { return fetchDmzRows(getDmzEntity('pois')); },
    keys: function () { return fetchDmzRows(getDmzEntity('keys')); },
    missions: function () { return fetchDmzSlugs(getDmzEntity('missions')); },
    items: function () { return fetchDmzSlugs(getDmzEntity('items')); },
    builds: function () { return fetchIndexableBuildEntries(); },
  };
  var keys = Object.keys(readers);
  var vals = await Promise.all(keys.map(function (k) {
    return Promise.resolve().then(readers[k]).catch(function (err) {
      console.error('[dmz hub] ' + k + ' read failed: ' + (err && err.message ? err.message : String(err)));
      return null;
    });
  }));
  var out = {};
  keys.forEach(function (k, i) { out[k] = vals[i]; });
  return out;
}

function lengthOrZero(rows) { return Array.isArray(rows) ? rows.length : 0; }

// The "Not covered yet" note (Brief 174 wording, shortened): true by construction, since the list holds only the
// gated hub routes whose count is 0 (lib/dmz/hubData.js notCoveredRoutes); a route leaves the list once it has entries.
var NOT_COVERED_NOTE = 'These pages have no entries yet, so they are not linked.';

// An FAQ answer with each named source (see FAQ_SOURCE_PHRASES in lib/dmz/hubCopy.js) rendered as an
// external link to that post. The visible text is exactly the answer string.
function SourcedText({ text, linkStyle }) {
  return sourceSegments(text).map(function (seg, i) {
    return seg.href
      ? <a key={i} href={seg.href} target="_blank" rel="noopener noreferrer" style={linkStyle}>{seg.text}</a>
      : <span key={i}>{seg.text}</span>;
  });
}

// Hub palette (custom properties read by components/game/hubKitCss.js). Text contrast >= 4.5:1 on the card and
// ground colors, 11px labels included.
var HUB_VARS = {
  '--hk-ground': '#080a0d', '--hk-card': '#11151a', '--hk-line': '#2a323b', '--hk-text': '#e8eaed',
  '--hk-soft': '#b4bcc6', '--hk-mute': '#9aa3ad', '--hk-accent': '#ff6a1f', '--hk-accent-text': '#ff9a63', '--hk-ghost': '#3a4450',
};

// DMZ-only layout rules for this page (the shared kit has the cards, numerals and section headers).
var PAGE_CSS = `
.dmzh-ticker{background:#ff6a1f;color:#14100c;font:700 12px/1.4 monospace;letter-spacing:.16em;text-transform:uppercase;padding:9px 16px;overflow:hidden}
.dmzh-ticker ul{list-style:none;margin:0 auto;padding:0;max-width:1160px;display:flex;flex-wrap:wrap;gap:2px 0}
.dmzh-ticker li+li:before{content:" // ";white-space:pre}
.dmzh-hero{position:relative;overflow:hidden;border-bottom:1px solid #1f262d;background:repeating-linear-gradient(0deg,rgba(255,255,255,.025) 0 1px,transparent 1px 44px),repeating-linear-gradient(90deg,rgba(255,255,255,.025) 0 1px,transparent 1px 44px),#0a0d11}
.dmzh-mark{position:absolute;right:-20px;top:-30px;font-size:clamp(160px,30vw,340px);line-height:1;font-weight:900;letter-spacing:-.04em;-webkit-text-stroke:1.5px #2f3944;color:transparent;user-select:none;pointer-events:none;white-space:nowrap}
.dmzh-edge{position:absolute;left:0;top:0;bottom:0;width:6px;background:#ff6a1f}
.dmzh-heroin{position:relative;max-width:1160px;margin:0 auto;padding:56px 16px 48px;display:flex;flex-wrap:wrap;gap:32px;align-items:flex-end;justify-content:space-between}
.dmzh-herol{flex:1 1 480px;min-width:0}
.dmzh-crumb{margin:0 0 14px;color:#ff9a63}
.dmzh-crumb a{color:inherit;text-decoration:none;display:inline-flex;align-items:center;min-height:44px}
.dmzh-h1{margin:0;font-size:clamp(48px,9vw,76px);line-height:.98;font-weight:900;letter-spacing:-.02em;color:#e8eaed}
.dmzh-h1b{margin:4px 0 18px;font-size:clamp(48px,9vw,76px);line-height:.98;font-weight:900;letter-spacing:-.02em;color:#ff9a63}
.dmzh-sub{margin:0 0 24px;font-size:18px;line-height:1.6;color:#b4bcc6;max-width:600px}
.dmzh-ctas{display:flex;flex-wrap:wrap;gap:12px}
.dmzh-cta{display:inline-flex;align-items:center;min-height:48px;padding:0 22px;font-weight:800;font-size:15px;letter-spacing:.06em;text-decoration:none;text-transform:uppercase}
.dmzh-cta1{background:#ff6a1f;color:#14100c !important}
.dmzh-cta2{border:1px solid #ff6a1f;color:#ff9a63}
.dmzh-file{flex:0 1 380px;min-width:0;width:100%;max-width:380px;padding:20px 22px}
.dmzh-file h2{margin:0 0 12px;font:700 11px/1.3 monospace;letter-spacing:.16em;text-transform:uppercase;color:#b4bcc6}
.dmzh-file ul{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px 20px}
.dmzh-wrap{max-width:1160px;margin:0 auto;padding:0 16px 80px}
.dmzh-grid{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:14px}
.dmzh-grid>li{flex:1 1 300px;min-width:0;display:flex}
.dmzh-grid>li>*{flex:1}
.dmzh-fact{padding:18px 20px;font-size:16px;line-height:1.55}
.dmzh-factl{display:block;margin-bottom:6px;font:700 11px/1.3 monospace;letter-spacing:.12em;text-transform:uppercase;color:#ff9a63}
.dmzh-src{display:block;margin-top:10px;font:600 12px/1.5 monospace;color:#b4bcc6}
.dmzh-src a{color:#8fe0a8}
.dmzh-cls{flex:1 1 150px !important}
@media (min-width:700px){.dmzh-cls{flex-basis:200px !important}}
.dmzh-clsa{display:flex;flex-direction:column;justify-content:space-between;gap:14px;padding:16px 18px;min-height:120px}
.dmzh-clsn{font-size:16px;font-weight:700}
.dmzh-boss{flex:1 1 240px !important}
.dmzh-ph{height:170px;display:flex;align-items:flex-end;padding:10px 14px;background:repeating-linear-gradient(135deg,#171c22 0 10px,#12161b 10px 20px);font:600 11px/1.3 monospace;letter-spacing:.12em;color:#b4bcc6;overflow:hidden;position:relative}
.dmzh-ph img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain}
.dmzh-bossb{padding:14px 16px 16px}
.dmzh-rank{font:700 11px/1.3 monospace;letter-spacing:.16em;text-transform:uppercase;color:#ff9a63}
.dmzh-bossn{font-size:24px;font-weight:900;margin-top:2px}
.dmzh-lt{padding:16px 18px;display:flex;flex-direction:column;justify-content:space-between;gap:14px;min-height:260px}
.dmzh-note{font-size:14px;color:#b4bcc6;line-height:1.55;margin:0}
.dmzh-credit{font-size:12px;color:#b4bcc6;margin:10px 0 0}
.dmzh-ptr{margin:18px 0 0;font-size:15px;line-height:1.6;color:#c9d0d8}
.dmzh-ptr .hk-tag{margin-right:8px}
.dmzh-pair{display:flex;flex-wrap:wrap;gap:14px}
.dmzh-pair>*{flex:1 1 440px;min-width:0;padding:22px}
.dmzh-cardh{display:flex;align-items:baseline;gap:12px;margin-bottom:8px}
.dmzh-cardh h3{margin:0;font-size:20px}
.dmzh-more{display:inline-flex;align-items:center;min-height:44px;font-size:14px;font-weight:700}
.dmzh-bfacts{list-style:none;margin:0 0 12px;padding:0;display:grid;gap:10px}
.dmzh-bfacts li{font-size:15px;line-height:1.55;color:#c9d0d8}
.dmzh-latest{list-style:none;margin:0;padding:0;border-top:1px solid #1f262d}
.dmzh-latest li{padding:12px 0;border-bottom:1px solid #1f262d;display:flex;flex-wrap:wrap;align-items:center;gap:4px 16px;justify-content:space-between}
.dmzh-latest a{display:inline-flex;align-items:center;min-height:44px;font-size:18px;font-weight:700;text-decoration:none}
.dmzh-date{font:600 12px/1.3 monospace;color:#b4bcc6}
.dmzh-band{margin-top:56px;display:flex;flex-wrap:wrap;gap:14px}
.dmzh-band>*{flex:1 1 440px;min-width:0;padding:22px}
.dmzh-band h2{margin:0 0 8px;font-size:20px}
.dmzh-band p,.dmzh-band li{color:#b4bcc6;font-size:14px;line-height:1.6}
.dmzh-band ul{margin:0 0 10px;padding-left:18px}
.dmzh-keep{margin-top:56px}
.dmzh-keep li>a{display:inline-flex;align-items:center;min-height:44px}
.dmzh-tap{display:inline-flex;align-items:center;min-height:44px}
`;

export default async function DmzLanding() {
  var loaded = await Promise.all([dmzArticleIndex(), dmzHubReads()]);
  var index = loaded[0];
  var reads = loaded[1];
  var counts = countsBySection('dmz', index);
  var poiRows = reads.pois;
  var keyRows = reads.keys;
  // Brief 174: links to routes that can be empty go through the gate; a read that failed counts as 0 here.
  var routeContent = dmzRouteContent(counts, {
    pois: Array.isArray(poiRows) ? visiblePoiRows(poiRows).length : 0,
    missions: lengthOrZero(reads.missions),
    keys: lengthOrZero(keyRows),
    items: lengthOrZero(reads.items),
    builds: lengthOrZero(reads.builds),
  });
  var keysHref = gatedHref('/dmz/keys', routeContent);
  var traitsHref = gatedHref('/dmz/traits', routeContent);

  // Hero: the same config the shared GameHero reads (breadcrumb, derived status badge, the ONE H1, the intro).
  var hero = buildHeroProps(dmz);
  var launchLong = launchDateLong(dmz.launch_date);
  var ticker = [hero.badge.label, 'Hajin Exclusion Zone', 'Extraction', launchLong ? 'Drop date ' + launchLong : null].filter(Boolean);
  var lt = lieutenantCard(LT_SEEN);
  var counters = hubCounters({
    weapons: verifiedWeaponCount(reads.weapons),
    keys: Array.isArray(keyRows) ? keyRows.length : null,
    locations: Array.isArray(poiRows) ? visiblePoiRows(poiRows).length : null,
    lieutenants: lt.count,
  });
  var classTiles = weaponClassTiles(reads.weapons, reads.classNames || {}, WEAPONS_HUB.routeBase);
  var pois = poiPreview(poiRows, 5, '/dmz/pois');
  var rarities = keyRarityChips(keyRows);
  var commanders = DOSSIERS.filter(function (d) { return d.rank === 'Commander'; });
  var bountyFacts = factsById(BOUNTY_FACTS, ['wanted-four-kills', 'payoff-any-bounty', 'claim-bounty']);
  var printer = dmz.sections.find(function (s) { return s.slug === 'printer'; });
  var latest = latestArticles(index, 3, dmzSectionForArticle, '/dmz/');
  var notCovered = notCoveredRoutes(routeContent);
  // Brief 192 follow-up: a gated hub route with entries leaves "Not covered yet" and shows as a linked chip here.
  var alsoCovered = coveredRoutes(routeContent, gatedHref);
  var facts = dmz.confirmedFacts;
  var shortFacts = facts.items.slice(0, 6);

  // Launch-dependent hub copy (naming line, two FAQ answers, the vs-Warzone tail) flips on
  // isGameLive(dmz) -- lib/dmz/hubCopy.js holds both the pre- and post-launch wording.
  var hubCopy = dmzHubCopy();
  var DMZ_NAMING_LINE = hubCopy.namingLine;
  // Hub structured data via the shared, game-agnostic builder. mainEntity tracks dmz.sections
  // (config-driven, same as before); BreadcrumbList is Network -> DMZ (DMZ = current page, no item).
  var hubLd = hubJsonLd({
    name: 'DMZ - Extraction Intelligence Hub',
    path: '/dmz',
    description: 'Field intel, meta, loadouts, crafting, FOB progression, and region guides for Call of Duty Modern Warfare 4 DMZ.',
    crumbLeaf: 'DMZ',
    sections: dmz.sections,
  });

  // ---- Hub FAQ (source-backed). Four Q&As: launch date / map / mode / confirmed-so-far.
  // ("Is DMZ coming back?" is promoted to its own h2 section above; FAQ_BACK_Q/A render there.)
  // Answers are VERBATIM. The launch DATE is sourced to the June Deep Dive and Deep Dive Part 2,
  // so it LEADS the list; the other three are Deep-Dive-backed. Each named post is a link (SourcedText). ----
  var FAQ_ARTICLES = {
    fob:     { href: '/dmz/fob/dmz-forward-operating-base-every-hub-system-detailed', label: 'the Forward Operating Base' },
    printer: { href: '/dmz/loadouts/dmz-3d-printer-crafting-system-every-category-detailed', label: 'the 3D Printer crafting system' },
    hajin:   { href: '/dmz/regions/dmz-hajin-exclusion-zone-what-the-deep-dive-reveals', label: 'the Hajin Exclusion Zone' },
  };
  // "All DMZ coverage" -- direct hub -> article links (restored in Brief 192, unchanged from before the redesign). Section derived via
  // dmzSectionForArticle; null-section rows dropped; heading from displayName. The three FAQ_ARTICLES already link
  // fob/printer/hajin, so they are excluded here to avoid duplicate links on this page.
  var explainerRows = await fetchHubExplainers(supabase, 'dmz');
  var explainers = selectExplainers(
    explainerRows.map(function (r) { var sec = dmzSectionForArticle(r); return Object.assign({}, r, { section: sec, href: sec ? '/dmz/' + sec + '/' + r.slug : null }); }),
    { cap: 30, gameSlug: 'dmz', excludeHrefs: Object.keys(FAQ_ARTICLES).map(function (k) { return FAQ_ARTICLES[k].href; }) }
  );
  var explainersHeading = 'All ' + dmz.displayName + ' coverage';
  // Q PHRASING follows the searcher, not our internal vocabulary: "release date" and
  // "coming back" are the live high-volume terms. The ANSWERS stay strictly inside
  // the named sources (the June Deep Dive and Deep Dive Part 2 for the date and Early Access, Part 1
  // and Part 2 for "coming back", the June Deep Dive for the setting and the mode, Part 2 for the bosses).
  var FAQ_LAUNCH_Q = 'What is the DMZ 2 release date?';
  var FAQ_LAUNCH_A = hubCopy.faqLaunchA;
  // HONESTY-CRITICAL. The query "is dmz coming back" PRESUPPOSES a link to the 2022
  // Modern Warfare II DMZ. No source confirms that relationship, so the answer says
  // YES to what IS confirmed (MW4 has a mode called DMZ, dated, Deep-Dive detailed)
  // and marks the presupposition as unconfirmed rather than quietly implying
  // continuity. Do NOT "improve" this into a claim that DMZ is a sequel or revival.
  var FAQ_BACK_Q = 'Is DMZ coming back?';
  var FAQ_BACK_A = hubCopy.faqBackA;
  var FAQ_MAP_Q = 'Where is DMZ set?';
  var FAQ_MAP_A = 'DMZ is set in the Hajin Exclusion Zone, a contested area on the Korean peninsula left saturated with abandoned military technology after the events of the Modern Warfare 4 campaign, per the June Deep Dive on the Call of Duty blog.';
  var FAQ_MODE_Q = 'What is DMZ in Call of Duty?';
  var FAQ_MODE_A = "DMZ is a mode within Call of Duty: Modern Warfare 4. The June Deep Dive on the Call of Duty blog frames it around extraction operations: squads deploy into the Hajin Exclusion Zone behind enemy lines and 'loot, fight, negotiate, betray, and extract whatever you can carry,' with both rival Operators and enemy combatants active throughout the zone.";
  var FAQ_CONFIRMED_Q = 'What has been officially confirmed about DMZ so far?';
  // Count-free on purpose (a hard-coded "Three areas" went stale once more articles shipped): names the
  // three linked guides and says there are others, so it stays true as coverage grows.
  var FAQ_CONFIRMED_PRE = 'Our guides drawn from the official Deep Dive posts cover ';
  var FAQ_CONFIRMED_MID1 = ' (the between-deployments hub), ';
  var FAQ_CONFIRMED_MID2 = ', and ';
  var FAQ_CONFIRMED_MID3 = ' (the setting)';
  var FAQ_CONFIRMED_SUF = ', among other topics. More coverage follows as official details are confirmed.';
  // Bounty explainer link (a static page, not a feed article, so it is not in FAQ_ARTICLES and never
  // collides with the explainer list's excludeHrefs). The sentence restates only lib/dmz/bounties.js
  // facts: the weekly Top 50 Most Wanted list (official term, graphic / Deep Dive Part 2), paying off a
  // bounty at a Bounty Station, and the page's confirmed-vs-unconfirmed split.
  var FAQ_BOUNTIES = { href: '/dmz/bounties', label: 'the DMZ bounty system' };
  var FAQ_BOUNTIES_PRE = ' Our guide to ';
  var FAQ_BOUNTIES_SUF = ' covers the weekly Most Wanted board, paying off a bounty at a Bounty Station, and which bounty details are confirmed by official posts and which are not yet.';
  // Boss Board dossier link (static page). Restates only lib/dmz/bosses.js facts: the Lieutenants and the
  // three Commanders named in the Deep Dives.
  var FAQ_BOSSES = { href: '/dmz/bosses', label: 'the DMZ Boss Board' };
  var FAQ_BOSSES_PRE = ' Our target dossiers on ';
  var FAQ_BOSSES_SUF = ' cover the Lieutenants and the three Commanders named in Deep Dive Part 2: Colossus, Deathstalker and the Tank.';
  var faqLinkStyle = { color: 'var(--green)', textDecoration: 'underline', textUnderlineOffset: 2, fontWeight: 600 };
  var faqQStyle = { fontFamily: EXO, fontSize: 16, fontWeight: 700, color: '#fff', margin: '0 0 7px' };
  var faqAStyle = { fontSize: 14.5, color: 'var(--text-secondary)', lineHeight: 1.65, margin: 0, maxWidth: 680 };
  // Tactical panel wrapper for each FAQ Q&A (restyle only -- copy unchanged).
  var faqPanel = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 6, padding: '16px 18px' };
  // Section-label orange marker bar (sits before the h2, no text change).
  var sectionMark = { width: 3, height: 13, background: 'var(--accent)', borderRadius: 1, flexShrink: 0 };
  // Prose "briefing panel" wrapper (tactical, orange left-edge). Copy re-parented, unchanged.
  var prosePanel = { display: 'grid', gap: 14, maxWidth: 680, background: 'var(--bg-card)', border: '1px solid var(--border)', borderLeft: '3px solid var(--accent)', borderRadius: 8, padding: '20px 22px' };
  var keepH2 = { fontFamily: EXO, fontSize: 13, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-tertiary)', margin: 0 };

  return (
    <div className={'hk ' + exo2.variable} style={Object.assign({ fontFamily: EXO }, HUB_VARS)}>
      <style dangerouslySetInnerHTML={{ __html: HUB_KIT_CSS + PAGE_CSS }} />

      {/* A. TICKER + HERO. Ticker items: the derived status badge, the zone, the mode and the launch date. */}
      <div className="dmzh-ticker" aria-label="Status"><ul>{ticker.map(function (t) { return <li key={t}>{t}</li>; })}</ul></div>
      <header className="dmzh-hero">
        <div className="dmzh-mark" aria-hidden="true">{dmz.displayName}</div>
        <div className="dmzh-edge" aria-hidden="true" />
        <div className="dmzh-heroin">
          <div className="dmzh-herol">
            <nav aria-label="Breadcrumb" className="dmzh-crumb hk-mono" style={{ fontSize: 12, fontWeight: 700 }}>
              <Link href="/">Network</Link>{' / '}<span>{hero.breadcrumbLabel}</span>
            </nav>
            <h1 className="dmzh-h1">{hero.h1.lines.map(function (l, i) { return <span key={i}>{i > 0 ? <br /> : null}{l}</span>; })}</h1>
            <p className="dmzh-h1b">Sourced.</p>
            {hero.intro ? <p className="dmzh-sub">{hero.intro.text}{hero.intro.strong ? ' ' + hero.intro.strong : ''}</p> : null}
            <div className="dmzh-ctas">
              <Link className="dmzh-cta dmzh-cta1" href={WEAPONS_HUB.routeBase}>{WEAPONS_HUB.hubH1}</Link>
              <Link className="dmzh-cta dmzh-cta2" href="/dmz/field-intel">{(function (s) { return s.navLabel || s.label; })(dmz.sections.find(function (s) { return s.slug === 'field-intel'; }))}</Link>
            </div>
          </div>
          {counters.length > 0 ? (
            <CutCard corner="tl" className="dmzh-file" aria-labelledby="dmzh-file-h">
              <h2 id="dmzh-file-h">On file today</h2>
              <ul>{counters.map(function (c) { return <li key={c.key}><StatNumeral value={c.value} label={c.label} size={60} /></li>; })}</ul>
            </CutCard>
          ) : null}
        </div>
      </header>

      <main className="dmzh-wrap">
        {hubLd.map((ld, i) => (
          <script key={'hubld-' + i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(ld) }} />
        ))}

        {/* B. 01 THE SHORT VERSION: the first six dmz.confirmedFacts, each with its existing source (linked). */}
        <HubSection id="short" number="01" title="The short version">
          <ul className="dmzh-grid">
            {shortFacts.map(function (f) {
              return (
                <li key={f.label}>
                  <CutCard className="dmzh-fact">
                    <span className="dmzh-factl">{f.label}</span>
                    {f.text}
                    <span className="dmzh-src">Source: <SourcedText text={f.source} linkStyle={{ color: '#8fe0a8' }} /></span>
                  </CutCard>
                </li>
              );
            })}
          </ul>
          <p className="hk-intro" style={{ marginTop: 16 }}>
            <SourcedText text={facts.closing.text} linkStyle={faqLinkStyle} />{' '}
            <Link href={facts.closing.href} style={faqLinkStyle}>{facts.closing.label}</Link>.
          </p>
        </HubSection>

        {/* C. 02 WEAPONS: one tile per class of the verified weapons, linking to that class on /dmz/weapons. */}
        {classTiles.length > 0 ? (
          <HubSection id="weapons" number="02" title="Weapons" action={{ href: WEAPONS_HUB.routeBase, label: WEAPONS_HUB.hubH1 }} intro={WEAPONS_HUB.hubDesc}>
            <ul className="dmzh-grid">
              {classTiles.map(function (t) {
                return (
                  <li key={t.slug} className="dmzh-cls">
                    <CutCard href={t.href} className="dmzh-clsa">
                      <StatNumeral value={t.count} size={52} as="span" />
                      <span className="dmzh-clsn">{t.label}</span>
                    </CutCard>
                  </li>
                );
              })}
            </ul>
          </HubSection>
        ) : null}

        {/* D. 03 BOSS BOARD: the three Commander dossiers (existing images; Deathstalker keeps the placeholder), the
            Lieutenants card (count from the roster, label and note from LT_SEEN) and ONE pointer sentence, no figure. */}
        <HubSection id="bosses" number="03" title="Boss Board" action={{ href: '/dmz/bosses', label: 'Boss Board' }} intro={BOSSES_DESC}>
          <ul className="dmzh-grid">
            {commanders.map(function (d) {
              var img = bossImageSet(d, BOSS_IMAGE.posterSizes);
              return (
                <li key={d.id} className="dmzh-boss">
                  <CutCard href={'/dmz/bosses#' + d.id}>
                    <div className="dmzh-ph">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {img ? <img src={img.src} srcSet={img.srcSet} sizes={img.sizes} alt={bossImageAlt(d)} loading="lazy" decoding="async" /> : <span>SURVEILLANCE PHOTO PENDING</span>}
                    </div>
                    <div className="dmzh-bossb"><div className="dmzh-rank">{d.rank}</div><div className="dmzh-bossn">{d.designation}</div></div>
                  </CutCard>
                </li>
              );
            })}
            <li className="dmzh-boss">
              <CutCard href="/dmz/bosses#lieutenants" className="dmzh-lt">
                <div>
                  <div className="dmzh-rank">Lieutenants</div>
                  <StatNumeral value={lt.count} label={lt.after} size={84} />
                </div>
                <p className="dmzh-note">{lt.rest} {lt.label}.</p>
              </CutCard>
            </li>
          </ul>
          {commanders.some(function (d) { return !!bossImageSet(d); }) ? <p className="dmzh-credit">{BOSS_IMAGE.wallCredit}</p> : null}
          <p className="dmzh-ptr" data-boss-rewards-pointer=""><span className="hk-tag">Observed</span>{BOSS_REWARDS_POINTER.text}<Link href={BOSS_REWARDS_POINTER.href}>{BOSS_REWARDS_POINTER.linkText}</Link>.</p>
        </HubSection>

        {/* E. 04 HAJIN AND KEYS: the first five locations by name (each linked) plus how many more; the key rarity
            labels with their real counts (only counts > 0). The keys link goes through the gate. */}
        {(pois && pois.total > 0) || (Array.isArray(keyRows) && keyRows.length > 0) ? (
          <HubSection id="hajin" number="04" title="Hajin and keys">
            <div className="dmzh-pair">
              {pois && pois.total > 0 ? (
                <CutCard>
                  <div className="dmzh-cardh"><StatNumeral value={pois.total} size={56} as="span" /><h3>Hajin locations</h3></div>
                  <p className="dmzh-note" style={{ marginBottom: 14 }}>{DMZ_ENTITIES.pois.hubDesc}</p>
                  <ul className="hk-chips">
                    {pois.shown.map(function (p) { return <li key={p.href}><Link href={p.href}>{p.name}</Link></li>; })}
                    {pois.more > 0 ? <li><Link href="/dmz/pois">{'+ ' + pois.more + ' more'}</Link></li> : null}
                  </ul>
                  <Link className="dmzh-more" href="/dmz/pois">Hajin Map &amp; Locations</Link>
                </CutCard>
              ) : null}
              {Array.isArray(keyRows) && keyRows.length > 0 ? (
                <CutCard>
                  <div className="dmzh-cardh"><StatNumeral value={keyRows.length} size={56} as="span" /><h3>Keys</h3></div>
                  <p className="dmzh-note" style={{ marginBottom: 14 }}>{DMZ_ENTITIES.keys.hubDescFor(keyRows)}</p>
                  {rarities.length > 0 ? (
                    <ul className="hk-chips">
                      {rarities.map(function (r) { return <li key={r.label}><span>{r.label} <span className="hk-mono" style={{ fontSize: 12, marginLeft: 6 }}>{r.count}</span></span></li>; })}
                    </ul>
                  ) : null}
                  <span className="hk-tag" style={{ marginBottom: 12 }}>Operator observation</span>
                  {keysHref ? <><br /><Link className="dmzh-more" href={keysHref}>DMZ Keys</Link></> : null}
                </CutCard>
              ) : null}
            </div>
          </HubSection>
        ) : null}

        {/* F. 05 PRINTER AND BOUNTIES: the printer section's own description (no recipe reader exists outside the
            corroboration loader, so no recipe names here); three bounty facts with their source tags. */}
        <HubSection id="printer-bounties" number="05" title="Printer and bounties">
          <div className="dmzh-pair">
            {printer ? (
              <CutCard>
                <div className="dmzh-cardh"><h3>{printer.label}</h3></div>
                <p className="dmzh-note" style={{ marginBottom: 14 }}>{printer.description}</p>
                <Link className="dmzh-more" href={'/dmz/' + printer.slug}>{printer.reference && printer.reference.heading ? printer.reference.heading : printer.label}</Link>
              </CutCard>
            ) : null}
            <CutCard>
              <div className="dmzh-cardh"><StatNumeral value={bountyCounts().confirmed} label="sourced facts" size={56} as="span" /><h3>Bounty System</h3></div>
              <ul className="dmzh-bfacts">
                {bountyFacts.map(function (f) {
                  return <li key={f.id}>{f.text}<span className="dmzh-src">{'Source: ' + f.src.label + (f.loc ? ', section "' + f.loc + '"' : '')}</span></li>;
                })}
              </ul>
              <Link className="dmzh-more" href="/dmz/bounties">DMZ Bounty System</Link>
            </CutCard>
          </div>
        </HubSection>

        {/* G. 06 LATEST DMZ NEWS: the three newest published DMZ articles (title and date; the index carries no
            body, so no read time). */}
        {latest.length > 0 ? (
          <HubSection id="latest" number="06" title="Latest DMZ News" action={{ href: '/dmz/field-intel', label: 'News' }}>
            <ul className="dmzh-latest">
              {latest.map(function (a) {
                return <li key={a.href}><Link href={a.href}>{a.headline}</Link><span className="dmzh-date">{a.date}</span></li>;
              })}
            </ul>
          </HubSection>
        ) : null}

        {/* H. NOT COVERED YET (the gated hub routes with no entries, from the content map; each leaves this list on
            its own once it has some) and HOW THE INTEL IS MADE (existing copy). The In-progress row is gone. */}
        <div className="dmzh-band">
          <CutCard aria-labelledby="dmzh-nc-h">
            <h2 id="dmzh-nc-h">Not covered yet</h2>
            {notCovered.length > 0 ? (
              <>
                <ul data-not-covered="">
                  {notCovered.map(function (r) { return <li key={r.key}><strong style={{ color: '#e8eaed' }}>{r.label}</strong>{': ' + r.desc}</li>; })}
                </ul>
                <p style={{ margin: '0 0 10px' }}>{NOT_COVERED_NOTE}</p>
              </>
            ) : null}
            {alsoCovered.length > 0 ? (
              <>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#e8eaed', margin: '4px 0 8px' }}>Also covered</h3>
                <ul className="hk-chips" data-also-covered="" style={{ paddingLeft: 0 }}>
                  {alsoCovered.map(function (r) { return <li key={r.key}><Link href={r.href}>{r.label}</Link></li>; })}
                </ul>
              </>
            ) : null}
            <ul>
              <li><strong style={{ color: '#e8eaed' }}>Factions</strong>{': Whether DMZ supports a faction system is still unconfirmed.'}</li>
              <li>
                {traitsHref ? <Link className="dmzh-tap" href={traitsHref} style={{ fontWeight: 700 }}>Trait Planner</Link> : <strong>Trait Planner</strong>}
                {' (Work in progress): Each Operator has its own trait tree, per the June Deep Dive'}
              </li>
            </ul>
          </CutCard>
          <CutCard aria-labelledby="dmzh-desk-h">
            <h2 id="dmzh-desk-h">How the Intel Is Made</h2>
            <h3 style={{ fontFamily: EXO, fontSize: 17, fontWeight: 700, color: '#fff', margin: '0 0 8px' }}>Written, cross-checked, sourced</h3>
            <p style={{ margin: '0 0 10px' }}>Every briefing is traced to primary material - the official Deep Dive, patch notes, first-party reveals - before it publishes.</p>
            <p style={{ margin: 0 }}>Coverage is produced by our editorial desk and verified against primary sources. Nothing is invented; where the record is unconfirmed, we say so. The desk carries distinct roles - meta, analysis, builds, community, field guide - and signs its work.</p>
          </CutCard>
        </div>

        {/* I. KEPT BLOCKS, moved below and restyled only: text and links unchanged. */}
        <div className="dmzh-keep">
          {/* EARLY ACCESS NOTE -- one static line of body copy (dmz.earlyAccessNote). Shown at all
              times: it is never compared with the clock, so it makes no live/started claim. */}
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.55, margin: '0 0 14px', maxWidth: 760 }}>
            {dmz.earlyAccessNote}{' '}
            <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-tertiary)' }}>(Source: {dmz.earlyAccessNoteSource}.)</span>
          </p>

          {/* NAMING LINE. Uses the searcher's term ("DMZ 2", the highest-volume live
              query) in visible body copy and corrects it in the same sentence, so the
              page ranks for the phrase without asserting a name that is not official.
              Held as a constant so the copy has one source, like the FAQ strings. */}
          <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: '14px 0 0', maxWidth: 600, lineHeight: 1.6 }}>
            {DMZ_NAMING_LINE}
          </p>

          {/* MW4 DMZ vs Warzone -- PROSE, deliberately asymmetric. Targets "dmz vs
              warzone" (170/mo). No card grid: a two-column layout would imply a
              DMZ/Warzone information balance we do not have. Copy is constrained to the
              official Deep Dive (scripts/gen-dmz-news.mjs) -- no Warzone specifics beyond
              the battle-royale category, no MW4 balance/TTK, no map-size or squad claims,
              no 2022-mode continuity. */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '44px 0 16px' }}>
            <span style={sectionMark} />
            <h2 style={keepH2}>MW4 DMZ vs Warzone</h2>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>
          <div style={prosePanel}>
            <p style={{ fontSize: 14.5, color: 'var(--text-secondary)', lineHeight: 1.65, margin: 0 }}>
              DMZ is Modern Warfare 4&apos;s extraction mode - you deploy into the Hajin Exclusion Zone, take on objectives and threats, and try to extract with what you have earned; Warzone is Call of Duty&apos;s battle-royale mode. Different goal, different loop.
            </p>
            <p style={{ fontSize: 14.5, color: 'var(--text-secondary)', lineHeight: 1.65, margin: 0 }}>
              What the official Deep Dive confirms sets DMZ apart: progression and gear that persist between runs through the FOB and Stash, a PvPvE zone where you choose when to cooperate, fight, or slip away, and infil and exfil with real stakes. {hubCopy.vsWarzoneTail}
            </p>
          </div>

          {/* Is DMZ coming back? -- dedicated section-anchor for the 250-480/mo query,
              promoted OUT of the FAQ so the term gets a titled on-page target. PROSE (h2 +
              paragraph), NEVER FAQPage schema. Copy is the source-backed FAQ_BACK_A: affirms
              the mode + Oct 23 2026 date first-party, hedges the 2022-continuity unknown. */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '44px 0 16px' }}>
            <span style={sectionMark} />
            <h2 style={keepH2}>{FAQ_BACK_Q}</h2>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>
          <div style={prosePanel}>
            <p style={{ fontSize: 14.5, color: 'var(--text-secondary)', lineHeight: 1.65, margin: 0 }}><SourcedText text={FAQ_BACK_A} linkStyle={faqLinkStyle} /></p>
          </div>

          {/* FAQ -- source-backed (launch date / map / mode / confirmed-so-far).
              Launch date is now sourced (see HANDOFF). */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '44px 0 18px' }}>
            <span style={sectionMark} />
            <h2 style={keepH2}>Common questions</h2>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={faqPanel}>
              <h3 style={faqQStyle}>{FAQ_LAUNCH_Q}</h3>
              <p style={faqAStyle}><SourcedText text={FAQ_LAUNCH_A} linkStyle={faqLinkStyle} /></p>
            </div>
            <div style={faqPanel}>
              <h3 style={faqQStyle}>{FAQ_MAP_Q}</h3>
              <p style={faqAStyle}><SourcedText text={FAQ_MAP_A} linkStyle={faqLinkStyle} /></p>
            </div>
            <div style={faqPanel}>
              <h3 style={faqQStyle}>{FAQ_MODE_Q}</h3>
              <p style={faqAStyle}><SourcedText text={FAQ_MODE_A} linkStyle={faqLinkStyle} /></p>
            </div>
            <div style={faqPanel}>
              <h3 style={faqQStyle}>{FAQ_CONFIRMED_Q}</h3>
              <p style={faqAStyle}>
                {FAQ_CONFIRMED_PRE}
                <Link href={FAQ_ARTICLES.fob.href} style={faqLinkStyle}>{FAQ_ARTICLES.fob.label}</Link>
                {FAQ_CONFIRMED_MID1}
                <Link href={FAQ_ARTICLES.printer.href} style={faqLinkStyle}>{FAQ_ARTICLES.printer.label}</Link>
                {FAQ_CONFIRMED_MID2}
                <Link href={FAQ_ARTICLES.hajin.href} style={faqLinkStyle}>{FAQ_ARTICLES.hajin.label}</Link>
                {FAQ_CONFIRMED_MID3}
                {FAQ_CONFIRMED_SUF}
                {FAQ_BOUNTIES_PRE}
                <Link href={FAQ_BOUNTIES.href} style={faqLinkStyle}>{FAQ_BOUNTIES.label}</Link>
                {FAQ_BOUNTIES_SUF}
                {FAQ_BOSSES_PRE}
                <Link href={FAQ_BOSSES.href} style={faqLinkStyle}>{FAQ_BOSSES.label}</Link>
                <SourcedText text={FAQ_BOSSES_SUF} linkStyle={faqLinkStyle} />
              </p>
            </div>
          </div>

          {/* ALL DMZ COVERAGE -- restored (Brief 192 follow-up): text and links as before the redesign. */}
          {explainers.length > 0 ? (
            <section style={{ marginTop: 44 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0 16px' }}>
                <h2 style={{ fontFamily: EXO, fontSize: 13, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-tertiary)', margin: 0 }}>{explainersHeading}</h2>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              </div>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
                {explainers.map(function (a) {
                  return <li key={a.href}><Link href={a.href} style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', textDecoration: 'none' }}>{a.headline}</Link></li>;
                })}
              </ul>
            </section>
          ) : null}
          {/* SOURCES -- the official posts the hub copy and FAQ draw on (HUB_SOURCES, lib/dmz/hubCopy.js).
              External links open in a new tab, as on the DMZ article pages. No claims in this block. */}
          <section aria-labelledby="dmz-sources-heading">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '44px 0 14px' }}>
              <span style={sectionMark} />
              <h2 id="dmz-sources-heading" style={keepH2}>Sources</h2>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </div>
            <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 8, maxWidth: 760 }}>
              {HUB_SOURCES.map(function (s) {
                return (
                  <li key={s.key} style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                    <a href={s.href} target="_blank" rel="noopener noreferrer" style={faqLinkStyle}>{s.label}</a>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      </main>
    </div>
  );
}
