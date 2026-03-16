// app/advisor/page.js
import AdvisorClient from './AdvisorClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'DEXTER Build Advisor — Personalized Marathon Loadout Generator | CyberneticPunks',
  description: 'Tell DEXTER your Runner Shell, playstyle, and rank target. Get a personalized Marathon loadout — weapons, mods, cores, implants — engineered by AI and updated with live meta data.',
  keywords: 'Marathon build generator, Marathon loadout advisor, best Marathon builds, Marathon shell builds, DEXTER build advisor, Marathon mods cores implants',
  openGraph: {
    title: 'DEXTER Build Advisor — Personalized Marathon Loadout | CyberneticPunks',
    description: 'AI-engineered Marathon builds. Pick your shell, playstyle, and rank target. DEXTER does the rest.',
    url: 'https://cyberneticpunks.com/advisor',
    type: 'website',
  },
};

export default function AdvisorPage() {
  return <AdvisorClient />;
}
