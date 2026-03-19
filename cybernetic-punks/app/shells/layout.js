export const metadata = {
  title: 'Marathon Shell Guides — All 7 Runner Shells Explained',
  description: 'Complete guides for all 7 Marathon Runner Shells. Abilities, stats, best mods, implants, and ranked viability for Assassin, Thief, Destroyer, Vandal, Recon, Triage, and Rook.',
  openGraph: {
    title: 'Marathon Shell Guides — CyberneticPunks',
    description: 'Complete guides for all 7 Marathon Runner Shells. Abilities, stats, and ranked viability.',
    url: 'https://cyberneticpunks.com/shells',
    siteName: 'CyberneticPunks',
    type: 'website',
    images: [{ url: 'https://cyberneticpunks.com/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@Cybernetic87250',
    title: 'Marathon Shell Guides — CyberneticPunks',
    description: 'Complete guides for all 7 Marathon Runner Shells.',
    images: ['https://cyberneticpunks.com/og-image.png'],
  },
  alternates: { canonical: 'https://cyberneticpunks.com/shells' },
};

export default function ShellsLayout({ children }) {
  return children;
}
