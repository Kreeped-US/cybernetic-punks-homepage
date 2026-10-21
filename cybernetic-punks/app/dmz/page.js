// app/dmz/page.js
// DMZ landing -- the per-game hub. Forest/Exo-2 visual language matching the
// article-detail template. Config-driven coverage cards (lib/games/dmz.js) with
// REAL article counts from feed_items. Tiles whose page has no content yet sit in the
// quieter "Coming after launch" row and move to the Coverage grid on their own once
// their page has content (lib/dmz/hubTiles.js -- the same rule as each page's robots).
//
// Server component + Supabase reads for live counts and hub row checks -> force-dynamic.
// Reads via the lazy anon Proxy (no module-scope createClient).
//
// ROBOTS: gated in app/dmz/layout.js on dmz.indexable (index vs noindex,follow).
// This page sets NO robots of its own -> inherits that gate. (Do not add robots.)

import Link from 'next/link';
import { Exo_2 } from 'next/font/google';
import { supabase } from '@/lib/supabase';
import { dmz, dmzSectionForArticle } from '@/lib/games/dmz';
import { fetchArticleIndex, countsBySection } from '@/lib/games/sectionArticles';
import { isStandaloneReference } from '@/lib/dmz/sections';
import { getDmzEntity, fetchDmzSlugs, visiblePoiRows } from '@/lib/dmz/entities';
import { fetchIndexableBuildEntries } from '@/lib/dmz/weaponBuilds';
import { splitHubTiles } from '@/lib/dmz/hubTiles';
import { fetchHubExplainers, selectExplainers } from '@/lib/hubExplainers';
import { isGameLive, launchDateLong, preLaunchEarlyAccess } from '@/lib/network/gameStatus';
import { PLANNED_TOOL_LABEL, PLANNED_TOOLS_NOTE, showLaunchNotify } from '@/lib/network/launchCopy';
import { dmzHubCopy, META_CARD_BADGE, DMZ_META_DESC, DMZ_EARLY_ACCESS_LINE, HUB_SOURCES, sourceSegments } from '@/lib/dmz/hubCopy';
import GameHero from '@/components/game/GameHero';
import { buildHeroProps } from '@/lib/games/heroModel';
import DmzNotifyBlock from '@/components/dmz/DmzNotifyBlock';
import { safeJsonLd } from '@/lib/security/safeJsonLd';
import { hubJsonLd } from '@/lib/seo/hubJsonLd';

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
// same breath (see FAQ_LAUNCH_A). Title 53 chars / description 145 chars (Gate 4:
// <=60 / <=155).
export const metadata = {
  // `absolute` drops the root '%s | Cybernetic Punks' suffix: with it this title
  // rendered at 75 chars, over the SERP limit. This page exists to compete for
  // "dmz 2 release date" (630/mo), so brand framing earns nothing here.
  // (openGraph/twitter titles below are set explicitly, not templated -- kept in
  // sync with this metadata title.)
  title: { absolute: 'MW4 DMZ Release Date: October 23, 2026 (Modern Warfare 4)' },
  description: DMZ_META_DESC,
  keywords: ['DMZ', 'DMZ Modern Warfare 4', 'MW4 DMZ', 'Call of Duty DMZ', 'DMZ extraction zone', 'DMZ Hajin', 'DMZ FOB', 'DMZ crafting', 'DMZ loadouts', 'DMZ guide'],
  alternates: { canonical: 'https://cyberneticpunks.com/dmz' },
  // og/twitter mirror the meta title+description above. They previously carried the
  // old "Extraction Intelligence Hub" positioning, so a search result led with the
  // release date while the social card led with brand copy. Same string, one message.
  openGraph: {
    title: 'MW4 DMZ Release Date: October 23, 2026 (Modern Warfare 4)',
    description: DMZ_META_DESC,
    url: 'https://cyberneticpunks.com/dmz',
    siteName: 'Cybernetic Punks',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    site: '@Cybernetic87250',
    title: 'MW4 DMZ Release Date: October 23, 2026 (Modern Warfare 4)',
    description: DMZ_META_DESC,
  },
};

// The eligible DMZ articles (published, noindex=false, not rejected) -> drives REAL per-section
// counts via the shared resolver (lib/games/sectionArticles.js -> dmzSectionForArticle): the slug
// map, the 'discourse' TAG, and the editorial.defaultArticleSection fallback all count in the
// section the article actually renders under (2026-10-02; previously a static-map count plus a
// separate discourse tag count). Fail-soft (hub): a read error -> empty index -> zero counts.
async function dmzArticleIndex() {
  try {
    return await fetchArticleIndex('dmz');
  } catch (err) {
    console.error('[dmz hub] article index failed: ' + (err && err.message ? err.message : String(err)));
    return [];
  }
}

// Row counts for the standalone hubs the page links to, read with each hub's OWN predicate (entity
// hubs: rows; /dmz/pois: visible rows; /dmz/builds: indexable builds) so a tile is live exactly when its
// hub is indexable (lib/dmz/hubTiles.js). Five reads in parallel, slug/flag columns only. Fail-soft per
// hub: a read error logs and counts as 0, which keeps that tile in "Coming after launch" (never a false
// live claim, never a 500 for the whole hub).
async function dmzHubRouteRows() {
  var readers = {
    pois: function () { return fetchDmzSlugs(getDmzEntity('pois')).then(function (r) { return visiblePoiRows(r).length; }); },
    missions: function () { return fetchDmzSlugs(getDmzEntity('missions')).then(function (r) { return r.length; }); },
    keys: function () { return fetchDmzSlugs(getDmzEntity('keys')).then(function (r) { return r.length; }); },
    items: function () { return fetchDmzSlugs(getDmzEntity('items')).then(function (r) { return r.length; }); },
    builds: function () { return fetchIndexableBuildEntries().then(function (e) { return e.length; }); },
  };
  var keys = Object.keys(readers);
  var counts = await Promise.all(keys.map(function (k) {
    return readers[k]().catch(function (err) {
      console.error('[dmz hub] ' + k + ' row check failed: ' + (err && err.message ? err.message : String(err)));
      return 0;
    });
  }));
  var out = {};
  keys.forEach(function (k, i) { out[k] = counts[i]; });
  return out;
}

function Pill({ text, tone }) {
  // tone: 'live' (functional green go-signal) | 'soon' | 'muted'. Small status flag.
  var color = tone === 'live' ? 'var(--green)' : 'var(--text-tertiary)';
  var border = tone === 'live' ? 'var(--green)' : 'var(--border)';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontFamily: 'monospace', fontSize: 8.5, fontWeight: 800, letterSpacing: 1.5,
      textTransform: 'uppercase', color: color,
      border: '1px solid ' + border, borderRadius: 2, padding: '2px 8px',
    }}>
      {tone === 'live' && <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--green)' }} />}
      {text}
    </span>
  );
}

// An FAQ answer with each named source (see FAQ_SOURCE_PHRASES in lib/dmz/hubCopy.js) rendered as an
// external link to that post. The visible text is exactly the answer string.
function SourcedText({ text, linkStyle }) {
  return sourceSegments(text).map(function (seg, i) {
    return seg.href
      ? <a key={i} href={seg.href} target="_blank" rel="noopener noreferrer" style={linkStyle}>{seg.text}</a>
      : <span key={i}>{seg.text}</span>;
  });
}

// Dossier card: tactical near-black panel; orange border on hover (LINK cards only,
// via the .dmz-dossier rule in the page <style>). No padding here -- DossierHead +
// CardBody supply their own.
var cardBase = {
  display: 'flex', flexDirection: 'column',
  background: 'var(--bg-card)', border: '1px solid var(--border)',
  borderRadius: 6, textDecoration: 'none', minHeight: 132, overflow: 'hidden',
};

// "Coming after launch" row -- deliberately QUIETER than the Coverage grid: dashed outline, no fill, no
// accent bar, small type. Each tile is a name, one line and (only where it already had one) a status
// label; no counts and no decorative previews. A tile links only where a route exists (no 404s); the
// planned tools have no route yet. Flex-wrap with a shared basis, so a short last row stretches instead
// of leaving grid holes.
var laterRow = { display: 'flex', flexWrap: 'wrap', gap: 10 };
var laterTile = { flex: '1 1 230px', display: 'flex', flexDirection: 'column', gap: 5, background: 'transparent', border: '1px dashed var(--border)', borderRadius: 6, padding: '12px 14px', textDecoration: 'none' };
var laterHead = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 };
var laterName = { fontFamily: EXO, fontSize: 14, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: 0.2 };
var laterDesc = { fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.5 };
// PLANNED_TOOL_LABEL ("In development") -- a TRUE status label, the same before and after launch
// (lib/network/launchCopy.js): a tool claims "live" only once its own data exists, never on the clock.
var laterBadge = { flexShrink: 0, fontFamily: 'monospace', fontSize: 8, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--accent-dim)', border: '1px solid var(--accent-dim)', borderRadius: 2, padding: '2px 7px', whiteSpace: 'nowrap' };

function CardShell({ children, href }) {
  if (href) return <Link href={href} className="dmz-dossier" style={cardBase}>{children}</Link>;
  return <div style={cardBase}>{children}</div>;
}

// File-code + status-flag header strip (e.g. FI-01 / ... / LIVE).
function DossierHead({ code, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '8px 14px', background: 'var(--bg-nav)', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, letterSpacing: 2, color: 'var(--text-secondary)' }}>{code}</span>
      {children}
    </div>
  );
}

function CardBody({ children }) {
  return <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>{children}</div>;
}

function CardTitle({ children }) {
  return <span className="dmz-card-title" style={{ fontFamily: EXO, fontSize: 17, fontWeight: 700, color: '#fff', letterSpacing: 0.2 }}>{children}</span>;
}
function CardDesc({ children }) {
  return <span style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.55 }}>{children}</span>;
}

// Editor-fed section with REAL article count. count>0 -> LIVE + "{n} report(s)";
// count===0 -> neutral "Publishing soon" (never claims LIVE with nothing there).
function CountCard({ section, count, code }) {
  // A standalone reference section (lib/dmz/sections.js; /dmz/printer) is live with no articles of its own.
  var overview = count === 0 && isStandaloneReference(section);
  var live = count > 0 || overview;
  return (
    <CardShell href={'/dmz/' + section.slug}>
      <DossierHead code={code}><Pill text={live ? 'Live' : 'Soon'} tone={live ? 'live' : 'muted'} /></DossierHead>
      <CardBody>
        <CardTitle>{section.label}</CardTitle>
        <CardDesc>{section.description}</CardDesc>
        <span style={{ marginTop: 'auto', fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: live ? 'var(--green)' : 'var(--text-tertiary)' }}>
          {overview ? 'Station overview' : live ? (count + (count === 1 ? ' report' : ' reports')) : 'Publishing soon'}
        </span>
      </CardBody>
    </CardShell>
  );
}

// Live hub-route card (Locations / Missions / Builds / Keys / Items) in the Coverage grid. Rendered ONLY
// once the hub has rows (lib/dmz/hubTiles.js), so "Live" is true by construction. No count shown.
function RouteCard({ route, code }) {
  return (
    <CardShell href={route.href}>
      <DossierHead code={code}><Pill text="Live" tone="live" /></DossierHead>
      <CardBody>
        <CardTitle>{route.label}</CardTitle>
        <CardDesc>{route.desc}</CardDesc>
      </CardBody>
    </CardShell>
  );
}

// One quiet tile in the "Coming after launch" row (see laterTile). href only where a route exists;
// badge only where the tile already carried a status label.
function LaterTile({ name, desc, href, badge }) {
  var inner = (
    <>
      <div style={laterHead}>
        <span style={laterName}>{name}</span>
        {badge}
      </div>
      <span style={laterDesc}>{desc}</span>
    </>
  );
  if (href) return <Link href={href} className="dmz-dossier" style={laterTile}>{inner}</Link>;
  return <div style={laterTile}>{inner}</div>;
}

export default async function DmzLanding() {
  var loaded = await Promise.all([dmzArticleIndex(), dmzHubRouteRows()]);
  var index = loaded[0];
  var counts = countsBySection('dmz', index);
  // Coverage grid vs "Coming after launch": each tile by its own page's content rule (lib/dmz/hubTiles.js).
  var tiles = splitHubTiles(dmz.sections, counts, isStandaloneReference, loaded[1]);
  var facts = dmz.confirmedFacts;

  // Countdown to launch -- computed SERVER-SIDE (force-dynamic, per request, in the
  // initial HTML). Date-DRIVEN off dmz.launch_date (not a hardcoded Date.UTC literal),
  // CLAMPED with Math.max(0, ...) so it can NEVER go negative after launch, and paired
  // with isGameLive(dmz) so the whole hero flips to LIVE once Oct 23 passes.
  var dmzLive = isGameLive(dmz);
  // Early Access date (dmz.early_access_date) while DMZ is not yet live; null after the live flip.
  var dmzEA = preLaunchEarlyAccess(dmz);
  var daysToLaunch = Math.max(0, Math.ceil((new Date(dmz.launch_date + 'T00:00:00Z').getTime() - Date.now()) / 86400000));
  var launchLong = launchDateLong(dmz.launch_date) || '23 Oct 2026'; // single-sourced launch date string
  // "October 23" from dmz.launch_date (UTC date, no clock): the day-0 countdown label until launch.
  var launchMonthDay = new Date(dmz.launch_date + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: 'UTC' });
  var briefingCount = index.length; // eligible DMZ articles = live briefings

  // Source-independent structured data for the hub. BreadcrumbList: Network -> DMZ
  // (DMZ is the current page, so it is the leaf with no `item`). The visible
  // NETWORK / DMZ breadcrumb at the top of the shared GameHero mirrors this (same labels,
  // same order; rendered upper-case) -- the structured-only gap is closed. CollectionPage describes the hub
  // as its coverage sections (from dmz.sections, never a hardcoded list) -> tracks config.
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

  // "All DMZ coverage" -- direct hub -> article links (Change B). Section derived via
  // dmzSectionForArticle (same as Change A); null-section rows dropped; heading from displayName. The
  // three FAQ_ARTICLES already link fob/printer/hajin above, so they are excluded here to avoid
  // duplicate links on this page (excludeHrefs = FAQ hrefs; no slug list in the lib).
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
  // Stage 5: tactical panel wrapper for each FAQ Q&A (restyle only -- copy unchanged).
  var faqPanel = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 6, padding: '16px 18px' };
  // Section-label orange marker bar (Stage 5 tactical accent; sits before the h2, no text change).
  var sectionMark = { width: 3, height: 13, background: 'var(--accent)', borderRadius: 1, flexShrink: 0 };
  // Prose "briefing panel" wrapper (tactical, orange left-edge). Copy re-parented, unchanged.
  var prosePanel = { display: 'grid', gap: 14, maxWidth: 680, background: 'var(--bg-card)', border: '1px solid var(--border)', borderLeft: '3px solid var(--accent)', borderRadius: 8, padding: '20px 22px' };

  return (
    <>
      {/* Hero -- the shared full-bleed GameHero (dmz.hero in lib/games/dmz.js), outside <main> so it spans
          the viewport. Breadcrumb, derived status badge, H1 "MW4 DMZ" and the tagline intro come from config --
          the same contents as the Wardogs hero. The countdown, notify form and naming line sit just BELOW it. */}
      <GameHero hero={buildHeroProps(dmz)} />

    <main className={exo2.variable} style={{ maxWidth: 1100, margin: '0 auto', padding: '34px 16px 96px' }}>
      {hubLd.map((ld, i) => (
        <script key={'hubld-' + i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(ld) }} />
      ))}
      {/* Countdown + notify + naming line -- directly BELOW the hero, at the top of the main column (moved
          out of the GameHero slot 2026-10-02 so the hero matches Wardogs in height). Content WORD FOR WORD. */}
      <div style={{ marginBottom: 34 }}>
        {/* EARLY ACCESS NOTE -- one static line of hero-area body copy (dmz.earlyAccessNote). Shown at all
            times: it is never compared with the clock, so it makes no live/started claim. */}
        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.55, margin: '0 0 14px', maxWidth: 760 }}>
          {dmz.earlyAccessNote}{' '}
          <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-tertiary)' }}>(Source: {dmz.earlyAccessNoteSource}.)</span>
        </p>
        {/* ══ OPERATION CLOCK -- the countdown centerpiece. Orange (--accent) is the
            brand accent; the green "Countdown Active" dot + "Live" are FUNCTIONAL
            go-signals. daysToLaunch is server-computed (SSR). The launch-date callout
            copy and the naming line below are PRESERVED VERBATIM, re-parented here. */}
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)', borderLeft: '3px solid var(--accent)',
          borderRadius: 8, padding: '20px 22px',
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 12, fontWeight: 800, letterSpacing: 2, color: 'var(--accent)', textTransform: 'uppercase' }}>Operation Hajin</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)' }} />
              <span style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, letterSpacing: 1.5, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>{dmzLive ? 'Live Now' : 'Countdown Active'}</span>
            </span>
          </div>
          {/* T-minus + meta */}
          <div style={{ display: 'flex', gap: 30, flexWrap: 'wrap', alignItems: 'center' }}>
            {dmzLive ? (
              <div style={{ flexShrink: 0 }}>
                <div style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, letterSpacing: 2, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 2 }}>Status</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 44, fontWeight: 900, lineHeight: 1, color: 'var(--green)', letterSpacing: 1 }}>LIVE</span>
                  <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, letterSpacing: 2, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>In DMZ</span>
                </div>
              </div>
            ) : (
              <div style={{ flexShrink: 0 }}>
                {/* Day 0 (the launch date has passed in UTC) but not live yet (launch_at not reached, status not
                    'live'): never "T-Minus 0 Days" -- name the launch date instead (Brief 100, R4 option b). */}
                {daysToLaunch > 0 ? (
                  <>
                    <div style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, letterSpacing: 2, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 2 }}>T-Minus</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                      <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 56, fontWeight: 900, lineHeight: 1, color: 'var(--accent)', letterSpacing: 1 }}>{daysToLaunch}</span>
                      <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, letterSpacing: 2, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Days</span>
                    </div>
                  </>
                ) : (
                  <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 28, fontWeight: 900, lineHeight: 1.1, color: 'var(--accent)', letterSpacing: 1 }}>{'Launches ' + launchMonthDay}</div>
                )}
                {dmzEA && <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)', marginTop: 6 }}>{'Early Access from ' + dmzEA.long}</div>}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, minWidth: 210 }}>
              {[['Drop Date', launchLong.toUpperCase()], ['Zone', 'Hajin Exclusion'], ['Mode', 'Extraction']].map(function (r) {
                return (
                  <div key={r[0]} style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, letterSpacing: 1.5, color: 'var(--text-tertiary)', textTransform: 'uppercase', width: 74, flexShrink: 0 }}>{r[0]}</span>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)' }}>{r[1]}</span>
                  </div>
                );
              })}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                <span style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, letterSpacing: 1.5, color: 'var(--text-tertiary)', textTransform: 'uppercase', width: 74, flexShrink: 0 }}>Intel</span>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)' }}>
                  <span style={{ color: 'var(--green)', fontWeight: 700 }}>Live</span> &middot; {briefingCount} {briefingCount === 1 ? 'Briefing' : 'Briefings'}
                </span>
              </div>
            </div>
          </div>
          {/* Launch-date callout -- COPY PRESERVED VERBATIM, re-parented into the clock. */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            <span style={{ fontFamily: EXO, fontSize: 15, fontWeight: 700, color: '#fff' }}>{dmzLive ? 'DMZ is live now' : 'DMZ launches October 23, 2026'}</span>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{dmzLive ? '- the hub is live.' : <>&mdash; the hub is already standing by.</>}</span>
          </div>
          {/* Early Access line (official dates from lib/dmz/hubCopy.js), pre-launch only: it goes on the same
              live flip as the countdown so it never reads stale after launch. */}
          {!dmzLive && <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, margin: '10px 0 0' }}>{DMZ_EARLY_ACCESS_LINE}</p>}
          {/* Notify on Deployment -- the payoff. REUSES the existing DmzNotifyBlock (not rebuilt). Pre-launch
              only (showLaunchNotify): the whole wrapper -- label, margin and block -- is gated, so nothing is
              left behind once DMZ is live. */}
          {showLaunchNotify(dmz) && (
            <div style={{ marginTop: 18 }}>
              <div style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, letterSpacing: 2, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 10 }}>Notify on Deployment</div>
              <DmzNotifyBlock />
            </div>
          )}
        </div>

        {/* NAMING LINE. Uses the searcher's term ("DMZ 2", the highest-volume live
            query) in visible body copy and corrects it in the same sentence, so the
            page ranks for the phrase without asserting a name that is not official.
            Held as a constant so the copy has one source, like the FAQ strings. */}
        <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: '14px 0 0', maxWidth: 600, lineHeight: 1.6 }}>
          {DMZ_NAMING_LINE}
        </p>
      </div>

      {/* WHAT'S CONFIRMED -- quick facts from dmz.confirmedFacts (lib/games/dmz.js): only facts this repo
          already sources, each naming its official post (the post names link via SourcedText). */}
      <section aria-labelledby="dmz-confirmed-heading" style={{ marginBottom: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0 16px' }}>
          <span style={sectionMark} />
          <h2 id="dmz-confirmed-heading" style={{ fontFamily: EXO, fontSize: 13, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-tertiary)', margin: 0 }}>{facts.heading}</h2>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderLeft: '3px solid var(--accent)', borderRadius: 8, padding: '18px 22px', maxWidth: 760 }}>
          <dl style={{ margin: 0, display: 'grid', gap: 12 }}>
            {facts.items.map(function (f) {
              return (
                <div key={f.label}>
                  <dt style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 3 }}>{f.label}</dt>
                  <dd style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    {f.text}{' '}
                    <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>(Source: <SourcedText text={f.source} linkStyle={faqLinkStyle} />.)</span>
                  </dd>
                </div>
              );
            })}
          </dl>
          <p style={{ margin: '14px 0 0', paddingTop: 12, borderTop: '1px solid var(--border)', fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            <SourcedText text={facts.closing.text} linkStyle={faqLinkStyle} />{' '}
            <Link href={facts.closing.href} style={faqLinkStyle}>{facts.closing.label}</Link>.
          </p>
        </div>
      </section>

      {/* Dossier card hover -- orange border + elevated bg on the LINK cards only. SSR-safe
          (a static <style>, same pattern as /marathon). Non-link tiles never get it. */}
      <style>{`
        .dmz-dossier { transition: border-color .14s ease, background .14s ease; }
        .dmz-dossier:hover { border-color: var(--accent); background: var(--bg-card-hover); }
        .dmz-dossier .dmz-card-title { transition: color .14s ease; }
        .dmz-dossier:hover .dmz-card-title { color: var(--accent) !important; }
      `}</style>

      {/* Coverage */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0 16px' }}>
        <h2 style={{ fontFamily: EXO, fontSize: 13, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-tertiary)', margin: 0 }}>Coverage</h2>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      </div>

      {/* Only tiles whose page has content (tiles.live). Today: 5 sections + Locations = 6 -> 3/3 at three
          columns, 2/2/2 at two, no empty cell. */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 14 }}>
        {tiles.live.map(function (t, i) {
          // Dossier file-code: 2-letter slug/key prefix + zero-padded position. PRESENTATION ONLY.
          var code = t.key.replace(/[^a-z]/gi, '').slice(0, 2).toUpperCase() + '-' + String(i + 1).padStart(2, '0');
          if (t.kind === 'route') return <RouteCard key={t.key} route={t.route} code={code} />;
          // Sections (editor, the tag-mapped Discourse, or a standalone reference) via the shared resolver.
          return <CountCard key={t.key} section={t.section} count={t.count} code={code} />;
        })}
      </div>

      {/* All DMZ coverage: direct hub -> article links (dofollow; FAQ-linked fob/printer/hajin
          excluded to avoid duplicates; hidden when empty). */}
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

      {/* ══ COMING AFTER LAUNCH -- every tile whose page has no content yet (tiles.later: sections with no
          articles, hubs with no rows), plus Factions (unconfirmed) and the planned tools. Quieter than
          Coverage on purpose; no counts, no decorative previews, no tier claims. A tile moves up to
          Coverage on its own once its page has content (lib/dmz/hubTiles.js). Links only where a route
          exists, so the noindex,follow hubs stay in the crawl graph. ══ */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '44px 0 16px', flexWrap: 'wrap' }}>
        <h2 style={{ fontFamily: EXO, fontSize: 13, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-tertiary)', margin: 0 }}>Coming after launch</h2>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        <span style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, letterSpacing: 1, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>{PLANNED_TOOLS_NOTE}</span>
      </div>
      <div style={laterRow}>
        {tiles.later.map(function (t) {
          if (t.kind === 'route') return <LaterTile key={t.key} name={t.route.label} desc={t.route.desc} href={t.route.href} />;
          // Meta keeps its honest status label (META_CARD_BADGE, the same before and after launch).
          return <LaterTile key={t.key} name={t.section.label} desc={t.section.description} href={'/dmz/' + t.section.slug} badge={t.section.slug === 'meta' ? <Pill text={META_CARD_BADGE} tone="muted" /> : null} />;
        })}
        {/* Factions: informational only, not a section/route (non-linking, never a 404). */}
        <LaterTile name="Factions" desc="Whether DMZ supports a faction system is still unconfirmed." />
        {/* Planned tools: no route yet (non-linking). Names from committed demand. */}
        <LaterTile name="DMZ Gunsmith" desc="Loadout builder + run advisor" badge={<span style={laterBadge}>{PLANNED_TOOL_LABEL}</span>} />
        <LaterTile name="Best Loadouts" desc="Community + desk-vetted loadouts" badge={<span style={laterBadge}>{PLANNED_TOOL_LABEL}</span>} />
        <LaterTile name="Best Weapons" desc="Tier rankings, once there is real match data" badge={<span style={laterBadge}>{PLANNED_TOOL_LABEL}</span>} />
        {/* Trait Planner -- live route, work in progress (literal badge; PLANNED_TOOL_LABEL means "no route
            yet"). Last in the row. Its noindex gate is the deliberate dmz.traitPlanner.indexable flag, not a
            row count, so it stays here until that flag is flipped in its own commit. */}
        <Link href="/dmz/traits" className="dmz-dossier" style={laterTile}>
          <div style={laterHead}>
            <span style={laterName}>Trait Planner</span>
            <span style={laterBadge}>Work in progress</span>
          </div>
          <span style={laterDesc}>Per-Operator trait trees</span>
        </Link>
      </div>

      {/* ══ 02 THE DESK -- how the intel is made. Function-forward; editors as bylines,
          not a persona lineup. NET-NEW, non-ranking. AI-assisted stated plainly. ══ */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '44px 0 16px', flexWrap: 'wrap' }}>
        <h2 style={{ fontFamily: EXO, fontSize: 13, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-tertiary)', margin: 0 }}>
          <span style={{ color: 'var(--accent)', marginRight: 8 }}>02</span>How the Intel Is Made
        </h2>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        <span style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, letterSpacing: 1, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Method</span>
      </div>
      <div style={{ display: 'grid', gap: 14, maxWidth: 680 }}>
        <h3 style={{ fontFamily: EXO, fontSize: 21, fontWeight: 700, color: '#fff', margin: 0, lineHeight: 1.3, letterSpacing: 0.2 }}>Written, cross-checked, sourced</h3>
        <p style={{ fontSize: 14.5, color: 'var(--text-secondary)', lineHeight: 1.65, margin: 0 }}>Every briefing is traced to primary material - the official Deep Dive, patch notes, first-party reveals - before it publishes.</p>
        <p style={{ fontSize: 14.5, color: 'var(--text-secondary)', lineHeight: 1.65, margin: 0 }}>Coverage is produced by our editorial desk and verified against primary sources. Nothing is invented; where the record is unconfirmed, we say so. The desk carries distinct roles - meta, analysis, builds, community, field guide - and signs its work.</p>
      </div>

      {/* MW4 DMZ vs Warzone -- PROSE, deliberately asymmetric. Targets "dmz vs
          warzone" (170/mo). No card grid: a two-column layout would imply a
          DMZ/Warzone information balance we do not have. Copy is constrained to the
          official Deep Dive (scripts/gen-dmz-news.mjs) -- no Warzone specifics beyond
          the battle-royale category, no MW4 balance/TTK, no map-size or squad claims,
          no 2022-mode continuity. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '44px 0 16px' }}>
        <span style={sectionMark} />
        <h2 style={{ fontFamily: EXO, fontSize: 13, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-tertiary)', margin: 0 }}>MW4 DMZ vs Warzone</h2>
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
        <h2 style={{ fontFamily: EXO, fontSize: 13, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-tertiary)', margin: 0 }}>{FAQ_BACK_Q}</h2>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      </div>
      <div style={prosePanel}>
        <p style={{ fontSize: 14.5, color: 'var(--text-secondary)', lineHeight: 1.65, margin: 0 }}><SourcedText text={FAQ_BACK_A} linkStyle={faqLinkStyle} /></p>
      </div>

      {/* FAQ -- source-backed (launch date / map / mode / confirmed-so-far).
          Launch date is now sourced (see HANDOFF). */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '44px 0 18px' }}>
        <span style={sectionMark} />
        <h2 style={{ fontFamily: EXO, fontSize: 13, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-tertiary)', margin: 0 }}>Common questions</h2>
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

      {/* SOURCES -- the official posts the hub copy and FAQ draw on (HUB_SOURCES, lib/dmz/hubCopy.js).
          External links open in a new tab, as on the DMZ article pages. No claims in this block. */}
      <section aria-labelledby="dmz-sources-heading">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '44px 0 14px' }}>
          <span style={sectionMark} />
          <h2 id="dmz-sources-heading" style={{ fontFamily: EXO, fontSize: 13, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-tertiary)', margin: 0 }}>Sources</h2>
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
    </main>
    </>
  );
}
