export const metadata = {
  title: 'Marathon Stats — Weapon & Shell Database',
  description: 'Complete Marathon weapon and shell stats database. Damage, fire rate, magazine size, ability cooldowns, and ranked viability for every weapon and shell.',
  openGraph: {
    title: 'Marathon Stats Database — CyberneticPunks',
    description: 'Complete Marathon weapon and shell stats database.',
    url: 'https://cyberneticpunks.com/stats',
    siteName: 'CyberneticPunks',
    type: 'website',
    images: [{ url: 'https://cyberneticpunks.com/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@Cybernetic87250',
    title: 'Marathon Stats Database — CyberneticPunks',
    description: 'Complete Marathon weapon and shell stats database.',
    images: ['https://cyberneticpunks.com/og-image.png'],
  },
  alternates: { canonical: 'https://cyberneticpunks.com/stats' },
};

export default function StatsLayout({ children }) {
  return children;
}
