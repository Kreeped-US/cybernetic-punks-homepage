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
  // NETWORK-LEVEL defaults (root = the network front door post-cutover; the Marathon
  // homepage now lives at /marathon). Game pages self-set their own OG (Marathon hub +
  // content pages, DMZ, article template), so these defaults only surface on the apex
  // homepage and network/utility pages -- exactly where network copy belongs.
  title: {
    default: 'CyberneticPunks — Competitive-Shooter Intelligence Network',
    template: '%s | CyberneticPunks',
  },
  description: 'The competitive-shooter intelligence network. First-party intel for Marathon and DMZ, verified against the live game. No hype, just intel.',
  keywords: ['CyberneticPunks', 'competitive shooter intelligence', 'Marathon', 'DMZ', 'extraction shooter'],
  authors: [{ name: 'CyberneticPunks' }],
  creator: 'CyberneticPunks',
  openGraph: {
    title: 'CyberneticPunks — Competitive-Shooter Intelligence Network',
    description: 'The competitive-shooter intelligence network. First-party intel for Marathon and DMZ, verified against the live game. No hype, just intel.',
    url: 'https://cyberneticpunks.com',
    siteName: 'CyberneticPunks',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    site: '@Cybernetic87250',
    title: 'CyberneticPunks — Competitive-Shooter Intelligence Network',
    description: 'First-party intel for Marathon and DMZ, verified against the live game. No hype, just intel.',
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
  // Static, hand-authored icons committed under public/. Replaced the dynamic
  // app/icon.js + app/apple-icon.js (deleted) with purpose-built PNGs; the favicon
  // set is CNP-only for small-size legibility, the apple touch icon is the full mark.
  // favicon.ico is served from public/favicon.ico (old app/favicon.ico deleted so the
  // new one wins). shortcut links the .ico explicitly now that the app/ convention is gone.
  icons: {
    icon: [
      { url: '/cnp-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/cnp-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/cnp-48.png', sizes: '48x48', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: { url: '/cnp-180.png', sizes: '180x180', type: 'image/png' },
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