// app/dmz/page.js
// DMZ landing -- the per-game hub. Forest/Exo-2 visual language matching the
// article-detail template. Config-driven coverage cards (lib/games/dmz.js) with
// REAL article counts from feed_items; the ONLY non-data-bound element is the Meta
// card's decorative skeleton table (see MetaCard).
//
// Server component + a Supabase read for live counts -> force-dynamic. Reads via
// the lazy anon Proxy (no module-scope createClient).
//
// ROBOTS: gated in app/dmz/layout.js on dmz.indexable (index vs noindex,follow).
// This page sets NO robots of its own -> inherits that gate. (Do not add robots.)

import Link from 'next/link';
import { Exo_2 } from 'next/font/google';
import { supabase } from '@/lib/supabase';
import { dmz, dmzArticleSlugsForSection } from '@/lib/games/dmz';
import DmzNotifyBlock from '@/components/dmz/DmzNotifyBlock';

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
  // `absolute` drops the root '%s | CyberneticPunks' suffix: with it this title
  // rendered at 75 chars, over the SERP limit. This page exists to compete for
  // "dmz 2 release date" (630/mo), so brand framing earns nothing here.
  // (openGraph/twitter titles below are set explicitly, not templated -- kept in
  // sync with this metadata title.)
  title: { absolute: 'MW4 DMZ Release Date: October 23, 2026 (Modern Warfare 4)' },
  description: 'DMZ releases October 23, 2026 with Call of Duty: Modern Warfare 4. Confirmed intel on the Hajin Exclusion Zone, the FOB, and 3D Printer crafting.',
  keywords: ['DMZ', 'DMZ Modern Warfare 4', 'MW4 DMZ', 'Call of Duty DMZ', 'DMZ extraction zone', 'DMZ Hajin', 'DMZ FOB', 'DMZ crafting', 'DMZ loadouts', 'DMZ guide'],
  alternates: { canonical: 'https://cyberneticpunks.com/dmz' },
  // og/twitter mirror the meta title+description above. They previously carried the
  // old "Extraction Intelligence Hub" positioning, so a search result led with the
  // release date while the social card led with brand copy. Same string, one message.
  openGraph: {
    title: 'MW4 DMZ Release Date: October 23, 2026 (Modern Warfare 4)',
    description: 'DMZ releases October 23, 2026 with Call of Duty: Modern Warfare 4. Confirmed intel on the Hajin Exclusion Zone, the FOB, and 3D Printer crafting.',
    url: 'https://cyberneticpunks.com/dmz',
    siteName: 'CyberneticPunks',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    site: '@Cybernetic87250',
    title: 'MW4 DMZ Release Date: October 23, 2026 (Modern Warfare 4)',
    description: 'DMZ releases October 23, 2026 with Call of Duty: Modern Warfare 4. Confirmed intel on the Hajin Exclusion Zone, the FOB, and 3D Printer crafting.',
  },
};

// Set of currently-published game_slug='dmz' article slugs -> drives REAL per-section
// counts (an assigned-but-unpublished slug correctly does not count).
async function publishedDmzSlugs() {
  try {
    var { data } = await supabase
      .from('feed_items')
      .select('slug')
      .eq('game_slug', 'dmz')
      .eq('is_published', true);
    return new Set((data || []).map(function (r) { return r.slug; }));
  } catch (err) {
    return new Set();
  }
}

function sectionCount(slug, publishedSet) {
  return dmzArticleSlugsForSection(slug).filter(function (s) { return publishedSet.has(s); }).length;
}

// Published DMZ discourse count (tag-based -- the Discourse section maps by tag,
// not the per-slug DMZ_ARTICLE_SECTION map, so sectionCount would miss it).
async function discourseCount() {
  try {
    var { count } = await supabase
      .from('feed_items')
      .select('id', { count: 'exact', head: true })
      .eq('game_slug', 'dmz')
      .eq('is_published', true)
      .contains('tags', ['discourse']);
    return typeof count === 'number' ? count : 0;
  } catch (err) {
    return 0;
  }
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

// Dossier card: tactical near-black panel; orange border on hover (LINK cards only,
// via the .dmz-dossier rule in the page <style>). No padding here -- DossierHead +
// CardBody supply their own.
var cardBase = {
  display: 'flex', flexDirection: 'column',
  background: 'var(--bg-card)', border: '1px solid var(--border)',
  borderRadius: 6, textDecoration: 'none', minHeight: 132, overflow: 'hidden',
};

// Operations Deck (Stage 4) -- NET-NEW, non-ranking "coming at launch" tool cards.
// Non-linking pre-launch (the tools are launch-gated). Orange primary accent.
var opsCard = { display: 'flex', flexDirection: 'column', gap: 8, background: 'var(--bg-card)', border: '1px solid var(--border)', borderTop: '2px solid var(--accent)', borderRadius: 6, padding: '16px 18px', minHeight: 200 };
var opsHead = { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 };
var opsName = { fontFamily: 'Orbitron, monospace', fontSize: 17, fontWeight: 900, color: 'var(--accent)', letterSpacing: 0.5, lineHeight: 1 };
// "Live at launch" -- a TRUE status label (bordered orange-dim), not a dimmed card.
var liveAtLaunch = { flexShrink: 0, fontFamily: 'monospace', fontSize: 8, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--accent-dim)', border: '1px solid var(--accent-dim)', borderRadius: 2, padding: '2px 7px', whiteSpace: 'nowrap' };
var opsTagline = { fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, lineHeight: 1.4 };
var opsPreview = { fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.55, margin: 0 };
var opsQuote = { fontFamily: EXO, fontSize: 13, fontWeight: 600, color: '#fff', borderLeft: '2px solid var(--accent)', paddingLeft: 10, lineHeight: 1.4 };
var opsFooter = { marginTop: 'auto', paddingTop: 10, borderTop: '1px solid var(--border)', fontFamily: 'monospace', fontSize: 9, fontWeight: 700, letterSpacing: 1, color: 'var(--text-tertiary)', textTransform: 'uppercase' };

function CardShell({ children, href }) {
  if (href) return <Link href={href} className="dmz-dossier" style={cardBase}>{children}</Link>;
  return <div style={cardBase}>{children}</div>;
}

// File-code + status-flag header strip (e.g. FI-01 / ... / LIVE).
function DossierHead({ code, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '8px 14px', background: 'var(--bg-nav)', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, letterSpacing: 2, color: 'var(--text-tertiary)' }}>{code}</span>
      {children}
    </div>
  );
}

function CardBody({ children }) {
  return <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>{children}</div>;
}

function CardTitle({ children }) {
  return <span style={{ fontFamily: EXO, fontSize: 17, fontWeight: 700, color: '#fff', letterSpacing: 0.2 }}>{children}</span>;
}
function CardDesc({ children }) {
  return <span style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.55 }}>{children}</span>;
}

// Editor-fed section with REAL article count. count>0 -> LIVE + "{n} report(s)";
// count===0 -> neutral "Publishing soon" (never claims LIVE with nothing there).
function CountCard({ section, count, code }) {
  var live = count > 0;
  return (
    <CardShell href={'/dmz/' + section.slug}>
      <DossierHead code={code}><Pill text={live ? 'Live' : 'Soon'} tone={live ? 'live' : 'muted'} /></DossierHead>
      <CardBody>
        <CardTitle>{section.label}</CardTitle>
        <CardDesc>{section.description}</CardDesc>
        <span style={{ marginTop: 'auto', fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: live ? 'var(--green)' : 'var(--text-tertiary)' }}>
          {live ? (count + (count === 1 ? ' report' : ' reports')) : 'Publishing soon'}
        </span>
      </CardBody>
    </CardShell>
  );
}

// Data-fed "coming soon" shell card (3D Printer / FOB / Hajin Regions).
function SoonCard({ section, code }) {
  return (
    <CardShell href={'/dmz/' + section.slug}>
      <DossierHead code={code}><Pill text="Soon" tone="muted" /></DossierHead>
      <CardBody>
        <CardTitle>{section.label}</CardTitle>
        <CardDesc>{section.description}</CardDesc>
        <span style={{ marginTop: 'auto', fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: 'var(--text-tertiary)' }}>
          Launches with the zone
        </span>
      </CardBody>
    </CardShell>
  );
}

// META card -- special. Tag "ACTIVATES AT LAUNCH" + a STATIC decorative skeleton
// table previewing the product shape (# / Weapon / Tier / Score). The rows are
// INTENTIONALLY non-functional placeholders -- NOT a data binding, nothing to wire.
// Real meta data only exists once DMZ ships and matches are played.
function MetaCard({ section, code }) {
  var cols = ['#', 'Weapon', 'Tier', 'Score'];
  var rows = [0, 1, 2, 3];
  return (
    <CardShell href={'/dmz/' + section.slug}>
      <DossierHead code={code}><Pill text="Activates at launch" tone="muted" /></DossierHead>
      <CardBody>
        <CardTitle>{section.label}</CardTitle>
        <CardDesc>{section.description}</CardDesc>
        {/* DECORATIVE skeleton -- static placeholder UI, no data. Do not "fix" or wire. */}
        <div aria-hidden="true" style={{ marginTop: 4, border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '22px 1fr 38px 42px', gap: 8, padding: '7px 10px', background: 'var(--bg-card-hover)', borderBottom: '1px solid var(--border)' }}>
            {cols.map(function (c) {
              return <span key={c} style={{ fontFamily: EXO, fontSize: 8.5, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>{c}</span>;
            })}
          </div>
          {rows.map(function (r) {
            return (
              <div key={r} style={{ display: 'grid', gridTemplateColumns: '22px 1fr 38px 42px', gap: 8, alignItems: 'center', padding: '7px 10px', borderBottom: r === rows.length - 1 ? 'none' : '1px solid var(--border-subtle)' }}>
                <span style={{ height: 7, borderRadius: 2, background: 'rgba(255,255,255,0.07)' }} />
                <span style={{ height: 7, borderRadius: 2, background: 'rgba(255,255,255,0.07)', width: (78 - r * 12) + '%' }} />
                <span style={{ height: 7, borderRadius: 2, background: 'rgba(255,106,31,0.18)' }} />
                <span style={{ height: 7, borderRadius: 2, background: 'rgba(255,255,255,0.05)' }} />
              </div>
            );
          })}
        </div>
      </CardBody>
    </CardShell>
  );
}

// FACTIONS -- NOT a config section / route (so this is a static, non-linking card,
// never a 404 link). Honest "unconfirmed" state.
function FactionsCard({ code }) {
  return (
    <CardShell>
      <DossierHead code={code}><Pill text="TBD" tone="muted" /></DossierHead>
      <CardBody>
        <CardTitle>Factions</CardTitle>
        <CardDesc>Whether DMZ supports a faction system is still unconfirmed.</CardDesc>
      </CardBody>
    </CardShell>
  );
}

export default async function DmzLanding() {
  var [published, dCount] = await Promise.all([publishedDmzSlugs(), discourseCount()]);

  // Countdown to launch -- computed SERVER-SIDE. The page is force-dynamic, so this
  // evaluates per request and the day number lands in the initial HTML (crawlable,
  // renders with JS disabled). No client tick -- the SSR day count is the truth.
  var daysToLaunch = Math.ceil((Date.UTC(2026, 9, 23) - Date.now()) / 86400000);
  var briefingCount = published.size; // published DMZ articles = live briefings

  // Source-independent structured data for the hub. BreadcrumbList: Network -> DMZ
  // (DMZ is the current page, so it is the leaf with no `item`). The visible
  // Network / DMZ breadcrumb at the top of <main> mirrors this exactly (same labels,
  // same order) -- the structured-only gap is closed. CollectionPage describes the hub
  // as its coverage sections (from dmz.sections, never a hardcoded list) -> tracks config.
  var HUB_BASE = 'https://cyberneticpunks.com';
  var DMZ_NAMING_LINE = 'Often searched as "DMZ 2". The official name is DMZ, the extraction mode in Call of Duty: Modern Warfare 4, and it arrives October 23, 2026.';
  var hubBreadcrumbLd = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Network', item: HUB_BASE + '/' },
      { '@type': 'ListItem', position: 2, name: 'DMZ' },
    ],
  };
  var hubCollectionLd = {
    '@context': 'https://schema.org', '@type': 'CollectionPage',
    name: 'DMZ - Extraction Intelligence Hub',
    description: 'Field intel, meta, loadouts, crafting, FOB progression, and region guides for Call of Duty Modern Warfare 4 DMZ.',
    url: HUB_BASE + '/dmz',
    isPartOf: { '@type': 'WebSite', name: 'CyberneticPunks', url: HUB_BASE },
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: dmz.sections.map(function (sec, i) {
        return { '@type': 'ListItem', position: i + 1, name: sec.label, url: HUB_BASE + '/dmz/' + sec.slug };
      }),
    },
  };

  // ---- Hub FAQ (source-backed). Four Q&As: launch date / map / mode / confirmed-so-far.
  // ("Is DMZ coming back?" is promoted to its own h2 section above; FAQ_BACK_Q/A render there.)
  // Answers are VERBATIM. The launch DATE is now sourced (verified-official CoD MW4
  // announcement -- MW4 releases Oct 23 2026, DMZ ships with it; see docs/HANDOFF.md),
  // so it LEADS the list; the other three are Deep-Dive-backed. ----
  var FAQ_ARTICLES = {
    fob:     { href: '/dmz/fob/dmz-forward-operating-base-every-hub-system-detailed', label: 'the Forward Operating Base' },
    printer: { href: '/dmz/loadouts/dmz-3d-printer-crafting-system-every-category-detailed', label: 'the 3D Printer crafting system' },
    hajin:   { href: '/dmz/regions/dmz-hajin-exclusion-zone-what-the-deep-dive-reveals', label: 'the Hajin Exclusion Zone' },
  };
  // Q PHRASING follows the searcher, not our internal vocabulary: "release date" and
  // "coming back" are the live high-volume terms. The ANSWERS stay strictly inside
  // the confirmed sources (the May 28 CoD announcement for the date, the June Deep
  // Dive for everything else).
  var FAQ_LAUNCH_Q = 'What is the DMZ 2 release date?';
  var FAQ_LAUNCH_A = 'DMZ comes out on October 23, 2026. Many players search for it as "DMZ 2", but the official name is simply DMZ: the extraction mode shipping inside Call of Duty: Modern Warfare 4. The date is confirmed by the official Call of Duty announcement, which states Modern Warfare 4 releases Friday, October 23, 2026, and DMZ ships as part of the game.';
  // HONESTY-CRITICAL. The query "is dmz coming back" PRESUPPOSES a link to the 2022
  // Modern Warfare II DMZ. No source confirms that relationship, so the answer says
  // YES to what IS confirmed (MW4 has a mode called DMZ, dated, Deep-Dive detailed)
  // and marks the presupposition as unconfirmed rather than quietly implying
  // continuity. Do NOT "improve" this into a claim that DMZ is a sequel or revival.
  var FAQ_BACK_Q = 'Is DMZ coming back?';
  var FAQ_BACK_A = 'Yes. Call of Duty: Modern Warfare 4 includes a mode called DMZ, launching October 23, 2026, and Activision has detailed it in an official Deep Dive. What has not been confirmed is how it relates to the original DMZ from Modern Warfare II, including whether progression, factions, or any other systems carry over.';
  var FAQ_MAP_Q = 'Where is DMZ set?';
  var FAQ_MAP_A = 'DMZ is set in the Hajin Exclusion Zone, a contested area on the Korean peninsula left saturated with abandoned military technology after the events of the Modern Warfare 4 campaign.';
  var FAQ_MODE_Q = 'What is DMZ in Call of Duty?';
  var FAQ_MODE_A = "DMZ is a mode within Call of Duty: Modern Warfare 4. The official Deep Dive frames it around extraction operations: squads deploy into the Hajin Exclusion Zone behind enemy lines and 'loot, fight, negotiate, betray, and extract whatever you can carry,' with both rival Operators and enemy combatants active throughout the zone.";
  var FAQ_CONFIRMED_Q = 'What has been officially confirmed about DMZ so far?';
  var FAQ_CONFIRMED_PRE = 'Three areas have been covered in depth so far, each drawn from the official Deep Dive: ';
  var FAQ_CONFIRMED_MID1 = ' (the between-deployments hub), ';
  var FAQ_CONFIRMED_MID2 = ', and ';
  var FAQ_CONFIRMED_MID3 = ' (the setting)';
  var FAQ_CONFIRMED_SUF = '. More coverage follows as official details are confirmed.';
  var faqLinkStyle = { color: 'var(--green)', textDecoration: 'underline', textUnderlineOffset: 2, fontWeight: 600 };
  var faqQStyle = { fontFamily: EXO, fontSize: 16, fontWeight: 700, color: '#fff', margin: '0 0 7px' };
  var faqAStyle = { fontSize: 14.5, color: 'var(--text-secondary)', lineHeight: 1.65, margin: 0, maxWidth: 680 };

  return (
    <main className={exo2.variable} style={{ maxWidth: 1100, margin: '0 auto', padding: '52px 16px 96px' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(hubBreadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(hubCollectionLd) }} />
      {/* Dossier card hover -- orange border + elevated bg on the LINK cards only. SSR-safe
          (a static <style>, same pattern as /marathon). Non-link cards (Factions) never get it. */}
      <style>{`
        .dmz-dossier { transition: border-color .14s ease, background .14s ease; }
        .dmz-dossier:hover { border-color: var(--accent); background: var(--bg-card-hover); }
      `}</style>
      {/* Breadcrumb: Network / DMZ -- mirrors the BreadcrumbList JSON-LD above and the
          section pages' visible breadcrumb style. DMZ is the current page (styled as
          current, not a link). */}
      <nav aria-label="Breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, fontSize: 10, letterSpacing: 1.5, fontFamily: 'monospace', fontWeight: 700, flexWrap: 'wrap' }}>
        <Link href="/" style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}>Network</Link>
        <span style={{ color: 'var(--text-tertiary)', opacity: 0.4 }}>/</span>
        <span style={{ color: 'var(--text-secondary)' }}>DMZ</span>
      </nav>
      {/* Hero */}
      <div style={{ marginBottom: 34 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: EXO, fontSize: 11, fontWeight: 800, letterSpacing: 1,
            color: 'var(--accent)', border: '1px solid var(--accent)', borderRadius: 6, padding: '3px 7px',
          }}>CNP</span>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 3, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
            Cybernetic Punks Network
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 14 }}>
          <h1 style={{ fontFamily: EXO, fontSize: 46, fontWeight: 800, letterSpacing: 1, color: '#fff', margin: 0, lineHeight: 1 }}>MW4 DMZ</h1>
          <Pill text="Pre-launch" tone="muted" />
        </div>
        <p style={{ fontSize: 15, color: 'var(--text-secondary)', margin: '0 0 22px', maxWidth: 600, lineHeight: 1.6 }}>
          {dmz.tagline}. Confirmed coverage of Modern Warfare 4&apos;s extraction mode &mdash; setting, systems, and field intel &mdash; with structured tools landing as the zone goes live.
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
              <span style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, letterSpacing: 1.5, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Countdown Active</span>
            </span>
          </div>
          {/* T-minus + meta */}
          <div style={{ display: 'flex', gap: 30, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ flexShrink: 0 }}>
              <div style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, letterSpacing: 2, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 2 }}>T-Minus</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 56, fontWeight: 900, lineHeight: 1, color: 'var(--accent)', letterSpacing: 1 }}>{daysToLaunch}</span>
                <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, letterSpacing: 2, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Days</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, minWidth: 210 }}>
              {[['Drop Date', '23 OCT 2026'], ['Zone', 'Hajin Exclusion'], ['Mode', 'Extraction']].map(function (r) {
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
            <span style={{ fontFamily: EXO, fontSize: 15, fontWeight: 700, color: '#fff' }}>DMZ launches October 23, 2026</span>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>&mdash; the hub is already standing by.</span>
          </div>
          {/* Notify on Deployment -- the payoff. REUSES the existing DmzNotifyBlock (not rebuilt). */}
          <div style={{ marginTop: 18 }}>
            <div style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, letterSpacing: 2, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 10 }}>Notify on Deployment</div>
            <DmzNotifyBlock />
          </div>
        </div>

        {/* NAMING LINE. Uses the searcher's term ("DMZ 2", the highest-volume live
            query) in visible body copy and corrects it in the same sentence, so the
            page ranks for the phrase without asserting a name that is not official.
            Held as a constant so the copy has one source, like the FAQ strings. */}
        <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: '14px 0 0', maxWidth: 600, lineHeight: 1.6 }}>
          {DMZ_NAMING_LINE}
        </p>
      </div>

      {/* Coverage */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0 16px' }}>
        <h2 style={{ fontFamily: EXO, fontSize: 13, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-tertiary)', margin: 0 }}>Coverage</h2>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 14 }}>
        {dmz.sections.map(function (sec, i) {
          // Dossier file-code: 2-letter slug prefix + zero-padded position. PRESENTATION
          // ONLY -- the href ('/dmz/' + sec.slug) and the counts below are unchanged.
          var code = sec.slug.replace(/[^a-z]/gi, '').slice(0, 2).toUpperCase() + '-' + String(i + 1).padStart(2, '0');
          if (sec.slug === 'meta') return <MetaCard key={sec.slug} section={sec} code={code} />;
          // Discourse: tag-based count (not the per-slug map).
          if (sec.contentFilter && sec.contentFilter.byTag === 'discourse') return <CountCard key={sec.slug} section={sec} count={dCount} code={code} />;
          if (sec.source === 'editor') return <CountCard key={sec.slug} section={sec} count={sectionCount(sec.slug, published)} code={code} />;
          return <SoonCard key={sec.slug} section={sec} code={code} />;
        })}
        {/* Factions: informational only, not a section/route. */}
        <FactionsCard code={'FA-' + String(dmz.sections.length + 1).padStart(2, '0')} />
      </div>

      {/* ══ 02 OPERATIONS DECK -- NET-NEW, non-ranking. Pre-launch "coming at launch"
          tool cards; previews are ILLUSTRATIVE placeholders ([weapon], sample rows),
          NOT real data -- the "Live at launch" badge keeps that honest. Card NAMES are
          from committed demand (dmz gunsmith / best loadout / best weapon). Non-linking
          pre-launch (the tools are launch-gated -- no route to 404 into). Does NOT
          replace Coverage above. ══ */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '44px 0 16px', flexWrap: 'wrap' }}>
        <span style={{ fontFamily: EXO, fontSize: 13, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
          <span style={{ color: 'var(--accent)', marginRight: 8 }}>02</span>Operations Deck
        </span>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        <span style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, letterSpacing: 1, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Tools go live with the zone</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
        {/* 1. DMZ Gunsmith -- the risk/reward differentiator */}
        <div style={opsCard}>
          <div style={opsHead}>
            <span style={opsName}>DMZ Gunsmith</span>
            <span style={liveAtLaunch}>Live at launch</span>
          </div>
          <span style={opsTagline}>Loadout builder + run advisor</span>
          <p style={opsPreview}>Tell it your goal and solo/squad. It returns the loadout that fits the run - and flags what you&apos;re over-bringing.</p>
          <div style={opsQuote}>&ldquo;Could I risk less and still extract?&rdquo;</div>
          <div style={opsFooter}>Risk / reward engine</div>
        </div>
        {/* 2. Best Loadouts */}
        <div style={opsCard}>
          <div style={opsHead}>
            <span style={opsName}>Best Loadouts</span>
            <span style={liveAtLaunch}>Live at launch</span>
          </div>
          <span style={opsTagline}>Community + desk-vetted loadouts</span>
          <p style={opsPreview}>Save, share, and browse working loadouts by goal - deep-linked from every weapon briefing.</p>
          <div style={{ flex: 1 }} />
          <div style={opsFooter}>Saved builds</div>
        </div>
        {/* 3. Best Weapons -- alive + shareable. Tier preview is ILLUSTRATIVE (placeholders). */}
        <div style={opsCard}>
          <div style={opsHead}>
            <span style={opsName}>Best Weapons</span>
            <span style={liveAtLaunch}>Live at launch</span>
          </div>
          <span style={opsTagline}>Live rankings, moved by the desk</span>
          <div aria-hidden="true" style={{ display: 'flex', flexDirection: 'column', gap: 4, margin: '2px 0' }}>
            {[['S', 'up'], ['S', 'same'], ['A', 'down']].map(function (row, i) {
              var mark = row[1] === 'up' ? '▲' : row[1] === 'down' ? '▼' : '-';
              var mc = row[1] === 'up' ? 'var(--green)' : row[1] === 'down' ? 'var(--red)' : 'var(--text-tertiary)';
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', background: 'var(--bg-nav)', border: '1px solid var(--border)', borderRadius: 3 }}>
                  <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 10, fontWeight: 900, color: 'var(--accent)', width: 14 }}>{row[0]}</span>
                  <span style={{ flex: 1, fontFamily: 'monospace', fontSize: 10, color: 'var(--text-secondary)' }}>[weapon]</span>
                  <span style={{ fontSize: 9, color: mc }}>{mark}</span>
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'monospace', fontSize: 9, color: 'var(--text-tertiary)', letterSpacing: 0.5 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--green)' }} />
            Updated Nh ago &middot; N changes this week
          </div>
          <div style={{ ...opsFooter, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Live tier rankings</span>
            <span style={{ color: 'var(--accent)', fontWeight: 700 }}>Share</span>
          </div>
        </div>
      </div>

      {/* ══ 03 THE DESK -- how the intel is made. Function-forward; editors as bylines,
          not a persona lineup. NET-NEW, non-ranking. AI-assisted stated plainly. ══ */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '44px 0 16px', flexWrap: 'wrap' }}>
        <span style={{ fontFamily: EXO, fontSize: 13, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
          <span style={{ color: 'var(--accent)', marginRight: 8 }}>03</span>How the Intel Is Made
        </span>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        <span style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, letterSpacing: 1, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Method</span>
      </div>
      <div style={{ display: 'grid', gap: 14, maxWidth: 680 }}>
        <h2 style={{ fontFamily: EXO, fontSize: 21, fontWeight: 700, color: '#fff', margin: 0, lineHeight: 1.3, letterSpacing: 0.2 }}>Written, cross-checked, sourced</h2>
        <p style={{ fontSize: 14.5, color: 'var(--text-secondary)', lineHeight: 1.65, margin: 0 }}>Every briefing is traced to primary material - the official Deep Dive, patch notes, first-party reveals - before it publishes.</p>
        <p style={{ fontSize: 14.5, color: 'var(--text-secondary)', lineHeight: 1.65, margin: 0 }}>Coverage is produced by an AI-assisted editorial desk and verified against primary sources. Nothing is invented; where the record is unconfirmed, we say so. The desk carries distinct roles - meta, analysis, builds, community, field guide - and signs its work.</p>
        {/* Editorial desk roster -- name-leads bylines per the LOCKED doctrine
            (docs/network/editorial-staff-model.md + lib/editors/roster.js): full name
            first, accent-colored tag follows (Miranda's name IS her tag). The five
            PRODUCING editors; VANTAGE excluded (network editor, not per-game). Broker is
            a redacted "incoming" slot -- a true roster fact (status: incoming), dramatized
            on-theme, no invented lore. Editor accent colors are their locked identity
            colors (roster.js), not DMZ tokens. */}
        <div style={{ marginTop: 6 }}>
          <div style={{ fontFamily: 'monospace', fontSize: 9.5, fontWeight: 700, letterSpacing: 1.5, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 13 }}>
            The desk - &ldquo;We don&apos;t agree, and we don&apos;t guess.&rdquo;
          </div>
          <div style={{ display: 'grid', gap: 9 }}>
            {[
              { name: 'Marcus Vane', tag: 'Cipher', role: 'Analysis', color: '#ff2222' },
              { name: 'Remi Okafor', tag: 'Nexus', role: 'Meta & News', color: '#00d4ff' },
              { name: 'Felix Andersen', tag: 'Dexter', role: 'Builds', color: '#ff8800' },
              { name: 'Tariq Webb', tag: 'Ghost', role: 'Community', color: '#00ff88' },
              { name: 'Miranda Malini', tag: null, role: 'Field Guide', color: '#9b5de5' },
            ].map(function (e) {
              return (
                <div key={e.name} style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: e.color, flexShrink: 0, alignSelf: 'center' }} />
                  <span style={{ fontFamily: EXO, fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)' }}>
                    {e.name}{e.tag ? <span style={{ color: e.color, fontWeight: 700 }}> / {e.tag}</span> : null}
                  </span>
                  <span style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, letterSpacing: 1, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>{e.role}</span>
                </div>
              );
            })}
            {/* Broker -- CLASSIFIED / incoming (status 'incoming' per roster.js; not producing). */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', border: '1px solid var(--text-tertiary)', flexShrink: 0 }} />
              <span aria-label="Classified" style={{ display: 'inline-block', width: 96, height: 12, background: 'var(--text-tertiary)', opacity: 0.4, borderRadius: 2 }} />
              <span style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 800, letterSpacing: 1.5, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>[Classified]</span>
              <span style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, letterSpacing: 1, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Economy &amp; Market</span>
              <span style={{ fontFamily: 'monospace', fontSize: 8, fontWeight: 800, letterSpacing: 1.5, color: 'var(--accent-dim)', border: '1px solid var(--accent-dim)', borderRadius: 2, padding: '1px 7px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Deploying with the zone</span>
            </div>
          </div>
        </div>
      </div>

      {/* MW4 DMZ vs Warzone -- PROSE, deliberately asymmetric. Targets "dmz vs
          warzone" (170/mo). No card grid: a two-column layout would imply a
          DMZ/Warzone information balance we do not have. Copy is constrained to the
          official Deep Dive (scripts/gen-dmz-news.mjs) -- no Warzone specifics beyond
          the battle-royale category, no MW4 balance/TTK, no map-size or squad claims,
          no 2022-mode continuity. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '44px 0 16px' }}>
        <h2 style={{ fontFamily: EXO, fontSize: 13, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-tertiary)', margin: 0 }}>MW4 DMZ vs Warzone</h2>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      </div>
      <div style={{ display: 'grid', gap: 14, maxWidth: 680 }}>
        <p style={{ fontSize: 14.5, color: 'var(--text-secondary)', lineHeight: 1.65, margin: 0 }}>
          DMZ is Modern Warfare 4&apos;s extraction mode - you deploy into the Hajin Exclusion Zone, take on objectives and threats, and try to extract with what you have earned; Warzone is Call of Duty&apos;s battle-royale mode. Different goal, different loop.
        </p>
        <p style={{ fontSize: 14.5, color: 'var(--text-secondary)', lineHeight: 1.65, margin: 0 }}>
          What the official Deep Dive confirms sets DMZ apart: progression and gear that persist between runs through the FOB and Stash, a PvPvE zone where you choose when to cooperate, fight, or slip away, and infil and exfil with real stakes. The detailed, mechanic-by-mechanic comparison lands when the mode goes live on October 23, 2026 - verified from play, not guessed before launch.
        </p>
      </div>

      {/* Is DMZ coming back? -- dedicated section-anchor for the 250-480/mo query,
          promoted OUT of the FAQ so the term gets a titled on-page target. PROSE (h2 +
          paragraph), NEVER FAQPage schema. Copy is the source-backed FAQ_BACK_A: affirms
          the mode + Oct 23 2026 date first-party, hedges the 2022-continuity unknown. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '44px 0 16px' }}>
        <h2 style={{ fontFamily: EXO, fontSize: 13, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-tertiary)', margin: 0 }}>{FAQ_BACK_Q}</h2>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      </div>
      <div style={{ display: 'grid', gap: 14, maxWidth: 680 }}>
        <p style={{ fontSize: 14.5, color: 'var(--text-secondary)', lineHeight: 1.65, margin: 0 }}>{FAQ_BACK_A}</p>
      </div>

      {/* REFERENCE -- the launch-day entity verticals (keys / missions / items).
          Linked from the /dmz hub so they are never orphaned. Hubs are noindex
          until they have rows; these links exist now so the crawl graph and the
          internal-linking are in place before launch. "dmz missions" is the one
          winnable hub term in the research (KD 30, 2,900/mo launch peak). */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '44px 0 16px' }}>
        <h2 style={{ fontFamily: EXO, fontSize: 13, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-tertiary)', margin: 0 }}>Reference</h2>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
        {[
          { href: '/dmz/missions', label: 'Missions',  desc: 'Objectives, factions and rewards.' },
          { href: '/dmz/builds',   label: 'Builds',    desc: 'The best FOB Gunsmith loadout per weapon.' },
          { href: '/dmz/keys',     label: 'Keys',      desc: 'Locations and what they unlock.' },
          { href: '/dmz/items',    label: 'Items',     desc: 'Values, categories and uses.' },
          { href: '/dmz/pois',     label: 'Locations', desc: 'Hajin map, POIs and regions.' },
        ].map(function (c) {
          return (
            <Link key={c.href} href={c.href} style={{ display: 'block', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 4, padding: '18px 20px', textDecoration: 'none' }}>
              <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 16, fontWeight: 800, color: '#fff', marginBottom: 6 }}>{c.label} &rarr;</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{c.desc}</div>
            </Link>
          );
        })}
      </div>

      {/* FAQ -- source-backed (launch date / map / mode / confirmed-so-far).
          Launch date is now sourced (see HANDOFF). */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '44px 0 18px' }}>
        <h2 style={{ fontFamily: EXO, fontSize: 13, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-tertiary)', margin: 0 }}>Common questions</h2>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      </div>
      <div style={{ display: 'grid', gap: 20 }}>
        <div>
          <h3 style={faqQStyle}>{FAQ_LAUNCH_Q}</h3>
          <p style={faqAStyle}>{FAQ_LAUNCH_A}</p>
        </div>
        <div>
          <h3 style={faqQStyle}>{FAQ_MAP_Q}</h3>
          <p style={faqAStyle}>{FAQ_MAP_A}</p>
        </div>
        <div>
          <h3 style={faqQStyle}>{FAQ_MODE_Q}</h3>
          <p style={faqAStyle}>{FAQ_MODE_A}</p>
        </div>
        <div>
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
          </p>
        </div>
      </div>
    </main>
  );
}
