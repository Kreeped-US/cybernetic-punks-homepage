// app/bodycam/page.js
// Bodycam landing -- the per-game hub, on the SHARED hub layout B (2026-10-02). Bodycam is LIVE in Early
// Access, so the hero presents it as a LIVE game: NO countdown, NO "launches in N days". Page order:
// the shared full-bleed GameHero (breadcrumb, logo badge + derived status badge, text H1, intro, CTAs --
// all from bodycam.hero in lib/games/bodycam.js) -> facts strip (HubFactsStrip) -> Latest intel
// (HubLatestIntel) -> Coverage cards (CoverageCard) + Coming row (ComingRow). The hero sits OUTSIDE the
// max-width <main> so it runs edge to edge. Everything is shared + config-driven: the pieces live in
// components/game/, the view-models in lib/games/heroModel.js + hubModel.js, and ALL article data comes
// from ONE read of the shared index (lib/games/sectionArticles.js: published, noindex=false, not rejected;
// sections via the shared resolver). The current version comes from the official Steam post
// (lib/gather/officialVersion.js, 1h cache, 3s timeout, hidden on failure).
//
// Server component + a Supabase read -> force-dynamic. ROBOTS: bodycam.indexable is true (flipped
// 2026-10-02, selective), so this page is indexable; it sets no robots of its own (layout gate).

import { bodycam } from '@/lib/games/bodycam';
import GameHero from '@/components/game/GameHero';
import { buildHeroProps } from '@/lib/games/heroModel';
import { fetchArticleIndex, countsBySection } from '@/lib/games/sectionArticles';
import { selectLatestIntel, latestReportAt, buildHubFacts, splitCoverage } from '@/lib/games/hubModel';
import { fetchOfficialVersion } from '@/lib/gather/officialVersion';
import { CoverageCard, ComingRow } from '@/components/game/GameSectionPage';
import HubFactsStrip from '@/components/game/HubFactsStrip';
import HubLatestIntel from '@/components/game/HubLatestIntel';
import { safeJsonLd } from '@/lib/security/safeJsonLd';
import { hubJsonLd } from '@/lib/seo/hubJsonLd';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: { absolute: 'Bodycam - Verified Intel Hub | Cybernetic Punks' },
  description: 'Verified intel for Bodycam, the Reissad Studio body-camera tactical FPS live in Steam Early Access. Weapons, the real-parts attachment system, modes, and maps - structure confirmed, values verified in-game. Part of the Cybernetic Punks network.',
  alternates: { canonical: 'https://cyberneticpunks.com/bodycam' },
  // og:url must equal the canonical (was defaulting to the metadataBase root).
  openGraph: {
    title: 'Bodycam - Verified Intel Hub',
    description: 'Verified intel for Bodycam, the Reissad Studio body-camera tactical FPS -- weapons, the real-parts attachment system, modes and maps.',
    url: 'https://cyberneticpunks.com/bodycam',
    siteName: 'Cybernetic Punks',
    type: 'website',
  },
};

var FONT = 'Exo_2, system-ui, sans-serif';

// The game's eligible articles (published, noindex=false, not rejected), resolved to sections by the
// shared resolver (lib/games/sectionArticles.js) -- so a fallback-routed article counts in its section.
// Fail-soft (hub): a read error yields an empty index -> "Being built", no list, zero counts, never a 500.
async function bodycamArticleIndex() {
  try {
    return await fetchArticleIndex(bodycam.slug);
  } catch (err) {
    console.error('[bodycam hub] article index failed: ' + (err && err.message ? err.message : String(err)));
    return [];
  }
}

export default async function BodycamLanding() {
  var config = bodycam;
  var [index, version] = await Promise.all([bodycamArticleIndex(), fetchOfficialVersion(config)]);
  var facts = buildHubFacts(config, { reportCount: index.length, latestReportAt: latestReportAt(index), version: version });
  var latest = selectLatestIntel(config, index);
  var coverage = splitCoverage(config, countsBySection(config.slug, index));
  var sectionBySlug = function (slug) { return config.sections.find(function (s) { return s.slug === slug; }); };

  // Hub structured data via the shared, game-agnostic builder (BreadcrumbList + CollectionPage).
  var hubLd = hubJsonLd({
    name: 'Bodycam - Verified Intel Hub',
    path: '/bodycam',
    description: 'Verified intel for Bodycam, the Reissad Studio body-camera tactical FPS -- weapons, the real-parts attachment system, modes and maps.',
    crumbLeaf: 'Bodycam',
    sections: bodycam.sections,
  });

  return (
    <>
      {/* Hero -- the shared full-bleed GameHero (outside <main> so it spans the viewport). */}
      <GameHero hero={buildHeroProps(config)} />

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '30px 16px 40px' }}>
      {hubLd.map((ld, i) => (
        <script key={'hubld-' + i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(ld) }} />
      ))}

      {/* Facts strip -- config facts + derived (version / reports / latest report) + store. NO countdown. */}
      <HubFactsStrip items={facts} />

      {/* Latest intel -- newest eligible articles, URLs from the shared resolver (hidden when none). */}
      <HubLatestIntel basePath={config.basePath} items={latest} />

      {/* Coverage -- a full card per editor section with >= 1 article; everything else on the Coming row. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0 16px' }}>
        <h2 style={{ fontFamily: FONT, fontSize: 13, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-tertiary)', margin: 0 }}>Coverage</h2>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 14 }}>
        {coverage.cards.map(function (c) {
          return <CoverageCard key={c.slug} config={config} section={sectionBySlug(c.slug)} count={c.count} />;
        })}
      </div>
      <ComingRow items={coverage.coming} />
      </main>
    </>
  );
}
