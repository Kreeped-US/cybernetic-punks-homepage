// app/ranked/page.js
// Server component wrapper — metadata lives here, interactive logic in RankedClient.js

import RankedClient from './RankedClient';

export const metadata = {
  title: 'Marathon Ranked Mode Guide — Tiers, Holotags, Shells & Rewards',
  description: 'Everything you need to climb Marathon Ranked. Tier breakdowns, Holotag rules, gear ante requirements, shell tier list, season rewards, and FAQ — updated for Season 1 beta.',
  openGraph: {
    title: 'Marathon Ranked Mode Guide — Tiers, Holotags & Season 1 Rewards | CyberneticPunks',
    description: 'Ranked mode intel for Marathon. Six tiers, three subdivisions each. Holotag rules, gear ante, shell picks, and season reward breakdown.',
    url: 'https://cyberneticpunks.com/ranked',
    siteName: 'CyberneticPunks',
    type: 'website',
    images: [{ url: 'https://cyberneticpunks.com/og-image.png', width: 1200, height: 630, alt: 'Marathon Ranked Mode Guide — CyberneticPunks' }],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@Cybernetic87250',
    title: 'Marathon Ranked Mode Guide — CyberneticPunks',
    description: 'Tier breakdowns, Holotag rules, shell picks, and season rewards for Marathon Ranked Season 1.',
    images: ['https://cyberneticpunks.com/og-image.png'],
  },
  alternates: {
    canonical: 'https://cyberneticpunks.com/ranked',
  },
};

export default function RankedPage() {
  return <RankedClient />;
}