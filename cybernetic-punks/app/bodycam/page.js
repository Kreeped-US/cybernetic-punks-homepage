// app/bodycam/page.js
// Bodycam landing -- the per-game hub, on the SHARED hub layout B (2026-10-02). Bodycam is LIVE in Early
// Access, so the hero presents it as a LIVE game: NO countdown, NO "launches in N days". Page order:
// breadcrumb -> hero (art + logo title + LIVE badge + config tagline/hubIntro) -> facts strip
// (HubFactsStrip) -> Latest intel (HubLatestIntel) -> Coverage cards (CoverageCard) + Coming row
// (ComingRow). Everything below the hero is shared + config-driven: the pieces live in components/game/,
// the view-model in lib/games/hubModel.js, and ALL article data comes from ONE read of the shared index
// (lib/games/sectionArticles.js: published, noindex=false, not rejected; sections via the shared
// resolver). The current version comes from the official Steam post (lib/gather/officialVersion.js, 1h
// cache, hidden on failure). Only the hero art paths are page-level.
//
// Server component + a Supabase read -> force-dynamic. ROBOTS: bodycam.indexable is true (flipped
// 2026-10-02, selective), so this page is indexable; it sets no robots of its own (layout gate).

import Link from 'next/link';
import { bodycam } from '@/lib/games/bodycam';
import { fetchArticleIndex, countsBySection } from '@/lib/games/sectionArticles';
import { selectLatestIntel, latestUpdatedAt, buildHubFacts, splitCoverage } from '@/lib/games/hubModel';
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
  var facts = buildHubFacts(config, { reportCount: index.length, updatedAt: latestUpdatedAt(index), version: version });
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
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 16px 40px' }}>
      {hubLd.map((ld, i) => (
        <script key={'hubld-' + i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(ld) }} />
      ))}
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, fontSize: 10, letterSpacing: 1.5, fontFamily: 'monospace', fontWeight: 700, flexWrap: 'wrap' }}>
        <Link href="/" style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}>Network</Link>
        <span style={{ color: 'var(--text-tertiary)', opacity: 0.4 }}>/</span>
        <span style={{ color: 'var(--text-secondary)' }}>Bodycam</span>
      </nav>

      {/* Hero -- LIVE game. Mirrors the /wardogs hero (app/wardogs/page.js): a press-art background behind
          the logo title + LIVE badge + intro, with dark scrims so the text stays legible. media_3 is a
          BRIGHT shot, so the left/bottom scrims are heavier than Wardogs' to hold >=4.5:1 on the text. */}
      <section style={{ position: 'relative', overflow: 'hidden', borderRadius: 10, border: '1px solid var(--border)', marginBottom: 18 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/Bodycam/bodycam-hero-bg.webp" alt="" aria-hidden="true" fetchPriority="high" decoding="async" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 35%' }} />
        {/* legibility scrims: heavy dark-left (the text column) + dark-bottom, mirroring Wardogs' two-gradient approach. */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(8,10,12,0.96) 0%, rgba(8,10,12,0.9) 46%, rgba(8,10,12,0.55) 100%)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(0deg, rgba(8,10,12,0.92) 0%, rgba(8,10,12,0.25) 55%, rgba(8,10,12,0.4) 100%)' }} />

        <div style={{ position: 'relative', padding: '40px 28px 34px' }}>
          {/* The logo IS the title (no separate badge above it): the single <h1> holds the mark, with
              alt="Bodycam" as its accessible name. The LIVE - EARLY ACCESS badge sits next to it. */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 14 }}>
            <h1 style={{ margin: 0, lineHeight: 0 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/Bodycam/bodycam-logo.webp" alt="Bodycam" style={{ height: 'clamp(54px, 10vw, 70px)', width: 'auto', maxWidth: '100%', display: 'block', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.6))' }} />
            </h1>
            <span style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--accent)', border: '1px solid var(--accent)', borderRadius: 2, padding: '3px 8px', background: 'rgba(8,10,12,0.5)' }}>Live - Early Access</span>
          </div>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.9)', margin: 0, maxWidth: 640, lineHeight: 1.6, textShadow: '0 1px 6px rgba(0,0,0,0.7)' }}>
            {config.tagline}. {config.hubIntro}
          </p>
        </div>
      </section>

      {/* Facts strip -- config facts + derived (version / reports / intel updated) + store. NO countdown. */}
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
  );
}
