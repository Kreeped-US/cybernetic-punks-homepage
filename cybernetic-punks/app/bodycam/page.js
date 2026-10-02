// app/bodycam/page.js
// Bodycam landing -- the per-game hub. Bodycam is LIVE in Early Access, so the hero presents it as a
// LIVE game: NO countdown, NO "launches in N days" (it is already playable). Honest live-status strip
// (developer / platform / Early Access / store) + config-driven Coverage cards via the shared
// CoverageCard. The hero is Bodycam-specific (games differ most here); the cards/breadcrumb are the
// shared template. NO content yet -> the Intel readout reads "Being built" and cards read "Soon".
//
// Server component + a Supabase read for live counts -> force-dynamic. Robots inherit the layout
// gate (bodycam.indexable false -> noindex until content lands).

import Link from 'next/link';
import { bodycam } from '@/lib/games/bodycam';
import { fetchArticleIndex, countsBySection } from '@/lib/games/sectionArticles';
import { CoverageCard } from '@/components/game/GameSectionPage';
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
// Fail-soft (hub): a read error yields an empty index -> "Being built" + zero counts, never a 500.
async function bodycamArticleIndex() {
  try {
    return await fetchArticleIndex(bodycam.slug);
  } catch (err) {
    console.error('[bodycam hub] article index failed: ' + (err && err.message ? err.message : String(err)));
    return [];
  }
}

export default async function BodycamLanding() {
  var index = await bodycamArticleIndex();
  var reportCount = index.length;
  var counts = countsBySection(bodycam.slug, index);

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
            {bodycam.tagline}. Coverage of the Reissad Studio body-camera tactical FPS - weapons, the real-parts attachment system with its compatibility gates, the competitive modes, and the maps - grounded in official material and in-game observation. Structure is confirmed; specific numbers stay flagged until verified in-game.
          </p>
        </div>
      </section>

      {/* Status strip -- live facts, NO countdown. (below the hero, not over the backdrop) */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderLeft: '3px solid var(--accent)', borderRadius: 8, padding: '18px 22px', marginBottom: 30, display: 'flex', gap: 30, flexWrap: 'wrap' }}>
          {[['Developer', 'Reissad Studio'], ['Platform', 'PC (Steam)'], ['Status', 'Early Access - live now'], ['Engine', 'Unreal Engine 5']].map(function (r) {
            return (
              <div key={r[0]}>
                <div style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, letterSpacing: 1.5, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 3 }}>{r[0]}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{r[1]}</div>
              </div>
            );
          })}
          <div>
            <div style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, letterSpacing: 1.5, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 3 }}>Store</div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>
              <a href={bodycam.storeUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Steam &rarr;</a>
            </div>
          </div>
          <div>
            <div style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, letterSpacing: 1.5, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 3 }}>Intel</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
              {reportCount > 0 ? <><span style={{ color: 'var(--accent)', fontWeight: 700 }}>Live</span> - {reportCount} {reportCount === 1 ? 'report' : 'reports'}</> : 'Being built'}
            </div>
          </div>
        </div>

      {/* Coverage cards -- the shared CoverageCard, driven by the config sections. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0 16px' }}>
        <h2 style={{ fontFamily: FONT, fontSize: 13, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-tertiary)', margin: 0 }}>Coverage</h2>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 14 }}>
        {bodycam.sections.map(function (sec) {
          return <CoverageCard key={sec.slug} config={bodycam} section={sec} count={counts[sec.slug] || 0} />;
        })}
      </div>
    </main>
  );
}
