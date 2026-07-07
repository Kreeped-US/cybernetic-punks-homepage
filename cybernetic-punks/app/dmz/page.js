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

export const metadata = {
  title: 'DMZ — Extraction Intelligence Hub',
  description: 'Field intel, meta, loadouts, crafting, FOB progression, and region guides for the DMZ.',
  alternates: { canonical: 'https://cyberneticpunks.com/dmz' },
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
  // tone: 'live' (forest) | 'soon' | 'muted'
  var color = tone === 'live' ? 'var(--green)' : 'var(--text-tertiary)';
  var border = tone === 'live' ? 'var(--green)' : 'var(--border)';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontFamily: EXO, fontSize: 9, fontWeight: 800, letterSpacing: 1.5,
      textTransform: 'uppercase', color: color,
      border: '1px solid ' + border, borderRadius: 999, padding: '2px 9px',
    }}>
      {tone === 'live' && <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--green)' }} />}
      {text}
    </span>
  );
}

var cardBase = {
  display: 'flex', flexDirection: 'column', gap: 10,
  background: 'var(--bg-card)', border: '1px solid var(--border)',
  borderRadius: 8, padding: '18px 20px', textDecoration: 'none',
  minHeight: 132,
};

function CardShell({ children, href }) {
  if (href) return <Link href={href} style={cardBase}>{children}</Link>;
  return <div style={cardBase}>{children}</div>;
}

function CardTitle({ children }) {
  return <span style={{ fontFamily: EXO, fontSize: 17, fontWeight: 700, color: '#fff', letterSpacing: 0.2 }}>{children}</span>;
}
function CardDesc({ children }) {
  return <span style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.55 }}>{children}</span>;
}

// Editor-fed section with REAL article count. count>0 -> LIVE + "{n} report(s)";
// count===0 -> neutral "Publishing soon" (never claims LIVE with nothing there).
function CountCard({ section, count }) {
  var live = count > 0;
  return (
    <CardShell href={'/dmz/' + section.slug}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <CardTitle>{section.label}</CardTitle>
        <Pill text={live ? 'Live' : 'Soon'} tone={live ? 'live' : 'muted'} />
      </div>
      <CardDesc>{section.description}</CardDesc>
      <span style={{ marginTop: 'auto', fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: live ? 'var(--green)' : 'var(--text-tertiary)' }}>
        {live ? (count + (count === 1 ? ' report' : ' reports')) : 'Publishing soon'}
      </span>
    </CardShell>
  );
}

// Data-fed "coming soon" shell card (3D Printer / FOB / Hajin Regions).
function SoonCard({ section }) {
  return (
    <CardShell href={'/dmz/' + section.slug}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <CardTitle>{section.label}</CardTitle>
        <Pill text="Soon" tone="muted" />
      </div>
      <CardDesc>{section.description}</CardDesc>
      <span style={{ marginTop: 'auto', fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: 'var(--text-tertiary)' }}>
        Launches with the zone
      </span>
    </CardShell>
  );
}

// META card -- special. Tag "ACTIVATES AT LAUNCH" + a STATIC decorative skeleton
// table previewing the product shape (# / Weapon / Tier / Score). The rows are
// INTENTIONALLY non-functional placeholders -- NOT a data binding, nothing to wire.
// Real meta data only exists once DMZ ships and matches are played.
function MetaCard({ section }) {
  var cols = ['#', 'Weapon', 'Tier', 'Score'];
  var rows = [0, 1, 2, 3];
  return (
    <CardShell href={'/dmz/' + section.slug}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <CardTitle>{section.label}</CardTitle>
        <Pill text="Activates at launch" tone="muted" />
      </div>
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
              <span style={{ height: 7, borderRadius: 2, background: 'rgba(63,125,68,0.18)' }} />
              <span style={{ height: 7, borderRadius: 2, background: 'rgba(255,255,255,0.05)' }} />
            </div>
          );
        })}
      </div>
    </CardShell>
  );
}

// FACTIONS -- NOT a config section / route (so this is a static, non-linking card,
// never a 404 link). Honest "unconfirmed" state.
function FactionsCard() {
  return (
    <CardShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <CardTitle>Factions</CardTitle>
        <Pill text="TBD" tone="muted" />
      </div>
      <CardDesc>Whether DMZ supports a faction system is still unconfirmed.</CardDesc>
    </CardShell>
  );
}

export default async function DmzLanding() {
  var [published, dCount] = await Promise.all([publishedDmzSlugs(), discourseCount()]);

  // Source-independent structured data for the hub. BreadcrumbList: Network -> DMZ
  // (DMZ is the current page, so it is the leaf with no `item`). NOTE: the hub has no
  // VISIBLE breadcrumb of its own -- this emits the graph position without an on-page
  // equivalent; a visible hub breadcrumb is a later, separate pass (do not invent one
  // here). CollectionPage describes the hub as its coverage sections (from dmz.sections,
  // never a hardcoded list), so it tracks the config.
  var HUB_BASE = 'https://cyberneticpunks.com';
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

  return (
    <main className={exo2.variable} style={{ maxWidth: 1100, margin: '0 auto', padding: '52px 16px 96px' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(hubBreadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(hubCollectionLd) }} />
      {/* Hero */}
      <div style={{ marginBottom: 34 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: EXO, fontSize: 11, fontWeight: 800, letterSpacing: 1,
            color: 'var(--green)', border: '1px solid var(--green)', borderRadius: 6, padding: '3px 7px',
          }}>CNP</span>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 3, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
            Cybernetic Punks Network
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 14 }}>
          <h1 style={{ fontFamily: EXO, fontSize: 46, fontWeight: 800, letterSpacing: 1, color: '#fff', margin: 0, lineHeight: 1 }}>DMZ</h1>
          <Pill text="Pre-launch" tone="muted" />
        </div>
        <p style={{ fontSize: 15, color: 'var(--text-secondary)', margin: '0 0 22px', maxWidth: 600, lineHeight: 1.6 }}>
          {dmz.tagline}. Confirmed coverage of Modern Warfare 4&apos;s extraction mode &mdash; setting, systems, and field intel &mdash; with structured tools landing as the zone goes live.
        </p>
        {/* Launch-date callout */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
          background: 'var(--bg-card)', border: '1px solid var(--border)', borderLeft: '3px solid var(--green)',
          borderRadius: 6, padding: '14px 18px',
        }}>
          <span style={{ fontFamily: EXO, fontSize: 15, fontWeight: 700, color: '#fff' }}>DMZ launches October 23, 2026</span>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>&mdash; the hub is already standing by.</span>
        </div>
      </div>

      {/* Coverage */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0 16px' }}>
        <h2 style={{ fontFamily: EXO, fontSize: 13, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-tertiary)', margin: 0 }}>Coverage</h2>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 14 }}>
        {dmz.sections.map(function (sec) {
          if (sec.slug === 'meta') return <MetaCard key={sec.slug} section={sec} />;
          // Discourse: tag-based count (not the per-slug map).
          if (sec.contentFilter && sec.contentFilter.byTag === 'discourse') return <CountCard key={sec.slug} section={sec} count={dCount} />;
          if (sec.source === 'editor') return <CountCard key={sec.slug} section={sec} count={sectionCount(sec.slug, published)} />;
          return <SoonCard key={sec.slug} section={sec} />;
        })}
        {/* Factions: informational only, not a section/route. */}
        <FactionsCard />
      </div>

      {/* Launch-email capture (owned list). Landing gets the dedicated BLOCK; the
          dismissible strip runs on ARTICLE pages only (see placement note). */}
      <DmzNotifyBlock />
    </main>
  );
}
