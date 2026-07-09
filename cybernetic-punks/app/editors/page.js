// app/editors/page.js
// "Our editors" — the newsroom staff page (editor rework Step 2, Bucket C).
//
// REBUILT off the canonical display map (lib/editors/roster.js) — the SINGLE
// SOURCE OF TRUTH. No editor data is hardcoded here. Presents the six as a
// real publication's staff (restrained/credible per editorial-staff-model.md
// "LOCKED NEWSROOM BRANDING"): masthead + tagline + per-editor staff cards.
//
// This replaced the prior stats-heavy profile hub (live per-editor counts,
// top/recent articles, personal-loadout/signature-quote flavor). That data was
// hardcoded in-page or queried from feed_items; the new staff treatment sources
// identity from the map only, so the page no longer queries Supabase and is
// static (no force-dynamic needed). Keys/feed_items/article pipeline untouched.

import { getAllEditors } from '@/lib/editors/roster';
import NewsroomMasthead from './NewsroomMasthead';
import StaffCard from './StaffCard';

const BG = '#121418';

export const metadata = {
  title: 'The Newsroom — Meet the Editors',
  description: 'The Cybernetic Punks newsroom: six role-specialist analysts — Marcus Vane (Cipher), Remi Okafor (Nexus), Felix Andersen (Dexter), Tariq Webb (Ghost), Miranda Malini, and Vera Sloan (Broker) — covering analysis, meta, builds, community, field guides, and economy across the network.',
  keywords: 'Cybernetic Punks editors, the newsroom, Marcus Vane Cipher, Remi Okafor Nexus, Felix Andersen Dexter, Tariq Webb Ghost, Miranda Malini, Vera Sloan Broker, extraction shooter analysts',
  openGraph: {
    title: 'The Newsroom — Meet the Editors | CyberneticPunks',
    description: 'Six role-specialist analysts. One network. We don\'t agree, and we don\'t guess.',
    url: 'https://cyberneticpunks.com/editors',
    siteName: 'CyberneticPunks',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    site: '@Cybernetic87250',
    title: 'The Newsroom — Meet the Editors',
    description: 'Six role-specialist analysts. One network. We don\'t agree, and we don\'t guess.',
  },
  alternates: { canonical: 'https://cyberneticpunks.com/editors' },
};

export default function EditorsPage() {
  var editors = getAllEditors();
  return (
    <main style={{ background: BG, minHeight: '100vh', color: '#fff', paddingTop: 48 }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://cyberneticpunks.com' },
          { '@type': 'ListItem', position: 2, name: 'Editors', item: 'https://cyberneticpunks.com/editors' },
        ],
      }) }} />
      <NewsroomMasthead />

      <section style={{ padding: '24px 24px 72px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: 14 }}>
          {editors.map(function(e) {
            return <StaffCard key={e.key} editor={e} />;
          })}
        </div>
      </section>
    </main>
  );
}
