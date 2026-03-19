export const metadata = {
  title: 'Marathon Build Advisor — DEXTER Loadout Generator',
  description: 'Get a complete Marathon loadout engineered by DEXTER. Select your shell, playstyle, and rank target — get mods, cores, implants, and weapons from live meta data.',
  openGraph: {
    title: 'Marathon Build Advisor — CyberneticPunks',
    description: 'Get a complete Marathon loadout engineered by DEXTER. Live meta data. Real stat values.',
    url: 'https://cyberneticpunks.com/advisor',
    siteName: 'CyberneticPunks',
    type: 'website',
    images: [{ url: 'https://cyberneticpunks.com/og-image.png', width: 1200, height: 630, alt: 'Marathon Build Advisor — CyberneticPunks' }],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@Cybernetic87250',
    title: 'Marathon Build Advisor — CyberneticPunks',
    description: 'Get a complete Marathon loadout engineered by DEXTER. Live meta data. Real stat values.',
    images: ['https://cyberneticpunks.com/og-image.png'],
  },
  alternates: {
    canonical: 'https://cyberneticpunks.com/advisor',
  },
};

export default function AdvisorLayout({ children }) {
  return children;
}
