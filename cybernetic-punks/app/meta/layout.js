export const metadata = {
  title: 'Marathon Meta Tier List — Live Weapon & Shell Rankings',
  description: 'Live Marathon meta tier list updated every 6 hours by NEXUS. Current weapon and shell rankings for ranked and casual play. Build your own shareable tier list.',
  openGraph: {
    title: 'Marathon Meta Tier List — CyberneticPunks',
    description: 'Live Marathon meta tier list updated every 6 hours by NEXUS. Current weapon and shell rankings.',
    url: 'https://cyberneticpunks.com/meta',
    siteName: 'CyberneticPunks',
    type: 'website',
    images: [{ url: 'https://cyberneticpunks.com/og-image.png', width: 1200, height: 630, alt: 'Marathon Meta Tier List — CyberneticPunks' }],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@Cybernetic87250',
    title: 'Marathon Meta Tier List — CyberneticPunks',
    description: 'Live Marathon meta tier list updated every 6 hours by NEXUS. Current weapon and shell rankings.',
    images: ['https://cyberneticpunks.com/og-image.png'],
  },
  alternates: {
    canonical: 'https://cyberneticpunks.com/meta',
  },
};

export default function MetaLayout({ children }) {
  return children;
}
