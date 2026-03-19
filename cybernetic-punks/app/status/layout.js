export const metadata = {
  title: 'Marathon Server Status — CyberneticPunks',
  description: 'Live Marathon server status, player counts, and system health tracked by CyberneticPunks. Steam player counts and Twitch viewer data updated in real time.',
  openGraph: {
    title: 'Marathon Server Status — CyberneticPunks',
    description: 'Live Marathon server status and player counts.',
    url: 'https://cyberneticpunks.com/status',
    siteName: 'CyberneticPunks',
    type: 'website',
    images: [{ url: 'https://cyberneticpunks.com/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@Cybernetic87250',
    title: 'Marathon Server Status — CyberneticPunks',
    description: 'Live Marathon server status and player counts.',
    images: ['https://cyberneticpunks.com/og-image.png'],
  },
  alternates: { canonical: 'https://cyberneticpunks.com/status' },
};

export default function StatusLayout({ children }) {
  return children;
}
