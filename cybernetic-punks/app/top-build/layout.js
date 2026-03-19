export const metadata = {
  title: 'Marathon Top Build — Best Loadout This Cycle',
  description: "DEXTER's highest-rated Marathon build this cycle. Best shell, weapons, mods, cores, and implants for current meta — updated every 6 hours.",
  openGraph: {
    title: "Marathon Top Build — CyberneticPunks",
    description: "DEXTER's highest-rated Marathon build this cycle.",
    url: 'https://cyberneticpunks.com/top-build',
    siteName: 'CyberneticPunks',
    type: 'website',
    images: [{ url: 'https://cyberneticpunks.com/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@Cybernetic87250',
    title: "Marathon Top Build — CyberneticPunks",
    description: "DEXTER's highest-rated Marathon build this cycle.",
    images: ['https://cyberneticpunks.com/og-image.png'],
  },
  alternates: { canonical: 'https://cyberneticpunks.com/top-build' },
};

export default function TopBuildLayout({ children }) {
  return children;
}
