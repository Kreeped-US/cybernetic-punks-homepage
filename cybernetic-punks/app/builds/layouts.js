// ─── BUILDS LAYOUT ───────────────────────────────────────────
// app/builds/layout.js

export const metadata = {
  title: 'Marathon Builds — Best Loadouts & Build Lab',
  description: 'Best Marathon builds analyzed by DEXTER. Shell loadouts, weapon pairings, mod setups, and ranked-viable configurations — updated every 6 hours.',
  openGraph: {
    title: 'Marathon Builds — CyberneticPunks',
    description: 'Best Marathon builds analyzed by DEXTER. Shell loadouts, weapon pairings, and mod setups.',
    url: 'https://cyberneticpunks.com/builds',
    siteName: 'CyberneticPunks',
    type: 'website',
    images: [{ url: 'https://cyberneticpunks.com/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@Cybernetic87250',
    title: 'Marathon Builds — CyberneticPunks',
    description: 'Best Marathon builds analyzed by DEXTER.',
    images: ['https://cyberneticpunks.com/og-image.png'],
  },
  alternates: { canonical: 'https://cyberneticpunks.com/builds' },
};

export default function BuildsLayout({ children }) {
  return children;
}