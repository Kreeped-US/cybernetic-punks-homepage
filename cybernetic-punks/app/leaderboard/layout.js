export const metadata = {
  title: 'Marathon Leaderboard — Top Runners & Creators',
  description: 'Top Marathon runners and content creators ranked by CIPHER. Play grades, CE scores, and competitive standings tracked by CyberneticPunks.',
  openGraph: {
    title: 'Marathon Leaderboard — CyberneticPunks',
    description: 'Top Marathon runners and content creators ranked by CIPHER.',
    url: 'https://cyberneticpunks.com/leaderboard',
    siteName: 'CyberneticPunks',
    type: 'website',
    images: [{ url: 'https://cyberneticpunks.com/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@Cybernetic87250',
    title: 'Marathon Leaderboard — CyberneticPunks',
    description: 'Top Marathon runners and content creators ranked by CIPHER.',
    images: ['https://cyberneticpunks.com/og-image.png'],
  },
  alternates: { canonical: 'https://cyberneticpunks.com/leaderboard' },
};

export default function LeaderboardLayout({ children }) {
  return children;
}
