// app/factions/page.js
import FactionClient from './FactionClient';

export const metadata = {
  title: 'Marathon Faction Guide — Unlock Requirements & Investment Guide | CyberneticPunks',
  description: 'Complete Marathon faction guide. Every unlock, stat bonus, rank requirement, and credit cost for all 6 factions — Cyberacme, Nucaloric, Traxus, Mida, Arachne, Sekiguchi. Find the fastest path to the build you want.',
  keywords: 'Marathon factions, Marathon faction guide, Marathon Arachne unlock, Marathon Traxus mods, Marathon faction rank requirements, Marathon faction upgrades, Marathon faction investment',
  openGraph: {
    title: 'Marathon Faction Guide — Unlock Requirements & Investment Guide | CyberneticPunks',
    description: 'Every faction unlock, stat bonus, and rank requirement for all 6 Marathon factions. Find which faction to prioritize for your shell.',
    url: 'https://cyberneticpunks.com/factions',
    siteName: 'CyberneticPunks',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Marathon Faction Guide | CyberneticPunks',
    description: 'Every faction unlock, stat bonus, and rank requirement. Find the fastest path to the build you want.',
  },
  alternates: { canonical: 'https://cyberneticpunks.com/factions' },
};

export default function FactionsPage() {
  return <FactionClient />;
}
