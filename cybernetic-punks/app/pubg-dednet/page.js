// app/pubg-dednet/page.js
// PUBG: DED.NET landing -- the per-game hub: the shared full-bleed GameHero (plain variant -- no official
// hero art yet; pubgDednet.hero in lib/games/pubg-dednet.js) -> the shared facts strip (HubFactsStrip;
// config facts + reports + latest report) -> config-driven Coverage cards (REAL feed_items counts). NO
// COUNTDOWN: the game has NO release date (launch_date null), so the facts read "Revealed / closed beta /
// TBA" honestly -- never a fake date or 0-day clock.
//
// Server component + a Supabase read for live counts -> force-dynamic.
// ROBOTS: the whole subtree is noindex while pubg-dednet.indexable is false (layout gate); this
// page sets no robots of its own.

import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { pubgDednet, dednetSectionForArticle } from '@/lib/games/pubg-dednet';
import { fetchArticleIndex, countsBySection } from '@/lib/games/sectionArticles';
import { buildHubFacts, latestReportAt } from '@/lib/games/hubModel';
import { buildHeroProps } from '@/lib/games/heroModel';
import GameHero from '@/components/game/GameHero';
import HubFactsStrip from '@/components/game/HubFactsStrip';
import { fetchHubExplainers, selectExplainers } from '@/lib/hubExplainers';
import { withOgImages } from '@/lib/seo/ogImage';
import { safeJsonLd } from '@/lib/security/safeJsonLd';
import { hubJsonLd } from '@/lib/seo/hubJsonLd';

export const dynamic = 'force-dynamic';

export const metadata = withOgImages({
  title: { absolute: 'PUBG: DED.NET - Verified Intel Hub | Cybernetic Punks' },
  description: 'Confirmed-systems intel for PUBG: DED.NET, the PUBG Studios / KRAFTON roguelite FPS revealed at gamescom 2026. Release date TBA; closed beta incoming. Part of the Cybernetic Punks network.',
  alternates: { canonical: 'https://cyberneticpunks.com/pubg-dednet' },
  // og:url must equal the canonical (was defaulting to the metadataBase root).
  openGraph: {
    title: 'PUBG: DED.NET - Verified Intel Hub',
    description: 'Confirmed-systems intel for PUBG: DED.NET, the PUBG Studios / KRAFTON roguelite FPS revealed at gamescom 2026.',
    url: 'https://cyberneticpunks.com/pubg-dednet',
    siteName: 'Cybernetic Punks',
    type: 'website',
  },
}, 'pubg-dednet');

// The game's eligible articles (published, noindex=false, not rejected), resolved to sections by the
// shared resolver (lib/games/sectionArticles.js) -- so a fallback-routed article counts in its section.
// Fail-soft (hub): a read error yields an empty index -> zero counts, never a 500.
async function dednetArticleIndex() {
  try {
    return await fetchArticleIndex('pubg-dednet');
  } catch (err) {
    console.error('[pubg-dednet hub] article index failed: ' + (err && err.message ? err.message : String(err)));
    return [];
  }
}

var EXO = 'Exo_2, system-ui, sans-serif';
var cardBase = {
  display: 'flex', flexDirection: 'column', background: 'var(--bg-card)',
  border: '1px solid var(--border)', borderRadius: 6, textDecoration: 'none', minHeight: 128, overflow: 'hidden',
};

function CoverageCard({ section, count }) {
  var isData = section.source === 'data';
  var live = !isData && count > 0;
  return (
    <Link href={'/pubg-dednet/' + section.slug} style={cardBase}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', background: 'var(--bg-nav)', borderBottom: '1px solid var(--border)' }}>
        <span style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, letterSpacing: 2, color: 'var(--text-tertiary)' }}>{section.label.toUpperCase()}</span>
        <span style={{ fontFamily: 'monospace', fontSize: 8.5, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: live ? 'var(--accent)' : 'var(--text-tertiary)', border: '1px solid ' + (live ? 'var(--accent)' : 'var(--border)'), borderRadius: 2, padding: '2px 7px' }}>{live ? 'Live' : 'Soon'}</span>
      </div>
      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
        <span style={{ fontFamily: EXO, fontSize: 17, fontWeight: 700, color: '#fff' }}>{section.label}</span>
        <span style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.55 }}>{section.description}</span>
        <span style={{ marginTop: 'auto', fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: live ? 'var(--accent)' : 'var(--text-tertiary)' }}>
          {isData ? 'Verified at beta' : (live ? (count + (count === 1 ? ' report' : ' reports')) : 'Publishing soon')}
        </span>
      </div>
    </Link>
  );
}

export default async function PubgDednetLanding() {
  var index = await dednetArticleIndex();
  var facts = buildHubFacts(pubgDednet, { reportCount: index.length, latestReportAt: latestReportAt(index), version: null });
  var counts = countsBySection('pubg-dednet', index);

  // "All PUBG: DED.NET coverage" -- direct hub -> article links (Change B). Section derived via
  // dednetSectionForArticle (same as Change A); null-section rows dropped; heading from displayName.
  var explainerRows = await fetchHubExplainers(supabase, 'pubg-dednet');
  var explainers = selectExplainers(
    explainerRows.map(function (r) { var sec = dednetSectionForArticle(r); return Object.assign({}, r, { section: sec, href: sec ? '/pubg-dednet/' + sec + '/' + r.slug : null }); }),
    { cap: 30, gameSlug: 'pubg-dednet' }
  );
  var explainersHeading = 'All ' + pubgDednet.displayName + ' coverage';

  // Hub structured data via the shared, game-agnostic builder (BreadcrumbList + CollectionPage).
  var hubLd = hubJsonLd({
    name: 'PUBG: DED.NET - Verified Intel Hub',
    path: '/pubg-dednet',
    description: 'Confirmed-systems intel for PUBG: DED.NET, the PUBG Studios / KRAFTON roguelite FPS revealed at gamescom 2026.',
    crumbLeaf: 'PUBG: DED.NET',
    sections: pubgDednet.sections,
  });

  return (
    <>
      {/* Hero -- the shared full-bleed GameHero, outside <main> so it spans the viewport. Plain variant
          (no hero.image yet); logo badge, derived REVEALED badge, H1 "PUBG: DED.NET" (accent), tagline intro. */}
      <GameHero hero={buildHeroProps(pubgDednet)} />

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '30px 16px 40px' }}>
      {hubLd.map((ld, i) => (
        <script key={'hubld-' + i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(ld) }} />
      ))}

      {/* Facts strip -- the reveal facts (config) + reports + latest report. NO date/countdown. */}
      <HubFactsStrip items={facts} />

      {/* Coverage cards */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0 16px' }}>
        <h2 style={{ fontFamily: EXO, fontSize: 13, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-tertiary)', margin: 0 }}>Coverage</h2>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 14 }}>
        {pubgDednet.sections.map(function (sec) {
          return <CoverageCard key={sec.slug} section={sec} count={counts[sec.slug] || 0} />;
        })}
      </div>

      {/* All PUBG: DED.NET coverage: direct hub -> article links (dofollow; hidden when empty). */}
      {explainers.length > 0 ? (
        <section style={{ marginTop: 40 }}>
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
      </main>
    </>
  );
}
