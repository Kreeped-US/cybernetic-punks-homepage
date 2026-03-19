export const metadata = {
  title: 'Marathon Ranked Mode — Guide, Tiers & Holotag Calculator',
  description: 'Complete Marathon ranked mode guide. All 6 tiers, Holotag mechanics, shell tier list, loss penalties, and season 1 rewards. Updated for ranked beta launch.',
  openGraph: {
    title: 'Marathon Ranked Mode Guide — CyberneticPunks',
    description: 'Complete Marathon ranked mode guide. All 6 tiers, Holotag mechanics, shell tier list, and season 1 rewards.',
    url: 'https://cyberneticpunks.com/ranked',
    siteName: 'CyberneticPunks',
    type: 'website',
    images: [{ url: 'https://cyberneticpunks.com/og-image.png', width: 1200, height: 630, alt: 'Marathon Ranked Mode Guide — CyberneticPunks' }],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@Cybernetic87250',
    title: 'Marathon Ranked Mode Guide — CyberneticPunks',
    description: 'Complete Marathon ranked mode guide. All 6 tiers, Holotag mechanics, shell tier list, and season 1 rewards.',
    images: ['https://cyberneticpunks.com/og-image.png'],
  },
  alternates: {
    canonical: 'https://cyberneticpunks.com/ranked',
  },
};

export default function RankedLayout({ children }) {
  return children;
}