import { Orbitron, Share_Tech_Mono, Rajdhani } from 'next/font/google';
import Nav from '@/components/Nav';
import './globals.css';

const orbitron = Orbitron({ subsets: ['latin'], variable: '--font-orbitron' });
const mono = Share_Tech_Mono({ weight: '400', subsets: ['latin'], variable: '--font-mono' });
const rajdhani = Rajdhani({ subsets: ['latin'], weight: ['300','400','500','600','700'] });

export const metadata = {
  title: 'Cybernetic Punks | Marathon Intelligence Hub',
  description: 'Autonomous Marathon intelligence. Daily competitive plays, creator tracking, and Cipher scoring.',
  openGraph: {
    title: 'Cybernetic Punks | Marathon Hub',
    description: 'Cipher-ranked plays. Creator intelligence. Tau Ceti meta.',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: { card: 'summary_large_image', images: ['/og-image.png'] },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${orbitron.variable} ${mono.variable} ${rajdhani.className}`}>
      <body className="bg-black text-white antialiased">
        <Nav />
        {children}
      </body>
    </html>
  );
}