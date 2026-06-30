import { Orbitron, Share_Tech_Mono, Rajdhani } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import Nav from '@/components/Nav';
import LivePulseStrip from '@/components/LivePulseStrip';
import './globals.css';

const orbitron = Orbitron({ subsets: ['latin'], variable: '--font-orbitron' });
const mono = Share_Tech_Mono({ weight: '400', subsets: ['latin'], variable: '--font-mono' });
const rajdhani = Rajdhani({ subsets: ['latin'], weight: ['300','400','500','600','700'] });

export const metadata = {
  metadataBase: new URL('https://cyberneticpunks.com'),
  title: {
    default: 'CyberneticPunks — Marathon Intelligence Hub',
    template: '%s | CyberneticPunks',
  },
  description: 'Marathon meta tier lists, build guides, weapon stats, shell rankings, and ranked intel for Bungie\'s extraction shooter — refreshed throughout the day.',
  keywords: ['Marathon', 'Marathon game', 'Marathon builds', 'Marathon meta', 'Marathon loadouts', 'Marathon tier list', 'Bungie Marathon', 'extraction shooter', 'Marathon guide', 'Marathon tips'],
  authors: [{ name: 'CyberneticPunks' }],
  creator: 'CyberneticPunks',
  openGraph: {
    title: 'CyberneticPunks — Marathon Intelligence Hub',
    description: 'Marathon meta tier lists, build guides, weapon stats, and ranked intel for Bungie\'s extraction shooter. Refreshed throughout the day.',
    url: 'https://cyberneticpunks.com',
    siteName: 'CyberneticPunks',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    site: '@Cybernetic87250',
    title: 'CyberneticPunks — Marathon Intelligence Hub',
    description: 'Marathon tier lists, builds, weapon stats, and ranked intel — refreshed throughout the day.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'M2lvAyNiEj7COYx4hguAd1l3TOOP7WwkQ1EjY3qoi0I',
  },
  // NOTE: No alternates/canonical here — each page defines its own.
  // Pages without a canonical will have none, which is correct.
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${orbitron.variable} ${mono.variable} ${rajdhani.className}`}>
      <body className="bg-black antialiased" style={{ color: 'rgba(255,255,255,0.88)', fontSize: '15px' }}>
        <Nav />
        {children}
        <LivePulseStrip />
        <Analytics />
      </body>
    </html>
  );
}