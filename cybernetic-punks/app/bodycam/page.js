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
import { supabase } from '@/lib/supabase';
import { bodycam, bodycamArticleSlugsForSection } from '@/lib/games/bodycam';
import { CoverageCard } from '@/components/game/GameSectionPage';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: { absolute: 'Bodycam - Verified Intel Hub | Cybernetic Punks' },
  description: 'Verified intel for Bodycam, the Reissad Studio body-camera tactical FPS live in Steam Early Access. Weapons, the real-parts attachment system, modes, and maps - structure confirmed, values verified in-game. Part of the Cybernetic Punks network.',
  alternates: { canonical: 'https://cyberneticpunks.com/bodycam' },
};

var FONT = 'Exo_2, system-ui, sans-serif';

async function publishedBodycamSlugs() {
  try {
    var { data } = await supabase
      .from('feed_items').select('slug').eq('game_slug', 'bodycam').eq('is_published', true);
    return new Set((data || []).map(function (r) { return r.slug; }));
  } catch (err) {
    return new Set();
  }
}

function sectionCount(slug, publishedSet) {
  return bodycamArticleSlugsForSection(slug).filter(function (s) { return publishedSet.has(s); }).length;
}

export default async function BodycamLanding() {
  var published = await publishedBodycamSlugs();
  var reportCount = published.size;

  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 16px 40px' }}>
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, fontSize: 10, letterSpacing: 1.5, fontFamily: 'monospace', fontWeight: 700, flexWrap: 'wrap' }}>
        <Link href="/" style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}>Network</Link>
        <span style={{ color: 'var(--text-tertiary)', opacity: 0.4 }}>/</span>
        <span style={{ color: 'var(--text-secondary)' }}>Bodycam</span>
      </nav>

      {/* Hero -- LIVE game. NO countdown, NO date clock. */}
      <div style={{ marginBottom: 30 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 800, letterSpacing: 1, color: 'var(--accent)', border: '1px solid var(--accent)', borderRadius: 6, padding: '3px 7px' }}>CNP</span>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 3, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Cybernetic Punks Network</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 14 }}>
          <h1 style={{ fontFamily: FONT, fontSize: 46, fontWeight: 800, letterSpacing: 1, color: '#fff', margin: 0, lineHeight: 1 }}>Bodycam</h1>
          <span style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--accent)', border: '1px solid var(--accent)', borderRadius: 2, padding: '3px 8px' }}>Live - Early Access</span>
        </div>
        <p style={{ fontSize: 15, color: 'var(--text-secondary)', margin: '0 0 22px', maxWidth: 640, lineHeight: 1.6 }}>
          {bodycam.tagline}. Coverage of the Reissad Studio body-camera tactical FPS - weapons, the real-parts attachment system with its compatibility gates, the competitive modes, and the maps - grounded in official material and in-game observation. Structure is confirmed; specific numbers stay flagged until verified in-game.
        </p>

        {/* Status strip -- live facts, NO countdown. */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderLeft: '3px solid var(--accent)', borderRadius: 8, padding: '18px 22px', display: 'flex', gap: 30, flexWrap: 'wrap' }}>
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
      </div>

      {/* Coverage cards -- the shared CoverageCard, driven by the config sections. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0 16px' }}>
        <h2 style={{ fontFamily: FONT, fontSize: 13, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-tertiary)', margin: 0 }}>Coverage</h2>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 14 }}>
        {bodycam.sections.map(function (sec) {
          return <CoverageCard key={sec.slug} config={bodycam} section={sec} count={sectionCount(sec.slug, published)} />;
        })}
      </div>
    </main>
  );
}
