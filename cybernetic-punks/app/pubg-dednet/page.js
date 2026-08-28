// app/pubg-dednet/page.js
// PUBG: DED.NET landing -- the per-game hub. Phase 1 skeleton: breadcrumb + hero + config-driven
// Coverage cards (from lib/games/pubg-dednet.js, with REAL feed_items counts). NO COUNTDOWN: the
// game has NO release date (launch_date null), so the hero states "Revealed / closed beta / TBA"
// honestly -- never a fake date or 0-day clock. Mirrors app/wardogs/page.js minus the countdown.
//
// Server component + a Supabase read for live counts -> force-dynamic.
// ROBOTS: the whole subtree is noindex while pubg-dednet.indexable is false (layout gate); this
// page sets no robots of its own.

import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { pubgDednet, dednetArticleSlugsForSection } from '@/lib/games/pubg-dednet';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: { absolute: 'PUBG: DED.NET - Verified Intel Hub | CyberneticPunks' },
  description: 'Confirmed-systems intel for PUBG: DED.NET, the PUBG Studios / KRAFTON roguelite FPS revealed at gamescom 2026. Release date TBA; closed beta incoming. Part of the CyberneticPunks network.',
  alternates: { canonical: 'https://cyberneticpunks.com/pubg-dednet' },
};

async function publishedDednetSlugs() {
  try {
    var { data } = await supabase
      .from('feed_items').select('slug').eq('game_slug', 'pubg-dednet').eq('is_published', true);
    return new Set((data || []).map(function (r) { return r.slug; }));
  } catch (err) {
    return new Set();
  }
}

function sectionCount(slug, publishedSet) {
  return dednetArticleSlugsForSection(slug).filter(function (s) { return publishedSet.has(s); }).length;
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
  var published = await publishedDednetSlugs();
  var briefingCount = published.size;

  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 16px 40px' }}>
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, fontSize: 10, letterSpacing: 1.5, fontFamily: 'monospace', fontWeight: 700, flexWrap: 'wrap' }}>
        <Link href="/" style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}>Network</Link>
        <span style={{ color: 'var(--text-tertiary)', opacity: 0.4 }}>/</span>
        <span style={{ color: 'var(--text-secondary)' }}>PUBG: DED.NET</span>
      </nav>

      {/* Hero -- NO countdown (no release date). Honest revealed/beta/TBA status. */}
      <div style={{ marginBottom: 30 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <span style={{ fontFamily: EXO, fontSize: 11, fontWeight: 800, letterSpacing: 1, color: 'var(--accent)', border: '1px solid var(--accent)', borderRadius: 6, padding: '3px 7px' }}>CNP</span>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 3, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Cybernetic Punks Network</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 14 }}>
          <h1 style={{ fontFamily: EXO, fontSize: 44, fontWeight: 800, letterSpacing: 1, color: '#fff', margin: 0, lineHeight: 1 }}>PUBG: <span style={{ color: 'var(--accent)' }}>DED.NET</span></h1>
          <span style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--text-tertiary)', border: '1px solid var(--border)', borderRadius: 2, padding: '3px 8px' }}>Revealed</span>
        </div>
        <p style={{ fontSize: 15, color: 'var(--text-secondary)', margin: '0 0 22px', maxWidth: 640, lineHeight: 1.6 }}>
          {pubgDednet.tagline}. Confirmed-systems coverage of the PUBG Studios / KRAFTON roguelite FPS - the multi-match run, ROMs, injuries, and the GRUNGEHOUSE world of 1996 Cascadia - grounded in official material and the studio's own statements.
        </p>

        {/* Status strip -- reveal facts, NO date/countdown. */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderLeft: '3px solid var(--accent)', borderRadius: 8, padding: '18px 22px', display: 'flex', gap: 30, flexWrap: 'wrap' }}>
          {[['Revealed', 'gamescom ONL 2026'], ['Platform', 'PC / PS5 / Xbox (console-first)'], ['Beta', 'Closed beta incoming'], ['Release', 'To be announced']].map(function (r) {
            return (
              <div key={r[0]}>
                <div style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, letterSpacing: 1.5, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 3 }}>{r[0]}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{r[1]}</div>
              </div>
            );
          })}
          <div>
            <div style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, letterSpacing: 1.5, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 3 }}>Intel</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
              {briefingCount > 0 ? <><span style={{ color: 'var(--accent)', fontWeight: 700 }}>Live</span> - {briefingCount} {briefingCount === 1 ? 'report' : 'reports'}</> : 'Building'}
            </div>
          </div>
        </div>
      </div>

      {/* Coverage cards */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0 16px' }}>
        <h2 style={{ fontFamily: EXO, fontSize: 13, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-tertiary)', margin: 0 }}>Coverage</h2>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 14 }}>
        {pubgDednet.sections.map(function (sec) {
          return <CoverageCard key={sec.slug} section={sec} count={sectionCount(sec.slug, published)} />;
        })}
      </div>
    </main>
  );
}
