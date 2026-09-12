// app/wardogs/loadouts/page.js
// The Wardogs LOADOUTS tool -- SSR frame + crawlable intro, mirroring the Marathon advisor page/client
// split. NAMING (hard rule): user-facing copy, title, H1, URL all use "loadouts" / "best loadout"
// (the community + search term), NEVER "Build Advisor" (zero search volume). The interactive
// generator streams client-side; this static prose is what the page ranks on (same as Marathon).

import Link from 'next/link';
import LoadoutsClient from './LoadoutsClient';
import ViewTracker from '@/components/ViewTracker';
import { shippedTypeHubs } from '@/lib/wardogs/loadoutHubs';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: { absolute: 'Wardogs Best Loadouts - Loadout Finder' },
  description: 'Find the best Wardogs loadout for your level, budget, and playstyle. Weapons ranked by measured time-to-kill from community ballistics testing, with the reasoning behind every pick.',
  keywords: 'Wardogs best loadout, Wardogs loadouts, best Wardogs weapons, Wardogs loadout finder, best cheap Wardogs loadout, Wardogs TTK, Wardogs weapon tier list, Wardogs best guns, Wardogs loadout by budget',
  openGraph: {
    title: 'Wardogs Best Loadouts - Loadout Finder | Cybernetic Punks',
    description: 'The best Wardogs loadout for your level, budget, and playstyle -- weapons ranked by measured TTK, with the reasoning behind every pick.',
    url: 'https://cyberneticpunks.com/wardogs/loadouts',
    siteName: 'Cybernetic Punks',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    site: '@Cybernetic87250',
    title: 'Wardogs Best Loadouts - Loadout Finder',
    description: 'The best Wardogs loadout for your level, budget, and playstyle -- ranked by measured TTK.',
  },
  alternates: { canonical: 'https://cyberneticpunks.com/wardogs/loadouts' },
};

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://cyberneticpunks.com' },
    { '@type': 'ListItem', position: 2, name: 'Wardogs', item: 'https://cyberneticpunks.com/wardogs' },
    { '@type': 'ListItem', position: 3, name: 'Best Loadouts', item: 'https://cyberneticpunks.com/wardogs/loadouts' },
  ],
};

export default function LoadoutsPage() {
  return (
    <>
      <ViewTracker slug="loadouts" type="tool" gameSlug="wardogs" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      {/* Premium hero -- cinematic backdrop so the tool feels like the landing's continuation. */}
      <section style={{ position: 'relative', overflow: 'hidden', color: '#fff', borderBottom: '1px solid #1d2026', fontFamily: 'system-ui, sans-serif' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {/* First-person Super-45 POV, golden-hour street, cash HUD -- the press-kit shot for the Loadout Finder. */}
        <img src="/images/wardogs/WD_Screenshot_ResidentialStreet_1_WD1.jpg" alt="" aria-hidden="true" fetchPriority="high" decoding="async" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 44%', opacity: 0.92 }} />
        {/* left stays dark for the H1/intro; the golden POV shows through on the right */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(11,13,16,0.95) 0%, rgba(11,13,16,0.72) 44%, rgba(11,13,16,0.34) 100%)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(0deg, #0b0d10 3%, rgba(11,13,16,0.2) 55%, rgba(11,13,16,0.4) 100%)' }} />

        <div style={{ position: 'relative', maxWidth: 1000, margin: '0 auto', padding: '46px 24px 30px' }}>
          {/* eyebrow */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 7px var(--accent-glow)' }} />
            <span style={{ fontSize: 10, letterSpacing: 3, fontWeight: 800, color: 'var(--accent)', fontFamily: 'monospace' }}>LOADOUT FINDER</span>
          </div>

          <h1 style={{ fontSize: 'clamp(30px, 5vw, 46px)', fontWeight: 900, letterSpacing: '-0.6px', lineHeight: 1.03, margin: '0 0 16px', textShadow: '0 2px 20px rgba(0,0,0,0.5)' }}>
            Find Your Best Wardogs Loadout
          </h1>

          {/* lead value-prop -- marketable, matches the landing */}
          <p style={{ fontSize: 'clamp(15px, 1.7vw, 18px)', color: 'rgba(255,255,255,0.85)', lineHeight: 1.6, maxWidth: 660, margin: '0 0 24px', fontWeight: 500 }}>
            Tell us your level, budget, and how you play. We compute the loadout that actually wins &mdash; ranked by real{' '}
            <span style={{ color: 'var(--accent)', fontWeight: 800 }}>time-to-kill</span>, priced against the economy, with the reasoning and the receipts.{' '}
            <span style={{ color: '#fff', fontWeight: 700 }}>We don&rsquo;t guess.</span>
          </p>

          {/* the honesty / how-it-works strip -- distinct, amber-marked, not buried gray prose */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 10 }}>
            {[
              { k: 'MEASURED TTK', v: 'Ranked on real time-to-kill from community ballistics testing — not vibes.' },
              { k: 'ATTRIBUTED', v: 'Combat numbers credited to Swoleguy’s testing, not yet Bulkhead-official — every pick says so.' },
              { k: 'COST-AWARE', v: 'Set a budget and loadouts are costed gun + ammo against the economy — prices community-recorded, not yet Bulkhead-official.' },
            ].map((item) => (
              <div key={item.k} style={{ background: 'rgba(18,21,25,0.82)', border: '1px solid var(--border)', borderLeft: '3px solid var(--accent)', borderRadius: '0 3px 3px 0', padding: '12px 14px', backdropFilter: 'blur(2px)' }}>
                <div style={{ fontSize: 10, letterSpacing: 1.5, fontWeight: 800, color: 'var(--accent)', fontFamily: 'monospace', marginBottom: 5 }}>
                  <span style={{ marginRight: 6 }}>&#9698;</span>{item.k}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{item.v}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Channel B mesh: crawlable links to the WEAPON-TYPE loadout guides (indexable hubs). Only the
          SHIPPED hubs render (lib/wardogs/loadoutHubs.js); this auto-populates as more hubs ship, and
          keeps each hub reachable by crawl from this indexable page (not sitemap-only / orphaned). */}
      {shippedTypeHubs().length > 0 && (
        <section style={{ background: 'var(--bg-page)', color: '#fff', borderBottom: '1px solid var(--border)', padding: '18px 24px 20px', fontFamily: 'system-ui, sans-serif' }}>
          <div style={{ maxWidth: 1000, margin: '0 auto' }}>
            <div style={{ fontSize: 10, letterSpacing: 2, color: 'var(--text-tertiary)', fontWeight: 800, fontFamily: 'monospace', marginBottom: 10 }}>LOADOUT GUIDES BY WEAPON TYPE</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {shippedTypeHubs().map((h) => (
                <Link key={h.slug} href={'/wardogs/loadouts/best/' + h.slug} style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', textDecoration: 'none', border: '1px solid var(--border)', borderLeft: '3px solid var(--accent)', borderRadius: '0 3px 3px 0', padding: '9px 14px' }}>
                  Best {h.label} Loadout &rarr;
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <LoadoutsClient />
    </>
  );
}
