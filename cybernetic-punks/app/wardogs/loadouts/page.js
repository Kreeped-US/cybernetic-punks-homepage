// app/wardogs/loadouts/page.js
// The Wardogs LOADOUTS tool -- SSR frame + crawlable intro, mirroring the Marathon advisor page/client
// split. NAMING (hard rule): user-facing copy, title, H1, URL all use "loadouts" / "best loadout"
// (the community + search term), NEVER "Build Advisor" (zero search volume). The interactive
// generator streams client-side; this static prose is what the page ranks on (same as Marathon).

import LoadoutsClient from './LoadoutsClient';
import ViewTracker from '@/components/ViewTracker';

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

      <section style={{ background: 'var(--bg-page)', color: '#fff', borderBottom: '1px solid var(--border)', padding: '40px 24px 8px', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <h1 style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 900, letterSpacing: '-0.5px', lineHeight: 1.1, margin: '0 0 14px' }}>
            Wardogs Best Loadouts
          </h1>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, maxWidth: 780, margin: '0 0 12px' }}>
            Tell us your career level, your cash budget, and how you play. We rank every weapon by its
            measured <strong>time-to-kill</strong> -- from community ballistics testing -- and hand back
            the best loadout you can field right now, with the reasoning behind each pick. Not a spec
            dump: the actual answer to &ldquo;what should I run?&rdquo;
          </p>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', lineHeight: 1.7, maxWidth: 780, margin: 0 }}>
            Combat numbers come from community-tested ballistics (attributed, not yet Bulkhead-official)
            and every recommendation says so. Prices are not published yet, so loadouts are ranked by
            effectiveness today -- budget filtering switches on the moment official prices land.
          </p>
        </div>
      </section>

      <LoadoutsClient />
    </>
  );
}
