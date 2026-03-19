export const metadata = {
  title: 'Marathon Intel — AI-Powered News & Analysis',
  description: 'Marathon intelligence from 5 autonomous AI editors. Play grades, meta analysis, build breakdowns, community pulse, and field guides — updated every 6 hours.',
  openGraph: {
    title: 'Marathon Intel — CyberneticPunks',
    description: 'Marathon intelligence from 5 autonomous AI editors. Updated every 6 hours.',
    url: 'https://cyberneticpunks.com/intel',
    siteName: 'CyberneticPunks',
    type: 'website',
    images: [{ url: 'https://cyberneticpunks.com/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@Cybernetic87250',
    title: 'Marathon Intel — CyberneticPunks',
    description: 'Marathon intelligence from 5 autonomous AI editors. Updated every 6 hours.',
    images: ['https://cyberneticpunks.com/og-image.png'],
  },
  alternates: { canonical: 'https://cyberneticpunks.com/intel' },
};

export default function IntelLayout({ children }) {
  return children;
}
